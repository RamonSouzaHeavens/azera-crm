# 🪝 Tutorial Webhooks – Azera CRM

## Resumo Executivo

Webhooks permitem que o Azera **envie dados automaticamente** para seus sistemas externos quando certos eventos ocorrem (novo lead, produto criado, etc). Isso elimina o trabalho manual de sincronização.

Exemplo prático:
- Um novo lead é criado no Azera
- Webhook dispara automaticamente
- Dados são enviados para seu CRM/sistema externo (N8N, Zapier, Make, etc)
- Seu sistema processa e integra sem intervenção

---

## 1️⃣ Como Criar uma Subscription (Webhook)

### Passo a Passo

1. **Acesse a página de Webhooks**
   - Abra o Azera CRM
   - Vá em **Automações** → clique em **Gerenciar Webhooks**

2. **Preencha o formulário "Adicionar Webhook"**
   - **Nome**: Dê um nome descritivo (ex: "Sync com N8N", "Integração Zapier")
   - **URL**: Cole a URL de recebimento (seu webhook receiver)
   - **Eventos**: Liste os eventos que deseja receber (separados por vírgula)

   ```
   Exemplo:
   Nome: Lead para N8N
   URL: https://webhook.site/sua-chave-unica
   Eventos: lead.created, lead.updated
   ```

3. **Clique em "Criar webhook"**
   - O sistema vai criar a subscription e gerar um `secret` automaticamente
   - Este secret é usado para validação de segurança

### Eventos Disponíveis

Os seguintes eventos podem ser monitorados:

- `lead.created` – Novo lead adicionado
- `lead.updated` – Lead atualizado
- `produto.created` – Novo produto/imóvel
- `produto.updated` – Produto atualizado
- `tarefa.created` – Nova tarefa
- `tarefa.completed` – Tarefa concluída
- (Mais eventos podem ser adicionados conforme necessário)

---

## 2️⃣ Testar com Webhook.site

### O que é Webhook.site?

[Webhook.site](https://webhook.site) é uma ferramenta **gratuita** que gera uma URL única para receber e visualizar webhooks em tempo real. Perfeita para testes.

### Como Usar

1. **Gere uma URL única**
   - Abra https://webhook.site
   - Copie a URL exibida na página (ex: `https://webhook.site/abc123def456`)

2. **Crie uma subscription apontando para essa URL**
   - Nome: "Teste Webhook.site"
   - URL: `https://webhook.site/sua-url-copiada`
   - Eventos: `lead.created`

3. **Dispare um evento no Azera**
   - Crie um novo lead
   - Vá para a aba **Eventos** na página de Webhooks
   - Você deve ver o evento listado

4. **Veja a entrega na aba Logs**
   - Clique em **Logs**
   - Selecione a subscription "Teste Webhook.site"
   - Você verá o registro da tentativa de envio

5. **Retorne ao Webhook.site**
   - Você deve ver o payload recebido em tempo real
   - Exemplo:

   ```json
   {
     "event_id": "evt_123456",
     "tenant_id": "tenant_xyz",
     "event_type": "lead.created",
     "occurred_at": "2025-11-15T10:30:00Z",
     "data": {
       "id": "lead_001",
       "nome": "João Silva",
       "email": "joao@example.com",
       "telefone": "11999999999"
     },
     "meta": {
       "source": "azera-crm-v1",
       "attempt": 1
     }
   }
   ```

---

## 3️⃣ Visualizar Eventos

A aba **Eventos** mostra todos os eventos disparados no seu tenant, independente de subscription.

### Como Ver

1. Clique em **Eventos** (na página de Webhooks)
2. Veja uma lista com:
   - **Tipo de evento** (ex: `lead.created`)
   - **Data/Hora** de quando ocorreu
   - **Payload** (dados do evento) em JSON

### Usar para Troubleshooting

Se uma subscription não está recebendo dados:
1. Verifique se o evento aparece em **Eventos**
2. Se sim, o problema está na URL ou na entrega
3. Se não, o evento não foi disparado

---

## 4️⃣ Ver Logs e Reenviar

A aba **Logs** mostra o histórico de tentativas de entrega para cada subscription.

### Como Ver Logs

1. Vá em **Logs** (na página de Webhooks)
2. Selecione uma subscription no painel da esquerda
3. Você verá:
   - **Status**: `success`, `pending`, ou `dead`
   - **Tentativas**: Quantas vezes tentou enviar
   - **Código HTTP**: Resposta do servidor
   - **Erro**: Mensagem de erro (se houver)
   - **Timestamp**: Quando foi tentado

### Status Explicado

| Status | Significado |
|--------|------------|
| `success` | Entregue com sucesso (2xx) |
| `pending` | Aguardando retry (próxima tentativa agendada) |
| `dead` | Falha permanente (6+ tentativas, sem mais retries) |

### Reenviar Manualmente

Se uma entrega falhou e você quer tentar de novo:

1. Abra **Logs**
2. Encontre o log que falhou
3. Clique no botão **Reenviar**
4. Sistema vai:
   - Marcar como `pending`
   - Agendar retry imediato
   - Disparar no próximo ciclo do dispatcher

---

## 5️⃣ Como o Dispatcher Funciona (Backend)

### Arquitetura

O Azera usa um **Webhook Dispatcher** (Edge Function no Supabase) que:

1. **Processa eventos pendentes** a cada 5 minutos
2. **Identifica subscriptions ativas** para cada evento
3. **Envia para cada URL** com assinatura HMAC-SHA256
4. **Implementa retry automático** com backoff exponencial
5. **Registra tudo em logs** para auditoria

### Fluxo Completo

```
1. Evento disparado (ex: lead.created)
   └─> Registrado em `webhook_events` (status: pending)

2. Dispatcher processa (a cada 5min)
   └─> Busca eventos pending
   └─> Encontra subscriptions ativas
   └─> Cria registro em `webhook_deliveries`

3. Para cada delivery
   └─> Gera assinatura HMAC
   └─> Faz POST com payload
   └─> Registra resultado (sucesso/erro)

4. Se erro
   └─> Agenda retry (1m, 5m, 15m, 1h, 6h, 24h)
   └─> Após 6 tentativas = dead letter
```

### Retry Automático

Se o primeiro envio falhar, o sistema tenta novamente em:

- **1ª falha** → Próxima tentativa em 1 minuto
- **2ª falha** → Próxima em 5 minutos
- **3ª falha** → Próxima em 15 minutos
- **4ª falha** → Próxima em 1 hora
- **5ª falha** → Próxima em 6 horas
- **6ª falha** → Próxima em 24 horas
- **Após 6 tentativas** → Webhook marcado como `dead`

### Segurança – Validação HMAC

Cada webhook inclui um header de assinatura:

```
X-Azera-Signature: sha256=abcd1234...
X-Azera-Idempotency-Key: evt_123456
X-Azera-Event: lead.created
```

**Como validar no seu servidor:**

```javascript
// Node.js
const crypto = require('crypto');

const secret = process.env.WEBHOOK_SECRET; // Guardar com segurança
const payload = req.body;
const signature = req.headers['x-azera-signature'].split('=')[1];

const hmac = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

if (hmac !== signature) {
  return res.status(401).json({ erro: 'Signature inválida' });
}

// Processar webhook com segurança
console.log('Webhook autêntico recebido');
res.json({ sucesso: true });
```

```python
# Python / Flask
import hmac
import hashlib
import json

secret = os.getenv('WEBHOOK_SECRET')
payload = request.get_json()
signature = request.headers.get('X-Azera-Signature', '').split('=')[1]

hmac_digest = hmac.new(
  secret.encode(),
  json.dumps(payload).encode(),
  hashlib.sha256
).hexdigest()

if hmac_digest != signature:
  return {'erro': 'Signature inválida'}, 401

# Processar webhook
return {'sucesso': True}, 200
```

---

## 6️⃣ Troubleshooting

### Problema: Webhook não está recebendo dados

**Checklist:**

1. ✅ O evento aparece em **Eventos**?
   - Não → Evento não foi disparado (criar lead/produto/tarefa)
   - Sim → Ir para próximo

2. ✅ A subscription está **ativa**?
   - Verificar em Logs que subscription está selecionada

3. ✅ A URL está correta?
   - Testar com curl:
   ```bash
   curl -X POST "sua-url-aqui" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

4. ✅ Seu servidor está retornando 2xx?
   - Em **Logs**, código HTTP deve ser 200-299
   - Se 4xx ou 5xx, mensagem de erro aparecerá

5. ✅ Firewall / CORS bloqueando?
   - Azera server envia requisições HTTP POST
   - Sua URL deve estar acessível da internet pública

### Problema: Logs mostram `status: dead`

Significa: Falhou 6 vezes. Opções:

1. **Reenviar manualmente** (botão em cada log)
2. **Usar status `pending`** e deixar o dispatcher tentar novamente
3. **Corrigir o problema** (servidor fora, URL errada) e reenviar

### Problema: Muitos `pending`

Se há muitos logs em `pending`:

1. **Verificar configuração do dispatcher** (verificar logs no Supabase)
2. **Aguardar próximo ciclo** (dispatcher roda a cada 5 minutos)
3. **Testar manualmente** com curl se a URL responde

---

## 7️⃣ Melhores Práticas

### 1. Sempre Validar Signature

Nunca confie em um webhook sem validar a assinatura HMAC. Qualquer um poderia fazer POST para sua URL.

### 2. Implementar Idempotência

Use o `X-Azera-Idempotency-Key` para garantir que o mesmo evento não seja processado 2x:

```javascript
// Guardar em banco de dados / cache
if (cache.get(req.headers['x-azera-idempotency-key'])) {
  return res.json({ duplicado: true }); // Já processado
}

// Processar...
cache.set(req.headers['x-azera-idempotency-key'], true, 24 * 3600);
```

### 3. Responder Rápido (< 30s)

Se sua lógica demora muito, **fila para fundo** e responda `200` imediatamente:

```javascript
res.json({ recebido: true }); // Responder logo

// Processar em background
setTimeout(() => {
  procesarWebhook(payload);
}, 0);
```

### 4. Log Everything

Guarde logs de **todos** os webhooks recebidos para auditoria:

```javascript
logger.info('Webhook recebido', {
  event_type: payload.event_type,
  event_id: payload.event_id,
  timestamp: new Date().toISOString(),
  status_code: 200,
});
```

### 5. Testar com Ferramenta Apropriada

Para produção, use ferramentas reais:

- **N8N**: Integração visual
- **Zapier**: No-code automation
- **Make**: Workflow automation
- **Servidor próprio**: Express, Flask, etc

---

## 8️⃣ Exemplos Completos

### Exemplo 1: Node.js com Express

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

app.post('/webhook', (req, res) => {
  // 1. Validar assinatura
  const signature = req.headers['x-azera-signature']?.split('=')[1];
  const hmac = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hmac !== signature) {
    return res.status(401).json({ erro: 'Unauthorized' });
  }

  // 2. Verificar idempotência
  const key = req.headers['x-azera-idempotency-key'];
  if (processedKeys.has(key)) {
    return res.json({ duplicado: true });
  }
  processedKeys.add(key);

  // 3. Processar evento
  const { event_type, data } = req.body;
  console.log(`Processando ${event_type}:`, data);

  // Guardar no banco de dados, enviar email, etc
  if (event_type === 'lead.created') {
    console.log(`Novo lead: ${data.nome}`);
    // Integrar com seu sistema aqui
  }

  // 4. Responder rapidinho
  res.json({ sucesso: true });
});

app.listen(3000, () => console.log('Webhook servidor rodando em :3000'));
```

### Exemplo 2: Python com Flask

```python
from flask import Flask, request
import hmac
import hashlib
import json
import os

app = Flask(__name__)
WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET')

@app.route('/webhook', methods=['POST'])
def webhook():
    # 1. Validar assinatura
    signature = request.headers.get('X-Azera-Signature', '').split('=')[1]
    hmac_digest = hmac.new(
        WEBHOOK_SECRET.encode(),
        request.get_data(),
        hashlib.sha256
    ).hexdigest()

    if hmac_digest != signature:
        return {'erro': 'Unauthorized'}, 401

    # 2. Processar evento
    payload = request.get_json()
    event_type = payload.get('event_type')
    data = payload.get('data')

    print(f'Processando {event_type}: {data}')

    if event_type == 'lead.created':
        print(f"Novo lead: {data['nome']}")
        # Integrar com seu sistema aqui

    return {'sucesso': True}, 200

if __name__ == '__main__':
    app.run(debug=True, port=3000)
```

---

## 9️⃣ Monitoramento em Produção

### Query SQL – Deliveries Falhadas (24h)

Acesse **Supabase Dashboard** → **SQL Editor** e rode:

```sql
SELECT 
  wd.id,
  wd.event_id,
  ws.name as subscription_name,
  ws.url,
  wd.attempt_count,
  wd.last_error,
  wd.last_attempted_at,
  wd.status
FROM webhook_deliveries wd
JOIN webhook_subscriptions ws ON ws.id = wd.subscription_id
WHERE wd.status IN ('pending', 'dead')
  AND wd.last_attempted_at > NOW() - INTERVAL '24 hours'
ORDER BY wd.last_attempted_at DESC;
```

### Query SQL – Taxa de Sucesso

```sql
SELECT 
  ws.name,
  COUNT(*) FILTER (WHERE wd.status = 'success') as successful,
  COUNT(*) FILTER (WHERE wd.status IN ('pending', 'dead')) as failed,
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

---

## 🔟 Dúvidas Comuns

**P: Quanto tempo leva para um webhook ser enviado após o evento?**
R: Geralmente 1-5 minutos. O dispatcher processa eventos a cada 5 minutos.

**P: Posso testar webhook sem colocar em produção?**
R: Sim! Use `webhook.site` para testes. Em produção, use seu servidor real.

**P: Qual é o payload máximo?**
R: Atualmente ~10KB. Dados muito grandes podem ser truncados.

**P: Posso desativar um webhook temporariamente?**
R: Sim, basta não criar mais subscriptions. Para deletar, entre em contato com suporte.

**P: Posso receber webhooks de múltiplos eventos em uma mesma URL?**
R: Sim! Crie eventos como `lead.created, lead.updated` e o campo `event_type` dirá qual foi.

---

## 📞 Suporte

Dúvidas? Acesse:
- **Documentação**: `/documentacao` (dentro do CRM)
- **Logs**: Veja **Supabase Edge Functions** logs
- **Exemplos**: Veja a seção 8️⃣ acima

Enjoy your webhooks! 🚀
