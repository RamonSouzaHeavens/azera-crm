import { useState } from 'react'
import { Copy, Check, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

interface CodigoEquipeProps {
  codigoEquipe: string
  nomeEquipe: string
  canShare?: boolean
}

export const CodigoEquipe = ({ codigoEquipe, nomeEquipe, canShare = true }: CodigoEquipeProps) => {
  const [copiado, setCopiado] = useState(false)
  const navigate = useNavigate()

  const handleCopiar = async () => {
    if (!canShare) {
      toast.error('Assinatura necessária para compartilhar código')
      return
    }
    
    try {
      await navigator.clipboard.writeText(codigoEquipe)
      setCopiado(true)
      toast.success('Código copiado!')
      setTimeout(() => setCopiado(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
      toast.error('Erro ao copiar código')
    }
  }

  // Se não pode compartilhar, mostrar bloqueio
  if (!canShare) {
    return (
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-600/50 p-6 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-all duration-300 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Funcionalidade Premium
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
              Compartilhar código de equipe requer assinatura ativa
            </p>
            <button
              onClick={() => navigate('/subscribe')}
              className="text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
            >
              Ver Planos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-600/70 p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Código de Entrada
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Compartilhe com sua equipe
        </p>
      </div>

      {/* Código com Botão de Cópia */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-200 font-mono tracking-widest drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            {codigoEquipe}
          </p>
        </div>
        
        <button
          onClick={handleCopiar}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-all duration-300 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100"
          title="Copiar código"
        >
          {copiado ? (
            <Check className="w-5 h-5" />
          ) : (
            <Copy className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Descrição */}
      <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
        Use este código para adicionar vendedores à equipe <span className="font-semibold text-slate-900 dark:text-slate-100">{nomeEquipe}</span> instantaneamente
      </p>
    </div>
  )
}
