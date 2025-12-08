import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export interface ActiveIntegration {
  id: string
  channel: 'whatsapp' | 'instagram'
  provider: 'meta_official' | 'evolution_api' | 'zapi' | 'uazapi'
  status: 'active' | 'inactive'
  is_active: boolean
  created_at: string
}

export function useActiveIntegration() {
  const { tenant } = useAuthStore()
  const [integration, setIntegration] = useState<ActiveIntegration | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false)
      return
    }

    const fetchIntegration = async () => {
      try {
        const { data, error } = await supabase
          .from('integrations')
          .select('id, channel, provider, status, is_active, created_at')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .maybeSingle()

        if (error) {
          console.log('Nenhuma integracao ativa encontrada', error)
        }
        setIntegration(data)
      } catch (err) {
        console.error('Erro ao buscar integracao:', err)
        setIntegration(null)
      } finally {
        setLoading(false)
      }
    }

    fetchIntegration()

    // Realtime subscription for integration changes
    const channel = supabase
      .channel(`integrations:${tenant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integrations',
          filter: `tenant_id=eq.${tenant.id}`
        },
        () => {
          fetchIntegration()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenant?.id])

  return { integration, loading }
}
