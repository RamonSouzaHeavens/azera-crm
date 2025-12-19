import { supabase } from '../lib/supabase'

/**
 * Verifica se o bucket existe e o cria se necessário
 */
export async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    // Verificar se o bucket existe - A criação deve ser feita via Migrations/Admin para segurança
    const { error } = await supabase.storage.getBucket(bucketName)

    if (error) {
      console.error(`Bucket '${bucketName}' não encontrado. Por favor, crie-o no Supabase Dashboard ou via migrações.`)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao verificar bucket:', error)
    return false
  }
}

/**
 * Faz upload de arquivo para o storage com verificação prévia
 */
export async function uploadFileWithValidation(
  bucketName: string,
  path: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Verificar autenticação
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    console.log(`Fazendo upload para bucket ${bucketName}: ${path}`)
    console.log(`Usuário: ${user.id}`)
    console.log(`Arquivo: ${file.name} (${file.size} bytes)`)

    // Fazer upload
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Erro no upload:', error)
      return { success: false, error: error.message || 'Erro ao fazer upload do arquivo' }
    }

    if (!data?.path) {
      return { success: false, error: 'Caminho do arquivo não retornado' }
    }

    // Obter URL pública
    const { data: publicUrl } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    return { success: true, url: publicUrl.publicUrl }
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}
