import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { allStages, NewObjectionPayload } from '../../hooks/useObjectionPlaybook'

interface ObjectionFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: NewObjectionPayload) => Promise<unknown> | unknown
  initial?: Partial<NewObjectionPayload>
  saving?: boolean
  error?: string | null
  hasTeam?: boolean
  teamId?: string | null
}

const tacticSuggestions = ['Foco no Valor', 'Urgência', 'Urgência suave', 'Diferenciação', 'Prova Social']

export function ObjectionFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  saving,
  error,
  hasTeam,
  teamId
}: ObjectionFormModalProps) {
  const [objection, setObjection] = useState(initial?.objection ?? '')
  const [response, setResponse] = useState(initial?.response ?? '')
  const [stage, setStage] = useState<NewObjectionPayload['stage']>(initial?.stage ?? allStages[0])
  const [tactic, setTactic] = useState(initial?.tactic ?? '')
  const [shareTeam, setShareTeam] = useState(Boolean(initial?.team_id))

  useEffect(() => {
    if (isOpen) {
      setObjection(initial?.objection ?? '')
      setResponse(initial?.response ?? '')
      setStage(initial?.stage ?? allStages[0])
      setTactic(initial?.tactic ?? '')
      setShareTeam(Boolean(initial?.team_id))
    }
  }, [initial, isOpen])

  const submitDisabled = useMemo(
    () => !objection.trim() || !response.trim() || !tactic.trim(),
    [objection, response, tactic]
  )

  const handleSubmit = async () => {
    if (submitDisabled) return
    const payload: NewObjectionPayload = {
      objection: objection.trim(),
      response: response.trim(),
      tactic: tactic.trim(),
      stage
    }

    if (!shareTeam) {
      payload.team_id = null
    } else if (teamId) {
      payload.team_id = teamId
    }

    await onSave(payload)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {initial ? 'Editar card' : 'Novo card'}
            </p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {initial ? 'Aprimore sua resposta' : 'Adicionar nova objeção'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-1">
            <label className="block text-xs uppercase tracking-wider text-slate-500">Objeção</label>
            <textarea
              value={objection}
              onChange={(e) => setObjection(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs uppercase tracking-wider text-slate-500">Resposta sugerida</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500">Etapa do funil</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as NewObjectionPayload['stage'])}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
              >
                {allStages.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-slate-500">Tática</label>
              <input
                list="tactics"
                value={tactic}
                onChange={(e) => setTactic(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                placeholder="Ex: Foco no Valor"
              />
              <datalist id="tactics">
                {tacticSuggestions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
          </div>

          {hasTeam && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shareTeam"
                checked={shareTeam}
                onChange={(e) => setShareTeam(e.target.checked)}
                className="rounded border border-slate-300 bg-white text-cyan-500 focus:ring-0"
              />
              <label htmlFor="shareTeam" className="text-sm text-slate-600 dark:text-slate-300">
                Compartilhar com minha equipe
              </label>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-500 mt-2">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitDisabled || saving}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-cyan-600 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar card'}
          </button>
        </div>
      </div>
    </div>
  )
}
