/// <reference lib="deno.window" />
// deno-lint-ignore-file no-explicit-any

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, clientes(telefone)')
      .eq('id', conversationId)
      .single()

    if (!conversation) throw new Error('Conversa não encontrada')

    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('tenant_id', conversation.tenant_id)
      .eq('channel', conversation.channel)
      .eq('status', 'active')
      .single()

    if (!integration) throw new Error('Nenhuma integração ativa')

    const telefoneDestino = conversation.clientes?.telefone.replace(/\D/g, '')
    let externalId = ''

    // Meta Oficial
    if (integration.provider === 'meta_official') {
      const { phone_number_id, access_token } = integration.credentials

      if (mediaUrl) {
        const mediaPayload: any = {
          messaging_product: 'whatsapp',
          to: telefoneDestino,
          type: mediaType || 'image'
        }
        mediaPayload[mediaType || 'image'] = { link: mediaUrl }
        if (message && message !== `[${mediaType?.toUpperCase()}]`) {
          mediaPayload[mediaType || 'image'].caption = message
        }

        const res = await fetch(`https://graph.facebook.com/v18.0/${phone_number_id}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mediaPayload)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(JSON.stringify(data))
        externalId = data.messages?.[0]?.id
      } else {
        const res = await fetch(`https://graph.facebook.com/v18.0/${phone_number_id}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: telefoneDestino, type: 'text', text: { body: message } })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(JSON.stringify(data))
        externalId = data.messages?.[0]?.id
      }
    }

    // Instagram
    else if (conversation.channel === 'instagram') {
      const { access_token, page_id } = integration.credentials

      // Instagram Graph API (v21.0)
      const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${access_token}`

      let payload: any = {
        recipient: { id: telefoneDestino },
        messaging_type: 'RESPONSE'
      }

      if (mediaUrl) {
        payload.message = {
          attachment: {
            type: mediaType || 'image',
            payload: {
              url: mediaUrl,
              is_reusable: true
            }
          }
        }
      } else {
        payload.message = { text: message }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error('Instagram API Error: ' + JSON.stringify(data))
      externalId = data.message_id
    }

    // Uazapi
    else if (integration.provider === 'zapi' || integration.provider === 'uazapi' || integration.provider === 'evolution_api') {
      const { instance_id, secret_key, base_url } = integration.credentials
      const isUazapi = base_url?.includes('uazapi') || integration.provider === 'uazapi'

      if (isUazapi) {
        // UAZAPI - Seguindo documentação EXATA
        const apiBase = base_url || 'https://api.uazapi.com'

        if (mediaUrl) {
          // Enviar mídia: POST /send/media
          const endpoint = `${apiBase}/send/media`
          const payload = {
            number: telefoneDestino,
            type: mediaType || 'image',
            file: mediaUrl
          }

          console.log('[UAZAPI] POST', endpoint, payload)

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': secret_key
            },
            body: JSON.stringify(payload)
          })

          const data = await response.json()
          console.log('[UAZAPI] Resposta:', response.status, data)

          if (!response.ok) throw new Error('Erro Uazapi: ' + JSON.stringify(data))
          externalId = data.chatId || data.id || data.messageId || 'unknown'
        } else {
          // Enviar texto: POST /send/text
          const endpoint = `${apiBase}/send/text`
          const payload = {
            number: telefoneDestino,
            text: message
          }

          console.log('[UAZAPI] POST', endpoint, payload)

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': secret_key
            },
            body: JSON.stringify(payload)
          })

          const data = await response.json()
          console.log('[UAZAPI] Resposta:', response.status, data)

          if (!response.ok) throw new Error('Erro Uazapi: ' + JSON.stringify(data))
          externalId = data.chatId || data.id || data.messageId || 'unknown'
        }
      } else {
        // Z-API / Evolution
        const apiBase = base_url ? base_url.replace(/\/$/, '') : 'https://api.z-api.io/instances'

        if (mediaUrl) {
          let endpoint = ''
          let payload: any = { phone: telefoneDestino }

          if (mediaType === 'image') {
            endpoint = `${apiBase}/${instance_id}/token/${secret_key}/send-image`
            payload.image = mediaUrl
            if (message && message !== '[IMAGE]') payload.caption = message
          } else if (mediaType === 'video') {
            endpoint = `${apiBase}/${instance_id}/token/${secret_key}/send-video`
            payload.video = mediaUrl
            if (message && message !== '[VIDEO]') payload.caption = message
          } else if (mediaType === 'audio') {
            endpoint = `${apiBase}/${instance_id}/token/${secret_key}/send-audio`
            payload.audio = mediaUrl
          } else if (mediaType === 'document') {
            endpoint = `${apiBase}/${instance_id}/token/${secret_key}/send-document`
            payload.document = mediaUrl
            if (message && message !== '[DOCUMENT]') payload.fileName = message
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })

          const data = await response.json()
          if (!response.ok) throw new Error('Erro Z-API: ' + JSON.stringify(data))
          externalId = data.messageId || data.id || 'unknown'
        } else {
          const endpoint = `${apiBase}/${instance_id}/token/${secret_key}/send-text`
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: telefoneDestino, message })
          })

          const data = await response.json()
          if (!response.ok) throw new Error('Erro Z-API: ' + JSON.stringify(data))
          externalId = data.messageId || data.id || 'unknown'
        }
      }
    }

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      content: message,
      message_type: mediaType || 'text',
      media_url: mediaUrl || null,
      media_mime_type: mimetype || null,
      status: 'sent',
      external_message_id: externalId,
      created_at: new Date().toISOString()
    })

    await supabase.from('conversations').update({
      last_message_content: message,
      last_message_at: new Date().toISOString()
    }).eq('id', conversationId)

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    console.error('Erro Send Message:', error)
    return new Response(JSON.stringify({ error: String(error) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
