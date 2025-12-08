/// <reference lib="deno.window" />
// deno-lint-ignore-file no-explicit-any

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  // CORS headers para respostas normais também
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  try {
    const { instanceId, baseUrl, token, webhookUrl } = await req.json()

    if (!instanceId || !token || !webhookUrl) {
      return new Response(JSON.stringify({ error: 'instanceId, token e webhookUrl são obrigatórios' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Normalizar base
    const providerBase = (baseUrl && baseUrl.trim()) || 'https://api.z-api.io'
    const base = providerBase.endsWith('/instances') ? providerBase : `${providerBase.replace(/\/$/, '')}/instances`

    // 1) Configurar webhook - tentar rota padrão
    let webhookOk = false
    try {
      const webhookResp = await fetch(`${base}/${instanceId}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': token,
        },
        body: JSON.stringify({ url: webhookUrl, enabled: true }),
      })
      webhookOk = webhookResp.ok

      // Se falhou e base parece custom (uazapi), tentar rota token/update-webhook
      if (!webhookOk && providerBase.includes('uazapi')) {
        const tokenRoute = `${providerBase.replace(/\/$/, '')}/instances/${instanceId}/token/${token}/update-webhook`
        try {
          const resp2 = await fetch(tokenRoute, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: webhookUrl })
          })
          webhookOk = resp2.ok
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // se a primeira tentativa falhar, tentar rota token/update-webhook para Uazapi
      if (providerBase.includes('uazapi')) {
        const tokenRoute = `${providerBase.replace(/\/$/, '')}/instances/${instanceId}/token/${token}/update-webhook`
        try {
          const resp2 = await fetch(tokenRoute, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: webhookUrl })
          })
          webhookOk = resp2.ok
        } catch (err) {
          // ignore
        }
      }
    }

    // 2) Testar status da instância
    let statusOk = false
    try {
      const statusResp = await fetch(`${base}/${instanceId}/status`, {
        method: 'GET',
        headers: { 'Client-Token': token },
      })
      statusOk = statusResp.ok
    } catch (e) {
      // ignore
    }

    return new Response(JSON.stringify({ success: true, webhookOk, statusOk }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('configure-zapi error:', error)
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
