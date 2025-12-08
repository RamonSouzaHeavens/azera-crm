import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Grid3X3,
  List,
  Kanban as KanbanIcon,
  Search,
  X,
  Filter,
  Mail,
  Phone,
  Settings,
  Edit,
  Trash,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { supabase } from '../lib/supabase'
import { loadPipelineStages, createPipelineStage, updatePipelineStage, deletePipelineStage } from '../services/pipelineService'

// =======================
// Tipos fortemente tipados (sem any)
// =======================
export type StatusType = string

export interface ClienteRow {
  id: string
  tenant_id: string
  nome: string
  telefone: string | null
  email: string | null
  status: StatusType
  notas: string | null
  valor_potencial: number | null
  campanha_id: string | null
  created_at?: string
  updated_at?: string
}

export interface Produto {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  preco: number | null
  ativo: boolean
  tags?: string[] | null
  created_at?: string
  updated_at?: string
}

export interface ClienteProduto {
  id: string
  tenant_id: string
  cliente_id: string
  produto_id: string
  status: 'entregue' | 'pendente' | 'cancelado'
  quantidade: number
  preco_vendido: number | null
  observacoes: string | null
  data_entrega: string | null
  created_at?: string
  updated_at?: string
}

export interface CampanhaRow {
  id: string
  tenant_id: string
  nome: string
  ativa: boolean
}

export interface AtividadeRow {
  id: string
  tenant_id: string
  cliente_id: string
  user_id: string | null
  tipo: 'nota' | 'ligacao' | 'email' | 'follow-up'
  conteudo: string
  created_at: string
  user_email?: string
}

export interface Cliente extends ClienteRow {
  campanhaNome?: string
  ultimaNota?: string
  produtos?: Array<ClienteProduto & { produto?: Produto }>
  tarefasAbertas?: number
}

export interface ClienteFilters {
  status?: string | 'todos'
  createdFrom?: string
  createdTo?: string
  updatedFrom?: string
  updatedTo?: string
  valorMin?: number
  valorMax?: number
}

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`
const truncate = (s?: string | null, n = 90) => (s ? (s.length > n ? s.slice(0, n) + '…' : s) : '')

export default function Leads() {
  const { tenant, loading: authLoading, user } = useAuthStore()
  const { isDark } = useThemeStore()
  const { t } = useTranslation()

  const [viewMode, setViewMode] = useState<'grid' | 'kanban' | 'list'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<ClienteFilters>({ status: 'todos' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const LIMIT = 50
  const [leads, setLeads] = useState<Cliente[]>([])
  const [campanhasMap, setCampanhasMap] = useState<Record<string, string>>({})
  const [leadOrigins, setLeadOrigins] = useState<Array<{ id: string; name: string }>>([])
  const [leadLossReasons, setLeadLossReasons] = useState<Array<{ id: string; category: string; reason: string }>>([])
  const [customFields, setCustomFields] = useState<Array<{ id: string; field_name: string; field_type: string; options?: string[] }>>([])

  const campanhasMapRef = useRef<Record<string, string>>({})

  const navigate = useNavigate()

  const openLead = (lead: Cliente) => {
    navigate(`/app/clientes/${lead.id}`)
  }

  const [showPipelineSettings, setShowPipelineSettings] = useState(false)
  const [pipelineStages, setPipelineStages] = useState<Array<{ id?: string; key: string, label: string, color: string }>>([
    { key: 'lead', label: 'Lead', color: '#8B5CF6' },
    { key: 'negociacao', label: 'Negociação', color: '#06B6D4' },
    { key: 'fechado', label: 'Fechado', color: '#10B981' }
  ])
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6366F1')
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null)
  const [editingStageName, setEditingStageName] = useState('')
  const [stageToDelete, setStageToDelete] = useState<{ index: number, label: string } | null>(null)

  const startEditStage = (index: number) => {
    setEditingStageIndex(index)
    setEditingStageName(pipelineStages[index]?.label ?? '')
  }

  const saveEditStage = async (index: number) => {
    const name = editingStageName.trim()
    if (!name) {
      toast.error(t('leads.invalidStageName'))
      return
    }
    const stage = pipelineStages[index]
    if (!stage) return

    const updated = pipelineStages.map((s, i) => i === index ? { ...s, label: name } : s)
    setPipelineStages(updated)
    setEditingStageIndex(null)
    setEditingStageName('')

    if (stage.id && tenant?.id) {
      try {
        await updatePipelineStage(stage.id, { label: name })
        toast.success(t('leads.stageUpdated'))
      } catch (err) {
        console.error('[ERROR] saveEditStage:', err)
        toast.error(t('leads.stageSaveError'))
      }
    } else {
      toast.success(t('leads.stageUpdatedLocal'))
    }
  }

  const cancelEditStage = () => {
    setEditingStageIndex(null)
    setEditingStageName('')
  }

  useEffect(() => {
    const loadStages = async () => {
      if (!tenant?.id) {
        return
      }
      try {
        const stages = await loadPipelineStages(tenant.id)
        if (stages && stages.length > 0) {
          const converted = stages.map(s => ({
            id: s.id,
            key: s.key,
            label: s.label,
            color: s.color
          }))
          setPipelineStages(converted)
        }
      } catch (err) {
        console.error('[ERROR] loadStages:', err)
      }
    }
    loadStages()
  }, [tenant?.id])

  useEffect(() => {
    campanhasMapRef.current = campanhasMap
  }, [campanhasMap])

  // =======================
  // Load origins, loss reasons and custom fields
  // =======================
  const loadOrigins = useCallback(async () => {
    if (!tenant?.id) return
    try {
      const { data, error } = await supabase
        .from('lead_origins')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setLeadOrigins(data || [])
    } catch (err) {
      console.error('[ERROR] loadOrigins:', err)
    }
  }, [tenant?.id])

  const loadLossReasons = useCallback(async () => {
    if (!tenant?.id) return
    try {
      const { data, error } = await supabase
        .from('lead_loss_reasons')
        .select('id, category, reason')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('category, reason')

      if (error) throw error
      setLeadLossReasons(data || [])
    } catch (err) {
      console.error('[ERROR] loadLossReasons:', err)
    }
  }, [tenant?.id])

  const loadCustomFields = useCallback(async () => {
    if (!tenant?.id) return
    try {
      const { data, error } = await supabase
        .from('lead_custom_fields')
        .select('id, field_name, field_type, options')
        .eq('tenant_id', tenant.id)
        .eq('active', true)
        .order('field_name')

      if (error) throw error
      setCustomFields(data || [])
    } catch (err) {
      console.error('[ERROR] loadCustomFields:', err)
    }
  }, [tenant?.id])

  // =======================
  // Loads (sem select relacional para evitar PGRST200)
  // =======================
  const loadCampanhas = useCallback(async () => {
    console.log('[DEBUG] loadCampanhas started', {
      tenantId: tenant?.id,
      authLoading,
      userEmail: user?.email
    })
    if (!tenant?.id) {
      console.log('[DEBUG] loadCampanhas aborted - no tenant')
      return
    }
    try {
      console.log('[DEBUG] Fazendo query para campanhas...')
      const { data, error } = await supabase
        .from('campanhas')
        .select('id, nome, tenant_id')
        .eq('tenant_id', tenant.id)
        .order('nome', { ascending: true })

      console.log('[DEBUG] Resultado campanhas:', { data, error })
      if (error) throw error

      const rows = (data ?? []) as CampanhaRow[]
      const map: Record<string, string> = {}
      for (const c of rows) map[c.id] = c.nome
      console.log('[DEBUG] Mapa de campanhas criado:', map)
      setCampanhasMap(map)
    } catch (err) {
      console.error('[ERROR] loadCampanhas failed:', err)
      toast.error(t('leads.loadCampaignsError'))
    }
  }, [tenant?.id])



  const loadLeads = useCallback(async (pageToLoad = 1) => {
    console.log('[DEBUG] loadLeads started', { tenantId: tenant?.id, authLoading, pageToLoad })
    if (!tenant?.id) {
      if (!authLoading) setLoading(false)
      return
    }

    if (pageToLoad === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const from = (pageToLoad - 1) * LIMIT
      const to = from + LIMIT - 1

      console.log('[DEBUG] Fazendo query para clientes...', { from, to })

      const { data, error } = await supabase
        .from('clientes')
        .select('id, tenant_id, nome, telefone, email, status, notas, valor_potencial, campanha_id, created_at, updated_at')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const rows = (data ?? []) as ClienteRow[]
      const newHasMore = rows.length === LIMIT
      setHasMore(newHasMore)

      // 2) Busca tarefas abertas por cliente
      const tarefasByLead: Record<string, number> = {}
      const ids = rows.map(r => r.id)
      if (ids.length > 0) {
        try {
          const { data: tarefasData } = await supabase
            .from('tarefas')
            .select('cliente_id')
            .eq('tenant_id', tenant.id)
            .in('cliente_id', ids)
            .neq('status', 'concluida')

          const list = (tarefasData ?? []) as { cliente_id: string }[]
          for (const t of list) {
            tarefasByLead[t.cliente_id] = (tarefasByLead[t.cliente_id] || 0) + 1
          }
        } catch (tarefasErr) {
          console.warn('[WARN] Falha ao buscar tarefas (continuando sem elas):', tarefasErr)
        }
      }

      // 3) Busca última atividade
      const latestByLead: Record<string, AtividadeRow | undefined> = {}
      if (ids.length > 0) {
        try {
          const { data: acts } = await supabase
            .from('atividades')
            .select('id, tenant_id, cliente_id, tipo, conteudo, created_at')
            .eq('tenant_id', tenant.id)
            .in('cliente_id', ids)
            .order('created_at', { ascending: false })

          const list = (acts ?? []) as AtividadeRow[]
          for (const a of list) {
            if (!latestByLead[a.cliente_id]) latestByLead[a.cliente_id] = a
          }
        } catch (activityErr) {
          console.warn('[WARN] Falha ao buscar atividades (continuando sem elas):', activityErr)
        }
      }

      const enriched: Cliente[] = rows.map(r => ({
        ...r,
        campanhaNome: r.campanha_id ? (campanhasMapRef.current[r.campanha_id] ?? undefined) : undefined,
        ultimaNota: latestByLead[r.id]?.conteudo,
        tarefasAbertas: tarefasByLead[r.id] || 0,
      }))

      if (pageToLoad === 1) {
        setLeads(enriched)
      } else {
        setLeads(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const uniqueNew = enriched.filter(e => !existingIds.has(e.id))
          return [...prev, ...uniqueNew]
        })
      }
      setPage(pageToLoad)

    } catch (err) {
      console.error('[ERROR] loadLeads failed:', err)
      toast.error(t('leads.loadLeadsError'))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tenant?.id])

  useEffect(() => {
    // Carrega campanhas primeiro (nome da campanha no card) e depois os leads.
    // Executamos apenas quando tenant.id muda ou authLoading vira false
    console.log('[DEBUG] useEffect boot triggered', {
      tenantId: tenant?.id,
      authLoading
    })

    if (authLoading || !tenant?.id) {
      console.log('[DEBUG] Boot aborted - waiting for auth or tenant')
      return
    }

    const boot = async () => {
      console.log('[DEBUG] Starting boot sequence...')
      await loadCampanhas()
      await loadOrigins()
      await loadLossReasons()
      await loadCustomFields()
      await loadLeads(1)

    }
    void boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, authLoading])

  // =======================
  // Actions
  // =======================
  const addNewLead = () => {
    setShowCreateModal(true)
  }

  const handleCreateLead = async (leadData: {
    nome: string;
    email?: string;
    telefone?: string;
    valor_potencial?: number;
    status?: string;
    origem_id?: string;
    motivo_perda_id?: string;
    compartilhado_equipe?: boolean;
    notas?: string;
    customFields?: Record<string, string>;
  }) => {
    if (!tenant?.id) return

    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          tenant_id: tenant.id,
          nome: leadData.nome,
          status: leadData.status || pipelineStages[0]?.key || 'lead',
          telefone: leadData.telefone || null,
          email: leadData.email || null,
          notas: leadData.notas || null,
          valor_potencial: leadData.valor_potencial || null,
          campanha_id: null,
          origem_id: leadData.origem_id || null,
          motivo_perda_id: leadData.motivo_perda_id || null,
          compartilhado_equipe: leadData.compartilhado_equipe || false,
          proprietario_id: user?.id || null
        })
        .select()
        .single()

      if (error) throw error

      // Salvar campos personalizados
      if (data && leadData.customFields && Object.keys(leadData.customFields).length > 0) {
        const customFieldInserts = Object.entries(leadData.customFields)
          .filter(([, value]) => value) // Apenas campos com valor
          .map(([fieldId, value]) => ({
            tenant_id: tenant.id,
            lead_id: data.id,
            custom_field_id: fieldId,
            value: value
          }))

        if (customFieldInserts.length > 0) {
          const { error: customFieldError } = await supabase
            .from('lead_custom_field_values')
            .insert(customFieldInserts)

          if (customFieldError) {
            console.error('[ERROR] Failed to save custom fields:', customFieldError)
            // Não quebra o fluxo, apenas loga o erro
          }
        }
      }

      if (data) {
        const newLead: Cliente = {
          ...data,
          campanhaNome: undefined,
          ultimaNota: undefined,
          tarefasAbertas: 0
        }

        setLeads(prev => [newLead, ...prev])
        setShowCreateModal(false)
        openLead(newLead)
        toast.success(t('leads.leadCreated'))
      }
    } catch (err) {
      console.error('[ERROR] handleCreateLead failed:', err)
      toast.error(t('leads.createLeadError'))
    }
  }



  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination || !tenant?.id) return

    // Extrair ID real do draggableId (pode ter prefixo 'unclassified-')
    const realLeadId = draggableId.startsWith('unclassified-') ? draggableId.replace('unclassified-', '') : draggableId

    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    try {
      // Se destination é 'unclassified', não fazer nada
      if (destination.droppableId === 'unclassified') return

      const newStageKey = destination.droppableId

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('clientes')
        .update({ status: newStageKey })
        .eq('tenant_id', tenant.id)
        .eq('id', realLeadId)

      if (error) throw error

      // Atualizar estado local
      setLeads(prev => prev.map(l => (l.id === realLeadId ? { ...l, status: newStageKey } : l)))

      toast.success(t('leads.leadMoved'))
    } catch (err) {
      console.error(err)
      toast.error(t('leads.leadMoveFailed'))
    }
  }

  // =======================
  // Derived
  // =======================
  const filtered = leads.filter(l => {
    const t = searchTerm.trim().toLowerCase()
    const byText = t
      ? [l.nome, l.email ?? '', l.telefone ?? '', l.campanhaNome ?? '', l.notas ?? '', l.ultimaNota ?? '']
        .some(v => v?.toLowerCase().includes(t))
      : true
    const byStatus = filters.status && filters.status !== 'todos' ? l.status === filters.status : true
    const byValorMin = typeof filters.valorMin === 'number' ? (l.valor_potencial ?? 0) >= filters.valorMin! : true
    const byValorMax = typeof filters.valorMax === 'number' ? (l.valor_potencial ?? 0) <= filters.valorMax! : true
    return byText && byStatus && byValorMin && byValorMax
  })

  // Criar grouped dinamicamente baseado nas etapas da pipeline
  const grouped: Record<string, Cliente[]> = {}
  pipelineStages.forEach(stage => {
    grouped[stage.key] = filtered.filter(l => l.status === stage.key)
  })

  // Adicionar coluna "Sem classificação" se houver leads sem status
  const unclassifiedLeads = filtered.filter(l => !l.status || !pipelineStages.some(s => s.key === l.status))
  if (unclassifiedLeads.length > 0) {
    grouped['unclassified'] = unclassifiedLeads
  }

  // =======================
  // UI Helpers
  // =======================


  const Header = (
    <div className="sticky top-0 z-20 backdrop-blur-sm border-b border-slate-200 dark:border-white/5">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Título */}
          <div className="flex-shrink-0">
            <div className="text-xs uppercase tracking-widest text-gray-400">{t('leads.pipeline')}</div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{t('leads.title')}</h1>
          </div>

          {/* Busca */}
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('leads.searchPlaceholder')}
              className="w-full pl-10 pr-3 py-2 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl border transition ${viewMode === 'list' ? 'ring-2 ring-emerald-500/40 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}
              aria-label={t('leads.list')}
            >
              <List className="w-5 h-5 text-gray-600 dark:text-gray-200" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl border transition ${viewMode === 'grid' ? 'ring-2 ring-emerald-500/40 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}
              aria-label={t('leads.grid')}
            >
              <Grid3X3 className="w-5 h-5 text-gray-600 dark:text-gray-200" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-xl border transition ${viewMode === 'kanban' ? 'ring-2 ring-cyan-500/40 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}
              aria-label={t('leads.kanban')}
            >
              <KanbanIcon className="w-5 h-5 text-gray-600 dark:text-gray-200" />
            </button>
            <button
              onClick={() => setFiltersOpen(true)}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition"
              aria-label={t('common.filter')}
            >
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-200" />
            </button>
            <button
              onClick={() => setShowPipelineSettings(true)}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition"
              aria-label={t('leads.configurePipeline')}
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-200" />
            </button>
            <button onClick={addNewLead} className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border border-slate-200 dark:border-white/10 hover:scale-105 active:scale-95 rounded-xl text-sm shadow-md transition">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t('leads.newLead')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )



  const StatusPill = ({ s }: { s: string }) => {
    // Buscar configuração da etapa no pipelineStages
    const stageConfig = pipelineStages.find(stage => stage.key === s)

    if (!stageConfig) {
      // Fallback para status não encontrado
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border bg-slate-500/10 text-slate-200 border-slate-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          {s || t('leads.unclassified')}
        </span>
      )
    }

    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border"
        style={{
          backgroundColor: `${stageConfig.color}22`,
          color: stageConfig.color,
          borderColor: `${stageConfig.color}44`,
          boxShadow: `0 0 0.5rem ${stageConfig.color}22`
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageConfig.color }} />
        {stageConfig.label}
      </span>
    )
  }

  const LeadCard = ({ l }: { l: Cliente }) => (
    <button
      onClick={() => openLead(l)}
      className="w-full text-left rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition p-4 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-wide">{l.nome}</h3>
            <StatusPill s={l.status} />
          </div>
          {l.campanhaNome && (
            <div className="mt-0.5 text-[12px] text-gray-400">{t('leads.campaign')}: {l.campanhaNome}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-gray-300">
        <div className="rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-2">
          <div className="text-[11px] text-slate-500 dark:text-gray-400">{t('leads.potentialValue')}</div>
          <div className="text-slate-700 dark:text-white font-semibold">
            {typeof l.valor_potencial === 'number' ? brl(l.valor_potencial) : '—'}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-2">
          <div className="text-[11px] text-slate-500 dark:text-gray-400">{t('leads.createdAt')}</div>
          <div className="text-slate-700 dark:text-white truncate">
            {l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '—'}
          </div>
        </div>
      </div>
      <div className="mt-2 text-sm text-slate-600 dark:text-gray-300">
        <div className="rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-2">
          <div className="text-[11px] text-slate-500 dark:text-gray-400">{t('leads.openTasks')}</div>
          <div className="text-slate-700 dark:text-white font-semibold">
            {l.tarefasAbertas || 0}
          </div>
        </div>
      </div>
      {truncate(l.ultimaNota, 120) && (
        <div className="mt-3 text-[13px] text-gray-300 line-clamp-2">
          {truncate(l.ultimaNota, 180)}
        </div>
      )}
    </button>
  )

  const LeadRow = ({ l }: { l: Cliente }) => (
    <button
      onClick={() => openLead(l)}
      className="w-full text-left rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition p-4 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Info Principal - Layout horizontal otimizado */}
        <div className="flex items-start gap-6 flex-1 min-w-0">
          {/* Nome, Status, Email e Contato */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-wide truncate">{l.nome}</h3>
                <StatusPill s={l.status} />
              </div>
              {/* Email e Contato ao lado do título */}
              <div className="hidden sm:flex items-center gap-4">
                {l.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate max-w-[150px]">{l.email}</span>
                  </div>
                )}
                {l.telefone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{l.telefone}</span>
                  </div>
                )}
              </div>
            </div>
            {l.campanhaNome && (
              <div className="text-[12px] text-gray-400 truncate mt-1">{t('leads.campaign')}: {l.campanhaNome}</div>
            )}
          </div>

          {/* Última Nota */}
          <div className="hidden md:flex flex-col min-w-[200px] max-w-[250px]">
            {truncate(l.ultimaNota, 80) ? (
              <>
                <div className="text-[11px] text-gray-400 mb-1">{t('leads.lastNote')}</div>
                <div className="text-[13px] text-gray-300 line-clamp-2">
                  {truncate(l.ultimaNota, 120)}
                </div>
              </>
            ) : (
              <div className="text-[13px] text-gray-500 italic">{t('leads.noNotes')}</div>
            )}
          </div>

          {/* Valor Potencial */}
          <div className="hidden lg:flex flex-col text-right min-w-[120px]">
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mb-1">{t('leads.potentialValue')}</div>
            <div className="text-slate-700 dark:text-white font-semibold">
              {typeof l.valor_potencial === 'number' ? brl(l.valor_potencial) : '—'}
            </div>
          </div>

          {/* Data de Criação */}
          <div className="hidden lg:flex flex-col text-right min-w-[100px]">
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mb-1">{t('leads.createdAt')}</div>
            <div className="text-slate-700 dark:text-white text-sm">
              {l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '—'}
            </div>
          </div>

          {/* Tarefas Abertas */}
          <div className="hidden lg:flex flex-col text-right min-w-[100px]">
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mb-1">{t('leads.openTasks')}</div>
            <div className="text-slate-700 dark:text-white font-semibold">
              {l.tarefasAbertas || 0}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 flex-shrink-0">

        </div>
      </div>

      {/* Informações responsivas para tablets e mobile */}
      <div className="sm:hidden mt-2 space-y-2">
        {/* Email e telefone em mobile */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          {l.email && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Mail className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="truncate">{l.email}</span>
            </div>
          )}
          {l.telefone && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Phone className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="truncate">{l.telefone}</span>
            </div>
          )}
        </div>

        {/* Valor, data e tarefas em mobile */}
        <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t border-white/5">
          <div className="text-gray-300">
            <span className="text-[11px] text-gray-400">{t('common.value')}</span>
            <div className="text-white font-semibold">
              {typeof l.valor_potencial === 'number' ? brl(l.valor_potencial) : '—'}
            </div>
          </div>
          <div className="text-gray-300">
            <span className="text-[11px] text-gray-400">{t('common.created')}</span>
            <div className="text-white">
              {l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '—'}
            </div>
          </div>
          <div className="text-gray-300">
            <span className="text-[11px] text-gray-400">{t('leads.openTasks')}</span>
            <div className="text-white font-semibold">
              {l.tarefasAbertas || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Nota para tablets */}
      <div className="md:hidden mt-3">
        {truncate(l.ultimaNota, 120) && (
          <div className="text-[13px] text-gray-300 line-clamp-2 border-t border-white/5 pt-3">
            <span className="text-[11px] text-gray-400 block mb-1">{t('leads.lastNote')}</span>
            {truncate(l.ultimaNota, 150)}
          </div>
        )}
      </div>
    </button>
  )

  // =======================
  // Render
  // =======================
  return (
    <div className="text-slate-900 dark:text-slate-200 flex flex-col min-h-full relative overflow-hidden">
      {/* HUD glow grid background + overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:120px_120px]" />
      </div>

      <div className="flex-1 overflow-y-auto pb-6 px-6 relative z-10">
        {/* HUD glow grid background + overlay */}
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.06),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.06),transparent_45%)]" />

        {Header}

        {/* Conteúdo */}
        {/* GRID / LIST MODE (mobile-first) */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {loading && (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 animate-pulse" />
              ))
            )}
            {!loading && filtered.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-16 px-4">
                <div className="rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-12 text-center max-w-md">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('leads.emptyTitle')}</h3>
                  <p className="text-slate-600 dark:text-gray-400">
                    {t('leads.emptyDescription')}
                  </p>
                </div>
              </div>
            )}
            {!loading && filtered.map(l => (
              <LeadCard key={l.id} l={l} />
            ))}
          </div>
        )}

        {/* LIST MODE (row-based for better scalability) */}
        {viewMode === 'list' && (
          <div className="p-6 space-y-3">
            {loading && (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 animate-pulse" />
              ))
            )}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-12 text-center max-w-md">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('leads.emptyTitle')}</h3>
                  <p className="text-slate-600 dark:text-gray-400">
                    {t('leads.emptyDescription')}
                  </p>
                </div>
              </div>
            )}
            {!loading && filtered.map(l => (
              <LeadRow key={l.id} l={l} />
            ))}
          </div>
        )}

        {/* KANBAN (desktop enhanced) */}
        {viewMode === 'kanban' && (
          <div className="hidden lg:block">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4 px-6 py-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {pipelineStages.map((stage) => (
                  <Droppable droppableId={stage.key} key={stage.key}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-shrink-0 w-80 snap-start rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 p-4 min-h-[70vh] shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-sm font-bold text-slate-900 dark:text-white flex flex-col gap-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full`} style={{ background: stage.color }} />
                              {stage.label}
                              <span className="text-[12px] font-semibold text-slate-500 dark:text-gray-400 bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded-lg">({grouped[stage.key]?.length || 0})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                ID: {stage.id || stage.key}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                Key: {stage.key}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(grouped[stage.key] || []).map((l, idx) => (
                            <Draggable key={l.id} draggableId={l.id} index={idx}>
                              {(pp, snapshot) => (
                                <div
                                  ref={pp.innerRef}
                                  {...pp.draggableProps}
                                  {...pp.dragHandleProps}
                                  className={`rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 p-4 cursor-grab active:cursor-grabbing transition-all ${snapshot.isDragging ? 'ring-2 ring-cyan-500/60 ring-offset-2 dark:ring-offset-slate-900 scale-[1.02] shadow-md' : 'hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm'}`}
                                  onClick={() => openLead(l)}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1">
                                      <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{l.nome}</div>
                                      <div className="text-xs text-slate-600 dark:text-gray-400 mt-0.5">{l.campanhaNome || '—'}</div>
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-cyan-400 font-bold">
                                      {typeof l.valor_potencial === 'number' ? brl(l.valor_potencial) : '—'}
                                    </div>
                                  </div>
                                  {truncate(l.ultimaNota, 100) && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-gray-400 line-clamp-2">
                                      {truncate(l.ultimaNota, 120)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}

                {/* Coluna dinâmica: Sem classificação (aparece apenas se houver leads sem status) */}
                {grouped.unclassified && grouped.unclassified.length > 0 && (
                  <Droppable droppableId="unclassified" key="unclassified">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-shrink-0 w-80 snap-start rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-4 min-h-[70vh] shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500" />
                            {t('leads.unclassified')}
                            <span className="text-[12px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-200 dark:bg-amber-900/40 px-2 py-0.5 rounded-lg">({grouped.unclassified.length})</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {grouped.unclassified.map((l, idx) => (
                            <Draggable key={l.id} draggableId={`unclassified-${l.id}`} index={idx}>
                              {(pp, snapshot) => (
                                <div
                                  ref={pp.innerRef}
                                  {...pp.draggableProps}
                                  {...pp.dragHandleProps}
                                  className={`rounded-lg bg-white dark:bg-slate-800/60 border border-amber-200 dark:border-amber-700 p-4 cursor-grab active:cursor-grabbing transition-all ${snapshot.isDragging ? 'ring-2 ring-amber-500/60 ring-offset-2 dark:ring-offset-slate-900 scale-[1.02] shadow-md' : 'hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-sm'}`}
                                  onClick={() => openLead(l)}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1">
                                      <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{l.nome}</div>
                                      <div className="text-xs text-slate-600 dark:text-gray-400 mt-0.5">{l.campanhaNome || '—'}</div>
                                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono break-all">{l.id}</div>
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-amber-300 font-bold">
                                      {typeof l.valor_potencial === 'number' ? brl(l.valor_potencial) : '—'}
                                    </div>
                                  </div>
                                  {truncate(l.ultimaNota, 100) && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-gray-400 line-clamp-2">
                                      {truncate(l.ultimaNota, 120)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                )}

                {/* Coluna para adicionar novo estágio */}
                <div
                  onClick={() => setShowPipelineSettings(true)}
                  className="flex-shrink-0 w-80 snap-start rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 min-h-[70vh] flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                    <Plus className="w-8 h-8 text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 transition-colors">{t('leads.addColumn')}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('leads.clickToManageStages')}</span>
                </div>
              </div>
            </DragDropContext>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="flex justify-center py-6 pb-12">
            <button
              onClick={() => loadLeads(page + 1)}
              disabled={loadingMore}
              className="px-6 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t('common.loadMore')}
                </>
              )}
            </button>
          </div>
        )}



        {/* Modal de Configuração da Pipeline */}
        {showPipelineSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPipelineSettings(false)} />
            <div className="absolute w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Settings className="w-5 h-5 text-cyan-400" />
                    {t('leads.managePipelineColumns')}
                  </div>
                  <button onClick={() => setShowPipelineSettings(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition">
                    <X className="w-5 h-5 text-slate-600 dark:text-gray-300" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-sm text-slate-600 dark:text-gray-400">
                    {t('leads.pipelineDescription')}
                  </p>

                  {/* Lista de Etapas Atuais */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      {t('leads.currentStages')}
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{t('leads.stageCount', { count: pipelineStages.length })}</span>
                    </h3>
                    {pipelineStages.map((stage, index) => (
                      <div key={stage.key} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 group">
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          <ChevronUp
                            className={`w-4 h-4 ${index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-cyan-500 cursor-pointer'}`}
                            onClick={async () => {
                              if (index > 0) {
                                const newStages = [...pipelineStages]
                                const temp = newStages[index]
                                newStages[index] = newStages[index - 1]
                                newStages[index - 1] = temp
                                setPipelineStages(newStages)
                                // Persist order to Supabase
                                if (tenant?.id) {
                                  try {
                                    await Promise.all([
                                      newStages[index].id && updatePipelineStage(newStages[index].id!, { order: index }),
                                      newStages[index - 1].id && updatePipelineStage(newStages[index - 1].id!, { order: index - 1 })
                                    ])
                                    toast.success(t('leads.orderUpdated'))
                                  } catch (err) {
                                    console.error('[ERROR] reorder stages:', err)
                                  }
                                }
                              }
                            }}
                          />
                          <ChevronDown
                            className={`w-4 h-4 ${index === pipelineStages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-cyan-500 cursor-pointer'}`}
                            onClick={async () => {
                              if (index < pipelineStages.length - 1) {
                                const newStages = [...pipelineStages]
                                const temp = newStages[index]
                                newStages[index] = newStages[index + 1]
                                newStages[index + 1] = temp
                                setPipelineStages(newStages)
                                // Persist order to Supabase
                                if (tenant?.id) {
                                  try {
                                    await Promise.all([
                                      newStages[index].id && updatePipelineStage(newStages[index].id!, { order: index }),
                                      newStages[index + 1].id && updatePipelineStage(newStages[index + 1].id!, { order: index + 1 })
                                    ])
                                    toast.success(t('leads.orderUpdated'))
                                  } catch (err) {
                                    console.error('[ERROR] reorder stages:', err)
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {editingStageIndex === index ? (
                            <input
                              autoFocus
                              value={editingStageName}
                              onChange={(e) => setEditingStageName(e.target.value)}
                              onBlur={() => saveEditStage(index)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditStage(index)
                                if (e.key === 'Escape') cancelEditStage()
                              }}
                              className="px-2 py-1 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white w-full"
                            />
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 dark:text-white">{stage.label}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                ID: {stage.id || stage.key}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditStage(index)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition"
                            title={t('common.edit')}
                          >
                            <Edit className="w-4 h-4 text-slate-500 dark:text-gray-300" />
                          </button>
                          {pipelineStages.length > 2 && (
                            <button
                              onClick={() => setStageToDelete({ index, label: stage.label })}
                              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 transition group"
                              title={t('leads.removeStage')}
                            >
                              <Trash className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Adicionar Nova Etapa */}
                  <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t('leads.addNewStage')}</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-700 dark:text-gray-400 mb-1 block">{t('leads.stageNameLabel')}</label>
                        <input
                          type="text"
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                          placeholder={t('leads.stageNamePlaceholder')}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-700 dark:text-gray-400 mb-1 block">{t('leads.colorLabel')}</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={newStageColor}
                            onChange={(e) => setNewStageColor(e.target.value)}
                            className="w-12 h-10 rounded-lg border border-slate-300 dark:border-white/10 cursor-pointer"
                          />
                          <span className="text-sm text-slate-600 dark:text-gray-400">{newStageColor}</span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!newStageName.trim()) {
                            toast.error(t('leads.enterStageName'))
                            return
                          }
                          if (!tenant?.id) {
                            toast.error(t('leads.tenantNotIdentified'))
                            return
                          }
                          const newKey = newStageName.toLowerCase().replace(/\s+/g, '_') as StatusType
                          const newStage = {
                            key: newKey,
                            label: newStageName,
                            color: newStageColor
                          }

                          // Update local state first for UI responsiveness
                          setPipelineStages([...pipelineStages, newStage])
                          setNewStageName('')
                          setNewStageColor('#6366F1')

                          // Persist to Supabase
                          try {
                            const result = await createPipelineStage({
                              tenant_id: tenant.id,
                              key: newKey,
                              label: newStageName,
                              color: newStageColor,
                              order: pipelineStages.length
                            })
                            if (result) {
                              // Update with returned ID from Supabase
                              setPipelineStages(prev =>
                                prev.map(s =>
                                  s.key === newKey && !s.id ? { ...s, id: result.id } : s
                                )
                              )
                            }
                            toast.success(t('leads.stageAdded'))
                          } catch (err) {
                            console.error('[ERROR] adding stage:', err)
                            toast.error(t('leads.stageSaveError'))
                          }
                        }}
                        className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {t('leads.addStage')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botão Fechar */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        const defaultStages = [
                          { key: 'lead', label: 'Lead', color: '#8B5CF6' },
                          { key: 'negociacao', label: 'Negociação', color: '#06B6D4' },
                          { key: 'fechado', label: 'Fechado', color: '#10B981' }
                        ]

                        // Filtrar apenas as colunas padrão que não existem
                        const missingDefaults = defaultStages.filter(defaultStage =>
                          !pipelineStages.some(existing => existing.key === defaultStage.key)
                        )

                        if (missingDefaults.length === 0) {
                          toast(t('leads.defaultColumnsExist'))
                          return
                        }

                        // Adicionar apenas as colunas padrão faltantes
                        const updatedStages = [...pipelineStages, ...missingDefaults]
                        setPipelineStages(updatedStages)

                        if (tenant?.id) {
                          try {
                            // Criar apenas as colunas padrão faltantes
                            await Promise.all(missingDefaults.map(async (stage, index) => {
                              await createPipelineStage({
                                tenant_id: tenant.id,
                                key: stage.key,
                                label: stage.label,
                                color: stage.color,
                                order: pipelineStages.length + index
                              })
                            }))
                            toast.success(t('leads.defaultColumnsAdded', { count: missingDefaults.length }))
                          } catch (err) {
                            console.error('[ERROR] adding missing default stages:', err)
                            toast.error(t('leads.addDefaultColumnsError'))
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium transition"
                    >
                      {t('leads.addDefaultStages')}
                      <br />
                      <span className="text-xs opacity-75">{t('leads.defaultColumnsSubtitle')}</span>
                    </button>
                    <button
                      onClick={() => setShowPipelineSettings(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-900 dark:text-gray-200 font-medium transition"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Remoção de Etapa */}
        {stageToDelete && (
          <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${isDark ? 'dark' : ''}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setStageToDelete(null)} />
            <div className="absolute w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-500 dark:border-slate-700 shadow-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 dark:bg-red-900/40 border border-red-400/40 dark:border-red-600/60 flex items-center justify-center flex-shrink-0">
                  <Trash className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('leads.removeStageTitle')}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('leads.confirmRemoveStage', { stage: stageToDelete.label })}
                  </p>
                </div>
              </div>

              <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-200">
                  {t('leads.removeStageWarning')}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStageToDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    const stage = pipelineStages[stageToDelete.index]
                    const newStages = pipelineStages.filter((_, i) => i !== stageToDelete.index)

                    // Update local state first
                    setPipelineStages(newStages)
                    setStageToDelete(null)

                    // Delete from Supabase if stage has an ID
                    if (stage?.id) {
                      try {
                        await deletePipelineStage(stage.id)
                        toast.success(t('leads.stageRemoved'))
                      } catch (err) {
                        console.error('[ERROR] deleting stage:', err)
                        toast.error(t('leads.stageRemoveError'))
                      }
                    } else {
                      toast.success(t('leads.stageRemoved'))
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 text-white font-bold transition-all shadow-lg hover:shadow-red-500/40"
                >
                  {t('leads.confirmRemoveAction')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters Sheet (mobile-first) */}
        {filtersOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:rounded-3xl lg:max-w-2xl lg:w-full rounded-t-3xl lg:rounded-t-3xl bg-slate-900/95 border-t lg:border border-white/10 shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-lg font-semibold text-white flex items-center gap-3">
                    <Filter className="w-5 h-5 text-cyan-400" />
                    {t('leads.filtersAdvanced')}
                  </div>
                  <button onClick={() => setFiltersOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition">
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Status */}
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                    <label className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      {t('leads.statusHeading')}
                    </label>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <button
                        onClick={() => setFilters(p => ({ ...p, status: 'todos' }))}
                        className={`px-4 py-3 rounded-lg border text-sm font-medium transition ${filters.status === 'todos'
                          ? 'bg-cyan-100 dark:bg-cyan-500/20 border-cyan-300 dark:border-cyan-500/40 text-cyan-900 dark:text-cyan-200'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'
                          }`}
                      >
                        {t('leads.allStatuses')}
                      </button>
                      {pipelineStages.map((stage) => (
                        <button
                          key={stage.key}
                          onClick={() => setFilters(p => ({ ...p, status: stage.key }))}
                          className={`px-4 py-3 rounded-lg border text-sm font-medium transition ${filters.status === stage.key
                            ? 'bg-cyan-100 dark:bg-cyan-500/20 border-cyan-300 dark:border-cyan-500/40 text-cyan-900 dark:text-cyan-200'
                            : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                        >
                          {stage.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Valor potencial */}
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                    <label className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      {t('leads.valueRange')}
                    </label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block font-medium">{t('leads.minValue')}</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition text-sm"
                          placeholder="0"
                          value={filters.valorMin ?? ''}
                          onChange={(e) => setFilters(p => ({ ...p, valorMin: e.target.value ? Number(e.target.value) : undefined }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block font-medium">{t('leads.maxValue')}</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition text-sm"
                          placeholder={t('leads.noLimit')}
                          value={filters.valorMax ?? ''}
                          onChange={(e) => setFilters(p => ({ ...p, valorMax: e.target.value ? Number(e.target.value) : undefined }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-4 pt-2">
                    <button
                      onClick={() => setFilters({ status: 'todos' })}
                      className="flex-1 px-6 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 font-medium transition flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      {t('leads.clearFilters')}
                    </button>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="flex-1 px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition text-sm flex items-center justify-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      {t('leads.applyFilters')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criação de Lead */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-8 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('leads.newLead')}</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const nome = formData.get('nome') as string
                  const email = formData.get('email') as string
                  const telefone = formData.get('telefone') as string
                  const valor_potencial = formData.get('valor_potencial') ? Number(formData.get('valor_potencial')) : undefined
                  const status = formData.get('status') as string
                  const origem_id = formData.get('origem_id') as string
                  const motivo_perda_id = formData.get('motivo_perda_id') as string
                  const notas = formData.get('notas') as string

                  // Coletar valores dos campos personalizados
                  const customFieldsData: Record<string, string> = {}
                  customFields.forEach(field => {
                    const value = formData.get(`custom_field_${field.id}`) as string
                    if (value) {
                      customFieldsData[field.id] = value
                    }
                  })

                  if (!nome.trim()) {
                    toast.error(t('leads.nameRequired'))
                    return
                  }

                  handleCreateLead({
                    nome: nome.trim(),
                    email: email.trim() || undefined,
                    telefone: telefone.trim() || undefined,
                    valor_potencial,
                    status: status || undefined,
                    origem_id: origem_id || undefined,
                    motivo_perda_id: motivo_perda_id || undefined,
                    compartilhado_equipe: false,
                    notas: notas.trim() || undefined,
                    customFields: Object.keys(customFieldsData).length > 0 ? customFieldsData : undefined
                  })
                }}
                className="p-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Coluna 1 */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {`${t('common.name')} *`}
                      </label>
                      <input
                        name="nome"
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder={t('common.name')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('auth.email')}
                      </label>
                      <input
                        name="email"
                        type="email"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder={t('auth.email')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('common.phone')}
                      </label>
                      <input
                        name="telefone"
                        type="tel"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder={t('common.phone')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('leads.potentialValueFilter')}
                      </label>
                      <input
                        name="valor_potencial"
                        type="number"
                        step="0.01"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Coluna 2 */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('leads.statusLabel')}
                      </label>
                      <select
                        name="status"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="">{t('common.select')}</option>
                        {pipelineStages.map(stage => (
                          <option key={stage.key} value={stage.key}>{stage.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('leads.leadOrigin')}
                      </label>
                      <select
                        name="origem_id"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="">{t('common.select')}</option>
                        {leadOrigins.map(origin => (
                          <option key={origin.id} value={origin.id}>{origin.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('leads.lossReason')}
                      </label>
                      <select
                        name="motivo_perda_id"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="">{t('common.select')}</option>
                        {leadLossReasons.map(reason => (
                          <option key={reason.id} value={reason.id}>
                            {reason.category} - {reason.reason}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('leads.notesLabel')}
                      </label>
                      <textarea
                        name="notas"
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                        placeholder={t('leads.notesPlaceholder')}
                      />
                    </div>
                  </div>
                </div>

                {customFields.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {t('leads.customFields')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {customFields.map(field => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            {field.field_name}
                          </label>
                          {field.field_type === 'text' && (
                            <input
                              name={`custom_field_${field.id}`}
                              type="text"
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          )}
                          {field.field_type === 'number' && (
                            <input
                              name={`custom_field_${field.id}`}
                              type="number"
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          )}
                          {field.field_type === 'select' && (
                            <select
                              name={`custom_field_${field.id}`}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">{t('common.select')}</option>
                              {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                          {field.field_type === 'date' && (
                            <input
                              name={`custom_field_${field.id}`}
                              type="date"
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                  >
                    {t('leads.newLead')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
