export type SubscriptionStatus =
  | 'active'
  | 'incomplete'
  | 'past_due'
  | 'canceled'
  | 'trialing'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  status: SubscriptionStatus
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface PricingPlan {
  id: string
  name: string
  price: number
  priceId: string
  testPriceId?: string
  testName?: string
  interval: 'month' | 'year'
  intervalCount?: number
  description?: string
}
