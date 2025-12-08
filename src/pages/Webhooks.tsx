import { useEffect, useState } from 'react'
import { listSubscriptions } from '../services/webhookService'
import { useAuthStore } from '../stores/authStore'
import { AddWebhook } from '../components/automacoes/AddWebhook'
import { WebhookEvents } from '../components/automacoes/WebhookEvents'
import { WebhookLogs } from '../components/automacoes/WebhookLogs'
import { useTranslation } from 'react-i18next'

export default function WebhooksPage() {
  const { t } = useTranslation()
  const { tenant, member } = useAuthStore()
  const tenantId = tenant?.id ?? member?.tenant_id ?? ''

  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [view, setView] = useState<'events' | 'logs'>('logs')

  const load = async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const dados = await listSubscriptions(tenantId)
      setSubscriptions(dados || [])
      if (dados && dados.length > 0 && !selectedSub) setSelectedSub(dados[0].id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tenantId])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('webhooks.title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('webhooks.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1">
          <div className="mb-4">
            <AddWebhook onCreated={load} />
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="p-4 text-slate-500">{t('webhooks.loadingList')}</div>
            ) : subscriptions.length === 0 ? (
              <div className="p-4 text-slate-500">{t('webhooks.emptyList')}</div>
            ) : (
              subscriptions.map((s) => (
                <button 
                  key={s.id} 
                  onClick={() => setSelectedSub(s.id)} 
                  className={`w-full text-left p-3 rounded-lg border ${selectedSub === s.id ? 'bg-purple-600 text-white' : 'bg-white/5'}`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs opacity-70 truncate">{s.url}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="col-span-2">
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => setView('logs')} 
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${view === 'logs' ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-300'}`}
            >
              {t('webhooks.tabs.logs')}
            </button>
            <button 
              onClick={() => setView('events')} 
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${view === 'events' ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-300'}`}
            >
              {t('webhooks.tabs.events')}
            </button>
            <button 
              onClick={load} 
              className="ml-auto px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm transition-colors text-slate-700 dark:text-slate-200"
            >
              {t('webhooks.refresh')}
            </button>
          </div>

          <div className="border rounded-lg bg-white/5 min-h-[400px]">
            {view === 'events' ? (
              <WebhookEvents />
            ) : (
              <WebhookLogs subscriptionId={selectedSub} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}