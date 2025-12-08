import { useState, useEffect, Fragment } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import {
  MessageCircle,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Mic,
  Send,
  Search,
  Filter,
  Phone as PhoneIcon,
  Mail,
  MapPin,
  Wifi,
  WifiOff,
  Trash2,
  X,
  XCircle,
  Image as ImageIcon,
  Upload,
  ArrowLeft,
  Camera,
  Smile,
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import RequireRole from '../components/auth/RequireRole';
import DeleteConversationModal from '../components/DeleteConversationModal';
import toast from 'react-hot-toast';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';
import { useActiveIntegration } from '../hooks/useActiveIntegration';
import { useFetchMessages } from '../hooks/useFetchMessages';
import { useDeleteConversation } from '../hooks/useDeleteConversation';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { fetchContactAvatar } from '../services/webhookService';
import { supabase } from '../lib/supabase';

export default function ConversationsPage() {
  // selected conversation id
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const {
    conversations,
    loading: loadingConvs,
    refetch: refetchConversations,
    markConversationRead,
  } = useConversations();
  const { integration, loading: loadingIntegration } = useActiveIntegration();
  const selectedConversa = conversations.find((c) => c.id === selectedId);

  const { messages, sendMessage, messagesEndRef } = useMessages(selectedId);
  const { fetchMessages, loading: fetchingMessages } = useFetchMessages();
  const { deleteConversation, loading: deletingConversation } = useDeleteConversation();
  const [textoInput, setTextoInput] = useState('');
  
  const {
    isRecording,
    audioBlob,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
    formatDuration
  } = useAudioRecorder();

  // Buscar avatar se não existir
  useEffect(() => {
    if (selectedId && selectedConversa && !selectedConversa.avatar) {
      fetchContactAvatar(selectedId).catch((error) => {
        console.error('Failed to fetch avatar:', error)
      })
    }
  }, [selectedId, selectedConversa])

  const parseMessageText = (content: unknown) => {
    if (!content || typeof content !== 'string') return '';
    const trimmed = content.trim();
    if (trimmed.startsWith('data:')) return '';
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed?.text || parsed?.caption || parsed?.body || '';
      } catch (_err) {
        // Se falhar o parse (ex: [ÁUDIO]), continua para as verificações abaixo
      }
    }

    // Formatar tags de mídia
    const upper = trimmed.toUpperCase();
    if (upper.includes('[ÁUDIO]') || upper.includes('[AUDIO]')) return '🎵 Msg de Áudio';
    if (upper.includes('[IMAGEM]') || upper.includes('[IMAGE]')) return '📷 Msg de Imagem';
    if (upper.includes('[VÍDEO]') || upper.includes('[VIDEO]')) return '🎥 Msg de Vídeo';
    if (upper.includes('[DOCUMENTO]') || upper.includes('[DOCUMENT]')) return '📄 Arquivo';

    return trimmed;
  };

  const handleSend = async () => {
    if (!textoInput.trim()) return;
    await sendMessage(textoInput);
    setTextoInput('');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;

    // Validar tamanho (16MB max)
    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 16MB');
      return;
    }

    setUploadingMedia(true);
    try {
      // Upload para Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      // Determinar tipo de mídia
      let mediaType = 'document';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';

      // Enviar mensagem com mídia
      await sendMessage(`[${mediaType.toUpperCase()}]`, publicUrl, file.type, mediaType);

      toast.success('Mídia enviada!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar mídia');
    } finally {
      setUploadingMedia(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleDeleteConversation = (conversation: any) => {
    setConversationToDelete(conversation);
    setShowDeleteModal(true);
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;

    const success = await deleteConversation(conversationToDelete.id);
    if (success) {
      setShowDeleteModal(false);
      setConversationToDelete(null);
      // Se a conversa deletada era a selecionada, desmarcar
      if (selectedId === conversationToDelete.id) {
        setSelectedId(null);
      }
      // Recarregar a lista de conversas
      refetchConversations();
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      // Se está gravando, parar a gravação
      stopRecording();
    } else if (audioBlob) {
      // Se tem áudio gravado, enviar
      await handleSendAudio();
    } else {
      // Iniciar gravação
      await startRecording();
    }
  };

  const handleSendAudio = async () => {
    if (!audioBlob || !selectedId) return;

    setUploadingMedia(true);
    try {
      // Upload para Supabase Storage
      const fileName = `${Date.now()}-audio.webm`;
      const filePath = `public/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      // Enviar mensagem com áudio
      await sendMessage('[ÁUDIO]', publicUrl, 'audio/webm', 'audio');

      toast.success('Áudio enviado!');
      clearAudio();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar áudio');
    } finally {
      setUploadingMedia(false);
    }
  };

  return (
    <RequireRole roles={['owner', 'admin', 'manager']}>
      <div className="text-slate-900 dark:text-slate-200 flex flex-col h-full relative overflow-hidden">
        {/* Connection status indicator */}
        {!loadingIntegration && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/10 backdrop-blur">
            {integration?.is_active ? (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-400 font-medium">
                  {integration.provider === 'zapi' || integration.provider === 'uazapi'
                    ? 'Z-API Conectado'
                    : integration.provider === 'evolution_api'
                      ? 'Evolution Conectado'
                      : 'WhatsApp Conectado'}
                </span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-red-400 font-medium">Desconectado</span>
              </>
            )}
          </div>
        )}

  return (
    <RequireRole roles={['owner', 'admin', 'manager']}>
      <div className="text-slate-900 dark:text-slate-200 flex flex-col h-full relative overflow-hidden">
        {/* Connection status indicator - hidden on mobile */}
        {!loadingIntegration && (
          <div className="absolute top-4 right-4 items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/10 backdrop-blur hidden md:flex">
            {integration?.is_active ? (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-400 font-medium">
                  {integration.provider === 'zapi' || integration.provider === 'uazapi'
                    ? 'Z-API Conectado'
                    : integration.provider === 'evolution_api'
                      ? 'Evolution Conectado'
                      : 'WhatsApp Conectado'}
                </span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-red-400 font-medium">Desconectado</span>
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-4 px-4 relative z-10 md:flex">
          {/* Left column – conversation list */}
          <div className={`w-full md:w-80 rounded-xl bg-white/10 border border-white/10 shadow-xl backdrop-blur flex flex-col mr-0 md:mr-2 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conversas</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                {conversations.map((conversa) => (
                  <div
                    key={conversa.id}
                    onClick={() => {
                      setSelectedId(conversa.id);
                      markConversationRead(conversa.id);
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedId === conversa.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {conversa.avatar && conversa.avatar.startsWith('http') ? (
                          <img
                            src={conversa.avatar}
                            alt={conversa.contact_name}
                            className="w-12 h-12 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold">
                            {conversa.contact_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${conversa.channel === 'whatsapp' ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                            }`}
                        >
                          {conversa.channel === 'whatsapp' ? (
                            <MessageCircle className="w-2 h-2 text-white" />
                          ) : (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {conversa.contact_name}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {conversa.last_message_at &&
                              format(new Date(conversa.last_message_at), 'dd/MM HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate hidden">
                          {conversa.contact_number}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {parseMessageText(conversa.last_message_content)}
                        </p>
                      </div>
                      {conversa.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {conversa.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle column – chat */}
          <div className={`w-full md:flex-1 flex flex-col rounded-xl bg-white/10 border border-white/10 shadow-xl backdrop-blur mr-0 md:mr-2 ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
            {/* Chat Header */}
            <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white/5 dark:bg-gray-900/50">
              {/* Mobile back button */}
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full mr-2 -ml-2"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectedConversa?.avatar && selectedConversa.avatar.startsWith('http') ? (
                  <img
                    src={selectedConversa.avatar}
                    alt={selectedConversa.contact_name}
                    className="w-10 h-10 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold">
                    {selectedConversa?.contact_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate text-base">
                    {selectedConversa?.contact_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedConversa?.contact_number}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (selectedConversa) {
                      handleDeleteConversation(selectedConversa);
                    }
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  title="Deletar conversa"
                >
                  <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const textContent = parseMessageText(msg.content);
                  return (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-md rounded-2xl ${msg.direction === 'outbound'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md'
                          }`}
                      >
                        {msg.media_url && (
                          <div className="p-2">
                            {(msg.media_mime_type?.includes('image') || msg.message_type === 'image') && (
                              <img
                                src={msg.media_url}
                                alt="Imagem"
                                className="w-full h-auto rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ maxWidth: '350px', maxHeight: '450px', objectFit: 'cover' }}
                                onClick={() => setSelectedImage(msg.media_url!)}
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            )}
                            {(msg.media_mime_type?.includes('video') || msg.message_type === 'video') && (
                              <video
                                controls
                                src={msg.media_url}
                                className="w-full rounded-xl"
                                style={{ maxWidth: '350px' }}
                                preload="metadata"
                              />
                            )}
                            {(msg.media_mime_type?.includes('audio') || msg.message_type === 'audio') && (
                              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-4 min-w-[280px]">
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <audio
                                      controls
                                      src={msg.media_url}
                                      className="w-full"
                                      style={{ height: '32px' }}
                                      preload="metadata"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                            {msg.message_type === 'document' && (
                              <a
                                href={msg.media_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                <Paperclip className="w-5 h-5" />
                                <span className="text-sm font-medium">Abrir documento</span>
                              </a>
                            )}
                          </div>
                        )}
                        {textContent && (
                          <div className="px-4 py-2">
                            <p className="text-sm leading-relaxed">{textContent}</p>
                          </div>
                        )}
                        <div className={`px-4 pb-2 text-xs ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="p-3 md:p-4 border-t border-gray-200 dark:border-gray-700 bg-white/5 dark:bg-gray-900/50">
              {isRecording ? (
                // Recording UI
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      Gravando... {formatDuration(recordingDuration)}
                    </span>
                  </div>
                  <button
                    onClick={cancelRecording}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-800/30 rounded transition-colors"
                    title="Cancelar gravação"
                  >
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </button>
                  <button
                    onClick={stopRecording}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Parar
                  </button>
                </div>
              ) : audioBlob ? (
                // Preview UI after recording
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Áudio gravado ({formatDuration(recordingDuration)})
                    </span>
                  </div>
                  <button
                    onClick={clearAudio}
                    className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded transition-colors"
                    title="Descartar áudio"
                  >
                    <Trash2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button
                    onClick={handleSendAudio}
                    disabled={uploadingMedia}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              ) : (
                // Normal input UI - WhatsApp style
                <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    disabled={uploadingMedia}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full cursor-pointer transition-colors ${uploadingMedia ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingMedia ? (
                      <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-pulse" />
                    ) : (
                      <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </label>
                  <input
                    value={textoInput}
                    onChange={(e) => setTextoInput(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    onKeyPress={(e) => e.key === 'Enter' && !uploadingMedia && handleSend()}
                    disabled={uploadingMedia}
                    className="flex-1 px-2 py-1 bg-transparent focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  />
                  <button 
                    onClick={handleMicClick}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Gravar áudio"
                  >
                    <Mic className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  {textoInput.trim() && (
                    <button
                      onClick={handleSend}
                      disabled={uploadingMedia}
                      className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Image Modal */}
          <Transition appear show={selectedImage !== null} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setSelectedImage(null)}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="relative max-w-7xl max-h-[90vh]">
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                      <img
                        src={selectedImage || ''}
                        alt="Visualização"
                        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                      />
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          {/* Right column – lead info */}
          <div className="w-96 rounded-xl bg-white/10 border border-white/10 shadow-xl backdrop-blur flex-col hidden lg:flex">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informações do Lead</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
                  <p className="text-gray-900 dark:text-white">{selectedConversa?.contact_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Etapa do Funil</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      Interessado
                    </span>
                  </div>
                </div>
                <hr className="border-gray-200 dark:border-gray-700" />
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
                  <p className="text-gray-900 dark:text-white flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    {selectedConversa?.contact_number}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <p className="text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    {selectedConversa?.contact_name?.toLowerCase().replace(' ', '.') + '@email.com'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Imóvel de Interesse</label>
                  <p className="text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    Apartamento 3 quartos - Centro
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => toast.success('Em breve')} className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
                Abrir ficha completa do lead
              </button>
            </div>
          </div>
        </div>

        {/* Modal de confirmação para deletar conversa */}
        <DeleteConversationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setConversationToDelete(null);
          }}
          onConfirm={confirmDeleteConversation}
          contactName={conversationToDelete?.contact_name || ''}
          loading={deletingConversation}
        />
      </div>
    </RequireRole>
  );
}
