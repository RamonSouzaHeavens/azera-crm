-- =====================================================
-- FIX: Corrigir get_team_overview - usar schema correto
-- Problema: Colunas (nome, email, telefone, cargo, status) não existem em memberships
-- Solução: Buscar dados de profiles + memberships
-- =====================================================

-- Remover todas as versões
DROP FUNCTION IF EXISTS get_team_overview();
DROP FUNCTION IF EXISTS get_team_overview(integer);
DROP FUNCTION IF EXISTS get_team_overview(integer, uuid);
DROP FUNCTION IF EXISTS get_team_overview(uuid);
DROP FUNCTION IF EXISTS get_team_overview(uuid, integer);

-- Criar função corrigida usando schema real
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
BEGIN
  -- Verificar autenticacao
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Acesso negado: usuario nao autenticado');
  END IF;

  -- Determinar tenant
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO v_tenant_id
    FROM memberships
    WHERE user_id = v_user_id AND active = true
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN json_build_object('error', 'Voce nao faz parte de nenhuma equipe');
  END IF;

  -- Verificar se usuario pertence ao tenant
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE tenant_id = v_tenant_id
      AND user_id = v_user_id
      AND active = true
  ) THEN
    RETURN json_build_object('error', 'Acesso negado: voce nao pertence a esta equipe');
  END IF;

  -- Buscar dados do tenant
  SELECT json_build_object(
    'id', t.id,
    'name', t.name,
    'descricao', t.descricao,
    'slogan', t.slogan,
    'logo_url', t.logo_url,
    'join_code', t.join_code,
    'created_at', t.created_at,
    'updated_at', t.updated_at
  ) INTO v_tenant_data
  FROM tenants t
  WHERE t.id = v_tenant_id;

  -- Buscar dados do membro atual (usando profiles para nome/avatar/telefone)
  SELECT json_build_object(
    'id', m.id,
    'tenant_id', m.tenant_id,
    'user_id', m.user_id,
    'nome', COALESCE(p.display_name, p.full_name, ''),
    'email', au.email,
    'telefone', p.phone,
    'cargo', NULL,
    'avatar_url', p.avatar_url,
    'role', m.role,
    'status', 'ativo',
    'created_at', m.created_at,
    'equipe_id', NULL
  ) INTO v_member_data
  FROM memberships m
  LEFT JOIN profiles p ON p.id = m.user_id
  LEFT JOIN auth.users au ON au.id = m.user_id
  WHERE m.tenant_id = v_tenant_id
    AND m.user_id = v_user_id
    AND m.active = true;

  -- Buscar todos os membros
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', m.id,
      'user_id', m.user_id,
      'nome', COALESCE(p.display_name, p.full_name, ''),
      'email', au.email,
      'telefone', p.phone,
      'cargo', NULL,
      'avatar_url', p.avatar_url,
      'role', m.role,
      'status', 'ativo',
      'created_at', m.created_at
    ) ORDER BY m.created_at DESC
  ), '[]'::json) INTO v_members_data
  FROM memberships m
  LEFT JOIN profiles p ON p.id = m.user_id
  LEFT JOIN auth.users au ON au.id = m.user_id
  WHERE m.tenant_id = v_tenant_id
    AND m.active = true;

  -- Buscar convites pendentes
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', ti.id,
      'email', ti.email,
      'role', ti.role,
      'status', ti.status,
      'invited_by', ti.invited_by,
      'expires_at', ti.expires_at,
      'created_at', ti.created_at
    ) ORDER BY ti.created_at DESC
  ), '[]'::json) INTO v_pending_invites
  FROM team_invites ti
  WHERE ti.tenant_id = v_tenant_id
    AND ti.status IN ('pendente', 'pending');

  -- Atividade recente não existe no schema atual - retornar array vazio
  v_recent_activity := '[]'::json;

  -- Calcular estatísticas
  SELECT json_build_object(
    'membros_ativos', (
      SELECT COUNT(*) FROM memberships
      WHERE tenant_id = v_tenant_id
        AND active = true
    ),
    'vendedores', (
      SELECT COUNT(*) FROM memberships
      WHERE tenant_id = v_tenant_id
        AND active = true
        AND role = 'vendedor'
    ),
    'leads_hoje', (
      SELECT COUNT(*) FROM clientes
      WHERE tenant_id = v_tenant_id
        AND DATE(created_at) = CURRENT_DATE
    )
  ) INTO v_stats;

  -- Retornar resultado completo
  RETURN json_build_object(
    'tenant', v_tenant_data,
    'member', v_member_data,
    'members', v_members_data,
    'pending_invites', v_pending_invites,
    'recent_activity', v_recent_activity,
    'stats', v_stats
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', format('Erro interno: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões (somente usuários autenticados)
GRANT EXECUTE ON FUNCTION get_team_overview(integer, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION get_team_overview(integer, uuid) FROM anon;

DO $$
BEGIN
  RAISE NOTICE 'Função get_team_overview corrigida e recriada com sucesso!';
END $$;
