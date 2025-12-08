import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Automacao } from '../../services/automacaoService'

interface ModalAutomacaoProps {
  aberto: boolean
  automacao?: Automacao
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSalvar: (dados: any) => Promise<void>
  onFechar: () => void
}

export function ModalAutomacao({
  aberto,
  automacao,
  onSalvar,
  onFechar,
}: ModalAutomacaoProps) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState(automacao?.nome || '')
  const [tipo, setTipo] = useState<'webhook' | 'api'>(automacao?.tipo || 'webhook')
  const [url, setUrl] = useState(automacao?.url || '')
  const [metodo, setMetodo] = useState<'GET' | 'POST' | 'PUT' | 'PATCH'>(
    automacao?.metodo_http || 'POST'
  )
  const [entidade, setEntidade] = useState<'produtos' | 'leads' | 'imoveis' | 'tarefas'>(
    automacao?.entidade_alvo || 'produtos'
  )
  const [evento, setEvento] = useState<'criacao' | 'atualizacao' | 'delecao' | 'manual'>(
    automacao?.evento || 'criacao'
  )
  const [headers, setHeaders] = useState(
    automacao?.headers ? JSON.stringify(automacao.headers, null, 2) : ''
  )
  const [bodyTemplate, setBodyTemplate] = useState(automacao?.body_template || '')
  const [frequencia, setFrequencia] = useState(automacao?.frequencia_minutos?.toString() || '')

  const handleSalvar = async () => {
    if (!nome.trim() || !url.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      const headersObj = headers ? JSON.parse(headers) : {}

      await onSalvar({
        nome: nome.trim(),
        tipo,
        url: url.trim(),
        metodo_http: metodo,
        entidade_alvo: entidade,
        evento,
        headers: headersObj,
        body_template: bodyTemplate || undefined,
        frequencia_minutos: frequencia ? parseInt(frequencia) : undefined,
        ativo: automacao?.ativo ?? true,
      })

      onFechar()
    } catch (err) {
      const erro = err instanceof Error ? err.message : 'Erro ao salvar'
      toast.error(erro)
    } finally {
      setLoading(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onFechar}
      />
      <div className="absolute bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full mx-auto border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {automacao ? '✏️ Editar Automação' : '➕ Nova Automação'}
          </h2>
          <button
            onClick={onFechar}
            className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {/* Básicos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Sincronização CRM"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'webhook' | 'api')}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="webhook">🪝 Webhook</option>
                <option value="api">📡 API</option>
              </select>
            </div>
          </div>

          {/* URL e Método */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="https://seu-sistema.com/webhook"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Método HTTP
              </label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH')}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>

          {/* Entidade e Evento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Entidade Alvo
              </label>
              <select
                value={entidade}
                onChange={(e) => setEntidade(e.target.value as 'produtos' | 'leads' | 'imoveis' | 'tarefas')}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="produtos">Produtos/Imóveis</option>
                <option value="leads">Leads/Clientes</option>
                <option value="imoveis">Imóveis</option>
                <option value="tarefas">Tarefas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Evento
              </label>
              <select
                value={evento}
                onChange={(e) => setEvento(e.target.value as 'criacao' | 'atualizacao' | 'delecao' | 'manual')}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="criacao">➕ Criação</option>
                <option value="atualizacao">✏️ Atualização</option>
                <option value="delecao">🗑️ Deleção</option>
                <option value="manual">⚙️ Manual</option>
              </select>
            </div>
          </div>

          {/* Headers (JSON) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Headers HTTP (JSON)
            </label>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
              rows={2}
              placeholder='{"Authorization": "Bearer TOKEN", "X-Custom": "value"}'
            />
          </div>

          {/* Body Template */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Template do Body (JSON)
            </label>
            <textarea
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
              rows={2}
              placeholder='{"id": "{id}", "nome": "{nome}", "preco": "{preco}"}'
            />
          </div>

          {/* Frequência */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Frequência (minutos) - Opcional
            </label>
            <input
              type="number"
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="Ex: 60 (para executar a cada 1 hora)"
              min="1"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium transition-colors flex items-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {automacao ? 'Salvar' : 'Criar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
