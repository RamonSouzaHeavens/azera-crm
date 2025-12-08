import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseKey)

// Função para gerar assinatura HMAC
function generateHMACSignature(payload: string, secret: string): string {
  const encoder = new TextEncoder()
  const key = encoder.encode(secret)
  const data = encoder.encode(payload)

  // Usar Web Crypto API para HMAC-SHA256
  return crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    .then(key => crypto.subtle.sign('HMAC', key, data))
    .then(signature => Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''))
}

interface WebhookBody {
  automacao_id: string
  dados: Record<string, unknown>
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { automacao_id, dados } = (await req.json()) as WebhookBody

    if (!automacao_id || !dados) {
      return new Response(
        JSON.stringify({ erro: 'Parâmetros inválidos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Buscar automação
    const { data: automacao, error: autoError } = await supabase
      .from('automacoes')
      .select('*')
      .eq('id', automacao_id)
      .single()

    if (autoError || !automacao) {
      return new Response(
        JSON.stringify({ erro: 'Automação não encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!automacao.ativo) {
      return new Response(
        JSON.stringify({ erro: 'Automação inativa' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Preparar headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(automacao.headers || {}),
    }

    // Adicionar assinatura HMAC se for webhook
    if (automacao.tipo === 'webhook' && automacao.webhook_secret) {
      const payloadString = JSON.stringify(dados)
      const signature = await generateHMACSignature(payloadString, automacao.webhook_secret)
      headers['X-Webhook-Secret'] = automacao.webhook_secret
      headers['X-HMAC-Signature'] = `sha256=${signature}`
      headers['X-Timestamp'] = Date.now().toString()
    }

    // Executar requisição
    const inicio = Date.now()
    let response: Response
    let resposta: unknown = null
    let erro: string | null = null

    try {
      response = await fetch(automacao.url, {
        method: automacao.metodo_http,
        headers,
        body:
          automacao.metodo_http !== 'GET'
            ? JSON.stringify(dados)
            : undefined,
      })

      const texto = await response.text()
      try {
        resposta = JSON.parse(texto)
      } catch {
        resposta = texto
      }

      if (!response.ok) {
        erro = `HTTP ${response.status}`
      }
    } catch (e) {
      response = new Response('', { status: 0 })
      erro = e instanceof Error ? e.message : 'Erro desconhecido'
    }

    const tempo_ms = Date.now() - inicio
    const sucesso = !erro

    // Registrar log
    await supabase.from('automacao_logs').insert({
      automacao_id,
      status: sucesso ? 'sucesso' : 'erro',
      dados_enviados: dados,
      resposta: resposta,
      erro: erro,
      codigo_http: response.status || 0,
      tempo_ms,
    })

    // Atualizar automação
    await supabase.from('automacoes').update({
      ultimo_status: sucesso ? 'sucesso' : 'erro',
      ultimo_erro: erro,
      ultima_execucao: new Date().toISOString(),
      tentativas_falhadas: sucesso
        ? 0
        : (automacao.tentativas_falhadas || 0) + 1,
    }).eq('id', automacao_id)

    return new Response(
      JSON.stringify({
        sucesso,
        tempo_ms,
        status: response.status,
        resposta: sucesso ? resposta : null,
        erro: sucesso ? null : erro,
      }),
      {
        status: sucesso ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ erro: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
