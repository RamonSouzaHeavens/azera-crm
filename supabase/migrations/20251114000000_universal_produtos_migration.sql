-- =====================================================
-- MIGRAÇÃO: PRODUTOS UNIVERSAL COM CAMPOS PERSONALIZADOS
-- Data: 2025-11-14
-- Descrição: Transforma tabela produtos em estrutura universal
--            que suporta qualquer tipo de negócio via custom fields
-- =====================================================

-- ============================================================
-- PARTE 1: CRIAR TABELA DE DEFINIÇÕES DE CAMPOS PERSONALIZADOS
-- ============================================================

CREATE TABLE IF NOT EXISTS product_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Informações do campo
  field_key TEXT NOT NULL, -- Chave única (ex: "area_total", "num_quartos", "marca")
  field_label TEXT NOT NULL, -- Label exibido no form (ex: "Área Total", "Número de Quartos")
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text',           -- Texto curto
    'textarea',       -- Texto longo
    'number',         -- Número
    'currency',       -- Moeda (BRL)
    'percentage',     -- Porcentagem
    'date',           -- Data
    'datetime',       -- Data e hora
    'boolean',        -- Sim/Não
    'select',         -- Seleção única (dropdown)
    'multiselect',    -- Seleção múltipla
    'url',            -- URL
    'email',          -- Email
    'phone',          -- Telefone
    'file',           -- Upload de arquivo
    'image'           -- Upload de imagem
  )),
  
  -- Configurações do campo
  field_options JSONB, -- Para select/multiselect: ["Opção 1", "Opção 2"]
  field_default TEXT, -- Valor padrão
  field_placeholder TEXT, -- Placeholder do input
  field_help_text TEXT, -- Texto de ajuda
  
  -- Validações
  required BOOLEAN DEFAULT false,
  min_value NUMERIC,
  max_value NUMERIC,
  min_length INTEGER,
  max_length INTEGER,
  pattern TEXT, -- Regex para validação
  
  -- Organização
  field_group TEXT, -- Grupo/categoria (ex: "Características", "Localização", "Preços")
  display_order INTEGER DEFAULT 0, -- Ordem de exibição
  
  -- Visibilidade e filtros
  show_in_list BOOLEAN DEFAULT false, -- Mostrar na listagem de produtos
  show_in_filters BOOLEAN DEFAULT false, -- Disponível como filtro
  searchable BOOLEAN DEFAULT false, -- Indexado para busca
  
  -- Status
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_product_custom_fields_tenant ON product_custom_fields(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_custom_fields_active ON product_custom_fields(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_product_custom_fields_group ON product_custom_fields(tenant_id, field_group, display_order);

-- ============================================================
-- PARTE 2: CRIAR TABELA DE VALORES DOS CAMPOS PERSONALIZADOS
-- ============================================================

CREATE TABLE IF NOT EXISTS product_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES product_custom_fields(id) ON DELETE CASCADE,
  
  -- Valores (usar o campo apropriado conforme tipo)
  value_text TEXT,
  value_number NUMERIC,
  value_boolean BOOLEAN,
  value_date DATE,
  value_datetime TIMESTAMPTZ,
  value_json JSONB, -- Para arrays, objetos, etc
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(produto_id, custom_field_id)
);

CREATE INDEX idx_product_custom_values_produto ON product_custom_field_values(produto_id);
CREATE INDEX idx_product_custom_values_field ON product_custom_field_values(custom_field_id);
CREATE INDEX idx_product_custom_values_text ON product_custom_field_values(value_text);
CREATE INDEX idx_product_custom_values_number ON product_custom_field_values(value_number);

-- ============================================================
-- PARTE 3: ATUALIZAR TABELA PRODUTOS (CAMPOS UNIVERSAIS)
-- ============================================================

-- Remover campos específicos de imóveis e manter apenas campos universais
-- Criar coluna de categoria de produto para segmentar tipos

DO $$ 
BEGIN
  -- Adicionar campos universais
  ALTER TABLE produtos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'produto';
  ALTER TABLE produtos ADD COLUMN IF NOT EXISTS subcategoria TEXT;
  ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo_referencia TEXT;
  ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade_medida TEXT DEFAULT 'unidade';
  ALTER TABLE produtos ADD COLUMN IF NOT EXISTS quantidade_estoque NUMERIC;
  ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_custo NUMERIC;
  
  -- Manter campos essenciais que já existem
  -- nome, descricao, preco/price, ativo, destaque, tags, 
  -- capa_url, galeria_urls, arquivo_urls já existem
  
  -- Criar índices para busca e filtros (apenas para campos que certamente existem)
  CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(tenant_id, categoria);
  CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(tenant_id, codigo_referencia);
END $$;

-- ============================================================
-- PARTE 4: FUNÇÕES AUXILIARES
-- ============================================================

-- Função para obter produto com todos os custom fields
CREATE OR REPLACE FUNCTION get_produto_with_custom_fields(p_produto_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_produto JSONB;
  v_custom_fields JSONB;
BEGIN
  -- Buscar produto base
  SELECT to_jsonb(p.*) INTO v_produto
  FROM produtos p
  WHERE p.id = p_produto_id;
  
  IF v_produto IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar custom fields e valores
  SELECT jsonb_object_agg(
    cf.field_key,
    jsonb_build_object(
      'field_id', cf.id,
      'label', cf.field_label,
      'type', cf.field_type,
      'value', COALESCE(
        cfv.value_text,
        cfv.value_number::text,
        cfv.value_boolean::text,
        cfv.value_date::text,
        cfv.value_datetime::text,
        cfv.value_json::text
      ),
      'group', cf.field_group
    )
  ) INTO v_custom_fields
  FROM product_custom_fields cf
  LEFT JOIN product_custom_field_values cfv 
    ON cfv.custom_field_id = cf.id AND cfv.produto_id = p_produto_id
  WHERE cf.tenant_id = (v_produto->>'tenant_id')::UUID
    AND cf.active = true;
  
  -- Combinar produto com custom fields
  RETURN v_produto || jsonb_build_object('custom_fields', COALESCE(v_custom_fields, '{}'::jsonb));
END;
$$;

-- Função para buscar produtos com filtros em custom fields
CREATE OR REPLACE FUNCTION search_produtos_with_custom_filters(
  p_tenant_id UUID,
  p_categoria TEXT DEFAULT NULL,
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  preco NUMERIC,
  categoria TEXT,
  ativo BOOLEAN,
  custom_fields JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nome,
    p.descricao,
    COALESCE(p.preco, p.price) as preco,
    p.categoria,
    COALESCE(p.ativo, true) as ativo,
    (SELECT jsonb_object_agg(
      cf.field_key,
      COALESCE(
        cfv.value_text,
        cfv.value_number::text,
        cfv.value_boolean::text,
        cfv.value_json::text
      )
    )
    FROM product_custom_fields cf
    LEFT JOIN product_custom_field_values cfv 
      ON cfv.custom_field_id = cf.id AND cfv.produto_id = p.id
    WHERE cf.tenant_id = p_tenant_id
      AND cf.active = true
      AND cf.show_in_list = true
    ) as custom_fields
  FROM produtos p
  WHERE p.tenant_id = p_tenant_id
    AND (p_categoria IS NULL OR p.categoria = p_categoria)
    AND COALESCE(p.ativo, true) = true
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================
-- PARTE 5: TRIGGERS PARA UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_custom_fields_updated_at ON product_custom_fields;
CREATE TRIGGER update_product_custom_fields_updated_at
  BEFORE UPDATE ON product_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_custom_field_values_updated_at ON product_custom_field_values;
CREATE TRIGGER update_product_custom_field_values_updated_at
  BEFORE UPDATE ON product_custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PARTE 6: RLS (ROW LEVEL SECURITY)
-- ============================================================

ALTER TABLE product_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_custom_field_values ENABLE ROW LEVEL SECURITY;

-- Políticas para product_custom_fields
DROP POLICY IF EXISTS "Usuários podem ver custom fields do próprio tenant" ON product_custom_fields;
CREATE POLICY "Usuários podem ver custom fields do próprio tenant"
  ON product_custom_fields FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins podem gerenciar custom fields" ON product_custom_fields;
CREATE POLICY "Admins podem gerenciar custom fields"
  ON product_custom_fields FOR ALL
  USING (
    tenant_id IN (
      SELECT m.tenant_id FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'owner')
    )
  );

-- Políticas para product_custom_field_values
DROP POLICY IF EXISTS "Usuários podem ver valores do próprio tenant" ON product_custom_field_values;
CREATE POLICY "Usuários podem ver valores do próprio tenant"
  ON product_custom_field_values FOR SELECT
  USING (
    produto_id IN (
      SELECT id FROM produtos WHERE tenant_id IN (
        SELECT tenant_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Usuários podem gerenciar valores de custom fields" ON product_custom_field_values;
CREATE POLICY "Usuários podem gerenciar valores de custom fields"
  ON product_custom_field_values FOR ALL
  USING (
    produto_id IN (
      SELECT id FROM produtos WHERE tenant_id IN (
        SELECT tenant_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================

COMMENT ON TABLE product_custom_fields IS 'Define campos personalizados que cada tenant pode criar para seus produtos';
COMMENT ON TABLE product_custom_field_values IS 'Armazena os valores dos campos personalizados para cada produto';
COMMENT ON COLUMN product_custom_fields.field_key IS 'Identificador único do campo (snake_case, ex: area_total)';
COMMENT ON COLUMN product_custom_fields.field_type IS 'Tipo do campo que define como será renderizado e validado';
COMMENT ON COLUMN product_custom_fields.field_group IS 'Agrupa campos relacionados na interface (ex: Características, Preços)';
COMMENT ON COLUMN product_custom_fields.show_in_list IS 'Se true, campo aparece nas colunas da listagem de produtos';
COMMENT ON COLUMN product_custom_fields.show_in_filters IS 'Se true, campo fica disponível nos filtros de busca';
