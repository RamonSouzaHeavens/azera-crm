-- ============================================
-- DEBUG: Por que as conversas não aparecem?
-- ============================================

-- 1. Ver TODAS as conversas no banco (bypass RLS)
SELECT
    id,
    tenant_id,
    contact_name,
    contact_phone,
    channel,
    last_message_content,
    last_message_at,
    unread_count,
    archived,
    deleted_at,
    created_at
FROM conversations
ORDER BY last_message_at DESC
LIMIT 20;

-- 2. Ver TODAS as mensagens recentes (bypass RLS)
SELECT
    m.id,
    m.conversation_id,
    m.direction,
    m.content,
    m.message_type,
    m.status,
    m.created_at,
    c.contact_name,
    c.tenant_id
FROM messages m
LEFT JOIN conversations c ON c.id = m.conversation_id
ORDER BY m.created_at DESC
LIMIT 30;

-- 3. Verificar se há políticas RLS para conversations
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
WHERE tablename = 'conversations';

-- 4. Verificar se há políticas RLS para messages
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
WHERE tablename = 'messages';

-- 5. Verificar seu tenant_id e membership
-- (substitua 'ramonexecut@gmail.com' pelo email correto se necessário)
SELECT
    p.id as user_id,
    p.display_name,
    m.tenant_id,
    m.role,
    m.active,
    t.name as tenant_name
FROM profiles p
JOIN memberships m ON m.user_id = p.id
JOIN tenants t ON t.id = m.tenant_id
WHERE p.id IN (
    SELECT id FROM auth.users WHERE email = 'ramonexecut@gmail.com'
);

-- 6. Comparar tenant_id das conversas com seu membership
-- As conversas têm o mesmo tenant_id que você está logado?
SELECT
    c.tenant_id as conversa_tenant,
    t.name as tenant_name,
    COUNT(*) as total_conversas
FROM conversations c
LEFT JOIN tenants t ON t.id = c.tenant_id
GROUP BY c.tenant_id, t.name;
