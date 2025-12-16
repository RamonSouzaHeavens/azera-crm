# Instruções para Corrigir Funcionalidades da Equipe

## Problemas Resolvidos

1. ✅ **Upload de Ícone da Equipe** - Agora funcional
2. ✅ **Salvar Metas** - Requer execução de script SQL
3. ✅ **Barra de Progresso de Metas** - Atualiza automaticamente

## Passo a Passo

### 1. Executar Script SQL no Supabase

**IMPORTANTE**: Você precisa adicionar as colunas de metas na tabela `tenants` antes de usar a funcionalidade.

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**
5. Cole o seguinte script:

```sql
-- Adicionar colunas de metas na tabela tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS meta_leads INTEGER DEFAULT 100;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS meta_vendas INTEGER DEFAULT 20;

-- Adicionar comentários para documentação
COMMENT ON COLUMN tenants.meta_leads IS 'Meta mensal de leads para a equipe';
COMMENT ON COLUMN tenants.meta_vendas IS 'Meta mensal de vendas/fechamentos para a equipe';

-- Verificar se as colunas foram adicionadas
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants'
AND column_name IN ('meta_leads', 'meta_vendas')
ORDER BY column_name;
```

6. Clique em **Run** (ou pressione `Ctrl+Enter`)
7. Verifique se a query retornou as duas colunas (`meta_leads` e `meta_vendas`)

### 2. Configurar Storage para Upload de Ícones

1. No Supabase Dashboard, vá em **Storage** (menu lateral)
2. Verifique se existe um bucket chamado `publicteam`
   - Se não existir, clique em **New Bucket**
   - Nome: `publicteam`
   - Marque como **Public bucket**
3. Dentro do bucket `publicteam`, a pasta `team-logos` será criada automaticamente no primeiro upload
4. Configure as políticas de acesso:
   - Vá em **SQL Editor** no Supabase
   - Execute o script: `REBUILD_DATABASE_COMPLETO/STORAGE_POLICIES_PUBLICTEAM.sql`
   - Isso criará 4 políticas:
     - **SELECT**: Qualquer pessoa pode ver os logos (público)
     - **INSERT**: Apenas usuários autenticados podem fazer upload
     - **UPDATE**: Apenas usuários autenticados podem atualizar
     - **DELETE**: Apenas usuários autenticados podem deletar

### 3. Testar as Funcionalidades

Agora você pode testar:

#### Upload de Ícone:
1. Vá para **Equipe (Beta)** > **Gerenciar Equipe**
2. Clique em **Alterar Ícone**
3. Selecione uma imagem (JPG, PNG ou GIF, máx 2MB)
4. O ícone será atualizado automaticamente

#### Salvar Metas:
1. Na mesma página, vá para a seção **Metas Mensais**
2. Defina a **Meta de Leads** (ex: 50)
3. Defina a **Meta de Vendas** (ex: 20)
4. Clique em **Salvar Metas**
5. A barra de progresso no header será atualizada automaticamente

## Como Funciona

### Barra de Progresso de Metas
- A barra no header mostra o progresso em relação à meta de leads
- Cálculo: `(leads do mês / meta de leads) * 100`
- Atualiza automaticamente quando você salva novas metas

### Upload de Ícone
- O arquivo é enviado para o Supabase Storage
- A URL pública é salva na coluna `logo_url` da tabela `tenants`
- O ícone antigo é removido automaticamente quando você faz upload de um novo

### Metas
- As metas são salvas nas colunas `meta_leads` e `meta_vendas` da tabela `tenants`
- São usadas em várias partes do sistema:
  - Barra de progresso no header
  - Seção "Objetivos da Equipe" na Visão Geral
  - Cálculos de performance dos vendedores

## Solução de Problemas

### Erro: "Could not find the 'meta_leads' column"
- **Causa**: O script SQL não foi executado
- **Solução**: Execute o script SQL conforme o Passo 1

### Erro ao fazer upload de ícone
- **Causa**: Bucket `public` não existe ou não tem permissões corretas
- **Solução**: Configure o Storage conforme o Passo 2

### Barra de progresso não atualiza
- **Causa**: Dados de leads não estão sendo contados corretamente
- **Solução**: Verifique se os leads estão sendo criados com o `tenant_id` correto

## Arquivo SQL Criado

O script SQL completo está em:
```
REBUILD_DATABASE_COMPLETO/ADD_TEAM_GOALS_COLUMNS.sql
```

Você pode executá-lo diretamente no Supabase SQL Editor.
