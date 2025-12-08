import { supabase } from '../lib/supabase'

export type UserProfile = {
  id: string
  user_id: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  phone: string | null
  bio: string | null
  profile_completed: boolean
  created_at: string
  updated_at: string
}

export type TeamMemberWithProfile = {
  tenant_id: string
  user_id: string
  role: 'owner' | 'admin' | 'vendedor'
  joined_at: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  phone: string | null
  bio: string | null
  profile_completed: boolean
  email: string | null
}

// Buscar perfil do usuário atual
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Verificar se o perfil já existe
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erro ao verificar perfil:', checkError);
    }

    // Se o perfil existe, retornar
    if (existingProfile) {
      return existingProfile;
    }

    // Se não existe, criar um novo
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        user_id: user.id,
        full_name: user.user_metadata?.full_name || '',
        display_name: user.user_metadata?.full_name || '',
        profile_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertError) {
      console.log('Aviso ao criar novo perfil:', insertError);
      // Se falhar, tentar buscar novamente (pode ter sido criado por trigger)
      const { data: retryProfile, error: retryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (retryError && retryError.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil após retry:', retryError);
        return null;
      }

      return retryProfile;
    }

    return newProfile;
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return null
  }
}

// Atualizar perfil do usuário
export async function updateUserProfile(profile: Partial<UserProfile>): Promise<boolean> {
  try {
    console.log('🔵 [updateUserProfile] Iniciando atualização...')
    console.log('📋 [updateUserProfile] Dados recebidos:', profile)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 [updateUserProfile] User obtido:', user?.id, 'Erro:', authError)

    if (!user) throw new Error('Usuário não autenticado')

    // Verificar se o perfil já existe
    console.log('🔍 [updateUserProfile] Verificando se perfil existe...')
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    console.log('📊 [updateUserProfile] Resultado da busca:', { existingProfile, checkError })

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [updateUserProfile] Erro ao verificar perfil:', checkError)
      throw checkError;
    }

    // Preparar dados para atualização
    const updateData = {
      ...(profile.full_name !== undefined && { full_name: profile.full_name }),
      ...(profile.display_name !== undefined && { display_name: profile.display_name }),
      ...(profile.avatar_url !== undefined && { avatar_url: profile.avatar_url }),
      ...(profile.phone !== undefined && { phone: profile.phone }),
      ...(profile.bio !== undefined && { bio: profile.bio }),
      ...(profile.profile_completed !== undefined && { profile_completed: profile.profile_completed }),
      updated_at: new Date().toISOString()
    }
    console.log('📤 [updateUserProfile] Dados preparados:', updateData)

    // Se existe, fazer UPDATE; se não, fazer INSERT
    if (existingProfile) {
      console.log('🔄 [updateUserProfile] Perfil existe, fazendo UPDATE...')

      const { error: updateError, data: updateResult } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()

      console.log('📝 [updateUserProfile] UPDATE resultado:', { updateError, data: updateResult })
      if (updateError) {
        console.error('❌ [updateUserProfile] Erro no UPDATE:', updateError)
        throw updateError;
      }
    } else {
      console.log('➕ [updateUserProfile] Perfil não existe, fazendo INSERT...')
      const insertData = {
        id: user.id,
        user_id: user.id,
        full_name: profile.full_name ?? null,
        display_name: profile.display_name ?? null,
        avatar_url: profile.avatar_url ?? null,
        phone: profile.phone ?? null,
        bio: profile.bio ?? null,
        profile_completed: profile.profile_completed ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      console.log('📤 [updateUserProfile] Dados do INSERT:', insertData)

      const { error: insertError, data: insertResult } = await supabase
        .from('profiles')
        .insert(insertData)
        .select()

      console.log('📝 [updateUserProfile] INSERT resultado:', { insertError, data: insertResult })
      if (insertError) {
        console.error('❌ [updateUserProfile] Erro no INSERT:', insertError)
        throw insertError;
      }
    }

    console.log('✅ [updateUserProfile] Perfil atualizado com sucesso!')
    return true
  } catch (error) {
    console.error('❌ [updateUserProfile] Erro geral:', error)
    console.error('📌 Detalhes do erro:', {
      message: error instanceof Error ? error.message : 'Desconhecido',
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint
    })
    return false
  }
}

// Buscar membros da equipe com perfis
export async function getTeamMembersWithProfiles(tenantId: string): Promise<TeamMemberWithProfile[]> {
  try {
    const { data, error } = await supabase
      .from('team_members_with_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('joined_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar membros da equipe:', error)
    return []
  }
}

// Upload de avatar
export async function uploadAvatar(file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    console.log('📤 Uploadando avatar:', {
      filePath,
      fileSize: file.size,
      fileType: file.type,
      bucket: 'avatars'
    })

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Erro ao fazer upload:', {
        code: uploadError.name,
        message: uploadError.message,
        details: JSON.stringify(uploadError)
      })
      throw uploadError
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    console.log('✅ URL pública gerada:', publicUrl)
    return publicUrl
  } catch (error) {
    console.error('❌ Erro ao fazer upload do avatar:', {
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.name : typeof error
    })
    return null
  }
}

// Verificar se perfil está completo
export async function isProfileComplete(): Promise<boolean> {
  try {
    const profile = await getUserProfile()
    return profile?.profile_completed || false
  } catch (error) {
    console.error('Erro ao verificar perfil:', error)
    return false
  }
}
