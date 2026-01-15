import { PLANS, STRIPE_PRICE_IDS } from '../config/plans'

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

interface StripeCheckoutSession {
  sessionId: string
  clientSecret: string
}

interface SubscriptionStatus {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'none'
  currentPeriodEnd: Date | null
  daysRemaining: number
  planName: string
  pricePerMonth: number
  isActive: boolean
  isExpired: boolean
  autoRenew: boolean
}

/**
 * Create a Stripe checkout session for new subscription
 */
export async function createCheckoutSession(
  tenantId: string,
  priceId: string,
  email: string
): Promise<StripeCheckoutSession> {
  try {
    // Call Supabase Edge Function to create Stripe session
    const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
      body: {
        priceId,
        email,
        tenantId
      }
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error)
    throw error
  }
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(sessionId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = (window as any).Stripe?.(STRIPE_PUBLISHABLE_KEY)
    if (!stripe) {
      throw new Error('Stripe não está carregado')
    }

    const { error } = await stripe.redirectToCheckout({ sessionId })

    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    console.error('Erro ao redirecionar para checkout:', error)
    throw error
  }
}

/**
 * Get subscription status for a tenant
 */
export async function getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
  try {
    const { data: subscription, error } = await supabase
      .from('tenants')
      .select(`
        id,
        subscription_status,
        subscription_current_period_end,
        subscription_plan_name,
        subscription_price_per_month,
        subscription_auto_renew
      `)
      .eq('id', tenantId)
      .single()

    if (error) throw error

    const isActive = subscription.subscription_status === 'active'
    const isTrialing = subscription.subscription_status === 'trialing'
    const isCanceled = subscription.subscription_status === 'canceled'
    const currentPeriodEnd = subscription.subscription_current_period_end
      ? new Date(subscription.subscription_current_period_end)
      : null

    const now = new Date()
    const daysRemaining = currentPeriodEnd
      ? Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Assinatura é considerada ativa se:
    // 1. Status é 'active' ou 'trialing', OU
    // 2. Status é 'canceled' mas ainda está dentro do período pago
    const isCanceledButValid = isCanceled && currentPeriodEnd && currentPeriodEnd > now
    const isExpired = !isActive && !isTrialing && !isCanceledButValid && currentPeriodEnd && currentPeriodEnd < now

    return {
      status: subscription.subscription_status || 'none',
      currentPeriodEnd,
      daysRemaining: Math.max(0, daysRemaining),
      planName: subscription.subscription_plan_name || 'Sem Plano',
      pricePerMonth: subscription.subscription_price_per_month || 0,
      isActive: isActive || isTrialing || isCanceledButValid,
      isExpired: isExpired || false,
      autoRenew: subscription.subscription_auto_renew ?? true
    }
  } catch (error) {
    console.error('Erro ao buscar status de subscription:', error)
    return {
      status: 'none',
      currentPeriodEnd: null,
      daysRemaining: 0,
      planName: 'Sem Plano',
      pricePerMonth: 0,
      isActive: false,
      isExpired: false,
      autoRenew: false
    }
  }
}

/**
 * Get available plans with dynamic pricing from Stripe
 */
export async function getAvailablePlans() {

  // Busca preços da Stripe
  let stripePrices: { [key: string]: StripePrice } = {}
  try {
    const priceIds = Object.values(STRIPE_PRICE_IDS).filter(Boolean)
    if (priceIds.length === 0) {
      console.warn('[Stripe] ⚠️ Nenhum Price ID configurado nas variáveis de ambiente')
      console.warn('[Stripe] 💡 Configure VITE_STRIPE_PRICE_MENSAL, VITE_STRIPE_PRICE_SEMESTRAL, VITE_STRIPE_PRICE_ANUAL')
      console.warn('[Stripe] 📖 Veja docs/STRIPE_TROUBLESHOOTING.md para instruções completas')
    } else if (priceIds.length > 0) {
      stripePrices = await getPricesFromStripe(priceIds)
    }
  } catch (error) {
    console.error('[getAvailablePlans] Erro ao buscar preços da Stripe:', error)
    console.warn('[Stripe] 📖 Usando preços padrão. Veja docs/STRIPE_TROUBLESHOOTING.md para resolver')
  }

  // Mapeia planos com preços da Stripe
  const monthly = PLANS.find(p => p.id === 'monthly')
  const semiannual = PLANS.find(p => p.id === 'semiannual')
  const annual = PLANS.find(p => p.id === 'annual')

  // Busca preços reais da Stripe ou usa fallback
  const monthlyPrice = STRIPE_PRICE_IDS.monthly && stripePrices[STRIPE_PRICE_IDS.monthly]
    ? convertStripePriceToReais(stripePrices[STRIPE_PRICE_IDS.monthly].unit_amount)
    : monthly?.price || 49.90

  const semiannualPrice = STRIPE_PRICE_IDS.semiannual && stripePrices[STRIPE_PRICE_IDS.semiannual]
    ? convertStripePriceToReais(stripePrices[STRIPE_PRICE_IDS.semiannual].unit_amount)
    : semiannual?.price || 269.90

  const annualPrice = STRIPE_PRICE_IDS.annual && stripePrices[STRIPE_PRICE_IDS.annual]
    ? convertStripePriceToReais(stripePrices[STRIPE_PRICE_IDS.annual].unit_amount)
    : annual?.price || 479.90

  // Calcula equivalentes mensais e descontos
  const semiannualMonthly = semiannualPrice / 6
  const annualMonthly = annualPrice / 12

  const semiannualDiscount = Math.round(((monthlyPrice * 6 - semiannualPrice) / (monthlyPrice * 6)) * 100)
  const annualDiscount = Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100)

  return [
    {
      id: 'monthly',
      name: 'Mensal',
      priceId: STRIPE_PRICE_IDS.monthly || '',
      price: monthlyPrice,
      monthlyEquivalent: monthlyPrice,
      billingFrequency: 'Pago mensalmente',
      discount: 0,
      features: [
        '✓ Leads ilimitados',
        '✓ Produtos ilimitados',
        '✓ Usuários ilimitados',
        '✓ Automações avançadas',
        '✓ Webhooks ilimitados',
        '✓ Suporte prioritário'
      ]
    },
    {
      id: 'semiannual',
      name: 'Semestral',
      priceId: STRIPE_PRICE_IDS.semiannual || '',
      price: semiannualPrice,
      monthlyEquivalent: semiannualMonthly,
      billingFrequency: 'Pago semestralmente',
      discount: semiannualDiscount,
      popular: true,
      features: [
        '✓ Leads ilimitados',
        '✓ Produtos ilimitados',
        '✓ Usuários ilimitados',
        '✓ Automações avançadas',
        '✓ Webhooks ilimitados',
        '✓ Suporte prioritário'
      ]
    },
    {
      id: 'annual',
      name: 'Anual',
      priceId: STRIPE_PRICE_IDS.annual || '',
      price: annualPrice,
      monthlyEquivalent: annualMonthly,
      billingFrequency: 'Pago anualmente',
      discount: annualDiscount,
      features: [
        '✓ Leads ilimitados',
        '✓ Produtos ilimitados',
        '✓ Usuários ilimitados',
        '✓ Automações avançadas',
        '✓ Webhooks ilimitados',
        '✓ Suporte prioritário'
      ]
    }
  ]
}

/**
 * Check if subscription is about to expire (within 7 days)
 */
export async function shouldShowExpirationWarning(tenantId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(tenantId)

  if (!status.isActive) return false
  if (status.daysRemaining > 7) return false

  return true
}

/**
 * Handle subscription expiration (logout user)
 */
export async function handleSubscriptionExpiration() {
  try {
    // Sign out user if subscription is expired
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    // Redirect to login with expiration message
    window.location.href = '/login?reason=subscription_expired'
  } catch (error) {
    console.error('Erro ao fazer logout por expiração:', error)
  }
}

/**
 * Update subscription after Stripe webhook event
 */
export async function updateSubscriptionFromWebhook(
  tenantId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any
): Promise<void> {
  try {
    const subscription = event.data.object

    await supabase
      .from('tenants')
      .update({
        subscription_status: subscription.status,
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        subscription_stripe_id: subscription.id,
        subscription_auto_renew: !subscription.cancel_at_period_end
      })
      .eq('id', tenantId)
  } catch (error) {
    console.error('Erro ao atualizar subscription:', error)
    throw error
  }
}

interface StripePrice {
  id: string
  unit_amount: number
  currency: string
  recurring: {
    interval: string
    interval_count: number
  } | null
  nickname?: string
}

/**
 * Get prices from Stripe API
 */
export async function getStripePrices(): Promise<StripePrice[]> {
  try {
    const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY)
    if (!stripe) throw new Error('Failed to load Stripe')

    // Get price IDs from environment variables
    const priceIds = [
      import.meta.env.VITE_STRIPE_PRICE_MENSAL,
      import.meta.env.VITE_STRIPE_PRICE_SEMESTRAL,
      import.meta.env.VITE_STRIPE_PRICE_ANUAL,
      import.meta.env.VITE_STRIPE_PRICE_MENSAL_TEST,
      import.meta.env.VITE_STRIPE_PRICE_SEMESTRAL_TEST,
      import.meta.env.VITE_STRIPE_PRICE_ANUAL_TEST
    ].filter(Boolean) // Remove undefined values

    // For now, we'll return mock data since Stripe.js doesn't provide a direct way to fetch prices
    // In production, you'd need a backend endpoint to fetch prices securely
    const mockPrices: StripePrice[] = [
      {
        id: import.meta.env.VITE_STRIPE_PRICE_MENSAL || 'price_mensal',
        unit_amount: 4000, // R$ 40.00
        currency: 'brl',
        recurring: { interval: 'month', interval_count: 1 },
        nickname: 'Mensal'
      },
      {
        id: import.meta.env.VITE_STRIPE_PRICE_SEMESTRAL || 'price_semestral',
        unit_amount: 21000, // R$ 210.00
        currency: 'brl',
        recurring: { interval: 'month', interval_count: 6 },
        nickname: 'Semestral'
      },
      {
        id: import.meta.env.VITE_STRIPE_PRICE_ANUAL || 'price_anual',
        unit_amount: 36000, // R$ 360.00
        currency: 'brl',
        recurring: { interval: 'year', interval_count: 1 },
        nickname: 'Anual'
      }
    ]

    return mockPrices
  } catch (error) {
    console.error('Erro ao buscar preços da Stripe:', error)
    throw error
  }
}

interface StripePrice {
  id: string
  object: string
  active: boolean
  billing_scheme: string
  created: number
  currency: string
  custom_unit_amount: null
  livemode: boolean
  lookup_key: null
  metadata: Record<string, string>
  nickname: null
  recurring: {
    aggregate_usage: null
    interval: 'month' | 'year'
    interval_count: number
    trial_period_days: null
    usage_type: string
  }
  tax_behavior: string
  tiers_mode: null
  transform_quantity: null
  type: string
  unit_amount: number
  unit_amount_decimal: string
}

interface CachedPrices {
  data: Record<string, StripePrice>
  timestamp: number
}

// Cache em memória com TTL de 1 hora
let priceCache: CachedPrices | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1 hora

/**
 * Busca informações de um preço específico da Stripe via Edge Function
 */
export async function fetchPriceFromStripe(priceId: string): Promise<StripePrice | null> {
  try {
    console.log(`[Stripe] Buscando preço ${priceId}...`)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      console.warn('[Stripe] ⚠️ Supabase URL ou anon key não configurados')
      return null
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-get-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ priceId })
    })

    if (!response.ok) {
      const errorText = await response.text()

      // Handle 404 specifically - price doesn't exist in Stripe
      if (response.status === 500 && errorText.includes('404')) {
        console.warn(`[Stripe] ⚠️ Price ID "${priceId}" não encontrado na sua conta Stripe.`)
        console.warn('[Stripe] 💡 Verifique se o Price ID está correto em: https://dashboard.stripe.com/products')
        console.warn('[Stripe] 📖 Veja docs/STRIPE_TROUBLESHOOTING.md para mais informações')
        return null
      }

      console.error(`[Stripe] ❌ Erro ao buscar preço ${priceId}:`, response.status, errorText)
      return null
    }

    const data = await response.json()
    console.log(`[Stripe] ✅ Preço ${priceId} encontrado:`, data)
    return data as StripePrice
  } catch (error) {
    console.error(`[Stripe] ❌ Erro ao buscar preço ${priceId}:`, error)
    return null
  }
}

/**
 * Busca múltiplos preços da Stripe e faz cache
 */
export async function getPricesFromStripe(priceIds: string[]): Promise<Record<string, StripePrice>> {
  // Verifica cache
  const now = Date.now()
  if (priceCache && now - priceCache.timestamp < CACHE_DURATION) {
    const cachedPrices: Record<string, StripePrice> = {}
    for (const id of priceIds) {
      if (priceCache.data[id]) {
        cachedPrices[id] = priceCache.data[id]
      }
    }
    if (Object.keys(cachedPrices).length === priceIds.length) {
      console.log('[Stripe] Usando preços do cache')
      return cachedPrices
    }
  }

  // Busca preços da Stripe
  console.log('[Stripe] Buscando preços da Stripe...')
  const prices: Record<string, StripePrice> = {}

  for (const priceId of priceIds) {
    if (priceId) {
      const price = await fetchPriceFromStripe(priceId)
      if (price) {
        prices[priceId] = price
      }
    }
  }

  // Atualiza cache
  if (Object.keys(prices).length > 0) {
    priceCache = {
      data: prices,
      timestamp: now,
    }
  }

  return prices
}

/**
 * Converte um preço da Stripe para formato de centavos para reais
 */
export function convertStripePriceToReais(unitAmount: number): number {
  // Stripe retorna valores em centavos
  return unitAmount / 100
}

/**
 * Calcula desconto entre dois preços
 */
export function calculateDiscount(
  originalPrice: number,
  discountedPrice: number,
  months: number = 6
): {
  percentageOff: number
  amountSaved: number
  pricePerMonth: number
} {
  const amountSaved = originalPrice - discountedPrice
  const percentageOff = Math.round((amountSaved / originalPrice) * 100)
  const pricePerMonth = discountedPrice / months

  return {
    percentageOff,
    amountSaved,
    pricePerMonth,
  }
}

/**
 * Formata preço em BRL
 */
export function formatPriceInBRL(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

