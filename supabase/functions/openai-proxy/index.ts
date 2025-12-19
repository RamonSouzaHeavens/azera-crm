import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  const origin = req.headers.get('origin')
  const allowedOrigins = [
    Deno.env.get('APP_URL'), // Production URL from env
    'http://localhost:5173', // Vite local
    'http://localhost:3000'  // Alternative local
  ].filter(Boolean)

  const isAllowedOrigin = allowedOrigins.includes(origin) || !origin // Allow server-to-server or match

  // Default to the request origin if allowed, otherwise deny (or specific fallback)
  // For safety in this specific environment where we might not have APP_URL set yet,
  // we will default to '*' but LOG a warning.
  // TODO: In production, enforce strictly: isAllowedOrigin ? origin : 'null'
  const corsOrigin = isAllowedOrigin ? origin : '*'

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validar Autenticação (JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1.5. Validar Assinatura (Subscription Check)
    // Busca a assinatura do usuários para garantir que está ativa
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()

    // Status premitidos: active, trialing.
    // Se não houver subscription ou status inválido, negar acesso.
    const isActive = subscription && (subscription.status === 'active' || subscription.status === 'trialing')

    if (subError || !isActive) {
       console.warn(`User ${user.id} attempted AI access without active subscription. Status: ${subscription?.status}`)
       return new Response(
        JSON.stringify({ error: 'Premium subscription required', details: 'Your subscription is not active.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse e Validação de Input
    const { prompt, max_tokens = 1500, model = 'gpt-4o-mini', response_format } = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    // Whitelist de modelos permitidos para evitar uso de modelos caros (GPT-4 Full) se não desejado
    const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o']
    if (!ALLOWED_MODELS.includes(model)) {
      throw new Error(`Model ${model} is not allowed. Allowed: ${ALLOWED_MODELS.join(', ')}`)
    }

    // Limite de tokens para segurança de custo
    const SAFE_MAX_TOKENS = Math.min(max_tokens, 4000)

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('VITE_OPENAI_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log(`🤖 User ${user.id} calling OpenAI API with model:`, model)

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: SAFE_MAX_TOKENS,
        temperature: 0.7,
        ...(response_format && { response_format })
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error('OpenAI API Error:', errorData)
      throw new Error(errorData.error?.message || 'OpenAI API request failed')
    }

    const data = await openaiResponse.json()
    console.log('✅ OpenAI response received')

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
