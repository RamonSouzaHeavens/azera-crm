import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Loader, Image as ImageIcon, Filter, Grid3x3, List, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProdutosEquipe, deleteProdutosSistema } from '../../services/produtosEquipeService'
import { isValidUrl } from '../../lib/urlValidation'
import { DetalhesImovelModal } from './DetalhesImovelModal'

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

// ============================
// Helpers
// ============================
const currencyBRL = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ProdutosEquipe: React.FC<ProdutosEquipeProps> = ({ tenantId }) => {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<Filtros>({
    tipo: 'todos',
    finalidade: 'todos',
    texto: '',
    financiamento_incorporadora: 'any',
    decorado: 'any'
  })
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deletingSystem, setDeletingSystem] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

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

    return filtered
  }, [produtos, filtros])

  // Opções de filtro únicas
  const tipos = useMemo(() => [...new Set(produtos.map(p => p.tipo).filter(Boolean))], [produtos])
  const finalidades = useMemo(() => [...new Set(produtos.map(p => p.finalidade).filter(Boolean))], [produtos])

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
    <div className="space-y-6">
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
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
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

          {/* Botões de Ação - Encolhem no mobile */}
          <button
            onClick={() => setFiltrosOpen(!filtrosOpen)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all shadow-lg text-sm sm:text-sm font-medium ${filtrosOpen ? 'bg-cyan-50 dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-cyan-600/20 border-cyan-300 dark:border-cyan-400/30 text-cyan-700 dark:text-cyan-300 shadow-cyan-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'}`}
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
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{deletingSystem ? 'Deletando...' : 'Limpar'}</span>
          </button>
        </div>
      </div>

      {/* Filtros Modal */}
      {filtrosOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900/95 border border-slate-700/50 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-900/95 border-b border-slate-700/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-200">Filtros</h3>
              <button
                onClick={() => setFiltrosOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Content - Responsivo */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coluna 1 */}
                <div className="space-y-4">
                  {/* Campo Buscar */}
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block font-medium">Buscar</label>
                    <input
                      type="text"
                      value={filtros.texto || ''}
                      onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })}
                      placeholder="Nome, localização..."
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-200 placeholder-slate-500 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    />
                  </div>

                  {/* Tipo e Finalidade */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-2 block font-medium">Tipo</label>
                      <select
                        value={filtros.tipo || 'todos'}
                        onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-200 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                      >
                        <option value="todos">Todos</option>
                        {tipos.map(tipo => (
                          <option key={tipo} value={tipo || ''}>{tipo && (tipo.charAt(0).toUpperCase() + tipo.slice(1))}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-2 block font-medium">Finalidade</label>
                      <select
                        value={filtros.finalidade || 'todos'}
                        onChange={(e) => setFiltros({ ...filtros, finalidade: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-200 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                      >
                        <option value="todos">Todas</option>
                        {finalidades.map(finalidade => (
                          <option key={finalidade} value={finalidade || ''}>{finalidade && finalidade.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Valor Mínimo e Máximo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">Valor Min.</label>
                      <input
                        type="number"
                        value={filtros.valorMin || ''}
                        onChange={(e) => setFiltros({ ...filtros, valorMin: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="R$ 0"
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">Valor Max.</label>
                      <input
                        type="number"
                        value={filtros.valorMax || ''}
                        onChange={(e) => setFiltros({ ...filtros, valorMax: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="R$ 999.999"
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Quartos, Banheiros e Vagas */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">Quartos</label>
                      <input
                        type="number"
                        value={filtros.quartos || ''}
                        onChange={(e) => setFiltros({ ...filtros, quartos: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Min"
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">Banheiros</label>
                      <input
                        type="number"
                        value={filtros.banheiros || ''}
                        onChange={(e) => setFiltros({ ...filtros, banheiros: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Min"
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">Vagas</label>
                      <input
                        type="number"
                        value={filtros.vagas || ''}
                        onChange={(e) => setFiltros({ ...filtros, vagas: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Min"
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Coluna 2 */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">Incorporadora</label>
                    <input
                      type="text"
                      value={filtros.incorporadora || ''}
                      onChange={(e) => setFiltros({ ...filtros, incorporadora: e.target.value })}
                      placeholder="Ex: FG"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">Empreendimento</label>
                    <input
                      type="text"
                      value={filtros.empreendimento || ''}
                      onChange={(e) => setFiltros({ ...filtros, empreendimento: e.target.value })}
                      placeholder="Nome do empreendimento"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">Fase</label>
                    <input
                      type="text"
                      value={filtros.fase || ''}
                      onChange={(e) => setFiltros({ ...filtros, fase: e.target.value })}
                      placeholder="Ex: LANÇAMENTO"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">Modalidade</label>
                    <input
                      type="text"
                      value={filtros.modalidade || ''}
                      onChange={(e) => setFiltros({ ...filtros, modalidade: e.target.value })}
                      placeholder="Ex: R2V, HMP, HIS2"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">Região</label>
                      <input
                        type="text"
                        value={filtros.regiao || ''}
                        onChange={(e) => setFiltros({ ...filtros, regiao: e.target.value })}
                        placeholder="Ex: São Paulo"
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">Bairro</label>
                      <input
                        type="text"
                        value={filtros.bairro || ''}
                        onChange={(e) => setFiltros({ ...filtros, bairro: e.target.value })}
                        placeholder="Ex: Jardins"
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">Financiamento Incorporadora</label>
                    <select
                      value={filtros.financiamento_incorporadora || 'any'}
                      onChange={(e) => setFiltros({ ...filtros, financiamento_incorporadora: e.target.value as 'any' | 'true' | 'false' })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                    >
                      <option value="any">Todos</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">Decorado</label>
                    <select
                      value={filtros.decorado || 'any'}
                      onChange={(e) => setFiltros({ ...filtros, decorado: e.target.value as 'any' | 'true' | 'false' })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                    >
                      <option value="any">Todos</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900/95 border-t border-slate-700/50 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setFiltros({ tipo: 'todos', finalidade: 'todos', texto: '', financiamento_incorporadora: 'any', decorado: 'any' })
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Limpar Filtros
              </button>
              <button
                onClick={() => setFiltrosOpen(false)}
                className="px-6 py-2.5 bg-slate-700 text-slate-100 rounded-lg hover:bg-slate-600 transition-all font-medium text-sm"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid ou Lista de Produtos */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : 'flex flex-col gap-4'}>
        {produtosFiltrados.map((produto) => (
          <div
            key={produto.id}
            onClick={() => {
              setProdutoSelecionado(produto)
              setModalAberto(true)
            }}
            className={`
              group relative flex flex-row
              w-full h-[300px]
              rounded-xl bg-white dark:bg-[#151D32]
              border transition-all duration-200 shadow-sm hover:shadow-lg overflow-hidden cursor-pointer
              border-slate-200 dark:border-white/10 hover:border-cyan-400/50
            `}
          >
            {/* COLUNA ESQUERDA: FOTO */}
            <div className="relative w-[210px] h-[300px] flex-shrink-0 bg-slate-100 dark:bg-slate-900 overflow-hidden border-r border-slate-100 dark:border-white/5">
              {/* Status Badge */}
              <div className="absolute top-3 left-3 z-20">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border shadow-sm backdrop-blur-md uppercase tracking-wider ${produto.status === 'disponivel'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/20'
                  : produto.status === 'reservado'
                    ? 'bg-cyan-100 text-cyan-800 border-cyan-400/50 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-400/20'
                    : produto.status === 'vendido'
                      ? 'bg-slate-200 text-slate-800 border-slate-400/50 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-400/20'
                      : 'bg-rose-100 text-rose-800 border-rose-400/50 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/20'
                  }`}>
                  {produto.status?.replace('_', ' ').toUpperCase() || 'DISPONÍVEL'}
                </span>
              </div>

              {isValidUrl(produto.capa_url ?? '') ? (
                <img
                  src={produto.capa_url as string}
                  alt={produto.nome}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/50">
                  <ImageIcon className="w-12 h-12 opacity-20 mb-2" />
                  <span className="text-xs font-medium opacity-60">Sem imagem</span>
                </div>
              )}

              {/* Overlay de Ações (Desktop Hover) */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[1px]">
                <button
                  onClick={(e) => { e.stopPropagation(); setProdutoSelecionado(produto); setModalAberto(true) }}
                  className="px-4 py-2 bg-white/90 text-slate-900 rounded-lg hover:bg-white font-semibold text-xs shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>

            {/* COLUNA DIREITA: DADOS */}
            <div className="flex-1 flex flex-col min-w-0 p-4 sm:p-5">
              {/* Header: Tipo e Destaque */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${produto.tipo
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800'
                    : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                    }`}>
                    {produto.tipo ? (produto.tipo.charAt(0).toUpperCase() + produto.tipo.slice(1)) : 'SEM TIPO'}
                  </span>
                  {produto.destaque && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                      ⭐ Destaque
                    </span>
                  )}
                </div>
              </div>

              {/* Título e Descrição */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1 truncate" title={produto.nome}>
                  {produto.nome || <span className="text-slate-400 italic font-normal">Produto sem nome</span>}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5em]">
                  {produto.descricao || <span className="opacity-50 italic">Sem descrição disponível</span>}
                </p>
              </div>

              {/* Grid de Atributos */}
              <div className="mt-auto bg-slate-50 dark:bg-white/5 rounded-lg p-3 border border-slate-100 dark:border-white/5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {produto.filtros?.incorporadora && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase truncate">Incorporadora</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{produto.filtros.incorporadora}</span>
                    </div>
                  )}
                  {produto.filtros?.fase && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase truncate">Fase</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{produto.filtros.fase}</span>
                    </div>
                  )}
                  {produto.filtros?.regiao && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase truncate">Região</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{produto.filtros.regiao}</span>
                    </div>
                  )}
                  {produto.area_total && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase truncate">Área</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{produto.area_total}m²</span>
                    </div>
                  )}
                  {produto.quartos && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase truncate">Quartos</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{produto.quartos}</span>
                    </div>
                  )}
                  {produto.banheiros && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase truncate">Banheiros</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{produto.banheiros}</span>
                    </div>
                  )}
                </div>
                {!produto.filtros?.incorporadora && !produto.filtros?.fase && !produto.area_total && !produto.quartos && (
                  <div className="flex items-center justify-center py-2 text-xs text-slate-400 dark:text-slate-500 italic gap-2">
                    <ImageIcon className="w-4 h-4 opacity-50" />
                    Sem características adicionais
                  </div>
                )}
              </div>

              {/* Rodapé: Preço */}
              <div className="mt-4 flex items-end justify-between border-t border-slate-100 dark:border-white/5 pt-3">
                <div>
                  <div className="text-[10px] font-medium text-slate-400 mb-0.5">Valor</div>
                  <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                    {produto.valor || produto.preco || produto.price || produto.filtros?.preco_min
                      ? currencyBRL(Number(produto.valor || produto.preco || produto.price || produto.filtros?.preco_min || 0))
                      : <span className="text-sm text-slate-400 font-normal">Sob Consulta</span>}
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setProdutoSelecionado(produto); setModalAberto(true) }}
                  className="text-xs font-medium text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                >
                  Ver detalhes →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Detalhes do Imóvel */}
      <DetalhesImovelModal
        produto={produtoSelecionado}
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false)
          setProdutoSelecionado(null)
        }}
      />
    </div>
  )
}

export default ProdutosEquipe
