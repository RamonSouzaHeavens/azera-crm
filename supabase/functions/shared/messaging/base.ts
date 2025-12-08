/// <reference lib="deno.window" />

/**
 * ETAPA 2.2: Base Messaging Provider
 * 
 * Classe abstrata com funcionalidades comuns a todos os provedores:
 * - Download de mídia com cache no Supabase Storage
 * - Logging de webhooks para auditoria e retry
 * - Tratamento padronizado de erros
 * - Validação de credenciais
 * 
 * Localização: supabase/functions/shared/messaging/base.ts
 */

// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import type {
  IMessagingProvider,
  SendMessagePayload,
  SendMessageResponse,
  FetchMediaResponse,
  ProcessWebhookResponse,
  HealthCheckResponse,
  AccountInfoResponse,
} from './types.ts'

export abstract class BaseMessagingProvider implements IMessagingProvider {
  private supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  constructor(
    protected integrationId: string,
    protected credentials: Record<string, any>,
    protected config: Record<string, any>
  ) {}

  /**
   * Download de mídia com retry e cache no Supabase Storage
   * 
   * URLs de provedores (Meta, Evolution) expiram em 24h.
   * Este método faz download e armazena no Storage Supabase para persistência.
   * 
   * @param mediaUrl URL temporária do provedor
   * @param mediaType MIME type (image/jpeg, audio/ogg, etc)
   * @param tenantId ID do tenant para organizar pasta no Storage
   * @returns { success, internalUrl, mimeType, filename, size }
   */
  protected async downloadMedia(
    mediaUrl: string,
    mediaType: string,
    tenantId: string
  ): Promise<FetchMediaResponse> {
    try {
      // 1. Fazer download da URL temporal
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.credentials.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao baixar mídia`)
      }

      const buffer = await response.arrayBuffer()

      // 2. Gerar nome único para evitar conflitos
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const path = `${tenantId}/media/${filename}`

      // 3. Upload para Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from('messaging-media')
        .upload(path, buffer, {
          contentType: mediaType,
          cacheControl: '31536000', // 1 ano (URL não expira)
        })

      if (uploadError) throw uploadError

      // 4. Obter URL pública persistente
      const { data } = this.supabase.storage
        .from('messaging-media')
        .getPublicUrl(path)

      return {
        success: true,
        internalUrl: data.publicUrl,
        mimeType: mediaType,
        filename,
        size: buffer.byteLength,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Erro ao baixar mídia:', errorMsg)
      return {
        success: false,
        internalUrl: '',
        mimeType: mediaType,
        filename: '',
        size: 0,
        error: `Falha ao fazer download de mídia: ${errorMsg}`,
      }
    }
  }

  /**
   * Log de webhook recebido para auditoria e retry
   * 
   * Insere registro em webhook_logs para rastreamento.
   * Útil para troubleshooting e retry automático de webhooks falhados.
   * 
   * @param tenantId ID do tenant
   * @param eventType Tipo do evento (message, status_update, read_receipt)
   * @param payload Dados brutos do webhook
   * @returns ID do log para referência
   */
  protected async logWebhook(
    tenantId: string,
    eventType: string,
    payload: Record<string, any>
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('webhook_logs')
        .insert({
          tenant_id: tenantId,
          integration_id: this.integrationId,
          event_type: eventType,
          payload,
          processed: false,
        })
        .select('id')
        .single()

      if (error) throw error

      return data.id
    } catch (error) {
      console.error('Erro ao logar webhook:', error)
      throw error
    }
  }

  /**
   * Marcar webhook como processado
   * 
   * Atualiza registro em webhook_logs para indicar sucesso.
   * Remove da fila de retry automático.
   */
  protected async markWebhookProcessed(
    webhookLogId: string,
    success: boolean = true
  ): Promise<void> {
    await this.supabase
      .from('webhook_logs')
      .update({
        processed: success,
        processed_at: new Date().toISOString(),
      })
      .eq('id', webhookLogId)
  }

  /**
   * Validar que credenciais estão configuradas corretamente
   * 
   * Cada provedor deve override este método com sua própria validação.
   * Exemplo: Meta precisa verificar se access_token é válido.
   */
  protected validateCredentials(): void {
    if (!this.credentials || Object.keys(this.credentials).length === 0) {
      throw new Error('Credenciais não configuradas')
    }
  }

  /**
   * Métodos abstratos que cada provedor DEVE implementar
   */

  abstract sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse>

  abstract markAsRead(
    externalMessageId: string,
    externalContactId: string
  ): Promise<void>

  abstract fetchMedia(
    mediaUrl: string,
    mediaType: string
  ): Promise<FetchMediaResponse>

  abstract validateWebhook(token: string, challenge?: string): Promise<string | boolean>

  abstract processWebhook(
    payload: Record<string, any>
  ): Promise<ProcessWebhookResponse>

  abstract healthCheck(): Promise<HealthCheckResponse>

  abstract getAccountInfo(): Promise<AccountInfoResponse>
}
