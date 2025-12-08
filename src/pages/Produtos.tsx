import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
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
  categoria?: string
  precoMin?: number
  precoMax?: number
  customFields?: Record<string, string | number | boolean | undefined>
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
  categoria?: string | null // ✅ Categoria do produto
  galeria_urls?: string[] | null // ✅ Galeria do produto
  arquivo_urls?: string[] | null // ✅ Arquivos do produto
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
  updated_at: string
  // Campos herdados de produtos
  filtros?: ProdutoFiltros | null
  preco_min_num?: number | string | null
  metragem_min_num?: number | string | null
  metragem_max_num?: number | string | null
  entrega_date?: string | null
  equipe?: {
    id: string
    nome: string
  }
}

// ============================
// Helpers
// ============================
function currencyBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const statusStyle: Record<ImovelStatus, string> = {
  disponivel: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  reservado: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/20',
  vendido: 'bg-slate-500/15 text-slate-300 border-slate-400/20',
  alugado: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  indisponivel: 'bg-rose-500/15 text-rose-300 border-rose-400/20',
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

const formatCurrency = (value?: number | null) =>
  value !== null && value !== undefined
    ? value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    })
    : '—'

const formatEntrega = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '—'

const formatMetragem = (min?: number | null, max?: number | null) => {
  if (min && max) return `${min} a ${max} m²`
  if (min) return `${min} m²`
  if (max) return `até ${max} m²`
  return '—'
}

// ============================
// Página — Produtos
// ============================
export default function Imoveis() {
  const { tenant, member } = useAuthStore()
  const { canAddProduct, maxProducts, hasActiveSubscription } = useSubscriptionLimits()
  const { t: t18n } = useTranslation()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])
  const navigate = useNavigate()

  const [showNoTeamModal, setShowNoTeamModal] = useState(false)
  const [tab, setTab] = useState<'ativos' | 'inativos'>('ativos')
  const [loading, setLoading] = useState<boolean>(true)
  const [list, setList] = useState<ImovelRow[]>([])
  const [refreshKey, setRefreshKey] = useState<number>(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<ImovelFilters>({ categoria: '', precoMin: undefined, precoMax: undefined, customFields: {} })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filtroOptions, setFiltroOptions] = useState<ProdutoFiltroOptions>(EMPTY_FILTER_OPTIONS)
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentProductCount, setCurrentProductCount] = useState(0)
  const [showFilterPopup, setShowFilterPopup] = useState(false)

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

  const handleEdit = useCallback((item: ImovelRow) => {
    // Navegar diretamente para a página de edição
    navigate(`/app/produtos/editar/${item.id}`)
  }, [navigate])

  const confirmBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return
    setShowDeleteConfirm(true)
  }, [selectedIds])

  const handleBulkDelete = useCallback(async () => {
    setShowDeleteConfirm(false)

    const idsArray = Array.from(selectedIds)
    const loadingToast = toast.loading(t18n('products.deletingInBulk', { count: idsArray.length }))

    try {
      const results = await deleteProdutosInBulk(idsArray)

      toast.dismiss(loadingToast)

      if (results.success > 0) {
        toast.success(t18n('products.bulkDeleteSuccess', { count: results.success }))
        setSelectedIds(new Set())
        setSelectMode(false)
        setRefreshKey(k => k + 1)
      }

      if (results.failed > 0) {
        const errorMessages = results.errors.slice(0, 3).map(e => `• ${e.error}`).join('\n')
        const moreErrors = results.errors.length > 3 ? `\n... ${t18n('products.andMoreErrors', { count: results.errors.length - 3 })}` : ''
        toast.error(t18n('products.bulkDeleteFailed', { count: results.failed }) + `\n${errorMessages}${moreErrors}`, {
          duration: 6000
        })
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('[DEBUG] Erro na exclusão em lote:', error)
      toast.error(t18n('products.bulkDeleteError'))
    }
  }, [selectedIds])

  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev)
    setSelectedIds(new Set())
  }, [])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleDelete = useCallback(async (item: ImovelRow) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span>{t18n('products.deleteConfirmPrompt', { title: item.titulo })}</span>
        <div className="text-xs text-amber-400 mb-2">
          {t18n('products.deleteConfirmDependencies')}
        </div>
        <div className="flex gap-2">
          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            onClick={async () => {
              toast.dismiss(t.id)
              try {
                // 1. Verificar dependências em todas as tabelas (com fallback)
                const dependencias = await Promise.all([
                  // Verificar tarefas
                  (async () => {
                    try {
                      return await supabase
                        .from('tarefas')
                        .select('id, titulo')
                        .eq('produto_id', item.id)
                    } catch (err) {
                      console.warn('Tabela tarefas não acessível:', err)
                      return { data: [], error: null }
                    }
                  })(),

                  // Verificar tarefas_produtos
                  (async () => {
                    try {
                      return await supabase
                        .from('tarefas_produtos')
                        .select('id, tarefa_id, quantidade')
                        .eq('produto_id', item.id)
                    } catch (err) {
                      console.warn('Tabela tarefas_produtos não acessível:', err)
                      return { data: [], error: null }
                    }
                  })(),

                  // Verificar cliente_produtos (se existir)
                  (async () => {
                    try {
                      return await supabase
                        .from('cliente_produtos')
                        .select('id, cliente_id')
                        .eq('produto_id', item.id)
                    } catch (err) {
                      console.warn('Tabela cliente_produtos não acessível:', err)
                      return { data: [], error: null }
                    }
                  })()
                ])

                const [tarefasResult, tarefasProdutosResult, clienteProdutosResult] = dependencias

                const tarefas = tarefasResult.data || []
                const tarefasProdutos = tarefasProdutosResult.data || []
                const clienteProdutos = clienteProdutosResult.data || []

                // 2. Se houver dependências, mostrar resumo e pedir confirmação
                const totalDependencias = tarefas.length + tarefasProdutos.length + clienteProdutos.length

                if (totalDependencias > 0) {
                  let mensagem = t18n('products.dependenciesHeader', { count: totalDependencias }) + '\n\n'

                  if (tarefas.length > 0) {
                    mensagem += t18n('products.depsTasks', { count: tarefas.length }) + ':\n'
                    tarefas.slice(0, 3).forEach((t: { titulo: string }) => {
                      mensagem += `  • ${t.titulo}\n`
                    })
                    if (tarefas.length > 3) mensagem += `  • ${t18n('products.andMore', { count: tarefas.length - 3 })}\n`
                    mensagem += '\n'
                  }

                  if (tarefasProdutos.length > 0) {
                    mensagem += t18n('products.depsTaskProductRelations', { count: tarefasProdutos.length }) + '\n\n'
                  }

                  if (clienteProdutos.length > 0) {
                    mensagem += t18n('products.depsClientProductRelations', { count: clienteProdutos.length }) + '\n\n'
                  }

                  mensagem += t18n('products.dependenciesWillBeRemoved') + '\n\n' + t18n('products.continueDeletionPrompt')

                  const confirmaRemocao = window.confirm(mensagem)

                  if (!confirmaRemocao) {
                    toast(t18n('products.deletionCancelled'))
                    return
                  }

                  // 3. Remover dependências na ordem correta

                  // Primeiro: tarefas_produtos (tabela de junção)
                  if (tarefasProdutos.length > 0) {
                    const { error: deleteTarefasProdutosError } = await supabase
                      .from('tarefas_produtos')
                      .delete()
                      .eq('produto_id', item.id)

                    if (deleteTarefasProdutosError) {
                      console.error('Erro ao remover tarefas_produtos:', deleteTarefasProdutosError)
                      throw new Error('Erro ao remover relações tarefas-produtos')
                    }
                  }

                  // Segundo: cliente_produtos (se existir)
                  if (clienteProdutos.length > 0) {
                    const { error: deleteClienteProdutosError } = await supabase
                      .from('cliente_produtos')
                      .delete()
                      .eq('produto_id', item.id)

                    if (deleteClienteProdutosError) {
                      console.error('Erro ao remover cliente_produtos:', deleteClienteProdutosError)
                      // Não falhar se a tabela não existir
                    }
                  }

                  // Terceiro: atualizar tarefas (remover referência ao produto)
                  if (tarefas.length > 0) {
                    const { error: updateTarefasError } = await supabase
                      .from('tarefas')
                      .update({ produto_id: null })
                      .eq('produto_id', item.id)

                    if (updateTarefasError) {
                      console.error('Erro ao atualizar tarefas:', updateTarefasError)
                      throw new Error('Erro ao atualizar tarefas relacionadas')
                    }
                  }
                }

                // 4. Agora excluir o imóvel
                const { error: deleteImovelError } = await supabase
                  .from('produtos')
                  .delete()
                  .eq('id', item.id)

                if (deleteImovelError) {
                  console.error('Erro ao excluir imóvel:', deleteImovelError)
                  throw deleteImovelError
                }

                setRefreshKey((k) => k + 1)

                // Mensagem de sucesso personalizada
                if (totalDependencias > 0) {
                  toast.success(t18n('products.deleteSuccessWithDeps', { count: totalDependencias }))
                } else {
                  toast.success(t18n('products.deleteSuccess'))
                }

              } catch (e: unknown) {
                console.error('Erro ao excluir imóvel:', e)

                // Mensagens de erro mais específicas
                const error = e as { code?: string; message?: string }
                if (error?.code === '23503') {
                  toast.error(t18n('products.deleteDependencyError'))
                } else if (error?.message?.includes('foreign key')) {
                  toast.error(t18n('products.deleteForeignKeyError'))
                } else if (error?.message?.includes('dependência')) {
                  toast.error(`${t18n('products.deleteErrorGeneric')}: ${error.message}`)
                } else {
                  toast.error(`${t18n('products.deleteErrorGeneric')}: ${error?.message || t18n('products.unknownError')}`)
                }
              }
            }}
          >
            {t18n('products.deleteWithDependenciesBtn')}
          </button>
          <button
            className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
            onClick={() => toast.dismiss(t.id)}
          >
            {t18n('common.cancel')}
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }, [])

  const fetchImoveis = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id,
          tenant_id,
          nome,
          descricao,
          valor,
          capa_url,
          galeria,
          anexos,
          categoria,
          created_at,
          updated_at,
          filtros
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      setLoading(false)

      if (error) {
        console.error('Erro ao buscar produtos:', error)
        return
      }

      // ✅ Converter dados para o formato esperado pelo componente
      const imoveisFormatados = (data ?? []).map(item => ({
        id: item.id,
        tenant_id: item.tenant_id,
        titulo: item.nome, // ✅ nome → titulo
        nome: item.nome,
        descricao: item.descricao,
        tipo: 'produto' as ImovelTipo, // ✅ Valor padrão para produtos
        finalidade: 'venda' as ImovelFinalidade, // ✅ Valor padrão
        status: 'disponivel' as ImovelStatus, // ✅ Valor padrão
        ativo: true, // ✅ Valor padrão
        valor: item.valor, // ✅ Usar valor da tabela
        preco_base: item.valor, // ✅ Compatibilidade
        price: item.valor, // ✅ Compatibilidade
        preco: item.valor, // ✅ Compatibilidade
        area_total: null, // ✅ Não aplicável para produtos
        area_construida: null, // ✅ Não aplicável para produtos
        quartos: null, // ✅ Não aplicável para produtos
        banheiros: null, // ✅ Não aplicável para produtos
        vagas_garagem: null, // ✅ Não aplicável para produtos
        endereco: null, // ✅ Não aplicável para produtos
        bairro: null, // ✅ Não aplicável para produtos
        cidade: null, // ✅ Não aplicável para produtos
        cep: null, // ✅ Não aplicável para produtos
        destaque: false, // ✅ Valor padrão
        capa_url: item.capa_url,
        galeria_urls: item.galeria, // ✅ Mapear galeria para galeria_urls
        arquivo_urls: item.anexos, // ✅ Mapear anexos para arquivo_urls
        categoria: item.categoria, // ✅ Nova coluna
        tags: [], // ✅ Array vazio
        created_at: item.created_at,
        updated_at: item.updated_at,
        // Novos campos dos produtos - filtros já inclui os custom fields
        filtros: typeof item.filtros === 'string' ? JSON.parse(item.filtros || '{}') : (item.filtros || {}),
        preco_min_num: null, // ✅ Não aplicável
        metragem_min_num: null, // ✅ Não aplicável
        metragem_max_num: null, // ✅ Não aplicável
        entrega_date: null // ✅ Não aplicável
      }))

      setList(imoveisFormatados as ImovelRow[])
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
      setLoading(false)
    }
  }, [tenantId])

  const refreshFiltroOptions = useCallback(async () => {
    if (!tenantId) {
      setFiltroOptions(EMPTY_FILTER_OPTIONS)
      return
    }

    try {
      const options = await fetchProdutoFiltroOptions(tenantId)
      setFiltroOptions(options)
    } catch (err) {
      console.error('Erro ao buscar opções de filtros:', err)
    }
  }, [tenantId])

  useEffect(() => {
    fetchImoveis()
  }, [fetchImoveis, refreshKey])

  useEffect(() => {
    refreshFiltroOptions()
  }, [refreshFiltroOptions])

  // Buscar contagem atual de produtos
  useEffect(() => {
    const fetchProductCount = async () => {
      if (!tenantId) return

      try {
        const { count, error } = await supabase
          .from('produtos')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)

        if (error) throw error
        setCurrentProductCount(count || 0)
      } catch (err) {
        console.error('Erro ao buscar contagem de produtos:', err)
      }
    }

    fetchProductCount()
  }, [tenantId])

  const filteredByStatus = useMemo(() => {
    let filtered = list

    // Aplicar filtros
    if (filters.categoria) {
      filtered = filtered.filter(item => item.categoria?.toLowerCase().includes(filters.categoria.toLowerCase()))
    }

    if (filters.precoMin !== undefined) {
      filtered = filtered.filter(item => {
        const valor = item.valor || item.preco_base || item.preco || item.price || 0
        return valor >= (filters.precoMin || 0)
      })
    }

    if (filters.precoMax !== undefined) {
      filtered = filtered.filter(item => {
        const valor = item.valor || item.preco_base || item.preco || item.price || 0
        return valor <= (filters.precoMax || Infinity)
      })
    }

    // Filtrar por campos personalizados
    if (filters.customFields && Object.keys(filters.customFields).length > 0) {
      filtered = filtered.filter(item => {
        // Para cada campo personalizado com filtro ativo
        for (const [fieldId, filterValue] of Object.entries(filters.customFields || {})) {
          // Se não tiver valor de filtro, pula
          if (!filterValue || filterValue === '') continue

          // Buscar o valor do campo personalizado no produto
          // Os valores podem estar em item.filtros ou em um array de custom_field_values
          // Por enquanto, vamos procurar em item.filtros[fieldId]
          const itemValue = item.filtros?.[fieldId];
          const filterStringValue = String(filterValue).toLowerCase();

          // Comparar valores
          if (itemValue === undefined || itemValue === null || itemValue === '') {
            return false;
          }

          // Comparação para select/multiselect (pode ser um array)
          if (Array.isArray(itemValue)) {
            if (!itemValue.map(v => String(v).toLowerCase()).includes(filterStringValue)) {
              return false;
            }
          }
          // Comparação simples (string, number, boolean)
          else if (String(itemValue).toLowerCase() !== filterStringValue) {
            return false;
          }
        }
        return true
      })
    }

    return filtered
  }, [list, filters])

  const ativos = useMemo(
    () => filteredByStatus.filter((i) => i.destaque === true || (i.ativo !== false)),
    [filteredByStatus]
  )
  const inativos = useMemo(
    () => filteredByStatus.filter((i) => i.ativo === false && i.destaque !== true),
    [filteredByStatus]
  )
  const filteredList = useMemo(
    () => (tab === 'ativos' ? ativos : inativos),
    [tab, ativos, inativos]
  )

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredList.map(item => item.id)))
  }, [filteredList])

  function Card({ item }: { item: ImovelRow }) {
    const isSelected = selectedIds.has(item.id)

    return (
      <div className={`group rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border transition-all duration-300 shadow-2xl hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-500/40 overflow-hidden backdrop-blur-sm flex h-auto ${isSelected
        ? 'border-cyan-400/80 ring-2 ring-cyan-400/40 from-cyan-500/20 to-cyan-600/10'
        : 'border-white/10 hover:border-cyan-400/40 hover:from-white/15 hover:to-white/10'
        }`}>
        {/* Checkbox */}
        {selectMode && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(item.id)}
              className="w-5 h-5 rounded border-2 border-white/30 bg-slate-800/80 checked:bg-cyan-500 checked:border-cyan-400 cursor-pointer"
            />
          </div>
        )}
        {/* Imagem - 4:3 */}
        <div className="relative w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden flex-shrink-0 aspect-video">
          <div className="w-full h-full">
            {isValidUrl(item.capa_url) ? (
              <img
                src={item.capa_url as string}
                alt={item.titulo}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gradient-to-br from-slate-800 to-slate-900">
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <div className="text-xs text-gray-500">{t18n('products.noImage')}</div>
                </div>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              <span className={`text-[10px] sm:text-xs font-semibold px-3 py-1.5 rounded-full border backdrop-blur-md ${statusStyle[item.status]}`}>
                {item.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Destaque Badge */}
            {item.destaque && (
              <div className="absolute top-3 right-3">
                <span className="text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full border border-purple-300/50 bg-gradient-to-r from-purple-500/30 to-pink-500/20 text-purple-100 backdrop-blur-md shadow-lg shadow-purple-500/20">
                  ⭐ {t18n('products.featuredBadge')}
                </span>
              </div>
            )}

            {/* Ações - aparecem no hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
              <button
                onClick={() => handleEdit(item)}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white hover:text-cyan-300 border border-white/30 backdrop-blur-sm transition-all hover:scale-110 shadow-lg"
                title={t18n('products.editTitle')}
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(item)}
                className="w-12 h-12 bg-white/20 hover:bg-rose-500/40 rounded-xl flex items-center justify-center text-white hover:text-rose-200 border border-white/30 backdrop-blur-sm transition-all hover:scale-110 shadow-lg"
                title={t18n('products.deleteTitle')}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Informações - 4:3 */}
        <div className="p-5 w-1/2 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white truncate text-lg leading-tight">{item.titulo}</h3>
                <div className="text-[10px] text-slate-400 mt-1 font-mono break-all">{item.id}</div>
              </div>
            </div>
            {(item.preco_min_num || item.filtros?.preco_min) && (
              <div className="text-emerald-300 font-bold text-base flex-shrink-0 whitespace-nowrap">
                {t18n('products.startingFrom')}{' '}
                {currencyBRL(
                  typeof (item.preco_min_num || item.filtros?.preco_min) === 'string'
                    ? Number(item.preco_min_num || item.filtros?.preco_min)
                    : Number(item.preco_min_num || item.filtros?.preco_min)
                )}
              </div>
            )}
          </div>

          {/* Property Features Icons - Mobile Only */}
          <div className="flex flex-wrap items-center gap-2 text-xs mb-5 md:hidden">
            {/* Basic property info always shown */}
            <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs">{item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}</span>
            </div>

            {/* Property characteristics with icons */}
            {item.area_total && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
                <Ruler className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-medium">{item.area_total}m²</span>
              </div>
            )}

            {item.quartos && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
                <Bed className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-medium">{item.quartos}</span>
              </div>
            )}

            {item.banheiros && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
                <Bath className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium">{item.banheiros}</span>
              </div>
            )}

            {item.vagas_garagem && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
                <Car className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium">{item.vagas_garagem}</span>
              </div>
            )}
          </div>

          {/* Property Features Icons - Desktop Only */}
          <div className="hidden md:flex flex-wrap items-center gap-2 text-xs mb-5">
            {/* Basic property info always shown */}
            <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs">{item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}</span>
            </div>

            {/* Property characteristics with icons */}
            {item.area_total && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
                <Ruler className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-medium">{item.area_total}m²</span>
              </div>
            )}

            {item.quartos && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
                <Bed className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-medium">{item.quartos}</span>
              </div>
            )}

            {item.banheiros && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
                <Bath className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium">{item.banheiros}</span>
              </div>
            )}

            {item.vagas_garagem && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
                <Car className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium">{item.vagas_garagem}</span>
              </div>
            )}
          </div>

          {/* Detailed Information - Desktop Only */}
          <div className="hidden md:block">
            <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">{item.descricao ?? t18n('products.noDescription')}</p>

            {/* Informações do empreendimento */}
            {item.filtros && (
              <div className="mt-4 space-y-2">
                {/* Header - Empreendimento */}
                {item.filtros.empreendimento && (
                  <div className="pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-cyan-200">{item.filtros.empreendimento}</span>
                    </div>
                  </div>
                )}

                {/* Grid de informações */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {item.filtros.incorporadora && (
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2 border border-white/5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <div>
                        <div className="text-slate-500 dark:text-gray-400 text-[10px]">{t18n('products.builder')}</div>
                        <div className="font-semibold text-indigo-200 line-clamp-1">{item.filtros.incorporadora}</div>
                      </div>
                    </div>
                  )}

                  {item.filtros.fase && (
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2 border border-white/5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <div className="text-slate-500 dark:text-gray-400 text-[10px]">{t18n('products.phase')}</div>
                        <div className="font-semibold text-emerald-200 line-clamp-1">{item.filtros.fase}</div>
                      </div>
                    </div>
                  )}

                  {item.filtros.regiao && (
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2 border border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <div>
                        <div className="text-slate-500 dark:text-gray-400 text-[10px]">{t18n('products.region')}</div>
                        <div className="font-semibold text-amber-200 line-clamp-1">{item.filtros.regiao}</div>
                      </div>
                    </div>
                  )}

                  {item.filtros.bairro && (
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2 border border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      <div>
                        <div className="text-slate-500 dark:text-gray-400 text-[10px]">{t18n('products.neighborhood')}</div>
                        <div className="font-semibold text-rose-200 line-clamp-1">{item.filtros.bairro}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preço e Metragem */}
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  {(item.filtros.preco_min || item.preco_min_num) && (
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2 border border-white/5">
                      <DollarSign className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <div>
                        <div className="text-slate-500 dark:text-gray-400 text-[10px]">{t18n('products.startingFrom')}</div>
                        <div className="font-semibold text-cyan-200 line-clamp-1">
                          {formatCurrency(
                            (() => {
                              const value = item.filtros.preco_min || item.preco_min_num;
                              if (typeof value === 'string') {
                                return Number(value);
                              }
                              return value;
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {(item.filtros.metragem_min || item.filtros.metragem_max || item.metragem_min_num || item.metragem_max_num) && (
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2 border border-white/5">
                      <Ruler className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <div>
                        <div className="text-slate-500 dark:text-gray-400 text-[10px]">{t18n('products.area')}</div>
                        <div className="font-semibold text-purple-200 line-clamp-1">
                          {formatMetragem(
                            (() => {
                              const value = item.filtros.metragem_min || item.metragem_min_num;
                              if (typeof value === 'string') {
                                return Number(value) || null;
                              }
                              return value;
                            })(),
                            (() => {
                              const value = item.filtros.metragem_max || item.metragem_max_num;
                              if (typeof value === 'string') {
                                return Number(value) || null;
                              }
                              return value;
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {(item.filtros.entrega || item.entrega_date) && (
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2 border border-white/5">
                      <Calendar className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      <div>
                        <div className="text-slate-500 dark:text-gray-400 text-[10px]">{t18n('products.delivery')}</div>
                        <div className="font-semibold text-rose-200 line-clamp-1">
                          {formatEntrega(item.filtros.entrega || item.entrega_date)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tipologia e Modalidade */}
            {item.filtros && (item.filtros.tipologia?.length || item.filtros.modalidade?.length) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.filtros.tipologia?.map((tip) => (
                  <span
                    key={`tipologia-${item.id}-${tip}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                  >
                    <Tag className="w-3 h-3" />
                    {tip}
                  </span>
                ))}
                {item.filtros.modalidade?.map((mod) => (
                  <span
                    key={`modalidade-${item.id}-${mod}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200"
                  >
                    <Building2 className="w-3 h-3" />
                    {mod}
                  </span>
                ))}
              </div>
            )}

            {/* Características especiais */}
            {item.filtros && (item.filtros.financiamento_incorporadora !== undefined || item.filtros.decorado !== undefined) && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {item.filtros.financiamento_incorporadora !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${item.filtros.financiamento_incorporadora
                      ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
                      : 'border-slate-500/40 text-slate-300 bg-slate-800/60'
                      }`}
                  >
                    <Check className="w-3 h-3" />
                    Financiamento incorporadora {item.filtros.financiamento_incorporadora ? 'disponível' : 'não'}
                  </span>
                )}
                {item.filtros.decorado !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${item.filtros.decorado
                      ? 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10'
                      : 'border-slate-500/40 text-slate-300 bg-slate-800/60'
                      }`}
                  >
                    <Check className="w-3 h-3" />
                    {t18n('products.decoratedLabel', {
                      status: item.filtros.decorado ? t18n('products.decoratedReady') : t18n('products.decoratedUnavailable')
                    })}
                  </span>
                )}
              </div>
            )}

            {/* Tags and additional info */}
            <div className="flex flex-wrap items-center gap-2 text-xs mb-5 mt-5">
              <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/15 to-purple-600/15 border border-purple-500/30 text-purple-300 font-semibold">
                {item.finalidade.replace('_', ' ').toUpperCase()}
              </span>

              {item.tags?.slice(0, 2).map((t, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-gray-300 text-xs font-medium">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <Link
            to={`/app/produtos/${item.id}`}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-500 to-cyan-600 hover:from-cyan-600 hover:via-cyan-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95"
          >
            {t18n('products.viewDetails')} <ExternalLink className="w-4 h-4" />
          </Link>

          <button
            onClick={() => handleDelete(item)}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-red-500 via-red-500 to-red-600 hover:from-red-600 hover:via-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-red-500/40 hover:scale-[1.02] active:scale-95 mt-2"
          >
            {t18n('products.delete')} <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  function Row({ item }: { item: ImovelRow }) {
    const isSelected = selectedIds.has(item.id)

    return (
      <div className={`group rounded-xl border bg-gradient-to-r transition-all shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm overflow-hidden ${isSelected
        ? 'border-cyan-400/80 ring-2 ring-cyan-400/40 from-cyan-500/20 to-cyan-600/10'
        : 'border-white/10 from-white/8 to-white/5 hover:from-white/12 hover:to-white/10 hover:border-cyan-400/40'
        }`}>
        <div className="flex items-center gap-4 p-4">
          {/* Checkbox */}
          {selectMode && (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                className="w-5 h-5 rounded border-2 border-white/30 bg-slate-800/80 checked:bg-cyan-500 checked:border-cyan-400 cursor-pointer"
              />
            </div>
          )}

          {/* Imagem */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 flex-shrink-0 flex items-center justify-center shadow-md">
            {isValidUrl(item.capa_url) ? (
              <img
                src={item.capa_url as string}
                alt={item.titulo}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="text-center text-slate-400">
                <ImageIcon className="w-6 h-6 opacity-50" />
              </div>
            )}
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            {/* Nome */}
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{item.titulo}</h3>

            {/* Preço */}
            {(() => {
              const valor = item.valor || item.preco_base || item.preco || item.price || 0
              return valor > 0 && (
                <div className="text-emerald-600 dark:text-emerald-300 font-semibold text-sm">
                  {currencyBRL(valor)}
                </div>
              )
            })()}
          </div>

          {/* Ver detalhes - apenas ícone */}
          <Link
            to={`/app/produtos/${item.id}`}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-cyan-500/30"
            title={t18n('products.viewDetails')}
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {/* Deletar - ícone */}
          <button
            onClick={() => handleDelete(item)}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-red-500/30"
            title={t18n('products.deleteTitle')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  const EmptyState = (
    <div className="text-center py-24">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-500/20 dark:to-blue-600/20 border border-cyan-200 dark:border-cyan-500/40 flex items-center justify-center shadow-xl shadow-cyan-500/10">
        <Megaphone className="w-10 h-10 text-cyan-600 dark:text-cyan-400" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
        {tab === 'ativos' ? t18n('products.emptyActiveTitle') : t18n('products.emptyInactiveTitle')}
      </h3>
      <p className="text-slate-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        {tab === 'ativos'
          ? t18n('products.emptyActiveDescription')
          : t18n('products.emptyInactiveDescription')}
      </p>
      {tab === 'ativos' && (
        <Link
          to="/app/produtos/novo"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-cyan-500/40 hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          {t18n('products.createFirstProduct')}
        </Link>
      )}
    </div>
  )

  return (
    <div className="text-slate-900 dark:text-slate-200 flex flex-col min-h-full relative overflow-hidden">
      {/* HUD glow grid background + overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:120px_120px]" />
      </div>

      <div className="flex-1 overflow-y-auto pb-6 px-6 relative z-10">
        {/* Header */}
        <div className="p-2 sm:p-4 md:p-6 border-b border-slate-200 dark:border-white/10 mb-4 md:mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">{t18n('products.catalog')}</div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{t18n('products.title')}</h1>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Botão Selecionar - Mobile (apenas ícone) */}
                <button
                  onClick={toggleSelectMode}
                  title={t18n('products.select')}
                  className="md:hidden p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-lg"
                >
                  <Check className="w-4 h-4" />
                </button>
                {/* Botão Selecionar - Desktop (com texto) */}
                {!selectMode && (
                  <button
                    onClick={toggleSelectMode}
                    className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all hover:border-cyan-400/30"
                  >
                    <Check className="w-4 h-4" />
                    {t18n('products.select')}
                  </button>
                )}
                {selectMode && (
                  <>
                    <button
                      onClick={selectAll}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-300 dark:border-cyan-400/30 bg-cyan-50 dark:bg-cyan-500/10 text-sm text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-all shadow-sm dark:shadow-lg"
                    >
                      <Check className="w-4 h-4" />
                      {t18n('products.selectAll')}
                    </button>
                    <button
                      onClick={deselectAll}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-lg"
                    >
                      <X className="w-4 h-4" />
                      {t18n('products.deselectAll')}
                    </button>
                    <button
                      onClick={confirmBulkDelete}
                      disabled={selectedIds.size === 0}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-500/10 text-sm text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all shadow-sm dark:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t18n('products.deleteSelected', { count: selectedIds.size })}
                    </button>
                    <button
                      onClick={toggleSelectMode}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-lg"
                    >
                      {t18n('common.cancel')}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowFilterPopup(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-lg hover:border-cyan-400/30"
                >
                  <Filter className="w-4 h-4" />
                  {t18n('products.filters')}
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-xl border transition-all shadow-sm dark:shadow-lg ${viewMode === 'list' ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-400/30 text-cyan-700 dark:text-cyan-300 shadow-cyan-500/20' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20'}`}
                  aria-label={t18n('products.viewList')}
                  title={t18n('products.viewList')}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-xl border transition-all shadow-sm dark:shadow-lg ${viewMode === 'grid' ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-400/30 text-cyan-700 dark:text-cyan-300 shadow-cyan-500/20' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20'}`}
                  aria-label={t18n('products.viewGrid')}
                  title={t18n('products.viewGrid')}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                {!selectMode && (
                  <>
                    <button
                      onClick={() => setRefreshKey(k => k + 1)}
                      className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 text-slate-600 dark:text-gray-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all shadow-sm dark:shadow-lg hover:shadow-cyan-500/10"
                      title={t18n('products.refresh')}
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>

                    {canAddProduct(currentProductCount) ? (
                      <Link
                        to="/app/produtos/novo"
                        className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Plus className="w-4 h-4" />
                        {t18n('products.newProduct.title')}
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-500 text-gray-300 font-semibold text-sm cursor-not-allowed opacity-50"
                        title={t18n('products.limitTooltip', { max: maxProducts })}
                      >
                        <Plus className="w-4 h-4" />
                        {t18n('products.newProduct.title')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Banner de Upgrade */}
            {!hasActiveSubscription && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 dark:from-amber-500/10 dark:to-orange-500/10 dark:border-amber-500/30">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                      {t18n('products.limitActive')}
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-300/80 mb-3">
                      {t18n('products.limitDescription', { current: currentProductCount, max: maxProducts })}
                    </p>
                    <Link
                      to="/subscribe"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-amber-500/30 hover:scale-105"
                    >
                      <span>{t18n('products.upgrade')}</span>
                      <span className="text-xs">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs - Desktop */}
            <div className="hidden md:flex justify-center gap-3 mb-8">
              <button
                onClick={() => setTab('ativos')}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${tab === 'ativos'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30 scale-[1.02]'
                  : 'bg-white/5 border border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white hover:border-white/20'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 text-xs font-bold">
                    {ativos.length}
                  </span>
                  {t18n('products.active')}
                </span>
              </button>
              <button
                onClick={() => setTab('inativos')}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${tab === 'inativos'
                  ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-500/30 scale-[1.02]'
                  : 'bg-white/5 border border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white hover:border-white/20'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 text-xs font-bold">
                    {inativos.length}
                  </span>
                  {t18n('products.inactive')}
                </span>
              </button>
            </div>

            {/* Tabs - Mobile */}
            <div className="md:hidden flex items-center justify-center gap-4 mb-6 px-4 py-3 rounded-xl bg-white/5 dark:bg-white/5 border border-white/10">
              {canAddProduct(currentProductCount) ? (
                <Link
                  to="/app/produtos/novo"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 w-20 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  {t18n('products.newProduct.title')}
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 w-20 rounded-lg bg-gray-500 text-gray-300 font-semibold text-sm cursor-not-allowed opacity-50"
                  title={t18n('products.limitTooltip', { max: maxProducts })}
                >
                  <Plus className="w-4 h-4" />
                  {t18n('products.newProduct.title')}
                </button>
              )}

              <button
                onClick={() => setTab('ativos')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 w-20 rounded-lg font-semibold text-sm transition-all ${tab === 'ativos'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30'
                  : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white bg-white/5 border border-white/10'
                  }`}
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-white/20 text-xs font-bold">
                  {ativos.length}
                </span>
                {t18n('products.active')}
              </button>

              <button
                onClick={() => setTab('inativos')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 w-20 rounded-lg font-semibold text-sm transition-all border border-gray-300 dark:border-gray-400 ${tab === 'inativos'
                  ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-500/30'
                  : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white bg-white/5'
                  }`}
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-white/20 text-xs font-bold">
                  {inativos.length}
                </span>
                {t18n('products.inactive')}
              </button>
            </div>
          </div>

          {/* Content */}
          <div>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                {loading && (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`imovel-grid-skeleton-${i}`}
                      className="h-96 rounded-2xl bg-gradient-to-br from-white/5 to-white/5 border border-white/10 animate-pulse"
                    />
                  ))
                )}
                {!loading && filteredList.length === 0 && (
                  <div className="lg:col-span-2 xl:col-span-2">{EmptyState}</div>
                )}
                {!loading && filteredList.map((item) => (
                  <Card key={item.id} item={item} />
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-4">
                {loading && (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`imovel-list-skeleton-${i}`}
                      className="h-36 rounded-xl bg-gradient-to-r from-white/5 to-white/5 border border-white/10 animate-pulse"
                    />
                  ))
                )}
                {!loading && filteredList.length === 0 && (
                  <div>{EmptyState}</div>
                )}
                {!loading && filteredList.map((item) => (
                  <Row key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* No Team Modal */}
          {showNoTeamModal && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNoTeamModal(false)} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border border-white/10 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t18n('products.teamRequired')}</h3>
                    <p className="text-sm text-gray-400">{t18n('products.teamRequiredDescription')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNoTeamModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition"
                  >
                    {t18n('common.close')}
                  </button>
                  <Link
                    to="/equipe"
                    className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium hover:scale-105 transition text-center"
                  >
                    {t18n('products.createTeam')}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Popup de Filtros */}
          {showFilterPopup && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowFilterPopup(false)} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900/98 border border-gray-300 dark:border-cyan-500/30 rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 dark:bg-cyan-500/20 border border-blue-400/40 dark:border-cyan-400/40 flex items-center justify-center">
                      <Filter className="w-6 h-6 text-blue-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t18n('products.filters')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t18n('products.filtersSubtitle')}</p>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="mb-6 min-h-[200px] p-6 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  {/* Filtros Padrão */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t18n('products.category')}</label>
                      <input
                        type="text"
                        value={filters.categoria || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, categoria: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 focus:border-transparent"
                        placeholder={t18n('products.enterCategory')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t18n('products.minPrice')}</label>
                      <input
                        type="number"
                        value={filters.precoMin || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, precoMin: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 focus:border-transparent"
                        placeholder="R$ 0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t18n('products.maxPrice')}</label>
                      <input
                        type="number"
                        value={filters.precoMax || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, precoMax: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 focus:border-transparent"
                        placeholder="R$ 0"
                      />
                    </div>
                  </div>
                  {/* Campos Personalizados */}
                  <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t18n('products.customFieldsTitle')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customFields.filter(f => f.show_in_filters).length > 0 ? (
                        customFields.filter(f => f.show_in_filters).map(field => (
                          <div key={field.id}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.field_label}</label>
                            {field.field_type === 'text' && (
                              <input
                                type="text"
                                value={filters.customFields?.[field.id] || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, customFields: { ...prev.customFields || {}, [field.id]: e.target.value } }))}
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 focus:border-transparent"
                                placeholder={t18n('products.searchBy', { field: field.field_label })}
                              />
                            )}
                            {field.field_type === 'number' && (
                              <input
                                type="number"
                                value={filters.customFields?.[field.id] || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, customFields: { ...prev.customFields || {}, [field.id]: e.target.value ? Number(e.target.value) : '' } }))}
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 focus:border-transparent"
                                placeholder={t18n('products.searchBy', { field: field.field_label })}
                              />
                            )}
                            {field.field_type === 'select' && field.field_options && (
                              <select
                                value={filters.customFields?.[field.id] || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, customFields: { ...prev.customFields || {}, [field.id]: e.target.value } }))}
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 focus:border-transparent"
                              >
                                <option value="">{t18n('common.all')}</option>
                                {field.field_options.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            )}
                            {(field.field_type === 'boolean' || field.field_type === 'date' || field.field_type === 'datetime') && (
                              <select
                                value={filters.customFields?.[field.id] || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, customFields: { ...prev.customFields || {}, [field.id]: e.target.value } }))}
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 focus:border-transparent"
                              >
                                <option value="">{t18n('common.all')}</option>
                                {field.field_type === 'boolean' && (
                                  <>
                                    <option value="true">{t18n('common.yes')}</option>
                                    <option value="false">{t18n('common.no')}</option>
                                  </>
                                )}
                              </select>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-500 col-span-full">{t18n('products.noCustomFieldsFilter')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer com Botões */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFilterPopup(false)}
                    className="flex-1 px-5 py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all font-medium"
                  >
                    {t18n('common.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      // Aqui você vai aplicar os filtros
                      setShowFilterPopup(false)
                    }}
                    className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 dark:from-cyan-500 dark:to-cyan-600 text-white font-bold hover:from-blue-700 hover:to-blue-800 dark:hover:from-cyan-600 dark:hover:to-cyan-700 transition-all shadow-lg hover:shadow-blue-500/40 dark:hover:shadow-cyan-500/40 hover:scale-105 active:scale-95"
                  >
                    {t18n('products.applyFilters')}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Modal de Confirmação de Exclusão em Lote */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/98 border border-rose-500/30 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-rose-500/20">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-7 h-7 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{t18n('products.confirmDeleteTitle')}</h3>
                    <p className="text-sm text-gray-400">{t18n('products.cannotUndo')}</p>
                  </div>
                </div>

                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-400/20">
                  <p className="text-sm text-rose-200 mb-2">
                    {t18n('products.confirmDeleteBody', { count: selectedIds.size })}
                  </p>
                  <p className="text-xs text-rose-300/80">
                    {t18n('products.bulkConfirmDependencies')}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all font-medium"
                  >
                    {t18n('common.cancel')}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-rose-500/40 hover:scale-105 active:scale-95"
                  >
                    {t18n('products.deleteAll')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
