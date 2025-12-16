import { useEffect, useMemo, useState } from 'react'
import { LaunchOfferModal } from '../components/modals/LaunchOfferModal'
import { TrendingUp, CheckCircle2, Clock, DollarSign, Users, MessageSquare, Calendar, Target, Zap, ArrowUp, ArrowDown } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion, Variants } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { expenseService } from '../services/expenseService'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { checkAndUnlockAchievements } from '../services/achievementService'

// Carousel Images
import CardsImage1 from '../images/Cards dashboard 1.jpg'
import CardsImage2 from '../images/Cards dashboard 2.jpg'
import CardsImage3 from '../images/Cards dashboard 3.jpg'

// --- Types ---
type LeadStatus = 'lead' | 'negociacao' | 'fechado' | 'perdido'
type SalesMonthly = { month: string; vendas: number }
type PipelineSlice = { name: 'Lead' | 'Negociação' | 'Fechado' | 'Perdido'; value: number; color: string; count: number }
type ActivityItem = { id: string; action: string; cliente: string; time: string; status: string }

type Stats = {
  totalVendas: number
  totalClientes: number
  leadsAtivos: number
  conversionRate: number
  leadsNovos?: number
  receitaPrevista?: number
  taxaConversao?: number
  atividadesConcluidas?: number
  despesasFixas?: number
  conversasNaoLidas?: number
  tarefasHoje?: number
  tarefasAtrasadas?: number
  receitaMes?: number
  metaMes?: number
}

type Deltas = {
  vendasAbs: number
  vendasPct: number
  clientesAbs: number
  clientesPct: number
  leadsAbs: number
  leadsPct: number
  convPct: number
}

// --- Constants & Helpers ---
const PIPELINE_COLORS: Record<PipelineSlice['name'], string> = {
  Lead: '#8B5CF6',
  Negociação: '#06B6D4',
  Fechado: '#10B981',
  Perdido: '#EF4444',
}

function monthLabel(d: Date): string {
  return d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}
function addMonths(d: Date, m: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + m, 1, 0, 0, 0, 0)
}
const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`

// --- Animation Variants (2025 Style) ---
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
  hidden: { opacity: 0, y: 24, scale: 0.97, rotateX: -6 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 140, damping: 18 }
  }
}

const hoverLift = (reduceMotion: boolean | null) => (reduceMotion ?? false) ? { scale: 1.01 } : {
  y: -8,
  scale: 1.02,
  rotateX: -2,
  rotateY: 3,
  transition: { type: "spring", stiffness: 220, damping: 20, mass: 0.8 }
}

const slowPulse = {
  scale: [1, 1.05, 1],
  opacity: [0.45, 0.8, 0.45]
}

// --- Data Fetching ---
async function fetchDashboardData(
  tenantId: string,
  now: Date
): Promise<{
  stats: Stats
  deltas: Deltas
  vendasMensais: SalesMonthly[]
  pipeline: PipelineSlice[]
  atividadesRecentes: ActivityItem[]
}> {
  const currentStart = startOfMonth(now)
  const nextStart = addMonths(currentStart, 1)
  const prevStart = addMonths(currentStart, -1)
  const sixStart = addMonths(currentStart, -5)

  const [
    clientesRes,
    vendasRes,
    tarefasRecentesRes,
    tarefasConcluidasRes,
    clientesNovosCurRes,
    clientesNovosPrevRes,
    leadsNovosCurRes,
    leadsNovosPrevRes,
    fechadosCurRes,
    fechadosPrevRes,
    receitaPrevistaRes,
    conversasNaoLidasRes,
    tarefasHojeRes,
    tarefasAtrasadasRes,
  ] = await Promise.all([
    supabase.from('clientes').select('id, status').eq('tenant_id', tenantId),
    supabase.from('vendas').select('valor, data_venda').eq('tenant_id', tenantId).gte('data_venda', sixStart.toISOString()).lt('data_venda', nextStart.toISOString()),
    supabase.from('tarefas').select('id, titulo, status, created_at, clientes(nome)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(3),
    supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'concluida'),
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', currentStart.toISOString()).lt('created_at', nextStart.toISOString()),
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', prevStart.toISOString()).lt('created_at', currentStart.toISOString()),
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'lead').gte('created_at', currentStart.toISOString()).lt('created_at', nextStart.toISOString()),
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'lead').gte('created_at', prevStart.toISOString()).lt('created_at', currentStart.toISOString()),
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'fechado').gte('created_at', currentStart.toISOString()).lt('created_at', nextStart.toISOString()),
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'fechado').gte('created_at', prevStart.toISOString()).lt('created_at', currentStart.toISOString()),
    supabase.from('clientes').select('valor_potencial').eq('tenant_id', tenantId).in('status', ['lead', 'negociacao']),
    // Conversas não lidas
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gt('unread_count', 0),
    // Tarefas de hoje
    supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('data_vencimento', now.toISOString().split('T')[0]).neq('status', 'concluida'),
    // Tarefas atrasadas
    supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).lt('data_vencimento', now.toISOString().split('T')[0]).neq('status', 'concluida'),
  ])

  const clientes = clientesRes.data || []
  const totalClientes = clientes.length
  const counts = clientes.reduce((acc, c) => {
    const s = c.status as LeadStatus
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {} as Record<LeadStatus, number>)

  const leadsAtivos = counts.lead || 0
  const pipeline: PipelineSlice[] = [
    { name: 'Lead', value: counts.lead || 0, count: counts.lead || 0, color: PIPELINE_COLORS.Lead },
    { name: 'Negociação', value: counts.negociacao || 0, count: counts.negociacao || 0, color: PIPELINE_COLORS.Negociação },
    { name: 'Fechado', value: counts.fechado || 0, count: counts.fechado || 0, color: PIPELINE_COLORS.Fechado },
    { name: 'Perdido', value: counts.perdido || 0, count: counts.perdido || 0, color: PIPELINE_COLORS.Perdido },
  ]

  const vendas = vendasRes.data || []
  const totalVendasCur = vendas.filter(v => {
    const d = new Date(v.data_venda)
    return d >= currentStart && d < nextStart
  }).reduce((sum, v) => sum + Number(v.valor), 0)

  const totalVendasPrev = vendas.filter(v => {
    const d = new Date(v.data_venda)
    return d >= prevStart && d < currentStart
  }).reduce((sum, v) => sum + Number(v.valor), 0)

  const bucket = new Map<string, number>()
  vendas.forEach(v => {
    const d = new Date(v.data_venda)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    bucket.set(key, (bucket.get(key) ?? 0) + Number(v.valor))
  })

  const vendasMensais: SalesMonthly[] = []
  for (let i = 5; i >= 0; i--) {
    const d = addMonths(currentStart, -i)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    vendasMensais.push({ month: monthLabel(d), vendas: bucket.get(key) ?? 0 })
  }

  const atividadesRecentes: ActivityItem[] = (tarefasRecentesRes.data || []).map((t: any) => ({
    id: String(t.id),
    action: t.titulo,
    status: t.status,
    cliente: t.clientes?.nome ?? 'Sem cliente',
    time: new Date(String(t.created_at)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }))

  const curCreated = clientesNovosCurRes.count ?? 0
  const prevCreated = clientesNovosPrevRes.count ?? 0
  const curCreatedLeads = leadsNovosCurRes.count ?? 0
  const prevCreatedLeads = leadsNovosPrevRes.count ?? 0
  const curCreatedFechados = fechadosCurRes.count ?? 0
  const prevCreatedFechados = fechadosPrevRes.count ?? 0

  const vendasAbs = totalVendasCur - totalVendasPrev
  const vendasPct = totalVendasPrev > 0 ? (vendasAbs / totalVendasPrev) * 100 : (totalVendasCur > 0 ? 100 : 0)
  const clientesAbs = curCreated - prevCreated
  const clientesPct = prevCreated > 0 ? (clientesAbs / prevCreated) * 100 : (curCreated > 0 ? 100 : 0)
  const leadsAbs = curCreatedLeads - prevCreatedLeads
  const leadsPct = prevCreatedLeads > 0 ? (leadsAbs / prevCreatedLeads) * 100 : (curCreatedLeads > 0 ? 100 : 0)
  const convCur = curCreated > 0 ? (curCreatedFechados / curCreated) * 100 : 0
  const convPrev = prevCreated > 0 ? (prevCreatedFechados / prevCreated) * 100 : 0
  const convPct = convCur - convPrev

  const receitaPrevista = (receitaPrevistaRes.data || []).reduce((acc, c) => acc + (Number(c.valor_potencial) || 0), 0)
  const taxaConversao = Number(convCur.toFixed(1))

  let despesasFixas = 0
  try {
    despesasFixas = await expenseService.getTotalDespesasFixas(tenantId)
  } catch (error) {
    console.error('Erro ao buscar despesas fixas:', error)
    despesasFixas = 0
  }

  return {
    stats: {
      totalVendas: totalVendasCur,
      totalClientes,
      leadsAtivos,
      conversionRate: Number(((totalClientes > 0 ? (counts.fechado / totalClientes) * 100 : 0)).toFixed(1)),
      leadsNovos: curCreatedLeads,
      receitaPrevista,
      taxaConversao,
      atividadesConcluidas: tarefasConcluidasRes.count ?? 0,
      despesasFixas,
      conversasNaoLidas: conversasNaoLidasRes.count ?? 0,
      tarefasHoje: tarefasHojeRes.count ?? 0,
      tarefasAtrasadas: tarefasAtrasadasRes.count ?? 0,
      receitaMes: totalVendasCur,
      metaMes: 50000,
    },
    deltas: {
      vendasAbs,
      vendasPct,
      clientesAbs,
      clientesPct,
      leadsAbs,
      leadsPct,
      convPct,
    },
    vendasMensais,
    pipeline,
    atividadesRecentes,
  }
}

// --- Components ---

const WelcomeBanner = ({ userName, stats }: { userName: string, stats: Stats }) => {
  const shouldReduceMotion = useReducedMotion()

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const moodLine = () => {
    if ((stats.tarefasAtrasadas ?? 0) > 0) {
      return `Bora limpar ${stats.tarefasAtrasadas} pendência${stats.tarefasAtrasadas === 1 ? '' : 's'} atrasada${stats.tarefasAtrasadas === 1 ? '' : 's'} primeiro?`
    }
    if ((stats.conversasNaoLidas ?? 0) > 0) {
      return `${stats.conversasNaoLidas} conversa${stats.conversasNaoLidas === 1 ? '' : 's'} esperando resposta.`
    }
    if ((stats.tarefasHoje ?? 0) > 0) {
      return `${stats.tarefasHoje} tarefa${stats.tarefasHoje === 1 ? '' : 's'} na fila de hoje. Escolha a mais estratégica.`
    }
    return 'Tudo em dia. Aproveite para revisar o pipeline ou falar com leads quentes.'
  }

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.div
        className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"
        animate={(shouldReduceMotion ?? false) ? {} : {
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -left-10 bottom-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl"
        animate={(shouldReduceMotion ?? false) ? {} : slowPulse}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.18),transparent_35%)]"
        animate={(shouldReduceMotion ?? false) ? {} : { rotate: [0, 2, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10">
        <h1 className="text-4xl font-bold font-outfit text-text mb-2">
          {greeting()}, {userName}.
        </h1>
        <p className="text-base text-text/80 mb-3">{moodLine()}</p>
        <div className="flex flex-wrap gap-4 text-sm text-text opacity-80">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {stats.tarefasHoje || 0} tarefas hoje
          </span>
          <span className="w-1 h-1 rounded-full bg-text opacity-30 self-center"></span>
          <span className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {stats.conversasNaoLidas || 0} conversas pendentes
          </span>
          {stats.tarefasAtrasadas! > 0 && (
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
  )
}

const QuickStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend
}: {
  title: string
  value: string | number
  subtitle: string
  icon: any
  color: string
  trend?: { value: number, isPositive: boolean }
}) => {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl bg-surface border border-slate-200 dark:border-slate-800 p-6 group transition-all duration-300"
      variants={item}
      whileHover={hoverLift(reduceMotion ?? false)}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 230, damping: 23 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <motion.div
        className={`absolute top-0 right-0 w-32 h-32 ${color} rounded-full blur-3xl -mr-16 -mt-16 transition-opacity duration-500`}
        initial={{ opacity: 0.06, scale: 0.95 }}
        animate={(reduceMotion ?? false) ? {} : { opacity: [0.06, 0.14, 0.06], scale: [0.95, 1.05, 0.95] }}
        whileHover={{ opacity: 0.22 }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-white/10 via-transparent to-white/0 pointer-events-none"
        animate={(reduceMotion ?? false) ? {} : { rotate: [0, 0.8, 0], scale: [1, 1.01, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-x-4 bottom-2 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100"
        animate={(reduceMotion ?? false) ? {} : { scaleX: [0.8, 1, 0.9, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend.isPositive ? 'text-green-600 bg-green-100 dark:bg-green-900/20' : 'text-red-600 bg-red-100 dark:bg-red-900/20'}`}>
              {trend.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(trend.value).toFixed(1)}%
            </div>
          )}
        </div>

        <div className="text-sm font-medium font-heading text-text opacity-80 mb-1">{title}</div>
        <div className="text-2xl font-bold font-heading text-text mb-1">{value}</div>
        <div className="text-sm text-text opacity-60">{subtitle}</div>
      </div>
    </motion.div>
  )
}

const PipelineWidget = ({ pipeline }: { pipeline: PipelineSlice[] }) => {
  const reduceMotion = useReducedMotion()
  const total = pipeline.reduce((sum, p) => sum + p.count, 0)

  return (
    <div className="space-y-3">
      {pipeline.map((item, idx) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0
        return (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.09, duration: 0.5, ease: "easeOut" }}
            whileHover={(reduceMotion ?? false) ? { scale: 1.01 } : { scale: 1.02, x: 3 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium font-heading text-text">{item.name}</span>
              <span className="text-sm text-text opacity-60">{item.count} ({percentage.toFixed(0)}%)</span>
            </div>
            <div className="relative h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0"
                animate={(reduceMotion ?? false) ? {} : { opacity: [0, 1, 0], x: ['-20%', '120%', '-20%'] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: idx * 0.1 }}
              />
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.7, delay: idx * 0.09, ease: "easeInOut", type: (reduceMotion ?? false) ? "tween" : "spring", bounce: (reduceMotion ?? false) ? 0 : 0.25 }}
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
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
      whileHover={hoverLift(reduceMotion ?? false)}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Container que se adapta ao tamanho natural da imagem */}
      <div className="relative w-full">
        {/* Imagem de referência para manter altura - primeira imagem visível para definir tamanho */}
        <img
          src={carouselImages[0]}
          alt=""
          className="w-full h-auto opacity-0"
          aria-hidden="true"
        />

        {/* Animated carousel images - posicionadas absolutamente sobre a referência */}
        <AnimatePresence initial={false}>
          <motion.img
            key={currentIndex}
            src={carouselImages[currentIndex]}
            alt={`Card ${currentIndex + 1}`}
            className="absolute inset-0 w-full h-full object-contain rounded-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: "easeInOut"
            }}
          />
        </AnimatePresence>

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none rounded-3xl" />

        {/* Navigation dots */}
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

// --- Main Component ---
export default function Dashboard() {
  const { user, member, tenant, profile } = useAuthStore()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])
  const userName = useMemo(() => profile?.display_name || user?.user_metadata?.name || 'Usuário', [user, profile])

  const [stats, setStats] = useState<Stats>({
    totalVendas: 0,
    totalClientes: 0,
    leadsAtivos: 0,
    conversionRate: 0,
    conversasNaoLidas: 0,
    tarefasHoje: 0,
    tarefasAtrasadas: 0,
    receitaMes: 0,
    metaMes: 50000,
  })
  const [deltas, setDeltas] = useState<Deltas>({
    vendasAbs: 0,
    vendasPct: 0,
    clientesAbs: 0,
    clientesPct: 0,
    leadsAbs: 0,
    leadsPct: 0,
    convPct: 0,
  })
  const [pipeline, setPipeline] = useState<PipelineSlice[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})

  // Apenas owners podem ver o centro financeiro (despesas, receita prevista, etc)
  const podeVerFinanceiro = useMemo(() => {
    return member?.role === 'owner'
  }, [member])

  useEffect(() => {
    // Se não tem tenant, mostrar estado vazio (não ficar travado no loading)
    if (!tenantId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchDashboardData(tenantId, new Date())
      .then(data => {
        setStats(data.stats)
        setDeltas(data.deltas)
        setPipeline(data.pipeline)
        setActivities(data.atividadesRecentes)
      })
      .catch(err => console.error('Erro ao carregar dashboard:', err))
      .finally(() => setLoading(false))
  }, [tenantId])

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

  const handleTaskToggle = async (taskId: string, newStatus: boolean) => {
    try {
      // Optimistic update
      setCompletedTasks(prev => ({ ...prev, [taskId]: newStatus }))

      const { error } = await supabase
        .from('tarefas')
        .update({ status: newStatus ? 'concluida' : 'pendente' })
        .eq('id', taskId)

      if (error) throw error

      // Se foi marcada como concluída, verificar conquistas
      if (newStatus && user?.id && tenantId) {
        checkAndUnlockAchievements(user.id, tenantId)
      }
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
      // Revert optimistic update
      setCompletedTasks(prev => ({ ...prev, [taskId]: !newStatus }))
      toast.error('Erro ao atualizar tarefa')
    }
  }

  const metaPercentage = stats.metaMes! > 0 ? (stats.receitaMes! / stats.metaMes!) * 100 : 0

  return (
    <div className="min-h-full bg-background p-6 overflow-hidden">
      <LaunchOfferModal />
      <div className="max-w-[1600px] mx-auto">
        <motion.div
          className="space-y-6"
          layout
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Main Layout: Content + Sidebar (from top) */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
            {/* Left Column - Main Content */}
            <div className="space-y-6">
              {/* Welcome Banner */}
              <WelcomeBanner userName={userName} stats={stats} />

              {/* Quick Stats Grid */}
              <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" variants={container}>
                <div onClick={() => navigate('/app/clientes')} className="cursor-pointer">
                  <QuickStatCard
                    title="Receita do Mês"
                    value={brl(stats.receitaMes || 0)}
                    subtitle={`${metaPercentage.toFixed(0)}% da meta`}
                    icon={DollarSign}
                    color="bg-green-500"
                    trend={{ value: deltas.vendasPct, isPositive: deltas.vendasPct >= 0 }}
                  />
                </div>
                <div onClick={() => navigate('/app/tarefas')} className="cursor-pointer">
                  <QuickStatCard
                    title="Tarefas de Hoje"
                    value={stats.tarefasHoje || 0}
                    subtitle={stats.tarefasAtrasadas! > 0 ? `${stats.tarefasAtrasadas} atrasadas` : 'Tudo em dia'}
                    icon={CheckCircle2}
                    color="bg-blue-500"
                  />
                </div>
                <div onClick={() => navigate('/app/conversations')} className="cursor-pointer">
                  <QuickStatCard
                    title="Mensagens Pendentes"
                    value={stats.conversasNaoLidas || 0}
                    subtitle="Conversas não lidas"
                    icon={MessageSquare}
                    color="bg-purple-500"
                  />
                </div>
                <div onClick={() => navigate('/app/clientes')} className="cursor-pointer">
                  <QuickStatCard
                    title="Leads Ativos"
                    value={stats.leadsAtivos}
                    subtitle={`${stats.leadsNovos || 0} novos este mês`}
                    icon={Users}
                    color="bg-orange-500"
                    trend={{ value: deltas.leadsPct, isPositive: deltas.leadsPct >= 0 }}
                  />
                </div>
              </motion.div>

              {/* Pipeline and Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pipeline */}
                <motion.div
                  className="bg-surface border border-slate-200 dark:border-slate-800 rounded-xl p-6 cursor-pointer hover:border-primary/30 transition-colors"
                  variants={item}
                  whileHover={hoverLift(reduceMotion ?? false)}
                  style={{ transformStyle: 'preserve-3d' }}
                  onClick={() => navigate('/app/clientes')}
                >
                  <h3 className="text-lg font-semibold font-heading text-text mb-6 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Pipeline de Vendas
                  </h3>
                  <PipelineWidget pipeline={pipeline} />
                </motion.div>

                {/* Atividades Recentes */}
                <motion.div
                  className="bg-surface border border-slate-200 dark:border-slate-800 rounded-xl p-6"
                  variants={item}
                  whileHover={(reduceMotion ?? false) ? { scale: 1.01 } : { scale: 1.02, x: 3 }}
                >
                  <h3 className="text-lg font-semibold font-heading text-text mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Atividades Recentes
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                      {activities.length > 0 ? activities.map((activity, idx) => (
                        <motion.div
                          key={activity.id}
                          layout
                          className="flex items-start gap-4 p-3 rounded-lg bg-background/50 border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all"
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={reduceMotion ? { scale: 1.01 } : { scale: 1.02, x: 4, boxShadow: "0 12px 28px -18px rgba(59,130,246,0.35)" }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="relative pt-1">
                            <motion.div
                              whileTap={{ scale: 0.9 }}
                            >
                              <input
                                type="checkbox"
                                checked={!!completedTasks[activity.id] || activity.status === 'concluida'}
                                onChange={(e) => handleTaskToggle(activity.id, e.target.checked)}
                                className="peer appearance-none w-5 h-5 border rounded bg-transparent checked:bg-primary checked:border-primary transition-colors cursor-pointer border-slate-400 dark:border-slate-600"
                              />
                              <motion.div
                                className="absolute top-1 left-0 pointer-events-none"
                                initial={false}
                                animate={!!completedTasks[activity.id] || activity.status === 'concluida' ? { scale: [1, 1.15, 1], rotate: 360, opacity: 1 } : { opacity: 0 }}
                                transition={{ duration: 0.4 }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-white" />
                              </motion.div>
                            </motion.div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium transition-colors ${completedTasks[activity.id] || activity.status === 'concluida' ? 'text-text opacity-40 line-through' : 'text-text'}`}>
                              {activity.cliente}
                            </div>
                            <div className="text-xs mt-1 flex items-center gap-2 text-text opacity-60">
                              <span className="truncate">{activity.action}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {activity.time}</span>
                            </div>
                          </div>
                        </motion.div>
                      )) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-12 text-text opacity-50"
                        >
                          Nenhuma atividade recente
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right Sidebar - Same height as left column */}
            <div className="space-y-6">
              {/* Image Carousel */}
              <ImageCarousel reduceMotion={reduceMotion} />

              {/* Financial Cards */}
              {podeVerFinanceiro && (
                <div className="space-y-4">
                  <motion.div
                    className="bg-surface border border-slate-200 dark:border-slate-800 rounded-xl p-6 cursor-pointer hover:border-purple-500/50 transition-colors"
                    variants={item}
                    whileHover={hoverLift(reduceMotion ?? false)}
                    style={{ transformStyle: 'preserve-3d' }}
                    onClick={() => navigate('/app/configuracoes?tab=financeiro')}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-2xl font-bold font-heading text-text">{brl(stats.receitaPrevista || 0)}</div>
                        <div className="text-xs text-text opacity-60">Em negociação aberta</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-surface border border-slate-200 dark:border-slate-800 rounded-xl p-6 cursor-pointer hover:border-pink-500/50 transition-colors"
                    variants={item}
                    whileHover={hoverLift(reduceMotion ?? false)}
                    style={{ transformStyle: 'preserve-3d' }}
                    onClick={() => navigate('/app/configuracoes?tab=financeiro')}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-pink-500/10">
                        <DollarSign className="w-5 h-5 text-pink-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-2xl font-bold font-heading text-text">{brl(stats.despesasFixas || 0)}</div>
                        <div className="text-xs text-text opacity-60">Custo operacional mensal</div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
