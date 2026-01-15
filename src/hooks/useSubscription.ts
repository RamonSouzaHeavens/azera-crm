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

  // Buscar TODAS as assinaturas do usuário para selecionar a melhor
  const { data: allSubscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar subscription:', error)
    throw error
  }

  if (!allSubscriptions || allSubscriptions.length === 0) {
    return null
  }

  // Se só tem uma, retorna ela
  if (allSubscriptions.length === 1) {
    return allSubscriptions[0]
  }

  // Múltiplas assinaturas - selecionar a melhor
  const now = new Date()

  // Prioridade 1: Status 'active'
  const activeSubscription = allSubscriptions.find(s => s.status === 'active')
  if (activeSubscription) {
    console.log('[useSubscription] Múltiplas assinaturas - usando a com status active')
    return activeSubscription
  }

  // Prioridade 2: Status 'trialing'
  const trialingSubscription = allSubscriptions.find(s => s.status === 'trialing')
  if (trialingSubscription) {
    console.log('[useSubscription] Múltiplas assinaturas - usando a com status trialing')
    return trialingSubscription
  }

  // Prioridade 3: Status 'canceled' mas com current_period_end no futuro
  const validCanceledSubscription = allSubscriptions
    .filter(s => s.status === 'canceled' && s.current_period_end)
    .filter(s => new Date(s.current_period_end!) > now)
    .sort((a, b) => new Date(b.current_period_end!).getTime() - new Date(a.current_period_end!).getTime())[0]

  if (validCanceledSubscription) {
    console.log('[useSubscription] Múltiplas assinaturas - usando canceled com período válido até:', validCanceledSubscription.current_period_end)
    return validCanceledSubscription
  }

  // Fallback: retorna a mais recente
  console.log('[useSubscription] Múltiplas assinaturas - nenhuma válida, retornando mais recente')
  return allSubscriptions[0]
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
  // Verificar se está ativo considerando status E current_period_end
  const isActive = DEV_BYPASS_SUBSCRIPTION || isSubscriptionActive(
    query.data?.status,
    query.data?.current_period_end
  )

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


