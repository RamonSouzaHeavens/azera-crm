import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Loader, ClipboardList, Search, ArrowUpDown, Grid3X3, List, ChevronDown,
  Calendar, Clock, User, AlertCircle, CheckCircle2, Circle, Flag, Kanban, Timer, Users
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { checkAndUnlockAchievements } from '../../services/achievementService'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface Tarefa {
  id: string
  tenant_id: string
  titulo: string
  descricao: string | null
  status: string | null
  prioridade: string | null
  cliente_id: string | null
  produto_id: string | null
  responsavel_id: string | null
  responsavel_nome: string | null
  equipe_id: string | null
  data_vencimento: string | null
  tempo_gasto_minutos: number | null
  estimativa_minutos: number | null
  checklist: any[] | null
  created_at: string | null
  updated_at: string | null
  cliente?: { nome: string } | null
}

interface TarefasEquipeProps {
  tenantId: string
}

type SortOption = 'newest' | 'oldest' | 'due_soon' | 'due_late' | 'priority_high' | 'priority_low' | 'title_asc' | 'title_desc'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'due_soon', label: 'Vencimento próximo' },
  { value: 'due_late', label: 'Vencimento distante' },
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'priority_high', label: 'Maior prioridade' },
  { value: 'priority_low', label: 'Menor prioridade' },
  { value: 'title_asc', label: 'Título (A-Z)' },
  { value: 'title_desc', label: 'Título (Z-A)' },
]

const priorityOrder: Record<string, number> = {
  'alta': 3,
  'media': 2,
  'baixa': 1,
}

const statusStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  'pendente': {
    bg: 'bg-amber-100 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    icon: <Circle className="w-3 h-3" />
  },
  'em_andamento': {
    bg: 'bg-blue-100 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-400',
    icon: <Clock className="w-3 h-3" />
  },
  'concluida': {
    bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  'cancelada': {
    bg: 'bg-slate-100 dark:bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-400',
    icon: <AlertCircle className="w-3 h-3" />
  },
}

const priorityStyles: Record<string, { bg: string; text: string }> = {
  'alta': { bg: 'bg-red-100 dark:bg-red-500/15', text: 'text-red-700 dark:text-red-400' },
  'media': { bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400' },
  'baixa': { bg: 'bg-slate-100 dark:bg-slate-500/15', text: 'text-slate-600 dark:text-slate-400' },
}

const formatDate = (date?: string | null) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateRelative = (date?: string | null) => {
  if (!date) return null
  const now = new Date()
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return { label: `${Math.abs(days)}d atraso`, isOverdue: true }
  if (days === 0) return { label: 'Hoje', isOverdue: false }
  if (days === 1) return { label: 'Amanhã', isOverdue: false }
  if (days <= 7) return { label: `${days} dias`, isOverdue: false }
  return { label: formatDate(date), isOverdue: false }
}

const kanbanStages = [
  { key: 'pendente', label: 'Pendente', color: '#F59E0B' },
  { key: 'em_andamento', label: 'Em Andamento', color: '#3B82F6' },
  { key: 'bloqueada', label: 'Bloqueada', color: '#EF4444' },
  { key: 'concluida', label: 'Concluída', color: '#10B981' },
]

const TarefasEquipe: React.FC<TarefasEquipeProps> = ({ tenantId }) => {
  const { user } = useAuthStore()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('due_soon')
  const [sortOpen, setSortOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('kanban')
  const [onlyMine, setOnlyMine] = useState(false)
  const [filters, setFilters] = useState<{
    status?: string
    prioridade?: string
    responsavel?: string
    dateFrom?: string
    dateTo?: string
  }>({})

  const loadTarefas = useCallback(async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('tarefas')
        .select(`
          id, tenant_id, titulo, descricao, status, prioridade,
          cliente_id, produto_id, responsavel_id, responsavel_nome,
          equipe_id, data_vencimento, tempo_gasto_minutos, estimativa_minutos,
          checklist, created_at, updated_at,
          cliente:clientes(nome)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Helper para parsear checklist
      const parseChecklist = (data: unknown): any[] | null => {
        if (!data) return null
        if (Array.isArray(data)) return data
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data)
            return Array.isArray(parsed) ? parsed : null
          } catch {
            return null
          }
        }
        return null
      }

      // Processar dados para normalizar o cliente e checklist
      const processedData = (data || []).map(t => ({
        ...t,
        cliente: Array.isArray(t.cliente) ? t.cliente[0] : t.cliente,
        checklist: parseChecklist(t.checklist)
      })) as Tarefa[]

      setTarefas(processedData)
    } catch (err) {
      console.error('Erro ao carregar tarefas da equipe:', err)
      toast.error('Erro ao carregar tarefas')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadTarefas()
  }, [loadTarefas])

  const responsaveis = useMemo(() => {
    const set = new Set<string>()
    tarefas.forEach(t => {
      if (t.responsavel_nome) set.add(t.responsavel_nome)
    })
    return Array.from(set).sort()
  }, [tarefas])

  const filteredAndSorted = useMemo(() => {
    let result = tarefas.filter(t => {
      // Filtro "Associados a mim"
      if (onlyMine && user?.id && t.responsavel_id !== user.id) return false

      // text search
      if (q) {
        const text = q.toLowerCase()
        const matchText = (t.titulo || '').toLowerCase().includes(text) ||
          (t.descricao || '').toLowerCase().includes(text) ||
          (t.responsavel_nome || '').toLowerCase().includes(text)
        if (!matchText) return false
      }

      // status filter
      if (filters.status && filters.status !== '' && t.status !== filters.status) return false

      // prioridade filter
      if (filters.prioridade && filters.prioridade !== '' && t.prioridade !== filters.prioridade) return false

      // responsavel filter
      if (filters.responsavel && filters.responsavel !== '' && t.responsavel_nome !== filters.responsavel) return false

      // date range
      if (filters.dateFrom && t.data_vencimento) {
        const due = new Date(t.data_vencimento).setHours(0, 0, 0, 0)
        const from = new Date(filters.dateFrom).setHours(0, 0, 0, 0)
        if (due < from) return false
      }
      if (filters.dateTo && t.data_vencimento) {
        const due = new Date(t.data_vencimento).setHours(0, 0, 0, 0)
        const to = new Date(filters.dateTo).setHours(23, 59, 59, 999)
        if (due > to) return false
      }

      return true
    })

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        case 'due_soon':
          if (!a.data_vencimento && !b.data_vencimento) return 0
          if (!a.data_vencimento) return 1
          if (!b.data_vencimento) return -1
          return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
        case 'due_late':
          if (!a.data_vencimento && !b.data_vencimento) return 0
          if (!a.data_vencimento) return 1
          if (!b.data_vencimento) return -1
          return new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()
        case 'priority_high':
          return (priorityOrder[b.prioridade || 'media'] || 0) - (priorityOrder[a.prioridade || 'media'] || 0)
        case 'priority_low':
          return (priorityOrder[a.prioridade || 'media'] || 0) - (priorityOrder[b.prioridade || 'media'] || 0)
        case 'title_asc':
          return (a.titulo || '').localeCompare(b.titulo || '')
        case 'title_desc':
          return (b.titulo || '').localeCompare(a.titulo || '')
        default:
          return 0
      }
    })

    return result
  }, [tarefas, q, filters, sortBy, onlyMine, user?.id])

  // Função para mover tarefa no Kanban (apenas tarefas do próprio usuário)
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination || !tenantId) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Encontrar a tarefa que está sendo movida
    const tarefaToMove = tarefas.find(t => t.id === draggableId)
    if (!tarefaToMove) return

    // Verificar se o usuário pode mover esta tarefa (apenas suas próprias)
    if (tarefaToMove.responsavel_id !== user?.id) {
      toast.error('Você só pode mover tarefas associadas a você')
      return
    }

    try {
      const newStatus = destination.droppableId

      // Verificar se foi concluída
      const wasCompleted = newStatus === 'concluida' && source.droppableId !== 'concluida'

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('tarefas')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', draggableId)

      if (error) throw error

      // Se foi concluída, verificar conquistas
      if (wasCompleted && user?.id && tenantId) {
        checkAndUnlockAchievements(user.id, tenantId)
      }

      // Atualizar estado local
      setTarefas(prev => prev.map(t => (t.id === draggableId ? { ...t, status: newStatus } : t)))

      toast.success('Tarefa movida com sucesso!')
    } catch (err) {
      console.error('Erro ao mover tarefa:', err)
      toast.error('Erro ao mover tarefa')
    }
  }

  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null)
  const [showTarefaModal, setShowTarefaModal] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-['Outfit']">Tarefas da Equipe</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-full">
              {filteredAndSorted.length} tarefas
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar..."
                className="pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm w-full sm:w-48"
              />
            </div>

            {/* Filtro "Associados a mim" */}
            <button
              onClick={() => setOnlyMine(!onlyMine)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${onlyMine
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}
            >
              <User className="w-4 h-4" />
              Associados a mim
            </button>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition text-sm"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden sm:inline">{sortOptions.find(o => o.value === sortBy)?.label}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    {sortOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setSortOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm transition ${sortBy === opt.value
                          ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded transition ${viewMode === 'kanban' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                title="Kanban"
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                title="Grade"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                title="Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition text-sm"
            >
              Filtros
            </button>
          </div>
        </div>

        {/* Content */}
        {filteredAndSorted.length === 0 ? (
          <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Nenhuma tarefa encontrada.</p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* Kanban View com Drag and Drop */
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {kanbanStages.map(stage => {
                  const stageTasks = filteredAndSorted.filter(t => t.status === stage.key)

                  return (
                    <Droppable droppableId={stage.key} key={stage.key}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`w-72 flex-shrink-0 flex flex-col rounded-xl border transition-all ${
                            snapshot.isDraggingOver
                              ? 'bg-cyan-50/50 dark:bg-cyan-500/5 border-cyan-400/50'
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {/* Column Header */}
                          <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                              <span className="font-medium text-sm text-slate-700 dark:text-white">{stage.label}</span>
                            </div>
                            <span className="text-xs bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">
                              {stageTasks.length}
                            </span>
                          </div>

                          {/* Column Content */}
                          <div className="flex-1 p-2 space-y-2 max-h-[60vh] overflow-y-auto min-h-[100px]">
                            {stageTasks.map((tarefa, index) => {
                              const priorityStyle = priorityStyles[tarefa.prioridade || 'media'] || priorityStyles['media']
                              const dueInfo = formatDateRelative(tarefa.data_vencimento)
                              const canDrag = tarefa.responsavel_id === user?.id

                              return (
                                <Draggable
                                  draggableId={tarefa.id}
                                  index={index}
                                  key={tarefa.id}
                                  isDragDisabled={!canDrag}
                                >
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      onClick={() => { setSelectedTarefa(tarefa); setShowTarefaModal(true) }}
                                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                        dragSnapshot.isDragging
                                          ? 'shadow-xl border-cyan-400 bg-white dark:bg-slate-800 rotate-2'
                                          : canDrag
                                            ? 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 hover:border-cyan-400/50 hover:shadow-md'
                                            : 'bg-white/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-white/5'
                                      }`}
                                    >
                                      {/* Priority & Due Date */}
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${priorityStyle.bg} ${priorityStyle.text}`}>
                                            {tarefa.prioridade || 'Média'}
                                          </span>
                                          {canDrag && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400">
                                              Minha
                                            </span>
                                          )}
                                        </div>
                                        {dueInfo && (
                                          <span className={`text-[10px] flex items-center gap-1 ${dueInfo.isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                                            <Calendar className="w-3 h-3" />
                                            {dueInfo.label}
                                          </span>
                                        )}
                                      </div>

                                      {/* Title */}
                                      <h4 className="text-sm font-medium text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                                        {tarefa.titulo}
                                      </h4>

                                      {/* Footer */}
                                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                          {tarefa.responsavel_nome ? (
                                            <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] text-white font-bold" title={tarefa.responsavel_nome}>
                                              {tarefa.responsavel_nome[0].toUpperCase()}
                                            </div>
                                          ) : (
                                            <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center">
                                              <Users className="w-3 h-3 text-slate-400" />
                                            </div>
                                          )}
                                        </div>
                                        {tarefa.tempo_gasto_minutos ? (
                                          <div className="flex items-center gap-1 text-xs text-emerald-500">
                                            <Timer className="w-3 h-3" /> {tarefa.tempo_gasto_minutos}m
                                          </div>
                                        ) : null}
                                      </div>
                                      {!canDrag && (
                                        <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 italic">
                                          Apenas visualização
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              )
                            })}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  )
                })}
              </div>
            </div>
          </DragDropContext>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAndSorted.map(tarefa => {
              const dueInfo = formatDateRelative(tarefa.data_vencimento)
              const statusStyle = statusStyles[tarefa.status || 'pendente'] || statusStyles['pendente']
              const priorityStyle = priorityStyles[tarefa.prioridade || 'media'] || priorityStyles['media']

              return (
                <button
                  key={tarefa.id}
                  onClick={() => { setSelectedTarefa(tarefa); setShowTarefaModal(true) }}
                  className="w-full text-left rounded-xl p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-200 group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors flex-1">
                      {tarefa.titulo}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 ${priorityStyle.bg} ${priorityStyle.text}`}>
                      <Flag className="w-2.5 h-2.5" />
                      {tarefa.prioridade || 'Média'}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.icon}
                      {(tarefa.status || 'pendente').replace('_', ' ')}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 text-xs">
                    {tarefa.responsavel_nome && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{tarefa.responsavel_nome}</span>
                      </div>
                    )}
                    {tarefa.cliente && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Cliente: {tarefa.cliente.nome}</span>
                      </div>
                    )}
                    {dueInfo && (
                      <div className={`flex items-center gap-2 ${dueInfo.isOverdue ? 'text-red-500' : 'text-slate-500 dark:text-slate-500'}`}>
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>{dueInfo.label}</span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <div className="col-span-4">Título</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Prioridade</div>
              <div className="col-span-2">Responsável</div>
              <div className="col-span-2 text-right">Vencimento</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredAndSorted.map(tarefa => {
                const dueInfo = formatDateRelative(tarefa.data_vencimento)
                const statusStyle = statusStyles[tarefa.status || 'pendente'] || statusStyles['pendente']
                const priorityStyle = priorityStyles[tarefa.prioridade || 'media'] || priorityStyles['media']

                return (
                  <button
                    key={tarefa.id}
                    onClick={() => { setSelectedTarefa(tarefa); setShowTarefaModal(true) }}
                    className="w-full text-left grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                  >
                    {/* Mobile Layout */}
                    <div className="sm:hidden flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-900 dark:text-white text-sm group-hover:text-cyan-600 dark:group-hover:text-cyan-400 line-clamp-1">
                          {tarefa.titulo}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                            {(tarefa.status || 'pendente').replace('_', ' ')}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${priorityStyle.bg} ${priorityStyle.text}`}>
                            {tarefa.prioridade || 'Média'}
                          </span>
                        </div>
                      </div>
                      {dueInfo && (
                        <div className={`text-xs ${dueInfo.isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                          {dueInfo.label}
                        </div>
                      )}
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex sm:col-span-4 items-center">
                      <span className="font-medium text-slate-900 dark:text-white text-sm truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                        {tarefa.titulo}
                      </span>
                    </div>
                    <div className="hidden sm:flex sm:col-span-2 items-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.icon}
                        {(tarefa.status || 'pendente').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="hidden sm:flex sm:col-span-2 items-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${priorityStyle.bg} ${priorityStyle.text}`}>
                        <Flag className="w-2.5 h-2.5" />
                        {tarefa.prioridade || 'Média'}
                      </span>
                    </div>
                    <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-slate-600 dark:text-slate-400 truncate">
                      {tarefa.responsavel_nome || '—'}
                    </div>
                    <div className="hidden sm:flex sm:col-span-2 items-center justify-end">
                      {dueInfo ? (
                        <span className={`text-xs ${dueInfo.isOverdue ? 'text-red-500 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                          {dueInfo.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Modal de filtros */}
        {filtersOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Header */}
              <div className="border-b border-slate-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Filtros</h3>
                <button onClick={() => setFiltersOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition text-xl">✕</button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Status</label>
                    <select
                      value={filters.status || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">Todos</option>
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluida">Concluída</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Prioridade</label>
                    <select
                      value={filters.prioridade || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, prioridade: e.target.value || undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">Todas</option>
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Responsável</label>
                    <select
                      value={filters.responsavel || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, responsavel: e.target.value || undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">Todos</option>
                      {responsaveis.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Vencimento de</label>
                    <input
                      type="date"
                      value={filters.dateFrom ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Vencimento até</label>
                    <input
                      type="date"
                      value={filters.dateTo ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 dark:border-white/10 px-5 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setFilters({})}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium transition"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <TarefaDetailsModal
        tarefa={selectedTarefa}
        open={showTarefaModal}
        onClose={() => { setShowTarefaModal(false); setSelectedTarefa(null) }}
        userId={user?.id}
        onUpdate={loadTarefas}
      />
    </>
  )
}

// Modal de visualização/edição da tarefa
function TarefaDetailsModal({
  tarefa,
  open,
  onClose,
  userId,
  onUpdate
}: {
  tarefa: Tarefa | null;
  open: boolean;
  onClose: () => void;
  userId?: string;
  onUpdate?: () => void;
}) {
  const [editedTarefa, setEditedTarefa] = useState<Tarefa | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Inicializar editedTarefa quando tarefa mudar
  React.useEffect(() => {
    if (tarefa) {
      setEditedTarefa({ ...tarefa })
      setHasChanges(false)
    }
  }, [tarefa])

  if (!tarefa || !editedTarefa) return null

  // Verificar se o usuário pode editar
  const canEdit = userId && tarefa.responsavel_id === userId

  const statusStyle = statusStyles[editedTarefa.status || 'pendente'] || statusStyles['pendente']
  const priorityStyle = priorityStyles[editedTarefa.prioridade || 'media'] || priorityStyles['media']
  const dueInfo = formatDateRelative(editedTarefa.data_vencimento)

  const updateField = <K extends keyof Tarefa>(field: K, value: Tarefa[K]) => {
    setEditedTarefa(prev => prev ? { ...prev, [field]: value } : null)
    setHasChanges(true)
  }

  const toggleChecklistItem = (index: number) => {
    if (!editedTarefa.checklist) return
    const newChecklist = editedTarefa.checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    )
    updateField('checklist', newChecklist)
  }

  const handleSave = async () => {
    if (!editedTarefa || !hasChanges) return
    setSaving(true)
    try {
      // Verificar se foi marcada como concluída
      const wasCompleted = editedTarefa.status === 'concluida' && tarefa?.status !== 'concluida'

      const { error } = await supabase
        .from('tarefas')
        .update({
          status: editedTarefa.status,
          prioridade: editedTarefa.prioridade,
          descricao: editedTarefa.descricao,
          data_vencimento: editedTarefa.data_vencimento,
          checklist: editedTarefa.checklist ? JSON.stringify(editedTarefa.checklist) : null
        })
        .eq('id', editedTarefa.id)

      if (error) throw error

      // Se foi concluída, verificar conquistas
      if (wasCompleted && userId && editedTarefa.tenant_id) {
        checkAndUnlockAchievements(userId, editedTarefa.tenant_id)
      }

      toast.success('Tarefa atualizada!')
      setHasChanges(false)
      onUpdate?.()
      onClose()
    } catch (err) {
      console.error('Erro ao salvar tarefa:', err)
      toast.error('Erro ao salvar tarefa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={canEdit ? "Editar Tarefa" : "Detalhes da Tarefa"}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editedTarefa.titulo}</h3>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {canEdit ? (
              <>
                <select
                  value={editedTarefa.status || 'pendente'}
                  onChange={(e) => updateField('status', e.target.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border-none cursor-pointer ${statusStyle.bg} ${statusStyle.text}`}
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
                <select
                  value={editedTarefa.prioridade || 'media'}
                  onChange={(e) => updateField('prioridade', e.target.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border-none cursor-pointer ${priorityStyle.bg} ${priorityStyle.text}`}
                >
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </>
            ) : (
              <>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.icon}
                  {(editedTarefa.status || 'pendente').replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${priorityStyle.bg} ${priorityStyle.text}`}>
                  <Flag className="w-3 h-3" />
                  {editedTarefa.prioridade || 'Média'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Descrição</label>
          {canEdit ? (
            <textarea
              value={editedTarefa.descricao || ''}
              onChange={(e) => updateField('descricao', e.target.value)}
              className="w-full text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 rounded-lg p-3 border border-slate-200 dark:border-white/10 min-h-[80px] resize-none"
              placeholder="Adicionar descrição..."
            />
          ) : editedTarefa.descricao ? (
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-white/5 rounded-lg p-3">
              {editedTarefa.descricao}
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic">Sem descrição</div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Responsável</label>
            <div className="text-sm text-slate-900 dark:text-white">{editedTarefa.responsavel_nome || '—'}</div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Vencimento</label>
            {canEdit ? (
              <input
                type="date"
                value={editedTarefa.data_vencimento?.substring(0, 10) || ''}
                onChange={(e) => updateField('data_vencimento', e.target.value || null)}
                className="text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 rounded-lg px-2 py-1 border border-slate-200 dark:border-white/10"
              />
            ) : (
              <div className={`text-sm ${dueInfo?.isOverdue ? 'text-red-500 font-medium' : 'text-slate-900 dark:text-white'}`}>
                {editedTarefa.data_vencimento ? formatDate(editedTarefa.data_vencimento) : '—'}
                {dueInfo?.isOverdue && <span className="ml-1 text-xs">({dueInfo.label})</span>}
              </div>
            )}
          </div>

          {editedTarefa.cliente && (
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Cliente</label>
              <div className="text-sm text-slate-900 dark:text-white">{editedTarefa.cliente.nome}</div>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Criado em</label>
            <div className="text-sm text-slate-900 dark:text-white">{editedTarefa.created_at ? new Date(editedTarefa.created_at).toLocaleDateString('pt-BR') : '—'}</div>
          </div>
        </div>

        {/* Checklist */}
        {editedTarefa.checklist && editedTarefa.checklist.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-white/10">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Checklist</label>
            <div className="space-y-1">
              {editedTarefa.checklist.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {canEdit ? (
                    <button
                      onClick={() => toggleChecklistItem(index)}
                      className="flex items-center gap-2 w-full text-left hover:bg-slate-50 dark:hover:bg-white/5 p-1 rounded transition"
                    >
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className={item.done ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'}>
                        {item.texto || item.text || item.title}
                      </span>
                    </button>
                  ) : (
                    <>
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400" />
                      )}
                      <span className={item.done ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'}>
                        {item.texto || item.text || item.title}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
        <button
          onClick={onClose}
          className="py-2 px-4 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition font-medium text-sm"
        >
          {canEdit ? 'Cancelar' : 'Fechar'}
        </button>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="py-2 px-4 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </button>
        )}
      </div>
    </Modal>
  )
}

export default TarefasEquipe

