-- =====================================================
-- Adicionar coluna etapa_funil_id à tabela clientes
-- Data: 2025-12-18
-- =====================================================

-- Adicionar coluna etapa_funil_id à tabela clientes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clientes' AND column_name = 'etapa_funil_id'
    ) THEN
        ALTER TABLE clientes ADD COLUMN etapa_funil_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_clientes_etapa_funil ON clientes(etapa_funil_id);

-- Comentário para documentação
COMMENT ON COLUMN clientes.etapa_funil_id IS 'Referência para a etapa atual do lead no funil de vendas (pipeline)';
