import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useSubscription } from '../hooks/useSubscription'
import { getPlanName } from '../lib/subscription'

const badgeStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  trialing: 'bg-blue-100 text-blue-700 border-blue-200',
  past_due: 'bg-amber-100 text-amber-700 border-amber-200',
  incomplete: 'bg-slate-100 text-slate-700 border-slate-200',
  canceled: 'bg-rose-100 text-rose-700 border-rose-200',
  // Estilo para canceled mas ainda válido (dentro do período pago)
  canceled_valid: 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

export const SubscriptionStatus: FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation()
  const { subscription, loading, error } = useSubscription()

  // Verificar se é assinatura REAL (Stripe ou manual)
  const isRealSubscription = (
    subscription?.stripe_subscription_id?.startsWith('sub_') ||
    subscription?.stripe_subscription_id?.startsWith('manual_')
  ) ?? false

  const rawStatus = subscription?.status ?? 'incomplete'

  // Se está canceled mas ainda no período válido, mostrar como válido
  const isCanceledButValid = rawStatus === 'canceled' &&
    subscription?.current_period_end &&
    new Date(subscription.current_period_end) > new Date()

  // Status para exibição e estilo
  const displayStatus = isCanceledButValid ? 'canceled_valid' : rawStatus
  const badgeClass = badgeStyles[displayStatus] ?? badgeStyles.incomplete

  if (loading) {
    return (
      <div className={`text-sm text-slate-500 dark:text-slate-300 ${className}`}>
        {t('subscriptionStatus.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-sm text-rose-500 ${className}`}>
        {t('subscriptionStatus.error')}
      </div>
    )
  }

  // Não mostrar nada para usuários sem assinatura real
  if (!subscription || !isRealSubscription) {
    return null
  }

  return (
    <div className={`flex flex-col text-xs ${className}`}>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full border font-medium capitalize ${badgeClass}`}
      >
        {/* Mapeia o status técnico para a chave de tradução, com fallback para o texto original formatado */}
        {isCanceledButValid
          ? t('subscriptionStatus.statuses.active', { defaultValue: 'Ativo' })
          : t(`subscriptionStatus.statuses.${rawStatus}`, { defaultValue: rawStatus.replace('_', ' ') })
        }
      </span>
      <span className="text-slate-500 dark:text-slate-300 mt-1">
        {t('subscriptionStatus.planLabel')}: {getPlanName(subscription.stripe_price_id)}
      </span>
    </div>
  )
}
