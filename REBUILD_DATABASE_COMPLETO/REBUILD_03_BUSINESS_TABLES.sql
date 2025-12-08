-- =====================================================
-- REBUILD STEP 3: BUSINESS TABLES (CLIENTES, PRODUTOS, ETC)
-- Execute TERCEIRO (depois do REBUILD_02)
-- =====================================================

-- =====================================================
-- CLIENTES (LEADS)
-- =====================================================

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  notas TEXT,
  status TEXT DEFAULT 'lead',
  valor_potencial NUMERIC(15,2),
  campanha_id UUID REFERENCES campanhas(id) ON DELETE SET NULL,
  origem_id UUID REFERENCES lead_origins(id) ON DELETE SET NULL,
  motivo_perda_id UUID REFERENCES lead_loss_reasons(id) ON DELETE SET NULL,
  compartilhado_equipe BOOLEAN DEFAULT false,
  proprietario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  meta_auto_assigned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  codigo_referencia TEXT,
  preco NUMERIC(15,2),
  quantidade_estoque NUMERIC(15,2),
  capa_url TEXT,
  galeria JSONB DEFAULT '[]'::jsonb,
  anexos JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'disponivel',
  destaque BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  tags JSONB DEFAULT '[]'::jsonb,
  filtros JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUTOS EQUIPE (produtos específicos de equipe)
CREATE TABLE IF NOT EXISTS produtos_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(100),
  valor NUMERIC(15, 2),
  capa_url TEXT,
  status VARCHAR(50) DEFAULT 'disponivel',
  destaque BOOLEAN DEFAULT false,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLIENTE PRODUTOS (relacionamento)
CREATE TABLE IF NOT EXISTS cliente_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  interesse_level TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CAMPOS PERSONALIZADOS PARA LEADS
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options JSONB,
  required BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES lead_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, custom_field_id)
);

-- =====================================================
-- CAMPOS PERSONALIZADOS PARA PRODUTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS product_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options JSONB,
  required BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  searchable BOOLEAN DEFAULT false,
  show_in_list BOOLEAN DEFAULT false,
  show_in_filters BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  min_value NUMERIC,
  max_value NUMERIC,
  min_length INTEGER,
  max_length INTEGER,
  pattern TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES product_custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_boolean BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, custom_field_id)
);

-- =====================================================
-- PROCESSES & TASKS
-- =====================================================

CREATE TABLE IF NOT EXISTS processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'pendente',
  prioridade TEXT DEFAULT 'media',
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responsavel_nome TEXT,
  equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL,
  process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  data_vencimento TIMESTAMPTZ,
  tempo_gasto_minutos INTEGER DEFAULT 0,
  estimativa_minutos INTEGER,
  checklist JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarefas_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarefa_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LEAD TASKS
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VENDAS
-- =====================================================

CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  valor NUMERIC(15,2) NOT NULL,
  data_venda TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'concluida',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DESPESAS
-- =====================================================

CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  tipo despesa_tipo NOT NULL DEFAULT 'variavel',
  categoria despesa_categoria NOT NULL,
  status despesa_status NOT NULL DEFAULT 'ativa',
  ativa BOOLEAN DEFAULT true,
  data_vencimento TIMESTAMPTZ,
  data_pagamento TIMESTAMPTZ,
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_fim TIMESTAMPTZ,
  frequencia TEXT,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTACTS
-- =====================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  empresa TEXT,
  cargo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ATIVIDADES
-- =====================================================

CREATE TABLE IF NOT EXISTS atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'nota',
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LEAD TIMELINE & ATTACHMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('clientes', 'produtos', 'tarefas', 'vendas', 'despesas')
ORDER BY tablename;
