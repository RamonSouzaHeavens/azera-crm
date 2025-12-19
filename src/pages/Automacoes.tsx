import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Zap, AlertCircle, Loader, Link2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import {
  listarAutomacoes,
  criarAutomacao,
  atualizarAutomacao,
  deletarAutomacao,
  testarAutomacao,
  type Automacao
} from '../services/automacaoService'
import { CardWebhook } from '../components/automacoes/CardWebhook'
import { ModalAutomacao } from '../components/automacoes/ModalAutomacao'
import PremiumGate from '../components/premium/PremiumGate'

export default function Automacoes() {
  const navigate = useNavigate()
  const { tenant, member } = useAuthStore()
  const { isDark } = useThemeStore()
  const { t } = useTranslation()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])

  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState(true)
  const [testando, setTestando] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [automacaoEditando, setAutomacaoEditando] = useState<Automacao | undefined>()
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'inativos'>('todos')

  // Verificar acesso (apenas proprietários e administradores)
  const possuiAcesso = useMemo(() => {
    if (!member) return false
    return ['owner', 'admin'].includes(member.role)
  }, [member])

  // Bloqueio para usuários sem permissão
  if (!possuiAcesso) {
    return (
      <div className="min-h-full bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold font-outfit text-white mb-2">
            {t('automations.accessRestricted')}
          </h1>
          <p className="text-slate-400 mb-6">
            {t('automations.accessRestrictedDesc')}
          </p>
          <div className="bg-blue-900/20 border border-blue-900/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              {t('automations.contactOwner')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Carregar automações
  useEffect(() => {
    const carregar = async () => {
      if (!tenantId) return

      setLoading(true)
      try {
        const dados = await listarAutomacoes(tenantId)
        setAutomacoes(dados)
      } catch (err) {
        const erro = err instanceof Error ? err.message : t('automations.loadError')
        toast.error(erro)
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [tenantId])

  // Filtrar automações
  const automacoesFiltradas = useMemo(() => {
    return automacoes.filter(a => {
      if (filtro === 'ativos') return a.ativo
      if (filtro === 'inativos') return !a.ativo
      return true
    })
  }, [automacoes, filtro])

  // Abrir modal para criar
  const abrirNovaAutomacao = () => {
    setAutomacaoEditando(undefined)
    setModalAberto(true)
  }

  // Abrir modal para editar
  const abrirEditarAutomacao = (automacao: Automacao) => {
    setAutomacaoEditando(automacao)
    setModalAberto(true)
  }

  // Salvar automação
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSalvarAutomacao = async (dados: any) => {
    try {
      if (automacaoEditando) {
        // Editar
        const atualizada = await atualizarAutomacao(automacaoEditando.id, dados)
        setAutomacoes(prev => prev.map(a => a.id === atualizada.id ? atualizada : a))
        toast.success(t('automations.updated'))
      } else {
        // Criar
        const novaAutomacao = await criarAutomacao(tenantId, dados)
        setAutomacoes(prev => [novaAutomacao, ...prev])
        toast.success(t('automations.created'))
      }
    } catch (err) {
      const erro = err instanceof Error ? err.message : t('automations.saveError')
      toast.error(erro)
      throw err
    }
  }

  // Deletar automação
  const handleDeletarAutomacao = async (id: string) => {
    try {
      await deletarAutomacao(id)
      setAutomacoes(prev => prev.filter(a => a.id !== id))
      toast.success(t('automations.deleted'))
    } catch (err) {
      const erro = err instanceof Error ? err.message : t('automations.deleteError')
      toast.error(erro)
    }
  }

  // Testar automação
  const handleTestarAutomacao = async (automacao: Automacao) => {
    setTestando(automacao.id)
    try {
      const resultado = await testarAutomacao(automacao)
      if (resultado.sucesso) {
        toast.success(t('automations.testSuccess'))
      } else {
        toast.error(t('automations.testError', { error: resultado.erro || t('automations.unknown') }))
      }

      // Atualizar lista com novo status
      const atualizada = await listarAutomacoes(tenantId)
      setAutomacoes(atualizada)
    } catch (err) {
      const erro = err instanceof Error ? err.message : t('automations.testGenericError')
      toast.error(erro)
    } finally {
      setTestando(null)
    }
  }

  // Toggle ativo/inativo
  const handleToggleAtivo = async (id: string, novoStatus: boolean) => {
    try {
      const atualizada = await atualizarAutomacao(id, { ativo: novoStatus })
      setAutomacoes(prev => prev.map(a => a.id === atualizada.id ? atualizada : a))
      toast.success(novoStatus ? t('automations.activated') : t('automations.deactivated'))
    } catch (err) {
      const erro = err instanceof Error ? err.message : t('automations.updateError')
      toast.error(erro)
    }
  }

  return (
    <PremiumGate featureName="Automações">
      <div className="text-slate-900 dark:text-slate-200 flex flex-col min-h-full relative overflow-hidden">
        {/* HUD glow grid background + overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
          {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:120px_120px]" /> */}
        </div>

        <div className="flex-1 overflow-y-auto pb-6 px-6 relative z-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Zap className="w-7 h-7" />
                </div>
                <div>
                  <h1 className={`text-4xl font-bold font-outfit ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('automations.title')}</h1>
                  <p className={`text-base mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('automations.subtitle')}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/automacoes/webhooks')}
                  className={`px-5 py-3 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 ${isDark
                    ? 'bg-white/10 hover:bg-white/15 border border-white/20 text-white hover:shadow-cyan-500/10'
                    : 'bg-slate-200/80 hover:bg-slate-300/80 border border-slate-300 text-slate-700 hover:shadow-slate-400/20'
                    }`}
                >
                  <Link2 className="w-5 h-5" />
                  <span className="hidden sm:inline">{t('automations.webhooks')}</span>
                </button>
                <button
                  onClick={abrirNovaAutomacao}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">{t('automations.new')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-8 items-start">
            {/* Main Content */}
            <div className="flex-1 w-full">
              {/* Filtros */}
              <div className="flex gap-2 mb-8">
                {(['todos', 'ativos', 'inativos'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 text-sm ${filtro === f
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                      : isDark
                        ? 'bg-white/10 text-slate-300 hover:bg-white/15 border border-white/10'
                        : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300/80 border border-slate-300'
                      }`}
                  >
                    {f === 'todos' && t('automations.filterAll', { count: automacoes.length })}
                    {f === 'ativos' && t('automations.filterActive', { count: automacoes.filter(a => a.ativo).length })}
                    {f === 'inativos' && t('automations.filterInactive', { count: automacoes.filter(a => !a.ativo).length })}
                  </button>
                ))}
              </div>

              {/* Loading */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-center">
                    <Loader className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
                    <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('automations.loading')}</p>
                  </div>
                </div>
              ) : automacoesFiltradas.length === 0 ? (
                <div className={`text-center py-16 rounded-3xl backdrop-blur-sm ${isDark
                  ? 'bg-white/5 border-2 border-dashed border-white/10'
                  : 'bg-slate-100/50 border-2 border-dashed border-slate-300'
                  }`}>
                  <Zap className={`w-14 h-14 mx-auto mb-4 ${isDark ? 'text-slate-500 opacity-40' : 'text-slate-400'}`} />
                  <p className={`font-semibold mb-2 text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('automations.emptyTitle', { filter: filtro !== 'todos' ? filtro : t('automations.emptyRegistered') })}
                  </p>
                  <p className={`text-sm mb-6 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    {t('automations.emptyDescription')}
                  </p>
                  {filtro === 'todos' && (
                    <button
                      onClick={abrirNovaAutomacao}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      {t('automations.createFirst')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {automacoesFiltradas.map((automacao) => (
                    <div key={automacao.id} className="relative">
                      {testando === automacao.id && (
                        <div className={`absolute inset-0 rounded-xl flex items-center justify-center z-10 backdrop-blur-sm ${isDark ? 'bg-white/50 dark:bg-slate-800/50' : 'bg-white/70'
                          }`}>
                          <div className="flex flex-col items-center gap-2">
                            <Loader className="w-6 h-6 text-purple-500 animate-spin" />
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-700 dark:text-slate-300' : 'text-slate-700'}`}>{t('automations.testing')}</span>
                          </div>
                        </div>
                      )}
                      <CardWebhook
                        automacao={automacao}
                        onEdit={abrirEditarAutomacao}
                        onDelete={handleDeletarAutomacao}
                        onTest={handleTestarAutomacao}
                        onToggleAtivo={handleToggleAtivo}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Sticky */}
            <div className="xl:w-80 flex-shrink-0 sticky top-6">
              <div className={`p-5 border rounded-3xl flex flex-col gap-4 backdrop-blur-sm ${isDark
                ? 'bg-blue-500/10 border-blue-500/20'
                : 'bg-blue-50 border-blue-200'
                }`}>
                <div className="flex items-center gap-3">
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <p className={`font-semibold ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>{t('automations.howItWorks')}</p>
                </div>
                <div className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                  <ul className={`space-y-3 text-sm list-disc list-inside ${isDark ? 'text-blue-300/90' : 'text-blue-700'}`}>
                    <li>{t('automations.step1')}</li>
                    <li>{t('automations.step2')}</li>
                    <li>{t('automations.step3')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Modal */}
          <ModalAutomacao
            aberto={modalAberto}
            automacao={automacaoEditando}
            onSalvar={handleSalvarAutomacao}
            onFechar={() => {
              setModalAberto(false)
              setAutomacaoEditando(undefined)
            }}
          />
        </div>

      </div>
    </PremiumGate>
  )
}
