import { useState } from 'react'
import { X, Send, Trash2, ShieldAlert } from 'lucide-react'
import { postHeavensTask } from '../../services/heavensService'
import toast from 'react-hot-toast'

export function HeavensFilaModal({ 
  tarefasPêndentes, 
  onClose,
  onTaskAction 
}: { 
  tarefasPêndentes: any[], 
  onClose: () => void,
  onTaskAction: (id: string, updates: any) => void
}) {
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})

  const handlePostar = async (task: any) => {
    try {
      setLoadingIds(p => ({ ...p, [task.id]: true }))
      // Pega data formatação básica
      const dataEntrega = task.data_vencimento ? new Date(task.data_vencimento).toISOString().split('T')[0] : undefined

      const response = await postHeavensTask({
        clientId: task.heavens_client_id,
        projectId: task.heavens_project_id,
        title: task.titulo,
        description: task.descricao,
        type: 'outro', 
        tags: ['automacao-azera'],
        deliveryDate: dataEntrega
      })

      // Atualizar local
      toast.success('Publicado no Heavens AI com sucesso!')
      onTaskAction(task.id, {
        status: 'concluida', // ou publicada
        heavens_demand_id: response.id
      })
    } catch (e: any) {
      console.error(e)
      toast.error('Erro ao postar: ' + e.message)
    } finally {
      setLoadingIds(p => ({ ...p, [task.id]: false }))
    }
  }

  const handleManter = (task: any) => {
    onTaskAction(task.id, { status: 'concluida' })
    toast('Mantida apenas no app local (agora como concluída).')
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in cursor-default p-4">
      <div className="bg-white dark:bg-[#0C1326] rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-outfit text-slate-900 dark:text-white">Fila de Postagem</h2>
              <p className="text-sm text-slate-500">Tarefas aguardando decisão de envio para o Atlas (Heavens AI)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {tarefasPêndentes.length === 0 ? (
            <p className="text-center text-slate-500 py-8">A fila está vazia.</p>
          ) : (
            tarefasPêndentes.map((t) => (
              <div key={t.id} className="p-4 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{t.titulo}</h4>
                  {t.descricao && <p className="text-sm text-slate-500 line-clamp-1 mt-1">{t.descricao}</p>}
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                    <span className="bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                      Heavens Client ID: {t.heavens_client_id ? t.heavens_client_id.slice(0, 8) + '...' : 'Sem Cliente Heavens'}
                    </span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2 h-fit">
                  <button
                    onClick={() => handleManter(t)}
                    disabled={loadingIds[t.id]}
                    className="px-4 py-2 border border-slate-300 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-sm text-slate-600 dark:text-slate-300 transition-colors shrink-0 flex gap-2 items-center"
                  >
                    <Trash2 className="w-4 h-4" />
                    Manter Local
                  </button>
                  <button
                    onClick={() => handlePostar(t)}
                    disabled={loadingIds[t.id] || !t.heavens_client_id}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0 flex gap-2 items-center disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {loadingIds[t.id] ? 'Postando...' : 'Postar no Heavens AI'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
