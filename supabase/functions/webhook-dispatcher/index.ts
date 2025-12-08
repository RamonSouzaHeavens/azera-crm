import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookEvent {
  id: string
  tenant_id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

interface WebhookSubscription {
  id: string
  tenant_id: string
  name: string
  url: string
  is_active: boolean
  events: string[]
  secret: string
  last_triggered_at: string | null
}

interface WebhookDelivery {
  id: string
  event_id: string
  subscription_id: string
  attempt_count: number
  status: 'pending' | 'success' | 'failure' | 'dead'
  last_status_code: number | null
  last_error: string | null
  next_retry_at: string | null
}

// Configurações de retry (backoff exponencial)
const RETRY_CONFIG = {
  maxAttempts: 6,
  delays: [60, 300, 900, 3600, 21600, 86400], // 1m, 5m, 15m, 1h, 6h, 24h (em segundos)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[webhook-dispatcher] Starting webhook dispatch job')

    // Criar cliente Supabase com SERVICE_ROLE (bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1. Buscar eventos pendentes (últimos 100)
    const { data: pendingEvents, error: eventsError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100)

    if (eventsError) {
      console.error('[webhook-dispatcher] Erro ao buscar eventos:', eventsError)
      throw eventsError
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      console.log('[webhook-dispatcher] Nenhum evento pendente')
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Nenhum evento pendente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[webhook-dispatcher] ${pendingEvents.length} eventos pendentes encontrados`)

    let processedCount = 0
    let successCount = 0
    let failureCount = 0

    // 2. Processar cada evento
    for (const event of pendingEvents as WebhookEvent[]) {
      try {
        // Marcar como processing
        await supabase
          .from('webhook_events')
          .update({ status: 'processing' })
          .eq('id', event.id)

        // Buscar subscriptions ativas para este tenant e event_type
        const { data: subscriptions, error: subsError } = await supabase
          .from('webhook_subscriptions')
          .select('*')
          .eq('tenant_id', event.tenant_id)
          .eq('is_active', true)
          .contains('events', [event.event_type])

        if (subsError) {
          console.error(`[webhook-dispatcher] Erro ao buscar subscriptions para evento ${event.id}:`, subsError)
          continue
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`[webhook-dispatcher] Nenhuma subscription ativa para evento ${event.id} (${event.event_type})`)
          // Marcar como done (sem subscriptions)
          await supabase
            .from('webhook_events')
            .update({ status: 'done', processed_at: new Date().toISOString() })
            .eq('id', event.id)
          processedCount++
          continue
        }

        console.log(`[webhook-dispatcher] ${subscriptions.length} subscriptions encontradas para evento ${event.id}`)

        // 3. Enviar para cada subscription
        for (const subscription of subscriptions as WebhookSubscription[]) {
          await processDelivery(supabase, event, subscription)
        }

        // Marcar evento como done
        await supabase
          .from('webhook_events')
          .update({ status: 'done', processed_at: new Date().toISOString() })
          .eq('id', event.id)

        processedCount++
        successCount++
      } catch (error) {
        console.error(`[webhook-dispatcher] Erro ao processar evento ${event.id}:`, error)
        
        // Marcar como failed
        await supabase
          .from('webhook_events')
          .update({ status: 'failed', processed_at: new Date().toISOString() })
          .eq('id', event.id)

        failureCount++
      }
    }

    // 4. Processar retries pendentes
    const { data: pendingRetries, error: retriesError } = await supabase
      .from('webhook_deliveries')
      .select('*, webhook_events!inner(id, tenant_id, event_type, payload)')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .limit(50)

    if (!retriesError && pendingRetries && pendingRetries.length > 0) {
      console.log(`[webhook-dispatcher] ${pendingRetries.length} retries pendentes encontrados`)
      
      for (const delivery of pendingRetries) {
        const event = delivery.webhook_events as unknown as WebhookEvent
        
        const { data: subscription } = await supabase
          .from('webhook_subscriptions')
          .select('*')
          .eq('id', delivery.subscription_id)
          .single()

        if (subscription) {
          await retryDelivery(supabase, delivery, event, subscription as WebhookSubscription)
        }
      }
    }

    console.log(`[webhook-dispatcher] Processamento completo: ${processedCount} eventos, ${successCount} sucesso, ${failureCount} falhas`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        successful: successCount,
        failed: failureCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[webhook-dispatcher] Erro crítico:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processDelivery(
  supabase: any,
  event: WebhookEvent,
  subscription: WebhookSubscription
) {
  try {
    // Verificar se já existe delivery para este evento e subscription
    const { data: existingDelivery } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('event_id', event.id)
      .eq('subscription_id', subscription.id)
      .single()

    if (existingDelivery) {
      console.log(`[webhook-dispatcher] Delivery já existe para evento ${event.id} e subscription ${subscription.id}`)
      return
    }

    // Criar delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('webhook_deliveries')
      .insert({
        event_id: event.id,
        subscription_id: subscription.id,
        status: 'pending',
        attempt_count: 0,
      })
      .select()
      .single()

    if (deliveryError) {
      console.error('[webhook-dispatcher] Erro ao criar delivery:', deliveryError)
      return
    }

    // Tentar enviar
    await sendWebhook(supabase, delivery, event, subscription)
  } catch (error) {
    console.error('[webhook-dispatcher] Erro em processDelivery:', error)
  }
}

async function retryDelivery(
  supabase: any,
  delivery: WebhookDelivery,
  event: WebhookEvent,
  subscription: WebhookSubscription
) {
  await sendWebhook(supabase, delivery, event, subscription)
}

async function sendWebhook(
  supabase: any,
  delivery: WebhookDelivery,
  event: WebhookEvent,
  subscription: WebhookSubscription
) {
  const attemptCount = delivery.attempt_count + 1

  try {
    // Preparar payload
    const payload = {
      event_id: event.id,
      tenant_id: event.tenant_id,
      event_type: event.event_type,
      occurred_at: event.created_at,
      data: event.payload,
      meta: {
        source: 'azera-crm-v1',
        attempt: attemptCount,
      },
    }

    const payloadString = JSON.stringify(payload)

    // Gerar assinatura HMAC
    const signature = await generateHMAC(subscription.secret, payloadString)

    // Preparar headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Azera-Event': event.event_type,
      'X-Azera-Delivery-Id': delivery.id,
      'X-Azera-Idempotency-Key': event.id,
      'X-Azera-Signature': `sha256=${signature}`,
      'User-Agent': 'Azera-Webhook/1.0',
    }

    console.log(`[webhook-dispatcher] Enviando webhook para ${subscription.url} (tentativa ${attemptCount})`)

    // Enviar request
    const response = await fetch(subscription.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30s timeout
    })

    const statusCode = response.status
    const responseBody = await response.text().catch(() => '')

    // Atualizar delivery com resultado
    if (statusCode >= 200 && statusCode < 300) {
      // Sucesso
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'success',
          attempt_count: attemptCount,
          last_status_code: statusCode,
          last_attempted_at: new Date().toISOString(),
          response_body: responseBody.substring(0, 1000), // Limitar tamanho
          request_headers: headers,
        })
        .eq('id', delivery.id)

      // Atualizar last_triggered_at da subscription
      await supabase
        .from('webhook_subscriptions')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', subscription.id)

      console.log(`[webhook-dispatcher] Webhook enviado com sucesso para ${subscription.url}`)
    } else {
      // Falha
      const shouldRetry = attemptCount < RETRY_CONFIG.maxAttempts
      const nextRetryAt = shouldRetry
        ? new Date(Date.now() + RETRY_CONFIG.delays[attemptCount - 1] * 1000).toISOString()
        : null

      await supabase
        .from('webhook_deliveries')
        .update({
          status: shouldRetry ? 'pending' : 'dead',
          attempt_count: attemptCount,
          last_status_code: statusCode,
          last_error: `HTTP ${statusCode}: ${responseBody.substring(0, 500)}`,
          last_attempted_at: new Date().toISOString(),
          next_retry_at: nextRetryAt,
          response_body: responseBody.substring(0, 1000),
          request_headers: headers,
        })
        .eq('id', delivery.id)

      console.log(
        `[webhook-dispatcher] Webhook falhou (${statusCode}). ${shouldRetry ? `Retry em ${RETRY_CONFIG.delays[attemptCount - 1]}s` : 'Dead letter'}`
      )
    }
  } catch (error) {
    console.error(`[webhook-dispatcher] Erro ao enviar webhook:`, error)

    // Erro de rede ou timeout
    const shouldRetry = attemptCount < RETRY_CONFIG.maxAttempts
    const nextRetryAt = shouldRetry
      ? new Date(Date.now() + RETRY_CONFIG.delays[attemptCount - 1] * 1000).toISOString()
      : null

    await supabase
      .from('webhook_deliveries')
      .update({
        status: shouldRetry ? 'pending' : 'dead',
        attempt_count: attemptCount,
        last_error: error.message.substring(0, 500),
        last_attempted_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
      })
      .eq('id', delivery.id)
  }
}

async function generateHMAC(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)

  // Converter para hex
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
