import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus, Grid3X3, Kanban, Search, X, AlarmClock, CalendarDays,
  Users, Tag, ListChecks, Check, Timer, Trash2, FileText,
  ChevronDown, ChevronUp, Filter, Settings, Edit, GripVertical
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import toast from 'react-hot-toast'
import { useState, useMemo, useCallback, useEffect } from 'react'

// Importações do projeto (Mantenha seus caminhos corretos)
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { addResponsavel } from '../services/responsavelService'
import { TaskAttachments } from '../components/team/TaskAttachments'
import { loadTaskStages, createTaskStage, updateTaskStage, deleteTaskStage } from '../services/taskPipelineService'
import { getTeamOverview } from '../services/equipeService'
import { checkAndUnlockAchievements } from '../services/achievementService'

// =====================
// Tipos
// =====================
export type TaskStatus = string
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente'

interface ClienteRef { id: string; nome: string }
interface ProdutoRef { id: string; nome: string }
interface UsuarioRef { id: string; display_name: string | null }
interface EquipeRef { id: string; nome: string }

interface ChecklistItem {
  id: string
  texto: string
  done: boolean
  ordem?: number
}

interface Tarefa {
  id: string
  tenant_id: string
  titulo: string
  descricao: string | null
  status: TaskStatus
  prioridade: TaskPriority
  cliente_id: string | null
  produto_id: string | null
  responsavel_id: string | null
  equipe_id: string | null
  data_vencimento: string | null // ISO
  created_at: string
  updated_at: string
  process_id: string | null

  // Campos opcionais/calculados
  tempo_gasto_minutos?: number | null
  estimativa_minutos?: number | null
  checklist?: ChecklistItem[] | null

  // Relacionamentos expandidos
  cliente?: ClienteRef | null
  produto?: ProdutoRef | null
  responsavel?: UsuarioRef | null
  responsavel_nome?: string | null
  equipe?: EquipeRef | null
  processo?: { id: string; title: string } | null
}

interface Filtros {
  q?: string
  status?: TaskStatus | 'todos'
  prioridade?: TaskPriority | 'todas'
  clienteId?: string | 'todos'
  produtoId?: string | 'todos'
  responsavelId?: string | 'todos'
  equipeId?: string | 'todas'
  dueFrom?: string
  dueTo?: string
}

// =====================
// Paleta / UI Maps
// =====================
const STATUS_MAP: Record<string, { labelKey: string; bg: string; text: string; ring: string; dot: string }> = {
  pendente: { labelKey: 'tasks.status.pending', bg: 'bg-white/10', text: 'text-slate-900 dark:text-slate-200', ring: 'ring-indigo-500/30', dot: 'bg-indigo-400' },
  em_andamento: { labelKey: 'tasks.status.inProgress', bg: 'bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-200', ring: 'ring-cyan-500/30', dot: 'bg-cyan-400' },
  bloqueada: { labelKey: 'tasks.status.blocked', bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-200', ring: 'ring-rose-500/30', dot: 'bg-rose-400' },
  concluida: { labelKey: 'tasks.status.completed', bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-200', ring: 'ring-emerald-500/30', dot: 'bg-emerald-400' },
}

// Fallback para status customizados que não estão no mapa
const getStatusStyle = (statusKey: string) => {
  return STATUS_MAP[statusKey] || {
    labelKey: statusKey,
    bg: 'bg-slate-500/10',
    text: 'text-slate-700 dark:text-slate-200',
    ring: 'ring-slate-500/30',
    dot: 'bg-slate-400'
  }
}

const PRIORITY_MAP: Record<TaskPriority, { labelKey: string; pill: string }> = {
  baixa: { labelKey: 'tasks.priority.low', pill: 'bg-white/10 text-slate-900 dark:text-slate-300' },
  media: { labelKey: 'tasks.priority.medium', pill: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-200' },
  alta: { labelKey: 'tasks.priority.high', pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-200' },
  urgente: { labelKey: 'tasks.priority.urgent', pill: 'bg-rose-600/10 text-rose-700 dark:text-rose-200' },
}

// =====================
// Página Principal
// =====================
export default function Tarefas() {
  const navigate = useNavigate()
  const { t: t18n } = useTranslation()
  const { tenant, member, user } = useAuthStore()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])

  const [loading, setLoading] = useState(true)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])

  const [view, setView] = useState<'grid' | 'kanban'>('kanban')
  const [filtros, setFiltros] = useState<Filtros>({ status: 'todos', prioridade: 'todas', clienteId: 'todos', produtoId: 'todos', responsavelId: 'todos', equipeId: 'todas' })
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Dados auxiliares para selects
  const [clientes, setClientes] = useState<ClienteRef[]>([])
  const [produtos, setProdutos] = useState<ProdutoRef[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioRef[]>([])
  const [equipes, setEquipes] = useState<EquipeRef[]>([])
  const [responsaveisCustomizados, setResponsaveisCustomizados] = useState<string[]>([])

  // Estado UI
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<Tarefa | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showChecklist, setShowChecklist] = useState(true)
  const [showCustomResponsavel, setShowCustomResponsavel] = useState(false)

  // Task Stages (Kanban)
  const [taskStages, setTaskStages] = useState<Array<{ id?: string; key: string, label: string, color: string }>>([
    { key: 'pendente', label: 'Pendente', color: '#8B5CF6' },
    { key: 'em_andamento', label: 'Em Progresso', color: '#06B6D4' },
    { key: 'bloqueada', label: 'Bloqueada', color: '#EF4444' },
    { key: 'concluida', label: 'Concluída', color: '#10B981' }
  ])
  const [showTaskStagesSettings, setShowTaskStagesSettings] = useState(false)
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null)
  const [editingStageName, setEditingStageName] = useState('')
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6366F1')
  const [stageToDelete, setStageToDelete] = useState<{ index: number; label: string } | null>(null)

  // Modal de Tempo
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [timeInput, setTimeInput] = useState('30')

  // =====================
  // Helpers
  // =====================
  const parseChecklist = (data: unknown): ChecklistItem[] => {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(data) ? data : [];
  }

  // =====================
  // Carregamento de Dados
  // =====================
  const loadClientes = useCallback(async () => {
    if (!tenantId) return
    const { data, error } = await supabase.from('clientes').select('id, nome').eq('tenant_id', tenantId).order('nome')
    if (!error) setClientes(data ?? [])
  }, [tenantId])

  const loadProdutos = useCallback(async () => {
    if (!tenantId) return
    const { data, error } = await supabase.from('produtos').select('id, nome').eq('tenant_id', tenantId).order('nome')
    if (!error) setProdutos(data ?? [])
  }, [tenantId])

  const loadUsuarios = useCallback(async () => {
    if (!tenantId) return
    try {
      const overview = await getTeamOverview()

      if (overview?.members && overview.members.length > 0) {
        setUsuarios(overview.members.map((m: any) => ({
          id: m.user_id || m.id,
          display_name: m.nome || m.email || 'Usuário'
        })))
      } else {
        // Fallback: usar usuário atual
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          setUsuarios([{ id: user.id, display_name: user.email || 'Você' }])
        } else {
          setUsuarios([])
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar usuários:', err)
      // Fallback em caso de erro
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        setUsuarios([{ id: user.id, display_name: user.email || 'Você' }])
      } else {
        setUsuarios([])
      }
    }
  }, [tenantId])

  const loadResponsaveisCustomizados = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('tarefas')
      .select('responsavel_nome')
      .eq('tenant_id', tenantId)
      .not('responsavel_nome', 'is', null)

    if (data) {
      const unique = [...new Set(data.map(t => t.responsavel_nome).filter(Boolean))] as string[]
      setResponsaveisCustomizados(unique)
    }
  }, [tenantId])

  const loadEquipes = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase.from('equipes').select('id, nome').eq('tenant_id', tenantId).order('nome')
    setEquipes(data || [])
  }, [tenantId])

  // =====================
  // Query de Tarefas
  // =====================
  const applyQueryFilters = (query: any, f: Filtros) => {
    if (f.q?.trim()) query = query.ilike('titulo', `%${f.q}%`)
    if (f.status && f.status !== 'todos') query = query.eq('status', f.status)
    if (f.prioridade && f.prioridade !== 'todas') query = query.eq('prioridade', f.prioridade)
    if (f.clienteId && f.clienteId !== 'todos') query = query.eq('cliente_id', f.clienteId)
    if (f.produtoId && f.produtoId !== 'todos') query = query.eq('produto_id', f.produtoId)

    if (f.responsavelId && f.responsavelId !== 'todos') {
      if (f.responsavelId.startsWith('custom:')) {
        query = query.eq('responsavel_nome', f.responsavelId.replace('custom:', ''))
      } else {
        query = query.eq('responsavel_id', f.responsavelId)
      }
    }

    if (f.equipeId && f.equipeId !== 'todas') query = query.eq('equipe_id', f.equipeId)
    if (f.dueFrom) query = query.gte('data_vencimento', f.dueFrom)
    if (f.dueTo) query = query.lte('data_vencimento', f.dueTo)

    return query
  }

  const loadTarefas = useCallback(async (f?: Filtros) => {
    if (!tenantId) return
    setLoading(true)
    try {
      let q = supabase.from('tarefas')
        .select(`
          id,tenant_id,titulo,descricao,status,prioridade,
          cliente_id,produto_id,responsavel_id,responsavel_nome,
          data_vencimento,process_id,tempo_gasto_minutos,
          created_at,updated_at, checklist, estimativa_minutos,
          cliente:clientes(id, nome),
          produto:produtos(id, nome),
          equipe:equipes(id, nome)
          // Se tiver relacionamento real com usuarios, adicione aqui, senão tratamos manual
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      q = applyQueryFilters(q, f ?? filtros)

      const { data, error } = await q
      if (error) throw error

      const tasksMapped = (data ?? []).map((t: any) => ({
        ...t,
        checklist: parseChecklist(t.checklist),
        // Mapeamento manual de usuário se não vier do join
        responsavel: usuarios.find(u => u.id === t.responsavel_id) || null
      }))

      setTarefas(tasksMapped as Tarefa[])
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err)
      toast.error('Erro ao carregar tarefas')
    } finally {
      setLoading(false)
    }
  }, [tenantId, filtros, usuarios])

  useEffect(() => {
    loadClientes(); loadProdutos(); loadUsuarios(); loadEquipes(); loadResponsaveisCustomizados();
  }, [loadClientes, loadProdutos, loadUsuarios, loadEquipes, loadResponsaveisCustomizados])

  useEffect(() => { loadTarefas() }, [loadTarefas])

  // Carregar Stages do Banco
  useEffect(() => {
    const loadStages = async () => {
      if (!tenant?.id) return
      try {
        const stages = await loadTaskStages(tenant.id)
        if (stages && stages.length > 0) {
          setTaskStages(stages.map(s => ({
            id: s.id, key: s.key, label: s.label, color: s.color
          })))
        }
      } catch (err) {
        console.error('[ERROR] loadTaskStages:', err)
      }
    }
    loadStages()
  }, [tenant?.id])

  // =====================
  // Ações de Tarefa
  // =====================
  const handleAddTask = () => navigate('/app/tarefa-nova')

  const openTask = (id: string) => {
    const t = tarefas.find(x => x.id === id)
    if (t) {
      setDetalhe(t)
      setHasUnsavedChanges(false)
    }
    setOpenTaskId(id)
  }

  const closeTask = () => {
    if (hasUnsavedChanges && !window.confirm('Descartar alterações não salvas?')) return
    setOpenTaskId(null)
    setDetalhe(null)
    setHasUnsavedChanges(false)
    setShowCustomResponsavel(false)
  }

  const updateDetalhe = (updates: Partial<Tarefa>) => {
    if (!detalhe) return
    setDetalhe({ ...detalhe, ...updates })
    setHasUnsavedChanges(true)
  }

  const handleSaveTask = async () => {
    if (!detalhe) return
    // Guardar status anterior para verificar se foi concluída
    const previousStatus = tarefas.find(t => t.id === detalhe.id)?.status
    try {
      const updates: any = {
        titulo: detalhe.titulo,
        descricao: detalhe.descricao,
        status: detalhe.status,
        prioridade: detalhe.prioridade,
        cliente_id: detalhe.cliente_id,
        produto_id: detalhe.produto_id,
        responsavel_id: detalhe.responsavel_id,
        responsavel_nome: detalhe.responsavel_nome,
        data_vencimento: detalhe.data_vencimento,
        checklist: JSON.stringify(detalhe.checklist || []), // Garante string se for JSON text
        tempo_gasto_minutos: detalhe.tempo_gasto_minutos,
        estimativa_minutos: detalhe.estimativa_minutos,
      }

      const { error } = await supabase.from('tarefas').update(updates).eq('id', detalhe.id)
      if (error) throw error

      // Se foi marcada como concluída, verificar conquistas
      if (detalhe.status === 'concluida' && previousStatus !== 'concluida' && user?.id && tenantId) {
        checkAndUnlockAchievements(user.id, tenantId)
      }

      toast.success('Tarefa salva!')
      setHasUnsavedChanges(false)
      loadTarefas(filtros)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar')
    }
  }

  const handleUpdateTask = async (id: string, updates: Partial<Tarefa>) => {
    // Guardar status anterior para verificar se foi concluída
    const previousTask = tarefas.find(t => t.id === id)
    try {
      // Limpeza de campos undefined e tratamento de JSON
      const cleanUpdates: any = {}
      Object.keys(updates).forEach((key) => {
        const k = key as keyof Tarefa
        const val = updates[k]
        if (val !== undefined) {
          if (k === 'checklist') cleanUpdates[k] = JSON.stringify(val)
          else cleanUpdates[k] = val
        }
      })

      const { error } = await supabase.from('tarefas').update(cleanUpdates).eq('id', id)
      if (error) throw error

      // Se foi marcada como concluída, verificar conquistas
      if (updates.status === 'concluida' && previousTask?.status !== 'concluida' && user?.id && tenantId) {
        checkAndUnlockAchievements(user.id, tenantId)
      }

      // Atualização otimista local
      setTarefas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
      if (detalhe?.id === id) setDetalhe(prev => prev ? { ...prev, ...updates } : null)

    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar')
      loadTarefas() // Reverte em caso de erro
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return
    try {
      const { error } = await supabase.from('tarefas').delete().eq('id', id)
      if (error) throw error
      setTarefas(prev => prev.filter(t => t.id !== id))
      if (detalhe?.id === id) closeTask()
      toast.success('Tarefa excluída')
    } catch (err) {
      toast.error('Erro ao excluir')
    }
  }

  // =====================
  // Lógica Kanban e DragDrop
  // =====================
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination, source } = result

    // Se mudou de coluna
    if (destination.droppableId !== source.droppableId) {
      const newStatus = destination.droppableId as TaskStatus
      handleUpdateTask(draggableId, { status: newStatus })
    }
    // TODO: Se mudou de índice na mesma coluna (implementar ordenação no backend futuramente)
  }

  const byStatus = (s: string) => tarefas.filter(t => t.status === s)

  // =====================
  // Checklist & Tempo
  // =====================
  const addChecklistItem = () => {
    if (!detalhe) return
    const items = detalhe.checklist ?? []
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      texto: 'Novo item',
      done: false,
      ordem: items.length
    }
    updateDetalhe({ checklist: [...items, newItem] })
  }

  const toggleChecklist = (itemId: string) => {
    if (!detalhe?.checklist) return
    const next = detalhe.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
    updateDetalhe({ checklist: next })
  }

  const removeChecklistItem = (itemId: string) => {
    if (!detalhe?.checklist) return
    const next = detalhe.checklist.filter(i => i.id !== itemId)
    updateDetalhe({ checklist: next })
  }

  const editChecklistText = (itemId: string, texto: string) => {
    if (!detalhe?.checklist) return
    const next = detalhe.checklist.map(i => i.id === itemId ? { ...i, texto } : i)
    updateDetalhe({ checklist: next })
  }

  const reorderChecklist = (result: DropResult) => {
    if (!result.destination || !detalhe?.checklist) return
    if (result.source.index === result.destination.index) return

    const items = Array.from(detalhe.checklist)
    const [removed] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, removed)

    // Atualizar ordem
    const reordered = items.map((item, idx) => ({ ...item, ordem: idx }))
    updateDetalhe({ checklist: reordered })
  }

  const addTempoGasto = () => setShowTimeModal(true)

  const confirmAddTime = () => {
    if (!detalhe) return
    const min = parseInt(timeInput)
    if (isNaN(min) || min <= 0) {
      toast.error('Valor inválido')
      return
    }
    const current = detalhe.tempo_gasto_minutos ?? 0
    updateDetalhe({ tempo_gasto_minutos: current + min })
    setShowTimeModal(false)
    setTimeInput('30')
  }

  // =====================
  // Gestão de Stages
  // =====================
  const startEditStage = (index: number) => {
    setEditingStageIndex(index)
    setEditingStageName(taskStages[index]?.label ?? '')
  }

  const saveEditStage = async (index: number) => {
    if (!editingStageName.trim()) return
    const stage = taskStages[index]

    // Local update
    const updated = [...taskStages]
    updated[index].label = editingStageName
    setTaskStages(updated)
    setEditingStageIndex(null)

    // DB update
    if (stage.id) {
      try { await updateTaskStage(stage.id, { label: editingStageName }) }
      catch (e) { toast.error('Erro ao salvar nome da etapa') }
    }
  }

  const cancelEditStage = () => {
    setEditingStageIndex(null)
    setEditingStageName('')
  }

  // =====================
  // Render
  // =====================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-[#0C1326]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background text-slate-900 dark:text-slate-200 overflow-hidden relative">

      {/* Background Decorativo (HUD glow grid background + overlay) */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:120px_120px]" />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">

        {/* Header & Filtros */}
        <header className="p-6 border-b border-slate-200 dark:border-white/10 bg-transparent backdrop-blur-sm">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <ListChecks className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold font-outfit text-slate-900 dark:text-white">{t18n('tasks.titlePage')}</h1>
                  <p className="text-base mt-1 text-slate-600 dark:text-slate-400">Gerencie o fluxo de trabalho</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t18n('tasks.searchPlaceholder')}
                    value={filtros.q ?? ''}
                    onChange={e => setFiltros(p => ({ ...p, q: e.target.value }))}
                    className="pl-10 pr-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>

                <button onClick={() => setFiltersOpen(!filtersOpen)} className={`p-2 rounded-xl border ${filtersOpen ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                  <Filter className="w-5 h-5" />
                </button>

                <div className="h-6 w-px bg-slate-300 dark:bg-white/20 mx-1" />

                <button onClick={() => setView('grid')} className={`p-2 rounded-xl transition ${view === 'grid' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button onClick={() => setView('kanban')} className={`p-2 rounded-xl transition ${view === 'kanban' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                  <Kanban className="w-5 h-5" />
                </button>

                <button onClick={() => setShowTaskStagesSettings(true)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500">
                  <Settings className="w-5 h-5" />
                </button>

                <button onClick={handleAddTask} className="ml-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 transition">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t18n('tasks.newTask')}</span>
                </button>
              </div>
            </div>

            {/* Painel de Filtros Expandido */}
            {filtersOpen && (
              <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                {/* Exemplo de filtro: Status */}
                <div>
                  <label className="text-xs font-medium mb-1 block">Status</label>
                  <select
                    value={filtros.status}
                    onChange={e => setFiltros({ ...filtros, status: e.target.value })}
                    className="w-full p-2 rounded-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm"
                  >
                    <option value="todos">Todos</option>
                    {taskStages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                {/* Botão limpar filtros */}
                <div className="flex items-end">
                  <button
                    onClick={() => setFiltros({ status: 'todos', prioridade: 'todas', clienteId: 'todos', produtoId: 'todos', responsavelId: 'todos', equipeId: 'todas' })}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* View Area */}
        <div className="flex-1 overflow-hidden">
          {view === 'grid' ? (
            <div className="h-full overflow-auto p-6">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-100 dark:bg-white/5 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 rounded-tl-lg">Tarefa</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Responsável</th>
                    <th className="px-6 py-3">Prioridade</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 rounded-tr-lg">Vencimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {tarefas.map(t => (
                    <tr key={t.id} className="bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition cursor-pointer" onClick={() => openTask(t.id)}>
                      <td className="px-6 py-4 font-medium">{t.titulo}</td>
                      <td className="px-6 py-4 text-slate-500">{t.cliente?.nome || '-'}</td>
                      <td className="px-6 py-4 text-slate-500">{t.responsavel?.display_name || t.responsavel_nome || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${PRIORITY_MAP[t.prioridade]?.pill}`}>
                          {t18n(PRIORITY_MAP[t.prioridade]?.labelKey)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusStyle(t.status).dot.replace('bg-', '') /* Hack simples ou use style inline real */ }} />
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{t.data_vencimento ? new Date(t.data_vencimento).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tarefas.length === 0 && <div className="p-10 text-center text-slate-500">Nenhuma tarefa encontrada.</div>}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="h-full overflow-x-auto overflow-y-hidden p-6">
                <div className="flex gap-6 h-full min-w-max">
                  {taskStages.map(stage => (
                    <div key={stage.key} className="w-80 flex flex-col h-full rounded-2xl bg-transparent border border-slate-200 dark:border-white/5">
                      {/* Header da Coluna */}
                      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-transparent rounded-t-2xl backdrop-blur-sm">
                        <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                          {stage.label}
                          <span className="text-xs bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-500">
                            {byStatus(stage.key).length}
                          </span>
                        </div>
                      </div>

                      {/* Área Droppable */}
                      <Droppable droppableId={stage.key}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto p-3 space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-500/5' : ''}`}
                          >
                            {byStatus(stage.key).map((t, index) => (
                              <Draggable key={t.id} draggableId={t.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => openTask(t.id)}
                                    className={`
                                      p-4 rounded-xl bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm
                                      hover:shadow-md hover:border-indigo-500/30 transition-all cursor-grab group
                                      ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl ring-2 ring-indigo-500 z-50' : ''}
                                    `}
                                    style={provided.draggableProps.style}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <span className={`text-[10px] px-2 py-0.5 rounded ${PRIORITY_MAP[t.prioridade].pill}`}>
                                        {t18n(PRIORITY_MAP[t.prioridade].labelKey)}
                                      </span>
                                      {t.data_vencimento && (
                                        <span className="text-[10px] flex items-center gap-1 text-slate-400">
                                          <CalendarDays className="w-3 h-3" />
                                          {new Date(t.data_vencimento).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-1 line-clamp-2">{t.titulo}</h4>

                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                                      <div className="flex items-center gap-2">
                                        {t.responsavel?.display_name || t.responsavel_nome ? (
                                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold" title={t.responsavel?.display_name || t.responsavel_nome || ''}>
                                            {(t.responsavel?.display_name || t.responsavel_nome || '?')[0].toUpperCase()}
                                          </div>
                                        ) : (
                                          <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center">
                                            <Users className="w-3 h-3 text-slate-400" />
                                          </div>
                                        )}
                                      </div>
                                      {t.tempo_gasto_minutos ? (
                                        <div className="flex items-center gap-1 text-xs text-emerald-500">
                                          <Timer className="w-3 h-3" /> {t.tempo_gasto_minutos}m
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </div>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* =====================
          Drawer: Detalhes
          ===================== */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white dark:bg-[#0C1326] shadow-2xl transform transition-transform duration-300 z-40 border-l border-slate-200 dark:border-white/10 ${openTaskId ? 'translate-x-0' : 'translate-x-full'}`}>
        {detalhe && (
          <div className="h-full flex flex-col">
            {/* Header Drawer */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
              <div className="flex items-center gap-2 text-slate-500">
                <FileText className="w-5 h-5" />
                <span className="text-sm font-mono opacity-50">#{detalhe.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <button onClick={handleSaveTask} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition">
                    <Check className="w-4 h-4" /> Salvar
                  </button>
                )}
                <button onClick={closeTask} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body Drawer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Titulo e Descrição */}
              <div className="space-y-4">
                <input
                  value={detalhe.titulo}
                  onChange={e => updateDetalhe({ titulo: e.target.value })}
                  className="w-full text-xl font-bold bg-transparent border-none focus:ring-0 placeholder-slate-400 p-0"
                  placeholder="Título da Tarefa"
                />
                <textarea
                  value={detalhe.descricao || ''}
                  onChange={e => updateDetalhe({ descricao: e.target.value })}
                  className="w-full min-h-[100px] bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-sm border-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  placeholder="Adicione uma descrição..."
                />
              </div>

              {/* Propriedades em Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 font-medium ml-1">Status</label>
                  <select
                    value={detalhe.status}
                    onChange={e => updateDetalhe({ status: e.target.value })}
                    className="w-full mt-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    {taskStages.map(s => <option key={s.key} value={s.key} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium ml-1">Prioridade</label>
                  <select
                    value={detalhe.prioridade}
                    onChange={e => updateDetalhe({ prioridade: e.target.value as TaskPriority })}
                    className="w-full mt-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="baixa" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Baixa</option>
                    <option value="media" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Média</option>
                    <option value="alta" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Alta</option>
                    <option value="urgente" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium ml-1">Responsável</label>
                  {showCustomResponsavel ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        value={detalhe.responsavel_nome || ''}
                        onChange={e => updateDetalhe({ responsavel_nome: e.target.value, responsavel_id: null })}
                        className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
                        placeholder="Nome manual"
                        autoFocus
                      />
                      <button onClick={() => setShowCustomResponsavel(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <select
                      value={detalhe.responsavel_id || ''}
                      onChange={e => {
                        if (e.target.value === 'custom') {
                          setShowCustomResponsavel(true)
                        } else {
                          updateDetalhe({ responsavel_id: e.target.value || null, responsavel_nome: null })
                        }
                      }}
                      className="w-full mt-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100"
                    >
                      <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Sem responsável</option>
                      {usuarios.map(u => <option key={u.id} value={u.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{u.display_name}</option>)}
                      <option value="custom" className="bg-white dark:bg-slate-800 font-semibold text-indigo-600 dark:text-indigo-400">+ Outro (Manual)</option>
                      {detalhe.responsavel_nome && <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{detalhe.responsavel_nome} (Manual)</option>}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium ml-1">Prazo</label>
                  <input
                    type="date"
                    value={detalhe.data_vencimento ? detalhe.data_vencimento.substring(0, 10) : ''}
                    onChange={e => updateDetalhe({ data_vencimento: e.target.value || null })}
                    className="w-full mt-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="h-px bg-slate-200 dark:bg-white/5" />

              {/* Checklist com Drag and Drop */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><ListChecks className="w-4 h-4 text-indigo-500" /> Checklist</h3>
                  <button onClick={addChecklistItem} className="text-xs text-indigo-500 hover:underline">+ Adicionar Item</button>
                </div>
                <DragDropContext onDragEnd={reorderChecklist}>
                  <Droppable droppableId="checklist-items">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {detalhe.checklist?.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-2 group p-2 rounded-lg transition-colors ${snapshot.isDragging
                                  ? 'bg-indigo-50 dark:bg-indigo-900/30 shadow-lg ring-2 ring-indigo-500/50'
                                  : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                  }`}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-500 transition-colors"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  onChange={() => toggleChecklist(item.id)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <input
                                  value={item.texto}
                                  onChange={e => editChecklistText(item.id, e.target.value)}
                                  className={`flex-1 bg-transparent border-none text-sm p-1 focus:ring-0 ${item.done ? 'line-through text-slate-400' : ''}`}
                                />
                                <button
                                  onClick={() => removeChecklistItem(item.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
                {(!detalhe.checklist || detalhe.checklist.length === 0) && (
                  <p className="text-xs text-slate-400 italic mt-2">Nenhum item na lista.</p>
                )}
              </div>

              <div className="h-px bg-slate-200 dark:bg-white/5" />

              {/* Anexos */}
              <div className="min-h-[100px]">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Tag className="w-4 h-4 text-indigo-500" /> Anexos</h3>
                <TaskAttachments tarefaId={detalhe.id} />
              </div>

              {/* Rodapé: Tempo e Exclusão */}
              <div className="flex items-center justify-between pt-6 mt-auto">
                <div className="flex items-center gap-4">
                  <button onClick={addTempoGasto} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition text-sm">
                    <AlarmClock className="w-4 h-4 text-slate-500" />
                    <span>{detalhe.tempo_gasto_minutos || 0} min</span>
                  </button>
                </div>
                <button onClick={() => handleDeleteTask(detalhe.id)} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg" title="Excluir">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================
          Modal: Configuração de Etapas (Stages)
          ===================== */}
      {showTaskStagesSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-white/10">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> Configurar Kanban</h2>

            <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2">
              {taskStages.map((stage, idx) => (
                <div key={stage.key || idx} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                  {editingStageIndex === idx ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        value={editingStageName}
                        onChange={e => setEditingStageName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20"
                      />
                      <button onClick={() => saveEditStage(idx)} className="text-emerald-500"><Check className="w-4 h-4" /></button>
                      <button onClick={cancelEditStage} className="text-slate-500"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium text-sm">{stage.label}</span>
                      <div className="flex gap-1">
                        <button onClick={() => startEditStage(idx)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded"><Edit className="w-3.5 h-3.5 text-slate-500" /></button>
                        {/* Opcional: delete stage */}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Adicionar nova (simplificado) */}
            <div className="flex gap-2 mb-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
              <input
                placeholder="Nome da nova coluna"
                value={newStageName}
                onChange={e => setNewStageName(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm focus:ring-0"
              />
              <input
                type="color"
                value={newStageColor}
                onChange={e => setNewStageColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <button
                onClick={async () => {
                  if (!newStageName) return
                  const newKey = newStageName.toLowerCase().replace(/\s/g, '_')
                  await createTaskStage({ tenant_id: tenantId, key: newKey, label: newStageName, color: newStageColor, order: taskStages.length })
                  setTaskStages([...taskStages, { key: newKey, label: newStageName, color: newStageColor }])
                  setNewStageName('')
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                Adicionar
              </button>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setShowTaskStagesSettings(false)} className="px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-lg text-sm font-medium">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* =====================
          Modal: Apontamento de Tempo
          ===================== */}
      {showTimeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Timer className="w-5 h-5 text-emerald-500" /> Apontar Tempo</h3>

            <div className="flex items-center gap-2 mb-6">
              <input
                type="number"
                min="1"
                value={timeInput}
                onChange={e => setTimeInput(e.target.value)}
                className="flex-1 text-center text-2xl font-bold p-3 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-500 outline-none"
                autoFocus
              />
              <span className="text-slate-500 font-medium">minutos</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowTimeModal(false)} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition font-medium text-slate-600 dark:text-slate-300">
                Cancelar
              </button>
              <button onClick={confirmAddTime} className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition shadow-lg shadow-emerald-500/20">
                Confirmar
              </button>
            </div>

            {/* Sugestões rápidas */}
            <div className="flex gap-2 justify-center mt-4">
              {[15, 30, 60, 120].map(m => (
                <button key={m} onClick={() => setTimeInput(String(m))} className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 transition">
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
