import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon: Icon, iconPosition = 'left', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20',
      secondary: 'bg-secondary text-white hover:bg-secondary/90 shadow-lg shadow-secondary/20',
      outline: 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
      ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
      premium: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/25 transform transition-all hover:scale-[1.02] active:scale-[0.98]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-semibold',
      md: 'px-6 py-2.5 text-sm font-bold',
      lg: 'px-8 py-4 text-base font-bold',
      xl: 'px-10 py-5 text-lg font-black',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'relative flex items-center justify-center gap-2 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {!isLoading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
        <span className="relative z-10">{children}</span>
        {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
      </button>
    );
  }
);

Button.displayName = 'Button';
