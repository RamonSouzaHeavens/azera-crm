import React from 'react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '../../stores/themeStore';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline' | 'premium';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ className, variant = 'default', padding = 'md', children, ...props }: CardProps) {
  const isDark = useThemeStore((state) => state.isDark);

  const variants = {
    default: isDark
      ? 'bg-slate-900 border-slate-800'
      : 'bg-white border-slate-200',
    glass: isDark
      ? 'bg-white/5 backdrop-blur-md border-white/10'
      : 'bg-white/70 backdrop-blur-md border-white/20',
    outline: 'bg-transparent border-white/10',
    premium: isDark
      ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-2xl'
      : 'bg-white border-slate-200 shadow-xl',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-10',
  };

  return (
    <div
      className={cn(
        'relative rounded-3xl border transition-all duration-300',
        variants[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {variant === 'premium' && (
        <div className="pointer-events-none absolute inset-0 opacity-40 overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-600/10 blur-2xl" />
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
