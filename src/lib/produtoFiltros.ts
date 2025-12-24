// =====================================================
// LIB: Produto Filtros Utilities
// =====================================================

// Types
export interface ProdutoFiltrosFormValues {
  incorporadora: string
  empreendimento: string
  fase: string
  entrega: string
  regiao: string
  bairro: string
  endereco: string
  preco_min: string
  preco_max: string
  metragem_min: string
  metragem_max: string
  tipologia: string[]
  modalidade: string[]
  vaga: string
  financiamento_incorporadora: boolean
  decorado: boolean
}

export interface ProdutoFiltrosListState {
  incorporadora: string
  empreendimento: string
  fase: string
  regiao: string
  bairro: string
  endereco: string
  preco_min: string
  preco_max: string
  metragem_min: string
  metragem_max: string
  tipologia: string[]
  modalidade: string[]
  vaga: string
  financiamento_incorporadora: 'any' | 'true' | 'false'
  decorado: 'any' | 'true' | 'false'
  entrega_de: string
  entrega_ate: string
}

// Empty state factories
export function emptyProdutoFiltrosForm(): ProdutoFiltrosFormValues {
  return {
    incorporadora: '',
    empreendimento: '',
    fase: '',
    entrega: '',
    regiao: '',
    bairro: '',
    endereco: '',
    preco_min: '',
    preco_max: '',
    metragem_min: '',
    metragem_max: '',
    tipologia: [],
    modalidade: [],
    vaga: '',
    financiamento_incorporadora: false,
    decorado: false
  }
}

export function emptyProdutoFiltrosListState(): ProdutoFiltrosListState {
  return {
    incorporadora: '',
    empreendimento: '',
    fase: '',
    regiao: '',
    bairro: '',
    endereco: '',
    preco_min: '',
    preco_max: '',
    metragem_min: '',
    metragem_max: '',
    tipologia: [],
    modalidade: [],
    vaga: '',
    financiamento_incorporadora: 'any',
    decorado: 'any',
    entrega_de: '',
    entrega_ate: ''
  }
}

// Utility: parse optional number
export function parseOptionalNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : undefined
}

// Utility: clean string
export function cleanString(value: string | null | undefined): string {
  if (!value) return ''
  return value.trim()
}

// Normalize form values to DB payload
export function normalizeProdutoFiltros(form: ProdutoFiltrosFormValues): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // String fields
  if (form.incorporadora.trim()) result.incorporadora = form.incorporadora.trim()
  if (form.empreendimento.trim()) result.empreendimento = form.empreendimento.trim()
  if (form.fase.trim()) result.fase = form.fase.trim()
  if (form.entrega.trim()) result.entrega = form.entrega.trim()
  if (form.regiao.trim()) result.regiao = form.regiao.trim()
  if (form.bairro.trim()) result.bairro = form.bairro.trim()
  if (form.endereco.trim()) result.endereco = form.endereco.trim()

  // Numeric fields
  const precoMin = parseOptionalNumber(form.preco_min)
  if (precoMin !== undefined) result.preco_min = precoMin

  const precoMax = parseOptionalNumber(form.preco_max)
  if (precoMax !== undefined) result.preco_max = precoMax

  const metragemMin = parseOptionalNumber(form.metragem_min)
  if (metragemMin !== undefined) result.metragem_min = metragemMin

  const metragemMax = parseOptionalNumber(form.metragem_max)
  if (metragemMax !== undefined) result.metragem_max = metragemMax

  const vaga = parseOptionalNumber(form.vaga)
  if (vaga !== undefined) result.vaga = vaga

  // Array fields
  if (form.tipologia.length > 0) result.tipologia = form.tipologia
  if (form.modalidade.length > 0) result.modalidade = form.modalidade

  // Boolean fields
  if (form.financiamento_incorporadora) result.financiamento_incorporadora = true
  if (form.decorado) result.decorado = true

  return result
}
