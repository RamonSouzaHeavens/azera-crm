import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

interface Integration {
  id: string
  channel: string
  provider: string
  status: string
  is_active: boolean
  credentials: {
    instance_id?: string
    secret_key?: string
    base_url?: string
    page_id?: string
    access_token?: string
    instagram_business_account_id?: string
    page_name?: string
  }
  config?: {
    auto_create_leads?: boolean
    whatsapp_agenda_active?: boolean
    whatsapp_agenda_trigger?: string
  }
  created_at: string
}

export function useIntegration() {
  const { tenant } = useAuthStore()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  const fetchIntegration = async () => {
    if (!tenant?.id) return

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching integrations:', error)
    }
    setIntegrations(data || [])
    setLoading(false)
  }

  const disconnectIntegration = async (channel?: 'whatsapp' | 'instagram') => {
    try {
      const { data, error } = await supabase.functions.invoke('disconnect-integration', {
        body: channel ? { channel } : {}
      })

      if (error) {
        console.error('Disconnect error details:', error)
        // Tenta extrair a mensagem de erro do corpo da resposta, se disponível
        let errorMessage = 'Erro ao desconectar integração'
        if (error instanceof Error) {
          errorMessage = error.message
        }
        // Se for um erro HTTP da função, tente ler o corpo
        if (error && typeof error === 'object' && 'context' in error) {
          // @ts-ignore
          const context = error.context as any;
          if (context && context.json) {
            const body = await context.json().catch(() => ({}));
            if (body.error) errorMessage = body.error;
          }
        }

        throw new Error(errorMessage)
      }

      const channelName = channel === 'instagram' ? 'Instagram' : channel === 'whatsapp' ? 'WhatsApp' : 'Integrações'
      toast.success(`${channelName} desconectado com sucesso!`)
      await fetchIntegration()
      return true
    } catch (error: any) {
      console.error('Error disconnecting:', error)
      toast.error(error.message || 'Erro ao desconectar integração')
      return false
    }
  }

  const updateIntegration = async (instanceId: string, token: string, baseUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-integration', {
        body: { instanceId, token, baseUrl }
      })

      if (error) throw error

      toast.success('Credenciais atualizadas com sucesso!')
      await fetchIntegration()
      return true
    } catch (error) {
      console.error('Error updating:', error)
      toast.error('Erro ao atualizar credenciais')
      return false
    }
  }

  const connectInstagram = async (pageId: string, accessToken: string, instagramId: string, pageName: string) => {
    try {
      console.log('[INSTAGRAM] Connecting with:', { pageId, instagramId, pageName, tenantId: tenant?.id })

      if (!tenant?.id) {
        throw new Error('Tenant não identificado')
      }

      const integrationData = {
        tenant_id: tenant.id,
        channel: 'instagram',
        provider: 'meta_official',
        credentials: {
          page_id: pageId,
          access_token: accessToken,
          instagram_business_account_id: instagramId,
          page_name: pageName
        },
        status: 'active',
        is_active: true,
        updated_at: new Date().toISOString()
      }

      console.log('[INSTAGRAM] Integration data:', { ...integrationData, credentials: { ...integrationData.credentials, access_token: '***hidden***' } })

      // Check if integration already exists for this tenant and channel
      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('channel', 'instagram')
        .maybeSingle()

      let result
      if (existing) {
        // Update existing
        console.log('[INSTAGRAM] Updating existing integration:', existing.id)
        result = await supabase
          .from('integrations')
          .update(integrationData)
          .eq('id', existing.id)
          .select()
      } else {
        // Insert new
        console.log('[INSTAGRAM] Creating new integration')
        result = await supabase
          .from('integrations')
          .insert({ ...integrationData, created_at: new Date().toISOString() })
          .select()
      }

      console.log('[INSTAGRAM] Result:', { data: result.data, error: result.error })

      if (result.error) throw result.error

      toast.success('Instagram conectado com sucesso!')
      await fetchIntegration()
      return true
    } catch (error) {
      console.error('[INSTAGRAM] Error connecting:', error)
      toast.error('Erro ao conectar Instagram: ' + (error as any)?.message || 'Erro desconhecido')
      return false
    }
  }

  useEffect(() => {
    fetchIntegration()
  }, [tenant?.id])

  // Find integrations by channel
  const whatsappIntegration = integrations.find(i => i.channel === 'whatsapp') || null
  const instagramIntegration = integrations.find(i => i.channel === 'instagram') || null

  return {
    integrations,
    integration: integrations[0] || null, // Keep for backwards compatibility
    whatsappIntegration,
    instagramIntegration,
    loading,
    fetchIntegration,
    disconnectIntegration,
    updateIntegration,
    connectInstagram
  }
}
