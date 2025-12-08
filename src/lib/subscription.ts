import type { SubscriptionStatus, PricingPlan } from '../types/subscription'
import { PLANS } from '../config/plans'

const planMap = new Map<string, PricingPlan>()

// Mapear tanto priceId quanto testPriceId
PLANS.forEach((plan) => {
  if (plan.priceId) planMap.set(plan.priceId, plan)
  if (plan.testPriceId) planMap.set(plan.testPriceId, plan)
})

export const isSubscriptionActive = (status?: SubscriptionStatus | null) =>
  status === 'active' || status === 'trialing'

export const formatNextBillingDate = (date: string | null | undefined) => {
  if (!date) return 'Não aplicável'
  try {
    const dt = typeof date === 'string' ? new Date(date) : date
    if (Number.isNaN(dt.getTime())) return 'Data inválida'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(dt)
  } catch {
    return 'Data inválida'
  }
}

export const getPlanName = (priceId?: string | null) => {
  if (!priceId) return 'Plano indefinido'
  const plan = planMap.get(priceId)
  if (!plan) return 'Plano indefinido'
  // Se é um testPriceId, usar testName
  return plan.testPriceId === priceId && plan.testName ? plan.testName : plan.name
}

export const getPlanDetails = (priceId?: string | null) => {
  if (!priceId) return null
  return planMap.get(priceId) ?? null
}
