import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Zap } from 'lucide-react'
import { listDeliveriesBySubscription, resendDelivery } from '../../services/webhookService'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

export function WebhookLogs({ subscriptionId }: { subscriptionId: string | null }) {
  const { tenant, member } = useAuthStore()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [triggeringDispatcher, setTriggeringDispatcher] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!subscriptionId) return
      setLoading(true)
      try {
        const dados = await listDeliveriesBySubscription(subscriptionId, 100)
        setLogs(dados || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [subscriptionId])

  const handleResend = async (id: string) => {
    try {
      await resendDelivery(id)
      toast.success('Reenvio agendado')
      // Atualizar lista
      if (subscriptionId) {
        const dados = await listDeliveriesBySubscription(subscriptionId, 100)
        setLogs(dados || [])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao reenfileirar'
      toast.error(message)
    }
  }

  const handleTriggerDispatcherNow = async () => {
    setTriggeringDispatcher(true)
    try {
      // Chamar edge function de trigger
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Sessão expirada')
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-dispatcher`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao disparar')
      }

      toast.success('Dispatcher acionado! Processando agora...')
      // Atualizar logs após 2 segundos
      setTimeout(() => {
        if (subscriptionId) {
          listDeliveriesBySubscription(subscriptionId, 100)
            .then(dados => setLogs(dados || []))
            .catch(err => console.error(err))
        }
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao disparar dispatcher'
      toast.error(message)
    } finally {
      setTriggeringDispatcher(false)
    }
  }

  if (!subscriptionId) return <div className="p-4 text-slate-500">Selecione uma subscription para ver logs</div>

  if (loading) return <div className="p-4">Carregando logs...</div>

  return (
    <div className="p-4 space-y-3">
      {/* Botão para disparar dispatcher agora */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleTriggerDispatcherNow}
          disabled={triggeringDispatcher}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {triggeringDispatcher ? 'Processando...' : 'Reprocessar Agora'}
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center text-slate-500 py-8">Nenhum log</div>
      ) : (
        logs.map(l => (
          <div key={l.id} className="p-3 border rounded-lg bg-white/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">Status: <span className="font-semibold">{l.status}</span></div>
                <div className="text-xs text-slate-500">Tentativas: {l.attempt_count} • {l.last_status_code ?? '-'}</div>
                <pre className="mt-2 text-xs bg-slate-900 text-slate-100 p-2 rounded-md max-h-36 overflow-auto">{JSON.stringify(l.response_body || l.last_error || l.request_headers || {}, null, 2)}</pre>
                <div className="text-xs text-slate-400 mt-1">{new Date(l.last_attempted_at || l.created_at).toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button onClick={() => handleResend(l.id)} className="px-3 py-1 rounded bg-emerald-500 text-white text-sm">Reenviar</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
