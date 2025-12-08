import { serve } from 'https://deno.land/std@0.214.0/http/server.ts'
import { createClient } from 'supabase'
import Stripe from 'stripe'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

if (!stripeSecret) console.error('[stripe-subscription-status] STRIPE_SECRET_KEY não configurada')

const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2023-10-16', typescript: true }) : null

const serviceClient = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (!stripe) {
    return new Response(JSON.stringify({ error: 'Stripe não configurado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const url = new URL(req.url)
    const subscriptionId = url.searchParams.get('subscriptionId')
    const supabaseId = url.searchParams.get('supabaseId')

    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: 'subscriptionId é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log('[stripe-subscription-status] Retrieving subscription from Stripe:', subscriptionId)
    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)
    const status = stripeSub.status

    // Se foi passado supabaseId, tentar atualizar o registro
    if (supabaseId && serviceClient) {
      try {
        const update: any = { status }
        if (stripeSub.id) update.stripe_subscription_id = stripeSub.id
        if (stripeSub.items?.data?.[0]?.price?.id) update.stripe_price_id = stripeSub.items.data[0].price.id

        const { error: updateError } = await serviceClient
          .from('subscriptions')
          .update(update)
          .eq('id', supabaseId)

        if (updateError) console.warn('[stripe-subscription-status] Erro ao atualizar subscription no Supabase:', updateError.message)
        else console.log('[stripe-subscription-status] Subscription atualizada no Supabase:', supabaseId)
      } catch (err) {
        console.error('[stripe-subscription-status] Erro updating supabase:', err)
      }
    }

    return new Response(JSON.stringify({ status, subscription: stripeSub }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const error = err as any
    console.error('[stripe-subscription-status] Error:', error?.message ?? err)
    return new Response(JSON.stringify({ error: error?.message ?? 'Erro desconhecido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
