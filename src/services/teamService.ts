// src/services/teamService.ts
import { supabase } from '../lib/supabase'
import { sendExistingAccountInvite } from './emailService'

export type RoleType = 'owner' | 'admin' | 'vendedor'

export type TeamMember = {
  id: string
  nome: string
  email: string | null
  role: RoleType
  avatar: string | null
  display_name?: string | null
  full_name?: string | null
  phone?: string | null
  profile_completed?: boolean
}

export type TeamInviteStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'account_created'
  | 'pending_notification'

export type TeamInvite = {
  id: string
  tenant_id: string
  email: string
  role: RoleType
  status: TeamInviteStatus
  invited_by: string
  expires_at: string
  created_at: string
}

// ================================
// Buscar convites por email e status
export async function fetchUserInvites(email: string, status: string = 'pending') {
  try {
    const { data, error } = await supabase
      .from('team_invites')
      .select('id, created_at, token')
      .eq('email', email)
      .eq('status', status)

    if (error) {
      // Se RLS bloquear (403) ou ocorrer outro erro, logamos e retornamos lista vazia.
      console.warn('[teamService] fetchUserInvites error:', error)
      return []
    }

    return data || []
  } catch {
    return []
  }
}

// ================================
// Diagnóstico de convites - nova função para debug
// ================================
export async function diagnoseInvite(token: string) {
  console.log('[diagnoseInvite] Diagnosticando token:', token)
  
  try {
    // Buscar em todos os status possíveis
    const { data: allInvites, error } = await supabase
      .from('team_invites')
      .select(`
        *,
        tenants(nome, id),
        equipes(nome, id)
      `)
      .eq('token', token)
    
    if (error) {
      console.error('[diagnoseInvite] Erro na busca:', error)
      return { found: false, error: error.message }
    }
    
    if (!allInvites?.length) {
      console.log('[diagnoseInvite] Nenhum convite encontrado')
      return { found: false, error: 'Token não encontrado no sistema' }
    }
    
    const invite = allInvites[0]
    console.log('[diagnoseInvite] Convite encontrado:', invite)
    
    return {
      found: true,
      invite,
      status: invite.status,
      email: invite.email,
      tenant: invite.tenants?.nome,
      team: invite.equipes?.nome,
      created: invite.created_at,
      expires: invite.expires_at
    }
  } catch (error) {
    console.error('[diagnoseInvite] Erro inesperado:', error)
    return { found: false, error: 'Erro inesperado no diagnóstico' }
  }
}
// Buscar membros da equipe
// ================================
export async function fetchTeamMembers(tenantId: string): Promise<TeamMember[]> {
  try {
    if (!tenantId) return []

    // 1) memberships do tenant
    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select('user_id, role, created_at')
      .eq('tenant_id', tenantId)

    if (membershipError || !memberships?.length) return []

    // 2) perfis dos usuários
    const userIds: string[] = memberships.map((m) => m.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    if (profilesError) {
      // sem perfis, ainda dá pra montar com fallback mínimo
      // segue com profiles = []
    }

    const members: TeamMember[] = []

    for (const membership of memberships) {
      const profile = profiles?.find((p) => p.id === membership.user_id)

      let email: string | null = null
      let fallbackName = 'Usuário'

      // Fallback: tentar pegar email do auth.users (só funciona em ambiente seguro)
      if (!profile) {
        try {
          const { data: authUser } = await supabase
            .from('auth.users')
            .select('email, raw_user_meta_data')
            .eq('id', membership.user_id)
            .single()

          if (authUser) {
            email = authUser.email
            const meta = (authUser.raw_user_meta_data ?? {}) as { full_name?: string }
            fallbackName = meta.full_name ?? authUser.email ?? 'Usuário'
          }
        } catch {
          // ignorar: em client público normalmente não tem acesso a auth.users
        }
      }

      members.push({
        id: membership.user_id,
        nome: profile?.display_name ?? profile?.full_name ?? fallbackName,
        email,
        role: membership.role,
        avatar: profile?.avatar_url ?? null,
        display_name: profile?.display_name ?? null,
        full_name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        profile_completed: Boolean(profile?.profile_completed ?? false),
      })
    }

    return members
  } catch {
    return []
  }
}

// ================================
// Convites pendentes
// ================================
export async function fetchPendingInvites(tenantId: string): Promise<TeamInvite[]> {
  try {
    const { data, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

// ================================
// Criar convite (cria/usa conta)
// ================================
export async function createTeamInvite(
  email: string,
  tenantId: string,
  role: Exclude<RoleType, 'owner'> = 'vendedor',
  inviterName: string,
  companyName: string
  ): Promise<string> {
    // Fluxo seguro para frontend: apenas registra o convite e envia o e-mail
    const { data: authState, error: authError } = await supabase.auth.getUser()
    if (authError || !authState.user) throw new Error('Usuário não autenticado')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email inválido')
    if (!tenantId) throw new Error('tenantId não fornecido')

    // 1) Registrar/atualizar convite
    const { data: inviteData, error: inviteError } = await supabase
      .from('team_invites')
      .upsert(
        {
          tenant_id: tenantId,
          email,
          role,
          invited_by: authState.user.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          id: crypto.randomUUID(),
        },
        { onConflict: 'tenant_id,email' }
      )
      .select()
      .single()

    if (inviteError) {
      console.warn('Falha ao registrar convite (seguindo):', inviteError)
    }

    // 2) Email
    try {
      await sendExistingAccountInvite(email, companyName, inviterName)
    } catch (e) {
      console.warn('Falha no envio de email:', e)
    }

    return inviteData?.id ?? ''
}

// ================================
// Remover membro do tenant
// ================================
export async function removeTeamMember(tenantId: string, memberUserId: string): Promise<void> {
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', memberUserId)

  if (error) throw error
}

// ================================
// Alterar role do membro
// ================================
export async function updateMemberRole(
  tenantId: string,
  memberUserId: string,
  newRole: Exclude<RoleType, 'owner'>
): Promise<void> {
  const { error } = await supabase
    .from('memberships')
    .update({ role: newRole })
    .eq('tenant_id', tenantId)
    .eq('user_id', memberUserId)

  if (error) throw error
}

// ================================
// Cancelar convite
// ================================
export async function cancelInvite(inviteId: string): Promise<void> {
  const { data: authState } = await supabase.auth.getUser()
  if (!authState.user) throw new Error('Usuário não autenticado')

  const { data: invite, error: selectError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('id', inviteId)
    .single()

  if (selectError || !invite) throw new Error('Convite não encontrado')
  if (invite.invited_by !== authState.user.id) throw new Error('Sem permissão para cancelar este convite')

  // Tenta RPC; se falhar, faz update simples
  const { error: rpcError } = await supabase.rpc('cancel_team_invite_direct', {
    invite_id: inviteId,
    user_id: authState.user.id,
  })

  if (rpcError) {
    const { error: simpleUpdateError } = await supabase
      .from('team_invites')
      .update({ status: 'expired' })
      .eq('id', inviteId)

    if (simpleUpdateError) throw new Error(`Erro ao cancelar convite: ${simpleUpdateError.message}`)
  }
}

// ================================
// Aceitar convite (com token ou por email)
// ================================
export async function acceptInvite(token: string): Promise<{ success: boolean; error?: string; tenantId?: string }> {
  try {
    const { data: authState } = await supabase.auth.getUser()
    const user = authState.user
    if (!user) return { success: false, error: 'Usuário não autenticado' }

    // 1) tenta RPC
    try {
      const { data, error } = await supabase.rpc('accept_team_invite', { p_token: token })
      if (!error && data && (data as { success?: boolean }).success) {
        const d = data as { success: boolean; tenant_id: string }
        return { success: true, tenantId: d.tenant_id }
      }
    } catch {
      // segue fallback
    }

    // 2) fallback por id do convite
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('id', token)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) return { success: false, error: 'Convite inválido ou expirado' }
    if (invite.email !== user.email) return { success: false, error: 'Este convite não é para você' }

    // 3) cria/atualiza membership
    const { error: upsertError } = await supabase
      .from('memberships')
      .upsert(
        {
          tenant_id: invite.tenant_id,
          user_id: user.id,
          role: invite.role,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,user_id' }
      )
    if (upsertError) return { success: false, error: 'Erro ao criar associação' }

    // 4) marca como aceito
    await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id)

    return { success: true, tenantId: invite.tenant_id }
  } catch {
    return { success: false, error: 'Falha ao aceitar convite' }
  }
}

// ================================
// Aceitar convite (novo fluxo completo)
// ================================
export async function acceptInviteNew(
  token?: string
): Promise<{ success: boolean; error?: string; tenantId?: string }> {
  try {
    console.log('[acceptInviteNew] Iniciando com token:', token)
    
    const { data: authState } = await supabase.auth.getUser()
    const user = authState.user
    
    if (!user) {
      console.log('[acceptInviteNew] Usuário não autenticado')
      return { success: false, error: 'Usuário não autenticado' }
    }

    console.log('[acceptInviteNew] Usuário autenticado:', user.email)

    if (token) {
      console.log('[acceptInviteNew] Buscando convite pelo token:', token)
      
      // Estratégia robusta de busca de convite
      let invite = null
      
      // Tentativa 1: Status padrão
      const { data: invite1, error: error1 } = await supabase
        .from('team_invites')
        .select('*')
        .eq('token', token)
        .in('status', ['sent', 'pending', 'account_created'])
        .single()

      if (invite1 && !error1) {
        invite = invite1
      } else {
        console.log('[acceptInviteNew] Tentativa 1 falhou, tentando busca mais ampla...')
        
        // Tentativa 2: Qualquer status (exceto já aceito)
        const { data: invite2, error: error2 } = await supabase
          .from('team_invites')
          .select('*')
          .eq('token', token)
          .neq('status', 'accepted')
          .single()

        if (invite2 && !error2) {
          invite = invite2
          console.log('[acceptInviteNew] Convite encontrado com status:', invite.status)
        } else {
          console.error('[acceptInviteNew] Convite não encontrado em nenhuma tentativa:', error1, error2)
          return { success: false, error: 'Convite não encontrado, expirado ou já foi usado' }
        }
      }

      if (!invite) {
        console.log('[acceptInviteNew] Convite não encontrado')
        return { success: false, error: 'Convite não encontrado' }
      }

      console.log('[acceptInviteNew] Convite encontrado:', invite)

      // Verificar se o email do convite bate com o usuário logado
      if (invite.email !== user.email) {
        console.log('[acceptInviteNew] Email não confere:', invite.email, 'vs', user.email)
        return { 
          success: false, 
          error: `Este convite é para ${invite.email}. Faça login com o email correto.` 
        }
      }

      // Verificar se já existe membership
      const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('tenant_id', invite.tenant_id)
        .eq('user_id', user.id)
        .single()

      if (existingMembership) {
        console.log('[acceptInviteNew] Usuário já é membro da equipe')
        
        // Marcar convite como aceito mesmo assim
        await supabase
          .from('team_invites')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('token', token)

        return { success: true, tenantId: invite.tenant_id }
      }

      // Criar membership
      console.log('[acceptInviteNew] Criando membership')
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          tenant_id: invite.tenant_id,
          user_id: user.id,
          role: invite.role || 'vendedor',
          created_at: new Date().toISOString()
        })

      if (membershipError) {
        console.error('[acceptInviteNew] Erro ao criar membership:', membershipError)
        return { success: false, error: 'Erro ao adicionar à equipe: ' + membershipError.message }
      }

      // Marcar convite como aceito
      console.log('[acceptInviteNew] Marcando convite como aceito')
      // Marcar convite como aceito
      console.log('[acceptInviteNew] Marcando convite como aceito')
      await supabase
        .from('team_invites')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('token', token)

      console.log('[acceptInviteNew] Convite aceito com sucesso!')
      return { success: true, tenantId: invite.tenant_id }
    }

    // Fallback: buscar por email (caso não tenha token)
    console.log('[acceptInviteNew] Buscando convite por email:', user.email)
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('email', user.email as string)
      .in('status', ['sent', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !invite) {
      console.log('[acceptInviteNew] Nenhum convite encontrado por email')
      return { success: false, error: 'Nenhum convite pendente encontrado' }
    }

    // Criar membership se não existir
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('tenant_id', invite.tenant_id)
      .eq('user_id', user.id)
      .single()

    if (!existingMembership) {
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          tenant_id: invite.tenant_id,
          user_id: user.id,
          role: invite.role || 'vendedor'
        })

      if (membershipError) {
        console.error('[acceptInviteNew] Erro ao criar membership:', membershipError)
        return { success: false, error: 'Erro ao adicionar à equipe' }
      }
    }

    // Marcar como aceito
    await supabase
      .from('team_invites')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', invite.id)

    return { success: true, tenantId: invite.tenant_id }
    
  } catch (error) {
    console.error('[acceptInviteNew] Erro inesperado:', error)
    return { success: false, error: 'Falha inesperada ao aceitar convite' }
  }
}

// ================================
// Permissões
// ================================
export function checkPermission(
  userRole: RoleType,
  targetRole: RoleType,
  action: 'view' | 'edit' | 'delete'
): boolean {
  if (userRole === 'owner') return true
  if (userRole === 'admin') return action === 'view' || targetRole === 'vendedor'
  return action === 'view'
}
