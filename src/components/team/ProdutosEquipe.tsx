import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Loader, Image as ImageIcon, Filter, Grid3x3, List, ExternalLink, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProdutosEquipe, deleteProdutosSistema } from '../../services/produtosEquipeService'
import { isValidUrl } from '../../lib/urlValidation'
import { getCustomFields } from '../../services/customFieldsService'
import type { CustomFieldDefinition } from '../../types/customFields'
import ProdutoDetalhesEquipe from './ProdutoDetalhesEquipe'

interface Produto {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  tipo: string | null
  valor: number | null
  preco?: number | null
  price?: number | null
  capa_url: string | null
  status: string
  destaque: boolean
  created_at: string
  ativo?: boolean
  area_total?: number | null
  area_construida?: number | null
  quartos?: number | null
  banheiros?: number | null
  vagas_garagem?: number | null
  endereco?: string | null
  bairro?: string | null
  cidade?: string | null
  cep?: string | null
  finalidade?: string | null
  categoria?: string | null
  tags?: string[] | null
  custom_fields?: Record<string, string | number | boolean | null>
  filtros?: {
    empreendimento?: string
    incorporadora?: string
    fase?: string
    regiao?: string
    bairro?: string
    preco_min?: number
    metragem_min?: number
    metragem_max?: number
    tipologia?: string[]
    modalidade?: string[]
    financiamento_incorporadora?: boolean
    decorado?: boolean
  } & Record<string, any> | null
  entrega?: string | null
  galeria?: string[]
  anexos?: string[]
}

interface ProdutosEquipeProps {
  tenantId: string
}

interface Filtros {
  tipo?: string | 'todos'
  finalidade?: string | 'todos'
  texto?: string
  valorMin?: number
  valorMax?: number
  quartos?: number
  banheiros?: number
  vagas?: number
  incorporadora?: string
  empreendimento?: string
  fase?: string
  regiao?: string
  bairro?: string
  tipologia?: string[]
  modalidade?: string
  financiamento_incorporadora?: 'any' | 'true' | 'false'
  decorado?: 'any' | 'true' | 'false'
}

// Tipos da página Produtos
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

// ============================
// Helpers
// ============================
const currencyBRL = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const statusStyle: Record<string, string> = {
  disponivel: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/50 dark:border-emerald-400/20',
  reservado: 'bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-400/50 dark:border-cyan-400/20',
  vendido: 'bg-slate-200 dark:bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-400/50 dark:border-slate-400/20',
  alugado: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-400/50 dark:border-amber-400/20',
  indisponivel: 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-400/50 dark:border-rose-400/20',
}

const ProdutosEquipe: React.FC<ProdutosEquipeProps> = ({ tenantId }) => {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros] = useState<Filtros>({ 
    tipo: 'todos', 
    finalidade: 'todos', 
    texto: '',
    financiamento_incorporadora: 'any',
    decorado: 'any'
  })
  const [showFilterPopup, setShowFilterPopup] = useState(false)
  const [filters, setFilters] = useState<ImovelFilters>({})
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deletingSystem, setDeletingSystem] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  // Carregar campos personalizados quando o popup de filtros abrir
  useEffect(() => {
    if (showFilterPopup && tenantId) {
      getCustomFields(tenantId).then(fields => {
        setCustomFields(fields)
      }).catch(error => {
        console.error('Erro ao carregar campos personalizados:', error)
      })
    }
  }, [showFilterPopup, tenantId])

  // Card view for a single product
  function Card({ item }: { item: Produto }) {
    return (
      <div className={`group rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border transition-all duration-300 shadow-2xl hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-500/40 overflow-hidden backdrop-blur-sm flex h-auto border-white/10 hover:border-cyan-400/40 hover:from-white/15 hover:to-white/10`}>
        {/* Imagem - 4:3 */}
        <div className="relative w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden flex-shrink-0 aspect-video">
          <div className="w-full h-full">
            {isValidUrl(item.capa_url) ? (
              <img 
                src={item.capa_url as string} 
                alt={item.nome} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gradient-to-br from-slate-800 to-slate-900">
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <div className="text-xs text-gray-500">Sem imagem</div>
                </div>
              </div>
            )}
            
            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              <span className={`text-[10px] sm:text-xs font-semibold px-3 py-1.5 rounded-full border backdrop-blur-md ${statusStyle[item.status || 'indisponivel']}`}>
                {item.status?.replace('_', ' ').toUpperCase() || 'INDISPONIVEL'}
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
          </div>
        </div>

        {/* Informações - 4:3 */}
        <div className="p-3 sm:p-5 w-1/2 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-2 sm:mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white truncate text-lg leading-tight">{item.nome}</h3>
                {(item.valor || item.preco || item.price || item.filtros?.preco_min) && (
                  <div className="text-emerald-600 dark:text-emerald-300 font-semibold text-sm mt-1">
                    A partir de {currencyBRL(Number(item.valor || item.preco || item.price || item.filtros?.preco_min || 0))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <p className="text-xs text-slate-600 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">{item.descricao ?? 'Sem descrição disponível'}</p>

          {/* Categoria e Tipo */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {item.categoria && (
              <span className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-300 text-xs font-semibold">
                {item.categoria}
              </span>
            )}
            {item.tipo && (
              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 text-slate-700 dark:text-gray-300 text-xs font-medium">
                {item.tipo}
              </span>
            )}
          </div>

          {/* Campos Personalizados - Resumo */}
          {item.custom_fields && Object.keys(item.custom_fields).length > 0 && (
            <div className="space-y-1 mb-2">
              {Object.entries(item.custom_fields).slice(0, 2).map(([key, value]) => (
                <div key={key} className="text-xs text-slate-600 dark:text-gray-400">
                  <span className="font-semibold">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs mb-2">
              {item.tags.slice(0, 2).map((t, i) => (
                <span key={i} className="px-2 py-1 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 text-slate-700 dark:text-gray-300 text-[10px] font-medium">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setProdutoSelecionado(item)
              setModalAberto(true)
            }}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-500 to-cyan-600 hover:from-cyan-600 hover:via-cyan-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-cyan-500/40 hover:shadow-2xl group-hover:scale-[1.02] active:scale-95 mt-auto"
          >
            Ver detalhes <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  function Row({ item }: { item: Produto }) {
    return (
      <>
        {/* Mobile: Layout de Lista Vertical */}
        <div 
          className="md:hidden rounded-xl border bg-gradient-to-r transition-all shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm overflow-hidden border-slate-200 dark:border-white/10 from-white/95 dark:from-white/8 to-white/90 dark:to-white/5 hover:from-white/98 dark:hover:from-white/12 hover:to-white/95 dark:hover:to-white/10 hover:border-cyan-400/40 cursor-pointer"
          onClick={() => {
            setProdutoSelecionado(item)
            setModalAberto(true)
          }}
        >
          <div className="p-4">
            {/* Layout em quatro colunas */}
            <div className="grid grid-cols-4 gap-3">
              {/* Coluna 1: Foto */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 dark:from-slate-900 to-slate-200 dark:to-slate-800 flex-shrink-0 flex items-center justify-center shadow-md">
                  {isValidUrl(item.capa_url) ? (
                    <img
                      src={item.capa_url as string}
                      alt={item.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400 dark:text-slate-400">
                      <ImageIcon className="w-5 h-5 mx-auto mb-0.5 opacity-50" />
                      <div className="text-[9px] text-slate-500 dark:text-gray-500">Sem</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 2: Nome, preço e disponibilidade */}
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">{item.nome}</h3>
                <div className="flex items-center gap-1">
                  <span className={`text-[8px] font-semibold px-1 py-0.5 rounded-full border backdrop-blur-md ${statusStyle[item.status || 'indisponivel']}`}>
                    {item.status?.replace('_', ' ').toUpperCase() || 'INDISPONIVEL'}
                  </span>
                  {item.destaque && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded-full border border-purple-300/50 bg-gradient-to-r from-purple-500/30 to-pink-500/20 text-purple-700 dark:text-purple-100 backdrop-blur-md">
                      ⭐
                    </span>
                  )}
                </div>
                {(item.valor || item.preco || item.price) && (
                  <div className="text-emerald-600 dark:text-emerald-300 font-bold text-xs">
                    {currencyBRL(item.valor || item.preco || item.price || 0)}
                  </div>
                )}
              </div>

              {/* Coluna 3: Tipo e Status */}
              <div className="space-y-1">
                {item.tipo && (
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-gray-300">
                    <Tag className="w-3 h-3 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                    <span className="truncate text-[10px]">{item.tipo}</span>
                  </div>
                )}
                {item.status && (
                  <div className="text-[10px] text-slate-500 dark:text-gray-400">
                    {item.status.replace('_', ' ')}
                  </div>
                )}
              </div>

              {/* Coluna 4: Tags */}
              <div className="space-y-1">
                {item.tags && item.tags.length > 0 && (
                  <>
                    {item.tags.slice(0, 2).map((t, i) => (
                      <div key={i} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/10 mr-1">
                        <span className="text-slate-900 dark:text-white text-[9px]">#{t}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Layout Original em Grid */}
        <div 
          className="hidden md:block rounded-xl border bg-gradient-to-r transition-all shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm overflow-hidden border-slate-200 dark:border-white/10 from-white/95 dark:from-white/8 to-white/90 dark:to-white/5 hover:from-white/98 dark:hover:from-white/12 hover:to-white/95 dark:hover:to-white/10 hover:border-cyan-400/40 cursor-pointer"
          onClick={() => {
            setProdutoSelecionado(item)
            setModalAberto(true)
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-5">
            {/* Coluna 1: Imagem */}
            <div className="flex items-center justify-center">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 dark:from-slate-900 to-slate-200 dark:to-slate-800 flex-shrink-0 flex items-center justify-center shadow-lg">
                {isValidUrl(item.capa_url) ? (
                  <img
                    src={item.capa_url as string}
                    alt={item.nome}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="text-center text-slate-400 dark:text-slate-400">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <div className="text-xs text-slate-500 dark:text-gray-500">Sem imagem</div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Informações Básicas */}
            <div className="flex flex-col justify-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{item.nome}</h3>
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full border backdrop-blur-md ${statusStyle[item.status || 'indisponivel']}`}>
                  {item.status?.replace('_', ' ').toUpperCase() || 'INDISPONIVEL'}
                </span>
                {item.destaque && (
                  <span className="text-xs font-bold px-2 py-1 rounded-full border border-purple-300/50 bg-gradient-to-r from-purple-500/30 to-pink-500/20 text-purple-700 dark:text-purple-100 backdrop-blur-md">
                    ⭐ DESTAQUE
                  </span>
                )}
              </div>
              {(item.valor || item.preco || item.price) && (
                <div className="text-emerald-600 dark:text-emerald-300 font-bold text-lg">
                  {currencyBRL(item.valor || item.preco || item.price || 0)}
                </div>
              )}
            </div>

            {/* Coluna 3: Tipo e Status */}
            <div className="flex flex-col justify-center space-y-2">
              {item.tipo && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
                  <Tag className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                  <span className="font-medium truncate">{item.tipo}</span>
                </div>
              )}
            </div>

            {/* Coluna 4: Tags */}
            <div className="flex flex-col justify-center">
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs">
                  {item.tags.slice(0, 3).map((t, i) => (
                    <div key={i} className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded border border-slate-300 dark:border-white/10">
                      <span className="font-medium text-slate-900 dark:text-white">#{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coluna 5: Ações */}
            <div className="flex flex-col justify-center space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => toast.error('Edição não implementada')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/30 text-xs text-slate-700 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white transition-all font-medium"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDeleteSystemProducts()}
                  className="px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-400/30 text-xs text-rose-700 dark:text-rose-500 hover:bg-rose-200 dark:hover:bg-rose-500/30 hover:text-rose-900 dark:hover:text-rose-100 transition-all font-medium"
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Carregar produtos da equipe (refletindo produtos do proprietário)
  const carregarProdutos = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getProdutosEquipe(tenantId)
      setProdutos(data)
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error)
      toast.error('Erro ao carregar produtos da equipe')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  // Deletar produtos do sistema
  const handleDeleteSystemProducts = useCallback(async () => {
    if (!window.confirm('Tem certeza que deseja deletar TODOS os produtos do sistema ([Sistema]...)? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      setDeletingSystem(true)
      const deletedCount = await deleteProdutosSistema(tenantId)
      toast.success(`${deletedCount} produto(s) do sistema deletado(s)!`)
      // Recarregar produtos
      await carregarProdutos()
    } catch (error) {
      console.error('Erro ao deletar produtos do sistema:', error)
      toast.error('Erro ao deletar produtos do sistema')
    } finally {
      setDeletingSystem(false)
    }
  }, [tenantId, carregarProdutos])

  useEffect(() => {
    carregarProdutos()
  }, [carregarProdutos])

  // Aplicar filtros
  const produtosFiltrados = useMemo(() => {
    // Primeiro, filtrar produtos do sistema
    let filtered = produtos.filter(p => !p.nome.startsWith('[Sistema]'))

    if (filtros.tipo && filtros.tipo !== 'todos') {
      filtered = filtered.filter(p => p.tipo === filtros.tipo)
    }

    if (filtros.finalidade && filtros.finalidade !== 'todos') {
      filtered = filtered.filter(p => p.finalidade === filtros.finalidade)
    }

    if (filtros.texto) {
      const texto = filtros.texto.toLowerCase()
      filtered = filtered.filter(p => 
        p.nome.toLowerCase().includes(texto) ||
        p.descricao?.toLowerCase().includes(texto) ||
        p.bairro?.toLowerCase().includes(texto) ||
        p.cidade?.toLowerCase().includes(texto)
      )
    }

    // Filtros numéricos
    if (filtros.valorMin) {
      filtered = filtered.filter(p => {
        const valor = p.valor || p.preco || p.price || p.filtros?.preco_min
        return valor ? Number(valor) >= filtros.valorMin! : false
      })
    }

    if (filtros.valorMax) {
      filtered = filtered.filter(p => {
        const valor = p.valor || p.preco || p.price || p.filtros?.preco_min
        return valor ? Number(valor) <= filtros.valorMax! : false
      })
    }

    if (filtros.quartos) {
      filtered = filtered.filter(p => p.quartos && p.quartos >= filtros.quartos!)
    }

    if (filtros.banheiros) {
      filtered = filtered.filter(p => p.banheiros && p.banheiros >= filtros.banheiros!)
    }

    if (filtros.vagas) {
      filtered = filtered.filter(p => p.vagas_garagem && p.vagas_garagem >= filtros.vagas!)
    }

    // Filtros de texto específicos
    if (filtros.incorporadora) {
      filtered = filtered.filter(p => p.filtros?.incorporadora === filtros.incorporadora)
    }

    if (filtros.empreendimento) {
      filtered = filtered.filter(p => p.filtros?.empreendimento === filtros.empreendimento)
    }

    if (filtros.fase) {
      filtered = filtered.filter(p => p.filtros?.fase === filtros.fase)
    }

    if (filtros.modalidade) {
      filtered = filtered.filter(p => {
        const itemModalidades = p.filtros?.modalidade || []
        const searchModalidade = filtros.modalidade?.toLowerCase() || ''
        return itemModalidades.some(mod => mod.toLowerCase().includes(searchModalidade))
      })
    }

    if (filtros.regiao) {
      filtered = filtered.filter(p => p.filtros?.regiao === filtros.regiao)
    }

    if (filtros.bairro) {
      filtered = filtered.filter(p => 
        p.bairro === filtros.bairro || p.filtros?.bairro === filtros.bairro
      )
    }

    // Filtros booleanos
    if (filtros.financiamento_incorporadora && filtros.financiamento_incorporadora !== 'any') {
      const valorBool = filtros.financiamento_incorporadora === 'true'
      filtered = filtered.filter(p => p.filtros?.financiamento_incorporadora === valorBool)
    }

    if (filtros.decorado && filtros.decorado !== 'any') {
      const valorBool = filtros.decorado === 'true'
      filtered = filtered.filter(p => p.filtros?.decorado === valorBool)
    }

    // Filtros de array
    if (filtros.tipologia && filtros.tipologia.length > 0) {
      filtered = filtered.filter(p => 
        p.filtros?.tipologia?.some(t => filtros.tipologia!.includes(t))
      )
    }

    if (filtros.modalidade && filtros.modalidade.length > 0) {
      filtered = filtered.filter(p => 
        p.filtros?.modalidade?.some(m => filtros.modalidade!.includes(m))
      )
    }

    // ✅ Filtro por campos personalizados
    if (filters.customFields) {
      Object.keys(filters.customFields).forEach(fieldId => {
        const filterValue = filters.customFields[fieldId]
        if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
          // Encontrar a definição do campo para saber o tipo
          const fieldDef = customFields.find(f => f.id === fieldId)
          
          console.log('🎯 [Filtro Custom Field]', {
            fieldId,
            fieldName: fieldDef?.field_label,
            fieldType: fieldDef?.field_type,
            filterValue,
            filterValueType: typeof filterValue
          })
          
          filtered = filtered.filter(item => {
            const itemValue = item.filtros?.[fieldId]
            
            console.log('🔍 [Item Check]', {
              productId: item.id,
              productName: item.nome,
              fieldId,
              itemValue,
              itemValueType: typeof itemValue
            })
            
            if (!itemValue) {
              console.log('❌ [No Value] Item não tem valor para este campo')
              return false
            }
            
            let match = false
            
            // Para campos number: comparação numérica exata
            if (fieldDef?.field_type === 'number') {
              const filterNum = Number(filterValue)
              const itemNum = Number(itemValue)
              match = !isNaN(filterNum) && !isNaN(itemNum) && itemNum === filterNum
              console.log('🔢 [Number Match]', { filterNum, itemNum, match })
            }
            // Para campos select: comparação exata
            else if (fieldDef?.field_type === 'select') {
              match = String(itemValue).toLowerCase() === String(filterValue).toLowerCase()
              console.log('📋 [Select Match]', { 
                itemValue: String(itemValue).toLowerCase(), 
                filterValue: String(filterValue).toLowerCase(), 
                match 
              })
            }
            // Para campos text/date: busca parcial
            else {
              match = String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase())
              console.log('📝 [Text Match]', { 
                itemValue: String(itemValue).toLowerCase(), 
                filterValue: String(filterValue).toLowerCase(), 
                match 
              })
            }
            
            console.log(match ? '✅ [MATCH]' : '❌ [NO MATCH]')
            return match
          })
        }
      })
    }

    return filtered
  }, [produtos, filtros, filters, customFields])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-slate-400 dark:text-slate-400 animate-spin" />
      </div>
    )
  }

  if (produtos.length === 0) {
    return (
      <div className="rounded-lg bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/10 p-12 text-center">
        <ImageIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhum produto disponível</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Os produtos do proprietário aparecerão aqui automaticamente</p>
        <a
          href="/produtos"
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-50 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Ir para Produtos
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Linha 1: Título + Contador */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Produtos da Equipe</h2>
          <p className="text-sm text-slate-500 dark:text-slate-500">{produtosFiltrados.length} de {produtos.length} produto(s)</p>
        </div>

        {/* Linha 2: Botões - Responsivo */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Toggle View Mode */}
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'}`}
                title="Visualização em Grade"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'}`}
                title="Visualização em Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            {viewMode === 'list' && (
              <span className="text-xs text-slate-500 dark:text-gray-400 px-2 border-l border-slate-300 dark:border-white/20">
                Toque no card para visualizar
              </span>
            )}
          </div>

          {/* Botões de Ação - Encolhem no mobile */}
          <button
            onClick={() => setShowFilterPopup(!showFilterPopup)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all shadow-lg text-sm sm:text-sm font-medium ${showFilterPopup ? 'bg-cyan-50 dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-cyan-600/20 border-cyan-300 dark:border-cyan-400/30 text-cyan-700 dark:text-cyan-300 shadow-cyan-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'}`}
          >
            <Filter className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Filtros</span>
          </button>

          <button
            onClick={handleDeleteSystemProducts}
            disabled={deletingSystem}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-300 dark:hover:border-red-400/30 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-sm font-medium"
            title="Deletar produtos do sistema"
          >
            <span className="hidden sm:inline">{deletingSystem ? 'Deletando...' : 'Limpar'}</span>
          </button>
        </div>
      </div>

      {/* Filtros Modal */}
      {showFilterPopup && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowFilterPopup(false)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 dark:bg-slate-900/98 bg-white border dark:border-cyan-500/30 border-gray-300/30 rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-white/10 border-gray-300/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl dark:bg-cyan-500/20 bg-blue-500/20 dark:border-cyan-400/40 border-blue-400/40 border flex items-center justify-center">
                  <Filter className="w-6 h-6 dark:text-cyan-400 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white text-gray-900">Filtros</h3>
                  <p className="text-sm dark:text-gray-400 text-gray-600">Busque informações importantes</p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="mb-6 min-h-[200px] p-6 rounded-xl dark:bg-white/5 bg-gray-100/5 dark:border-white/10 border-gray-300/10 border">
              {/* Filtros Padrão */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={filters.categoria || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, categoria: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                    placeholder="Digite a categoria"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">Preço Mínimo</label>
                  <input
                    type="number"
                    value={filters.precoMin || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, precoMin: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                    placeholder="R$ 0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">Preço Máximo</label>
                  <input
                    type="number"
                    value={filters.precoMax || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, precoMax: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                    placeholder="R$ 0"
                  />
                </div>
              </div>
              {/* Campos Personalizados */}
              <div className="border-t dark:border-white/10 border-gray-300/10 pt-4">
                <h4 className="text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Campos Personalizados</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.filter(f => f.show_in_filters).length > 0 ? (
                    customFields.filter(f => f.show_in_filters).map(field => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">{field.field_label}</label>
                        {field.field_type === 'text' && (
                          <input
                            type="text"
                            value={String(filters.customFields?.[field.id] || '')}
                            onChange={(e) => setFilters(prev => ({ ...prev, customFields: { ...prev.customFields || {}, [field.id]: e.target.value } }))}
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                            placeholder={`Buscar por ${field.field_label}`}
                          />
                        )}
                        {field.field_type === 'number' && (
                          <input
                            type="number"
                            value={String(filters.customFields?.[field.id] || '')}
                            onChange={(e) => setFilters(prev => ({ ...prev, customFields: { ...prev.customFields || {}, [field.id]: e.target.value ? Number(e.target.value) : '' } }))}
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                            placeholder={`Buscar por ${field.field_label}`}
                          />
                        )}
                        {field.field_type === 'select' && field.field_options && (
                          <select
                            value={String(filters.customFields?.[field.id] || '')}
                            onChange={(e) => setFilters(prev => ({ ...prev, customFields: { ...prev.customFields || {}, [field.id]: e.target.value } }))}
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                          >
                            <option value="">Todos</option>
                            {field.field_options.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                        {(field.field_type === 'boolean' || field.field_type === 'date' || field.field_type === 'datetime') && (
                          <select
                            value={String(filters.customFields?.[field.id] || '')}
                            onChange={(e) => setFilters(prev => ({ ...prev, customFields: { ...prev.customFields || {}, [field.id]: e.target.value } }))}
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-300 dark:text-white text-gray-900"
                          >
                            <option value="">Todos</option>
                            {field.field_type === 'boolean' && (
                              <>
                                <option value="true">Sim</option>
                                <option value="false">Não</option>
                              </>
                            )}
                          </select>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs dark:text-gray-500 text-gray-500 col-span-full">Nenhum campo personalizado configurado para filtros.</p>
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

      {/* Grid ou Lista de Produtos */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {produtosFiltrados.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-center text-slate-500 dark:text-slate-300">
              Nenhum produto encontrado com os filtros aplicados.
            </div>
          ) : (
            produtosFiltrados.map((produto) => <Card key={produto.id} item={produto} />)
          )}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          {produtosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-center text-slate-500 dark:text-slate-300">
              Nenhum produto encontrado com os filtros aplicados.
            </div>
          ) : (
            produtosFiltrados.map((produto) => <Row key={produto.id} item={produto} />)
          )}
        </div>
      )}

      {/* Modal de Detalhes do Produto */}
      {modalAberto && produtoSelecionado && (
        <ProdutoDetalhesEquipe
          produtoId={produtoSelecionado.id}
          onClose={() => {
            setModalAberto(false)
            setProdutoSelecionado(null)
          }}
        />
      )}
    </div>
  )
}

export default ProdutosEquipe
