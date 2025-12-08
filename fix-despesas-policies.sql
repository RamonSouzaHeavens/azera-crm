-- Script para corrigir as Row Level Security (RLS) policies da tabela despesas
-- Execute este script no SQL Editor do Supabase

-- 1. Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "Users can view expenses from their tenant" ON despesas;
DROP POLICY IF EXISTS "Users can insert expenses to their tenant" ON despesas;
DROP POLICY IF EXISTS "Users can update expenses from their tenant" ON despesas;
DROP POLICY IF EXISTS "Users can delete expenses from their tenant" ON despesas;

-- 2. Habilitar RLS na tabela (caso não esteja habilitado)
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

-- 3. Criar policies corretas

-- Policy para SELECT (visualizar)
CREATE POLICY "Users can view expenses from their tenant"
ON despesas
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- Policy para INSERT (criar)
CREATE POLICY "Users can insert expenses to their tenant"
ON despesas
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- Policy para UPDATE (atualizar)
CREATE POLICY "Users can update expenses from their tenant"
ON despesas
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- Policy para DELETE (excluir)
CREATE POLICY "Users can delete expenses from their tenant"
ON despesas
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- 4. Verificar se as colunas necessárias existem
-- Se a tabela não tiver estas colunas, descomente e execute:

-- ALTER TABLE despesas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativa';
-- ALTER TABLE despesas ADD COLUMN IF NOT EXISTS data_inicio TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE despesas ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE despesas ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE;

-- 5. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_despesas_tenant_id ON despesas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_despesas_ativa ON despesas(ativa);
CREATE INDEX IF NOT EXISTS idx_despesas_tipo ON despesas(tipo);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas(categoria);
