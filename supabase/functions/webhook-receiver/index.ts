import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    // Handle Meta Webhook Verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')
      const VERIFY_TOKEN = 'azera-crm-token'

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return new Response(challenge || '', {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        })
      } else {
        return new Response('Forbidden', { status: 403, headers: corsHeaders })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const rawBody = await req.text()

    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 200, headers: corsHeaders })
    }

    // -------------------------------------------------------------------------
    // HANDLE WHATSAPP WEBHOOKS (UAZAPI, Z-API, N8N, etc)
    // -------------------------------------------------------------------------
    // Process payload

    // Unwrap N8N/Uazapi wrapper
    let actualPayload = payload
    if (Array.isArray(payload) && payload[0]?.body) {
      actualPayload = payload[0].body
    } else if (payload.body) {
      actualPayload = payload.body
    }

    // Accept 'messages' event OR any payload with message data
    const isMessageEvent = actualPayload?.EventType === 'messages' ||
      actualPayload?.EventType === undefined ||
      (actualPayload?.message && actualPayload?.chat)

    if (!isMessageEvent) {
      return new Response(JSON.stringify({ success: true, ignored: true }), { status: 200, headers: corsHeaders })
    }

    const chat = actualPayload?.chat
    const message = actualPayload?.message
    const instanceOwner = actualPayload?.owner
    const instanceIdFromPayload = actualPayload?.instanceId || actualPayload?.instance_id || actualPayload?.instance

    if (!message || !chat) {
      return new Response(JSON.stringify({ error: 'Missing data' }), { status: 200, headers: corsHeaders })
    }

    const isFromMe = message.fromMe === true
    const phoneNumber = chat.wa_chatid?.replace('@s.whatsapp.net', '') || chat.phone?.replace(/\D/g, '')
    const contactName = chat.wa_name || chat.wa_contactName || chat.name || message.senderName || 'WhatsApp User'
    const avatarUrl = chat.imagePreview || chat.image || null
    const originalMessageText = message.text || ''
    const messageId = message.id || message.messageid
    const messageType = message.mediaType || message.messageType || 'text'
    const mediaUrl = message.content?.URL || null

    // Log essencial para debug
    console.log(`[WEBHOOK] Message from ${contactName} (${phoneNumber}): ${originalMessageText?.substring(0, 80)}${originalMessageText?.length > 80 ? '...' : ''}`)
    console.log('[DEBUG STEP 1] Payload parsed')

    // Find integration
    const { data: allIntegrations } = await supabase
      .from('integrations')
      .select('id, channel, status, is_active, tenant_id, credentials, config')
      .in('channel', ['whatsapp', 'wpp', 'whatsapp-api', 'uazapi'])
      .eq('is_active', true)

    console.log(`[DEBUG MATCH] Searching integration for InstanceID: '${instanceIdFromPayload}' or Owner: '${instanceOwner}'`)
    console.log(`[DEBUG MATCH] Found ${allIntegrations?.length || 0} active integrations in DB`)

    let integration = null

    if (allIntegrations && allIntegrations.length > 0) {
      // Try exact match with instanceId
      if (instanceIdFromPayload) {
        integration = allIntegrations.find(int => {
          const dbRef = int.credentials?.instance_id
          const match = dbRef === instanceIdFromPayload || dbRef?.toString() === instanceIdFromPayload?.toString()
          if (match) console.log(`[DEBUG MATCH] Matched by ID: ${int.id}`)
          return match
        })
      }

      // Try matching instanceOwner (phone number)
      if (!integration && instanceOwner) {
        const ownerStr = instanceOwner.toString().replace(/\D/g, '')

        for (const int of allIntegrations) {
          const dbInstanceId = int.credentials?.instance_id?.toString()
          const dbInstanceOwner = int.credentials?.instance_owner?.toString()?.replace(/\D/g, '')

          if (
            (dbInstanceOwner && dbInstanceOwner === ownerStr) ||
            (dbInstanceId && (
              dbInstanceId === ownerStr ||
              dbInstanceId.includes(ownerStr) ||
              ownerStr.includes(dbInstanceId)
            ))
          ) {
            integration = int
            console.log(`[DEBUG MATCH] Matched by Owner/Phone: ${int.id}`)
            break
          }
        }
      }
    }

    if (!integration) {
      if (allIntegrations && allIntegrations.length === 1) {
        integration = allIntegrations[0]
        console.log(`[DEBUG MATCH] Fallback to single integration: ${integration.id}`)
      } else {
        // Log detalhado para entender pQ falhou
        console.log('[DEBUG ERROR] Integration not found. Available candidates:')
        allIntegrations?.forEach(i => console.log(`- ID: ${i.id}, Creds: ${JSON.stringify(i.credentials)}`))

        return new Response(JSON.stringify({ error: 'Integration not found' }), { status: 200, headers: corsHeaders })
      }
    }
    console.log('[DEBUG STEP 2] Integration found:', integration.id)

    const tenantId = integration.tenant_id
    const autoCreateLeads = integration.config?.auto_create_leads !== false

    // =========================================================================
    // AUDIO TRANSCRIPTION (UAZAPI)
    // =========================================================================
    let messageText = originalMessageText
    const isAudioMessage = messageType === 'ptt' || messageType === 'AudioMessage' || messageType === 'audio'

    if (isAudioMessage && messageId && !isFromMe) {
      try {
        const uazapiBaseUrl = integration.credentials?.base_url
        const uazapiToken = integration.credentials?.secret_key
        const openaiApiKey = Deno.env.get('VITE_OPENAI_KEY') || Deno.env.get('OPENAI_API_KEY')

        if (uazapiBaseUrl && uazapiToken && openaiApiKey) {
          console.log('[AUDIO] Transcribing audio message:', messageId)

          const transcriptionResponse = await fetch(`${uazapiBaseUrl}/message/download`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'token': uazapiToken
            },
            body: JSON.stringify({
              id: messageId,
              generate_mp3: true,
              transcribe: true,
              return_link: false,
              openai_apikey: openaiApiKey
            })
          })

          if (transcriptionResponse.ok) {
            const transcriptionData = await transcriptionResponse.json()
            const transcribedText = transcriptionData.transcription || transcriptionData.text || transcriptionData.transcript

            if (transcribedText && transcribedText.trim().length > 0) {
              messageText = transcribedText.trim()
              console.log('[AUDIO] Transcription successful:', messageText.substring(0, 100))
            } else {
              console.log('[AUDIO] No transcription returned from UAZAPI')
            }
          } else {
            console.error('[AUDIO] Transcription failed:', transcriptionResponse.status, await transcriptionResponse.text())
          }
        } else {
          console.log('[AUDIO] Missing credentials for transcription - skipping')
        }
      } catch (transcriptionError) {
        console.error('[AUDIO] Transcription error:', transcriptionError)
      }
    }

    // Find or create conversation
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
      await supabase
        .from('conversations')
        .update({
          contact_name: contactName,
          last_message_content: messageText || `[${messageType}]`,
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
          contact_id: null,
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
    }
    console.log('[DEBUG STEP 3] Conversation handled:', conversationId)

    // Create lead if enabled
    if (autoCreateLeads) {
      const { data: existingClient } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('telefone', phoneNumber)
        .maybeSingle()

      if (existingClient) {
        if (avatarUrl) {
          await supabase
            .from('clientes')
            .update({ avatar_url: avatarUrl, nome: contactName })
            .eq('id', existingClient.id)
        }
      } else {
        await supabase
          .from('clientes')
          .insert({
            tenant_id: tenantId,
            nome: contactName,
            telefone: phoneNumber,
            status: 'lead',
            avatar_url: avatarUrl
          })
      }
    }
    console.log('[DEBUG STEP 4] Leads handled')

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

    if (msgError && msgError.code !== '23505') {
      console.error('[WEBHOOK] Error inserting message:', msgError)
    }
    console.log('[DEBUG STEP 5] Message inserted')

    // =========================================================================
    // WHATSAPP AGENDA LOGIC
    // =========================================================================
    const isWhatsAppAgendaActive = integration.config?.whatsapp_agenda_active === true
    const wasSentByApi = message.wasSentByApi === true

    // Bloquear mensagens de confirmação automática para evitar loop
    const isConfirmationMessage = messageText.includes('Agendado com sucesso') ||
      messageText.includes('Evento criado na sua agenda')

    console.log('[AGENDA DEBUG] --------------------------------------------------')
    console.log('[AGENDA DEBUG] Message:', messageText)
    console.log('[AGENDA DEBUG] Config:', {
      isWhatsAppAgendaActive,
      integrationId: integration.id,
      credentialId: integration.credentials?.instance_id
    })
    console.log('[AGENDA DEBUG] Flags:', {
      isFromMe,
      wasSentByApi,
      isConfirmationMessage,
      textLen: messageText?.length
    })

    // Permitir mensagens do usuário (isFromMe), mas bloquear confirmações automáticas

    // Permitir mensagens do usuário (isFromMe), mas bloquear confirmações automáticas
    if (isWhatsAppAgendaActive && messageText && messageText.length > 5 && !wasSentByApi && !isConfirmationMessage) {
      const schedulingKeywords = [
        'agendar', 'agenda', 'agendamento',
        'marcar', 'marca', 'marcação',
        'reunião', 'reuniao',
        'lembrar', 'lembra', 'lembrete', 'me lembra',
        'compromisso', 'encontro', 'consulta', 'visita',
        'horário', 'horario', 'disponível', 'disponivel',
        'amanhã', 'amanha', 'próxima', 'proxima', 'azera'
      ]

      const messageLower = messageText.toLowerCase()
      const hasSchedulingKeyword = schedulingKeywords.some(kw => messageLower.includes(kw))

      if (hasSchedulingKeyword) {
        try {
          const openaiApiKey = Deno.env.get('VITE_OPENAI_KEY') || Deno.env.get('OPENAI_API_KEY')

          if (openaiApiKey) {
            // Data de referência no fuso do Brasil (UTC-3)
            const now = new Date()
            const brazilOffset = -3 * 60
            const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60000)
            const todayBrazil = brazilTime.toISOString().split('T')[0]
            const dayOfWeek = brazilTime.toLocaleDateString('pt-BR', { weekday: 'long' })

            const extractionPrompt = `Extraia informações de agendamento do seguinte texto em português: "${messageText}".

Retorne APENAS um JSON válido com os seguintes campos:
- title: string (título curto do evento, max 50 caracteres)
- date: string (formato YYYY-MM-DD, use a data de referência abaixo se for "amanhã", "segunda", etc)
- time: string | null (formato HH:mm, null se não especificado)
- location: string | null (localização se mencionada)
- description: string (descrição detalhada do evento)
- duration_minutes: number (duração estimada em minutos, padrão 60)

Data de referência (hoje): ${todayBrazil}
Dia da semana atual: ${dayOfWeek}`

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
              console.log('[AGENDA] Event:', eventData.title, 'on', eventData.date, 'at', eventData.time)

              // Calcular datas no fuso do Brasil
              let startDate = new Date(eventData.date + 'T00:00:00-03:00')
              if (eventData.time) {
                const [h, m] = eventData.time.split(':')
                startDate = new Date(eventData.date + 'T' + eventData.time + ':00-03:00')
              } else {
                startDate = new Date(eventData.date + 'T09:00:00-03:00')
              }

              const endDate = new Date(startDate.getTime() + (eventData.duration_minutes || 60) * 60 * 1000)

              // Find a user to assign the event to, ensuring it's visible in the CRM (RLS Fix)
              const { data: tenantUsers } = await supabase
                .from('memberships')
                .select('user_id')
                .eq('tenant_id', tenantId)
                .eq('active', true)
                .limit(1)

              const assignedUserId = tenantUsers && tenantUsers.length > 0 ? tenantUsers[0].user_id : null

              // ============ VERIFICAÇÃO DE DUPLICATA ============
              // Evita criar evento duplicado se a mesma mensagem já foi processada
              const { data: existingEvent } = await supabase
                .from('calendar_events')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('source_message', messageText)
                .eq('source', 'whatsapp')
                .maybeSingle()

              if (existingEvent) {
                console.log('[AGENDA] Duplicate detected - Event already exists for this message:', existingEvent.id)
                // Não criar evento novamente, apenas retornar
              } else {
                // Criar o evento
                const { error: eventError } = await supabase
                  .from('calendar_events')
                  .insert({
                    tenant_id: tenantId,
                    user_id: assignedUserId,
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

                  // Sincronizar com Google Calendar (se o usuário tiver integração)
                  try {
                    console.log('[AGENDA] Triggering Google Calendar sync for user:', assignedUserId)
                    await fetch(`${supabaseUrl}/functions/v1/google-calendar-sync`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ user_id: assignedUserId })
                    })
                  } catch (syncErr) {
                    console.error('[AGENDA] Google sync error (non-fatal):', syncErr)
                  }

                  // Enviar confirmação
                  try {
                    const dataFormatada = startDate.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                    const horaFormatada = eventData.time || 'dia inteiro'

                    const confirmationMessage = `✅ *Agendado com sucesso!*\n\n` +
                      `📌 *${eventData.title}*\n` +
                      `📅 ${dataFormatada}\n` +
                      `⏰ ${horaFormatada}\n` +
                      (eventData.location ? `📍 ${eventData.location}\n` : '') +
                      `\n_Evento criado na sua agenda do Azera._`

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
                    }
                  } catch (sendErr) {
                    console.error('[AGENDA] Error sending confirmation:', sendErr)
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('[AGENDA] Error:', e)
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('[WEBHOOK] Fatal error:', error)
    return new Response(JSON.stringify({ error: String(error) }), { status: 200, headers: corsHeaders })
  }
})
