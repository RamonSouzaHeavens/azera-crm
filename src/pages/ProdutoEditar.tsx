import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { uploadFileWithValidation } from '../services/storageService'
import { UploadCloud, X, Plus, Edit2 } from 'lucide-react'

export default function ProdutoEditar() {
  const { t: t18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { tenant, member } = useAuthStore()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
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
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | null>>({})
  const [showFieldModal, setShowFieldModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  
  // Estado do formulário do modal
  const [fieldForm, setFieldForm] = useState({
    nome: '',
    informacao: '',
    tipo: 'text' as 'text' | 'number' | 'date' | 'select',
    opcoes: [] as string[]
  })
  const [newOpcao, setNewOpcao] = useState('')

  useEffect(() => {
    if (!id || !tenantId) return
    
    const loadProduct = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single()
        
        if (error) throw error
        
        if (data) {
          setTitulo(data.nome || '')
          setDescricao(data.descricao || '')
          setValor(data.valor ? String(data.valor) : '')
          setCategoria(data.categoria || '')
          setCapa(data.capa_url || null)
          setGaleria((data.galeria as string[]) || [])
          setAnexos((data.anexos as string[]) || [])
        }

        // Carregar valores de campos personalizados do campo filtros
        if (data.filtros && typeof data.filtros === 'object') {
          setCustomFieldValues(data.filtros as Record<string, string | number | null>)
        }
      } catch (err) {
        console.error('Erro ao carregar produto:', err)
        toast.error('Erro ao carregar produto')
        navigate('/produtos')
      } finally {
        setLoading(false)
      }
    }
    
    loadProduct()
  }, [id, tenantId, navigate])

  // Carregar campos personalizados do banco de dados
  useEffect(() => {
    if (!tenantId) return
    
    const loadCustomFields = async () => {
      try {
        const { data, error } = await supabase
          .from('product_custom_fields')
          .select('id, field_key, field_label, field_type, field_options, field_default')
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .order('display_order', { ascending: true })
        
        if (error) throw error
        
        if (data) {
          const fields: CustomField[] = data.map(f => ({
            id: f.id,
            nome: f.field_label,
            informacao: f.field_default || '',
            tipo: (f.field_type || 'text') as 'text' | 'number' | 'date' | 'select',
            opcoes: f.field_options || []
          }))
          setCustomFields(fields)
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
    input.onchange = async (e: Event) => {
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
    input.onchange = async (e: Event) => {
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

  const onPickAnexos = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx'
    input.multiple = true
    input.onchange = async (e: Event) => {
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
            field_label: fieldForm.nome,
            field_default: fieldForm.informacao,
            field_type: fieldForm.tipo,
            field_options: fieldForm.tipo === 'select' ? fieldForm.opcoes : null,
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
            field_key: `field_${Date.now()}`,
            field_label: fieldForm.nome,
            field_type: fieldForm.tipo,
            field_default: fieldForm.informacao,
            field_options: fieldForm.tipo === 'select' ? fieldForm.opcoes : null,
            active: true,
            display_order: customFields.length
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



  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!titulo.trim()) {
      toast.error('Nome do produto é obrigatório')
      return
    }

    if (!id) {
      toast.error('ID do produto não encontrado')
      return
    }

    setSaving(true)

    try {
      const updateData = {
        nome: titulo,
        descricao: descricao || null,
        valor: valor ? Number(valor) : null,
        capa_url: capa,
        galeria: galeria.length > 0 ? galeria : null,
        anexos: anexos.length > 0 ? anexos : null,
        categoria: categoria || null,
        filtros: customFieldValues // ✅ Salvar campos personalizados no campo filtros
      }

      const { error } = await supabase
        .from('produtos')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      toast.success('Produto atualizado com sucesso!')
      navigate(`/app/produtos/${id}`)
    } catch (err) {
      console.error('Erro ao atualizar produto:', err)
      toast.error('Erro ao atualizar produto')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Editar Produto</h2>
            <p className="text-sm text-gray-600 mt-0.5">Atualize as informações do seu produto</p>
          </div>
          <button
            onClick={() => navigate('/produtos')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form id="edit-form" onSubmit={handleSalvar} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna 1: Básico */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Informações Básicas</h3>
              </div>

              {/* Grid para campos principais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Título *
                  </label>
                  <input
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                    placeholder="Nome do produto"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Categoria
                  </label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  >
                    <option value="">Selecione uma categoria</option>
                    <option value="servico">Serviço</option>
                    <option value="produto">Produto</option>
                    <option value="consulta">Consulta</option>
                    <option value="pacote">Pacote</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Descrição
                </label>
                <textarea
                  value={descricao}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescricao(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors resize-none"
                  placeholder="Descreva brevemente o produto..."
                />
              </div>

              {/* Campos Personalizados */}
              <div>
                <div className="pb-2 border-b border-gray-200 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Campos Personalizados</h3>
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
                          defaultValue={customFieldValues[field.id] || field.informacao}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                          placeholder={field.informacao || 'Digite aqui...'}
                        />
                      ) : field.tipo === 'number' ? (
                        <input
                          type="number"
                          defaultValue={customFieldValues[field.id] || field.informacao}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                          placeholder={field.informacao || 'Digite aqui...'}
                        />
                      ) : field.tipo === 'date' ? (
                        <input
                          type="date"
                          defaultValue={customFieldValues[field.id] || field.informacao}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                        />
                      ) : field.tipo === 'select' && field.opcoes ? (
                        <select
                          defaultValue={customFieldValues[field.id] || field.informacao}
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
                      Adicionar novo Campo
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna 2: Mídia */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Mídia</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Capa Principal
                </label>
                <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center relative overflow-hidden">
                  {capa ? (
                    <>
                      <img src={capa} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCapa(null)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={onPickCapa}
                      className="flex flex-col items-center gap-2 text-gray-400 hover:text-blue-500"
                    >
                      <UploadCloud className="w-8 h-8" />
                      <span className="text-sm font-medium">Clique para enviar</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Galeria ({galeria.length})
                  </label>
                  <button
                    type="button"
                    onClick={onPickGaleria}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition-colors border border-blue-200"
                  >
                    + Adicionar
                  </button>
                </div>

                {galeria.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {galeria.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                        <img src={img} alt={`Galeria ${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setGaleria(galeria.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-md transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Nenhuma imagem na galeria
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Anexos ({anexos.length})
                  </label>
                  <button
                    type="button"
                    onClick={onPickAnexos}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition-colors border border-blue-200"
                  >
                    + Adicionar
                  </button>
                </div>

                {anexos.length > 0 ? (
                  <div className="space-y-2">
                    {anexos.map((url, i) => {
                      const fileName = url.split('/').pop() || `Arquivo ${i + 1}`
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                              <span className="text-xs text-blue-600">📄</span>
                            </div>
                            <span className="flex-1 text-sm text-gray-700 font-medium">{fileName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAnexos(anexos.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    Nenhum documento anexado
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 border-t border-gray-200 bg-white/95 backdrop-blur flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/produtos')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            form="edit-form"
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Produto'}
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
