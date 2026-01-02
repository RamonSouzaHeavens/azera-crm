import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, Calendar, AlertCircle, Wallet, CheckCircle2 } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'

// Tipos
interface Sale {
  id: string
  value: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue' | 'canceled'
}

interface SalesDashboardProps {
  sales: Sale[]
}

const COLORS = {
  paid: '#10B981',    // Emerald 500
  pending: '#F59E0B', // Amber 500
  overdue: '#F43F5E', // Rose 500
  canceled: '#64748B' // Slate 500
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function SalesDashboard({ sales }: SalesDashboardProps) {

  // 1. Dados para o Gráfico de Área
  const cashFlowData = useMemo(() => {
    const groups: Record<string, { name: string, date: string, income: number, forecast: number }> = {}

    const today = new Date()

    // Encontrar o range de meses das vendas
    let minDate = new Date(today.getFullYear(), today.getMonth() - 3, 1) // 3 meses atrás
    let maxDate = new Date(today.getFullYear(), today.getMonth() + 3, 1) // 3 meses à frente

    sales.forEach(sale => {
      const saleDate = new Date(sale.due_date)
      if (saleDate < minDate) minDate = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1)
      if (saleDate > maxDate) maxDate = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1)
    })

    // Criar grupos para cada mês no range
    let current = new Date(minDate)
    while (current <= maxDate) {
      const key = current.toISOString().slice(0, 7) // "YYYY-MM"
      const name = current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      groups[key] = { name, date: key, income: 0, forecast: 0 }
      current.setMonth(current.getMonth() + 1)
    }

    sales.forEach(sale => {
      const key = sale.due_date.slice(0, 7)
      if (groups[key]) {
        if (sale.status === 'paid') {
          groups[key].income += Number(sale.value)
        } else if (sale.status === 'pending') {
          groups[key].forecast += Number(sale.value)
        }
      }
    })

    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date))
  }, [sales])

  // 2. Dados para o Gráfico de Pizza
  const statusData = useMemo(() => {
    const counts = { paid: 0, pending: 0, overdue: 0, canceled: 0 }
    sales.forEach(s => {
      if (counts[s.status] !== undefined) counts[s.status] += Number(s.value)
    })

    return [
      { name: 'Recebido', value: counts.paid, color: COLORS.paid },
      { name: 'A Receber', value: counts.pending, color: COLORS.pending },
      { name: 'Vencido', value: counts.overdue, color: COLORS.overdue },
      { name: 'Cancelado', value: counts.canceled, color: COLORS.canceled },
    ].filter(item => item.value > 0)
  }, [sales])

  // 3. Forecasting (Próximos 30 dias)
  const forecast30Days = useMemo(() => {
    const today = new Date()
    const next30 = new Date()
    next30.setDate(today.getDate() + 30)

    return sales
      .filter(s => s.status === 'pending')
      .filter(s => {
        const d = new Date(s.due_date)
        return d >= today && d <= next30
      })
      .reduce((acc, s) => acc + Number(s.value), 0)
  }, [sales])

  // 4. Total Recebido (todas as vendas pagas)
  const totalReceived = useMemo(() => {
    return sales
      .filter(s => s.status === 'paid')
      .reduce((acc, s) => acc + Number(s.value), 0)
  }, [sales])

  const hasReceived = totalReceived > 0

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Cards de Topo */}
      <div className={`grid grid-cols-1 gap-4 ${hasReceived ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>

        {/* Card 1: Previsão */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-amber-500/20" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-slate-400 font-medium mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Previsão (30 dias)
              </p>
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {formatCurrency(forecast30Days)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                A receber confirmado
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <Wallet className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Card 2: Recebido Este Mês (Condicional) */}
        {hasReceived && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-emerald-500/20" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-slate-400 font-medium mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Recebido (Total)
                </p>
                <h3 className="text-3xl font-bold text-white tracking-tight">
                  {formatCurrency(totalReceived)}
                </h3>
                <p className="text-xs text-slate-500 mt-2">
                  Total de vendas confirmadas
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Inadimplência */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-rose-500/20" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-slate-400 font-medium mb-1 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Inadimplência
              </p>
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {formatCurrency(sales.filter(s => s.status === 'overdue').reduce((a, b) => a + Number(b.value), 0))}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                Total vencido
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <Calendar className="w-6 h-6 text-rose-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico Principal: Fluxo de Caixa */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Fluxo de Caixa (Realizado vs Previsto)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.paid} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.paid} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.pending} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.pending} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `R$${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend verticalAlign="top" height={36} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Recebido"
                  stroke={COLORS.paid}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  name="A Receber"
                  stroke={COLORS.pending}
                  fillOpacity={1}
                  fill="url(#colorForecast)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Secundário: Distribuição */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-2">Composição da Carteira</h3>
          <div className="flex-1 min-h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={105}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend
                  verticalAlign="bottom"
                  layout="horizontal"
                  iconType="circle"
                  formatter={(value) => <span className="text-slate-300 ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Total no centro */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
              <div className="text-center">
                <span className="block text-xs text-slate-400 mb-1">Total</span>
                <span className="block text-base sm:text-lg font-bold text-white whitespace-nowrap">
                  {formatCurrency(sales.reduce((a, b) => a + Number(b.value), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
