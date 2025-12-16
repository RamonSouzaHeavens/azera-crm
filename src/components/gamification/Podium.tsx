import { Crown, Medal } from 'lucide-react'
import { useGamification, getLevelName } from '../../hooks/useGamification'

export function Podium() {
  const { leaderboard, loading } = useGamification()

  if (loading || leaderboard.length < 3) {
    return null
  }

  const [first, second, third] = leaderboard.slice(0, 3)

  const PodiumSlot = ({
    entry,
    position,
    height,
    bgClass,
    icon
  }: {
    entry: typeof first
    position: number
    height: string
    bgClass: string
    icon: React.ReactNode
  }) => (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <div className={`relative mb-2 ${position === 1 ? 'scale-110' : ''}`}>
        <div className={`w-16 h-16 rounded-full ${bgClass} p-0.5`}>
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
            {entry.avatar_url ? (
              <img src={entry.avatar_url} alt={entry.nome} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-white">
                {entry.nome?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        {/* Crown/Medal */}
        <div className="absolute -top-2 -right-2">
          {icon}
        </div>
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-white truncate max-w-[80px]">{entry.nome}</p>
      <p className="text-xs text-slate-500">{getLevelName(entry.level)}</p>

      {/* Podium bar */}
      <div
        className={`mt-3 w-20 ${bgClass} rounded-t-xl flex flex-col items-center justify-center transition-all duration-500`}
        style={{ height }}
      >
        <span className="text-2xl font-bold text-white/90">{position}</span>
        <span className="text-xs text-white/70">{entry.xp.toLocaleString()} XP</span>
      </div>
    </div>
  )

  return (
    <div className="flex items-end justify-center gap-4 py-8">
      {/* 2nd Place */}
      <PodiumSlot
        entry={second}
        position={2}
        height="80px"
        bgClass="bg-gradient-to-b from-slate-300 to-slate-400"
        icon={<Medal className="w-6 h-6 text-slate-300 drop-shadow-lg" />}
      />

      {/* 1st Place */}
      <PodiumSlot
        entry={first}
        position={1}
        height="100px"
        bgClass="bg-gradient-to-b from-yellow-400 to-amber-500"
        icon={<Crown className="w-7 h-7 text-yellow-400 drop-shadow-lg" />}
      />

      {/* 3rd Place */}
      <PodiumSlot
        entry={third}
        position={3}
        height="60px"
        bgClass="bg-gradient-to-b from-amber-600 to-orange-600"
        icon={<Medal className="w-6 h-6 text-amber-600 drop-shadow-lg" />}
      />
    </div>
  )
}
