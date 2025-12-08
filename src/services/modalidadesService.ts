import { supabase } from '../lib/supabase'

export interface Modalidade {
  id: string
  nome: string
  created_at?: string
}

/**
 * Buscar todas as modalidades do tenant
 */
export async function getModalidades(tenantId: string): Promise<Modalidade[]> {
  try {
    const { data, error } = await supabase.rpc('get_tenant_modalidades', {
      p_tenant_id: tenantId,
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar modalidades:', error)
    return []
  }
}

/**
 * Adicionar nova modalidade ao tenant
 */
export async function addModalidade(
  tenantId: string,
  nome: string
): Promise<Modalidade | null> {
  try {
    if (!nome.trim()) {
      throw new Error('Nome da modalidade não pode estar vazio')
    }

    const { data, error } = await supabase.rpc('add_tenant_modalidade', {
      p_tenant_id: tenantId,
      p_nome: nome.trim(),
    })

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Erro ao adicionar modalidade:', error)
    throw error
  }
}

/**
 * Carrega modalidades e popula no estado do filtro
 */
export async function loadModalidades(tenantId: string) {
  try {
    return await getModalidades(tenantId)
  } catch (error) {
    console.error('Erro ao carregar modalidades:', error)
    return []
  }
}
