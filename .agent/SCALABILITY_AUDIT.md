# Auditoria de Escalabilidade e Performance - Azera CRM

## 🚨 Risco Crítico Identificado: Processamento no Frontend
O dashboard atual baixa **todos** os registros de clientes e vendas para calcular estatísticas no navegador do usuário.
- **Impacto**: Com 5.000+ registros, o navegador travará.
- **Consumo de Dados**: Baixa megabytes de dados desnecessários, estourando cotas do Supabase e plano de dados móveis do usuário.

## ✅ Solução Implementada (Código)
Refatoramos o `Dashboard.tsx` para usar agregações nativas (`count`) e buscar apenas dados estritamente necessários.

## ⚠️ Ação Necessária (Banco de Dados)
Para atingir performance máxima e escalabilidade para 1.000+ usuários, você **DEVE** criar índices e funções no banco de dados. O Supabase não permite criar índices via código frontend por segurança.

### 1. Criar Índices (Performance)
Rode este SQL no Editor SQL do seu painel Supabase para acelerar as buscas por `tenant_id` e datas:

```sql
-- Índice para filtrar clientes por tenant e status rapidamente
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_status ON clientes(tenant_id, status);

-- Índice para filtrar clientes por data de criação (para gráficos)
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON clientes(tenant_id, created_at);

-- Índice para filtrar vendas por data (essencial para o dashboard)
CREATE INDEX IF NOT EXISTS idx_vendas_data_tenant ON vendas(tenant_id, data_venda);

-- Índice para tarefas recentes
CREATE INDEX IF NOT EXISTS idx_tarefas_tenant_created ON tarefas(tenant_id, created_at);
```

### 2. Criar Funções de Agregação (RPC) - Opcional mas Recomendado
Para evitar baixar qualquer dado de vendas para somar no frontend, crie esta função. Isso reduz o tráfego de dados de MBs para Bytes.

```sql
-- Função para somar vendas em um período
CREATE OR REPLACE FUNCTION sum_vendas(
  p_tenant_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(valor), 0)
    FROM vendas
    WHERE tenant_id = p_tenant_id
    AND data_venda >= p_start_date
    AND data_venda < p_end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Função para somar valor potencial de leads (Pipeline)
CREATE OR REPLACE FUNCTION sum_pipeline_value(
  p_tenant_id UUID,
  p_status TEXT
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(valor_potencial), 0)
    FROM clientes
    WHERE tenant_id = p_tenant_id
    AND status = p_status
  );
END;
$$ LANGUAGE plpgsql;
```

-- Ate aqui conifigurado!


## 🛡️ Análise de Segurança e Riscos

### 1. Row Level Security (RLS)
**Risco**: Se o RLS não estiver configurado corretamente, um usuário pode ver dados de outro `tenant_id` manipulando a requisição.
**Verificação**: O código frontend sempre passa `tenant_id`, mas a segurança real deve ser no banco.
**Ação**: Certifique-se de que suas tabelas (`clientes`, `vendas`, `tarefas`) têm RLS ativado e políticas como:
```sql
CREATE POLICY "Users can view their own tenant data" ON clientes
FOR SELECT USING (auth.uid() IN (SELECT user_id FROM members WHERE tenant_id = clientes.tenant_id));
```

### 2. Paginação
**Risco**: Listagens sem paginação (como a lista de clientes principal) vão quebrar com muitos dados.
**Ação**: Sempre use `.range(start, end)` nas queries de listagem.

### 3. Tipagem e Tratamento de Erros
**Risco**: O código assume que `valor` é sempre numérico. Dados sujos podem quebrar o dashboard.
**Solução**: Adicionamos tratamento `Number()` e `COALESCE` (valor padrão 0) no código refatorado.

## 🚨 Risco Crítico Adicional: Página de Leads (`src/pages/Leads.tsx`)
Identificamos que a função `loadLeads` baixa **todos** os clientes de uma vez e usa o operador `.in()` com todos os IDs para buscar tarefas e atividades.
- **Risco**: Com >1.000 leads, a query `.in()` ficará extremamente lenta ou falhará (limite de tamanho de URL/query).
- **Ação Recomendada**: Implementar **Paginação** (Infinite Scroll ou páginas numeradas) na tela de Leads. Buscar apenas 50 leads por vez.

