import React, { useState } from 'react'
import { Copy, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

interface GestaoConvitesProps {
  tenantId: string
  onConviteEnviado?: () => void
}

const GestaoConvites: React.FC<GestaoConvitesProps> = ({ tenantId, onConviteEnviado }) => {
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    email: '',
    nome: '',
    role: 'vendedor'
  })

  // Gerar link de convite simples por tenant
  const gerarLinkConviteSimples = async () => {
    const link = `${window.location.origin}/join-team?tenant=${tenantId}`
    
    console.log('🔗 Link de convite simples gerado:', {
      tenant: tenantId,
      link
    })
    
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link de convite copiado! Qualquer pessoa com este link pode entrar na equipe.')
    } catch (error) {
      console.error('Erro ao copiar:', error)
      // Fallback: mostrar o link em um alert
      alert(`Link copiado: ${link}`)
    }
  }

  // Criar novo convite
  const criarConvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.user) throw new Error('Usuário não autenticado')

      // Gerar token único
      const token = crypto.randomUUID()
      
      const { error } = await supabase
        .from('team_invites')
        .insert({
          tenant_id: tenantId,
          email: form.email,
          role: form.role,
          invite_token: token,
          invited_by: session.session.user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pendente'
        })

      if (error) {
        if (error.code === 'PGRST301') {
          toast.error('Erro de permissão. Verifique as políticas RLS da tabela team_invites.')
        } else {
          throw error
        }
        return
      }

      toast.success(`Convite criado para ${form.email}!`)
      setForm({ email: '', nome: '', role: 'vendedor' })
      setShowForm(false)
      onConviteEnviado?.()
    } catch (error) {
      console.error('Erro ao criar convite:', error)
      toast.error((error as Error).message || 'Erro ao criar convite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gestão de Convites</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-cyan-500/20 hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Novo Convite
        </button>
      </div>

      {/* Link de Convite Simples */}
      <div className="rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-600/70 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-slate-900 dark:text-slate-100 font-medium text-sm mb-1">Link de Convite Direto</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Gere um link que permite qualquer pessoa entrar na equipe como vendedor.
            </p>
          </div>
          <button
            onClick={gerarLinkConviteSimples}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-emerald-500/20 hover:scale-105 active:scale-95 flex-shrink-0 ml-4"
          >
            <Copy className="w-4 h-4" />
            Gerar
          </button>
        </div>
      </div>

      {/* Formulário de Novo Convite */}
      {showForm && (
        <div className="rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-600/70 p-5 shadow-sm">
          <h4 className="text-slate-900 dark:text-slate-100 font-medium text-sm mb-4">Criar Novo Convite</h4>
          <form onSubmit={criarConvite} className="space-y-4">
            <div>
              <label className="text-xs text-slate-700 dark:text-slate-300 mb-1.5 block font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600/50 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-700 dark:text-slate-300 mb-1.5 block font-medium">Função</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600/50 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              >
                <option value="vendedor" className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white">Vendedor</option>
                <option value="admin" className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white">Administrador</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-all text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-cyan-500/20 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
              >
                {loading ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default GestaoConvites
