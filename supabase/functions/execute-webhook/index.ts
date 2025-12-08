import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Execute Webhook Edge Function loaded")

serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse do body
    const body = await req.json()
    const { url, method = 'POST', headers = {}, payload } = body

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL obrigatória' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('Executando webhook:', { url, method, headers: Object.keys(headers) })

    // Preparar request
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    if (method !== 'GET' && payload) {
      requestInit.body = JSON.stringify(payload)
    }

    // Executar chamada HTTP
    const response = await fetch(url, requestInit)
    const responseText = await response.text()

    console.log('Resposta do webhook:', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      bodyLength: responseText.length
    })

    // Tentar parsear como JSON
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { text: responseText }
    }

    return new Response(JSON.stringify({
      sucesso: response.ok,
      status: response.status,
      dados: responseData,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})