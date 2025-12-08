import { useState, useCallback } from 'react'
import { Copy, Check, Eye, EyeOff, Zap, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { useThemeStore } from '../../stores/themeStore'
import type { Automacao } from '../../services/automacaoService'
import { obterWebhookUrl } from '../../services/automacaoService'

interface CardWebhookProps {
  automacao: Automacao
  onEdit: (automacao: Automacao) => void
  onDelete: (id: string) => void
  onTest: (automacao: Automacao) => void
  onToggleAtivo: (id: string, ativo: boolean) => void
}

export function CardWebhook({
  automacao,
  onEdit,
  onDelete,
  onTest,
  onToggleAtivo,
}: CardWebhookProps) {
  const [mostrarSecret, setMostrarSecret] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const { isDark } = useThemeStore()

  const webhookUrl = automacao.tipo === 'webhook' ? obterWebhookUrl(automacao.id) : undefined

  const copiarSecret = useCallback(() => {
    if (!automacao.webhook_secret) return
    navigator.clipboard.writeText(automacao.webhook_secret)
    setCopiado(true)
    toast.success('Secret copiado!')
    setTimeout(() => setCopiado(false), 2000)
  }, [automacao.webhook_secret])

  const copiarUrl = useCallback(() => {
    if (!webhookUrl) return
    navigator.clipboard.writeText(webhookUrl)
    toast.success('URL copiada!')
  }, [webhookUrl])

  return (
    <div className={`rounded-3xl p-6 transition-all duration-300 backdrop-blur-sm ${
      isDark 
        ? 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10' 
        : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {automacao.nome}
            </h3>
            <span className="px-3 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 rounded-full">
              {automacao.tipo === 'webhook' ? 'Webhook' : 'API'}
            </span>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              automacao.ativo
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-500/20 text-slate-400'
            }`}>
              {automacao.ativo ? '● Ativo' : '● Inativo'}
            </span>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {automacao.entidade_alvo} • {automacao.evento} • {automacao.metodo_http}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleAtivo(automacao.id, !automacao.ativo)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              automacao.ativo
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
            }`}
          >
            {automacao.ativo ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>

      {/* URL */}
      <div className={`mb-4 p-4 rounded-2xl ${
        isDark 
          ? 'bg-white/5 border border-white/10' 
          : 'bg-slate-50 border border-slate-200'
      }`}>
        <p className={`text-xs mb-2 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>URL</p>
        <div className="flex items-center gap-2">
          <code className={`flex-1 text-xs p-3 rounded-lg border overflow-x-auto font-mono ${
            isDark 
              ? 'bg-slate-950/50 border-white/10 text-slate-300' 
              : 'bg-slate-100 border-slate-300 text-slate-700'
          }`}>
            {automacao.url}
          </code>
          <button
            onClick={() => window.open(automacao.url, '_blank')}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'
            }`}
            title="Abrir em nova aba"
          >
            <ExternalLink className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
        </div>
      </div>

      {/* Secret (para webhooks) */}
      {automacao.tipo === 'webhook' && automacao.webhook_secret && (
        <div className={`mb-4 p-4 rounded-2xl ${
          isDark 
            ? 'bg-white/5 border border-white/10' 
            : 'bg-slate-50 border border-slate-200'
        }`}>
          <p className={`text-xs mb-2 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Webhook Secret</p>
          <div className="flex items-center gap-2">
            <code className={`flex-1 text-xs p-3 rounded-lg border font-mono ${
              isDark 
                ? 'bg-slate-950/50 border-white/10 text-slate-300' 
                : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              {mostrarSecret ? automacao.webhook_secret : '••••••••••••••••'}
            </code>
            <button
              onClick={() => setMostrarSecret(!mostrarSecret)}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'
              }`}
              title={mostrarSecret ? 'Ocultar' : 'Mostrar'}
            >
              {mostrarSecret ? (
                <EyeOff className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
              ) : (
                <Eye className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
              )}
            </button>
            <button
              onClick={copiarSecret}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'
              }`}
              title="Copiar secret"
            >
              {copiado ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Webhook URL (para webhooks) */}
      {automacao.tipo === 'webhook' && webhookUrl && (
        <div className={`mb-4 p-4 rounded-2xl ${
          isDark 
            ? 'bg-white/5 border border-white/10' 
            : 'bg-slate-50 border border-slate-200'
        }`}>
          <p className={`text-xs mb-2 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Webhook URL</p>
          <div className="flex items-center gap-2">
            <code className={`flex-1 text-xs p-3 rounded-lg border overflow-x-auto font-mono ${
              isDark 
                ? 'bg-slate-950/50 border-white/10 text-slate-300' 
                : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              {webhookUrl}
            </code>
            <button
              onClick={copiarUrl}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'
              }`}
              title="Copiar URL"
            >
              <Copy className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      {automacao.ultimo_status && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl ${
            isDark 
              ? 'bg-white/5 border border-white/10' 
              : 'bg-slate-50 border border-slate-200'
          }`}>
            <p className={`text-xs mb-2 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Último Status</p>
            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
              automacao.ultimo_status === 'sucesso'
                ? 'bg-emerald-500/20 text-emerald-300'
                : automacao.ultimo_status === 'erro'
                ? 'bg-red-500/20 text-red-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}>
              {automacao.ultimo_status === 'sucesso' ? '✓ Sucesso' : automacao.ultimo_status === 'erro' ? '✕ Erro' : '⏳ Pendente'}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${
            isDark 
              ? 'bg-white/5 border border-white/10' 
              : 'bg-slate-50 border border-slate-200'
          }`}>
            <p className={`text-xs mb-2 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tentativas</p>
            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{automacao.tentativas_falhadas}</span>
          </div>
        </div>
      )}

      {automacao.ultimo_erro && (
        <div className="mb-5 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
          <p className="text-xs text-red-300 truncate font-mono">{automacao.ultimo_erro}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onTest(automacao)}
          className="flex-1 px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 border border-purple-500/30"
        >
          <Zap className="w-4 h-4" />
          Testar
        </button>
        <button
          onClick={() => onEdit(automacao)}
          className="flex-1 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl text-sm font-semibold transition-all duration-200 border border-blue-500/30"
        >
          Editar
        </button>
        <button
          onClick={() => {
            if (confirm('Tem certeza que deseja deletar esta automação?')) {
              onDelete(automacao.id)
            }
          }}
          className="flex-1 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-sm font-semibold transition-all duration-200 border border-red-500/30"
        >
          Deletar
        </button>
      </div>
    </div>
  )
}
