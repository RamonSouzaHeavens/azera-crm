-- ============================================
-- DEBUG COMPLETO: Por que ninguém vê as conversas?
-- ============================================

-- 1. Testar como usuário logado veria (simular RLS)
-- Substitua pelo user_id do Ramon: 495bb1dd-4cd0-4cfa-b794-e065818aab43
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '495bb1dd-4cd0-4cfa-b794-e065818aab43';

SELECT * FROM conversations LIMIT 5;

-- Reset role
RESET role;

-- ============================================
-- 2. Verificar se RLS está habilitado na tabela
-- ============================================
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('conversations', 'messages');

-- ============================================
-- 3. Ver TODAS as políticas de conversations em detalhe
-- ============================================
SELECT
    policyname,
    cmd,
    qual as policy_condition
FROM pg_policies
WHERE tablename = 'conversations';

-- ============================================
-- 4. Verificar memberships do usuário Ramon
-- ============================================
SELECT
    m.id,
    m.user_id,
    m.tenant_id,
    m.role,
    m.active,
    t.name as tenant_name
FROM memberships m
JOIN tenants t ON t.id = m.tenant_id
WHERE m.user_id = '495bb1dd-4cd0-4cfa-b794-e065818aab43';

-- ============================================
-- 5. Testar a condição da política manualmente
-- (Ver quais conversas o usuário DEVERIA conseguir ver)
-- ============================================
SELECT
    c.id,
    c.contact_name,
    c.tenant_id,
    c.archived,
    c.deleted_at,
    EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.tenant_id = c.tenant_id
        AND m.user_id = '495bb1dd-4cd0-4cfa-b794-e065818aab43'
        AND m.active = true
    ) as user_can_see
FROM conversations c
WHERE c.deleted_at IS NULL
ORDER BY c.last_message_at DESC
LIMIT 20;

-- ============================================
-- 6. Contar conversas que o usuário DEVERIA ver
-- ============================================
SELECT
    c.tenant_id,
    t.name as tenant_name,
    COUNT(*) as total,
    SUM(CASE WHEN c.archived = false THEN 1 ELSE 0 END) as nao_arquivadas
FROM conversations c
JOIN tenants t ON t.id = c.tenant_id
WHERE c.deleted_at IS NULL
AND c.tenant_id IN (
    SELECT m.tenant_id
    FROM memberships m
    WHERE m.user_id = '495bb1dd-4cd0-4cfa-b794-e065818aab43'
    AND m.active = true
)
GROUP BY c.tenant_id, t.name;
