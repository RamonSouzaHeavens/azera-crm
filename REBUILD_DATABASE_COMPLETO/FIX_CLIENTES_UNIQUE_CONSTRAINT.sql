-- =====================================================
-- FIX: Add unique constraint to clientes table
-- =====================================================
-- This allows upsert operations on (tenant_id, telefone)
-- =====================================================

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clientes_tenant_telefone_unique'
    ) THEN
        ALTER TABLE clientes 
        ADD CONSTRAINT clientes_tenant_telefone_unique 
        UNIQUE (tenant_id, telefone);
    END IF;
END $$;

-- Verify
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'clientes'::regclass 
  AND conname = 'clientes_tenant_telefone_unique';
