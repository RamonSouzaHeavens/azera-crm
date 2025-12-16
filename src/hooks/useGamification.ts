import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export interface GamificationStats {
  user_id: string
  tenant_id: string
  xp: number
  level: number
  current_streak: number
  last_activity: string
}

export interface LeaderboardEntry {
  user_id: string
  nome: string
  avatar_url: string | null
  xp: number
  level: number
  rank: number
}

const LEVEL_THRESHOLDS = [0, 500, 1500, 3000, 5000, 8000, 12000]
const LEVEL_NAMES = ['Novato', 'Caçador', 'Mestre', 'Campeão', 'Lenda', 'Imortal', 'Mítico']

export function getLevelName(level: number): string {
  return LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] || 'Novato'
}

export function getXpForNextLevel(currentXp: number): { current: number; target: number; progress: number } {
  let currentLevelXp = 0
  let nextLevelXp = LEVEL_THRESHOLDS[1] || 500

  for (let i = 0; i < LEVEL_THRESHOLDS.length - 1; i++) {
    if (currentXp >= LEVEL_THRESHOLDS[i]) {
      currentLevelXp = LEVEL_THRESHOLDS[i]
      nextLevelXp = LEVEL_THRESHOLDS[i + 1] || currentXp + 1000
    }
  }

  const xpInLevel = currentXp - currentLevelXp
  const xpNeeded = nextLevelXp - currentLevelXp
  const progress = Math.min((xpInLevel / xpNeeded) * 100, 100)

  return { current: xpInLevel, target: xpNeeded, progress }
}

export function useGamification() {
  const { member, tenant } = useAuthStore()
  const [myStats, setMyStats] = useState<GamificationStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tenantId = tenant?.id || member?.tenant_id
  const userId = member?.user_id

  // Carregar estatísticas do usuário
  const loadMyStats = async () => {
    if (!tenantId || !userId) return

    try {
      const { data, error: fetchError } = await supabase
        .from('gamification_stats')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found (ok for new users)
        throw fetchError
      }

      setMyStats(data || {
        user_id: userId,
        tenant_id: tenantId,
        xp: 0,
        level: 1,
        current_streak: 0,
        last_activity: new Date().toISOString()
      })
    } catch (err) {
      console.error('Erro ao carregar stats de gamificação:', err)
      setError('Erro ao carregar estatísticas')
    }
  }

  // Carregar leaderboard
  const loadLeaderboard = async () => {
    if (!tenantId) return

    try {
      // Buscar stats com join nos membros para pegar nome e avatar
      const { data: statsData, error: statsError } = await supabase
        .from('gamification_stats')
        .select('user_id, xp, level')
        .eq('tenant_id', tenantId)
        .order('xp', { ascending: false })
        .limit(10)

      if (statsError) throw statsError

      if (!statsData || statsData.length === 0) {
        setLeaderboard([])
        return
      }

      // Buscar dados dos membros
      const userIds = statsData.map(s => s.user_id)
      const { data: membersData } = await supabase
        .from('memberships')
        .select('user_id, nome, avatar_url')
        .eq('tenant_id', tenantId)
        .in('user_id', userIds)

      const membersMap = new Map(membersData?.map(m => [m.user_id, m]) || [])

      const leaderboardEntries: LeaderboardEntry[] = statsData.map((stat, index) => {
        const memberInfo = membersMap.get(stat.user_id)
        return {
          user_id: stat.user_id,
          nome: memberInfo?.nome || 'Usuário',
          avatar_url: memberInfo?.avatar_url || null,
          xp: stat.xp,
          level: stat.level,
          rank: index + 1
        }
      })

      setLeaderboard(leaderboardEntries)
    } catch (err) {
      console.error('Erro ao carregar leaderboard:', err)
      setError('Erro ao carregar ranking')
    }
  }

  // Efeito para carregar dados
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadMyStats(), loadLeaderboard()])
      setLoading(false)
    }

    if (tenantId && userId) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [tenantId, userId])

  // Configurar Realtime subscription para updates de XP
  useEffect(() => {
    if (!tenantId || !userId) return

    const channel = supabase
      .channel(`gamification-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gamification_stats',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          // Recarregar dados quando houver mudança
          loadMyStats()
          loadLeaderboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, userId])

  return {
    myStats,
    leaderboard,
    loading,
    error,
    refresh: async () => {
      await Promise.all([loadMyStats(), loadLeaderboard()])
    },
    getLevelName,
    getXpForNextLevel
  }
}
