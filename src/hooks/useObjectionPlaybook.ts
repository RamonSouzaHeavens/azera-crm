import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export type ObjectionStage =
  | 'Qualificação'
  | 'Proposta'
  | 'Negociação'
  | 'Fechamento'
  | 'Pós-venda'

export interface ObjectionCardRow {
  id: string
  user_id: string
  team_id: string | null
  objection: string
  response: string
  tactic: string
  stage: ObjectionStage
  is_default: boolean
  created_at: string
  updated_at: string
}

export const stageVariants: Record<ObjectionStage, { label: string; bg: string; text: string; border: string }> = {
  Qualificação: { label: 'Qualificação', bg: 'bg-sky-50 dark:bg-sky-900/60', text: 'text-sky-700 dark:text-sky-200', border: 'border-sky-100 dark:border-sky-800' },
  Proposta: { label: 'Proposta', bg: 'bg-amber-50 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-200', border: 'border-amber-100 dark:border-amber-800' },
  Negociação: { label: 'Negociação', bg: 'bg-emerald-50 dark:bg-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-200', border: 'border-emerald-100 dark:border-emerald-800' },
  Fechamento: { label: 'Fechamento', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/40', text: 'text-fuchsia-700 dark:text-fuchsia-200', border: 'border-fuchsia-100 dark:border-fuchsia-800' },
  'Pós-venda': { label: 'Pós-venda', bg: 'bg-indigo-50 dark:bg-indigo-900/50', text: 'text-indigo-700 dark:text-indigo-200', border: 'border-indigo-100 dark:border-indigo-800' }
}

export const tacticVariants: Record<string, { label?: string; bg: string; text: string; border: string }> = {
  'Foco no Valor': { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-600' },
  'Urgência': { bg: 'bg-amber-100 dark:bg-amber-600/10', text: 'text-amber-600 dark:text-amber-200', border: 'border-amber-200 dark:border-amber-600' },
  'Urgência suave': { bg: 'bg-orange-100 dark:bg-orange-600/10', text: 'text-orange-600 dark:text-orange-200', border: 'border-orange-200 dark:border-orange-600' },
  'Prova Social': { bg: 'bg-pink-100 dark:bg-pink-600/10', text: 'text-pink-600 dark:text-pink-200', border: 'border-pink-200 dark:border-pink-600' },
  'Diferenciação': { bg: 'bg-sky-100 dark:bg-sky-600/10', text: 'text-sky-600 dark:text-sky-200', border: 'border-sky-200 dark:border-sky-600' },
}

export interface NewObjectionPayload {
  objection: string
  response: string
  tactic: string
  stage: ObjectionStage
  team_id?: string | null
}

export function useObjectionCards() {
  const [cards, setCards] = useState<ObjectionCardRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('sales_playbook_objections')
        .select('*')
        .order('created_at', { ascending: false })
        .returns<ObjectionCardRow[]>()

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setCards(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar cards')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCards()
  }, [fetchCards])

  const refresh = useCallback(() => {
    void fetchCards()
  }, [fetchCards])

  return { cards, loading, error, refresh }
}

export function useCreateObjection(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userId = useAuthStore((state) => state.user?.id)
  const tenantId = useAuthStore((state) => state.member?.tenant_id ?? null)

  const create = useCallback(
    async (payload: NewObjectionPayload) => {
      if (!userId) {
        setError('Faça login para criar cards')
        return null
      }

      setLoading(true)
      setError(null)
      try {
      const teamIdValue = payload.team_id === null ? null : payload.team_id ?? tenantId

      const { error: insertError } = await supabase
        .from('sales_playbook_objections')
        .insert({
          user_id: userId,
          team_id: teamIdValue,
          objection: payload.objection,
          response: payload.response,
          tactic: payload.tactic,
          stage: payload.stage
        })

        if (insertError) {
          setError(insertError.message)
          return null
        }

        onSuccess?.()
        return true
      } finally {
        setLoading(false)
      }
    },
    [onSuccess, tenantId, userId]
  )

  return { create, loading, error }
}

export function useUpdateObjection(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userId = useAuthStore((state) => state.user?.id)

  const update = useCallback(
    async (id: string, payload: Partial<NewObjectionPayload>) => {
      if (!userId) {
        setError('Faça login para atualizar cards')
        return null
      }

      setLoading(true)
      setError(null)
      try {
        const { error: updateError } = await supabase
          .from('sales_playbook_objections')
          .update(payload)
          .eq('id', id)
          .eq('user_id', userId)

        if (updateError) {
          setError(updateError.message)
          return null
        }

        onSuccess?.()
        return true
      } finally {
        setLoading(false)
      }
    },
    [onSuccess, userId]
  )

  return { update, loading, error }
}

export function useDeleteObjection(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userId = useAuthStore((state) => state.user?.id)

  const remove = useCallback(
    async (id: string) => {
      if (!userId) {
        setError('Faça login para remover cards')
        return null
      }

      setLoading(true)
      setError(null)
      try {
        const { error: deleteError } = await supabase
          .from('sales_playbook_objections')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)

        if (deleteError) {
          setError(deleteError.message)
          return null
        }

        onSuccess?.()
        return true
      } finally {
        setLoading(false)
      }
    },
    [onSuccess, userId]
  )

  return { remove, loading, error }
}

export const allStages: ObjectionStage[] = ['Qualificação', 'Proposta', 'Negociação', 'Fechamento', 'Pós-venda']
