import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  noteTitle: string;
  isDeleting?: boolean;
}

export const DeleteNoteModal: React.FC<DeleteNoteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  noteTitle,
  isDeleting = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Excluir Nota
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Esta ação não pode ser desfeita
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tem certeza que deseja excluir a nota{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              "{noteTitle}"
            </span>
            ?
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
};
