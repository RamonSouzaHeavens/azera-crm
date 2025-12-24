/**
 * Currency utility module for multi-currency support
 * Supports BRL, USD, and EUR currencies with formatting and configuration
 */

// Valid currency codes
export type CurrencyCode = 'BRL' | 'USD' | 'EUR'

// Currency configuration interface
export interface CurrencyConfig {
  code: CurrencyCode
  symbol: string
  flag: string
  name: string
  locale: string
}

// Currency configurations
const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    flag: '🇧🇷',
    name: 'Real Brasileiro',
    locale: 'pt-BR'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    name: 'Dólar Americano',
    locale: 'en-US'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    flag: '🇪🇺',
    name: 'Euro',
    locale: 'de-DE'
  }
}

// Valid currency codes array for validation
const VALID_CURRENCIES: CurrencyCode[] = ['BRL', 'USD', 'EUR']

/**
 * Validates if a given string is a valid currency code
 * @param currency - The currency code to validate
 * @returns True if valid, false otherwise
 */
export function isValidCurrency(currency: string | null | undefined): currency is CurrencyCode {
  if (!currency) return false
  return VALID_CURRENCIES.includes(currency as CurrencyCode)
}

/**
 * Gets the currency configuration for a given currency code
 * @param currency - The currency code
 * @returns The currency configuration, defaults to BRL if invalid
 */
export function getCurrencyConfig(currency: CurrencyCode | string | null | undefined): CurrencyConfig {
  if (currency && isValidCurrency(currency)) {
    return CURRENCY_CONFIGS[currency]
  }
  return CURRENCY_CONFIGS.BRL
}

/**
 * Formats a number as currency
 * @param value - The numeric value to format
 * @param currency - The currency code (defaults to BRL)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: CurrencyCode | string = 'BRL'): string {
  const config = getCurrencyConfig(currency)

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Parses a currency string back to a number
 * @param value - The currency string to parse
 * @returns The numeric value
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols, spaces, and thousands separators
  const cleaned = value
    .replace(/[R$€$]/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Gets all available currency options for select inputs
 * @returns Array of currency options with value and label
 */
export function getCurrencyOptions(): Array<{ value: CurrencyCode; label: string }> {
  return VALID_CURRENCIES.map(code => ({
    value: code,
    label: `${CURRENCY_CONFIGS[code].flag} ${code} (${CURRENCY_CONFIGS[code].symbol})`
  }))
}

/**
 * Gets the default currency
 * @returns Default currency code (BRL)
 */
export function getDefaultCurrency(): CurrencyCode {
  return 'BRL'
}
