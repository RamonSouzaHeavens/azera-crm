import { supabase } from '../lib/supabase'

/**
 * Verifica se o bucket existe e o cria se necessário
 */
export async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    // Verificar se o bucket existe
    const { error } = await supabase.storage.getBucket(bucketName)
    
    if (error) {
      // Bucket não existe, criar um novo
      console.log(`Bucket ${bucketName} não existe, criando...`)
      
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/zip',
          'application/x-rar-compressed'
        ]
      })

      if (createError) {
        console.error('Erro ao criar bucket:', createError)
        return false
      }
      
      console.log(`Bucket ${bucketName} criado com sucesso`)
      return true
    } else {
      console.log(`Bucket ${bucketName} já existe`)
      return true
    }
  } catch (error) {
    console.error('Erro ao verificar/criar bucket:', error)
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