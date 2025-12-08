/// <reference lib="deno.window" />
// deno-lint-ignore-file no-explicit-any

/**
 * Evolution Provider Implementation
 * 
 * Evolution API é um wrapper REST para Baileys WhatsApp
 * Documentação: https://doc.evolution-api.com/
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

interface EvolutionWebhookPayload {
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

export class EvolutionProvider extends BaseMessagingProvider {
  private instanceName: string
  private apiKey: string
  private baseUrl: string
  private channel: ChannelType

  constructor(
    integrationId: string,
    credentials: Record<string, any>,
    config: Record<string, any>,
    channel: ChannelType = 'whatsapp'
  ) {
    super(integrationId, credentials, config)
    this.instanceName = credentials.instance_name || config.instance_name
    this.apiKey = credentials.api_key
    this.baseUrl = credentials.base_url || config.server_url
    this.channel = channel

    this.validateCredentials()
  }

  protected validateCredentials(): void {
    super.validateCredentials()
    if (!this.instanceName) throw new Error('instance_name não configurado')
    if (!this.apiKey) throw new Error('api_key não configurado')
    if (!this.baseUrl) throw new Error('base_url não configurado')
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/message/${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Evolution API error ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    try {
      const phoneNumber = payload.externalContactId.replace('@s.whatsapp.net', '').replace(/\D/g, '')

      const messageData = {
        number: phoneNumber,
        text: payload.message,
      }

      const result = await this.makeRequest('sendText', {
        method: 'POST',
        body: JSON.stringify(messageData),
      })

      return {
        success: true,
        externalMessageId: result.key?.id || `evo_${Date.now()}`,
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
    // Evolution API pode não ter endpoint específico para marcar como lido
    // Implementar se necessário
  }

  async fetchMedia(mediaUrl: string, mediaType: string): Promise<FetchMediaResponse> {
    // Para Evolution, as mídias já vêm com URLs diretas
    // Mas podemos implementar download se necessário
    return {
      success: true,
      internalUrl: mediaUrl,
      mimeType: mediaType,
      filename: 'media',
      size: 0,
    }
  }

  async validateWebhook(token?: string, challenge?: string): Promise<string | boolean> {
    // Evolution API usa apikey para validação
    return true
  }

  async processWebhook(payload: Record<string, any>): Promise<ProcessWebhookResponse> {
    const webhook = payload as EvolutionWebhookPayload

    if (webhook.event !== 'messages.upsert') {
      return {
        success: false,
        eventType: 'unknown',
      }
    }

    const message = webhook.data
    if (!message.key || message.key.fromMe) {
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
      const result = await this.makeRequest('findChatMessages', {
        method: 'POST',
        body: JSON.stringify({
          number: 'status@broadcast', // Número especial para teste
          limit: 1,
        }),
      })

      return {
        healthy: true,
        provider: 'evolution_api' as any,
        channel: this.channel,
        accountId: this.instanceName,
        accountName: this.instanceName,
      }
    } catch (error) {
      return {
        healthy: false,
        provider: 'evolution_api' as any,
        channel: this.channel,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async getAccountInfo(): Promise<AccountInfoResponse> {
    try {
      // Evolution API pode ter endpoint para informações da conta
      // Por enquanto, retornar informações básicas
      return {
        accountId: this.instanceName,
        accountName: this.instanceName,
        phoneNumber: 'N/A',
      }
    } catch (error) {
      // Mesmo em erro, retornar estrutura básica
      return {
        accountId: this.instanceName,
        accountName: this.instanceName,
        phoneNumber: 'N/A',
      }
    }
  }
}
