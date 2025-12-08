import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useSubscription } from '../hooks/useSubscription'
import { formatNextBillingDate } from '../lib/subscription'
import { useThemeStore } from '../stores/themeStore'

export const SubscriptionCard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { subscription, isActive, loading } = useSubscription()
  const isDark = useThemeStore((state) => state.isDark)

  const handleManageSubscription = () => {
    // Redireciona para o portal do Stripe onde o usuário pode gerenciar sua assinatura
    navigate('/billing')
    toast.success(t('subscriptionCard.toasts.openingPortal'))
  }

  if (loading) {
    return (
      <div className={`border-t border-slate-200 dark:border-white/10 pt-8 mt-8`}>
        <div className="animate-pulse">
          <div className={`h-6 w-32 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          <div className={`h-4 w-64 rounded ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-slate-200 dark:border-white/10 pt-8 mt-8">
      <div className="mb-6">
        <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t('subscriptionCard.header.title')}
        </h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {t('subscriptionCard.header.description')}
        </p>
      </div>

      {!subscription || !isActive ? (
        <div className={`rounded-xl p-6 border ${isDark
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-amber-50 border-amber-200'
          }`}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'
              }`}>
              <span className={`text-lg ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>💳</span>
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold mb-1 ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
                {t('subscriptionCard.noSubscription.title')}
              </h4>
              <p className={`text-sm mb-4 ${isDark ? 'text-amber-300/80' : 'text-amber-800/80'}`}>
                {t('subscriptionCard.noSubscription.description')}
              </p>
              <Link
                to="/subscribe"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isDark
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
              >
                {t('subscriptionCard.buttons.viewPlans')} →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden transition-all ${isDark
            ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
          }`}>
          {/* Header */}
          <div className={`px-5 py-3 border-b relative overflow-hidden ${isDark
              ? 'border-white/10 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10'
              : 'border-slate-200 bg-gradient-to-r from-emerald-50/60 to-cyan-50/60'
            }`}>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('subscriptionCard.active.title')}
                </h4>
              </div>

              <button
                onClick={handleManageSubscription}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${isDark
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
              >
                {t('subscriptionCard.buttons.manage')}
              </button>
            </div>
          </div>

          {/* Body - mais compacto */}
          <div className="p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Próxima Cobrança */}
              <div className={`p-3 rounded-lg ${isDark
                  ? 'bg-white/5'
                  : 'bg-slate-50'
                }`}>
                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('subscriptionCard.active.nextBillingLabel')}
                </div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {subscription.current_period_end
                    ? formatNextBillingDate(subscription.current_period_end)
                    : t('subscriptionCard.active.notDefined')}
                </p>
              </div>

              {/* Status */}
              <div className={`p-3 rounded-lg ${isDark
                  ? 'bg-white/5'
                  : 'bg-slate-50'
                }`}>
                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('subscriptionCard.active.statusLabel')}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                  <p className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {t('subscriptionCard.active.statusActive')}
                  </p>
                </div>
              </div>
            </div>

            {/* Aviso de Cancelamento */}
            {subscription.cancel_at_period_end && (
              <div className={`rounded-lg p-3 border text-xs ${isDark
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                {t('subscriptionCard.active.cancellationWarning', {
                  date: subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                    : t('subscriptionCard.active.notDefined')
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}