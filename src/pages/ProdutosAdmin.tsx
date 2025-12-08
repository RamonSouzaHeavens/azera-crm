
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Grid3X3,
  List,
  Filter,
  RefreshCcw,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Ruler,
  Tag,
  Check,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { ProdutoFiltros } from '../types/produtos'
import {
  emptyProdutoFiltrosForm,
  emptyProdutoFiltrosListState,
  normalizeProdutoFiltros,
  ProdutoFiltrosFormValues,
  ProdutoFiltrosListState,
  parseOptionalNumber,
  cleanString
} from '../lib/produtoFiltros'
import { fetchProdutoFiltroOptions, ProdutoFiltroOptions } from '../services/produtoFiltersService'

type OrderOption = 'preco_asc' | 'preco_desc' | 'entrega_asc' | 'entrega_desc' | 'recentes'

type ProdutoRow = {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  preco?: number | string | null
  price?: number | string | null
  ativo?: boolean | null
  created_at: string
  filtros?: ProdutoFiltros | null
  preco_min_num?: number | string | null
  metragem_min_num?: number | string | null
  metragem_max_num?: number | string | null
  entrega_date?: string | null
}

interface Produto {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  preco: number
  preco_min_num: number | null
  metragem_min_num: number | null
  metragem_max_num: number | null
  entrega_date: string | null
  ativo: boolean
  created_at: string
  filtros: ProdutoFiltros | null
}

interface NovoProduto {
  nome: string
  descricao: string
  preco: string
  ativo: boolean
}

type NormalizedListFilters = {
  contains: Record<string, unknown>
  ranges: {
    precoMin?: number
    precoMax?: number
    metragemMin?: number
    metragemMax?: number
  }
  entrega: {
    from?: string
    to?: string
  }
}

const ORDER_CONFIG: Record<
  OrderOption,
  {
    derived: { column: string; ascending: boolean }
    fallback: { column: string; ascending: boolean }
  }
> = {
  preco_asc: {
    derived: { column: 'preco_min_num', ascending: true },
    fallback: { column: 'price', ascending: true }
  },
  preco_desc: {
    derived: { column: 'preco_min_num', ascending: false },
    fallback: { column: 'price', ascending: false }
  },
  entrega_asc: {
    derived: { column: 'entrega_date', ascending: true },
    fallback: { column: 'created_at', ascending: true }
  },
  entrega_desc: {
    derived: { column: 'entrega_date', ascending: false },
    fallback: { column: 'created_at', ascending: false }
  },
  recentes: {
    derived: { column: 'created_at', ascending: false },
    fallback: { column: 'created_at', ascending: false }
  }
} as const

const EMPTY_OPTIONS: ProdutoFiltroOptions = {
  incorporadoras: [],
  empreendimentos: [],
  fases: [],
  regioes: [],
  bairros: [],
  tipologias: [],
  modalidades: []
}

const shouldFallbackToLegacy = (message?: string) => {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('preco_min_num') ||
    lower.includes('metragem_min_num') ||
    lower.includes('metragem_max_num') ||
    lower.includes('entrega_date') ||
    lower.includes('preco')
  )
}

const parseNumeric = (value?: number | string | null): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const mapProdutoRows = (rows: ProdutoRow[]): Produto[] =>
  rows.map((row) => {
    const precoValue = parseNumeric(row.preco) ?? parseNumeric(row.price) ?? 0
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      nome: row.nome,
      descricao: row.descricao,
      preco: precoValue,
      preco_min_num: parseNumeric(row.preco_min_num),
      metragem_min_num: parseNumeric(row.metragem_min_num),
      metragem_max_num: parseNumeric(row.metragem_max_num),
      entrega_date: row.entrega_date ?? null,
      ativo: row.ativo ?? true,
      created_at: row.created_at,
      filtros: row.filtros ?? null
    }
  })

const applyListFilters = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: NormalizedListFilters,
  supportsDerived: boolean
) => {
  let builder = query

  if (Object.keys(filters.contains).length > 0) {
    builder = builder.contains('filtros', filters.contains)
  }

  if (supportsDerived) {
    const { ranges, entrega } = filters
    if (ranges.precoMin !== undefined) {
      builder = builder.gte('preco_min_num', ranges.precoMin)
    }
    if (ranges.precoMax !== undefined) {
      builder = builder.lte('preco_min_num', ranges.precoMax)
    }
    if (ranges.metragemMin !== undefined) {
      builder = builder.gte('metragem_min_num', ranges.metragemMin)
    }
    if (ranges.metragemMax !== undefined) {
      builder = builder.lte('metragem_max_num', ranges.metragemMax)
    }
    if (entrega.from) {
      builder = builder.gte('entrega_date', entrega.from)
    }
    if (entrega.to) {
      builder = builder.lte('entrega_date', entrega.to)
    }
  }

  return builder
}

const applyOrdering = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  order: OrderOption,
  supportsDerived: boolean
) => {
  const config = ORDER_CONFIG[order]
  const target = supportsDerived ? config.derived : config.fallback

  let builder = query.order(target.column, {
    ascending: target.ascending,
    nullsLast: true
  })

  builder = builder.order('nome', { ascending: true, nullsLast: false })

  return builder
}

const formatCurrency = (value?: number | null) =>
  value !== null && value !== undefined
    ? value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0
      })
    : '�'

const formatEntrega = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '�'

const formatMetragem = (min?: number | null, max?: number | null) => {
  if (min && max) return `${min} a ${max} m�`
  if (min) return `${min} m�`
  if (max) return `at� ${max} m�`
  return '�'
}
export default function ProdutosAdmin() {
  const { tenant } = useAuthStore()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [ordenacao, setOrdenacao] = useState<OrderOption>('preco_asc')
  const [filtroOptions, setFiltroOptions] = useState<ProdutoFiltroOptions>(EMPTY_OPTIONS)
  const [filtrosUI, setFiltrosUI] = useState<ProdutoFiltrosListState>(() => emptyProdutoFiltrosListState())
  const [debouncedFiltros, setDebouncedFiltros] = useState<ProdutoFiltrosListState>(filtrosUI)
  const [novoProduto, setNovoProduto] = useState<NovoProduto>({
    nome: '',
    descricao: '',
    preco: '',
    ativo: true
  })
  const [novoProdutoFiltros, setNovoProdutoFiltros] = useState<ProdutoFiltrosFormValues>(() =>
    emptyProdutoFiltrosForm()
  )
  const [tipologiaDraft, setTipologiaDraft] = useState('')
  const [modalidadeDraft, setModalidadeDraft] = useState('')
  const [equipeId, setEquipeId] = useState<string | null>(null)
  const [equipes, setEquipes] = useState<Array<{ id: string; nome: string }>>([])

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedFiltros(filtrosUI), 350)
    return () => clearTimeout(handler)
  }, [filtrosUI])

  const normalizedListFilters = useMemo<NormalizedListFilters>(() => {
    const contains: Record<string, unknown> = {}
    const ranges: NormalizedListFilters['ranges'] = {}
    const entrega: NormalizedListFilters['entrega'] = {}

    const addString = (key: string, value: string) => {
      const cleaned = cleanString(value)
      if (cleaned) {
        contains[key] = cleaned
      }
    }

    addString('incorporadora', debouncedFiltros.incorporadora)
    addString('empreendimento', debouncedFiltros.empreendimento)
    addString('fase', debouncedFiltros.fase)
    addString('regiao', debouncedFiltros.regiao)
    addString('bairro', debouncedFiltros.bairro)
    addString('endereco', debouncedFiltros.endereco)

    if (debouncedFiltros.tipologia.length) {
      contains.tipologia = debouncedFiltros.tipologia
    }

    if (debouncedFiltros.modalidade.length) {
      contains.modalidade = debouncedFiltros.modalidade
    }

    if (debouncedFiltros.financiamento_incorporadora !== 'any') {
      contains.financiamento_incorporadora = debouncedFiltros.financiamento_incorporadora === 'true'
    }

    if (debouncedFiltros.decorado !== 'any') {
      contains.decorado = debouncedFiltros.decorado === 'true'
    }

    const vagaValue = parseOptionalNumber(debouncedFiltros.vaga)
    if (vagaValue !== undefined) {
      contains.vaga = vagaValue
    }

    const precoMin = parseOptionalNumber(debouncedFiltros.preco_min)
    if (precoMin !== undefined) {
      ranges.precoMin = precoMin
    }
    const precoMax = parseOptionalNumber(debouncedFiltros.preco_max)
    if (precoMax !== undefined) {
      ranges.precoMax = precoMax
    }
    const metragemMin = parseOptionalNumber(debouncedFiltros.metragem_min)
    if (metragemMin !== undefined) {
      ranges.metragemMin = metragemMin
    }
    const metragemMax = parseOptionalNumber(debouncedFiltros.metragem_max)
    if (metragemMax !== undefined) {
      ranges.metragemMax = metragemMax
    }

    const entregaDe = cleanString(debouncedFiltros.entrega_de)
    if (entregaDe) {
      entrega.from = entregaDe
    }
    const entregaAte = cleanString(debouncedFiltros.entrega_ate)
    if (entregaAte) {
      entrega.to = entregaAte
    }

    return { contains, ranges, entrega }
  }, [debouncedFiltros])
  const loadProdutos = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!tenant?.id) return

      if (!silent) {
        setLoading(true)
      }

      const buildQuery = (mode: 'modern' | 'legacy') => {
        const select =
          mode === 'modern'
            ? 'id, tenant_id, nome, descricao, preco, price, ativo, created_at, filtros, preco_min_num, metragem_min_num, metragem_max_num, entrega_date'
            : 'id, tenant_id, nome, descricao, price, ativo, created_at, filtros'

        let builder = supabase
          .from('produtos')
          .select(select)
          .eq('tenant_id', tenant.id)

        builder = applyListFilters(builder, normalizedListFilters, mode === 'modern')
        builder = applyOrdering(builder, ordenacao, mode === 'modern')

        return builder
      }

      try {
        const modernQuery = buildQuery('modern')
        const { data, error } = await modernQuery

        if (!error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setProdutos(mapProdutoRows((data as any) ?? []))
          return
        }

        if (!shouldFallbackToLegacy(error.message)) {
          throw error
        }

        const legacyQuery = buildQuery('legacy')
        const legacyResult = await legacyQuery

        if (legacyResult.error) {
          throw legacyResult.error
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProdutos(mapProdutoRows((legacyResult.data as any) ?? []))
      } catch (err) {
        console.error('Erro ao carregar produtos:', err)
        toast.error('N�o foi poss�vel carregar os produtos.')
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [tenant?.id, normalizedListFilters, ordenacao]
  )

  const refreshFiltroOptions = useCallback(async () => {
    if (!tenant?.id) {
      setFiltroOptions(EMPTY_OPTIONS)
      return
    }

    try {
      const options = await fetchProdutoFiltroOptions(tenant.id)
      setFiltroOptions(options)
    } catch (err) {
      console.error('Erro ao buscar op��es de filtros:', err)
    }
  }, [tenant?.id])

  useEffect(() => {
    loadProdutos()
  }, [loadProdutos])

  useEffect(() => {
    refreshFiltroOptions()
  }, [refreshFiltroOptions])

  // Carregar equipes
  useEffect(() => {
    const loadEquipes = async () => {
      if (!tenant?.id) return
      
      // Buscar apenas as equipes (tenants) do tenant atual
      const { data: rows, error } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('id', tenant.id)
        .order('name')

      if (error) {
        console.error('[DEBUG] Erro ao carregar equipes:', error)
      } else {
        console.log('[DEBUG] Equipes carregadas (ProdutosAdmin):', rows)
        setEquipes(rows.map(e => ({ id: e.id, nome: e.name })))
      }
    }

    loadEquipes()
  }, [tenant?.id])

  const handleResetFiltros = () => {
    setFiltrosUI(emptyProdutoFiltrosListState())
  }

  const toggleFiltroChip = (field: 'tipologia' | 'modalidade', value: string) => {
    setFiltrosUI((prev) => {
      const current = prev[field]
      const exists = current.includes(value)
      return {
        ...prev,
        [field]: exists ? current.filter((item) => item !== value) : [...current, value]
      }
    })
  }

  const updateListFilter = <K extends keyof ProdutoFiltrosListState>(
    key: K,
    value: ProdutoFiltrosListState[K]
  ) => {
    setFiltrosUI((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const updateNovoProdutoFiltro = <K extends keyof ProdutoFiltrosFormValues>(
    key: K,
    value: ProdutoFiltrosFormValues[K]
  ) => {
    setNovoProdutoFiltros((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleNovoFiltroTagAdd = (field: 'tipologia' | 'modalidade', value: string) => {
    const cleaned = value.trim()
    if (!cleaned) return
    setNovoProdutoFiltros((prev) => {
      if (prev[field].includes(cleaned)) return prev
      return {
        ...prev,
        [field]: [...prev[field], cleaned]
      }
    })
  }

  const handleNovoFiltroTagRemove = (field: 'tipologia' | 'modalidade', tag: string) => {
    setNovoProdutoFiltros((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== tag)
    }))
  }

  const criarProduto = async () => {
    const tenantId = tenant?.id
    const nome = novoProduto.nome.trim()

    if (!tenantId || !nome) {
      toast.error('Informe o nome do produto.')
      return
    }

    const descricao = novoProduto.descricao.trim()
    const precoNumber = parseOptionalNumber(novoProduto.preco) ?? 0
    const filtrosPayload = normalizeProdutoFiltros(novoProdutoFiltros)

    const commonFields = {
      tenant_id: tenantId,
      nome,
      descricao,
      preco: precoNumber,
      ativo: novoProduto.ativo,
      filtros: filtrosPayload,
      equipe_id: equipeId
    }

    const modernPayload = {
      ...commonFields,
      preco: precoNumber
    }

    try {
      const { error } = await supabase.from('produtos').insert(modernPayload)

      if (error) {
        if (error.message?.toLowerCase().includes('preco')) {
          const { error: legacyError } = await supabase.from('produtos').insert(commonFields)
          if (legacyError) {
            throw legacyError
          }
        } else {
          throw error
        }
      }

      toast.success('Produto criado com sucesso!')
      setNovoProduto({ nome: '', descricao: '', preco: '', ativo: true })
      setNovoProdutoFiltros(emptyProdutoFiltrosForm())
      setTipologiaDraft('')
      setModalidadeDraft('')
      setEquipeId(null)
      await refreshFiltroOptions()
      await loadProdutos()
    } catch (err) {
      console.error('Erro ao criar produto:', err)
      toast.error('N�o foi poss�vel criar o produto.')
    }
  }

  const toggleAtivo = async (produto: Produto) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ ativo: !produto.ativo })
        .eq('id', produto.id)

      if (error) {
        throw error
      }

      toast.success('Status do produto atualizado!')
      await loadProdutos({ silent: true })
    } catch (err) {
      console.error('Erro ao atualizar produto:', err)
      toast.error('N�o foi poss�vel atualizar o produto.')
    }
  }
  const renderProdutoCard = (produto: Produto) => {
    const filtros = produto.filtros ?? {}

    const precoInicial =
      filtros.preco_min ?? produto.preco_min_num ?? produto.preco ?? produto.preco
    const metragemMin = filtros.metragem_min ?? produto.metragem_min_num ?? undefined
    const metragemMax = filtros.metragem_max ?? produto.metragem_max_num ?? undefined
    const entregaLabel = filtros.entrega ?? produto.entrega_date ?? undefined

    return (
      <div
        key={produto.id}
        className={`p-5 rounded-2xl border backdrop-blur-sm transition hover:border-cyan-500/40 hover:shadow-lg ${
          produto.ativo
            ? 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10'
            : 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-600/30 saturate-75'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{produto.nome}</h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                  produto.ativo
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30'
                    : 'bg-slate-600/30 text-slate-700 dark:text-slate-300 border border-slate-500/40'
                }`}
              >
                {produto.ativo ? 'Ativo' : 'Inativo'}
              </span>
              {filtros.fase && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-200">
                  {filtros.fase}
                </span>
              )}
            </div>
            {produto.descricao && (
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{produto.descricao}</p>
            )}
          </div>

          <button
            onClick={() => toggleAtivo(produto)}
            className={`ml-auto px-3 py-1 rounded-lg text-xs font-medium border transition ${
              produto.ativo
                ? 'border-rose-500/50 text-rose-300 hover:bg-rose-500/10'
                : 'border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            {produto.ativo ? 'Desativar' : 'Ativar'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-900 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <span className="text-slate-700 dark:text-slate-300">
              A partir de{' '}
              <span className="font-semibold text-cyan-700 dark:text-cyan-300">{formatCurrency(precoInicial)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="text-slate-700 dark:text-slate-300">
              Metragem <span className="font-semibold text-indigo-700 dark:text-indigo-200">{formatMetragem(metragemMin ?? null, metragemMax ?? null)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span className="text-slate-700 dark:text-slate-300">
              Entrega{' '}
              <span className="font-semibold text-emerald-700 dark:text-emerald-200">{formatEntrega(entregaLabel)}</span>
            </span>
          </div>
          {(filtros.regiao || filtros.bairro) && (
            <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
              <MapPin className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-slate-700 dark:text-slate-300">
                {filtros.regiao && <span className="font-semibold text-amber-700 dark:text-amber-200">{filtros.regiao}</span>}
                {filtros.regiao && filtros.bairro && ' � '}
                {filtros.bairro && <span className="font-semibold text-amber-800 dark:text-amber-100">{filtros.bairro}</span>}
              </span>
            </div>
          )}
        </div>

        {(filtros.tipologia?.length || filtros.modalidade?.length) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filtros.tipologia?.map((item) => (
              <span
                key={`tipologia-${produto.id}-${item}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
              >
                <Tag className="w-3 h-3" />
                {item}
              </span>
            ))}
            {filtros.modalidade?.map((item) => (
              <span
                key={`modalidade-${produto.id}-${item}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200"
              >
                <Building2 className="w-3 h-3" />
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {filtros.financiamento_incorporadora !== undefined && (
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${
                filtros.financiamento_incorporadora
                  ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
                  : 'border-slate-500/40 text-slate-300 bg-slate-800/60'
              }`}
            >
              <Check className="w-3 h-3" />
              Financiamento incorporadora {filtros.financiamento_incorporadora ? 'dispon�vel' : 'n�o'}
            </span>
          )}
          {filtros.decorado !== undefined && (
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${
                filtros.decorado
                  ? 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10'
                  : 'border-slate-500/40 text-slate-300 bg-slate-800/60'
              }`}
            >
              <Check className="w-3 h-3" />
              Decorado {filtros.decorado ? 'pronto' : 'indispon�vel'}
            </span>
          )}
        </div>
      </div>
    )
  }

  const EmptyState = (
    <div className="py-12 text-center text-slate-400">
      <p className="text-lg font-semibold">Nenhum produto encontrado</p>
      <p className="mt-2 text-sm text-slate-500">
        Ajuste os filtros ou cadastre um novo produto para iniciar a vitrine.
      </p>
    </div>
  )
  return (
    <div className="min-h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <div className="w-full sm:max-w-6xl sm:mx-auto px-4 py-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gest�o de Produtos</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Configure facetas avan�adas para navega��o inteligente do seu cat�logo.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition ${
                viewMode === 'list' ? 'ring-2 ring-emerald-500/50' : ''
              }`}
              aria-label="Ver em lista"
            >
              <List className="w-5 h-5 text-slate-600 dark:text-gray-200" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition ${
                viewMode === 'grid' ? 'ring-2 ring-cyan-500/50' : ''
              }`}
              aria-label="Ver em grade"
            >
              <Grid3X3 className="w-5 h-5 text-slate-600 dark:text-gray-200" />
            </button>
          </div>
        </header>

        <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-3xl shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-200">
                <Filter className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filtros facetados</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Combine facetas para encontrar rapidamente o empreendimento ideal.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={ordenacao}
                onChange={(event) => setOrdenacao(event.target.value as OrderOption)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 [&>option]:bg-white dark:[&>option]:bg-slate-800 [&>option]:text-slate-900 dark:[&>option]:text-white"
              >
                <option value="preco_asc">Menor pre�o primeiro</option>
                <option value="preco_desc">Maior pre�o primeiro</option>
                <option value="entrega_asc">Entrega mais pr�xima</option>
                <option value="entrega_desc">Entrega mais distante</option>
                <option value="recentes">Mais recentes</option>
              </select>
              <button
                onClick={handleResetFiltros}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition"
              >
                <RefreshCcw className="w-4 h-4" />
                Resetar
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Incorporadora
                </label>
                <select
                  value={filtrosUI.incorporadora}
                  onChange={(event) => updateListFilter('incorporadora', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 [&>option]:bg-white dark:[&>option]:bg-slate-800 [&>option]:text-slate-900 dark:[&>option]:text-white"
                >
                  <option value="">Todas</option>
                  {filtroOptions.incorporadoras.map((value) => (
                    <option key={`f-inc-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Empreendimento
                </label>
                <select
                  value={filtrosUI.empreendimento}
                  onChange={(event) => updateListFilter('empreendimento', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 [&>option]:bg-white dark:[&>option]:bg-slate-800 [&>option]:text-slate-900 dark:[&>option]:text-white"
                >
                  <option value="">Todos</option>
                  {filtroOptions.empreendimentos.map((value) => (
                    <option key={`f-emp-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Fase
                </label>
                <select
                  value={filtrosUI.fase}
                  onChange={(event) => updateListFilter('fase', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 [&>option]:bg-white dark:[&>option]:bg-slate-800 [&>option]:text-slate-900 dark:[&>option]:text-white"
                >
                  <option value="">Todas</option>
                  {['LAN�AMENTO', 'EM OBRAS', 'PRONTO', ...filtroOptions.fases.filter((fase) =>
                    !['LAN�AMENTO', 'EM OBRAS', 'PRONTO'].includes(fase)
                  )].map((value) => (
                    <option key={`f-fase-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Regi�o
                </label>
                <select
                  value={filtrosUI.regiao}
                  onChange={(event) => updateListFilter('regiao', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 [&>option]:bg-white dark:[&>option]:bg-slate-800 [&>option]:text-slate-900 dark:[&>option]:text-white"
                >
                  <option value="">Todas</option>
                  {filtroOptions.regioes.map((value) => (
                    <option key={`f-reg-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Bairro
                </label>
                <select
                  value={filtrosUI.bairro}
                  onChange={(event) => updateListFilter('bairro', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="">Todos</option>
                  {filtroOptions.bairros.map((value) => (
                    <option key={`f-bairro-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Vagas
                </label>
                <input
                  type="number"
                  min="0"
                  value={filtrosUI.vaga}
                  onChange={(event) => updateListFilter('vaga', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Qualquer"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tipologia
                </label>
                <div className="flex flex-wrap gap-2">
                  {filtroOptions.tipologias.length === 0 && (
                    <span className="text-xs text-slate-500">Nenhuma tipologia cadastrada ainda.</span>
                  )}
                  {filtroOptions.tipologias.map((value) => {
                    const active = filtrosUI.tipologia.includes(value)
                    return (
                      <button
                        key={`chip-tipologia-${value}`}
                        type="button"
                        onClick={() => toggleFiltroChip('tipologia', value)}
                        className={`px-3 py-1.5 rounded-xl border text-xs transition ${
                          active
                            ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-700 dark:text-cyan-100'
                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                        }`}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Modalidade
                </label>
                <div className="flex flex-wrap gap-2">
                  {filtroOptions.modalidades.length === 0 && (
                    <span className="text-xs text-slate-500">
                      Nenhuma modalidade cadastrada ainda.
                    </span>
                  )}
                  {filtroOptions.modalidades.map((value) => {
                    const active = filtrosUI.modalidade.includes(value)
                    return (
                      <button
                        key={`chip-modalidade-${value}`}
                        type="button"
                        onClick={() => toggleFiltroChip('modalidade', value)}
                        className={`px-3 py-1.5 rounded-xl border text-xs transition ${
                          active
                            ? 'border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-100'
                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                        }`}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Pre�o m�nimo</label>
                <input
                  type="number"
                  min="0"
                  value={filtrosUI.preco_min}
                  onChange={(event) => updateListFilter('preco_min', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                  placeholder="A partir de..."
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Pre�o m�ximo</label>
                <input
                  type="number"
                  min="0"
                  value={filtrosUI.preco_max}
                  onChange={(event) => updateListFilter('preco_max', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                  placeholder="At�..."
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Metragem m�nima</label>
                <input
                  type="number"
                  min="0"
                  value={filtrosUI.metragem_min}
                  onChange={(event) => updateListFilter('metragem_min', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                  placeholder="Min m�"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Metragem m�xima</label>
                <input
                  type="number"
                  min="0"
                  value={filtrosUI.metragem_max}
                  onChange={(event) => updateListFilter('metragem_max', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 placeholder:text-slate-500 dark:placeholder:text-slate-500"
                  placeholder="M�x m�"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Entrega a partir de</label>
                <input
                  type="date"
                  value={filtrosUI.entrega_de}
                  onChange={(event) => updateListFilter('entrega_de', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Entrega at�</label>
                <input
                  type="date"
                  value={filtrosUI.entrega_ate}
                  onChange={(event) => updateListFilter('entrega_ate', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Financiamento com incorporadora</label>
                <select
                  value={filtrosUI.financiamento_incorporadora}
                  onChange={(event) =>
                    updateListFilter('financiamento_incorporadora', event.target.value as ProdutoFiltrosListState['financiamento_incorporadora'])
                  }
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="any">Qualquer</option>
                  <option value="true">Dispon�vel</option>
                  <option value="false">Indispon�vel</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Decorado</label>
                <select
                  value={filtrosUI.decorado}
                  onChange={(event) =>
                    updateListFilter('decorado', event.target.value as ProdutoFiltrosListState['decorado'])
                  }
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="any">Qualquer</option>
                  <option value="true">Dispon�vel</option>
                  <option value="false">Indispon�vel</option>
                </select>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 shadow-lg shadow-emerald-500/10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Criar novo produto</h2>
              <p className="text-sm text-slate-400">
                Cadastre os metadados para que os filtros funcionem imediatamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Nome *</label>
              <input
                type="text"
                value={novoProduto.nome}
                onChange={(event) => setNovoProduto((prev) => ({ ...prev, nome: event.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                placeholder="Nome do produto"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Pre�o base (R$)</label>
              <input
                type="number"
                min="0"
                value={novoProduto.preco}
                onChange={(event) => setNovoProduto((prev) => ({ ...prev, preco: event.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Descri��o</label>
            <textarea
              value={novoProduto.descricao}
              onChange={(event) => setNovoProduto((prev) => ({ ...prev, descricao: event.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 min-h-[100px]"
              placeholder="Descri��o detalhada do produto ou empreendimento"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="novo-produto-ativo"
              type="checkbox"
              checked={novoProduto.ativo}
              onChange={(event) => setNovoProduto((prev) => ({ ...prev, ativo: event.target.checked }))}
              className="w-4 h-4 rounded border border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/40"
            />
            <label htmlFor="novo-produto-ativo" className="text-sm text-slate-300">
              Produto ativo após criação
            </label>
          </div>

          <div>
            <label className="text-xs text-gray-400">Compartilhar com Equipe</label>
            <select
              value={equipeId || ''}
              onChange={(e) => {
                const newEquipeId = e.target.value || null
                setEquipeId(newEquipeId)
              }}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            >
              <option value="" className="bg-slate-800">Sem equipe</option>
              {equipes.map(equipe => (
                <option key={equipe.id} value={equipe.id} className="bg-slate-800">
                  {equipe.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="border border-white/10 rounded-2xl p-5 bg-slate-950/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Facetas do empreendimento</h3>
              <span className="text-xs text-slate-500">Opcional, mas recomendado</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Incorporadora</label>
                <input
                  type="text"
                  list="incorporadora-options"
                  value={novoProdutoFiltros.incorporadora}
                  onChange={(event) => updateNovoProdutoFiltro('incorporadora', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Nome da incorporadora"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Empreendimento</label>
                <input
                  type="text"
                  list="empreendimento-options"
                  value={novoProdutoFiltros.empreendimento}
                  onChange={(event) => updateNovoProdutoFiltro('empreendimento', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Nome interno ou comercial"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Fase</label>
                <select
                  value={novoProdutoFiltros.fase}
                  onChange={(event) => updateNovoProdutoFiltro('fase', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="">Selecione...</option>
                  <option value="LAN�AMENTO">LAN�AMENTO</option>
                  <option value="EM OBRAS">EM OBRAS</option>
                  <option value="PRONTO">PRONTO</option>
                  {filtroOptions.fases
                    .filter(
                      (fase) => !['LAN�AMENTO', 'EM OBRAS', 'PRONTO'].includes(fase)
                    )
                    .map((fase) => (
                      <option key={`fase-form-${fase}`} value={fase}>
                        {fase}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Entrega prevista</label>
                <input
                  type="date"
                  value={novoProdutoFiltros.entrega}
                  onChange={(event) => updateNovoProdutoFiltro('entrega', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Regi�o</label>
                <input
                  type="text"
                  list="regiao-options"
                  value={novoProdutoFiltros.regiao}
                  onChange={(event) => updateNovoProdutoFiltro('regiao', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Bairro</label>
                <input
                  type="text"
                  list="bairro-options"
                  value={novoProdutoFiltros.bairro}
                  onChange={(event) => updateNovoProdutoFiltro('bairro', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Endere�o</label>
                <input
                  type="text"
                  value={novoProdutoFiltros.endereco}
                  onChange={(event) => updateNovoProdutoFiltro('endereco', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Rua / N�mero / Complemento"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Pre�o a partir de</label>
                  <input
                    type="number"
                    min="0"
                    value={novoProdutoFiltros.preco_min}
                    onChange={(event) => updateNovoProdutoFiltro('preco_min', event.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Vagas</label>
                  <input
                    type="number"
                    min="0"
                    value={novoProdutoFiltros.vaga}
                    onChange={(event) => updateNovoProdutoFiltro('vaga', event.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Metragem m�nima</label>
                <input
                  type="number"
                  min="0"
                  value={novoProdutoFiltros.metragem_min}
                  onChange={(event) => updateNovoProdutoFiltro('metragem_min', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Metragem m�xima</label>
                <input
                  type="number"
                  min="0"
                  value={novoProdutoFiltros.metragem_max}
                  onChange={(event) => updateNovoProdutoFiltro('metragem_max', event.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
              <div className="flex items-center gap-3 mt-2 md:mt-8">
                <input
                  id="financiamento-incorporadora"
                  type="checkbox"
                  checked={novoProdutoFiltros.financiamento_incorporadora}
                  onChange={(event) =>
                    updateNovoProdutoFiltro('financiamento_incorporadora', event.target.checked)
                  }
                  className="w-4 h-4 rounded border border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/40"
                />
                <label htmlFor="financiamento-incorporadora" className="text-sm text-slate-200">
                  Financiamento direto com a incorporadora
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Tipologia</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {novoProdutoFiltros.tipologia.map((item) => (
                    <span
                      key={`form-tip-${item}`}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs bg-cyan-500/20 border border-cyan-500/40 text-cyan-100"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleNovoFiltroTagRemove('tipologia', item)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500/40 hover:bg-cyan-500/60"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tipologiaDraft}
                  onChange={(event) => setTipologiaDraft(event.target.value)}
                  onBlur={() => {
                    if (tipologiaDraft.trim()) {
                      handleNovoFiltroTagAdd('tipologia', tipologiaDraft)
                      setTipologiaDraft('')
                    }
                  }}
                  onKeyDown={(event) => {
                    if (['Enter', 'Tab', ','].includes(event.key)) {
                      event.preventDefault()
                      handleNovoFiltroTagAdd('tipologia', tipologiaDraft)
                      setTipologiaDraft('')
                    } else if (
                      event.key === 'Backspace' &&
                      !tipologiaDraft &&
                      novoProdutoFiltros.tipologia.length
                    ) {
                      handleNovoFiltroTagRemove(
                        'tipologia',
                        novoProdutoFiltros.tipologia[novoProdutoFiltros.tipologia.length - 1]
                      )
                    }
                  }}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Ex.: STUDIO"
                />
                {filtroOptions.tipologias.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filtroOptions.tipologias.map((value) => (
                      <button
                        key={`suggest-tip-${value}`}
                        type="button"
                        onClick={() => handleNovoFiltroTagAdd('tipologia', value)}
                        className="px-3 py-1.5 rounded-full border border-cyan-400/40 text-xs text-cyan-200 hover:bg-cyan-500/20 transition"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Modalidade</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {novoProdutoFiltros.modalidade.map((item) => (
                    <span
                      key={`form-mod-${item}`}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-100"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleNovoFiltroTagRemove('modalidade', item)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-500/40 hover:bg-fuchsia-500/60"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={modalidadeDraft}
                  onChange={(event) => setModalidadeDraft(event.target.value)}
                  onBlur={() => {
                    if (modalidadeDraft.trim()) {
                      handleNovoFiltroTagAdd('modalidade', modalidadeDraft)
                      setModalidadeDraft('')
                    }
                  }}
                  onKeyDown={(event) => {
                    if (['Enter', 'Tab', ','].includes(event.key)) {
                      event.preventDefault()
                      handleNovoFiltroTagAdd('modalidade', modalidadeDraft)
                      setModalidadeDraft('')
                    } else if (
                      event.key === 'Backspace' &&
                      !modalidadeDraft &&
                      novoProdutoFiltros.modalidade.length
                    ) {
                      handleNovoFiltroTagRemove(
                        'modalidade',
                        novoProdutoFiltros.modalidade[novoProdutoFiltros.modalidade.length - 1]
                      )
                    }
                  }}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                  placeholder="Ex.: Residencial, Comercial..."
                />
                {filtroOptions.modalidades.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filtroOptions.modalidades.map((value) => (
                      <button
                        key={`suggest-mod-${value}`}
                        type="button"
                        onClick={() => handleNovoFiltroTagAdd('modalidade', value)}
                        className="px-3 py-1.5 rounded-full border border-fuchsia-400/40 text-xs text-fuchsia-200 hover:bg-fuchsia-500/20 transition"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="decorado"
                type="checkbox"
                checked={novoProdutoFiltros.decorado}
                onChange={(event) => updateNovoProdutoFiltro('decorado', event.target.checked)}
                className="w-4 h-4 rounded border border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/40"
              />
              <label htmlFor="decorado" className="text-sm text-slate-200">
                Decorado dispon�vel
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={criarProduto}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold transition shadow-lg shadow-cyan-500/20"
            >
              Criar produto
            </button>
          </div>
        </section>
        <section className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 shadow-lg shadow-cyan-500/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Produtos cadastrados{' '}
              <span className="text-sm text-slate-400">({produtos.length} resultados)</span>
            </h2>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {loading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`produto-grid-skeleton-${index}`}
                    className="h-48 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
                  />
                ))}
              {!loading && produtos.length === 0 && <div className="sm:col-span-2 xl:col-span-3">{EmptyState}</div>}
              {!loading && produtos.map((produto) => renderProdutoCard(produto))}
            </div>
          ) : (
            <div className="space-y-4">
              {loading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`produto-list-skeleton-${index}`}
                    className="h-24 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
                  />
                ))}
              {!loading && produtos.length === 0 && EmptyState}
              {!loading && produtos.map((produto) => renderProdutoCard(produto))}
            </div>
          )}
        </section>
      </div>

      <datalist id="incorporadora-options">
        {filtroOptions.incorporadoras.map((value) => (
          <option key={`dl-inc-${value}`} value={value} />
        ))}
      </datalist>
      <datalist id="empreendimento-options">
        {filtroOptions.empreendimentos.map((value) => (
          <option key={`dl-emp-${value}`} value={value} />
        ))}
      </datalist>
      <datalist id="regiao-options">
        {filtroOptions.regioes.map((value) => (
          <option key={`dl-reg-${value}`} value={value} />
        ))}
      </datalist>
      <datalist id="bairro-options">
        {filtroOptions.bairros.map((value) => (
          <option key={`dl-bairro-${value}`} value={value} />
        ))}
      </datalist>
    </div>
  )
}
