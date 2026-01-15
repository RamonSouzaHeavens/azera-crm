// Edge Function: google-calendar-callback
// Recebe o callback do OAuth do Google e salva os tokens

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') ||
  'https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/google-calendar-callback'
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://azera.space'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Se houve erro no OAuth
    if (error) {
      console.error('Erro OAuth:', error)
      return Response.redirect(`${FRONTEND_URL}/app/agenda?error=auth_failed`)
    }

    if (!code || !state) {
      return Response.redirect(`${FRONTEND_URL}/app/agenda?error=missing_params`)
    }

    // Decodificar state para obter userId
    let stateData: { userId: string; timestamp: number }
    try {
      stateData = JSON.parse(atob(state))
    } catch {
      return Response.redirect(`${FRONTEND_URL}/app/agenda?error=invalid_state`)
    }

    // Trocar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Erro ao trocar código por tokens:', tokens)
      return Response.redirect(`${FRONTEND_URL}/app/agenda?error=token_exchange_failed`)
    }

    // Obter informações do usuário do Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    const googleUser = await userInfoResponse.json()

    // Obter lista de calendários do usuário
    const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    const calendarsData = await calendarsResponse.json()

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar tenant_id do usuário
    const { data: membership } = await supabase
      .from('memberships')
      .select('tenant_id')
      .eq('user_id', stateData.userId)
      .single()

    if (!membership) {
      return Response.redirect(`${FRONTEND_URL}/app/agenda?error=no_membership`)
    }

    // Calcular data de expiração do access token
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()

    // Salvar ou atualizar integração
    const { error: upsertError } = await supabase
      .from('calendar_integrations')
      .upsert({
        tenant_id: membership.tenant_id,
        user_id: stateData.userId,
        provider: 'google',
        google_email: googleUser.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        status: 'connected',
        last_sync_at: new Date().toISOString(),
        settings: {
          calendars: calendarsData.items || []
        }
      }, {
        onConflict: 'tenant_id,user_id,provider'
      })

    if (upsertError) {
      console.error('Erro ao salvar integração:', upsertError)
      return Response.redirect(`${FRONTEND_URL}/app/agenda?error=save_failed`)
    }

    // Redirecionar para a página da Agenda com sucesso
    return Response.redirect(`${FRONTEND_URL}/app/agenda?success=google_connected`)

  } catch (error) {
    console.error('Erro no callback:', error)
    return Response.redirect(`${FRONTEND_URL}/app/agenda?error=internal_error`)
  }
})
