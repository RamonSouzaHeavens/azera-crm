// Teste simples para verificar upload de imagem
import { uploadFileWithValidation } from '../services/storageService'

export const testUpload = async () => {
  try {
    // Criar um arquivo de teste simples
    const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const result = await uploadFileWithValidation('produtos', 'test/test.txt', testFile)

    if (result.success) {
      console.log('✅ Upload testado com sucesso:', result.url)
      return true
    } else {
      console.error('❌ Falha no upload de teste:', result.error)
      return false
    }
  } catch (error) {
    console.error('❌ Erro no teste de upload:', error)
    return false
  }
}