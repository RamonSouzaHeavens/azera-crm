import { useEffect, useState } from 'react'
import { listEvents } from '../../services/webhookService'
import { useAuthStore } from '../../stores/authStore'
import { Code } from 'lucide-react'

export function WebhookEvents() {
  const { tenant, member } = useAuthStore()
  const tenantId = tenant?.id ?? member?.tenant_id ?? ''

  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!tenantId) return
      setLoading(true)
      try {
        const dados = await listEvents(tenantId, 100)
        setEvents(dados || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [tenantId])

  if (loading) return <div className="p-6">Carregando eventos...</div>

  return (
    <div className="p-4">
      {events.length === 0 ? (
        <div className="text-center py-12 text-slate-500">Nenhum evento registrado</div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="p-3 border rounded-lg bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{ev.event_type}</div>
                  <div className="text-xs text-slate-500">{new Date(ev.created_at).toLocaleString()}</div>
                </div>
                <Code className="w-5 h-5 text-slate-400" />
              </div>
              <pre className="mt-3 text-xs bg-slate-900 text-slate-100 p-3 rounded-md overflow-auto max-h-40">{JSON.stringify(ev.payload, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
