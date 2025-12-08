import { useState } from 'react'
import toast from 'react-hot-toast'
import { createSubscription } from '../../services/webhookService'
import { useAuthStore } from '../../stores/authStore'

export function AddWebhook({ onCreated }: { onCreated?: () => void }) {
  const { tenant, member } = useAuthStore()
  const tenantId = tenant?.id ?? member?.tenant_id ?? ''

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) return toast.error('Tenant não encontrado')
    if (!name || !url) return toast.error('Preencha nome e URL')

    const selectedEvents = events.split(',').map(s => s.trim()).filter(Boolean)

    setLoading(true)
    try {
      await createSubscription(tenantId, { name, url, events: selectedEvents })
      toast.success('Webhook criado!')
      setName('')
      setUrl('')
      setEvents('')
      onCreated?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar webhook'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg bg-white/5">
      <div>
        <label className="block text-sm font-medium mb-1">Nome</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da subscription" className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">URL</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://seu-servico.com/webhook" className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Eventos (vírgula separada)</label>
        <input value={events} onChange={e => setEvents(e.target.value)} placeholder="lead.created,produto.updated" className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border" />
        <p className="text-xs text-slate-500 mt-1">Ex: <code>lead.created,produto.updated</code></p>
      </div>

      <div className="flex justify-end">
        <button disabled={loading} type="submit" className="px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium">{loading ? 'Criando...' : 'Criar webhook'}</button>
      </div>
    </form>
  )
}
