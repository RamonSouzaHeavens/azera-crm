# 🎯 API de Tarefas - Mover na Esteira

## 📋 Visão Geral

API que permite **criar, mover tarefas entre estágios da pipeline** (esteira) e atualizar dados através de requisições HTTP.

**Endpoint:** `https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-tarefas`

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

### **Criar Nova Tarefa**

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
    "titulo": "Implementar nova funcionalidade",
    "descricao": "Descrição detalhada da tarefa",
    "prioridade": "alta",
    "cliente_id": "uuid-do-cliente",
    "responsavel_id": "uuid-do-usuario"
  }
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-tarefas" \
  -H "Authorization: Bearer SUA_CHAVE_API_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "data": {
      "titulo": "Implementar nova funcionalidade",
      "descricao": "Descrição detalhada da tarefa",
      "prioridade": "alta"
    }
  }'
```

### **Mover Tarefa para Estágio Específico**

N8N (HTTP Request node):

- Headers:
  - `Authorization`: `Bearer SUA_CHAVE_API_AQUI`
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "move",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "task_id": "uuid-da-tarefa",
  "stage_id": "uuid-do-estagio-ou-key"
}
```

**Como encontrar o `stage_id`:**
- Use o ID do estágio (ex: `550e8400-e29b-41d4-a716-446655440000`)
- OU use a key do estágio (ex: `em_andamento`, `concluida`)

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-tarefas" \
  -H "Authorization: Bearer SUA_CHAVE_API_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "task_id": "uuid-da-tarefa",
    "stage_id": "concluida"
  }'
```

### **Listar Todas as Tarefas**

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
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-tarefas" \
  -H "Authorization: Bearer SUA_CHAVE_API_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97"
  }'
```

### **Ler Dados de uma Tarefa Específica**

N8N (HTTP Request node):

- Headers:
  - `Authorization`: `Bearer SUA_CHAVE_API_AQUI`
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "read",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "task_id": "uuid-da-tarefa"
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-tarefas" \
  -H "Authorization: Bearer SUA_CHAVE_API_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "read",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "task_id": "uuid-da-tarefa"
  }'
```

### **Atualizar Dados de uma Tarefa**

N8N (HTTP Request node):

- Headers:
  - `Authorization`: `Bearer SUA_CHAVE_API_AQUI`
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "update",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "task_id": "uuid-da-tarefa",
  "data": {
    "titulo": "Novo título atualizado",
    "prioridade": "urgente",
    "data_vencimento": "2025-12-31T23:59:59Z"
  }
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-tarefas" \
  -H "Authorization: Bearer SUA_CHAVE_API_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "task_id": "uuid-da-tarefa",
    "data": {
      "titulo": "Novo título atualizado",
      "prioridade": "urgente"
    }
  }'
```

## 📊 Campos Disponíveis

### Campos de Tarefa
- `titulo` (string, obrigatório para criação)
- `descricao` (string)
- `status` (string - ID do estágio)
- `prioridade` (string: "baixa", "media", "alta", "urgente")
- `cliente_id` (string UUID)
- `produto_id` (string UUID)
- `responsavel_id` (string UUID)
- `equipe_id` (string UUID)
- `data_vencimento` (string ISO 8601)
- `tempo_gasto_minutos` (number)
- `estimativa_minutos` (number)
- `checklist` (array de objetos)

### Relacionamentos Incluídos
- `cliente`: `{id, nome}`
- `produto`: `{id, nome}`
- `responsavel`: `{display_name}`
- `equipe`: `{id, nome}`

## 🎯 Estágios da Pipeline

Os estágios são dinâmicos e podem ser configurados no painel do CRM. Cada estágio tem:

- **ID**: UUID único do estágio
- **Key**: Identificador único (ex: "pendente", "em_andamento")
- **Label**: Nome exibido (ex: "Pendente", "Em Progresso")
- **Color**: Cor do estágio em hexadecimal

Para mover tarefas, use o `stage_id` com o ID do estágio ou sua key.

## ⚠️ Considerações Importantes

1. **Tenant Isolation**: Todas as operações são isoladas por tenant
2. **Permissões**: Verifique se sua chave API tem permissões `tasks.read` e `tasks.write`
3. **Validação**: O sistema valida se o estágio existe antes de mover
4. **Relacionamentos**: IDs de cliente, produto, responsável e equipe devem existir
5. **Datas**: Use formato ISO 8601 para datas

## 🔍 Exemplos de Fluxos no N8N

### **Fluxo: Nova Tarefa → Mover para "Em Andamento"**

1. **HTTP Request** (Criar tarefa)
2. **HTTP Request** (Mover para "em_andamento")

### **Fluxo: Verificar Tarefas Vencidas**

1. **HTTP Request** (Listar tarefas)
2. **Filter** (tarefas com data_vencimento < hoje)
3. **Send Email** (notificar responsável)

### **Fluxo: Atualizar Status Baseado em Condições**

1. **HTTP Request** (Ler tarefa específica)
2. **Switch** (baseado em algum critério)
3. **HTTP Request** (Mover para estágio apropriado)