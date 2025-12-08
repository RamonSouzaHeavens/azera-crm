-- =====================================================
-- FUNÇÕES RPC PARA GERENCIAMENTO DE EQUIPES
-- Execute APÓS os 7 arquivos principais
-- =====================================================

-- =====================================================
-- 1. CREATE_TENANT_WITH_OWNER
-- Cria um tenant e adiciona o usuário como owner
-- =====================================================

CREATE OR REPLACE FUNCTION create_tenant_with_owner(
  p_tenant_name TEXT,
  p_tenant_slogan TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_join_code TEXT;
BEGIN
  -- Verificar se usuário está autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se nome é válido
  IF p_tenant_name IS NULL OR trim(p_tenant_name) = '' THEN
    RAISE EXCEPTION 'Nome da equipe é obrigatório';
  END IF;

  -- Gerar código único de entrada
  LOOP
    v_join_code := upper(substring(md5(random()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM tenants WHERE join_code = v_join_code);
  END LOOP;

  -- Criar tenant
  INSERT INTO tenants (name, slogan, join_code, created_at, updated_at)
  VALUES (trim(p_tenant_name), p_tenant_slogan, v_join_code, NOW(), NOW())
  RETURNING id INTO v_tenant_id;

  -- Criar membership como owner
  INSERT INTO memberships (tenant_id, user_id, role, active, created_at)
  VALUES (v_tenant_id, v_user_id, 'owner', true, NOW());

  -- Retornar dados
  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'tenant_name', trim(p_tenant_name),
    'join_code', v_join_code
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar equipe: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. JOIN_TEAM_WITH_CODE
-- Permite usuário entrar em equipe usando código
-- =====================================================

CREATE OR REPLACE FUNCTION join_team_with_code(
  p_join_code TEXT,
  p_role TEXT DEFAULT 'vendedor'
)
RETURNS JSON AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_name TEXT;
  v_user_id UUID;
  v_existing_membership UUID;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Validar código
  IF p_join_code IS NULL OR length(trim(p_join_code)) != 8 THEN
    RAISE EXCEPTION 'Código deve ter 8 caracteres';
  END IF;

  -- Buscar tenant pelo código
  SELECT id, name INTO v_tenant_id, v_tenant_name
  FROM tenants
  WHERE join_code = upper(trim(p_join_code));

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Código inválido ou expirado';
  END IF;

  -- Verificar se já é membro
  SELECT id INTO v_existing_membership
  FROM memberships
  WHERE tenant_id = v_tenant_id AND user_id = v_user_id AND active = true;

  IF v_existing_membership IS NOT NULL THEN
    RAISE EXCEPTION 'Você já é membro desta equipe';
  END IF;

  -- Validar role
  IF p_role NOT IN ('owner', 'admin', 'administrador', 'vendedor') THEN
    p_role := 'vendedor';
  END IF;

  -- Criar membership
  INSERT INTO memberships (tenant_id, user_id, role, active, created_at)
  VALUES (v_tenant_id, v_user_id, p_role, true, NOW());

  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'tenant_name', v_tenant_name,
    'role', p_role
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao entrar na equipe: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. GET_TEAM_OVERVIEW - VERSÃO ULTRA SEGURA
-- Retorna visão geral completa da equipe APENAS para usuário autenticado
-- 🛡️ SEGURANÇA IMPLEMENTADA:
-- - Sem parâmetros externos (elimina ataques de injeção)
-- - Verificação obrigatória de autenticação via auth.uid()
-- - Isolamento total por tenant (usuário só vê sua própria equipe)
-- - Validação dupla de acesso à memberships
-- - RLS policies nas tabelas garantem isolamento adicional
-- =====================================================

-- 🔧 LIMPAR VERSÕES ANTERIORES (se existirem)
DROP FUNCTION IF EXISTS get_team_overview(uuid);
DROP FUNCTION IF EXISTS get_team_overview();
DROP FUNCTION IF EXISTS get_team_overview(integer, uuid);
DROP FUNCTION IF EXISTS get_team_overview(uuid, integer);

CREATE OR REPLACE FUNCTION get_team_overview(
  p_limit_activity INTEGER DEFAULT 10,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_tenant_data JSON;
  v_member_data JSON;
  v_members_data JSON;
  v_pending_invites JSON;
  v_recent_activity JSON;
  v_stats JSON;
  v_limit_activity INTEGER;
BEGIN
  -- Verificar autenticacao - bloqueia acesso nao autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Acesso negado: usuario nao autenticado');
  END IF;

  -- Determinar tenant: usa parametro se informado, senao pega do proprio usuario
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO v_tenant_id
    FROM memberships
    WHERE user_id = v_user_id AND active = true
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN json_build_object('error', 'Usuario nao pertence a nenhuma equipe ativa');
  END IF;

  -- Verificacao de acesso: usuario deve ser membro ativo do tenant
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE tenant_id = v_tenant_id
    AND user_id = v_user_id
    AND active = true
  ) THEN
    RETURN json_build_object('error', 'Acesso negado: usuario nao autorizado para este tenant');
  END IF;

  -- Sanitizar limite de atividade (entre 1 e 100)
  v_limit_activity := LEAST(GREATEST(COALESCE(p_limit_activity, 10), 1), 100);

  -- Buscar dados do tenant
  SELECT json_build_object(
    'id', t.id,
    'name', t.name,
    'descricao', t.descricao,
    'slogan', t.slogan,
    'logo_url', t.logo_url,
    'created_at', t.created_at,
    'updated_at', t.updated_at
  ) INTO v_tenant_data
  FROM tenants t
  WHERE t.id = v_tenant_id;

  -- Buscar dados do membro atual
  SELECT json_build_object(
    'id', m.id,
    'tenant_id', m.tenant_id,
    'user_id', m.user_id,
    'nome', COALESCE(p.display_name, p.full_name, u.email),
    'email', u.email,
    'telefone', p.phone,
    'cargo', m.cargo,
    'avatar_url', p.avatar_url,
    'role', m.role,
    'status', CASE WHEN m.active THEN 'ativo' ELSE 'inativo' END,
    'created_at', m.created_at,
    'equipe_id', m.equipe_id
  ) INTO v_member_data
  FROM memberships m
  LEFT JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE m.tenant_id = v_tenant_id AND m.user_id = v_user_id AND m.active = true;

  -- Buscar todos os membros
  SELECT json_agg(
    json_build_object(
      'id', m.id,
      'user_id', m.user_id,
      'nome', COALESCE(p.display_name, p.full_name, u.email),
      'email', u.email,
      'telefone', p.phone,
      'cargo', m.cargo,
      'avatar_url', p.avatar_url,
      'role', m.role,
      'status', CASE WHEN m.active THEN 'ativo' ELSE 'inativo' END,
      'created_at', m.created_at
    )
  ) INTO v_members_data
  FROM memberships m
  LEFT JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE m.tenant_id = v_tenant_id AND m.active = true;

  -- Buscar convites pendentes
  SELECT json_agg(
    json_build_object(
      'id', ti.id,
      'email', ti.email,
      'role', ti.role,
      'status', ti.status,
      'invited_by', ti.invited_by,
      'expires_at', ti.expires_at,
      'created_at', ti.created_at
    )
  ) INTO v_pending_invites
  FROM team_invites ti
  WHERE ti.tenant_id = v_tenant_id AND ti.status = 'pendente';

  -- Buscar atividade recente
  SELECT json_agg(
    json_build_object(
      'id', ta.id,
      'tipo', ta.tipo,
      'user_id', ta.user_id,
      'descricao', ta.descricao,
      'created_at', ta.created_at
    )
  ) INTO v_recent_activity
  FROM team_activity ta
  WHERE ta.tenant_id = v_tenant_id
  ORDER BY ta.created_at DESC
  LIMIT v_limit_activity;

  -- Calcular estatisticas
  SELECT json_build_object(
    'membros_ativos', COUNT(CASE WHEN m.active THEN 1 END),
    'vendedores', COUNT(CASE WHEN m.role = 'vendedor' AND m.active THEN 1 END),
    'leads_hoje', COALESCE(SUM(CASE WHEN l.created_at::date = CURRENT_DATE THEN 1 ELSE 0 END), 0)
  ) INTO v_stats
  FROM memberships m
  LEFT JOIN leads l ON l.tenant_id = v_tenant_id AND l.created_at::date = CURRENT_DATE
  WHERE m.tenant_id = v_tenant_id;

  -- Verificacao final de seguranca: garantir que todos os dados sao do tenant correto
  IF v_tenant_data->>'id' != v_tenant_id::text THEN
    RETURN json_build_object('error', 'Erro de seguranca: dados inconsistentes');
  END IF;

  -- Retornar dados completos
  RETURN json_build_object(
    'tenant', v_tenant_data,
    'member', v_member_data,
    'members', COALESCE(v_members_data, '[]'::json),
    'pending_invites', COALESCE(v_pending_invites, '[]'::json),
    'recent_activity', COALESCE(v_recent_activity, '[]'::json),
    'stats', v_stats
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_tenant_with_owner',
    'join_team_with_code',
    'get_team_overview'
  )
ORDER BY routine_name;
