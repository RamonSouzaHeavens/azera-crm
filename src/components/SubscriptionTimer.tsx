import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubscriptionTimerProps {
  createdAt: string | null;
  className?: string;
  showIcon?: boolean;
}

export const SubscriptionTimer = ({
  createdAt,
  className = '',
  showIcon = true,
}: SubscriptionTimerProps) => {
  const { t } = useTranslation();
  const [days, setDays] = useState(0);

  useEffect(() => {
    if (!createdAt) return;

    const calculateDays = () => {
      const created = new Date(createdAt);
      const now = new Date();
      const diff = now.getTime() - created.getTime();
      const daysPassed = Math.floor(diff / (1000 * 60 * 60 * 24));
      setDays(daysPassed);
    };

    calculateDays();
    const interval = setInterval(calculateDays, 1000 * 60 * 60); // atualiza a cada hora

    return () => clearInterval(interval);
  }, [createdAt]);

  if (!createdAt) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`} aria-live="polite">
      {showIcon && <Calendar className="w-4 h-4" aria-hidden="true" />}
      <span className="text-sm font-medium">
        {t('subscriptionTimer.days', { count: days })}
      </span>
    </div>
  );
};