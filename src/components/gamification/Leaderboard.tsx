import { useTranslation } from 'react-i18next'
import { Trophy, Crown, Medal, Star } from 'lucide-react'
import { useGamification, getLevelName } from '../../hooks/useGamification'

export function Leaderboard() {
  const { t } = useTranslation()
  const { leaderboard, loading } = useGamification()

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-white/5 rounded-xl" />
        ))}
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{t('gamification.leaderboard.empty')}</p>
        <p className="text-sm">{t('gamification.leaderboard.emptyHint')}</p>
      </div>
    )
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-400" />
      case 2: return <Medal className="w-5 h-5 text-slate-300" />
      case 3: return <Medal className="w-5 h-5 text-amber-600" />
      default: return <span className="text-sm font-bold text-slate-500">#{rank}</span>
    }
  }

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-300 dark:border-yellow-500/30'
      case 2: return 'bg-slate-50 dark:bg-slate-400/10 border-slate-300 dark:border-slate-400/30'
      case 3: return 'bg-amber-50 dark:bg-amber-600/10 border-amber-300 dark:border-amber-600/30'
      default: return 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'
    }
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry) => (
        <div
          key={entry.user_id}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01] ${getRankBg(entry.rank)}`}
        >
          {/* Rank */}
          <div className="w-8 h-8 flex items-center justify-center">
            {getRankIcon(entry.rank)}
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {entry.avatar_url ? (
              <img src={entry.avatar_url} alt={entry.nome} className="w-full h-full rounded-full object-cover" />
            ) : (
              entry.nome?.charAt(0).toUpperCase() || '?'
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{entry.nome}</p>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Star className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
              <span>{getLevelName(entry.level)}</span>
            </div>
          </div>

          {/* XP */}
          <div className="text-right">
            <p className="text-base font-bold text-cyan-600 dark:text-cyan-400">{entry.xp.toLocaleString()}</p>
            <p className="text-xs text-slate-500">XP</p>
          </div>
        </div>
      ))}
    </div>
  )
}
