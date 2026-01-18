import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, Variants } from 'framer-motion'
import {
  Activity, Users, Trophy, CheckCircle2, Target, Clock,
  Flame, Zap, TrendingUp, Calendar, MessageSquare
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { LaunchOfferModal } from '../modals/LaunchOfferModal'
import toast from 'react-hot-toast'
import { checkAndUnlockAchievements } from '../../services/achievementService'

// Carousel Images
import CardsImage1 from '../../images/Cards dashboard 1.jpg'
import CardsImage2 from '../../images/Cards dashboard 2.jpg'
import CardsImage3 from '../../images/Cards dashboard 3.jpg'

// Types
interface VendedorStats {
  taxaConversao: number
  taxaConversaoAnterior: number
  contatosFeitos: number
  contatosEstaSemana: number
  tarefasPendentes: number
  leadsEsteMes: number
  leadsFechados: number
  leadsEmNegociacao: number
  progressoMeta: number
  metaMensal: number
  tarefasHoje: number
  tarefasAtrasadas: number
  conversasNaoLidas: number
}

interface Tarefa {
  id: string
  titulo: string
  status: string
  vencimento: string | null
  cliente_nome?: string
}

// Animation Variants
const container: Variants = {
  hidden: { opacity: 0, filter: 'blur(6px)', y: 12 },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { staggerChildren: 0.12, delayChildren: 0.18, type: "spring", bounce: 0.2 }
  }
}

const item: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 140, damping: 18 }
  }
}

// Helper functions
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}
function addMonths(d: Date, m: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + m, 1, 0, 0, 0, 0)
}
function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0)
}

// --- Image Carousel Component ---
const carouselImages = [CardsImage1, CardsImage2, CardsImage3]

const ImageCarousel = ({ reduceMotion }: { reduceMotion: boolean | null }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselImages.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      className="bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden relative shadow-xl"
      variants={item}
    >
      <div className="relative w-full">
        <img src={carouselImages[0]} alt="" className="w-full h-auto opacity-0" aria-hidden="true" />
        <motion.img
          key={currentIndex}
          src={carouselImages[currentIndex]}
          alt={`Card ${currentIndex + 1}`}
          className="absolute inset-0 w-full h-full object-contain rounded-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none rounded-3xl" />
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          {carouselImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all duration-500 rounded-full ${idx === currentIndex
                ? 'w-8 h-2.5 bg-white shadow-lg'
                : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
                }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Data fetching function
async function fetchVendedorStats(tenantId: string, userId: string): Promise<VendedorStats> {
  const now = new Date()
  const currentStart = startOfMonth(now)
  const nextStart = addMonths(currentStart, 1)
  const prevStart = addMonths(currentStart, -1)
  const weekStart = startOfWeek(now)

  const [
    leadsAtribuidos,
    leadsFechadosCur,
    leadsFechadosPrev,
    leadsEmNegociacao,
    contatosSemana,
    tarefasPendentes,
    tarefasHoje,
    tarefasAtrasadas,
    conversasNaoLidas
  ] = await Promise.all([
    // Total de leads atribuídos ao vendedor
    supabase.from('clientes').select('id, status').eq('tenant_id', tenantId).eq('atribuido_para', userId),
    // Leads fechados este mês
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('atribuido_para', userId).eq('status', 'fechado').gte('updated_at', currentStart.toISOString()).lt('updated_at', nextStart.toISOString()),
    // Leads fechados mês anterior
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('atribuido_para', userId).eq('status', 'fechado').gte('updated_at', prevStart.toISOString()).lt('updated_at', currentStart.toISOString()),
    // Leads em negociação
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('atribuido_para', userId).eq('status', 'negociacao'),
    // Contatos feitos esta semana (leads criados ou atualizados)
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('atribuido_para', userId).gte('updated_at', weekStart.toISOString()),
    // Tarefas pendentes do vendedor
    supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('responsavel_id', userId).neq('status', 'concluida'),
    // Tarefas de hoje
    supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('responsavel_id', userId).eq('data_vencimento', now.toISOString().split('T')[0]).neq('status', 'concluida'),
    // Tarefas atrasadas
    supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('responsavel_id', userId).lt('data_vencimento', now.toISOString().split('T')[0]).neq('status', 'concluida'),
    // Conversas não lidas
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('assigned_to', userId).gt('unread_count', 0)
  ])

  const leads = leadsAtribuidos.data || []
  const totalLeads = leads.length
  const fechadosCur = leadsFechadosCur.count ?? 0
  const fechadosPrev = leadsFechadosPrev.count ?? 0

  // Taxa de conversão = fechados / total de leads
  const taxaConversao = totalLeads > 0 ? Math.round((fechadosCur / totalLeads) * 100) : 0
  const taxaConversaoAnterior = totalLeads > 0 ? Math.round((fechadosPrev / totalLeads) * 100) : 0

  // Meta mensal (padrão 50 leads)
  const metaMensal = 50
  const progressoMeta = Math.round((totalLeads / metaMensal) * 100)

  return {
    taxaConversao,
    taxaConversaoAnterior,
    contatosFeitos: totalLeads,
    contatosEstaSemana: contatosSemana.count ?? 0,
    tarefasPendentes: tarefasPendentes.count ?? 0,
    leadsEsteMes: totalLeads,
    leadsFechados: fechadosCur,
    leadsEmNegociacao: leadsEmNegociacao.count ?? 0,
    progressoMeta: Math.min(progressoMeta, 100),
    metaMensal,
    tarefasHoje: tarefasHoje.count ?? 0,
    tarefasAtrasadas: tarefasAtrasadas.count ?? 0,
    conversasNaoLidas: conversasNaoLidas.count ?? 0
  }
}

async function fetchMinhasTarefas(tenantId: string, userId: string): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from('tarefas')
    .select('id, titulo, status, data_vencimento, clientes(nome)')
    .eq('tenant_id', tenantId)
    .eq('responsavel_id', userId)
    .neq('status', 'concluida')
    .order('data_vencimento', { ascending: true })
    .limit(5)

  if (error) {
    console.error('Erro ao buscar tarefas:', error)
    return []
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    titulo: t.titulo,
    status: t.status,
    vencimento: t.data_vencimento,
    cliente_nome: t.clientes?.nome
  }))
}

// --- Main Component ---
export default function VendedorDashboard() {
  const { user, member, tenant, profile } = useAuthStore()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])
  const userName = useMemo(() => profile?.display_name || user?.user_metadata?.name || 'Usuário', [user, profile])

  const [stats, setStats] = useState<VendedorStats | null>(null)
  const [minhasTarefas, setMinhasTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)

  // Greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  // Mood line based on stats
  const moodLine = useMemo(() => {
    if (!stats) return ''
    if (stats.tarefasAtrasadas > 0) {
      return `Bora limpar ${stats.tarefasAtrasadas} pendência${stats.tarefasAtrasadas === 1 ? '' : 's'} atrasada${stats.tarefasAtrasadas === 1 ? '' : 's'} primeiro?`
    }
    if (stats.conversasNaoLidas > 0) {
      return `${stats.conversasNaoLidas} conversa${stats.conversasNaoLidas === 1 ? '' : 's'} esperando resposta.`
    }
    if (stats.tarefasHoje > 0) {
      return `${stats.tarefasHoje} tarefa${stats.tarefasHoje === 1 ? '' : 's'} na fila de hoje.`
    }
    return 'Tudo em dia. Aproveite para falar com leads quentes!'
  }, [stats])

  useEffect(() => {
    if (!tenantId || !user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      fetchVendedorStats(tenantId, user.id),
      fetchMinhasTarefas(tenantId, user.id)
    ])
      .then(([statsData, tarefasData]) => {
        setStats(statsData)
        setMinhasTarefas(tarefasData)
      })
      .catch(err => console.error('Erro ao carregar dashboard vendedor:', err))
      .finally(() => setLoading(false))
  }, [tenantId, user?.id])

  const handleTaskComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tarefas')
        .update({ status: 'concluida' })
        .eq('id', taskId)

      if (error) throw error

      setMinhasTarefas(prev => prev.filter(t => t.id !== taskId))
      setStats(prev => prev ? { ...prev, tarefasPendentes: prev.tarefasPendentes - 1 } : prev)

      if (user?.id && tenantId) {
        checkAndUnlockAchievements(user.id, tenantId)
      }

      toast.success('Tarefa concluída!')
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error)
      toast.error('Erro ao concluir tarefa')
    }
  }

  // Performance level based on conversion rate
  const desempenhoLevel = useMemo(() => {
    const taxa = stats?.taxaConversao || 0
    if (taxa >= 50) return { label: 'Ótimo', color: 'emerald' }
    if (taxa >= 25) return { label: 'Bom', color: 'amber' }
    return { label: 'Regular', color: 'slate' }
  }, [stats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          className="text-primary"
          animate={{ scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Zap className="w-12 h-12" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background overflow-hidden">
      <LaunchOfferModal />
      <div className="max-w-[1600px] mx-auto">
        <motion.div
          className="space-y-6 py-4 sm:py-6"
          layout
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Main Layout: Content + Sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

            {/* Left Column - Main Content */}
            <div className="space-y-6">

              {/* Welcome Banner */}
              <div className="px-4 sm:px-6">
                <motion.div className="relative overflow-hidden rounded-2xl p-8" variants={item}>
                  <div className="relative z-10">
                    <h1 className="text-4xl font-bold font-outfit text-text mb-2">
                      {greeting}, {userName}.
                    </h1>
                    <p className="text-base text-text/80 mb-3">{moodLine}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-text opacity-80">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {stats?.tarefasHoje || 0} tarefas hoje
                      </span>
                      <span className="w-1 h-1 rounded-full bg-text opacity-30 self-center"></span>
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        {stats?.conversasNaoLidas || 0} conversas pendentes
                      </span>
                      {stats && stats.tarefasAtrasadas > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-text opacity-30 self-center"></span>
                          <span className="flex items-center gap-2 text-red-500">
                            <Clock className="w-4 h-4" />
                            {stats.tarefasAtrasadas} atrasadas
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* ===== SEÇÃO 1: MEU DESEMPENHO (3 cards) ===== */}
              <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 sm:px-6" variants={container}>

                {/* Card: Taxa de Conversão */}
                <motion.div
                  className="rounded-2xl p-5 bg-surface border border-slate-200 dark:border-white/10 cursor-pointer hover:border-cyan-500/30 transition-colors"
                  variants={item}
                  onClick={() => navigate('/app/clientes')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-medium font-outfit text-text/70">Taxa de Conversão</span>
                    <Activity className="w-5 h-5 text-cyan-500" />
                  </div>
                  <p className="text-4xl font-bold text-text">
                    {stats?.taxaConversao || 0}%
                  </p>
                  {stats && (
                    <p className={`text-xs mt-2 flex items-center gap-1 ${(stats.taxaConversao - stats.taxaConversaoAnterior) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      <TrendingUp className="w-3 h-3" />
                      {(stats.taxaConversao - stats.taxaConversaoAnterior) >= 0 ? '+' : ''}
                      {stats.taxaConversao - stats.taxaConversaoAnterior}% vs mês anterior
                    </p>
                  )}
                </motion.div>

                {/* Card: Contatos Feitos */}
                <motion.div
                  className="rounded-2xl p-5 bg-surface border border-slate-200 dark:border-white/10 cursor-pointer hover:border-purple-500/30 transition-colors"
                  variants={item}
                  onClick={() => navigate('/app/clientes')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-medium font-outfit text-text/70">Contatos Feitos</span>
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-4xl font-bold text-text">
                    {stats?.contatosFeitos || 0}
                  </p>
                  <p className="text-xs text-text/50 mt-2">
                    {stats?.contatosEstaSemana || 0} novos esta semana
                  </p>
                </motion.div>

                {/* Card: Desempenho */}
                <motion.div
                  className="rounded-2xl p-5 bg-surface border border-slate-200 dark:border-white/10"
                  variants={item}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-medium font-outfit text-text/70">Seu Desempenho</span>
                    <Trophy className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-4 py-1.5 bg-${desempenhoLevel.color}-500/10 text-${desempenhoLevel.color}-600 dark:text-${desempenhoLevel.color}-400 rounded-full text-2xl font-bold`}>
                      {desempenhoLevel.label}
                    </span>
                  </div>
                  <p className="text-xs text-text/50 mt-2">
                    {stats?.tarefasPendentes || 0} tarefas pendentes
                  </p>
                </motion.div>
              </motion.div>

              {/* ===== SEÇÃO 2: GRID 3 COLUNAS ===== */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-4 sm:px-6">

                {/* Minhas Tarefas - 2/4 */}
                <motion.div
                  className="lg:col-span-2 rounded-2xl p-5 bg-surface border border-slate-200 dark:border-white/10"
                  variants={item}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold font-outfit text-text flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      Minhas Tarefas
                    </h3>
                    <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                      {stats?.tarefasPendentes || 0} pendentes
                    </span>
                  </div>

                  <div className="space-y-3">
                    {minhasTarefas.length === 0 ? (
                      <div className="text-center py-8 text-text/50">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma tarefa pendente!</p>
                      </div>
                    ) : (
                      minhasTarefas.slice(0, 3).map(tarefa => {
                        const hoje = new Date()
                        const vencimento = tarefa.vencimento ? new Date(tarefa.vencimento) : null
                        let bgClass = 'bg-slate-500/5 border-slate-500/20 hover:bg-slate-500/10'
                        let textClass = 'text-slate-500'
                        let dotClass = 'bg-slate-400'
                        let iconClass = 'text-slate-400'
                        let vencimentoTexto = ''

                        if (vencimento) {
                          const diffDays = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

                          if (diffDays < 0) {
                            bgClass = 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                            textClass = 'text-red-500'
                            dotClass = 'bg-red-500'
                            iconClass = 'text-red-500'
                            vencimentoTexto = 'Atrasada!'
                          } else if (diffDays === 0) {
                            bgClass = 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                            textClass = 'text-red-500'
                            dotClass = 'bg-red-500'
                            iconClass = 'text-red-500'
                            vencimentoTexto = 'Vence hoje'
                          } else if (diffDays === 1) {
                            bgClass = 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                            textClass = 'text-amber-600'
                            dotClass = 'bg-amber-500'
                            iconClass = 'text-amber-500'
                            vencimentoTexto = 'Vence amanhã'
                          } else {
                            vencimentoTexto = `Em ${diffDays} dias`
                          }
                        }

                        return (
                          <div
                            key={tarefa.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${bgClass}`}
                            onClick={() => handleTaskComplete(tarefa.id)}
                          >
                            <div className={`w-2 h-2 rounded-full ${dotClass}`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text truncate">{tarefa.titulo}</p>
                              <p className={`text-xs ${textClass}`}>{vencimentoTexto}</p>
                            </div>
                            <Clock className={`w-4 h-4 ${iconClass}`} />
                          </div>
                        )
                      })
                    )}
                  </div>

                  <button
                    onClick={() => navigate('/app/tarefas')}
                    className="mt-4 w-full py-2.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    Ver todas as tarefas
                    <span>→</span>
                  </button>
                </motion.div>

                {/* Objetivos - 1/4 */}
                <motion.div
                  className="lg:col-span-1 rounded-2xl p-5 bg-surface border border-slate-200 dark:border-white/10"
                  variants={item}
                >
                  <h3 className="text-xl font-semibold font-outfit text-text flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-purple-500" />
                    Objetivos
                  </h3>

                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-background/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-text">Meta Mensal</p>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.min(stats?.progressoMeta || 0, 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(stats?.progressoMeta || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-background/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-text">Leads Mês</p>
                        <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                          {stats?.leadsEsteMes || 0}
                        </span>
                      </div>
                      <p className="text-xs text-text/50">
                        Meta: {stats?.metaMensal || 50} leads
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-background/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-text">Fechados</p>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {stats?.leadsFechados || 0}
                        </span>
                      </div>
                      <p className="text-xs text-text/50">
                        {stats?.leadsEmNegociacao || 0} em negociação
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Conquistas - 1/4 */}
                <motion.div
                  className="lg:col-span-1 rounded-2xl p-5 bg-gradient-to-br from-amber-500/10 to-purple-500/10 dark:from-amber-500/5 dark:to-purple-500/5 border border-amber-500/20"
                  variants={item}
                >
                  <h3 className="text-xl font-semibold font-outfit text-text flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Conquistas
                  </h3>

                  <div className="space-y-4">
                    {(stats?.leadsFechados || 0) > 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg flex-shrink-0">
                          <Flame className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text truncate">Sequência 🔥</p>
                          <p className="text-xs text-text/50">{stats?.leadsFechados} vendas!</p>
                        </div>
                      </div>
                    )}

                    {(stats?.progressoMeta || 0) >= 100 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text truncate">Meta Batida ⭐</p>
                          <p className="text-xs text-text/50">Parabéns!</p>
                        </div>
                      </div>
                    )}

                    {(stats?.leadsEsteMes || 0) >= 10 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text truncate">Prospector ⭐</p>
                          <p className="text-xs text-text/50">+10 leads no mês</p>
                        </div>
                      </div>
                    )}

                    {!stats || ((stats.leadsFechados || 0) === 0 && (stats.progressoMeta || 0) < 100 && (stats.leadsEsteMes || 0) < 10) && (
                      <div className="text-center py-4 text-text/50">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Continue trabalhando para desbloquear conquistas!</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6 px-4 sm:px-6 xl:px-0 xl:pr-6">
              <div className="hidden xl:block">
                <ImageCarousel reduceMotion={reduceMotion} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
