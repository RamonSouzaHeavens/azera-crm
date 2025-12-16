// deno-lint-ignore-file no-explicit-any
import { MessageProvider, SendMessageParams, SendResult } from './types.ts'

/**
 * ZapiProvider - Envia mensagens via Z-API, Uazapi ou Evolution API
 *
 * Credenciais esperadas:
 * - base_url: URL base da API
 * - instance_id: ID da instância
 * - secret_key: Token/chave de autenticação
 */
export class ZapiProvider implements MessageProvider {
  private baseUrl: string
  private instanceId: string
  private secretKey: string
  private isUazapi: boolean
  private providerName: string

  constructor(credentials: any, provider: string) {
    this.baseUrl = credentials.base_url?.replace(/\/$/, '') || ''
    this.instanceId = credentials.instance_id || ''
    this.secretKey = credentials.secret_key || ''
    this.providerName = provider

    // Detecta se é Uazapi pela URL ou pelo provider
    this.isUazapi = this.baseUrl?.includes('uazapi') || provider === 'uazapi'

    if (!this.secretKey) {
      throw new Error('Secret Key não configurada na integração')
    }
  }

  async send(params: SendMessageParams): Promise<SendResult> {
    const { recipientId, message, mediaUrl, mediaType } = params

    if (!recipientId) {
      return { success: false, externalId: '', error: 'Telefone de destino não encontrado' }
    }

    console.log(`[${this.providerName.toUpperCase()}] isUazapi:`, this.isUazapi)
    console.log(`[${this.providerName.toUpperCase()}] baseUrl:`, this.baseUrl)
    console.log(`[${this.providerName.toUpperCase()}] recipient:`, recipientId)

    try {
      if (this.isUazapi) {
        return await this.sendViaUazapi(recipientId, message, mediaUrl, mediaType)
      } else {
        return await this.sendViaZapi(recipientId, message, mediaUrl, mediaType)
      }
    } catch (error) {
      console.error(`[${this.providerName.toUpperCase()}] Error:`, error)
      return { success: false, externalId: '', error: String(error) }
    }
  }

  private async sendViaUazapi(recipientId: string, message: string, mediaUrl?: string, mediaType?: string): Promise<SendResult> {
    const apiBase = this.baseUrl || 'https://api.uazapi.com'

    if (mediaUrl) {
      const endpoint = `${apiBase}/send/media`
      const payload = {
        number: recipientId,
        type: mediaType || 'image',
        file: mediaUrl
      }

      console.log('[UAZAPI] POST', endpoint)
      console.log('[UAZAPI] Payload:', JSON.stringify(payload))

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': this.secretKey
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('[UAZAPI] Response:', response.status, JSON.stringify(data))

      if (!response.ok) {
        return { success: false, externalId: '', error: 'Erro Uazapi: ' + JSON.stringify(data) }
      }

      return {
        success: true,
        externalId: data.chatId || data.id || data.messageId || 'unknown'
      }
    } else {
      const endpoint = `${apiBase}/send/text`
      const payload = {
        number: recipientId,
        text: message
      }

      console.log('[UAZAPI] POST', endpoint)
      console.log('[UAZAPI] Payload:', JSON.stringify(payload))

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': this.secretKey
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('[UAZAPI] Response:', response.status, JSON.stringify(data))

      if (!response.ok) {
        return { success: false, externalId: '', error: 'Erro Uazapi: ' + JSON.stringify(data) }
      }

      return {
        success: true,
        externalId: data.chatId || data.id || data.messageId || 'unknown'
      }
    }
  }

  private async sendViaZapi(recipientId: string, message: string, mediaUrl?: string, mediaType?: string): Promise<SendResult> {
    const apiBase = this.baseUrl || 'https://api.z-api.io/instances'

    if (mediaUrl) {
      let endpoint = ''
      let payload: any = { phone: recipientId }

      if (mediaType === 'image') {
        endpoint = `${apiBase}/${this.instanceId}/token/${this.secretKey}/send-image`
        payload.image = mediaUrl
        if (message && message !== '[IMAGE]') payload.caption = message
      } else if (mediaType === 'video') {
        endpoint = `${apiBase}/${this.instanceId}/token/${this.secretKey}/send-video`
        payload.video = mediaUrl
        if (message && message !== '[VIDEO]') payload.caption = message
      } else if (mediaType === 'audio') {
        endpoint = `${apiBase}/${this.instanceId}/token/${this.secretKey}/send-audio`
        payload.audio = mediaUrl
      } else if (mediaType === 'document') {
        endpoint = `${apiBase}/${this.instanceId}/token/${this.secretKey}/send-document`
        payload.document = mediaUrl
        if (message && message !== '[DOCUMENT]') payload.fileName = message
      } else {
        // Default to image
        endpoint = `${apiBase}/${this.instanceId}/token/${this.secretKey}/send-image`
        payload.image = mediaUrl
        if (message) payload.caption = message
      }

      console.log('[ZAPI] POST', endpoint)
      console.log('[ZAPI] Payload:', JSON.stringify(payload))

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('[ZAPI] Response:', response.status, JSON.stringify(data))

      if (!response.ok) {
        return { success: false, externalId: '', error: 'Erro Z-API: ' + JSON.stringify(data) }
      }

      return {
        success: true,
        externalId: data.messageId || data.id || 'unknown'
      }
    } else {
      const endpoint = `${apiBase}/${this.instanceId}/token/${this.secretKey}/send-text`

      console.log('[ZAPI] POST', endpoint)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: recipientId, message })
      })

      const data = await response.json()
      console.log('[ZAPI] Response:', response.status, JSON.stringify(data))

      if (!response.ok) {
        return { success: false, externalId: '', error: 'Erro Z-API: ' + JSON.stringify(data) }
      }

      return {
        success: true,
        externalId: data.messageId || data.id || 'unknown'
      }
    }
  }
}
