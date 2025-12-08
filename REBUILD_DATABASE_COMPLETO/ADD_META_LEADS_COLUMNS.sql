-- ================================================================
-- ADD_META_LEADS_COLUMNS.sql
-- Adiciona colunas para distribuição de leads do Facebook/Meta
-- na tabela memberships
-- ================================================================

-- Adicionar coluna receive_meta_leads
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS receive_meta_leads BOOLEAN DEFAULT true;

-- Adicionar coluna last_meta_lead_received_at
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS last_meta_lead_received_at TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN memberships.receive_meta_leads IS 'Indica se o membro recebe leads automáticos do Facebook/Meta';
COMMENT ON COLUMN memberships.last_meta_lead_received_at IS 'Data/hora do último lead do Facebook/Meta recebido por este membro';

-- ================================================================
-- VERIFICAÇÃO
-- ================================================================
-- Execute para confirmar que as colunas foram adicionadas:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'memberships'
AND column_name IN ('receive_meta_leads', 'last_meta_lead_received_at');
