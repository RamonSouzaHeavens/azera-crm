import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Plus,
  Grid3X3,
  List,
  Image as ImageIcon,
  Edit,
  Edit3,
  Trash2,
  RefreshCw,
  Package,
  Filter,
  X,
  Check,
  Star,
  Search,
  ArrowUpDown,
  Tag,
  Box,
  FileText,
  CheckSquare,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'
import { formatCurrency, isValidCurrency } from '../lib/currency'

// ============================
// Tipos
// ============================
export type ProdutoStatus = 'disponivel' | 'reservado' | 'vendido' | 'inativo'

export interface ProdutoFilters {
  status?: ProdutoStatus | 'todos'
  categoria?: string | 'todos'
  valorMin?: number
  valorMax?: number
  destaque?: boolean | null
}

export interface ProdutoRow {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  valor: number | null
  currency: string | null
  categoria: string | null
  codigo_referencia: string | null
  status: string | null
  ativo: boolean
  destaque: boolean | null
  capa_url: string | null
  filtros: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

interface CustomFieldValue {
  id: string
  field_name: string
  value: string | number | boolean | null
}

// ============================
// Helpers
// ============================
function currencyFormat(value: number | null | undefined, currency?: string): string {
  if (!value && value !== 0) return '—'
  const validCurrency = currency && isValidCurrency(currency) ? currency : 'BRL'
  return formatCurrency(value, validCurrency)
}

function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const statusStyle: Record<string, string> = {
  disponivel: 'bg-emerald-100 text-emerald-800 border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/20',
  reservado: 'bg-cyan-100 text-cyan-800 border-cyan-400/50 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-400/20',
  vendido: 'bg-slate-200 text-slate-800 border-slate-400/50 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-400/20',
  inativo: 'bg-rose-100 text-rose-800 border-rose-400/50 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/20',
}

const statusLabels: Record<string, string> = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  vendido: 'Vendido',
  inativo: 'Inativo',
}

// ============================
// Componente Principal
// ============================
export default function Produtos() {
  const { t } = useTranslation()
  const { tenant, member } = useAuthStore()
  const { canAddProduct, maxProducts } = useSubscriptionLimits()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])
  const navigate = useNavigate()

  // States
  const [tab, setTab] = useState<'ativos' | 'inativos'>('ativos')
  const [loading, setLoading] = useState<boolean>(true)
  const [list, setList] = useState<ProdutoRow[]>([])
  const [customFieldsMap, setCustomFieldsMap] = useState<Record<string, CustomFieldValue[]>>({})
  const [refreshKey, setRefreshKey] = useState<number>(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isMobile, setIsMobile] = useState(false)
  const [filters, setFilters] = useState<ProdutoFilters>({ status: 'todos', categoria: 'todos' })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'nome-asc' | 'nome-desc' | 'preco-asc' | 'preco-desc' | 'data-asc' | 'data-desc'>('data-desc')
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Get unique categories
  const categorias = useMemo(() => {
    const cats = new Set<string>()
    list.forEach(p => {
      if (p.categoria) cats.add(p.categoria)
    })
    return Array.from(cats).sort()
  }, [list])

  // Handlers
  const handleEdit = useCallback((item: ProdutoRow) => {
    navigate(`/app/produtos/editar/${item.id}`)
  }, [navigate])

  const handleDelete = useCallback(async (item: ProdutoRow) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span>Deseja excluir "{item.nome}"?</span>
        <div className="flex gap-2">
          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            onClick={async () => {
              toast.dismiss(t.id)
              try {
                const { error } = await supabase
                  .from('produtos')
                  .delete()
                  .eq('id', item.id)
                if (error) throw error
                setRefreshKey(k => k + 1)
                toast.success('Produto excluído com sucesso!')
              } catch (e) {
                console.error('Erro ao excluir:', e)
                toast.error('Erro ao excluir produto')
              }
            }}
          >
            Excluir
          </button>
          <button
            className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }, [])

  // Fetch products
  const fetchProdutos = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id, tenant_id, nome, descricao, valor, currency, categoria,
          codigo_referencia, status, ativo, destaque, capa_url, filtros,
          created_at, updated_at
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setList((data as ProdutoRow[]) || [])

      // Fetch custom field values for all products
      if (data && data.length > 0) {
        const productIds = data.map(p => p.id)
        const { data: valuesData } = await supabase
          .from('product_custom_field_values')
          .select(`
            produto_id,
            custom_field_id,
            value_text,
            value_number,
            value_boolean,
            product_custom_fields!inner(field_name)
          `)
          .in('produto_id', productIds)

        if (valuesData) {
          const fieldsMap: Record<string, CustomFieldValue[]> = {}
          valuesData.forEach((item: any) => {
            if (!fieldsMap[item.produto_id]) {
              fieldsMap[item.produto_id] = []
            }
            let value = null
            if (item.value_text !== null) value = item.value_text
            else if (item.value_number !== null) value = item.value_number
            else if (item.value_boolean !== null) value = item.value_boolean

            if (value !== null) {
              fieldsMap[item.produto_id].push({
                id: item.custom_field_id,
                field_name: item.product_custom_fields?.field_name || 'Campo',
                value
              })
            }
          })
          setCustomFieldsMap(fieldsMap)
        }
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchProdutos()
  }, [fetchProdutos, refreshKey])

  // Mobile check
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && viewMode === 'list') {
        setViewMode('grid')
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [viewMode])

  // Bulk delete
  const confirmBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return
    setShowDeleteConfirm(true)
  }, [selectedIds])

  const handleBulkDelete = useCallback(async () => {
    setShowDeleteConfirm(false)
    const idsArray = Array.from(selectedIds)
    const loadingToast = toast.loading(`Excluindo ${idsArray.length} produtos...`)

    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .in('id', idsArray)

      toast.dismiss(loadingToast)

      if (error) throw error

      toast.success(`${idsArray.length} produto(s) excluído(s) com sucesso!`)
      setSelectedIds(new Set())
      setSelectMode(false)
      setRefreshKey(k => k + 1)
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Erro na exclusão em lote:', error)
      toast.error('Erro ao excluir produtos')
    }
  }, [selectedIds])

  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev)
    setSelectedIds(new Set())
  }, [])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Filtering and sorting
  const filteredByStatus = useMemo(() => {
    let filtered = list

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(item =>
        item.nome?.toLowerCase().includes(query) ||
        item.descricao?.toLowerCase().includes(query) ||
        item.categoria?.toLowerCase().includes(query) ||
        item.codigo_referencia?.toLowerCase().includes(query)
      )
    }

    // Filters
    if (filters.status && filters.status !== 'todos') {
      filtered = filtered.filter(item => item.status === filters.status)
    }

    if (filters.categoria && filters.categoria !== 'todos') {
      filtered = filtered.filter(item => item.categoria === filters.categoria)
    }

    if (filters.valorMin !== undefined) {
      filtered = filtered.filter(item => (item.valor || 0) >= (filters.valorMin || 0))
    }

    if (filters.valorMax !== undefined) {
      filtered = filtered.filter(item => (item.valor || 0) <= (filters.valorMax || Infinity))
    }

    if (filters.destaque !== null && filters.destaque !== undefined) {
      filtered = filtered.filter(item => item.destaque === filters.destaque)
    }

    return filtered
  }, [list, filters, searchQuery])

  const ativos = useMemo(
    () => filteredByStatus.filter(i => i.ativo !== false),
    [filteredByStatus]
  )
  const inativos = useMemo(
    () => filteredByStatus.filter(i => i.ativo === false),
    [filteredByStatus]
  )

  const filteredList = useMemo(() => {
    const currentList = tab === 'ativos' ? ativos : inativos

    return [...currentList].sort((a, b) => {
      switch (sortBy) {
        case 'nome-asc':
          return (a.nome || '').localeCompare(b.nome || '')
        case 'nome-desc':
          return (b.nome || '').localeCompare(a.nome || '')
        case 'preco-asc':
          return (a.valor || 0) - (b.valor || 0)
        case 'preco-desc':
          return (b.valor || 0) - (a.valor || 0)
        case 'data-asc':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        case 'data-desc':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        default:
          return 0
      }
    })
  }, [tab, ativos, inativos, sortBy])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredList.map(item => item.id)))
  }, [filteredList])

  const handleNewProduct = () => {
    if (!canAddProduct(list.length)) {
      toast.error(`Limite de ${maxProducts} produtos atingido. Faça upgrade!`)
      return
    }
    navigate('/app/produtos/novo')
  }

  // ============================
  // Card Component (Estilo Imóvel / Produto)
  // ============================
  function Card({ item }: { item: ProdutoRow }) {
    const isSelected = selectedIds.has(item.id)
    const customFields = customFieldsMap[item.id] || []
    const displayFields = customFields.slice(0, 4)
    const status = (item.status || 'disponivel') as keyof typeof statusStyle

    const formatValue = (val: string | number | boolean | null) => {
      if (val === null || val === undefined || val === '') return '—'
      if (typeof val === 'boolean') return val ? 'Sim' : 'Não'
      return val
    }

    return (
      <div
        className={`
          group relative flex flex-col w-full
          rounded-2xl bg-white dark:bg-white/5
          border transition-all duration-300 shadow-sm hover:shadow-xl overflow-hidden cursor-pointer
          ${isSelected
            ? 'border-cyan-500 ring-2 ring-cyan-500/30'
            : 'border-slate-200 dark:border-white/10 hover:border-cyan-400/50'
          }
        `}
        onClick={() => navigate(`/app/produtos/${item.id}`)}
      >
        {/* Badge de Seleção */}
        {selectMode && (
          <div className="absolute top-3 left-3 z-30" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(item.id)}
              className="w-5 h-5 rounded-lg border-2 border-white/80 shadow-sm bg-slate-200 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer transition-all"
            />
          </div>
        )}

        {/* Imagem de Capa */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900 border-b border-slate-100 dark:border-white/5">
          {/* Status Badge */}
          <div className="absolute top-3 right-3 z-20">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border shadow-lg backdrop-blur-md uppercase tracking-wider ${statusStyle[status]}`}>
              {statusLabels[status] || 'DISPONÍVEL'}
            </span>
          </div>

          {isValidUrl(item.capa_url) ? (
            <img
              src={item.capa_url as string}
              alt={item.nome}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/50">
              <ImageIcon className="w-10 h-10 opacity-20 mb-2" />
              <span className="text-[10px] font-medium opacity-60 uppercase tracking-widest">Sem imagem</span>
            </div>
          )}

          {/* Destaque Badge */}
          {item.destaque && (
            <div className="absolute bottom-3 left-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-white/95 dark:bg-slate-900/95 border border-amber-500/30 px-2 py-1 rounded-lg shadow-lg">
                <Star className="w-3 h-3 fill-current" /> DESTAQUE
              </span>
            </div>
          )}
        </div>

        {/* Conteúdo Info */}
        <div className="flex-1 flex flex-col p-4 sm:p-5">
          {/* Categoria + Ações */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${item.categoria ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'}`}>
              {item.categoria || 'Sem Categoria'}
            </span>
            <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); handleEdit(item) }} className="p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(item) }} className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Título + Descrição */}
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-1" title={item.nome}>
              {item.nome || 'Produto sem nome'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2 min-h-[2.5em] leading-relaxed">
              {item.descricao || 'Nenhuma descrição informada.'}
            </p>
          </div>

          {/* Grid de Atributos */}
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/5 mb-4">
            <div className="grid grid-cols-2 gap-3">
              {displayFields.length > 0 ? displayFields.map((field, idx) => (
                <div key={field.id || idx} className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight truncate">
                    {field.field_name}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {formatValue(field.value)}
                  </span>
                </div>
              )) : (
                <div className="col-span-full flex items-center justify-center py-1 text-[10px] text-slate-400 italic gap-2">
                  <Box className="w-3.5 h-3.5 opacity-50" /> Característica Padrão
                </div>
              )}
            </div>
          </div>

          {/* Rodapé: Valor e Referência */}
          <div className="mt-auto flex items-end justify-between border-t border-slate-100 dark:border-white/5 pt-4">
            <div>
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Valor Sugerido</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {item.valor ? currencyFormat(item.valor, item.currency || 'BRL') : <span className="text-xs text-slate-400 font-normal">Sob Consulta</span>}
              </div>
            </div>
            {item.codigo_referencia && (
              <div className="text-right">
                <div className="text-[9px] font-bold text-slate-400/80 uppercase">Ref.</div>
                <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                  {item.codigo_referencia}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================
  // Row Component
  // ============================
  function Row({ item }: { item: ProdutoRow }) {
    const isSelected = selectedIds.has(item.id)
    const customFields = customFieldsMap[item.id] || []
    const displayFields = customFields.slice(0, 6)
    const status = item.status || 'disponivel'

    return (
      <div
        className={`group rounded-xl border transition-all shadow-sm hover:shadow-lg bg-white dark:bg-slate-900 overflow-hidden cursor-pointer ${isSelected
          ? 'border-cyan-400 ring-1 ring-cyan-400 bg-cyan-50/30 dark:bg-cyan-500/5'
          : 'border-slate-200/60 dark:border-slate-800 hover:border-cyan-400/30'
          }`}
        onClick={() => navigate(`/app/produtos/${item.id}`)}
      >
        <div className="flex items-stretch h-full">
          {/* Checkbox */}
          {selectMode && (
            <div className="flex items-center justify-center px-3 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                className="w-5 h-5 rounded border-2 border-slate-300 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer"
              />
            </div>
          )}

          {/* Image */}
          <div className="w-40 md:w-48 relative flex-shrink-0 bg-slate-100 dark:bg-slate-800 hidden sm:block">
            {isValidUrl(item.capa_url) ? (
              <img src={item.capa_url as string} alt={item.nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <ImageIcon className="w-8 h-8 opacity-40" />
              </div>
            )}
            <div className="absolute top-2 left-2">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded shadow-sm border ${statusStyle[status]}`}>
                {statusLabels[status]?.toUpperCase() || 'DISPONÍVEL'}
              </span>
            </div>
            {item.destaque && (
              <div className="absolute top-2 right-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
            )}
          </div>

          {/* Main Info */}
          <div className="flex-1 p-4 flex flex-col justify-center min-w-0 border-r border-slate-100 dark:border-slate-800">
            {item.categoria && (
              <div className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {item.categoria}
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate mb-1" title={item.nome}>
              {item.nome}
            </h3>
            <div className="text-emerald-600 dark:text-emerald-400 font-bold text-xl mb-2">
              {currencyFormat(item.valor, item.currency || 'BRL')}
            </div>
            {item.codigo_referencia && (
              <div className="flex flex-wrap gap-1.5 mt-auto">
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded border border-slate-200 dark:border-slate-700">
                  REF: {item.codigo_referencia}
                </span>
              </div>
            )}
          </div>

          {/* Custom Fields Grid */}
          <div className="flex-[1.5] p-4 bg-slate-50/80 dark:bg-slate-800/20 text-sm hidden lg:block">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">
              {displayFields.map((field, idx) => (
                <div key={field.id || idx}>
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">{field.field_name}</div>
                  <div className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {typeof field.value === 'boolean' ? (field.value ? 'Sim' : 'Não') : field.value || '—'}
                  </div>
                </div>
              ))}
              {displayFields.length === 0 && (
                <div className="col-span-full text-slate-400 text-xs italic">Sem campos personalizados</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            className="w-12 border-l border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group/actions"
            onClick={(e) => { e.stopPropagation(); handleEdit(item) }}
            title="Editar"
          >
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover/actions:bg-cyan-50 group-hover/actions:text-cyan-600 dark:group-hover/actions:bg-cyan-500/10 dark:group-hover/actions:text-cyan-400 transition-colors">
              <Edit3 className="w-4 h-4" />
            </div>
            <div
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
              onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================
  // Empty State
  // ============================
  const EmptyState = (
    <div className="text-center py-24">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center shadow-xl shadow-cyan-500/10">
        <Package className="w-10 h-10 text-cyan-500 dark:text-cyan-400" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
        {tab === 'ativos' ? 'Nenhum produto ativo encontrado' : 'Nenhum produto inativo encontrado'}
      </h3>
      <p className="text-slate-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        {tab === 'ativos'
          ? 'Comece cadastrando o primeiro produto para ver aqui.'
          : 'Ative ou cadastre novos produtos.'}
      </p>
      {tab === 'ativos' && (
        <button
          onClick={handleNewProduct}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          Adicionar Primeiro Produto
        </button>
      )}
    </div>
  )

  // ============================
  // Render
  // ============================
  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#030712] text-slate-900 dark:text-slate-200 flex flex-col relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.15),_transparent_55%)]" />
      </div>

      {/* Header Fixo e Moderno */}
      <div className="sticky top-0 z-40 px-4 sm:px-8 py-4 sm:py-6 bg-white/70 dark:bg-[#030712]/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Linha 1: Título e Ação Principal */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full rounded-[14px] bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
                  <Package className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-outfit uppercase leading-none">
                  {t('sidebar.products', 'Produtos')}
                </h1>
                <p className="hidden sm:block text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] opacity-70 mt-1">
                  Gestão de Catálogo Inteligente
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNewProduct}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline tracking-tight">NOVO PRODUTO</span>
              </button>
            </div>
          </div>

          {/* Linha 2: Busca e Filtros Rápidos */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
              <input
                type="text"
                placeholder="Pesquisar por nome, categoria ou ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/40 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Ações Especiais */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
              {/* Abas Ativos/Inativos */}
              <div className="flex items-center p-1 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <button
                  onClick={() => setTab('ativos')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'ativos' ? 'bg-white dark:bg-white/10 text-cyan-500 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  ATIVOS ({ativos.length})
                </button>
                <button
                  onClick={() => setTab('inativos')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'inativos' ? 'bg-white dark:bg-white/10 text-rose-500 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  INATIVOS ({inativos.length})
                </button>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <button onClick={() => setFiltersOpen(true)} className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-cyan-500 hover:border-cyan-500/40 transition-all shadow-sm">
                  <Filter className="w-5 h-5" />
                </button>
                <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-cyan-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <List className="w-5 h-5" />
                  </button>
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-cyan-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedIds(new Set()) }}
                  className={`p-2.5 rounded-xl border transition-all shadow-sm ${selectMode ? 'border-rose-500/40 bg-rose-500/10 text-rose-500' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-rose-500'}`}
                >
                  <CheckSquare className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {(viewMode === 'grid' || isMobile) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="w-full aspect-[3/4] rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 animate-pulse" />
            ))}
            {!loading && filteredList.length === 0 && (
              <div className="col-span-full">{EmptyState}</div>
            )}
            {!loading && filteredList.map((item) => (
              <Card key={item.id} item={item} />
            ))}
          </div>
        )}

        {viewMode === 'list' && !isMobile && (
          <div className="space-y-4">
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={`skeleton-list-${i}`} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
            ))}
            {!loading && filteredList.length === 0 && EmptyState}
            {!loading && filteredList.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Filters Modal */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                  <Filter className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">Filtros</span>
              </div>
              <button onClick={() => setFiltersOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition">
                <X className="w-5 h-5 text-slate-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as ProdutoFilters['status'] }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="todos">Todos</option>
                  <option value="disponivel">Disponível</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">Categoria</label>
                <select
                  value={filters.categoria || 'todos'}
                  onChange={(e) => setFilters(prev => ({ ...prev, categoria: e.target.value === 'todos' ? 'todos' : e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="todos">Todas</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">Valor Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.valorMin || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, valorMin: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="R$ 0"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">Valor Máximo</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.valorMax || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, valorMax: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="Sem limite"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">Destaque</label>
                <select
                  value={filters.destaque === null ? 'todos' : filters.destaque ? 'sim' : 'nao'}
                  onChange={(e) => setFilters(prev => ({ ...prev, destaque: e.target.value === 'todos' ? null : e.target.value === 'sim' }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="todos">Todos</option>
                  <option value="sim">Apenas Destaques</option>
                  <option value="nao">Sem Destaque</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3">
              <button
                onClick={() => setFilters({ status: 'todos', categoria: 'todos' })}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 font-medium transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Limpar
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
              >
                <Filter className="w-4 h-4" />
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-400/40 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-7 h-7 text-rose-500 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Confirmar Exclusão</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/20">
              <p className="text-sm text-rose-700 dark:text-rose-200">
                Você está prestes a excluir <span className="font-bold">{selectedIds.size}</span> {selectedIds.size === 1 ? 'produto' : 'produtos'}.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-5 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-rose-500/40"
              >
                Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
