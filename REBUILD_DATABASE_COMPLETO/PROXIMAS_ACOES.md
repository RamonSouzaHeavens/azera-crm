/**
 * =====================================================================
 * OMNICHANNEL REALTIME: PRÓXIMAS AÇÕES
 * =====================================================================
 * 
 * Documento: Roadmap de implementação com tarefas específicas
 * Localização: REBUILD_DATABASE_COMPLETO/PROXIMAS_ACOES.md
 */

# 🎯 PRÓXIMAS AÇÕES

## 📅 TIMELINE

```
HOJE (Entrega)
├─ ✅ ETAPA 1: SQL schema criado
├─ ✅ ETAPA 2: Backend abstraction criado
├─ ✅ ETAPA 3: Webhook receiver criado
├─ ✅ ETAPA 4: Send message criado
└─ 📋 ETAPA 5: Frontend (próximo)

AMANHÃ (24-48h)
├─ Deploy ETAPA 1-4
├─ Testar com webhook.site
└─ Debug issues

PRÓXIMA SEMANA (5-7 dias)
├─ ETAPA 5: Frontend hooks
├─ E2E testing
└─ Produção ready

2 SEMANAS
├─ Evolution provider
├─ Z-API provider
└─ Load testing
```

---

## ⚡ PRÓXIMO PASSO IMEDIATO: DEPLOY

### 1. Deploy SQL Schema

```bash
cd "e:\Agência\Gold Age\Azera\CRM Azera"

# 1a. Verificar status
supabase status

# 1b. Deploy migrations
supabase db push

# 1c. Verificar tabelas criadas
supabase db show messaging
```

**Esperado:**
```
✓ Tables created:
  - integrations (54 columns)
  - conversations (18 columns)
  - messages (22 columns)
  - webhook_logs (12 columns)

✓ Indices created (BRIN + compostos)
✓ RLS enabled
✓ Triggers created
```

---

### 2. Deploy Edge Functions

```bash
# 2a. Deploy webhook-receiver
supabase functions deploy webhook-receiver

# Saída: Function webhook-receiver deployed

# 2b. Deploy send-message
supabase functions deploy send-message

# Saída: Function send-message deployed

# 2c. Verificar URLs públicas
supabase functions list
```

**Esperado:**
```
webhook-receiver: https://yourproject.supabase.co/functions/v1/webhook-receiver
send-message: https://yourproject.supabase.co/functions/v1/send-message
```

---

### 3. Configurar Meta Webhooks

**Em Meta App Dashboard:**

```
1. Go to: Settings → Webhooks
2. Subscribe to webhook:
   - URL: https://yourproject.supabase.co/functions/v1/webhook-receiver
   - Events: messages, message_echoes, message_template_status_update
   - Token: Gerar um HMAC token único

3. Salvar em integrations.config:
   {
     "hmac_secret": "<TOKEN_GERADO>",
     "webhook_verify_token": "<TOKEN_GERADO>"
   }

4. Test webhook (Meta verifica com challenge)
   → Deve retornar 200 OK
```

---

## 🧪 TESTE 1: Webhook Inbound (CRÍTICO)

### Teste manual com webhook.site

```bash
# 1. Gerar URL de teste
# https://webhook.site/{unique_id}

# 2. Fazer POST com payload Meta simulado
curl -X POST "https://yourproject.supabase.co/functions/v1/webhook-receiver" \
  -H "Content-Type: application/json" \
  -H "X-Signature: $(echo -n 'payload' | openssl dgst -sha256 -hmac 'secret' | cut -d' ' -f2)" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123456789",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "phone_number_id": "123456789",
            "display_phone_number": "+5511987654321"
          },
          "messages": [{
            "from": "5511987654321",
            "id": "wamid.test_123",
            "timestamp": "1234567890",
            "type": "text",
            "text": {
              "body": "Test message from Meta"
            }
          }]
        }
      }]
    }]
  }'

# 3. Verificar resposta
# { "success": true, "messageId": "..." }

# 4. Verificar em Supabase:
# SELECT * FROM webhook_logs WHERE event_type = 'message.received'
# SELECT * FROM clientes WHERE phone = '5511987654321'
# SELECT * FROM conversations WHERE external_contact_id = '5511987654321'
# SELECT * FROM messages WHERE external_message_id = 'wamid.test_123'
```

---

## 🧪 TESTE 2: Send Message (CRÍTICO)

### Teste manual com curl

```bash
# 1. Obter JWT válido
export JWT_TOKEN=$(curl -s -X POST \
  "https://yourproject.supabase.co/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.access_token')

# 2. Chamar send-message
curl -X POST "https://yourproject.supabase.co/functions/v1/send-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "conversationId": "conv_123",
    "message": "Test message",
    "messageType": "text"
  }'

# 3. Esperado:
# {
#   "success": true,
#   "messageId": "msg_uuid...",
#   "externalMessageId": "wamid.new...",
#   "status": "sent",
#   "createdAt": "2024-01-15T10:30:00Z"
# }

# 4. Verificar em Supabase:
# SELECT * FROM messages WHERE id = 'msg_uuid...'
# SELECT * FROM conversations WHERE id = 'conv_123'
```

---

## 🎨 PRÓXIMO: ETAPA 5 FRONTEND

### 3a. Criar Hook useConversations

**Arquivo:** `src/hooks/useConversations.ts`

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useConversations() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  // 1. Fetch inicial
  useEffect(() => {
    loadConversations()
  }, [user?.tenant_id])

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('last_activity_at', { ascending: false })
      .limit(50)
    
    setConversations(data || [])
    setLoading(false)
  }

  // 2. Realtime subscription
  useEffect(() => {
    const channel = supabase.channel(`conversations:${user.tenant_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => setConversations(prev => [payload.new, ...prev])
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => setConversations(prev =>
          prev.map(c => c.id === payload.new.id ? payload.new : c)
            .sort((a, b) => new Date(b.last_activity_at) - new Date(a.last_activity_at))
        )
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.tenant_id])

  // 3. Send message
  async function sendMessage(conversationId: string, message: string) {
    const response = await fetch('/functions/v1/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.access_token}`
      },
      body: JSON.stringify({ conversationId, message })
    })

    if (!response.ok) throw new Error('Failed to send')
    return response.json()
  }

  return { conversations, loading, sendMessage, refetch: loadConversations }
}
```

---

### 3b. Modificar Conversations.tsx

**Arquivo:** `src/pages/Conversations.tsx`

```typescript
import { useConversations } from '@/hooks/useConversations'

export default function Conversations() {
  const { user } = useAuthStore()
  const { conversations, loading, sendMessage } = useConversations()

  async function handleSend(conversationId: string, text: string) {
    try {
      const result = await sendMessage(conversationId, text)
      // UI atualiza via Realtime
      toast.success('Mensagem enviada')
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex gap-4 h-full">
      {/* Conversations list */}
      <div className="w-1/3 border-r">
        {conversations.map(conv => (
          <ConversationCard
            key={conv.id}
            conversation={conv}
            onSelect={() => setSelectedId(conv.id)}
          />
        ))}
      </div>

      {/* Detail */}
      <div className="w-2/3">
        {selectedId && (
          <ConversationDetail
            conversationId={selectedId}
            onSend={handleSend}
          />
        )}
      </div>
    </div>
  )
}
```

---

## 📝 TASKS DO SPRINT

### Sprint 1: Deploy (2-4 horas)

- [ ] Deploy SQL schema
- [ ] Deploy webhook-receiver function
- [ ] Deploy send-message function
- [ ] Configure Meta webhooks
- [ ] Test webhook inbound (webhook.site)
- [ ] Test send message (curl)

### Sprint 2: Frontend (6-8 horas)

- [ ] Create useConversations hook
- [ ] Create useMessages hook
- [ ] Modify Conversations.tsx
- [ ] Implement send handler
- [ ] Test UI (manual)
- [ ] Fix bugs

### Sprint 3: Providers (4-6 horas)

- [ ] Create Evolution provider
- [ ] Create Z-API provider
- [ ] Create Baileys provider
- [ ] Test each provider

### Sprint 4: Polish (2-4 horas)

- [ ] Load testing
- [ ] Error handling
- [ ] Monitoring setup
- [ ] Documentation

---

## 🔍 TROUBLESHOOTING RÁPIDO

### Webhook não é recebido

```sql
-- Verificar integração
SELECT * FROM integrations 
WHERE channel = 'whatsapp' 
AND is_active = true;

-- Ver logs
SELECT * FROM webhook_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver function logs
supabase functions logs webhook-receiver
```

### Send message retorna erro

```bash
# Verificar JWT válido
echo $JWT_TOKEN | jq '.'

# Verificar conversation existe
SELECT * FROM conversations WHERE id = 'conv_123';

# Ver function logs
supabase functions logs send-message
```

### Realtime não atualiza

```typescript
// Debug Realtime
const channel = supabase.channel('test')
  .on('*', (payload) => console.log('Realtime:', payload))
  .subscribe()
```

---

## 📞 CONTATOS & REFERÊNCIAS

### Documentação

- `00_RESUMO_EXECUTIVO.md` - Overview
- `03_IMPLEMENTATION_GUIDE.md` - Guia completo
- `FILES_INDEX.md` - Índice de arquivos

### Suporte

- [Supabase Docs](https://supabase.com/docs)
- [Meta API Docs](https://developers.facebook.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)

### Internal

- `docs/WEBHOOKS_TUTORIAL.md` - Webhook setup
- `docs/TESTE_E2E_WEBHOOKS.md` - E2E tests

---

## ✨ CHECKLIST FINAL

Antes de considerar **PRONTO**:

- [ ] ETAPA 1-4 deployado
- [ ] Webhook inbound testado
- [ ] Send message testado
- [ ] ETAPA 5 implementada
- [ ] Frontend UI funcional
- [ ] E2E testing completo
- [ ] Produção testada
- [ ] Monitoring ativo
- [ ] Documentação atualizada
- [ ] Time treinado

---

**Status:** 🟢 PRONTO PARA DEPLOY
**Próximo:** Deploy SQL + Functions
**ETA:** 24-48h até funcional
