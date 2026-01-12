import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Shield,
  Users,
  CreditCard,
  Search,
  Eye,
  EyeOff,
  Crown,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Building2,
  Clock,
  AlertTriangle,
  X,
  DollarSign,
  TrendingUp,
  ChevronUp,
  BarChart2,
  LineChart
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ============================================================================
// CONFIGURAÇÃO DE SEGURANÇA
// ============================================================================
const SUPER_ADMIN_EMAIL = 'ramonexecut@gmail.com'
const SUPER_ADMIN_PASSWORD = 'azera2024master' // Senha secundária de acesso

interface Subscription {
  id: string
  user_id: string
  status: string
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

interface Tenant {
  id: string
  name: string
  owner_id: string
  created_at: string
}

interface AdminStats {
  totalUsers: number
  activeSubscriptions: number
  canceledSubscriptions: number
  trialingSubscriptions: number
  totalTenants: number
  usersThisMonth: number
  subscriptionsThisMonth: number
  mrr: number
}

interface UserWithDetails {
  id: string
  email: string
  nome: string
  role?: string
  tenant_id?: string
  tenant_name?: string
  created_at: string
  subscription?: Subscription | null
}

interface MonthlyData {
  month: string
  users: number
  subscriptions: number
  revenue: number
}

// Preços dos planos (em reais)
const PLAN_PRICES: Record<string, number> = {
  'price_mensal': 49.90,
  'price_semestral': 269.90 / 6,  // Mensal equiv
  'price_anual': 479.90 / 12,     // Mensal equiv
}

export default function SuperAdmin() {
  const { user } = useAuthStore()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<UserWithDetails[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'canceled' | 'none'>('all')
  const [updatingSubscription, setUpdatingSubscription] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  // Verificar se é o super admin
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()

  // Se não for super admin, redirecionar
  if (!isSuperAdmin) {
    return <Navigate to="/app/dashboard" replace />
  }

  // Verificar senha secundária
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === SUPER_ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      toast.success('Acesso autorizado!')
    } else {
      toast.error('Senha incorreta!')
      setPassword('')
    }
  }

  // Carregar dados
  const loadData = async () => {
    setLoading(true)
    try {
      // Usar funções RPC que bypassam RLS para o super admin
      // Buscar subscriptions via RPC
      const { data: subscriptions, error: subError } = await supabase
        .rpc('get_all_subscriptions')

      if (subError) {
        console.error('Erro ao buscar subscriptions via RPC:', subError)
        // Fallback para query normal se a função RPC não existir
        if (subError.message?.includes('function') || subError.code === '42883') {
          console.warn('Função RPC não existe. Execute o SQL em sql/super_admin_functions.sql no Supabase.')
        }
      }

      // Debug: Log das subscriptions encontradas
      console.log('=== SUPER ADMIN DEBUG ===')
      console.log('Subscriptions encontradas:', subscriptions?.length)
      subscriptions?.forEach((s: any) => {
        console.log(`  - User: ${s.user_id?.slice(0, 8)}... | Status: ${s.status} | ID: ${s.id?.slice(0, 8)}...`)
      })

      // Buscar tenants via RPC
      const { data: tenants, error: tenantError } = await supabase
        .rpc('get_all_tenants')

      if (tenantError) {
        console.error('Erro ao buscar tenants via RPC:', tenantError)
      }

      // Buscar perfis de usuários via RPC
      const { data: profiles, error: profilesError } = await supabase
        .rpc('get_all_profiles')

      if (profilesError) {
        console.error('Erro ao buscar profiles via RPC:', profilesError)
      }

      // Buscar memberships via RPC
      const { data: memberships, error: membershipsError } = await supabase
        .rpc('get_all_memberships')

      if (membershipsError) {
        console.error('Erro ao buscar memberships via RPC:', membershipsError)
      }

      // Buscar emails do auth.users através de uma função RPC ou usar subscriptions/perfis
      // Como não temos acesso direto ao auth.users, vamos buscar emails das subscriptions se disponível

      // Criar mapa de tenants
      const tenantMap = new Map<string, Tenant>()
      tenants?.forEach(t => tenantMap.set(t.id, t))

      // Criar mapa de memberships por user_id
      const membershipMap = new Map<string, { tenant_id: string; role: string; active: boolean }>()
      memberships?.forEach(m => {
        if (m.user_id && !membershipMap.has(m.user_id)) {
          membershipMap.set(m.user_id, {
            tenant_id: m.tenant_id,
            role: m.role,
            active: m.active
          })
        }
      })

      // Montar lista de usuários únicos a partir dos profiles
      const userMap = new Map<string, UserWithDetails>()

      // Adicionar todos os perfis
      profiles?.forEach(profile => {
        const membership = membershipMap.get(profile.id)
        const tenantId = membership?.tenant_id || profile.default_tenant_id
        const tenant = tenantId ? tenantMap.get(tenantId) : null

        userMap.set(profile.id, {
          id: profile.id,
          email: '', // Será preenchido se tiver subscription
          nome: profile.display_name || profile.full_name || 'Usuário',
          role: membership?.role || 'user',
          tenant_id: tenantId || undefined,
          tenant_name: tenant?.name || '',
          created_at: profile.created_at,
          subscription: subscriptions?.find(s => s.user_id === profile.id) || null
        })

        // Debug: verificar matching
        const foundSub = subscriptions?.find(s => s.user_id === profile.id)
        if (foundSub) {
          console.log(`✅ Match: ${profile.display_name || profile.full_name} -> ${foundSub.status}`)
        }
      })

      // Adicionar de subscriptions se não existem (e pegar email do user_id se for email)
      subscriptions?.forEach(sub => {
        if (!userMap.has(sub.user_id)) {
          console.log(`⚠️ Subscription orphan: ${sub.user_id.slice(0, 8)}... (${sub.status}) - Não tem profile!`)
          const membership = membershipMap.get(sub.user_id)
          const tenantId = membership?.tenant_id || sub.tenant_id
          const tenant = tenantId ? tenantMap.get(tenantId) : null

          userMap.set(sub.user_id, {
            id: sub.user_id,
            email: '',
            nome: 'Usuário ' + sub.user_id.slice(0, 8),
            role: membership?.role || 'user',
            tenant_id: tenantId || undefined,
            tenant_name: tenant?.name || '',
            created_at: sub.created_at,
            subscription: sub
          })
        }
      })

      const usersList = Array.from(userMap.values())
      console.log('Profiles:', profiles?.length, '| Subscriptions:', subscriptions?.length, '| Users finais:', usersList.length)
      console.log('Usuários com assinatura ativa:', usersList.filter(u => u.subscription?.status === 'active').length)
      setUsers(usersList)

      // Calcular estatísticas
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const activeCount = subscriptions?.filter(s => s.status === 'active').length || 0
      const canceledCount = subscriptions?.filter(s => s.status === 'canceled').length || 0
      const trialingCount = subscriptions?.filter(s => s.status === 'trialing').length || 0
      const subsThisMonth = subscriptions?.filter(s =>
        new Date(s.created_at) >= firstOfMonth
      ).length || 0
      const usersThisMonth = usersList.filter(u =>
        new Date(u.created_at) >= firstOfMonth
      ).length

      // Calcular MRR
      let mrr = 0
      subscriptions?.filter(s => s.status === 'active').forEach(sub => {
        // Tentar identificar o plano pelo price_id
        if (sub.stripe_price_id) {
          const planPrice = PLAN_PRICES[sub.stripe_price_id] || 49.90 // Default mensal
          mrr += planPrice
        } else {
          mrr += 49.90 // Default mensal
        }
      })

      setStats({
        totalUsers: usersList.length,
        activeSubscriptions: activeCount,
        canceledSubscriptions: canceledCount,
        trialingSubscriptions: trialingCount,
        totalTenants: tenants?.length || 0,
        usersThisMonth,
        subscriptionsThisMonth: subsThisMonth,
        mrr
      })

      // Calcular dados mensais (últimos 6 meses)
      const monthlyStats: MonthlyData[] = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

        const usersInMonth = usersList.filter(u => {
          const created = new Date(u.created_at)
          return created >= monthDate && created < nextMonthDate
        }).length

        const subsInMonth = subscriptions?.filter(s => {
          const created = new Date(s.created_at)
          return created >= monthDate && created < nextMonthDate && s.status === 'active'
        }).length || 0

        monthlyStats.push({
          month: monthName,
          users: usersInMonth,
          subscriptions: subsInMonth,
          revenue: subsInMonth * 49.90
        })
      }
      setMonthlyData(monthlyStats)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // Atualizar status de assinatura
  const updateSubscriptionStatus = async (userId: string, newStatus: 'active' | 'canceled') => {
    setUpdatingSubscription(userId)
    try {
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            status: newStatus,
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          })

        if (error) throw error
      }

      toast.success(`Assinatura ${newStatus === 'active' ? 'ativada' : 'cancelada'} com sucesso!`)
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error)
      toast.error('Erro ao atualizar assinatura')
    } finally {
      setUpdatingSubscription(null)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Filtrar usuários
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()))

    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'active') return matchesSearch && u.subscription?.status === 'active'
    if (filterStatus === 'canceled') return matchesSearch && u.subscription?.status === 'canceled'
    if (filterStatus === 'none') return matchesSearch && !u.subscription

    return matchesSearch
  })

  // Calcular max para o gráfico
  const maxValue = Math.max(...monthlyData.map(d => Math.max(d.users, d.subscriptions)), 1)

  // ============================================================================
  // TELA DE AUTENTICAÇÃO SECUNDÁRIA
  // ============================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.15),transparent_50%)]" />
        </div>

        <div className="relative max-w-md w-full mx-4">
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Super Admin</h1>
              <p className="text-slate-400 text-sm">
                Acesso restrito. Digite a senha de administrador.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Senha de Administrador
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-[1.02]"
              >
                Acessar Painel
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Somente administradores autorizados podem acessar esta área.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // MODAL DE DETALHES DO USUÁRIO
  // ============================================================================
  const UserDetailModal = () => {
    if (!selectedUser) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
        <div className="relative bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => setSelectedUser(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
              {selectedUser.nome.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-white">{selectedUser.nome}</h2>
            <p className="text-sm text-slate-400">{selectedUser.email || 'Email não informado'}</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Informações do Usuário</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID</span>
                  <span className="text-white font-mono text-xs">{selectedUser.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cargo</span>
                  <span className="text-white capitalize">{selectedUser.role || 'Não definido'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Empresa</span>
                  <span className="text-white">{selectedUser.tenant_name || 'Não vinculado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cadastrado em</span>
                  <span className="text-white">{new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Assinatura</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Status</span>
                  {selectedUser.subscription?.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                      <Crown className="w-3 h-3" /> Ativo
                    </span>
                  ) : selectedUser.subscription?.status === 'canceled' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/20 text-rose-400 rounded-full text-xs">
                      <Ban className="w-3 h-3" /> Cancelado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/20 text-slate-400 rounded-full text-xs">
                      <AlertTriangle className="w-3 h-3" /> Sem assinatura
                    </span>
                  )}
                </div>
                {selectedUser.subscription?.current_period_end && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expira em</span>
                    <span className="text-white">{new Date(selectedUser.subscription.current_period_end).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {selectedUser.subscription?.stripe_subscription_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stripe ID</span>
                    <span className="text-white font-mono text-xs truncate max-w-[180px]">{selectedUser.subscription.stripe_subscription_id}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {selectedUser.subscription?.status !== 'active' ? (
                <button
                  onClick={() => {
                    updateSubscriptionStatus(selectedUser.id, 'active')
                    setSelectedUser(null)
                  }}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Ativar Assinatura
                </button>
              ) : (
                <button
                  onClick={() => {
                    updateSubscriptionStatus(selectedUser.id, 'canceled')
                    setSelectedUser(null)
                  }}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Cancelar Assinatura
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // DASHBOARD PRINCIPAL
  // ============================================================================
  return (
    <div className="min-h-screen bg-background text-slate-200 p-6">
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.1),_transparent_50%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white font-outfit">Super Admin</h1>
              <p className="text-slate-400">Painel de administração do Azera CRM</p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">Total de Usuários</span>
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <ChevronUp className="w-3 h-3" /> +{stats.usersThisMonth} este mês
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">Assinaturas Ativas</span>
                <CreditCard className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-emerald-400">{stats.activeSubscriptions}</p>
              <p className="text-xs text-slate-500 mt-1">+{stats.subscriptionsThisMonth} este mês</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">Canceladas</span>
                <XCircle className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-3xl font-bold text-rose-400">{stats.canceledSubscriptions}</p>
              <p className="text-xs text-slate-500 mt-1">{stats.trialingSubscriptions} em trial</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">Total de Equipes</span>
                <Building2 className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalTenants}</p>
              <p className="text-xs text-slate-500 mt-1">Empresas cadastradas</p>
            </div>

            {/* MRR Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-emerald-300">MRR Atual</span>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-emerald-400">
                R$ {stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-emerald-300/70 mt-1">Receita mensal recorrente</p>
            </div>
          </div>
        )}

        {/* Gráfico de Progresso */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Progresso nos Últimos 6 Meses
            </h2>
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white/10 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                title="Gráfico de Barras"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`p-2 rounded-lg transition-all ${chartType === 'line' ? 'bg-white/10 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                title="Gráfico de Linha"
              >
                <LineChart className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Gráfico de Barras */}
          {chartType === 'bar' && (
            <div className="flex items-end gap-4 h-48">
              {monthlyData.map((data) => (
                <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex gap-1 items-end h-40">
                    {/* Barra de usuários */}
                    <div
                      className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(data.users / maxValue) * 100}%`, minHeight: data.users > 0 ? '8px' : '0' }}
                      title={`${data.users} usuários`}
                    />
                    {/* Barra de assinaturas */}
                    <div
                      className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(data.subscriptions / maxValue) * 100}%`, minHeight: data.subscriptions > 0 ? '8px' : '0' }}
                      title={`${data.subscriptions} assinaturas`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">{data.month}</p>
                    <p className="text-xs text-slate-500">{data.users}u / {data.subscriptions}a</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Gráfico de Linha */}
          {chartType === 'line' && (
            <div className="relative h-48">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-t border-white/5 w-full" />
                ))}
              </div>

              {/* SVG Line Chart */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="usersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="subsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Área preenchida - Usuários */}
                <path
                  d={`M0,${192 - (monthlyData[0]?.users / maxValue) * 160} ${monthlyData.map((d, i) => {
                    const x = (i / (monthlyData.length - 1)) * 100
                    const y = 192 - (d.users / maxValue) * 160
                    return `L${x}%,${y}`
                  }).join(' ')} L100%,192 L0,192 Z`}
                  fill="url(#usersGradient)"
                />

                {/* Linha - Usuários */}
                <path
                  d={monthlyData.map((d, i) => {
                    const x = (i / (monthlyData.length - 1)) * 100
                    const y = 192 - (d.users / maxValue) * 160
                    return `${i === 0 ? 'M' : 'L'}${x}%,${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(6, 182, 212)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Área preenchida - Assinaturas */}
                <path
                  d={`M0,${192 - (monthlyData[0]?.subscriptions / maxValue) * 160} ${monthlyData.map((d, i) => {
                    const x = (i / (monthlyData.length - 1)) * 100
                    const y = 192 - (d.subscriptions / maxValue) * 160
                    return `L${x}%,${y}`
                  }).join(' ')} L100%,192 L0,192 Z`}
                  fill="url(#subsGradient)"
                />

                {/* Linha - Assinaturas */}
                <path
                  d={monthlyData.map((d, i) => {
                    const x = (i / (monthlyData.length - 1)) * 100
                    const y = 192 - (d.subscriptions / maxValue) * 160
                    return `${i === 0 ? 'M' : 'L'}${x}%,${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(16, 185, 129)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Pontos - Usuários */}
                {monthlyData.map((d, i) => {
                  const x = (i / (monthlyData.length - 1)) * 100
                  const y = 192 - (d.users / maxValue) * 160
                  return (
                    <circle
                      key={`user-${i}`}
                      cx={`${x}%`}
                      cy={y}
                      r="5"
                      fill="rgb(6, 182, 212)"
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-6 transition-all"
                    >
                      <title>{d.users} usuários em {d.month}</title>
                    </circle>
                  )
                })}

                {/* Pontos - Assinaturas */}
                {monthlyData.map((d, i) => {
                  const x = (i / (monthlyData.length - 1)) * 100
                  const y = 192 - (d.subscriptions / maxValue) * 160
                  return (
                    <circle
                      key={`sub-${i}`}
                      cx={`${x}%`}
                      cy={y}
                      r="5"
                      fill="rgb(16, 185, 129)"
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-6 transition-all"
                    >
                      <title>{d.subscriptions} assinaturas em {d.month}</title>
                    </circle>
                  )
                })}
              </svg>

              {/* Labels do Eixo X */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between pt-2">
                {monthlyData.map((d) => (
                  <div key={d.month} className="text-center flex-1">
                    <p className="text-xs text-slate-400">{d.month}</p>
                    <p className="text-[10px] text-slate-500">{d.users}u / {d.subscriptions}a</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-xs text-slate-400">Usuários</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-400">Assinaturas</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email, empresa ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Assinatura Ativa</option>
            <option value="canceled">Assinatura Cancelada</option>
            <option value="none">Sem Assinatura</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Usuários ({filteredUsers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Criado em</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      Carregando...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-white/5 transition cursor-pointer"
                      onClick={() => setSelectedUser(u)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                            {u.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{u.nome}</p>
                            <p className="text-xs text-slate-500 font-mono">{u.id.slice(0, 20)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-300">{u.tenant_name || '-'}</span>
                      </td>
                      <td className="px-4 py-4">
                        {u.subscription?.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">
                            <Crown className="w-3 h-3" />
                            Ativo
                          </span>
                        ) : u.subscription?.status === 'canceled' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 text-rose-400 rounded-full text-xs font-medium">
                            <Ban className="w-3 h-3" />
                            Cancelado
                          </span>
                        ) : u.subscription?.status === 'trialing' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Trial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/10 text-slate-400 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Sem assinatura
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Calendar className="w-4 h-4" />
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {u.subscription?.status !== 'active' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateSubscriptionStatus(u.id, 'active')
                              }}
                              disabled={updatingSubscription === u.id}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Ativar
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateSubscriptionStatus(u.id, 'canceled')
                              }}
                              disabled={updatingSubscription === u.id}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" />
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de detalhes */}
      <UserDetailModal />
    </div>
  )
}
