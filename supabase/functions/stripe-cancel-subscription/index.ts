import { serve } from 'https://deno.land/std@0.214.0/http/server.ts'
import { createClient } from 'supabase'
import Stripe from 'stripe'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

if (!stripeSecret) console.error('[stripe-cancel-subscription] STRIPE_SECRET_KEY não configurada')

const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2023-10-16', typescript: true }) : null
const serviceClient = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (!stripe || !serviceClient) {
    return new Response(JSON.stringify({ error: 'Servidor mal configurado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Criar cliente Supabase com o token do usuário para validar identidade
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json().catch(() => null) as { subscriptionId?: string, supabaseId?: string }
    const subscriptionId = body?.subscriptionId
    const supabaseId = body?.supabaseId

    if (!subscriptionId || !supabaseId) {
      return new Response(JSON.stringify({ error: 'subscriptionId e supabaseId são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // SEGURANÇA: Verificar se a assinatura pertence ao usuário que está pedindo o cancelamento
    const { data: subData, error: subError } = await serviceClient
      .from('subscriptions')
      .select('user_id, stripe_subscription_id')
      .eq('id', supabaseId)
      .single()

    if (subError || !subData) {
      return new Response(JSON.stringify({ error: 'Assinatura não encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (subData.user_id !== user.id) {
       // Se o ID não bate, verificamos se o usuário é um master admin (opcional, mas aqui bloqueamos por segurança)
       if (user.email !== 'ramonexecut@gmail.com') {
         return new Response(JSON.stringify({ error: 'Você não tem permissão para cancelar esta assinatura' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
       }
    }

    console.log(`[stripe-cancel-subscription] Usuário ${user.email} cancelando:`, subscriptionId)
    
    // Cancela no Stripe
    const canceled = await stripe.subscriptions.del(subscriptionId)

    // Atualizar registro no Supabase
    const { error: updateError } = await serviceClient
      .from('subscriptions')
      .update({ status: 'canceled', cancel_at_period_end: false, updated_at: new Date().toISOString() })
      .eq('id', supabaseId)

        if (updateError) console.warn('[stripe-cancel-subscription] Erro ao atualizar Supabase:', updateError.message)
        else console.log('[stripe-cancel-subscription] Subscription atualizada no Supabase:', supabaseId)
      } catch (err) {
        console.error('[stripe-cancel-subscription] Erro updating supabase:', err)
      }
    }

    return new Response(JSON.stringify({ canceled }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const error = err as any
    console.error('[stripe-cancel-subscription] Error:', error?.message ?? err)
    return new Response(JSON.stringify({ error: error?.message ?? 'Erro desconhecido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
