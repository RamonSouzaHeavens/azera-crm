# 🔄 FLUXO COMPLETO DE MENSAGENS EM TEMPO REAL

## Arquitetura Implementada

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENTE (Whatsapp/Usuario)                   │
│                                                                     │
│  [Mensagem Inbound]           [Usuario Digita]                   │
│         │                              │                          │
└─────────│──────────────────────────────│──────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐         ┌──────────────────────────┐
│  Uazapi Webhook  │         │ React Conversations Page  │
│  POST /webhook   │         │  (Conversations.tsx)     │
└────────┬─────────┘         └────────┬─────────────────┘
         │                            │
         │ JSON Payload               │ handleSend()
         │                            │
         ▼                            ▼
┌─────────────────────────────────────────────────────────┐
│  Edge Function: webhook-receiver                         │
│  (Deno Runtime)                                          │
│                                                          │
│  - Parse JSON                                           │
│  - Unwrap N8N wrapper (se houver)                       │
│  - Chamar RPC process_webhook_message                   │
│  - Log [WEBHOOK]                                        │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  RPC: process_webhook_message (PL/pgSQL)                │
│                                                          │
│  1️⃣  Detectar provider (Meta/Z-API)                    │
│  2️⃣  Extrair: instanceId, phone, name, content         │
│  3️⃣  Buscar integração ativa                            │
│  4️⃣  Upsert cliente (tenant_id, phone)                 │
│  5️⃣  Upsert conversation                                │
│  6️⃣  INSERT message                                     │
│  7️⃣  RETURN success JSON                                │
│                                                          │
│  Log: [RPC] cada passo                                  │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│         PostgreSQL (Supabase)                            │
│                                                          │
│  ├─ clientes (upsert)                                   │
│  ├─ conversations (upsert)                              │
│  └─ messages (INSERT)                                   │
│                                                          │
│  🔔 Publica eventos via Realtime                        │
└──────────────┬──────────────────────────────────────────┘
               │
               ├─────────────────────────┐
               │                         │
               ▼                         ▼
        ┌─────────────┐          ┌──────────────┐
        │  Realtime   │          │   Realtime   │
        │  messages   │          │ conversations│
        │  channel    │          │   channel    │
        └──────┬──────┘          └──────┬───────┘
               │                        │
               │ INSERT event          │ UPDATE event
               │                        │
               ▼                        ▼
┌─────────────────────────────────────────────────────────┐
│  React Hooks (Subscriptions)                             │
│                                                          │
│  ├─ useMessages (lê INSERT/UPDATE de messages)          │
│  │   - Evita duplicatas com external_message_id         │
│  │   - Remove otimistas quando confirmadas              │
│  │   - Scroll automático para nova mensagem             │
│  │                                                       │
│  └─ useConversations (lê UPDATE de conversations)       │
│      - Atualiza lista quando last_message_at muda       │
│      - Re-ordena por última mensagem                    │
│      - Atualiza unread_count                            │
│                                                          │
│  Log: [REALTIME] status e eventos                       │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  UI Atualizada em Tempo Real                             │
│                                                          │
│  ✅ Nova mensagem aparece no chat                       │
│  ✅ Conversa se move para o topo da lista               │
│  ✅ Indicador de "nova mensagem" atualizado             │
│  ✅ Mídia (imagens, vídeos) renderizada                 │
│  ✅ Timestamp relativo ("há 5 minutos")                 │
└─────────────────────────────────────────────────────────┘
```

## Estados de Uma Mensagem

```
┌─────────────────────────────────────────────────────────┐
│              Mensagem INBOUND (Cliente)                  │
└─────────────────────────────────────────────────────────┘

1. Cliente envia via Whatsapp
   ↓
2. Uazapi recebe webhook
   ↓
3. Webhook-receiver chama RPC
   ↓
4. RPC insere message com status='delivered'
   ↓
5. Realtime dispara INSERT
   ↓
6. useMessages recebe e renderiza
   ↓
7. ✅ Mensagem visível no chat

┌─────────────────────────────────────────────────────────┐
│            Mensagem OUTBOUND (Usuário)                   │
└─────────────────────────────────────────────────────────┘

1. Usuário digita e clica "enviar"
   ↓
2. sendMessage() cria otimista com status='pending'
   ↓
3. Renderiza imediatamente (sem aguardar confirma)
   ↓
4. Edge Function send-message é chamada
   ↓
5. send-message envia via Uazapi API
   ↓
6. send-message insere message com status='delivered'
   ↓
7. Realtime publica INSERT
   ↓
8. useMessages: remove otimista, adiciona a real
   ↓
9. ✅ Mensagem confirmada no chat
```

## Deduplicação de Mensagens

### Problema
- Webhook pode ser chamado 2x pelo provedor
- Mensagem pode ser salva 2x no BD

### Solução
- Usar `external_message_id` como chave única
- No hook: verificar se `external_id` já processada
- Na RPC: usar `external_message_id` em índice

```typescript
// useMessages.ts
const processedExternalIds = new Set<string>()

if (newMsg.external_message_id) {
  if (processedExternalIds.has(newMsg.external_message_id)) {
    return // Ignorar duplicata
  }
  processedExternalIds.add(newMsg.external_message_id)
}
```

## Tratamento de Mídia

### Download e Upload
1. Webhook contém `mediaUrl` (URL da Uazapi)
2. RPC (ou Edge Function) faz download
3. Upload para Supabase Storage em `chat-media/{tenant_id}/{filename}`
4. Obter `publicUrl`
5. Salvar URL pública em `messages.media_url`

### Renderização
```tsx
// Se message_type = 'image' ou media_url contém 'image'
<img src={msg.media_url} />

// Se message_type = 'video'
<video src={msg.media_url} controls />

// Se message_type = 'audio'
<audio src={msg.media_url} controls />

// Se message_type = 'document'
<a href={msg.media_url}> Abrir documento </a>
```

## Logging para Debug

### Edge Function
```
[WEBHOOK] START - Method: POST
[WEBHOOK] Received payload, size: 2458 bytes
[WEBHOOK] Calling process_webhook_message RPC
[WEBHOOK] Success: {...}
```

### RPC
```
[RPC] process_webhook_message - payload size
[RPC] Unwrapped N8N wrapper
[RPC] Detected Z-API provider
[RPC] Found integration: tenant_id=...
[RPC] Upserted client: id=...
[RPC] Upserted conversation: id=...
[RPC] Message inserted successfully
```

### Frontend
```
[CONVERSATIONS] Carregadas: 5 conversas
[CONVERSATIONS] Realtime status: SUBSCRIBED
[CONVERSATIONS] Conversa atualizada: conv-id

[REALTIME] Status: SUBSCRIBED
[REALTIME] Nova mensagem: msg-id, direction: inbound
```

## Checklist de Implementação

- [x] Edge Function webhook-receiver
- [x] RPC process_webhook_message
- [x] Hook useMessages com Realtime
- [x] Hook useConversations com Realtime
- [x] Componente Conversations com rendering
- [x] Deduplicação de mensagens
- [x] Tratamento de mídia
- [ ] **Habilitar Realtime no Supabase (PENDENTE)**
- [ ] Testar com webhook real
- [ ] Indicador de digitação
- [ ] Delivery/Read receipts
- [ ] Notificações desktop

---

**Status**: ⏳ Aguardando habilitação de Realtime no Supabase
**Próximo Passo**: Executar `supabase/migrations/enable_realtime.sql` no Dashboard
