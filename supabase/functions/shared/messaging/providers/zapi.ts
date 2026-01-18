/// <reference lib="deno.window" />
// deno-lint-ignore-file no-explicit-any

/**
 * Z-API Provider Implementation
 *
 * Z-API é um provedor brasileiro de WhatsApp API
 * Documentação: https://docs.z-api.io/
 */

import { BaseMessagingProvider } from '../base.ts'
import type {
  SendMessagePayload,
  SendMessageResponse,
  FetchMediaResponse,
  HealthCheckResponse,
  AccountInfoResponse,
  ProcessWebhookResponse,
  ChannelType,
  MessageStatus,
} from '../types.ts'

interface ZapiWebhookPayload {
  event: string
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    message: {
      conversation?: string
      imageMessage?: {
        url: string
        mimetype: string
        caption?: string
      }
      videoMessage?: {
        url: string
        mimetype: string
        caption?: string
      }
      audioMessage?: {
        url: string
        mimetype: string
      }
      documentMessage?: {
        url: string
        mimetype: string
        title: string
      }
    }
    messageTimestamp: number
  }
}

export class ZapiProvider extends BaseMessagingProvider {
  private instanceId: string
  private token: string
  private baseHost: string
  private channel: ChannelType

  constructor(
    integrationId: string,
    credentials: Record<string, any>,
    config: Record<string, any>,
    channel: ChannelType = 'whatsapp'
  ) {
    super(integrationId, credentials, config)
    this.instanceId = credentials.instance_id || config.instance_id
    this.token = credentials.secret_key || credentials.token
    // Permitir base URL customizada para instâncias self-hosted (ex: heavens.uazapi.com)
    // Pode estar em credentials.base_url ou em config.base_url
    this.baseHost = (credentials.base_url || config.base_url || 'https://api.uazapi.com')
    this.channel = channel

    this.validateCredentials()
  }

  protected validateCredentials(): void {
    super.validateCredentials()
    if (!this.instanceId) throw new Error('instance_id não configurado')
    if (!this.token) throw new Error('token não configurado')
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Client-Token': this.token,
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Construir URL compatível com api.z-api.io e instâncias customizadas
    // Se baseHost for apenas o domínio (ex: https://api.z-api.io), a rota é /instances/{instanceId}{endpoint}
    // Se baseHost já incluir /instances, evitar duplicar
    const base = this.baseHost.endsWith('/instances') ? this.baseHost : `${this.baseHost}/instances`
    const url = `${base}/${this.instanceId}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Z-API error ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    try {
      const phoneNumber = payload.externalContactId.replace('@s.whatsapp.net', '').replace(/\D/g, '')

      const messageData = {
        phone: phoneNumber,
        message: payload.message,
      }

      const result = await this.makeRequest('/send-text', {
        method: 'POST',
        body: JSON.stringify(messageData),
      })

      return {
        success: true,
        externalMessageId: result.id || `zapi_${Date.now()}`,
        status: 'sent' as MessageStatus,
        timestamp: new Date(),
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        externalMessageId: '',
        status: 'failed' as MessageStatus,
        timestamp: new Date(),
        error: errorMsg,
      }
    }
  }

  async markAsRead(externalMessageId: string, externalContactId: string): Promise<void> {
    // Z-API pode ter endpoint para marcar como lido
    // Implementar se necessário
  }

  async fetchMedia(mediaUrl: string, mediaType: string): Promise<FetchMediaResponse> {
    // Para Z-API, as mídias já vêm com URLs diretas
    return {
      success: true,
      internalUrl: mediaUrl,
      mimeType: mediaType,
      filename: 'media',
      size: 0,
    }
  }

  async validateWebhook(token?: string, challenge?: string): Promise<string | boolean> {
    // Z-API usa Client-Token para validação
    return true
  }

  async processWebhook(payload: Record<string, any>): Promise<ProcessWebhookResponse> {
    const webhook = payload as ZapiWebhookPayload

    if (webhook.event !== 'message.received') {
      return {
        success: false,
        eventType: 'unknown',
      }
    }

    const message = webhook.data
    if (message.key.fromMe) {
      // Ignorar mensagens enviadas pelo próprio número
      return {
        success: false,
        eventType: 'outbound',
      }
    }

    const externalContactId = message.key.remoteJid
    const externalMessageId = message.key.id

    let messageType = 'text'
    let content = ''

    if (message.message?.conversation) {
      content = message.message.conversation
    } else if (message.message?.imageMessage) {
      messageType = 'image'
      content = message.message.imageMessage.caption || ''
    } else if (message.message?.videoMessage) {
      messageType = 'video'
      content = message.message.videoMessage.caption || ''
    } else if (message.message?.audioMessage) {
      messageType = 'audio'
    } else if (message.message?.documentMessage) {
      messageType = 'document'
      content = message.message.documentMessage.title || ''
    }

    return {
      success: true,
      eventType: 'message.received',
      externalMessageId,
      externalContactId,
      messageType: messageType as any,
      messageContent: content,
    }
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      // Tentar fazer uma requisição simples para verificar conectividade
      const result = await this.makeRequest('/status')

      return {
        healthy: true,
        provider: 'zapi' as any,
        channel: this.channel,
        accountId: this.instanceId,
        accountName: this.instanceId,
      }
    } catch (error) {
      return {
        healthy: false,
        provider: 'zapi' as any,
        channel: this.channel,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async getAccountInfo(): Promise<AccountInfoResponse> {
    try {
      // Z-API pode ter endpoint para informações da conta
      return {
        accountId: this.instanceId,
        accountName: this.instanceId,
        phoneNumber: 'N/A',
      }
    } catch (error) {
      return {
        accountId: this.instanceId,
        accountName: this.instanceId,
        phoneNumber: 'N/A',
      }
    }
  }
}
