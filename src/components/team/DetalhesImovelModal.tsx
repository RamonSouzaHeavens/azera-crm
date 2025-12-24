import React from 'react'
import { X, MapPin, Ruler, BedDouble, Bath, Car, Building2, Calendar, DollarSign, ImageIcon } from 'lucide-react'
import { isValidUrl } from '../../lib/urlValidation'

interface Produto {
  id: string
  nome: string
  descricao: string | null
  tipo: string | null
  valor: number | null
  preco?: number | null
  price?: number | null
  capa_url: string | null
  status: string
  destaque: boolean
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
    data_entrega?: string
  } | null
}

interface DetalhesImovelModalProps {
  produto: Produto | null
  isOpen: boolean
  onClose: () => void
}

const currencyBRL = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function DetalhesImovelModal({ produto, isOpen, onClose }: DetalhesImovelModalProps) {
  if (!isOpen || !produto) return null

  const valor = produto.valor || produto.preco || produto.price || produto.filtros?.preco_min || 0

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{produto.nome}</h2>
            {produto.filtros?.empreendimento && (
              <p className="text-sm text-cyan-600 dark:text-cyan-400">{produto.filtros.empreendimento}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Imagem */}
            <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
              {isValidUrl(produto.capa_url ?? '') ? (
                <img
                  src={produto.capa_url as string}
                  alt={produto.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem imagem</p>
                  </div>
                </div>
              )}
            </div>

            {/* Informações Principais */}
            <div className="space-y-6">
              {/* Preço */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-1">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium">Valor</span>
                </div>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                  {currencyBRL(Number(valor))}
                </p>
              </div>

              {/* Status e Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  produto.status === 'disponivel'
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : produto.status === 'reservado'
                    ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-300'
                }`}>
                  {produto.status?.replace('_', ' ').toUpperCase() || 'INDISPONÍVEL'}
                </span>

                {produto.destaque && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-300">
                    ⭐ DESTAQUE
                  </span>
                )}

                {produto.filtros?.fase && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300">
                    {produto.filtros.fase}
                  </span>
                )}
              </div>

              {/* Características */}
              <div className="grid grid-cols-2 gap-3">
                {produto.tipo && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <Building2 className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Tipo</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{produto.tipo}</p>
                    </div>
                  </div>
                )}

                {produto.area_total && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <Ruler className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Área</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{produto.area_total}m²</p>
                    </div>
                  </div>
                )}

                {produto.quartos && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <BedDouble className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Quartos</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{produto.quartos}</p>
                    </div>
                  </div>
                )}

                {produto.banheiros && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <Bath className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Banheiros</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{produto.banheiros}</p>
                    </div>
                  </div>
                )}

                {produto.vagas_garagem && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <Car className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Vagas</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{produto.vagas_garagem}</p>
                    </div>
                  </div>
                )}

                {produto.filtros?.data_entrega && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <Calendar className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-gray-500">Entrega</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{produto.filtros.data_entrega}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Localização */}
              {(produto.endereco || produto.bairro || produto.cidade || produto.filtros?.regiao) && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">Localização</span>
                  </div>
                  <div className="text-sm text-slate-900 dark:text-white space-y-1">
                    {produto.endereco && <p>{produto.endereco}</p>}
                    <p>
                      {[produto.bairro || produto.filtros?.bairro, produto.cidade, produto.filtros?.regiao]
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                    {produto.cep && <p className="text-slate-500 dark:text-gray-500">CEP: {produto.cep}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          {produto.descricao && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Descrição</h3>
              <p className="text-slate-600 dark:text-gray-400 whitespace-pre-line">{produto.descricao}</p>
            </div>
          )}

          {/* Tipologia e Modalidade */}
          {produto.filtros && (produto.filtros.tipologia?.length || produto.filtros.modalidade?.length) && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Características Adicionais</h3>
              <div className="flex flex-wrap gap-2">
                {produto.filtros.tipologia?.map((tip) => (
                  <span
                    key={`tip-${tip}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300"
                  >
                    {tip}
                  </span>
                ))}
                {produto.filtros.modalidade?.map((mod) => (
                  <span
                    key={`mod-${mod}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fuchsia-100 dark:bg-fuchsia-500/15 border border-fuchsia-300 dark:border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300"
                  >
                    {mod}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Incorporadora */}
          {produto.filtros?.incorporadora && (
            <div className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Incorporadora</p>
              <p className="text-lg font-semibold text-indigo-800 dark:text-indigo-200">{produto.filtros.incorporadora}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default DetalhesImovelModal
