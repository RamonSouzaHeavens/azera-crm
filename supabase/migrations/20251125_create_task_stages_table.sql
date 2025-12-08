-- =====================================================
-- Create task_stages table
-- =====================================================

CREATE TABLE IF NOT EXISTS task_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_stages_tenant ON task_stages(tenant_id);

-- RLS
ALTER TABLE task_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_stages_select_own_tenant" ON task_stages
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "task_stages_insert_own_tenant" ON task_stages
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "task_stages_update_own_tenant" ON task_stages
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "task_stages_delete_own_tenant" ON task_stages
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );