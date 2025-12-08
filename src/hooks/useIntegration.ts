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
    created_at: string
}

export function useIntegration() {
    const { tenant } = useAuthStore()
    const [integration, setIntegration] = useState<Integration | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchIntegration = async () => {
        if (!tenant?.id) return

        const { data, error } = await supabase
            .from('integrations')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('channel', 'whatsapp')
            .eq('is_active', true)
            .maybeSingle()

        if (error) {
            console.error('Error fetching integration:', error)
        }
        setIntegration(data)
        setLoading(false)
    }

    const disconnectIntegration = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('disconnect-integration')

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

            toast.success('Integração desconectada com sucesso!')
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
            const { error } = await supabase
                .from('integrations')
                .upsert({
                    tenant_id: tenant?.id,
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
                }, {
                    onConflict: 'tenant_id,channel,is_active'
                })

            if (error) throw error

            toast.success('Instagram conectado com sucesso!')
            await fetchIntegration()
            return true
        } catch (error) {
            console.error('Error connecting Instagram:', error)
            toast.error('Erro ao conectar Instagram')
            return false
        }
    }

    useEffect(() => {
        fetchIntegration()
    }, [tenant?.id])

    return {
        integration,
        loading,
        fetchIntegration,
        disconnectIntegration,
        updateIntegration,
        connectInstagram
    }
}
