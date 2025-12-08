import { serve } from 'https://deno.land/std@0.214.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    let body
    try {
      // CORREÇÃO 1: Usar req.json() para ler o corpo da requisição como JSON.
      // Isso é o método idiomático e mais robusto no Deno/Supabase Edge Functions.
      // Ele lida com o Content-Type e lança um erro se o parsing falhar.
      body = await req.json()
    } catch (parseError) {
      // O erro original: SyntaxError: "[object Object]" is not valid JSON
      // Isso acontece quando o cliente envia um corpo que não é uma string JSON válida.
      console.error('[stripe-get-price] Error parsing request body:', parseError)
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { priceId } = body

    if (!priceId || typeof priceId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid priceId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const response = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[stripe-get-price] Stripe API error ${response.status}:`, errorText)
      throw new Error(`Stripe API error: ${response.status}`)
    }

    const priceData = await response.json()

    return new Response(JSON.stringify({
      id: priceData.id,
      unit_amount: priceData.unit_amount,
      currency: priceData.currency,
      recurring: priceData.recurring
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[stripe-get-price] Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
