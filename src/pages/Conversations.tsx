import { useState, useEffect, Fragment } from 'react';
import { format } from 'date-fns';
import {
  MessageCircle,
  Paperclip,
  Mic,
  Send,
  Search,
  Phone as PhoneIcon,
  Mail,
  Trash2,
  X,
  ArrowLeft,
  Copy,
  Plus,
  Zap,
  Clock,
  CheckCheck,
  Archive,
  MoreVertical,
  CheckSquare,
  Square,
  MailCheck,
  UserPlus,
  Settings,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import RequireRole from '../components/auth/RequireRole';
import toast from 'react-hot-toast';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';
import { useActiveIntegration } from '../hooks/useActiveIntegration';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { supabase } from '../lib/supabase';
import AudioBubble from '../components/AudioBubble';
import { LeadTimeline } from '../components/team/LeadTimeline';
import { LeadAttachments } from '../components/team/LeadAttachments';
import { useAuthStore } from '../stores/authStore';
import { AddActivityModal } from '../components/team/AddActivityModal';
import { loadPipelineStages } from '../services/pipelineService';
import { useFetchAvatar } from '../hooks/useFetchAvatar';
import { useObjectionCards } from '../hooks/useObjectionPlaybook';
import PremiumGate from '../components/premium/PremiumGate';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';

interface Lead {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  status?: string;
  etapa_funil_id?: string;
  // outros campos conforme necessário
}

export default function ConversationsPage() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [funilEtapas, setFunilEtapas] = useState<any[]>([]);
  const [textoInput, setTextoInput] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'files'>('info');
  const [modalAddActivity, setModalAddActivity] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);
  const [categoryTab, setCategoryTab] = useState<'trabalho' | 'pessoal'>('trabalho');
  const [visibleMessagesCount, setVisibleMessagesCount] = useState(20);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Multi-select states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showSingleDeleteConfirm, setShowSingleDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();
  const {
    conversations,
    loading,
    markConversationRead,
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
    refetch: refetchConversations
  } = useConversations();
  const { messages, loading: messagesLoading, sending, sendMessage, messagesEndRef } = useMessages(selectedId);
  const { integration: activeIntegration } = useActiveIntegration();
  const { isRecording, recordingDuration, startRecording, stopRecording, cancelRecording, audioBlob, clearAudio } = useAudioRecorder();
  const { fetchAvatar } = useFetchAvatar();
  const [localAvatars, setLocalAvatars] = useState<Record<string, string>>({});

  const [showPlaybooks, setShowPlaybooks] = useState(false);
  const { cards: playbooks, loading: loadingPlaybooks } = useObjectionCards();

  // Estado para imagem colada
  const [pastedImage, setPastedImage] = useState<{ file: File; preview: string } | null>(null);

  // Estados para controle de criação de leads
  const [autoCreateLeads, setAutoCreateLeads] = useState(true);
  const [leadExists, setLeadExists] = useState(true);
  const [creatingLead, setCreatingLead] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const selectedConversa = conversations.find(c => c.id === selectedId);

  // Carregar etapas do funil
  useEffect(() => {
    const fetchEtapas = async () => {
      if (!tenant?.id) return;
      try {
        const stages = await loadPipelineStages(tenant.id);
        if (stages) setFunilEtapas(stages);
      } catch (error) {
        console.error('Erro ao carregar etapas:', error);
      }
    };
    fetchEtapas();
  }, [tenant?.id]);

  // Buscar avatar do Z-API quando conversa é selecionada e não tem avatar
  useEffect(() => {
    const loadAvatar = async () => {
      if (!selectedConversa) return;

      // Já tem avatar na conversa ou no cache local?
      if (selectedConversa.avatar || selectedConversa.avatar_url || localAvatars[selectedConversa.id]) return;

      // Precisa do número de telefone
      const phone = selectedConversa.contact_number;
      if (!phone) return;

      console.log('[AVATAR] Buscando avatar para:', selectedConversa.contact_name);

      const avatarUrl = await fetchAvatar(selectedConversa.id, phone);

      if (avatarUrl) {
        console.log('[AVATAR] Avatar encontrado:', avatarUrl);
        setLocalAvatars(prev => ({ ...prev, [selectedConversa.id]: avatarUrl }));
      }
    };

    loadAvatar();
  }, [selectedConversa?.id, fetchAvatar, localAvatars]);

  // Scroll automático para o fim
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedId]);

  // Resetar contador de mensagens visíveis quando mudar de conversa
  useEffect(() => {
    setVisibleMessagesCount(20);
  }, [selectedId]);

  // Fechar menu de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) setOpenMenuId(null);
      if (showSettingsMenu) setShowSettingsMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId, showSettingsMenu]);

  // Atualizar lead state - buscar lead real do banco de dados
  useEffect(() => {
    const fetchLead = async () => {
      if (!selectedConversa?.contact_id || !tenant?.id) {
        setLead(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nome, telefone, email, status, categoria, tenant_id')
          .eq('id', selectedConversa.contact_id)
          .eq('tenant_id', tenant.id)
          .maybeSingle();

        if (error) {
          console.error('[Conversations] Erro ao buscar lead:', error);
          // Fallback para dados da conversa
          setLead({
            id: selectedConversa.contact_id,
            nome: selectedConversa.contact_name,
            telefone: selectedConversa.contact_number,
            email: undefined,
            status: selectedConversa.status,
            categoria: selectedConversa.categoria || 'trabalho',
            tenant_id: tenant.id
          } as any);
          return;
        }

        if (data) {
          setLead(data as any);
        } else {
          // Lead não encontrado, usar dados da conversa
          setLead({
            id: selectedConversa.contact_id,
            nome: selectedConversa.contact_name,
            telefone: selectedConversa.contact_number,
            email: undefined,
            status: selectedConversa.status,
            categoria: selectedConversa.categoria || 'trabalho',
            tenant_id: tenant.id
          } as any);
        }
      } catch (err) {
        console.error('[Conversations] Erro ao buscar lead:', err);
        setLead(null);
      }
    };

    fetchLead();
  }, [selectedConversa?.contact_id, tenant?.id]);

  // Carregar configuração de criação automática de leads
  useEffect(() => {
    const loadAutoCreateConfig = async () => {
      if (!tenant?.id) return;
      try {
        const { data } = await supabase
          .from('integrations')
          .select('config')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .maybeSingle();

        if (data?.config?.auto_create_leads !== undefined) {
          setAutoCreateLeads(data.config.auto_create_leads);
        }
      } catch (err) {
        console.error('Erro ao carregar config:', err);
      }
    };
    loadAutoCreateConfig();
  }, [tenant?.id]);

  // Verificar se o lead existe no banco de dados
  useEffect(() => {
    const checkLeadExists = async () => {
      if (!selectedConversa?.contact_id || !tenant?.id) {
        setLeadExists(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('id')
          .eq('id', selectedConversa.contact_id)
          .eq('tenant_id', tenant.id)
          .maybeSingle();

        setLeadExists(!error && !!data);
      } catch {
        setLeadExists(false);
      }
    };
    checkLeadExists();
  }, [selectedConversa?.contact_id, tenant?.id]);

  // Função para alternar criação automática de leads
  const toggleAutoCreateLeads = async () => {
    if (!tenant?.id) return;
    const newValue = !autoCreateLeads;
    setAutoCreateLeads(newValue);

    try {
      // Buscar config atual
      const { data: integration } = await supabase
        .from('integrations')
        .select('id, config')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .maybeSingle();

      if (integration) {
        const updatedConfig = {
          ...(integration.config || {}),
          auto_create_leads: newValue
        };

        await supabase
          .from('integrations')
          .update({ config: updatedConfig })
          .eq('id', integration.id);

        toast.success(newValue ? 'Leads serão criados automaticamente' : 'Criação automática de leads desativada');
      }
    } catch (err) {
      console.error('Erro ao salvar config:', err);
      toast.error('Erro ao salvar configuração');
      setAutoCreateLeads(!newValue); // Reverter em caso de erro
    }
  };

  // Função para criar lead manualmente
  const createLeadManually = async () => {
    if (!selectedConversa || !tenant?.id) return;

    setCreatingLead(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          id: selectedConversa.contact_id, // Usar o mesmo ID do contact
          tenant_id: tenant.id,
          nome: selectedConversa.contact_name,
          telefone: selectedConversa.contact_number,
          status: 'lead',
          categoria: 'trabalho'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Este lead já existe');
          setLeadExists(true);
        } else {
          throw error;
        }
      } else {
        toast.success('Lead criado com sucesso!');
        setLeadExists(true);
        setLead(data as any);
      }
    } catch (err: any) {
      console.error('Erro ao criar lead:', err);
      toast.error('Erro ao criar lead');
    } finally {
      setCreatingLead(false);
    }
  };

  // Mensagens visíveis (últimas N mensagens)
  const visibleMessages = messages.slice(-visibleMessagesCount);
  const hasMoreMessages = messages.length > visibleMessagesCount;

  const loadMoreMessages = () => {
    setVisibleMessagesCount(prev => prev + 20);
  };

  // Filtrar conversas por pesquisa, categoria e arquivadas
  const filteredConversations = conversations.filter(c =>
    (c.categoria || 'trabalho') === categoryTab &&
    (showArchived ? c.archived === true : !c.archived) &&
    (c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_message_content?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSend = async () => {
    if (!textoInput.trim() || uploadingMedia) return;
    await sendMessage(textoInput);
    setTextoInput('');
  };

  const handleSendAudio = async () => {
    if (!audioBlob) return;
    toast.error("Envio de áudio requer implementação de upload");
    clearAudio();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      toast.error("Envio de arquivo requer implementação de upload");
    }
  };

  // Função para lidar com Ctrl+V de imagem
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const preview = URL.createObjectURL(file);
          setPastedImage({ file, preview });
          toast.success('Imagem pronta para envio! 📷');
        }
        break;
      }
    }
  };

  // Limpar imagem colada
  const clearPastedImage = () => {
    if (pastedImage?.preview) {
      URL.revokeObjectURL(pastedImage.preview);
    }
    setPastedImage(null);
  };

  const confirmDeleteConversation = async () => {
    if (conversationToDelete?.id) {
      await deleteConversation(conversationToDelete.id);
      setShowDeleteModal(false);
      setConversationToDelete(null);
      if (selectedId === conversationToDelete.id) setSelectedId(null);
    }
  };

  // Multi-select helper functions
  const toggleConversationSelection = (id: string) => {
    setSelectedConversationIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllFiltered = () => {
    const allIds = filteredConversations.map(c => c.id);
    setSelectedConversationIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedConversationIds(new Set());
    setIsSelectionMode(false);
  };

  const batchArchive = async () => {
    const promises = Array.from(selectedConversationIds).map(id => archiveConversation(id));
    await Promise.all(promises);
    toast.success(`${selectedConversationIds.size} conversa(s) arquivada(s)`);
    clearSelection();
  };

  const batchMarkAsRead = async () => {
    const promises = Array.from(selectedConversationIds).map(id => markConversationRead(id));
    await Promise.all(promises);
    toast.success(`${selectedConversationIds.size} conversa(s) marcada(s) como lida(s)`);
    clearSelection();
  };

  const batchDelete = async () => {
    setShowBatchDeleteConfirm(true);
  };

  const confirmBatchDelete = async () => {
    const promises = Array.from(selectedConversationIds).map(id => deleteConversation(id));
    await Promise.all(promises);
    toast.success(`${selectedConversationIds.size} conversa(s) excluída(s)`);
    if (selectedId && selectedConversationIds.has(selectedId)) setSelectedId(null);
    clearSelection();
    setShowBatchDeleteConfirm(false);
  };

  const handleSingleDelete = (id: string) => {
    setConversationToDelete(id);
    setShowSingleDeleteConfirm(true);
  };

  const confirmSingleDelete = async () => {
    if (conversationToDelete) {
      await deleteConversation(conversationToDelete);
      if (selectedId === conversationToDelete) setSelectedId(null);
      toast.success('Conversa excluída');
    }
    setShowSingleDeleteConfirm(false);
    setConversationToDelete(null);
  };

  const handleMicClick = () => {
    startRecording();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const findHttpUrl = (text: unknown): string | null => {
    if (!text || typeof text !== 'string') return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  };

  const parseMessageText = (content: unknown): string => {
    if (!content) return '';

    // Se for objeto direto (já parseado)
    if (typeof content === 'object' && content !== null) {
      const obj = content as any;

      // Tentar extrair texto de campos conhecidos
      const textFields = [
        obj.text,
        obj.caption,
        obj.body,
        obj.message,
        obj.content,
        obj.conversation,
        obj.extendedTextMessage?.text
      ];

      for (const field of textFields) {
        if (field && typeof field === 'string' && field.trim()) {
          return field.trim();
        }
      }

      // Se for mídia sem texto, retornar indicador
      if (obj.PTT || obj.ptt) return '🎵 Áudio';
      if (obj.mimetype?.includes('image') || obj.imageMessage) return '📷 Imagem';
      if (obj.mimetype?.includes('video') || obj.videoMessage) return '🎥 Vídeo';
      if (obj.mimetype?.includes('audio')) return '🎵 Áudio';
      if (obj.documentMessage) return '📄 Documento';

      // Se tem URL mas não tem texto, é provavelmente mídia
      if (obj.url || obj.directPath) return '📎 Mídia';

      return '';
    }

    // Se for string
    let text = String(content).trim();

    // Ignorar data URIs
    if (text.startsWith('data:')) return '';

    // Filtrar tags especiais como [ExtendedTextMessage], [media], etc.
    if (text.match(/^\[[\w\s]+\]$/)) {
      return '';
    }

    // Remover sufixo [media] se existir
    text = text.replace(/\s*\[media\]\s*$/i, '').trim();

    // Tentar parsear JSON
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        // Recursivamente chamar a função com o objeto parseado
        return parseMessageText(parsed);
      } catch (_err) {
        // Se falhar o parse, continua
      }
    }

    // Verificar tags de mídia no texto
    const upper = text.toUpperCase();
    if (upper.includes('[ÁUDIO]') || upper.includes('[AUDIO]')) return '🎵 Áudio';
    if (upper.includes('[IMAGEM]') || upper.includes('[IMAGE]')) return '📷 Imagem';
    if (upper.includes('[VÍDEO]') || upper.includes('[VIDEO]')) return '🎥 Vídeo';
    if (upper.includes('[DOCUMENTO]') || upper.includes('[DOCUMENT]')) return '📄 Documento';

    return text;
  };

  return (
    <RequireRole roles={['owner', 'admin', 'manager']}>
      <PremiumGate featureName="Conversas">
        <div className="flex flex-col h-full relative overflow-hidden bg-background text-slate-900 dark:text-slate-200">
          {/* HUD glow grid background + overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:120px_120px]" />
          </div>

          <div className="flex-1 overflow-hidden flex p-4 gap-4 relative z-10">

            {/* =================================================================================
              LEFT COLUMN - LIST
          ================================================================================= */}
            <div className={`w-full md:w-80 lg:w-96 flex flex-col rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 h-full shadow-sm overflow-hidden ${selectedId ? 'hidden md:flex' : 'flex'}`}>

              {/* Header / Search */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                    {showArchived ? 'Arquivadas' : t('conversations.inbox')}
                  </h1>
                  <div className="flex gap-2">
                    {/* Selection Mode Toggle */}
                    <button
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        if (isSelectionMode) setSelectedConversationIds(new Set());
                      }}
                      className={`p-2 rounded-lg transition-colors ${isSelectionMode ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                      title={isSelectionMode ? 'Sair do modo de seleção' : 'Selecionar múltiplas'}
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className={`p-2 rounded-lg transition-colors ${showArchived ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                      title={showArchived ? 'Ver conversas ativas' : 'Ver arquivadas'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    {/* Settings Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSettingsMenu(!showSettingsMenu);
                        }}
                        className={`p-2 rounded-lg transition-colors ${showSettingsMenu ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                        title="Configurações"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      {showSettingsMenu && (
                        <div className="absolute right-0 top-10 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2">
                          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Configurações</h4>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAutoCreateLeads();
                            }}
                            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Criar leads automaticamente</span>
                            </div>
                            {autoCreateLeads ? (
                              <ToggleRight className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          <div className="px-3 py-1.5">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                              {autoCreateLeads
                                ? 'Novos contatos serão salvos como leads automaticamente'
                                : 'Você precisará criar leads manualmente'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('conversations.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-emerald-500/30 focus:bg-white dark:focus:bg-gray-900 rounded-lg text-sm focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                  />
                </div>

                {/* Abas Trabalho | Pessoal */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setCategoryTab('trabalho')}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${categoryTab === 'trabalho'
                      ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    💼 Trabalho
                  </button>
                  <button
                    onClick={() => setCategoryTab('pessoal')}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${categoryTab === 'pessoal'
                      ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    👤 Pessoal
                  </button>
                </div>

                {/* Batch Actions Bar - appears when items are selected */}
                {isSelectionMode && selectedConversationIds.size > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {selectedConversationIds.size} selecionada(s)
                        </span>
                        <button
                          onClick={selectAllFiltered}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 underline"
                        >
                          Selecionar todas
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={batchMarkAsRead}
                          className="p-1.5 bg-white dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded text-emerald-600 dark:text-emerald-400 transition-colors"
                          title="Marcar como lidas"
                        >
                          <MailCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={batchArchive}
                          className="p-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 transition-colors"
                          title="Arquivar selecionadas"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={batchDelete}
                          className="p-1.5 bg-white dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 transition-colors"
                          title="Excluir selecionadas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={clearSelection}
                          className="p-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 transition-colors"
                          title="Cancelar seleção"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.map((conversa) => (
                  <div
                    key={conversa.id}
                    className={`group relative p-4 cursor-pointer transition-all border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800 ${selectedId === conversa.id
                      ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-l-4 border-l-emerald-500'
                      : 'border-l-4 border-l-transparent'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection Checkbox - appears in selection mode */}
                      {isSelectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleConversationSelection(conversa.id);
                          }}
                          className="flex-shrink-0 mt-1"
                        >
                          {selectedConversationIds.has(conversa.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 hover:text-blue-400" />
                          )}
                        </button>
                      )}
                      {/* Avatar */}
                      <div
                        className="relative flex-shrink-0"
                        onClick={() => {
                          setSelectedId(conversa.id);
                          markConversationRead(conversa.id);
                        }}
                      >
                        {(() => {
                          const avatarSrc = conversa.avatar || conversa.avatar_url || localAvatars[conversa.id];
                          if (avatarSrc && avatarSrc.startsWith('http')) {
                            return (
                              <img
                                src={avatarSrc}
                                alt={conversa.contact_name}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-700"
                              />
                            );
                          }
                          return (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${selectedId === conversa.id
                              ? 'from-emerald-500 to-emerald-700'
                              : 'from-gray-400 to-gray-600'
                              }`}>
                              {conversa.contact_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          );
                        })()}
                        {conversa.channel === 'whatsapp' && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-3 h-3 text-emerald-500 fill-current" />
                          </div>
                        )}
                      </div>

                      <div
                        className="flex-1 min-w-0"
                        onClick={() => {
                          setSelectedId(conversa.id);
                          markConversationRead(conversa.id);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-semibold text-sm truncate ${selectedId === conversa.id ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {conversa.contact_name}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Status do Lead */}
                            {conversa.etapa_funil_label && (
                              <span
                                className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${conversa.etapa_funil_color}20`,
                                  color: conversa.etapa_funil_color || '#6B7280'
                                }}
                              >
                                {conversa.etapa_funil_label}
                              </span>
                            )}
                            {/* Data */}
                            <span className="text-[10px] font-medium text-gray-400">
                              {conversa.last_message_at &&
                                format(new Date(conversa.last_message_at), 'MMM dd')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate flex-1 pr-2 ${conversa.unread_count > 0 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                            {parseMessageText(conversa.last_message_content)}
                          </p>
                          {conversa.unread_count > 0 && (
                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                              {conversa.unread_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu de Ações */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === conversa.id ? null : conversa.id);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === conversa.id && (
                          <div className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                            {conversa.archived ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unarchiveConversation(conversa.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                              >
                                <Archive className="w-4 h-4" />
                                Desarquivar
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveConversation(conversa.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                              >
                                <Archive className="w-4 h-4" />
                                Arquivar
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSingleDelete(conversa.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400 border-t border-gray-100 dark:border-gray-700"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* =================================================================================
              MIDDLE COLUMN - CHAT AREA
          ================================================================================= */}
            <div className={`flex-1 flex flex-col rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 relative shadow-sm overflow-hidden ${!selectedId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>

              {!selectedId ? (
                <div className="text-center p-8 opacity-50">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('conversations.selectConversation')}</h3>
                  <p className="text-sm text-gray-500">{t('conversations.selectConversationDesc')}</p>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setSelectedId(null)}
                        className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full"
                      >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                      </button>

                      <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          {selectedConversa?.contact_name}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{selectedConversa?.contact_number}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {t('conversations.localTime')}: {format(new Date(), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
                    <div className="max-w-3xl mx-auto space-y-6">

                      {/* Botão Carregar Mais */}
                      {hasMoreMessages && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={loadMoreMessages}
                            className="px-4 py-2 text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm transition-all hover:shadow-md"
                          >
                            ⬆️ Carregar mais ({messages.length - visibleMessagesCount} mensagens anteriores)
                          </button>
                        </div>
                      )}

                      {/* Date Separator */}
                      {visibleMessages.length > 0 && (
                        <div className="flex items-center justify-center my-4">
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full uppercase tracking-wider">
                            {format(new Date(visibleMessages[0].created_at), 'MMMM dd, yyyy')}
                          </span>
                        </div>
                      )}

                      {visibleMessages.map((msg, index) => {
                        const textContent = parseMessageText(msg.content);
                        const isOutbound = msg.direction === 'outbound';
                        const isSequence = index > 0 && visibleMessages[index - 1].direction === msg.direction;

                        const msgRecord = msg as unknown as Record<string, unknown>;
                        let mediaUrl = msgRecord.media_url as string | null | undefined;
                        let mediaType = msgRecord.message_type as string | undefined;
                        let mimeType = msgRecord.media_mime_type as string | undefined;

                        let contentObj: any = null;
                        if (typeof msg.content === 'object' && msg.content !== null) {
                          contentObj = msg.content;
                        } else if (typeof msg.content === 'string') {
                          try {
                            const cleanJson = msg.content.trim().replace(/\[\w+\]$/, '').trim();
                            contentObj = JSON.parse(cleanJson);
                          } catch {
                            contentObj = null;
                          }
                        }

                        if (contentObj) {
                          if (contentObj.PTT || contentObj.ptt || contentObj.mimetype?.includes('audio')) {
                            mediaType = 'audio';
                            mimeType = contentObj.mimetype || 'audio/ogg; codecs=opus';
                            mediaUrl =
                              contentObj.url ||
                              contentObj.directPath ||
                              (contentObj.base64 ? `data:${mimeType};base64,${contentObj.base64}` : null);
                          }
                          if (!mediaUrl) mediaUrl = findHttpUrl(contentObj);
                        }

                        return (
                          <div key={msg.id} className={`flex items-end gap-3 ${isOutbound ? 'justify-end' : 'justify-start'}`}>

                            {/* Avatar for Incoming Messages */}
                            {!isOutbound && !isSequence && (
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mb-1">
                                {(() => {
                                  const msgAvatar = selectedConversa?.avatar || selectedConversa?.avatar_url || (selectedConversa?.id ? localAvatars[selectedConversa.id] : null);
                                  if (msgAvatar) {
                                    return <img src={msgAvatar} className="w-full h-full object-cover" />;
                                  }
                                  return (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-xs font-bold">
                                      {selectedConversa?.contact_name?.charAt(0)}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                            {!isOutbound && isSequence && <div className="w-8 flex-shrink-0" />}

                            <div
                              className={`relative max-w-[85%] md:max-w-lg rounded-2xl p-1 shadow-sm border ${isOutbound
                                ? 'bg-emerald-500 border-emerald-500 text-white rounded-br-none'
                                : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-slate-800 dark:text-slate-100 rounded-bl-none'
                                }`}
                            >
                              {/* Media Render Logic */}
                              {mediaUrl && (
                                <div className="overflow-hidden rounded-lg mb-1 bg-black/5">
                                  {(mimeType?.includes('image') || mediaType === 'image') && (
                                    <img
                                      src={mediaUrl || undefined}
                                      alt="Media"
                                      className="w-full h-auto cursor-pointer hover:opacity-90"
                                      style={{ maxHeight: '300px', objectFit: 'contain' }}
                                      onClick={() => setSelectedImage(mediaUrl!)}
                                    />
                                  )}
                                  {(mimeType?.includes('video') || mediaType === 'video') && (
                                    <video controls src={mediaUrl} className="w-full max-h-[300px]" />
                                  )}
                                  {(mimeType?.includes('audio') || mediaType === 'audio') && (
                                    <div className="p-2">
                                      <AudioBubble src={mediaUrl} isOutbound={isOutbound} />
                                    </div>
                                  )}
                                  {mediaType === 'document' && (
                                    <a
                                      href={mediaUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`flex items-center gap-3 p-3 rounded-lg ${isOutbound ? 'bg-emerald-600/20 hover:bg-emerald-600/30' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                                    >
                                      <Paperclip className="w-5 h-5 opacity-70" />
                                      <span className="text-sm font-medium underline">{t('conversations.document')}</span>
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Text Content */}
                              {textContent &&
                                !textContent.startsWith('🎵') &&
                                !textContent.startsWith('📷') &&
                                !textContent.startsWith('🎥') &&
                                !textContent.startsWith('📄') &&
                                !textContent.startsWith('📎') && (
                                  <div className="px-3 py-2">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                      {textContent}
                                    </p>
                                  </div>
                                )}

                              {/* Timestamp & Status */}
                              <div className={`px-3 pb-1.5 flex items-center justify-end gap-1 text-[10px] ${isOutbound ? 'text-emerald-100' : 'text-gray-400'}`}>
                                <span>{format(new Date(msg.created_at), 'dd/MM')} - {format(new Date(msg.created_at), 'HH:mm')}</span>
                                {isOutbound && (
                                  <CheckCheck className="w-3 h-3 opacity-80" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-gray-800">
                    {isRecording ? (
                      <div className="flex items-center gap-4 animate-in fade-in duration-200">
                        <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-sm" />
                          <span className="text-sm font-medium text-red-600 dark:text-red-400 font-mono">
                            {formatDuration(recordingDuration)}
                          </span>
                          <span className="text-xs text-red-400 ml-auto">{t('conversations.recording')}</span>
                        </div>
                        <button onClick={cancelRecording} className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={stopRecording} className="p-3 bg-emerald-500 rounded-lg hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all">
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    ) : audioBlob ? (
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-emerald-50 rounded-lg p-3 flex items-center gap-3 border border-emerald-100">
                          <Mic className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-medium text-slate-700">{t('conversations.audioRecorded')}</span>
                          <span className="text-xs text-emerald-600 font-mono ml-auto">{formatDuration(recordingDuration)}</span>
                        </div>
                        <button onClick={clearAudio} className="p-3 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={handleSendAudio} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                          {t('conversations.sendAudio')} <Send className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-end gap-3">
                        <div className="flex items-center gap-2 pb-3 text-gray-400">
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
                            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors ${uploadingMedia ? 'opacity-50' : ''}`}
                          >
                            <Paperclip className="w-5 h-5" />
                          </label>
                          <div className="relative">
                            {showPlaybooks && (
                              <div className="absolute bottom-12 left-0 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 flex flex-col animate-in fade-in slide-in-from-bottom-2">
                                <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-sm z-10 flex justify-between items-center">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Playbook de Vendas</h4>
                                  <button onClick={() => setShowPlaybooks(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                {loadingPlaybooks ? (
                                  <div className="p-4 text-center text-sm text-gray-500">Carregando...</div>
                                ) : playbooks.length === 0 ? (
                                  <div className="p-4 text-center text-sm text-gray-500">Nenhum playbook encontrado.</div>
                                ) : (
                                  <div className="p-2 space-y-1">
                                    {playbooks.map((card) => (
                                      <button
                                        key={card.id}
                                        onClick={() => {
                                          setTextoInput(card.response);
                                          setShowPlaybooks(false);
                                        }}
                                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg group transition-colors"
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {card.objection}
                                          </span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${card.stage === 'Qualificação' ? 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-800' :
                                            card.stage === 'Proposta' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                                              card.stage === 'Negociação' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                                card.stage === 'Fechamento' ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 dark:bg-fuchsia-900/20 dark:border-fuchsia-800' :
                                                  'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800'
                                            }`}>
                                            {card.stage}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                          {card.response}
                                        </p>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => setShowPlaybooks(!showPlaybooks)}
                              className={`p-2 rounded-lg transition-colors ${showPlaybooks ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                              title="Respostas do Playbook"
                            >
                              <Zap className={`w-5 h-5 ${showPlaybooks ? 'text-yellow-600' : 'text-yellow-500'}`} />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 relative">
                          {/* Preview da imagem colada */}
                          {pastedImage && (
                            <div className="mb-2 relative inline-block">
                              <img
                                src={pastedImage.preview}
                                alt="Preview"
                                className="max-h-32 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                              />
                              <button
                                onClick={clearPastedImage}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <textarea
                            value={textoInput}
                            onChange={(e) => setTextoInput(e.target.value)}
                            onPaste={handlePaste}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!uploadingMedia) {
                                  handleSend();
                                }
                              }
                            }}
                            placeholder={pastedImage ? 'Adicione uma legenda (opcional)...' : t('conversations.messagePlaceholder')}
                            disabled={uploadingMedia}
                            rows={1}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none min-h-[48px] max-h-[120px] text-sm text-slate-800 dark:text-slate-100 placeholder-gray-400"
                            style={{ minHeight: '48px' }}
                          />
                        </div>

                        {(textoInput.trim() || pastedImage) ? (
                          <button
                            onClick={() => {
                              if (pastedImage) {
                                toast.error("Envio de imagem requer implementação de upload");
                                clearPastedImage();
                              } else {
                                handleSend();
                              }
                            }}
                            disabled={uploadingMedia}
                            className="px-4 py-3 text-white font-medium rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                          >
                            <Send className="w-4 h-4" />
                            <span className="hidden lg:inline">{pastedImage ? 'Enviar Imagem' : t('conversations.send')}</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleMicClick}
                            className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-xl transition-all"
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                    )}
                  </div>
                </>
              )}
            </div>

            <div className={`w-80 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 hidden lg:flex flex-col shadow-sm overflow-hidden`}>
              {/* Profile Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 text-center relative">
                <button onClick={() => toast('Close Details')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>

                <div className="w-20 h-20 rounded-full mx-auto mb-3 relative">
                  {(() => {
                    const detailAvatar = selectedConversa?.avatar || selectedConversa?.avatar_url || (selectedConversa?.id ? localAvatars[selectedConversa.id] : null);
                    if (detailAvatar) {
                      return <img src={detailAvatar} className="w-full h-full object-cover rounded-full shadow-lg" />;
                    }
                    return (
                      <div className="w-full h-full bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-2xl font-bold">
                        {selectedConversa?.contact_name?.charAt(0)}
                      </div>
                    );
                  })()}
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{selectedConversa?.contact_name || lead?.nome}</h3>
                <p className="text-sm text-gray-500 text-gray-500">
                  {lead?.email || t('conversations.visitor')}
                </p>
              </div>

              {/* Tabs (Visual) */}
              <div className="flex border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-emerald-600 dark:text-emerald-300 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  {t('conversations.info')}
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'notes' ? 'text-emerald-600 dark:text-emerald-300 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  {t('conversations.notes')}
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'files' ? 'text-emerald-600 dark:text-emerald-300 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  {t('conversations.files')}
                </button>
              </div>

              {/* Details List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {activeTab === 'info' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('conversations.aboutCustomer')}</h4>

                    <div className="space-y-3">
                      <div className="group bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 transition-colors">
                        <div className="text-xs text-gray-400 uppercase font-semibold mb-1 flex items-center gap-2">
                          <Mail className="w-3 h-3" /> Email
                        </div>
                        <div className="text-sm text-slate-800 dark:text-slate-200 truncate font-medium">
                          {lead?.email || t('conversations.notProvided')}
                        </div>
                      </div>

                      <div className="group bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 transition-colors">
                        <div className="text-xs text-gray-400 uppercase font-semibold mb-1 flex items-center gap-2">
                          <PhoneIcon className="w-3 h-3" /> {t('conversations.phone')}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-800 dark:text-slate-200 font-mono">
                            {selectedConversa?.contact_number}
                          </div>
                          <button
                            onClick={() => {
                              if (selectedConversa?.contact_number) {
                                navigator.clipboard.writeText(selectedConversa.contact_number);
                                toast.success('Copiado!');
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-all text-gray-400"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('conversations.attributes')}</h4>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('conversations.status')}</span>
                        <div className="relative">
                          <select
                            value={lead?.status || ''}
                            onChange={async (e) => {
                              if (!lead?.id) return;
                              const newStatusKey = e.target.value;

                              console.log('[LeadUpdate] Tentativa de atualização de status:', {
                                leadId: lead.id,
                                oldStatus: lead.status,
                                newStatus: newStatusKey,
                                tenant_id: lead.tenant_id
                              });

                              if (lead.id === 'temp-id') {
                                console.error('[LeadUpdate] ERRO CRÍTICO: ID do lead é "temp-id". O lead não está vinculado corretamente à conversa.');
                                toast.error('Erro: Lead não identificado (ID temporário).');
                                return;
                              }

                              // Otimista update
                              setLead(prev => prev ? { ...prev, status: newStatusKey } : null);

                              try {
                                const { data: checkData, error: checkError } = await supabase
                                  .from('clientes')
                                  .select('id, tenant_id, status')
                                  .eq('id', lead.id)
                                  .maybeSingle();

                                if (checkError) {
                                  console.error('[LeadUpdate] Erro na verificação pré-update:', checkError);
                                } else if (!checkData) {
                                  console.error('[LeadUpdate] REGISTRO NÃO ENCONTRADO no banco via SELECT. Possível erro de ID ou RLS de leitura.');
                                  throw new Error('Lead não encontrado ou sem permissão de leitura.');
                                } else {
                                  console.log('[LeadUpdate] Registro verificado existe:', checkData);
                                }

                                const currentTenantId = checkData?.tenant_id || lead.tenant_id;

                                // Tentativa real de update
                                const { data, error } = await supabase
                                  .from('clientes')
                                  .update({
                                    status: newStatusKey,
                                    tenant_id: currentTenantId
                                  })
                                  .eq('id', lead.id)
                                  .select();

                                if (error) {
                                  console.error('[LeadUpdate] Erro retornado pelo Supabase no UPDATE:', error);
                                  throw error;
                                }

                                if (!data || data.length === 0) {
                                  console.error('[LeadUpdate] UPDATE retornou 0 registros. O registro existe (checkOk) mas o UPDATE falhou. RLS de UPDATE bloqueando?');
                                  throw new Error('Atualização bloqueada por permissões (RLS de Update).');
                                }

                                console.log('[LeadUpdate] Sucesso absoluto. Dados retornados:', data);
                                toast.success('Status atualizado!');

                                // Atualizar a lista de conversas para refletir o novo status
                                refetchConversations();
                              } catch (err: any) {
                                console.error('[LeadUpdate] Erro capturado no bloco principal:', err);
                                toast.error(`Erro ao atualizar: ${err.message}`);
                                if (checkData) {
                                  setLead(prev => prev ? { ...prev, status: checkData.status } : null);
                                }
                              }
                            }}
                            className="appearance-none pl-3 pr-8 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-medium border-none focus:ring-2 focus:ring-green-500/50 cursor-pointer outline-none"
                          >
                            {funilEtapas.length > 0 ? (
                              funilEtapas.map(etapa => (
                                <option key={etapa.id} value={etapa.key}>
                                  {etapa.label}
                                </option>
                              ))
                            ) : (
                              <option value="">{lead?.status || t('conversations.active')}</option>
                            )}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <svg className="w-3 h-3 text-green-700 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Categoria (Trabalho / Pessoal) */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Categoria</span>
                        <div className="relative">
                          <select
                            value={lead?.categoria || 'trabalho'}
                            onChange={async (e) => {
                              if (!lead?.id || lead.id === 'temp-id') return;
                              const newCategoria = e.target.value as 'trabalho' | 'pessoal';

                              // Optimistic update
                              setLead(prev => prev ? { ...prev, categoria: newCategoria } : null);

                              try {
                                const { data, error } = await supabase
                                  .from('clientes')
                                  .update({ categoria: newCategoria })
                                  .eq('id', lead.id)
                                  .select();

                                if (error) throw error;
                                if (!data || data.length === 0) {
                                  throw new Error('Atualização não persistida');
                                }

                                toast.success('Categoria atualizada!');
                                refetchConversations();
                              } catch (err: any) {
                                console.error('[CategoriaUpdate] Erro:', err);
                                toast.error(`Erro ao atualizar categoria: ${err.message}`);
                              }
                            }}
                            className={`appearance-none pl-3 pr-8 py-1 text-xs rounded-full font-medium border-none focus:ring-2 cursor-pointer outline-none ${lead?.categoria === 'pessoal'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 focus:ring-purple-500/50'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 focus:ring-blue-500/50'
                              }`}
                          >
                            <option value="trabalho">💼 Trabalho</option>
                            <option value="pessoal">👤 Pessoal</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <svg className={`w-3 h-3 ${lead?.categoria === 'pessoal' ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">ID do Lead</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500 truncate max-w-[150px]" title={lead?.id}>
                            {lead?.id}
                          </span>
                          <button
                            onClick={() => {
                              if (lead?.id) {
                                navigator.clipboard.writeText(lead.id);
                                toast.success('ID copiado!');
                              }
                            }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 space-y-2">
                      {!leadExists && selectedConversa && (
                        <button
                          onClick={createLeadManually}
                          disabled={creatingLead}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          {creatingLead ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              Criar lead
                            </>
                          )}
                        </button>
                      )}
                      {leadExists && lead?.id && (
                        <button
                          onClick={() => navigate(`/app/clientes/${lead.id}`)}
                          className="w-full py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          {t('conversations.viewFullProfile')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notas e Atividades</h3>
                      <button
                        onClick={() => setModalAddActivity(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 rounded-lg transition-all text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Nota
                      </button>
                    </div>

                    {lead ? (
                      <LeadTimeline leadId={lead.id} key={timelineKey} />
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p>Selecione um lead para ver as notas.</p>
                      </div>
                    )}

                    {lead && tenant && user && (
                      <AddActivityModal
                        isOpen={modalAddActivity}
                        onClose={() => setModalAddActivity(false)}
                        leadId={lead.id}
                        tenantId={tenant.id}
                        userId={user.id}
                        onSuccess={() => setTimelineKey(prev => prev + 1)}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'files' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {lead ? (
                      <LeadAttachments leadId={lead.id} />
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p>Selecione um lead para ver os arquivos.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
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
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
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
                        alt={t('conversations.preview')}
                        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                      />
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

        </div >

        {/* Confirm Delete Modal - Batch */}
        <ConfirmDeleteModal
          isOpen={showBatchDeleteConfirm}
          onClose={() => setShowBatchDeleteConfirm(false)}
          onConfirm={confirmBatchDelete}
          title="Excluir Conversas"
          message={`Tem certeza que deseja excluir ${selectedConversationIds.size} conversa(s)? Esta ação não pode ser desfeita.`}
          confirmText="Excluir conversas"
        />

        {/* Confirm Delete Modal - Single */}
        <ConfirmDeleteModal
          isOpen={showSingleDeleteConfirm}
          onClose={() => {
            setShowSingleDeleteConfirm(false);
            setConversationToDelete(null);
          }}
          onConfirm={confirmSingleDelete}
          title="Excluir Conversa"
          message="Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita."
          confirmText="Excluir conversa"
        />
      </PremiumGate>

    </RequireRole >
  );
}
