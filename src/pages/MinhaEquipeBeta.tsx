import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users, Settings, UserPlus, Target, BarChart3, Package,
  ShoppingBag, ListChecks, Shuffle, Search, Mail,
  TrendingUp, Clock, CheckCircle2, Trophy, Zap, Activity, Flame,
  Plus, LogIn
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { getTeamOverview, createTeam, joinTeamWithCode } from '../services/equipeService'
import { Modal } from '../components/ui/Modal'

// Componentes de conteúdo (reutilizados da MinhaEquipe)
import DistribuicaoLeads from '../components/team/DistribuicaoLeads'
import ProdutosEquipe from '../components/team/ProdutosEquipe'
import LeadsEquipe from '../components/team/LeadsEquipe'
import TarefasEquipe from '../components/team/TarefasEquipe'
import ConquistasEquipe from '../components/team/ConquistasEquipe'
import GerenciarConquistas from '../components/team/GerenciarConquistas'
import { useTeamStats } from '../hooks/useTeamStats'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'

// ============================================================================
// TIPOS
// ============================================================================

type AbaTipo = 'visao-geral' | 'conquistas' | 'produtos' | 'leads' | 'tarefas' | 'distribuicao' | 'configuracoes'

type Membro = {
  id: string
  user_id: string
  nome: string
  email: string
  role: 'owner' | 'admin' | 'administrador' | 'vendedor'
  status: 'pendente' | 'ativo' | 'inativo'
}

type EquipeInfo = {
  id: string
  nome: string
  slogan: string | null
  membros: Membro[]
}

type EstatisticasEquipe = {
  membros_ativos: number
  vendedores: number
  leads_hoje: number
  produtos: number
  meta_percentual: number
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

// Gera um caminho SVG para um raio fractal realista
function generateLightningPath(startX: number, startY: number, endX: number, endY: number, displacement: number): string {
  interface Point {
    x: number
    y: number
  }

  let segments: Point[] = [
    { x: startX, y: startY },
    { x: endX, y: endY }
  ]

  const iterations = 5 // Nível de detalhe do raio

  for (let i = 0; i < iterations; i++) {
    const newSegments: Point[] = []

    for (let j = 0; j < segments.length - 1; j++) {
      const s = segments[j]
      const e = segments[j + 1]

      // Acha o meio da linha
      let midX = (s.x + e.x) / 2
      let midY = (s.y + e.y) / 2

      // Calcula a direção perpendicular (normal)
      const diffX = e.x - s.x
      const diffY = e.y - s.y
      const len = Math.sqrt(diffX * diffX + diffY * diffY)

      const normX = -diffY / len
      const normY = diffX / len

      // Aplica um deslocamento aleatório (o "tremor")
      const offset = (Math.random() - 0.5) * displacement

      midX += normX * offset
      midY += normY * offset

      newSegments.push(s, { x: midX, y: midY })
    }

    newSegments.push(segments[segments.length - 1])
    segments = newSegments
    displacement /= 2 // Reduz o tremor a cada iteração
  }

  // Converte os pontos para um caminho SVG
  let path = `M ${segments[0].x} ${segments[0].y}`
  for (let i = 1; i < segments.length; i++) {
    path += ` L ${segments[i].x} ${segments[i].y}`
  }

  return path
}

// ============================================================================
// COMPONENTE DE RAIO ANIMADO
// ============================================================================

function AnimatedLightning() {
  const [paths, setPaths] = useState({
    glow: generateLightningPath(50, 0, 50, 100, 20),
    core: generateLightningPath(50, 0, 50, 100, 20),
    sparkle: generateLightningPath(50, 0, 50, 100, 20)
  })

  // Função geradora flexível para criar faíscas
  const createSparks = (count: number, config: { origin: 'top' | 'bottom', x: number, y: number, type: 'normal' | 'micro' }) => {
    return Array.from({ length: count }, (_, i) => {
      const isTop = config.origin === 'top'

      // Ângulo: "Cone" de abertura
      const angleSpread = isTop ? 0.6 : 0.4
      const angle = (Math.random() - 0.5) * angleSpread * Math.PI

      // Distância/Velocidade (aumentada para acelerar o raio)
      const distance = config.type === 'normal' ? (15 + Math.random() * 48) : (24 + Math.random() * 60)

      // Direção Vertical (Y)
      // Se vem de cima (top), Y é positivo (desce)
      // Se vem de baixo (bottom), Y é negativo (sobe)
      const verticalDirection = isTop ? 1 : 1

      return {
        id: `${config.origin}-${config.type}-${i}`,
        x: config.x,
        y: config.y,

        // DX: Movimento horizontal (espalha para os lados)
        dx: Math.sin(angle) * distance,

        // DY: Movimento vertical corrigido
        dy: Math.abs(Math.cos(angle)) * distance * verticalDirection,

        size: config.type === 'normal' ? (0.5 + Math.random() * 1) : (0.2 + Math.random() * 0.4),
        delay: Math.random() * 1.5,
        duration: config.type === 'normal' ? (0.4 + Math.random() * 0.12) : (0.3 + Math.random() * 0.2),
        type: config.type
      }
    })
  }

  // Gera partículas para as extremidades (faíscas)
  const [particles] = useState(() => {
    // Partículas normais do topo (caem)
    const topParticles = createSparks(12, { origin: 'top', x: 60, y: 0, type: 'normal' })

    // Partículas normais do fundo (sobem)
    const bottomParticles = createSparks(24, { origin: 'bottom', x: 50, y: 100, type: 'normal' })

    // Micro-faíscas do topo (caem)
    const topMicroSparks = createSparks(20, { origin: 'top', x: 60, y: 0, type: 'micro' })

    // Micro-faíscas do fundo (sobem)
    const bottomMicroSparks = createSparks(30, { origin: 'bottom', x: 50, y: 100, type: 'micro' })

    return [...topParticles, ...bottomParticles, ...topMicroSparks, ...bottomMicroSparks]
  })

  useEffect(() => {
    // Regenera o caminho do raio a cada 60ms para criar efeito de crepitação rápida
    const interval = setInterval(() => {
      setPaths({
        glow: generateLightningPath(50, 0, 50, 100, 20),
        core: generateLightningPath(50, 0, 50, 100, 20),
        sparkle: generateLightningPath(50, 0, 50, 100, 20)
      })
    }, 60)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      <div
        className="absolute top-0 bottom-0 w-32 -skew-x-12"
        style={{ animation: 'lightning-sweep 10s linear infinite' }}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(252, 211, 77, 0)" />
              <stop offset="50%" stopColor="rgba(252, 211, 77, 1)" />
              <stop offset="100%" stopColor="rgba(252, 211, 77, 0)" />
            </linearGradient>

            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Filtro para partículas */}
            <filter id="particle-glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g>
            {/* Glow externo */}
            <path
              d={paths.glow}
              stroke="rgba(251, 191, 36, 0.4)"
              strokeWidth="8"
              fill="none"
              filter="url(#glow)"
              opacity="0.7"
            />

            {/* Core do raio */}
            <path
              d={paths.core}
              stroke="url(#lightning-gradient)"
              strokeWidth="2"
              fill="none"
              filter="url(#glow)"
            />

            {/* Linha branca central (sparkle) */}
            <path
              d={paths.sparkle}
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="0.5"
              fill="none"
            />

            {/* Brilho nas extremidades do raio */}
            {/* Brilho superior */}
            <circle
              cx="50"
              cy="0"
              r="4"
              fill="rgba(252, 211, 77, 0.66)"
              filter="url(#glow)"
              style={{ animation: 'glow-pulse 1.5s ease-in-out infinite' }}
            />
            <circle
              cx="50"
              cy="0"
              r="2"
              fill="rgba(255, 255, 255, 0.9)"
              filter="url(#glow)"
              style={{ animation: 'glow-pulse 1.5s ease-in-out infinite' }}
            />

            {/* Brilho inferior */}
            <circle
              cx="50"
              cy="100"
              r="4"
              fill="rgba(252, 211, 77, 0.6)"
              filter="url(#glow)"
              style={{ animation: 'glow-pulse 1.5s ease-in-out 0.75s infinite' }}
            />
            <circle
              cx="50"
              cy="100"
              r="2"
              fill="rgba(255, 255, 255, 0.9)"
              filter="url(#glow)"
              style={{ animation: 'glow-pulse 1.5s ease-in-out 0.75s infinite' }}
            />

            {/* Faíscas nas extremidades */}
            {particles.map((particle) => (
              <circle
                key={particle.id}
                cx={particle.x}
                cy={particle.y}
                r={particle.size}
                fill={particle.type === 'micro' ? 'rgba(255, 255, 255, 0.98)' : 'rgba(238, 201, 100, 0.95)'}
                filter="url(#particle-glow)"
                opacity={particle.type === 'micro' ? 0.9 : 1}
                style={{
                  animation: `spark-disperse ${particle.duration}s ease-out ${particle.delay}s infinite`,
                  '--dx': `${particle.dx}`,
                  '--dy': `${particle.dy}`
                } as React.CSSProperties}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function MinhaEquipeBeta() {
  const { member, tenant, user, loading: authLoading } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [equipe, setEquipe] = useState<EquipeInfo | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('visao-geral')
  const [estatisticas, setEstatisticas] = useState<EstatisticasEquipe>({
    membros_ativos: 0,
    vendedores: 0,
    leads_hoje: 0,
    produtos: 0,
    meta_percentual: 0
  })

  // Estados para edição de equipe
  const [editandoEquipe, setEditandoEquipe] = useState(false)
  const [nomeEquipe, setNomeEquipe] = useState('')
  const [sloganEquipe, setSloganEquipe] = useState('')
  const [metaLeads, setMetaLeads] = useState(100)
  const [metaVendas, setMetaVendas] = useState(20)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Hook para estatísticas reais
  const { stats: teamStats, tarefas: minhasTarefas, loading: statsLoading } = useTeamStats()

  // Hook para verificar limites de assinatura
  const { canJoinTeam } = useSubscriptionLimits()
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    // Não redirecionar se não tiver equipe - mostrar a tela de criar/entrar
  }, [authLoading, user, navigate])

  // Carregar dados da equipe
  const loadEquipeData = useCallback(async () => {
    if (authLoading) return

    // Se não tem tenant, mostrar tela de criar/entrar equipe
    if (!member?.tenant_id) {
      setLoading(false)
      return
    }

    try {
      const overview = await getTeamOverview()

      if (!overview || !overview.members) throw new Error('Falha ao carregar dados')

      // Buscar dados completos do tenant incluindo metas e logo
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name, slogan, logo_url, meta_leads, meta_vendas')
        .eq('id', member.tenant_id)
        .single()

      const equipeData: EquipeInfo = {
        id: member.tenant_id,
        nome: tenantData?.name || overview.tenant?.name || 'Minha Equipe',
        slogan: tenantData?.slogan || overview.tenant?.slogan || null,
        membros: (overview.members || []).map((m: any) => ({
          id: m.id || '',
          user_id: m.user_id || m.id || '',
          nome: m.nome || '',
          email: m.email || '',
          role: m.role || 'vendedor',
          status: m.status === 'active' || m.status === 'ativo' ? 'ativo' : 'pendente'
        }))
      }

      // Definir logo e metas
      setLogoUrl(tenantData?.logo_url || null)
      setMetaLeads(tenantData?.meta_leads || 100)
      setMetaVendas(tenantData?.meta_vendas || 20)

      // Buscar contagem de produtos
      let produtosCount = 0
      try {
        const { count } = await supabase
          .from('produtos')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', member.tenant_id)
        produtosCount = count || 0
      } catch { }

      // Calcular progresso da meta
      const leadsEsteMes = teamStats?.leadsEsteMes || 0
      const metaLeadsAtual = tenantData?.meta_leads || 100
      const metaPercentual = Math.min(Math.round((leadsEsteMes / metaLeadsAtual) * 100), 100)

      setEquipe(equipeData)
      setEstatisticas({
        membros_ativos: overview.stats?.membros_ativos || equipeData.membros.filter(m => m.status === 'ativo').length,
        vendedores: overview.stats?.vendedores || equipeData.membros.filter(m => m.role === 'vendedor').length,
        leads_hoje: overview.stats?.leads_hoje || 0,
        produtos: produtosCount,
        meta_percentual: metaPercentual
      })
    } catch (error) {
      console.error('Erro ao carregar dados da equipe:', error)
      toast.error(t('team.loadError'))
    } finally {
      setLoading(false)
    }
  }, [member?.tenant_id, authLoading, t])

  useEffect(() => {
    loadEquipeData()
  }, [loadEquipeData])

  // Estados dos modais (DEVEM estar antes de qualquer return condicional)
  const [showCriarModal, setShowCriarModal] = useState(false)
  const [showEntrarModal, setShowEntrarModal] = useState(false)
  const [novaEquipeForm, setNovaEquipeForm] = useState({ nome: '', slogan: '' })
  const [entrarEquipeForm, setEntrarEquipeForm] = useState({ codigoConvite: '' })

  // Handlers
  const handleCriarEquipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaEquipeForm.nome) return

    const toastId = toast.loading('Criando equipe...')
    try {
      await createTeam(novaEquipeForm.nome, novaEquipeForm.slogan)
      toast.success('Equipe criada com sucesso!', { id: toastId })
      setShowCriarModal(false)
      window.location.reload()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Erro ao criar equipe', { id: toastId })
    }
  }

  const handleEntrarEquipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entrarEquipeForm.codigoConvite) return

    const toastId = toast.loading('Entrando na equipe...')
    try {
      await joinTeamWithCode(entrarEquipeForm.codigoConvite)
      toast.success('Você entrou na equipe!', { id: toastId })
      setShowEntrarModal(false)
      window.location.reload()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Erro ao entrar na equipe', { id: toastId })
    }
  }

  // ===== FUNÇÕES DE GERENCIAMENTO DA EQUIPE =====

  // Salvar configurações da equipe
  const handleSalvarConfiguracoes = async () => {
    const tenantId = tenant?.id || member?.tenant_id
    if (!tenantId) return

    const nome = nomeEquipe.trim()
    const slogan = sloganEquipe.trim()

    if (!nome) {
      toast.error('Nome da equipe é obrigatório')
      return
    }

    const toastId = toast.loading('Salvando alterações...')
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: nome,
          slogan: slogan || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)

      if (error) throw error

      // Atualizar estado local da equipe
      setEquipe((prev) => {
        if (!prev) return prev
        return { ...prev, nome, slogan: slogan || null }
      })

      // Atualizar authStore para refletir no header
      const authStore = useAuthStore.getState()
      if (authStore.tenant?.id === tenantId) {
        authStore.setTenant({ ...authStore.tenant, name: nome })
      }

      // Disparar evento customizado para atualizar outras partes da aplicação
      window.dispatchEvent(new CustomEvent('teamNameUpdated', {
        detail: { nome, slogan }
      }))

      // Atualizar os campos do formulário com os valores salvos
      setNomeEquipe(nome)
      setSloganEquipe(slogan)

      toast.success('Configurações salvas com sucesso!', { id: toastId })
      setEditandoEquipe(false)

      // Recarregar dados para garantir sincronização
      await loadEquipeData()
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast.error('Erro ao salvar configurações', { id: toastId })
    }
  }

  // Alterar cargo de membro
  const handleAlterarCargo = async (membroId: string, novoRole: string) => {
    const toastId = toast.loading('Alterando cargo...')
    try {
      const { error } = await supabase
        .from('memberships')
        .update({ role: novoRole })
        .eq('id', membroId)

      if (error) throw error

      toast.success('Cargo alterado com sucesso!', { id: toastId })
      await loadEquipeData() // Recarregar dados
    } catch (error) {
      console.error('Erro ao alterar cargo:', error)
      toast.error('Erro ao alterar cargo', { id: toastId })
    }
  }

  // Remover membro
  const handleRemoverMembro = async (membroId: string, membroNome: string) => {
    if (!confirm(`Deseja remover ${membroNome} da equipe?`)) return

    const toastId = toast.loading('Removendo membro...')
    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('id', membroId)

      if (error) throw error

      toast.success('Membro removido com sucesso!', { id: toastId })
      await loadEquipeData() // Recarregar dados
    } catch (error) {
      console.error('Erro ao remover membro:', error)
      toast.error('Erro ao remover membro', { id: toastId })
    }
  }

  // Salvar metas
  const handleSalvarMetas = async () => {
    if (!member?.tenant_id) return

    const toastId = toast.loading('Salvando metas...')
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          meta_leads: metaLeads,
          meta_vendas: metaVendas
        })
        .eq('id', member.tenant_id)

      if (error) throw error

      toast.success('Metas salvas com sucesso!', { id: toastId })

      // Recarregar dados para atualizar a barra de progresso
      await loadEquipeData()
    } catch (error) {
      console.error('Erro ao salvar metas:', error)
      toast.error('Erro ao salvar metas', { id: toastId })
    }
  }

  // Upload de logo da equipe
  const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !member?.tenant_id) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem')
      return
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB')
      return
    }

    setUploadingLogo(true)
    const toastId = toast.loading('Fazendo upload do ícone...')

    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${member.tenant_id}-${Date.now()}.${fileExt}`
      const filePath = `team-logos/${fileName}`

      // Remover logo antigo se existir
      if (logoUrl) {
        const oldPath = logoUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('publicteam').remove([oldPath])
      }

      // Upload do novo arquivo
      const { error: uploadError } = await supabase.storage
        .from('publicteam')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('publicteam')
        .getPublicUrl(filePath)

      // Atualizar banco de dados
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: publicUrl })
        .eq('id', member.tenant_id)

      if (updateError) throw updateError

      setLogoUrl(publicUrl)
      toast.success('Ícone atualizado com sucesso!', { id: toastId })
      await loadEquipeData()
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast.error('Erro ao fazer upload do ícone', { id: toastId })
    } finally {
      setUploadingLogo(false)
    }
  }

  // Excluir equipe (só para owner)
  const handleExcluirEquipe = async () => {
    if (!member?.tenant_id || member.role !== 'owner') return

    if (!confirm('Tem certeza que deseja excluir a equipe? Esta ação não pode ser desfeita!')) return
    if (!confirm('ÚLTIMA CONFIRMAÇÃO: Todos os dados serão perdidos. Continuar?')) return

    const toastId = toast.loading('Excluindo equipe...')
    try {
      // Limpar default_tenant_id do perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ default_tenant_id: null })
        .eq('id', user?.id)

      if (profileError) throw profileError

      // Excluir tenant (cascade vai excluir memberships e outros dados relacionados)
      const { error: tenantError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', member.tenant_id)

      if (tenantError) throw tenantError

      toast.success('Equipe excluída com sucesso', { id: toastId })

      // Recarregar sessão e redirecionar
      window.location.href = '/app/dashboard'
    } catch (error) {
      console.error('Erro ao excluir equipe:', error)
      toast.error('Erro ao excluir equipe', { id: toastId })
    }
  }

  // Inicializar estados quando equipe carregar
  useEffect(() => {
    if (equipe) {
      setNomeEquipe(equipe.nome)
      setSloganEquipe(equipe.slogan || '')
    }
  }, [equipe])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-300 dark:border-slate-600 rounded-full animate-spin border-t-cyan-500"></div>
          </div>
          <p className="text-slate-500 dark:text-slate-400">{t('team.loading')}</p>
        </div>
      </div>
    )
  }

  // View: Sem Equipe
  if (!equipe) {
    return (
      <div className="flex flex-col h-full bg-background text-slate-900 dark:text-slate-200 overflow-hidden relative">
        {/* Background Decorativo */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl dark:hidden" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)] dark:hidden" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:120px_120px] dark:opacity-20" />
        </div>

        <div className="relative z-10 p-8 max-w-6xl mx-auto w-full flex flex-col h-full">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold font-outfit text-slate-900 dark:text-white mb-2">Minha equipe</h1>
            <p className="text-slate-500 dark:text-slate-400">Gerencie membros, convites e metas em um só lugar</p>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-12">
            {/* Cards de Ação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Criar Equipe - SEMPRE DISPONÍVEL */}
              <div
                className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-8 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-sm cursor-pointer"
                onClick={() => setShowCriarModal(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Criar equipe</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    Crie sua equipe para dividir tarefas e acompanhar resultados.
                  </p>
                  <button className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-medium hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Criar equipe
                  </button>
                </div>
              </div>

              {/* Entrar na Equipe */}
              <div className="relative">
                {/* Badge "Apenas para assinantes" - FORA DO CARD (SEM PISCAR) */}
                {!canJoinTeam && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-50">
                    <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/50">
                      ⚡ Apenas para assinantes
                    </div>
                  </div>
                )}

                {/* Sombra brilhante que acompanha o raio */}
                {!canJoinTeam && (
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      animation: 'lightning-sweep 10s linear infinite',
                      background: 'radial-gradient(ellipse 200px 100% at 50% 50%, rgba(251, 191, 36, 0.15), transparent)',
                      filter: 'blur(20px)',
                      zIndex: -1
                    }}
                  />
                )}

                <div
                  className={`group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 backdrop-blur-sm ${canJoinTeam
                    ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 cursor-pointer'
                    : 'bg-white/5 border-2 border-amber-500/50 cursor-not-allowed'
                    }`}
                  onClick={() => canJoinTeam && setShowEntrarModal(true)}
                >
                  {/* Raio Fractal Realista com Animação de Crepitação */}
                  {!canJoinTeam && <AnimatedLightning />}

                  <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${!canJoinTeam && 'hidden'}`} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${canJoinTeam
                        ? 'bg-cyan-500/10 border border-cyan-500/20'
                        : 'bg-amber-500/10 border border-amber-500/20'
                        }`}>
                        <LogIn className={`w-6 h-6 ${canJoinTeam ? 'text-cyan-400' : 'text-amber-400'}`} />
                      </div>
                      <h3 className="text-xl font-semibold text-white">Entrar na equipe</h3>
                    </div>

                    <p className={`text-sm mb-8 leading-relaxed ${canJoinTeam ? 'text-slate-400' : 'text-slate-500'}`}>
                      {canJoinTeam
                        ? 'Entre em uma equipe existente usando um código de convite.'
                        : 'Assine o plano Premium para participar de equipes.'}
                    </p>

                    <button
                      disabled={!canJoinTeam}
                      className={`w-full py-3 rounded-xl border font-medium transition-all flex items-center justify-center gap-2 ${canJoinTeam
                        ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        : 'bg-amber-500/5 border-amber-500/20 text-amber-400/50 cursor-not-allowed'
                        }`}
                    >
                      <LogIn className="w-4 h-4" />
                      {canJoinTeam ? 'Entrar na equipe' : 'Requer assinatura'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Consulte métricas essenciais do time.</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-cyan-500" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Monitore o status dos membros.</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Acompanhe o desempenho da equipe.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modais */}
        <Modal
          title="Criar nova equipe"
          isOpen={showCriarModal}
          onClose={() => setShowCriarModal(false)}
        >
          <form onSubmit={handleCriarEquipe} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nome da equipe</label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: Vendas Imobiliária X"
                value={novaEquipeForm.nome}
                onChange={e => setNovaEquipeForm({ ...novaEquipeForm, nome: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none text-white placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Slogan (opcional)</label>
              <input
                type="text"
                placeholder="Ex: O céu é o limite"
                value={novaEquipeForm.slogan}
                onChange={e => setNovaEquipeForm({ ...novaEquipeForm, slogan: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none text-white placeholder:text-slate-600"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCriarModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!novaEquipeForm.nome}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Equipe
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          title="Entrar em uma equipe"
          isOpen={showEntrarModal}
          onClose={() => setShowEntrarModal(false)}
        >
          <form onSubmit={handleEntrarEquipe} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Código de convite</label>
              <input
                type="text"
                autoFocus
                placeholder="Cole o código aqui"
                value={entrarEquipeForm.codigoConvite}
                onChange={e => setEntrarEquipeForm({ ...entrarEquipeForm, codigoConvite: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none text-white placeholder:text-slate-600 font-mono"
              />
              <p className="text-xs text-slate-500 mt-2">
                Solicite o código de convite ao administrador da equipe.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowEntrarModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!entrarEquipeForm.codigoConvite}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Entrar na Equipe
              </button>
            </div>
          </form>
        </Modal>
      </div>
    )
  }

  const isOwner = member?.role === 'owner'
  const isAdmin = member?.role === 'admin' || isOwner
  const isAdministrador = member?.role === 'administrador'
  const canManageTeam = isOwner || isAdmin || isAdministrador

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full bg-background text-slate-900 dark:text-slate-200 overflow-hidden relative">

      {/* Background Decorativo (HUD glow grid background + overlay) */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl dark:hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)] dark:hidden" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:120px_120px] dark:opacity-20" />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">

        {/* ============================================ */}
        {/* HEADER PRINCIPAL - NOVO DESIGN */}
        {/* ============================================ */}
        <header className="bg-transparent">
          <div className="p-8">
            <div className="max-w-[1400px] mx-auto">
              {/* Linha Superior: Título + Ações */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">



                {/* Esquerda: Ícone + Título + Slogan + Stats */}
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden ${logoUrl ? '' : 'bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700'}`}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo da equipe" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold font-outfit text-slate-900 dark:text-white">
                      {equipe.nome}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {equipe.slogan || 'Slogan da equipe'}
                    </p>

                    {/* Stats logo abaixo do slogan */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{estatisticas.membros_ativos}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-cyan-500" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{estatisticas.leads_hoje}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-500" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{estatisticas.produtos}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Centro: Barra de Meta */}
                <div className="flex-1 max-w-md pb-10">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`${estatisticas.meta_percentual}% da meta`}
                      readOnly
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm cursor-default"
                    />
                  </div>
                </div>


                {/* Direita: Ações Rápidas */}
                <div className="flex items-center gap-4 pb-10">
                  {/* Botão: Gerenciar Equipe - só para owner/admin */}
                  {canManageTeam && (
                    <button
                      onClick={() => setAbaAtiva('configuracoes')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition ${abaAtiva === 'configuracoes'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-500'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      title="Gerenciar equipe"
                    >
                      <Settings className="w-5 h-5" />
                      <span className="font-medium">Gerenciar Equipe</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* ============================================ */}
          {/* NAVEGAÇÃO POR ABAS COM LINHA DIAGONAL */}
          {/* ============================================ */}
          <div className="relative -mt-4">
            {/* Linha divisória decorativa com diagonal */}
            <svg
              className="absolute inset-x-0 bottom-0 w-full h-24 pointer-events-none"
              viewBox="0 0 1200 100"
              preserveAspectRatio="none"
              style={{ zIndex: 0 }}
            >
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#fff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Linha: começa embaixo, sobe diagonal, continua no topo */}
              <path
                d="M 0 85 L 200 85 L 350 20 L 1200 20"
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="1"
                className="dark:opacity-80"
              />
            </svg>


            {/* Abas de navegação posicionadas sobre a linha - começando na diagonal */}
            <nav className="relative flex items-end gap-4 overflow-x-auto scrollbar-hide" style={{ zIndex: 10, paddingBottom: '8px', paddingLeft: '450px' }}>
              {[
                { id: 'visao-geral', label: 'Visão geral', icon: BarChart3 },
                { id: 'conquistas', label: 'Conquistas', icon: Trophy },
                { id: 'produtos', label: 'Produtos', icon: ShoppingBag },
                { id: 'leads', label: 'Leads', icon: Target },
                { id: 'tarefas', label: 'Tarefas', icon: ListChecks },
                // { id: 'distribuicao', label: 'Distribuição de Leads', icon: Shuffle },
              ].map((tab, index) => {
                const Icon = tab.icon
                const isActive = abaAtiva === tab.id

                // Posicionamento vertical seguindo a diagonal
                let marginBottom = '0px'
                if (index === 0) marginBottom = '0px' // Visão geral (início da diagonal)
                else if (index === 1) marginBottom = '0px' // Produtos (meio da diagonal)
                else if (index === 2) marginBottom = '0px' // Leads (quase no topo)
                else marginBottom = '0px' // Tarefas e Distribuição (no topo)

                return (
                  <button
                    key={tab.id}
                    onClick={() => setAbaAtiva(tab.id as AbaTipo)}
                    style={{ marginBottom }}
                    className={`
                      flex items-center gap-4 px-4 py-2.5 text-sm font-medium transition-all

                      ${isActive
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl border-cyan-500'
                        : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </header>

        {/* ============================================ */}
        {/* ÁREA DE CONTEÚDO */}
        {/* ============================================ */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            {abaAtiva === 'visao-geral' && (
              <div className="space-y-6">

                {/* ===== SEÇÃO 1: MEU DESEMPENHO (3 cards) ===== */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card: Taxa de Conversão */}
                  <div className="rounded-2xl p-5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-medium font-outfit text-slate-600 dark:text-slate-300">Taxa de Conversão</span>
                      <Activity className="w-5 h-5 text-cyan-500" />
                    </div>
                    <p className="text-4xl font-bold text-slate-900 dark:text-white">
                      {statsLoading ? '...' : `${teamStats?.taxaConversao || 0}%`}
                    </p>
                    {teamStats && (
                      <p className={`text-xs mt-2 flex items-center gap-1 ${(teamStats.taxaConversao - teamStats.taxaConversaoAnterior) >= 0
                        ? 'text-emerald-500'
                        : 'text-red-500'
                        }`}>
                        <TrendingUp className="w-3 h-3" />
                        {(teamStats.taxaConversao - teamStats.taxaConversaoAnterior) >= 0 ? '+' : ''}
                        {teamStats.taxaConversao - teamStats.taxaConversaoAnterior}% vs mês anterior
                      </p>
                    )}
                  </div>

                  {/* Card: Contatos Feitos */}
                  <div className="rounded-2xl p-5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-medium font-outfit text-slate-600 dark:text-slate-300">Contatos Feitos</span>
                      <Users className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-4xl font-bold text-slate-900 dark:text-white">
                      {statsLoading ? '...' : teamStats?.contatosFeitos || 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {teamStats?.contatosEstaSemana || 0} novos esta semana
                    </p>
                  </div>

                  {/* Card: Desempenho */}
                  <div className="rounded-2xl p-5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-medium font-outfit text-slate-600 dark:text-slate-300">Seu Desempenho</span>
                      <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const taxa = teamStats?.taxaConversao || 0
                        if (taxa >= 50) return <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-2xl font-bold">Ótimo</span>
                        if (taxa >= 25) return <span className="px-4 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-2xl font-bold">Bom</span>
                        return <span className="px-4 py-1.5 bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded-full text-2xl font-bold">Regular</span>
                      })()}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {teamStats?.tarefasPendentes || 0} tarefas pendentes
                    </p>
                  </div>
                </div>

                {/* ===== SEÇÃO 2: GRID 3 COLUNAS (2/4 + 1/4 + 1/4) ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                  {/* Minhas Tarefas - 2/4 */}
                  <div className="lg:col-span-2 rounded-2xl p-5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold font-outfit text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Minhas Tarefas
                      </h3>
                      <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                        {teamStats?.tarefasPendentes || 0} pendentes
                      </span>
                    </div>

                    <div className="space-y-3">
                      {minhasTarefas.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma tarefa pendente!</p>
                        </div>
                      ) : (
                        minhasTarefas.slice(0, 3).map(tarefa => {
                          // Determinar cor baseado na urgência
                          const hoje = new Date()
                          const vencimento = tarefa.vencimento ? new Date(tarefa.vencimento) : null
                          let bgClass = 'bg-slate-500/5 border-slate-500/20 hover:bg-slate-500/10'
                          let textClass = 'text-slate-500 dark:text-slate-400'
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
                              textClass = 'text-amber-600 dark:text-amber-400'
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
                              onClick={() => setAbaAtiva('tarefas')}
                            >
                              <div className={`w-2 h-2 rounded-full ${dotClass}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tarefa.titulo}</p>
                                <p className={`text-xs ${textClass}`}>{vencimentoTexto}</p>
                              </div>
                              <Clock className={`w-4 h-4 ${iconClass}`} />
                            </div>
                          )
                        })
                      )}
                    </div>

                    <button
                      onClick={() => setAbaAtiva('tarefas')}
                      className="mt-4 w-full py-2.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition flex items-center justify-center gap-2"
                    >
                      Ver todas as tarefas
                      <span>→</span>
                    </button>
                  </div>

                  {/* Objetivos da Equipe - 1/4 */}
                  <div className="lg:col-span-1 rounded-2xl p-5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                    <h3 className="text-xl font-semibold font-outfit text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-purple-500" />
                      Objetivos
                    </h3>

                    <div className="space-y-4">
                      {/* Meta Coletiva */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Meta Mensal</p>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {Math.min(teamStats?.progressoMeta || 0, 100)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(teamStats?.progressoMeta || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Leads do Mês */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Leads Mês</p>
                          <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                            {teamStats?.leadsEsteMes || 0}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Meta: {teamStats?.metaMensal || 100} leads
                        </p>
                      </div>

                      {/* Vendas */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Fechados</p>
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                            {teamStats?.leadsFechados || 0}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {teamStats?.leadsEmNegociacao || 0} em negociação
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Conquistas - 1/4 */}
                  <div className="lg:col-span-1 rounded-2xl p-5 bg-gradient-to-br from-amber-500/10 to-purple-500/10 dark:from-amber-500/5 dark:to-purple-500/5 border border-amber-500/20">
                    <h3 className="text-xl font-semibold font-outfit text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      Conquistas
                    </h3>

                    <div className="space-y-4">
                      {/* Conquista: Vendas Fechadas */}
                      {(teamStats?.leadsFechados || 0) > 0 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Flame className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Sequência 🔥</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{teamStats?.leadsFechados} vendas!</p>
                          </div>
                        </div>
                      )}

                      {/* Conquista: Meta Batida */}
                      {(teamStats?.progressoMeta || 0) >= 100 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Zap className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Meta Batida ⭐</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Parabéns!</p>
                          </div>
                        </div>
                      )}

                      {/* Conquista: Primeira venda ou muitos leads */}
                      {(teamStats?.leadsEsteMes || 0) >= 10 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Prospector ⭐</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">+10 leads no mês</p>
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {!teamStats || ((teamStats.leadsFechados || 0) === 0 && (teamStats.progressoMeta || 0) < 100 && (teamStats.leadsEsteMes || 0) < 10) && (
                        <div className="text-center py-4 text-slate-400">
                          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">Continue trabalhando para desbloquear conquistas!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {abaAtiva === 'produtos' && equipe && (
              <ProdutosEquipe tenantId={equipe.id} readOnly={!canManageTeam} />
            )}

            {abaAtiva === 'conquistas' && equipe && (
              <ConquistasEquipe />
            )}

            {abaAtiva === 'leads' && equipe && (
              <LeadsEquipe tenantId={equipe.id} />
            )}

            {abaAtiva === 'tarefas' && equipe && (
              <TarefasEquipe tenantId={equipe.id} />
            )}

            {/* {abaAtiva === 'distribuicao' && equipe && (
              <DistribuicaoLeads teamId={equipe.id} membros={equipe.membros} />
            )} */}

            {/* ===== ABA: GERENCIAR EQUIPE (CONFIGURAÇÕES) ===== */}
            {abaAtiva === 'configuracoes' && equipe && canManageTeam && (
              <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-slate-500 to-slate-600 text-white flex items-center justify-center shadow-lg">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gerenciar Equipe</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configure e gerencie sua equipe</p>
                  </div>
                </div>

                {/* ===== GRID: CONFIGURAÇÕES + METAS ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ===== SEÇÃO 1: CONFIGURAÇÕES DA EQUIPE ===== */}
                  <div className="rounded-xl bg-transparent border border-slate-200/30 dark:border-white/5 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-cyan-500" />
                      Configurações da Equipe
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Nome da Equipe
                        </label>
                        <input
                          type="text"
                          value={nomeEquipe}
                          onChange={(e) => setNomeEquipe(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="Nome da equipe"
                        />
                      </div>

                      {/* Slogan */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Slogan
                        </label>
                        <input
                          type="text"
                          value={sloganEquipe}
                          onChange={(e) => setSloganEquipe(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="Slogan da equipe"
                        />
                      </div>

                      {/* Ícone/Logo da equipe */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Ícone da Equipe
                        </label>
                        <div className="flex items-center gap-4">
                          {/* Preview do logo */}
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden ${logoUrl ? '' : 'bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700'}`}>
                            {logoUrl ? (
                              <img src={logoUrl} alt="Logo da equipe" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-8 h-8 text-white" />
                            )}
                          </div>

                          {/* Input de upload (oculto) */}
                          <input
                            type="file"
                            id="logo-upload"
                            accept="image/*"
                            onChange={handleUploadLogo}
                            className="hidden"
                            disabled={uploadingLogo}
                          />

                          {/* Botão para acionar upload */}
                          <label
                            htmlFor="logo-upload"
                            className={`px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition cursor-pointer ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {uploadingLogo ? 'Enviando...' : 'Alterar Ícone'}
                          </label>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 2MB
                        </p>
                      </div>

                      {/* Botão Salvar */}
                      <div>
                        <button
                          onClick={handleSalvarConfiguracoes}
                          className="w-full px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ===== SEÇÃO 2: METAS MENSAIS ===== */}
                  <div className="rounded-xl bg-transparent border border-slate-200/30 dark:border-white/5 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-emerald-500" />
                      Metas Mensais
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Meta de Leads (mensal)
                        </label>
                        <input
                          type="number"
                          value={metaLeads}
                          onChange={(e) => setMetaLeads(Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Meta de Vendas (mensal)
                        </label>
                        <input
                          type="number"
                          value={metaVendas}
                          onChange={(e) => setMetaVendas(Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="20"
                        />
                      </div>
                      <div>
                        <button
                          onClick={handleSalvarMetas}
                          className="w-full px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
                        >
                          Salvar Metas
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== SEÇÃO 2: GERENCIAR MEMBROS ===== */}
                <div className="rounded-xl bg-transparent border border-slate-200/30 dark:border-white/5 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    Membros da Equipe
                    <span className="ml-auto text-sm font-normal text-slate-500 dark:text-slate-400">
                      {equipe.membros.length} membros
                    </span>
                  </h3>

                  {/* Lista de membros */}
                  <div className="space-y-3">
                    {equipe.membros.map((membro) => {
                      const isOwner = membro.role === 'owner'
                      const isCurrentUser = membro.user_id === user?.id

                      return (
                        <div
                          key={membro.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-transparent border border-slate-200/30 dark:border-white/5"
                        >
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                              {membro.nome?.charAt(0).toUpperCase() || membro.email?.charAt(0).toUpperCase() || '?'}
                            </div>
                            {/* Info */}
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                {membro.nome || 'Sem nome'}
                                {isCurrentUser && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                                    Você
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{membro.email}</p>
                            </div>
                          </div>

                          {/* Role e ações */}
                          <div className="flex items-center gap-3">
                            {/* Seletor de cargo (só se não for owner e não for você mesmo) */}
                            {!isOwner && !isCurrentUser && (
                              <select
                                defaultValue={membro.role}
                                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                onChange={(e) => handleAlterarCargo(membro.id, e.target.value)}
                              >
                                <option value="vendedor">Vendedor</option>
                                <option value="admin">Administrador</option>
                              </select>
                            )}

                            {/* Badge de cargo (se for owner ou você mesmo) */}
                            {(isOwner || isCurrentUser) && (
                              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isOwner
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                : membro.role === 'admin' || membro.role === 'administrador'
                                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                  : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                                }`}>
                                {isOwner ? 'Proprietário' :
                                  membro.role === 'admin' || membro.role === 'administrador' ? 'Administrador' :
                                    'Vendedor'}
                              </span>
                            )}

                            {/* Botão remover (só se não for owner e não for você mesmo) */}
                            {!isOwner && !isCurrentUser && (
                              <button
                                onClick={() => handleRemoverMembro(membro.id, membro.nome || membro.email)}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition"
                                title="Remover membro"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}

                            {/* Status indicator */}
                            <span
                              className={`w-2 h-2 rounded-full ${membro.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              title={membro.status === 'ativo' ? 'Ativo' : 'Pendente'}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>



                {/* ===== SEÇÃO 3: GERENCIAR CONQUISTAS ===== */}
                <div className="rounded-xl bg-transparent border border-slate-200/30 dark:border-white/5 p-6">
                  <GerenciarConquistas />
                </div>

                {/* ===== SEÇÃO 4: ZONA PERIGOSA (só para owner) ===== */}
                {member?.role === 'owner' && (
                  <div className="rounded-xl bg-red-500/10 border-2 border-red-500/30 p-6">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Zona Perigosa
                    </h3>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4">
                      Esta ação é irreversível e excluirá permanentemente a equipe e todos os dados associados.
                    </p>
                    <button
                      onClick={handleExcluirEquipe}
                      className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition"
                    >
                      Excluir Equipe Permanentemente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
