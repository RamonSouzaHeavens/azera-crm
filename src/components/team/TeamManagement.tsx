import { useState, useEffect } from 'react'
import { Users, Plus, Clock, X, CheckCircle, UserX, Mail, Phone } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import {
  TeamMember,
  TeamInvite,
  fetchTeamMembers,
  fetchPendingInvites,
  createTeamInvite,
  removeTeamMember,
  updateMemberRole,
  cancelInvite,
  checkPermission
} from '../../services/teamService'

interface TeamManagementProps {
  tenantId: string
}

export default function TeamManagement({ tenantId }: TeamManagementProps) {
  const { user, member } = useAuthStore()
  const userId = user?.id ?? ''
  const userRole = member?.role ?? 'vendedor'
  const isOwner = userRole === 'owner'
  const canManageTeam = checkPermission(userRole, 'vendedor', 'edit')

  // Estados
  const [equipe, setEquipe] = useState<TeamMember[]>([])
  const [convites, setConvites] = useState<TeamInvite[]>([])
  const [loadingEquipe, setLoadingEquipe] = useState(false)
  const [loadingConvites, setLoadingConvites] = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [roleConvite, setRoleConvite] = useState<'admin' | 'vendedor'>('vendedor')

  // Carregar equipe
  useEffect(() => {
    if (!tenantId) return
    
    const loadTeam = async () => {
      try {
        setLoadingEquipe(true)
        const members = await fetchTeamMembers(tenantId)
        
        // Se não houver membros, criar um membro baseado no usuário atual
        if (members.length === 0 && user) {
          const currentUserMember: TeamMember = {
            id: user.id,
            nome: user.user_metadata?.full_name || user.email || 'Usuário Atual',
            email: user.email || null,
            role: 'owner',
            avatar: user.user_metadata?.avatar_url || null
          }
          setEquipe([currentUserMember])
        } else {
          setEquipe(members)
        }
      } catch (error) {
        console.error('Erro ao carregar equipe:', error)
        // Em vez de toast de erro, apenas logar e mostrar fallback
        console.log('Usando fallback: usuário atual como membro')
        
        // Fallback: mostrar pelo menos o usuário atual
        if (user) {
          const fallbackMember: TeamMember = {
            id: user.id,
            nome: user.user_metadata?.full_name || user.email || 'Você',
            email: user.email || null,
            role: 'owner',
            avatar: user.user_metadata?.avatar_url || null
          }
          setEquipe([fallbackMember])
        }
      } finally {
        setLoadingEquipe(false)
      }
    }

    loadTeam()
  }, [tenantId, user])

  // Carregar convites pendentes
  useEffect(() => {
    if (!tenantId || !canManageTeam) return
    
    const loadInvites = async () => {
      try {
        setLoadingConvites(true)
  const invites = await fetchPendingInvites(tenantId)
        setConvites(invites)
      } catch (error) {
        console.error('Erro ao carregar convites:', error)
      } finally {
        setLoadingConvites(false)
      }
    }

    loadInvites()
  }, [tenantId, canManageTeam])

  // Função para convidar membro
  const handleConvidarMembro = async () => {
    console.log('🎯 handleConvidarMembro iniciado:', { emailConvite, tenantId, roleConvite })
    
    if (!emailConvite || !tenantId) {
      console.error('❌ Dados obrigatórios faltando:', { emailConvite, tenantId })
      toast.error('Email e tenant são obrigatórios')
      return
    }
    
    try {
      // Dados do convite mais ricos
      const currentUser = user?.user_metadata?.full_name || user?.email || 'Um membro da equipe'
      const companyName = 'Designer Pro CRM' // Você pode pegar isso das configurações da empresa
      
      console.log('📝 Dados do convite:', { 
        email: emailConvite, 
        tenantId, 
        role: roleConvite, 
        currentUser, 
        companyName 
      })
      
      console.log('🚀 Chamando createTeamInvite...')
      await createTeamInvite(emailConvite, tenantId, roleConvite, currentUser, companyName)
      
      console.log('✅ Convite criado com sucesso!')
      toast.success('Convite enviado por email!')
      setEmailConvite('')
      
      // Recarregar convites
      if (canManageTeam) {
        console.log('🔄 Recarregando lista de convites...')
        const invites = await fetchPendingInvites(tenantId)
        setConvites(invites)
        console.log('📋 Convites atualizados:', invites.length)
      }
    } catch (error) {
      console.error('💥 Erro ao convidar membro:', error)
      toast.error(`Não foi possível enviar o convite: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  // Função para remover membro
  const handleRemoverMembro = async (memberId: string, memberName: string) => {
    if (!checkPermission(userRole, 'vendedor', 'delete')) return
    
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span>Tem certeza que deseja remover {memberName} da equipe?</span>
        <div className="flex gap-2">
          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            onClick={async () => {
              toast.dismiss(t.id)
              try {
                await removeTeamMember(tenantId, memberId)
                setEquipe(prev => prev.filter(m => m.id !== memberId))
                toast.success(`${memberName} foi removido da equipe.`)
              } catch (error) {
                console.error('Erro ao remover membro:', error)
                toast.error('Não foi possível remover o membro.')
              }
            }}
          >
            Remover
          </button>
          <button
            className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  // Função para alterar role do membro
  const handleAlterarRole = async (memberId: string, novoRole: 'admin' | 'vendedor') => {
    if (!checkPermission(userRole, novoRole, 'edit')) return
    
    try {
      await updateMemberRole(tenantId, memberId, novoRole)
      setEquipe(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: novoRole } : m
      ))
      toast.success('Permissão alterada com sucesso!')
    } catch (error) {
      console.error('Erro ao alterar permissão:', error)
      toast.error('Não foi possível alterar a permissão.')
    }
  }

  // Função para cancelar convite
  const handleCancelarConvite = async (conviteId: string) => {
    console.log('🗑️ handleCancelarConvite chamado para:', conviteId)
    
    try {
      await cancelInvite(conviteId)
      
      // Remover da lista local
      setConvites(prev => prev.filter(c => c.id !== conviteId))
      
      toast.success('Convite cancelado.')
      console.log('✅ Convite cancelado e removido da lista')
    } catch (error) {
      console.error('💥 Erro ao cancelar convite:', error)
      toast.error('Não foi possível cancelar o convite.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header - Melhorado para mobile */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Membros da Equipe</h3>
            <p className="text-slate-500 text-sm">Gerencie os usuários do sistema</p>
          </div>
        </div>
        
        {/* Formulário de convite - Melhor layout mobile */}
        {canManageTeam && (
          <div className="bg-white/50 border border-slate-200 rounded-xl p-4">
            <h5 className="text-sm font-medium text-slate-700 mb-3">Convidar Novo Membro</h5>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={emailConvite}
                  onChange={(e) => setEmailConvite(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-slate-800"
                />
                <select
                  value={roleConvite}
                  onChange={(e) => setRoleConvite(e.target.value as 'admin' | 'vendedor')}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                >
                  <option value="vendedor">Vendedor</option>
                  {isOwner && <option value="admin">Administrador</option>}
                </select>
              </div>
              <button
                onClick={handleConvidarMembro}
                disabled={loadingEquipe || !emailConvite}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {loadingEquipe ? 'Enviando convite...' : 'Enviar Convite'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Convites Pendentes */}
      {canManageTeam && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Convites Pendentes
          </h4>
          
          {loadingConvites ? (
            <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-center">
              <div className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-sm text-slate-500">Carregando convites...</p>
            </div>
          ) : convites.length > 0 ? (
            <div className="space-y-2">
              {convites.map((convite) => (
                <div key={convite.id} className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{convite.email}</p>
                      <p className="text-sm text-slate-500">
                        {convite.role === 'admin' ? 'Administrador' : 'Vendedor'} • 
                        Expira em {new Date(convite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelarConvite(convite.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors text-sm"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500">Nenhum convite pendente</p>
            </div>
          )}
        </div>
      )}

      {/* Lista de Membros da Equipe */}
      <div className="space-y-6">
        <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Membros Ativos ({equipe.length})
        </h4>
        
        {/* Grid responsivo de cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipe.map((membro) => {
            const canEditMember = checkPermission(userRole, membro.role, 'edit')
            const canDeleteMember = checkPermission(userRole, membro.role, 'delete') && membro.id !== userId
          
          return (
            <div key={membro.id} className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 hover:border-slate-300/60 hover:shadow-lg transition-all duration-300">
              {/* Layout do card - centrado e elegante */}
              <div className="space-y-4">
                {/* Header do card com avatar e informações principais */}
                <div className="flex flex-col items-center text-center space-y-3">
                  {/* Avatar grande */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                      {membro.avatar ? (
                        <img 
                          src={membro.avatar} 
                          alt={membro.nome} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">
                            {membro.nome.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Indicador de perfil completo */}
                    {membro.profile_completed && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {membro.id === userId && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">Eu</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Nome grande e destacado */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-xl leading-tight">
                      {membro.nome || 'Nome não definido'}
                    </h3>
                    
                    {/* Função com estilo destacado */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full font-medium text-sm ${
                      membro.role === 'owner' ? 'bg-gradient-to-r from-cyan-100 to-cyan-200 text-cyan-700' :
                      membro.role === 'admin' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700' :
                      'bg-gradient-to-r from-green-100 to-green-200 text-green-700'
                    }`}>
                      {membro.role === 'owner' ? '👑 Proprietário' : 
                       membro.role === 'admin' ? '⚡ Administrador' : '💼 Vendedor'}
                    </div>
                  </div>
                  
                  {/* Informações de contato menores */}
                  <div className="space-y-1 text-center">
                    {membro.email && (
                      <p className="text-slate-500 text-sm flex items-center justify-center gap-1">
                        <Mail className="w-3 h-3" />
                        {membro.email}
                      </p>
                    )}
                    {membro.phone && (
                      <p className="text-slate-400 text-sm flex items-center justify-center gap-1">
                        <Phone className="w-3 h-3" />
                        {membro.phone}
                      </p>
                    )}
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {!membro.profile_completed && (!membro.full_name || membro.nome === 'Usuário') && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                        ⚠️ Perfil incompleto
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Ações do membro - apenas se necessário */}
                {(canEditMember || canDeleteMember) && membro.role !== 'owner' && (
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex flex-col gap-3">
                      {/* Alterar Role - apenas owner pode alterar */}
                      {isOwner && membro.id !== userId && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-2">Nível de Permissão</label>
                          <select
                            value={membro.role}
                            onChange={(e) => handleAlterarRole(membro.id, e.target.value as 'admin' | 'vendedor')}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                          >
                            <option value="vendedor">💼 Vendedor</option>
                            <option value="admin">⚡ Administrador</option>
                          </select>
                        </div>
                      )}
                      
                      {/* Remover */}
                      {canDeleteMember && (
                        <button 
                          onClick={() => handleRemoverMembro(membro.id, membro.nome)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl transition-colors text-red-600 text-sm font-medium"
                        >
                          <UserX className="w-4 h-4" />
                          Remover da Equipe
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        </div>
        
        {equipe.length === 0 && !loadingEquipe && (
          <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <Users className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-700 mb-2">Sua equipe está vazia</h4>
            <p className="text-slate-500 mb-4">Comece convidando o primeiro membro da sua equipe!</p>
            {canManageTeam && (
              <p className="text-sm text-blue-600">Use o formulário acima para enviar convites</p>
            )}
          </div>
        )}
        
        {loadingEquipe && (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-slate-500">Carregando equipe...</p>
          </div>
        )}
      </div>

      {/* Informações sobre Permissões - Melhorado para mobile */}
      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200">
        <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
          <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
          </div>
          Níveis de Permissão
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
            <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0 mt-0.5"></div>
            <div>
              <div className="font-medium text-slate-800">Proprietário</div>
              <div className="text-slate-600 text-xs">Acesso total, gerencia todos os membros e configurações</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-0.5"></div>
            <div>
              <div className="font-medium text-slate-800">Administrador</div>
              <div className="text-slate-600 text-xs">Gerencia vendedores, imóveis e relatórios</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0 mt-0.5"></div>
            <div>
              <div className="font-medium text-slate-800">Vendedor</div>
              <div className="text-slate-600 text-xs">Gerencia clientes e imóveis atribuídos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
