-- =====================================================
-- REBUILD STEP 1: EXTENSIONS & ENUMS
-- Execute PRIMEIRO
-- =====================================================

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- CRIAR ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE despesa_tipo AS ENUM ('fixa', 'variavel');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE despesa_status AS ENUM ('ativa', 'paga', 'cancelada', 'atrasada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE despesa_categoria AS ENUM ('operacional', 'marketing', 'pessoal', 'administrativo', 'outros');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT 
  n.nspname as "Schema",
  t.typname as "Name",
  CASE t.typtype
    WHEN 'e' THEN 'enum'
    ELSE 'other'
  END as "Type"
FROM pg_type t
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
  AND n.nspname = 'public'
  AND t.typtype = 'e'
ORDER BY 1, 2;
