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
  const { isDark } = useThemeStore()

  // 1. Dados para o Gráfico de Área
  const cashFlowData = useMemo(() => {
    const groups: Record<string, { name: string, date: string, income: number, forecast: number }> = {}

    const today = new Date()

    let minDate = new Date(today.getFullYear(), today.getMonth() - 3, 1)
    let maxDate = new Date(today.getFullYear(), today.getMonth() + 3, 1)

    sales.forEach(sale => {
      const saleDate = new Date(sale.due_date)
      if (saleDate < minDate) minDate = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1)
      if (saleDate > maxDate) maxDate = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1)
    })

    let current = new Date(minDate)
    while (current <= maxDate) {
      const key = current.toISOString().slice(0, 7)
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

  // 4. Total Recebido
  const totalReceived = useMemo(() => {
    return sales
      .filter(s => s.status === 'paid')
      .reduce((acc, s) => acc + Number(s.value), 0)
  }, [sales])

  const hasReceived = totalReceived > 0

  // Theme-aware styles
  const cardBg = isDark
    ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50'
    : 'bg-white border-gray-200 shadow-sm'
  const chartBg = isDark
    ? 'bg-slate-800/50 border-slate-700/50'
    : 'bg-white border-gray-200 shadow-sm'
  const textPrimary = isDark ? 'text-white' : 'text-gray-900'
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-600'
  const textMuted = isDark ? 'text-slate-500' : 'text-gray-500'
  const chartGridColor = isDark ? '#334155' : '#e5e7eb'
  const chartTickColor = isDark ? '#94a3b8' : '#6b7280'
  const tooltipBg = isDark ? '#1e293b' : '#ffffff'
  const tooltipBorder = isDark ? '#334155' : '#e5e7eb'
  const tooltipText = isDark ? '#fff' : '#1f2937'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Cards de Topo - Estilo Carrossel no Mobile */}
      <div className={`flex md:grid gap-4 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory scrollbar-hide ${hasReceived ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>

        {/* Card 1: Previsão */}
        <div className={`flex-shrink-0 w-[85%] md:w-auto snap-center ${cardBg} border rounded-2xl p-6 relative overflow-hidden group`}>
          <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-amber-500/20" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className={`${textSecondary} font-medium mb-1 flex items-center gap-2`}>
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Previsão (30 dias)
              </p>
              <h3 className={`text-3xl font-bold ${textPrimary} tracking-tight`}>
                {formatCurrency(forecast30Days)}
              </h3>
              <p className={`text-xs ${textMuted} mt-2`}>
                A receber confirmado
              </p>
            </div>
            <div className={`p-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-amber-50 border-amber-100'} rounded-xl border`}>
              <Wallet className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Card 2: Recebido (Condicional) */}
        {hasReceived && (
          <div className={`flex-shrink-0 w-[85%] md:w-auto snap-center ${cardBg} border rounded-2xl p-6 relative overflow-hidden group`}>
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-emerald-500/20" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className={`${textSecondary} font-medium mb-1 flex items-center gap-2`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Recebido (Total)
                </p>
                <h3 className={`text-3xl font-bold ${textPrimary} tracking-tight`}>
                  {formatCurrency(totalReceived)}
                </h3>
                <p className={`text-xs ${textMuted} mt-2`}>
                  Total de vendas confirmadas
                </p>
              </div>
              <div className={`p-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-emerald-50 border-emerald-100'} rounded-xl border`}>
                <Wallet className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Inadimplência */}
        <div className={`flex-shrink-0 w-[85%] md:w-auto snap-center ${cardBg} border rounded-2xl p-6 relative overflow-hidden group`}>
          <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-rose-500/20" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className={`${textSecondary} font-medium mb-1 flex items-center gap-2`}>
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Inadimplência
              </p>
              <h3 className={`text-3xl font-bold ${textPrimary} tracking-tight`}>
                {formatCurrency(sales.filter(s => s.status === 'overdue').reduce((a, b) => a + Number(b.value), 0))}
              </h3>
              <p className={`text-xs ${textMuted} mt-2`}>
                Total vencido
              </p>
            </div>
            <div className={`p-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-rose-50 border-rose-100'} rounded-xl border`}>
              <Calendar className="w-6 h-6 text-rose-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico Principal: Fluxo de Caixa */}
        <div className={`lg:col-span-2 ${chartBg} border rounded-2xl p-6`}>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-6`}>Fluxo de Caixa (Realizado vs Previsto)</h3>
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
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTickColor, fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTickColor, fontSize: 12 }}
                  tickFormatter={(value) => `R$${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '8px' }}
                  itemStyle={{ color: tooltipText }}
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
        <div className={`${chartBg} border rounded-2xl p-6 flex flex-col`}>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Composição da Carteira</h3>
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
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend
                  verticalAlign="bottom"
                  layout="horizontal"
                  iconType="circle"
                  formatter={(value) => <span className={textSecondary + ' ml-1'}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Total no centro */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
              <div className="text-center">
                <span className={`block text-xs ${textMuted} mb-1`}>Total</span>
                <span className={`block text-base sm:text-lg font-bold ${textPrimary} whitespace-nowrap`}>
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
