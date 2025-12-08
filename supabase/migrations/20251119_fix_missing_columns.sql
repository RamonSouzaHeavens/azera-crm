-- =====================================================
-- Fix: Adicionar campos faltantes às tabelas
-- =====================================================

-- Verificar e adicionar coluna 'ativa' em campanhas se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campanhas' AND column_name = 'ativa'
  ) THEN
    ALTER TABLE campanhas ADD COLUMN ativa BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Verificar e adicionar coluna 'ativo' em produtos se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE produtos ADD COLUMN ativo BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Verificar se campo 'status' já existe em produtos
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'status'
  ) THEN
    -- Sincronizar: se tem status, copia para ativo
    UPDATE produtos SET ativo = (status = 'disponivel' OR status IS NULL) 
    WHERE ativo IS NULL;
  END IF;
END $$;

-- Verificar índices
CREATE INDEX IF NOT EXISTS idx_campanhas_ativa ON campanhas(ativa);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);
