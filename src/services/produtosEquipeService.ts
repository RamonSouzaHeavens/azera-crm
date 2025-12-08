import { supabase } from '../lib/supabase'
import type { ProdutoFiltros } from '../types/produtos'

export interface ProdutoEquipe {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  tipo: string | null
  valor: number | null
  preco?: number | null
  price?: number | null
  capa_url: string | null
  status: string
  destaque: boolean
  criado_por: string
  created_at: string
  updated_at: string
  proprietario_id?: string
  ativo?: boolean
  finalidade?: string | null
  area_total?: number | null
  area_construida?: number | null
  quartos?: number | null
  banheiros?: number | null
  vagas_garagem?: number | null
  endereco?: string | null
  bairro?: string | null
  cidade?: string | null
  cep?: string | null
  filtros?: ProdutoFiltros | null
  tags?: string[] | null
}

function parseFiltros(value: unknown): ProdutoFiltros | null {
  if (!value) return null

  if (typeof value === 'string') {
    try {
      return value ? (JSON.parse(value) as ProdutoFiltros) : null
    } catch (error) {
      console.warn('[produtosEquipeService] Não foi possível fazer o parse do campo filtros:', error)
      return null
    }
  }

  return value as ProdutoFiltros
}

/**
 * Buscar todos os produtos acessíveis à equipe (produtos do proprietário)
 * Agora reflete os produtos do proprietário em vez de usar a tabela separada
 */
export async function getProdutosEquipe(tenantId: string): Promise<ProdutoEquipe[]> {
  try {
    console.log('[DEBUG] getProdutosEquipe - tenantId:', tenantId)

    // 1. Buscar o proprietário (owner) do tenant
    let ownerUserId: string | undefined

    // Tentar memberships primeiro (tabela principal)
    const { data: membershipData } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .single()

    console.log('[DEBUG] Owner data (memberships table):', membershipData)

    if (membershipData?.user_id) {
      ownerUserId = membershipData.user_id
    } else {
      // Tentar members como fallback
      const { data: memberData } = await supabase
        .from('members')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('role', 'owner')
        .single()

      console.log('[DEBUG] Owner data (members table):', memberData)
      ownerUserId = memberData?.user_id
    }

    console.log('[DEBUG] Owner ID encontrado:', ownerUserId)

    // 2. Buscar APENAS os produtos do tenant (por enquanto, filtro frontend)
    const produtosQuery = supabase
      .from('produtos')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    console.log('[DEBUG] ✅ Buscando produtos do tenant (proprietario_id será filtrado no frontend)')

    const { data, error } = await produtosQuery

    console.log('[DEBUG] ========== PRODUTOS RETORNADOS ==========')
    console.log('[DEBUG] Total de produtos encontrados:', data?.length || 0)
    console.log('[DEBUG] Error:', error)
    console.log('[DEBUG] Dados completos:', JSON.stringify(data, null, 2))
    
    if (data && data.length > 0) {
      console.log('[DEBUG] IDs dos produtos:', data.map(p => ({ id: p.id, nome: p.nome })))
    }
    console.log('[DEBUG] ==========================================')

    if (error) throw error

    const normalizados = (data || []).map((produto) => ({
      ...produto,
      filtros: parseFiltros(produto?.filtros),
    }))

    return normalizados as ProdutoEquipe[]
  } catch (error) {
    console.error('Erro ao buscar produtos da equipe:', error)
    throw error
  }
}

/**
 * Buscar produto específico acessível à equipe
 */
export async function getProdutoEquipe(
  tenantId: string,
  produtoId: string
): Promise<ProdutoEquipe | null> {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', produtoId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return data || null
  } catch (error) {
    console.error('Erro ao buscar produto da equipe:', error)
    throw error
  }
}

/**
 * Contar produtos acessíveis da equipe
 */
export async function countProdutosEquipe(tenantId: string): Promise<number> {
  try {
    // Buscar proprietário
    const { data: tenantData, error: tenantError } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'proprietario')
      .single()

    if (tenantError || !tenantData?.user_id) return 0

    const { count, error } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('proprietario_id', tenantData.user_id)

    if (error) throw error

    return count || 0
  } catch (error) {
    console.error('Erro ao contar produtos da equipe:', error)
    throw error
  }
}

/**
 * Buscar produtos por tipo acessíveis à equipe
 */
export async function getProdutosEquipeByTipo(
  tenantId: string,
  tipo: string
): Promise<ProdutoEquipe[]> {
  try {
    // Buscar proprietário
    const { data: tenantData, error: tenantError } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'proprietario')
      .single()

    if (tenantError || !tenantData?.user_id) return []

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('proprietario_id', tenantData.user_id)
      .eq('tipo', tipo)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Erro ao buscar produtos por tipo:', error)
    throw error
  }
}

/**
 * DEPRECATED - Produtos da equipe agora refletem os produtos do proprietário
 * Para deletar um produto, use o produtoService.ts
 */
export async function deleteProdutoEquipe(): Promise<void> {
  console.warn('deleteProdutoEquipe é uma view dos produtos do proprietário. Use produtoService.ts para deletar.')
  // Função mantida para compatibilidade, mas não faz nada
  return
}

/**
 * Deletar todos os produtos do sistema ([Sistema]...)
 */
export async function deleteProdutosSistema(tenantId: string): Promise<number> {
  try {
    console.log('[DEBUG] Deletando produtos do sistema para tenant:', tenantId)

    const { data, error } = await supabase
      .from('produtos')
      .delete()
      .eq('tenant_id', tenantId)
      .like('nome', '[Sistema]%')
      .select()

    if (error) throw error

    console.log(`[DEBUG] ${data?.length || 0} produtos do sistema deletados`)
    return data?.length || 0
  } catch (error) {
    console.error('Erro ao deletar produtos do sistema:', error)
    throw error
  }
}
