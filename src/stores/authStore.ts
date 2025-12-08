// src/stores/authStore.ts
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/* =========================
   Tipos (sem any)
   ========================= */
type UUID = string;

export interface Tenant {
  id: UUID;
  name: string;
  created_at: string; // timestamptz ISO
}

export type RoleType = 'owner' | 'admin' | 'administrador' | 'vendedor';

export interface Membership {
  id: UUID;
  tenant_id: UUID;
  user_id: UUID;
  equipe_id?: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string | null;
  avatar_url: string | null;
  role: RoleType;
  status: 'pendente' | 'ativo' | 'inativo';
  created_at: string;
}

export interface MembershipWithTenant extends Membership {
  tenants: Tenant;
}

export interface ProfileRow {
  id: UUID;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  default_tenant_id: UUID | null;
  disabled?: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  member: Membership | null;
  tenant: Tenant | null;
  profile: ProfileRow | null;
  loading: boolean;
  isAdmin: boolean;
  hasTenant: boolean;

  setUser: (user: User | null) => void;
  setMember: (member: Membership | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setProfile: (profile: ProfileRow | null) => void;
  setLoading: (loading: boolean) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setHasTenant: (hasTenant: boolean) => void;

  loadSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, tenantName: string, personalEmail?: string, telefone?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/* =========================
   Helpers
   ========================= */

// Função para criar usuário admin fake
function getFakeAdmin(): User {
  return {
    id: 'admin-demo',
    email: 'admin@sistema.com',
    app_metadata: {},
    user_metadata: { name: 'Administrador' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    identities: [],
    last_sign_in_at: new Date().toISOString(),
    factors: [],
  };
}

async function getMembershipWithTenantByUserId(userId: UUID, userEmail?: string): Promise<{
  member: Membership | null;
  tenant: Tenant | null;
}> {
  // Buscar membership (relaciona user com tenant)
  const { data: membership, error: membershipErr } = await supabase
    .from('memberships')
    .select('tenant_id, user_id, role, created_at, active')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (membershipErr) {
    throw membershipErr;
  }

  if (!membership) {
    return { member: null, tenant: null };
  }

  // Buscar dados do profile (nome, avatar, etc) da tabela profiles
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, phone')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr && profileErr.code !== 'PGRST116') {
    // Não falha se perfil não existir, apenas continua
  }

  // Buscar tenant com maybeSingle para não falhar se RLS bloquear
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, created_at, slogan')
    .eq('id', membership.tenant_id)
    .maybeSingle();

  // Apenas lançar erro se não for o erro esperado de RLS
  if (tenantErr && tenantErr.code !== 'PGRST116') throw tenantErr;

  // Se não conseguiu buscar via RLS, criar objeto básico do tenant
  const finalTenant = tenant || {
    id: membership.tenant_id,
    name: 'Minha Equipe',
    created_at: new Date().toISOString(),
    slogan: null
  };

  // Montar o objeto member com os dados disponíveis
  const member: Membership = {
    id: userId,
    tenant_id: membership.tenant_id,
    user_id: membership.user_id,
    nome: profileData?.display_name || '',
    email: userEmail || '',
    telefone: profileData?.phone || null,
    cargo: null,
    avatar_url: profileData?.avatar_url || null,
    role: membership.role as RoleType,
    status: 'ativo' as const,
    created_at: membership.created_at,
    equipe_id: null,
  };

  return { member, tenant: finalTenant };
}

// REMOVIDA: não é mais usada (estava em ensureTenantForUser)
// async function getProfileDefaultTenantId(userId: UUID): Promise<UUID | null>

// Função para carregar o perfil completo do usuário
async function loadUserProfile(userId: UUID): Promise<ProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, phone, default_tenant_id, created_at, disabled')
      .eq('id', userId)
      .maybeSingle()
      .returns<ProfileRow | null>();

    if (error) {
      return null;
    }

    if (data?.avatar_url?.startsWith('blob:')) {
      data.avatar_url = null;
    }

    return data ?? null;
  } catch {
    return null;
  }
}

// REMOVIDA: ensureProfile não é mais necessária
// O trigger do banco (migration 009) cria automaticamente profiles
// quando um novo usuário é criado no auth.users

// Helper function to create or update user profile with personal data
async function createOrUpdateUserProfile(
  user: User,
  name: string,
  _personalEmail?: string,
  telefone?: string
) {
  try {
    // Aguardar trigger do banco criar registros (500ms para garantir)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Usar UPSERT para profiles (mais seguro)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: name.trim() || null,
        phone: telefone || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      // Não falhar - profile pode já existir via trigger
    }
  } catch {
    // Não propagar erro - perfis podem ser criados via trigger
  }
}

// Função que apenas verifica membership existente (não cria automaticamente)
async function checkExistingMembership(
  user: User
): Promise<{ member: Membership | null; tenant: Tenant | null }> {
  // 1) tenta pegar membership+tenant existente
  const { member, tenant } = await getMembershipWithTenantByUserId(user.id, user.email || '');
  if (member && tenant) {
    return { member, tenant };
  }

  return { member: null, tenant: null };
}

// REMOVIDA: função ensureTenantForUser não é mais usada
// Usuários agora devem entrar em equipes via convites, não criar automaticamente

/* =========================
   Sincronização de Assinatura Stripe
   ========================= */

// Sincroniza a assinatura do Stripe com o Supabase quando o usuário carrega
async function syncStripeSubscription(userId: UUID): Promise<void> {
  try {
    // Chamar uma função serverless que vai verificar no Stripe
    const { error } = await supabase.functions.invoke('stripe-sync-subscription', {
      body: { userId }
    });

    if (error) {
      return;
    }
  } catch {
    // Não bloqueia o login se a sincronização falhar
  }
}

/* =========================
   Store
   ========================= */

// Flag para evitar múltiplas execuções simultâneas de loadSession
let isLoadingSession = false;
let loadSessionPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  member: null,
  tenant: null,
  profile: null,
  loading: true,
  isAdmin: false,
  hasTenant: false,

  setUser: (user) => set({ user }),
  setMember: (member) => set({ member, hasTenant: !!member?.tenant_id }),
  setTenant: (tenant) => set({ tenant, hasTenant: !!tenant }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setHasTenant: (hasTenant) => set({ hasTenant }),

  loadSession: async () => {
    // Se já está carregando, retorna a promise existente
    if (isLoadingSession && loadSessionPromise) {
      return loadSessionPromise;
    }

    isLoadingSession = true;
    set({ loading: true });
    try {
      // Proteção: algumas vezes a chamada ao Supabase pode ficar pendente (rede/CORS/config).
      // Usamos um timeout para garantir que não fiquemos presos no carregamento.
      const getSessionWithTimeout = (ms = 3000) =>
        Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SUPABASE_SESSION_TIMEOUT')), ms)),
        ]);

      let sessionResult;
      try {
        sessionResult = await getSessionWithTimeout();
      } catch (timeoutErr) {
        console.error('❌ supabase.auth.getSession timeout or error:', timeoutErr);
        set({ user: null, member: null, tenant: null, profile: null, isAdmin: false, hasTenant: false, loading: false });
        return;
      }

      const { data, error } = sessionResult as Awaited<ReturnType<typeof supabase.auth.getSession>>;

      if (error) {
        console.error('❌ Erro ao buscar sessão:', error);
        set({ user: null, member: null, tenant: null, profile: null, isAdmin: false, hasTenant: false, loading: false });
        return;
      }

      const sessionUser = data.session?.user ?? null;
      if (!sessionUser) {
        set({ user: null, member: null, tenant: null, profile: null, isAdmin: false, hasTenant: false, loading: false });
        return;
      }

      // Sincronizar assinatura Stripe em background (não bloqueia o login)
      syncStripeSubscription(sessionUser.id).catch(console.warn);

      // Carregar dados do usuário de forma segura com timeout
      try {
        const membershipTimeout = (ms = 3000): Promise<{ member: Membership | null; tenant: Tenant | null }> =>
          Promise.race([
            checkExistingMembership(sessionUser),
            new Promise((_, reject) => setTimeout(() => reject(new Error('MEMBERSHIP_LOAD_TIMEOUT')), ms)),
          ]) as Promise<{ member: Membership | null; tenant: Tenant | null }>;

        const profileTimeout = (ms = 2000): Promise<ProfileRow | null> =>
          Promise.race([
            loadUserProfile(sessionUser.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('PROFILE_LOAD_TIMEOUT')), ms)),
          ]) as Promise<ProfileRow | null>;

        const [{ member, tenant }, profile] = await Promise.all([
          membershipTimeout().catch((err) => {
            console.warn('⚠️ Timeout ao carregar membership, continuando sem tenant:', err.message);
            return { member: null, tenant: null };
          }),
          profileTimeout().catch(() => null) // Profile pode falhar sem quebrar tudo
        ]);


        // If profile is marked as disabled, force sign out and clear state
        if (profile?.disabled) {
          try { await supabase.auth.signOut() } catch { /* ignore */ }
          set({ user: null, member: null, tenant: null, profile: null, isAdmin: false, hasTenant: false, loading: false })
          return
        }

        set({
          user: sessionUser,
          member,
          tenant,
          profile,
          isAdmin: false,
          hasTenant: !!(member?.tenant_id && tenant),
          loading: false
        });
      } catch (memberErr) {
        // Se falhar ao carregar membership, mantém o usuário mas sem tenant
        console.error('⚠️ Erro ao carregar membership/profile:', memberErr);
        set({
          user: sessionUser,
          member: null,
          tenant: null,
          profile: null,
          isAdmin: false,
          hasTenant: false,
          loading: false
        });
      }
    } catch (err) {
      console.error('❌ loadSession - erro crítico:', err);
      // Só limpa o estado se houver erro crítico na sessão do Supabase
      set({ user: null, member: null, tenant: null, profile: null, isAdmin: false, hasTenant: false, loading: false });
    } finally {
      isLoadingSession = false;
      loadSessionPromise = null;
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }

      const user = data.user;
      if (!user) throw new Error('Usuário não encontrado');

      // APENAS verificar se já tem membership, NÃO criar automaticamente
      const { member, tenant } = await checkExistingMembership(user);
      const profile = await loadUserProfile(user.id);

      if (!member || !tenant) {
        // Usuário não tem equipe - será direcionado para criar/entrar
      } else {
        // Usuário já tem equipe válida
      }

      // Se o perfil estiver marcado como disabled, encerrar sessão e rejeitar o login
      if (profile?.disabled) {
        try { await supabase.auth.signOut() } catch { /* ignore */ }
        set({ user: null, member: null, tenant: null, profile: null, isAdmin: false, hasTenant: false })
        throw new Error('Conta desativada')
      }

      set({
        user,
        member,
        tenant,
        profile,
        isAdmin: false,
        hasTenant: !!(member?.tenant_id && tenant)
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      throw new Error(message);
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, name, tenantName, personalEmail, telefone) => {
    set({ loading: true });
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      if (signUpError) {
        throw signUpError;
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        throw sessionErr;
      }

      if (!sessionData?.session) {
        localStorage.setItem('pendingTenantName', tenantName.trim());
        if (personalEmail) localStorage.setItem('pendingPersonalEmail', personalEmail);
        if (telefone) localStorage.setItem('pendingTelefone', telefone);
        throw new Error('CONFIRM_EMAIL_REQUIRED');
      }

      const user = signUpData.user as User;

      // Trigger do banco já criou profiles automaticamente
      // Apenas atualizar com dados pessoais fornecidos
      await createOrUpdateUserProfile(user, name, personalEmail, telefone);

      // 🚫 NÃO criar tenant automático - usuários free não tem equipe
      // Tenant só é criado quando usuário assinar ou criar equipe manualmente
      const { member, tenant } = await checkExistingMembership(user);

      const profile = await loadUserProfile(user.id);

      set({
        user,
        member,
        tenant,
        profile,
        isAdmin: false,
        hasTenant: !!(member?.tenant_id && tenant)
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      throw new Error(message);
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, member: null, tenant: null, profile: null, isAdmin: false, hasTenant: false });
  },
}));
