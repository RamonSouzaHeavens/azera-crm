import { useState, useEffect, useMemo } from 'react'
import { CheckCircle, Clock, AlertCircle, Calendar, User, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useThemeStore } from '../../stores/themeStore'

// Tipos
interface Sale {
  id: string
  title: string
  value: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue' | 'canceled'
  lead_id: string
  lead?: { id: string; nome: string } | null
}

interface SalesKanbanProps {
  sales: Sale[]
  onStatusChange: (id: string, status: Sale['status']) => void
  onDelete: (id: string) => void
}

type SortOption = 'date_desc' | 'date_asc' | 'value_desc' | 'value_asc' | 'name_asc' | 'name_desc'

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof ArrowUpDown }[] = [
  { value: 'date_asc', label: 'Próximo a vencer', icon: ArrowUp },
  { value: 'date_desc', label: 'Distante a vencer', icon: ArrowDown },
  { value: 'value_desc', label: 'Maior valor', icon: ArrowDown },
  { value: 'value_asc', label: 'Menor valor', icon: ArrowUp },
  { value: 'name_asc', label: 'Nome A-Z', icon: ArrowUp },
  { value: 'name_desc', label: 'Nome Z-A', icon: ArrowDown },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

const COLUMNS = [
  { id: 'pending', title: 'A Receber', color: '#F59E0B', icon: Clock },
  { id: 'overdue', title: 'Vencido', color: '#EF4444', icon: AlertCircle },
  { id: 'paid', title: 'Recebido', color: '#10B981', icon: CheckCircle },
] as const

export default function SalesKanban({ sales, onStatusChange }: SalesKanbanProps) {
  const navigate = useNavigate()
  const { isDark } = useThemeStore()
  const [enabled, setEnabled] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('date_asc')
  const [showSortMenu, setShowSortMenu] = useState(false)

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  // Função de ordenação
  const sortSales = (salesList: Sale[]): Sale[] => {
    return [...salesList].sort((a, b) => {
      switch (sortOption) {
        case 'date_desc':
          return new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
        case 'date_asc':
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        case 'value_desc':
          return Number(b.value) - Number(a.value)
        case 'value_asc':
          return Number(a.value) - Number(b.value)
        case 'name_asc':
          return a.title.localeCompare(b.title)
        case 'name_desc':
          return b.title.localeCompare(a.title)
        default:
          return 0
      }
    })
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId as Sale['status']

    if (['pending', 'paid', 'overdue', 'canceled'].includes(newStatus)) {
      onStatusChange(draggableId, newStatus)
    }
  }

  // Agrupar e ordenar vendas por status
  const grouped = useMemo(() => ({
    pending: sortSales(sales.filter(s => s.status === 'pending')),
    overdue: sortSales(sales.filter(s => s.status === 'overdue')),
    paid: sortSales(sales.filter(s => s.status === 'paid')),
  }), [sales, sortOption])

  // Theme-aware styles
  const columnBg = isDark
    ? 'bg-slate-900/50 border-slate-700'
    : 'bg-gray-50 border-gray-200'
  const cardBg = isDark
    ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
    : 'bg-white border-gray-200 hover:border-gray-300'
  const cardDragging = isDark
    ? 'ring-offset-slate-900'
    : 'ring-offset-white'
  const textPrimary = isDark ? 'text-white' : 'text-gray-900'
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-600'
  const textMuted = isDark ? 'text-slate-500' : 'text-gray-500'
  const badgeBg = isDark ? 'bg-white/10' : 'bg-gray-100'
  const totalBg = isDark ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'
  const dropdownBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'

  const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === sortOption)?.label || 'Ordenar'

  if (!enabled) {
    return null
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Barra de ordenação */}
      <div className="flex items-center justify-end px-6 mb-4">
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-300' : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'}`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-sm font-medium">{currentSortLabel}</span>
          </button>

          {showSortMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSortMenu(false)}
              />
              <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-lg z-50 py-1 ${dropdownBg}`}>
                {SORT_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortOption(opt.value)
                        setShowSortMenu(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${sortOption === opt.value
                        ? 'bg-cyan-500/10 text-cyan-500'
                        : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Container com 3 colunas que preenchem o espaço */}
      <div className="relative h-[calc(100vh-320px)] overflow-hidden px-6 pb-4">
        <div className="grid grid-cols-3 gap-4 h-full">
          {COLUMNS.map(col => {
            const colSales = grouped[col.id] || []
            const totalValue = colSales.reduce((acc, curr) => acc + Number(curr.value), 0)

            return (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl ${columnBg} border p-4 h-full flex flex-col shadow-sm hover:shadow-md transition-shadow`}
                  >
                    {/* Header da Coluna */}
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <div className={`text-sm font-bold ${textPrimary} flex items-center gap-2`}>
                        <span className="w-3 h-3 rounded-full" style={{ background: col.color }} />
                        {col.title}
                        <span className={`text-[12px] font-semibold ${textSecondary} ${badgeBg} px-2 py-0.5 rounded-lg`}>
                          ({colSales.length})
                        </span>
                      </div>
                      <span className={`text-xs font-semibold ${textSecondary} ${totalBg} px-2 py-1 rounded-md border`}>
                        {formatCurrency(totalValue)}
                      </span>
                    </div>

                    {/* Lista de Cards - área scrollável */}
                    <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin pr-1">
                      {colSales.map((sale, idx) => (
                        <Draggable key={sale.id} draggableId={sale.id} index={idx}>
                          {(pp, snapshot) => (
                            <div
                              ref={pp.innerRef}
                              {...pp.draggableProps}
                              {...pp.dragHandleProps}
                              className={`rounded-lg ${cardBg} border p-3 cursor-grab active:cursor-grabbing transition-all ${snapshot.isDragging ? `ring-2 ring-cyan-500/60 ring-offset-2 ${cardDragging} scale-[1.02] shadow-md` : 'hover:shadow-sm'}`}
                            >
                              {/* Layout horizontal para cards mais compactos */}
                              <div className="flex items-center gap-3">
                                {/* Info principal */}
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-semibold ${textPrimary} leading-tight truncate`}>
                                    {sale.title}
                                  </div>
                                  <div className={`flex items-center gap-3 mt-1 text-xs ${textMuted}`}>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(sale.due_date)}
                                    </div>
                                    {sale.lead && (
                                      <div
                                        className="flex items-center gap-1 hover:text-cyan-500 cursor-pointer transition truncate"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          navigate(`/app/clientes/${sale.lead_id}`)
                                        }}
                                      >
                                        <User className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate max-w-[100px]">{sale.lead.nome}</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-50 flex-shrink-0" />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Valor */}
                                <div className="text-base font-bold text-cyan-500 whitespace-nowrap">
                                  {formatCurrency(sale.value)}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
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
  )
}
