import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    // Extrair dados da requisição
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenant_id')

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenant_id é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Buscar webhooks ativos do tenant
    const { data: webhooks, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, secret')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar webhooks' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Retornar lista de webhooks com seus secrets (para verificação HMAC)
    const result = webhooks.map(webhook => ({
      id: webhook.id,
      secret: webhook.secret
    }))

    return new Response(
      JSON.stringify({
        success: true,
        webhooks: result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})