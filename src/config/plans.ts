import type { PricingPlan } from '../types/subscription'

// Aceita tanto nomes em PT-BR quanto EN (compatibilidade com secrets já criados)
const priceMensal = import.meta.env.VITE_STRIPE_PRICE_MENSAL || import.meta.env.VITE_STRIPE_PRICE_MONTHLY || ''
const priceSemestral = import.meta.env.VITE_STRIPE_PRICE_SEMESTRAL || import.meta.env.VITE_STRIPE_PRICE_SEMESTER || import.meta.env.VITE_STRIPE_PRICE_SEMESTERAL || ''
const priceAnual = import.meta.env.VITE_STRIPE_PRICE_ANUAL || import.meta.env.VITE_STRIPE_PRICE_ANNUAL || ''

// Opções de price IDs em modo teste (opcional)
const priceMensalTest = import.meta.env.VITE_STRIPE_PRICE_MENSAL_TEST || import.meta.env.VITE_STRIPE_PRICE_MONTHLY_TEST || ''
const priceSemestralTest = import.meta.env.VITE_STRIPE_PRICE_SEMESTRAL_TEST || import.meta.env.VITE_STRIPE_PRICE_SEMESTER_TEST || import.meta.env.VITE_STRIPE_PRICE_SEMESTERAL_TEST || ''
const priceAnualTest = import.meta.env.VITE_STRIPE_PRICE_ANUAL_TEST || import.meta.env.VITE_STRIPE_PRICE_ANNUAL_TEST || ''

if (import.meta.env.DEV) {
  const missing: string[] = []
  if (!priceMensal) missing.push('VITE_STRIPE_PRICE_MENSAL')
  if (!priceSemestral) missing.push('VITE_STRIPE_PRICE_SEMESTRAL')
  if (!priceAnual) missing.push('VITE_STRIPE_PRICE_ANUAL')
  if (missing.length) {
    console.warn('[plans] Variáveis Stripe faltando:', missing.join(', '))
  }
}

// Preços dos planos (atualize aqui quando mudar os preços na Stripe)
// Os valores aqui devem ser os mesmos cadastrados na Stripe
export const PLANS: PricingPlan[] = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 70,
    interval: 'month',
    intervalCount: 1,
    priceId: priceMensal,
    testPriceId: priceMensalTest,
    testName: 'Mensal (Teste)',
    description: 'Cobrança mensal'
  },
  {
    id: 'semiannual',
    name: 'Semestral',
    price: 390,
    interval: 'month',
    intervalCount: 6,
    priceId: priceSemestral,
    testPriceId: priceSemestralTest,
    testName: 'Semestral (Teste)',
    description: 'R$ 65/mês + taxas da Stripe ou R$ 390 à vista'
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 720,
    interval: 'year',
    priceId: priceAnual,
    testPriceId: priceAnualTest,
    testName: 'Anual (Teste)',
    description: 'R$ 60/mês + taxas da Stripe ou R$ 720 à vista'
  }
]

/**
 * IDs dos preços para buscar da Stripe
 * Usados para sincronizar automaticamente os preços do site
 */
export const STRIPE_PRICE_IDS = {
  monthly: priceMensal,
  semiannual: priceSemestral,
  annual: priceAnual
}

/**
 * IDs dos preços de teste (optional - para desenvolvimento)
 */
export const STRIPE_TEST_PRICE_IDS = {
  monthly: priceMensalTest,
  semiannual: priceSemestralTest,
  annual: priceAnualTest
}
