# 📖 Runbook Operacional — Azera CRM v1

**Status**: Produção com 100–500 usuários  
**Data**: 15 Nov 2025  
**Autor**: Equipe de Ops

---

## 🎯 Checklist Diário

- [ ] Acessar Supabase Dashboard → Edge Functions → `webhook-dispatcher` → Logs
- [ ] Verificar últimas 24h: Nenhum erro crítico?
- [ ] Verificar `webhook_deliveries`: Tem muitos `dead`?
- [ ] Se sim, investigar e reprocessar

---

## 🚨 Erros Comuns

### ❌ "Webhook delivery stuck in pending"

**Solução**:
1. Verificar se dispatcher está rodando (cron job)
2. Se não, manualmente:
   ```sql
   SELECT id, status, next_retry_at FROM webhook_deliveries
   WHERE status = 'pending' AND next_retry_at < NOW()
   LIMIT 10;
   ```
3. Acione manualmente via **Automações → Logs → "Reprocessar Agora"**

### ❌ "Webhook returns 500 error"

**Checklist**:
1. URL do webhook está online?
   ```bash
   curl -X POST "sua-url-aqui" -d '{"test": true}'
   ```
2. Servidor aceita HMAC validation?
3. Retry automático vai processar em 1-24h (depende da tentativa)

### ❌ "Secret webhook não funciona"

**Solução**:
1. Ir em **Automações** → Selecionar automação
2. Copiar o campo `webhook_secret`
3. Usar em `X-Webhook-Secret` header

### ❌ "Muitos webhooks falhando"

**Investigação**:
```sql
-- Ver taxa de sucesso por subscription
SELECT
  ws.name,
  COUNT(*) FILTER (WHERE wd.status = 'success') as successful,
  COUNT(*) FILTER (WHERE wd.status IN ('pending', 'dead')) as failed,
  ROUND(100 * COUNT(*) FILTER (WHERE wd.status = 'success') / COUNT(*), 2) as success_rate
FROM webhook_subscriptions ws
LEFT JOIN webhook_deliveries wd ON wd.subscription_id = ws.id
WHERE wd.created_at > NOW() - INTERVAL '24 hours'
GROUP BY ws.id, ws.name
ORDER BY success_rate ASC;
```

Se < 90% sucesso:
1. Verificar status code dos erros (4xx vs 5xx)
2. Alertar cliente para revisar seu servidor
3. Considerar desativar subscription temporariamente

---

## 🔧 Tarefas Operacionais

### Regenerar Webhook Secret

Se um secret foi comprometido:

```sql
-- 1. Gerar novo secret (32 chars random)
-- 2. Atualizar automação
UPDATE automacoes
SET webhook_secret = 'novo_secret_aleatorio_32_chars'
WHERE id = 'automacao_id_aqui';

-- 3. Notificar cliente
-- 4. Testar novo secret
```

### Reprocessar Todos os Webhooks Dead

```sql
-- 1. Ver quantos dead
SELECT COUNT(*) FROM webhook_deliveries WHERE status = 'dead';

-- 2. Marcar para retry
UPDATE webhook_deliveries
SET status = 'pending', next_retry_at = NOW(), attempt_count = 0
WHERE status = 'dead';

-- 3. Acionar dispatcher
-- (via Automações → "Reprocessar Agora")
```

### Limpar Logs Antigos (>90 dias)

```sql
DELETE FROM webhook_deliveries
WHERE created_at < NOW() - INTERVAL '90 days'
  AND status = 'success';
```

---

## 📊 Métricas SLA

| Métrica | Target | Alerta |
|---------|--------|--------|
| Taxa Sucesso (24h) | > 98% | < 95% |
| Latência P95 | < 2s | > 5s |
| Dead Letters (24h) | < 1% | > 5% |
| Uptime Dispatcher | > 99.5% | Falha |

---

## 🔍 Troubleshooting Avançado

### "Edge Function webhook-dispatcher deu erro"

1. Acessar **Supabase Dashboard** → **Edge Functions** → `webhook-dispatcher` → **Logs**
2. Ver último erro
3. Possíveis causas:
   - SERVICE_ROLE_KEY expirada? (unlikely, mas verificar)
   - Banco está fora? (conectar e testar)
   - RLS bloqueando? (verificar policies)

### "RLS bloqueando leitura de webhooks"

1. Verificar se policy existe:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'webhook_subscriptions';
   ```
2. Se não, executar `FIX_WEBHOOK_RLS.sql` (no repo)
3. Testar acesso:
   ```sql
   SELECT * FROM webhook_subscriptions LIMIT 1; -- Como usuário autenticado
   ```

### Performance degradado

1. Verificar tamanho de `webhook_deliveries`:
   ```sql
   SELECT pg_size_pretty(pg_total_relation_size('webhook_deliveries'));
   ```
2. Se > 500MB, considerar archive/delete antigos
3. Verificar índices:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'webhook_deliveries';
   ```

---

## 📞 Escalação

| Cenário | Ação |
|---------|------|
| Taxa sucesso < 90% por 1h | Verificar servidor do cliente |
| Dispatcher não rodou por 1h | Reiniciar cron job ou edge function |
| RLS error | Executar auditoria RLS + reapplicar policies |
| Database connection fail | Contatar Supabase support |

---

## ✅ Checklist Deployment v1.0

- [ ] RLS configurado em todas as tabelas (`FIX_WEBHOOK_RLS.sql` executado)
- [ ] Nenhuma senha hardcoded (removido `admintaco1234`)
- [ ] Edge function `trigger-dispatcher` deployada
- [ ] Teste E2E com webhook.site passado
- [ ] Teste de carga 50 eventos OK
- [ ] Métricas SLA confirmadas
- [ ] Runbook entregue ao time de ops
- [ ] Documentação atualizada no app

---

## 🚀 Pronto para Produção

Quando todos os itens acima estiverem ✅, o sistema está pronto para:
- 100–500 usuários
- ~50–500 webhooks/dia
- SLA 98%+ uptime
