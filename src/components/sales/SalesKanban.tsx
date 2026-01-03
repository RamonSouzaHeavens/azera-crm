import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, Calendar, User, ExternalLink } from 'lucide-react'
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

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId as Sale['status']

    if (['pending', 'paid', 'overdue', 'canceled'].includes(newStatus)) {
      onStatusChange(draggableId, newStatus)
    }
  }

  // Agrupar vendas por status
  const grouped: Record<string, Sale[]> = {
    pending: sales.filter(s => s.status === 'pending'),
    overdue: sales.filter(s => s.status === 'overdue'),
    paid: sales.filter(s => s.status === 'paid'),
  }

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

  if (!enabled) {
    return null
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Container com altura fixa e scroll horizontal */}
      <div className="relative h-[calc(100vh-280px)] overflow-x-auto overflow-y-hidden pb-4 px-6 py-6 scrollbar-thin">
        <div className="flex gap-4 min-w-max h-full">
          {COLUMNS.map(col => {
            const colSales = grouped[col.id] || []
            const totalValue = colSales.reduce((acc, curr) => acc + Number(curr.value), 0)

            return (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-80 rounded-xl ${columnBg} border p-4 h-full max-h-full flex flex-col shadow-sm hover:shadow-md transition-shadow`}
                  >
                    {/* Header da Coluna */}
                    <div className="flex items-center justify-between mb-4">
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
                              className={`rounded-lg ${cardBg} border p-4 cursor-grab active:cursor-grabbing transition-all ${snapshot.isDragging ? `ring-2 ring-cyan-500/60 ring-offset-2 ${cardDragging} scale-[1.02] shadow-md` : 'hover:shadow-sm'}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className={`text-sm font-bold ${textPrimary} leading-tight line-clamp-2`}>{sale.title}</div>
                                </div>
                              </div>

                              <div className="text-lg font-bold text-cyan-500 mb-2">
                                {formatCurrency(sale.value)}
                              </div>

                              <div className={`flex items-center justify-between text-xs ${textMuted}`}>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDate(sale.due_date)}
                                </div>
                                {sale.lead && (
                                  <div
                                    className="flex items-center gap-1.5 hover:text-cyan-500 cursor-pointer transition"
                                    onClick={() => navigate(`/app/clientes/${sale.lead_id}`)}
                                  >
                                    <User className="w-3.5 h-3.5" />
                                    <span className="max-w-[80px] truncate">{sale.lead.nome}</span>
                                    <ExternalLink className="w-3 h-3 opacity-50" />
                                  </div>
                                )}
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
