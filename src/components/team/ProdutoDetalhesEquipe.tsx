import { useState, useCallback, useEffect } from 'react'
import { X, FileText, Image as ImageIcon, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

interface ProdutoDetalhesEquipeProps {
  produtoId: string
  onClose: () => void
}

function currencyBRL(value?: number | null): string {
  if (!value && value !== 0) return 'R$ 0,00'
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const handleDownload = (url: string, fileName: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
}

interface Produto {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  valor: number | null
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

export default function ProdutoDetalhesEquipe({ produtoId, onClose }: ProdutoDetalhesEquipeProps) {
  const { tenant, member } = useAuthStore()
  const tenantId = tenant?.id ?? member?.tenant_id ?? ''
  const [loading, setLoading] = useState(true)
  const [produto, setProduto] = useState<Produto | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  const fetchProduto = useCallback(async () => {
    if (!produtoId || !tenantId) return
    try {
      setLoading(true)

      console.log('🔍 [ProdutoDetalhesEquipe] Buscando produto:', { produtoId, tenantId })

      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id, tenant_id, nome, descricao, valor, categoria,
          created_at, updated_at, capa_url, galeria, anexos,
          destaque, status
        `)
        .eq('id', produtoId)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      console.log('✅ [ProdutoDetalhesEquipe] Produto carregado:', data)
      setProduto(data)

      // Carregar todos os campos personalizados do tenant
      const { data: allFieldsData, error: allFieldsError } = await supabase
        .from('product_custom_fields')
        .select('id, field_name, field_type, options')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('display_order', { ascending: true })

      if (allFieldsError) throw allFieldsError

      // Carregar valores dos campos para este produto específico
      const { data: valuesData, error: valuesError } = await supabase
        .from('product_custom_field_values')
        .select('custom_field_id, value_text, value_number, value_boolean')
        .eq('produto_id', produtoId)

      if (valuesError) throw valuesError

      // Criar mapa de valores por custom_field_id
      const valuesMap = new Map()
      if (valuesData) {
        valuesData.forEach(item => {
          // Determinar qual valor usar baseado no tipo
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
          customFieldsFormatted.push({
            id: field.id,
            nome: field.field_name,
            tipo: field.field_type,
            opcoes: field.options || [],
            valor: valuesMap.get(field.id) ?? null
          })
        })
      }

      setCustomFields(customFieldsFormatted)
    } catch (e) {
      console.error('❌ [ProdutoDetalhesEquipe] Erro ao buscar produto:', e)
      onClose()
    } finally {
      setLoading(false)
    }
  }, [produtoId, tenantId, onClose])

  useEffect(() => { fetchProduto() }, [fetchProduto])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Produto não encontrado</h1>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{produto.nome}</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">Cadastrado em {fmtDate(produto.created_at)}</p>
            <p className="text-sm text-gray-600 dark:text-slate-500 mt-0.5 font-mono">ID: {produto.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna 1: Informações */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Informações Básicas</h3>
              </div>

              {/* Grid para campos principais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Preço */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                    Preço (R$)
                  </label>
                  <div className="w-full px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-emerald-800 dark:text-emerald-300 text-sm font-semibold">
                    {currencyBRL(produto.valor)}
                  </div>
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                    Categoria
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm capitalize">
                    {produto.categoria || '—'}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                    Status
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm capitalize">
                    {produto.status || 'Disponível'}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                  Descrição
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm min-h-[80px] whitespace-pre-wrap">
                  {produto.descricao || 'Sem descrição'}
                </div>
              </div>

              {/* Campos Personalizados */}
              {customFields.length > 0 && (
                <div>
                  <div className="pb-2 border-b border-gray-200 dark:border-white/10 mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Campos Personalizados</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {customFields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                          {field.nome}
                        </label>
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm">
                          {field.tipo === 'select' && field.opcoes && field.opcoes.length > 0
                            ? (field.opcoes.find(op => op === field.valor) || field.valor || '—')
                            : (field.valor || '—')
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anexos */}
              <div>
                <div className="pb-2 border-b border-gray-200 dark:border-white/10 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                    Anexos ({produto.anexos?.length || 0})
                  </h3>
                </div>
                {produto.anexos && produto.anexos.length > 0 ? (
                  <div className="space-y-2">
                    {produto.anexos.map((url, i) => {
                      if (!url || typeof url !== 'string') return null
                      const fileName = url.split('/').pop() || `Arquivo ${i + 1}`
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400 dark:text-slate-400 flex-shrink-0" />
                            <span className="flex-1 text-sm text-gray-700 dark:text-white font-medium">{fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Ver
                            </a>
                            <button
                              onClick={() => handleDownload(url, fileName)}
                              className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Baixar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-slate-400 text-sm">
                    Nenhum documento anexado
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Mídia */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Mídia</h3>
              </div>

              {/* Capa */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                  Capa Principal
                </label>
                <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 flex items-center justify-center relative overflow-hidden">
                  {produto.capa_url ? (
                    <img src={produto.capa_url} alt={produto.nome} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400 dark:text-slate-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <span className="text-sm">Sem imagem</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Galeria */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                  Galeria ({produto.galeria?.length || 0})
                </label>
                {produto.galeria && produto.galeria.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {produto.galeria.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => window.open(url, '_blank')}
                        className="aspect-square rounded-lg border-2 border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 hover:border-cyan-400 dark:hover:border-cyan-400 transition-colors overflow-hidden"
                      >
                        <img src={url} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400 text-sm">
                    Nenhuma imagem na galeria
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex justify-between items-center">
          <div className="text-xs text-gray-500 dark:text-slate-400">
            Atualizado em {fmtDate(produto.updated_at)}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
