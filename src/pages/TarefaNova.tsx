import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, UploadCloud, CheckCircle, Circle, GripVertical, ArrowLeft, Save, ListChecks } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { uploadFileWithValidation } from '../services/storageService'
import TaskPresetSelector, { TaskPreset, TASK_PRESETS } from '../components/tasks/TaskPresetSelector'

interface UsuarioRef { id: string; display_name: string }
interface ClienteRef { id: string; nome: string }
interface ProdutoRef { id: string; nome: string }

interface ChecklistItem {
  id: string
  titulo: string
  concluido: boolean
  ordem: number
}

export default function TarefaNova() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant, user } = useAuthStore()

  // Estado do preset selecionado
  const [showPresetSelector, setShowPresetSelector] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState<TaskPreset | null>(null)

  // Estados básicos
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media')
  const [status, setStatus] = useState<'pendente' | 'em_andamento' | 'concluida' | 'cancelada'>('pendente')
  const [dataVencimento, setDataVencimento] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [produtoId, setProdutoId] = useState('')

  // Estados de mídia
  const [anexos, setAnexos] = useState<File[]>([])

  // Estados de checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')

  // Estados de UI
  const [loading, setLoading] = useState(false)
  const [responsaveis, setResponsaveis] = useState<UsuarioRef[]>([])
  const [clientes, setClientes] = useState<ClienteRef[]>([])
  const [produtos, setProdutos] = useState<ProdutoRef[]>([])

  // Aplicar preset selecionado
  const handlePresetSelect = (preset: TaskPreset) => {
    setSelectedPreset(preset)
    setShowPresetSelector(false)

    // Aplicar valores do preset
    setTitulo(preset.valores.titulo || '')
    setDescricao(preset.valores.descricao || '')
    setPrioridade(preset.valores.prioridade)

    // Criar checklist a partir do preset
    if (preset.valores.checklist.length > 0) {
      const checklistItems: ChecklistItem[] = preset.valores.checklist.map((item, index) => ({
        id: `preset-${Date.now()}-${index}`,
        titulo: item,
        concluido: false,
        ordem: index
      }))
      setChecklist(checklistItems)
    }
  }

  const loadResponsaveis = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_team_overview')

      if (error) {
        console.warn('Erro ao buscar membros da equipe:', error.message)
        setResponsaveis([])
        return
      }

      if (data?.members) {
        const usuarios = data.members.map((member: { user_id: string; nome: string }) => ({
          id: member.user_id,
          display_name: member.nome
        }))
        setResponsaveis(usuarios)
      } else {
        setResponsaveis([])
      }
    } catch (err) {
      console.error('Erro ao carregar responsáveis:', err)
      setResponsaveis([])
    }
  }, [tenant])

  const loadClientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .order('nome')

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }, [tenant])

  const loadProdutos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .order('nome')

      if (error) throw error
      setProdutos(data || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }, [tenant])

  useEffect(() => {
    if (tenant?.id) {
      loadResponsaveis()
      loadClientes()
      loadProdutos()
    }
  }, [tenant, loadResponsaveis, loadClientes, loadProdutos])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!titulo.trim()) {
      toast.error(t('tarefaNova.toasts.titleRequired'))
      return
    }

    if (!tenant?.id) {
      toast.error(t('tarefaNova.toasts.noTenant'))
      return
    }

    setLoading(true)

    try {
      // Criar tarefa
      const novaTarefa = {
        tenant_id: tenant.id,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        prioridade,
        status,
        data_vencimento: dataVencimento || null,
        responsavel_id: responsavelId || null,
        cliente_id: clienteId || null,
        produto_id: produtoId || null
      }

      const { data: tarefa, error: tarefaError } = await supabase
        .from('tarefas')
        .insert(novaTarefa)
        .select()
        .single()

      if (tarefaError) {
        console.error('Erro ao criar tarefa:', tarefaError)
        toast.error(t('tarefaNova.toasts.createError', { message: tarefaError.message }))
        return
      }

      // Salvar checklist
      if (checklist.length > 0) {
        const checklistInserts = checklist.map((item) => ({
          tarefa_id: tarefa.id,
          texto: item.titulo,
          done: item.concluido
        }))

        const { error: checklistError } = await supabase
          .from('tarefa_checklist')
          .insert(checklistInserts)

        if (checklistError) {
          console.error('Erro ao salvar checklist:', checklistError)
          toast.error(t('tarefaNova.toasts.checklistError'))
          return
        }
      }

      // Salvar anexos
      if (anexos.length > 0) {
        for (const file of anexos) {
          try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `tarefas/${tarefa.id}/${fileName}`;

            console.log('[TarefaNova] Fazendo upload do anexo:', file.name, '->', filePath);

            const result = await uploadFileWithValidation('attachments', filePath, file);

            if (!result.success || !result.url) {
              console.error('[TarefaNova] Falha no upload:', result.error);
              toast.error(t('tarefaNova.toasts.uploadError', { fileName: file.name }));
              continue;
            }

            const publicUrl = result.url;
            console.log('[TarefaNova] Upload concluído, inserindo em tarefa_anexos');

            const { error: anexoError } = await supabase.from('tarefa_anexos').insert({
              tarefa_id: tarefa.id,
              tenant_id: tenant.id,
              file_name: file.name,
              file_url: publicUrl,
              file_type: file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : 'pdf',
              uploaded_by: user?.id,
            });

            if (anexoError) {
              console.error('[TarefaNova] Erro ao inserir anexo:', anexoError);
              toast.error(t('tarefaNova.toasts.attachmentSaveError', { fileName: file.name }));
            }
          } catch (err) {
            console.error('[TarefaNova] Erro no upload do anexo:', err);
            toast.error(t('tarefaNova.toasts.uploadError', { fileName: file.name }));
          }
        }
      }

      toast.success(t('tarefaNova.toasts.success'))
      navigate('/app/tarefas')
    } catch (error) {
      console.error('Erro:', error)
      toast.error(t('tarefaNova.toasts.generalError'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem: ChecklistItem = {
        id: Date.now().toString(),
        titulo: newChecklistItem.trim(),
        concluido: false,
        ordem: checklist.length
      }
      setChecklist([...checklist, newItem])
      setNewChecklistItem('')
    }
  }

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item =>
      item.id === id ? { ...item, concluido: !item.concluido } : item
    ))
  }

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id))
  }

  const handleEditChecklistItem = (id: string, titulo: string) => {
    setChecklist(checklist.map(item =>
      item.id === id ? { ...item, titulo } : item
    ))
  }

  const handleReorderChecklist = (result: DropResult) => {
    if (!result.destination) return
    if (result.source.index === result.destination.index) return

    const items = Array.from(checklist)
    const [removed] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, removed)

    const reordered = items.map((item, idx) => ({ ...item, ordem: idx }))
    setChecklist(reordered)
  }

  const onPickAnexos = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,audio/*,.pdf'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files) {
        const newFiles = Array.from(files)
        setAnexos(prev => [...prev, ...newFiles])
        toast.success(t('tarefaNova.toasts.filesSelected', { count: newFiles.length }))
      }
    }
    input.click()
  }

  // Mostrar seletor de preset
  if (showPresetSelector) {
    return (
      <TaskPresetSelector
        onSelect={handlePresetSelect}
        onClose={() => navigate('/app/tarefas')}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="rounded-3xl border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/10 animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPresetSelector(true)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
              title="Voltar para presets"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              {selectedPreset && (
                <div className={`w-12 h-12 rounded-xl bg-slate-800/80 border ${selectedPreset.borderColor} flex items-center justify-center text-2xl`}>
                  {selectedPreset.emoji}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">{t('tarefaNova.header.title')}</h2>
                <p className="text-sm text-slate-400">
                  {selectedPreset ? `Tipo: ${selectedPreset.nome}` : t('tarefaNova.header.subtitle')}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/tarefas')}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form id="create-form" onSubmit={handleSalvar} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Coluna 1: Básico */}
            <div className="space-y-5">
              <div className="pb-2 border-b border-white/10">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-cyan-400" />
                  {t('tarefaNova.sections.basicInfo')}
                </h3>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  {t('tarefaNova.fields.title.label')}
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-base transition-all"
                  placeholder={t('tarefaNova.fields.title.placeholder')}
                  required
                  autoFocus
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  {t('tarefaNova.fields.description.label')}
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm transition-all resize-none"
                  placeholder={t('tarefaNova.fields.description.placeholder')}
                />
              </div>

              {/* Prioridade e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                    {t('tarefaNova.fields.priority.label')}
                  </label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as 'baixa' | 'media' | 'alta' | 'urgente')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm transition-all"
                  >
                    <option value="baixa" className="bg-slate-800">{t('tarefaNova.fields.priority.options.low')}</option>
                    <option value="media" className="bg-slate-800">{t('tarefaNova.fields.priority.options.medium')}</option>
                    <option value="alta" className="bg-slate-800">{t('tarefaNova.fields.priority.options.high')}</option>
                    <option value="urgente" className="bg-slate-800">{t('tarefaNova.fields.priority.options.urgent')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                    {t('tarefaNova.fields.status.label')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'pendente' | 'em_andamento' | 'concluida' | 'cancelada')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm transition-all"
                  >
                    <option value="pendente" className="bg-slate-800">{t('tarefaNova.fields.status.options.pending')}</option>
                    <option value="em_andamento" className="bg-slate-800">{t('tarefaNova.fields.status.options.inProgress')}</option>
                    <option value="concluida" className="bg-slate-800">{t('tarefaNova.fields.status.options.completed')}</option>
                    <option value="cancelada" className="bg-slate-800">{t('tarefaNova.fields.status.options.canceled')}</option>
                  </select>
                </div>
              </div>

              {/* Data de Vencimento */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  {t('tarefaNova.fields.dueDate.label')}
                </label>
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm transition-all [color-scheme:dark]"
                />
              </div>

              {/* Responsável, Cliente e Produto */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                    {t('tarefaNova.fields.responsible.label')}
                  </label>
                  <select
                    value={responsavelId}
                    onChange={(e) => setResponsavelId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm transition-all"
                  >
                    <option value="" className="bg-slate-800">{t('tarefaNova.fields.select.placeholder')}</option>
                    {responsaveis.map((resp) => (
                      <option key={resp.id} value={resp.id} className="bg-slate-800">{resp.display_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                      {t('tarefaNova.fields.client.label')}
                    </label>
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm transition-all"
                    >
                      <option value="" className="bg-slate-800">{t('tarefaNova.fields.select.placeholder')}</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id} className="bg-slate-800">{cliente.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                      {t('tarefaNova.fields.product.label')}
                    </label>
                    <select
                      value={produtoId}
                      onChange={(e) => setProdutoId(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm transition-all"
                    >
                      <option value="" className="bg-slate-800">{t('tarefaNova.fields.select.placeholder')}</option>
                      {produtos.map((produto) => (
                        <option key={produto.id} value={produto.id} className="bg-slate-800">{produto.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 2: Checklist e Anexos */}
            <div className="space-y-5">
              {/* Checklist */}
              <div>
                <div className="pb-2 border-b border-white/10 mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    {t('tarefaNova.sections.checklist')}
                    {checklist.length > 0 && (
                      <span className="ml-auto text-xs font-normal text-slate-500">
                        {checklist.filter(i => i.concluido).length}/{checklist.length}
                      </span>
                    )}
                  </h3>
                </div>

                {/* Adicionar item ao checklist */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm"
                    placeholder={t('tarefaNova.fields.checklist.placeholder')}
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl text-sm font-medium transition-colors border border-cyan-500/30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Lista do checklist com drag and drop */}
                {checklist.length > 0 && (
                  <DragDropContext onDragEnd={handleReorderChecklist}>
                    <Droppable droppableId="checklist">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2 max-h-64 overflow-y-auto pr-2"
                        >
                          {checklist.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center gap-2 p-2.5 rounded-xl transition-all group ${
                                    snapshot.isDragging
                                      ? 'bg-cyan-500/20 ring-2 ring-cyan-500/50 shadow-lg'
                                      : 'bg-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 transition-colors"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleChecklistItem(item.id)}
                                    className="text-slate-400 hover:text-emerald-400 transition-colors"
                                  >
                                    {item.concluido ? (
                                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                      <Circle className="w-5 h-5" />
                                    )}
                                  </button>
                                  <input
                                    type="text"
                                    value={item.titulo}
                                    onChange={(e) => handleEditChecklistItem(item.id, e.target.value)}
                                    className={`flex-1 bg-transparent border-none text-sm p-1 focus:ring-0 focus:outline-none ${
                                      item.concluido ? 'line-through text-slate-500' : 'text-white'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveChecklistItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}

                {checklist.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Nenhum item no checklist
                  </div>
                )}
              </div>

              {/* Anexos */}
              <div>
                <div className="pb-2 border-b border-white/10 mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-purple-400" />
                    {t('tarefaNova.sections.attachments')}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={onPickAnexos}
                  className="w-full h-28 rounded-xl border-2 border-dashed border-white/10 bg-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-center group"
                >
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-sm text-slate-500 group-hover:text-cyan-400 transition-colors">
                      {t('tarefaNova.fields.attachments.placeholder')}
                    </span>
                  </div>
                </button>

                {anexos.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {anexos.map((anexo, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <span className="flex-1 text-sm text-slate-300 truncate">
                          {anexo.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAnexos(anexos.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    {t('tarefaNova.fields.attachments.empty')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 p-5 border-t border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowPresetSelector(true)}
            className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Trocar Preset
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/tarefas')}
              className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              {t('tarefaNova.buttons.cancel')}
            </button>
            <button
              form="create-form"
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 text-white text-sm font-semibold rounded-xl transition-all disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? t('tarefaNova.buttons.creating') : t('tarefaNova.buttons.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
