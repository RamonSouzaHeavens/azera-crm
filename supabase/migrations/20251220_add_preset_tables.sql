-- =====================================================
-- Migration: Add tenant_presets table
-- Track which presets have been applied to each tenant
-- =====================================================

-- Criar tabela para rastrear presets aplicados
CREATE TABLE IF NOT EXISTS tenant_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  preset_id TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT now(),
  applied_by UUID REFERENCES auth.users(id),

  -- Garantir que cada preset só pode ser aplicado uma vez por tenant
  UNIQUE(tenant_id, preset_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tenant_presets_tenant_id
  ON tenant_presets(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_presets_preset_id
  ON tenant_presets(preset_id);

-- RLS
ALTER TABLE tenant_presets ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver presets do seu próprio tenant
CREATE POLICY "Users can view own tenant presets"
  ON tenant_presets
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Policy: Owners e admins podem aplicar presets
CREATE POLICY "Owners and admins can insert presets"
  ON tenant_presets
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid()
        AND active = true
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: Owners e admins podem deletar presets (reverter)
CREATE POLICY "Owners and admins can delete presets"
  ON tenant_presets
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid()
        AND active = true
        AND role IN ('owner', 'admin')
    )
  );
