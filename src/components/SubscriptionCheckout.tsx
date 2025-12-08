import React, { useState, useEffect } from 'react'
import { CreditCard, Check, AlertCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { createCheckoutSession, redirectToCheckout, getAvailablePlans } from '../services/stripeService'
import { useAuthStore } from '../stores/authStore'

interface Plan {
  id: string
  name: string
  priceId: string
  price: number
  monthlyEquivalent: number
  billingFrequency: string
  discount: number
  popular?: boolean
  features: string[]
}

export function SubscriptionCheckout() {
  const { user, tenant } = useAuthStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('semiannual')
  const [plans, setPlans] = useState<Plan[]>([])

  // Carrega planos dinamicamente
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const availablePlans = await getAvailablePlans()
        setPlans(availablePlans)
      } catch (error) {
        console.error('[SubscriptionCheckout] Erro ao carregar planos:', error)
      }
    }
    loadPlans()
  }, [])

  const handleCheckout = async (priceId: string) => {
    if (!user?.email || !tenant?.id) {
      toast.error(t('subscription.userInfoNotFound'))
      return
    }

    setLoading(true)
    try {
      const session = await createCheckoutSession(tenant.id, priceId, user.email)
      await redirectToCheckout(session.sessionId)
    } catch (error) {
      toast.error(t('subscription.checkoutError'))
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Formata preço
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <CreditCard className="w-8 h-8 text-cyan-400" />
          <h1 className="text-4xl font-bold text-white">{t('subscription.title')}</h1>
        </div>
        <p className="text-slate-400 text-lg">{t('subscription.subtitle')}</p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-3xl border transition-all duration-300 p-8 relative ${selectedPlan === plan.id
                ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/50 ring-2 ring-purple-400/30'
                : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
          >
            {plan.discount > 0 && (
              <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-bold shadow-lg ${plan.popular
                  ? 'bg-emerald-500 shadow-emerald-500/20'
                  : 'bg-blue-500 shadow-blue-500/20'
                }`}>
                {t('subscription.save', { discount: plan.discount })}
              </div>
            )}

            {plan.popular && plan.discount === 0 && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-sm font-bold shadow-lg">
                ⭐ {t('subscription.mostPopular')}
              </div>
            )}

            {/* Plan Name */}
            <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>

            {/* Price */}
            <div className="mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">{formatPrice(plan.monthlyEquivalent)}</span>
                <span className="text-slate-400">{t('subscription.perMonth')}</span>
              </div>
              {plan.discount > 0 && (
                <p className="text-sm text-slate-400 mt-2">
                  {t('subscription.total')}: {formatPrice(plan.price)} • {plan.billingFrequency}
                </p>
              )}
              {plan.discount === 0 && (
                <p className="text-sm text-slate-400 mt-2">{plan.billingFrequency}</p>
              )}
            </div>

            {/* Button */}
            <button
              onClick={() => {
                setSelectedPlan(plan.id)
                handleCheckout(plan.priceId)
              }}
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold transition-all mb-6 ${selectedPlan === plan.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30'
                  : 'bg-white/10 text-white hover:bg-white/15'
                }`}
            >
              {loading && selectedPlan === plan.id ? (
                <Loader className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                t('subscription.choosePlan')
              )}
            </button>

            {/* Features */}
            <div className="space-y-3 border-t border-white/10 pt-6">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">{t('subscription.faqTitle')}</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-white font-semibold mb-2">{t('subscription.faq.q1.question')}</h3>
            <p className="text-slate-400">{t('subscription.faq.q1.answer')}</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">{t('subscription.faq.q2.question')}</h3>
            <p className="text-slate-400">{t('subscription.faq.q2.answer')}</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">{t('subscription.faq.q3.question')}</h3>
            <p className="text-slate-400">{t('subscription.faq.q3.answer')}</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">{t('subscription.faq.q4.question')}</h3>
            <p className="text-slate-400">{t('subscription.faq.q4.answer')}</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-4 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
        <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-200 font-semibold mb-1">{t('subscription.banner.title')}</p>
          <p className="text-blue-300 text-sm">{t('subscription.banner.description')}</p>
        </div>
      </div>
    </div>
  )
}