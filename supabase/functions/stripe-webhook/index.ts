import { serve } from 'https://deno.land/std@0.214.0/http/server.ts'
import { createClient } from 'supabase'
import Stripe from 'stripe'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[stripe-webhook] SUPABASE_URL/SERVICE_ROLE ausentes')
}

if (!stripeSecret || !webhookSecret) {
  console.error('[stripe-webhook] Stripe secrets ausentes')
}

const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: '2023-10-16', typescript: true })
  : null

const serviceClient = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null

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

const updateByCustomer = async (
  customerId: string,
  payload: Record<string, unknown>
) => {
  if (!serviceClient) return
  const { error } = await serviceClient
    .from('subscriptions')
    .update(payload)
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('[stripe-webhook] Falha ao atualizar assinatura:', error)
    throw error
  }
}

const upsertSubscription = async (args: {
  userId: string
  customerId: string
  subscriptionId: string
  priceId: string | null
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}) => {
  if (!serviceClient) return
  
  // Primeiro tenta atualizar
  const { error: updateError, data: updateData } = await serviceClient
    .from('subscriptions')
    .update({
      stripe_customer_id: args.customerId,
      stripe_subscription_id: args.subscriptionId,
      stripe_price_id: args.priceId,
      status: args.status,
      current_period_end: args.currentPeriodEnd
    })
    .eq('user_id', args.userId)
    .select()

  if (updateError) {
    console.error('[stripe-webhook] Falha ao atualizar assinatura:', updateError)
    throw updateError
  }

  // Se não atualizou nada, insere
  if (!updateData || updateData.length === 0) {
    const { error: insertError } = await serviceClient
      .from('subscriptions')
      .insert({
        user_id: args.userId,
        stripe_customer_id: args.customerId,
        stripe_subscription_id: args.subscriptionId,
        stripe_price_id: args.priceId,
        status: args.status,
        current_period_end: args.currentPeriodEnd,
        cancel_at_period_end: args.cancelAtPeriodEnd
      })

    if (insertError) {
      console.error('[stripe-webhook] Falha ao inserir assinatura:', insertError)
      throw insertError
    }
    console.log('[stripe-webhook] Assinatura inserida:', args.userId)
  } else {
    console.log('[stripe-webhook] Assinatura atualizada:', args.userId)
  }
}

const findUserByCustomer = async (customerId: string) => {
  if (!serviceClient) return null
  const { data, error } = await serviceClient
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error) {
    console.error('[stripe-webhook] Falha ao buscar usuário por customer:', error)
    return null
  }

  return data?.user_id ?? null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'stripe-signature, content-type'
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!stripe || !serviceClient || !webhookSecret) {
    console.error('[stripe-webhook] Configuração incompleta')
    return new Response('Server misconfigured', { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  const payload = await req.text()

  let event: Stripe.Event

  try {
    if (!signature) {
      console.error('[stripe-webhook] Missing stripe-signature header')
      console.error('[stripe-webhook] Available headers:', Object.fromEntries(req.headers))
      throw new Error('No signature header')
    }

    console.log('[stripe-webhook] Webhook secret configured:', webhookSecret.substring(0, 10) + '...')
    console.log('[stripe-webhook] Signature header:', signature.substring(0, 50) + '...')
    console.log('[stripe-webhook] Payload length:', payload.length)

    // Usar método nativo do Stripe (mais confiável)
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret
    )
    
    console.log('[stripe-webhook] ✅ Signature validated successfully for event:', event.type)
  } catch (err) {
    const error = err as Error
    console.error('[stripe-webhook] ❌ Signature validation failed:', error.message)
    console.error('[stripe-webhook] Error stack:', error.stack?.substring(0, 200))
    return new Response(JSON.stringify({ 
      error: 'Invalid signature',
      message: error.message 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    console.log('[stripe-webhook] Processing event type:', event.type)
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.subscription
        const customerId = session.customer as string | null
        const userId = session.metadata?.supabase_user_id ?? (customerId ? await findUserByCustomer(customerId) : null)

        console.log('[stripe-webhook] checkout.session.completed:', {
          subscriptionId,
          customerId,
          userId,
          metadataUserId: session.metadata?.supabase_user_id
        })

        if (!subscriptionId || !customerId || !userId) {
          console.warn('[stripe-webhook] Dados insuficientes em checkout.session.completed', {
            subscriptionId: !!subscriptionId,
            customerId: !!customerId,
            userId: !!userId
          })
          break
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        const priceId = subscription.items.data[0]?.price?.id ?? null

        console.log('[stripe-webhook] Subscription retrieved:', {
          id: subscription.id,
          status: subscription.status,
          priceId
        })

        await upsertSubscription({
          userId,
          customerId,
          subscriptionId: subscription.id,
          priceId,
          status: normalizeStatus(subscription.status),
          currentPeriodEnd: toTimestamp(subscription.current_period_end),
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false
        })

        console.log('[stripe-webhook] ✅ Subscription upserted successfully')
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        await updateByCustomer(customerId, {
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
          status: normalizeStatus(subscription.status),
          current_period_end: toTimestamp(subscription.current_period_end),
          cancel_at_period_end: subscription.cancel_at_period_end ?? false
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        console.log('[stripe-webhook] Processing subscription.deleted for customer:', customerId)
        console.log('[stripe-webhook] Updating with status: canceled')
        
        await updateByCustomer(customerId, {
          status: 'canceled',
          current_period_end: toTimestamp(subscription.current_period_end),
          cancel_at_period_end: true
        })
        
        console.log('[stripe-webhook] ✅ Subscription canceled successfully for:', customerId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string | null
        if (customerId) {
          await updateByCustomer(customerId, { status: 'past_due' })
        }
        break
      }

      default:
        console.log('[stripe-webhook] Evento ignorado:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const eventType = event?.type ?? 'UNKNOWN'
    let errorMsg = 'Erro desconhecido'
    let errorStack = 'N/A'
    
    if (error instanceof Error) {
      errorMsg = error.message
      errorStack = error.stack?.substring(0, 300) ?? 'N/A'
    } else if (typeof error === 'string') {
      errorMsg = error
    } else if (error && typeof error === 'object') {
      errorMsg = JSON.stringify(error).substring(0, 200)
    }
    
    console.error('[stripe-webhook] ❌ Erro ao processar evento:', eventType)
    console.error('[stripe-webhook] Error message:', errorMsg)
    console.error('[stripe-webhook] Error stack:', errorStack)
    
    return new Response(JSON.stringify({ 
      received: false, 
      error: errorMsg,
      eventType: eventType
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
