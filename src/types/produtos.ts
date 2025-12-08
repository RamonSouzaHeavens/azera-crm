export type ProdutoFiltros = {
  incorporadora?: string
  empreendimento?: string
  fase?: 'PRONTO' | 'EM OBRAS' | 'LANÇAMENTO' | string
  entrega?: string
  regiao?: string
  bairro?: string
  endereco?: string
  preco_min?: number
  metragem_min?: number
  metragem_max?: number
  tipologia?: string[]
  modalidade?: string[]
  vaga?: number | null
  financiamento_incorporadora?: boolean
  decorado?: boolean
  [key: string]: string | number | boolean | string[] | undefined // ✅ Permitir campos dinâmicos
}
