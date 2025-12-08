import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Check, X, Eye, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

type JoinRequest = {
  id: string
  user_id: string
  user_email: string
  user_name: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  processed_at?: string
  processed_by?: string
  notes?: string
}

interface GestaoSolicitacoesProps {
  tenantId: string
  onUpdate?: () => void
}

const GestaoSolicitacoes: React.FC<GestaoSolicitacoesProps> = ({ tenantId, onUpdate }) => {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  // Carregar solicitações
  const loadRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error)
    }
  }, [tenantId])

  useEffect(() => {
    loadRequests()
  }, [tenantId, loadRequests])

  // Processar solicitação (aprovar/rejeitar)
  const processRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessing(requestId)

    try {
      const request = requests.find(r => r.id === requestId)
      if (!request) throw new Error('Solicitação não encontrada')

      if (action === 'approve') {
        // Primeiro, adicionar o usuário à equipe
        const { error: memberError } = await supabase
          .from('tenant_members')
          .insert([{
            tenant_id: tenantId,
            user_id: request.user_id,
            role: 'vendedor',
            status: 'ativo',
            nome: request.user_name,
            email: request.user_email,
            created_at: new Date().toISOString()
          }])

        if (memberError) {
          // Se o erro for de duplicata, o usuário já está na equipe
          if (memberError.message.includes('duplicate') || memberError.message.includes('already exists')) {
            toast.error('Este usuário já é membro da equipe')
          } else {
            throw memberError
          }
        }
      }

      // Atualizar status da solicitação
      const { error: updateError } = await supabase
        .from('join_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      toast.success(
        action === 'approve' 
          ? 'Solicitação aprovada! Usuário adicionado à equipe.' 
          : 'Solicitação rejeitada.'
      )

      // Recarregar solicitações
      await loadRequests()
      
      // Notificar componente pai se necessário
      if (onUpdate) onUpdate()

    } catch (error) {
      console.error('Erro ao processar solicitação:', error)
      toast.error('Erro ao processar solicitação')
    } finally {
      setProcessing(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-6">
      {/* Solicitações Pendentes */}
      <div className="rounded-lg bg-white/3 border border-white/10 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Solicitações Pendentes
            </h2>
            <p className="text-slate-500 text-xs">
              {pendingRequests.length} {pendingRequests.length === 1 ? 'solicitação' : 'solicitações'} aguardando
            </p>
          </div>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="rounded-lg bg-white/5 border border-white/10 p-4 hover:bg-white/3 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-3 h-3 text-yellow-400" />
                      </div>
                      <h3 className="font-medium text-white text-sm truncate">
                        {request.user_name || 'Usuário'}
                      </h3>
                    </div>
                    <p className="text-slate-500 text-xs truncate">
                      {request.user_email}
                    </p>
                    <p className="text-slate-600 text-xs mt-1">
                      {new Date(request.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => processRequest(request.id, 'approve')}
                      disabled={processing === request.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50 font-medium"
                    >
                      <Check className="w-3 h-3" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => processRequest(request.id, 'reject')}
                      disabled={processing === request.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-300 text-xs rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 font-medium"
                    >
                      <X className="w-3 h-3" />
                      Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
            <p className="text-slate-500 text-sm">
              Nenhuma solicitação pendente
            </p>
          </div>
        )}
      </div>

      {/* Histórico de Solicitações */}
      {processedRequests.length > 0 && (
        <div className="rounded-lg bg-white/3 border border-white/10 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-slate-500/20 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Histórico
              </h2>
              <p className="text-slate-500 text-xs">
                Solicitações processadas
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {processedRequests.slice(0, 5).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    request.status === 'approved' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {request.status === 'approved' ? (
                      <Check className="w-2.5 h-2.5" />
                    ) : (
                      <X className="w-2.5 h-2.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-xs truncate">
                      {request.user_name || request.user_email}
                    </p>
                    <p className="text-slate-600 text-xs">
                      {request.status === 'approved' ? 'Aprovado' : 'Rejeitado'} • {request.processed_at && new Date(request.processed_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GestaoSolicitacoes
