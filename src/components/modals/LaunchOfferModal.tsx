import { useState, useEffect } from 'react';
import { Rocket, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function LaunchOfferModal() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const hasSeenOffer = localStorage.getItem('azera_launch_offer_seen');
    const isTester = user?.email === 'ramonsouzaheavens@gmail.com';

    if (isTester || !hasSeenOffer) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user?.email]);

  const handleClose = () => {
    setIsOpen(false);
    if (user?.email !== 'ramonsouzaheavens@gmail.com') {
      localStorage.setItem('azera_launch_offer_seen', 'true');
    }
  };

  const handleClaim = () => {
    handleClose();
    navigate('/app/subscribe');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="xs">
      <Card variant="premium" padding="lg" className="border-none">
        <div className="text-center">
          {/* Icon */}
          <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-6 ${isDark ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-200'
            }`}>
            <Rocket className={`w-7 h-7 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          </div>

          <h2 className="text-2xl font-black mb-2 font-heading tracking-tight">
            Plano Premium
          </h2>
          <p className="text-sm mb-6 leading-tight text-gray-400">
            Acesso completo e ilimitado para impulsionar seu negócio agora mesmo.
          </p>

          {/* Pricing Card */}
          <div className={`rounded-2xl p-4 mb-8 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm line-through text-gray-500">R$ 80</span>
              <span className="text-3xl font-black">R$ 50</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold leading-none">
                -37%
              </span>
            </div>
            <p className="text-[10px] mt-2 uppercase tracking-[0.2em] font-black text-gray-500">
              OFERTA DE LANÇAMENTO
            </p>
          </div>

          <Button
            variant="premium"
            size="lg"
            className="w-full"
            icon={Zap}
            onClick={handleClaim}
          >
            Ativar Agora
          </Button>

          <button
            onClick={handleClose}
            className="mt-6 text-xs font-medium text-gray-500 hover:text-gray-400 transition-colors opacity-60 hover:opacity-100"
          >
            Agora não, obrigado.
          </button>
        </div>
      </Card>
    </Modal>
  );
}
