import React from 'react';
import { FileText, MessageCircle, CheckCircle, Clock, Paperclip, Trash2, Edit2, Instagram } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

interface NoteCardProps {
  item: {
    id: string;
    type: string;
    title: string;
    description?: string;
    created_at: string;
  };
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ item, onEdit, onDelete }) => {
  const { isDark } = useThemeStore();

  const typeToIcon = (t: string) => {
    switch (t) {
      case 'activity': case 'atividade': return <Clock className="w-4 h-4" />;
      case 'note': case 'nota': return <FileText className="w-4 h-4" />;
      case 'status_change': return <CheckCircle className="w-4 h-4" />;
      case 'attachment': return <Paperclip className="w-4 h-4" />;
      case 'interaction': case 'interacao': case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'instagram': return <Instagram className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const typeToColor = (t: string) => {
    switch (t) {
      case 'activity': case 'atividade': return 'bg-amber-100 text-amber-700 dark:bg-amber-800/20 dark:text-amber-300';
      case 'note': case 'nota': return 'bg-sky-100 text-sky-700 dark:bg-sky-800/20 dark:text-sky-300';
      case 'status_change': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/20 dark:text-emerald-300';
      case 'attachment': return 'bg-violet-100 text-violet-700 dark:bg-violet-800/20 dark:text-violet-300';
      case 'interaction': case 'interacao': case 'whatsapp': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-800/20 dark:text-cyan-300';
      case 'instagram': return 'bg-pink-100 text-pink-700 dark:bg-pink-800/20 dark:text-pink-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800/20 dark:text-gray-300';
    }
  };

  return (
    <div className={`group relative flex items-start gap-3 p-4 rounded-2xl border ${isDark ? 'border-white/6' : 'border-slate-200'} bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors`}>
      <div className={`flex-shrink-0 rounded-full w-9 h-9 flex items-center justify-center ${typeToColor(item.type)}`}>
        {typeToIcon(item.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.title}</h4>
          <span className="text-xs text-slate-400 dark:text-slate-400 flex-shrink-0">
            {new Date(item.created_at).toLocaleString('pt-BR')}
          </span>
        </div>
        {item.description && (
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">
            {item.description}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-lg shadow-sm p-1 border border-slate-200 dark:border-white/10">
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
