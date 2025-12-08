import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export type ProposalStatus = 'pending' | 'sent' | 'accepted' | 'rejected'

export interface Proposal {
  id: string
  user_id: string
  client_name: string
  value: number
  status: ProposalStatus
  template_id: string
  file_url: string | null
  created_at: string
  updated_at: string
}

export interface CreateProposalPayload {
  client_name: string
  value: number
  template_id: string
  status?: ProposalStatus
  file_url?: string | null
}

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userId = useAuthStore((state) => state.user?.id)

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .returns<Proposal[]>()

      if (fetchError) {
        throw fetchError
      }

      setProposals(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar propostas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProposals()
  }, [fetchProposals])

  const refresh = useCallback(() => {
    void fetchProposals()
  }, [fetchProposals])

  const createProposal = useCallback(
    async (payload: CreateProposalPayload) => {
      if (!userId) throw new Error('Faça login para criar propostas')

      const { error: insertError } = await supabase
        .from('proposals')
        .insert({
          user_id: userId,
          client_name: payload.client_name,
          value: payload.value,
          status: payload.status ?? 'pending',
          template_id: payload.template_id,
          file_url: payload.file_url ?? null
        })

      if (insertError) throw insertError

      await fetchProposals()
      return true
    },
    [fetchProposals, userId]
  )

  const updateProposalStatus = useCallback(
    async (id: string, status: ProposalStatus) => {
      if (!userId) throw new Error('Faça login para atualizar propostas')

      const { error: updateError } = await supabase
        .from('proposals')
        .update({ status })
        .eq('id', id)
        .eq('user_id', userId)

      if (updateError) throw updateError

      await fetchProposals()
      return true
    },
    [fetchProposals, userId]
  )

  const deleteProposal = useCallback(
    async (id: string) => {
      if (!userId) throw new Error('Faça login para excluir propostas')

      const { error: deleteError } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      await fetchProposals()
      return true
    },
    [fetchProposals, userId]
  )

  return {
    proposals,
    loading,
    error,
    refresh,
    createProposal,
    updateProposalStatus,
    deleteProposal
  }
}
