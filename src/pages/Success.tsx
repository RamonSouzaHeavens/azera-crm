import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Calendar, CreditCard, Sparkles } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { useSubscription } from '../hooks/useSubscription'
import { formatNextBillingDate, getPlanDetails } from '../lib/subscription'
import { SubscriptionTimer } from '../components/SubscriptionTimer'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

const Success = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const isDark = useThemeStore((state) => state.isDark)
  const { subscription, isActive, loading, refetch } = useSubscription()
  const [countdown, setCountdown] = useState(5)

  // Ativar subscription se ainda não estiver ativa
  useEffect(() => {
    const activateSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sub && sub.status !== 'active') {
          const { error: syncError } = await supabase.functions.invoke('stripe-sync-subscription', {
            body: { userId: user.id }
          })

          if (syncError) {
            // fallback
            await supabase
              .from('subscriptions')
              .update({ status: 'active' })
              .eq('id', sub.id)
          }

          toast.success(t('success.subscriptionActivated'))
          await refetch()
        }
      } catch (err) {
        console.error('Erro ao ativar subscription:', err)
      }
    }

    activateSubscription()
  }, [refetch, t])

  // Auto-redirect
  useEffect(() => {
    if (!loading && isActive) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/dashboard')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [loading, isActive, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
          <p>{t('success.checkingSubscription')}</p>
        </div>
      </div>
    )
  }

  const planDetails = subscription ? getPlanDetails(subscription.stripe_price_id) : null

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Ícone de sucesso */}
        <div className="text-center">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${isDark
            ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 shadow-lg shadow-emerald-500/20'
            : 'bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg shadow-emerald-500/10'
            }`}>
            <CheckCircle2 className={`w-10 h-10 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('success.title')}
          </h1>
          <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('success.subtitle')}
          </p>
        </div>

        {/* Card principal */}
        <div className={`rounded-3xl border p-8 ${isDark
          ? 'bg-white/5 border-white/10'
          : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
          }`}>
          <div className="space-y-6">
            {/* Plano */}
            <div className="flex items-start gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark
                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
                : 'bg-gradient-to-br from-cyan-100 to-blue-100'
                }`}>
                <Sparkles className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('success.planTitle', { plan: planDetails?.name || 'Azera' })}
                </h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('success.planDescription')}
                </p>
              </div>
            </div>

            {/* Detalhes da assinatura */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('success.nextBilling')}
                  </span>
                </div>
                <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {subscription?.current_period_end
                    ? formatNextBillingDate(subscription.current_period_end)
                    : t('success.loading')}
                </p>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('success.status')}
                  </span>
                </div>
                <p className={`text-lg font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {subscription?.status === 'active' ? t('success.statusActive') : subscription?.status || t('success.checking')}
                </p>
              </div>
            </div>

            {/* Timer de assinatura */}
            {subscription?.created_at && (
              <div className={`p-4 rounded-xl border ${isDark
                ? 'bg-cyan-500/5 border-cyan-500/20'
                : 'bg-cyan-50 border-cyan-200'
                }`}>
                <SubscriptionTimer
                  createdAt={subscription.created_at}
                  className={isDark ? 'text-cyan-300' : 'text-cyan-800'}
                />
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${isDark
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 hover:shadow-lg hover:shadow-cyan-500/20'
              : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 hover:shadow-lg hover:shadow-cyan-500/20'
              } active:scale-95`}
          >
            {t('success.goToDashboard')}
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/app/billing')}
            className={`py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${isDark
              ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
              } active:scale-95`}
          >
            {t('success.manageSubscription')}
          </button>
        </div>

        {/* Auto-redirect */}
        {isActive && countdown > 0 && (
          <p className={`text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
            {t('success.redirecting', { seconds: countdown })}
          </p>
        )}

        {/* Debug Session ID */}
        {sessionId && (
          <p className={`text-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Session ID: {sessionId}
          </p>
        )}
      </div>
    </div>
  )
}

export default Success
