import { useState } from 'react'
import { X, Copy, ExternalLink, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { generatePublicLink, type ClientProcess } from '../../services/processService'

interface PublicLinkModalProps {
  open: boolean
  onClose: () => void
  process: ClientProcess | null
}

export function PublicLinkModal({ open, onClose, process }: PublicLinkModalProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  if (!open || !process) return null

  const publicLink = generatePublicLink(process.public_token)

  const handleCopy = async () => {
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {t('publicLinkModal.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Process Info */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">{process.title}</h3>
            {process.client && (
              <p className="text-sm text-gray-400">{t('publicLinkModal.clientLabel')}: {process.client.nome}</p>
            )}
          </div>

          {/* Link */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              {t('publicLinkModal.linkLabel')}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <p className="text-sm text-gray-300 break-all">{publicLink}</p>
              </div>
              <Button
                onClick={handleCopy}
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
            </div>
          </div>

          {/* Description */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
            <h4 className="font-medium text-cyan-300 mb-2">ℹ️ {t('publicLinkModal.howItWorks.title')}</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• {t('publicLinkModal.howItWorks.items.viewAll')}</li>
              <li>• {t('publicLinkModal.howItWorks.items.readOnly')}</li>
              <li>• {t('publicLinkModal.howItWorks.items.realTime')}</li>
              <li>• {t('publicLinkModal.howItWorks.items.noLogin')}</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              onClick={handleOpenLink}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {t('common.view')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}