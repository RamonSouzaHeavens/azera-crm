/// <reference lib="deno.window" />
// deno-lint-ignore-file no-explicit-any

/**
 * ETAPA 2.3: META PROVIDER (WhatsApp Business API)
 * 
 * Implementação de IMessagingProvider para Meta Cloud API
 * Suporta WhatsApp e Instagram Direct Messages
 * 
 * Localização: supabase/functions/shared/messaging/providers/meta.ts
 * 
 * Endpoints Meta v18.0:
 * - POST /phone_number_id/messages (enviar mensagens)
 * - GET /media_id (fazer download de mídia)
 * - POST /messages/{message_id}/mark_read (marcar lido)
 * - GET /phone_number_id (informações da conta)
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

const META_API_VERSION = 'v18.0'
const META_GRAPH_URL = 'https://graph.instagram.com' // ou https://graph.facebook.com

interface WebhookMessagePayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata?: {
          phone_number_id: string
          display_phone_number: string
        }
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: string
          text?: { body: string }
          image?: { link: string; mime_type: string }
          video?: { link: string; mime_type: string }
          audio?: { link: string; mime_type: string }
          document?: { link: string; filename: string; mime_type: string }
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
          errors?: Array<{ code: number; title: string }>
        }>
      }
    }>
  }>
}

export class MetaProvider extends BaseMessagingProvider {
  private phoneNumberId: string
  private accessToken: string
  private webhookToken: string
  private channel: ChannelType

  constructor(
    integrationId: string,
    credentials: Record<string, any>,
    config: Record<string, any>,
    channel: ChannelType
  ) {
    super(integrationId, credentials, config)
    this.phoneNumberId = credentials.phone_number_id
    this.accessToken = credentials.access_token
    this.webhookToken = credentials.webhook_verify_token || ''
    this.channel = channel

    this.validateCredentials()
  }

  protected validateCredentials(): void {
    super.validateCredentials()
    if (!this.phoneNumberId) throw new Error('phone_number_id não configurado')
    if (!this.accessToken) throw new Error('access_token não configurado')
  }

  /**
   * Enviar mensagem via WhatsApp Cloud API
   * Suporta: texto, imagem, vídeo, áudio, documento, localização, template
   */
  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    try {
      const { externalContactId, message, messageType = 'text', mediaUrl, replyToExternalMessageId } = payload

      let body: Record<string, any> = {
        messaging_product: 'whatsapp',
        to: externalContactId,
        type: messageType,
      }

      // Construir body conforme tipo de mensagem
      if (messageType === 'text') {
        body.text = { body: message }
      } else if (['image', 'video', 'audio', 'document'].includes(messageType) && mediaUrl) {
        body[messageType] = { link: mediaUrl }
      } else if (messageType === 'location') {
        // TODO: Parsear location do payload
        throw new Error('Location não implementado')
      } else if (messageType === 'template') {
        // TODO: Implementar templates
        throw new Error('Templates não implementado')
      }

      if (replyToExternalMessageId) {
        body.context = { message_id: replyToExternalMessageId }
      }

      // POST para Meta API
      const response = await fetch(
        `${META_GRAPH_URL}/${META_API_VERSION}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          externalMessageId: '',
          status: 'failed' as MessageStatus,
          timestamp: new Date(),
          statusCode: response.status,
          error: responseData.error?.message || `HTTP ${response.status}`,
        }
      }

      return {
        success: true,
        externalMessageId: responseData.messages[0].id,
        status: 'sent' as MessageStatus,
        timestamp: new Date(),
        statusCode: 200,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Erro ao enviar mensagem Meta:', errorMsg)
      return {
        success: false,
        externalMessageId: '',
        status: 'failed' as MessageStatus,
        timestamp: new Date(),
        statusCode: 500,
        error: errorMsg,
      }
    }
  }

  /**
   * Marcar mensagem como lida
   */
  async markAsRead(externalMessageId: string): Promise<void> {
    try {
      const response = await fetch(
        `${META_GRAPH_URL}/${META_API_VERSION}/${externalMessageId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'read',
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Erro ao marcar como lido:', error)
      throw error
    }
  }

  /**
   * Fazer download de mídia antes que URL expire
   */
  async fetchMedia(mediaUrl: string, mediaType: string): Promise<FetchMediaResponse> {
    // Usar método protegido da classe base
    return this.downloadMedia(mediaUrl, mediaType, '')
  }

  /**
   * Validar webhook token (handshake Meta)
   * Meta envia verify_token no primeiro acesso
   */
  async validateWebhook(token: string, challenge?: string): Promise<string | boolean> {
    if (token !== this.webhookToken) {
      return false
    }
    // Retornar challenge para completar handshake
    return challenge || true
  }

  /**
   * Processar webhook recebido de Meta
   * Extrai tipo de evento: mensagem, status update, read receipt
   */
  async processWebhook(payload: WebhookMessagePayload): Promise<ProcessWebhookResponse> {
    try {
      // Validar estrutura
      if (!payload.entry || payload.entry.length === 0) {
        return {
          success: false,
          eventType: 'unknown',
          error: 'Payload vazio',
        }
      }

      const entry = payload.entry[0]
      if (!entry.changes || entry.changes.length === 0) {
        return {
          success: false,
          eventType: 'unknown',
          error: 'Nenhuma mudança em entry',
        }
      }

      const change = entry.changes[0]
      const value = change.value

      // Processar mensagens recebidas
      if (value.messages && value.messages.length > 0) {
        const message = value.messages[0]
        return {
          success: true,
          eventType: 'message.received',
          externalMessageId: message.id,
          externalContactId: message.from,
          messageContent: message.text?.body || `[${message.type}]`,
          messageType: message.type as any,
          mediaUrl: message.image?.link || message.video?.link || message.audio?.link,
        }
      }

      // Processar status updates
      if (value.statuses && value.statuses.length > 0) {
        const status = value.statuses[0]
        return {
          success: true,
          eventType: 'status_update',
          externalMessageId: status.id,
          externalContactId: status.recipient_id,
          messageType: status.status as any,
        }
      }

      return {
        success: false,
        eventType: 'unknown',
        error: 'Tipo de evento desconhecido',
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Erro ao processar webhook Meta:', errorMsg)
      return {
        success: false,
        eventType: 'error',
        error: errorMsg,
      }
    }
  }

  /**
   * Health check: validar que token ainda é válido
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(
        `${META_GRAPH_URL}/${META_API_VERSION}/${this.phoneNumberId}?access_token=${this.accessToken}`
      )

      if (response.ok) {
        const data = await response.json()
        return {
          healthy: true,
          provider: 'meta_official',
          channel: this.channel,
          accountId: data.id,
          accountName: data.display_phone_number,
        }
      }

      return {
        healthy: false,
        provider: 'meta_official',
        channel: this.channel,
        error: `HTTP ${response.status}`,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        healthy: false,
        provider: 'meta_official',
        channel: this.channel,
        error: errorMsg,
      }
    }
  }

  /**
   * Obter informações da conta
   */
  async getAccountInfo(): Promise<AccountInfoResponse> {
    try {
      const response = await fetch(
        `${META_GRAPH_URL}/${META_API_VERSION}/${this.phoneNumberId}?access_token=${this.accessToken}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      return {
        accountId: data.id,
        accountName: data.verified_name || data.display_phone_number,
        phoneNumber: data.display_phone_number,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Erro ao obter info da conta:', errorMsg)
      throw error
    }
  }
}
