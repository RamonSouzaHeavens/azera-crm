-- ============================================================
-- DIAGNÓSTICO: PROBLEMA COM DELETE DE LEADS (CLIENTES)
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- 1. VERIFICAR POLÍTICAS RLS NA TABELA CLIENTES
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'clientes'
ORDER BY policyname;

-- 2. VERIFICAR SE RLS ESTÁ HABILITADO NA TABELA
SELECT
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'clientes';

-- 3. BUSCAR UM LEAD ESPECÍFICO PARA TESTAR
-- Substitua 'SEU_TENANT_ID' pelo tenant_id real
-- SELECT id, nome, tenant_id, created_at
-- FROM clientes
-- WHERE tenant_id = 'SEU_TENANT_ID'
-- LIMIT 5;

-- ============================================================
-- POSSÍVEIS CORREÇÕES (NÃO EXECUTE, APENAS ANALISE PRIMEIRO)
-- ============================================================

-- Se não houver política de DELETE, adicione:
/*
CREATE POLICY "clientes_delete_policy" ON clientes
FOR DELETE
USING (
    tenant_id IN (
        SELECT tenant_id FROM team_members
        WHERE user_id = auth.uid()
    )
);
*/

-- Se a política existir mas não funcionar, pode ser necessário:
-- 1. Verificar se o usuário está autenticado
-- 2. Verificar se o usuário pertence ao tenant correto
-- 3. Verificar se há cascatas de FK bloqueando

-- ============================================================
-- TESTE DIRETO DE DELETE (CUIDADO - ISSO APAGA DE VERDADE!)
-- ============================================================

-- Para testar se o delete funciona diretamente no banco:
-- Primeiro, pegue um ID de lead para teste
-- SELECT id FROM clientes LIMIT 1;

-- Depois tente deletar (substitua XXX pelo id):
-- DELETE FROM clientes WHERE id = 'XXX';

-- Se der erro, o erro vai mostrar qual constraint está bloqueando

-- ============================================================
-- VERIFICAR FOREIGN KEYS QUE PODEM BLOQUEAR DELETE
-- ============================================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'clientes';

-- ============================================================
-- VERIFICAR TABELAS RELACIONADAS (lead_custom_field_values, etc)
-- ============================================================
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN (
    'lead_custom_field_values',
    'lead_attachments',
    'atividades',
    'tarefas',
    'conversations',
    'lead_timeline'
)
ORDER BY tablename, policyname;
