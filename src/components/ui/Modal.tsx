import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '../../stores/themeStore';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  maxWidth = 'md',
  showCloseButton = true
}: ModalProps) {
  const isDark = useThemeStore((state) => state.isDark);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const maxWidths = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className={cn(
              'relative w-full overflow-visible rounded-[2rem] border shadow-2xl transition-all duration-300',
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
              maxWidths[maxWidth],
              className
            )}
          >
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'absolute -top-3 -right-3 p-2 rounded-full shadow-lg transition-all z-[110] hover:scale-110 active:scale-90',
                  isDark
                    ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="relative overflow-hidden rounded-[2rem]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
