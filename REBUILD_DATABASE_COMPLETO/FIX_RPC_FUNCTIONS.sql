-- =====================================================
-- VERIFICAR E CRIAR FUNÇÕES RPC FALTANTES
-- Execute no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. add_lead_activity
-- Adiciona atividade ao timeline do lead
-- =====================================================

CREATE OR REPLACE FUNCTION add_lead_activity(
  p_lead_id UUID,
  p_tipo TEXT,
  p_conteudo TEXT
)
RETURNS JSON AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_activity_id UUID;
BEGIN
  -- Pegar usuário autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Pegar tenant_id do lead
  SELECT tenant_id INTO v_tenant_id
  FROM clientes
  WHERE id = p_lead_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;

  -- Verificar se usuário tem acesso ao tenant
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id
      AND tenant_id = v_tenant_id
      AND active = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Inserir atividade
  INSERT INTO atividades (
    tenant_id,
    cliente_id,
    user_id,
    tipo,
    conteudo,
    created_at
  ) VALUES (
    v_tenant_id,
    p_lead_id,
    v_user_id,
    p_tipo,
    p_conteudo,
    NOW()
  ) RETURNING id INTO v_activity_id;

  -- Inserir no timeline também
  INSERT INTO lead_timeline (
    tenant_id,
    lead_id,
    user_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    v_tenant_id,
    p_lead_id,
    v_user_id,
    'activity_added',
    json_build_object(
      'tipo', p_tipo,
      'conteudo', p_conteudo,
      'activity_id', v_activity_id
    ),
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'activity_id', v_activity_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao adicionar atividade: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. ensure_default_lead_options
-- Garante que tenant tem origens e motivos padrão
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_default_lead_options(
  p_tenant_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_origins_count INTEGER;
  v_reasons_count INTEGER;
BEGIN
  -- Verificar origens existentes
  SELECT COUNT(*) INTO v_origins_count
  FROM lead_origins
  WHERE tenant_id = p_tenant_id;

  -- Se não tem origens, criar padrões
  IF v_origins_count = 0 THEN
    INSERT INTO lead_origins (tenant_id, name, type, description, is_active)
    VALUES
      (p_tenant_id, 'Site', 'website', 'Lead vindo do site', true),
      (p_tenant_id, 'Facebook', 'social', 'Lead vindo do Facebook', true),
      (p_tenant_id, 'Instagram', 'social', 'Lead vindo do Instagram', true),
      (p_tenant_id, 'WhatsApp', 'messaging', 'Lead vindo do WhatsApp', true),
      (p_tenant_id, 'Indicação', 'referral', 'Lead indicado por cliente', true),
      (p_tenant_id, 'Ligação', 'phone', 'Lead entrou em contato por telefone', true),
      (p_tenant_id, 'Email', 'email', 'Lead entrou em contato por email', true),
      (p_tenant_id, 'Manual', 'manual', 'Lead inserido manualmente', true);
  END IF;

  -- Verificar motivos de perda
  SELECT COUNT(*) INTO v_reasons_count
  FROM lead_loss_reasons
  WHERE tenant_id = p_tenant_id;

  -- Se não tem motivos, criar padrões
  IF v_reasons_count = 0 THEN
    INSERT INTO lead_loss_reasons (tenant_id, category, reason, is_active)
    VALUES
      (p_tenant_id, 'Preço', 'Valor muito alto', true),
      (p_tenant_id, 'Preço', 'Não tem orçamento', true),
      (p_tenant_id, 'Timing', 'Não está pronto para comprar', true),
      (p_tenant_id, 'Timing', 'Mudou de ideia', true),
      (p_tenant_id, 'Concorrência', 'Escolheu concorrente', true),
      (p_tenant_id, 'Produto', 'Produto não atende necessidade', true),
      (p_tenant_id, 'Contato', 'Não responde mais', true),
      (p_tenant_id, 'Contato', 'Contato inválido', true),
      (p_tenant_id, 'Outros', 'Outro motivo', true);
  END IF;

  RETURN json_build_object(
    'success', true,
    'origins_created', (v_origins_count = 0),
    'reasons_created', (v_reasons_count = 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar opções padrão: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. VERIFICAÇÃO
-- =====================================================

-- Testar se funções existem
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('add_lead_activity', 'ensure_default_lead_options')
ORDER BY routine_name;
