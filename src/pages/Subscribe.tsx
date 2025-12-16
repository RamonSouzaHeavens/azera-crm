import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { PLANS } from '../config/plans'
import { useAuthStore } from '../stores/authStore'
import { useSubscription } from '../hooks/useSubscription'
import { formatNextBillingDate, getPlanName } from '../lib/subscription'
import { CreditCard, AlertCircle, Rocket, Zap } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const Subscribe = () => {
  const { t } = useTranslation()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const canceled = searchParams.get('canceled')
  const user = useAuthStore((state) => state.user)
  const { subscription, loading } = useSubscription() // isActive removido pois não estava sendo usado explicitamente além da lógica interna
  const isDark = useThemeStore((state) => state.isDark)

  // Função movida para dentro do componente para usar 't'
  const getPlanIntervalLabel = (interval: 'month' | 'year', count?: number) => {
    if (interval === 'year') return t('subscribe.plans.intervals.year')
    if (!count || count === 1) return t('subscribe.plans.intervals.month')
    return t('subscribe.plans.intervals.custom', { count })
  }

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      toast.error(t('subscribe.toasts.loginRequired'))
      return
    }

    try {
      setLoadingPlan(priceId)
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        'stripe-checkout',
        {
          body: { priceId }
        }
      )

      if (error) {
        console.error('[Subscribe] Error:', error.message)

        // Tentar extrair mensagem de erro mais detalhada do Response
        let errorMessage = error.message || t('subscribe.errors.checkoutInit')

        const context = (error as any).context
        if (context instanceof Response) {
          try {
            const text = await context.text()
            console.error('[Subscribe] Error response text:', text)
            try {
              const body = JSON.parse(text)
              console.error('[Subscribe] Error body:', body)
              errorMessage = body.error || body.message || errorMessage
              if (body.details) {
                console.error('[Subscribe] Error details from server:', body.details)
              }
            } catch {
              console.error('[Subscribe] Response is not JSON')
              errorMessage = text || errorMessage
            }
          } catch (readErr) {
            console.error('[Subscribe] Could not read response:', readErr)
          }
        }

        throw new Error(errorMessage)
      }

      if (!data?.url) {
        console.error('[Subscribe] No URL in response:', data)
        throw new Error(t('subscribe.errors.urlNotFound'))
      }

      window.location.href = data.url
    } catch (err) {
      console.error('[Subscribe] Caught error:', err)
      const message = err instanceof Error ? err.message : t('subscribe.errors.unexpected')
      toast.error(message)
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="text-slate-900 dark:text-slate-200 flex flex-col min-h-full relative overflow-hidden">
      {/* HUD glow grid background + overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
      </div>

      <div className="flex-1 overflow-y-auto pb-6 px-6 relative z-10">
        <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark
                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
                : 'bg-gradient-to-br from-cyan-100 to-blue-100'
                }`}>
                <CreditCard className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </div>
              <h1 className={`text-3xl font-bold font-outfit ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('subscribe.header.title')}
              </h1>
            </div>
            <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('subscribe.header.subtitle')}
            </p>
            {canceled && (
              <div className={`mt-3 p-3 rounded-xl flex items-start gap-3 ${isDark
                ? 'bg-amber-500/10 border border-amber-500/30'
                : 'bg-amber-50 border border-amber-200'
                }`}>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'
                  }`} />
                <span className={isDark ? 'text-amber-200' : 'text-amber-800'}>
                  {t('subscribe.alerts.canceled')}
                </span>
              </div>
            )}
          </div>

          {/* Launch Offer Banner */}
          <div className={`relative w-full rounded-3xl border overflow-hidden ${isDark
              ? 'bg-white/5 border-white/10'
              : 'bg-slate-50 border-slate-200'
            }`}>
            {/* Decorative top gradient */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-600" />

            <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark
                    ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
                    : 'bg-gradient-to-br from-cyan-100 to-purple-100 border border-cyan-200'
                  }`}>
                  <Rocket className={`w-8 h-8 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${isDark
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
                    }`}>
                    🚀 Oferta de Lançamento
                  </span>
                </div>
                <p className={`max-w-xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Aproveite o preço especial de lançamento: de <span className="line-through">R$ 80</span> por apenas <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>R$ 50/mês</span>. Automações ilimitadas e suporte prioritário inclusos.
                </p>
              </div>

              {/* Price + Action */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${isDark
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                  -37% OFF
                </div>
                <button
                  onClick={() => window.open('https://wa.me/5531991318312?text=Oi quero ativar minha assinatura com a oferta de lançamento', '_blank')}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  R$ 50/mês - Ativar
                </button>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="space-y-6">
            {/* Status Atual - Redesenhado */}
            <div className={`rounded-3xl border p-6 ${isDark
              ? 'bg-white/5 border-white/10'
              : 'bg-slate-50 border-slate-200'
              }`}>
              {loading ? (
                <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('subscribe.status.loading')}
                </div>
              ) : !subscription ? (
                <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('subscribe.status.noSubscription')}
                </div>
              ) : subscription.status === 'canceled' ? (
                <div className={`space-y-3`}>
                  <div className={`text-sm font-medium ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                    {t('subscribe.status.canceledTitle')}
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('subscribe.status.canceledAt', { date: formatNextBillingDate(subscription.updated_at) })}
                  </p>
                  <div className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-600'} break-all`}>
                    {t('subscribe.status.idLabel')}: {subscription.id}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Linha 1: Status e Plano */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {t('subscribe.status.currentStatusLabel')}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${subscription.status === 'active'
                        ? isDark ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : isDark ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-300'
                        }`}>
                        {subscription.status === 'active' ? t('subscribe.status.active') : t('subscribe.status.trial')}
                      </span>
                    </div>

                    <div className={`${isDark ? 'border-slate-700' : 'border-slate-300'} border-l pl-4`}>
                      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{t('subscribe.status.planLabel')}:</span>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {getPlanName(subscription.stripe_price_id)}
                      </p>
                    </div>

                    {subscription.current_period_end && (
                      <div className={`${isDark ? 'border-slate-700' : 'border-slate-300'} border-l pl-4`}>
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{t('subscribe.status.nextBillingLabel')}:</span>
                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {formatNextBillingDate(subscription.current_period_end)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Linha 2: Mensagem e ID */}
                  <div className={`pt-4 space-y-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                    <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      {t('subscribe.status.activeMessage')}
                    </p>
                    <div className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-600'} break-all`}>
                      {t('subscribe.status.idLabel')}: {subscription.id}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Plans Grid */}
            <div id="plans-grid" className="grid gap-6 md:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-3xl border overflow-hidden flex flex-col justify-between transition-all duration-300 ${isDark
                    ? 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:shadow-lg hover:shadow-cyan-500/10'
                    : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10'
                    }`}
                >
                  <div className="p-6 space-y-4">
                    {/* Plan Name */}
                    <div>
                      <p className={`text-sm uppercase tracking-widest font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                        {plan.name}
                      </p>
                    </div>

                    {/* Price */}
                    <div>
                      {/* Valor mensal em destaque */}
                      <p className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {plan.id === 'monthly'
                          ? currency.format(plan.price)
                          : plan.id === 'semiannual'
                            ? currency.format(65)
                            : currency.format(60)
                        }
                      </p>

                      <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {plan.id === 'monthly'
                          ? getPlanIntervalLabel(plan.interval, plan.intervalCount)
                          : 'por mês'
                        }
                      </p>
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Button */}
                  <div className="px-6 pb-6">
                    <button
                      onClick={() => handleSubscribe(plan.priceId)}
                      disabled={!plan.priceId || loadingPlan === plan.priceId || !user}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 ${loadingPlan === plan.priceId
                        ? isDark
                          ? 'bg-cyan-500/50 text-white cursor-wait'
                          : 'bg-cyan-400/50 text-slate-900 cursor-wait'
                        : !plan.priceId || !user
                          ? isDark
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-200 text-slate-600 cursor-not-allowed'
                          : isDark
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95'
                            : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95'
                        }`}
                    >
                      {loadingPlan === plan.priceId ? t('subscribe.buttons.redirecting') : t('subscribe.buttons.subscribe')}
                    </button>
                    {/* Botão de teste em DEV ou quando testPriceId estiver disponível */}
                    {(import.meta.env.DEV || plan.testPriceId) && plan.testPriceId && (
                      <button
                        onClick={() => handleSubscribe(plan.testPriceId!)}
                        disabled={!plan.testPriceId || loadingPlan === plan.testPriceId || !user}
                        className={`w-full mt-3 py-2 px-4 rounded-xl font-medium text-sm transition-all duration-300 ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                      >
                        {loadingPlan === plan.testPriceId ? t('subscribe.buttons.redirectingTest') : t('subscribe.buttons.testCheckout')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Info */}
            <div className={`rounded-3xl border p-6 ${isDark
              ? 'bg-white/5 border-white/10'
              : 'bg-slate-50 border-slate-200'
              }`}>
              <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {/* Note: Usando Trans se necessário para negrito, mas aqui simplificado para interpolação básica ou texto fixo pois a estrutura pede apenas strings simples se possível, ou dangerouslySetInnerHTML. Para manter simples no JSON: */}
                {t('subscribe.footer.securePaymentStart')} <span className="font-semibold">Stripe</span>. {t('subscribe.footer.noLoyalty')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Subscribe
