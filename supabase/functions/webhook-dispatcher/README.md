# Webhook Dispatcher - Edge Function

Edge Function responsável por processar e entregar webhooks para integrações externas (N8N, Zapier, etc).

## Funcionamento

1. **Busca eventos pendentes** na tabela `webhook_events`
2. **Identifica subscriptions ativas** que estão escutando o tipo de evento
3. **Cria deliveries** e envia POST para URLs registradas
4. **Assina payloads** com HMAC-SHA256 para segurança
5. **Implementa retry** com backoff exponencial (1m, 5m, 15m, 1h, 6h, 24h)
6. **Marca como dead-letter** após 6 tentativas falhadas

## Variáveis de Ambiente

Configurar no Supabase Dashboard → Project Settings → Edge Functions:

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service role key)
```

## Deploy

```bash
# Deploy da função
supabase functions deploy webhook-dispatcher

# Configurar secret (se necessário)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Invocação

### Manual (para teste)
```bash
curl -X POST 'https://seu-projeto.supabase.co/functions/v1/webhook-dispatcher' \
  -H "Authorization: Bearer ANON_KEY"
```

### Agendada (recomendado)
Configurar cron job no Supabase ou usar serviço externo (cron-job.org, GitHub Actions) para invocar a cada 1-5 minutos:

```yaml
# .github/workflows/webhook-dispatcher.yml
name: Webhook Dispatcher
on:
  schedule:
    - cron: '*/5 * * * *' # A cada 5 minutos
jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger webhook dispatcher
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/functions/v1/webhook-dispatcher' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

## Logs

Acompanhar logs no Supabase Dashboard → Edge Functions → webhook-dispatcher → Logs

## Monitoramento

Queries úteis para monitorar entregas:

```sql
-- Deliveries com falha nas últimas 24h
SELECT 
  wd.id,
  wd.event_id,
  ws.name as subscription_name,
  ws.url,
  wd.attempt_count,
  wd.last_error,
  wd.last_attempted_at
FROM webhook_deliveries wd
JOIN webhook_subscriptions ws ON ws.id = wd.subscription_id
WHERE wd.status IN ('failure', 'dead')
  AND wd.last_attempted_at > NOW() - INTERVAL '24 hours'
ORDER BY wd.last_attempted_at DESC;

-- Taxa de sucesso por subscription
SELECT 
  ws.name,
  COUNT(*) FILTER (WHERE wd.status = 'success') as successful,
  COUNT(*) FILTER (WHERE wd.status IN ('failure', 'dead')) as failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE wd.status = 'success') / NULLIF(COUNT(*), 0),
    2
  ) as success_rate
FROM webhook_subscriptions ws
LEFT JOIN webhook_deliveries wd ON wd.subscription_id = ws.id
WHERE wd.created_at > NOW() - INTERVAL '7 days'
GROUP BY ws.id, ws.name
ORDER BY success_rate DESC;
```

## Segurança

- Usa `SERVICE_ROLE_KEY` para bypass RLS (necessário para ler todos os eventos)
- Nunca expor SERVICE_ROLE_KEY no frontend
- Headers HMAC-SHA256 permitem verificação de autenticidade pelo receptor
- Timeout de 30s por request
- Rate limit natural pelo agendamento (5min interval)
