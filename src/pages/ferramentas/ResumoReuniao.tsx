import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock3, ListChecks, Sparkles } from 'lucide-react'
import { aiService } from '../../services/aiService'
import toast from 'react-hot-toast'

export default function ResumoReuniao() {
  const navigate = useNavigate()
  const [transcript, setTranscript] = useState(
    'Cliente revelou preocupação com integração e pediu um piloto para comprovar valor. A equipe comercial quer datas e próximos passos claros.'
  )
  const [summary, setSummary] = useState<string>('')
  const [actions, setActions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleSummarize = async () => {
    if (!transcript) return
    setLoading(true)
    try {
      const { data, error } = await aiService.summarizeMeeting(transcript)
      if (error) throw new Error(error)

      setSummary(data.summary)
      setActions(data.action_items || [])
      toast.success('Resumo gerado com sucesso!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar resumo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto p-6 md:p-10 min-h-screen text-slate-900 dark:text-slate-100">
      <button
        onClick={() => navigate('/app/ferramentas-pro')}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Ferramentas Pro
      </button>

      <div className="flex flex-col gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Resumo de Reunião</h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
          Transforme o conteúdo da reunião em um resumo objetivo e liste próximos passos automaticamente.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <label className="text-xs uppercase text-slate-500 tracking-wider">Transcrição / notas</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={7}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSummarize}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 font-semibold text-white text-sm shadow-lg transition-all hover:from-cyan-500 hover:to-blue-500 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Gerando...' : 'Gerar resumo e próximos passos'}
          </button>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock3 className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <span className="text-xs uppercase tracking-wider text-slate-500">Resumo</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{summary || 'Clique em gerar resumo para visualizar um sumário objetivo.'}</p>
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs uppercase tracking-wider text-slate-500">Próximos passos</span>
          </div>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
            {actions.length > 0 ? (
              actions.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>Gere o resumo para visualizar os próximos passos sugeridos.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
