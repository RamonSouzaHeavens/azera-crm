# 🔒 RLS Audit Report — Azera CRM

**Data**: 15 Nov 2025  
**Status**: ⚠️ CRÍTICO — Webhook tables sem RLS

---

## 📋 Checklist de RLS

### ✅ TABELAS COM RLS CORRETO

- `tenants` — Users veem só se member ativo
- `profiles` — Users veem só seu próprio perfil
- `memberships` — Users veem via função `can_view_membership()`
- `clientes` — Isolado por tenant_id
- `produtos` — Isolado por tenant_id
- `campanhas` — Isolado por tenant_id
- `equipes` — Isolado por tenant_id
- `lead_origins` — Isolado por tenant_id
- `lead_loss_reasons` — Isolado por tenant_id
- `lead_timeline` — Isolado por tenant_id
- `lead_attachments` — Isolado via lead_id
- `lead_tasks` — Isolado via lead_id
- `lead_custom_fields` — Isolado por tenant_id
- `lead_custom_field_values` — Isolado via lead_id
- `subscriptions` — Users veem só seus próprios
- `automacoes` — Verificar se tem RLS (assumir não tem)
- `automacao_logs` — Verificar se tem RLS (assumir não tem)
- `tarefas` — Verificar se tem RLS (assumir não tem)
- `api_keys` — Verificar se tem RLS (assumir não tem)

### ❌ TABELAS SEM RLS (CRÍTICO)

- `webhook_subscriptions` — **NENHUMA POLICY** ← Qualquer user vê tudo
- `webhook_events` — **NENHUMA POLICY** ← Qualquer user lê eventos de outro tenant
- `webhook_deliveries` — **NENHUMA POLICY** ← Qualquer user lê/atualiza logs de outro tenant

---

## 🚨 Risco de Segurança

Se RLS não estiver ativo:

```
Usuário A (tenant_xyz)
  ├─ Pode ler webhooks da Empresa B (tenant_abc) ← VAZAMENTO
  ├─ Pode criar/atualizar eventos de outro tenant ← CONTAMINAÇÃO
  └─ Pode atualizar status de deliveries alheias ← SABOTAGEM
```

---

## ✅ SQL PARA CORRIGIR (Próximas telas)

```sql
-- Habilitar RLS nas tabelas de webhook
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- POLICY: webhook_subscriptions
DROP POLICY IF EXISTS "Users can view their tenant webhooks" ON webhook_subscriptions;
CREATE POLICY "Users can view their tenant webhooks" ON webhook_subscriptions
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

DROP POLICY IF EXISTS "Users can create webhooks in their tenant" ON webhook_subscriptions
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can update their tenant webhooks" ON webhook_subscriptions
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true AND role IN ('owner', 'admin')
    )
  );

-- POLICY: webhook_events
DROP POLICY IF EXISTS "Users can view their tenant events" ON webhook_events;
CREATE POLICY "Users can view their tenant events" ON webhook_events
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- POLICY: webhook_deliveries
DROP POLICY IF EXISTS "Users can view deliveries from their subscriptions" ON webhook_deliveries;
CREATE POLICY "Users can view deliveries from their subscriptions" ON webhook_deliveries
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM webhook_subscriptions
      WHERE tenant_id IN (
        SELECT tenant_id FROM memberships
        WHERE user_id = auth.uid() AND active = true
      )
    )
  );

DROP POLICY IF EXISTS "Service role can update deliveries" ON webhook_deliveries
  FOR UPDATE WITH CHECK (
    auth.role() = 'service_role' -- Somente dispatcher (Edge Function com service_role)
  );
```

---

## 🎯 Pendências Verificar

- [ ] `tarefas` — tem RLS?
- [ ] `automacoes` — tem RLS?
- [ ] `automacao_logs` — tem RLS?
- [ ] `api_keys` — tem UPDATE policy? (evitar que um user mude secret de outro)
- [ ] `team_members` — verificar se user pode atualizar role de outro

---

## 📌 Próximo Passo

Execute o SQL acima no Supabase Dashboard → SQL Editor, depois retorne aqui.
