import React from 'react'
import { X, DollarSign, MapPin, Ruler, Bed, Bath, Car, FileText, Download, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  } | null
  tags?: string[] | null
  galeria_urls?: string[]
  arquivo_urls?: string[]
}

interface DetalhesImovelModalProps {
  produto: Produto | null
  isOpen: boolean
  onClose: () => void
}

const currencyBRL = (value: number | null | undefined): string => {
  if (!value) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const fileEmoji = (url: string) => {
  const ext = url.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return '📄'
    case 'doc':
    case 'docx': return '📝'
    case 'xls':
    case 'xlsx': return '📊'
    case 'ppt':
    case 'pptx': return '📑'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp': return '🖼️'
    default: return '📁'
  }
}

export const DetalhesImovelModal: React.FC<DetalhesImovelModalProps> = ({ produto, isOpen, onClose }) => {
  if (!produto) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-950 border border-white/10 rounded-3xl shadow-2xl w-full max-w-[1240px] h-[700px] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/95 backdrop-blur flex-shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">{produto.nome}</h2>
                  {produto.destaque && (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-yellow-500/30 text-yellow-100 border border-yellow-300/50">
                      ⭐ DESTAQUE
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Conteúdo - Layout Horizontal */}
              <div className="flex-1 flex overflow-hidden">
                {/* Coluna Esquerda: Imagem Principal */}
                <div className="w-[45%] flex-shrink-0 bg-slate-900/50 flex items-center justify-center p-6">
                  {produto.capa_url ? (
                    <img
                      src={produto.capa_url}
                      alt={produto.nome}
                      className="w-full h-full object-cover rounded-2xl"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-20 h-20 mb-4 opacity-50" />
                      <p className="text-sm">Sem imagem disponível</p>
                    </div>
                  )}
                </div>

                {/* Coluna Direita: Informações (com scroll) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                  {/* Preço */}
                  {(produto.valor || produto.preco || produto.price) && (
                    <div className="rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-400/30 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-300 text-xs">Preço</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-300">
                        {currencyBRL(produto.valor || produto.preco || produto.price)}
                      </p>
                    </div>
                  )}

                  {/* Características Principais */}
                  <div className="grid grid-cols-4 gap-3">
                    {produto.area_total && (
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                        <Ruler className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{produto.area_total}m²</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Área Total</p>
                      </div>
                    )}
                    {produto.quartos !== null && produto.quartos !== undefined && (
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                        <Bed className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{produto.quartos}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Quartos</p>
                      </div>
                    )}
                    {produto.banheiros !== null && produto.banheiros !== undefined && (
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                        <Bath className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{produto.banheiros}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Banheiros</p>
                      </div>
                    )}
                    {produto.vagas_garagem !== null && produto.vagas_garagem !== undefined && (
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                        <Car className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{produto.vagas_garagem}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Vagas</p>
                      </div>
                    )}
                  </div>

                  {/* Localização */}
                  {(produto.endereco || produto.bairro || produto.cidade || produto.cep) && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-red-400" />
                        <h3 className="text-sm font-semibold text-white">Localização</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {produto.endereco && (
                          <div><span className="text-slate-400 text-xs">Endereço:</span> <span className="text-slate-200">{produto.endereco}</span></div>
                        )}
                        {produto.bairro && (
                          <div><span className="text-slate-400 text-xs">Bairro:</span> <span className="text-slate-200">{produto.bairro}</span></div>
                        )}
                        {produto.cidade && (
                          <div><span className="text-slate-400 text-xs">Cidade:</span> <span className="text-slate-200">{produto.cidade}</span></div>
                        )}
                        {produto.cep && (
                          <div><span className="text-slate-400 text-xs">CEP:</span> <span className="text-slate-200">{produto.cep}</span></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Descrição */}
                  {produto.descricao && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-semibold text-white">Descrição</h3>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">{produto.descricao}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {produto.tags && produto.tags.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <h3 className="text-sm font-semibold text-white mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {produto.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Galeria */}
                  {produto.galeria_urls && produto.galeria_urls.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-semibold text-white">Galeria</h3>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {produto.galeria_urls.slice(0, 4).map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg overflow-hidden bg-white/5 border border-white/10 hover:border-white/30 transition-colors group"
                          >
                            <img
                              src={url}
                              alt={`Galeria ${idx + 1}`}
                              className="w-full h-20 object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </a>
                        ))}
                      </div>
                      {produto.galeria_urls.length > 4 && (
                        <p className="text-xs text-slate-400 mt-2 text-center">+{produto.galeria_urls.length - 4} fotos</p>
                      )}
                    </div>
                  )}

                  {/* Arquivos */}
                  {produto.arquivo_urls && produto.arquivo_urls.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-semibold text-white">Arquivos</h3>
                      </div>
                      <div className="space-y-1.5">
                        {produto.arquivo_urls.slice(0, 3).map((url, idx) => {
                          const fileName = url.split('/').pop() || `Arquivo ${idx + 1}`
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group text-sm"
                            >
                              <span className="text-base">{fileEmoji(url)}</span>
                              <span className="text-slate-300 group-hover:text-white transition-colors truncate text-xs">{fileName}</span>
                            </a>
                          )
                        })}
                      </div>
                      {produto.arquivo_urls.length > 3 && (
                        <p className="text-xs text-slate-400 mt-2 text-center">+{produto.arquivo_urls.length - 3} arquivos</p>
                      )}
                    </div>
                  )}

                  {/* Informações Adicionais */}
                  {produto.filtros && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <h3 className="text-sm font-semibold text-white mb-2">Informações Adicionais</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {produto.filtros.empreendimento && (
                          <div>
                            <p className="text-slate-400">Empreendimento</p>
                            <p className="text-white font-medium">{produto.filtros.empreendimento}</p>
                          </div>
                        )}
                        {produto.filtros.incorporadora && (
                          <div>
                            <p className="text-slate-400">Incorporadora</p>
                            <p className="text-white font-medium">{produto.filtros.incorporadora}</p>
                          </div>
                        )}
                        {produto.filtros.fase && (
                          <div>
                            <p className="text-slate-400">Fase</p>
                            <p className="text-white font-medium">{produto.filtros.fase}</p>
                          </div>
                        )}
                        {produto.filtros.regiao && (
                          <div>
                            <p className="text-slate-400">Região</p>
                            <p className="text-white font-medium">{produto.filtros.regiao}</p>
                          </div>
                        )}
                        {produto.filtros.financiamento_incorporadora && (
                          <div>
                            <p className="text-slate-400">Financiamento</p>
                            <p className="text-emerald-400 font-medium text-xs">✓ Disponível</p>
                          </div>
                        )}
                        {produto.filtros.decorado && (
                          <div>
                            <p className="text-slate-400">Decorado</p>
                            <p className="text-rose-400 font-medium text-xs">✓ Sim</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
