import { supabase } from '../lib/supabase'
import type { PostgrestResponse } from '@supabase/postgrest-js'

export type Periodo = '1m' | '3m' | '6m' | '1a'

export interface VendaMes {
  mes: string
  vendas: number
  meta: number
}

export interface ProdutoMaisVendido {
  produto: string
  vendas: number
  receita: number
}

export interface VendedorPerformance {
  vendedor: string
  vendas: number
  receita: number
  meta: number
}

export interface FunilItem {
  etapa: string
  quantidade: number
  cor: string
  bgColor: string
  textColor: string
}

export interface Estatistica {
  titulo: string
  valor: string
  variacao: string
  icon: string
  cor: string
  bgColor: string
  positive: boolean
}

interface VendaData {
  id: string
  valor: number
  produto: string
  data_venda: string
  cliente?: { nome: string }
  vendedor?: { name: string }
}

interface ClienteData {
  id: string
  status: string
  created_at: string
  valor_potencial?: number
}

// Helper para calcular datas baseado no período
const getDateRange = (periodo: Periodo) => {
  const now = new Date()
  const currentStart = new Date()
  const previousStart = new Date()
  
  switch (periodo) {
    case '1m':
      currentStart.setMonth(now.getMonth() - 1)
      previousStart.setMonth(now.getMonth() - 2)
      break
    case '3m':
      currentStart.setMonth(now.getMonth() - 3)
      previousStart.setMonth(now.getMonth() - 6)
      break
    case '6m':
      currentStart.setMonth(now.getMonth() - 6)
      previousStart.setMonth(now.getMonth() - 12)
      break
    case '1a':
      currentStart.setFullYear(now.getFullYear() - 1)
      previousStart.setFullYear(now.getFullYear() - 2)
      break
  }
  
  return {
    currentStartDate: currentStart.toISOString().split('T')[0],
    currentEndDate: now.toISOString().split('T')[0],
    previousStartDate: previousStart.toISOString().split('T')[0],
    previousEndDate: currentStart.toISOString().split('T')[0]
  }
}

// Busca todos os dados necessários
export const fetchRows = async (tenantId: string, periodo: Periodo) => {
  const { currentStartDate, currentEndDate, previousStartDate, previousEndDate } = getDateRange(periodo)
  // Executar todas as queries em paralelo para reduzir latência total
  const vendasPromise = supabase
    .from('vendas')
    .select(`
      *,
      cliente:clientes!inner(nome),
      vendedor:members!inner(name)
    `)
    .eq('tenant_id', tenantId)
    .gte('data_venda', currentStartDate)
    .lte('data_venda', currentEndDate)
    .eq('status', 'concluida')

  const vendasPreviasPromise = supabase
    .from('vendas')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('data_venda', previousStartDate)
    .lte('data_venda', previousEndDate)
    .eq('status', 'concluida')

  const clientesPromise = supabase
    .from('clientes')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', currentStartDate)
    .lte('created_at', currentEndDate)

  const clientesPreviosPromise = supabase
    .from('clientes')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', previousStartDate)
    .lte('created_at', previousEndDate)

  const perfisPromise = supabase
    .from('members')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('role', 'vendedor')

  const [vendasRes, vendasPreviasRes, clientesRes, clientesPreviosRes, perfisRes] = await Promise.all([
    vendasPromise,
    vendasPreviasPromise,
    clientesPromise,
    clientesPreviosPromise,
    perfisPromise,
  ])

  const vendas = ((vendasRes as PostgrestResponse<VendaData>).data) || []
  const vendasPrevias = ((vendasPreviasRes as PostgrestResponse<VendaData>).data) || []
  const clientes = ((clientesRes as PostgrestResponse<ClienteData>).data) || []
  const clientesPrevios = ((clientesPreviosRes as PostgrestResponse<ClienteData>).data) || []
  const perfis = ((perfisRes as PostgrestResponse<Record<string, unknown>>).data) || []

  return {
    vendas,
    clientes,
    perfis,
    vendasPrevias,
    clientesPrevios,
  }
}

// Constrói dados de vendas por mês
export const buildVendasPorMes = (vendas: VendaData[], clientes?: ClienteData[]): VendaMes[] => {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const vendasPorMes: Record<string, number> = {}
  
  // Adiciona vendas da tabela vendas
  vendas.forEach(venda => {
    const data = new Date(venda.data_venda)
    const mesAno = `${meses[data.getMonth()]}`
    vendasPorMes[mesAno] = (vendasPorMes[mesAno] || 0) + (venda.valor || 0)
  })
  
  // Adiciona vendas de clientes fechados (igual ao Dashboard)
  if (clientes) {
    clientes
      .filter(c => c.status === 'fechado')
      .forEach(cliente => {
        const data = new Date(cliente.created_at)
        const mesAno = `${meses[data.getMonth()]}`
        vendasPorMes[mesAno] = (vendasPorMes[mesAno] || 0) + (Number(cliente.valor_potencial) || 0)
      })
  }
  
  // Últimos 6 meses
  const result: VendaMes[] = []
  const hoje = new Date()
  
  for (let i = 5; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const mes = meses[data.getMonth()]
    const valorVendas = vendasPorMes[mes] || 0
    const meta = Math.max(valorVendas * 1.1, 50000) // Meta 10% acima das vendas ou mínimo 50k
    
    result.push({
      mes,
      vendas: valorVendas,
      meta: Math.round(meta)
    })
  }
  
  return result
}

// Constrói dados de produtos mais vendidos
export const buildProdutosMaisVendidos = (vendas: VendaData[]): ProdutoMaisVendido[] => {
  const produtoStats: Record<string, { vendas: number; receita: number }> = {}
  
  vendas.forEach(venda => {
    const produto = venda.produto || 'Produto sem nome'
    if (!produtoStats[produto]) {
      produtoStats[produto] = { vendas: 0, receita: 0 }
    }
    produtoStats[produto].vendas += 1
    produtoStats[produto].receita += venda.valor || 0
  })
  
  return Object.entries(produtoStats)
    .map(([produto, stats]) => ({
      produto,
      vendas: stats.vendas,
      receita: stats.receita
    }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 4)
}

// Constrói dados de performance dos vendedores
export const buildPerformanceVendedores = (vendas: VendaData[]): VendedorPerformance[] => {
  const vendedorStats: Record<string, { vendas: number; receita: number }> = {}
  
  vendas.forEach(venda => {
    const vendedorNome = venda.vendedor?.name || 'Vendedor sem nome'
    if (!vendedorStats[vendedorNome]) {
      vendedorStats[vendedorNome] = { vendas: 0, receita: 0 }
    }
    vendedorStats[vendedorNome].vendas += 1
    vendedorStats[vendedorNome].receita += venda.valor || 0
  })
  
  return Object.entries(vendedorStats)
    .map(([vendedor, stats]) => ({
      vendedor,
      vendas: stats.vendas,
      receita: stats.receita,
      meta: Math.max(stats.receita * 0.9, 60000) // Meta 90% da receita atual ou mínimo 60k
    }))
    .sort((a, b) => b.receita - a.receita)
}

// Constrói funil de vendas
export const buildFunil = (clientes: ClienteData[]): FunilItem[] => {
  const statusCount = {
    lead: 0,
    negociacao: 0,
    fechado: 0,
    perdido: 0
  }
  
  clientes.forEach(cliente => {
    if (cliente.status in statusCount) {
      statusCount[cliente.status as keyof typeof statusCount]++
    }
  })
  
  const total = clientes.length
  const qualificados = Math.round(total * 0.7) // 70% dos leads são qualificados
  const propostas = statusCount.negociacao + statusCount.fechado
  
  return [
    { 
      etapa: 'Leads', 
      quantidade: total, 
      cor: 'from-blue-500 to-blue-600', 
      bgColor: 'bg-blue-50', 
      textColor: 'text-blue-700' 
    },
    { 
      etapa: 'Qualificados', 
      quantidade: qualificados, 
      cor: 'from-purple-500 to-purple-600', 
      bgColor: 'bg-purple-50', 
      textColor: 'text-purple-700' 
    },
    { 
      etapa: 'Propostas', 
      quantidade: propostas, 
      cor: 'from-amber-500 to-amber-600', 
      bgColor: 'bg-amber-50', 
      textColor: 'text-amber-700' 
    },
    { 
      etapa: 'Negociação', 
      quantidade: statusCount.negociacao, 
      cor: 'from-orange-500 to-orange-600', 
      bgColor: 'bg-orange-50', 
      textColor: 'text-orange-700' 
    },
    { 
      etapa: 'Fechados', 
      quantidade: statusCount.fechado, 
      cor: 'from-emerald-500 to-emerald-600', 
      bgColor: 'bg-emerald-50', 
      textColor: 'text-emerald-700' 
    },
  ]
}

// Constrói estatísticas gerais
export const buildEstatisticasGerais = (
  vendas: VendaData[], 
  clientes: ClienteData[],
  vendasPrevias: VendaData[],
  clientesPrevios: ClienteData[]
): Estatistica[] => {
  // Calcula receita total = vendas da tabela + clientes fechados (valor_potencial)
  const receitaVendas = vendas.reduce((sum, venda) => sum + (venda.valor || 0), 0)
  const receitaClientesFechados = clientes
    .filter(c => c.status === 'fechado')
    .reduce((sum, cliente) => sum + (Number(cliente.valor_potencial) || 0), 0)
  const receitaTotal = receitaVendas + receitaClientesFechados
  
  // Vendas realizadas = quantidade de clientes fechados (igual ao Dashboard)
  const vendasRealizadas = clientes.filter(c => c.status === 'fechado').length
  const clientesAtivos = clientes.filter(c => c.status !== 'perdido').length
  const taxaConversao = clientes.length > 0 ? (vendasRealizadas / clientes.length) * 100 : 0
  
  // Calcula valores do período anterior para comparação
  const receitaVendasPrev = vendasPrevias.reduce((sum, venda) => sum + (venda.valor || 0), 0)
  const receitaClientesFechadosPrev = clientesPrevios
    .filter(c => c.status === 'fechado')
    .reduce((sum, cliente) => sum + (Number(cliente.valor_potencial) || 0), 0)
  const receitaTotalPrev = receitaVendasPrev + receitaClientesFechadosPrev
  
  const vendasRealizadasPrev = clientesPrevios.filter(c => c.status === 'fechado').length
  const clientesAtivosPrev = clientesPrevios.filter(c => c.status !== 'perdido').length
  const taxaConversaoPrev = clientesPrevios.length > 0 ? (vendasRealizadasPrev / clientesPrevios.length) * 100 : 0
  
  // Calcula variações percentuais
  const calcularVariacao = (atual: number, anterior: number): string => {
    if (anterior === 0) return atual > 0 ? '+100%' : '0%'
    const variacao = ((atual - anterior) / anterior) * 100
    return variacao >= 0 ? `+${variacao.toFixed(1)}%` : `${variacao.toFixed(1)}%`
  }
  
  const receitaVariacao = calcularVariacao(receitaTotal, receitaTotalPrev)
  const vendasVariacao = calcularVariacao(vendasRealizadas, vendasRealizadasPrev)
  const clientesVariacao = calcularVariacao(clientesAtivos, clientesAtivosPrev)
  const conversaoVariacao = calcularVariacao(taxaConversao, taxaConversaoPrev)
  
  return [
    { 
      titulo: 'Receita Total', 
      valor: `R$ ${receitaTotal.toLocaleString('pt-BR')}`, 
      variacao: receitaVariacao, 
      icon: 'DollarSign', 
      cor: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      positive: receitaVariacao.startsWith('+')
    },
    { 
      titulo: 'Vendas Realizadas', 
      valor: vendasRealizadas.toString(), 
      variacao: vendasVariacao, 
      icon: 'TrendingUp', 
      cor: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      positive: vendasVariacao.startsWith('+')
    },
    { 
      titulo: 'Clientes Ativos', 
      valor: clientesAtivos.toString(), 
      variacao: clientesVariacao, 
      icon: 'Users', 
      cor: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      positive: clientesVariacao.startsWith('+')
    },
    { 
      titulo: 'Taxa de Conversão', 
      valor: `${taxaConversao.toFixed(1)}%`, 
      variacao: conversaoVariacao, 
      icon: 'Target', 
      cor: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      positive: conversaoVariacao.startsWith('+')
    },
  ]
}
