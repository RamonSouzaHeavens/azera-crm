-- =====================================================
-- REBUILD STEP 4: AUTOMATIONS, WEBHOOKS & API KEYS
-- Execute QUARTO (depois do REBUILD_03)
-- =====================================================

-- =====================================================
-- AUTOMAÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS automacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  url TEXT NOT NULL,
  webhook_secret TEXT,
  metodo_http TEXT NOT NULL,
  headers JSONB,
  body_template TEXT,
  entidade_alvo TEXT NOT NULL,
  evento TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  tentativas_falhadas INTEGER DEFAULT 0,
  ultimo_status TEXT,
  ultimo_erro TEXT,
  ultima_execucao TIMESTAMPTZ,
  proxima_execucao TIMESTAMPTZ,
  frequencia_minutos INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automacao_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automacao_id UUID NOT NULL REFERENCES automacoes(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  dados_enviados JSONB,
  resposta JSONB,
  erro TEXT,
  codigo_http INTEGER,
  tempo_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WEBHOOKS
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  secret TEXT,
  headers JSONB DEFAULT '{}',
  retry_policy JSONB DEFAULT '{"max_retries": 5, "backoff_multiplier": 2}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_webhook_per_tenant UNIQUE(tenant_id, url, event_type)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  response_status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- API KEYS
-- =====================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT,
  key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  permissions TEXT[] DEFAULT ARRAY['read']::TEXT[],
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Automações
CREATE INDEX IF NOT EXISTS idx_automacoes_tenant ON automacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automacoes_ativo ON automacoes(ativo);
CREATE INDEX IF NOT EXISTS idx_automacao_logs_automacao ON automacao_logs(automacao_id);

-- Webhooks
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_tenant ON webhook_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_event_type ON webhook_subscriptions(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription ON webhook_deliveries(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'pending';

-- API Keys
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('automacoes', 'webhook_subscriptions', 'api_keys', 'audit_logs')
ORDER BY tablename;
