-- =============================================================================
-- FUNÇÕES RPC PARA SUPER ADMIN (VERSÃO SIMPLIFICADA)
-- Execute este SQL no Supabase SQL Editor
-- =============================================================================

-- Dropar funções antigas
DROP FUNCTION IF EXISTS get_all_subscriptions();
DROP FUNCTION IF EXISTS get_all_profiles();
DROP FUNCTION IF EXISTS get_all_memberships();
DROP FUNCTION IF EXISTS get_all_tenants();

-- Função para buscar TODAS as subscriptions
CREATE OR REPLACE FUNCTION get_all_subscriptions()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', sub.id,
        'user_id', sub.user_id,
        'tenant_id', sub.tenant_id,
        'plan_id', sub.plan_id,
        'stripe_customer_id', sub.stripe_customer_id,
        'stripe_subscription_id', sub.stripe_subscription_id,
        'stripe_price_id', sub.stripe_price_id,
        'status', sub.status,
        'current_period_start', sub.current_period_start,
        'current_period_end', sub.current_period_end,
        'trial_start', sub.trial_start,
        'trial_end', sub.trial_end,
        'cancel_at', sub.cancel_at,
        'canceled_at', sub.canceled_at,
        'ended_at', sub.ended_at,
        'created_at', sub.created_at,
        'updated_at', sub.updated_at,
        'provider', sub.provider
      )
      ORDER BY sub.created_at DESC
    ),
    '[]'::json
  )
  FROM subscriptions sub
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.email = 'ramonexecut@gmail.com'
  );
$$;

-- Função para buscar TODOS os profiles
CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'full_name', p.full_name,
        'phone', p.phone,
        'avatar_url', p.avatar_url,
        'default_tenant_id', p.default_tenant_id,
        'disabled', p.disabled,
        'profile_completed', p.profile_completed,
        'onboarding_completed', p.onboarding_completed,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
      ORDER BY p.created_at DESC
    ),
    '[]'::json
  )
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.email = 'ramonexecut@gmail.com'
  );
$$;

-- Função para buscar TODOS os memberships
CREATE OR REPLACE FUNCTION get_all_memberships()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', m.id,
        'tenant_id', m.tenant_id,
        'user_id', m.user_id,
        'role', m.role,
        'active', m.active,
        'receive_meta_leads', m.receive_meta_leads,
        'created_at', m.created_at,
        'updated_at', m.updated_at
      )
      ORDER BY m.created_at DESC
    ),
    '[]'::json
  )
  FROM memberships m
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.email = 'ramonexecut@gmail.com'
  );
$$;

-- Função para buscar TODOS os tenants
CREATE OR REPLACE FUNCTION get_all_tenants()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', t.id,
        'name', t.name,
        'descricao', t.descricao,
        'slogan', t.slogan,
        'logo_url', t.logo_url,
        'join_code', t.join_code,
        'ativa', t.ativa,
        'meta_leads_distribution_enabled', t.meta_leads_distribution_enabled,
        'meta_leads', t.meta_leads,
        'meta_vendas', t.meta_vendas,
        'default_currency', t.default_currency,
        'created_at', t.created_at,
        'updated_at', t.updated_at
      )
      ORDER BY t.created_at DESC
    ),
    '[]'::json
  )
  FROM tenants t
  WHERE EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.email = 'ramonexecut@gmail.com'
  );
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_all_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_memberships() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_tenants() TO authenticated;
