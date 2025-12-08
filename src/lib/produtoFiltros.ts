import type { ProdutoFiltros } from '../types/produtos'

const numberCleaner = (value: string) => value.replace(/\s+/g, '').replace(/\./g, '').replace(',', '.')

export const parseOptionalNumber = (value?: string) => {
  if (!value) return undefined
  const parsed = Number(numberCleaner(value))
  return Number.isFinite(parsed) ? parsed : undefined
}

export const cleanString = (value?: string) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const cleanArray = (values?: string[]) => {
  if (!values?.length) return undefined
  const cleaned = Array.from(
    new Set(
      values
        .map((entry) => entry.trim())
        .filter((entry) => Boolean(entry))
    )
  )
  return cleaned.length ? cleaned : undefined
}

export type ProdutoFiltrosFormValues = {
  incorporadora: string
  empreendimento: string
  fase: string
  entrega: string
  regiao: string
  bairro: string
  endereco: string
  preco_min: string
  metragem_min: string
  metragem_max: string
  tipologia: string[]
  modalidade: string[]
  vaga: string
  financiamento_incorporadora: boolean
  decorado: boolean
}

export const emptyProdutoFiltrosForm = (): ProdutoFiltrosFormValues => ({
  incorporadora: '',
  empreendimento: '',
  fase: '',
  entrega: '',
  regiao: '',
  bairro: '',
  endereco: '',
  preco_min: '',
  metragem_min: '',
  metragem_max: '',
  tipologia: [],
  modalidade: [],
  vaga: '',
  financiamento_incorporadora: false,
  decorado: false
})

export type ProdutoFiltrosListState = {
  incorporadora: string
  empreendimento: string
  fase: string
  regiao: string
  bairro: string
  endereco: string
  tipologia: string[]
  modalidade: string[]
  preco_min: string
  preco_max: string
  metragem_min: string
  metragem_max: string
  entrega_de: string
  entrega_ate: string
  financiamento_incorporadora: 'any' | 'true' | 'false'
  decorado: 'any' | 'true' | 'false'
  vaga: string
}

export const emptyProdutoFiltrosListState = (): ProdutoFiltrosListState => ({
  incorporadora: '',
  empreendimento: '',
  fase: '',
  regiao: '',
  bairro: '',
  endereco: '',
  tipologia: [],
  modalidade: [],
  preco_min: '',
  preco_max: '',
  metragem_min: '',
  metragem_max: '',
  entrega_de: '',
  entrega_ate: '',
  financiamento_incorporadora: 'any',
  decorado: 'any',
  vaga: ''
})

export const hydrateProdutoFiltrosForm = (filtros?: ProdutoFiltros | null): ProdutoFiltrosFormValues => ({
  incorporadora: filtros?.incorporadora ?? '',
  empreendimento: filtros?.empreendimento ?? '',
  fase: filtros?.fase ?? '',
  entrega: filtros?.entrega ?? '',
  regiao: filtros?.regiao ?? '',
  bairro: filtros?.bairro ?? '',
  endereco: filtros?.endereco ?? '',
  preco_min: filtros?.preco_min !== undefined && filtros?.preco_min !== null ? String(filtros.preco_min) : '',
  metragem_min: filtros?.metragem_min !== undefined && filtros?.metragem_min !== null ? String(filtros.metragem_min) : '',
  metragem_max: filtros?.metragem_max !== undefined && filtros?.metragem_max !== null ? String(filtros.metragem_max) : '',
  tipologia: filtros?.tipologia ?? [],
  modalidade: Array.isArray(filtros?.modalidade) ? filtros.modalidade : (filtros?.modalidade ? [filtros.modalidade] : []),
  vaga: filtros?.vaga !== undefined && filtros?.vaga !== null ? String(filtros.vaga) : '',
  financiamento_incorporadora: Boolean(filtros?.financiamento_incorporadora),
  decorado: Boolean(filtros?.decorado)
})

export const normalizeProdutoFiltros = (form: ProdutoFiltrosFormValues): ProdutoFiltros => {
  const normalized: ProdutoFiltros = {}

  const addIfDefined = <T>(key: keyof ProdutoFiltros, value: T | undefined | null) => {
    if (value !== undefined && value !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      normalized[key] = value as any
    }
  }

  addIfDefined('incorporadora', cleanString(form.incorporadora))
  addIfDefined('empreendimento', cleanString(form.empreendimento))
  addIfDefined('fase', cleanString(form.fase))
  addIfDefined('entrega', cleanString(form.entrega))
  addIfDefined('regiao', cleanString(form.regiao))
  addIfDefined('bairro', cleanString(form.bairro))
  addIfDefined('endereco', cleanString(form.endereco))
  addIfDefined('preco_min', parseOptionalNumber(form.preco_min))
  addIfDefined('metragem_min', parseOptionalNumber(form.metragem_min))
  addIfDefined('metragem_max', parseOptionalNumber(form.metragem_max))
  addIfDefined('tipologia', cleanArray(form.tipologia))
  addIfDefined('modalidade', form.modalidade ? [form.modalidade] : undefined)

  if (form.vaga) {
    const parsedVaga = Number(numberCleaner(form.vaga))
    normalized.vaga = Number.isFinite(parsedVaga) ? parsedVaga : null
  } else if (form.vaga === '') {
    normalized.vaga = null
  }

  normalized.financiamento_incorporadora = Boolean(form.financiamento_incorporadora)
  normalized.decorado = Boolean(form.decorado)

  return normalized
}

export const isProdutoFiltrosEmpty = (filtros: ProdutoFiltros) =>
  Object.values(filtros).every((value) => {
    if (Array.isArray(value)) return value.length === 0
    return value === undefined || value === null || value === ''
  })
