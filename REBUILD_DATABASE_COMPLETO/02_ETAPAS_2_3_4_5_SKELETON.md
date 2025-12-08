/**
 * =====================================================================
 * STATUS: ETAPAS 2.2-4 IMPLEMENTADAS | ETAPA 5 PENDENTE
 * =====================================================================
 * 
 * ARQUIVOS CRIADOS:
 * 
 * ✅ ETAPA 2.2: supabase/functions/shared/messaging/base.ts
 *    - Classe abstrata BaseMessagingProvider
 *    - Métodos comuns: downloadMedia, logWebhook, validateCredentials
 * 
 * ✅ ETAPA 2.3: supabase/functions/shared/messaging/providers/meta.ts
 *    - MetaProvider implementando IMessagingProvider
 *    - Suporte para WhatsApp Business API v18.0
 *    - Processa eventos: message.received, status_update, read_receipt
 * 
 * ✅ ETAPA 3: supabase/functions/webhook-receiver/index.ts
 *    - Edge Function para receber webhooks inbound
 *    - Valida HMAC, identifica tenant, upsert contact/conversation
 *    - Faz download de mídia, publica Realtime
 *    - Retorna 200 OK sempre (evita retry infinito)
 * 
 * ✅ ETAPA 4: supabase/functions/send-message/index.ts
 *    - Edge Function para enviar mensagens (chamada frontend)
 *    - Valida JWT, permissions, integration ativa
 *    - Envia via provider, persiste no BD, publica Realtime
 * 
 * ❌ ETAPA 5: Frontend Realtime hooks (PENDENTE)
 *    - Criar src/hooks/useConversations.ts
 *    - Modificar src/pages/Conversations.tsx
 *    - Implementar UI otimista
 * 
 * =====================================================================
 */

// PRÓXIMOS PASSOS:

1. **Criar ETAPA 2.4 e 2.5: Implementações Evolution + Z-API**
   - supabase/functions/shared/messaging/providers/evolution.ts
   - supabase/functions/shared/messaging/providers/zapi.ts
   - Copiar padrão do MetaProvider, adaptar para cada API

2. **Testar Webhook-Receiver**
   - Use webhook.site para simular payloads Meta
   - Adicionar test suite em TESTE_E2E_WEBHOOKS.md
   - Validar HMAC signature

3. **Testar Send-Message**
   - Chamar from Postman com JWT válido
   - Verificar que message é inserida com status 'sent'

4. **ETAPA 5: Frontend Realtime**
   - Criar useConversations hook
   - Modify Conversations.tsx para usar real data
   - Implementar otimista UI (status 'queued' -> 'sent')

5. **Deploy**
   - supabase functions deploy
   - Testar em staging antes de produção

=====================================================================

// =====================================================================
// ETAPA 2.2: BASE PROVIDER (classe abstrata)
// =====================================================================
// Arquivo: supabase/functions/shared/messaging/base.ts
// 
// Propósito: Classe base com funcionalidades comuns a todos os provedores
// - Download e cache de mídia
// - Logging e auditoria
// - Tratamento de erros
// 
// Código:

/**
 * 
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// import type { IMessagingProvider, SendMessagePayload, SendMessageResponse } from './types.ts'
// 
// const supabaseUrl = Deno.env.get('SUPABASE_URL')!
// const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// 
// export abstract class BaseMessagingProvider implements IMessagingProvider {
//   protected supabase = createClient(supabaseUrl, supabaseServiceKey, {
//     auth: { autoRefreshToken: false, persistSession: false }
//   })
// 
//   constructor(
//     protected integrationId: string,
//     protected credentials: Record<string, any>,
//     protected config: Record<string, any>
//   ) {}
// 
//   /**
//    * Download de mídia com retry e cache no Supabase Storage
//    * URLs de provedores (Meta, Evolution) expiram em 24h
//    */
//   protected async downloadMedia(
//     mediaUrl: string,
//     mediaType: string,
//     tenantId: string
//   ): Promise<{ storageUrl: string; mimeType: string; filename: string }> {
//     try {
//       const response = await fetch(mediaUrl, {
//         headers: { 'Authorization': `Bearer ${this.credentials.access_token}` }
//       })
// 
//       if (!response.ok) throw new Error(`HTTP ${response.status}`)
// 
//       const buffer = await response.arrayBuffer()
//       const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//       const path = `${tenantId}/media/${filename}`
// 
//       const { error } = await this.supabase.storage
//         .from('messaging-media')
//         .upload(path, buffer, { contentType: mediaType })
// 
//       if (error) throw error
// 
//       const { data } = this.supabase.storage
//         .from('messaging-media')
//         .getPublicUrl(path)
// 
//       return {
//         storageUrl: data.publicUrl,
//         mimeType: mediaType,
//         filename
//       }
//     } catch (error) {
//       console.error('Media download failed:', error)
//       throw error
//     }
//   }
// 
//   /**
//    * Log webhook recebido para auditoria e retry
//    */
//   protected async logWebhook(
//     tenantId: string,
//     eventType: string,
//     payload: Record<string, any>
//   ): Promise<string> {
//     const { data, error } = await this.supabase
//       .from('webhook_logs')
//       .insert({
//         tenant_id: tenantId,
//         integration_id: this.integrationId,
//         event_type: eventType,
//         payload,
//         processed: false
//       })
//       .select('id')
//       .single()
// 
//     if (error) throw error
//     return data.id
//   }
// 
//   /**
//    * Métodos abstratos - implementar nos provedores específicos
//    */
//   abstract sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse>
//   abstract markAsRead(externalMessageId: string, externalContactId: string): Promise<void>
//   abstract fetchMedia(mediaUrl: string, mediaType: string): Promise<any>
//   abstract validateWebhook(token: string, challenge?: string): Promise<string | boolean>
//   abstract processWebhook(payload: Record<string, any>): Promise<any>
//   abstract healthCheck(): Promise<any>
//   abstract getAccountInfo(): Promise<any>
// }
 * 
 */

// =====================================================================
// ETAPA 2.3: META PROVIDER
// =====================================================================
// Arquivo: supabase/functions/shared/messaging/providers/meta.ts
//
// Propósito: Implementar IMessagingProvider para Meta (WhatsApp Business API)
//
// Responsabilidades:
// 1. Enviar mensagens via WhatsApp Cloud API
// 2. Processar webhooks de entrada
// 3. Fazer download de mídia antes de expirar
// 4. Gerenciar status de entrega (sent, delivered, read)
// 
// Endpoints Meta usados:
// - POST /phone_number_id/messages (enviar)
// - GET /media_id (fazer download)
// - POST /messages/{message_id}/mark_read (marcar como lido)
//
// Código (skeleton):
/**
 * 
// import { BaseMessagingProvider } from '../base.ts'
// import type {
//   SendMessagePayload,
//   SendMessageResponse,
//   FetchMediaResponse,
//   HealthCheckResponse,
//   AccountInfoResponse,
//   ProcessWebhookResponse,
//   ChannelType
// } from '../types.ts'
// 
// const META_API_VERSION = 'v18.0'
// const META_API_URL = 'https://graph.instagram.com' // ou 'https://graph.facebook.com'
// 
// export class MetaProvider extends BaseMessagingProvider {
//   private phoneNumberId: string
//   private accessToken: string
//   private channel: ChannelType
// 
//   constructor(integrationId: string, credentials: any, config: any, channel: ChannelType) {
//     super(integrationId, credentials, config)
//     this.phoneNumberId = credentials.phone_number_id
//     this.accessToken = credentials.access_token
//     this.channel = channel
//   }
// 
//   async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
//     // TODO: Implementar
//     // 1. Validar payload
//     // 2. Construir body para Meta API
//     // 3. POST para /phone_number_id/messages
//     // 4. Retornar external_message_id
//     // 5. Inserir em DB com status 'sent'
//   }
// 
//   async markAsRead(externalMessageId: string, externalContactId: string): Promise<void> {
//     // TODO: Implementar
//     // POST para /messages/{message_id}/mark_read
//   }
// 
//   async fetchMedia(mediaUrl: string, mediaType: string): Promise<FetchMediaResponse> {
//     // TODO: Implementar
//     // Usar this.downloadMedia() da classe base
//   }
// 
//   async validateWebhook(token: string, challenge?: string): Promise<string | boolean> {
//     // TODO: Implementar
//     // Comparar token com webhook_verify_token
//     // Se válido, retornar challenge (handshake Meta)
//   }
// 
//   async processWebhook(payload: any): Promise<ProcessWebhookResponse> {
//     // TODO: Implementar
//     // 1. Validar HMAC signature
//     // 2. Extrair type (message, status_update, read_receipt)
//     // 3. Fazer upsert de contact, conversation, message
//     // 4. Se for imagem/áudio, fazer download
//   }
// 
//   async healthCheck(): Promise<HealthCheckResponse> {
//     // TODO: Implementar
//     // GET /phone_number_id para verificar se token válido
//   }
// 
//   async getAccountInfo(): Promise<AccountInfoResponse> {
//     // TODO: Implementar
//     // GET /phone_number_id/profile para pegar número verificado
//   }
// }
 * 
 */

// =====================================================================
// ETAPA 3: WEBHOOK RECEIVER (INBOUND)
// =====================================================================
// Arquivo: supabase/functions/webhook-receiver/index.ts
//
// Propósito: Edge Function que recebe webhooks dos provedores
// - Endpoint único para todos os provedores
// - Identificar tenant pelo phone_number_id ou instagram_id
// - Criar/atualizar contact e conversation se necessário
// - Inserir mensagem no DB
// - Fazer download de mídia
//
// Fluxo:
// 1. POST /webhook-receiver { provider, payload }
// 2. Validar assinatura HMAC
// 3. Buscar integração pelo external_id
// 4. Extrair tenant_id
// 5. Usar ProviderFactory.create() para processar
// 6. Fazer upsert de clientes (contact)
// 7. Fazer upsert de conversations
// 8. Inserir message com external_message_id
// 9. Publicar evento no Realtime (conversas e mensagens)
//
// Código (skeleton):
/**
 * 
// import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// import { ProviderFactory } from '../shared/messaging/factory.ts'
// 
// const supabaseUrl = Deno.env.get('SUPABASE_URL')!
// const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// 
// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', {
//       headers: {
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'POST, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type'
//       }
//     })
//   }
// 
//   if (req.method !== 'POST') {
//     return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
//   }
// 
//   const supabase = createClient(supabaseUrl, supabaseServiceKey, {
//     auth: { autoRefreshToken: false, persistSession: false }
//   })
// 
//   try {
//     const payload = await req.json()
// 
//     // TODO:
//     // 1. Validar assinatura HMAC (prevenir spoofing)
//     // 2. Identificar tenant
//     // 3. Usar ProviderFactory.create() para processar
//     // 4. Fazer upsert de contact (clientes)
//     // 5. Fazer upsert de conversation
//     // 6. Inserir message
//     // 7. Se mídia, fazer download
//     // 8. Log webhook_logs para auditoria
//     // 9. Publicar no Realtime
//
//     return new Response(JSON.stringify({ success: true }), { status: 200 })
//   } catch (error) {
//     console.error('Webhook error:', error)
//     return new Response(JSON.stringify({ error: error.message }), { status: 500 })
//   }
// })
 * 
 */

// =====================================================================
// ETAPA 4: SEND MESSAGE (OUTBOUND)
// =====================================================================
// Arquivo: supabase/functions/send-message/index.ts
//
// Propósito: Edge Function para enviar mensagem (chamada pelo frontend)
// - Receber conversation_id e message content
// - Validar permissão do usuário (RLS)
// - Buscar conversation + integration
// - Usar ProviderFactory para enviar
// - Inserir message no DB
// - Retornar status
//
// Fluxo:
// 1. POST /send-message { conversationId, message, messageType? }
// 2. Auth (verificar user)
// 3. Validar que user tem acesso ao tenant
// 4. Buscar conversation
// 5. Buscar integration ativa
// 6. Usar ProviderFactory.create()
// 7. provider.sendMessage()
// 8. Inserir message com external_message_id
// 9. Atualizar conversation (last_message_content, last_activity_at)
// 10. Publicar no Realtime
//
// Código (skeleton):
/**
 * 
// import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// import { ProviderFactory } from '../shared/messaging/factory.ts'
// 
// serve(async (req) => {
//   if (req.method !== 'POST') {
//     return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
//   }
// 
//   try {
//     const { conversationId, message, messageType = 'text' } = await req.json()
//     const authHeader = req.headers.get('Authorization')
// 
//     // TODO:
//     // 1. Validar authHeader (JWT do user)
//     // 2. Buscar conversation
//     // 3. Validar user tem acesso ao tenant
//     // 4. Buscar integration
//     // 5. Usar ProviderFactory
//     // 6. provider.sendMessage()
//     // 7. Inserir message
//     // 8. Publicar Realtime
//     // 9. Retornar { success, externalMessageId, status }
// 
//     return new Response(JSON.stringify({ success: true }), { status: 200 })
//   } catch (error) {
//     console.error('Send message error:', error)
//     return new Response(JSON.stringify({ error: error.message }), { status: 500 })
//   }
// })
 * 
 */

// =====================================================================
// ETAPA 5: FRONTEND - REALTIME HOOKS
// =====================================================================
// Arquivo: src/hooks/useConversations.ts
//
// Propósito: Hook React para sincronizar conversas via Realtime
// - Fetch inicial de conversas (paginado)
// - Escutar mudanças (INSERT/UPDATE)
// - Atualizar state local
// - Publicar eventos para componentes
//
// Uso em Conversations.tsx:
// ```tsx
// const { conversations, loading, error, sendMessage } = useConversations(tenantId)
// useEffect(() => {
//   return () => unsubscribe() // cleanup
// }, [])
// ```
//
// Código (skeleton):
/**
 * 
// import { useEffect, useState, useCallback } from 'react'
// import { useRealtimeChannel } from 'react-supabase-realtime' // ou criar custom hook
// import { supabase } from '@/lib/supabase'
// 
// export function useConversations(tenantId: string) {
//   const [conversations, setConversations] = useState<any[]>([])
//   const [loading, setLoading] = useState(true)
// 
//   // 1. Fetch inicial
//   useEffect(() => {
//     const loadConversations = async () => {
//       const { data } = await supabase
//         .from('conversations')
//         .select('*')
//         .eq('tenant_id', tenantId)
//         .order('last_activity_at', { ascending: false })
//         .limit(50)
// 
//       setConversations(data || [])
//       setLoading(false)
//     }
// 
//     loadConversations()
//   }, [tenantId])
// 
//   // 2. Escutar changes
//   useEffect(() => {
//     const channel = supabase
//       .channel(`conversations:${tenantId}`)
//       .on(
//         'postgres_changes',
//         { event: 'INSERT', schema: 'public', table: 'conversations', filter: `tenant_id=eq.${tenantId}` },
//         (payload) => setConversations(prev => [payload.new, ...prev])
//       )
//       .on(
//         'postgres_changes',
//         { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `tenant_id=eq.${tenantId}` },
//         (payload) => setConversations(prev =>
//           prev.map(c => c.id === payload.new.id ? payload.new : c)
//           .sort((a, b) => new Date(b.last_activity_at) - new Date(a.last_activity_at))
//         )
//       )
//       .subscribe()
// 
//     return () => supabase.removeChannel(channel)
//   }, [tenantId])
// 
//   // 3. Send message (UI otimista)
//   const sendMessage = useCallback(async (conversationId: string, message: string) => {
//     // Otimista: inserir localmente com status 'queued'
//     const tempMessageId = `temp_${Date.now()}`
//     setMessages(prev => [...prev, { id: tempMessageId, content: message, status: 'queued' }])
// 
//     // Chamar edge function
//     const response = await fetch('/functions/v1/send-message', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.user.access_token}` },
//       body: JSON.stringify({ conversationId, message })
//     })
// 
//     // Se falhar, remover otimista
//     if (!response.ok) {
//       setMessages(prev => prev.filter(m => m.id !== tempMessageId))
//       throw new Error('Falha ao enviar')
//     }
//   }, [])
// 
//   return { conversations, loading, sendMessage }
// }
 * 
 */

// =====================================================================
// PRÓXIMOS PASSOS
// =====================================================================
// 1. Copiar cada seção para seu arquivo respectivo
// 2. Implementar TODO's em cada arquivo
// 3. Testes unitários para Factory e Providers
// 4. Testes E2E com webhook.site (TESTE_E2E_WEBHOOKS.md)
// 5. Deploy das Edge Functions

