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
  Check,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import ImportCsv from '../components/imoveis/ImportCsvNew'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'
import { isValidUrl } from '../lib/urlValidation'
import type { ProdutoFiltros } from '../types/produtos'
import { fetchProdutoFiltroOptions, ProdutoFiltroOptions } from '../services/produtoFiltersService'
import { deleteProdutosInBulk } from '../services/produtoService'

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
  updated_at: string
  // Campos herdados de produtos
  filtros?: ProdutoFiltros | null
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
  disponivel: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/50 dark:border-emerald-400/20',
  reservado: 'bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-400/50 dark:border-cyan-400/20',
  vendido: 'bg-slate-200 dark:bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-400/50 dark:border-slate-400/20',
  alugado: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-400/50 dark:border-amber-400/20',
  indisponivel: 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-400/50 dark:border-rose-400/20',
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

// ============================
// Página — Imóveis
// ============================
export default function Imoveis() {
  const { tenant, member } = useAuthStore()
  const { canAddProduct, maxProducts, hasActiveSubscription } = useSubscriptionLimits()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [showNoTeamModal, setShowNoTeamModal] = useState(false)
  const [tab, setTab] = useState<'ativos' | 'inativos'>('ativos')
  const [loading, setLoading] = useState<boolean>(true)
  const [list, setList] = useState<ImovelRow[]>([])
  const [refreshKey, setRefreshKey] = useState<number>(0)
  const [showImportModal, setShowImportModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isMobile, setIsMobile] = useState(false)
  const [filters, setFilters] = useState<ImovelFilters>({ status: 'todos', tipo: 'todos', finalidade: 'todos' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filtroOptions, setFiltroOptions] = useState<ProdutoFiltroOptions>(EMPTY_FILTER_OPTIONS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentProductCount, setCurrentProductCount] = useState(0)

  // Debug
  useEffect(() => {
    console.log('🔍 [Imoveis] VALORES:', {
      hasActiveSubscription,
      maxProducts,
      currentProductCount
    })
  }, [hasActiveSubscription, maxProducts, currentProductCount])

  const handleEdit = useCallback((item: ImovelRow) => {
    // Navegar diretamente para a página de edição
    navigate(`/imoveis/editar/${item.id}`)
  }, [navigate])

  const handleDelete = useCallback(async (item: ImovelRow) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span>{t('properties.confirmDeleteProperty', { title: item.titulo })}</span>
        <div className="text-xs text-amber-400 mb-2">
          {t('properties.deletePropertyWarning')}
        </div>
        <div className="flex gap-2">
          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            onClick={async () => {
              toast.dismiss(t.id)
              try {
                console.log('[DEBUG] Iniciando exclusão do produto:', item.id)
                
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
                
                // Verificar erros nas consultas (apenas logar, não falhar)
                if (tarefasResult.error) {
                  console.warn('[DEBUG] Erro ao verificar tarefas:', tarefasResult.error)
                }
                
                if (tarefasProdutosResult.error) {
                  console.warn('[DEBUG] Erro ao verificar tarefas_produtos:', tarefasProdutosResult.error)
                }
                
                const tarefas = tarefasResult.data || []
                const tarefasProdutos = tarefasProdutosResult.data || []
                const clienteProdutos = clienteProdutosResult.data || []
                
                console.log('[DEBUG] Dependências encontradas:', {
                  tarefas: tarefas.length,
                  tarefasProdutos: tarefasProdutos.length,
                  clienteProdutos: clienteProdutos.length
                })
                
                // 2. Se houver dependências, mostrar resumo e pedir confirmação
                const totalDependencias = tarefas.length + tarefasProdutos.length + clienteProdutos.length
                
                if (totalDependencias > 0) {
                  let mensagem = `Este produto possui ${totalDependencias} dependência(s):\n\n`
                  
                  if (tarefas.length > 0) {
                    mensagem += `📋 Tarefas (${tarefas.length}):\n`
                    tarefas.slice(0, 3).forEach((t: { titulo: string }) => {
                      mensagem += `  • ${t.titulo}\n`
                    })
                    if (tarefas.length > 3) mensagem += `  • ... e mais ${tarefas.length - 3}\n`
                    mensagem += '\n'
                  }
                  
                  if (tarefasProdutos.length > 0) {
                    mensagem += `🔗 Relações tarefas-produtos: ${tarefasProdutos.length}\n\n`
                  }
                  
                  if (clienteProdutos.length > 0) {
                    mensagem += `👥 Relações cliente-produto: ${clienteProdutos.length}\n\n`
                  }
                  
                  mensagem += 'Todas as dependências serão removidas automaticamente.\n\nDeseja continuar com a exclusão?'
                  
                  const confirmaRemocao = window.confirm(mensagem)
                  
                  if (!confirmaRemocao) {
                    toast('Exclusão cancelada pelo usuário')
                    return
                  }
                  
                  // 3. Remover dependências na ordem correta
                  console.log('[DEBUG] Removendo dependências...')
                  
                  // Primeiro: tarefas_produtos (tabela de junção)
                  if (tarefasProdutos.length > 0) {
                    console.log('[DEBUG] Removendo tarefas_produtos...')
                    const { error: deleteTarefasProdutosError } = await supabase
                      .from('tarefas_produtos')
                      .delete()
                      .eq('produto_id', item.id)
                    
                    if (deleteTarefasProdutosError) {
                      console.error('[DEBUG] Erro ao remover tarefas_produtos:', deleteTarefasProdutosError)
                      throw new Error('Erro ao remover relações tarefas-produtos')
                    }
                  }
                  
                  // Segundo: cliente_produtos (se existir)
                  if (clienteProdutos.length > 0) {
                    console.log('[DEBUG] Removendo cliente_produtos...')
                    const { error: deleteClienteProdutosError } = await supabase
                      .from('cliente_produtos')
                      .delete()
                      .eq('produto_id', item.id)
                    
                    if (deleteClienteProdutosError) {
                      console.error('[DEBUG] Erro ao remover cliente_produtos:', deleteClienteProdutosError)
                      // Não falhar se a tabela não existir
                    }
                  }
                  
                  // Terceiro: atualizar tarefas (remover referência ao produto)
                  if (tarefas.length > 0) {
                    console.log('[DEBUG] Atualizando tarefas (removendo produto_id)...')
                    const { error: updateTarefasError } = await supabase
                      .from('tarefas')
                      .update({ produto_id: null })
                      .eq('produto_id', item.id)
                    
                    if (updateTarefasError) {
                      console.error('[DEBUG] Erro ao atualizar tarefas:', updateTarefasError)
                      throw new Error('Erro ao atualizar tarefas relacionadas')
                    }
                  }
                  
                  console.log('[DEBUG] Dependências removidas com sucesso')
                }
                
                // 4. Agora excluir o produto
                console.log('[DEBUG] Excluindo produto...')
                const { error: deleteImovelError } = await supabase
                  .from('produtos')
                  .delete()
                  .eq('id', item.id)
                
                if (deleteImovelError) {
                  console.error('[DEBUG] Erro ao excluir produto:', deleteImovelError)
                  throw deleteImovelError
                }
                
                console.log('[DEBUG] Produto excluído com sucesso')
                setRefreshKey((k) => k + 1)
                
                // Mensagem de sucesso personalizada
                if (totalDependencias > 0) {
                  toast.success(t('properties.deleteSuccessWithDependencies', { count: totalDependencias }))
                } else {
                  toast.success(t('properties.deleteSuccessSingle'))
                }
                
              } catch (e: unknown) {
                console.error('[DEBUG] Erro ao excluir produto:', e)
                
                // Mensagens de erro mais específicas
                const error = e as { code?: string; message?: string }
                if (error?.code === '23503') {
                  toast.error(t('properties.dependencyError'))
                } else if (error?.message?.includes('foreign key')) {
                  toast.error(t('properties.foreignKeyError'))
                } else if (error?.message?.includes('dependência')) {
                  toast.error(t('properties.genericError', { message: error.message }))
                } else {
                  toast.error(t('properties.deleteError', { message: error?.message || 'Erro desconhecido' }))
                }
              }
            }}
          >
            {t('properties.deleteWithDependencies')}
          </button>
          <button
            className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
            onClick={() => toast.dismiss(t.id)}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }, [])

  const fetchImoveis = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    
    try {
      // ✅ LÓGICA DE PERMISSÃO:
      // - Owner vê TODOS os produtos da equipe (tenant_id)
      // - Vendedor vê APENAS os produtos que ELE criou (user_id)
      // Selecionar apenas colunas universais existentes para evitar erros
      const query = supabase
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

      // Por enquanto, vamos buscar todos os produtos do tenant
      // (o filtro por proprietário será implementado depois quando tivermos a coluna correta)

      const { data, error } = await query.order('created_at', { ascending: false })
        
      setLoading(false)
      
      if (error) {
        console.error('[PRODUTOS] ❌ Erro ao buscar:', error.message)
        return
      }
      
      console.log('[PRODUTOS] Total retornado:', data?.length || 0)
      
      // ✅ Converter dados para o formato esperado pelo componente
      const imoveisFormatados = (data ?? []).map(item => ({
        id: item.id,
        tenant_id: item.tenant_id,
        titulo: item.nome, // ✅ nome → titulo
        nome: item.nome,
        descricao: item.descricao,
        tipo: (item.tipo || 'apartamento') as ImovelTipo, // ✅ Usar valor do banco ou padrão
        finalidade: (item.finalidade || 'venda') as ImovelFinalidade, // ✅ Usar valor do banco ou padrão
        status: (item.ativo === false ? 'indisponivel' : 'disponivel') as ImovelStatus, // ✅ Converter ativo para status
        ativo: item.ativo !== false, // ✅ Usar valor do banco
        valor: item.preco, // ✅ Usar preco
        preco_base: item.preco, // ✅ Usar preco
        preco: item.preco,
        area_total: item.area_total, // ✅ Usar valor do banco
        area_construida: item.area_construida, // ✅ Usar valor do banco
        quartos: item.quartos, // ✅ Usar valor do banco
        banheiros: item.banheiros, // ✅ Usar valor do banco
        vagas_garagem: item.vagas_garagem, // ✅ Usar valor do banco
        endereco: item.endereco, // ✅ Usar valor do banco
        bairro: item.bairro, // ✅ Usar valor do banco
        cidade: item.cidade, // ✅ Usar valor do banco
        cep: item.cep, // ✅ Usar valor do banco
        destaque: item.destaque,
        capa_url: item.capa_url,
        tags: item.tags,
        created_at: item.created_at,
        updated_at: item.updated_at,
        // Novos campos dos produtos
        filtros: typeof item.filtros === 'string' ? JSON.parse(item.filtros || '{}') : item.filtros,
      }))
      
      setList(imoveisFormatados as ImovelRow[])
    } catch (err) {
      console.error('❌ ERRO INESPERADO AO BUSCAR PRODUTOS:', err)
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

  // Buscar contagem de produtos
  useEffect(() => {
    const fetchCount = async () => {
      if (!tenantId) return
      const { count } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      setCurrentProductCount(count || 0)
    }
    fetchCount()
  }, [tenantId])

  // Força visualização em grid no mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 // md breakpoint
      setIsMobile(mobile)
      if (mobile && viewMode === 'list') {
        setViewMode('grid')
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [viewMode])

  const confirmBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return
    setShowDeleteConfirm(true)
  }, [selectedIds])

  const handleBulkDelete = useCallback(async () => {
    setShowDeleteConfirm(false)
    const idsArray = Array.from(selectedIds)
    const loadingToast = toast.loading(t('properties.bulkDeleteLoading', { count: idsArray.length }))

    try {
      const results = await deleteProdutosInBulk(idsArray)

      toast.dismiss(loadingToast)

      if (results.success > 0) {
        toast.success(t('properties.bulkDeleteSuccess', { count: results.success }))
        setSelectedIds(new Set())
        setSelectMode(false)
        setRefreshKey(k => k + 1)
      }

      if (results.failed > 0) {
        const errorMessages = results.errors.slice(0, 3).map(e => `• ${e.error}`).join('\n')
        const moreErrors = results.errors.length > 3 ? `\n... ${t('properties.andMoreErrors', { count: results.errors.length - 3 })}` : ''
        toast.error(t('properties.bulkDeleteFailed', { count: results.failed, errors: errorMessages + moreErrors }), { duration: 6000 })
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('[DEBUG] Erro na exclusão em lote:', error)
      toast.error(t('properties.bulkDeleteGenericError'))
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

  const filteredByStatus = useMemo(() => {
    let filtered = list

    // Aplicar filtros
    if (filters.status && filters.status !== 'todos') {
      filtered = filtered.filter(item => item.status === filters.status)
    }

    if (filters.tipo && filters.tipo !== 'todos') {
      filtered = filtered.filter(item => item.tipo === filters.tipo)
    }

    if (filters.finalidade && filters.finalidade !== 'todos') {
      filtered = filtered.filter(item => item.finalidade === filters.finalidade)
    }

    if (filters.valorMin !== undefined) {
      filtered = filtered.filter(item => {
        const valor = item.valor || item.preco_base || item.preco || item.price || 0
        return valor >= (filters.valorMin || 0)
      })
    }

    if (filters.valorMax !== undefined) {
      filtered = filtered.filter(item => {
        const valor = item.valor || item.preco_base || item.preco || item.price || 0
        return valor <= (filters.valorMax || Infinity)
      })
    }

    if (filters.quartos !== undefined) {
      filtered = filtered.filter(item => item.quartos === filters.quartos)
    }

    if (filters.banheiros !== undefined) {
      filtered = filtered.filter(item => item.banheiros === filters.banheiros)
    }

    if (filters.vagas !== undefined) {
      filtered = filtered.filter(item => item.vagas_garagem === filters.vagas)
    }

    // Filtros dos produtos
    if (filters.incorporadora) {
      filtered = filtered.filter(item => item.filtros?.incorporadora === filters.incorporadora)
    }

    if (filters.empreendimento) {
      filtered = filtered.filter(item => item.filtros?.empreendimento === filters.empreendimento)
    }

    if (filters.fase) {
      filtered = filtered.filter(item => item.filtros?.fase === filters.fase)
    }

    if (filters.regiao) {
      filtered = filtered.filter(item => item.filtros?.regiao === filters.regiao)
    }

    if (filters.bairro) {
      filtered = filtered.filter(item => item.filtros?.bairro === filters.bairro)
    }

    if (filters.tipologia && filters.tipologia.length > 0) {
      filtered = filtered.filter(item => {
        const itemTipologias = item.filtros?.tipologia || []
        return filters.tipologia!.some(tip => itemTipologias.includes(tip))
      })
    }

    if (filters.modalidade && filters.modalidade.length > 0) {
      filtered = filtered.filter(item => {
        const itemModalidades = item.filtros?.modalidade || []
        return filters.modalidade!.some(mod => itemModalidades.includes(mod))
      })
    }

    if (filters.financiamento_incorporadora && filters.financiamento_incorporadora !== 'any') {
      const expectedValue = filters.financiamento_incorporadora === 'true'
      filtered = filtered.filter(item => item.filtros?.financiamento_incorporadora === expectedValue)
    }

    if (filters.decorado && filters.decorado !== 'any') {
      const expectedValue = filters.decorado === 'true'
      filtered = filtered.filter(item => item.filtros?.decorado === expectedValue)
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
      <div className={`group rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border transition-all duration-300 shadow-2xl hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-500/40 overflow-hidden backdrop-blur-sm flex h-auto ${
        isSelected ? 'border-cyan-400/80 ring-2 ring-cyan-400/40 from-cyan-500/20 to-cyan-600/10' : 'border-white/10 hover:border-cyan-400/40 hover:from-white/15 hover:to-white/10'
      }`}>
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
                  <div className="text-xs text-gray-500">{t('properties.noImage')}</div>
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
                  ⭐ DESTAQUE
                </span>
              </div>
            )}

            {/* Ações - aparecem no hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
              <button
                onClick={() => handleEdit(item)}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white hover:text-cyan-300 border border-white/30 backdrop-blur-sm transition-all hover:scale-110 shadow-lg"
                title={t('properties.editProperty')}
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(item)}
                className="w-12 h-12 bg-white/20 hover:bg-rose-500/40 rounded-xl flex items-center justify-center text-white hover:text-rose-200 border border-white/30 backdrop-blur-sm transition-all hover:scale-110 shadow-lg"
                title={t('properties.deleteProperty')}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Informações - 4:3 */}
        <div className="p-3 sm:p-5 w-1/2 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-2 sm:mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white truncate text-base sm:text-lg leading-tight">{item.titulo}</h3>
                {item.filtros?.preco_min && (
                  <div className="text-emerald-600 dark:text-emerald-300 font-semibold text-xs sm:text-sm mt-1">
                    {t('properties.startingFrom')} {currencyBRL(typeof item.filtros?.preco_min === 'string' ? Number(item.filtros?.preco_min) : Number(item.filtros?.preco_min))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <p className="text-xs text-slate-600 dark:text-gray-400 line-clamp-2 mb-2 sm:mb-4 leading-relaxed">{item.descricao ?? t('properties.noDescription')}</p>

          {/* Property Features Icons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs mb-3 sm:mb-5">
            {/* Basic property info always shown */}
            <div className="flex items-center gap-1 text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-white/5 px-2 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-white/10">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-500 dark:text-cyan-400" />
              <span className="text-xs">{item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}</span>
            </div>
            
            {/* Property characteristics with icons */}
            {item.area_total && (
              <div className="flex items-center gap-1 text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-white/5 px-2 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                <Ruler className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="text-xs font-medium">{item.area_total}m²</span>
              </div>
            )}
            
            {item.quartos && (
              <div className="flex items-center gap-1 text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-white/5 px-2 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                <Bed className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-900 dark:text-rose-400" />
                <span className="text-xs font-medium">{item.quartos}</span>
              </div>
            )}
            
            {item.banheiros && (
              <div className="flex items-center gap-1 text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-white/5 px-2 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                <Bath className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 dark:text-blue-400" />
                <span className="text-xs font-medium">{item.banheiros}</span>
              </div>
            )}
            
            {item.vagas_garagem && (
              <div className="flex items-center gap-1 text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-white/5 px-2 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                <Car className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="text-xs font-medium">{item.vagas_garagem}</span>
              </div>
            )}
          </div>

          {/* Tipologia e Modalidade - Apenas no desktop */}
          {item.filtros && (item.filtros.tipologia?.length || item.filtros.modalidade?.length) && (
            <div className="hidden sm:flex flex-wrap gap-2 mt-2">
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-800"
                >
                  <Building2 className="w-3 h-3" />
                  {mod}
                </span>
              ))}
            </div>
          )}

          {/* Tags and additional info */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs mb-3 sm:mb-5 mt-3 sm:mt-5">
            <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-purple-500/15 to-purple-600/15 border border-purple-700/30 text-purple-800 font-semibold">
              {item.finalidade.replace('_', ' ').toUpperCase()}
            </span>
            
            {item.tags?.slice(0, 2).map((t, i) => (
              <span key={i} className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/10 border border-white/20 text-gray-300 text-xs font-medium">
                #{t}
              </span>
            ))}
          </div>

          <Link
            to={`/imoveis/${item.id}`}
            className="flex items-center justify-center gap-2 w-full py-2 sm:py-3 text-xs sm:text-sm font-bold text-white rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-500 to-cyan-600 hover:from-cyan-600 hover:via-cyan-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-cyan-500/40 hover:shadow-2xl group-hover:scale-[1.02] active:scale-95 mt-auto"
          >
            {t('properties.viewDetails')} <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
          </Link>
        </div>
      </div>
    )
  }

  function Row({ item }: { item: ImovelRow }) {
    const isSelected = selectedIds.has(item.id)

    return (
      <div className={`group rounded-xl border bg-gradient-to-r transition-all shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm overflow-hidden ${
        isSelected ? 'border-cyan-400/80 ring-2 ring-cyan-400/40 from-cyan-500/20 to-cyan-600/10' : 'border-slate-200 dark:border-white/10 from-white/95 dark:from-white/8 to-white/90 dark:to-white/5 hover:from-white/98 dark:hover:from-white/12 hover:to-white/95 dark:hover:to-white/10 hover:border-cyan-400/40'
      }`}>
        <div className="flex flex-col md:flex-row gap-5 p-5">
          {selectMode && (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(item.id)}
            className="w-5 h-5 rounded border-2 border-slate-300 dark:border-white/30 bg-white dark:bg-slate-800/80 checked:bg-cyan-500 checked:border-cyan-400 cursor-pointer"
          />
        </div>
          )}
          {/* Imagem */}
          <div className="w-full md:w-48 h-36 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 dark:from-slate-900 to-slate-200 dark:to-slate-800 flex-shrink-0 flex items-center justify-center shadow-lg">
        {isValidUrl(item.capa_url) ? (
          <img
            src={item.capa_url as string}
            alt={item.titulo}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="text-center text-slate-400 dark:text-slate-400">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-xs text-slate-500 dark:text-gray-500">{t('properties.noImage')}</div>
          </div>
        )}
          </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 flex flex-col gap-4 text-slate-900 dark:text-white">
        {/* Linha 1: Título + Status + Preço */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{item.titulo}</h3>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono break-all">{item.id}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border backdrop-blur-md ${statusStyle[item.status]}`}>
            {item.status.replace('_', ' ').toUpperCase()}
          </span>
          {item.destaque && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-purple-300/50 bg-gradient-to-r from-purple-500/30 to-pink-500/20 text-purple-700 dark:text-purple-100 backdrop-blur-md">
              ⭐ DESTAQUE
            </span>
          )}
            </div>
          </div>
          {item.filtros?.preco_min && (
            <div className="text-emerald-600 dark:text-emerald-300 font-bold text-xl whitespace-nowrap">
          {t('properties.startingFrom')}{' '}
          {currencyBRL(
            typeof item.filtros?.preco_min === 'string'
              ? Number(item.filtros?.preco_min)
              : Number(item.filtros?.preco_min)
          )}
            </div>
          )}
        </div>

        {/* Linha 2: Localização */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
          <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
          <span className="font-medium">
            {item.bairro && item.cidade ? `${item.bairro}, ${item.cidade}` : item.cidade || t('properties.locationNotInformed')}
          </span>
          <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-gray-300 text-xs ml-auto whitespace-nowrap font-medium">
            {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)} • {item.finalidade.replace('_', ' ')}
          </span>
        </div>

        {/* Linha 3: Características Principais */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-gray-300">
          {item.area_total && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10">
              <Ruler className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span className="font-bold text-slate-900 dark:text-white">{item.area_total}m²</span>
            </div>
          )}
          {item.quartos && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10">
              <Bed className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span className="font-bold text-slate-900 dark:text-white">{item.quartos} {t('properties.bedrooms')}</span>
            </div>
          )}
          {item.banheiros && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10">
              <Bath className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="font-bold text-slate-900 dark:text-white">{item.banheiros} {t('properties.bathrooms')}</span>
            </div>
          )}
          {item.vagas_garagem && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10">
              <Car className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="font-bold text-slate-900 dark:text-white">{item.vagas_garagem} {t('properties.parkingSpaces')}</span>
            </div>
          )}
        </div>

        {/* Linha 4: Ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 mt-auto">
          <div className="flex items-center gap-2">
            <button
          onClick={() => handleEdit(item)}
          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/30 text-sm text-slate-700 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white transition-all font-medium"
            >
          ✏️ {t('properties.editProperty')}
            </button>
            <button
          onClick={() => handleDelete(item)}
          className="px-4 py-2 rounded-lg bg-rose-100 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-400/30 text-sm text-rose-700 dark:text-rose-500 hover:bg-rose-200 dark:hover:bg-rose-500/30 hover:text-rose-900 dark:hover:text-rose-100 transition-all font-medium"
            >
          🗑️ {t('properties.deleteProperty')}
            </button>
          </div>
          <Link
            to={`/imoveis/${item.id}`}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-sm font-bold hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-cyan-500/30"
          >
            {t('properties.viewDetails')} <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
          </div>
        </div>
      </div>
    )
  }

  const EmptyState = (
    <div className="text-center py-24">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center shadow-xl shadow-cyan-500/10">
        <Megaphone className="w-10 h-10 text-cyan-400" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">
        {tab === 'ativos' ? t('properties.emptyActiveTitle') : t('properties.emptyInactiveTitle')}
      </h3>
      <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        {tab === 'ativos'
          ? t('properties.emptyActiveDescription')
          : t('properties.emptyInactiveDescription')}
      </p>
    </div>
  )

  return (
    <div className="min-h-full p-6 bg-white dark:bg-[#0C1326] text-slate-900 dark:text-slate-200">
      {/* Header */}
        <div className="p-3 sm:p-6 border-b border-slate-200 dark:border-white/10 mb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-400">{t('properties.pageTitle')}</div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{t('properties.pageSubtitle')}</h1>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {selectMode && (
              <>
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/40 text-red-600 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">⚠️ A exclusão pode demorar alguns minutos se houver muitos produtos selecionados</span>
                  <span className="sm:hidden">⚠️ Exclusão em lote</span>
                </div>
                <button
                  onClick={selectAll}
                  className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-sm text-cyan-600 hover:bg-cyan-500/20 transition-all shadow-lg"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('properties.selectAll')}</span>
                  <span className="sm:hidden">Todos</span>
                </button>
                <button
                  onClick={deselectAll}
                  className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-lg"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('properties.deselectAll')}</span>
                  <span className="sm:hidden">Nenhum</span>
                </button>
                <button
                  onClick={confirmBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 text-sm text-rose-500 hover:bg-rose-500/20 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('properties.deleteSelected', { count: selectedIds.size })}</span>
                  <span className="sm:hidden">Excluir</span>
                </button>
                <button
                  onClick={toggleSelectMode}
                  className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl border border-slate-500 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-lg"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('common.cancel')}</span>
                </button>
              </>
            )}
            {!selectMode && (
              <>
                <button
                  onClick={toggleSelectMode}
                  className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-sm text-slate-900 dark:text-slate-200 transition-all shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-400/30"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('properties.selectMode')}</span>
                </button>
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-sm text-slate-900 dark:text-slate-200 transition-all shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-400/30"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('properties.filters')}</span>
                </button>
              </>
            )}
            <button
              onClick={() => setViewMode('list')}
              className={`hidden md:flex p-2 rounded-xl border transition-all shadow-lg ${viewMode === 'list' ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-400/30 text-cyan-600 dark:text-cyan-300 shadow-cyan-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'}`}
              aria-label="Ver em lista"
              title={t('properties.viewList')}
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`hidden md:flex p-2 rounded-xl border transition-all shadow-lg ${viewMode === 'grid' ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-400/30 text-cyan-600 dark:text-cyan-300 shadow-cyan-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'}`}
              aria-label="Ver em grade"
              title={t('properties.viewGrid')}
            >
              <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            {!selectMode && (
              <>
                <button
                  onClick={() => setRefreshKey(k => k + 1)}
                  className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all shadow-lg hover:shadow-cyan-500/10"
                  title={t('properties.refresh')}
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {canAddProduct(currentProductCount) ? (
                  <Link
                    to="/imoveis/novo"
                    className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="sm:hidden">Novo</span>
                    <span className="hidden sm:inline">{t('properties.newProperty')}</span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white/60 font-semibold text-sm cursor-not-allowed opacity-70"
                    title={`Limite de ${maxProducts} produtos atingido. Faça upgrade para adicionar mais.`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="sm:hidden">Novo</span>
                    <span className="hidden sm:inline">{t('properties.newProperty')}</span>
                  </button>
                )}

                {canAddProduct(currentProductCount) ? (
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-sm text-slate-900 dark:text-gray-200 transition-all shadow-lg"
                  >
                    <span className="hidden sm:inline">{t('properties.importCsv')}</span>
                    <span className="sm:hidden">Importar</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white/60 font-semibold text-sm cursor-not-allowed opacity-70"
                    title={`Limite de ${maxProducts} produtos atingido. Faça upgrade para importar mais.`}
                  >
                    <span className="hidden sm:inline">{t('properties.importCsv')}</span>
                    <span className="sm:hidden">Importar</span>
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
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 dark:bg-amber-500/20 dark:border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                      {t('properties.limitReached')}
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-300/80 mb-3">
                      {t('properties.limitDescription', { current: currentProductCount, max: maxProducts })}
                    </p>
                    <Link
                      to="/subscribe"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-amber-500/30 hover:scale-105"
                    >
                      <span>{t('properties.upgrade')}</span>
                      <span className="text-xs">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-3">
              <button
                onClick={() => setTab('ativos')}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${
                  tab === 'ativos' 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30 scale-[1.02]' 
                    : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${tab === 'ativos' ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-white'}`}>
                    {ativos.length}
                  </span>
                  {t('properties.activeTab')}
                </span>
              </button>
              <button
                onClick={() => setTab('inativos')}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${
              tab === 'inativos' 
                ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-500/30 scale-[1.02]' 
                : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${tab === 'inativos' ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-white'}`}>
                {inativos.length}
              </span>
              {t('properties.inactiveTab')}
            </span>
          </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {(viewMode === 'grid' || isMobile) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 md:gap-8">
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

          {viewMode === 'list' && !isMobile && (
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('properties.teamRequired')}</h3>
                  <p className="text-sm text-slate-600 dark:text-gray-400">{t('properties.teamRequiredDescription')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNoTeamModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 transition"
                >
                  Fechar
                </button>
                <Link
                  to="/equipe"
                  className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium hover:scale-105 transition text-center"
                >
                  Criar Equipe
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Import CSV Modal */}
        <ImportCsv isOpen={showImportModal} onClose={() => setShowImportModal(false)} tenantId={tenantId} onImported={() => setRefreshKey((k: number) => k + 1)} />

        {/* Popup de Filtros - Melhorado para mobile */}
        {filtersOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm dark:bg-black/80 dark:backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
            <div className="absolute w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] bg-white dark:bg-slate-900/98 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
                <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                    <Filter className="w-5 h-5 text-cyan-400" />
                  </div>
                  {t('properties.filtersTitle')}
                </div>
                <button onClick={() => setFiltersOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition">
                  <X className="w-5 h-5 text-slate-600 dark:text-gray-300" />
                </button>
              </div>
              
              {/* Content Grid - Melhorado para mobile */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    
                    {/* Seção 1: Informações Básicas */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Informações Básicas</h2>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 space-y-4">
                        <div>
                          <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">Status do Imóvel</label>
                          <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as ImovelFilters['status'] }))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-300 dark:border-cyan-400/40 text-slate-900 dark:text-white font-medium hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-400/80 transition-all cursor-pointer dark:dark-select"
                          >
                            <option value="todos">Todos os Status</option>
                            <option value="disponivel">Disponível</option>
                            <option value="reservado">Reservado</option>
                            <option value="vendido">Vendido</option>
                            <option value="alugado">Alugado</option>
                            <option value="indisponivel">Indisponível</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">Tipo de Imóvel</label>
                          <select
                            value={filters.tipo}
                            onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value as ImovelFilters['tipo'] }))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-300 dark:border-cyan-400/40 text-sm text-slate-900 dark:text-white font-medium hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-400/80 transition-all cursor-pointer dark:dark-select"
                          >
                            <option value="todos">Todos os Tipos</option>
                            <option value="studio">Studio</option>
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
                          <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">Finalidade</label>
                          <select
                            value={filters.finalidade}
                            onChange={(e) => setFilters(prev => ({ ...prev, finalidade: e.target.value as ImovelFilters['finalidade'] }))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-300 dark:border-cyan-400/40 text-slate-900 dark:text-white font-medium hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-400/80 transition-all cursor-pointer dark:dark-select"
                          >
                            <option value="todos">Todas as Finalidades</option>
                            <option value="venda">Venda</option>
                            <option value="aluguel">Aluguel</option>
                            <option value="venda_aluguel">Venda e Aluguel</option>
                          </select>
                        </div>
                      </div>

                      {/* Preço */}
                      <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 space-y-4">
                        <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Faixa de Preço
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">Valor Mínimo</label>
                            <input
                              type="number"
                              min="0"
                              value={filters.valorMin || ''}
                              onChange={(e) => setFilters(prev => ({ ...prev, valorMin: e.target.value ? Number(e.target.value) : undefined }))}
                              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400/60"
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
                              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400/60"
                              placeholder="Sem limite"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Propriedades - Melhorado para mobile */}
                      <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 space-y-4">
                        <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Propriedades
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <div className="text-center">
                              <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block text-center">{t('properties.bedroomsLabel')}</label>
                              <input
                                type="number"
                                min="0"
                                value={filters.quartos || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, quartos: e.target.value ? Number(e.target.value) : undefined }))}
                                className="w-full px-2 sm:px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400/60 text-center"
                                placeholder="0+"
                              />
                            </div>
                            <div className="text-center">
                              <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block text-center">{t('properties.bathroomsLabel')}</label>
                              <input
                                type="number"
                                min="0"
                                value={filters.banheiros || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, banheiros: e.target.value ? Number(e.target.value) : undefined }))}
                                className="w-full px-2 sm:px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400/60 text-center"
                                placeholder="0+"
                              />
                            </div>
                            <div className="text-center">
                              <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block text-center">{t('properties.parkingLabel')}</label>
                              <input
                                type="number"
                                min="0"
                                value={filters.vagas || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, vagas: e.target.value ? Number(e.target.value) : undefined }))}
                                className="w-full px-2 sm:px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400/60 text-center"
                                placeholder="0+"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seção 2: Localização e Empreendimento */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Localização</h2>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 space-y-4">
                        <div>
                          <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">{t('properties.builder')}</label>
                          <select
                            value={filters.incorporadora || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, incorporadora: e.target.value || undefined }))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-300 dark:border-purple-400/40 text-sm text-slate-900 dark:text-white font-medium hover:border-slate-400 dark:hover:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-400/80 transition-all cursor-pointer dark:dark-select"
                          >
                            <option value="">{t('properties.allBuilders')}</option>
                            {filtroOptions.incorporadoras.map((value) => (
                              <option key={`f-inc-${value}`} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">{t('properties.development')}</label>
                          <select
                            value={filters.empreendimento || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, empreendimento: e.target.value || undefined }))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-300 dark:border-purple-400/40 text-sm text-slate-900 dark:text-white font-medium hover:border-slate-400 dark:hover:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-400/80 transition-all cursor-pointer dark:dark-select"
                          >
                            <option value="">{t('properties.allDevelopments')}</option>
                            {filtroOptions.empreendimentos.map((value) => (
                              <option key={`f-emp-${value}`} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">{t('properties.phase')}</label>
                          <select
                            value={filters.fase || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, fase: e.target.value || undefined }))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-300 dark:border-purple-400/40 text-sm text-slate-900 dark:text-white font-medium hover:border-slate-400 dark:hover:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-400/80 transition-all cursor-pointer dark:dark-select"
                          >
                            <option value="">Todas as Fases</option>
                            {['LANÇAMENTO', 'EM OBRAS', 'PRONTO', ...filtroOptions.fases.filter((fase) =>
                              !['LANÇAMENTO', 'EM OBRAS', 'PRONTO'].includes(fase)
                            )].map((value) => (
                              <option key={`f-fase-${value}`} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">{t('properties.region')}</label>
                            <select
                              value={filters.regiao || ''}
                              onChange={(e) => setFilters(prev => ({ ...prev, regiao: e.target.value || undefined }))}
                              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-300 dark:border-purple-400/40 text-sm text-slate-900 dark:text-white font-medium hover:border-slate-400 dark:hover:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-400/80 transition-all cursor-pointer dark:dark-select"
                            >
                              <option value="">{t('properties.allRegions')}</option>
                              {filtroOptions.regioes.map((value) => (
                                <option key={`f-reg-${value}`} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">{t('properties.neighborhood')}</label>
                            <select
                              value={filters.bairro || ''}
                              onChange={(e) => setFilters(prev => ({ ...prev, bairro: e.target.value || undefined }))}
                              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-300 dark:border-purple-400/40 text-sm text-slate-900 dark:text-white font-medium hover:border-slate-400 dark:hover:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-400/80 transition-all cursor-pointer dark:dark-select"
                            >
                              <option value="">{t('properties.allNeighborhoods')}</option>
                              {filtroOptions.bairros.map((value) => (
                                <option key={`f-bairro-${value}`} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>                    {/* Seção 3: Especificações Avançadas */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('properties.specifications')}</h2>
                      </div>
                      
                      {/* Tipologia - Melhorada para mobile */}
                      <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 space-y-4">
                        <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          {t('properties.typology')}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {filtroOptions.tipologias.length === 0 && (
                            <span className="col-span-full text-sm text-slate-400 dark:text-slate-400 italic">{t('properties.noTypologyAvailable')}</span>
                          )}
                          {filtroOptions.tipologias.map((value) => {
                            const active = filters.tipologia?.includes(value) || false
                            return (
                              <button
                                key={`chip-tipologia-${value}`}
                                type="button"
                                onClick={() => {
                                  setFilters(prev => {
                                    const current = prev.tipologia || []
                                    const exists = current.includes(value)
                                    return {
                                      ...prev,
                                      tipologia: exists 
                                        ? current.filter(item => item !== value)
                                        : [...current, value]
                                    }
                                  })
                                }}
                                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                                  active
                                    ? 'border-rose-400/60 bg-rose-500/20 text-rose-100 shadow-lg shadow-rose-500/20'
                                    : 'border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20'
                                }`}
                              >
                                {value}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Modalidade - Melhorada para mobile */}
                      <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 space-y-4">
                        <h3 className="text-sm font-semibold text-pink-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                          {t('properties.modality')}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {filtroOptions.modalidades.length === 0 && (
                            <span className="col-span-full text-sm text-slate-500 dark:text-slate-400 italic">{t('properties.noModalityAvailable')}</span>
                          )}
                          {filtroOptions.modalidades.map((value) => {
                            const active = filters.modalidade?.includes(value) || false
                            return (
                              <button
                                key={`chip-modalidade-${value}`}
                                type="button"
                                onClick={() => {
                                  setFilters(prev => {
                                    const current = prev.modalidade || []
                                    const exists = current.includes(value)
                                    return {
                                      ...prev,
                                      modalidade: exists 
                                        ? current.filter(item => item !== value)
                                        : [...current, value]
                                    }
                                  })
                                }}
                                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                                  active
                                    ? 'border-pink-400/60 bg-pink-500/20 text-pink-100 shadow-lg shadow-pink-500/20'
                                    : 'border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20'
                                }`}
                              >
                                {value}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Características Especiais */}
                      <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 space-y-4">
                        <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {t('properties.specialFeatures')}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">{t('properties.builderFinancing')}</label>
                            <select
                              value={filters.financiamento_incorporadora || 'any'}
                              onChange={(e) => setFilters(prev => ({ ...prev, financiamento_incorporadora: e.target.value as ImovelFilters['financiamento_incorporadora'] }))}
                              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/60 dark:dark-select"
                            >
                              <option value="any">{t('properties.any')}</option>
                              <option value="true">{t('properties.available')}</option>
                              <option value="false">{t('properties.notAvailable')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2 block">{t('properties.decoratedApartment')}</label>
                            <select
                              value={filters.decorado || 'any'}
                              onChange={(e) => setFilters(prev => ({ ...prev, decorado: e.target.value as ImovelFilters['decorado'] }))}
                              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/60 dark:dark-select"
                            >
                              <option value="any">{t('properties.any')}</option>
                              <option value="true">{t('properties.yes')}</option>
                              <option value="false">{t('properties.no')}</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer com botões - Melhorado para mobile */}
              <div className="flex-shrink-0 p-4 sm:p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => setFilters({ status: 'todos', tipo: 'todos', finalidade: 'todos' })}
                    className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 font-medium transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-3"
                  >
                    <X className="w-4 sm:w-5 h-4 sm:h-5" />
                    <span className="text-sm sm:text-base">{t('properties.clearAllFilters')}</span>
                  </button>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white border border-white/10 font-medium hover:scale-105 active:scale-95 transition-all duration-200 transform flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/25"
                  >
                    <Filter className="w-4 sm:w-5 h-4 sm:h-5" />
                    <span className="text-sm sm:text-base">{t('properties.applyFilters')}</span>
                  </button>
                </div>
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
                  <h3 className="text-xl font-bold text-white">{t('properties.confirmDeleteTitle')}</h3>
                  <p className="text-sm text-gray-400">{t('properties.confirmDeleteSubtitle')}</p>
                </div>
              </div>

              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-400/20">
                <p className="text-sm text-rose-200 mb-2">
                  {t('properties.confirmDeleteBody', { count: selectedIds.size })}
                </p>
                <p className="text-xs text-rose-300/80">
                  {t('properties.confirmDeleteWarning')}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-rose-500/40 hover:scale-105 active:scale-95"
                >
                  {t('properties.deleteAll')}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
