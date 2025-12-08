import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const { t } = useTranslation();

  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      bg: 'bg-green-500',
      border: 'border-green-600',
      label: t('notification.types.success'),
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      bg: 'bg-red-500',
      border: 'border-red-600',
      label: t('notification.types.error'),
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bg: 'bg-yellow-500',
      border: 'border-yellow-600',
      label: t('notification.types.warning'),
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      bg: 'bg-blue-500',
      border: 'border-blue-600',
      label: t('notification.types.info'),
    },
  }[type];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 flex items-start gap-3 p-4 rounded-lg text-white border-l-4 shadow-2xl min-w-80 max-w-96 ${config.bg} ${config.border} animate-in slide-in-from-top-5 fade-in duration-300`}
    >
      {/* Ícone */}
      <div aria-hidden="true">{config.icon}</div>

      {/* Mensagem */}
      <div className="flex-1">
        <div className="font-medium sr-only">{config.label}</div>
        <p className="text-sm leading-relaxed">{message}</p>
      </div>

      {/* Botão fechar */}
      <button
        onClick={onClose}
        className="ml-3 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-1 transition-colors"
        aria-label={t('notification.close')}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};