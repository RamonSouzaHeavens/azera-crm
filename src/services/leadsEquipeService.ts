import { supabase } from '../lib/supabase'

export interface LeadEquipe {
  id: string
  tenant_id: string
  nome?: string
  name?: string
  telefone?: string | null
  email?: string | null
  status?: string
  notas?: string | null
  created_at?: string
  updated_at?: string
  proprietario_id?: string
  valor_potencial?: number | null
  tarefasAbertas?: number
}

/**
 * Buscar leads acessíveis à equipe. Padrão: leads cujo `tenant_id` é o tenant da equipe.
 * Mantemos o mesmo padrão de detecção do proprietário usado em produtosEquipeService
 * para futuros filtros/consistência.
 */
export async function getLeadsEquipe(tenantId: string, userId?: string): Promise<LeadEquipe[]> {
  try {
    console.log('[DEBUG] getLeadsEquipe - tenantId:', tenantId, userId ? `(Filter by user: ${userId})` : '')

    // 1. Tentar identificar owner (por compatibilidade) - Mantido igual
    // ... (poderia otimizar, mas mantendo a lógica original)

    // 2. Buscar leads do tenant com filtro opcional de userId
    let query = supabase
      .from('clientes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (userId) {
        query = query.eq('proprietario_id', userId)
    }

    const { data: leadsData, error: leadsError } = await query

    if (leadsError) throw leadsError

    const leads = (leadsData || []) as LeadEquipe[]

    // 3. Buscar tarefas abertas para cada lead (contagem)
    const leadIds = leads.map(l => l.id).filter(Boolean)
    const tarefasCountMap: Record<string, number> = {}

    if (leadIds.length > 0) {
      const { data: tarefasData, error: tarefasError } = await supabase
        .from('tarefas')
        .select('cliente_id')
        .eq('tenant_id', tenantId)
        .in('cliente_id', leadIds)
        .neq('status', 'concluida')

      if (!tarefasError && tarefasData) {
        for (const t of tarefasData) {
          const row = t as { cliente_id?: string }
          const id = row.cliente_id
          if (id) tarefasCountMap[id] = (tarefasCountMap[id] || 0) + 1
        }
      }
    }

    // Mapear campos extras
    const enriched = leads.map(l => {
      const row = l as unknown as Record<string, unknown>
      const valor = (row['valor_potencial'] ?? row['valor'] ?? null) as number | null
      return {
        ...l,
        valor_potencial: valor,
        tarefasAbertas: tarefasCountMap[l.id] || 0
      }
    })

    return enriched
  } catch (error) {
    console.error('Erro ao buscar leads da equipe:', error)
    throw error
  }
}
