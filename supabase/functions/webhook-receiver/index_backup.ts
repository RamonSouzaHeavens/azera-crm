import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[WEBHOOK] START - Method:', req.method)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[WEBHOOK] Missing environment variables')
      return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers: corsHeaders })
    }

    // 1. Handle Meta Webhook Verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      console.log('[WEBHOOK] Verification request received')
      console.log('[WEBHOOK] Mode:', mode)
      console.log('[WEBHOOK] Token received:', token)
      console.log('[WEBHOOK] Challenge:', challenge)
      console.log('[WEBHOOK] Expected token: azera-crm-token')

      // Token de verificaÃ§Ã£o aceito
      const VERIFY_TOKEN = 'azera-crm-token'

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[WEBHOOK] âœ… Verification SUCCESS! Returning challenge.')
        return new Response(challenge || '', {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        })
      } else {
        console.error('[WEBHOOK] âŒ Verification FAILED!')
        console.error('[WEBHOOK] Expected mode: subscribe, got:', mode)
        console.error('[WEBHOOK] Expected token: azera-crm-token, got:', token)
        return new Response('Forbidden', {
          status: 403,
          headers: corsHeaders
        })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const rawBody = await req.text()
    console.log('[WEBHOOK] Payload received, length:', rawBody.length)

    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      console.error('[WEBHOOK] Invalid JSON')
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 200, headers: corsHeaders })
    }

    // -------------------------------------------------------------------------
    // HANDLE INSTAGRAM WEBHOOKS FROM META
    // -------------------------------------------------------------------------
    if (payload.object === 'instagram' && false) { // DISABLED INSTAGRAM INTEGRATION
      console.log('[WEBHOOK] Processing Instagram payload')

      const entries = payload.entry || []
      for (const entry of entries) {
        const instagramAccountId = entry.id
        const messaging = entry.messaging || []

        console.log('[WEBHOOK] Looking for integration with IG Account ID:', instagramAccountId)

        // Find integration to get Access Token & Tenant
        // Try by instagram_business_account_id first
        let integration = null
        let intError = null

        const { data: int1, error: err1 } = await supabase
          .from('integrations')
          .select('*')
          .contains('credentials', { instagram_business_account_id: instagramAccountId })
          .eq('channel', 'instagram')
          .eq('status', 'active')
          .maybeSingle()

        if (int1) {
          integration = int1
        } else {
          // Try by page_id as fallback
          const { data: int2, error: err2 } = await supabase
            .from('integrations')
            .select('*')
            .contains('credentials', { page_id: instagramAccountId })
            .eq('channel', 'instagram')
            .eq('status', 'active')
            .maybeSingle()

          if (int2) {
            integration = int2
          } else {
            intError = err1 || err2
          }
        }

        if (!integration) {
          console.error('[WEBHOOK] Integration not found for IG Account:', instagramAccountId)
          console.error('[WEBHOOK] Search error:', intError)
          continue
        }

        console.log('[WEBHOOK] Found integration for tenant:', integration.tenant_id)

        const accessToken = integration.credentials.access_token
        const tenantId = integration.tenant_id

        for (const event of messaging) {
          if (event.message && !event.message.is_echo) {
            const senderId = event.sender.id
            const text = event.message.text || ''
            const msgId = event.message.mid
            const attachments = event.message.attachments || []

            console.log(`[WEBHOOK] IG Message from ${senderId}: ${text}`)

            try {
              // Fetch User Profile from Instagram
              let contactName = 'Instagram User'
              let avatarUrl = null
              let username = null

              if (accessToken) {
                try {
                  // Buscar perfil do cliente via Facebook Graph API
                  // Para pegar avatar de clientes (IGSID), usa-se graph.facebook.com com profile_pic
                  console.log('[WEBHOOK] Fetching Instagram profile for sender:', senderId)

                  // Endpoint correto para avatar: graph.facebook.com/v18.0 com profile_pic
                  const profileResp = await fetch(
                    `https://graph.facebook.com/v18.0/${senderId}?fields=name,profile_pic&access_token=${accessToken}`
                  )
                  const profileData = await profileResp.json()

                  console.log('[WEBHOOK] Facebook API response:', JSON.stringify(profileData))

                  if (profileData.error) {
                    console.log('[WEBHOOK] Facebook API error:', profileData.error.message)

                    // Tentar endpoint do Instagram para username
                    console.log('[WEBHOOK] Trying Instagram API for username...')
                    const igResp = await fetch(
                      `https://graph.instagram.com/${senderId}?fields=username,name&access_token=${accessToken}`
                    )
                    const igData = await igResp.json()
                    console.log('[WEBHOOK] Instagram API response:', JSON.stringify(igData))

                    if (!igData.error) {
                      if (igData.name) contactName = igData.name
                      if (igData.username) {
                        username = igData.username
                        contactName = `@${igData.username}`
                      }
                    }
                  } else {
                    if (profileData.name) contactName = profileData.name
                    if (profileData.profile_pic) {
                      avatarUrl = profileData.profile_pic
                      console.log('[WEBHOOK] Got profile_pic!')
                    }

                    // TambÃ©m pegar username via Instagram API
                    try {
                      const igResp = await fetch(
                        `https://graph.instagram.com/${senderId}?fields=username&access_token=${accessToken}`
                      )
                      const igData = await igResp.json()
                      if (!igData.error && igData.username) {
                        username = igData.username
                        contactName = `@${igData.username}`
                      }
                    } catch (e) {
                      console.log('[WEBHOOK] Could not fetch username')
                    }
                  }

                  console.log('[WEBHOOK] Final contact info:', { contactName, username, avatarUrl: avatarUrl ? 'Found' : 'Not found' })
                } catch (e) {
                  console.error('[WEBHOOK] Failed to fetch IG profile:', e)
                }
              } else {
                console.log('[WEBHOOK] No access token available for profile fetch')
              }

              // Find or Create Client
              let clientId = null
              const { data: existingClient } = await supabase
                .from('clientes')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('telefone', senderId)
                .maybeSingle()

              if (existingClient) {
                clientId = existingClient.id

                // Atualizar nome se tivermos um nome melhor que "Instagram User"
                if (contactName && contactName !== 'Instagram User') {
                  console.log('[WEBHOOK] Updating client name to:', contactName)
                  await supabase
                    .from('clientes')
                    .update({
                      nome: contactName,
                      avatar_url: avatarUrl || undefined // sÃ³ atualiza se tiver
                    })
                    .eq('id', clientId)
                }
              } else {
                const { data: newClient, error: clientError } = await supabase
                  .from('clientes')
                  .insert({
                    tenant_id: tenantId,
                    nome: contactName,
                    telefone: senderId,
                    status: 'lead',
                    avatar_url: avatarUrl
                  })
                  .select()
                  .single()

                if (clientError) {
                  console.error('[WEBHOOK] Error creating client:', clientError)
                  continue
                }
                clientId = newClient.id
              }

              // Find or Create Conversation
              let conversationId = null
              const { data: existingConv } = await supabase
                .from('conversations')
                .select('id, unread_count')
                .eq('tenant_id', tenantId)
                .eq('contact_id', clientId)
                .eq('channel', 'instagram')
                .maybeSingle()

              if (existingConv) {
                conversationId = existingConv.id
                // Update conversation
                await supabase
                  .from('conversations')
                  .update({
                    last_message_content: text || '[MÃ­dia]',
                    last_message_at: new Date().toISOString(),
                    unread_count: (existingConv.unread_count || 0) + 1,
                    avatar_url: avatarUrl
                  })
                  .eq('id', conversationId)
              } else {
                const { data: newConv, error: convError } = await supabase
                  .from('conversations')
                  .insert({
                    tenant_id: tenantId,
                    contact_id: clientId,
                    channel: 'instagram',
                    status: 'open',
                    unread_count: 1,
                    total_messages: 1,
                    last_message_content: text || '[MÃ­dia]',
                    last_message_at: new Date().toISOString(),
                    avatar_url: avatarUrl
                  })
                  .select()
                  .single()

                if (convError) {
                  console.error('[WEBHOOK] Error creating conversation:', convError)
                  continue
                }
                conversationId = newConv.id
              }

              // Handle attachments
              let messageType = 'text'
              let mediaUrl = null
              let finalContent = text

              if (attachments.length > 0) {
                const att = attachments[0]
                if (att.type === 'image') {
                  messageType = 'image'
                  mediaUrl = att.payload?.url
                  finalContent = ''
                } else if (att.type === 'video') {
                  messageType = 'video'
                  mediaUrl = att.payload?.url
                  finalContent = ''
                } else if (att.type === 'audio') {
                  messageType = 'audio'
                  mediaUrl = att.payload?.url
                  finalContent = ''
                }
              }

              // Insert Message
              const { error: msgError } = await supabase
                .from('messages')
                .insert({
                  conversation_id: conversationId,
                  direction: 'inbound',
                  message_type: messageType,
                  content: finalContent,
                  status: 'delivered',
                  media_url: mediaUrl,
                  external_message_id: msgId,
                  created_at: new Date().toISOString()
                })

              if (msgError) {
                console.error('[WEBHOOK] Error inserting message:', msgError)
              } else {
                console.log('[WEBHOOK] Message saved successfully')
              }

            } catch (err) {
              console.error('[WEBHOOK] Processing error:', err)
            }
          }
        }
      }

      return new Response('EVENT_RECEIVED', { status: 200 })
    }

    // -------------------------------------------------------------------------
    // HANDLE WHATSAPP WEBHOOKS (UAZAPI, Z-API, N8N, etc)
    // -------------------------------------------------------------------------

    // Unwrap N8N/Uazapi wrapper
    let actualPayload = payload
    if (Array.isArray(payload) && payload[0]?.body) {
      actualPayload = payload[0].body
    } else if (payload.body) {
      actualPayload = payload.body
    }

    console.log('[WEBHOOK] Processing WhatsApp payload')
    console.log('[WEBHOOK] EventType:', actualPayload?.EventType)
    console.log('[WEBHOOK] Has chat:', !!actualPayload?.chat)
    console.log('[WEBHOOK] Has message:', !!actualPayload?.message)

    // Accept 'messages' event OR any payload with message data (for compatibility)
    const isMessageEvent = actualPayload?.EventType === 'messages' ||
      actualPayload?.EventType === undefined ||
      (actualPayload?.message && actualPayload?.chat)

    if (!isMessageEvent) {
      console.log('[WEBHOOK] Ignoring non-message event:', actualPayload?.EventType)
      return new Response(JSON.stringify({ success: true, ignored: true }), { status: 200, headers: corsHeaders })
    }

    const chat = actualPayload?.chat
    const message = actualPayload?.message
    const instanceOwner = actualPayload?.owner
    const instanceIdFromPayload = actualPayload?.instanceId || actualPayload?.instance_id || actualPayload?.instance

    if (!message || !chat) {
      console.log('[WEBHOOK] Missing message or chat data')
      return new Response(JSON.stringify({ error: 'Missing data' }), { status: 200, headers: corsHeaders })
    }

    // Determine message direction
    const isFromMe = message.fromMe === true
    const wasSentByApi = message.wasSentByApi === true

    console.log('[WEBHOOK] fromMe:', isFromMe, 'wasSentByApi:', wasSentByApi)

    // Extract data from payload
    const phoneNumber = chat.wa_chatid?.replace('@s.whatsapp.net', '') || chat.phone?.replace(/\D/g, '')
    const contactName = chat.wa_name || chat.wa_contactName || chat.name || message.senderName || 'WhatsApp User'
    const avatarUrl = chat.imagePreview || chat.image || null
    const messageText = message.text || ''
    const messageId = message.id || message.messageid
    const messageType = message.mediaType || message.messageType || 'text'
    const mediaUrl = message.content?.URL || null

    console.log('[WEBHOOK] Phone:', phoneNumber)
    console.log('[WEBHOOK] Contact:', contactName)
    console.log('[WEBHOOK] Avatar:', avatarUrl ? 'Found' : 'Not found')
    console.log('[WEBHOOK] Message:', messageText?.substring(0, 50))

    // Find integration - try multiple queries to debug
    console.log('[WEBHOOK] Searching for WhatsApp integration...')
    console.log('[WEBHOOK] Instance info from payload - Owner:', instanceOwner, '| InstanceId:', instanceIdFromPayload)

    // First, let's see all integrations
    const { data: allIntegrations } = await supabase
      .from('integrations')
      .select('id, channel, status, is_active, tenant_id, credentials')
      .eq('channel', 'whatsapp')
      .eq('is_active', true)

    console.log('[WEBHOOK] Active WhatsApp integrations:', allIntegrations?.length)

    // Find integration by matching instance_id in credentials
    let integration = null

    if (allIntegrations && allIntegrations.length > 0) {
      // 1. First try exact match with instanceId from payload if available
      if (instanceIdFromPayload) {
        integration = allIntegrations.find(int =>
          int.credentials?.instance_id === instanceIdFromPayload ||
          int.credentials?.instance_id?.toString() === instanceIdFromPayload?.toString()
        )
        if (integration) console.log('[WEBHOOK] âœ… Matched by instanceId from payload:', instanceIdFromPayload)
      }

      // 2. If not found, try matching instanceOwner (phone number)
      if (!integration && instanceOwner) {
        for (const int of allIntegrations) {
          const dbInstanceId = int.credentials?.instance_id?.toString()
          const ownerStr = instanceOwner.toString()

          if (dbInstanceId && (
            dbInstanceId === ownerStr ||
            dbInstanceId.includes(ownerStr) ||
            ownerStr.includes(dbInstanceId)
          )) {
            integration = int
            console.log('[WEBHOOK] âœ… Matched by instanceOwner phone:', dbInstanceId)
            break
          }
        }
      }

      // 3. Last resort: if there is only one WhatsApp integration for this tenant (not easy to check here without tenant)
      // or if the payload has some other field we can use.
    }

    if (!integration) {
      const availableIds = allIntegrations?.map(i => i.credentials?.instance_id).join(', ')
      console.log('[WEBHOOK] Search Diagnostics - Integration not found yet')
      console.log('[WEBHOOK] Payload Owner:', instanceOwner)
      console.log('[WEBHOOK] Payload InstanceId:', instanceIdFromPayload)
      console.log('[WEBHOOK] DB Available instanceIds:', availableIds)

      // Se nÃ£o encontrar, mas houver apenas 1 integraÃ§Ã£o ativa no sistema todo,
      // poderÃ­amos considerar usar ela como fallback para evitar quebra total em ambientes single-tenant
      if (allIntegrations && allIntegrations.length === 1) {
        console.log('[WEBHOOK] âš ï¸ Only one integration found in system, using as fallback')
        integration = allIntegrations[0]
      } else {
        return new Response(JSON.stringify({ error: 'Integration not found' }), { status: 200, headers: corsHeaders })
      }
    }



    const tenantId = integration.tenant_id
    // Garantir que auto_create_leads seja falso apenas se explicitamente definido como falso
    const autoCreateLeads = integration.config?.auto_create_leads !== false

    console.log('[WEBHOOK] Found integration for tenant:', tenantId)
    console.log('[WEBHOOK] Auto create leads setting:', autoCreateLeads)

    // Se a integraÃ§Ã£o nÃ£o tiver a flag corretamente, vamos buscar no banco novamente para garantir
    // (Opcional, mas ajuda se o config estiver desatualizado no cache da function)

    // =========================================================================
    // CONVERSATIONS ARE INDEPENDENT FROM LEADS
    // Find conversation by phone number, NOT by contact_id
    // =========================================================================

    // Find existing conversation by phone number
    let conversationId = null
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, unread_count')
      .eq('tenant_id', tenantId)
      .eq('contact_phone', phoneNumber)
      .eq('channel', 'whatsapp')
      .maybeSingle()

    if (existingConv) {
      conversationId = existingConv.id
      // Update conversation with latest message
      await supabase
        .from('conversations')
        .update({
          contact_name: contactName, // Always update name in case it changed
          last_message_content: messageText || `[${messageType}]`,
          last_message_at: new Date().toISOString(),
          unread_count: (existingConv.unread_count || 0) + 1,
          avatar_url: avatarUrl
        })
        .eq('id', conversationId)
    } else {
      // Create new conversation (independent from leads)
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          contact_id: null, // No dependency on clientes table
          contact_name: contactName,
          contact_phone: phoneNumber,
          channel: 'whatsapp',
          status: 'open',
          unread_count: 1,
          total_messages: 1,
          last_message_content: messageText || `[${messageType}]`,
          last_message_at: new Date().toISOString(),
          avatar_url: avatarUrl
        })
        .select()
        .single()

      if (convError) {
        console.error('[WEBHOOK] Error creating conversation:', convError)
        return new Response(JSON.stringify({ error: 'Conversation creation failed' }), { status: 200, headers: corsHeaders })
      }
      conversationId = newConv.id
      console.log('[WEBHOOK] Created new conversation:', conversationId)
    }

    // =========================================================================
    // LEADS ARE OPTIONAL - Only create if auto_create_leads is enabled
    // =========================================================================
    if (autoCreateLeads) {
      // Check if lead already exists
      const { data: existingClient } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('telefone', phoneNumber)
        .maybeSingle()

      if (existingClient) {
        // Update existing lead
        if (avatarUrl) {
          await supabase
            .from('clientes')
            .update({ avatar_url: avatarUrl, nome: contactName })
            .eq('id', existingClient.id)
        }
      } else {
        // Create new lead
        const { error: clientError } = await supabase
          .from('clientes')
          .insert({
            tenant_id: tenantId,
            nome: contactName,
            telefone: phoneNumber,
            status: 'lead',
            avatar_url: avatarUrl
          })

        if (clientError) {
          console.error('[WEBHOOK] Error creating lead (non-blocking):', clientError)
          // Don't return error - conversation was already created, lead is optional
        } else {
          console.log('[WEBHOOK] Lead created automatically')
        }
      }
    } else {
      console.log('[WEBHOOK] Auto create leads disabled - skipping lead creation')
    }

    // Handle message type
    let finalMessageType = 'text'
    let finalMediaUrl = null
    let finalContent = messageText

    if (messageType === 'ptt' || messageType === 'AudioMessage') {
      finalMessageType = 'audio'
      finalMediaUrl = mediaUrl
      finalContent = messageText || ''
    } else if (messageType === 'image' || messageType === 'ImageMessage') {
      finalMessageType = 'image'
      finalMediaUrl = mediaUrl
      finalContent = messageText || ''
    } else if (messageType === 'video' || messageType === 'VideoMessage') {
      finalMessageType = 'video'
      finalMediaUrl = mediaUrl
      finalContent = messageText || ''
    } else if (messageType === 'document' || messageType === 'DocumentMessage') {
      finalMessageType = 'document'
      finalMediaUrl = mediaUrl
      finalContent = messageText || ''
    }

    // Insert Message
    const messageDirection = isFromMe ? 'outbound' : 'inbound'
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        direction: messageDirection,
        message_type: finalMessageType,
        content: finalContent,
        status: 'delivered',
        media_url: finalMediaUrl,
        external_message_id: messageId,
        created_at: new Date().toISOString()
      })

    if (msgError) {
      console.error('[WEBHOOK] Error inserting message:', msgError)
    } else {
      console.log('[WEBHOOK] Message saved successfully with avatar:', avatarUrl ? 'Yes' : 'No')
    }

    // =========================================================================
    // WHATSAPP AGENDA LOGIC - IA DETECTA AUTOMATICAMENTE
    // =========================================================================
    const isWhatsAppAgendaActive = integration.config?.whatsapp_agenda_active === true

    // Se a funcionalidade estiver ativa e nÃ£o for mensagem prÃ³pria, usar IA para detectar agendamento
    if (isWhatsAppAgendaActive && !isFromMe && messageText && messageText.length > 5) {
      console.log('[AGENDA] Checking if message is a scheduling request...')

      try {
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (openaiApiKey) {
          const today = new Date().toISOString()

          // Primeiro, perguntar Ã  IA se a mensagem Ã© um pedido de agendamento
          const detectionPrompt = `Analise a seguinte mensagem em portuguÃªs e determine se Ã© um pedido de agendamento, marcaÃ§Ã£o de reuniÃ£o, compromisso ou evento.

Mensagem: "${messageText}"

Responda APENAS com um JSON vÃ¡lido:
{
  "is_scheduling_request": true/false,
  "confidence": 0.0 a 1.0,
  "reason": "explicaÃ§Ã£o curta"
}

Exemplos de mensagens que SÃƒO pedidos de agendamento:
- "Quero marcar uma reuniÃ£o amanhÃ£ Ã s 14h"
- "Pode agendar um horÃ¡rio pra gente conversar?"
- "Preciso de uma consulta na prÃ³xima semana"
- "Marca aÃ­ uma visita pro sÃ¡bado"
- "Azera agendar reuniÃ£o amanhÃ£ 13h"

Exemplos que NÃƒO sÃ£o pedidos de agendamento:
- "Bom dia, tudo bem?"
- "Qual o preÃ§o desse imÃ³vel?"
- "Obrigado pela informaÃ§Ã£o"`

          const detectionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: detectionPrompt }],
              temperature: 0,
              response_format: { type: 'json_object' }
            }),
          })

          if (detectionResponse.ok) {
            const detectionData = await detectionResponse.json()
            const detection = JSON.parse(detectionData.choices[0].message.content)
            console.log('[AGENDA] Detection result:', detection)

            // Se a IA detectou que Ã© um pedido de agendamento com boa confianÃ§a
            if (detection.is_scheduling_request && detection.confidence >= 0.7) {
              console.log('[AGENDA] Scheduling request detected! Extracting details...')

              // Agora extrair os detalhes do agendamento
              const extractionPrompt = `Extraia informaÃ§Ãµes de agendamento do seguinte texto em portuguÃªs: "${messageText}".

Retorne APENAS um JSON vÃ¡lido com os seguintes campos:
- title: string (tÃ­tulo curto do evento, max 50 caracteres)
- date: string (formato YYYY-MM-DD, use a data de referÃªncia abaixo se for "amanhÃ£", "segunda", etc)
- time: string | null (formato HH:mm, null se nÃ£o especificado)
- location: string | null (localizaÃ§Ã£o se mencionada)
- description: string (descriÃ§Ã£o detalhada do evento)
- duration_minutes: number (duraÃ§Ã£o estimada em minutos, padrÃ£o 60)

Data/hora de referÃªncia (agora): ${today}
Dia da semana atual: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}`

              const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openaiApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [{ role: 'user', content: extractionPrompt }],
                  temperature: 0,
                  response_format: { type: 'json_object' }
                }),
              })

              if (extractionResponse.ok) {
                const extractionData = await extractionResponse.json()
                const eventData = JSON.parse(extractionData.choices[0].message.content)
                console.log('[AGENDA] Parsed event data:', eventData)

                // Calculate dates
                let startDate = new Date(eventData.date)
                if (eventData.time) {
              const [h, m] = eventData.time.split(':')
              startDate.setHours(parseInt(h), parseInt(m), 0, 0)
            } else {
              startDate.setHours(9, 0, 0, 0)
            }

            const endDate = new Date(startDate.getTime() + (eventData.duration_minutes || 60) * 60 * 1000)

            // Insert Event
            const { error: eventError } = await supabase
              .from('calendar_events')
              .insert({
                tenant_id: tenantId,
                title: eventData.title,
                description: eventData.description,
                location: eventData.location,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                all_day: !eventData.time,
                source: 'whatsapp',
                source_message: messageText,
                color: '#8B5CF6',
                status: 'confirmed'
              })

            if (eventError) {
              console.error('[AGENDA] Error creating event:', eventError)
            } else {
              console.log('[AGENDA] Event created successfully!')

              // Enviar confirmaÃ§Ã£o de volta para o WhatsApp
              try {
                // Formatar data para exibiÃ§Ã£o
                const dataFormatada = startDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
                const horaFormatada = eventData.time || 'dia inteiro'

                const confirmationMessage = `âœ… *Agendado com sucesso!*\n\n` +
                  `ðŸ“Œ *${eventData.title}*\n` +
                  `ðŸ“… ${dataFormatada}\n` +
                  `â° ${horaFormatada}\n` +
                  (eventData.location ? `ðŸ“ ${eventData.location}\n` : '') +
                  `\n_Evento criado na sua agenda do Azera._`

                // Chamar a edge function send-message internamente
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

                // Buscar a conversa para enviar a resposta
                const { data: conv } = await supabase
                  .from('conversations')
                  .select('id')
                  .eq('tenant_id', tenantId)
                  .eq('contact_phone', phoneNumber)
                  .single()

                if (conv) {
                  await fetch(`${supabaseUrl}/functions/v1/send-message`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${supabaseServiceKey}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      conversationId: conv.id,
                      message: confirmationMessage
                    })
                  })
                  console.log('[AGENDA] Confirmation message sent!')
                }
              } catch (sendErr) {
                console.error('[AGENDA] Error sending confirmation:', sendErr)
              }
            }
          }
        }
      } catch (e) {
        console.error('[AGENDA] Error processing WhatsApp Agenda:', e)
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('[WEBHOOK] Fatal error:', error)
    return new Response(JSON.stringify({ error: String(error) }), { status: 200, headers: corsHeaders })
  }
})

