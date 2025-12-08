/**
 * Utilitários de sanitização e validação de input
 * Previne XSS, injection e outros ataques
 */

/**
 * Valida e sanitiza email
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 254)
}

/**
 * Valida UUID
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Valida e retorna UUID ou null
 */
export function sanitizeUUID(uuid: string): string | null {
  return validateUUID(uuid) ? uuid : null
}

/**
 * Valida URL e verifica se o domínio está na allowlist
 */
export function validateUrl(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    return allowedDomains.includes(parsed.hostname)
  } catch {
    return false
  }
}

/**
 * Sanitiza URL retornando apenas se válida e permitida
 */
export function sanitizeUrl(url: string, allowedDomains: string[]): string | null {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (!allowedDomains.includes(parsed.hostname)) return null
    return parsed.href
  } catch {
    return null
  }
}

/**
 * Sanitiza nome de arquivo removendo caracteres perigosos
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 255)
}

/**
 * Sanitiza texto removendo HTML/scripts
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '')
    .trim()
}

/**
 * Valida telefone brasileiro
 */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 11
}

/**
 * Sanitiza telefone mantendo apenas números
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 11)
}

/**
 * Valida CPF
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')
  
  if (cleaned.length !== 11) return false
  if (/^(\d)\1+$/.test(cleaned)) return false
  
  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned.charAt(9))) return false
  
  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned.charAt(10))) return false
  
  return true
}

/**
 * Sanitiza CPF mantendo apenas números
 */
export function sanitizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '').slice(0, 11)
}

/**
 * Valida CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '')
  
  if (cleaned.length !== 14) return false
  if (/^(\d)\1+$/.test(cleaned)) return false
  
  // Validação dos dígitos verificadores
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i]
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (digit !== parseInt(cleaned.charAt(12))) return false
  
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i]
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (digit !== parseInt(cleaned.charAt(13))) return false
  
  return true
}

/**
 * Sanitiza CNPJ mantendo apenas números
 */
export function sanitizeCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '').slice(0, 14)
}

/**
 * Valida código de entrada de equipe (8 caracteres alfanuméricos)
 */
export function validateJoinCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/i.test(code)
}

/**
 * Sanitiza código de entrada removendo caracteres inválidos
 */
export function sanitizeJoinCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

/**
 * Valida número inteiro positivo
 */
export function validatePositiveInt(value: unknown): boolean {
  const num = Number(value)
  return Number.isInteger(num) && num > 0
}

/**
 * Valida número decimal positivo
 */
export function validatePositiveNumber(value: unknown): boolean {
  const num = Number(value)
  return !isNaN(num) && num > 0
}

/**
 * Sanitiza número removendo caracteres não numéricos
 */
export function sanitizeNumber(value: string): string {
  return value.replace(/[^0-9.,-]/g, '').replace(',', '.')
}
