import { Link, useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback, useEffect } from 'react'
import { Edit3, FileText, Download, ChevronLeft, Calendar, Tag, Layers, Hash, Globe, CheckCircle2, ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, type CurrencyCode, isValidCurrency, getCurrencyConfig } from '../lib/currency'

// --- HELPERS ---
function currencyBRL(value?: number | null, currency?: CurrencyCode | string): string {
  if (!value && value !== 0) return '—'
  const validCurrency = currency && isValidCurrency(currency) ? currency : 'BRL'
  return formatCurrency(value, validCurrency)
}

function fmtDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleDownload = (url: string, fileName: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.target = '_blank'
  link.click()
}

interface Produto {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  valor: number | null
  currency: CurrencyCode | null
  categoria: string | null
  destaque: boolean
  status: string | null
  capa_url: string | null
  galeria: string[] | null
  anexos: string[] | null
  created_at: string
  updated_at: string
}

interface CustomField {
  id: string
  nome: string
  tipo: string
  opcoes?: string[]
  valor?: string | number | null
}

export default function ProdutoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenant, member } = useAuthStore()
  const tenantId = tenant?.id ?? member?.tenant_id ?? ''
  const [loading, setLoading] = useState(true)
  const [produto, setProduto] = useState<Produto | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  const fetchProduto = useCallback(async () => {
    if (!id || !tenantId) return
    try {
      setLoading(true)

      console.log('🔍 [ProdutoDetalhes] Buscando produto:', { id, tenantId })

      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id, tenant_id, nome, descricao, valor, currency, categoria,
          created_at, updated_at, capa_url, galeria, anexos,
          destaque, status
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      console.log('✅ [ProdutoDetalhes] Produto carregado:', data)
      setProduto(data)

      // Carregar todos os campos personalizados do tenant
      const { data: allFieldsData, error: allFieldsError } = await supabase
        .from('product_custom_fields')
        .select('id, field_name, field_type, options, required')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('display_order', { ascending: true })

      if (allFieldsError) throw allFieldsError

      // Carregar valores dos campos para este produto específico
      const { data: valuesData, error: valuesError } = await supabase
        .from('product_custom_field_values')
        .select('custom_field_id, value_text, value_number, value_boolean')
        .eq('produto_id', id)

      if (valuesError) throw valuesError

      // Criar mapa de valores por custom_field_id
      const valuesMap = new Map()
      if (valuesData) {
        valuesData.forEach(item => {
          let value = null
          if (item.value_text !== null) value = item.value_text
          else if (item.value_number !== null) value = item.value_number
          else if (item.value_boolean !== null) value = item.value_boolean
          valuesMap.set(item.custom_field_id, value)
        })
      }

      // Combinar campos com valores
      const customFieldsFormatted: CustomField[] = []
      if (allFieldsData) {
        allFieldsData.forEach(field => {
          const valor = valuesMap.get(field.id)
          // Só adicionar se tiver valor
          if (valor !== null && valor !== undefined && valor !== '') {
            customFieldsFormatted.push({
              id: field.id,
              nome: field.field_name,
              tipo: field.field_type,
              opcoes: field.options || [],
              valor: valor
            })
          }
        })
      }

      setCustomFields(customFieldsFormatted)
    } catch (e) {
      console.error('❌ [ProdutoDetalhes] Erro ao buscar produto:', e)
      navigate('/app/produtos')
    } finally {
      setLoading(false)
    }
  }, [id, tenantId, navigate])

  useEffect(() => { fetchProduto() }, [fetchProduto])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">Carregando detalhes...</p>
        </div>
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-[#121215] rounded-2xl border border-white/5 p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Produto não encontrado</h1>
          <p className="text-gray-400 mb-6">O produto que você está procurando não existe ou foi removido.</p>
          <Link
            to="/app/produtos"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar para lista
          </Link>
        </div>
      </div>
    )
  }

  const currencyConfig = getCurrencyConfig(produto.currency || 'BRL')

  return (
    <div className="min-h-screen bg-background text-gray-200 pb-20 font-sans">
      <div className="max-w-7xl mx-auto p-6 md:p-8 relative z-10">

        {/* HEADER DE NAVEGAÇÃO - ESTILO PREMIUM */}
        <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6 border-b border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/app/produtos')}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all group"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 truncate max-w-[150px] md:max-w-none">
                    ID: {produto.id.slice(0, 8)}...
                  </span>
                  {produto.destaque && (
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Destaque
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                    produto.status === 'disponivel' ? 'bg-emerald-500/20 text-emerald-400' :
                    produto.status === 'reservado' ? 'bg-amber-500/20 text-amber-400' :
                    produto.status === 'vendido' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {produto.status || 'Disponível'}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-outfit">{produto.nome}</h1>
                <p className="text-sm text-gray-400 mt-0.5">Detalhes completos do produto</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/app/produtos"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl transition-all border border-white/10"
              >
                Ver Todos
              </Link>
              <Link
                to={`/app/produtos/editar/${produto.id}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Produto</span>
              </Link>
            </div>
          </div>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* COLUNA ESQUERDA - DETALHES (8/12) */}
          <div className="lg:col-span-8 space-y-6">

            {/* CARD 1: HERO INFO */}
            <div className="bg-[#121215] border border-white/5 rounded-2xl p-6 md:p-8 relative overflow-hidden group">
              {/* Glow effect sutil */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full group-hover:bg-cyan-500/10 transition-colors duration-500" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Valor do Produto</label>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white tracking-tight">
                      {currencyBRL(produto.valor, produto.currency || 'BRL')}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">{currencyConfig.code}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Categoria</p>
                        <p className="text-sm font-medium text-white capitalize">{produto.categoria || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status Atual</p>
                        <p className="text-sm font-medium text-white capitalize">{produto.status || 'Disponível'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: DESCRIÇÃO */}
            {produto.descricao && (
              <div className="bg-[#121215] border border-white/5 rounded-2xl p-6 md:p-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Descrição
                </h3>
                <div className="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed bg-[#09090b] p-6 rounded-xl border border-white/5">
                  {produto.descricao.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0 min-h-[1rem]">{line || '\u00A0'}</p>
                  ))}
                </div>
              </div>
            )}

            {/* CARD 3: CAMPOS PERSONALIZADOS */}
            {customFields.length > 0 && (
              <div className="bg-[#121215] border border-white/5 rounded-2xl p-6 md:p-8">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-gray-500" />
                  Informações Adicionais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="p-4 rounded-xl bg-[#09090b] border border-white/5 hover:border-white/10 transition-colors">
                      <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
                        {field.nome}
                      </label>
                      <div className="text-sm text-gray-200 font-medium">
                        {field.tipo === 'boolean'
                          ? (field.valor ? 'Sim' : 'Não')
                          : (field.valor || '—')
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CARD 4: ANEXOS */}
            {produto.anexos && produto.anexos.length > 0 && (
              <div className="bg-[#121215] border border-white/5 rounded-2xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-gray-500" />
                    Arquivos Anexados
                  </h3>
                  <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400">{produto.anexos.length}</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {produto.anexos.map((url, i) => {
                    if (!url || typeof url !== 'string') return null
                    const fileName = url.split('/').pop() || `Documento_${i + 1}.pdf`
                    return (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#09090b] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-gray-400 group-hover:text-cyan-400 group-hover:scale-110 transition-all">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-sm text-gray-300 font-medium truncate max-w-[200px] md:max-w-xs">{fileName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            Visualizar
                          </a>
                          <button
                            onClick={() => handleDownload(url, fileName)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                            title="Baixar arquivo"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>

          {/* COLUNA DIREITA - MEDIA (4/12) */}
          <div className="lg:col-span-4 space-y-6">

            {/* CAPA CARD */}
            <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
              <div className="aspect-[3/4] w-full bg-[#09090b] relative group">
                {produto.capa_url ? (
                  <>
                    <img
                      src={produto.capa_url}
                      alt={produto.nome}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-4 left-4">
                      <span className="px-2 py-1 bg-black/50 backdrop-blur-md rounded border border-white/10 text-xs text-white">
                        Imagem Principal
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-sm">Sem imagem</span>
                  </div>
                )}
              </div>
            </div>

            {/* GALERIA CARD */}
            {produto.galeria && produto.galeria.length > 0 && (
              <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Galeria</span>
                  <span className="text-xs text-gray-500">{produto.galeria.length} fotos</span>
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {produto.galeria.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => window.open(url, '_blank')}
                      className="aspect-square rounded-lg border border-white/10 bg-[#09090b] overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all group relative"
                    >
                      <img src={url} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* META INFO CARD */}
            <div className="bg-[#121215] border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Metadados</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">Criado em</p>
                    <p className="text-gray-300">{fmtDate(produto.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">Última atualização</p>
                    <p className="text-gray-300">{fmtDate(produto.updated_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm pt-4 border-t border-white/5">
                  <Globe className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">Moeda Configurada</p>
                    <p className="text-gray-300 flex items-center gap-2">
                      {currencyConfig.flag} {currencyConfig.code} ({currencyConfig.symbol})
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
