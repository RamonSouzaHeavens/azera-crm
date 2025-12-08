import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next' // Importação adicionada
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'

type Props = {
  isOpen: boolean
  onClose: () => void
  rows: Record<string, string>[]
  onOptimized?: (optimizedRows: Record<string, unknown>[]) => void
}

export default function ImportCsvOptimize({ isOpen, onClose, rows, onOptimized }: Props) {
  const { t } = useTranslation() // Hook instanciado
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeProgress, setOptimizeProgress] = useState(0)
  const [optimizedRows, setOptimizedRows] = useState<Record<string, unknown>[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [aiRawResponse, setAiRawResponse] = useState<string | null>(null)
  const [aiRawVisible, setAiRawVisible] = useState(false)

  const handleOptimize = useCallback(async () => {
    const member = useAuthStore.getState().member
    if (!member?.tenant_id) {
      return toast.error(t('importCsvOptimize.toasts.errorNoTenant'))
    }
    if (rows.length === 0) return toast.error(t('importCsvOptimize.toasts.errorNoRecords'))

    try {
      setOptimizing(true)
      setOptimizeProgress(0)
      setOptimizedRows([])
      setShowPreview(false)
      toast(t('importCsvOptimize.toasts.starting'))

      // Processar em lotes de 8 para garantir resposta completa
      const batchSize = 8
      const allTransformed: Record<string, unknown>[] = []

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, Math.min(i + batchSize, rows.length))
        const batchNum = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(rows.length / batchSize)

        toast(t('importCsvOptimize.toasts.batchProgress', { current: batchNum, total: totalBatches }), { id: 'optimize-progress' })

        // Nota: O prompt em si continua hardcoded pois contém instruções técnicas específicas para a IA
        // Se desejar traduzir o prompt para suportar inputs em outros idiomas, isso exigiria uma estratégia diferente.
        const prompt = `Normalize ${batch.length} imóveis. OBRIGATÓRIO: campo "nome" deve sempre existir e não ser null.

Extraia: nome (OBRIGATÓRIO), preco, tipo, fase, entrega, area_total, quartos, endereco, bairro, tags, ativo, destaque.

Regras: Separe dados compostos. Remova R$. Se não tiver nome, use descrição ou endereço. Responda SÓ JSON.

CSV: ${JSON.stringify(batch)}

Array JSON:`

        // Chamar Edge Function no Supabase
        const { data, error } = await supabase.functions.invoke('openai-proxy', {
          body: {
            tenant_id: member.tenant_id,
            prompt,
            max_tokens: 1500,
            model: 'gpt-4o-mini'
          }
        })

        if (error) {
          throw new Error(t('importCsvOptimize.errors.edgeFunction', { message: error.message }))
        }

        const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text
        if (!text) throw new Error(t('importCsvOptimize.errors.noAiResponse', { batch: batchNum }))

        setAiRawResponse(text)

        // Parse robusto do JSON
        let parsed: unknown[] = []
        try {
          // Tentar remover bloco de código markdown se existir
          let cleanText = text.trim()
          if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
          } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
          }

          parsed = JSON.parse(cleanText)
        } catch {
          // Tentar extrair array entre [ e ]
          const first = text.indexOf('[')
          const last = text.lastIndexOf(']')
          if (first >= 0 && last > first) {
            let candidate = text.slice(first, last + 1)
            // Sanitizar
            candidate = candidate
              .replace(/,(\s*[}\]])/g, '$1')
              .replace(/,(\s*,)/g, '$1')
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')

            try {
              parsed = JSON.parse(candidate)
            } catch {
              console.error(`Lote ${batchNum}: Parse falhou até após sanitização`)
              console.error('Raw:', text)
              console.error('Candidate:', candidate)
              throw new Error(t('importCsvOptimize.errors.invalidJson', { batch: batchNum }))
            }
          } else {
            throw new Error(t('importCsvOptimize.errors.noJsonArray', { batch: batchNum }))
          }
        }

        if (!Array.isArray(parsed)) {
          throw new Error(t('importCsvOptimize.errors.notArray', { batch: batchNum }))
        }

        allTransformed.push(...(parsed as Record<string, unknown>[]))

        // Atualizar progresso
        const processed = Math.min(i + batchSize, rows.length)
        setOptimizeProgress(Math.round((processed / rows.length) * 100))
      }

      setOptimizedRows(allTransformed)
      setShowPreview(true)
      toast.success(t('importCsvOptimize.toasts.success', { count: allTransformed.length }))
    } catch (err) {
      console.error('Optimize error:', err)
      toast.error(t('importCsvOptimize.toasts.optimizeError', { message: err instanceof Error ? err.message : String(err) }))
    } finally {
      setOptimizing(false)
      setOptimizeProgress(0)
    }
  }, [rows, t])

  const handleApply = useCallback(() => {
    if (optimizedRows.length === 0) {
      toast.error(t('importCsvOptimize.toasts.noDataToApply'))
      return
    }
    onOptimized?.(optimizedRows)
    toast.success(t('importCsvOptimize.toasts.dataApplied'))
    onClose()
  }, [optimizedRows, onOptimized, onClose, t])

  const previewRows = optimizedRows.slice(0, 5)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('importCsvOptimize.title')} maxWidthClass="max-w-3xl">
      <div className="space-y-6">
        {/* Estado: Aguardando otimização */}
        {!optimizing && optimizedRows.length === 0 && (
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-300 dark:border-emerald-500/30 rounded-3xl">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                  {t('importCsvOptimize.waiting.header', { count: rows.length })}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {t('importCsvOptimize.waiting.description')}
                </p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-4">
                  <li>{t('importCsvOptimize.waiting.features.split')}</li>
                  <li>{t('importCsvOptimize.waiting.features.normalize')}</li>
                  <li>{t('importCsvOptimize.waiting.features.fill')}</li>
                  <li>{t('importCsvOptimize.waiting.features.standardize')}</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {t('importCsvOptimize.waiting.estimatedTime', { seconds: Math.ceil((rows.length / 15) * 3) })}
              </span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleOptimize} disabled={optimizing}>
                  {t('importCsvOptimize.buttons.start')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Estado: Otimizando */}
        {optimizing && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('importCsvOptimize.progress.processing')}
                </span>
                <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{optimizeProgress}%</span>
              </div>

              {/* Barra de progresso grande e visível */}
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800/70 rounded-full overflow-hidden border border-cyan-500/30 shadow-lg">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 transition-all duration-500 rounded-full shadow-lg shadow-cyan-500/50"
                  style={{ width: `${optimizeProgress}%` }}
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 justify-center">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-sm text-slate-400">{t('importCsvOptimize.progress.transforming')}</span>
              </div>
            </div>

            {/* Debug: Resposta bruta (opcional) */}
            {aiRawResponse && (
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/6 rounded">
                <button
                  className="text-xs text-slate-600 dark:text-slate-400 underline hover:text-slate-700 dark:hover:text-slate-300"
                  onClick={() => setAiRawVisible(v => !v)}
                >
                  {aiRawVisible ? t('importCsvOptimize.debug.hideRaw') : t('importCsvOptimize.debug.showRaw')}
                </button>
                {aiRawVisible && (
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300 max-h-48 overflow-auto bg-slate-50 dark:bg-slate-900/60 p-2 rounded">
                    {aiRawResponse}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Estado: Otimização completa - Preview */}
        {showPreview && optimizedRows.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <div>
                  <h3 className="font-semibold text-emerald-300">
                    {t('importCsvOptimize.preview.header', { count: optimizedRows.length })}
                  </h3>
                  <p className="text-xs text-slate-400">{t('importCsvOptimize.preview.review')}</p>
                </div>
              </div>
            </div>

            {/* Preview da tabela */}
            <div className="border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/2 overflow-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="sticky top-0 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-white/10 z-10">
                    {previewRows.length > 0 &&
                      Object.keys(previewRows[0]).map(k => (
                        <th key={k} className="px-3 py-2 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                          {k}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className={`border-t border-slate-200 dark:border-white/5 ${idx % 2 === 0 ? 'bg-slate-100 dark:bg-white/3' : ''}`}>
                      {Object.entries(row).map(([k, v]) => (
                        <td key={k} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          <div className="max-w-xs truncate" title={String(v)}>
                            {v === null || v === undefined
                              ? '—'
                              : Array.isArray(v)
                                ? `[${v.join(', ')}]`
                                : String(v)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleApply} className="bg-emerald-600 hover:bg-emerald-700">
                {t('importCsvOptimize.buttons.apply')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}