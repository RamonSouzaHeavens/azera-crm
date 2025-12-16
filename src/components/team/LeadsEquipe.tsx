import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Loader, Users, Search, ArrowUpDown, Grid3X3, List, ChevronDown, Mail, Phone, Calendar, User, Kanban as KanbanIcon } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { getLeadsEquipe, LeadEquipe } from '../../services/leadsEquipeService'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { loadPipelineStages } from '../../services/pipelineService'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

const currencyBRL = (value?: number | null) => {
  if (value === null || value === undefined) return '—'
  try {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return '—'
  }
}

const formatDate = (date?: string | null) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface LeadsEquipeProps {
  tenantId: string
}

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'value_high' | 'value_low'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'name_asc', label: 'Nome (A-Z)' },
  { value: 'name_desc', label: 'Nome (Z-A)' },
  { value: 'value_high', label: 'Maior valor' },
  { value: 'value_low', label: 'Menor valor' },
]

const LeadsEquipe: React.FC<LeadsEquipeProps> = ({ tenantId }) => {
  const { user } = useAuthStore()
  const [leads, setLeads] = useState<LeadEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('kanban')
  const [onlyMine, setOnlyMine] = useState(false)
  const [filters, setFilters] = useState<{
    status?: string
    valorMin?: number | undefined
    valorMax?: number | undefined
    tarefasMin?: number | undefined
    dateFrom?: string | undefined
    dateTo?: string | undefined
  }>({})

  // Pipeline stages para o Kanban
  const [pipelineStages, setPipelineStages] = useState<Array<{ id?: string; key: string; label: string; color: string }>>([
    { key: 'lead', label: 'Lead', color: '#6B7280' },
    { key: 'contatado', label: 'Contatado', color: '#3B82F6' },
    { key: 'qualificado', label: 'Qualificado', color: '#8B5CF6' },
    { key: 'proposta', label: 'Proposta', color: '#F59E0B' },
    { key: 'negociacao', label: 'Negociação', color: '#EC4899' },
    { key: 'fechado', label: 'Fechado', color: '#10B981' },
  ])

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getLeadsEquipe(tenantId)
      setLeads(data)
    } catch (err) {
      console.error('Erro ao carregar leads da equipe:', err)
      toast.error('Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  // Carregar estágios da pipeline
  useEffect(() => {
    const loadStages = async () => {
      if (!tenantId) return
      try {
        const stages = await loadPipelineStages(tenantId)
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
  }, [tenantId])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  // Função para mover lead no Kanban (apenas leads associados ao usuário)
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination || !tenantId) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Encontrar o lead que está sendo movido
    const leadToMove = leads.find(l => l.id === draggableId)
    if (!leadToMove) return

    // Verificar se o usuário pode mover este lead (apenas seus próprios leads)
    if (leadToMove.proprietario_id !== user?.id) {
      toast.error('Você só pode mover leads associados a você')
      return
    }

    try {
      if (destination.droppableId === 'unclassified') return

      const newStageKey = destination.droppableId

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('clientes')
        .update({ status: newStageKey, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', draggableId)

      if (error) throw error

      // Atualizar estado local
      setLeads(prev => prev.map(l => (l.id === draggableId ? { ...l, status: newStageKey } : l)))

      toast.success('Lead movido com sucesso!')
    } catch (err) {
      console.error('Erro ao mover lead:', err)
      toast.error('Erro ao mover lead')
    }
  }

  const filteredAndSorted = useMemo(() => {
    let result = leads.filter(l => {
      // Excluir leads com status "Perdido"
      if (l.status === "Perdido") return false

      // Filtro "Associados a mim"
      if (onlyMine && user?.id && l.proprietario_id !== user.id) return false

      // text search
      if (q) {
        const text = q.toLowerCase()
        const matchText = (l.nome || l.name || '').toLowerCase().includes(text) ||
          (l.email || '').toLowerCase().includes(text) ||
          (l.telefone || '').toLowerCase().includes(text)
        if (!matchText) return false
      }

      // status filter
      if (filters.status && filters.status !== '' && l.status !== filters.status) return false

      // valor potential
      const valor = l.valor_potencial ?? 0
      if (filters.valorMin !== undefined && filters.valorMin !== null) {
        if (valor < (filters.valorMin || 0)) return false
      }
      if (filters.valorMax !== undefined && filters.valorMax !== null) {
        if (valor > (filters.valorMax || 0)) return false
      }

      // tarefas abertas
      if (filters.tarefasMin !== undefined && filters.tarefasMin !== null) {
        if ((l.tarefasAbertas || 0) < (filters.tarefasMin || 0)) return false
      }

      // date range
      if (filters.dateFrom) {
        if (!l.created_at) return false
        const created = new Date(l.created_at).setHours(0, 0, 0, 0)
        const from = new Date(filters.dateFrom).setHours(0, 0, 0, 0)
        if (created < from) return false
      }
      if (filters.dateTo) {
        if (!l.created_at) return false
        const created = new Date(l.created_at).setHours(0, 0, 0, 0)
        const to = new Date(filters.dateTo).setHours(23, 59, 59, 999)
        if (created > to) return false
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
        case 'name_asc':
          return (a.nome || a.name || '').localeCompare(b.nome || b.name || '')
        case 'name_desc':
          return (b.nome || b.name || '').localeCompare(a.nome || a.name || '')
        case 'value_high':
          return (b.valor_potencial || 0) - (a.valor_potencial || 0)
        case 'value_low':
          return (a.valor_potencial || 0) - (b.valor_potencial || 0)
        default:
          return 0
      }
    })

    return result
  }, [leads, q, filters, sortBy, onlyMine, user?.id])

  const [selectedLead, setSelectedLead] = useState<LeadEquipe | null>(null)
  const [showLeadModal, setShowLeadModal] = useState(false)

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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-['Outfit']">Leads da Equipe</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-full">
              {filteredAndSorted.length} leads
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
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                onlyMine
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
                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
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
                <KanbanIcon className="w-4 h-4" />
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
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Nenhum lead encontrado.</p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* Kanban View */
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
              {pipelineStages.map(stage => {
                const stageLeads = filteredAndSorted.filter(l => l.status === stage.key)
                return (
                  <Droppable droppableId={stage.key} key={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-shrink-0 w-72 rounded-xl border transition-all ${
                          snapshot.isDraggingOver
                            ? 'bg-cyan-50/50 dark:bg-cyan-500/5 border-cyan-400/50'
                            : 'bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {/* Column Header */}
                        <div
                          className="px-4 py-3 border-b border-slate-200 dark:border-white/10 rounded-t-xl"
                          style={{ backgroundColor: `${stage.color}15` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              <span className="font-medium text-sm text-slate-900 dark:text-white">
                                {stage.label}
                              </span>
                            </div>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${stage.color}22`,
                                color: stage.color
                              }}
                            >
                              {stageLeads.length}
                            </span>
                          </div>
                        </div>

                        {/* Cards */}
                        <div className="p-2 space-y-2 min-h-[100px]">
                          {stageLeads.map((lead, index) => {
                            const canDrag = lead.proprietario_id === user?.id
                            return (
                              <Draggable
                                draggableId={lead.id}
                                index={index}
                                key={lead.id}
                                isDragDisabled={!canDrag}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    onClick={() => { setSelectedLead(lead); setShowLeadModal(true) }}
                                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                      dragSnapshot.isDragging
                                        ? 'shadow-xl border-cyan-400 bg-white dark:bg-slate-800 rotate-2'
                                        : canDrag
                                          ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-cyan-400/50 hover:shadow-md'
                                          : 'bg-white/50 dark:bg-white/3 border-slate-200/50 dark:border-white/5'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                        {lead.nome || lead.name || 'Sem nome'}
                                      </h4>
                                      {canDrag && (
                                        <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400">
                                          Meu
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                      {lead.email && (
                                        <div className="flex items-center gap-1.5 truncate">
                                          <Mail className="w-3 h-3" />
                                          <span className="truncate">{lead.email}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between pt-1">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                          {currencyBRL(lead.valor_potencial)}
                                        </span>
                                      </div>
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
          </DragDropContext>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAndSorted.map(lead => (
              <button
                key={lead.id}
                onClick={() => { setSelectedLead(lead); setShowLeadModal(true) }}
                className="w-full text-left rounded-xl p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {lead.nome || lead.name || 'Sem nome'}
                    </h3>
                    {lead.status && (
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                        {lead.status}
                      </span>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-xs text-slate-400">Valor</div>
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {currencyBRL(lead.valor_potencial)}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1.5 text-xs">
                  {lead.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.telefone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span>{lead.telefone}</span>
                    </div>
                  )}
                  {lead.created_at && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <div className="col-span-3">Nome</div>
              <div className="col-span-3">Contato</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-2 text-right">Data</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredAndSorted.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => { setSelectedLead(lead); setShowLeadModal(true) }}
                  className="w-full text-left grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                >
                  {/* Mobile Layout */}
                  <div className="sm:hidden flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white text-sm group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                        {lead.nome || lead.name || 'Sem nome'}
                      </span>
                      {lead.status && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                          {lead.status}
                        </span>
                      )}
                      <div className="text-xs text-slate-500 mt-0.5">{lead.email || lead.telefone}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{currencyBRL(lead.valor_potencial)}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(lead.created_at)}</div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:flex sm:col-span-3 items-center">
                    <span className="font-medium text-slate-900 dark:text-white text-sm truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      {lead.nome || lead.name || 'Sem nome'}
                    </span>
                  </div>
                  <div className="hidden sm:flex sm:col-span-3 flex-col justify-center">
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{lead.email || '—'}</span>
                    <span className="text-xs text-slate-400">{lead.telefone || '—'}</span>
                  </div>
                  <div className="hidden sm:flex sm:col-span-2 items-center">
                    {lead.status && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                        {lead.status}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex sm:col-span-2 items-center justify-end">
                    <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                      {currencyBRL(lead.valor_potencial)}
                    </span>
                  </div>
                  <div className="hidden sm:flex sm:col-span-2 items-center justify-end text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(lead.created_at)}
                  </div>
                </button>
              ))}
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
                      {Array.from(new Set(leads.map(l => l.status).filter(Boolean))).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Tarefas mín.</label>
                    <input
                      type="number"
                      value={filters.tarefasMin ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, tarefasMin: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Valor mínimo</label>
                    <input
                      type="number"
                      value={filters.valorMin ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, valorMin: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                      placeholder="R$ 0"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Valor máximo</label>
                    <input
                      type="number"
                      value={filters.valorMax ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, valorMax: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                      placeholder="R$ 0"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Data de</label>
                    <input
                      type="date"
                      value={filters.dateFrom ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Data até</label>
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

      <LeadDetailsModal
        lead={selectedLead}
        open={showLeadModal}
        onClose={() => { setShowLeadModal(false); setSelectedLead(null) }}
      />
    </>
  )
}

// Modal de visualização somente leitura do lead
function LeadDetailsModal({ lead, open, onClose }: { lead: LeadEquipe | null; open: boolean; onClose: () => void }) {
  if (!lead) return null
  return (
    <Modal isOpen={open} onClose={onClose} title="Detalhes do Lead">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{lead.nome || lead.name || '—'}</h3>
            {lead.status && (
              <span className="inline-flex items-center px-2 py-0.5 mt-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                {lead.status}
              </span>
            )}
          </div>
          {lead.valor_potencial && (
            <div className="text-right">
              <div className="text-xs text-slate-500">Valor potencial</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{currencyBRL(lead.valor_potencial)}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Email</label>
            <div className="text-sm text-slate-900 dark:text-white">{lead.email || '—'}</div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Telefone</label>
            <div className="text-sm text-slate-900 dark:text-white">{lead.telefone || '—'}</div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Criado em</label>
            <div className="text-sm text-slate-900 dark:text-white">{lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '—'}</div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Tarefas abertas</label>
            <div className="text-sm text-slate-900 dark:text-white">{lead.tarefasAbertas ?? 0}</div>
          </div>
        </div>

        {lead.notas && (
          <div className="pt-4 border-t border-slate-200 dark:border-white/10">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Notas</label>
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-white/5 rounded-lg p-3">{lead.notas}</div>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
        <button
          onClick={onClose}
          className="py-2 px-4 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition font-medium text-sm"
        >
          Fechar
        </button>
      </div>
    </Modal>
  )
}

export default LeadsEquipe
