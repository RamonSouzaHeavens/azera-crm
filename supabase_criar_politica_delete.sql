-- ============================================================================
-- SOLUÇÃO: Criar política que permite OWNER deletar o tenant
-- Cole isso no Supabase SQL Editor e execute UMA VEZ
-- ============================================================================

-- Criar política de DELETE para tenants (apenas owner pode deletar)
CREATE POLICY "Owner can delete their tenant" ON tenants
FOR DELETE
TO authenticated
USING (
    id IN (
        SELECT memberships.tenant_id
        FROM memberships
        WHERE memberships.user_id = auth.uid()
          AND memberships.role = 'owner'
          AND memberships.active = true
    )
);

-- Verificar se foi criada
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tenants';
