import { Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DeleteConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contactName: string;
  loading: boolean;
}

export default function DeleteConversationModal({
  isOpen,
  onClose,
  onConfirm,
  contactName,
  loading
}: DeleteConversationModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('conversations.deleteConversation')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300">
            {t('conversations.deleteConfirmation', { contactName })}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t('conversations.deleteWarning')}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {t('conversations.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('conversations.deleting') : t('conversations.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}