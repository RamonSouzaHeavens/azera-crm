import React, { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Activity, AlertCircle, CheckCircle2, Clock, TrendingUp, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

interface DashboardStats {
  totalWebhooks: number
  activeAutomations: number
  recentEvents: {
    timestamp: string
    type: string
    status: 'success' | 'pending' | 'failed'
  }[]
  successRate: number
  avgLatency: number
  deadLetters: number
}

interface HourlyData {
  hour: string
  count: number
}

interface StatusData {
  name: string
  value: number
  color: string
}

export function AutomationDashboard() {
  const { tenant } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalWebhooks: 0,
    activeAutomations: 0,
    recentEvents: [],
    successRate: 0,
    avgLatency: 0,
    deadLetters: 0
  })
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [statusData, setStatusData] = useState<StatusData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant?.id) return
    loadDashboardData()
  }, [tenant?.id])

  async function loadDashboardData() {
    try {
      setLoading(true)

      // 1. Total webhooks e automações
      const [webhooksRes, automationsRes] = await Promise.all([
        supabase
          .from('webhook_subscriptions')
          .select('id', { count: 'exact' })
          .eq('tenant_id', tenant!.id)
          .eq('active', true),
        supabase
          .from('automacoes')
          .select('id', { count: 'exact' })
          .eq('tenant_id', tenant!.id)
          .eq('ativa', true)
      ])

      // 2. Taxa de sucesso (últimas 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const deliveriesRes = await supabase
        .from('webhook_deliveries')
        .select('id, status, latency_ms')
        .gte('created_at', oneDayAgo)
        .in('subscription_id', (webhooksRes.data || []).map(w => w.id))

      const deliveries = deliveriesRes.data || []
      const successCount = deliveries.filter(d => d.status === 'success').length
      const failedCount = deliveries.filter(d => d.status === 'dead').length
      const successRate = deliveries.length > 0 ? Math.round((successCount / deliveries.length) * 100) : 0
      const avgLatency = deliveries.length > 0
        ? Math.round(deliveries.filter(d => d.latency_ms).reduce((a, b) => a + (b.latency_ms || 0), 0) / deliveries.length)
        : 0

      // 3. Status distribution
      const success = deliveries.filter(d => d.status === 'success').length
      const pending = deliveries.filter(d => d.status === 'pending').length
      const failed = deliveries.filter(d => d.status === 'dead').length

      // 4. Últimos eventos
      const eventsRes = await supabase
        .from('webhook_events')
        .select('id, created_at, event_type, status')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // 5. Dados por hora (últimas 24h)
      const hourlyMap = new Map<string, number>()
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(Date.now() - i * 60 * 60 * 1000)
        const hourStr = hour.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        hourlyMap.set(hourStr, 0)
      }

      deliveries.forEach(d => {
        const hour = new Date(d.created_at || '').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
      })

      const hourlyDataArray = Array.from(hourlyMap.entries()).map(([hour, count]) => ({ hour, count }))

      setStats({
        totalWebhooks: webhooksRes.count || 0,
        activeAutomations: automationsRes.count || 0,
        recentEvents: (eventsRes.data || []).map(e => ({
          timestamp: new Date(e.created_at || '').toLocaleTimeString('pt-BR'),
          type: e.event_type || 'unknown',
          status: (e.status || 'pending') as 'success' | 'pending' | 'failed'
        })),
        successRate,
        avgLatency,
        deadLetters: failedCount
      })

      setStatusData([
        { name: 'Sucesso', value: success, color: '#10b981' },
        { name: 'Pendente', value: pending, color: '#f59e0b' },
        { name: 'Falha', value: failed, color: '#ef4444' }
      ])

      setHourlyData(hourlyDataArray)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gradient-to-r from-slate-700 to-slate-600 rounded-3xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Zap}
          label="Webhooks Ativos"
          value={stats.totalWebhooks}
          color="from-blue-500 to-blue-600"
        />
        <KPICard
          icon={Activity}
          label="Automações Ativas"
          value={stats.activeAutomations}
          color="from-emerald-500 to-emerald-600"
        />
        <KPICard
          icon={CheckCircle2}
          label="Taxa de Sucesso (24h)"
          value={`${stats.successRate}%`}
          color="from-cyan-500 to-cyan-600"
        />
        <KPICard
          icon={Clock}
          label="Latência Média"
          value={`${stats.avgLatency}ms`}
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* Alertas */}
      {stats.successRate < 90 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-amber-200 font-medium">Taxa de sucesso baixa</p>
            <p className="text-amber-300/80 text-sm">Menos de 90% dos webhooks foram entregues nas últimas 24h</p>
          </div>
        </div>
      )}

      {stats.deadLetters > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-200 font-medium">{stats.deadLetters} webhooks falharam</p>
            <p className="text-red-300/80 text-sm">Estes eventos não puderam ser entregues. Verifique os logs.</p>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linha - Entregas por hora */}
        <div className="lg:col-span-2 rounded-3xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Entregas por Hora (24h)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
              <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ fill: '#06b6d4', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pizza - Status */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-white font-semibold mb-4">Status (24h)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4 text-sm">
            {statusData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-white/70">{item.name}</span>
                </div>
                <span className="text-white font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Eventos Recentes */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-white font-semibold mb-4">Eventos Recentes</h3>
        <div className="space-y-3">
          {stats.recentEvents.length > 0 ? (
            stats.recentEvents.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    event.status === 'success' ? 'bg-emerald-400' :
                    event.status === 'pending' ? 'bg-amber-400' :
                    'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-white text-sm">{event.type}</p>
                    <p className="text-white/50 text-xs">{event.timestamp}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  event.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                  event.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {event.status === 'success' ? 'Sucesso' : event.status === 'pending' ? 'Pendente' : 'Falha'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-white/50 text-sm py-4 text-center">Nenhum evento nos últimos 24h</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface KPICardProps {
  icon: React.ComponentType<{ className: string }>
  label: string
  value: string | number
  color: string
}

function KPICard({ icon: Icon, label, value, color }: KPICardProps) {
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${color} p-6 shadow-2xl`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{label}</p>
          <p className="text-white text-3xl font-bold mt-2">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-white/60" />
      </div>
    </div>
  )
}
