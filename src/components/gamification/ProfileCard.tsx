import { useTranslation } from 'react-i18next'
import { Sparkles, TrendingUp, Zap, Flame } from 'lucide-react'
import { useGamification, getLevelName, getXpForNextLevel } from '../../hooks/useGamification'

export function ProfileCard() {
  const { t } = useTranslation()
  const { myStats, loading } = useGamification()

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-40 bg-white/5 rounded-2xl" />
      </div>
    )
  }

  if (!myStats) {
    return (
      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
        <Sparkles className="w-10 h-10 mx-auto mb-3 text-cyan-400 opacity-50" />
        <p className="text-slate-400">{t('gamification.profile.noStats')}</p>
      </div>
    )
  }

  const { current, target, progress } = getXpForNextLevel(myStats.xp)
  const levelName = getLevelName(myStats.level)

  // Determinar badges com base em stats
  const badges = []
  if (myStats.xp >= 1000) badges.push({ icon: <TrendingUp className="w-4 h-4" />, label: 'Trabalhador' })
  if (myStats.current_streak >= 7) badges.push({ icon: <Flame className="w-4 h-4" />, label: 'Em Chamas!' })
  if (myStats.level >= 3) badges.push({ icon: <Zap className="w-4 h-4" />, label: 'Veterano' })

  return (
    <div className="p-5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">{t('gamification.profile.level')} {myStats.level}</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">{levelName}</p>
          </div>
        </div>

        {/* Streak */}
        {myStats.current_streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
            <Flame className="w-3 h-3 text-orange-500 dark:text-orange-400" />
            <span className="text-xs font-bold text-orange-500 dark:text-orange-400">{myStats.current_streak}</span>
          </div>
        )}
      </div>

      {/* XP Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('gamification.profile.progress')}</span>
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
            {myStats.xp.toLocaleString()} XP
          </span>
        </div>
        <div className="h-2 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-500">{current.toLocaleString()} / {target.toLocaleString()} XP</span>
          <span className="text-xs text-slate-500">{t('gamification.profile.nextLevel')}</span>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase mb-2">{t('gamification.profile.badges')}</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 rounded-lg text-xs text-slate-600 dark:text-slate-300"
              >
                {badge.icon}
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
