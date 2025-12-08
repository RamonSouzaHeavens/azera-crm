# Webhooks API - Azera CRM

Sistema de webhooks para integração com automações externas (N8N, Zapier, Make, etc).

## 📋 Visão Geral

O Azera CRM envia notificações HTTP (webhooks) para URLs registradas quando eventos importantes ocorrem no sistema. Isso permite:

- ✅ Automatizar workflows com N8N
- ✅ Sincronizar dados com outros sistemas
- ✅ Disparar ações em ferramentas externas
- ✅ Criar integrações personalizadas

## 🔐 Autenticação

Cada webhook é assinado com **HMAC-SHA256** usando um secret único por subscription. Você deve verificar a assinatura para garantir que o webhook veio do Azera CRM.

### Verificar Assinatura

```javascript
// Node.js / N8N
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Uso
const signature = request.headers['x-azera-signature'];
const payload = request.body;
const secret = 'seu-secret-da-subscription';

if (!verifyWebhookSignature(payload, signature, secret)) {
  return response.status(401).send('Invalid signature');
}
```

```python
# Python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected_signature = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)
```

## 📨 Formato do Webhook

### Headers

Todos os webhooks incluem os seguintes headers:

```
Content-Type: application/json
X-Azera-Event: lead.created
X-Azera-Delivery-Id: 550e8400-e29b-41d4-a716-446655440000
X-Azera-Idempotency-Key: 123e4567-e89b-12d3-a456-426614174000
X-Azera-Signature: sha256=abc123...
User-Agent: Azera-Webhook/1.0
```

| Header | Descrição |
|--------|-----------|
| `X-Azera-Event` | Tipo do evento (ex: `lead.created`) |
| `X-Azera-Delivery-Id` | ID único desta tentativa de entrega |
| `X-Azera-Idempotency-Key` | ID do evento (use para deduplicação) |
| `X-Azera-Signature` | Assinatura HMAC-SHA256 do payload |

### Payload

```json
{
  "event_id": "123e4567-e89b-12d3-a456-426614174000",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "lead.created",
  "occurred_at": "2025-11-11T15:30:00Z",
  "data": {
    // Dados específicos do evento (veja abaixo)
  },
  "meta": {
    "source": "azera-crm-v1",
    "attempt": 1
  }
}
```

## 📋 Eventos Disponíveis

### Lead Events

#### `lead.created`
Disparado quando um novo lead é criado.

```json
{
  "event_type": "lead.created",
  "data": {
    "lead_id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999",
    "source": "website",
    "status": "novo",
    "utm_source": "google",
    "utm_campaign": "campanha-x",
    "created_at": "2025-11-11T15:30:00Z"
  }
}
```

#### `lead.updated`
Disparado quando um lead é atualizado.

```json
{
  "event_type": "lead.updated",
  "data": {
    "lead_id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "status": "qualificado",
    "previous_status": "novo",
    "updated_fields": ["status", "phone"],
    "updated_at": "2025-11-11T16:00:00Z"
  }
}
```

#### `lead.status_changed`
Disparado quando o status de um lead muda.

```json
{
  "event_type": "lead.status_changed",
  "data": {
    "lead_id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "old_status": "novo",
    "new_status": "qualificado",
    "changed_by": "user-uuid",
    "changed_at": "2025-11-11T16:00:00Z"
  }
}
```

### Task Events

#### `task.created`
Disparado quando uma nova tarefa é criada.

```json
{
  "event_type": "task.created",
  "data": {
    "task_id": "uuid",
    "title": "Ligar para cliente",
    "description": "Fazer follow-up",
    "assigned_to": "user-uuid",
    "assigned_to_name": "Maria Costa",
    "due_date": "2025-11-15T10:00:00Z",
    "priority": "high",
    "status": "pendente",
    "created_at": "2025-11-11T15:30:00Z"
  }
}
```

#### `task.completed`
Disparado quando uma tarefa é marcada como concluída.

```json
{
  "event_type": "task.completed",
  "data": {
    "task_id": "uuid",
    "title": "Ligar para cliente",
    "assigned_to": "user-uuid",
    "completed_by": "user-uuid",
    "completed_at": "2025-11-11T16:30:00Z"
  }
}
```

### Sale Events

#### `sale.created`
Disparado quando uma nova venda é registrada.

```json
{
  "event_type": "sale.created",
  "data": {
    "sale_id": "uuid",
    "lead_id": "uuid",
    "lead_name": "João Silva",
    "product_id": "uuid",
    "product_name": "Apartamento Jardins",
    "amount": 450000.00,
    "currency": "BRL",
    "status": "pendente",
    "seller_id": "user-uuid",
    "seller_name": "Maria Costa",
    "created_at": "2025-11-11T17:00:00Z"
  }
}
```

#### `sale.completed`
Disparado quando uma venda é finalizada.

```json
{
  "event_type": "sale.completed",
  "data": {
    "sale_id": "uuid",
    "lead_id": "uuid",
    "amount": 450000.00,
    "completed_at": "2025-11-15T10:00:00Z"
  }
}
```

### Team Events

#### `team.member_joined`
Disparado quando um novo membro entra na equipe.

```json
{
  "event_type": "team.member_joined",
  "data": {
    "member_id": "user-uuid",
    "name": "Pedro Santos",
    "email": "pedro@example.com",
    "role": "vendedor",
    "joined_at": "2025-11-11T15:30:00Z"
  }
}
```

#### `team.member_left`
Disparado quando um membro sai da equipe.

```json
{
  "event_type": "team.member_left",
  "data": {
    "member_id": "user-uuid",
    "name": "Pedro Santos",
    "email": "pedro@example.com",
    "left_at": "2025-11-11T18:00:00Z"
  }
}
```

### File Events

#### `file.uploaded`
Disparado quando um arquivo é enviado.

```json
{
  "event_type": "file.uploaded",
  "data": {
    "file_id": "uuid",
    "file_name": "contrato.pdf",
    "file_size": 204800,
    "file_type": "application/pdf",
    "uploaded_by": "user-uuid",
    "entity_type": "lead",
    "entity_id": "lead-uuid",
    "uploaded_at": "2025-11-11T15:30:00Z"
  }
}
```

## 🔄 Retry e Idempotência

### Política de Retry

Se o endpoint retornar erro (não 2xx), o Azera CRM tentará reenviar automaticamente:

- **Tentativa 1**: Imediato
- **Tentativa 2**: 1 minuto depois
- **Tentativa 3**: 5 minutos depois
- **Tentativa 4**: 15 minutos depois
- **Tentativa 5**: 1 hora depois
- **Tentativa 6**: 6 horas depois
- **Após 6 tentativas**: Dead letter (não reenvia mais)

### Idempotência

Use o header `X-Azera-Idempotency-Key` (event_id) para evitar processar o mesmo evento múltiplas vezes:

```javascript
// N8N Function node
const eventId = $input.item.headers['x-azera-idempotency-key'];

// Verificar se já processou este evento
const processed = await checkIfProcessed(eventId);
if (processed) {
  return { skipped: true };
}

// Processar evento
await processEvent($input.item.json);

// Marcar como processado
await markAsProcessed(eventId);
```

## 🚀 Exemplo: N8N Workflow

### 1. Criar Webhook Node

1. No N8N, adicione um **Webhook** node
2. Configure:
   - **HTTP Method**: POST
   - **Path**: `/azera/webhooks`
   - **Authentication**: None (usaremos verificação HMAC)

### 2. Verificar Assinatura

Adicione um **Function** node:

```javascript
// Verificar assinatura HMAC
const crypto = require('crypto');

const payload = JSON.stringify($input.item.json);
const signature = $input.item.headers['x-azera-signature'];
const secret = 'SEU_SECRET_AQUI'; // Obter das configurações

const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid signature');
}

return $input.item;
```

### 3. Processar Evento

Adicione um **Switch** node para rotear por tipo de evento:

```javascript
// Routing
const eventType = $json.event_type;

switch(eventType) {
  case 'lead.created':
    return [{ json: $json, route: 0 }]; // Output 1
  case 'sale.completed':
    return [{ json: $json, route: 1 }]; // Output 2
  default:
    return [{ json: $json, route: 2 }]; // Output 3 (outros)
}
```

### 4. Template Completo N8N

```json
{
  "name": "Azera CRM Webhooks",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "azera-webhooks",
        "responseMode": "responseNode"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "// Verificar HMAC\nconst crypto = require('crypto');\nconst payload = JSON.stringify($input.item.json);\nconst signature = $input.item.headers['x-azera-signature'];\nconst secret = 'SEU_SECRET';\n\nconst expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');\n\nif (signature !== expected) {\n  throw new Error('Invalid signature');\n}\n\nreturn $input.item;"
      },
      "name": "Verify Signature",
      "type": "n8n-nodes-base.function",
      "position": [450, 300]
    },
    {
      "parameters": {
        "mode": "jsonata",
        "jsonataExpression": "event_type"
      },
      "name": "Route by Event",
      "type": "n8n-nodes-base.switch",
      "position": [650, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "{\"received\": true}"
      },
      "name": "Respond",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [850, 300]
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Verify Signature" }]] },
    "Verify Signature": { "main": [[{ "node": "Route by Event" }]] },
    "Route by Event": { "main": [[{ "node": "Respond" }]] }
  }
}
```

## ⚙️ Configuração no Azera CRM

### 1. Acessar Configurações

Vá em **Configurações** → **Webhooks** (apenas para owners)

### 2. Criar Subscription

- **Nome**: Ex: "N8N Production"
- **URL**: Endpoint do seu N8N (ex: `https://n8n.example.com/webhook/azera-webhooks`)
- **Eventos**: Selecione os eventos que deseja receber
- **Secret**: Será gerado automaticamente (use para verificar HMAC)

### 3. Testar

Use o botão "Testar Webhook" para enviar um evento de teste.

## 📊 Monitoramento

Na página de Webhooks você pode:

- ✅ Ver histórico de entregas
- ✅ Reenviar webhooks que falharam
- ✅ Verificar logs de erro
- ✅ Desabilitar/habilitar subscriptions
- ✅ Rotacionar secret

## 🛡️ Segurança

### Best Practices

1. **Sempre valide a assinatura HMAC**
2. **Use HTTPS** para receber webhooks
3. **Implemente idempotência** com o Idempotency-Key
4. **Rotacione secrets periodicamente**
5. **Monitore falhas** e configure alertas
6. **Responda rapidamente** (< 5s) para evitar timeouts
7. **Use IPs fixos** se possível (para whitelist)

### Rate Limits

- Máximo de **10 subscriptions** por tenant
- Máximo de **1000 eventos** por hora por tenant
- Timeout de **30 segundos** por webhook
- Máximo de **6 tentativas** de retry

## 🆘 Troubleshooting

### Webhook não está sendo recebido

1. Verifique se a subscription está **ativa**
2. Confirme que o evento está na lista de **eventos habilitados**
3. Teste a URL manualmente com curl:
   ```bash
   curl -X POST https://seu-endpoint.com/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```
4. Verifique logs no Azera CRM → Webhooks → Histórico

### Erro de assinatura inválida

- Confirme que está usando o **secret correto**
- Verifique se está calculando HMAC do **body JSON** (não parseado)
- Use `JSON.stringify()` antes de calcular HMAC

### Timeouts

- Responda **rapidamente** (< 5s idealmente)
- Processe payloads de forma **assíncrona** se precisar de mais tempo
- Responda com 200 OK imediatamente e processe depois

## 📞 Suporte

Dúvidas? Entre em contato:

- **Documentação**: https://docs.azera.com.br
- **Email**: suporte@azera.com.br
- **Discord**: https://discord.gg/azera
