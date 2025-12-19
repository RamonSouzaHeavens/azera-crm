import { supabase } from '../lib/supabase'

export type UserProfile = {
  id: string // Este é o user_id (PK referenciando auth.users)
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  phone: string | null
  bio: string | null
  profile_completed: boolean
  created_at: string
  updated_at: string
  // Alias para compatibilidade
  user_id?: string
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

    // Se não existe, criar um novo com dados do cadastro
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        phone: user.user_metadata?.phone || user.phone || '',
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const updates = {
      id: user.id,
      ...profile,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').upsert(updates)

    if (error) {
      console.error('Erro ao atualizar perfil:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro geral ao atualizar perfil:', error)
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
