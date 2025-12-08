import { useState } from 'react'
import { ToggleLeft, ToggleRight, Settings, TrendingUp, Clock, UserCheck } from 'lucide-react'
import { Button } from '../ui/Button'

interface Vendedor {
  id: string
  name: string
  email: string
  avatar?: string
  isActive: boolean
  leadsRecebidos: number
  leadsHoje: number
  ultimoLead?: string
  performance: number // 0-100
  telefone?: string
}

interface DistribuicaoLeadsProps {
  teamId: string
  membros: Array<{
    id: string
    nome: string
    email: string
    telefone?: string | null
    role: string
    status: string
  }>
}

export default function DistribuicaoLeads({ membros }: DistribuicaoLeadsProps) {
  // Filtrar apenas vendedores da equipe
  const vendedoresEquipe = membros.filter(m => m.role === 'vendedor' && m.status === 'ativo')
  
  const [vendedores, setVendedores] = useState<Vendedor[]>(
    vendedoresEquipe.map(membro => ({
      id: membro.id,
      name: membro.nome,
      email: membro.email,
      isActive: true,
      leadsRecebidos: Math.floor(Math.random() * 50), // Dados fictícios
      leadsHoje: Math.floor(Math.random() * 10),
      ultimoLead: ['2 horas atrás', '5 horas atrás', '1 dia atrás'][Math.floor(Math.random() * 3)],
      performance: Math.floor(Math.random() * 40) + 60, // 60-100%
      telefone: membro.telefone || undefined
    }))
  )

  const [modoDistribuicao, setModoDistribuicao] = useState<'automatico' | 'manual'>('automatico')

  const toggleVendedor = (id: string) => {
    setVendedores(prev => 
      prev.map(v => 
        v.id === id ? { ...v, isActive: !v.isActive } : v
      )
    )
  }

  const vendedoresAtivos = vendedores.filter(v => v.isActive).length
  const totalLeadsHoje = vendedores.reduce((acc, v) => acc + v.leadsHoje, 0)
  const totalLeadsGeral = vendedores.reduce((acc, v) => acc + v.leadsRecebidos, 0)

  if (vendedoresEquipe.length === 0) {
    return (
      <div className="rounded-3xl p-8 bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg text-center">
        <UserCheck className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Nenhum Vendedor na Equipe
        </h3>
        <p className="text-slate-400 mb-6">
          Para configurar a distribuição de leads, você precisa ter pelo menos um membro com a função "Vendedor" na sua equipe.
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all">
          Convidar Vendedor
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-3xl p-6 bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">
                Vendedores Ativos
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {vendedoresAtivos}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="rounded-3xl p-6 bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">
                Leads Hoje
              </p>
              <p className="text-2xl font-bold text-cyan-400">
                {totalLeadsHoje}
              </p>
            </div>
            <Clock className="h-8 w-8 text-cyan-400" />
          </div>
        </div>

        <div className="rounded-3xl p-6 bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">
                Total de Leads
              </p>
              <p className="text-2xl font-bold text-purple-400">
                {totalLeadsGeral}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="rounded-3xl p-6 bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">
                Modo Distribuição
              </p>
              <p className="text-2xl font-bold text-orange-400">
                {modoDistribuicao === 'automatico' ? 'Auto' : 'Manual'}
              </p>
            </div>
            <Settings className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Configurações de Distribuição */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-4">
          Como Distribuir os Leads?
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant={modoDistribuicao === 'automatico' ? 'primary' : 'secondary'}
            onClick={() => setModoDistribuicao('automatico')}
            className="flex-1"
          >
            🤖 Automático
            <span className="block text-xs opacity-75 mt-1">
              Sistema distribui igualmente
            </span>
          </Button>
          
          <Button
            variant={modoDistribuicao === 'manual' ? 'primary' : 'secondary'}
            onClick={() => setModoDistribuicao('manual')}
            className="flex-1"
          >
            👤 Manual
            <span className="block text-xs opacity-75 mt-1">
              Você escolhe quem recebe
            </span>
          </Button>
        </div>

        {modoDistribuicao === 'automatico' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ✨ <strong>Modo Automático:</strong> Os leads serão distribuídos igualmente entre todos os vendedores ativos. 
              O sistema considera a performance e quantidade de leads já recebidos para fazer uma distribuição justa.
            </p>
          </div>
        )}
      </div>

      {/* Lista de Vendedores */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Vendedores da Equipe
          </h2>
          <Button variant="secondary" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Emails
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vendedores.map((vendedor) => (
            <div key={vendedor.id} className={`rounded-3xl p-6 shadow-2xl transition-all duration-200 ${
              vendedor.isActive 
                ? 'bg-emerald-500/5 border border-emerald-500/20' 
                : 'bg-white/5 border border-white/10'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {vendedor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {vendedor.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {vendedor.email}
                    </p>
                    {vendedor.telefone && (
                      <p className="text-sm text-slate-500">
                        {vendedor.telefone}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleVendedor(vendedor.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                >
                  {vendedor.isActive ? (
                    <>
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Ativo</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                      <span className="text-sm font-medium text-slate-400">Inativo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Estatísticas do Vendedor */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {vendedor.leadsHoje}
                  </p>
                  <p className="text-xs text-slate-400">Hoje</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">
                    {vendedor.leadsRecebidos}
                  </p>
                  <p className="text-xs text-slate-400">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {vendedor.performance}%
                  </p>
                  <p className="text-xs text-slate-400">Performance</p>
                </div>
              </div>

              {/* Último Lead */}
              {vendedor.ultimoLead && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>Último lead: {vendedor.ultimoLead}</span>
                </div>
              )}

              {/* Barra de Performance */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Performance</span>
                  <span className="text-xs font-medium text-white">
                    {vendedor.performance}%
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${vendedor.performance}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configurações Avançadas */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-4">
          Configurações de Notificação
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-white">Email</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm text-slate-300">Enviar email imediatamente</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm text-slate-300">Incluir dados do lead</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-slate-300">Resumo diário</span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-white">WhatsApp</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm text-slate-300">Notificação instantânea</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-slate-300">Apenas leads VIP</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-slate-300">Horário comercial apenas</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="primary">
            Salvar Configurações
          </Button>
          <Button variant="secondary">
            Testar Notificações
          </Button>
        </div>
      </div>
    </div>
  )
}
