import { useState } from 'react'
import { Eye, ListTodo } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProcessDetails } from './ProcessDetails'
import { ProcessTasks } from './ProcessTasks'
import { Card } from '../ui/Card'
import type { ClientProcess } from '../../services/processService'

interface ProcessViewProps {
  process: ClientProcess
}

export function ProcessView({ process }: ProcessViewProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('details')

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">{process.title}</h2>
        <p className="text-gray-400">{t('processView.processLabel')} #{process.id}</p>
      </div>

      {/* Custom Tabs Implementation */}
      <div className="w-full">
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'details'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Eye className="w-4 h-4" />
            {t('processView.tabs.details')}
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'tasks'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <ListTodo className="w-4 h-4" />
            {t('processView.tabs.tasks')}
          </button>
        </div>

        <div className="mt-0">
          {activeTab === 'details' && <ProcessDetails process={process} />}
          {activeTab === 'tasks' && <ProcessTasks processId={process.id} clientId={process.client_id} />}
        </div>
      </div>
    </Card>
  )
}