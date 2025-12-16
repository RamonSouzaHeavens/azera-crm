-- =====================================================
-- ADICIONAR POLÍTICA DE UPDATE PARA TABELA TENANTS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Remover política existente se houver (para evitar conflito)
DROP POLICY IF EXISTS "Owners e admins podem atualizar tenants" ON tenants;
DROP POLICY IF EXISTS "tenants_update_owners_admins" ON tenants;

-- Criar política de UPDATE para owners, admins e administradores
CREATE POLICY "Owners e admins podem atualizar tenants"
ON tenants
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE
      memberships.user_id = auth.uid()
      AND memberships.active = true
      AND memberships.role IN ('owner', 'admin', 'administrador')
  )
)
WITH CHECK (
  id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE
      memberships.user_id = auth.uid()
      AND memberships.active = true
      AND memberships.role IN ('owner', 'admin', 'administrador')
  )
);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se a política foi criada
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenants'
ORDER BY policyname;

-- =====================================================
-- EXPLICAÇÃO:
-- =====================================================
--
-- Esta política permite que:
-- - Owners podem atualizar seu próprio tenant
-- - Admins podem atualizar o tenant do qual são membros
-- - Administradores podem atualizar o tenant do qual são membros
--
-- Requisitos:
-- - O usuário deve estar autenticado
-- - O usuário deve ter um membership ativo no tenant
-- - O role do membership deve ser: owner, admin ou administrador
--
-- =====================================================
