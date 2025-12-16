import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users, Settings, Plus, UserPlus, LogIn,
  Target, BarChart3, Shield, Crown, UserCheck,
  Trash2, Save, Package, Facebook
} from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'
import { supabase } from '../lib/supabase'
import { getTeamOverview, createTeam, sendInvite, leaveTeam } from '../services/equipeService'
import DistribuicaoLeads from '../components/team/DistribuicaoLeads'
import ConexaoMeta from '../components/team/ConexaoMeta'
import DistribuicaoMetaLeads from '../components/team/DistribuicaoMetaLeads'
import MetaInsights from '../components/team/MetaInsights'
import GestaoConvites from '../components/team/GestaoConvites'
import ProdutosEquipe from '../components/team/ProdutosEquipe'
import LeadsEquipe from '../components/team/LeadsEquipe'
import { CodigoEquipe } from '../components/team/CodigoEquipe'

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

type EstadoEquipe = 'sem-equipe' | 'criando' | 'entrando' | 'gerenciando'

type Membro = {
  id: string
  user_id: string
  nome: string
  email: string
  telefone: string | null
  cargo: string | null
  avatar_url: string | null
  status: 'pendente' | 'ativo' | 'inativo'
  role: 'owner' | 'admin' | 'administrador' | 'vendedor'
  created_at: string
}

type EquipeCompleta = {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  slogan: string | null
  join_code?: string
  created_at: string
  owner_id: string
  membros: Membro[]
}

type EstatisticasEquipe = {
  membros_ativos: number
  vendedores: number
  leads_hoje: number
}

type AbaTipo =
  | 'visao-geral'
  | 'membros'
  | 'produtos'
  | 'leads'
  | 'distribuicao'
  | 'conexao-meta'
  | 'distribuicao-meta'
  | 'anuncios'
  | 'configuracoes'
  | 'gestao-convites'

type AtividadeRecente = {
  id?: string
  user_id?: string | null
  tipo?: string
  descricao?: string
  created_at?: string
}

type TeamOverviewResponseWithErrors = {
  error?: string
  tenant?: {
    id?: string
    name?: string
    descricao?: string | null
    slogan?: string | null
    created_at?: string
  }
  members?: Array<{
    id?: string
    user_id?: string
    nome?: string
    email?: string
    telefone?: string | null
    cargo?: string | null
    avatar_url?: string | null
    status?: string
    role?: string
    created_at?: string
  }>
  recent_activity?: AtividadeRecente[]
  stats?: EstatisticasEquipe
}

type OverviewMember = {
  id?: string
  user_id?: string
  nome?: string
  email?: string
  telefone?: string | null
  cargo?: string | null
  avatar_url?: string | null
  status?: string
  role?: string
  created_at?: string
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const LoadingScreen = () => {
  const { t } = useTranslation()
  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-300 dark:border-slate-600 rounded-full animate-spin border-t-slate-600 dark:border-t-slate-400"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-slate-500 dark:border-t-slate-500 opacity-20"></div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 animate-pulse">
            {t('team.loading')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse delay-100">
            {t('team.preparing')}
          </p>
        </div>
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  )
}

const HeroSection = () => {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg p-4 sm:p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('team.title')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('team.subtitle')}</p>
    </div>
  )
}

const ActionCards = ({
  onCriarEquipe,
  onEntrarEquipe,
  canJoinTeam
}: {
  onCriarEquipe: () => void;
  onEntrarEquipe: () => void;
  canJoinTeam: boolean;
}) => {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 p-6 sm:p-8 hover:bg-white/50 transition-all duration-300">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center">
            <Plus className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{t('team.createTitle')}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">{t('team.createDescription')}</p>
        <button onClick={onCriarEquipe} className="w-full py-3 px-4 text-sm font-medium bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 rounded-lg transition-all duration-300 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          {t('team.createButton')}
        </button>
      </div>

      <div className="rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 p-6 sm:p-8 hover:bg-white/50 transition-all duration-300">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center">
            <LogIn className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{t('team.joinTitle')}</h3>
        </div>
        {!canJoinTeam ? (
          <div className="text-amber-600 dark:text-amber-400 text-sm mb-6 leading-relaxed bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3">
            {t('team.subscriptionRequired')}
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">{t('team.joinDescription')}</p>
        )}
        <button
          onClick={onEntrarEquipe}
          disabled={!canJoinTeam}
          className={`w-full py-3 px-4 text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${!canJoinTeam
            ? 'bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 text-slate-900 dark:text-white'
            }`}
        >
          <LogIn className="w-4 h-4" />
          {t('team.joinButton')}
        </button>
      </div>
    </div>
  )
}

const BenefitsSection = () => {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg bg-white dark:bg-white/3 border border-slate-200 dark:border-white/10 p-4 sm:p-6">
      <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-6">
        {t('team.resourcesTitle')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white text-sm mb-1">
              {t('team.resourceData')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              {t('team.resourceDataDesc')}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white text-sm mb-1">
              {t('team.resourceMembers')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              {t('team.resourceMembersDesc')}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white text-sm mb-1">
              {t('team.resourceTracking')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              {t('team.resourceTrackingDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TeamHeaderProps {
  equipe: EquipeCompleta
  isOwner: boolean
  isAdmin: boolean
  isAdministrador: boolean
  onConvidarMembro: () => void
  onSairEquipe?: () => void
  stats: EstatisticasEquipe
}

const TeamHeader = ({ equipe, isOwner, isAdmin, isAdministrador, onConvidarMembro, onSairEquipe, stats }: TeamHeaderProps) => {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg p-4 sm:p-6 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {equipe.nome || t('team.title')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {equipe.slogan || t('team.defaultSlogan')}
            </p>
            <div className="flex items-center gap-3">
              {isOwner ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold uppercase tracking-wide">
                  <Crown className="w-3.5 h-3.5" />
                  {t('team.owner')}
                </span>
              ) : isAdmin ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-lg text-xs font-semibold uppercase tracking-wide">
                  <Shield className="w-3.5 h-3.5" />
                  {t('team.admin')}
                </span>
              ) : isAdministrador ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-semibold uppercase tracking-wide">
                  <Shield className="w-3.5 h-3.5" />
                  {t('team.administrator')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold uppercase tracking-wide">
                  <UserCheck className="w-3.5 h-3.5" />
                  {t('team.salesperson')}
                </span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-white/10 pl-3">
                {equipe.membros.length} {equipe.membros.length === 1 ? t('team.member') : t('team.members')}
              </span>
            </div>
          </div>

          {onSairEquipe && !isOwner && (
            <button
              onClick={onSairEquipe}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-colors duration-300 font-semibold text-sm w-fit"
            >
              <LogIn className="w-4 h-4 rotate-180" />
              {t('team.leaveTeam')}
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-3 flex-1">
              <div className="rounded-lg p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('team.activeMembers')} </p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.membros_ativos}</p>
              </div>
              <div className="rounded-lg p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('team.sellers')}</p>
                <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{stats.vendedores}</p>
              </div>
              <div className="rounded-lg p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('team.leadsToday')}</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.leads_hoje}</p>
              </div>
            </div>

            {(isOwner || isAdmin) && (
              <button
                onClick={onConvidarMembro}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-cyan-500/20 hover:scale-105 active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                {t('team.invite')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const TabNavigation = ({ abaAtiva, onChangeAba, canManageTeam }: { abaAtiva: AbaTipo, onChangeAba: (aba: AbaTipo) => void, canManageTeam: boolean }) => {
  const { t } = useTranslation()
  const tabs = [
    { id: 'visao-geral', label: t('team.tabs.overview'), icon: BarChart3 },
    { id: 'membros', label: t('team.tabs.members'), icon: Users },
    { id: 'produtos', label: t('team.tabs.products'), icon: Package },
    { id: 'leads', label: t('team.tabs.leads'), icon: Users },
  ]

  if (canManageTeam) {
    tabs.push(
      // OCULTO PARA LANCAMENTO: { id: 'conexao-meta', label: t('team.tabs.metaConnection'), icon: Facebook },
      // OCULTO PARA LANCAMENTO: { id: 'distribuicao-meta', label: t('team.tabs.metaDistribution'), icon: Target },
      // OCULTO PARA LANCAMENTO: { id: 'anuncios', label: t('team.tabs.ads'), icon: BarChart3 },
      { id: 'gestao-convites', label: t('team.tabs.invites'), icon: UserPlus },
      { id: 'configuracoes', label: t('team.tabs.settings'), icon: Settings }
    )
  }

  return (
    <div className="flex overflow-x-auto pb-2 gap-2 mb-6 scrollbar-hide">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = abaAtiva === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChangeAba(tab.id as AbaTipo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
              }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

const MemberCard = ({ membro, currentUserId }: { membro: Membro, currentUserId?: string }) => {
  const { t } = useTranslation()
  const isCurrentUser = membro.user_id === currentUserId || membro.id === currentUserId

  return (
    <div className="p-4 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm">
            {membro.avatar_url ? (
              <img src={membro.avatar_url} alt={membro.nome} className="w-full h-full rounded-full object-cover" />
            ) : (
              membro.nome?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white text-sm flex items-center gap-2">
              {membro.nome}
              {isCurrentUser && <span className="text-xs text-cyan-500 font-normal">({t('team.you')})</span>}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{membro.email}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${membro.status === 'ativo'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
          {membro.status === 'ativo' ? t('team.active') : t('team.pending')}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">{t('team.role')}</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
            {membro.role === 'owner' ? t('team.owner') :
              membro.role === 'admin' ? t('team.admin') :
                membro.role === 'administrador' ? t('team.administrator') : t('team.salesperson')}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">{t('team.joined')}</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {new Date(membro.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function MinhaEquipe() {
  const { member, tenant, user, loading: authLoading } = useAuthStore()
  const { canShareTeamCode, canJoinTeam } = useSubscriptionLimits()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // ⚠️ GUARD: Verificar autenticação
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!member || !member.tenant_id || !tenant?.id) {
      setEstado('sem-equipe')
    }
  }, [authLoading, user, member, tenant, navigate])

  // Estados principais
  const [estado, setEstado] = useState<EstadoEquipe>('sem-equipe')
  const [loading, setLoading] = useState(true)
  const [equipe, setEquipe] = useState<EquipeCompleta | null>(null)
  const equipeRef = useRef<EquipeCompleta | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('visao-geral')

  // Timeout de segurança
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !authLoading) {
        setLoading(false)
        if (!member || !member.tenant_id) {
          setEstado('sem-equipe')
        }
      }
    }, 5000)
    return () => clearTimeout(timeout)
  }, [loading, authLoading, member])

  // Verificar parâmetros da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab') as AbaTipo
    if (tabParam && ['visao-geral', 'membros', 'distribuicao', 'conexao-meta', 'configuracoes'].includes(tabParam)) {
      setAbaAtiva(tabParam)
    }
  }, [])

  // Estados para dados
  const [atividadesRecentes, setAtividadesRecentes] = useState<AtividadeRecente[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasEquipe>({
    membros_ativos: 0,
    vendedores: 0,
    leads_hoje: 0
  })

  // Estados dos modais
  const [showCriarModal, setShowCriarModal] = useState(false)
  const [showEntrarModal, setShowEntrarModal] = useState(false)
  const [showConviteModal, setShowConviteModal] = useState(false)
  const [showOpcoesConvite, setShowOpcoesConvite] = useState(false)
  const [updatingMember, setUpdatingMember] = useState<string | null>(null)

  // Estados para configurações
  const [configForm, setConfigForm] = useState<{ nome: string; slogan: string }>({
    nome: '',
    slogan: ''
  })
  const [savingConfig, setSavingConfig] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingTeam, setDeletingTeam] = useState(false)
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false)
  const [deleteTeamConfirmText, setDeleteTeamConfirmText] = useState('')

  // Formulários
  const [novaEquipeForm, setNovaEquipeForm] = useState({ nome: '', slogan: '' })
  const [entrarEquipeForm, setEntrarEquipeForm] = useState({ codigoConvite: '' })
  const [conviteForm, setConviteForm] = useState({
    email: '',
    nome: '',
    cargo: '',
    role: 'vendedor' as 'admin' | 'administrador' | 'vendedor'
  })

  // Carregar dados da equipe
  const loadEquipeData = async () => {
    if (authLoading) return

    if (!member || !member.tenant_id || member.status !== 'ativo') {
      setEstado('sem-equipe')
      setEquipe(null)
      setLoading(false)
      return
    }

    const tenantIdToShow = member.tenant_id

    try {
      const overviewResponse = await getTeamOverview(tenantIdToShow)
      const overview = overviewResponse as TeamOverviewResponseWithErrors

      if (overview.error) throw new Error(overview.error)

      if (!overview.members || overview.members.length === 0) {
        setEstado('sem-equipe')
        setEquipe(null)
        setLoading(false)
        return
      }

      const { data: tenantWithCode } = await supabase
        .from('tenants')
        .select('join_code')
        .eq('id', tenantIdToShow)
        .single()

      const joinCode = tenantWithCode?.join_code || undefined

      const ownerMember = (overview.members || []).find((m: OverviewMember) => m.role === 'owner')
      const equipeFromSupabase: EquipeCompleta = {
        id: tenantIdToShow,
        tenant_id: tenantIdToShow,
        nome: overview.tenant?.name || 'Equipe',
        descricao: overview.tenant?.descricao || null,
        slogan: overview.tenant?.slogan || null,
        join_code: joinCode,
        created_at: overview.tenant?.created_at || new Date().toISOString(),
        owner_id: ownerMember?.id || '',
        membros: (overview.members || []).map((m: OverviewMember) => ({
          id: m.id || '',
          user_id: m.user_id || m.id || '',
          nome: m.nome || '',
          email: m.email || '',
          telefone: m.telefone || null,
          cargo: m.cargo || null,
          avatar_url: m.avatar_url || null,
          status: (() => {
            const obj = m as unknown as Record<string, unknown>
            const activeFlag = obj['active'] as boolean | undefined
            const raw = (obj['status'] ?? (typeof activeFlag === 'boolean' ? (activeFlag ? 'active' : 'inactive') : undefined)) as string | undefined
            if (!raw) return 'ativo'
            const s = String(raw).toLowerCase()
            if (s === 'active' || s === 'ativo') return 'ativo'
            if (s === 'pending' || s === 'pendente') return 'pendente'
            if (s === 'inactive' || s === 'inativo') return 'inativo'
            return s ? 'ativo' : 'inativo'
          })(),
          role: (m.role as 'owner' | 'admin' | 'administrador' | 'vendedor') || 'vendedor',
          created_at: m.created_at || new Date().toISOString()
        }))
      }

      setEquipe(equipeFromSupabase)
      equipeRef.current = equipeFromSupabase
      setAtividadesRecentes(overview.recent_activity || [])
      setEstatisticas(overview.stats || {
        membros_ativos: 0,
        vendedores: 0,
        leads_hoje: 0
      })

      setConfigForm({
        nome: equipeFromSupabase.nome,
        slogan: equipeFromSupabase.slogan || ''
      })
      setEstado('gerenciando')
    } catch (error) {
      console.error('Erro ao carregar dados da equipe:', error)
      toast.error(t('team.loadError'))
      setEstado('sem-equipe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEquipeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.tenant_id, member?.status, authLoading])

  // Handlers
  const handleCriarEquipe = async () => {
    if (!novaEquipeForm.nome.trim()) {
      toast.error(t('team.nameRequired'))
      return
    }

    try {
      await createTeam(novaEquipeForm.nome, novaEquipeForm.slogan)
      toast.success(t('team.createSuccess'))
      setShowCriarModal(false)
      setNovaEquipeForm({ nome: '', slogan: '' })

      const authStore = useAuthStore.getState()
      await authStore.loadSession()

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Erro ao criar equipe:', error)
      toast.error(t('team.createError'))
    }
  }

  const handleEntrarEquipe = async () => {
    if (!entrarEquipeForm.codigoConvite.trim()) {
      toast.error(t('team.codeRequired'))
      return
    }

    const input = entrarEquipeForm.codigoConvite.trim()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)
    const isJoinCode = /^[A-Z0-9]{8}$/i.test(input)

    if (isUUID) {
      navigate(`/join-team?id=${encodeURIComponent(input)}`)
    } else if (isJoinCode) {
      try {
        toast.loading(t('team.joining'))
        const { joinTeamWithCode } = await import('../services/equipeService')
        await joinTeamWithCode(input)
        setShowEntrarModal(false)
        setEntrarEquipeForm({ codigoConvite: '' })
        toast.dismiss()
        toast.success(t('team.joinSuccess'))
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        console.error('Erro ao entrar com código:', error)
        toast.dismiss()
        toast.error(t('team.invalidCode'))
      }
    } else {
      toast.error(t('team.invalidFormat'))
    }
  }

  const handleEnviarConvite = async () => {
    if (!conviteForm.email.trim()) {
      toast.error(t('team.emailRequired'))
      return
    }

    try {
      await sendInvite(
        conviteForm.email,
        conviteForm.nome,
        conviteForm.role,
        tenant?.id || ''
      )
      toast.success(t('team.inviteSent', { email: conviteForm.email }))
      setShowConviteModal(false)
      setConviteForm({ email: '', nome: '', cargo: '', role: 'vendedor' })
    } catch (error) {
      console.error('Erro ao enviar convite:', error)
      toast.error(t('team.inviteError'))
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: 'administrador' | 'vendedor') => {
    try {
      setUpdatingMember(memberId)

      if (!equipe?.tenant_id) throw new Error('Tenant não identificado')

      const currentUser = await supabase.auth.getUser()
      if (!currentUser.data.user) throw new Error('Usuário não autenticado')

      const { data: currentUserMembership } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', currentUser.data.user.id)
        .eq('tenant_id', equipe.tenant_id)
        .single()

      if (!['owner', 'administrador'].includes(currentUserMembership?.role)) {
        throw new Error('Sem permissão')
      }

      const overview = await getTeamOverview(equipe.tenant_id)
      const targetMember = (overview.members || []).find((m: OverviewMember) =>
        m.id === memberId || m.user_id === memberId
      )

      if (!targetMember) throw new Error('Membro não encontrado')

      const targetUserId = targetMember.user_id || targetMember.id

      const { error: updateError } = await supabase
        .from('memberships')
        .update({ role: newRole })
        .eq('user_id', targetUserId)
        .eq('tenant_id', equipe.tenant_id)

      if (updateError) throw updateError

      toast.success(t('team.roleUpdated'))

      setEquipe(prevEquipe => {
        if (!prevEquipe) return prevEquipe
        const updatedMembros = prevEquipe.membros.map(membro =>
          membro.id === memberId || membro.user_id === targetUserId
            ? { ...membro, role: newRole }
            : membro
        )
        return { ...prevEquipe, membros: updatedMembros }
      })

    } catch (error) {
      console.error('Erro ao atualizar permissão:', error)
      toast.error(t('team.roleUpdateError'))
    } finally {
      setUpdatingMember(null)
    }
  }

  const handleCopiarLinkConvite = async () => {
    if (!equipe?.id) return
    const linkConvite = `${window.location.origin}/join-team?tenant=${equipe.id}`
    try {
      await navigator.clipboard.writeText(linkConvite)
      toast.success(t('team.linkCopied'))
    } catch (error) {
      console.error('Erro ao copiar link:', error)
      toast.error(t('team.linkCopyError'))
    }
  }

  const handleSairEquipe = async () => {
    if (!tenant?.id) return
    const confirmed = window.confirm(t('team.confirmLeave'))
    if (!confirmed) return

    try {
      await leaveTeam(tenant.id)
      toast.success(t('team.leaveSuccess'))
      setEstado('sem-equipe')
      setEquipe(null)
      const authStore = useAuthStore.getState()
      authStore.setMember(null)
      authStore.setHasTenant(false)
      setTimeout(() => {
        navigate('/dashboard')
      }, 500)
    } catch (e) {
      console.error('Erro ao sair da equipe:', e)
      toast.error(t('team.leaveError'))
    }
  }

  const handleLeaveTeam = async () => {
    if (!equipe?.id || !tenant?.id) return
    if (deleteConfirmText !== equipe.nome) {
      toast.error(t('team.nameMismatch'))
      return
    }

    setDeletingTeam(true)
    try {
      const { error: removeUserError } = await supabase
        .from('memberships')
        .delete()
        .eq('tenant_id', equipe.id)
        .eq('user_id', member?.id)

      if (removeUserError) throw removeUserError

      toast.success(t('team.leaveSafeSuccess'))

      const authStore = useAuthStore.getState()
      authStore.setTenant(null)
      authStore.setMember(null)
      authStore.setUser(authStore.user)
      authStore.setHasTenant(false)
      authStore.setIsAdmin(false)

      setTimeout(() => {
        setEstado('sem-equipe')
        setEquipe(null)
        equipeRef.current = null
        setLoading(false)
        setShowDeleteModal(false)
        setDeleteConfirmText('')
      }, 100)

    } catch (error) {
      console.error('Erro no processo:', error)
      toast.error(t('team.leaveError'))
    } finally {
      setDeletingTeam(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!tenant?.id) return
    const nome = configForm.nome.trim()
    const slogan = configForm.slogan.trim()

    if (!nome) {
      toast.error(t('team.nameRequired'))
      return
    }

    try {
      setSavingConfig(true)
      const { error } = await supabase
        .from('tenants')
        .update({
          name: nome,
          slogan: slogan || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant.id)

      if (error) throw error

      setEquipe((prev) => {
        if (!prev) return prev
        return { ...prev, nome, slogan: slogan || null }
      })

      const authStore = useAuthStore.getState()
      if (authStore.tenant?.id === tenant.id) {
        authStore.setTenant({ ...authStore.tenant, name: nome })
      }

      window.dispatchEvent(new CustomEvent('teamNameUpdated', {
        detail: { nome, slogan }
      }))

      setConfigForm({ nome, slogan })
      toast.success(t('team.settingsSaved'))
    } catch (e) {
      console.error(e)
      toast.error(t('team.saveError'))
    } finally {
      setSavingConfig(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!equipe?.id || deleteTeamConfirmText !== equipe.nome) {
      toast.error(t('team.deleteConfirm'))
      return
    }

    setDeletingTeam(true)
    const toastId = toast.loading('Excluindo equipe e todos os dados relacionados...')

    try {
      const tenantId = equipe.id

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      console.log('Iniciando exclusão da equipe:', tenantId)

      // 1. Clear default_tenant_id from all profiles
      toast.loading('Limpando perfis de usuário...', { id: toastId })
      const { error: profilesError } = await supabase
        .from('profiles')
        .update({ default_tenant_id: null })
        .eq('default_tenant_id', tenantId)

      if (profilesError) {
        console.error('Erro ao limpar default_tenant_id:', profilesError)
      }

      // 2. Delete child tables first (in order of dependencies)

      // Messages and conversations
      toast.loading('Removendo mensagens e conversas...', { id: toastId })
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('tenant_id', tenantId)

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id)
        await supabase.from('messages').delete().in('conversation_id', conversationIds)
      }
      await supabase.from('conversations').delete().eq('tenant_id', tenantId)

      // Webhook related
      toast.loading('Removendo webhooks...', { id: toastId })
      const { data: webhookSubs } = await supabase
        .from('webhook_subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)

      const { data: webhookEvents } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('tenant_id', tenantId)

      if (webhookSubs && webhookSubs.length > 0) {
        const subIds = webhookSubs.map(s => s.id)
        await supabase.from('webhook_deliveries').delete().in('subscription_id', subIds)
      }

      if (webhookEvents && webhookEvents.length > 0) {
        const eventIds = webhookEvents.map(e => e.id)
        await supabase.from('webhook_deliveries').delete().in('event_id', eventIds)
      }

      await supabase.from('webhook_subscriptions').delete().eq('tenant_id', tenantId)
      await supabase.from('webhook_events').delete().eq('tenant_id', tenantId)
      await supabase.from('webhook_logs').delete().eq('tenant_id', tenantId)

      // Automations
      toast.loading('Removendo automações...', { id: toastId })
      const { data: automacoes } = await supabase
        .from('automacoes')
        .select('id')
        .eq('tenant_id', tenantId)

      if (automacoes && automacoes.length > 0) {
        const automacaoIds = automacoes.map(a => a.id)
        await supabase.from('automacao_logs').delete().in('automacao_id', automacaoIds)
      }
      await supabase.from('automacoes').delete().eq('tenant_id', tenantId)

      // Tasks and related
      toast.loading('Removendo tarefas...', { id: toastId })
      const { data: tarefas } = await supabase
        .from('tarefas')
        .select('id')
        .eq('tenant_id', tenantId)

      if (tarefas && tarefas.length > 0) {
        const tarefaIds = tarefas.map(t => t.id)
        await supabase.from('tarefa_checklist').delete().in('tarefa_id', tarefaIds)
        await supabase.from('tarefas_produtos').delete().in('tarefa_id', tarefaIds)
      }
      await supabase.from('tarefa_anexos').delete().eq('tenant_id', tenantId)
      await supabase.from('tarefas').delete().eq('tenant_id', tenantId)
      await supabase.from('lead_tasks').delete().eq('tenant_id', tenantId)

      // Products and custom fields
      toast.loading('Removendo produtos...', { id: toastId })
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id')
        .eq('tenant_id', tenantId)

      if (produtos && produtos.length > 0) {
        const produtoIds = produtos.map(p => p.id)
        await supabase.from('product_custom_field_values').delete().in('produto_id', produtoIds)
      }
      await supabase.from('cliente_produtos').delete().eq('tenant_id', tenantId)
      await supabase.from('produtos').delete().eq('tenant_id', tenantId)
      await supabase.from('produtos_equipe').delete().eq('tenant_id', tenantId)
      await supabase.from('product_custom_fields').delete().eq('tenant_id', tenantId)

      // Leads/Clients and related
      toast.loading('Removendo leads e clientes...', { id: toastId })
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenantId)

      if (clientes && clientes.length > 0) {
        const clienteIds = clientes.map(c => c.id)
        await supabase.from('lead_custom_field_values').delete().in('lead_id', clienteIds)
      }
      await supabase.from('lead_timeline').delete().eq('tenant_id', tenantId)
      await supabase.from('lead_attachments').delete().eq('tenant_id', tenantId)
      await supabase.from('atividades').delete().eq('tenant_id', tenantId)
      await supabase.from('vendas').delete().eq('tenant_id', tenantId)
      await supabase.from('clientes').delete().eq('tenant_id', tenantId)
      await supabase.from('lead_custom_fields').delete().eq('tenant_id', tenantId)

      // Other tenant data
      toast.loading('Removendo dados da equipe...', { id: toastId })
      await supabase.from('contacts').delete().eq('tenant_id', tenantId)
      await supabase.from('despesas').delete().eq('tenant_id', tenantId)
      await supabase.from('processes').delete().eq('tenant_id', tenantId)
      await supabase.from('equipes').delete().eq('tenant_id', tenantId)
      await supabase.from('campanhas').delete().eq('tenant_id', tenantId)
      await supabase.from('lead_origins').delete().eq('tenant_id', tenantId)
      await supabase.from('lead_loss_reasons').delete().eq('tenant_id', tenantId)
      await supabase.from('pipeline_stages').delete().eq('tenant_id', tenantId)
      await supabase.from('task_stages').delete().eq('tenant_id', tenantId)
      await supabase.from('integrations').delete().eq('tenant_id', tenantId)
      await supabase.from('api_keys').delete().eq('tenant_id', tenantId)
      await supabase.from('audit_logs').delete().eq('tenant_id', tenantId)
      await supabase.from('sales_playbook_objections').delete().eq('team_id', tenantId)
      await supabase.from('company_settings').delete().eq('tenant_id', tenantId)

      // Team invites
      toast.loading('Removendo convites...', { id: toastId })
      await supabase.from('team_invites').delete().eq('tenant_id', tenantId)

      // Subscriptions and plans
      toast.loading('Removendo assinaturas...', { id: toastId })
      await supabase.from('subscriptions').delete().eq('tenant_id', tenantId)
      await supabase.from('plans').delete().eq('tenant_id', tenantId)

      // Delete the tenant BEFORE memberships to avoid RLS issues
      toast.loading('Excluindo equipe...', { id: toastId })
      const { error: tenantError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId)

      if (tenantError) {
        console.error('Erro ao deletar tenant:', tenantError)
        throw tenantError
      }

      // Memberships - delete LAST to maintain RLS permissions during deletion
      toast.loading('Removendo membros...', { id: toastId })
      const { error: membershipsError } = await supabase
        .from('memberships')
        .delete()
        .eq('tenant_id', tenantId)

      if (membershipsError) {
        console.error('Erro ao deletar memberships:', membershipsError)
        // Don't throw - tenant is already deleted
      }

      toast.success('Equipe excluída com sucesso!', { id: toastId })

      setShowDeleteTeamModal(false)
      setDeleteTeamConfirmText('')
      setEstado('sem-equipe')
      setEquipe(null)
      setDeletingTeam(false)

      const authStore = useAuthStore.getState()
      authStore.setMember(null)
      authStore.setTenant(null)
      authStore.setHasTenant(false)
      authStore.setLoading(false)

      // Force a complete page reload to clear all state
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)

    } catch (e) {
      console.error('Erro ao excluir equipe:', e)
      toast.error('Erro ao excluir equipe. Verifique o console para mais detalhes.', { id: toastId })
      setDeletingTeam(false)
    }
  }

  // RENDERIZAÇÃO
  if (loading) return <LoadingScreen />

  if (estado === 'sem-equipe') {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200 flex flex-col">
        <main className="relative flex-1 w-full px-3.5 sm:px-4 py-3.5 sm:py-6 overflow-y-auto">
          <div className="w-full sm:max-w-7xl sm:mx-auto space-y-3.5 sm:space-y-6">
            <HeroSection />
            <ActionCards
              onCriarEquipe={() => setShowCriarModal(true)}
              onEntrarEquipe={() => setShowEntrarModal(true)}
              canJoinTeam={canJoinTeam}
            />
            <BenefitsSection />
          </div>
        </main>

        <Modal isOpen={showCriarModal} onClose={() => setShowCriarModal(false)} title={t('team.createTitle')}>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('team.teamName')} *</label>
              <input
                type="text"
                value={novaEquipeForm.nome}
                onChange={(e) => setNovaEquipeForm({ ...novaEquipeForm, nome: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all text-sm"
                placeholder={t('team.createNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('team.slogan')} ({t('team.optional')})</label>
              <textarea
                value={novaEquipeForm.slogan}
                onChange={(e) => setNovaEquipeForm({ ...novaEquipeForm, slogan: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all text-sm resize-none"
                rows={3}
                placeholder={t('team.createDescriptionPlaceholder')}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowCriarModal(false)} className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all font-medium text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleCriarEquipe} className="flex-1 py-2.5 px-4 bg-cyan-500 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-cyan-600 dark:hover:bg-slate-100 transition-all font-semibold text-sm">
              {t('team.createButton')}
            </button>
          </div>
        </Modal>

        <Modal isOpen={showEntrarModal} onClose={() => setShowEntrarModal(false)} title={t('team.joinTitle')}>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('team.inviteCode')} *</label>
              <input
                type="text"
                value={entrarEquipeForm.codigoConvite}
                onChange={(e) => setEntrarEquipeForm({ ...entrarEquipeForm, codigoConvite: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all text-sm font-mono"
                placeholder={t('team.pasteCode')}
              />
            </div>
            <div className="rounded-lg p-4 bg-white border border-slate-200">
              <p className="text-xs text-slate-700 leading-relaxed">{t('team.codeInstruction')}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowEntrarModal(false)} className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all font-medium text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleEntrarEquipe} className="flex-1 py-2.5 px-4 bg-cyan-500 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-cyan-600 dark:hover:bg-slate-100 transition-all font-semibold text-sm">
              {t('team.joinButton')}
            </button>
          </div>
        </Modal>
      </div>
    )
  }

  if (estado === 'gerenciando' && equipe) {
    const isOwner = member?.role === 'owner'
    const isAdmin = member?.role === 'admin' || isOwner
    const isAdministrador = member?.role === 'administrador'
    const canManageTeam = isOwner || isAdmin || isAdministrador
    const isVendedor = member?.role === 'vendedor'

    return (
      <>
        <div className="text-slate-900 dark:text-slate-200 flex flex-col min-h-full relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
          </div>

          <div className="flex-1 space-y-6 max-h-[calc(100vh-80px)] overflow-y-auto pb-3.5 sm:pb-6 px-3.5 sm:px-6 relative z-10">
            <main className="relative flex-1 w-full px-3.5 sm:px-4 py-3.5 sm:py-6">
              <div className="w-full sm:max-w-7xl sm:mx-auto space-y-6">
                <TeamHeader
                  equipe={equipe}
                  isOwner={isOwner}
                  isAdmin={isAdmin}
                  isAdministrador={isAdministrador}
                  onConvidarMembro={() => setShowOpcoesConvite(true)}
                  onSairEquipe={handleSairEquipe}
                  stats={estatisticas}
                />

                {isVendedor && (
                  <div className="rounded-lg p-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h3 className="font-semibold text-amber-800 dark:text-amber-300">{t('team.restrictedAccess')}</h3>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">{t('team.restrictedAccessDesc')}</p>
                  </div>
                )}

                <TabNavigation
                  abaAtiva={abaAtiva}
                  onChangeAba={setAbaAtiva}
                  canManageTeam={canManageTeam && !isVendedor}
                />

                {abaAtiva === 'visao-geral' && (
                  <div className="space-y-6">
                    <div className="rounded-lg p-5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10">
                      <h2 className="text-sm font-medium text-slate-900 dark:text-white mb-4">{t('team.recentActivity')}</h2>
                      <div className="space-y-2">
                        {atividadesRecentes.length > 0 ? (
                          atividadesRecentes
                            .filter(a => !isVendedor || a.user_id === member?.id || a.user_id === null)
                            .map((atividade: AtividadeRecente) => (
                              <div key={atividade.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-sm">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                    {atividade.descricao || atividade.tipo}
                                  </p>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                  {atividade.created_at ? new Date(atividade.created_at).toLocaleDateString() : '-'}
                                </p>
                              </div>
                            ))
                        ) : (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <div>
                              <p className="font-medium text-slate-700 dark:text-slate-200">{t('team.teamCreated')}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(equipe.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {abaAtiva === 'membros' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipe.membros.map((membro) => (
                      <MemberCard
                        key={membro.id}
                        membro={membro}
                        currentUserId={member?.id}
                      />
                    ))}
                  </div>
                )}

                {abaAtiva === 'produtos' && <ProdutosEquipe tenantId={equipe.id} />}
                {abaAtiva === 'leads' && <LeadsEquipe tenantId={equipe.id} />}
                {abaAtiva === 'distribuicao' && <DistribuicaoLeads teamId={equipe?.id ?? ''} membros={equipe?.membros ?? []} />}
                {abaAtiva === 'conexao-meta' && canManageTeam && !isVendedor && <ConexaoMeta />}
                {abaAtiva === 'distribuicao-meta' && canManageTeam && !isVendedor && <DistribuicaoMetaLeads />}
                {abaAtiva === 'anuncios' && canManageTeam && !isVendedor && <MetaInsights />}

                {abaAtiva === 'gestao-convites' && canManageTeam && !isVendedor && (
                  <div className="space-y-8">
                    {equipe?.join_code && (
                      <CodigoEquipe
                        codigoEquipe={equipe.join_code}
                        nomeEquipe={equipe.nome}
                        canShare={canShareTeamCode}
                      />
                    )}
                    <GestaoConvites
                      tenantId={equipe.id}
                      onConviteEnviado={() => console.log('Convite enviado')}
                    />
                  </div>
                )}

                {abaAtiva === 'configuracoes' && canManageTeam && !isVendedor && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('team.generalSettings')}</h2>
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t('team.teamName')}</label>
                          <div className="relative">
                            <Users className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={configForm.nome || equipe?.nome || ''}
                              onChange={(e) => setConfigForm(prev => ({ ...prev, nome: e.target.value }))}
                              placeholder={t('team.teamNamePlaceholder')}
                              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-cyan-500/20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm transition-colors"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t('team.slogan')}</label>
                          <div className="relative">
                            <Target className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={configForm.slogan || equipe?.slogan || ''}
                              onChange={(e) => setConfigForm(prev => ({ ...prev, slogan: e.target.value }))}
                              placeholder={t('team.sloganPlaceholder')}
                              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-cyan-500/20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm transition-colors"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={handleSaveConfig}
                            disabled={savingConfig}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-slate-700 dark:text-white bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all ${savingConfig ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/10'}`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            {savingConfig ? t('common.saving') : t('common.save')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isOwner && (
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                          <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                          {t('team.memberManagement')}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t('team.memberManagementDesc')}</p>

                        <div className="space-y-4">
                          {equipe.membros.map((membro) => {
                            const isCurrentUser = user?.id === (membro.user_id || membro.id) || (user?.email && user.email === membro.email)
                            return (
                              <div key={membro.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {membro.nome?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                                      {membro.nome}
                                      {isCurrentUser && <span className="text-cyan-600 dark:text-cyan-400 text-xs ml-2">({t('team.you')})</span>}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{membro.email}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {isCurrentUser ? (
                                    <div className="px-3 py-1.5 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 font-semibold">
                                      {membro.role === 'owner' ? t('team.owner') : membro.role === 'administrador' ? t('team.administrator') : membro.role === 'admin' ? t('team.admin') : t('team.salesperson')}
                                    </div>
                                  ) : (
                                    <>
                                      <select
                                        value={membro.role}
                                        onChange={(e) => handleUpdateMemberRole(membro.id, e.target.value as 'administrador' | 'vendedor')}
                                        disabled={updatingMember === membro.id}
                                        className="px-3 py-1.5 border border-slate-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50 cursor-pointer relative z-10"
                                      >
                                        <option value="vendedor">{t('team.salesperson')}</option>
                                        <option value="administrador">{t('team.administrator')}</option>
                                      </select>
                                      {updatingMember === membro.id && (
                                        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {isOwner && (
                      <div>
                        <h2 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-red-700 dark:text-red-300" />
                          {t('team.dangerZone')}
                        </h2>
                        <p className="text-sm text-slate-700 dark:text-slate-400 mb-6">{t('team.dangerZoneDesc')}</p>
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-red-100 dark:border-red-500/10">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-red-900 dark:text-red-300 mb-1">{t('team.deleteTeam')}</h3>
                                <p className="text-sm text-red-800 dark:text-red-400 leading-relaxed">
                                  {t('team.deleteTeamDesc')}
                                </p>
                              </div>
                              <button
                                onClick={() => setShowDeleteTeamModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-all shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                                {t('team.deleteTeam')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>

        <Modal isOpen={showOpcoesConvite} onClose={() => setShowOpcoesConvite(false)} title={t('team.inviteOptionsTitle')}>
          <div className="space-y-4">
            <button
              onClick={async () => {
                await handleCopiarLinkConvite()
                setTimeout(() => setShowOpcoesConvite(false), 1500)
              }}
              disabled={!equipe?.id}
              className="w-full p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all duration-300 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t('team.shareLinkTitle')}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{t('team.shareLinkDesc')}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setShowOpcoesConvite(false)
                setShowConviteModal(true)
              }}
              className="w-full p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all duration-300 text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t('team.sendEmailTitle')}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{t('team.sendEmailDesc')}</p>
                </div>
              </div>
            </button>
          </div>
        </Modal>

        <Modal isOpen={showConviteModal} onClose={() => setShowConviteModal(false)} title={t('team.inviteMemberTitle')}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">{t('team.email')} *</label>
              <input
                type="email"
                value={conviteForm.email}
                onChange={(e) => setConviteForm({ ...conviteForm, email: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                placeholder={t('team.emailPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">{t('team.name')}</label>
              <input
                type="text"
                value={conviteForm.nome}
                onChange={(e) => setConviteForm({ ...conviteForm, nome: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                placeholder={t('team.memberNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">{t('team.role')}</label>
              <select
                value={conviteForm.role}
                onChange={(e) => setConviteForm({ ...conviteForm, role: e.target.value as 'admin' | 'administrador' | 'vendedor' })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-800/50 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              >
                <option value="vendedor" className="bg-slate-700 text-white">{t('team.salesperson')}</option>
                <option value="administrador" className="bg-slate-700 text-white">{t('team.administrator')}</option>
                <option value="admin" className="bg-slate-700 text-white">{t('team.admin')}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button onClick={() => setShowConviteModal(false)} className="flex-1 py-3 px-3.5 sm:px-6 border border-slate-600/50 text-slate-300 rounded-2xl hover:bg-slate-700/50 hover:text-white transition-all duration-300 font-medium">
              {t('common.cancel')}
            </button>
            <button onClick={handleEnviarConvite} className="flex-1 py-3 px-3.5 sm:px-6 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-2xl hover:from-cyan-600 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-cyan-500/20 hover:scale-105 active:scale-95">
              {t('team.sendInviteButton')}
            </button>
          </div>
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirmText('') }} title={t('team.confirmLeaveTitle')}>
          <div className="space-y-6">
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
                <h3 className="text-red-400 font-semibold text-lg">{t('team.irreversibleAction')}</h3>
              </div>
              <div className="space-y-3 text-red-800 text-sm">
                <p>{t('team.dataLossWarning')}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                {t('team.typeToConfirm', { name: equipe?.nome })}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/20 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/30 transition-all"
                placeholder={equipe?.nome}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }} className="flex-1 py-3 px-3.5 sm:px-6 border border-white/20 text-slate-300 rounded-2xl hover:bg-white/10 transition-all duration-300 font-medium">
              {t('common.cancel')}
            </button>
            <button onClick={handleLeaveTeam} disabled={deletingTeam || deleteConfirmText !== equipe?.nome} className="flex-1 py-3 px-3.5 sm:px-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-red-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100">
              {deletingTeam ? t('team.leaving') : t('team.confirmLeaveButton')}
            </button>
          </div>
        </Modal>

        <Modal isOpen={showDeleteTeamModal} onClose={() => { setShowDeleteTeamModal(false); setDeleteTeamConfirmText('') }} title={t('team.deleteTeamTitle')}>
          <div className="space-y-6">
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-lg">
              <p className="text-red-800 dark:text-red-400 font-semibold mb-2">{t('team.irreversibleAction')}</p>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {t('team.deleteTeamWarning', { name: equipe?.nome })}
              </p>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                {t('team.typeToConfirm', { name: equipe?.nome })}
              </label>
              <input
                type="text"
                value={deleteTeamConfirmText}
                onChange={(e) => setDeleteTeamConfirmText(e.target.value)}
                placeholder={equipe?.nome}
                className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 transition-all"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteTeamModal(false); setDeleteTeamConfirmText('') }} disabled={deletingTeam} className="flex-1 py-3 px-3.5 sm:px-6 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 font-medium disabled:opacity-50">
                {t('common.cancel')}
              </button>
              <button onClick={handleDeleteTeam} disabled={deletingTeam || deleteTeamConfirmText !== equipe?.nome} className="flex-1 py-3 px-3.5 sm:px-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-red-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed">
                {deletingTeam ? t('team.deleting') : t('team.deleteTeamButton')}
              </button>
            </div>
          </div>
        </Modal>
      </>
    )
  }

  return null
}
