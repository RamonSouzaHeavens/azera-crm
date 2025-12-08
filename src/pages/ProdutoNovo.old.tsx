import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'
import { uploadFileWithValidation } from '../services/storageService'
import { fetchProdutoFiltroOptions, ProdutoFiltroOptions, addIncorporadora, addRegiao, addBairro } from '../services/produtoFiltersService'
import {
  emptyProdutoFiltrosForm,
  normalizeProdutoFiltros,
  ProdutoFiltrosFormValues,
} from '../lib/produtoFiltros'
import { 
  UploadCloud, 
  X, 
  Plus, 
  Building,
} from 'lucide-react'
import type { ImovelTipo, ImovelFinalidade } from './Produtos'

export default function ProdutoNovo() {
  console.log('✅ ProdutoNovo.tsx carregado com nova versão')
  const navigate = useNavigate()
  const { tenant, member, user } = useAuthStore()
  const { canAddProduct, maxProducts } = useSubscriptionLimits()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])
  
  // Estado para contagem de produtos
  const [currentProductCount, setCurrentProductCount] = useState(0)
  
  // Estados do formulário
  const [loading, setLoading] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<ImovelTipo>('apartamento')
  const [finalidade, setFinalidade] = useState<ImovelFinalidade>('venda')
  const [valor] = useState('')
  const [areaTotal, setAreaTotal] = useState('')
  const [areaConstruida, setAreaConstruida] = useState('')
  const [quartos, setQuartos] = useState('')
  const [banheiros, setBanheiros] = useState('')
  const [vagasGaragem, setVagasGaragem] = useState('')
  
  // Endereço (único)
  const [endereco, setEndereco] = useState('')
  const [cidade, setCidade] = useState('')
  const [cep, setCep] = useState('')
  const [bairro, setBairro] = useState('')
  
  // Outros
  const [capa, setCapa] = useState<string | null>(null)
  const [galeria, setGaleria] = useState<string[]>([])
  const [arquivos, setArquivos] = useState<string[]>([])
  
  // Campos do empreendimento
  const [filtroOptions, setFiltroOptions] = useState<ProdutoFiltroOptions>({
    incorporadoras: [],
    empreendimentos: [],
    fases: [],
    regioes: [],
    bairros: [],
    tipologias: [],
    modalidades: []
  })
  const [produtoFiltros, setProdutoFiltros] = useState<ProdutoFiltrosFormValues>(() => emptyProdutoFiltrosForm())

  // Estados para modal de adicionar opções
  const [modalAddOpen, setModalAddOpen] = useState(false)
  const [modalAddType, setModalAddType] = useState<'incorporadora' | 'regiao' | 'bairro' | null>(null)
  const [modalAddValue, setModalAddValue] = useState('')

  // Upload functions
  const uploadToStorage = async (path: string, file: File): Promise<string | null> => {
    try {
      console.log('Tentando fazer upload para:', path)
      console.log('Tenant ID:', tenantId)

      const result = await uploadFileWithValidation('produtos', path, file)
      
      if (result.success && result.url) {
        console.log('Upload bem sucedido:', result.url)
        return result.url
      } else {
        console.error('Falha no upload:', result.error)
        throw new Error(result.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro na função uploadToStorage:', error)
      return null
    }
  }

  const onPickCapa = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const ext = file.name.split('.').pop() ?? 'jpg'
          const tempId = Date.now().toString()
          const path = `images/${tenantId}/${tempId}/capa-${Date.now()}.${ext}`
          const url = await uploadToStorage(path, file)
          if (url) {
            setCapa(url)
            toast.success('Imagem de capa carregada!')
          } else {
            toast.error('Erro ao carregar imagem')
          }
        } catch (error) {
          console.error('Erro ao fazer upload da capa:', error)
          toast.error('Erro ao carregar imagem')
        }
      }
    }
    input.click()
  }

  const onPickGaleria = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        try {
          const urls: string[] = []
          const tempId = Date.now().toString()
          for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const ext = file.name.split('.').pop() ?? 'jpg'
            const path = `images/${tenantId}/${tempId}/galeria-${Date.now()}-${i}.${ext}`
            const url = await uploadToStorage(path, file)
            if (url) {
              urls.push(url)
            }
          }
          setGaleria(prev => [...prev, ...urls])
          toast.success(`${urls.length} imagem(ns) adicionada(s) à galeria!`)
        } catch (error) {
          console.error('Erro ao fazer upload da galeria:', error)
          toast.error('Erro ao carregar imagens')
        }
      }
    }
    input.click()
  }

  const onPickArquivos = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'
    input.multiple = true
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        try {
          const urls: string[] = []
          const tempId = Date.now().toString()
          for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const ext = file.name.split('.').pop() ?? 'pdf'
            const path = `files/${tenantId}/${tempId}/${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}-${Date.now()}.${ext}`
            const url = await uploadToStorage(path, file)
            if (url) {
              urls.push(url)
            }
          }
          setArquivos(prev => [...prev, ...urls])
          toast.success(`${urls.length} arquivo(s) adicionado(s)!`)
        } catch (error) {
          console.error('Erro ao fazer upload dos arquivos:', error)
          toast.error('Erro ao carregar arquivos')
        }
      }
    }
    input.click()
  }

  const removeFromGaleria = (index: number) => {
    setGaleria(prev => prev.filter((_, i) => i !== index))
  }

  const removeFromArquivos = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf': return '📄'
      case 'doc':
      case 'docx': return '📝'
      case 'xls':
      case 'xlsx': return '📊'
      case 'ppt':
      case 'pptx': return '📑'
      default: return '📁'
    }
  }

  // Carregar opções de filtros
  const refreshFiltroOptions = useCallback(async () => {
    if (!tenantId) return

    try {
      const options = await fetchProdutoFiltroOptions(tenantId)
      setFiltroOptions(options)
    } catch (err) {
      console.error('Erro ao buscar opções de filtros:', err)
    }
  }, [tenantId])

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

  // Handlers para adicionar filtros
  const handleAddIncorporadora = useCallback(() => {
    setModalAddType('incorporadora')
    setModalAddValue('')
    setModalAddOpen(true)
  }, [])

  const handleAddRegiao = useCallback(() => {
    setModalAddType('regiao')
    setModalAddValue('')
    setModalAddOpen(true)
  }, [])

  const handleAddBairro = useCallback(() => {
    setModalAddType('bairro')
    setModalAddValue('')
    setModalAddOpen(true)
  }, [])

  const handleConfirmAdd = useCallback(async () => {
    if (!modalAddValue.trim() || !tenantId || !modalAddType) return

    try {
      let success = false
      if (modalAddType === 'incorporadora') {
        success = await addIncorporadora(tenantId, modalAddValue)
      } else if (modalAddType === 'regiao') {
        success = await addRegiao(tenantId, modalAddValue)
      } else if (modalAddType === 'bairro') {
        success = await addBairro(tenantId, modalAddValue)
      }

      if (success) {
        const typeLabel = modalAddType === 'incorporadora' ? 'Incorporadora' : modalAddType === 'regiao' ? 'Referência' : 'Estado'
        toast.success(`${typeLabel} adicionada!`)
        await refreshFiltroOptions()
        setModalAddOpen(false)
        setModalAddValue('')
        setModalAddType(null)
      } else {
        toast.error('Erro ao adicionar')
      }
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro ao adicionar')
    }
  }, [modalAddValue, tenantId, modalAddType, refreshFiltroOptions])

  // Funções para gerenciar filtros
  const updateProdutoFiltro = <K extends keyof ProdutoFiltrosFormValues>(
    key: K,
    value: ProdutoFiltrosFormValues[K]
  ) => {
    setProdutoFiltros((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Verificar limite de produtos para usuários sem assinatura
    if (!canAddProduct(currentProductCount)) {
      toast.error(`Você atingiu o limite de ${maxProducts} produtos. Faça upgrade para adicionar mais produtos.`)
      return
    }
    
    if (!titulo.trim()) {
      toast.error('Título é obrigatório!')
      return
    }

    // Validar que as URLs não são blob URLs
    if (capa?.startsWith('blob:')) {
      toast.error('Finalize o upload da imagem de capa antes de salvar')
      return
    }

    for (const url of galeria) {
      if (url.startsWith('blob:')) {
        toast.error('Finalize o upload de todas as imagens da galeria antes de salvar')
        return
      }
    }

    setLoading(true)
    
    try {
      const filtrosPayload = normalizeProdutoFiltros(produtoFiltros)
      const userId = user?.id

      if (!userId) {
        toast.error('Usuário não autenticado')
        return
      }

      const novoImovel = {
        tenant_id: tenantId,
        nome: titulo,
        preco: valor ? Number(valor) : null,
        tipo: tipo,
        finalidade: finalidade,
        area_total: areaTotal ? Number(areaTotal) : null,
        area_construida: areaConstruida ? Number(areaConstruida) : null,
        quartos: quartos ? Number(quartos) : null,
        banheiros: banheiros ? Number(banheiros) : null,
        vagas_garagem: vagasGaragem ? Number(vagasGaragem) : null,
        endereco: endereco || null,
        cidade: cidade || null,
        cep: cep || null,
        // destaque: destaque,
        capa_url: capa,
        galeria_urls: galeria.length > 0 ? galeria : null,
        arquivo_urls: arquivos.length > 0 ? arquivos : null,
        // tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        filtros: filtrosPayload,
      }

      const { data, error } = await supabase
        .from('produtos')
        .insert(novoImovel)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar produto:', error)
        toast.error('Erro ao criar produto: ' + error.message)
        return
      }

      toast.success('Produto criado com sucesso!')
      navigate(`/produtos/${data.id}`)
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao criar produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => navigate('/produtos')} />

      <div className="absolute inset-4 rounded-3xl bg-slate-900/95 border border-white/10 shadow-2xl max-w-[95vw] max-h-[95vh] mx-auto my-auto overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between rounded-t-3xl bg-slate-900/95 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white flex items-center justify-center border border-white/10">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Novo Produto</h3>
              <p className="text-sm text-gray-400">Cadastre um novo produto no sistema</p>
            </div>
          </div>
          <button className="p-2 rounded-xl hover:bg-white/5 border border-white/10" onClick={() => navigate('/imoveis')}>
            <X className="w-5 h-5 text-slate-200" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-form" onSubmit={handleSalvar} className="space-y-6">
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Coluna 1: Dados do Produto */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10 space-y-6">
                {/* Seção Identificação */}
                <div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2.5">Título *</label>
                    <input 
                      value={titulo} 
                      onChange={e => setTitulo(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                      placeholder="Apartamento Luxo" 
                    />
                  </div>
                </div>

                {/* Seção Classificação */}
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Tipo</label>
                      <select 
                        value={tipo} 
                        onChange={e => setTipo(e.target.value as ImovelTipo)} 
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm [&>option]:bg-slate-800"
                      >
                        <option value="apartamento">Apto</option>
                        <option value="casa">Casa</option>
                        <option value="sobrado">Sobrado</option>
                        <option value="cobertura">Cobertura</option>
                        <option value="terreno">Terreno</option>
                        <option value="comercial">Comercial</option>
                        <option value="industrial">Industrial</option>
                        <option value="rural">Rural</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Finalidade</label>
                      <select 
                        value={finalidade} 
                        onChange={e => setFinalidade(e.target.value as ImovelFinalidade)} 
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm [&>option]:bg-slate-800"
                      >
                        <option value="venda">Venda</option>
                        <option value="aluguel">Aluguel</option>
                        <option value="venda_aluguel">Ambos</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção Dimensões */}
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Área Total</label>
                      <input 
                        value={areaTotal} 
                        onChange={e => setAreaTotal(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                        placeholder="m²"
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Construída</label>
                      <input 
                        value={areaConstruida} 
                        onChange={e => setAreaConstruida(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                        placeholder="m²"
                        type="number"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">🛏️ Quartos</label>
                      <input 
                        value={quartos} 
                        onChange={e => setQuartos(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">🚿 Banhos</label>
                      <input 
                        value={banheiros} 
                        onChange={e => setBanheiros(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">🚗 Vagas</label>
                      <input 
                        value={vagasGaragem} 
                        onChange={e => setVagasGaragem(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                        type="number"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção Localização */}
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Endereço</label>
                      <input 
                        value={endereco} 
                        onChange={e => setEndereco(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                        placeholder="Rua, número, complemento"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2.5">Bairro</label>
                        <input 
                          value={bairro} 
                          onChange={e => setBairro(e.target.value)} 
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                          placeholder="Bairro"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2.5">Cidade</label>
                        <input 
                          value={cidade} 
                          onChange={e => setCidade(e.target.value)} 
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                          placeholder="Cidade"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2.5">CEP</label>
                        <input 
                          value={cep} 
                          onChange={e => setCep(e.target.value)} 
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                          placeholder="CEP"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Coluna 2: Filtros de Busca */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10 space-y-6">
                {/* Seção Empreendimento */}
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Incorporadora</label>
                      <div className="flex gap-2">
                        <select
                          value={produtoFiltros.incorporadora}
                          onChange={(e) => updateProdutoFiltro('incorporadora', e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm [&>option]:bg-slate-800"
                        >
                          <option value="">Selecione...</option>
                          {filtroOptions.incorporadoras.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddIncorporadora}
                          className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors"
                          title="Adicionar incorporadora"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Empreendimento</label>
                      <input
                        type="text"
                        placeholder="Nome do empreendimento"
                        value={produtoFiltros.empreendimento}
                        onChange={(e) => updateProdutoFiltro('empreendimento', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção Localização */}
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Referência</label>
                      <div className="flex gap-2">
                        <select
                          value={produtoFiltros.regiao}
                          onChange={(e) => updateProdutoFiltro('regiao', e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm [&>option]:bg-slate-800"
                        >
                          <option value="">Selecione...</option>
                          {filtroOptions.regioes.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddRegiao}
                          className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors"
                          title="Adicionar referência"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Estado</label>
                      <div className="flex gap-2">
                        <select
                          value={produtoFiltros.bairro}
                          onChange={(e) => updateProdutoFiltro('bairro', e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm [&>option]:bg-slate-800"
                        >
                          <option value="">Selecione...</option>
                          {filtroOptions.bairros.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddBairro}
                          className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors"
                          title="Adicionar estado"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção Preço */}
                <div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2.5">Preço Mínimo</label>
                    <input
                      type="number"
                      placeholder="R$ 0"
                      value={produtoFiltros.preco_min}
                      onChange={(e) => updateProdutoFiltro('preco_min', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm"
                    />
                  </div>
                </div>

                {/* Seção Metragem */}
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Área Mínima (m2)</label>
                      <input
                        type="number"
                        placeholder="m²"
                        value={produtoFiltros.metragem_min}
                        onChange={(e) => updateProdutoFiltro('metragem_min', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Área Máxima (m2)</label>
                      <input
                        type="number"
                        placeholder="m²"
                        value={produtoFiltros.metragem_max}
                        onChange={(e) => updateProdutoFiltro('metragem_max', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção Obras */}
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Fase</label>
                      <select
                        value={produtoFiltros.fase}
                        onChange={(e) => updateProdutoFiltro('fase', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm [&>option]:bg-slate-800"
                      >
                        <option value="">Selecione...</option>
                        <option value="LANÇAMENTO">🚀 Lançamento</option>
                        <option value="EM OBRAS">👷 Em Obras</option>
                        <option value="PRONTO">✅ Pronto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Data de Entrega</label>
                      <input
                        type="date"
                        value={produtoFiltros.entrega}
                        onChange={(e) => updateProdutoFiltro('entrega', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção Modalidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2.5">Modalidade</label>
                  <input
                    type="text"
                    placeholder="Ex: R2V, HMP, HIS2, N.R."
                    value={produtoFiltros.modalidade?.join(', ') || ''}
                    onChange={(e) => {
                      const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                      updateProdutoFiltro('modalidade', values)
                    }}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separe múltiplas modalidades por vírgula</p>
                </div>

                {/* Seção Ofertas */}
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Financiamento</label>
                      <select
                        value={produtoFiltros.financiamento_incorporadora ? 'true' : 'false'}
                        onChange={(e) => updateProdutoFiltro('financiamento_incorporadora', e.target.value === 'true')}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm [&>option]:bg-slate-800"
                      >
                        <option value="false">❌ Não</option>
                        <option value="true">✅ Sim</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2.5">Decorado</label>
                      <select
                        value={produtoFiltros.decorado ? 'true' : 'false'}
                        onChange={(e) => updateProdutoFiltro('decorado', e.target.value === 'true')}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm [&>option]:bg-slate-800"
                      >
                        <option value="false">❌ Não</option>
                        <option value="true">✨ Sim</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Coluna 3: Mídia */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10 space-y-6">
                {/* Seção Imagens */}
                <div>
                  
                  {/* Capa */}
                  <div className="mb-5">
                    <label className="text-sm font-medium text-gray-300 mb-2.5 block">Capa Principal</label>
                    <div 
                      onClick={onPickCapa}
                      className="border-2 border-dashed border-white/20 rounded-lg p-4 hover:border-emerald-400/50 hover:bg-white/5 transition cursor-pointer"
                    >
                      {capa ? (
                        <div className="relative">
                          <img src={capa} alt="Capa" className="w-full h-24 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCapa(null)
                            }}
                            className="absolute top-2 right-2 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Clique para enviar capa</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Galeria */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="text-sm font-medium text-gray-300">Galeria ({galeria.length})</label>
                      <button
                        type="button"
                        onClick={onPickGaleria}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                      >
                        + Adicionar
                      </button>
                    </div>
                    {galeria.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 max-h-28 overflow-y-auto">
                        {galeria.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img src={url} alt={`Gal ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={() => removeFromGaleria(idx)}
                              className="absolute top-1 right-1 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 border-2 border-dashed border-white/20 rounded-lg text-sm text-gray-400">
                        Nenhuma imagem
                      </div>
                    )}
                  </div>
                </div>

                {/* Seção Documentos */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-sm font-medium text-gray-300">Arquivos ({arquivos.length})</label>
                    <button
                      type="button"
                      onClick={onPickArquivos}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
                    >
                      + Adicionar
                    </button>
                  </div>
                  {arquivos.length > 0 ? (
                    <div className="space-y-2 max-h-28 overflow-y-auto">
                      {arquivos.map((url, idx) => {
                        const fileName = url.split('/').pop()?.slice(0, 20) || `Arq ${idx + 1}`
                        return (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-lg group">
                            <span className="text-lg">{getFileIcon(url)}</span>
                            <span className="text-gray-300 truncate flex-1 text-sm">{fileName}</span>
                            <button
                              type="button"
                              onClick={() => removeFromArquivos(idx)}
                              className="w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-3 border-2 border-dashed border-white/20 rounded-lg text-sm text-gray-400">
                      Nenhum arquivo
                    </div>
                  )}
                </div>

                {/* Seção Tags e Destaque                 <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">Tags e Destaque</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input 
                        value={tags} 
                        onChange={e => setTags(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm"
                        placeholder="Ex: luxo, piscina, garagem..." 
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-lg border border-white/10 h-full">
                        <input
                          type="checkbox"
                          id="destaque"
                          checked={destaque}
                          onChange={(e) => setDestaque(e.target.checked)}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/40 cursor-pointer flex-shrink-0"
                        />
                        <label htmlFor="destaque" className="text-sm text-gray-300 cursor-pointer">
                          Produto em Destaque?
                        </label>
                      </div>
                    </div>
                  </div>
                </div>*/}

              </div>
            </div>
          </form>
        </div>

        {/* Modal para adicionar opções */}
        {modalAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalAddOpen(false)} />
            <div className="absolute bg-slate-900/98 border border-white/10 rounded-2xl p-6 shadow-2xl w-96 max-w-[90vw]">
              <h2 className="text-lg font-bold text-white mb-4">
                {modalAddType === 'incorporadora' && 'Adicionar Incorporadora'}
                {modalAddType === 'regiao' && 'Adicionar Referência'}
                {modalAddType === 'bairro' && 'Adicionar Estado'}
              </h2>
              <input
                type="text"
                value={modalAddValue}
                onChange={(e) => setModalAddValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd()}
                placeholder={
                  modalAddType === 'incorporadora' ? 'Ex: Construtora XYZ' :
                  modalAddType === 'regiao' ? 'Ex: Centro' :
                  'Ex: São Paulo'
                }
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 mb-6"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModalAddOpen(false)}
                  className="px-6 py-2 rounded-lg text-slate-300 hover:bg-white/5 border border-white/10 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  disabled={!modalAddValue.trim()}
                  className="px-6 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex justify-between gap-4 bg-slate-900/95 flex-shrink-0">
          <div className="flex gap-4 ml-auto">
            <button 
              type="button"
              onClick={() => navigate('/imoveis')}
              className="px-6 py-3 rounded-xl text-slate-200 hover:bg-white/5 border border-white/10 font-medium transition-all text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              form="create-form"
              disabled={loading}
              className="px-6 py-3 rounded-xl text-white font-medium transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed text-sm bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-60"
            >
              {loading ? '⏳ Criando…' : '📦 Cadastrar Produto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
