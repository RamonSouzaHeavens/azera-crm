import { useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback, useEffect } from 'react'
import {
  ChevronLeft,
  Building2,
  MapPin,
  Ruler,
  BedDouble,
  Car,
  Calendar,
  Star,
  FileText,
  Download,
  ImageIcon,
  Share2,
  Check,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, type CurrencyCode, isValidCurrency } from '../lib/currency'
import type { ProdutoFiltros } from '../types/produtos'
import toast from 'react-hot-toast'

// --- HELPERS ---
function currencyFormat(value?: number | null, currency?: CurrencyCode | string): string {
  if (!value && value !== 0) return '—'
  const validCurrency = currency && isValidCurrency(currency) ? currency : 'BRL'
  return formatCurrency(value, validCurrency)
}

function fmtDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
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
  filtros: ProdutoFiltros | null
  created_at: string
  updated_at: string
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  disponivel: { label: 'Disponível', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
  reservado: { label: 'Reservado', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  vendido: { label: 'Vendido', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-500/20' },
  alugado: { label: 'Alugado', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-500/20' },
  inativo: { label: 'Inativo', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-500/20' },
}

export default function ProdutoDetalhesEquipe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenant, member } = useAuthStore()
  const tenantId = tenant?.id ?? member?.tenant_id ?? ''
  const [loading, setLoading] = useState(true)
  const [produto, setProduto] = useState<Produto | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  const fetchProduto = useCallback(async () => {
    if (!id || !tenantId) return
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id, tenant_id, nome, descricao, valor, currency, categoria,
          created_at, updated_at, capa_url, galeria, anexos,
          destaque, status, filtros
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      setProduto(data)
    } catch (e) {
      console.error('Erro ao buscar produto:', e)
      navigate('/equipe/produtos')
    } finally {
      setLoading(false)
    }
  }, [id, tenantId, navigate])

  useEffect(() => { fetchProduto() }, [fetchProduto])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copiado para a área de transferência!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  const shareProduct = async () => {
    const shareData = {
      title: produto?.nome || 'Imóvel',
      text: `Confira este imóvel: ${produto?.nome}`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        copyToClipboard(window.location.href)
      }
    } else {
      copyToClipboard(window.location.href)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-gray-400 text-sm animate-pulse">Carregando detalhes...</p>
        </div>
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center">
        <div className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200 dark:border-white/5 p-8 text-center max-w-md shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-400 dark:text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Produto não encontrado</h1>
          <p className="text-slate-500 dark:text-gray-400 mb-6">O produto que você está procurando não existe ou foi removido.</p>
          <button
            onClick={() => navigate('/equipe/produtos')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar para lista
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = statusLabels[produto.status || 'disponivel'] || statusLabels.disponivel
  const valor = produto.valor || produto.filtros?.preco_min || 0
  const currency = (produto.currency || 'BRL') as CurrencyCode
  const allImages = [produto.capa_url, ...(produto.galeria || [])].filter(isValidUrl) as string[]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 dark:bg-background/80 border-b border-slate-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/equipe/produtos')}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-all group"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  {produto.destaque && (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400" /> Destaque
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1">
                  {produto.nome}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={shareProduct}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-medium hover:bg-slate-200 dark:hover:bg-white/10 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* Left Column - Images */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Image */}
            <div className="aspect-[16/10] bg-slate-100 dark:bg-[#121215] rounded-2xl overflow-hidden relative group border border-slate-200 dark:border-white/5">
              {allImages.length > 0 ? (
                <>
                  <img
                    src={allImages[activeImage]}
                    alt={produto.nome}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {allImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImage(i)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === activeImage
                              ? 'bg-white w-6'
                              : 'bg-white/50 hover:bg-white/75'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-gray-600">
                  <ImageIcon className="w-16 h-16 mb-3 opacity-50" />
                  <span className="text-sm">Sem imagens</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-6 gap-2">
                {allImages.slice(0, 6).map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      i === activeImage
                        ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                        : 'border-transparent hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            {produto.descricao && (
              <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                  Descrição
                </h3>
                <div className="prose prose-slate dark:prose-invert prose-sm max-w-none text-slate-600 dark:text-gray-400 leading-relaxed">
                  {produto.descricao.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">{line || '\u00A0'}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {produto.anexos && produto.anexos.length > 0 && (
              <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                    Materiais
                  </h3>
                  <span className="text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500 dark:text-gray-400">
                    {produto.anexos.length} arquivo(s)
                  </span>
                </div>

                <div className="space-y-2">
                  {produto.anexos.map((url, i) => {
                    if (!url || typeof url !== 'string') return null
                    const fileName = url.split('/').pop() || `Documento_${i + 1}.pdf`
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:text-cyan-500 transition-colors">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-sm text-slate-700 dark:text-gray-300 font-medium truncate max-w-[200px]">
                            {fileName}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownload(url, fileName)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Baixar
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-5 space-y-6">

            {/* Price Card */}
            <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-cyan-500/20">
              <p className="text-cyan-100 text-sm font-medium mb-1">Valor</p>
              <p className="text-4xl font-bold tracking-tight mb-4">
                {currencyFormat(valor, currency)}
              </p>
              {produto.filtros?.empreendimento && (
                <div className="pt-4 border-t border-white/20">
                  <p className="text-cyan-100 text-xs mb-1">Empreendimento</p>
                  <p className="font-semibold text-lg">{produto.filtros.empreendimento}</p>
                </div>
              )}
            </div>

            {/* Info Cards */}
            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/5 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Características</h3>

              <div className="grid grid-cols-2 gap-3">
                {produto.filtros?.metragem_min && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Ruler className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Área</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{produto.filtros.metragem_min}m²</p>
                    </div>
                  </div>
                )}

                {produto.filtros?.tipologia && produto.filtros.tipologia.length > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <BedDouble className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Tipologia</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{produto.filtros.tipologia.join(', ')}</p>
                    </div>
                  </div>
                )}

                {produto.filtros?.vaga && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-500/20 flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Vagas</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{produto.filtros.vaga}</p>
                    </div>
                  </div>
                )}

                {produto.filtros?.entrega && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Entrega</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{fmtDate(produto.filtros.entrega)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {(produto.filtros?.regiao || produto.filtros?.bairro || produto.filtros?.endereco) && (
              <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                  Localização
                </h3>
                <div className="space-y-2 text-slate-600 dark:text-gray-400">
                  {produto.filtros?.endereco && (
                    <p>{produto.filtros.endereco}</p>
                  )}
                  {produto.filtros?.bairro && (
                    <p className="font-medium text-slate-800 dark:text-white">{produto.filtros.bairro}</p>
                  )}
                  {produto.filtros?.regiao && (
                    <p className="text-cyan-600 dark:text-cyan-400">{produto.filtros.regiao}</p>
                  )}
                </div>
              </div>
            )}

            {/* Additional Info */}
            {produto.filtros?.incorporadora && (
              <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Incorporadora</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-gray-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white text-lg">
                    {produto.filtros.incorporadora}
                  </span>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/5 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Diferenciais</h3>
              <div className="flex flex-wrap gap-2">
                {produto.filtros?.financiamento_incorporadora && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                    ✅ Financiamento Direto
                  </span>
                )}
                {produto.filtros?.decorado && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">
                    ✨ Apartamento Decorado
                  </span>
                )}
                {produto.filtros?.fase && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                    🏗️ {produto.filtros.fase}
                  </span>
                )}
                {produto.filtros?.modalidade && produto.filtros.modalidade.length > 0 && (
                  produto.filtros.modalidade.map((mod: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                      {mod}
                    </span>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
