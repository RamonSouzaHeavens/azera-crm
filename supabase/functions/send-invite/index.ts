import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  console.log('[send-invite] Requisição recebida:', req.method)
  
  // Preflight
  if (req.method === "OPTIONS") {
    console.log('[send-invite] CORS preflight')
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('[send-invite] Body recebido:', body)
    
    const { email, nome, token, equipeNome } = body

    // Validações obrigatórias
    if (!email || !token) {
      console.error('[send-invite] Dados ausentes - email:', !!email, 'token:', !!token)
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'email e token são obrigatórios' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const APP_URL = Deno.env.get("http://localhost:5173")
    const RESEND_API_KEY = Deno.env.get("re_Pr4sq8Au_LLwa7MpdvXHDty8Y5uBfD3mZ")

    console.log('[send-invite] Env vars - APP_URL:', !!APP_URL, 'RESEND_API_KEY:', !!RESEND_API_KEY)

    if (!APP_URL) {
      console.error('[send-invite] APP_URL não configurada')
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'APP_URL não configurada' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (!RESEND_API_KEY) {
      console.error('[send-invite] RESEND_API_KEY não configurada')
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'RESEND_API_KEY não configurada' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const acceptUrl = `${APP_URL}/invite/accept?token=${encodeURIComponent(token)}`
    console.log('[send-invite] URL de aceitação gerada:', acceptUrl)

    // Usando Resend para envio de email
    const emailData = {
      from: "Heavens <convites@heavensenterprise.com.br>",
      to: [email],
      subject: `Convite para entrar na equipe ${equipeNome || 'Heavens Enterprise'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Heavens Enterprise</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Convite para equipe</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Olá ${nome || 'Usuário'},</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Você foi convidado(a) para fazer parte da equipe <strong style="color: #333;">${equipeNome || 'Heavens Enterprise'}</strong> 
              na plataforma Heavens Enterprise.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;
                        font-size: 16px;">
                Aceitar Convite
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-bottom: 0;">
              Ou copie e cole este link no seu navegador:<br>
              <span style="word-break: break-all; color: #667eea;">${acceptUrl}</span>
            </p>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p>Se você não esperava este convite, pode ignorar este email com segurança.</p>
            <p>&copy; ${new Date().getFullYear()} Heavens Enterprise. Todos os direitos reservados.</p>
          </div>
        </div>
      `
    }

    console.log('[send-invite] Enviando email para:', email)

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailData)
    })

    const responseText = await res.text()
    console.log('[send-invite] Resposta do Resend status:', res.status)
    console.log('[send-invite] Resposta do Resend body:', responseText)

    if (!res.ok) {
      console.error('[send-invite] Erro no Resend:', res.status, responseText)
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `Resend ${res.status}: ${responseText}` 
      }), { 
        status: 502, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      result = { raw: responseText }
    }

    console.log('[send-invite] Email enviado com sucesso! ID:', result.id)

    return new Response(JSON.stringify({ 
      ok: true, 
      messageId: result.id,
      provider: result
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: unknown) {
    console.error('[send-invite] Erro na Edge Function:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'erro inesperado'
    
    return new Response(JSON.stringify({ 
      ok: false, 
      error: errorMessage
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
