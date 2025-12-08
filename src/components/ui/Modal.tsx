import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Tailwind max-width class for modal container, ex: 'max-w-4xl' */
  maxWidthClass?: string
  /** Optional: custom panel classes to override modal panel (rounded, bg, borders). If provided it replaces the default panel classes. */
  panelClassName?: string
}

export function Modal({ isOpen, onClose, title, children, maxWidthClass, panelClassName }: ModalProps) {
  if (!isOpen) return null
  
  const maxw = maxWidthClass ?? 'max-w-lg'
  const defaultPanel = `relative w-full ${maxw} rounded-2xl bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-auto`

  const panelClasses = panelClassName ? `relative w-full ${maxw} ${panelClassName}` : defaultPanel

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={panelClasses}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-2 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  )
}