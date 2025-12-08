import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Subscription } from '../types/subscription'
import { isSubscriptionActive } from '../lib/subscription'
import { useAuthStore } from '../stores/authStore'

const fetchSubscription = async (userId: string): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data ?? null
}

export const useSubscription = () => {
  const userId = useAuthStore((state) => state.user?.id)
  const queryClientRef = useRef<any>(null)

  const query = useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => fetchSubscription(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
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
          // Refetch diretamente sem queryClient
          query.refetch()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, query])

  return {
    subscription: query.data ?? null,
    loading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    isActive: isSubscriptionActive(query.data?.status),
    refetch: query.refetch
  }
}
