-- =====================================================
-- SQL's para Funcionalidades de Arquivar e Excluir Conversas
-- Data: 2025-12-18
-- Autor: Sistema Azera CRM
-- =====================================================

-- =====================================================
-- 1. ADICIONAR COLUNAS À TABELA CONVERSATIONS
-- =====================================================

-- Adicionar coluna archived (para arquivar conversas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'archived'
    ) THEN
        ALTER TABLE conversations ADD COLUMN archived BOOLEAN DEFAULT false;
        COMMENT ON COLUMN conversations.archived IS 'Indica se a conversa foi arquivada pelo usuário';
    END IF;
END $$;

-- Adicionar coluna deleted_at (para soft delete)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE conversations ADD COLUMN deleted_at TIMESTAMPTZ;
        COMMENT ON COLUMN conversations.deleted_at IS 'Data e hora em que a conversa foi excluída (soft delete)';
    END IF;
END $$;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(archived) WHERE archived = true;
CREATE INDEX IF NOT EXISTS idx_conversations_deleted ON conversations(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- 2. ADICIONAR COLUNA ETAPA_FUNIL_ID À TABELA CLIENTES
-- =====================================================

-- Adicionar coluna etapa_funil_id (para vincular lead à etapa do pipeline)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clientes' AND column_name = 'etapa_funil_id'
    ) THEN
        ALTER TABLE clientes ADD COLUMN etapa_funil_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL;
        COMMENT ON COLUMN clientes.etapa_funil_id IS 'Referência para a etapa atual do lead no funil de vendas (pipeline)';
    END IF;
END $$;

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_clientes_etapa_funil ON clientes(etapa_funil_id);

-- =====================================================
-- 3. VERIFICAÇÃO
-- =====================================================

-- Verificar se as colunas foram criadas corretamente
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('conversations', 'clientes')
  AND column_name IN ('archived', 'deleted_at', 'etapa_funil_id')
ORDER BY table_name, column_name;

-- Verificar índices criados
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('conversations', 'clientes')
  AND indexname IN ('idx_conversations_archived', 'idx_conversations_deleted', 'idx_clientes_etapa_funil')
ORDER BY tablename, indexname;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
