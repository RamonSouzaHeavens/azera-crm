import { useState, useEffect, useCallback } from 'react'
import {
  ToggleLeft, ToggleRight, Settings, TrendingUp, Clock, UserCheck,
  Webhook, BookOpen, Copy, Check, ExternalLink, AlertCircle,
  Facebook, Zap, Users, Shuffle, Target
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface Vendedor {
  id: string
  user_id: string
  name: string
  email: string
  isActive: boolean
  leadsRecebidos: number
  leadsHoje: number
  ultimoLead?: string
  performance: number
}

interface DistribuicaoLeadsProps {
  teamId: string
  membros: Array<{
    id: string
    nome: string
    email: string
    telefone?: string | null
    role: string
    status: string
  }>
}

type TabType = 'distribuicao' | 'integracao' | 'webhook'

export default function DistribuicaoLeads({ teamId, membros }: DistribuicaoLeadsProps) {
  useAuthStore() // Hook para possíveis funcionalidades futuras
  const [activeTab, setActiveTab] = useState<TabType>('distribuicao')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Estados de configuração
  const [modoDistribuicao, setModoDistribuicao] = useState<'automatico' | 'manual'>('automatico')
  const [vendedores, setVendedores] = useState<Vendedor[]>([])

  // Estatísticas reais
  const [totalLeadsHoje, setTotalLeadsHoje] = useState(0)
  const [totalLeadsGeral, setTotalLeadsGeral] = useState(0)

  // Carregar configurações e vendedores
  const loadData = useCallback(async () => {
    if (!teamId) return
    setLoading(true)

    try {
      // Buscar configuração do tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('meta_leads_distribution_enabled')
        .eq('id', teamId)
        .single()

      // Definir modo baseado na configuração do banco
      setModoDistribuicao(tenantData?.meta_leads_distribution_enabled ? 'automatico' : 'manual')

      // Buscar vendedores (memberships)
      const { data: membershipsData } = await supabase
        .from('memberships')
        .select('id, user_id, role, receive_meta_leads, last_meta_lead_received_at')
        .eq('tenant_id', teamId)
        .eq('active', true)
        .eq('role', 'vendedor')

      // Buscar perfis
      const userIds = membershipsData?.map(m => m.user_id) || []
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .in('id', userIds)

      // Buscar leads por vendedor
      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()

      const { data: leadsData } = await supabase
        .from('clientes')
        .select('id, proprietario_id, created_at')
        .eq('tenant_id', teamId)

      // Combinar dados
      const vendedoresProcessados: Vendedor[] = (membershipsData || []).map(membership => {
        const profile = profilesData?.find(p => p.id === membership.user_id)
        const membroOriginal = membros.find(m => m.id === membership.id)
        const leadsDoVendedor = leadsData?.filter(l => l.proprietario_id === membership.user_id) || []
        const leadsHoje = leadsDoVendedor.filter(l => l.created_at >= inicioHoje).length

        return {
          id: membership.id,
          user_id: membership.user_id,
          name: profile?.full_name || profile?.display_name || membroOriginal?.nome || 'Usuário',
          email: membroOriginal?.email || '',
          isActive: membership.receive_meta_leads || false,
          leadsRecebidos: leadsDoVendedor.length,
          leadsHoje: leadsHoje,
          ultimoLead: membership.last_meta_lead_received_at
            ? new Date(membership.last_meta_lead_received_at).toLocaleDateString('pt-BR')
            : undefined,
          performance: leadsDoVendedor.length > 0 ? Math.min(100, Math.round((leadsHoje / leadsDoVendedor.length) * 100) + 60) : 70
        }
      })

      setVendedores(vendedoresProcessados)

      // Estatísticas
      setTotalLeadsHoje(leadsData?.filter(l => l.created_at >= inicioHoje).length || 0)
      setTotalLeadsGeral(leadsData?.length || 0)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }, [teamId, membros])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Salvar configurações
  const saveSettings = async () => {
    if (!teamId) return
    setSaving(true)

    try {
      // Modo automático = distribuição ativa, modo manual = desativada
      const distribuicaoAtivada = modoDistribuicao === 'automatico'

      // Atualizar tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ meta_leads_distribution_enabled: distribuicaoAtivada })
        .eq('id', teamId)

      if (tenantError) throw tenantError

      // Atualizar vendedores
      for (const vendedor of vendedores) {
        const { error: memberError } = await supabase
          .from('memberships')
          .update({ receive_meta_leads: vendedor.isActive })
          .eq('id', vendedor.id)

        if (memberError) throw memberError
      }

      toast.success('Configurações salvas!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const toggleVendedor = (id: string) => {
    setVendedores(prev =>
      prev.map(v =>
        v.id === id ? { ...v, isActive: !v.isActive } : v
      )
    )
  }

  // Gerar URL do webhook
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co'
  const webhookUrl = `${supabaseUrl}/functions/v1/webhook-receiver`
  const webhookToken = 'azera-crm-token'

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('Copiado!')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const vendedoresAtivos = vendedores.filter(v => v.isActive).length
  const vendedoresTotal = membros.filter(m => m.role === 'vendedor' && m.status === 'ativo')

  const tabs = [
    { id: 'distribuicao' as TabType, label: 'Distribuição', icon: Users },
    { id: 'integracao' as TabType, label: 'Integrar Facebook', icon: Facebook },
    { id: 'webhook' as TabType, label: 'Webhook', icon: Webhook },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Distribuição */}
      {activeTab === 'distribuicao' && (
        <>
          {vendedoresTotal.length === 0 ? (
            <div className="rounded-2xl p-8 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
              <UserCheck className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Nenhum Vendedor na Equipe
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Para configurar a distribuição de leads, você precisa ter pelo menos um membro com a função "Vendedor" na sua equipe.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna Esquerda: Cards de Insights (2x2 grid) */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-500" />
                  Insights
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Card: Vendedores Ativos */}
                  <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                    <UserCheck className="w-5 h-5 text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{vendedoresAtivos}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ativos</p>
                  </div>

                  {/* Card: Leads Hoje */}
                  <div className="rounded-xl p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
                    <Clock className="w-5 h-5 text-cyan-500 mb-2" />
                    <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{totalLeadsHoje}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Hoje</p>
                  </div>

                  {/* Card: Total de Leads */}
                  <div className="rounded-xl p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                    <Target className="w-5 h-5 text-purple-500 mb-2" />
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalLeadsGeral}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                  </div>

                  {/* Card: Modo */}
                  <div className="rounded-xl p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
                    <Settings className="w-5 h-5 text-orange-500 mb-2" />
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {modoDistribuicao === 'automatico' ? 'Auto' : 'Manual'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Modo</p>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Como distribuir leads */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-white/10 p-6 h-full">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Shuffle className="w-5 h-5 text-cyan-500" />
                    Como Distribuir os Leads?
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {/* Botão Automático */}
                    <button
                      onClick={() => setModoDistribuicao('automatico')}
                      className={`group relative overflow-hidden rounded-xl p-5 border-2 transition-all duration-300 ${modoDistribuicao === 'automatico'
                          ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                          : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 hover:border-cyan-500/50 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${modoDistribuicao === 'automatico'
                            ? 'bg-white/20'
                            : 'bg-cyan-500/10'
                          }`}>
                          <Zap className={`w-5 h-5 ${modoDistribuicao === 'automatico' ? 'text-white' : 'text-cyan-500'}`} />
                        </div>
                        <span className="text-lg font-semibold">Automático</span>
                      </div>
                      <p className={`text-sm ${modoDistribuicao === 'automatico' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        Sistema distribui igualmente entre os vendedores ativos (round-robin)
                      </p>
                      {modoDistribuicao === 'automatico' && (
                        <div className="absolute top-3 right-3">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </button>

                    {/* Botão Manual */}
                    <button
                      onClick={() => setModoDistribuicao('manual')}
                      className={`group relative overflow-hidden rounded-xl p-5 border-2 transition-all duration-300 ${modoDistribuicao === 'manual'
                          ? 'bg-gradient-to-br from-purple-500 to-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/25'
                          : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 hover:border-purple-500/50 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${modoDistribuicao === 'manual'
                            ? 'bg-white/20'
                            : 'bg-purple-500/10'
                          }`}>
                          <UserCheck className={`w-5 h-5 ${modoDistribuicao === 'manual' ? 'text-white' : 'text-purple-500'}`} />
                        </div>
                        <span className="text-lg font-semibold">Manual</span>
                      </div>
                      <p className={`text-sm ${modoDistribuicao === 'manual' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        Você escolhe quem recebe cada lead manualmente
                      </p>
                      {modoDistribuicao === 'manual' && (
                        <div className="absolute top-3 right-3">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Dica sobre o modo selecionado */}
                  {modoDistribuicao === 'automatico' && (
                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <p className="text-sm text-cyan-700 dark:text-cyan-300">
                        <strong>✨ Modo Automático:</strong> Novos leads serão distribuídos igualmente entre os vendedores marcados como "Ativos" na lista abaixo.
                      </p>
                    </div>
                  )}

                  {modoDistribuicao === 'manual' && (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        <strong>👤 Modo Manual:</strong> Novos leads chegarão sem responsável. Você poderá atribuí-los manualmente na página de Leads.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Lista de Vendedores */}
          {vendedores.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-500" />
                  Vendedores da Equipe
                </h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {vendedoresAtivos} de {vendedores.length} ativos
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {vendedores.map((vendedor) => (
                  <div key={vendedor.id} className={`rounded-xl p-4 transition-all duration-200 ${vendedor.isActive
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10'
                    }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                          {vendedor.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{vendedor.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{vendedor.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleVendedor(vendedor.id)}
                        className="flex items-center gap-1.5"
                      >
                        {vendedor.isActive ? (
                          <>
                            <ToggleRight className="w-6 h-6 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Ativo</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-6 h-6 text-slate-400" />
                            <span className="text-xs font-medium text-slate-500">Inativo</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-white/50 dark:bg-white/5">
                        <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{vendedor.leadsHoje}</p>
                        <p className="text-[10px] text-slate-500">Hoje</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/50 dark:bg-white/5">
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{vendedor.leadsRecebidos}</p>
                        <p className="text-[10px] text-slate-500">Total</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/50 dark:bg-white/5">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{vendedor.performance}%</p>
                        <p className="text-[10px] text-slate-500">Performance</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-cyan-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Integração Facebook */}
      {activeTab === 'integracao' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center">
                <Facebook className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                  Receba Leads do Facebook Automaticamente
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Configure a integração com Facebook Lead Ads para receber leads em tempo real.
                </p>
              </div>
            </div>
          </div>

          {/* Tutorial */}
          <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-500" />
              Tutorial: Configurar Facebook Lead Ads
            </h3>

            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: 'Acesse o Meta for Developers',
                  desc: 'Vá para developers.facebook.com e acesse seu App.',
                  link: { href: 'https://developers.facebook.com/apps', label: 'Abrir Meta for Developers' }
                },
                {
                  step: 2,
                  title: 'Configure o Webhook',
                  desc: 'No seu App, vá em Webhooks → Selecione objeto Page → Subscribe to this object.',
                  fields: [
                    { label: 'Callback URL', value: webhookUrl, field: 'url' },
                    { label: 'Verify Token', value: webhookToken, field: 'token' }
                  ]
                },
                {
                  step: 3,
                  title: 'Inscreva-se no campo "leadgen"',
                  desc: 'Clique em Subscribe no campo leadgen para receber notificações de novos leads.',
                  warning: 'O App também precisa ter a permissão leads_retrieval aprovada.'
                },
                {
                  step: 4,
                  title: 'Conecte sua Página',
                  desc: 'Vá em Conectar Canais e selecione a página onde seus anúncios estão rodando.'
                }
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{item.desc}</p>

                    {item.link && (
                      <a
                        href={item.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        {item.link.label} <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {item.fields && (
                      <div className="space-y-3 mt-3">
                        {item.fields.map((f) => (
                          <div key={f.field}>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{f.label}</label>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-black/20 rounded-lg text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                                {f.value}
                              </code>
                              <button
                                onClick={() => copyToClipboard(f.value, f.field)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition"
                              >
                                {copiedField === f.field ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.warning && (
                      <div className="p-3 mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-500/20">
                        <p className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{item.warning}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Webhook */}
      {activeTab === 'webhook' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Webhook className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                  Webhook para Integração Externa
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Use este webhook para receber leads de qualquer plataforma externa.
                </p>
              </div>
            </div>
          </div>

          {/* URL */}
          <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Seu Endpoint de Webhook
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400 block mb-2">URL do Webhook (POST)</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 bg-slate-100 dark:bg-black/30 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-200 break-all border border-slate-200 dark:border-white/10">
                    {webhookUrl}?tenant_id={teamId}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`${webhookUrl}?tenant_id=${teamId}`, 'webhook')}
                    className="p-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl transition"
                  >
                    {copiedField === 'webhook' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Formato do Payload (JSON)
                </h4>
                <pre className="text-sm font-mono text-slate-700 dark:text-slate-300 overflow-x-auto p-3 bg-slate-100 dark:bg-black/30 rounded-lg">
                  {`{
  "nome": "João Silva",
  "email": "joao@email.com",
  "telefone": "11999999999",
  "origem": "landing-page",
  "valor_potencial": 5000,
  "notas": "Interessado no produto X"
}`}
                </pre>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  <strong>Dica:</strong> Use plataformas como Zapier, Make (Integromat), ou n8n para conectar seus formulários.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
