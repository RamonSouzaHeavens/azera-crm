import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, max_tokens = 1500, model = 'gpt-4o-mini', response_format } = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('VITE_OPENAI_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log('🤖 Calling OpenAI API with model:', model)

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens,
        temperature: 0.7,
        ...(response_format && { response_format })
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error('OpenAI API Error:', errorData)
      throw new Error(errorData.error?.message || 'OpenAI API request failed')
    }

    const data = await openaiResponse.json()
    console.log('✅ OpenAI response received')

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
