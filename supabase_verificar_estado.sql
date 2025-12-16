-- ============================================================================
-- DIAGNÓSTICO: Verificar estado após exclusão (não deleta nada)
-- ============================================================================

-- 1. Seu usuário e profile
SELECT id, display_name, default_tenant_id
FROM profiles
WHERE id = auth.uid();

-- 2. Seus memberships
SELECT id, tenant_id, role, active
FROM memberships
WHERE user_id = auth.uid();

-- 3. Tenants que você deveria ter acesso
SELECT t.id, t.name
FROM tenants t
JOIN memberships m ON m.tenant_id = t.id
WHERE m.user_id = auth.uid() AND m.active = true;

-- Se aparecer default_tenant_id apontando pra um tenant que não existe,
-- rode isso para corrigir:
-- UPDATE profiles SET default_tenant_id = NULL WHERE id = auth.uid();
