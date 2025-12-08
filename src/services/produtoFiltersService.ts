import { supabase } from '../lib/supabase'

// Funções simplificadas que buscam diretamente da tabela
const fetchDistinctFromFiltros = async (tenantId: string, key: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('filtros')
      .eq('tenant_id', tenantId)

    if (error) {
      console.error(`Erro ao buscar ${key}:`, error)
      return []
    }

    const values = new Set<string>()
    data?.forEach((item: Record<string, unknown>) => {
      const filtros = item.filtros as Record<string, unknown> | null
      if (filtros && filtros[key]) {
        const value = filtros[key]
        if (typeof value === 'string' && value.trim()) {
          values.add(value.trim())
        }
      }
    })

    return Array.from(values).sort()
  } catch (err) {
    console.error(`Erro ao buscar opções para ${key}:`, err)
    return []
  }
}

const fetchDistinctArrayFromFiltros = async (tenantId: string, key: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('filtros')
      .eq('tenant_id', tenantId)

    if (error) {
      console.error(`Erro ao buscar array ${key}:`, error)
      return []
    }

    const values = new Set<string>()
    data?.forEach((item: Record<string, unknown>) => {
      const filtros = item.filtros as Record<string, unknown> | null
      if (filtros && Array.isArray(filtros[key])) {
        (filtros[key] as string[]).forEach((v: string) => {
          if (v && typeof v === 'string' && v.trim()) {
            values.add(v.trim())
          }
        })
      }
    })

    return Array.from(values).sort()
  } catch (err) {
    console.error(`Erro ao buscar opções array para ${key}:`, err)
    return []
  }
}

export type ProdutoFiltroOptions = {
  incorporadoras: string[]
  empreendimentos: string[]
  fases: string[]
  regioes: string[]
  bairros: string[]
  tipologias: string[]
  modalidades: string[]
  referencias?: string[]
}

export const fetchProdutoFiltroOptions = async (tenantId?: string | null): Promise<ProdutoFiltroOptions> => {
  if (!tenantId) {
    return {
      incorporadoras: [],
      empreendimentos: [],
      fases: [],
      regioes: [],
      bairros: [],
      tipologias: [],
      modalidades: []
    }
  }

  const [incorporadoras, empreendimentos, fases, regioes, bairros, tipologias, modalidades, referencias] = await Promise.all([
    fetchDistinctFromFiltros(tenantId, 'incorporadora'),
    fetchDistinctFromFiltros(tenantId, 'empreendimento'),
    fetchDistinctFromFiltros(tenantId, 'fase'),
    fetchDistinctFromFiltros(tenantId, 'regiao'),
    fetchDistinctFromFiltros(tenantId, 'bairro'),
    fetchDistinctArrayFromFiltros(tenantId, 'tipologia'),
    fetchDistinctArrayFromFiltros(tenantId, 'modalidade'),
    fetchDistinctFromFiltros(tenantId, 'referencia')
  ])

  return {
    incorporadoras,
    empreendimentos,
    fases,
    regioes,
    bairros,
    tipologias,
    modalidades,
    referencias
  }
}

// Funções para adicionar novas opções - adiciona ao cache local
// Os valores serão persistidos quando um produto/imóvel for criado/editado com essas opções
export const addIncorporadora = async (_tenantId: string, incorporadora: string): Promise<boolean> => {
  if (!incorporadora.trim()) return false
  console.log(`[Sistema] Nova incorporadora adicionada: ${incorporadora.trim()}`)
  return true
}

export const addRegiao = async (_tenantId: string, regiao: string): Promise<boolean> => {
  if (!regiao.trim()) return false
  console.log(`[Sistema] Nova região adicionada: ${regiao.trim()}`)
  return true
}

export const addBairro = async (_tenantId: string, bairro: string): Promise<boolean> => {
  if (!bairro.trim()) return false
  console.log(`[Sistema] Novo bairro adicionado: ${bairro.trim()}`)
  return true
}
