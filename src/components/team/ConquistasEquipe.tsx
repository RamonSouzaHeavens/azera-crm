import { useState, useEffect, useMemo } from 'react'
import {
  Trophy, Lock, CheckCircle2, Star, Zap,
  TrendingUp, Users, FileText, ListChecks, Phone,
  Filter, ChevronRight, Sparkles
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

// ============================================================================
// TIPOS
// ============================================================================

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
type AchievementCategory = 'vendas' | 'leads' | 'propostas' | 'tarefas' | 'atividades' | 'especial'

interface Achievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  metric_type: string
  metric_threshold: number
  tier: AchievementTier
  points: number
  is_active: boolean
  display_order: number
}

interface UserAchievement {
  id: string
  achievement_id: string
  current_progress: number
  is_unlocked: boolean
  unlocked_at: string | null
  achievement: Achievement
}

// ============================================================================
// CONSTANTES
// ============================================================================

const TIER_COLORS: Record<AchievementTier, { bg: string, border: string, text: string, glow: string }> = {
  bronze: {
    bg: 'from-amber-700/20 to-amber-900/20',
    border: 'border-amber-600/50',
    text: 'text-amber-500',
    glow: 'shadow-amber-500/20'
  },
  silver: {
    bg: 'from-slate-400/20 to-slate-600/20',
    border: 'border-slate-400/50',
    text: 'text-slate-400',
    glow: 'shadow-slate-400/20'
  },
  gold: {
    bg: 'from-yellow-500/20 to-amber-600/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-500',
    glow: 'shadow-yellow-500/30'
  },
  platinum: {
    bg: 'from-cyan-400/20 to-blue-500/20',
    border: 'border-cyan-400/50',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-400/30'
  },
  diamond: {
    bg: 'from-purple-400/20 to-pink-500/20',
    border: 'border-purple-400/50',
    text: 'text-purple-400',
    glow: 'shadow-purple-400/40'
  }
}

const CATEGORY_INFO: Record<AchievementCategory, { label: string, icon: typeof Trophy, color: string }> = {
  vendas: { label: 'Vendas', icon: TrendingUp, color: 'text-emerald-500' },
  leads: { label: 'Leads', icon: Users, color: 'text-blue-500' },
  propostas: { label: 'Propostas', icon: FileText, color: 'text-orange-500' },
  tarefas: { label: 'Tarefas', icon: ListChecks, color: 'text-purple-500' },
  atividades: { label: 'Atividades', icon: Phone, color: 'text-pink-500' },
  especial: { label: 'Especiais', icon: Star, color: 'text-yellow-500' }
}

const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
  diamond: 'Diamante'
}

// Dicas de como atingir cada tipo de métrica
const METRIC_TIPS: Record<string, { action: string, where: string }> = {
  count_vendas: {
    action: 'Mova leads para status "Ganho"',
    where: 'Página Leads → Coluna Ganho'
  },
  count_leads: {
    action: 'Cadastre novos leads no sistema',
    where: 'Página Leads → + Novo Lead'
  },
  count_propostas: {
    action: 'Crie propostas comerciais',
    where: 'Menu → Ferramentas Pro'
  },
  count_tarefas: {
    action: 'Complete suas tarefas',
    where: 'Página Tarefas → Marcar concluída'
  },
  count_ligacoes: {
    action: 'Registre ligações na timeline',
    where: 'Lead → Timeline → Ligação'
  },
  count_reunioes: {
    action: 'Registre reuniões na timeline',
    where: 'Lead → Timeline → Reunião'
  }
}

// ============================================================================
// COMPONENTE: CARD DE CONQUISTA
// ============================================================================

interface AchievementCardProps {
  achievement: Achievement
  userProgress?: UserAchievement
  onClick?: () => void
}

function AchievementCard({ achievement, userProgress, onClick }: AchievementCardProps) {
  const isUnlocked = userProgress?.is_unlocked ?? false
  const progress = userProgress?.current_progress ?? 0
  const progressPercent = Math.min((progress / achievement.metric_threshold) * 100, 100)
  const tierColors = TIER_COLORS[achievement.tier]

  return (
    <div
      onClick={onClick}
      className={`
        relative group cursor-pointer rounded-2xl p-4 transition-all duration-300
        border ${isUnlocked ? tierColors.border : 'border-slate-700/50'}
        bg-gradient-to-br ${isUnlocked ? tierColors.bg : 'from-slate-800/50 to-slate-900/50'}
        hover:scale-[1.02] hover:shadow-xl ${isUnlocked ? tierColors.glow : ''}
        ${!isUnlocked ? 'opacity-70 hover:opacity-100' : ''}
      `}
    >
      {/* Badge de XP */}
      <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold
        ${isUnlocked ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
        +{achievement.points} XP
      </div>

      {/* Ícone */}

      <div className={`
        w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-3 mx-auto
        ${isUnlocked
          ? `bg-gradient-to-br ${tierColors.bg} ${tierColors.border} border`
          : 'bg-slate-800/80 border border-slate-700/50'
        }
        transition-transform duration-300 group-hover:scale-110
      `}
        title={METRIC_TIPS[achievement.metric_type]?.action || achievement.description}
      >
        {isUnlocked ? (
          <span className="drop-shadow-lg">{achievement.icon}</span>
        ) : (
          <Lock className="w-7 h-7 text-slate-500" />
        )}
      </div>

      {/* Nome */}
      <h3 className={`text-center font-bold text-sm mb-1
        ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
        {achievement.name}
      </h3>

      {/* Descrição */}
      <p className="text-center text-xs text-slate-500 mb-3 line-clamp-2">
        {achievement.description}
      </p>

      {/* Barra de Progresso */}
      <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500
            ${isUnlocked
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
              : 'bg-gradient-to-r from-slate-500 to-slate-400'
            }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Progresso Texto */}
      <div className="flex items-center justify-between text-xs">
        <span className={`${isUnlocked ? tierColors.text : 'text-slate-500'} font-medium`}>
          {TIER_LABELS[achievement.tier]}
        </span>
        <span className={`${isUnlocked ? 'text-emerald-400' : 'text-slate-400'} font-bold`}>
          {progress}/{achievement.metric_threshold}
        </span>
      </div>

      {/* Check de Desbloqueado */}
      {isUnlocked && (
        <div className="absolute top-3 left-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENTE: RESUMO DE PROGRESSO
// ============================================================================

interface ProgressSummaryProps {
  totalAchievements: number
  unlockedAchievements: number
  totalXP: number
}

function ProgressSummary({ totalAchievements, unlockedAchievements, totalXP }: ProgressSummaryProps) {
  const progressPercent = totalAchievements > 0
    ? Math.round((unlockedAchievements / totalAchievements) * 100)
    : 0

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 border border-slate-700/50 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Suas Conquistas</h2>
            <p className="text-sm text-slate-400">Continue evoluindo!</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-2xl font-black text-white">{totalXP}</span>
          </div>
          <span className="text-xs text-slate-400">Total XP</span>
        </div>
      </div>

      {/* Barra de Progresso Geral */}
      <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white/50 animate-pulse" />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {unlockedAchievements} de {totalAchievements} conquistas
        </span>
        <span className="text-cyan-400 font-bold">{progressPercent}%</span>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ConquistasEquipe() {
  const { member, user } = useAuthStore()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'todas'>('todas')
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false)

  // Carregar dados
  useEffect(() => {
    async function loadAchievements() {
      if (!member?.tenant_id || !user?.id) return

      setLoading(true)
      try {
        // Buscar definições de conquistas
        const { data: achievementsData, error: achievementsError } = await supabase
          .from('achievement_definitions')
          .select('*')
          .eq('is_active', true)
          .or(`tenant_id.is.null,tenant_id.eq.${member.tenant_id}`)
          .order('display_order', { ascending: true })

        if (achievementsError) throw achievementsError
        setAchievements(achievementsData || [])

        // Buscar progresso do usuário
        const { data: userAchData, error: userAchError } = await supabase
          .from('user_achievements')
          .select(`
            *,
            achievement:achievement_definitions(*)
          `)
          .eq('user_id', user.id)
          .eq('tenant_id', member.tenant_id)

        if (userAchError) throw userAchError
        setUserAchievements(userAchData || [])

      } catch (error) {
        console.error('Erro ao carregar conquistas:', error)
        toast.error('Erro ao carregar conquistas')
      } finally {
        setLoading(false)
      }
    }

    loadAchievements()
  }, [member?.tenant_id, user?.id])

  // Atualizar progresso (chamar função do banco)
  const refreshProgress = async () => {
    if (!member?.tenant_id || !user?.id) return

    try {
      const { error } = await supabase.rpc('check_and_unlock_achievements', {
        p_user_id: user.id,
        p_tenant_id: member.tenant_id
      })

      if (error) throw error

      // Recarregar dados
      window.location.reload()
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error)
    }
  }

  // Mapear progresso do usuário às conquistas
  const achievementsWithProgress = useMemo(() => {
    return achievements.map(ach => {
      const userProgress = userAchievements.find(ua => ua.achievement_id === ach.id)
      return { achievement: ach, userProgress }
    })
  }, [achievements, userAchievements])

  // Filtrar por categoria
  const filteredAchievements = useMemo(() => {
    return achievementsWithProgress.filter(({ achievement, userProgress }) => {
      if (selectedCategory !== 'todas' && achievement.category !== selectedCategory) {
        return false
      }
      if (showOnlyUnlocked && !userProgress?.is_unlocked) {
        return false
      }
      return true
    })
  }, [achievementsWithProgress, selectedCategory, showOnlyUnlocked])

  // Estatísticas
  const stats = useMemo(() => {
    const unlocked = userAchievements.filter(ua => ua.is_unlocked)
    const totalXP = unlocked.reduce((sum, ua) => {
      const ach = achievements.find(a => a.id === ua.achievement_id)
      return sum + (ach?.points || 0)
    }, 0)

    return {
      total: achievements.length,
      unlocked: unlocked.length,
      totalXP
    }
  }, [achievements, userAchievements])

  // Categorias únicas
  const categories = useMemo(() => {
    const cats = [...new Set(achievements.map(a => a.category))]
    return cats
  }, [achievements])

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Sem conquistas
  if (achievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
          <Trophy className="w-10 h-10 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-300 mb-2">Sem conquistas disponíveis</h3>
        <p className="text-slate-500 max-w-md">
          O sistema de conquistas ainda não foi configurado para sua equipe.
          Peça ao administrador para executar o script de configuração.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo de Progresso */}
      <ProgressSummary
        totalAchievements={stats.total}
        unlockedAchievements={stats.unlocked}
        totalXP={stats.totalXP}
      />

      {/* ============================================ */}
      {/* SEÇÃO: COMO ATINGIR CONQUISTAS */}
      {/* ============================================ */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Como Atingir Conquistas</h2>
            <p className="text-sm text-slate-400">Conquistas são <span className="text-cyan-400 font-medium">individuais por vendedor</span> - mostre seu potencial!</p>
          </div>
        </div>

        {/* Grid de Categorias com Dicas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Vendas */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-white">Vendas</h3>
            </div>
            <p className="text-sm text-slate-400 mb-2">Feche negócios movendo leads para "Ganho"</p>
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <span>Leads → Mover para coluna Ganho</span>
            </div>
          </div>

          {/* Leads */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-white">Leads/Contatos</h3>
            </div>
            <p className="text-sm text-slate-400 mb-2">Cadastre novos leads no sistema</p>
            <div className="text-xs text-blue-400 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <span>Leads → Botão "+ Novo Lead"</span>
            </div>
          </div>

          {/* Propostas */}
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-white">Propostas</h3>
            </div>
            <p className="text-sm text-slate-400 mb-2">Crie propostas comerciais personalizadas</p>
            <div className="text-xs text-orange-400 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <span>Menu → Ferramentas Pro</span>
            </div>
          </div>

          {/* Tarefas */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-white">Tarefas</h3>
            </div>
            <p className="text-sm text-slate-400 mb-2">Complete tarefas atribuídas a você</p>
            <div className="text-xs text-purple-400 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <span>Tarefas → Marcar como concluída</span>
            </div>
          </div>

          {/* Ligações */}
          <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:border-pink-500/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-pink-500" />
              <h3 className="font-semibold text-white">Atividades</h3>
            </div>
            <p className="text-sm text-slate-400 mb-2">Registre ligações e reuniões com clientes</p>
            <div className="text-xs text-pink-400 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <span>Lead → Timeline → + Atividade</span>
            </div>
          </div>

          {/* Dica Geral */}
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-white">Dica Pro</h3>
            </div>
            <p className="text-sm text-slate-400 mb-2">Mantenha o CRM atualizado para ganhar XP!</p>
            <div className="text-xs text-cyan-400 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <span>Progresso atualiza automaticamente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Filter className="w-4 h-4" />
          <span>Filtrar:</span>
        </div>

        {/* Botão Todas */}
        <button
          onClick={() => setSelectedCategory('todas')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedCategory === 'todas'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
            }`}
        >
          Todas
        </button>

        {/* Categorias */}
        {categories.map(cat => {
          const info = CATEGORY_INFO[cat]
          const Icon = info.icon
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                }`}
            >
              <Icon className={`w-4 h-4 ${info.color}`} />
              {info.label}
            </button>
          )
        })}

        {/* Toggle Desbloqueadas */}
        <label className="flex items-center gap-2 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyUnlocked}
            onChange={(e) => setShowOnlyUnlocked(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-sm text-slate-400">Só desbloqueadas</span>
        </label>
      </div>

      {/* Grid de Conquistas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredAchievements.map(({ achievement, userProgress }) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            userProgress={userProgress}
          />
        ))}
      </div>

      {/* Nenhuma encontrada */}
      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <Lock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Nenhuma conquista encontrada com os filtros selecionados</p>
        </div>
      )}

      {/* Botão de Atualizar Progresso */}
      <div className="flex justify-center pt-4">
        <button
          onClick={refreshProgress}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all text-sm"
        >
          <TrendingUp className="w-4 h-4" />
          Atualizar Progresso
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
