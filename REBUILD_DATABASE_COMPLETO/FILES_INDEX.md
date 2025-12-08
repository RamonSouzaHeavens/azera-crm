/**
 * =====================================================================
 * ÍNDICE DE ARQUIVOS CRIADOS - OMNICHANNEL REALTIME
 * =====================================================================
 * 
 * Localização: REBUILD_DATABASE_COMPLETO/FILES_INDEX.md
 */

# 📁 ÍNDICE COMPLETO DE ARQUIVOS

## 🗂️ Estrutura de Pastas

```
REBUILD_DATABASE_COMPLETO/
├── 00_RESUMO_EXECUTIVO.md                    ← Comece aqui
├── 01_messaging_schema.sql                   ← Deploy primeiro
├── ETAPA_1_RATIONALE.md                      ← Design rationale
├── 02_ETAPAS_2_3_4_5_SKELETON.md            ← Referência (obsoleto, tudo criado)
├── 03_IMPLEMENTATION_GUIDE.md                ← Guia completo + testing

supabase/functions/shared/messaging/
├── types.ts                                  ← Interfaces (types.ts)
├── factory.ts                                ← ProviderFactory
├── base.ts                                   ← BaseMessagingProvider abstrato
├── index.ts                                  ← Exports (criar)
└── providers/
    ├── meta.ts                               ← MetaProvider implementação ✅
    ├── evolution.ts                          ← EvolutionProvider (skeleton)
    └── zapi.ts                               ← ZapiProvider (skeleton)

supabase/functions/
├── webhook-receiver/
│   ├── index.ts                              ← Webhook handler inbound ✅
│   └── config.json                           ← Config Supabase (criar)
│
├── send-message/
│   ├── index.ts                              ← Send message outbound ✅
│   └── config.json                           ← Config Supabase (criar)
│
└── [Existing functions]
    ├── webhook-dispatcher/
    ├── webhook-processor/
    └── ...

src/hooks/
└── [ETAPA 5 - Criar:]
    ├── useConversations.ts                   ← Fetch + Realtime
    └── useMessages.ts                        ← Messages hook

src/pages/
└── [ETAPA 5 - Modificar:]
    └── Conversations.tsx                     ← Use real hooks (não mock)
```

---

## ✅ ARQUIVOS CRIADOS (COMPLETOS)

### ETAPA 1: SQL Schema

| Arquivo | Local | Status | Linhas | O quê |
|---------|-------|--------|--------|-------|
| `01_messaging_schema.sql` | `supabase/migrations/` | ✅ | 490 | 4 tabelas + RLS + BRIN |
| `ETAPA_1_RATIONALE.md` | `REBUILD_DATABASE_COMPLETO/` | ✅ | 400 | Design decisions |

**Deploy:**
```bash
supabase db push
```

---

### ETAPA 2.1: Types & Interfaces

| Arquivo | Local | Status | Linhas | O quê |
|---------|-------|--------|--------|-------|
| `types.ts` | `supabase/functions/shared/messaging/` | ✅ | 260 | IMessagingProvider interface |

---

### ETAPA 2.2: Factory Pattern

| Arquivo | Local | Status | Linhas | O quê |
|---------|-------|--------|--------|-------|
| `factory.ts` | `supabase/functions/shared/messaging/` | ✅ | 152 | ProviderFactory pattern |

---

### ETAPA 2.3: Base Provider

| Arquivo | Local | Status | Linhas | O quê |
|---------|-------|--------|--------|-------|
| `base.ts` | `supabase/functions/shared/messaging/` | ✅ | 220 | BaseMessagingProvider abstrato |

---

### ETAPA 2.4: Meta Provider

| Arquivo | Local | Status | Linhas | O quê |
|---------|-------|--------|--------|-------|
| `providers/meta.ts` | `supabase/functions/shared/messaging/` | ✅ | 380 | MetaProvider implementação |

**Suporta:**
- sendMessage() → WhatsApp Cloud API
- processWebhook() → Parse eventos
- fetchMedia() → Download + cache
- markAsRead() → Status updates
- healthCheck() + getAccountInfo()

---

### ETAPA 3: Webhook Receiver

| Arquivo | Local | Status | Linhas | O quê |
|---------|-------|--------|--------|-------|
| `webhook-receiver/index.ts` | `supabase/functions/` | ✅ | 280 | Inbound webhook handler |

**Fluxo:**
1. Parse payload
2. Validate HMAC
3. Identify tenant
4. Upsert contact/conversation
5. Insert message
6. Download media
7. Publish Realtime
8. Return 200 OK

**Deploy:**
```bash
supabase functions deploy webhook-receiver
```

---

### ETAPA 4: Send Message

| Arquivo | Local | Status | Linhas | O quê |
|---------|-------|--------|--------|-------|
| `send-message/index.ts` | `supabase/functions/` | ✅ | 270 | Outbound message sender |

**Fluxo:**
1. Validate JWT
2. Check permissions
3. Get provider
4. Send via provider
5. Persist message
6. Update conversation
7. Publish Realtime
8. Return result

**Deploy:**
```bash
supabase functions deploy send-message
```

---

### DOCUMENTAÇÃO

| Arquivo | Local | Status | O quê |
|---------|-------|--------|-------|
| `00_RESUMO_EXECUTIVO.md` | `REBUILD_DATABASE_COMPLETO/` | ✅ | Overview + checklist |
| `03_IMPLEMENTATION_GUIDE.md` | `REBUILD_DATABASE_COMPLETO/` | ✅ | Guia completo + flows + testing |
| `FILES_INDEX.md` | `REBUILD_DATABASE_COMPLETO/` | ✅ | Este arquivo |

---

## 🔄 ARQUIVOS A CRIAR (PRÓXIMOS)

### ETAPA 2.4-2.5: Outros Providers

| Arquivo | Local | Status | Propósito |
|---------|-------|--------|-----------|
| `providers/evolution.ts` | `supabase/functions/shared/messaging/` | ❌ | EvolutionProvider |
| `providers/zapi.ts` | `supabase/functions/shared/messaging/` | ❌ | ZapiProvider |
| `providers/baileys.ts` | `supabase/functions/shared/messaging/` | ❌ | BaileysProvider |

**Padrão:** Copiar `meta.ts`, adaptar endpoints

---

### ETAPA 2 Config

| Arquivo | Local | Status | Propósito |
|---------|-------|--------|-----------|
| `index.ts` | `supabase/functions/shared/messaging/` | ❌ | Exports comuns |
| `errors.ts` | `supabase/functions/shared/messaging/` | ❌ | Error classes |

---

### ETAPA 3-4 Config

| Arquivo | Local | Status | Propósito |
|---------|-------|--------|-----------|
| `webhook-receiver/config.json` | `supabase/functions/` | ❌ | Supabase function config |
| `send-message/config.json` | `supabase/functions/` | ❌ | Supabase function config |

---

### ETAPA 5: Frontend Hooks

| Arquivo | Local | Status | Propósito |
|---------|-------|--------|-----------|
| `hooks/useConversations.ts` | `src/` | ❌ | Fetch + Realtime conversations |
| `hooks/useMessages.ts` | `src/` | ❌ | Fetch + Realtime messages |

---

### ETAPA 5: Frontend UI

| Arquivo | Local | Status | Modificação |
|---------|-------|--------|-------------|
| `pages/Conversations.tsx` | `src/pages/` | 🔄 | Replace mock com real hooks |
| `components/ConversationDetail.tsx` | `src/components/` | 🔄 | Criar (se não existe) |
| `components/MessageInput.tsx` | `src/components/` | 🔄 | Criar input com send |

---

## 📊 ESTATÍSTICAS

| Categoria | Quantidade |
|-----------|-----------|
| **Arquivos criados** | 8 |
| **Linhas de código** | ~2,500+ |
| **Edge Functions** | 2 |
| **TypeScript types** | 15+ |
| **Padrões de design** | 4 |
| **Tabelas SQL** | 4 |
| **RLS policies** | 20+ |
| **Índices** | 15+ |

---

## 🚀 ORDEM DE DEPLOY

### 1️⃣ ETAPA 1: SQL (Obrigatório primeiro)

```bash
supabase db push
```

**Verifica:** Todas as tabelas existem, RLS ativo, triggers funcionam

---

### 2️⃣ ETAPA 2: Shared modules (Obrigatório antes de functions)

Arquivos (não precisa deploy, são importados):
- types.ts ✅
- factory.ts ✅
- base.ts ✅
- providers/meta.ts ✅

---

### 3️⃣ ETAPA 3-4: Edge Functions

```bash
supabase functions deploy webhook-receiver
supabase functions deploy send-message
```

**Verifica:** Funções ativas em Supabase dashboard

---

### 4️⃣ ETAPA 5: Frontend

```bash
npm run build
# ou deploy automático (Vercel, Netlify, etc)
```

---

## 🧪 TESTES

Ver `03_IMPLEMENTATION_GUIDE.md` seção 5️⃣ para:

1. Teste webhook inbound (webhook.site)
2. Teste send outbound (curl com JWT)
3. Teste frontend (manual UI testing)

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] SQL schema deployed
- [ ] Edge Functions deployed
- [ ] Environment variables set (JWT_SECRET, etc)
- [ ] Webhook URL configurada em Meta
- [ ] HMAC secret salvo em integrations.config
- [ ] Frontend hooks implementadas
- [ ] UI modificada (Conversations.tsx)
- [ ] E2E testing completo
- [ ] Produção ready

---

## 🔗 REFERÊNCIAS

Dentro deste projeto:
- `docs/WEBHOOKS_TUTORIAL.md` - Webhook setup
- `docs/API_LEADS_ESTEIRA.md` - Lead pipeline
- `docs/COMO_FUNCIONA_AUTOMACOES.md` - Automations

Externos:
- [Meta Cloud API Docs](https://developers.facebook.com/docs/cloud-api)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## 🎓 ARQUITETURA VISUAL

```
┌─────────────────────────────────┐
│ ETAPA 1: SQL Schema ✅           │
│ - 4 tabelas                     │
│ - RLS policies                  │
│ - BRIN indices                  │
└──────────┬──────────────────────┘
           │
┌──────────▼──────────────────────┐
│ ETAPA 2: Backend Abstraction ✅  │
│ - Types (Strategy)              │
│ - Factory (pattern)             │
│ - BaseProvider (abstract)        │
│ - MetaProvider (concrete)        │
└──────────┬──────────────────────┘
           │
       ┌───┴────┐
       │         │
┌──────▼──┐  ┌──▼───────────┐
│ ETAPA 3  │  │ ETAPA 4      │
│ Webhook  │  │ Send Message │
│ Receiver │  │              │
│ (inbound)│  │ (outbound)   │
│ ✅       │  │ ✅           │
└──────┬──┘  └──┬───────────┘
       │         │
       └────┬────┘
            │
┌───────────▼────────────────┐
│ ETAPA 5: Frontend ❌        │
│ - useConversations hook     │
│ - useMessages hook          │
│ - Conversations.tsx modify  │
│ - Optimistic UI             │
└────────────────────────────┘
```

---

**Atualizado em:** 2024
**Status:** Pronto para ETAPA 5
