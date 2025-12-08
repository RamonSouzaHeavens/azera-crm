import React, { useState, useEffect } from 'react';
import { ImageIcon, FileText, Volume2, Plus, Upload, Download, Trash } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast'
import { uploadFileWithValidation } from '../../services/storageService'

interface TaskAttachmentsProps {
  tarefaId: string;
}

export const TaskAttachments: React.FC<TaskAttachmentsProps> = ({ tarefaId }) => {
  const { tenant, user } = useAuthStore();
  const { isDark } = useThemeStore()
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([])
  const [showUploadForm, setShowUploadForm] = useState(false);

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm('Deseja realmente excluir este anexo?')) return
    try {
      setDeletingId(id)
      console.log('[TaskAttachments] Deletando anexo id:', id, 'tenant:', tenant?.id)
      const { error } = await supabase
        .from('tarefa_anexos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenant?.id)

      if (error) {
        console.error('[TaskAttachments] Erro ao deletar anexo:', error)
        toast.error('Erro ao deletar anexo')
        return
      }

      toast.success('Anexo removido')
      await loadAttachments()
    } catch (err) {
      console.error('[TaskAttachments] Erro no delete flow:', err)
      toast.error('Erro ao deletar anexo')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (att: any) => {
    if (!att?.file_url) return;
    try {
      setDownloadingId(att.id)
      console.log('[TaskAttachments] Iniciando download:', att.file_url)
      const res = await fetch(att.file_url, { method: 'GET', mode: 'cors' })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = att.file_name || 'download'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Download iniciado')
    } catch (err) {
      console.error('[TaskAttachments] erro no download:', err)
      toast.error('Falha ao baixar localmente — abrindo em nova aba')
      window.open(att.file_url, '_blank', 'noopener noreferrer')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('[TaskAttachments] Nenhum arquivo selecionado');
      return;
    }
    console.log('[TaskAttachments] Arquivo selecionado:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size);
    console.log('[TaskAttachments] Tenant ID:', tenant?.id, 'User ID:', user?.id, 'Tarefa ID:', tarefaId);

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `tarefas/${tarefaId}/${fileName}`;

      console.log('[TaskAttachments] Iniciando upload via uploadFileWithValidation ->', filePath);

      const result = await uploadFileWithValidation('attachments', filePath, file)

      if (!result.success || !result.url) {
        console.error('[TaskAttachments] uploadFileWithValidation falhou:', result.error)
        toast.error('Erro ao enviar arquivo: ' + (result.error || 'desconhecido'))
        return
      }

      const publicUrl = result.url
      console.log('[TaskAttachments] Upload concluído, URL pública:', publicUrl)

      console.log('[TaskAttachments] Inserindo registro em tarefa_anexos')
      const { error: insertError } = await supabase.from('tarefa_anexos').insert({
        tarefa_id: tarefaId,
        tenant_id: tenant?.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : 'pdf',
        uploaded_by: user?.id,
      })

      if (insertError) {
        console.error('[TaskAttachments] Erro no insert na tabela:', insertError);
        toast.error('Erro ao salvar anexo')
        return;
      }

      console.log('[TaskAttachments] Insert concluído, recarregando anexos');
      toast.success('Anexo adicionado')
      // Recarregar anexos após upload
      await loadAttachments();
    } catch (err) {
      console.error('[TaskAttachments] Erro no fluxo de upload:', err)
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
    }
  };

  const loadAttachments = async () => {
    if (!tarefaId || !tenant?.id) {
      console.log('[TaskAttachments] loadAttachments pulado - tarefaId ou tenant ausente:', tarefaId, tenant?.id);
      return;
    }
    console.log('[TaskAttachments] Carregando anexos para tarefa:', tarefaId, 'tenant:', tenant.id);
    const { data, error } = await supabase
      .from('tarefa_anexos')
      .select('*')
      .eq('tarefa_id', tarefaId)
      .eq('tenant_id', tenant?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TaskAttachments] Erro ao carregar anexos:', error);
      return;
    }

    console.log('[TaskAttachments] Anexos carregados:', data?.length || 0, 'itens');
    setAttachments(data || []);
  }

  useEffect(() => {
    console.log('[TaskAttachments] useEffect chamado com tarefaId:', tarefaId, 'tenant:', tenant?.id);
    void loadAttachments()
  }, [tarefaId, tenant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Anexos ({attachments.length})</h3>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 rounded-lg transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Anexo
        </button>
      </div>

      {showUploadForm && (
        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Selecione um arquivo para anexar
              </label>
              <div className="flex items-center gap-3">
                <input
                  className="hidden"
                  id={`attach-task-${tarefaId}`}
                  type="file"
                  accept="image/*,audio/*,.pdf"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <label
                  htmlFor={`attach-task-${tarefaId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white cursor-pointer transition-all text-sm disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                </label>
                {uploading && <span className="text-sm text-slate-500 dark:text-slate-300">Enviando arquivo...</span>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Tipos aceitos: Imagens, áudios e PDFs
              </p>
            </div>
          </div>
        </div>
      )}

      {attachments.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum anexo adicionado ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {attachments.map(att => (
            <div key={att.id} className={`p-2 rounded-xl border ${isDark ? 'border-white/6 bg-white/5' : 'border-slate-200 bg-white'} flex items-start gap-3`}>
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 mt-1">
                {att.file_type === 'image' ? <ImageIcon className="w-5 h-5 text-slate-800 dark:text-slate-200" /> : att.file_type === 'audio' ? <Volume2 className="w-4 h-4 text-slate-800 dark:text-slate-200" /> : <FileText className="w-4 h-4 text-slate-800 dark:text-slate-200" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{att.file_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(att.created_at).toLocaleString('pt-BR')}</div>
                {att.file_type === 'audio' && (
                  <audio src={att.file_url} controls className="w-full mt-2 rounded-md bg-white/5"/>
                )}
                {att.file_type === 'image' && (
                  <img src={att.file_url} alt={att.file_name} className="mt-2 max-h-20 rounded-md object-cover"/>
                )}

                <div className="mt-2 flex items-center gap-2">
                  {att.file_url ? (
                    <button
                      onClick={() => handleDownload(att)}
                      disabled={downloadingId === att.id}
                      className={`inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 dark:bg-white/5 dark:hover:bg-white/6 border border-cyan-500/30 dark:border-white/10 text-cyan-700 dark:text-cyan-200 rounded-md text-sm ${downloadingId === att.id ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      <Download className="w-4 h-4" />
                      {downloadingId === att.id ? 'Baixando...' : 'Baixar'}
                    </button>
                  ) : (
                    <button className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-400 rounded-md text-sm dark:bg-white/5 dark:text-slate-400 opacity-60" disabled>
                      <Download className="w-4 h-4" />
                      Sem arquivo
                    </button>
                  )}
                  {/* Delete button next to download */}
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    disabled={deletingId === att.id}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm text-red-600 dark:text-red-300 border border-red-100 dark:border-red-700 ${deletingId === att.id ? 'opacity-60 cursor-wait' : 'hover:bg-red-50 dark:hover:bg-red-600/20'}`}
                    title="Excluir anexo"
                  >
                    <Trash className="w-4 h-4" />
                    {deletingId === att.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}