import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, UploadCloud, CheckCircle, Circle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { uploadFileWithValidation } from '../services/storageService'

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

  // Estados de campos personalizados
  // Removido - funcionalidade não implementada

  // Estados de checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')

  // Estados de UI
  const [loading, setLoading] = useState(false)
  const [responsaveis, setResponsaveis] = useState<UsuarioRef[]>([])
  const [clientes, setClientes] = useState<ClienteRef[]>([])
  const [produtos, setProdutos] = useState<ProdutoRef[]>([])

  // Estados do modal de campo personalizado
  // Removido - funcionalidade não implementada

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

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl border shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-[#0C1326] border-gray-200 dark:border-white/10">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white/95 dark:bg-transparent dark:backdrop-blur border-gray-200 dark:border-white/10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('tarefaNova.header.title')}</h2>
            <p className="text-sm text-gray-600 mt-0.5 dark:text-gray-300">{t('tarefaNova.header.subtitle')}</p>
          </div>
          <button
            onClick={() => navigate('/app/tarefas')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form id="create-form" onSubmit={handleSalvar} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna 1: Básico */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('tarefaNova.sections.basicInfo')}</h3>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-2">
                  {t('tarefaNova.fields.title.label')}
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  placeholder={t('tarefaNova.fields.title.placeholder')}
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-2">
                  {t('tarefaNova.fields.description.label')}
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors resize-none"
                  placeholder={t('tarefaNova.fields.description.placeholder')}
                />
              </div>

              {/* Prioridade, Status e Data de Vencimento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-2">
                    {t('tarefaNova.fields.priority.label')}
                  </label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as 'baixa' | 'media' | 'alta' | 'urgente')}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  >
                    <option value="baixa">{t('tarefaNova.fields.priority.options.low')}</option>
                    <option value="media">{t('tarefaNova.fields.priority.options.medium')}</option>
                    <option value="alta">{t('tarefaNova.fields.priority.options.high')}</option>
                    <option value="urgente">{t('tarefaNova.fields.priority.options.urgent')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-2">
                    {t('tarefaNova.fields.status.label')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'pendente' | 'em_andamento' | 'concluida' | 'cancelada')}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  >
                    <option value="pendente">{t('tarefaNova.fields.status.options.pending')}</option>
                    <option value="em_andamento">{t('tarefaNova.fields.status.options.inProgress')}</option>
                    <option value="concluida">{t('tarefaNova.fields.status.options.completed')}</option>
                    <option value="cancelada">{t('tarefaNova.fields.status.options.canceled')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-2">
                    {t('tarefaNova.fields.dueDate.label')}
                  </label>
                  <input
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Responsável, Cliente e Produto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-2">
                    {t('tarefaNova.fields.responsible.label')}
                  </label>
                  <select
                    value={responsavelId}
                    onChange={(e) => setResponsavelId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  >
                    <option value="">{t('tarefaNova.fields.select.placeholder')}</option>
                    {responsaveis.map((resp) => (
                      <option key={resp.id} value={resp.id}>{resp.display_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-2">
                    {t('tarefaNova.fields.client.label')}
                  </label>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  >
                    <option value="">{t('tarefaNova.fields.select.placeholder')}</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-2">
                    {t('tarefaNova.fields.product.label')}
                  </label>
                  <select
                    value={produtoId}
                    onChange={(e) => setProdutoId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  >
                    <option value="">{t('tarefaNova.fields.select.placeholder')}</option>
                    {produtos.map((produto) => (
                      <option key={produto.id} value={produto.id}>{produto.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Coluna 2: Checklist e Anexos */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">{t('tarefaNova.sections.checklist')}</h3>
              </div>

              {/* Adicionar item ao checklist */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder={t('tarefaNova.fields.checklist.placeholder')}
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2 bg-blue-50 dark:bg-white/5 hover:bg-blue-100 dark:hover:bg-white/10 text-blue-600 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors border border-blue-200 dark:border-white/10"
                >
                  <Plus className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                </button>
              </div>

              {/* Lista do checklist */}
              {checklist.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleToggleChecklistItem(item.id)}
                        className="text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        {item.concluido ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${item.concluido ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {item.titulo}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Anexos */}
              <div className="space-y-3">
                <div className="pb-2 border-b border-gray-200 dark:border-white/10">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">{t('tarefaNova.sections.attachments')}</h3>
                </div>

                <button
                  type="button"
                  onClick={onPickAnexos}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-white/5 transition-all flex items-center justify-center group"
                >
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs text-gray-500 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                      {t('tarefaNova.fields.attachments.placeholder')}
                    </span>
                  </div>
                </button>

                {anexos.length > 0 ? (
                  <div className="space-y-2">
                    {anexos.map((anexo, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">
                          {anexo.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAnexos(anexos.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-300 text-xs">
                    {t('tarefaNova.fields.attachments.empty')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-transparent backdrop-blur flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/tarefas')}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white text-sm font-medium transition-colors"
          >
            {t('tarefaNova.buttons.cancel')}
          </button>
          <button
            form="create-form"
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {loading ? t('tarefaNova.buttons.creating') : t('tarefaNova.buttons.create')}
          </button>
        </div>
      </div>

    </div>
  )
}
