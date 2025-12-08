import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'
import { uploadFileWithValidation } from '../services/storageService'
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { FileUpload } from '../components/ui/FileUpload';
import { UploadCloud, X, Plus, Edit2 } from 'lucide-react'

export default function ProdutoNovoSimples() {
  const { t: t18n } = useTranslation()
  const navigate = useNavigate()
  const { tenant, member, user } = useAuthStore()
  const { canAddProduct, maxProducts } = useSubscriptionLimits()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])

  const [currentProductCount, setCurrentProductCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Campos básicos universais
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState('')

  // Mídia
  const [capa, setCapa] = useState<string | null>(null)
  const [galeria, setGaleria] = useState<string[]>([])

  // Anexos
  const [anexos, setAnexos] = useState<string[]>([])

  // Campos Personalizados
  interface CustomField {
    id: string
    nome: string
    informacao: string
    tipo: 'text' | 'number' | 'date' | 'select'
    opcoes?: string[] // Para tipo select
  }

  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [showFieldModal, setShowFieldModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)

  // Estado do formulário do modal
  const [fieldForm, setFieldForm] = useState({
    nome: '',
    informacao: '',
    tipo: 'text' as const,
    opcoes: [] as string[]
  })
  const [newOpcao, setNewOpcao] = useState('')

  // Verificar contagem atual de produtos
  useEffect(() => {
    if (!tenantId) return

    const fetchProductCount = async () => {
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

  // Carregar campos personalizados do banco de dados
  useEffect(() => {
    if (!tenantId) return

    const loadCustomFields = async () => {
      try {
        const { data, error } = await supabase
          .from('product_custom_fields')
          .select('id, field_name, field_type, options, display_order')
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .order('display_order', { ascending: true })

        if (error) throw error

        if (data) {
          const fields: CustomField[] = data.map(f => ({
            id: f.id,
            nome: f.field_name,
            informacao: '', // No default value column in schema
            tipo: (f.field_type || 'text') as any,
            opcoes: f.options || []
          }))
          setCustomFields(fields)

          // ✅ Inicializar valores padrão dos campos personalizados
          const initialValues: Record<string, any> = {}
          fields.forEach(field => {
            if (field.informacao) {
              initialValues[field.id] = field.informacao
            }
          })
          setCustomFieldValues(initialValues)
        }
      } catch (err) {
        console.error('Erro ao carregar campos personalizados:', err)
      }
    }

    loadCustomFields()
  }, [tenantId])

  const uploadToStorage = async (path: string, file: File): Promise<string | null> => {
    try {
      const result = await uploadFileWithValidation('produtos', path, file)
      if (result.success && result.url) {
        return result.url
      } else {
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
          const tempId = Date.now().toString()
          const ext = file.name.split('.').pop() ?? 'jpg'
          const path = `capa/${tenantId}/${tempId}/capa.${ext}`
          const url = await uploadToStorage(path, file)
          if (url) {
            setCapa(url)
            toast.success('Capa carregada!')
          }
        } catch (error) {
          console.error('Erro ao fazer upload da capa:', error)
          toast.error('Erro ao carregar capa')
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
            const path = `galeria/${tenantId}/${tempId}/${i}.${ext}`
            const url = await uploadToStorage(path, file)
            if (url) {
              urls.push(url)
            }
          }
          setGaleria(prev => [...prev, ...urls])
          toast.success(`${urls.length} imagem(ns) adicionada(s)!`)
        } catch (error) {
          console.error('Erro ao fazer upload da galeria:', error)
          toast.error('Erro ao carregar imagens')
        }
      }
    }
    input.click()
  }

  const removeFromGaleria = (index: number) => {
    setGaleria(prev => prev.filter((_, i) => i !== index))
  }

  const onPickAnexos = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx'
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
            const path = `anexos/${tenantId}/${tempId}/${i}.${ext}`
            const url = await uploadToStorage(path, file)
            if (url) {
              urls.push(url)
            }
          }
          setAnexos(prev => [...prev, ...urls])
          toast.success(`${urls.length} documento(s) anexado(s)!`)
        } catch (error) {
          console.error('Erro ao fazer upload dos anexos:', error)
          toast.error('Erro ao anexar documentos')
        }
      }
    }
    input.click()
  }

  const removeFromAnexos = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index))
  }

  // Funções para campos personalizados
  const handleOpenFieldModal = (field?: CustomField) => {
    if (field) {
      setEditingField(field)
      setFieldForm({
        nome: field.nome,
        informacao: field.informacao,
        tipo: field.tipo,
        opcoes: field.opcoes || []
      })
    } else {
      setEditingField(null)
      setFieldForm({ nome: '', informacao: '', tipo: 'text', opcoes: [] })
    }
    setNewOpcao('')
    setShowFieldModal(true)
  }

  const handleCloseFieldModal = () => {
    setShowFieldModal(false)
    setEditingField(null)
    setFieldForm({ nome: '', informacao: '', tipo: 'text', opcoes: [] })
    setNewOpcao('')
  }

  const handleSaveField = async () => {
    if (!fieldForm.nome.trim()) {
      toast.error('Nome do campo é obrigatório!')
      return
    }

    if (fieldForm.tipo === 'select' && fieldForm.opcoes.length === 0) {
      toast.error('Adicione pelo menos uma opção para o campo de seleção!')
      return
    }

    try {
      if (editingField) {
        // Atualizar campo existente no banco
        const { error } = await supabase
          .from('product_custom_fields')
          .update({
            field_name: fieldForm.nome,
            field_type: fieldForm.tipo,
            options: fieldForm.tipo === 'select' ? fieldForm.opcoes : null,
            show_in_filters: true,
            show_in_list: true,
            searchable: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingField.id)
          .eq('tenant_id', tenantId)

        if (error) throw error

        // Atualizar estado local
        setCustomFields(prev =>
          prev.map(f => f.id === editingField.id
            ? { ...f, nome: fieldForm.nome, informacao: fieldForm.informacao, tipo: fieldForm.tipo, opcoes: fieldForm.opcoes }
            : f
          )
        )
        toast.success('Campo atualizado!')
      } else {
        // Criar novo campo no banco
        const { data, error } = await supabase
          .from('product_custom_fields')
          .insert({
            tenant_id: tenantId,
            field_name: fieldForm.nome,
            field_type: fieldForm.tipo,
            options: fieldForm.tipo === 'select' ? fieldForm.opcoes : null,
            active: true,
            display_order: customFields.length,
            required: false,
            show_in_list: true,
            show_in_filters: true,
            searchable: true
          })
          .select()

        if (error) throw error

        if (data && data[0]) {
          const newField: CustomField = {
            id: data[0].id,
            nome: fieldForm.nome,
            informacao: fieldForm.informacao,
            tipo: fieldForm.tipo,
            opcoes: fieldForm.opcoes
          }
          setCustomFields(prev => [...prev, newField])
          toast.success('Campo criado!')
        }
      }

      handleCloseFieldModal()
    } catch (error) {
      console.error('Erro ao salvar campo:', error)
      toast.error('Erro ao salvar campo')
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    try {
      const { error } = await supabase
        .from('product_custom_fields')
        .update({ active: false })
        .eq('id', fieldId)
        .eq('tenant_id', tenantId)

      if (error) throw error

      setCustomFields(prev => prev.filter(f => f.id !== fieldId))
      toast.success('Campo removido!')
    } catch (err) {
      console.error('Erro ao remover campo:', err)
      toast.error('Erro ao remover campo')
    }
  }

  const handleAddOpcao = () => {
    if (!newOpcao.trim()) {
      toast.error('Digite uma opção!')
      return
    }
    setFieldForm(prev => ({
      ...prev,
      opcoes: [...prev.opcoes, newOpcao.trim()]
    }))
    setNewOpcao('')
  }

  const handleRemoveOpcao = (index: number) => {
    setFieldForm(prev => ({
      ...prev,
      opcoes: prev.opcoes.filter((_, i) => i !== index)
    }))
  }

  const saveCustomFieldValue = async (produtoId: string, fieldId: string, value: any) => {
    try {
      const { error } = await supabase
        .from('product_custom_field_values')
        .insert({
          produto_id: produtoId,
          custom_field_id: fieldId,
          value_text: typeof value === 'string' ? value : null,
          value_number: typeof value === 'number' ? value : null,
          value_boolean: typeof value === 'boolean' ? value : null,
        })

      if (error) throw error
    } catch (err) {
      console.error(`Erro ao salvar valor do campo ${fieldId}:`, err)
      // Não lançar erro aqui para não interromper o fluxo
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canAddProduct(currentProductCount)) {
      toast.error(`Você atingiu o limite de ${maxProducts} produtos. Faça upgrade para adicionar mais produtos.`)
      return
    }

    if (!titulo.trim()) {
      toast.error('Título é obrigatório!')
      return
    }

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

    for (const url of anexos) {
      if (url.startsWith('blob:')) {
        toast.error('Finalize o upload de todos os anexos antes de salvar')
        return
      }
    }

    setLoading(true)

    try {
      const userId = user?.id
      if (!userId) {
        toast.error('Usuário não autenticado')
        return
      }

      // 1. Criar produto básico com campos personalizados no filtros
      const novoProduto = {
        tenant_id: tenantId,
        nome: titulo,
        descricao: descricao || null,
        valor: valor ? Number(valor) : null,
        capa_url: capa,
        categoria: categoria || null,
        galeria: galeria.length > 0 ? galeria : null,
        anexos: anexos.length > 0 ? anexos : null,
        filtros: customFieldValues // ✅ Salvar campos personalizados aqui
      }

      const { data: produto, error: produtoError } = await supabase
        .from('produtos')
        .insert(novoProduto)
        .select()
        .single()

      if (produtoError) {
        console.error('Erro ao criar produto:', produtoError)
        toast.error('Erro ao criar produto: ' + produtoError.message)
        return
      }

      toast.success('Produto criado com sucesso!')
      navigate(`/app/produtos/${produto.id}`)
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao criar produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Overlay - Light mode
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Modal Center - Light mode */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header - Light mode */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t18n('products.newProduct.title')}</h2>
            <p className="text-sm text-gray-600 mt-0.5">{t18n('products.newProduct.subtitle')}</p>
          </div>
          <button
            onClick={() => navigate('/produtos')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - 3 Columns */}
        <form id="create-form" onSubmit={handleSalvar} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna 1: Básico */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t18n('products.newProduct.basicInfo')}</h3>
              </div>

              {/* Título, Valor e Categoria lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {t18n('products.newProduct.titleLabel')}
                  </label>
                  <input
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                    placeholder={t18n('products.newProduct.titlePlaceholder')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {t18n('products.newProduct.valueLabel')}
                  </label>
                  <input
                    type="number"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                    placeholder={t18n('products.newProduct.valuePlaceholder')}
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {t18n('products.newProduct.categoryLabel')}
                  </label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  >
                    <option value="">{t18n('products.newProduct.categoryPlaceholder')}</option>
                    <option value="servico">Serviço</option>
                    <option value="produto">Produto</option>
                    <option value="consulta">Consulta</option>
                    <option value="pacote">Pacote</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  {t18n('products.newProduct.descriptionLabel')}
                </label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors resize-none"
                  placeholder={t18n('products.newProduct.descriptionPlaceholder')}
                />
              </div>

              {/* Campos Personalizados */}
              <div>
                <div className="pb-2 border-b border-gray-200 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t18n('products.newProduct.customFields')}</h3>
                </div>

                {/* Grid de campos personalizados */}
                <div className="grid grid-cols-2 gap-3">
                  {customFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          {field.nome}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenFieldModal(field)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>

                      {field.tipo === 'text' ? (
                        <input
                          type="text"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                          placeholder={field.informacao || 'Digite aqui...'}
                        />
                      ) : field.tipo === 'number' ? (
                        <input
                          type="number"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                          placeholder={field.informacao || 'Digite aqui...'}
                        />
                      ) : field.tipo === 'date' ? (
                        <input
                          type="date"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                        />
                      ) : field.tipo === 'select' && field.opcoes ? (
                        <select
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                        >
                          <option value="">Selecione...</option>
                          {field.opcoes.map((opcao, idx) => (
                            <option key={idx} value={opcao}>{opcao}</option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ))}

                  {/* Botão adicionar novo campo */}
                  <button
                    type="button"
                    onClick={() => handleOpenFieldModal()}
                    className="h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                    <span className="text-xs text-gray-500 group-hover:text-blue-600 font-medium">
                      {t18n('products.newProduct.addNewField')}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna 2: Mídia */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t18n('products.newProduct.media')}</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  {t18n('products.newProduct.mainCover')}
                </label>
                <button
                  type="button"
                  onClick={onPickCapa}
                  className="w-full h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center group relative overflow-hidden"
                >
                  {capa ? (
                    <>
                      <img src={capa} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium">Alterar</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      <span className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                        {t18n('products.newProduct.clickToUpload')}
                      </span>
                    </div>
                  )}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {t18n('products.newProduct.gallery')} ({galeria.length})
                  </label>
                  <button
                    type="button"
                    onClick={onPickGaleria}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition-colors border border-blue-200"
                  >
                    {t18n('products.newProduct.addButton')}
                  </button>
                </div>

                {galeria.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {galeria.map((url, idx) => (
                      <div key={idx} className="relative group rounded overflow-hidden aspect-square">
                        <img src={url} alt={`Galeria ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFromGaleria(idx)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    {t18n('products.newProduct.noImagesYet')}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {t18n('products.newProduct.attachments')} ({anexos.length})
                  </label>
                  <button
                    type="button"
                    onClick={onPickAnexos}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition-colors border border-blue-200"
                  >
                    {t18n('products.newProduct.addButton')}
                  </button>
                </div>

                {anexos.length > 0 ? (
                  <div className="space-y-2">
                    {anexos.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-xs text-blue-600">📄</span>
                          </div>
                          <span className="text-xs text-gray-700 truncate">
                            Documento {idx + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Ver
                          </a>
                          <button
                            type="button"
                            onClick={() => removeFromAnexos(idx)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    {t18n('products.newProduct.noDocumentsAttached')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer - Light mode */}
        <div className="sticky bottom-0 p-6 border-t border-gray-200 bg-white/95 backdrop-blur flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/produtos')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
          >
            {t18n('products.newProduct.cancel')}
          </button>
          <button
            form="create-form"
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {loading ? t18n('products.newProduct.creating') : t18n('products.newProduct.createProduct')}
          </button>
        </div>
      </div>

      {/* Modal de Criação/Edição de Campo Personalizado */}
      {showFieldModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-md">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {editingField ? t18n('products.customFields.editField') : t18n('products.customFields.newField')}
              </h3>
              <button
                onClick={handleCloseFieldModal}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body do Modal */}
            <div className="p-4 space-y-4">
              {/* ID do campo (somente ao editar) */}
              {editingField && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {t18n('products.customFields.fieldId')}
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 text-sm font-mono">
                    {editingField.id}
                  </div>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  {t18n('products.customFields.nameRequired')}
                </label>
                <input
                  type="text"
                  value={fieldForm.nome}
                  onChange={e => setFieldForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder={t18n('products.customFields.namePlaceholder')}
                />
              </div>

              {/* Informação, Data Padrão ou Seleção Padrão */}
              {fieldForm.tipo === 'date' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {t18n('products.customFields.defaultDate')}
                  </label>
                  <input
                    type="date"
                    value={fieldForm.informacao}
                    onChange={e => setFieldForm(prev => ({ ...prev, informacao: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>
              ) : fieldForm.tipo === 'select' && fieldForm.opcoes.length > 0 ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {t18n('products.customFields.defaultValue')}
                  </label>
                  <select
                    value={fieldForm.informacao}
                    onChange={e => setFieldForm(prev => ({ ...prev, informacao: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  >
                    <option value="">{t18n('products.customFields.noDefaultValue')}</option>
                    {fieldForm.opcoes.map((opcao, idx) => (
                      <option key={idx} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {t18n('products.customFields.information')}
                  </label>
                  <textarea
                    value={fieldForm.informacao}
                    onChange={e => setFieldForm(prev => ({ ...prev, informacao: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm resize-none"
                    placeholder={t18n('products.customFields.informationPlaceholder')}
                  />
                </div>
              )}

              {/* Tipo de Campo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  {t18n('products.customFields.fieldType')}
                </label>
                <select
                  value={fieldForm.tipo}
                  onChange={e => setFieldForm(prev => ({ ...prev, tipo: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                >
                  <option value="text">{t18n('products.customFields.typeText')}</option>
                  <option value="number">{t18n('products.customFields.typeNumber')}</option>
                  <option value="date">{t18n('products.customFields.typeDate')}</option>
                  <option value="select">{t18n('products.customFields.typeSelect')}</option>
                </select>
              </div>

              {/* Opções (somente para tipo select) */}
              {fieldForm.tipo === 'select' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {t18n('products.customFields.optionsRequired')}
                  </label>

                  {/* Lista de opções */}
                  {fieldForm.opcoes.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {fieldForm.opcoes.map((opcao, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                          <span className="text-sm text-gray-700">{opcao}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOpcao(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input para adicionar nova opção */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOpcao}
                      onChange={e => setNewOpcao(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddOpcao())}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                      placeholder={t18n('products.customFields.optionPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={handleAddOpcao}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors border border-blue-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200">
              {editingField && (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteField(editingField.id)
                    handleCloseFieldModal()
                  }}
                  className="px-4 py-2 text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                >
                  {t18n('products.customFields.deleteField')}
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  type="button"
                  onClick={handleCloseFieldModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                >
                  {t18n('products.customFields.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveField}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {t18n('products.customFields.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
