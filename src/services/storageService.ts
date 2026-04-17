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
    // 1. Verificar autenticação
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    // 2. Validação de Tamanho (Limite de 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'Arquivo muito grande. O limite é de 10MB.' }
    }

    // 3. Bloqueio de Extensões Perigosas (Blacklist)
    const forbiddenExtensions = ['php', 'php5', 'phtml', 'exe', 'sh', 'js', 'bat', 'cmd', 'msi', 'vbs'];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (forbiddenExtensions.includes(fileExt)) {
      console.warn(`Tentativa de upload de arquivo proibido: ${file.name}`);
      return { success: false, error: 'Tipo de arquivo não permitido por motivos de segurança.' }
    }

    // 4. Validação de MIME Type
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
      'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      // Se for um arquivo de lead-attachments, podemos ser um pouco mais flexíveis com tipos de documento
      // mas nunca permitimos executáveis (já checado acima)
      if (bucketName !== 'attachments') {
        return { success: false, error: 'Formato de arquivo não suportado.' }
      }
    }

    console.log(`Fazendo upload seguro para bucket ${bucketName}: ${path}`)

    // 5. Fazer upload
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type // Garante que o MIME type seja gravado corretamente
      })

    if (error) {
      console.error('Erro no upload:', error)
      return { success: false, error: error.message || 'Erro ao fazer upload do arquivo' }
    }

    if (!data?.path) {
      return { success: false, error: 'Caminho do arquivo não retornado' }
    }

    // 6. Obter URL pública (Apenas para buckets configurados como públicos)
    const { data: publicUrl } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    return { success: true, url: publicUrl.publicUrl }
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}
