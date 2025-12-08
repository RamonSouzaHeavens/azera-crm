# 🛡️ Relatório de Auditoria de Segurança - Azera CRM

**Data:** 30/11/2025
**Auditor:** Antigravity (Google Deepmind)
**Escopo:** Código Fonte Completo (Frontend, Backend, Database Schema)

---

## 🚨 VULNERABILIDADES CRÍTICAS (CORRIGIR IMEDIATAMENTE)

### 1. Quebra de Isolamento de Tenant via Funções RPC (IDOR / Multi-tenant Breach)
**Gravidade:** **CRÍTICO ABSOLUTO**
**Local:** `supabase/migrations/20251114000000_universal_produtos_migration.sql` (Linhas 131 e 179)

**Descrição:**
As funções `get_produto_with_custom_fields` e `search_produtos_with_custom_filters` são definidas como `SECURITY DEFINER`. Isso significa que elas rodam com privilégios de **Superusuário** (bypassing RLS).
A função `search_produtos_with_custom_filters` aceita `p_tenant_id` como parâmetro e confia nele cegamente.
Um usuário malicioso pode chamar essa função via console do navegador passando o ID de **OUTRO TENANT** e receber todos os produtos dele.

**Prova de Conceito (Console do Navegador):**
```javascript
// O atacante descobre o UUID de um concorrente e roda:
await supabase.rpc('search_produtos_with_custom_filters', {
  p_tenant_id: 'UUID-DO-CONCORRENTE-AQUI'
})
// Retorno: Lista completa de produtos do concorrente.
```

**Correção Recomendada:**
Remova o parâmetro `p_tenant_id` e force o uso do tenant do usuário logado dentro da função.

```sql
-- CORREÇÃO:
CREATE OR REPLACE FUNCTION search_produtos_with_custom_filters(...)
SECURITY DEFINER
AS $$
DECLARE
  v_user_tenant_id UUID;
BEGIN
  -- Verificar tenant do usuário logado
  SELECT tenant_id INTO v_user_tenant_id
  FROM memberships
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1;

  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT ...
  FROM produtos p
  WHERE p.tenant_id = v_user_tenant_id -- Força o tenant do usuário
  ...
END;
$$;
```

---

### 2. Tabelas Core Sem RLS (Vazamento Total de Dados)
**Gravidade:** **ALTA**
**Local:** Schema do Banco de Dados (`TabelasDoSupabase.txt`)

**Descrição:**
O arquivo de definição do banco lista políticas RLS para tabelas auxiliares (`pipeline_stages`, `webhook_logs`), mas **NÃO LISTA** políticas para as tabelas mais críticas:
- `produtos`
- `clientes` (Leads)
- `vendas`
- `tarefas`

Se o RLS não estiver explicitamente ativado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) e com políticas `CREATE POLICY` definidas, **qualquer usuário logado pode baixar o banco inteiro** usando o cliente Supabase JS.

**Como Verificar:**
Rode no SQL Editor do Supabase:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('produtos', 'clientes', 'vendas');
```
Se `rowsecurity` for `false`, você está exposto.

**Correção:**
```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation" ON clientes
USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid()));
```

---

### 3. Webhook Facebook/WhatsApp Sem Verificação de Assinatura
**Gravidade:** **ALTA**
**Local:** `azera-api/src/app/api/webhooks/facebook/route.ts`

**Descrição:**
O endpoint aceita qualquer POST request sem validar se veio realmente do Facebook/Meta.
Um atacante pode enviar eventos falsos de "Mensagem Recebida" ou "Lead Criado", poluindo seu banco de dados, disparando automações indevidas ou causando Negação de Serviço (DoS).

**Código Problemático:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json(); // Aceita tudo sem validar
  // ... processa evento
}
```

**Correção:**
Implementar validação do `X-Hub-Signature-256`.

```typescript
import { createHmac } from 'crypto';

// ... dentro do POST
const signature = req.headers.get('x-hub-signature-256');
const bodyText = await req.text();
const hash = createHmac('sha256', process.env.FB_APP_SECRET)
  .update(bodyText)
  .digest('hex');

if (`sha256=${hash}` !== signature) {
  return new Response('Forbidden', { status: 403 });
}
```

---

## ⚠️ VULNERABILIDADES MÉDIAS E BOAS PRÁTICAS

### 4. Risco de DoS na Listagem de Leads
**Gravidade:** **MÉDIA**
**Local:** `src/pages/Leads.tsx`

**Descrição:**
A função `loadLeads` baixa todos os registros de uma vez. Um cliente com 10.000 leads vai travar o navegador e sobrecarregar o banco.
Isso não é um vazamento de dados, mas é uma falha de disponibilidade (Availability do CIA Triad).

**Correção:**
Implementar paginação no backend (`.range(0, 50)`) e Infinite Scroll no frontend.

### 5. Exposição de Stack Traces em Produção
**Gravidade:** **BAIXA**
**Local:** `src/pages/Subscribe.tsx` (Linhas 60-70)

**Descrição:**
O código faz log detalhado de erros no console (`console.error`). Em produção, evite logar objetos de erro completos que podem conter detalhes da infraestrutura ou dados sensíveis retornados pelo backend.

---

## ✅ PONTOS POSITIVOS (O que está seguro)
1. **Autenticação:** O uso do Supabase Auth (`authStore.ts`) está correto, gerenciando sessões e refresh tokens automaticamente.
2. **Segredos no Frontend:** O arquivo `src/lib/supabase.ts` usa corretamente `VITE_SUPABASE_ANON_KEY`, que é seguro para exposição pública (desde que o RLS esteja configurado).
3. **Prevenção XSS:** Não foram encontradas chamadas perigosas a `dangerouslySetInnerHTML` com input de usuário (apenas em comentários ou strings estáticas).

---

## 🏁 CONCLUSÃO
O sistema tem uma base sólida (Supabase Auth), mas falha gravemente na **Autorização (RLS e RPCs)**.
A falha #1 (RPC Security Definer) permite que um usuário acesse dados de outro tenant, o que é fatal para um SaaS Multi-tenant.

**Prioridade de Correção:**
1. Corrigir as funções RPC (`search_produtos...`).
2. Verificar e ativar RLS em `produtos`, `clientes`, `vendas`.
3. Implementar validação de assinatura no Webhook.
