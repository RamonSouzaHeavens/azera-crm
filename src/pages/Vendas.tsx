import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Plus, Search, Filter, X, Calendar,
  CheckCircle, Clock, AlertCircle, Ban, Trash2,
  ChevronDown, User, ExternalLink, Repeat, BarChart3, LayoutGrid, List as ListIcon, PieChart
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

// Componentes
import SalesDashboard from '../components/sales/SalesDashboard'
import SalesKanban from '../components/sales/SalesKanban'
import SalesTable from '../components/sales/SalesTable'

// =====================
// Tipos
// =====================
interface Sale {
  id: string
  tenant_id: string
  lead_id: string
  title: string
  value: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue' | 'canceled'
  recurrence_id: string | null
  created_at: string
  updated_at: string
  // Join
  lead?: { id: string; nome: string } | null
}

interface Lead {
  id: string
  nome: string
}

interface Filters {
  q?: string
  status?: string
  leadId?: string
  dateFrom?: string
  dateTo?: string
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// =====================
// Componente Principal
// =====================
export default function Vendas() {
  useTranslation()
  const navigate = useNavigate()
  const { tenant, member } = useAuthStore()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])

  // Estados de Interface
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban')
  const [showDashboard, setShowDashboard] = useState(true)

  // Estados de Dados
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState<Sale[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [filters, setFilters] = useState<Filters>({ status: 'todos', leadId: 'todos' })
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Modal Nova Venda
  const [showModal, setShowModal] = useState(false)
  const [saleForm, setSaleForm] = useState({
    lead_id: '',
    title: '',
    value: '',
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'paid',
    is_recurring: false,
    recurrence_count: 12
  })
  const [submitting, setSubmitting] = useState(false)

  // =====================
  // Carregamento de Dados
  // =====================
  const loadLeads = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('tenant_id', tenantId)
      .order('nome')
    setLeads(data || [])
  }, [tenantId])

  const loadSales = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      let query = supabase
        .from('lead_sales')
        .select('*, lead:clientes!lead_id(id, nome)')
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: false })

      // Aplicar filtros
      if (filters.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status)
      }
      if (filters.leadId && filters.leadId !== 'todos') {
        query = query.eq('lead_id', filters.leadId)
      }
      if (filters.dateFrom) {
        query = query.gte('due_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('due_date', filters.dateTo + 'T23:59:59')
      }
      if (filters.q) {
        query = query.ilike('title', `%${filters.q}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setSales(data || [])
    } catch (err) {
      console.error('Erro ao carregar vendas:', err)
      toast.error('Erro ao carregar vendas')
    } finally {
      setLoading(false)
    }
  }, [tenantId, filters])

  useEffect(() => { loadLeads() }, [loadLeads])
  useEffect(() => { loadSales() }, [loadSales])

  // =====================
  // Ações
  // =====================
  const handleStatusChange = async (saleId: string, newStatus: Sale['status']) => {
    try {
      const { error } = await supabase
        .from('lead_sales')
        .update({ status: newStatus })
        .eq('id', saleId)
      if (error) throw error

      // Otimistic update
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: newStatus } : s))
      toast.success('Status atualizado!')
    } catch (err) {
      toast.error('Erro ao atualizar status')
      loadSales() // Revert on error
    }
  }

  const handleDelete = async (saleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return
    try {
      const { error } = await supabase
        .from('lead_sales')
        .delete()
        .eq('id', saleId)
      if (error) throw error

      setSales(prev => prev.filter(s => s.id !== saleId))
      toast.success('Venda excluída!')
    } catch (err) {
      toast.error('Erro ao excluir venda')
    }
  }

  const handleSubmit = async () => {
    if (!saleForm.lead_id || !saleForm.title || !saleForm.value) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSubmitting(true)
    try {
      const baseValue = parseFloat(saleForm.value.replace(',', '.'))

      if (saleForm.is_recurring) {
        const recurrenceId = crypto.randomUUID()
        const salesToCreate = []
        const baseDate = new Date(saleForm.due_date)

        for (let i = 0; i < saleForm.recurrence_count; i++) {
          const dueDate = new Date(baseDate)
          dueDate.setMonth(baseDate.getMonth() + i)

          salesToCreate.push({
            tenant_id: tenantId,
            lead_id: saleForm.lead_id,
            title: `${saleForm.title} (${i + 1}/${saleForm.recurrence_count})`,
            value: baseValue,
            due_date: dueDate.toISOString(),
            status: i === 0 && saleForm.status === 'paid' ? 'paid' : 'pending',
            recurrence_id: recurrenceId
          })
        }

        const { error } = await supabase.from('lead_sales').insert(salesToCreate)
        if (error) throw error
        toast.success(`${saleForm.recurrence_count} parcelas criadas!`)
      } else {
        const { error } = await supabase.from('lead_sales').insert({
          tenant_id: tenantId,
          lead_id: saleForm.lead_id,
          title: saleForm.title,
          value: baseValue,
          due_date: new Date(saleForm.due_date).toISOString(),
          status: saleForm.status,
          recurrence_id: null
        })
        if (error) throw error
        toast.success('Venda criada!')
      }

      setShowModal(false)
      setSaleForm({
        lead_id: '',
        title: '',
        value: '',
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        is_recurring: false,
        recurrence_count: 12
      })
      loadSales()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao criar venda')
    } finally {
      setSubmitting(false)
    }
  }

  // =====================
  // Render
  // =====================
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background decorativo */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.06),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.06),transparent_45%)]" />

      <div className="relative z-10 p-6 max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-outfit">Gestão de Vendas</h1>
              <p className="text-base mt-1 text-slate-400">Hub Financeiro Inteligente</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Dashboard */}
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className={`p-2 rounded-xl border transition ${showDashboard ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400'}`}
              title="Alternar Dashboard"
            >
              <PieChart className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>

            {/* Toggle View Mode */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                title="Lista"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition ${viewMode === 'kanban' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                title="Kanban"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Busca */}
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar vendas..."
                value={filters.q ?? ''}
                onChange={e => setFilters(p => ({ ...p, q: e.target.value }))}
                className="pl-10 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-64"
              />
            </div>

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`p-2 rounded-xl border transition ${filtersOpen ? 'bg-amber-500/20 border-amber-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
              <Filter className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Venda</span>
            </button>
          </div>
        </header>

        {/* Filtros Expandidos */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block text-slate-400">Status</label>
                  <select
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                    className="w-full p-2 rounded-lg bg-black/20 border border-white/10 text-sm"
                  >
                    <option value="todos">Todos</option>
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="overdue">Vencido</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block text-slate-400">Lead</label>
                  <select
                    value={filters.leadId}
                    onChange={e => setFilters({ ...filters, leadId: e.target.value })}
                    className="w-full p-2 rounded-lg bg-black/20 border border-white/10 text-sm"
                  >
                    <option value="todos">Todos</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block text-slate-400">Data Início</label>
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full p-2 rounded-lg bg-black/20 border border-white/10 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block text-slate-400">Data Fim</label>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full p-2 rounded-lg bg-black/20 border border-white/10 text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({ status: 'todos', leadId: 'todos' })}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard de Vendas (Opcional/Colapsável) */}
        <AnimatePresence>
          {showDashboard && sales.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <SalesDashboard sales={sales} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conteúdo Principal: Kanban ou Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white/5 rounded-2xl border border-white/10">
            <DollarSign className="w-12 h-12 mb-4 opacity-30" />
            <p>Nenhuma venda encontrada com os filtros atuais</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-sm font-medium text-white"
            >
              Registrar Venda
            </button>
          </div>
        ) : (
          viewMode === 'kanban' ? (
            <SalesKanban
              sales={sales}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ) : (
            <div className="animate-in fade-in duration-500">
              <SalesTable
                sales={sales}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            </div>
          )
        )}

      </div>

      {/* Modal Nova Venda - Mantido Idêntico */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Nova Venda</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Lead */}
                <div>
                  <label className="text-sm font-medium mb-1 block text-slate-300">Lead *</label>
                  <select
                    value={saleForm.lead_id}
                    onChange={e => setSaleForm({ ...saleForm, lead_id: e.target.value })}
                    className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-sm focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="">Selecione o lead</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>

                {/* Título */}
                <div>
                  <label className="text-sm font-medium mb-1 block text-slate-300">Descrição *</label>
                  <input
                    type="text"
                    value={saleForm.title}
                    onChange={e => setSaleForm({ ...saleForm, title: e.target.value })}
                    placeholder="Ex: Mensalidade, Consultoria..."
                    className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-sm focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="text-sm font-medium mb-1 block text-slate-300">Valor (R$) *</label>
                  <input
                    type="text"
                    value={saleForm.value}
                    onChange={e => setSaleForm({ ...saleForm, value: e.target.value })}
                    placeholder="0,00"
                    className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-sm focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="text-sm font-medium mb-1 block text-slate-300">Data de Vencimento</label>
                  <input
                    type="date"
                    value={saleForm.due_date}
                    onChange={e => setSaleForm({ ...saleForm, due_date: e.target.value })}
                    className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-sm focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-medium mb-1 block text-slate-300">Status</label>
                  <select
                    value={saleForm.status}
                    onChange={e => setSaleForm({ ...saleForm, status: e.target.value as 'pending' | 'paid' })}
                    className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-sm focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>

                {/* Toggle Recorrente */}
                <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={saleForm.is_recurring}
                    onChange={e => setSaleForm({ ...saleForm, is_recurring: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-black/20 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_recurring" className="flex items-center gap-2 text-sm cursor-pointer">
                    <Repeat className="w-4 h-4 text-indigo-400" />
                    Venda Recorrente (Parcelada)
                  </label>
                </div>

                {/* Parcelas */}
                {saleForm.is_recurring && (
                  <div>
                    <label className="text-sm font-medium mb-1 block text-slate-300">Número de Parcelas</label>
                    <input
                      type="number"
                      min="2"
                      max="60"
                      value={saleForm.recurrence_count}
                      onChange={e => setSaleForm({ ...saleForm, recurrence_count: parseInt(e.target.value) || 12 })}
                      className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-sm focus:ring-2 focus:ring-amber-500/50"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Serão geradas {saleForm.recurrence_count} parcelas de {saleForm.value ? formatCurrency(parseFloat(saleForm.value.replace(',', '.')) || 0) : 'R$ 0,00'} cada
                    </p>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 rounded-xl font-medium transition disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
