import React, { useEffect, useState, useCallback } from 'react'
import { Loader, Users, Search } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { getLeadsEquipe, LeadEquipe } from '../../services/leadsEquipeService'

const currencyBRL = (value?: number | null) => {
  if (value === null || value === undefined) return '—'
  try {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return '—'
  }
}
const formatCurrency = currencyBRL

interface LeadsEquipeProps {
  tenantId: string
}

const LeadsEquipe: React.FC<LeadsEquipeProps> = ({ tenantId }) => {
  const [leads, setLeads] = useState<LeadEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<{
    status?: string
    valorMin?: number | undefined
    valorMax?: number | undefined
    tarefasMin?: number | undefined
    dateFrom?: string | undefined
    dateTo?: string | undefined
  }>({})

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

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const filtered = leads.filter(l => {
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
      const created = new Date(l.created_at).setHours(0,0,0,0)
      const from = new Date(filters.dateFrom).setHours(0,0,0,0)
      if (created < from) return false
    }
    if (filters.dateTo) {
      if (!l.created_at) return false
      const created = new Date(l.created_at).setHours(0,0,0,0)
      const to = new Date(filters.dateTo).setHours(23,59,59,999)
      if (created > to) return false
    }

    // Excluir leads com status "Perdido"
    if (l.status === "Perdido") return false;

    return true
  })

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Leads da Equipe</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar por nome, email, telefone..."
              aria-label="Pesquisar leads"
              className="pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-500 text-sm w-60 sm:w-80 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-slate-400"
            />
          </div>

          <button
            onClick={() => setFiltersOpen(true)}
            aria-label="Abrir filtros"
            className="ml-2 inline-flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 hover:bg-slate-100 transition dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg bg-white/3 border border-white/10 p-8 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-60" />
          <p className="text-slate-400">Nenhum lead disponível para esta equipe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map(lead => (
            <button
              key={lead.id}
              onClick={() => { setSelectedLead(lead); setShowLeadModal(true) }}
              className="w-full text-left rounded-lg p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:shadow-lg hover:border-cyan-500/30 transition-all duration-300 group"
            >
              {/* Header com nome e status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {lead.nome || lead.name || 'Sem nome'}
                  </h3>
                  {lead.status && (
                    <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                      {lead.status}
                    </span>
                  )}
                </div>
                <div className="flex-none text-right ml-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Valor potencial</div>
                  <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(lead.valor_potencial)}
                  </div>
                </div>
              </div>

              {/* Informações organizadas em 3 colunas: Email, Telefone, Tarefas */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">✉️</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Email</div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {lead.email || '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">📞</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Telefone</div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {lead.telefone || '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">📋</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Tarefas</div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {lead.tarefasAbertas ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de notas (se existir) */}
              {lead.notas && (
                <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Notas</div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 truncate">
                    {lead.notas.length > 40 ? lead.notas.slice(0, 40) + '...' : lead.notas}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {/* Modal de filtros */}
      {filtersOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-700/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Filtros de Leads</h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Content - Responsivo */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coluna 1 */}
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block font-medium">Status</label>
                    <select
                      value={filters.status || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    >
                      <option value="">Todos</option>
                      {Array.from(new Set(leads.map(l => l.status).filter(Boolean))).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Valor mínimo */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block font-medium">Valor mínimo (R$)</label>
                    <input
                      type="number"
                      value={filters.valorMin ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, valorMin: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 placeholder-slate-500 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    />
                  </div>

                  {/* Data de início */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block font-medium">Data de (início)</label>
                    <input
                      type="date"
                      value={filters.dateFrom ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    />
                  </div>
                </div>

                {/* Coluna 2 */}
                <div className="space-y-4">
                  {/* Valor máximo */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block font-medium">Valor máximo (R$)</label>
                    <input
                      type="number"
                      value={filters.valorMax ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, valorMax: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 placeholder-slate-500 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    />
                  </div>

                  {/* Tarefas mínimas */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block font-medium">Tarefas mínimas</label>
                    <input
                      type="number"
                      value={filters.tarefasMin ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, tarefasMin: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 placeholder-slate-500 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    />
                  </div>

                  {/* Data até */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block font-medium">Data até (fim)</label>
                    <input
                      type="date"
                      value={filters.dateTo ?? ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <button
                  onClick={() => setFilters({})}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors"
                >
                  Aplicar
                </button>
              </div>
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
        <div>
          <label className="block text-xs text-slate-500">Nome</label>
          <div className="mt-1 text-slate-900 dark:text-white font-medium">{lead.nome || lead.name || '—'}</div>
        </div>

        <div>
          <label className="block text-xs text-slate-500">Email</label>
          <div className="mt-1 text-slate-700 dark:text-slate-300">{lead.email || '—'}</div>
        </div>

        <div>
          <label className="block text-xs text-slate-500">Telefone</label>
          <div className="mt-1 text-slate-700 dark:text-slate-300">{lead.telefone || '—'}</div>
        </div>

        <div>
          <label className="block text-xs text-slate-500">Status</label>
          <div className="mt-1 text-slate-700 dark:text-slate-300">{lead.status || '—'}</div>
        </div>

        <div>
          <label className="block text-xs text-slate-500">Notas</label>
          <div className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{lead.notas || '—'}</div>
        </div>

        <div>
          <label className="block text-xs text-slate-500">Criado em</label>
          <div className="mt-1 text-slate-700 dark:text-slate-300">{lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR') : '—'}</div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={onClose} className="py-2 px-4 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-all font-medium">Fechar</button>
      </div>
    </Modal>
  )
}

export default LeadsEquipe
