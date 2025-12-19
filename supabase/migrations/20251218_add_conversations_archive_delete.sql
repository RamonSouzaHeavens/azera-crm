-- =====================================================
-- Adicionar funcionalidades de Arquivar e Excluir conversas
-- Data: 2025-12-18
-- =====================================================

-- Adicionar coluna archived à tabela conversations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'archived'
    ) THEN
        ALTER TABLE conversations ADD COLUMN archived BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Adicionar coluna deleted_at à tabela conversations (soft delete)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE conversations ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(archived) WHERE archived = true;
CREATE INDEX IF NOT EXISTS idx_conversations_deleted ON conversations(deleted_at) WHERE deleted_at IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN conversations.archived IS 'Indica se a conversa foi arquivada pelo usuário';
COMMENT ON COLUMN conversations.deleted_at IS 'Data e hora em que a conversa foi excluída (soft delete)';
