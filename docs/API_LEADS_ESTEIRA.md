# 🎯 API de Leads - Mover na Esteira

## 📋 Visão Geral

API que permite **criar, mover leads entre estágios da pipeline** (esteira) e atualizar dados através de requisições HTTP.

**Endpoint:** `https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads`

## 🔐 Autenticação

Todas as requisições devem incluir o header de autorização com sua chave API:

```
Authorization: Bearer SUA_CHAVE_API_AQUI
```

**Como obter sua chave API:**
1. Acesse o painel do Azera CRM
2. Vá em "API Keys" (apenas proprietários)
3. Crie uma nova chave com as permissões desejadas
4. Use a chave gerada no header `Authorization`

## 🚀 Usar no N8N

### **Criar Novo Lead**

N8N (HTTP Request node):

- Headers:
  - `Authorization`: `Bearer SUA_CHAVE_API_AQUI`
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "create",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "data": {
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "+55 11 99999-9999",
    "status": "novo"
  }
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads" -H "Authorization: Bearer SUA_CHAVE_API_AQUI" -H "Content-Type: application/json" -d '{"action":"create","tenant_id":"e2eb58ef-374a-41be-941f-78529780fa97","data":{"nome":"João Silva","email":"joao@email.com","telefone":"+55 11 99999-9999","status":"novo"}}'
```

### **Mover Lead para Outra Etapa**

N8N (HTTP Request node):

- Headers:
  - `Authorization`: `Bearer SUA_CHAVE_API_AQUI`
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "move",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "lead_id": "uuid-do-lead",
  "stage_id": "uuid-do-estágio"
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads" -H "Authorization: Bearer SUA_CHAVE_API_AQUI" -H "Content-Type: application/json" -d '{"action":"move","tenant_id":"e2eb58ef-374a-41be-941f-78529780fa97","lead_id":"uuid-do-lead","stage_id":"uuid-do-estágio"}'
```

### **Atualizar Dados do Lead**

N8N (HTTP Request node):

- Headers:
  - `Authorization`: `Bearer SUA_CHAVE_API_AQUI`
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "update",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "lead_id": "uuid-do-lead",
  "data": {
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "11999999999",
    "valor_potencial": 50000,
    "notas": "Cliente em negociação"
  }
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads" -H "Authorization: Bearer SUA_CHAVE_API_AQUI" -H "Content-Type: application/json" -d '{"action":"update","tenant_id":"e2eb58ef-374a-41be-941f-78529780fa97","lead_id":"uuid-do-lead","data":{"nome":"João Silva","email":"joao@email.com","telefone":"11999999999","valor_potencial":50000,"notas":"Cliente em negociação"}}'
```

### **Listar Todos os Leads**

N8N (HTTP Request node):

- Headers:
  - `Authorization`: `Bearer SUA_CHAVE_API_AQUI`
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "list",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97"
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads" -H "Authorization: Bearer SUA_CHAVE_API_AQUI" -H "Content-Type: application/json" -d '{"action":"list","tenant_id":"e2eb58ef-374a-41be-941f-78529780fa97"}'
```

### **Ler Dados de um Lead Específico**

N8N (HTTP Request node):

- Headers:
  - `Authorization`: `Bearer SUA_CHAVE_API_AQUI`
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "read",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "lead_id": "uuid-do-lead"
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads" -H "Authorization: Bearer SUA_CHAVE_API_AQUI" -H "Content-Type: application/json" -d '{"action":"read","tenant_id":"e2eb58ef-374a-41be-941f-78529780fa97","lead_id":"uuid-do-lead"}'
```

## 📊 Parâmetros

### **Obrigatórios**
- `action`: `"create"`, `"move"`, `"update"`, `"read"` ou `"list"`
- `tenant_id`: ID da sua equipe
- `lead_id`: ID do lead (obrigatório para `move`, `update` e `read`)

### **Para Create (action = "create")**
- `data`: Objeto com dados do novo lead

### **Para Move (action = "move")**
- `stage_id`: ID **OU** key do estágio/etapa da pipeline

**💡 Dica:** Você pode usar tanto o ID único do estágio quanto sua key. Exemplo:
- `stage_id: "abc-123-def"` (ID)
- `stage_id: "fechado"` (key)

### **Para Update (action = "update")**
- `data`: Objeto com campos a atualizar

### **Para List (action = "list")**
- Nenhum parâmetro adicional necessário

### **Para Read (action = "read")**
- Nenhum parâmetro adicional necessário além do `lead_id`

## 🎯 Campos Permitidos

### **Para Criar Lead (action = "create")**
```
- nome / name (obrigatório)
- email
- telefone / phone (obrigatório, único por tenant)
- status
- notas
- valor_potencial / valor
- origem
```

### **Para Atualizar Lead (action = "update")**
```
- nome / name
- email
- telefone / phone
- status
- notas
- valor_potencial / valor
- origem
```

## 📈 Exemplos Práticos

### **Exemplo 1: Workflow - Criar Lead do Facebook Ads**

**Node 1: HTTP Request**
```json
{
  "method": "POST",
  "url": "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads",
  "headers": {
    "Authorization": "Bearer SUA_CHAVE_API_AQUI",
    "Content-Type": "application/json"
  },
  "body": {
    "action": "create",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "data": {
      "nome": "{{ $json.name }}",
      "email": "{{ $json.email }}",
      "telefone": "{{ $json.phone }}",
      "valor_potencial": "{{ $json.value }}",
      "origem": "Facebook Ads"
    }
  }
}
```

### **Exemplo 2: Workflow - Mover para Etapa de Fechamento**

**Node 1: HTTP Request**
```json
{
  "method": "POST",
  "url": "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads",
  "headers": {
    "Authorization": "Bearer SUA_CHAVE_API_AQUI",
    "Content-Type": "application/json"
  },
  "body": {
    "action": "move",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "lead_id": "{{ $json.lead_id }}",
    "stage_id": "{{ $json.stage_id_fechamento }}"
  }
}
```

### **Exemplo 2: Atualizar Valor Potencial**

```json
{
  "method": "POST",
  "url": "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads",
  "headers": {
    "Authorization": "Bearer SUA_CHAVE_API_AQUI",
    "Content-Type": "application/json"
  },
  "body": {
    "action": "update",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "lead_id": "uuid-do-lead",
    "data": {
      "valor_potencial": 150000,
      "notas": "Valor atualizado via integração N8N"
    }
  }
}
```

### **Exemplo 3: Listar Todos os Leads**

```json
{
  "method": "POST",
  "url": "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads",
  "headers": {
    "Authorization": "Bearer SUA_CHAVE_API_AQUI",
    "Content-Type": "application/json"
  },
  "body": {
    "action": "list",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97"
  }
}
```

### **Exemplo 4: Mover para "Fechado" (usando key)**

**Node 1: HTTP Request**
```json
{
  "method": "POST",
  "url": "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads",
  "headers": {
    "Authorization": "Bearer SUA_CHAVE_API_AQUI",
    "Content-Type": "application/json"
  },
  "body": {
    "action": "move",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "lead_id": "uuid-do-lead",
    "stage_id": "fechado"
  }
}
```

**Linha única:**
```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads" -H "Authorization: Bearer SUA_CHAVE_API_AQUI" -H "Content-Type: application/json" -d '{"action":"move","tenant_id":"e2eb58ef-374a-41be-941f-78529780fa97","lead_id":"uuid-do-lead","stage_id":"fechado"}'
```

### **Exemplo 3: Mover + Atualizar (2 requisições)**

```javascript
// No N8N, use 2 nodes HTTP Request seguidos:

// Node 1: Atualizar dados
POST /api-leads
{
  "action": "update",
  "tenant_id": "...",
  "lead_id": "...",
  "data": {
    "email": "novo@email.com",
    "telefone": "11999999999"
  }
}

// Node 2: Mover para próxima etapa
POST /api-leads
{
  "action": "move",
  "tenant_id": "...",
  "lead_id": "...",
  "stage_id": "uuid-etapa-seguinte"
}
```

## 🔍 Como Obter IDs dos Estágios

### **Método 1: Via Interface (Recomendado)**
1. Acesse **Menu → Leads**
2. Alterne para modo **Kanban** 
3. Os **IDs e Keys** dos estágios aparecem abaixo do nome de cada coluna

### **Método 2: Via SQL**
```sql
-- Obter todos os estágios da sua equipe
SELECT id, key, label, color 
FROM pipeline_stages 
WHERE tenant_id = 'seu-tenant-id' 
ORDER BY "order" ASC;
```

### **Método 3: Via API**
```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads" \
  -H "Authorization: Bearer SUA_CHAVE_API_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list",
    "tenant_id": "seu-tenant-id"
  }'
```

### **Estágios Padrão (se não configurados)**
Se sua equipe não tem estágios customizados, use estas keys:
- `lead` - Lead inicial
- `negociacao` - Em negociação  
- `fechado` - Fechado/Vendido

## 📊 Parâmetros

### **Sucesso - Create (200)**
```json
{
  "success": true,
  "action": "create",
  "lead": {
    "id": "uuid-novo-lead",
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "+55 11 99999-9999",
    "status": "novo",
    "created_at": "2025-11-12T14:30:00Z"
  }
}
```

### **Sucesso - Move (200)**
```json
{
  "success": true,
  "action": "move",
  "lead": {
    "id": "uuid-do-lead",
    "nome": "João Silva",
    "status": "uuid-novo-estágio",
    "updated_at": "2025-11-12T14:30:00Z"
  }
}
```

### **Sucesso - Update (200)**
```json
{
  "success": true,
  "action": "update",
  "lead": {
    "id": "uuid-do-lead",
    "nome": "João Silva",
    "email": "joao@email.com",
    "valor_potencial": 150000,
    "updated_at": "2025-11-12T14:30:00Z"
  }
}
```

### **Erro (400)**
```json
{
  "error": "Para mover: stage_id é obrigatório"
}
```

### **Erro (404)**
```json
{
  "error": "Lead não encontrado"
}
```

### **Erro (500)**
```json
{
  "error": "Erro ao processar lead",
  "details": "Mensagem técnica"
}
```

## 🔧 Configurar no N8N

### **Passo 1: Trigger**
Use qualquer trigger (Schedule, Webhook, Email, etc)

### **Passo 2: HTTP Request - Create**
```
Method: POST
URL: https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads
Auth: None
Headers:
  Content-Type: application/json
Body:
{
  "action": "create",
  "tenant_id": "seu-tenant-id",
  "data": {
    "nome": "{{ $json.nome }}",
    "email": "{{ $json.email }}",
    "telefone": "{{ $json.telefone }}",
    "valor_potencial": "{{ $json.valor }}"
  }
}
```

### **Passo 3: HTTP Request - Move (opcional)**
```
Method: POST
URL: https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads
Auth: None
Headers:
  Content-Type: application/json
Body:
{
  "action": "move",
  "tenant_id": "seu-tenant-id",
  "lead_id": "{{ $json.lead.id }}",
  "stage_id": "uuid-etapa-inicial"
}
```

### **Passo 4: Treat Errors**
- Capture erros HTTP
- Registre em log
- Envie notificação se falhar

## 📊 Casos de Uso

### **Caso 1: Importação de Leads do Facebook/Google Ads**
```
Webhook recebe novo lead → Criar lead na API → Mover para "Novo Lead"
Quando lead se inscreve → Criar automaticamente → Classificar por origem
```

### **Caso 2: Mover Automaticamente por Critério**
```
Quando lead recebe email → Mover para "Interessado"
Quando lead faz ligação → Mover para "Contato Realizado"
Quando lead faz compra → Mover para "Fechado"
```

### **Caso 3: Sincronizar com CRM Externo**
```
HubSpot → N8N → API Leads Azera CRM
Quando deal muda de stage no HubSpot
→ N8N recebe
→ Mover lead correspondente na API
```

### **Caso 3: Relatório + Ação Automática**
```
Diariamente:
1. Buscar leads parados por 30 dias
2. Se valor < 10k → Mover para "Low Priority"
3. Se valor > 100k → Mover para "VIP"
```

### **Caso 4: Importação com Classificação**
```
Importar CSV do Excel
→ Para cada linha:
  - Criar lead (via api-leads ou N8N)
  - Movê-lo para etapa inicial
  - Atualizar valor potencial
```

## 🎯 Workflow Completo - Exemplo

**Cenário: Sincronizar com Zapier/Integromat**

```javascript
// 1. Trigger: Novo lead no Facebook Lead Ads
// Zapier recebe novo lead

// 2. N8N recebe via Webhook
// Data: { name, email, phone, value }

// 3. Criar lead
POST /api-leads
{
  "action": "create",
  "tenant_id": "...",
  "data": {
    "nome": "{{ name }}",
    "email": "{{ email }}",
    "telefone": "{{ phone }}",
    "valor_potencial": "{{ value }}",
    "origem": "Facebook Ads"
  }
}

// 4. Mover para etapa inicial
POST /api-leads
{
  "action": "move",
  "tenant_id": "...",
  "lead_id": "{{ $json.lead.id }}",
  "stage_id": "uuid-etapa-novo-lead"
}

// 5. Notificar equipe
// Email: Novo lead adicionado
```

## 🚨 Tratamento de Erros

### **Erro: Lead não encontrado**
- Verifique `lead_id` está correto
- Confirme que lead pertence ao `tenant_id`

### **Erro: Estágio não encontrado**
- Verifique `stage_id` está correto
- Confirme que estágio pertence ao `tenant_id`

### **Erro: Telefone já existe**
- Verifique se telefone já foi usado para outro lead
- Telefones devem ser únicos por tenant

### **Erro: Campos obrigatórios ausentes**
- Para criação: `nome` e `telefone` são obrigatórios
- Verifique se todos os campos obrigatórios foram enviados

### **Erro: Tenant não encontrado**
- Verifique `tenant_id` está correto
- Confirme que você tem acesso a este tenant

### **Erro: Campos não permitidos**
- Use apenas campos da lista permitida
- Outros campos são ignorados por segurança

## 📈 Performance

- **Rate Limit**: ~1000 requests/minuto
- **Timeout**: 30 segundos
- **Payload**: Máximo 1MB

## 🔐 Segurança

- ✅ Valida tenant_id
- ✅ Valida lead_id
- ✅ Valida stage_id
- ✅ Filtra apenas campos permitidos
- ✅ Registra todas as operações
- ⚠️ Sem autenticação (usar em ambiente seguro ou adicionar API key)

---

## 📚 Aprender Mais

**Para entender melhor como funcionam as requisições HTTP e cURL:**
→ Veja `docs/GUIA_REQUISICOES_HTTP.md`

Lá você encontra:
- ✅ O que é uma requisição HTTP
- ✅ Como funciona cURL
- ✅ Exemplos passo a passo
- ✅ Dicas de segurança
- ✅ Troubleshooting

## 🎯 Próximos Passos

1. ✅ Entender IDs (tenant, lead, stage)
2. ✅ Testar com cURL (create, move, update)
3. ✅ Verificar resposta (success: true)
4. ✅ Integrar com N8N
5. ✅ Criar workflow automático
6. ✅ Monitorar logs

**Sua API de Leads está completa!** 🚀