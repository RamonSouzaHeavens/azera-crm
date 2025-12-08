-- ==============================================================================
-- CORREÇÃO DE SEGURANÇA CRÍTICA - AZERA CRM
-- Data: 30/11/2025
-- Descrição: Protege funções RPC contra acesso indevido entre tenants (IDOR),
--            mas MANTÉM o acesso legítimo para membros da mesma equipe.
-- ==============================================================================

-- 1. Função de Busca de Produtos (Protegida)
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
SECURITY DEFINER -- Roda com permissão total, por isso a validação abaixo é VITAL
AS $$
BEGIN
  -- 🛡️ VALIDAÇÃO DE SEGURANÇA (A "Trava")
  -- Verifica se o usuário que chamou a função (auth.uid())
  -- realmente faz parte do tenant solicitado (p_tenant_id).
  -- Isso permite Owners e Membros verem os dados, mas bloqueia estranhos.
  IF NOT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND active = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Você não é membro desta organização.';
  END IF;

  -- Se passou na validação, executa a query normalmente
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

-- 2. Função de Detalhes do Produto (Protegida)
CREATE OR REPLACE FUNCTION get_produto_with_custom_fields(p_produto_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_produto JSONB;
  v_custom_fields JSONB;
  v_product_tenant_id UUID;
BEGIN
  -- Busca o tenant_id do produto primeiro
  SELECT tenant_id INTO v_product_tenant_id
  FROM produtos
  WHERE id = p_produto_id;

  -- Se o produto não existe, retorna nulo
  IF v_product_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 🛡️ VALIDAÇÃO DE SEGURANÇA
  -- Verifica se o usuário logado pertence ao tenant DONO deste produto
  IF NOT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = auth.uid()
      AND tenant_id = v_product_tenant_id
      AND active = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Você não tem permissão para visualizar este produto.';
  END IF;

  -- Busca produto base
  SELECT to_jsonb(p.*) INTO v_produto
  FROM produtos p
  WHERE p.id = p_produto_id;

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

-- 3. GARANTIA DE RLS NAS TABELAS PRINCIPAIS (Caso não esteja ativado)
-- Isso impede que alguém baixe o banco todo via API direta, fora das funções acima.

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

-- Política para Produtos: Membros veem produtos do seu tenant
DROP POLICY IF EXISTS "Membros veem produtos do tenant" ON produtos;
CREATE POLICY "Membros veem produtos do tenant" ON produtos
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM memberships
    WHERE user_id = auth.uid() AND active = true
  )
);

-- Política para Clientes (Leads): Membros veem leads do seu tenant
DROP POLICY IF EXISTS "Membros veem leads do tenant" ON clientes;
CREATE POLICY "Membros veem leads do tenant" ON clientes
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM memberships
    WHERE user_id = auth.uid() AND active = true
  )
);

-- Política para Vendas: Membros veem vendas do seu tenant
DROP POLICY IF EXISTS "Membros veem vendas do tenant" ON vendas;
CREATE POLICY "Membros veem vendas do tenant" ON vendas
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM memberships
    WHERE user_id = auth.uid() AND active = true
  )
);
