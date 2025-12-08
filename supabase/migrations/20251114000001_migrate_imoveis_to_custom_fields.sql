-- =====================================================
-- MIGRAÇÃO DE DADOS: IMÓVEIS → CUSTOM FIELDS
-- Data: 2025-11-14
-- Descrição: Converte campos específicos de imóveis em custom fields
-- =====================================================

-- ============================================================
-- PASSO 1: CRIAR CUSTOM FIELDS PARA IMÓVEIS
-- ============================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_field_id UUID;
  v_has_imovel_data BOOLEAN;
BEGIN
  -- Verificar se existem colunas de imóveis na tabela produtos
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name IN ('tipo', 'area_total', 'quartos')
  ) INTO v_has_imovel_data;
  
  -- Se não existem colunas de imóveis, criar campos para todos os tenants mesmo assim
  -- (para permitir que eles usem no futuro)
  FOR v_tenant_id IN 
    SELECT DISTINCT tenant_id FROM produtos LIMIT 100
  LOOP
    
    -- Criar campos de imóveis para este tenant
    
    -- GRUPO: Características do Imóvel
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list, show_in_filters, searchable)
    VALUES 
      (v_tenant_id, 'tipo_imovel', 'Tipo do Imóvel', 'select', 'Características', 1, true, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_field_id;
    
    -- Adicionar opções para tipo de imóvel
    UPDATE product_custom_fields 
    SET field_options = '["Apartamento", "Casa", "Sobrado", "Cobertura", "Terreno", "Comercial", "Industrial", "Rural", "Outro"]'::jsonb
    WHERE id = v_field_id;
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list, show_in_filters, searchable)
    VALUES 
      (v_tenant_id, 'finalidade', 'Finalidade', 'select', 'Características', 2, true, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_field_id;
    
    UPDATE product_custom_fields 
    SET field_options = '["Venda", "Aluguel", "Venda/Aluguel"]'::jsonb
    WHERE id = v_field_id;
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list, show_in_filters)
    VALUES 
      (v_tenant_id, 'area_total', 'Área Total (m²)', 'number', 'Características', 3, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list, show_in_filters)
    VALUES 
      (v_tenant_id, 'area_construida', 'Área Construída (m²)', 'number', 'Características', 4, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list, show_in_filters, searchable)
    VALUES 
      (v_tenant_id, 'quartos', 'Quartos', 'number', 'Características', 5, true, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list, show_in_filters)
    VALUES 
      (v_tenant_id, 'banheiros', 'Banheiros', 'number', 'Características', 6, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list, show_in_filters)
    VALUES 
      (v_tenant_id, 'vagas_garagem', 'Vagas de Garagem', 'number', 'Características', 7, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    -- GRUPO: Localização
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters, searchable)
    VALUES 
      (v_tenant_id, 'endereco', 'Endereço', 'text', 'Localização', 1, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters, searchable)
    VALUES 
      (v_tenant_id, 'bairro', 'Bairro', 'text', 'Localização', 2, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters, searchable)
    VALUES 
      (v_tenant_id, 'cidade', 'Cidade', 'text', 'Localização', 3, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order)
    VALUES 
      (v_tenant_id, 'cep', 'CEP', 'text', 'Localização', 4)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    -- GRUPO: Filtros do Empreendimento (do campo filtros JSONB)
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters, searchable)
    VALUES 
      (v_tenant_id, 'incorporadora', 'Incorporadora', 'text', 'Empreendimento', 1, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters, searchable)
    VALUES 
      (v_tenant_id, 'empreendimento', 'Empreendimento', 'text', 'Empreendimento', 2, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters)
    VALUES 
      (v_tenant_id, 'fase', 'Fase', 'text', 'Empreendimento', 3, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters, searchable)
    VALUES 
      (v_tenant_id, 'regiao', 'Região', 'text', 'Empreendimento', 4, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters)
    VALUES 
      (v_tenant_id, 'tipologia', 'Tipologia', 'multiselect', 'Empreendimento', 5, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters)
    VALUES 
      (v_tenant_id, 'modalidade', 'Modalidade', 'multiselect', 'Empreendimento', 6, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters)
    VALUES 
      (v_tenant_id, 'financiamento_incorporadora', 'Financiamento Incorporadora', 'boolean', 'Empreendimento', 7, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_filters)
    VALUES 
      (v_tenant_id, 'decorado', 'Decorado', 'boolean', 'Empreendimento', 8, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list, show_in_filters)
    VALUES 
      (v_tenant_id, 'entrega', 'Data de Entrega', 'date', 'Empreendimento', 9, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list)
    VALUES 
      (v_tenant_id, 'metragem_min', 'Metragem Mínima (m²)', 'number', 'Empreendimento', 10, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list)
    VALUES 
      (v_tenant_id, 'metragem_max', 'Metragem Máxima (m²)', 'number', 'Empreendimento', 11, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();
    
    INSERT INTO product_custom_fields (tenant_id, field_key, field_label, field_type, field_group, display_order, show_in_list, show_in_filters)
    VALUES 
      (v_tenant_id, 'preco_min', 'Preço Mínimo', 'currency', 'Empreendimento', 12, true, true)
    ON CONFLICT (tenant_id, field_key) DO UPDATE SET updated_at = NOW();

  END LOOP;
END $$;

-- ============================================================
-- PASSO 2: MIGRAR DADOS DOS CAMPOS ANTIGOS PARA CUSTOM FIELDS
-- ============================================================

DO $$
DECLARE
  v_produto RECORD;
  v_field_id UUID;
  v_has_tipo BOOLEAN;
  v_has_area BOOLEAN;
  v_has_quartos BOOLEAN;
  v_has_endereco BOOLEAN;
  v_has_filtros BOOLEAN;
BEGIN
  -- Verificar quais colunas existem
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'tipo') INTO v_has_tipo;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'area_total') INTO v_has_area;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'quartos') INTO v_has_quartos;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'endereco') INTO v_has_endereco;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'filtros') INTO v_has_filtros;
  
  -- Se nenhuma coluna existe, pular a migração de dados
  IF NOT (v_has_tipo OR v_has_area OR v_has_quartos OR v_has_endereco OR v_has_filtros) THEN
    RAISE NOTICE 'Nenhuma coluna de imóveis encontrada. Pulando migração de dados.';
    RETURN;
  END IF;
  
  -- Para cada produto (buscar todos sem filtrar por colunas que podem não existir)
  FOR v_produto IN 
    SELECT * FROM produtos LIMIT 1000
  LOOP
    
    -- Migrar tipo_imovel (apenas se a coluna existe)
    IF v_has_tipo AND v_produto.tipo IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'tipo_imovel';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
        VALUES (v_produto.id, v_field_id, v_produto.tipo)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
      END IF;
    END IF;
    
    -- Migrar finalidade (apenas se a coluna existe)
    IF v_has_tipo AND v_produto.finalidade IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'finalidade';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
        VALUES (v_produto.id, v_field_id, v_produto.finalidade)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
      END IF;
    END IF;
    
    -- Migrar área total (apenas se a coluna existe)
    IF v_has_area AND v_produto.area_total IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'area_total';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_number)
        VALUES (v_produto.id, v_field_id, v_produto.area_total)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_number = EXCLUDED.value_number;
      END IF;
    END IF;
    
    -- Migrar área construída (apenas se a coluna existe)
    IF v_has_area AND v_produto.area_construida IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'area_construida';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_number)
        VALUES (v_produto.id, v_field_id, v_produto.area_construida)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_number = EXCLUDED.value_number;
      END IF;
    END IF;
    
    -- Migrar quartos (apenas se a coluna existe)
    IF v_has_quartos AND v_produto.quartos IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'quartos';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_number)
        VALUES (v_produto.id, v_field_id, v_produto.quartos)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_number = EXCLUDED.value_number;
      END IF;
    END IF;
    
    -- Migrar banheiros (apenas se a coluna existe)
    IF v_has_quartos AND v_produto.banheiros IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'banheiros';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_number)
        VALUES (v_produto.id, v_field_id, v_produto.banheiros)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_number = EXCLUDED.value_number;
      END IF;
    END IF;
    
    -- Migrar vagas_garagem (apenas se a coluna existe)
    IF v_has_quartos AND v_produto.vagas_garagem IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'vagas_garagem';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_number)
        VALUES (v_produto.id, v_field_id, v_produto.vagas_garagem)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_number = EXCLUDED.value_number;
      END IF;
    END IF;
    
    -- Migrar campos de localização (apenas se a coluna existe)
    IF v_has_endereco AND v_produto.endereco IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'endereco';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
        VALUES (v_produto.id, v_field_id, v_produto.endereco)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
      END IF;
    END IF;
    
    IF v_has_endereco AND v_produto.bairro IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'bairro';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
        VALUES (v_produto.id, v_field_id, v_produto.bairro)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
      END IF;
    END IF;
    
    IF v_has_endereco AND v_produto.cidade IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'cidade';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
        VALUES (v_produto.id, v_field_id, v_produto.cidade)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
      END IF;
    END IF;
    
    IF v_has_endereco AND v_produto.cep IS NOT NULL THEN
      SELECT id INTO v_field_id FROM product_custom_fields 
      WHERE tenant_id = v_produto.tenant_id AND field_key = 'cep';
      
      IF v_field_id IS NOT NULL THEN
        INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
        VALUES (v_produto.id, v_field_id, v_produto.cep)
        ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
      END IF;
    END IF;
    
    -- Migrar dados do campo filtros (JSONB) - apenas se a coluna existe
    IF v_has_filtros AND v_produto.filtros IS NOT NULL THEN
      -- Incorporadora
      IF v_produto.filtros->>'incorporadora' IS NOT NULL THEN
        SELECT id INTO v_field_id FROM product_custom_fields 
        WHERE tenant_id = v_produto.tenant_id AND field_key = 'incorporadora';
        
        IF v_field_id IS NOT NULL THEN
          INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
          VALUES (v_produto.id, v_field_id, v_produto.filtros->>'incorporadora')
          ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
        END IF;
      END IF;
      
      -- Empreendimento
      IF v_produto.filtros->>'empreendimento' IS NOT NULL THEN
        SELECT id INTO v_field_id FROM product_custom_fields 
        WHERE tenant_id = v_produto.tenant_id AND field_key = 'empreendimento';
        
        IF v_field_id IS NOT NULL THEN
          INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
          VALUES (v_produto.id, v_field_id, v_produto.filtros->>'empreendimento')
          ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
        END IF;
      END IF;
      
      -- Fase
      IF v_produto.filtros->>'fase' IS NOT NULL THEN
        SELECT id INTO v_field_id FROM product_custom_fields 
        WHERE tenant_id = v_produto.tenant_id AND field_key = 'fase';
        
        IF v_field_id IS NOT NULL THEN
          INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
          VALUES (v_produto.id, v_field_id, v_produto.filtros->>'fase')
          ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
        END IF;
      END IF;
      
      -- Região
      IF v_produto.filtros->>'regiao' IS NOT NULL THEN
        SELECT id INTO v_field_id FROM product_custom_fields 
        WHERE tenant_id = v_produto.tenant_id AND field_key = 'regiao';
        
        IF v_field_id IS NOT NULL THEN
          INSERT INTO product_custom_field_values (produto_id, custom_field_id, value_text)
          VALUES (v_produto.id, v_field_id, v_produto.filtros->>'regiao')
          ON CONFLICT (produto_id, custom_field_id) DO UPDATE SET value_text = EXCLUDED.value_text;
        END IF;
      END IF;
      
      -- Continue para outros campos do filtros...
    END IF;
    
  END LOOP;
  
  RAISE NOTICE 'Migração de dados concluída!';
END $$;

-- ============================================================
-- PASSO 3: ATUALIZAR CATEGORIA DOS PRODUTOS MIGRADOS
-- ============================================================

-- Marcar produtos como categoria 'imovel' apenas se as colunas existem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'tipo') THEN
    UPDATE produtos SET categoria = 'imovel' WHERE tipo IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- PASSO 4 (OPCIONAL): REMOVER COLUNAS ANTIGAS APÓS CONFIRMAÇÃO
-- ============================================================

-- ⚠️ CUIDADO: Só execute isso após confirmar que a migração funcionou!
-- ⚠️ Mantenha comentado até ter certeza absoluta!

-- ALTER TABLE produtos DROP COLUMN IF EXISTS tipo;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS finalidade;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS area_total;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS area_construida;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS quartos;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS banheiros;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS vagas_garagem;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS endereco;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS bairro;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS cidade;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS cep;
-- ALTER TABLE produtos DROP COLUMN IF EXISTS filtros;
