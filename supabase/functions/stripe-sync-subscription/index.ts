import { serve } from 'https://deno.land/std@0.214.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3?target=deno'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

if (!supabaseUrl || !serviceRoleKey || !stripeSecret) {
  console.error('[stripe-sync] Env vars faltando')
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey)

type StripeSubStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'incomplete'
  | 'incomplete_expired'
  | 'canceled'
  | 'unpaid'

const normalizeStatus = (status?: StripeSubStatus | string | null) => {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    case 'incomplete':
    default:
      return 'incomplete'
  }
}

const toTimestamp = (seconds?: number | null) =>
  seconds ? new Date(seconds * 1000).toISOString() : null

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey'
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { userId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId obrigatório' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey'
        }
      })
    }

    console.log('[stripe-sync] Sincronizando assinatura para user:', userId)

    // 1. Buscar subscription atual no Supabase
    const { data: currentSub, error: subError } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (subError && subError.code !== 'PGRST116') {
      throw subError
    }

    // Se não tem subscription, nada a sincronizar
    if (!currentSub) {
      console.log('[stripe-sync] User sem subscription no Supabase')
      return new Response(JSON.stringify({ synced: false, reason: 'no_subscription' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey'
        }
      })
    }

    // 2. Se tem subscription_id, verificar status no Stripe
    if (currentSub.stripe_subscription_id) {
      console.log('[stripe-sync] Verificando subscription no Stripe:', currentSub.stripe_subscription_id)

      try {
        const stripeResp = await fetch(
          `https://api.stripe.com/v1/subscriptions/${currentSub.stripe_subscription_id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${stripeSecret}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )

        if (!stripeResp.ok) {
          const err = await stripeResp.json().catch(() => null)
          throw new Error(err?.error?.message ?? 'Erro ao buscar subscription no Stripe')
        }

        const stripeSubscription = await stripeResp.json()

        console.log('[stripe-sync] Subscription Stripe status:', stripeSubscription.status)

        const newStatus = normalizeStatus(stripeSubscription.status)
        const priceId = stripeSubscription.items?.data?.[0]?.price?.id ?? currentSub.stripe_price_id

        console.log('[stripe-sync] Atualizando com status:', newStatus, 'priceId:', priceId)

        const { error: updateError } = await serviceClient
          .from('subscriptions')
          .update({
            status: newStatus,
            stripe_price_id: priceId,
            current_period_end: toTimestamp(stripeSubscription.current_period_end),
            cancel_at_period_end: stripeSubscription.cancel_at_period_end ?? false
          })
          .eq('user_id', userId)

        if (updateError) {
          throw updateError
        }

        console.log('[stripe-sync] ✅ Subscription sincronizada com sucesso')
        return new Response(JSON.stringify({
          synced: true,
          status: newStatus,
          priceId: priceId
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey'
          }
        })
      } catch (stripeErr) {
        const error = stripeErr as Error
        console.warn('[stripe-sync] Erro ao buscar no Stripe:', error.message)

        if (error.message.includes('No such subscription')) {
          console.log('[stripe-sync] Subscription não existe mais no Stripe, marcando como cancelada')

          const { error: cancelError } = await serviceClient
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('user_id', userId)

          if (cancelError) {
            throw cancelError
          }

          return new Response(JSON.stringify({ 
            synced: true,
            status: 'canceled',
            reason: 'subscription_not_found_in_stripe'
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey'
            }
          })
        }

        throw error
      }
    }

    return new Response(JSON.stringify({ synced: false, reason: 'no_stripe_subscription_id' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey'
      }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[stripe-sync] ❌ Erro:', msg)

    return new Response(JSON.stringify({ 
      error: msg
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey'
      }
    })
  }
})
