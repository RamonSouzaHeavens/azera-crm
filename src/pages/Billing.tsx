import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../hooks/useSubscription'
import { SubscriptionStatus } from '../components/SubscriptionStatus'
import { formatNextBillingDate, getPlanName } from '../lib/subscription'

const Billing = () => {
  const { t } = useTranslation()
  const { subscription, loading, error, isActive } = useSubscription()
  const [managing, setManaging] = useState(false)

  const handlePortal = async () => {
    try {
      setManaging(true)
      const { data, error: fnError } = await supabase.functions.invoke<{ url: string }>(
        'stripe-portal',
        { body: {} }
      )

      if (fnError) throw new Error(fnError.message)
      if (!data?.url) throw new Error(t('billing.portalUrlUnavailable'))

      window.location.href = data.url
    } catch (err) {
      const message = err instanceof Error ? err.message : t('billing.portalError')
      toast.error(message)
    } finally {
      setManaging(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-500">{t('billing.loadingSubscription')}</div>
  }

  if (error) {
    return (
      <div className="p-6 text-rose-500">
        {t('billing.fetchError')}
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('billing.noSubscriptionFound')}
        </p>
        <p className="text-slate-600 dark:text-slate-300">
          {t('billing.subscribeToAccess')}
        </p>
        <Link
          to="/subscribe"
          className="inline-flex items-center rounded-full bg-cyan-500 text-white px-4 py-2 font-semibold hover:bg-cyan-400 transition"
        >
          {t('billing.viewPlans')}
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {t('billing.title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          {t('billing.subtitle')}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('billing.subscriptionStatus')}</p>
          <SubscriptionStatus />
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <p>{t('billing.plan')}: {getPlanName(subscription.stripe_price_id)}</p>
            <p>{t('billing.nextBilling')}: {formatNextBillingDate(subscription.current_period_end)}</p>
            <p>
              {t('billing.autoRenewal')}:{' '}
              {subscription.cancel_at_period_end ? t('billing.cancelsAtPeriodEnd') : t('billing.active')}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('billing.management')}</p>
            <p className="text-lg font-semibold mt-2 text-slate-900 dark:text-white">
              {t('billing.billingPortal')}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('billing.portalDescription')}
            </p>
          </div>
          <button
            onClick={handlePortal}
            disabled={!isActive || managing}
            className="mt-4 rounded-full bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-900 font-semibold py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {managing ? t('billing.openingPortal') : t('billing.manageSubscription')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Billing
