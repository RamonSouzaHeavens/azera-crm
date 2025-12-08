-- =====================================================
-- REBUILD STEP 5: INDEXES, RLS & TRIGGERS
-- Execute QUINTO (último arquivo)
-- =====================================================

-- =====================================================
-- CRIAR TODOS OS INDEXES
-- =====================================================

-- Tenants & Memberships
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships(active);
CREATE INDEX IF NOT EXISTS idx_team_invites_tenant ON team_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);

-- Clientes (Leads)
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_clientes_origem ON clientes(origem_id);
CREATE INDEX IF NOT EXISTS idx_clientes_motivo_perda ON clientes(motivo_perda_id);
CREATE INDEX IF NOT EXISTS idx_clientes_campanha ON clientes(campanha_id);
CREATE INDEX IF NOT EXISTS idx_clientes_proprietario ON clientes(proprietario_id);

-- Produtos
CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_status ON produtos(status);
CREATE INDEX IF NOT EXISTS idx_produtos_equipe_tenant ON produtos_equipe(tenant_id);

-- Campanhas & Origens
CREATE INDEX IF NOT EXISTS idx_campanhas_tenant ON campanhas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_origins_tenant ON lead_origins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_loss_reasons_tenant ON lead_loss_reasons(tenant_id);

-- Relacionamentos
CREATE INDEX IF NOT EXISTS idx_cliente_produtos_tenant ON cliente_produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cliente_produtos_cliente ON cliente_produtos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_produtos_produto ON cliente_produtos(produto_id);

-- Atividades & Timeline
CREATE INDEX IF NOT EXISTS idx_atividades_cliente ON atividades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_atividades_tenant ON atividades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead ON lead_timeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_timeline_tenant ON lead_timeline(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead ON lead_attachments(lead_id);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_tenant ON lead_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_tenant ON tarefas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_cliente ON tarefas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_produto ON tarefas(produto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_produtos_tarefa ON tarefas_produtos(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_produtos_produto ON tarefas_produtos(produto_id);

-- Custom Fields
CREATE INDEX IF NOT EXISTS idx_lead_custom_fields_tenant ON lead_custom_fields(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_custom_fields_tenant ON product_custom_fields(tenant_id);

-- Outros
CREATE INDEX IF NOT EXISTS idx_despesas_tenant ON despesas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processes_tenant ON processes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendas_tenant ON vendas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automacao_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÃO HELPER PARA RLS
-- =====================================================

CREATE OR REPLACE FUNCTION can_view_membership(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS RLS (PRINCIPAIS)
-- =====================================================

-- Tenants
DROP POLICY IF EXISTS "Users can view tenants they are members of" ON tenants;
CREATE POLICY "Users can view tenants they are members of" ON tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Memberships
DROP POLICY IF EXISTS "Users can view memberships" ON memberships;
CREATE POLICY "Users can view memberships" ON memberships
  FOR SELECT USING (can_view_membership(user_id, tenant_id));

-- Clientes
DROP POLICY IF EXISTS "Users can view clientes in their tenants" ON clientes;
CREATE POLICY "Users can view clientes in their tenants" ON clientes
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Produtos
DROP POLICY IF EXISTS "Users can view produtos in their tenant" ON produtos;
CREATE POLICY "Users can view produtos in their tenant" ON produtos
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Tarefas
DROP POLICY IF EXISTS "Users can manage tarefas in their tenant" ON tarefas;
CREATE POLICY "Users can manage tarefas in their tenant" ON tarefas
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Aplicar mesma política para outras tabelas (padrão)
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'campanhas', 'equipes', 'produtos_equipe', 'cliente_produtos', 
      'atividades', 'contacts', 'despesas', 'automacoes', 
      'lead_origins', 'lead_loss_reasons', 'lead_timeline', 
      'lead_attachments', 'lead_tasks', 'lead_custom_fields',
      'processes', 'vendas', 'webhook_subscriptions'
    )
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Users can manage %I in their tenant" ON %I;
      CREATE POLICY "Users can manage %I in their tenant" ON %I
        FOR ALL USING (
          tenant_id IN (
            SELECT tenant_id FROM memberships
            WHERE user_id = auth.uid() AND active = true
          )
        );
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- =====================================================
-- FUNÇÃO DE UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS DE UPDATE (aplicar em todas as tabelas)
-- =====================================================

DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'tenants', 'profiles', 'memberships', 'clientes', 'produtos', 
      'campanhas', 'produtos_equipe', 'contacts', 'despesas', 
      'automacoes', 'lead_origins', 'lead_loss_reasons', 'lead_tasks',
      'lead_custom_fields', 'lead_custom_field_values', 'subscriptions',
      'plans', 'tarefas', 'processes', 'vendas', 'api_keys',
      'webhook_subscriptions', 'webhook_deliveries', 'team_invites',
      'tarefa_checklist', 'company_settings', 'product_custom_fields',
      'product_custom_field_values'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON %I;
      CREATE TRIGGER trigger_update_%I_updated_at
      BEFORE UPDATE ON %I 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- =====================================================
-- STORAGE BUCKETS (criar se não existirem)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('produtos', 'produtos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('lead-attachments', 'lead-attachments', false, 10485760, NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
CREATE POLICY "Public read access for avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read access for produtos" ON storage.objects;
CREATE POLICY "Public read access for produtos" ON storage.objects
  FOR SELECT USING (bucket_id = 'produtos');

DROP POLICY IF EXISTS "Tenant users can upload produtos" ON storage.objects;
CREATE POLICY "Tenant users can upload produtos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'produtos' 
    AND auth.uid() IN (SELECT user_id FROM memberships WHERE active = true)
  );

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
  'Tabelas criadas' as status,
  count(*) as total
FROM pg_tables 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Indexes criados',
  count(*)
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Policies criadas',
  count(*)
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Triggers criados',
  count(*)
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public';

-- =====================================================
-- POLÍTICAS RLS PARA AUTOMACAO_LOGS
-- =====================================================

DROP POLICY IF EXISTS "Users can view automacao logs from their tenant" ON automacao_logs;
CREATE POLICY "Users can view automacao logs from their tenant" ON automacao_logs
  FOR SELECT USING (
    automacao_id IN (
      SELECT id FROM automacoes
      WHERE tenant_id IN (
        SELECT tenant_id FROM memberships
        WHERE user_id = auth.uid()
        AND active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert automacao logs for their tenant" ON automacao_logs;
CREATE POLICY "Users can insert automacao logs for their tenant" ON automacao_logs
  FOR INSERT WITH CHECK (
    automacao_id IN (
      SELECT id FROM automacoes
      WHERE tenant_id IN (
        SELECT tenant_id FROM memberships
        WHERE user_id = auth.uid()
        AND active = true
      )
    )
  );
