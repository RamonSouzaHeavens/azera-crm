// Tipos para produtos/imóveis

export interface ProdutoFiltros {
  incorporadora?: string
  empreendimento?: string
  fase?: string
  regiao?: string
  bairro?: string
  endereco?: string
  preco_min?: number
  preco_max?: number
  metragem_min?: number
  metragem_max?: number
  entrega?: string
  vaga?: number
  tipologia?: string[]
  modalidade?: string[]
  financiamento_incorporadora?: boolean
  decorado?: boolean
  tipo?: string
}

export type ImovelTipo = 'apartamento' | 'casa' | 'sobrado' | 'cobertura' | 'terreno' | 'comercial' | 'industrial' | 'rural'
export type ImovelFinalidade = 'venda' | 'aluguel' | 'venda_aluguel'
export type ImovelStatus = 'disponivel' | 'reservado' | 'vendido' | 'alugado' | 'inativo'

export interface Produto {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  valor: number | null
  currency: string | null
  categoria: string | null
  capa_url: string | null
  galeria: string[] | null
  anexos: string[] | null
  status: string | null
  destaque: boolean
  ativo: boolean
  filtros: ProdutoFiltros | null
  created_at: string
  updated_at: string
}
