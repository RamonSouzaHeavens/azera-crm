# Documentação de Integração: Vendas (API)

Esta documentação explica como gerenciar lançamentos financeiros (vendas) no Azera CRM via automações externas (n8n, Make, Zapier, etc) através da API REST do Supabase.

---

## Configuração Comum

**Base URL:** `https://[SEU_PROJETO].supabase.co/rest/v1/lead_sales`

**Headers obrigatórios em todas as requisições:**
```
apikey: [SUA_CHAVE_ANON_OU_SERVICE]
Authorization: Bearer [SUA_CHAVE_ANON_OU_SERVICE]
Content-Type: application/json
```

---

## 1. Listar Vendas de um Lead

**Método:** `GET`

**URL com filtro:**
```
https://[PROJETO].supabase.co/rest/v1/lead_sales?lead_id=eq.[LEAD_ID]&order=due_date.asc
```

**Exemplo de resposta:**
```json
[
  {
    "id": "a1b2c3d4-...",
    "tenant_id": "...",
    "lead_id": "...",
    "title": "Mensalidade 1/12",
    "value": 100.00,
    "due_date": "2024-02-01T10:00:00Z",
    "status": "paid",
    "recurrence_id": "uuid-xyz"
  }
]
```

---

## 2. Criar uma Venda Única

**Método:** `POST`

**Header adicional (opcional):**
```
Prefer: return=representation
```

**Body (JSON):**
```json
{
  "tenant_id": "b18f67...",
  "lead_id": "c56a12...",
  "title": "Consultoria Inicial",
  "value": 500.00,
  "due_date": "2024-01-20T14:00:00Z",
  "status": "paid"
}
```

**Status aceitos:**
- `pending` - Pendente (padrão)
- `paid` - Pago
- `overdue` - Vencido
- `canceled` - Cancelado

---

## 3. Criar Venda Recorrente (Parcelada)

Para criar várias parcelas de uma vez, envie um **Array** de objetos JSON.

**Dica:** Gere um UUID único no seu n8n/Make e coloque no campo `recurrence_id` de todas as parcelas para agrupá-las.

**Body (JSON - Exemplo 3 parcelas):**
```json
[
  {
    "tenant_id": "...",
    "lead_id": "...",
    "title": "Mensalidade 1/3",
    "value": 300.00,
    "due_date": "2024-02-01T10:00:00Z",
    "status": "paid",
    "recurrence_id": "uuid-compartilhado-xyz"
  },
  {
    "tenant_id": "...",
    "lead_id": "...",
    "title": "Mensalidade 2/3",
    "value": 300.00,
    "due_date": "2024-03-01T10:00:00Z",
    "status": "pending",
    "recurrence_id": "uuid-compartilhado-xyz"
  },
  {
    "tenant_id": "...",
    "lead_id": "...",
    "title": "Mensalidade 3/3",
    "value": 300.00,
    "due_date": "2024-04-01T10:00:00Z",
    "status": "pending",
    "recurrence_id": "uuid-compartilhado-xyz"
  }
]
```

---

## 4. Atualizar uma Venda (Marcar como Pago, etc)

**Método:** `PATCH`

**URL com filtro pelo ID da venda:**
```
https://[PROJETO].supabase.co/rest/v1/lead_sales?id=eq.[ID_DA_VENDA]
```

**Body (JSON - campos a atualizar):**
```json
{
  "status": "paid"
}
```

**Outros campos que podem ser atualizados:**
```json
{
  "title": "Novo título",
  "value": 550.00,
  "due_date": "2024-02-15T10:00:00Z",
  "status": "canceled"
}
```

---

## 5. Deletar uma Venda

**Método:** `DELETE`

**URL com filtro pelo ID:**
```
https://[PROJETO].supabase.co/rest/v1/lead_sales?id=eq.[ID_DA_VENDA]
```

**Resposta:** HTTP 204 No Content (sucesso)

---

## 6. Deletar todas as parcelas de uma recorrência

Para deletar todas as parcelas de uma venda recorrente de uma vez:

**Método:** `DELETE`

**URL com filtro pelo recurrence_id:**
```
https://[PROJETO].supabase.co/rest/v1/lead_sales?recurrence_id=eq.[RECURRENCE_ID]
```

---

## Referência de Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Auto | ID único da venda (gerado automaticamente). |
| `tenant_id` | UUID | Sim | ID da sua conta/empresa no CRM. |
| `lead_id` | UUID | Sim | ID do cliente (lead) que comprou. |
| `title` | Texto | Sim | Nome da venda (visível no extrato). |
| `value` | Número | Sim | Valor monetário (ex: 150.50). |
| `due_date` | Data (ISO) | Sim | Data do pagamento ou vencimento. |
| `status` | Texto | Não | `pending`, `paid`, `overdue`, `canceled`. Padrão: pending. |
| `recurrence_id` | UUID | Não | Opcional. Use para agrupar parcelas de uma mesma compra. |
| `product_id` | UUID | Não | Opcional. Linkará com produtos no futuro. |
| `created_at` | Data | Auto | Data de criação do registro. |
| `updated_at` | Data | Auto | Data da última atualização. |

---

## Exemplo de Fluxo n8n

### Cenário: Quando o lead fecha, criar 12 parcelas

1. **Trigger:** Webhook recebe dados do lead fechado.
2. **Code Node:** Gera array de 12 objetos com `recurrence_id` igual.
3. **HTTP Request Node:**
   - Method: POST
   - URL: `https://[projeto].supabase.co/rest/v1/lead_sales`
   - Headers: apikey + Authorization
   - Body: Array de parcelas

### Cenário: Marcar parcela como paga via webhook do gateway

1. **Trigger:** Webhook do Stripe/PagSeguro com `sale_id`.
2. **HTTP Request Node:**
   - Method: PATCH
   - URL: `https://[projeto].supabase.co/rest/v1/lead_sales?id=eq.{{ $json.sale_id }}`
   - Body: `{ "status": "paid" }`

---

## Notas de Segurança

- As políticas de RLS (Row Level Security) garantem que cada usuário só acessa vendas do seu próprio tenant.
- Para integrações externas (n8n, Make), use a **Service Role Key** do Supabase para bypass de RLS, ou garanta que a requisição contenha o `tenant_id` correto.
- Nunca exponha sua Service Role Key em código frontend.
