import { supabase } from '../lib/supabase'

export type TeamOverviewResponse = {
  tenant: {
    id: string
    name: string
    descricao?: string | null
    slogan?: string | null
    logo_url?: string | null
    created_at: string
    updated_at?: string | null
  }
  member: {
    id: string
    tenant_id: string
    user_id: string
    nome: string
    email: string
    telefone?: string | null
    cargo?: string | null
    avatar_url?: string | null
    role: 'owner' | 'admin' | 'vendedor' | 'profissional' | 'membro'
    status: 'pendente' | 'ativo' | 'inativo'
    created_at: string
    equipe_id?: string | null
  }
  members: Array<{
    id: string
    user_id: string
    nome: string
    email: string
    telefone?: string | null
    cargo?: string | null
    avatar_url?: string | null
    role: 'owner' | 'admin' | 'vendedor' | 'profissional' | 'membro'
    status: 'pendente' | 'ativo' | 'inativo'
    created_at: string
  }>
  pending_invites: Array<{
    id: string
    email: string
    role: 'owner' | 'admin' | 'vendedor' | 'profissional' | 'membro'
    status: string
    invited_by: string | null
    expires_at: string
    created_at: string
  }>
  recent_activity: Array<{
    id: string
    tipo: string
    user_id: string
    descricao: string
    created_at: string
  }>
  stats: {
    membros_ativos: number
    vendedores: number
    leads_hoje: number
  }
}

export type InviteInfo = {
  id: string
  tenant_id: string
  email: string
  role: 'owner' | 'admin' | 'administrador' | 'vendedor'
  status: string
  token: string
  expires_at: string
  created_at: string
  nome?: string | null
  cargo?: string | null
  tenant: {
    name: string
    logo_url: string | null
  }
  invited_by_name?: string
}

const generateInviteToken = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

export async function getTeamOverview(): Promise<TeamOverviewResponse> {
  const { data, error } = await supabase.rpc('get_team_overview')


  if (error) {
    console.error('Erro ao buscar overview da equipe:', error)
    throw new Error(`Erro ao carregar dados da equipe: ${error.message}`)
  }

  const overview = Array.isArray(data) ? data[0] : data

  if (!overview) {
    throw new Error('Nenhum dado retornado pela API')
  }

  const overviewWithError = overview as TeamOverviewResponse & { error?: string }
  if (overviewWithError.error) {
    throw new Error(`Erro da função: ${overviewWithError.error}`)
  }

  return overviewWithError
}

export async function createTeam(nome: string, slogan?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    throw new Error('Usuário não autenticado')
  }

  const { data, error } = await supabase
    .rpc('create_tenant_with_owner', {
      p_tenant_name: nome,
      p_tenant_slogan: slogan || null,
    })

  if (error) {
    console.error('Erro ao criar tenant via RPC:', error)
    throw new Error(`Erro ao criar equipe: ${error.message}`)
  }

  console.log('Equipe criada com sucesso!', data)
}

export async function joinTeamWithCode(joinCode: string): Promise<{ tenant_id: string; tenant_name: string }> {
  const { data, error } = await supabase.rpc('join_team_with_code', {
    p_join_code: joinCode.toUpperCase(),
    p_role: 'vendedor',
  })

  if (error) {
    console.error('Erro ao entrar na equipe:', error)
    throw new Error(`Erro ao entrar na equipe: ${error.message}`)
  }

  if (!data || !data.success) {
    throw new Error('Falha ao entrar na equipe')
  }

  return {
    tenant_id: data.tenant_id,
    tenant_name: data.tenant_name,
  }
}

export async function sendInvite(
  email: string,
  nome: string,
  role: 'owner' | 'admin' | 'administrador' | 'vendedor',
  tenantId: string,
  cargo?: string | null
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('Usuário não autenticado')
  }

  const { data: existingInvite, error: existingInviteError } = await supabase
    .from('team_invites')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('email', normalizedEmail)
    .in('status', ['pendente', 'pending'])

  if (existingInviteError) {
    console.error('Erro ao verificar convites existentes:', existingInviteError)
    throw new Error('Erro ao verificar convites existentes')
  }

  if (existingInvite && existingInvite.length > 0) {
    throw new Error('Já existe um convite pendente para este email')
  }

  const token = generateInviteToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('team_invites').insert({
    tenant_id: tenantId,
    email: normalizedEmail,
    nome,
    cargo: cargo ?? null,
    role,
    status: 'pendente',
    invited_by: session.user.id,
    token,
    expires_at: expiresAt,
  })

  if (error) {
    console.error('Erro ao criar convite:', error)
    throw new Error(`Erro ao enviar convite: ${error.message}`)
  }
}

export async function validateInviteToken(token: string): Promise<InviteInfo | null> {
  try {
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !invite) {
      console.error('Convite não encontrado:', error)
      return null
    }

    if (invite.status !== 'pendente') {
      console.error('Convite com status inválido:', invite.status)
      return null
    }

    if (new Date(invite.expires_at) < new Date()) {
      console.error('Convite expirado:', {
        expires_at: invite.expires_at,
        now: new Date().toISOString(),
      })
      return null
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, logo_url')
      .eq('id', invite.tenant_id)
      .single()

    let invitedByName: string | undefined
    if (invite.invited_by) {
      const { data: inviter } = await supabase
        .from('memberships')
        .select('nome')
        .eq('user_id', invite.invited_by)
        .eq('tenant_id', invite.tenant_id)
        .single()

      invitedByName = inviter?.nome ?? undefined
    }

    return {
      id: invite.id,
      tenant_id: invite.tenant_id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      token: invite.token,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
      nome: invite.nome,
      cargo: invite.cargo,
      tenant: tenant || { name: 'Equipe', logo_url: null },
      invited_by_name: invitedByName,
    }
  } catch (err) {
    console.error('Erro inesperado ao validar token:', err)
    return null
  }
}

export async function acceptInvite(
  token: string,
  userData: { nome: string; telefone?: string; cargo?: string }
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('Usuário não autenticado')
  }

  const invite = await validateInviteToken(token)
  if (!invite) {
    throw new Error('Convite inválido ou expirado')
  }

  if (session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error('Este convite não foi enviado para seu email')
  }

  const { data: existingMember } = await supabase
    .from('memberships')
    .select('id')
    .eq('tenant_id', invite.tenant_id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (existingMember) {
    throw new Error('Você já faz parte desta equipe')
  }

  const { error: membershipError } = await supabase.from('memberships').insert({
    tenant_id: invite.tenant_id,
    user_id: session.user.id,
    nome: userData.nome,
    email: invite.email,
    telefone: userData.telefone ?? null,
    cargo: userData.cargo ?? invite.cargo ?? null,
    role: invite.role,
    status: 'ativo',
  })

  if (membershipError) {
    console.error('Erro ao criar membership:', membershipError)
    throw new Error(`Erro ao entrar na equipe: ${membershipError.message}`)
  }

  const { error: updateError } = await supabase
    .from('team_invites')
    .update({
      status: 'aceito',
      accepted_at: new Date().toISOString(),
    })
    .eq('token', token)

  if (updateError) {
    console.error('Erro ao atualizar convite:', updateError)
  }
}

export async function leaveTeam(tenantId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('Usuário não autenticado')
  }

  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', session.user.id)

  if (error) {
    console.error('Erro ao sair da equipe:', error)
    throw new Error(`Erro ao sair da equipe: ${error.message}`)
  }
}
