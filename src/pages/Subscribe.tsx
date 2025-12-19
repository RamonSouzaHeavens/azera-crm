import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { PLANS } from '../config/plans'
import { useAuthStore } from '../stores/authStore'
import { useSubscription } from '../hooks/useSubscription'
import { formatNextBillingDate, getPlanName } from '../lib/subscription'
import { CreditCard, AlertCircle, Rocket, Zap, Check, ShieldCheck, Star, LayoutGrid } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const COMMON_FEATURES = [
  'Leads ilimitados',
  'WhatsApp integrado',
  'Automações e IA',
  'Catálogo completo',
  'Relatórios avançados',
  'Equipe ilimitada'
]

const Subscribe = () => {
  const { t } = useTranslation()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const canceled = searchParams.get('canceled')
  const user = useAuthStore((state) => state.user)
  const { subscription, loading } = useSubscription()
  const isDark = useThemeStore((state) => state.isDark)

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
    <div className={`relative w-full min-h-full flex flex-col font-sans overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'}`}>

      {/* Font Loader for 'Outfit' to avoid external tailwind config dependency */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
      `}</style>

      {/* Background Ambient Effects - Static, No Pulse */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-[20%] -right-[10%] w-[700px] h-[700px] rounded-full blur-[120px] opacity-10 mix-blend-screen ${isDark ? 'bg-cyan-900' : 'bg-cyan-200'}`} />
      </div>

      <div className="relative z-10 flex-1 md:px-8 w-full">
        <div className="max-w-6xl mx-auto">

          {/* Header Section */}
          <div className="mb-10 md:mb-14 text-center md:text-left">
            <h1 className={`text-3xl md:text-5xl font-outfit font-light mb-4 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('subscribe.header.title')}
            </h1>
            <p className={`text-lg md:text-base max-w-2xl font-light leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('subscribe.header.subtitle')}
            </p>

            {canceled && (
              <div className={`mt-6 inline-flex items-center gap-3 px-4 py-3 rounded-xl border animate-in fade-in slide-in-from-top-4 ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{t('subscribe.alerts.canceled')}</span>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Context & Dashboard (5 columns) */}
            <div className="lg:col-span-5 space-y-6 flex flex-col">

              {/* Current Subscription Status Card */}
              {loading ? (
                <div className={`animate-pulse h-48 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-200'}`} />
              ) : subscription && subscription.status !== 'canceled' ? (
                <div className={`rounded-3xl p-6 border transition-all relative overflow-hidden group ${isDark
                  ? 'bg-slate-900/60 border-slate-700/50 backdrop-blur-xl shadow-xl'
                  : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
                  }`}>
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <h3 className={`font-outfit font-light text-base ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Sua Assinatura</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${subscription.status === 'active'
                      ? isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${subscription.status === 'active' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                      {subscription.status === 'active' ? t('subscribe.status.active') : t('subscribe.status.trial')}
                    </span>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Plano Atual</p>
                      <div className="flex items-baseline gap-2">
                        <p className={`text-2xl font-outfit font-light ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {getPlanName(subscription.stripe_price_id)}
                        </p>
                      </div>
                    </div>

                    {subscription.current_period_end && (
                      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Próxima renovação</span>
                          <span className={`text-sm font-medium tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                            {formatNextBillingDate(subscription.current_period_end)}
                          </span>
                        </div>
                        {(() => {
                          const endDate = new Date(subscription.current_period_end)
                          const today = new Date()
                          const diffTime = endDate.getTime() - today.getTime()
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                          const progress = Math.max(5, Math.min(100, (diffDays / 30) * 100))

                          const isUrgent = diffDays < 7;
                          const colorClass = isUrgent ? 'bg-amber-500' : 'bg-emerald-500';
                          const textColorClass = isUrgent ? 'text-amber-500' : 'text-emerald-500';

                          return (
                            <div className="space-y-3">
                              <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                <div
                                  style={{ width: `${progress}%` }}
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
                                />
                              </div>
                              <div className="flex justify-end">
                                <p className={`text-xs font-bold flex items-center gap-1 ${textColorClass}`}>
                                  {isUrgent && <AlertCircle className="w-3 h-3" />}
                                  {diffDays > 0 ? diffDays : 0} dias restantes
                                </p>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Launch Offer Banner */}
              <div className={`relative rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden border ${isDark ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white border-slate-200 shadow-xl'
                }`}>
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${isDark
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                          <Rocket className="w-3 h-3 fill-current" /> Válido para os primeiros clientes
                        </span>
                      </div>
                      <h3 className={`text-xl md:text-2xl font-outfit font-light mb-2 leading-tight bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 ml-0 ${isDark ? 'text-transparent' : 'text-transparent'}`}>
                        Upgrade Promocional
                      </h3>
                      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Assine via WhatsApp com preço especial de lançamento: <strong>R$ 50/mês</strong>, <strong>R$ 300 semestral</strong> ou <strong>R$ 600 anual</strong>.
                      </p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <Zap className={`w-7 h-7 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                    </div>
                  </div>

                  <div className={`flex items-baseline gap-3 mb-6 p-4 rounded-xl border ${isDark
                    ? 'bg-slate-800/40 border-slate-700/50'
                    : 'bg-slate-50 border-slate-200'
                    }`}>
                    <span className={`text-sm line-through decoration-slate-500/50 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>R$ 80</span>
                    <div className="flex flex-col">
                      <span className="text-3xl font-outfit font-light text-slate-200">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 font-medium font-outfit">
                          R$ 50
                        </span>
                        <span className="text-sm text-slate-500 font-medium ml-1">/mês</span>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.open('https://wa.me/5531991318312?text=Oi quero ativar minha assinatura com a oferta de lançamento', '_blank')}
                  className="relative z-10 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Resgatar Oferta Agora
                  <Rocket className="w-4 h-4" />
                </button>

                <p className={`text-[10px] text-center mt-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Preço promocional válido enquanto a assinatura permanecer ativa. Condição especial de lançamento, não cumulativa com outras ofertas.
                </p>
              </div>


            </div>

            {/* Right Column: Plans List (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className={`text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Planos Disponíveis
                </h2>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                  const isRecommended = plan.id === 'annual'
                  return (
                    <div
                      key={plan.id}
                      className={`relative group rounded-3xl transition-all duration-300 overflow-hidden flex flex-col ${isRecommended
                        ? `border-2 ${isDark ? 'bg-slate-800/60 border-cyan-500/50' : 'bg-white border-cyan-500'} shadow-xl shadow-cyan-900/20`
                        : `border ${isDark ? 'bg-slate-900/40 border-slate-800 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-cyan-300'}`
                        }`}
                    >
                      {/* Highlight Glow for Recommended */}
                      {isRecommended && (
                        <div className={`absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-cyan-500/10 to-transparent blur-3xl -z-10`} />
                      )}

                      {/* Recommended Badge */}
                      {isRecommended && (
                        <div className="absolute top-0 right-0 left-0 text-center py-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm z-20">
                           <span className="flex items-center justify-center gap-1.5"><Star className="w-3 h-3 fill-current" /> Melhor Valor</span>
                        </div>
                      )}

                      <div className={`p-5 flex flex-col h-full relative z-10 ${isRecommended ? 'pt-8' : ''}`}>

                        <div className="mb-4">
                            <h3 className={`text-lg font-outfit font-medium mb-1 ${isRecommended ? (isDark ? 'text-cyan-50' : 'text-cyan-900') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                              {plan.name}
                            </h3>
                            {isRecommended && (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold ${isDark ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'}`}>
                                -35% OFF
                              </span>
                            )}
                            <p className={`text-xs mt-2 leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {plan.description}
                            </p>
                        </div>

                        <div className="mt-auto pt-4 border-t border-dashed border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className={`text-2xl font-outfit font-light tracking-tight ${isRecommended ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                {plan.id === 'monthly'
                                  ? currency.format(plan.price)
                                  : plan.id === 'semiannual'
                                    ? currency.format(70)
                                    : currency.format(65)
                                }
                              </span>
                              <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>/mês</span>
                            </div>

                            {plan.id !== 'monthly' && (
                              <p className={`text-[10px] font-medium mb-4 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                Faturado {plan.id === 'annual' ? 'anualmente' : 'semestralmente'}
                              </p>
                            )}
                            {plan.id === 'monthly' && <div className="h-[27px]" />}

                          <button
                            onClick={() => handleSubscribe(plan.priceId)}
                            disabled={!plan.priceId || loadingPlan === plan.priceId || !user}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 group/btn ${loadingPlan === plan.priceId
                              ? 'bg-slate-700 text-slate-400 cursor-wait'
                              : isRecommended
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transform hover:-translate-y-0.5 active:translate-y-0'
                                : isDark
                                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 hover:border-slate-300'
                              }`}
                          >
                            {loadingPlan === plan.priceId ? (
                              '...'
                            ) : (
                              <>
                                {t('subscribe.buttons.subscribe')}
                                {isRecommended && <Check className="w-3 h-3 transition-transform group-hover/btn:scale-110" />}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Common Features List */}
              <div className={`rounded-3xl p-6 border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <LayoutGrid className="w-4 h-4" /> Incluído em todos os planos
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-4">
                  {COMMON_FEATURES.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <Check className="w-3 h-3" />
                      </div>
                      <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust/Footer */}
              <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider font-medium opacity-50 hover:opacity-80 transition-opacity cursor-help">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Pagamento seguro via <strong>Stripe</strong></span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Subscribe
