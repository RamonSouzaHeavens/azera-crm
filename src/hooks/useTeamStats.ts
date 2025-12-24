import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export interface TeamStats {
  // Estatísticas gerais
  membrosAtivos: number
  totalVendedores: number

  // Leads
  totalLeads: number
  leadsEsteMes: number
  leadsHoje: number
  leadsEmNegociacao: number
  leadsFechados: number
  leadsPerdidos: number

  // Conversão
  taxaConversao: number
  taxaConversaoAnterior: number

  // Tarefas do usuário
  tarefasPendentes: number
  tarefasHoje: number
  tarefasAtrasadas: number

  // Metas
  metaMensal: number
  progressoMeta: number

  // Contatos
  contatosFeitos: number
  contatosEstaSemana: number

  // Métricas da Equipe Completa (Proprietário)
  equipeLeadsFechados: number
  equipeTaxaConversao: number
  rankingMembros?: {
    id: string
    nome: string
    leads: number
    fechados: number
    taxa: number
  }[]
}

export interface TarefaResumida {
  id: string
  titulo: string
  vencimento: string
  prioridade: 'alta' | 'media' | 'baixa'
  status: 'pendente' | 'concluida' | 'atrasada'
}

export function useTeamStats() {
  const { member, user } = useAuthStore()
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [tarefas, setTarefas] = useState<TarefaResumida[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tenantId = member?.tenant_id
  const userId = user?.id

  const loadStats = useCallback(async () => {
    if (!tenantId || !userId) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      // Buscar membros ativos
      const { data: membersData } = await supabase
        .from('memberships')
        .select('id, role, active')
        .eq('tenant_id', tenantId)
        .eq('active', true)

      const membrosAtivos = membersData?.length || 0
      const totalVendedores = membersData?.filter(m => m.role === 'vendedor').length || 0

      // Datas para filtros
      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
      const inicioSemana = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
      const mesAnteriorInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString()
      const mesAnteriorFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString()

      // Buscar leads do usuário (usando proprietario_id que é o campo correto)
      const { data: leadsData } = await supabase
        .from('clientes')
        .select('id, status, created_at, proprietario_id')
        .eq('tenant_id', tenantId)

      // Filtrar leads do usuário para estatísticas pessoais
      const leadsDoUsuario = leadsData?.filter(l => l.proprietario_id === userId) || []

      const totalLeads = leadsData?.length || 0
      const leadsEsteMes = leadsData?.filter(l => l.created_at >= inicioMes).length || 0
      const leadsHoje = leadsData?.filter(l => l.created_at >= inicioHoje).length || 0
      const leadsEmNegociacao = leadsData?.filter(l =>
        l.status === 'negociacao' || l.status === 'proposta'
      ).length || 0
      // Leads fechados do usuário
      const leadsFechados = leadsDoUsuario.filter(l =>
        l.status === 'fechado'
      ).length || 0
      const leadsPerdidos = leadsData?.filter(l =>
        l.status === 'perdido'
      ).length || 0

      // Calcular taxa de conversão atual (leads fechados do usuário / leads do usuário este mês)
      const leadsDoUsuarioEsteMes = leadsDoUsuario.filter(l => l.created_at >= inicioMes)
      const leadsFechadosDoUsuarioMes = leadsDoUsuario.filter(l =>
        l.status === 'fechado' && l.created_at >= inicioMes
      ).length || 0
      const taxaConversao = leadsDoUsuarioEsteMes.length > 0
        ? Math.round((leadsFechadosDoUsuarioMes / leadsDoUsuarioEsteMes.length) * 100)
        : 0

      // Taxa de conversão mês anterior (para comparação)
      const leadsDoUsuarioAnterior = leadsDoUsuario.filter(l =>
        l.created_at >= mesAnteriorInicio && l.created_at <= mesAnteriorFim
      )
      const leadsFechadosDoUsuarioAnterior = leadsDoUsuarioAnterior.filter(l =>
        l.status === 'fechado'
      ).length
      const taxaConversaoAnterior = leadsDoUsuarioAnterior.length > 0
        ? Math.round((leadsFechadosDoUsuarioAnterior / leadsDoUsuarioAnterior.length) * 100)
        : 0

      // Buscar tarefas do usuário
      const { data: tarefasData } = await supabase
        .from('tarefas')
        .select('id, titulo, data_vencimento, prioridade, status')
        .eq('tenant_id', tenantId)
        .eq('responsavel_id', userId)
        .neq('status', 'concluida')
        .order('data_vencimento', { ascending: true })
        .limit(5)

      const tarefasPendentes = tarefasData?.filter(t => t.status !== 'concluida').length || 0
      const tarefasHoje = tarefasData?.filter(t =>
        t.data_vencimento && t.data_vencimento.startsWith(hoje.toISOString().split('T')[0])
      ).length || 0
      const tarefasAtrasadas = tarefasData?.filter(t =>
        t.data_vencimento && new Date(t.data_vencimento) < hoje && t.status !== 'concluida'
      ).length || 0

      // Mapear tarefas para resumo
      const tarefasResumidas: TarefaResumida[] = (tarefasData || []).map(t => {
        const vencimento = t.data_vencimento ? new Date(t.data_vencimento) : null
        let status: TarefaResumida['status'] = 'pendente'

        if (vencimento) {
          const hojeDate = new Date(hoje.toISOString().split('T')[0])
          const vencimentoDate = new Date(vencimento.toISOString().split('T')[0])

          if (vencimentoDate < hojeDate) {
            status = 'atrasada'
          }
        }

        return {
          id: t.id,
          titulo: t.titulo || 'Sem título',
          vencimento: t.data_vencimento || '',
          prioridade: t.prioridade === 'alta' ? 'alta' : t.prioridade === 'media' ? 'media' : 'baixa',
          status
        }
      })

      // Contatos feitos pelo usuário (usando proprietario_id)
      const contatosFeitos = leadsDoUsuario.length
      const contatosEstaSemana = leadsDoUsuario.filter(c => c.created_at >= inicioSemana).length

      // Buscar Meta mensal do tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('meta_leads')
        .eq('id', tenantId)
        .single()

      const metaMensal = tenantData?.meta_leads || 100
      const leadsDoUsuarioEsteMesCount = leadsDoUsuarioEsteMes.length
      const progressoMeta = Math.round((leadsDoUsuarioEsteMesCount / metaMensal) * 100)

      // Métricas da Equipe Completa
      const equipeLeadsFechados = leadsData?.filter(l => l.status === 'fechado').length || 0
      const equipeTaxaConversao = totalLeads > 0
        ? Math.round((equipeLeadsFechados / totalLeads) * 100)
        : 0

      // Ranking de Membros
      const rankingMembros = (membersData || []).map(m => {
        const leadsDoMembro = leadsData?.filter(l => l.proprietario_id === m.id) || []
        const fechadosDoMembro = leadsDoMembro.filter(l => l.status === 'fechado').length
        const taxaMembro = leadsDoMembro.length > 0
          ? Math.round((fechadosDoMembro / leadsDoMembro.length) * 100)
          : 0

        // Tentar achar o nome do membro (isso pode requerer outra query ou ser passado pela equipe)
        // Como o memberships não tem nome, vamos usar o ID por enquanto ou esperar que o componente resolva
        return {
          id: m.id,
          nome: 'Membro', // Placeholder, será resolvido no componente se necessário
          leads: leadsDoMembro.length,
          fechados: fechadosDoMembro,
          taxa: taxaMembro
        }
      }).sort((a, b) => b.fechados - a.fechados || b.taxa - a.taxa)

      setStats({
        membrosAtivos,
        totalVendedores,
        totalLeads,
        leadsEsteMes,
        leadsHoje,
        leadsEmNegociacao,
        leadsFechados,
        leadsPerdidos,
        taxaConversao,
        taxaConversaoAnterior,
        tarefasPendentes,
        tarefasHoje,
        tarefasAtrasadas,
        metaMensal,
        progressoMeta,
        contatosFeitos,
        contatosEstaSemana,
        equipeLeadsFechados,
        equipeTaxaConversao,
        rankingMembros
      })

      setTarefas(tarefasResumidas)
    } catch (err) {
      console.error('Erro ao carregar estatísticas da equipe:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [tenantId, userId])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    tarefas,
    loading,
    error,
    refresh: loadStats
  }
}
