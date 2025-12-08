import { useState } from 'react'
import { LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { joinTeamWithCode } from '../../services/equipeService'

interface EntrarComCodigoProps {
  onSuccess: (tenantId: string) => void
  onBack: () => void
}

export const EntrarComCodigo = ({ onSuccess, onBack }: EntrarComCodigoProps) => {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!codigo.trim()) {
      toast.error('Digite o código da equipe')
      return
    }

    setLoading(true)
    try {
      const { tenant_id, tenant_name } = await joinTeamWithCode(codigo)
      toast.success(`Bem-vindo à equipe: ${tenant_name}!`)
      onSuccess(tenant_id)
    } catch (error) {
      console.error('Erro:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao entrar na equipe'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-3xl bg-white/5 border border-white/10 p-8 shadow-2xl">
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
          <LogIn className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Entrar com Código
        </h2>
        <p className="text-slate-300 text-center mb-8">
          Digite o código de 8 letras que você recebeu para entrar na equipe
        </p>

        <form onSubmit={handleEntrar} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-3">
              Código da Equipe
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: ABC12345"
              maxLength={8}
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-center text-lg tracking-widest font-semibold"
              disabled={loading}
            />
            <p className="text-xs text-slate-400 mt-2">
              Você pode copiar o código do convite que recebeu
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !codigo.trim()}
            className="w-full py-4 px-6 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-cyan-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Entrar na Equipe
              </>
            )}
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full mt-4 py-3 px-6 text-slate-300 hover:text-white border border-slate-700 rounded-2xl transition-all duration-300 hover:bg-slate-950/50"
        >
          Voltar
        </button>
      </div>

      {/* Info box */}
      <div className="mt-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-4">
        <h3 className="text-sm font-semibold text-cyan-300 mb-2">💡 Como funciona</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Cada equipe tem um código único de 8 caracteres. Compartilhe este código com seus vendedores e eles podem entrar instantaneamente sem necessidade de email ou convite.
        </p>
      </div>
    </div>
  )
}
