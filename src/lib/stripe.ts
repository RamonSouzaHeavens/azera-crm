import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY

if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY não configurada nas variáveis de ambiente do servidor.')
}

export const stripe = new Stripe(secretKey, {
  apiVersion: '2023-10-16',
  typescript: true
})
