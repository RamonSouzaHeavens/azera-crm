/**
 * =====================================================================
 * OMNICHANNEL REALTIME: GUIA DE IMPLEMENTAÇÃO E TESTING
 * =====================================================================
 * 
 * Status: ETAPAS 1-4 IMPLEMENTADAS | ETAPA 5 EM PROGRESSO
 * Última atualização: 2024
 * 
 * Localização: REBUILD_DATABASE_COMPLETO/03_IMPLEMENTATION_GUIDE.md
 */

# 🚀 GUIA DE IMPLEMENTAÇÃO OMNICHANNEL REALTIME

## 1️⃣ ARQUITETURA GERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + TS)                      │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Conversations.tsx (UI)          useConversations (Hook)      ││
│ │ ┌──────────────────┐            ┌───────────────────────┐   ││
│ │ │ UI render        │            │ fetch + Realtime subs │   ││
│ │ │ [send button]    │◄────────────│ [conversações]        │   ││
│ │ └──────────────────┘            │ [mensagens]           │   ││
│ │         ▲                        └───────────────────────┘   ││
│ │         │                                   ▲                ││
│ │         └─────────────────────────────────────────────┘    ││
│ └──────────────────────────────────────────────────────────────┘
│                           │ HTTPS
│                           ▼
├─────────────────────────────────────────────────────────────────┤
│                  SUPABASE EDGE FUNCTIONS (Deno)                 │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │ send-message     │    │ webhook-receiver │                  │
│  │ [ETAPA 4]        │    │ [ETAPA 3]        │                  │
│  │                  │    │                  │                  │
│  │ 1. Validar JWT   │    │ 1. Parse payload │                  │
│  │ 2. Check perms   │    │ 2. Validate HMAC │                  │
│  │ 3. Get provider  │    │ 3. Get provider  │                  │
│  │ 4. Send          │    │ 4. upsert data   │                  │
│  │ 5. Persist       │    │ 5. Download      │                  │
│  │ 6. Realtime      │    │ 6. Realtime pub  │                  │
│  └──────────────────┘    └──────────────────┘                  │
│         ▲                         ▲                             │
│         │ (chamada frontend)      │ (webhook de provedor)      │
├─────────────────────────────────────────────────────────────────┤
│                    SUPABASE CORE                                 │
│ ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│ │ PostgreSQL       │  │ Realtime     │  │ Storage (Mídia)  │  │
│ │ [tabelas]        │  │ [Websockets] │  │ [Durável]        │  │
│ │                  │  │              │  │                  │  │
│ │ conversations    │  │ postgres_    │  │ /tenant_id/media │  │
│ │ messages         │  │ changes      │  │                  │  │
│ │ integrations     │  │ broadcast    │  │ (URLs não        │  │
│ │ clientes         │  │              │  │  expiram)        │  │
│ │ webhook_logs     │  │              │  │                  │  │
│ └──────────────────┘  └──────────────┘  └──────────────────┘  │
│         ▲                                        ▲              │
├─────────────────────────────────────────────────────────────────┤
│                 MESSAGING PROVIDERS                             │
│                                                                  │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│ │ Meta         │  │ Evolution    │  │ Z-API        │           │
│ │ WhatsApp API │  │ Gateway      │  │ Gateway      │           │
│ │ v18.0        │  │              │  │              │           │
│ └──────────────┘  └──────────────┘  └──────────────┘           │
│         ▲                ▲                    ▲                 │
└─────────────────────────────────────────────────────────────────┘
          │                │                    │
          └────────────────┴────────────────────┘
           Webhooks, API calls, Media download
```

## 2️⃣ FLUXO DE MENSAGEM INBOUND (ETAPA 3)

```
Meta Webhook
    │
    ▼
POST /webhook-receiver
    │
    ├─ Parse payload
    ├─ Validate HMAC (segurança)
    ├─ Identify tenant by external_id
    │
    ├─ Buscar integration (credentials, provider)
    │
    ├─ ProviderFactory.create(tenantId, channel)
    │  └─ Retorna MetaProvider instance
    │
    ├─ provider.processWebhook(payload)
    │  └─ Extrai: externalMessageId, contactId, messageContent, mediaUrl
    │
    ├─ Upsert clientes (contact)
    ├─ Upsert conversations
    ├─ Insert messages
    │
    ├─ Se media:
    │  └─ provider.fetchMedia(mediaUrl)
    │     └─ Download + cache no Storage
    │     └─ Update message.media_url (URL permanente)
    │
    ├─ Log webhook_logs (auditoria)
    │
    ├─ Publish Realtime
    │  ├─ channel(`messages:${conversationId}`)
    │  │  └─ Evento: message.received
    │  │
    │  └─ channel(`conversations:${tenantId}`)
    │     └─ Evento: conversation.updated
    │
    ▼
Return 200 OK (mesmo que erro)
    └─ Previne retry infinito do provedor
```

## 3️⃣ FLUXO DE MENSAGEM OUTBOUND (ETAPA 4)

```
Frontend (Conversations.tsx)
    │
    ├─ User digita + clica "Enviar"
    │
    ├─ Otimista: render localmente com status='queued'
    │
    ▼
POST /send-message
    │
    ├─ Parse { conversationId, message, messageType }
    │
    ├─ Validar JWT (Authorization header)
    │
    ├─ Buscar conversation
    │  └─ Verificar user tem acesso ao tenant
    │
    ├─ Buscar integration ativa
    │  └─ channel, provider, credentials
    │
    ├─ ProviderFactory.create(tenantId, channel)
    │
    ├─ provider.sendMessage({
    │    tenantId, conversationId,
    │    externalContactId, message, messageType
    │  })
    │  └─ Chama Meta API: POST /phone_number_id/messages
    │     └─ Retorna: externalMessageId, status='sent'
    │
    ├─ Se 200 OK:
    │  │
    │  ├─ Insert message (status='sent')
    │  │
    │  ├─ Update conversation
    │  │  └─ last_message_content, last_activity_at
    │  │
    │  ├─ Publish Realtime
    │  │  └─ { messageId, externalMessageId, status='sent' }
    │  │
    │  └─ Return { success, messageId, externalMessageId }
    │
    └─ Se erro:
       └─ Return { success=false, error }
          └─ Frontend remove otimista, mostra erro

Frontend recebe 200 OK
    │
    └─ Atualiza otimista de status='queued' para 'sent'
```

## 4️⃣ IMPLEMENTAÇÃO CHECKLIST

### ETAPA 1: SQL Schema ✅
- [x] Tabelas: integrations, conversations, messages, webhook_logs
- [x] RLS policies (isolação por tenant)
- [x] Indices BRIN para performance
- [x] Triggers (updated_at)
- [x] RPC functions

**Arquivo:** `supabase/migrations/01_messaging_schema.sql`
**Deploy:** Via dashboard Supabase ou `supabase db push`

### ETAPA 2: Backend Abstraction ✅
- [x] types.ts - Interfaces (IMessagingProvider, payloads)
- [x] factory.ts - ProviderFactory.create()
- [x] base.ts - BaseMessagingProvider (classe abstrata)
- [x] providers/meta.ts - MetaProvider (WhatsApp)
- [ ] providers/evolution.ts - EvolutionProvider
- [ ] providers/zapi.ts - ZapiProvider

**Padrão:** Strategy/Factory Pattern
**Arquivos:** `supabase/functions/shared/messaging/*`

### ETAPA 3: Webhook Receiver ✅
- [x] POST /webhook-receiver
- [x] HMAC validation
- [x] Tenant identification
- [x] Upsert contact/conversation
- [x] Insert message
- [x] Media download
- [x] Realtime publish
- [x] Error handling (200 OK sempre)

**Arquivo:** `supabase/functions/webhook-receiver/index.ts`
**Deploy:** `supabase functions deploy webhook-receiver`

### ETAPA 4: Send Message ✅
- [x] POST /send-message
- [x] JWT validation
- [x] Permission check
- [x] Get provider
- [x] Send via provider
- [x] Persist message
- [x] Realtime publish
- [x] Error handling

**Arquivo:** `supabase/functions/send-message/index.ts`
**Deploy:** `supabase functions deploy send-message`

### ETAPA 5: Frontend Realtime ❌
- [ ] Hook useConversations
  - [ ] Initial fetch (paginated)
  - [ ] Realtime subscription (messages + conversations)
  - [ ] Optimistic UI (queued → sent → delivered)
  - [ ] Media preview
  
- [ ] Hook useMessages
  - [ ] Fetch messages por conversation
  - [ ] Realtime updates
  - [ ] Mark as read
  
- [ ] Modify Conversations.tsx
  - [ ] Replace mockConversas com useConversations()
  - [ ] Replace mockMessages com useMessages()
  - [ ] Implement send handler
  - [ ] Add loading/error states
  
- [ ] Modify ConversationDetail (se tiver)
  - [ ] Render messages com timestamp
  - [ ] Media preview (imagem, vídeo, etc)
  - [ ] Input area com send

**Padrão:** Custom React hooks com Supabase client
**Localização:** `src/hooks/useConversations.ts`, `src/hooks/useMessages.ts`

## 5️⃣ TESTING CHECKLIST

### ETAPA 3: Webhook-Receiver

```bash
# 1. Configurar webhook.site
# Gerar URL: https://webhook.site/{unique_id}

# 2. Testar Meta webhook localmente
curl -X POST http://localhost:54321/functions/v1/webhook-receiver \
  -H "Content-Type: application/json" \
  -H "X-Signature: <HMAC_HASH>" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "phone_number_id": "123456789"
          },
          "messages": [{
            "from": "5511987654321",
            "id": "wamid.test_123",
            "timestamp": "1234567890",
            "type": "text",
            "text": {
              "body": "Hello from test"
            }
          }]
        }
      }]
    }]
  }'

# 3. Verificar no Supabase:
# - webhook_logs deve ter novo entry
# - clientes deve ter novo contact
# - conversations deve ter nova conversa
# - messages deve ter nova mensagem
```

### ETAPA 4: Send-Message

```bash
# 1. Obter JWT válido
curl -X POST ${SUPABASE_URL}/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password",
    "grant_type": "password"
  }' | jq '.access_token'

# 2. Chamar send-message
curl -X POST http://localhost:54321/functions/v1/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "conversationId": "conv_123",
    "message": "Test message",
    "messageType": "text"
  }'

# 3. Verificar resposta:
# { "success": true, "messageId": "...", "externalMessageId": "..." }

# 4. Verificar no Supabase:
# - messages deve ter novo entry com status='sent'
# - conversation deve ter last_message_content atualizado
```

### ETAPA 5: Frontend Realtime

```tsx
// Em Conversations.tsx
import { useConversations } from '@/hooks/useConversations'

export default function Conversations() {
  const { conversations, loading, sendMessage } = useConversations(tenantId)

  const handleSend = async (conversationId: string, text: string) => {
    // UI otimista: mostrar mensagem imediatamente
    try {
      await sendMessage(conversationId, text)
      // Status muda de 'queued' para 'sent' via Realtime
    } catch (error) {
      // Remover mensagem otimista
      toast.error(error.message)
    }
  }

  return (
    <div>
      {conversations.map(conv => (
        <ConversationCard
          key={conv.id}
          conversation={conv}
          onSend={handleSend}
        />
      ))}
    </div>
  )
}
```

## 6️⃣ DEPLOYMENT

### Dev → Staging

```bash
# 1. Testar localmente
supabase start
supabase functions serve

# 2. Deploy migrations
supabase db push

# 3. Deploy edge functions
supabase functions deploy webhook-receiver
supabase functions deploy send-message

# 4. Set environment variables
supabase secrets set \
  JWT_SECRET="$(openssl rand -base64 32)" \
  OPENAI_API_KEY="..."
```

### Staging → Production

```bash
# 1. Criar backup de produção
supabase db dump --linked > backup_prod.sql

# 2. Execute migrations em prod
supabase db push --linked

# 3. Deploy functions em prod
supabase functions deploy webhook-receiver --linked
supabase functions deploy send-message --linked

# 4. Atualizar webhook URLs em Meta
# De: staging.yourapp.com
# Para: yourapp.com
```

## 7️⃣ MONITORAMENTO

### Logs

```sql
-- Ver webhooks recebidos
SELECT * FROM webhook_logs
WHERE tenant_id = 'YOUR_TENANT'
ORDER BY created_at DESC
LIMIT 50;

-- Ver mensagens com erros
SELECT * FROM messages
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Ver conversas inativas
SELECT * FROM conversations
WHERE last_activity_at < NOW() - INTERVAL '24 hours'
ORDER BY last_activity_at DESC;
```

### Alertas (TODO)

- [ ] Webhook não processado em 5 min
- [ ] Taxa de erro > 5%
- [ ] Media download failures
- [ ] Integration credential expired

## 8️⃣ TROUBLESHOOTING

### Webhook não recebido

```
Checklist:
1. Verificar URL pública da função (não localhost)
2. Verificar webhook token em Meta é correto
3. Verificar que external_id está sendo identificado
4. Ver logs: supabase functions logs webhook-receiver
5. Testar com curl + X-Signature header
```

### Mensagem não aparece no frontend

```
Checklist:
1. Verificar que message foi inserida no DB
2. Verificar que Realtime subscription está ativa
3. Verificar que tenant_id match
4. Ver browser console para erros
5. Verificar que RLS não está bloqueando select
```

### HMAC signature inválido

```
Checklist:
1. Verificar hmac_secret em integrations.config
2. Verificar que algorithm é SHA-256
3. Verificar que body não foi modificado
4. Ver código em webhook-receiver (linha ~150)
```

## 9️⃣ PRÓXIMAS FEATURES

- [ ] Suporte para Evolution API (providers/evolution.ts)
- [ ] Suporte para Z-API (providers/zapi.ts)
- [ ] Message reactions/emojis
- [ ] Group conversations
- [ ] Media streaming (ao invés de download)
- [ ] Message search full-text
- [ ] Bot responses com OpenAI
- [ ] Integração com automações N8N

---

**Status Final:** Pronto para ETAPA 5 (Frontend Realtime)
**Próximo passo:** Criar `useConversations` hook + modificar UI
