-- =====================================================
-- REBUILD STEP 2: CORE TABLES
-- Execute SEGUNDO (depois do REBUILD_01)
-- =====================================================

-- =====================================================
-- TABELAS FUNDAMENTAIS (sem dependências)
-- =====================================================

-- TENANTS
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  descricao TEXT,
  slogan TEXT,
  logo_url TEXT,
  join_code TEXT UNIQUE,
  ativa BOOLEAN DEFAULT true,
  meta_leads_distribution_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  full_name TEXT,
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  default_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  disabled BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEMBERSHIPS
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'vendedor' CHECK (role IN ('owner', 'admin', 'administrador', 'vendedor')),
  active BOOLEAN DEFAULT true,
  receive_meta_leads BOOLEAN DEFAULT true,
  last_meta_lead_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- TEAM INVITES
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor',
  invite_token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'expirado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLANS
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER,
  billing_period TEXT,
  provider_price_id TEXT,
  stripe_price_id_mensal TEXT UNIQUE,
  stripe_price_id_semestral TEXT UNIQUE,
  stripe_price_id_anual TEXT UNIQUE,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  provider TEXT DEFAULT 'stripe',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMPANY SETTINGS
CREATE TABLE IF NOT EXISTS company_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  nome_fantasia TEXT,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'Brasil',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EQUIPES
CREATE TABLE IF NOT EXISTS equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CAMPANHAS & ORIGENS
-- =====================================================

-- CAMPANHAS
CREATE TABLE IF NOT EXISTS campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEAD ORIGINS
CREATE TABLE IF NOT EXISTS lead_origins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'manual',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEAD LOSS REASONS
CREATE TABLE IF NOT EXISTS lead_loss_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
