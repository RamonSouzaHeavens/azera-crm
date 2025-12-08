import { supabase } from '../lib/supabase'

// Função para enviar convite para conta já existente
export async function sendExistingAccountInvite(
  email: string,
  companyName: string,
  inviterName: string
) {
  try {
    console.log('📧 Enviando notificação para conta existente...')
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/login?invited=true&company=${encodeURIComponent(companyName)}`,
        data: {
          company_name: companyName,
          inviter_name: inviterName,
          invite_type: 'existing_account_notification'
        }
      }
    })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao enviar notificação para conta existente:', error)
    throw error
  }
}

// Função para enviar convite para nova conta criada
export async function sendNewAccountInvite(
  email: string,
  companyName: string,
  inviterName: string,
  userId: string
) {
  try {
    console.log('📧 Enviando credenciais para nova conta...')
    
    const setupUrl = `${window.location.origin}/login?setup=true&user=${userId}&company=${encodeURIComponent(companyName)}`
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: setupUrl,
        data: {
          company_name: companyName,
          inviter_name: inviterName,
          user_id: userId,
          invite_type: 'new_account_setup'
        }
      }
    })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao enviar credenciais para nova conta:', error)
    throw error
  }
}

// Função para enviar convite personalizado
export async function sendCustomInvite(
  email: string,
  companyName: string,
  inviterName: string,
  role: 'admin' | 'vendedor'
) {
  try {
    // Gerar magic link personalizado
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/login?redirect=/configuracoes&invited=true`,
        data: {
          company_name: companyName,
          inviter_name: inviterName,
          role: role,
          invite_type: 'team_member'
        }
      }
    })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao enviar convite personalizado:', error)
    throw error
  }
}

// Template de email personalizado (para uso futuro com provedor externo)
export function generateInviteEmailTemplate(
  companyName: string,
  inviterName: string,
  role: 'admin' | 'vendedor',
  magicLink: string
) {
  const roleDisplay = role === 'admin' ? 'Administrador' : 'Vendedor'
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite para a Equipe - ${companyName}</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: #f8fafc;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 20px;
                text-align: center;
                color: white;
            }
            .content {
                padding: 40px 30px;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 20px 0;
            }
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏢 ${companyName}</h1>
                <p>Convite para Equipe</p>
            </div>
            <div class="content">
                <h2>Olá! 👋</h2>
                <p><strong>${inviterName}</strong> convidou você para fazer parte da equipe como <strong>${roleDisplay}</strong>.</p>
                <p>Clique no botão abaixo para aceitar o convite e começar a usar nossa plataforma:</p>
                
                <div class="button-container">
                    <a href="${magicLink}" class="cta-button">
                        🚀 Aceitar Convite
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                    Este link expira em 24 horas por questões de segurança.
                </p>
            </div>
        </div>
    </body>
    </html>
  `
}
