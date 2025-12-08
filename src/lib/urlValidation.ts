/**
 * Validação de URLs
 * Remove blob URLs que são inválidas fora da sessão do navegador
 */

/**
 * Verifica se uma URL é válida (não é blob URL ou inválida)
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false
  if (typeof url !== 'string') return false
  if (url.startsWith('blob:')) return false
  if (!url.startsWith('http')) return false
  return true
}

/**
 * Limpa blob URLs de um array
 */
export function cleanBlobUrls(urls: (string | null)[]): string[] {
  return urls.filter((url): url is string => isValidUrl(url))
}

/**
 * Retorna a URL ou null se for blob
 */
export function cleanBlobUrl(url: string | null | undefined): string | null {
  if (!isValidUrl(url)) {
    return null
  }
  return url as string
}
