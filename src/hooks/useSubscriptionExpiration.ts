import { useEffect, useState } from 'react'
import { getSubscriptionStatus, handleSubscriptionExpiration } from '../services/stripeService'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook que verifica se a subscription expirou e faz logout automático
 */
export function useSubscriptionExpiration() {
  const { tenant, user } = useAuthStore()

  useEffect(() => {
    if (!tenant?.id || !user?.id) return

    // Verificar status a cada 5 minutos
    const checkSubscription = async () => {
      const status = await getSubscriptionStatus(tenant.id)
      
      if (status.isExpired && !status.isActive) {
        // Subscription expirou, fazer logout
        await handleSubscriptionExpiration()
      }
    }

    checkSubscription()

    // Verificar periodicamente
    const interval = setInterval(checkSubscription, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [tenant?.id, user?.id])
}

/**
 * Hook que retorna o status atual da subscription
 */
export function useSubscriptionStatus() {
  const { tenant } = useAuthStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant?.id) return

    const loadStatus = async () => {
      const subscriptionStatus = await getSubscriptionStatus(tenant.id)
      setStatus(subscriptionStatus)
      setLoading(false)
    }

    loadStatus()
  }, [tenant?.id])

  return { status, loading }
}
