import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export interface Conversation {
  id: string
  contact_id: string
  contact_name: string
  contact_number: string
  channel: 'whatsapp' | 'instagram'
  last_message_content: string
  last_message_at: string
  unread_count: number
  avatar?: string
  avatar_url?: string
  status?: string
  categoria?: string
  archived?: boolean
  deleted_at?: string
  etapa_funil_id?: string
  etapa_funil_label?: string
  etapa_funil_color?: string
}

export function useConversations() {
  const { tenant } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    if (!tenant?.id) return

    setLoading(true)

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        clientes!inner(
          nome,
          telefone,
          status,
          categoria,
          etapa_funil_id,
          pipeline_stages:etapa_funil_id(label, color)
        )
      `)
      .eq('tenant_id', tenant.id)
      .is('deleted_at', null)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('[CONVERSATIONS] Erro ao carregar:', error)
      toast.error('Erro ao carregar conversas')
    } else {
      const mappedConversations = (data || []).map(conv => {
        // Acessar pipeline_stages corretamente
        const pipelineStage = conv.clientes?.pipeline_stages as any;

        return {
          id: conv.id,
          contact_id: conv.contact_id,
          contact_name: conv.clientes?.nome || 'Contato Desconhecido',
          contact_number: conv.clientes?.telefone || '',
          channel: conv.channel,
          last_message_content: conv.last_message_content || '',
          last_message_at: conv.last_message_at,
          unread_count: conv.unread_count || 0,
          avatar: conv.avatar_url || undefined,
          avatar_url: conv.avatar_url || undefined,
          status: conv.clientes?.status,
          categoria: conv.clientes?.categoria || 'trabalho',
          archived: conv.archived || false,
          deleted_at: conv.deleted_at,
          etapa_funil_id: conv.clientes?.etapa_funil_id,
          etapa_funil_label: pipelineStage?.label,
          etapa_funil_color: pipelineStage?.color
        }
      })

      // Garantir unicidade por número de contato (manter a conversa mais recente)
      const uniqueConversations = mappedConversations.reduce((acc, conv) => {
        if (!acc.has(conv.contact_number)) {
          acc.set(conv.contact_number, conv)
        } else {
          // Se já existe, manter a mais recente
          const existing = acc.get(conv.contact_number)!
          if (new Date(conv.last_message_at) > new Date(existing.last_message_at)) {
            acc.set(conv.contact_number, conv)
          }
        }
        return acc
      }, new Map<string, Conversation>())

      const finalConversations = Array.from(uniqueConversations.values())

      console.log('[CONVERSATIONS] Carregadas:', finalConversations.length, 'conversas únicas')
      setConversations(finalConversations)
    }
    setLoading(false)
  }, [tenant?.id])

  const markConversationRead = async (conversationId: string) => {
    // Optimistic UI: zerar badge imediatamente
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    )

    try {
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId)
    } catch (error) {
      console.error('[CONVERSATIONS] Falha ao marcar como lida:', error)
    }
  }

  const archiveConversation = async (conversationId: string) => {
    // Optimistic UI: arquivar imediatamente
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, archived: true } : c))
    )

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ archived: true })
        .eq('id', conversationId)

      if (error) throw error
      toast.success('Conversa arquivada com sucesso')
    } catch (error) {
      console.error('[CONVERSATIONS] Falha ao arquivar:', error)
      toast.error('Erro ao arquivar conversa')
      // Reverter optimistic update
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, archived: false } : c))
      )
    }
  }

  const unarchiveConversation = async (conversationId: string) => {
    // Optimistic UI: desarquivar imediatamente
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, archived: false } : c))
    )

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ archived: false })
        .eq('id', conversationId)

      if (error) throw error
      toast.success('Conversa desarquivada com sucesso')
    } catch (error) {
      console.error('[CONVERSATIONS] Falha ao desarquivar:', error)
      toast.error('Erro ao desarquivar conversa')
      // Reverter optimistic update
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, archived: true } : c))
      )
    }
  }

  const deleteConversation = async (conversationId: string) => {
    // Optimistic UI: remover imediatamente
    setConversations((prev) => prev.filter((c) => c.id !== conversationId))

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', conversationId)

      if (error) throw error
      toast.success('Conversa excluída com sucesso')
    } catch (error) {
      console.error('[CONVERSATIONS] Falha ao excluir:', error)
      toast.error('Erro ao excluir conversa')
      // Recarregar para reverter
      fetchConversations()
    }
  }

  useEffect(() => {
    if (!tenant?.id) return

    console.log('[CONVERSATIONS] Carregando conversas para tenant:', tenant.id)
    fetchConversations()

    // 2. Setup Realtime
    const channel = supabase
      .channel(`conversations_list:${tenant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenant.id}`
        },
        (payload) => {
          console.log('[CONVERSATIONS] Nova conversa:', payload.new.id)
          // Recarregar lista
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenant.id}`
        },
        (payload) => {
          console.log('[CONVERSATIONS] Conversa atualizada:', payload.new.id)
          // Atualizar apenas a conversa mudada
          setConversations(prev => {
            const updated = prev.map(c => {
              if (c.id === payload.new.id) {
                return {
                  ...c,
                  last_message_content: payload.new.last_message_content || '',
                  last_message_at: payload.new.last_message_at,
                  unread_count: payload.new.unread_count || 0,
                  avatar: payload.new.avatar_url || c.avatar,
                  avatar_url: payload.new.avatar_url || c.avatar_url
                }
              }
              return c
            })
            // Re-ordenar pela última mensagem
            return updated.sort((a, b) =>
              new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            )
          })
        }
      )
      .subscribe((status) => {
        console.log('[CONVERSATIONS] Realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenant?.id, fetchConversations])

  return {
    conversations,
    loading,
    markConversationRead,
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
    refetch: fetchConversations
  }
}
