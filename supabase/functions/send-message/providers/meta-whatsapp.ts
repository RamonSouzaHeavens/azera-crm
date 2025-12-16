// deno-lint-ignore-file no-explicit-any
import { MessageProvider, SendMessageParams, SendResult } from './types.ts'

/**
 * MetaWhatsappProvider - Envia mensagens via WhatsApp Business API (Meta Oficial)
 *
 * Credenciais esperadas:
 * - access_token: Token de acesso da API
 * - phone_number_id: ID do número de telefone do WhatsApp Business
 */
export class MetaWhatsappProvider implements MessageProvider {
  private accessToken: string
  private phoneNumberId: string

  constructor(credentials: any) {
    this.accessToken = credentials.access_token
    this.phoneNumberId = credentials.phone_number_id

    if (!this.accessToken) {
      throw new Error('Access Token não configurado na integração Meta WhatsApp')
    }
    if (!this.phoneNumberId) {
      throw new Error('Phone Number ID não configurado na integração Meta WhatsApp')
    }
  }

  async send(params: SendMessageParams): Promise<SendResult> {
    const { recipientId, message, mediaUrl, mediaType } = params

    if (!recipientId) {
      return { success: false, externalId: '', error: 'Telefone de destino não encontrado' }
    }

    const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`

    console.log('[META-WHATSAPP] URL:', url)
    console.log('[META-WHATSAPP] Recipient:', recipientId)

    try {
      let payload: any

      if (mediaUrl) {
        payload = {
          messaging_product: 'whatsapp',
          to: recipientId,
          type: mediaType || 'image'
        }
        payload[mediaType || 'image'] = { link: mediaUrl }

        if (message && message !== `[${mediaType?.toUpperCase()}]`) {
          payload[mediaType || 'image'].caption = message
        }
      } else {
        payload = {
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'text',
          text: { body: message }
        }
      }

      console.log('[META-WHATSAPP] Payload:', JSON.stringify(payload))

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      console.log('[META-WHATSAPP] Response:', res.status, JSON.stringify(data))

      if (!res.ok) {
        return {
          success: false,
          externalId: '',
          error: 'Meta WhatsApp API Error: ' + JSON.stringify(data)
        }
      }

      return {
        success: true,
        externalId: data.messages?.[0]?.id || 'unknown'
      }
    } catch (error) {
      console.error('[META-WHATSAPP] Fetch error:', error)
      return { success: false, externalId: '', error: String(error) }
    }
  }
}
