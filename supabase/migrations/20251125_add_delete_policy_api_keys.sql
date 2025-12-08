-- Add DELETE policy for api_keys table
-- Allow owners and admins to delete API keys from their tenant

DROP POLICY IF EXISTS "Users can delete their tenant's api keys" ON api_keys;
CREATE POLICY "Users can delete their tenant's api keys" ON api_keys
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'administrador')
    )
  );