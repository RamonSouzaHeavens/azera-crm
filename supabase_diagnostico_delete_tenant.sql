-- ============================================================================
-- DIAGNÓSTICO - NÃO DELETA NADA, APENAS MOSTRA INFORMAÇÕES
-- Cole isso no Supabase SQL Editor e execute
-- ============================================================================

-- 1. Mostra as FOREIGN KEYS que referenciam tenants e se têm CASCADE
SELECT
    tc.table_name as "Tabela",
    kcu.column_name as "Coluna",
    rc.delete_rule as "Regra de Delete (RESTRICT = bloqueia, CASCADE = deleta junto)"
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'tenants'
ORDER BY rc.delete_rule, tc.table_name;

-- 2. Mostra as políticas RLS da tabela tenants (precisa ter DELETE)
SELECT
    policyname as "Nome da Politica",
    cmd as "Ação (precisa ter DELETE)",
    qual as "Condição"
FROM pg_policies
WHERE tablename = 'tenants';

-- 3. Verifica se existe alguma função RPC para deletar tenant
SELECT routine_name as "Função", routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%delete%tenant%' OR routine_name LIKE '%tenant%delete%';
