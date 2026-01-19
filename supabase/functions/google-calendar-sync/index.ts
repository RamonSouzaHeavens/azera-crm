import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description || 'Erro ao renovar token')
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Determinar o user_id: via body (chamada interna) ou via Bearer token (chamada do frontend)
    let userId: string | null = null

    // Tentar pegar user_id do body (para chamadas internas como webhook)
    try {
      const body = await req.json()
      if (body.user_id) {
        userId = body.user_id
        console.log('[SYNC] Usando user_id do body:', userId)
      }
    } catch {
      // Body vazio ou inválido, vai usar o token
    }

    // Se não veio no body, usar o Authorization header
    if (!userId) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) throw new Error('Não autorizado')

      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (authError || !user) throw new Error('Usuário não encontrado')
      userId = user.id
      console.log('[SYNC] Usando user_id do token:', userId)
    }

    // Buscar integração
    const { data: integration, error: intError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single()

    if (intError || !integration) throw new Error('Integração não encontrada')


    let accessToken = integration.access_token

    // Verificar se o token expirou
    if (new Date(integration.token_expires_at) <= new Date()) {
      console.log('Token expirado, renovando...')
      const newTokens = await refreshGoogleToken(integration.refresh_token)
      accessToken = newTokens.access_token

      const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString()

      await supabase
        .from('calendar_integrations')
        .update({
          access_token: accessToken,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id)
    }

    // 1. Enviar eventos locais para o Google (que ainda não foram sincronizados)
    const { data: localEvents, error: localEventsError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .is('google_event_id', null)
      .neq('status', 'cancelled')

    console.log('[SYNC] Eventos locais encontrados:', localEvents?.length || 0)
    if (localEventsError) {
      console.error('[SYNC] Erro ao buscar eventos locais:', localEventsError)
    }

    for (const event of (localEvents || [])) {
      try {
        console.log('[SYNC] Enviando evento para Google:', event.id, event.title)

        const googlePayload: any = {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: event.all_day ? { date: event.start_date.split('T')[0] } : { dateTime: event.start_date },
          end: event.all_day ? { date: event.end_date?.split('T')[0] || event.start_date.split('T')[0] } : { dateTime: event.end_date || event.start_date },
        }

        // Adicionar lembretes se existirem
        if (event.reminders && Array.isArray(event.reminders) && event.reminders.length > 0) {
          googlePayload.reminders = {
            useDefault: false,
            overrides: event.reminders.map((r: any) => ({
              method: 'popup',
              minutes: r.minutes_before || r.minutes || 30
            }))
          }
        }


        console.log('[SYNC] Payload Google:', JSON.stringify(googlePayload))

        const googleEventResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googlePayload)
        })

        const googleEvent = await googleEventResponse.json()
        console.log('[SYNC] Resposta Google - Status:', googleEventResponse.status, 'Body:', JSON.stringify(googleEvent))

        if (googleEventResponse.ok) {
          console.log('[SYNC] Evento criado no Google com ID:', googleEvent.id)
          const { error: updateError } = await supabase
            .from('calendar_events')
            .update({
              google_event_id: googleEvent.id,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString()
            })
            .eq('id', event.id)

          if (updateError) {
            console.error('[SYNC] Erro ao atualizar evento local:', updateError)
          }
        } else {
          console.error('[SYNC] Erro do Google API:', googleEvent.error?.message || googleEvent)
        }
      } catch (err) {
        console.error('[SYNC] Erro ao sincronizar evento local:', err)
      }
    }

    // 2. Trazer eventos do Google para o Azera
    // Pegar eventos dos últimos 30 dias e próximos 90 dias
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)

    const googleEventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&singleEvents=true&orderBy=startTime`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    const googleEventsData = await googleEventsResponse.json()

    // Buscar TODAS as integrações que usam o mesmo email do Google
    // Isso permite que o mesmo Google Calendar apareça em múltiplas contas do Azera
    const { data: allIntegrations } = await supabase
      .from('calendar_integrations')
      .select('id, tenant_id, user_id, google_email')
      .eq('google_email', integration.google_email)
      .eq('provider', 'google')
      .eq('status', 'connected')

    console.log('[SYNC] Integrações com mesmo email encontradas:', allIntegrations?.length || 0)

    if (googleEventsResponse.ok && googleEventsData.items) {
      for (const gEvent of googleEventsData.items) {
        if (gEvent.status === 'cancelled') continue

        // Para cada integração com o mesmo email, verificar/criar o evento
        for (const targetIntegration of (allIntegrations || [])) {
          // Verificar se já existe neste tenant
          const { data: existing } = await supabase
            .from('calendar_events')
            .select('id')
            .eq('google_event_id', gEvent.id)
            .eq('tenant_id', targetIntegration.tenant_id)
            .maybeSingle()

          if (!existing) {
            console.log(`[SYNC] Criando evento "${gEvent.summary}" no tenant ${targetIntegration.tenant_id}`)
            await supabase
              .from('calendar_events')
              .insert({
                tenant_id: targetIntegration.tenant_id,
                user_id: targetIntegration.user_id,
                title: gEvent.summary || '(Sem título)',
                description: gEvent.description,
                location: gEvent.location,
                start_date: gEvent.start.dateTime || gEvent.start.date,
                end_date: gEvent.end.dateTime || gEvent.end.date,
                all_day: !!gEvent.start.date,
                google_event_id: gEvent.id,
                sync_status: 'synced',
                source: 'google',
                last_synced_at: new Date().toISOString()
              })
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro na sincronização:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
