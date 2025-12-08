import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JWT } from 'https://deno.land/x/djwt@v2.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Somente POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.substring('Bearer '.length)

    // Criar cliente Supabase com SERVICE_ROLE para verificar token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase config')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verificar token e pegar usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é owner/admin
    const { data: membership, error: memberError } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('active', true)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .single()

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: only admins can trigger dispatcher' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Autorizado — Acionar dispatcher
    console.log(`[trigger-dispatcher] Admin ${user.id} triggered immediate dispatch`)

    // Marcar todos os webhooks pending para retry imediato
    const { error: updateError } = await supabase
      .from('webhook_deliveries')
      .update({
        next_retry_at: new Date().toISOString(), // Now!
        status: 'pending',
      })
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())

    if (updateError) {
      console.error('[trigger-dispatcher] Error updating deliveries:', updateError)
      throw updateError
    }

    // Invocar o webhook-dispatcher (pode estar em cron job, ou invocar direto)
    // Para produção, você pode usar Supabase Edge Functions invocation
    const dispatcherFunctionUrl = `${supabaseUrl}/functions/v1/webhook-dispatcher`

    try {
      const dispatchResponse = await fetch(dispatcherFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manual_trigger: true }),
      })

      console.log('[trigger-dispatcher] Dispatcher response:', dispatchResponse.status)
    } catch (err) {
      // Se falhar ao invocar, não é erro crítico — o cron job processará
      console.warn('[trigger-dispatcher] Could not invoke dispatcher directly:', err.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dispatcher triggered successfully',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[trigger-dispatcher] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
