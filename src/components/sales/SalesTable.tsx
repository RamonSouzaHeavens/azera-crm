import React, { useState } from 'react'
import { Calendar, CheckCircle, Clock, AlertCircle, Ban, Trash2, ChevronDown, User, ExternalLink, Repeat, Download, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Tipos
interface Sale {
  id: string
  title: string
  value: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue' | 'canceled'
  recurrence_id: string | null
  lead_id: string
  lead?: { id: string; nome: string } | null
}

interface SalesTableProps {
  sales: Sale[]
  onStatusChange: (id: string, status: Sale['status']) => void
  onDelete: (id: string) => void
}

const STATUS_MAP = {
  pending: { label: 'Pendente', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: Clock },
  paid: { label: 'Pago', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
  overdue: { label: 'Vencido', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', icon: AlertCircle },
  canceled: { label: 'Cancelado', bg: 'bg-slate-500/10', text: 'text-slate-500 dark:text-slate-400', icon: Ban },
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR')

export default function SalesTable({ sales, onStatusChange, onDelete }: SalesTableProps) {
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelectAll = () => {
    if (selectedIds.size === sales.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(sales.map(s => s.id)))
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
      {/* Barra de Ações em Massa (Se houver seleção) */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-700/50 px-4 py-2 flex items-center justify-between border-b border-white/5 animate-in slide-in-from-top-2">
            <span className="text-sm text-slate-300">{selectedIds.size} selecionados</span>
            <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-lg text-xs font-medium transition flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
                 <button className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-xs font-medium transition flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5" /> Marcar Pagos
                </button>
            </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/20">
              <th className="px-4 py-4 w-[40px]">
                <input
                    type="checkbox"
                    checked={selectedIds.size === sales.length && sales.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-offset-0 focus:ring-indigo-500/50"
                />
              </th>
              <th className="px-4 py-4">Descrição</th>
              <th className="px-4 py-4">Cliente</th>
              <th className="px-4 py-4">Valor</th>
              <th className="px-4 py-4">Vencimento</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sales.map(sale => {
              const statusInfo = STATUS_MAP[sale.status]
              const StatusIcon = statusInfo.icon
              const isSelected = selectedIds.has(sale.id)

              return (
                <tr
                    key={sale.id}
                    className={`group transition hover:bg-white/[0.02] ${isSelected ? 'bg-indigo-500/5' : ''}`}
                >
                  <td className="px-4 py-3">
                     <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(sale.id)}
                        className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-offset-0 focus:ring-indigo-500/50 opacity-50 group-hover:opacity-100 transition-opacity"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
                         {sale.recurrence_id ? <Repeat className="w-4 h-4 text-indigo-400" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <span className="font-medium text-slate-200">{sale.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {sale.lead ? (
                      <button
                        onClick={() => navigate(`/app/clientes/${sale.lead_id}`)}
                        className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 hover:underline text-sm transition-colors"
                      >
                        {sale.lead.nome}
                      </button>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-200">{formatCurrency(sale.value)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      {formatDate(sale.due_date)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative group/status inline-block">
                      <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-transparent ${statusInfo.bg} ${statusInfo.text} group-hover/status:border-white/10 transition-all`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                        <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                      </button>

                      {/* Dropdown Status */}
                      <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all z-50 min-w-[150px] overflow-hidden">
                        {Object.entries(STATUS_MAP).map(([key, info]) => (
                          <button
                            key={key}
                            onClick={() => onStatusChange(sale.id, key as Sale['status'])}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-white/5 transition-colors ${sale.status === key ? 'bg-white/5 text-white' : 'text-slate-400'}`}
                          >
                            <info.icon className="w-3.5 h-3.5" />
                            {info.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                            title="Gerar Recibo"
                            className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition"
                        >
                             <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(sale.id)}
                            className="p-2 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
