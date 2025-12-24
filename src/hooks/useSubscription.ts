import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Subscription } from '../types/subscription'
import { isSubscriptionActive } from '../lib/subscription'
import { useAuthStore } from '../stores/authStore'

// Flag para bypass em desenvolvimento - defina como true para testar funcionalidades premium
const DEV_BYPASS_SUBSCRIPTION = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_SUBSCRIPTION === 'true'

// Emails de administradores que sempre têm acesso premium (bypass da verificação Stripe)
const ADMIN_BYPASS_EMAILS = [
  'ramonexecut@gmail.com'
]

/**
 * Modelo de negócio:
 * - Cada usuário precisa da sua própria assinatura
 * - Vendedores NÃO herdam assinatura do owner/tenant
 * - Funcionalidades gratuitas: equipe básica, até 5 produtos, leads ilimitados
 * - Funcionalidades PREMIUM (requer assinatura): distribuição de leads, canais,
 *   ferramentas pro, automações, chaves API
 */
const fetchSubscription = async (userId: string, userEmail?: string): Promise<Subscription | null> => {
  // Se o email é de um admin, retornar assinatura ativa fake
  if (userEmail && ADMIN_BYPASS_EMAILS.includes(userEmail.toLowerCase())) {
    console.log('[useSubscription] Admin bypass ativado para:', userEmail)
    return {
      id: 'admin-bypass',
      user_id: userId,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      status: 'active',
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Subscription
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar subscription:', error)
    throw error
  }

  return data ?? null
}

export const useSubscription = () => {
  const userId = useAuthStore((state) => state.user?.id)
  const userEmail = useAuthStore((state) => state.user?.email)
  const queryClientRef = useRef<any>(null)

  const query = useQuery({
    queryKey: ['subscription', userId, userEmail],
    queryFn: () => fetchSubscription(userId!, userEmail),
    enabled: Boolean(userId),
    staleTime: 5_000, // 5 segundos (era 60 segundos)
    refetchOnMount: 'always', // Sempre buscar ao montar
    retry: 1
  })

  // Capturar queryClient do query object
  useEffect(() => {
    if (!queryClientRef.current && query) {
      queryClientRef.current = (query as any).queryClient
    }
  }, [query])

  // Listener em tempo real para mudanças na subscription
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`subscription:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('[useSubscription] Realtime update detected, refetching...')
          query.refetch()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, query])

  // Calcular isActive considerando DEV_BYPASS
  const isActive = DEV_BYPASS_SUBSCRIPTION || isSubscriptionActive(query.data?.status)

  return {
    subscription: query.data ?? null,
    loading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    isActive,
    refetch: query.refetch,
    // Flag para indicar se está em modo bypass (útil para UI)
    isDevBypass: DEV_BYPASS_SUBSCRIPTION
  }
}


