import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Plus,
  Grid3X3,
  List,
  Image as ImageIcon,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Megaphone,
  Bed,
  Bath,
  Car,
  Ruler,
  MapPin,
  Filter,
  X,
  Building2,
  Tag,
  Calendar,
  DollarSign,
  Check,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'
import { isValidUrl } from '../lib/urlValidation'
import type { ProdutoFiltros } from '../types/produtos'
import { fetchProdutoFiltroOptions, ProdutoFiltroOptions } from '../services/produtoFiltersService'
import { deleteProdutosInBulk } from '../services/produtoService'
import { getCustomFields } from '../services/customFieldsService'
import type { CustomFieldDefinition } from '../types/customFields'

// ============================
// Tipos — Produtos
// ============================
export type ImovelStatus = 'disponivel' | 'reservado' | 'vendido' | 'alugado' | 'indisponivel'
export type ImovelTipo =
  | 'apartamento'
  | 'casa'
  | 'sobrado'
  | 'cobertura'
  | 'terreno'
  | 'comercial'
  | 'industrial'
  | 'rural'
  | 'outro'

export type ImovelFinalidade = 'venda' | 'aluguel' | 'venda_aluguel'

export interface ImovelFilters {
  status?: ImovelStatus | 'todos'
  tipo?: ImovelTipo | 'todos' 
  finalidade?: ImovelFinalidade | 'todos'
  valorMin?: number
  valorMax?: number
  quartos?: number
  banheiros?: number
  vagas?: number
  // Filtros dos produtos
  incorporadora?: string
  empreendimento?: string
  fase?: string
  regiao?: string
  bairro?: string
  tipologia?: string[]
  modalidade?: string[]
  financiamento_incorporadora?: 'any' | 'true' | 'false'
  decorado?: 'any' | 'true' | 'false'
}

export interface ImovelRow {
  id: string
  tenant_id: string
  titulo: string // ✅ Para compatibilidade com o componente
  nome?: string // ✅ Campo real da tabela
  descricao: string | null
  tipo: ImovelTipo
  finalidade: ImovelFinalidade
  status: ImovelStatus
  ativo?: boolean // ✅ Campo booleano para ativo/inativo
  valor: number | null // Valor de venda/aluguel
  preco_base: number | null // ✅ Mantido para compatibilidade do componente
  price?: number | null // ✅ Campo real da tabela
  preco?: number | null // ✅ Campo real da tabela
  area_total: number | null // Área em m²
  area_construida: number | null // Área construída em m²
  quartos: number | null
  banheiros: number | null
  vagas_garagem: number | null
  endereco: string | null
  bairro: string | null
  cidade: string | null
  cep: string | null
  destaque: boolean | null
  capa_url: string | null
  tags: string[] | null
  created_at: string
  // Campos personalizados
  custom_fields?: Record<string, any>
}

const EMPTY_FILTER_OPTIONS: ProdutoFiltroOptions = {
  incorporadoras: [],
  empreendimentos: [],
  fases: [],
  regioes: [],
  bairros: [],
  tipologias: [],
  modalidades: []
}

export default function ProdutosNovo() {
  const navigate = useNavigate()
  const { user, tenant } = useAuthStore()
  const { hasActiveSubscription, maxProducts } = useSubscriptionLimits()

  const [list, setList] = useState<ImovelRow[]>([])
  const [refreshKey, setRefreshKey] = useState<number>(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<ImovelFilters>({ status: 'todos', tipo: 'todos', finalidade: 'todos' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filtroOptions, setFiltroOptions] = useState<ProdutoFiltroOptions>(EMPTY_FILTER_OPTIONS)
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentProductCount, setCurrentProductCount] = useState(0)
  const [showFilterPopup, setShowFilterPopup] = useState(false)

  // Debug temporário - verificar valores
  useEffect(() => {
    console.log('🔍 [ProdutosNovo] VALORES:', {
      hasActiveSubscription,
      maxProducts,
      currentProductCount,
      mostrarBanner: !hasActiveSubscription
    })
  }, [hasActiveSubscription, maxProducts, currentProductCount])

  // Carregar campos personalizados quando o popup de filtros abrir
  useEffect(() => {
    if (showFilterPopup && tenant?.id) {
      getCustomFields(tenant.id).then(fields => {
        setCustomFields(fields)
      }).catch(error => {
        console.error('Erro ao carregar campos personalizados:', error)
      })
    }
  }, [showFilterPopup, tenant?.id])

  // ... resto do código de Produtos.tsx, mas com o popup modificado

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-cyan-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Produtos Novo</h1>
                <p className="text-gray-400">Gerencie seus imóveis e produtos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilterPopup(true)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition"
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Filtros
              </button>
              <Link
                to="/app/produtos/novo"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium hover:scale-105 transition shadow-lg hover:shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Novo Produto
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Popup de Filtros */}
      {showFilterPopup && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowFilterPopup(false)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/98 border border-cyan-500/30 rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border-cyan-400/40 border flex items-center justify-center">
                  <Filter className="w-6 h-6 dark:text-cyan-400 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white text-gray-900">Filtros</h3>
                  <p className="text-sm text-gray-400">Busque informações importantes</p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="mb-6 min-h-[200px] p-6 rounded-xl bg-white/5 border-white/10 border">
              {/* Filtros Padrão */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status || 'todos'}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as ImovelStatus | 'todos' }))}
                    className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                  >
                    <option value="todos">Todos</option>
                    <option value="disponivel">Disponível</option>
                    <option value="reservado">Reservado</option>
                    <option value="vendido">Vendido</option>
                    <option value="alugado">Alugado</option>
                    <option value="indisponivel">Indisponível</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">Tipo</label>
                  <select
                    value={filters.tipo || 'todos'}
                    onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value as ImovelTipo | 'todos' }))}
                    className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                  >
                    <option value="todos">Todos</option>
                    <option value="apartamento">Apartamento</option>
                    <option value="casa">Casa</option>
                    <option value="sobrado">Sobrado</option>
                    <option value="cobertura">Cobertura</option>
                    <option value="terreno">Terreno</option>
                    <option value="comercial">Comercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="rural">Rural</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">Finalidade</label>
                  <select
                    value={filters.finalidade || 'todos'}
                    onChange={(e) => setFilters(prev => ({ ...prev, finalidade: e.target.value as ImovelFinalidade | 'todos' }))}
                    className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                  >
                    <option value="todos">Todos</option>
                    <option value="venda">Venda</option>
                    <option value="aluguel">Aluguel</option>
                    <option value="venda_aluguel">Venda e Aluguel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">Valor Mínimo</label>
                  <input
                    type="number"
                    value={filters.valorMin || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, valorMin: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                    placeholder="R$ 0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">Valor Máximo</label>
                  <input
                    type="number"
                    value={filters.valorMax || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, valorMax: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                    placeholder="R$ 0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">Quartos</label>
                  <input
                    type="number"
                    value={filters.quartos || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, quartos: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                    placeholder="0"
                  />
                </div>
              </div>
              {/* Campos Personalizados */}
              <div className="border-t dark:border-white/10 border-gray-300/10 pt-4">
                <h4 className="text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Campos Personalizados</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.length > 0 ? (
                    customFields.map(field => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">{field.label}</label>
                        {field.type === 'text' && (
                          <input
                            type="text"
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                            placeholder={`Buscar por ${field.label}`}
                          />
                        )}
                        {field.type === 'number' && (
                          <input
                            type="number"
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                            placeholder={`Buscar por ${field.label}`}
                          />
                        )}
                        {field.type === 'select' && field.options && (
                          <select
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                          >
                            <option value="">Todos</option>
                            {field.options.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                        {field.type === 'boolean' && (
                          <select
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                          >
                            <option value="">Todos</option>
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs dark:text-gray-500 text-gray-500 col-span-full">Nenhum campo personalizado configurado.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer com Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilterPopup(false)}
                className="flex-1 px-5 py-3 rounded-xl dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-gray-300 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200 dark:hover:text-white hover:text-gray-900 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowFilterPopup(false)}
                className="flex-1 px-5 py-3 rounded-xl dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-gray-300 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200 dark:hover:text-white hover:text-gray-900 transition-all font-medium"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  // Aqui você vai aplicar os filtros
                  setShowFilterPopup(false)
                }}
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-cyan-500/40 hover:scale-105 active:scale-95"
              >
                Aplicar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Conteúdo principal - placeholder */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-400">
          Página Produtos Novo - Implementação em andamento
        </div>
      </div>
    </div>
  )
}