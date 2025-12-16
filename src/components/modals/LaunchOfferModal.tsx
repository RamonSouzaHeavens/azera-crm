import { useState, useEffect } from 'react';
import { X, Rocket, Check, Zap, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../stores/themeStore';

export function LaunchOfferModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);

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
      <div className={`relative w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 rounded-3xl border ${
        isDark
          ? 'bg-slate-900 border-slate-800'
          : 'bg-white border-slate-200'
      } shadow-2xl`}>

        {/* HUD glow background */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-600/10 blur-3xl" />
        </div>

        {/* Decorative top gradient */}
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-purple-600`} />

        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative pt-8 px-8 pb-8 text-center">
          {/* Icon */}
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 ${
            isDark
              ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
              : 'bg-gradient-to-br from-cyan-100 to-purple-100 border border-cyan-200'
          }`}>
            <Rocket className={`w-8 h-8 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          </div>

          {/* Badge */}
          <div className="flex justify-center mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isDark
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
            }`}>
              <Sparkles className="w-3 h-3" />
              Oferta de Lançamento
            </span>
          </div>

          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Desbloqueie o Azera CRM
          </h2>
          <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Aproveite o preço especial de lançamento e tenha acesso completo a todas as funcionalidades.
          </p>

          {/* Price Display */}
          <div className={`rounded-2xl p-6 mb-6 ${
            isDark
              ? 'bg-white/5 border border-white/10'
              : 'bg-slate-50 border border-slate-200'
          }`}>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className={`text-sm line-through ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  R$ 80/mês
                </p>
                <p className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  R$ 50
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  por mês
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                -37%
              </div>
            </div>
          </div>

          {/* Features */}
          <div className={`space-y-3 mb-6 text-left rounded-2xl p-5 ${
            isDark
              ? 'bg-white/5 border border-white/10'
              : 'bg-slate-50 border border-slate-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <Check className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Automações Ilimitadas
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <Check className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Integração WhatsApp Oficial
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <Check className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Suporte Prioritário
              </span>
            </div>
          </div>

          <button
            onClick={handleClaim}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5 fill-current" />
            Quero Aproveitar Agora
          </button>

          <button
            onClick={handleClose}
            className={`mt-4 text-sm transition-colors ${
              isDark
                ? 'text-slate-500 hover:text-slate-300'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Não, obrigado. Prefiro continuar no plano gratuito.
          </button>
        </div>
      </div>
    </div>
  );
}
