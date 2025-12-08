/**
 * Utilitário de logging condicional
 * Logs de debug só aparecem em ambiente de desenvolvimento
 */

export const logger = {
  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Log de informação - sempre exibido
   */
  info: (...args: unknown[]) => {
    console.log('[INFO]', ...args)
  },

  /**
   * Log de aviso - sempre exibido
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args)
  },

  /**
   * Log de erro - sempre exibido
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args)
  },

  /**
   * Log de tabela - apenas em desenvolvimento
   */
  table: (data: unknown) => {
    if (import.meta.env.DEV) {
      console.table(data)
    }
  }
}
