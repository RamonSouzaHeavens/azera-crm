/// <reference lib="deno.window" />
// deno-lint-ignore-file no-explicit-any

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MessageProvider, SendMessageParams } from './providers/types.ts'
import { InstagramProvider } from './providers/instagram.ts'
import { MetaWhatsappProvider } from './providers/meta-whatsapp.ts'
import { ZapiProvider } from './providers/zapi.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { conversationId, message, mediaUrl, mimetype, mediaType } = await req.json()

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Buscar conversa com dados do cliente
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, clientes(telefone)')
      .eq('id', conversationId)
      .single()

    console.log('[SEND-MESSAGE] Conversation:', conversationId, 'Channel:', conversation?.channel)

    if (!conversation) throw new Error('Conversa não encontrada')

    // 2. Buscar integração ativa para o tenant e canal
    console.log('[SEND-MESSAGE] Looking for integration - tenant:', conversation.tenant_id, 'channel:', conversation.channel)

    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('tenant_id', conversation.tenant_id)
      .eq('channel', conversation.channel)
      .eq('status', 'active')
      .single()

    console.log('[SEND-MESSAGE] Integration found:', !!integration, 'Provider:', integration?.provider, 'Error:', intError?.message)

    if (!integration) throw new Error('Nenhuma integração ativa para ' + conversation.channel)

    // 3. Determinar o destinatário
    // Para Instagram: clientes.telefone contém o IGSID
    // Para WhatsApp: clientes.telefone contém o número de telefone
    const recipientId = conversation.clientes?.telefone?.replace(/\D/g, '') || conversation.contact_number
    console.log('[SEND-MESSAGE] Recipient ID:', recipientId)

    // 4. ROTEAMENTO - Escolher o provider correto
    // ORDEM DE PRIORIDADE:
    //   1. Se channel === 'instagram' -> InstagramProvider
    //   2. Se provider === 'meta_official' (e não é instagram) -> MetaWhatsappProvider
    //   3. Caso contrário -> ZapiProvider (zapi, uazapi, evolution_api)

    let provider: MessageProvider

    if (conversation.channel === 'instagram') {
      // INSTAGRAM - sempre usa InstagramProvider independente do provider name
      console.log('[SEND-MESSAGE] Routing to: INSTAGRAM PROVIDER')
      provider = new InstagramProvider(integration.credentials)
    }
    else if (integration.provider === 'meta_official') {
      // META WHATSAPP OFICIAL
      console.log('[SEND-MESSAGE] Routing to: META WHATSAPP PROVIDER')
      provider = new MetaWhatsappProvider(integration.credentials)
    }
    else {
      // ZAPI / UAZAPI / EVOLUTION
      console.log('[SEND-MESSAGE] Routing to: ZAPI PROVIDER (', integration.provider, ')')
      provider = new ZapiProvider(integration.credentials, integration.provider)
    }

    // 5. Enviar mensagem
    const sendParams: SendMessageParams = {
      recipientId,
      message,
      mediaUrl,
      mediaType,
      mimetype
    }

    const result = await provider.send(sendParams)

    if (!result.success) {
      throw new Error(result.error || 'Erro ao enviar mensagem')
    }

    console.log('[SEND-MESSAGE] Message sent successfully. External ID:', result.externalId)

    // 6. Salvar mensagem no banco
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      content: message,
      message_type: mediaType || 'text',
      media_url: mediaUrl || null,
      media_mime_type: mimetype || null,
      status: 'sent',
      external_message_id: result.externalId,
      created_at: new Date().toISOString()
    })

    // 7. Atualizar última mensagem da conversa
    await supabase.from('conversations').update({
      last_message_content: message,
      last_message_at: new Date().toISOString()
    }).eq('id', conversationId)

    return new Response(
      JSON.stringify({ success: true, externalId: result.externalId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[SEND-MESSAGE] Error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
