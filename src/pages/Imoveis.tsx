import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Grid3X3,
  List,
  Search,
  Filter,
  Building2,
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  Car,
  DollarSign,
  Tag,
  Eye,
  Edit3,
  RefreshCcw,
  X,
  Calendar,
  ImageIcon,
  Star,
  ChevronDown,
  Upload,
  Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'
import { formatCurrency, type CurrencyCode, isValidCurrency } from '../lib/currency'
import type { ProdutoFiltros } from '../types/produtos'

// Types
export type ImovelTipo = 'apartamento' | 'casa' | 'sobrado' | 'cobertura' | 'terreno' | 'comercial' | 'industrial' | 'rural'
export type ImovelFinalidade = 'venda' | 'aluguel' | 'venda_aluguel'
export type ImovelStatus = 'disponivel' | 'reservado' | 'vendido' | 'alugado' | 'inativo'

interface ImovelRow {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  valor: number | null
  currency: string | null
  categoria: string | null
  capa_url: string | null
  galeria: string[] | null
  status: string | null
  destaque: boolean
  ativo: boolean
  filtros: ProdutoFiltros | null
  created_at: string
  updated_at: string
}

// Helpers
const currencyFormat = (value?: number | null, currency?: CurrencyCode | string): string => {
  if (!value && value !== 0) return '—'
  const validCurrency = currency && isValidCurrency(currency) ? currency : 'BRL'
  return formatCurrency(value, validCurrency)
}

const truncate = (s?: string | null, n = 80) => (s ? (s.length > n ? s.slice(0, n) + '…' : s) : '')

const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  disponivel: { label: 'Disponível', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
  reservado: { label: 'Reservado', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  vendido: { label: 'Vendido', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-500/20' },
  alugado: { label: 'Alugado', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-500/20' },
  inativo: { label: 'Inativo', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-500/20' },
}

const tipoLabels: Record<ImovelTipo, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  sobrado: 'Sobrado',
  cobertura: 'Cobertura',
  terreno: 'Terreno',
  comercial: 'Comercial',
  industrial: 'Industrial',
  rural: 'Rural',
}

export default function Imoveis() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant, member, loading: authLoading } = useAuthStore()
  const { isDark } = useThemeStore()
  const { canAddProduct, maxProducts } = useSubscriptionLimits()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])

  // States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [produtos, setProdutos] = useState<ImovelRow[]>([])
  const [currentProductCount, setCurrentProductCount] = useState(0)

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterDestaque, setFilterDestaque] = useState<boolean | null>(null)

  // Load products
  const loadProdutos = useCallback(async () => {
    if (!tenantId) {
      if (!authLoading) setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error, count } = await supabase
        .from('produtos')
        .select('id, tenant_id, nome, descricao, valor, currency, categoria, capa_url, galeria, status, destaque, ativo, filtros, created_at, updated_at', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProdutos((data as ImovelRow[]) || [])
      setCurrentProductCount(count || 0)
    } catch (err) {
      console.error('[ERROR] loadProdutos:', err)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }, [tenantId, authLoading])

  useEffect(() => {
    if (!authLoading && tenantId) {
      loadProdutos()
    }
  }, [tenantId, authLoading, loadProdutos])

  // Filter logic
  const filteredProdutos = useMemo(() => {
    return produtos.filter(p => {
      const search = searchTerm.toLowerCase().trim()
      const matchSearch = !search ||
        p.nome?.toLowerCase().includes(search) ||
        p.descricao?.toLowerCase().includes(search) ||
        p.filtros?.empreendimento?.toLowerCase().includes(search) ||
        p.filtros?.incorporadora?.toLowerCase().includes(search) ||
        p.filtros?.regiao?.toLowerCase().includes(search)

      const matchStatus = filterStatus === 'todos' || p.status === filterStatus
      const matchTipo = filterTipo === 'todos' || p.filtros?.tipo === filterTipo || p.categoria === filterTipo
      const matchDestaque = filterDestaque === null || p.destaque === filterDestaque

      return matchSearch && matchStatus && matchTipo && matchDestaque
    })
  }, [produtos, searchTerm, filterStatus, filterTipo, filterDestaque])

  // Stats
  const stats = useMemo(() => {
    const total = produtos.length
    const disponiveis = produtos.filter(p => p.status === 'disponivel').length
    const destaques = produtos.filter(p => p.destaque).length
    const valorTotal = produtos.reduce((acc, p) => acc + (p.valor || 0), 0)
    return { total, disponiveis, destaques, valorTotal }
  }, [produtos])

  const handleNewProduct = () => {
    if (!canAddProduct(currentProductCount)) {
      toast.error(`Limite de ${maxProducts} produtos atingido. Faça upgrade para adicionar mais!`)
      return
    }
    navigate('/app/produtos/novo')
  }

  // Product Card Component
  const ProductCard = ({ produto }: { produto: ImovelRow }) => {
    const statusInfo = statusLabels[produto.status || 'disponivel'] || statusLabels.disponivel
    const valor = produto.valor || produto.filtros?.preco_min || 0
    const currency = (produto.currency || 'BRL') as CurrencyCode

    return (
      <div className="group bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {isValidUrl(produto.capa_url) ? (
            <img
              src={produto.capa_url!}
              alt={produto.nome}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {produto.destaque && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-600 flex items-center gap-1">
                <Star className="w-3 h-3" /> Destaque
              </span>
            )}
          </div>

          {/* Price */}
          <div className="absolute bottom-3 right-3">
            <span className="px-3 py-1.5 rounded-xl text-sm font-bold bg-white/95 dark:bg-slate-900/95 text-emerald-600 dark:text-emerald-400 shadow-lg">
              {currencyFormat(valor, currency)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-1 line-clamp-1">
            {produto.nome}
          </h3>
          {produto.filtros?.empreendimento && (
            <p className="text-sm text-cyan-600 dark:text-cyan-400 mb-2">{produto.filtros.empreendimento}</p>
          )}
          {produto.descricao && (
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-3 line-clamp-2">{truncate(produto.descricao, 100)}</p>
          )}

          {/* Specs */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-gray-500 mb-4">
            {produto.filtros?.metragem_min && (
              <span className="flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5" />
                {produto.filtros.metragem_min}m²
              </span>
            )}
            {produto.filtros?.tipologia && produto.filtros.tipologia.length > 0 && (
              <span className="flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5" />
                {produto.filtros.tipologia.join(', ')}
              </span>
            )}
            {produto.filtros?.regiao && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {produto.filtros.regiao}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link
              to={`/app/produtos/${produto.id}`}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 text-sm font-medium text-center hover:bg-slate-200 dark:hover:bg-white/10 transition flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Ver
            </Link>
            <Link
              to={`/app/produtos/editar/${produto.id}`}
              className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium text-center transition flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Editar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Product Row Component
  const ProductRow = ({ produto }: { produto: ImovelRow }) => {
    const statusInfo = statusLabels[produto.status || 'disponivel'] || statusLabels.disponivel
    const valor = produto.valor || produto.filtros?.preco_min || 0
    const currency = (produto.currency || 'BRL') as CurrencyCode

    return (
      <div className="group bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/5 rounded-xl p-4 hover:border-cyan-500/30 transition-all flex items-center gap-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
          {isValidUrl(produto.capa_url) ? (
            <img src={produto.capa_url!} alt={produto.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{produto.nome}</h3>
            {produto.destaque && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-sm text-slate-500 dark:text-gray-400 truncate">
            {produto.filtros?.empreendimento || produto.filtros?.regiao || produto.descricao || '—'}
          </p>
        </div>

        {/* Status */}
        <span className={`hidden sm:block px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>

        {/* Price */}
        <div className="text-right hidden md:block">
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {currencyFormat(valor, currency)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          <Link
            to={`/app/produtos/${produto.id}`}
            className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 transition"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/app/produtos/editar/${produto.id}`}
            className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition"
          >
            <Edit3 className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 dark:bg-background/80 border-b border-slate-200 dark:border-white/5">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold font-outfit text-slate-900 dark:text-white">Imóveis</h1>
                <p className="text-sm sm:text-base mt-1 text-slate-600 dark:text-slate-400">
                  Gerencie seu catálogo de produtos imobiliários
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md w-full lg:w-auto relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar imóvel, empreendimento, região..."
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-xl border transition ${viewMode === 'list' ? 'ring-2 ring-cyan-500/40 bg-white dark:bg-white/5 border-cyan-500/30' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                aria-label="Lista"
              >
                <List className="w-5 h-5 text-gray-600 dark:text-gray-200" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-xl border transition ${viewMode === 'grid' ? 'ring-2 ring-cyan-500/40 bg-white dark:bg-white/5 border-cyan-500/30' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                aria-label="Grid"
              >
                <Grid3X3 className="w-5 h-5 text-gray-600 dark:text-gray-200" />
              </button>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`p-2.5 rounded-xl border transition ${filtersOpen ? 'ring-2 ring-cyan-500/40 bg-white dark:bg-white/5 border-cyan-500/30' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                aria-label="Filtros"
              >
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-200" />
              </button>
              <button
                onClick={loadProdutos}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition"
                aria-label="Atualizar"
              >
                <RefreshCcw className={`w-5 h-5 text-gray-600 dark:text-gray-200 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleNewProduct}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20 transition"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Novo Imóvel</span>
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {filtersOpen && (
            <div className="mt-4 p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="todos">Todos</option>
                    <option value="disponivel">Disponível</option>
                    <option value="reservado">Reservado</option>
                    <option value="vendido">Vendido</option>
                    <option value="alugado">Alugado</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Tipo</label>
                  <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="todos">Todos</option>
                    {Object.entries(tipoLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Destaque</label>
                  <select
                    value={filterDestaque === null ? 'todos' : filterDestaque ? 'sim' : 'nao'}
                    onChange={(e) => setFilterDestaque(e.target.value === 'todos' ? null : e.target.value === 'sim')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="todos">Todos</option>
                    <option value="sim">Apenas Destaques</option>
                    <option value="nao">Sem Destaque</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterStatus('todos')
                      setFilterTipo('todos')
                      setFilterDestaque(null)
                      setSearchTerm('')
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="px-4 sm:px-6 pb-4 flex flex-wrap gap-4">
          <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <span className="text-xs text-slate-500 dark:text-gray-500">Total</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Disponíveis</span>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.disponiveis}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <span className="text-xs text-amber-600 dark:text-amber-400">Destaques</span>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{stats.destaques}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20">
            <span className="text-xs text-cyan-600 dark:text-cyan-400">Valor Total</span>
            <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{currencyFormat(stats.valorTotal)}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              <p className="text-slate-500 dark:text-gray-400 text-sm animate-pulse">Carregando imóveis...</p>
            </div>
          </div>
        ) : filteredProdutos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-slate-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {searchTerm || filterStatus !== 'todos' || filterTipo !== 'todos' ? 'Nenhum imóvel encontrado' : 'Nenhum imóvel cadastrado'}
            </h3>
            <p className="text-slate-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchTerm || filterStatus !== 'todos' || filterTipo !== 'todos'
                ? 'Tente ajustar os filtros ou termo de busca.'
                : 'Comece adicionando seu primeiro imóvel ao catálogo.'}
            </p>
            {!searchTerm && filterStatus === 'todos' && filterTipo === 'todos' && (
              <button
                onClick={handleNewProduct}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20 transition"
              >
                <Plus className="w-5 h-5" />
                Adicionar Primeiro Imóvel
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProdutos.map((produto) => (
              <ProductCard key={produto.id} produto={produto} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProdutos.map((produto) => (
              <ProductRow key={produto.id} produto={produto} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
