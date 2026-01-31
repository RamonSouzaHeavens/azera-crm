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
    // UAZAPI envia 'instanceName', não 'instanceId'!
    const instanceIdFromPayload = actualPayload?.instanceName || actualPayload?.instanceId || actualPayload?.instance_id || actualPayload?.instance
    const baseUrlFromPayload = actualPayload?.BaseUrl || actualPayload?.base_url

    if (!message || !chat) {
      return new Response(JSON.stringify({ error: 'Missing data' }), { status: 200, headers: corsHeaders })
    }

    const isFromMe = message.fromMe === true
    const phoneNumber = chat.wa_chatid?.replace('@s.whatsapp.net', '') || chat.phone?.replace(/\D/g, '')
    const contactName = chat.wa_name || chat.wa_contactName || chat.name || message.senderName || 'WhatsApp User'
    const avatarUrl = chat.imagePreview || chat.image || null
    const originalMessageText = message.text || ''
    // Priorizar messageid (ID curto) pois a API de download espera esse formato
    const messageId = message.messageid || message.id
    // Detectar tipo de mensagem: priorizar wa_lastMessageType do chat
    const messageType = chat.wa_lastMessageType || message.mediaType || message.messageType || 'text'
    const mediaUrl = message.content?.URL || message.mediaUrl || null

    // Log essencial para debug
    console.log(`[WEBHOOK] Message from ${contactName} (${phoneNumber}): ${originalMessageText?.substring(0, 80)}${originalMessageText?.length > 80 ? '...' : ''}`)
    console.log('[DEBUG PAYLOAD KEYS]', Object.keys(actualPayload || {}).join(', '))
    console.log('[DEBUG INSTANCE FIELDS]', JSON.stringify({
      instanceId: actualPayload?.instanceId,
      instance_id: actualPayload?.instance_id,
      instance: actualPayload?.instance,
      instanceName: actualPayload?.instanceName,
      owner: actualPayload?.owner,
      base_url: actualPayload?.base_url
    }))
    console.log('[DEBUG] MessageType:', messageType, '| MessageId:', messageId)
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
        integration = allIntegrations.find((int: any) => {
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

      // Try matching by base_url
      if (!integration && baseUrlFromPayload) {
        integration = allIntegrations.find((int: any) => {
          const dbBaseUrl = int.credentials?.base_url
          const match = dbBaseUrl && (
            dbBaseUrl === baseUrlFromPayload ||
            baseUrlFromPayload.includes(int.credentials?.instance_id) ||
            dbBaseUrl.includes(instanceIdFromPayload)
          )
          if (match) console.log(`[DEBUG MATCH] Matched by BaseUrl: ${int.id}`)
          return match
        })
      }
    }

    if (!integration) {
      if (allIntegrations && allIntegrations.length === 1) {
        integration = allIntegrations[0]
        console.log(`[DEBUG MATCH] Fallback to single integration: ${integration.id}`)
      } else {
        // Log detalhado para entender pQ falhou
        console.log('[DEBUG ERROR] Integration not found. Available candidates:')
        allIntegrations?.forEach((i: any) => console.log(`- ID: ${i.id}, Creds: ${JSON.stringify(i.credentials)}`))

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
    const { data: allConvs } = await supabase
      .from('conversations')
      .select('id, unread_count, contact_phone')
      .eq('tenant_id', tenantId)
      .eq('channel', 'whatsapp')

    // Busca inteligente: comparar ignorando o dígito 9 se necessário
    let existingConv = allConvs?.find(c => c.contact_phone === phoneNumber)

    if (!existingConv && phoneNumber && phoneNumber.startsWith('55')) {
      // Tentar match flexível para números brasileiros (9 dígitos vs 8 dígitos)
      const isShort = phoneNumber.length === 12 // 55 + DDD + 8 dígitos
      const formatToMatch = isShort
        ? phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4) // Adiciona o 9
        : phoneNumber.slice(0, 4) + phoneNumber.slice(5)      // Remove o 9

      existingConv = allConvs?.find(c => c.contact_phone === formatToMatch)
      if (existingConv) {
        console.log(`[DEBUG] Flexible match found: ${phoneNumber} matched with ${formatToMatch}`)
      }
    }

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

    // 341: Check for duplicate message before inserting
    const messageDirection = isFromMe ? 'outbound' : 'inbound'

    // Evitar que mensagens enviadas pelo próprio CRM (via API) sejam duplicadas,
    // já que a função 'send-message' já as insere no banco com status 'sent'.
    if (isFromMe && (actualPayload?.wasSentByApi || actualPayload?.fromMe)) {
      console.log('[DEBUG] Message sent by API detected via webhook, updating status instead of inserting.')
      if (messageId) {
        await supabase
          .from('messages')
          .update({ status: 'delivered' })
          .eq('external_message_id', messageId)
          .eq('conversation_id', conversationId)
      }
      return new Response(JSON.stringify({ success: true, processed: 'outbound_update' }), { status: 200, headers: corsHeaders })
    }

    if (messageId) {
      const { data: existingMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('external_message_id', messageId)
        .maybeSingle()

      if (existingMsg) {
        console.log('[DEBUG] Duplicate message detected, skipping:', messageId)
        return new Response(JSON.stringify({ success: true, duplicate: true }), { status: 200, headers: corsHeaders })
      }
    }

    // Insert Message
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
    // HELPER: Send WhatsApp Message
    // =========================================================================
    const sendWhatsAppMessage = async (convId: string, msg: string) => {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-message`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversationId: convId,
            message: msg
          })
        })
      } catch (err) {
        console.error('[SEND] Error sending message:', err)
      }
    }

    // =========================================================================
    // WHATSAPP SALES LOGIC (VENDAS)
    // =========================================================================
    const isWhatsAppAgendaActive = integration.config?.whatsapp_agenda_active === true
    const wasSentByApi = message.wasSentByApi === true

    // Bloquear mensagens de confirmação automática para evitar loop
    const isConfirmationMessage = messageText.includes('Agendado com sucesso') ||
      messageText.includes('Evento criado na sua agenda') ||
      messageText.includes('Venda registrada') ||
      messageText.includes('Devo adicionar como nova venda')

    const openaiApiKey = Deno.env.get('VITE_OPENAI_KEY') || Deno.env.get('OPENAI_API_KEY')

    // Keywords para vendas
    const salesKeywords = [
      'vendi', 'venda', 'vendido', 'nova venda',
      'recebi', 'recebido', 'pagamento',
      'fechei', 'fechado', 'negócio fechado',
      'faturei', 'faturamento'
    ]

    // Keywords para consulta de vendas
    const salesQueryKeywords = [
      'quanto vendi', 'quanto eu vendi',
      'minhas vendas', 'vendas de hoje', 'vendas hoje',
      'vendas da semana', 'vendas do mês', 'vendas do mes',
      'vendas desse', 'vendas dessa', 'vendas deste',
      'vendas esse', 'vendas esta',
      'total vendido', 'resumo de vendas',
      'quero saber as vendas', 'saber as vendas',
      'me mostra as vendas', 'mostra as vendas',
      'a receber', 'receber hoje', 'receber esse',
      'pendente', 'valor pendente'
    ]

    // Keywords para relatórios gerais
    const reportKeywords = [
      'relatório', 'relatorio', 'resumo',
      'meus leads', 'quantos leads', 'leads de hoje',
      'minhas tarefas', 'tarefas pendentes', 'tarefas de hoje',
      'minha agenda', 'compromissos de hoje', 'eventos de hoje',
      'como está', 'como estou', 'meu desempenho',
      'quero saber', 'me mostra', 'me fala'
    ]

    // Keywords para ajuda/guia
    const helpKeywords = [
      'guia', 'ajuda', 'comandos', 'menu', 'o que você faz', 'o que voce faz', 'opções', 'opcoes'
    ]

    const messageLower = messageText.toLowerCase()

    // =========================================================================
    // VERIFICAR SE REMETENTE É ADMINISTRADOR
    // =========================================================================
    // Se admin_phones estiver configurado, só responde para números cadastrados
    // Se NÃO estiver configurado, NINGUÉM pode usar comandos (segurança)
    const adminPhones = integration.config?.admin_phones || []
    const isAdmin = adminPhones.length > 0 && adminPhones.some((admin: string) => {
      // Comparar os últimos 8-11 dígitos para ignorar código internacional
      const adminDigits = admin.replace(/\D/g, '').slice(-11)
      const senderDigits = phoneNumber.replace(/\D/g, '').slice(-11)
      return adminDigits === senderDigits || admin === phoneNumber
    })

    // Verificar se a mensagem é um comando (para decidir se envia mensagem de bloqueio)
    const isCommand = helpKeywords.some(kw => messageLower === kw || messageLower.startsWith(kw + ' ')) ||
      salesQueryKeywords.some(kw => messageLower.includes(kw)) ||
      reportKeywords.some(kw => messageLower.includes(kw)) ||
      messageLower.includes('agenda') ||
      messageLower.includes('agendar') ||
      messageLower.includes('lembrete')

    // Se NÃO for admin e tentou usar comando, bloquear e avisar
    if (!isAdmin && isCommand && !wasSentByApi && !isConfirmationMessage) {
      console.log('[ADMIN] Comando bloqueado para não-admin:', phoneNumber, '| Mensagem:', messageText)

      // Enviar mensagem de aviso
      const blockedMsg = `🔒 *Acesso restrito*\n\nEsse comando só pode ser usado por administradores autorizados.\n\nSe você deveria ter acesso, peça ao responsável para adicionar seu número nas configurações. 😊`
      await sendWhatsAppMessage(conversationId, blockedMsg)

      return new Response(JSON.stringify({ success: true, blocked: 'not_admin' }), { status: 200, headers: corsHeaders })
    }

    // =========================================================================
    // COMANDO GUIA / AJUDA (apenas para admins)
    // =========================================================================
    if (isAdmin && !wasSentByApi && !isConfirmationMessage && helpKeywords.some(kw => messageLower === kw || messageLower.startsWith(kw + ' '))) {
      console.log('[GUIA] Solicitado comando de ajuda:', messageText)

      const guiaMsg = `🤖 *Guia de Comandos do Azera CRM*

Aqui está o que eu posso fazer por você:

📊 *Relatórios de Vendas*
• "Vendas hoje"
• "Vendas da semana"
• "Vendas do mês"
• "Quanto vendi este mês?"

💰 *Financeiro*
• "A receber" (vendas pendentes)
• "O que tenho pra receber hoje?"

📸 *Registrar Venda (PIX)*
• Envie a foto de um comprovante PIX
• Eu analiso e pergunto se quer registrar a venda!

📅 *Agenda e Lembretes*
• "Agendar reunião amanhã às 14h"
• "Me lembre de ligar para o cliente em 30 min"
• "Minha agenda hoje"

📋 *Gestão*
• "Novos leads"
• "Minhas tarefas"
• "Tarefas de hoje"

Tente enviar um desses comandos agora! 🚀`

      await sendWhatsAppMessage(conversationId, guiaMsg)
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    // =========================================================================
    // VERIFICAR CONFIRMAÇÃO DE VENDA PENDENTE (Comprovante PIX) - apenas para admins
    // =========================================================================
    // Permitir confirmação independente de quem enviou (isFromMe não obrigatório)
    if (isAdmin && !wasSentByApi && (messageLower === 'sim' || messageLower === 's' || messageLower === 'confirma' || messageLower === 'pode' || messageLower === 'confirmo')) {
      console.log('[VENDAS] Verificando confirmação de venda para conversa:', conversationId)

      // Verificar se há mensagem de pergunta sobre venda pendente
      const { data: pendingSale } = await supabase
        .from('messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('direction', 'outbound')
        .ilike('content', '%Devo adicionar como nova venda%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pendingSale) {
        console.log('[VENDAS] Mensagem pendente encontrada:', pendingSale.content.substring(0, 50))

        // Extrair valor
        const valorMatch = pendingSale.content.match(/R\$\s*([\d.,]+)/i)
        // Extrair pagador
        const pagadorMatch = pendingSale.content.match(/Pagador:\s*([^\n]+)/i)
        const pagador = pagadorMatch ? pagadorMatch[1].trim() : 'Cliente WhatsApp'

        if (valorMatch) {
          let valorStr = valorMatch[1]
          if (valorStr.includes(',')) {
            valorStr = valorStr.replace(/\./g, '').replace(',', '.')
          }
          const valor = parseFloat(valorStr)

          if (!isNaN(valor) && valor > 0) {
            console.log('[VENDAS] Criando venda na tabela lead_sales:', { valor, pagador, tenantId })

            // Tentar encontrar um lead associado a esta conversa para vincular a venda
            // Se não tiver lead, usaremos um dummy ID ou criaremos warning (mas lead_id é NOT NULL na tabela, precisamos resolver isso)
            // Vamos tentar pegar o lead_id da conversa se existir, ou usar um padrão

            const { data: conversationData } = await supabase
              .from('conversations')
              .select('lead_id')
              .eq('id', conversationId)
              .single()

            const leadId = conversationData?.lead_id || null // Lead opcional agora

            // Criar a venda na tabela CORRETA: lead_sales
            const { error: vendaError } = await supabase
              .from('lead_sales')
              .insert({
                tenant_id: tenantId,
                lead_id: leadId, // Necessário vincular a um lead
                title: `Venda PIX - ${pagador}`,
                value: valor,
                status: 'paid', // Status correto: paid, pending, overdue
                due_date: new Date().toISOString()
              })

            if (!vendaError) {
              console.log('[VENDAS] Venda confirmada e criada com sucesso!')
              await sendWhatsAppMessage(conversationId, `✅ *Venda registrada!*\n\n💰 Valor: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n👤 Cliente: ${pagador}\n📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n_Venda adicionada ao CRM._`)
            } else {
              console.error('[VENDAS] Erro ao criar venda:', vendaError)
              await sendWhatsAppMessage(conversationId, `❌ Erro ao registrar venda: ${vendaError.message}`)
            }
          }
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
      } else {
        console.log('[VENDAS] Nenhuma mensagem de confirmação pendente encontrada.')
      }
    }

    // =========================================================================
    // RELATÓRIOS COMPLETOS (Vendas, Leads, Tarefas, Agenda) - apenas para admins
    // =========================================================================
    if (isAdmin && !wasSentByApi && !isConfirmationMessage && (
      salesQueryKeywords.some(kw => messageLower.includes(kw)) ||
      reportKeywords.some(kw => messageLower.includes(kw))
    )) {
      console.log('[RELATÓRIOS] Consulta detectada:', messageText)

      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      let queryStart = startOfDay
      let periodLabel = 'hoje'

      if (messageLower.includes('semana')) {
        queryStart = startOfWeek
        periodLabel = 'esta semana'
      } else if (messageLower.includes('mês') || messageLower.includes('mes')) {
        queryStart = startOfMonth
        periodLabel = 'este mês'
      }

      // Determinar tipo de relatório
      const wantsVendas = messageLower.includes('vend') || messageLower.includes('fatur')
      const wantsLeads = messageLower.includes('lead') || messageLower.includes('cliente') || messageLower.includes('contato')
      const wantsTarefas = messageLower.includes('tarefa') || messageLower.includes('task') || messageLower.includes('pendente')
      const wantsAgenda = messageLower.includes('agenda') || messageLower.includes('compromisso') || messageLower.includes('evento') || messageLower.includes('reunião') || messageLower.includes('reuniao')
      const wantsAll = messageLower.includes('relatório') || messageLower.includes('relatorio') || messageLower.includes('resumo') || messageLower.includes('desempenho') || messageLower.includes('como est')

      let reportParts: string[] = []

      // ===== VENDAS (lead_sales) =====
      if (wantsVendas || wantsAll) {
        // Tabela correta: lead_sales (não vendas)
        // Campos: value (não valor), due_date (não data_venda)
        const { data: vendasPagas, error: vendasPagasError } = await supabase
          .from('lead_sales')
          .select('value, status, due_date')
          .eq('tenant_id', tenantId)
          .gte('due_date', queryStart)
          .eq('status', 'paid')  // Status: 'paid' = Recebido

        const { data: vendasPendentes } = await supabase
          .from('lead_sales')
          .select('value, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'pending')  // Status: 'pending' = A Receber

        const { data: vendasVencidas } = await supabase
          .from('lead_sales')
          .select('value, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'overdue')  // Status: 'overdue' = Vencido

        console.log('[RELATÓRIOS] lead_sales query:', { tenantId, queryStart, pagas: vendasPagas?.length, pendentes: vendasPendentes?.length, vencidas: vendasVencidas?.length, error: vendasPagasError })

        let vendasText = `💰 *Vendas (${periodLabel})*\n`

        if (vendasPagas && vendasPagas.length > 0) {
          const totalPagas = vendasPagas.length
          const valorPago = vendasPagas.reduce((sum: number, v: any) => sum + parseFloat(v.value || 0), 0)
          vendasText += `   ✅ Recebido: R$ ${valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${totalPagas})\n`
        } else {
          vendasText += `   ✅ Recebido: R$ 0,00 (0)\n`
        }

        if (vendasPendentes && vendasPendentes.length > 0) {
          const totalPendentes = vendasPendentes.length
          const valorPendente = vendasPendentes.reduce((sum: number, v: any) => sum + parseFloat(v.value || 0), 0)
          vendasText += `   ⏳ A Receber: R$ ${valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${totalPendentes})\n`
        } else {
          vendasText += `   ⏳ A Receber: R$ 0,00 (0)\n`
        }

        if (vendasVencidas && vendasVencidas.length > 0) {
          const totalVencidas = vendasVencidas.length
          const valorVencido = vendasVencidas.reduce((sum: number, v: any) => sum + parseFloat(v.value || 0), 0)
          vendasText += `   ❌ Vencido: R$ ${valorVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${totalVencidas})`
        } else {
          vendasText += `   ❌ Vencido: R$ 0,00 (0)`
        }

        reportParts.push(vendasText)
      }

      // ===== LEADS =====
      if (wantsLeads || wantsAll) {
        const { data: leadsNovos } = await supabase
          .from('clientes')
          .select('id')
          .eq('tenant_id', tenantId)
          .gte('created_at', queryStart)

        const { data: leadsTotal } = await supabase
          .from('clientes')
          .select('id, status')
          .eq('tenant_id', tenantId)

        if (leadsTotal) {
          const novos = leadsNovos?.length || 0
          const total = leadsTotal.length
          const ativos = leadsTotal.filter((l: any) => l.status !== 'perdido').length
          reportParts.push(`👥 *Leads*\n   Novos (${periodLabel}): ${novos}\n   Ativos: ${ativos}\n   Total: ${total}`)
        }
      }

      // ===== TAREFAS =====
      if (wantsTarefas || wantsAll) {
        const { data: tarefas } = await supabase
          .from('tarefas')
          .select('id, status')
          .eq('tenant_id', tenantId)

        if (tarefas) {
          const pendentes = tarefas.filter((t: any) => t.status === 'pendente' || t.status === 'em_andamento').length
          const concluidas = tarefas.filter((t: any) => t.status === 'concluida' || t.status === 'concluído' || t.status === 'done').length
          const total = tarefas.length
          reportParts.push(`📋 *Tarefas*\n   Pendentes: ${pendentes}\n   Concluídas: ${concluidas}\n   Total: ${total}`)
        }
      }

      // ===== AGENDA =====
      if (wantsAgenda || wantsAll) {
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

        const { data: eventosHoje } = await supabase
          .from('calendar_events')
          .select('id, title, start_date')
          .eq('tenant_id', tenantId)
          .gte('start_date', startOfDay)
          .lt('start_date', endOfDay)
          .order('start_date', { ascending: true })
          .limit(5)

        if (eventosHoje && eventosHoje.length > 0) {
          let agendaText = `📅 *Agenda de Hoje*\n`
          eventosHoje.forEach((e: any) => {
            const hora = new Date(e.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            agendaText += `   ⏰ ${hora} - ${e.title}\n`
          })
          reportParts.push(agendaText.trim())
        } else if (wantsAgenda) {
          reportParts.push(`📅 *Agenda de Hoje*\n   Nenhum compromisso agendado.`)
        }
      }

      // Montar mensagem final
      if (reportParts.length > 0) {
        const headerMsg = wantsAll ? `📊 *Relatório Geral - ${periodLabel}*` : `📊 *Consulta - ${periodLabel}*`
        const fullReport = `${headerMsg}\n\n${reportParts.join('\n\n')}\n\n_Azera CRM_`
        await sendWhatsAppMessage(conversationId, fullReport)
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    // =========================================================================
    // DETECÇÃO DE VENDA POR TEXTO/ÁUDIO
    // =========================================================================
    // Permitir registro de vendas de qualquer remetente
    if (!wasSentByApi && !isConfirmationMessage && messageText.length > 3 && salesKeywords.some(kw => messageLower.includes(kw))) {
      console.log('[VENDAS] Detectada mensagem de venda:', messageText)

      if (openaiApiKey) {
        try {
          const extractionPrompt = `Extraia informações de venda do seguinte texto em português: "${messageText}".

Retorne APENAS um JSON válido com os seguintes campos:
- valor: number (valor da venda em reais, ex: 500.00)
- cliente_nome: string | null (nome do cliente se mencionado)
- produto_nome: string | null (nome do produto se mencionado)
- notas: string (descrição breve da venda)
- is_sale: boolean (true se realmente parece ser uma venda, false se for outra coisa)

Exemplos:
- "Vendi 500 pro João" -> {"valor": 500, "cliente_nome": "João", "produto_nome": null, "notas": "Venda para João", "is_sale": true}
- "Nova venda 1200" -> {"valor": 1200, "cliente_nome": null, "produto_nome": null, "notas": "Nova venda", "is_sale": true}
- "Recebi 300 do cliente Maria" -> {"valor": 300, "cliente_nome": "Maria", "produto_nome": null, "notas": "Pagamento recebido de Maria", "is_sale": true}`

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
            const saleData = JSON.parse(extractionData.choices[0].message.content)

            if (saleData.is_sale && saleData.valor > 0) {
              console.log('[VENDAS] Dados extraídos:', saleData)

              // Buscar cliente pelo nome se mencionado
              let clienteId = null
              if (saleData.cliente_nome) {
                const { data: clienteEncontrado } = await supabase
                  .from('clientes')
                  .select('id, nome')
                  .eq('tenant_id', tenantId)
                  .ilike('nome', `%${saleData.cliente_nome}%`)
                  .limit(1)
                  .maybeSingle()

                if (clienteEncontrado) {
                  clienteId = clienteEncontrado.id
                  console.log('[VENDAS] Cliente encontrado:', clienteEncontrado.nome)
                }
              }

              // Buscar produto pelo nome se mencionado
              let produtoId = null
              if (saleData.produto_nome) {
                const { data: produtoEncontrado } = await supabase
                  .from('produtos')
                  .select('id, nome')
                  .eq('tenant_id', tenantId)
                  .ilike('nome', `%${saleData.produto_nome}%`)
                  .limit(1)
                  .maybeSingle()

                if (produtoEncontrado) {
                  produtoId = produtoEncontrado.id
                  console.log('[VENDAS] Produto encontrado:', produtoEncontrado.nome)
                }
              }

              // Criar a venda
              const { error: vendaError } = await supabase
                .from('vendas')
                .insert({
                  tenant_id: tenantId,
                  cliente_id: clienteId,
                  produto_id: produtoId,
                  valor: saleData.valor,
                  status: 'concluida',
                  notas: saleData.notas || 'Venda registrada via WhatsApp',
                  data_venda: new Date().toISOString()
                })

              if (vendaError) {
                console.error('[VENDAS] Erro ao criar venda:', vendaError)
              } else {
                console.log('[VENDAS] Venda criada com sucesso!')

                // Enviar confirmação
                let confirmMsg = `✅ *Venda registrada!*\n\n`
                confirmMsg += `💰 Valor: R$ ${saleData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
                if (saleData.cliente_nome) confirmMsg += `👤 Cliente: ${saleData.cliente_nome}\n`
                if (saleData.produto_nome) confirmMsg += `📦 Produto: ${saleData.produto_nome}\n`
                confirmMsg += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`
                confirmMsg += `\n_Venda adicionada ao seu CRM Azera._`

                await sendWhatsAppMessage(conversationId, confirmMsg)
              }
            }
          }
        } catch (saleError) {
          console.error('[VENDAS] Erro ao processar venda:', saleError)
        }
      }
    }

    // =========================================================================
    // DETECÇÃO DE COMPROVANTE PIX (IMAGEM) - apenas para admins
    // =========================================================================
    const isImageMessage = messageType === 'image' || messageType === 'ImageMessage'

    console.log('[DEBUG PIX] isImageMessage:', isImageMessage, '| messageId:', messageId, '| openaiApiKey:', !!openaiApiKey)

    // Apenas admins podem enviar comprovantes para registro
    if (isAdmin && isImageMessage && messageId && !wasSentByApi && openaiApiKey) {
      console.log('[VENDAS] Imagem detectada, analisando se é comprovante...')

      try {
        // Baixar a imagem via UAZAPI se necessário
        let imageBase64 = null
        const uazapiBaseUrl = integration.credentials?.base_url
        const uazapiToken = integration.credentials?.secret_key

        console.log('[PIX DEBUG] UAZAPI config:', { hasBaseUrl: !!uazapiBaseUrl, hasToken: !!uazapiToken, messageId })

        if (uazapiBaseUrl && uazapiToken && messageId) {
          console.log('[PIX DEBUG] Tentando baixar via UAZAPI...')
          const downloadResponse = await fetch(`${uazapiBaseUrl}/message/download`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'token': uazapiToken
            },
            body: JSON.stringify({
              id: messageId,
              return_base64: true
            })
          })

          console.log('[PIX DEBUG] UAZAPI response status:', downloadResponse.status)

          if (downloadResponse.ok) {
            const downloadData = await downloadResponse.json()
            // Suporte para diferentes formatos de resposta da UAZAPI
            imageBase64 = downloadData.base64Data || downloadData.base64 || downloadData.content
            console.log('[PIX DEBUG] Base64 obtido via UAZAPI:', imageBase64 ? `${imageBase64.substring(0, 50)}...` : 'null')

            if (!imageBase64) {
              console.log('[PIX DEBUG] Resposta completa UAZAPI:', JSON.stringify(downloadData))
            }
          } else {
            const errText = await downloadResponse.text()
            console.log('[PIX DEBUG] UAZAPI error:', errText)
          }
        }

        // Se não conseguiu base64 da UAZAPI, tentar baixar direto da URL APENAS se não for criptografada
        if (!imageBase64 && mediaUrl) {
          if (mediaUrl.includes('mmg.whatsapp.net') || mediaUrl.includes('.enc')) {
            console.log('[PIX DEBUG] Ignorando URL criptografada do WhatsApp:', mediaUrl)
          } else {
            console.log('[PIX DEBUG] Tentando baixar direto da URL:', mediaUrl.substring(0, 80))
            try {
              const imgResponse = await fetch(mediaUrl)
              console.log('[PIX DEBUG] Direct URL response status:', imgResponse.status)
              if (imgResponse.ok) {
                const imgBuffer = await imgResponse.arrayBuffer()
                imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)))
                console.log('[PIX DEBUG] Base64 obtido via URL direta:', imageBase64 ? `${imageBase64.substring(0, 50)}...` : 'null')
              }
            } catch (imgErr) {
              console.error('[VENDAS] Erro ao baixar imagem:', imgErr)
            }
          }
        }

        console.log('[PIX DEBUG] Final imageBase64:', imageBase64 ? 'SIM (tem base64)' : 'NÃO (null)')

        if (imageBase64) {
          // Usar GPT-4 Vision para analisar a imagem
          console.log('[PIX DEBUG] Chamando GPT-4 Vision...')

          const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Analise esta imagem e determine se é um comprovante de pagamento/transferência PIX.

Se for um comprovante PIX, retorne um JSON com:
- is_comprovante: true
- valor: number (valor da transferência)
- pagador: string | null (nome de quem pagou)
- data: string | null (data da transferência)
- banco: string | null (banco de origem)

Se NÃO for um comprovante, retorne:
- is_comprovante: false

Retorne APENAS o JSON, sem markdown ou explicações.`
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/jpeg;base64,${imageBase64}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 500
            }),
          })

          console.log('[PIX DEBUG] GPT-4 Vision response status:', visionResponse.status)

          if (visionResponse.ok) {
            const visionData = await visionResponse.json()
            const visionContent = visionData.choices[0].message.content

            console.log('[PIX DEBUG] GPT-4 Vision response:', visionContent)

            // Tentar extrair JSON da resposta
            let comprovanteData
            try {
              // Remover possíveis markdown
              const jsonStr = visionContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
              comprovanteData = JSON.parse(jsonStr)
              console.log('[PIX DEBUG] Comprovante parsed:', comprovanteData)
            } catch {
              console.log('[VENDAS] Não foi possível parsear resposta da Vision:', visionContent)
            }

            if (comprovanteData?.is_comprovante && comprovanteData?.valor > 0) {
              console.log('[VENDAS] Comprovante detectado:', comprovanteData)

              // Perguntar antes de adicionar
              let perguntaMsg = `📱 *Comprovante PIX detectado!*\n\n`
              perguntaMsg += `💰 Valor: R$ ${comprovanteData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
              if (comprovanteData.pagador) perguntaMsg += `👤 Pagador: ${comprovanteData.pagador}\n`
              if (comprovanteData.banco) perguntaMsg += `🏦 Banco: ${comprovanteData.banco}\n`
              perguntaMsg += `\n*Devo adicionar como nova venda?*\n`
              perguntaMsg += `_Responda "Sim" para confirmar._`

              await sendWhatsAppMessage(conversationId, perguntaMsg)
            }
          } else {
            const errorText = await visionResponse.text()
            console.error('[PIX DEBUG] GPT-4 Vision ERROR:', errorText)
          }
        }
      } catch (visionError) {
        console.error('[VENDAS] Erro ao analisar imagem:', visionError)
      }
    }

    // =========================================================================
    // WHATSAPP AGENDA LOGIC - apenas para admins
    // =========================================================================
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

    // Apenas admins podem usar a agenda via WhatsApp
    if (isAdmin && isWhatsAppAgendaActive && messageText && messageText.length > 5 && !wasSentByApi && !isConfirmationMessage) {
      const schedulingKeywords = [
        'agendar', 'agenda', 'agendamento',
        'marcar', 'marca', 'marcação',
        'reunião', 'reuniao',
        'lembrar', 'lembra', 'lembrete', 'me lembra',
        'compromisso', 'encontro', 'consulta', 'visita',
        'horário', 'horario', 'disponível', 'disponivel',
        'amanhã', 'amanha', 'próxima', 'proxima', 'azera'
      ]

      const hasSchedulingKeyword = schedulingKeywords.some(kw => messageLower.includes(kw))

      if (hasSchedulingKeyword) {
        try {
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
- reminders: lista de objetos {type: "whatsapp", minutes_before: number} (Sempre inclua dois avisos padrão: um com 120 minutos e outro com 30 minutos antes do evento)

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
                    status: 'confirmed',
                    reminders: eventData.reminders || [
                      { type: 'whatsapp', minutes_before: 120 },
                      { type: 'whatsapp', minutes_before: 30 }
                    ]
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

                    await sendWhatsAppMessage(conversationId, confirmationMessage)
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
