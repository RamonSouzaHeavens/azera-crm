import { useState, useEffect } from 'react';
import { X, Rocket, Check, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function LaunchOfferModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se já foi exibido
    const hasSeenOffer = localStorage.getItem('azera_launch_offer_seen');
    if (!hasSeenOffer) {
      // Delay para não aparecer imediatamente ao carregar a página
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('azera_launch_offer_seen', 'true');
  };

  const handleClaim = () => {
    handleClose();
    navigate('/app/subscribe');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">

        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent"></div>
        </div>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-full text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative pt-20 px-8 pb-8 text-center">
          <div className="w-20 h-20 mx-auto bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg mb-6 border-4 border-white dark:border-slate-700 relative z-10 -mt-12">
            <Rocket className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>

          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Oferta de Lançamento!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Desbloqueie todo o potencial do Azera CRM com 50% de desconto nos primeiros 3 meses.
          </p>

          <div className="space-y-4 mb-8 text-left bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Automações Ilimitadas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Integração WhatsApp Oficial</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Suporte Prioritário 24/7</span>
            </div>
          </div>

          <button
            onClick={handleClaim}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5 fill-current" />
            Quero Aproveitar Agora
          </button>

          <button
            onClick={handleClose}
            className="mt-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Não, obrigado. Prefiro continuar no plano gratuito.
          </button>
        </div>
      </div>
    </div>
  );
}
