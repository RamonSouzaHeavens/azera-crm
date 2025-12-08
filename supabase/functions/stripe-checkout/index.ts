import { serve } from 'https://deno.land/std@0.214.0/http/server.ts'
import { createClient } from 'supabase'
import Stripe from 'stripe'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error('[stripe-checkout] Variáveis do Supabase não configuradas.')
}

if (!stripeSecret) {
  console.error('[stripe-checkout] STRIPE_SECRET_KEY não configurada.')
}

const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: '2023-10-16', typescript: true })
  : null

const serviceClient = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null

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

  if (!stripe || !serviceClient) {
    return new Response(JSON.stringify({ error: 'Servidor mal configurado' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    console.log('[stripe-checkout] Iniciando checkout...')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[stripe-checkout] Missing Authorization header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json().catch(() => null) as { priceId?: string } | null
    console.log('[stripe-checkout] Body received:', body)

    if (!body?.priceId) {
      console.error('[stripe-checkout] Missing priceId')
      return new Response(JSON.stringify({ error: 'priceId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[stripe-checkout] User auth failed:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[stripe-checkout] User:', user.id, user.email)

    // Obter subscription existente (se houver)
    const { data: existing, error: fetchError } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('[stripe-checkout] Erro ao buscar subscription:', fetchError)
      return new Response(JSON.stringify({ error: 'Erro ao buscar assinatura', details: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[stripe-checkout] Existing subscription:', existing?.id ?? 'none', existing?.status ?? 'N/A')

    // Validar se já tem assinatura ativa (não bloqueamos trialing)
    if (existing && existing.status === 'active') {
      console.warn('[stripe-checkout] Usuário já tem assinatura ativa')
      return new Response(JSON.stringify({
        error: 'Você já possui uma assinatura ativa. Por favor, entre em contato com o suporte se deseja alterar seu plano.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[stripe-checkout] Permitindo checkout (status:', existing?.status ?? 'nenhuma', ')')

    // Obter tenant do membership para associar a subscription
    console.log('[stripe-checkout] Buscando membership...')
    const { data: membership, error: membershipErr } = await serviceClient
      .from('memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipErr) console.error('[stripe-checkout] Membership error:', membershipErr)
    const tenantId = membership?.tenant_id ?? null
    console.log('[stripe-checkout] Tenant ID:', tenantId)

    // Obter plan_id do priceId
    console.log('[stripe-checkout] Buscando plan para priceId:', body.priceId)
    const { data: plan, error: planErr } = await serviceClient
      .from('plans')
      .select('id')
      .or(`stripe_price_id_mensal.eq.${body.priceId},stripe_price_id_semestral.eq.${body.priceId},stripe_price_id_anual.eq.${body.priceId}`)
      .maybeSingle()

    if (planErr) console.error('[stripe-checkout] Plan error:', planErr)
    const planId = plan?.id ?? null
    console.log('[stripe-checkout] Plan ID:', planId)

    let customerId = existing?.stripe_customer_id
    console.log('[stripe-checkout] Existing customer ID:', customerId)

    // Validar se o customer ainda existe no Stripe
    if (customerId) {
      try {
        console.log('[stripe-checkout] Validando customer no Stripe:', customerId)
        await stripe.customers.retrieve(customerId)
        console.log('[stripe-checkout] ✅ Customer válido:', customerId)
      } catch (err) {
        const error = err as any
        console.warn('[stripe-checkout] ⚠️ Customer não existe ou erro ao validar:', error.message, customerId)
        console.warn('[stripe-checkout] Error type:', error.type, 'Code:', error.code)

        // Limpar customer inválido do banco
        if (existing) {
          console.log('[stripe-checkout] Limpando customer inválido do banco...')
          const { error: cleanError } = await serviceClient
            .from('subscriptions')
            .update({ stripe_customer_id: null })
            .eq('id', existing.id)

          if (cleanError) {
            console.error('[stripe-checkout] Erro ao limpar customer:', cleanError)
          } else {
            console.log('[stripe-checkout] ✅ Customer inválido removido do banco')
          }
        }

        // Criar novo customer
        customerId = null
      }
    }

    if (!customerId) {
      console.log('[stripe-checkout] ℹ️ Criando novo customer...')
      try {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { supabase_user_id: user.id }
        })
        customerId = customer.id
        console.log('[stripe-checkout] ✅ Novo customer criado:', customerId)
      } catch (err) {
        const error = err as any
        console.error('[stripe-checkout] ❌ Erro ao criar customer:', error.message)
        throw error
      }

      if (existing) {
        // Atualizar stripe_customer_id, tenant_id e plan_id se ausente
        console.log('[stripe-checkout] Atualizando subscription existente com novo customer...')
        const { error: updateError } = await serviceClient
          .from('subscriptions')
          .update({
            stripe_customer_id: customerId,
            tenant_id: existing.tenant_id ?? tenantId,
            plan_id: existing.plan_id ?? planId
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('[stripe-checkout] ❌ Erro ao atualizar subscription:', updateError)
          throw new Error(`Erro ao atualizar subscription: ${updateError.message}`)
        }
        console.log('[stripe-checkout] ✅ Subscription atualizada')
      } else {
        console.log('[stripe-checkout] Criando nova subscription...')
        const { error: insertError } = await serviceClient
          .from('subscriptions')
          .insert({
            user_id: user.id,
            tenant_id: tenantId,
            stripe_customer_id: customerId,
            provider: 'stripe',
            status: 'incomplete'
          })

        if (insertError) {
          console.error('[stripe-checkout] ❌ Erro ao inserir subscription:', insertError)
          throw new Error(`Erro ao inserir subscription: ${insertError.message}`)
        }
        console.log('[stripe-checkout] ✅ Subscription criada')
      }
    } else if (existing && !existing.stripe_customer_id) {
      // Atualizar tenant_id e plan_id se ausente
      console.log('[stripe-checkout] Completando dados da subscription...')
      const { error: updateError } = await serviceClient
        .from('subscriptions')
        .update({
          tenant_id: existing.tenant_id ?? tenantId,
          plan_id: existing.plan_id ?? planId
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[stripe-checkout] ❌ Erro ao atualizar subscription:', updateError)
        throw new Error(`Erro ao atualizar subscription: ${updateError.message}`)
      }
      console.log('[stripe-checkout] ✅ Subscription completada')
    }

    // Verificação final: garantir que temos um customer válido
    if (!customerId) {
      console.error('[stripe-checkout] ❌ Customer ID ausente antes de criar sessão')
      throw new Error('Falha ao obter/criar customer ID')
    }

    console.log('[stripe-checkout] Criando checkout session com customer:', customerId)
    console.log('[stripe-checkout] Price ID:', body.priceId)
    console.log('[stripe-checkout] Success URL:', `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`)
    console.log('[stripe-checkout] Cancel URL:', `${siteUrl}/subscribe?canceled=true`)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/subscribe?canceled=true`,
      line_items: [
        {
          price: body.priceId,
          quantity: 1
        }
      ],
      metadata: {
        supabase_user_id: user.id,
        price_id: body.priceId
      }
    })

    console.log('[stripe-checkout] ✅ Session created:', session.id)

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[stripe-checkout] ❌ Erro inesperado:', error)

    let message = 'Erro desconhecido'
    let stack = 'N/A'
    let statusCode = 500

    if (error instanceof Error) {
      message = error.message
      stack = error.stack?.substring(0, 500) ?? 'N/A'

      // Se for erro do Stripe, extrair mensagem mais clara
      const stripeError = error as any
      if (stripeError.code) {
        message = `Stripe Error (${stripeError.code}): ${stripeError.message}`
        if (stripeError.param) {
          message += ` [param: ${stripeError.param}]`
        }
      }
    } else if (typeof error === 'string') {
      message = error
    } else if (error && typeof error === 'object') {
      const errorObj = error as any
      message = JSON.stringify(errorObj).substring(0, 300)

      // Se for erro Supabase
      if (errorObj.message) {
        message = errorObj.message
      }
    }

    console.error('[stripe-checkout] Error message:', message)
    console.error('[stripe-checkout] Error stack:', stack)
    console.error('[stripe-checkout] Full error object:', JSON.stringify(error, null, 2).substring(0, 1000))

    return new Response(JSON.stringify({
      error: message,
      type: error instanceof Error ? error.constructor.name : typeof error
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
