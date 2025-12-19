import { Lock, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSubscription } from '../../hooks/useSubscription'

interface PremiumGateProps {
  children: React.ReactNode
  featureName: string
}

export default function PremiumGate({ children, featureName }: PremiumGateProps) {
  const { isActive, loading } = useSubscription()
  const navigate = useNavigate()

  // Enquanto carrega, mostra o conteúdo sem bloqueio
  if (loading) {
    return <>{children}</>
  }

  // Se tem assinatura ativa, mostra o conteúdo normalmente
  if (isActive) {
    return <>{children}</>
  }

  // Se não tem assinatura, mostra overlay de bloqueio
  return (
    <div className="relative h-full w-full">
      {/* Conteúdo com blur leve - permite ver o que está perdendo */}
      <div className="blur-[10px] pointer-events-none select-none h-full">
        {children}
      </div>

      {/* Overlay de bloqueio */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/80 via-white/70 to-slate-100/80 dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-800/60 backdrop-blur-[2px]">
        <div className="max-w-md w-full mx-4 text-center space-y-6">
          {/* Ícone */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-2xl opacity-50 animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/50">
              <Lock className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Título */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 font-outfit">
              {featureName}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Recurso exclusivo do plano <span className="text-amber-500 dark:text-amber-400 font-semibold">Premium</span>
            </p>
          </div>

          {/* Descrição */}
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            Desbloqueie este recurso e todas as funcionalidades avançadas do Azera CRM assinando o plano Premium.
          </p>

          {/* Botão CTA */}
          <button
            onClick={() => navigate('/app/assinatura')}
            className="group relative w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-lg shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="relative flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              Assinar Plano Premium
            </div>
          </button>

          {/* Link secundário */}
          <button
            onClick={() => navigate('/app/dashboard')}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors text-sm"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
