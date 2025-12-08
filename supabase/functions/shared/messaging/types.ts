/**
 * =====================================================================
 * ETAPA 2: CAMADA DE ABSTRAÇÃO - INTERFACES E FACTORY PATTERN
 * =====================================================================
 * Arquivo: types.ts
 * Localização: supabase/functions/shared/messaging/
 * Propósito: Definir interface genérica para provedores de mensageria
 *           e factory para instanciar o provedor correto por tenant
 * =====================================================================
 *
 * ESTRUTURA DE PASTAS RECOMENDADA:
 * 
 * supabase/functions/
 * ├── shared/messaging/
 * │   ├── index.ts                    (exports main)
 * │   ├── types.ts                    (ESTE ARQUIVO - tipos comuns)
 * │   ├── factory.ts                  (ProviderFactory)
 * │   ├── base.ts                     (BaseMessagingProvider abstrato)
 * │   └── providers/
 * │       ├── meta.ts                 (MetaProvider impl.)
 * │       ├── evolution.ts            (EvolutionProvider impl.)
 * │       └── zapi.ts                 (ZapiProvider impl.)
 * │
 * ├── webhook-receiver/               (ETAPA 3 - Inbound messages)
 * │   ├── index.ts
 * │   └── config.json
 * │
 * ├── send-message/                   (ETAPA 4 - Outbound messages)
 * │   ├── index.ts
 * │   └── config.json
 * │
 * └── webhooks/meta/
 *     └── index.ts                    (Meta webhook endpoint)
 */

// =====================================================================
// TIPOS E ENUMS
// =====================================================================

export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' | 'template' | 'interactive'
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'queued'
export type ChannelType = 'whatsapp' | 'instagram' | 'facebook_messenger'
export type ProviderType = 'meta_official' | 'meta_business_api' | 'evolution_api' | 'zapi' | 'uazapi' | 'baileys_gateway'

// =====================================================================
// INTERFACE PRINCIPAL (Strategy Pattern)
// =====================================================================

/**
 * Interface genérica que TODO provedor deve implementar
 * Permite trocar de provedor sem alterar código cliente (SOLID: Open/Closed)
 */
export interface IMessagingProvider {
  sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse>
  markAsRead(externalMessageId: string, externalContactId: string): Promise<void>
  fetchMedia(mediaUrl: string, mediaType: string): Promise<FetchMediaResponse>
  validateWebhook(token: string, challenge?: string): Promise<string | boolean>
  processWebhook(payload: Record<string, any>): Promise<ProcessWebhookResponse>
  healthCheck(): Promise<HealthCheckResponse>
  getAccountInfo(): Promise<AccountInfoResponse>
}

// =====================================================================
// PAYLOADS E RESPONSES
// =====================================================================

export interface SendMessagePayload {
  tenantId: string
  conversationId: string
  externalContactId: string     // Phone (WhatsApp) ou Instagram ID
  message: string
  messageType?: MessageType      // default: 'text'
  mediaUrl?: string              // Se type=image/video/audio
  replyToExternalMessageId?: string
}

export interface SendMessageResponse {
  success: boolean
  externalMessageId: string
  status: MessageStatus
  timestamp: Date
  error?: string
  statusCode?: number
}

export interface FetchMediaResponse {
  success: boolean
  internalUrl: string    // URL Supabase Storage (não expira)
  mimeType: string
  filename: string
  size: number
  error?: string
}

export interface ProcessWebhookResponse {
  success: boolean
  eventType: string      // 'message.received', 'status_update', 'read_receipt'
  externalMessageId?: string
  externalContactId?: string
  conversationId?: string
  messageContent?: string
  messageType?: MessageType
  mediaUrl?: string
  error?: string
}

export interface HealthCheckResponse {
  healthy: boolean
  provider: ProviderType
  channel: ChannelType
  accountId?: string
  accountName?: string
  error?: string
}

export interface AccountInfoResponse {
  accountId: string
  accountName: string
  phoneNumber?: string
  profilePicUrl?: string
  verifiedName?: string
}

// =====================================================================
// CREDENCIAIS TIPADAS POR PROVEDOR
// =====================================================================

export interface MetaCredentials {
  access_token: string
  phone_number_id: string
  business_account_id: string
  webhook_verify_token: string
}

export interface MetaConfig {
  webhook_secret: string
  webhook_endpoint: string
  api_version: string
  webhook_url: string
}

export interface EvolutionCredentials {
  instance_id: string
  api_key: string
}

export interface EvolutionConfig {
  webhook_secret: string
  instance_name: string
  server_url: string
  webhook_url: string
}

export interface ZapiCredentials {
  account_id: string
  secret_key: string
}

export interface ZapiConfig {
  webhook_secret: string
  webhook_url: string
}

// =====================================================================
// WEBHOOK EVENTS (Tipado para Meta)
// =====================================================================

export interface WebhookEventMeta {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
          business_account_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: string
          text?: { body: string }
          image?: { link: string; mime_type: string }
          audio?: { link: string; mime_type: string }
          video?: { link: string; mime_type: string }
        }>
        statuses?: Array<{
          id: string
          status: string
          timestamp: string
          recipient_id: string
        }>
      }
      field: string
    }>
  }>
}

// =====================================================================
// ERROR TYPES
// =====================================================================

export class ProviderError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export enum ProviderErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INTEGRATION_NOT_FOUND = 'INTEGRATION_NOT_FOUND',
  CONTACT_NOT_FOUND = 'CONTACT_NOT_FOUND',
  MEDIA_DOWNLOAD_FAILED = 'MEDIA_DOWNLOAD_FAILED',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  WEBHOOK_VALIDATION_FAILED = 'WEBHOOK_VALIDATION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

