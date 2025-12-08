import { useState } from 'react'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { generatePublicLink, type ClientProcess } from '../../services/processService'

interface ProcessDetailsProps {
  process: ClientProcess
}

export function ProcessDetails({ process }: ProcessDetailsProps) {
  const { t, i18n } = useTranslation()
  const [copied, setCopied] = useState(false)

  const publicLink = generatePublicLink(process.public_token)

  // Configuração de prioridade movida para dentro do componente para usar tradução
  // ou mantida fora se usar chaves de tradução diretas
  const getPriorityLabel = (priority: string) => {
    return t(`processDetails.priority.values.${priority}`, { defaultValue: priority })
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      baixa: 'text-gray-400',
      media: 'text-yellow-400',
      alta: 'text-red-400'
    }
    return colors[priority] || 'text-gray-400'
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar link:', error)
    }
  }

  const handleOpenLink = () => {
    window.open(publicLink, '_blank')
  }

  const formatDate = (date?: string) => {
    if (!date) return null
    return new Date(date).toLocaleDateString(i18n.language)
  }

  return (
    <div className="space-y-6">
      {/* Informações Gerais */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('processDetails.generalInfo.title')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">{t('processDetails.generalInfo.labels.title')}</label>
            <p className="text-white mt-1">{process.title}</p>
          </div>

          <div>
            <label className="text-sm text-gray-400">{t('processDetails.generalInfo.labels.client')}</label>
            <p className="text-white mt-1">{process.client?.nome || t('processDetails.generalInfo.notDefined')}</p>
          </div>

          <div>
            <label className="text-sm text-gray-400">{t('processDetails.generalInfo.labels.priority')}</label>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${getPriorityColor(process.priority)}`} />
              <span className="text-white">
                {getPriorityLabel(process.priority)}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400">{t('processDetails.generalInfo.labels.status')}</label>
            <p className="text-white mt-1 capitalize">
              {t(`processDetails.status.${process.status}`, { defaultValue: process.status.replace('_', ' ') })}
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-400">{t('processDetails.generalInfo.labels.startDate')}</label>
            <p className="text-white mt-1">
              {formatDate(process.start_date) || t('processDetails.generalInfo.notDefined')}
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-400">{t('processDetails.generalInfo.labels.expectedEndDate')}</label>
            <p className="text-white mt-1">
              {formatDate(process.expected_end_date) || t('processDetails.generalInfo.notDefined')}
            </p>
          </div>

          {process.responsible_user && (
            <div>
              <label className="text-sm text-gray-400">{t('processDetails.generalInfo.labels.responsible')}</label>
              <p className="text-white mt-1">{process.responsible_user.display_name || t('processDetails.generalInfo.notDefined')}</p>
            </div>
          )}
        </div>

        {process.description && (
          <div className="mt-4">
            <label className="text-sm text-gray-400">{t('processDetails.generalInfo.labels.description')}</label>
            <p className="text-white mt-1">{process.description}</p>
          </div>
        )}
      </Card>

      {/* Link de Compartilhamento */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('processDetails.sharing.title')}</h3>

        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            {t('processDetails.sharing.description')}
          </p>

          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <p className="text-sm text-gray-300 break-all">{publicLink}</p>
            </div>
            <Button
              onClick={handleCopyLink}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  {t('common.copied')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  {t('common.copy')}
                </>
              )}
            </Button>
            <Button
              onClick={handleOpenLink}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {t('common.open')}
            </Button>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-cyan-300 mb-2">ℹ️ {t('publicLinkModal.howItWorks.title')}</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• {t('publicLinkModal.howItWorks.items.viewAll')}</li>
              <li>• {t('publicLinkModal.howItWorks.items.readOnly')}</li>
              <li>• {t('publicLinkModal.howItWorks.items.realTime')}</li>
              <li>• {t('publicLinkModal.howItWorks.items.noLogin')}</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}