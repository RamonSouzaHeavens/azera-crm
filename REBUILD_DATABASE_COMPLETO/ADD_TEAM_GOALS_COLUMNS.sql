-- =====================================================
-- ADICIONAR COLUNAS DE METAS NA TABELA TENANTS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Adicionar coluna meta_leads (meta mensal de leads)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS meta_leads INTEGER DEFAULT 100;

-- Adicionar coluna meta_vendas (meta mensal de vendas)
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
