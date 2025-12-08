-- =====================================================
-- TABELA FALTANTE: TAREFA_ANEXOS
-- Execute este SQL no Supabase
-- =====================================================

CREATE TABLE IF NOT EXISTS tarefa_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tarefa_anexos_tarefa_id ON tarefa_anexos(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tarefa_anexos_tenant_id ON tarefa_anexos(tenant_id);

-- RLS
ALTER TABLE tarefa_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage tarefa_anexos in their tenant" ON tarefa_anexos;
CREATE POLICY "Users can manage tarefa_anexos in their tenant" ON tarefa_anexos
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );
