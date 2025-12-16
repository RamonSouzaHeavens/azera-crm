import { useState } from 'react';
import { MessageCircle, Check, Loader2, Zap, Edit2, Wifi, WifiOff, BookOpen, AlertCircle, Instagram, CheckCircle, ExternalLink, Copy } from 'lucide-react';
import RequireRole from '../components/auth/RequireRole';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useIntegration } from '../hooks/useIntegration';
import { useTranslation } from 'react-i18next';



export default function ConnectChannelsPage() {
  const { } = useAuthStore();
  const { whatsappIntegration, instagramIntegration, loading, disconnectIntegration, updateIntegration } = useIntegration();
  const { t } = useTranslation();

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    instanceId: '',
    token: '',
    serverUrl: 'https://heavens.uazapi.com',
  });
  const [saving, setSaving] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<'whatsapp' | 'instagram' | null>(null);

  const isWhatsAppConnected = whatsappIntegration?.status === 'active' && whatsappIntegration?.is_active;
  const isInstagramConnected = instagramIntegration?.status === 'active' && instagramIntegration?.is_active;

  const maskToken = (token: string) => {
    if (!token || token.length < 8) return '****';
    return `****${token.slice(-4)}`;
  };

  const handleConnect = async () => {
    if (!formData.instanceId || !formData.token) {
      toast.error(t('connectChannels.fillAllFields'));
      return;
    }
    setSaving(true);
    const success = await updateIntegration(formData.instanceId, formData.token, formData.serverUrl);
    setSaving(false);
    if (success) {
      setIsEditing(false);
      setFormData({ instanceId: '', token: '', serverUrl: 'https://heavens.uazapi.com' });
    }
  };

  const handleUpdate = async () => {
    await handleConnect();
  };

  const handleDisconnect = async () => {
    if (!showDisconnectConfirm) return;
    const success = await disconnectIntegration(showDisconnectConfirm);
    if (success) setShowDisconnectConfirm(null);
  };

  // Instagram State
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [instagramAccounts, setInstagramAccounts] = useState<Array<{
    id: string;
    name: string;
    username?: string;
    pageId: string;
    pageName: string;
    pageAccessToken: string;
  }>>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const { connectInstagram } = useIntegration();

  // Token Extension Generator State
  const [tokenAppId, setTokenAppId] = useState('');
  const [tokenAppSecret, setTokenAppSecret] = useState('');
  const [tokenGraphExplorer, setTokenGraphExplorer] = useState('');

  const generateExtendedTokenUrl = () => {
    if (!tokenAppId || !tokenAppSecret || !tokenGraphExplorer) return '';
    return `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${tokenAppId}&client_secret=${tokenAppSecret}&fb_exchange_token=${tokenGraphExplorer}`;
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada! Cole no navegador.');
  };

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank');
  };

  // Buscar páginas e contas de Instagram vinculadas ao token
  const fetchInstagramAccounts = async () => {
    if (!accessToken.trim()) {
      toast.error('Cole o token de acesso primeiro');
      return;
    }

    setFetchingPages(true);
    setInstagramAccounts([]);
    setSelectedAccount(null);

    try {
      // 1. Buscar páginas que o usuário administra
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
      );
      const pagesData = await pagesResponse.json();

      if (pagesData.error) {
        throw new Error(pagesData.error.message || 'Erro ao buscar páginas');
      }

      if (!pagesData.data || pagesData.data.length === 0) {
        toast.error('Nenhuma página encontrada. Verifique as permissões do token.');
        setFetchingPages(false);
        return;
      }

      // 2. Para cada página, buscar detalhes do Instagram Business Account
      const accounts: Array<{
        id: string;
        name: string;
        username?: string;
        pageId: string;
        pageName: string;
        pageAccessToken: string; // TOKEN DA PÁGINA (necessário para a API do Instagram)
      }> = [];

      for (const page of pagesData.data) {
        if (page.instagram_business_account) {
          // Buscar detalhes da conta do Instagram
          const igResponse = await fetch(
            `https://graph.facebook.com/v18.0/${page.instagram_business_account.id}?fields=id,name,username&access_token=${accessToken}`
          );
          const igData = await igResponse.json();

          accounts.push({
            id: page.instagram_business_account.id,
            name: igData.name || page.name,
            username: igData.username,
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token // IMPORTANTE: Token da página, não do usuário
          });
        }
      }

      if (accounts.length === 0) {
        toast.error('Nenhuma conta de Instagram Business encontrada vinculada às suas páginas.');
      } else {
        setInstagramAccounts(accounts);
        toast.success(`${accounts.length} conta(s) de Instagram encontrada(s)!`);
      }
    } catch (error: any) {
      console.error('Error fetching Instagram accounts:', error);
      toast.error(error.message || 'Erro ao buscar contas do Instagram');
    } finally {
      setFetchingPages(false);
    }
  };

  // Conectar a conta selecionada
  const handleInstagramConnect = async () => {
    if (!selectedAccount || !accessToken) {
      toast.error('Selecione uma conta para conectar');
      return;
    }

    const account = instagramAccounts.find(a => a.id === selectedAccount);
    if (!account) return;

    setConnectingInstagram(true);
    const success = await connectInstagram(
      account.pageId,
      account.pageAccessToken, // USA O PAGE ACCESS TOKEN, não o user token
      account.id,
      account.username ? `@${account.username}` : account.name
    );

    if (success) {
      setAccessToken('');
      setInstagramAccounts([]);
      setSelectedAccount(null);
    }
    setConnectingInstagram(false);
  };

  if (loading) {
    return (
      <RequireRole roles={['owner', 'admin']}>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </RequireRole>
    );
  }

  return (
    <RequireRole roles={['owner', 'admin']}>
      <div className="h-full bg-background text-slate-900 dark:text-slate-200 overflow-hidden relative transition-colors">

        {/* Background Decorativo (HUD glow grid background + overlay) */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:120px_120px]" />
        </div>

        <div className="relative z-10 h-full overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('connectChannels.title')}</h1>
              <p className="text-gray-600 dark:text-slate-400 mt-2 text-lg">
                {t('connectChannels.subtitle')}
              </p>
            </div>

            <div className="space-y-8">
              {/* Row 1: Connection Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* WhatsApp Card */}
                <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl overflow-hidden transition-colors">
                  {/* ... WhatsApp Header ... */}
                  <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-500/20 dark:to-emerald-600/20 border-b border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-white/10 rounded-lg flex items-center justify-center transition-colors">
                          <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('connectChannels.whatsappTitle')}</h2>
                          <p className="text-gray-600 dark:text-slate-400 text-sm">{t('connectChannels.whatsappSubtitle')}</p>
                        </div>
                      </div>
                      {isWhatsAppConnected && (
                        <div className="flex items-center gap-2 bg-green-100 dark:bg-green-500/20 px-3 py-1 rounded-lg border border-green-200 dark:border-green-500/30">
                          <Wifi className="w-4 h-4 text-green-700 dark:text-green-400" />
                          <span className="text-green-700 dark:text-green-400 text-sm font-medium">{t('connectChannels.connected')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp Content */}
                  <div className="p-6">
                    {isWhatsAppConnected && !isEditing ? (
                      <div className="space-y-6">
                        <div className="rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4 transition-colors">
                          <div className="flex items-center gap-3 mb-4">
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <h4 className="text-gray-900 dark:text-white font-medium">{t('connectChannels.activeIntegration')}</h4>
                          </div>
                          <div className="grid grid-cols-1 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-slate-400 block mb-1">{t('connectChannels.instanceId')}</span>
                              <p className="text-gray-900 dark:text-white font-mono bg-white dark:bg-black/20 px-2 py-1 rounded border border-gray-200 dark:border-white/5">{whatsappIntegration?.credentials?.instance_id}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-slate-400 block mb-1">{t('connectChannels.token')}</span>
                              <p className="text-gray-900 dark:text-white font-mono bg-white dark:bg-black/20 px-2 py-1 rounded border border-gray-200 dark:border-white/5">{maskToken(whatsappIntegration?.credentials?.secret_key || '')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setFormData({
                                instanceId: whatsappIntegration?.credentials?.instance_id || '',
                                token: whatsappIntegration?.credentials?.secret_key || '',
                                serverUrl: whatsappIntegration?.credentials?.base_url || 'https://heavens.uazapi.com',
                              });
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-cyan-600 text-white rounded-lg font-semibold transition-all shadow-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            {t('connectChannels.edit')}
                          </button>
                          <button
                            onClick={() => setShowDisconnectConfirm('whatsapp')}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white border border-gray-200 dark:border-transparent rounded-lg font-semibold transition-all"
                          >
                            <WifiOff className="w-4 h-4" />
                            {t('connectChannels.disconnect')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">{t('connectChannels.instanceId')} *</label>
                            <input
                              type="text"
                              value={formData.instanceId}
                              onChange={(e) => setFormData({ ...formData, instanceId: e.target.value })}
                              placeholder={t('connectChannels.instancePlaceholder')}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">{t('connectChannels.token')} *</label>
                            <input
                              type="password"
                              value={formData.token}
                              onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                              placeholder={t('connectChannels.tokenPlaceholder')}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">{t('connectChannels.serverUrl')}</label>
                            <input
                              type="text"
                              value={formData.serverUrl}
                              onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                              placeholder="https://heavens.uazapi.com"
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          {isEditing && (
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                setFormData({ instanceId: '', token: '', serverUrl: 'https://heavens.uazapi.com' });
                              }}
                              className="flex-1 px-4 py-3 bg-white hover:bg-gray-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white border border-gray-200 dark:border-transparent rounded-lg font-semibold transition-all"
                            >
                              {t('connectChannels.cancel')}
                            </button>
                          )}
                          <button
                            onClick={isEditing ? handleUpdate : handleConnect}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-cyan-600 text-white rounded-lg font-semibold hover:scale-105 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {isEditing ? t('connectChannels.updating') : t('connectChannels.connecting')}
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                {isEditing ? t('connectChannels.update') : t('connectChannels.connect')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instagram Card */}
                <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl overflow-hidden transition-colors">
                  <div className="bg-gradient-to-r from-pink-50/50 to-rose-50/50 dark:from-pink-500/20 dark:to-rose-600/20 border-b border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-100 dark:bg-white/10 rounded-lg flex items-center justify-center transition-colors">
                          <Instagram className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Instagram</h2>
                          <p className="text-gray-600 dark:text-slate-400 text-sm">Conectar Direct Messages</p>
                        </div>
                      </div>
                      {isInstagramConnected && (
                        <div className="flex items-center gap-2 bg-pink-100 dark:bg-pink-500/20 px-3 py-1 rounded-lg border border-pink-200 dark:border-pink-500/30">
                          <Wifi className="w-4 h-4 text-pink-700 dark:text-pink-400" />
                          <span className="text-pink-700 dark:text-pink-400 text-sm font-medium">{t('connectChannels.connected')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {isInstagramConnected ? (
                      <div className="space-y-6">
                        <div className="rounded-lg bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 p-4 transition-colors">
                          <div className="flex items-center gap-3 mb-4">
                            <Check className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                            <h4 className="text-gray-900 dark:text-white font-medium">Instagram Conectado</h4>
                          </div>

                          {/* Mostrar conta conectada */}
                          <div className="flex items-center gap-3 p-3 bg-white dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/10 mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                              {instagramIntegration?.credentials?.page_name?.charAt(0).toUpperCase() || 'I'}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white text-lg">
                                {instagramIntegration?.credentials?.page_name && instagramIntegration?.credentials?.page_name !== 'Instagram (Manual)'
                                  ? instagramIntegration?.credentials?.page_name
                                  : 'Conta Conectada'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                                ID: {instagramIntegration?.credentials?.instagram_business_account_id || instagramIntegration?.credentials?.page_id || 'N/A'}
                              </p>
                            </div>
                            <Instagram className="w-6 h-6 text-pink-500" />
                          </div>

                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            🔒 Esta conexão é <strong>exclusiva da sua empresa</strong>. Outras empresas no sistema não têm acesso ao seu Instagram.
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            💡 Para mudar a conta, desconecte e reconecte usando o novo fluxo.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDisconnectConfirm('instagram')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white border border-gray-200 dark:border-transparent rounded-lg font-semibold transition-all"
                        >
                          <WifiOff className="w-4 h-4" />
                          {t('connectChannels.disconnect')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <p className="text-gray-600 dark:text-slate-400 text-sm">
                          Cole o Token de Acesso gerado no Graph API Explorer para buscar suas contas de Instagram.
                        </p>

                        {/* Campo do Token */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                            Token de Acesso *
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={accessToken}
                              onChange={(e) => setAccessToken(e.target.value)}
                              placeholder="Cole o token gerado no Meta for Developers"
                              className="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400"
                            />
                            <button
                              onClick={fetchInstagramAccounts}
                              disabled={fetchingPages || !accessToken.trim()}
                              className="px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {fetchingPages ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Zap className="w-5 h-5" />
                              )}
                              Buscar Contas
                            </button>
                          </div>
                        </div>

                        {/* Lista de Contas Encontradas */}
                        {instagramAccounts.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                              Selecione a conta do Instagram
                            </label>
                            <div className="space-y-2">
                              {instagramAccounts.map((account) => (
                                <button
                                  key={account.id}
                                  onClick={() => setSelectedAccount(account.id)}
                                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedAccount === account.id
                                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10'
                                    : 'border-gray-200 dark:border-white/10 hover:border-pink-300 dark:hover:border-pink-500/30 bg-white dark:bg-white/5'
                                    }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold">
                                      {account.username?.charAt(0).toUpperCase() || account.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {account.username ? `@${account.username}` : account.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-slate-400">
                                        Página: {account.pageName}
                                      </p>
                                    </div>
                                    {selectedAccount === account.id && (
                                      <Check className="w-5 h-5 text-pink-500" />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Botão Conectar */}
                        {instagramAccounts.length > 0 && (
                          <button
                            onClick={handleInstagramConnect}
                            disabled={connectingInstagram || !selectedAccount}
                            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-lg font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {connectingInstagram ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('connectChannels.connecting')}
                              </>
                            ) : (
                              <>
                                <Zap className="w-5 h-5" />
                                Conectar Conta Selecionada
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Instructions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* WhatsApp Tutorial - SUPER DETALHADO */}
                <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl p-6 transition-colors h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📱 Tutorial Completo: WhatsApp via Uazapi</h3>
                  </div>

                  {/* Aviso Importante */}
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span><strong>Importante:</strong> Para esta integração funcionar, você precisa ter uma conta na Uazapi e um número de WhatsApp Business (recomendado) ou pessoal.</span>
                    </p>
                  </div>

                  <div className="space-y-6 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {/* Step 1 */}
                    <div className="relative pl-6 border-l-2 border-cyan-200 dark:border-cyan-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-4 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold"></div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">1</span>
                          Crie sua conta na Uazapi
                        </h4>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>Acesse o site <a href="https://uazapi.com" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline font-medium">uazapi.com</a></li>
                          <li>Clique em <strong>"Criar Conta"</strong> ou <strong>"Get Started"</strong></li>
                          <li>Preencha seus dados (nome, email, senha)</li>
                          <li>Confirme seu email clicando no link enviado</li>
                          <li>Faça login na plataforma</li>
                        </ol>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative pl-6 border-l-2 border-cyan-200 dark:border-cyan-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">2</span>
                          Crie uma Nova Instância
                        </h4>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>No painel da Uazapi, vá em <strong>"Instâncias"</strong> no menu lateral</li>
                          <li>Clique no botão <strong>"+ Criar Instância"</strong> ou <strong>"Nova Instância"</strong></li>
                          <li>Dê um nome para sua instância (ex: <em>"minha-empresa"</em>)</li>
                          <li>Clique em <strong>"Criar"</strong> ou <strong>"Confirmar"</strong></li>
                        </ol>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative pl-6 border-l-2 border-cyan-200 dark:border-cyan-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">3</span>
                          Copie as Credenciais
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                          Após criar a instância, você verá duas informações importantes:
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-2 rounded border border-slate-200 dark:border-white/10">
                            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/20 px-2 py-0.5 rounded">Instance ID</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">→ Cole no campo "Instance ID" ao lado</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-2 rounded border border-slate-200 dark:border-white/10">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded">Token</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">→ Cole no campo "Token" ao lado</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="relative pl-6 border-l-2 border-cyan-200 dark:border-cyan-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">4</span>
                          Conecte seu WhatsApp (QR Code)
                        </h4>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>Na Uazapi, clique em <strong>"Conectar"</strong> na sua instância</li>
                          <li>Um <strong>QR Code</strong> aparecerá na tela</li>
                          <li>No seu celular, abra o <strong>WhatsApp</strong></li>
                          <li>Toque nos 3 pontinhos (menu) → <strong>"Aparelhos conectados"</strong></li>
                          <li>Toque em <strong>"Conectar um aparelho"</strong></li>
                          <li>Escaneie o QR Code da tela</li>
                          <li>Aguarde até aparecer <strong>"Conectado"</strong></li>
                        </ol>
                      </div>
                    </div>

                    {/* Step 5 - Webhook */}
                    <div className="relative pl-6 border-l-2 border-cyan-200 dark:border-cyan-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 border border-green-200 dark:border-green-500/20">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">5</span>
                          Configure o Webhook (IMPORTANTE!)
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                          Para receber mensagens no CRM, configure o webhook:
                        </p>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside mb-3">
                          <li>Na Uazapi, vá em <strong>Configurações da Instância</strong></li>
                          <li>Encontre a seção <strong>"Webhooks"</strong></li>
                          <li>Cole a URL abaixo no campo <strong>"URL do Webhook"</strong>:</li>
                        </ol>
                        <code className="block w-full bg-slate-100 dark:bg-black/30 p-3 rounded text-xs font-mono text-slate-800 dark:text-slate-300 break-all border border-slate-200 dark:border-white/5 select-all cursor-pointer hover:bg-slate-200 dark:hover:bg-white/5 transition-colors" onClick={() => {
                          navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver`);
                          toast.success('URL copiada!');
                        }}>
                          📋 Clique para copiar: {import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver
                        </code>
                        <ol start={4} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside mt-3">
                          <li>Marque os eventos: <strong>"Mensagem Recebida"</strong></li>
                          <li>Clique em <strong>"Salvar"</strong></li>
                        </ol>
                      </div>
                    </div>

                    {/* Final Step */}
                    <div className="relative pl-6">
                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-500/20 dark:to-emerald-500/20 rounded-lg p-4 border border-green-200 dark:border-green-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <h4 className="text-base font-semibold text-green-800 dark:text-green-300">Pronto!</h4>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Agora preencha os campos acima com o Instance ID e Token, e clique em "Conectar". Suas mensagens do WhatsApp aparecerão no CRM!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instagram Tutorial - SUPER DETALHADO */}
                <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl p-6 transition-colors h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center text-pink-600 dark:text-pink-400">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📸 Tutorial Completo: Instagram via Meta</h3>
                  </div>

                  {/* Aviso Importante */}
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span><strong>Pré-requisitos:</strong> Você precisa de uma conta do Instagram <strong>Profissional</strong> (Business ou Criador) vinculada a uma <strong>Página do Facebook</strong>.</span>
                    </p>
                  </div>

                  {/* Aviso Multi-Tenant */}
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>🔒 Seu Token é Exclusivo:</strong> Cada empresa/equipe no CRM Azera gera seu <strong>próprio</strong> App e Token Meta.
                        Seus dados são armazenados separadamente — seu token <strong>NÃO será compartilhado</strong> com outros usuários do sistema.
                      </span>
                    </p>
                  </div>

                  <div className="space-y-6 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {/* Step 1 */}
                    <div className="relative pl-6 border-l-2 border-pink-200 dark:border-pink-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-pink-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">1</span>
                          Converta para Conta Profissional
                        </h4>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>Abra o app do <strong>Instagram</strong></li>
                          <li>Vá em <strong>Configurações → Conta</strong></li>
                          <li>Toque em <strong>"Mudar para conta profissional"</strong></li>
                          <li>Escolha <strong>"Empresa"</strong> ou <strong>"Criador"</strong></li>
                          <li>Selecione uma categoria e confirme</li>
                        </ol>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative pl-6 border-l-2 border-pink-200 dark:border-pink-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-pink-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">2</span>
                          Vincule a uma Página do Facebook
                        </h4>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>Acesse o <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline font-medium">Facebook</a></li>
                          <li>Vá para sua <strong>Página do Facebook</strong> (crie uma se não tiver)</li>
                          <li>Clique em <strong>"Configurações"</strong> → <strong>"Contas Vinculadas"</strong></li>
                          <li>Conecte sua conta profissional do Instagram</li>
                        </ol>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative pl-6 border-l-2 border-pink-200 dark:border-pink-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-pink-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">3</span>
                          Crie SEU App no Meta for Developers
                        </h4>
                        <p className="text-xs text-pink-600 dark:text-pink-400 mb-2 font-medium">⚠️ Cada empresa precisa criar seu próprio App Meta!</p>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline font-medium">developers.facebook.com</a></li>
                          <li>Faça login com sua conta do Facebook</li>
                          <li>Clique em <strong>"Meus Apps"</strong> → <strong>"Criar App"</strong></li>
                          <li>Selecione <strong>"Outros"</strong> como caso de uso</li>
                          <li>Escolha o tipo <strong>"Empresa"</strong> (Business)</li>
                          <li>Nomeie o app com sua empresa, ex: <em>"CRM - Sua Empresa"</em></li>
                        </ol>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="relative pl-6 border-l-2 border-pink-200 dark:border-pink-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-pink-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">4</span>
                          Adicione o Instagram Graph API
                        </h4>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>No painel do app, role até <strong>"Adicionar produtos"</strong></li>
                          <li>Encontre <strong>"Instagram Graph API"</strong></li>
                          <li>Clique em <strong>"Configurar"</strong></li>
                        </ol>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="relative pl-6 border-l-2 border-pink-200 dark:border-pink-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-pink-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">5</span>
                          Copie o ID do Aplicativo
                        </h4>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>No menu lateral, vá em <strong>"Configurações"</strong> → <strong>"Básico"</strong></li>
                          <li>Copie o <strong>"ID do Aplicativo"</strong> (número longo)</li>
                          <li>Cole no campo <strong>"Instagram App ID"</strong> ao lado</li>
                        </ol>
                        <div className="mt-2 flex items-center gap-2 bg-white dark:bg-black/20 p-2 rounded border border-slate-200 dark:border-white/10">
                          <span className="text-xs font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-500/20 px-2 py-0.5 rounded">ID do App</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Ex: 1234567890123456</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 6 */}
                    <div className="relative pl-6 border-l-2 border-pink-200 dark:border-pink-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-pink-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-rose-50 dark:bg-rose-500/10 rounded-lg p-4 border border-rose-200 dark:border-rose-500/20">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center">6</span>
                          Gere o Token de Acesso (Parte mais importante!)
                        </h4>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>Acesse o Graph API Explorer: <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline font-medium">developers.facebook.com/tools/explorer</a></li>
                          <li>No seletor <strong>"Meta App"</strong> (canto superior direito), escolha o seu aplicativo</li>
                          <li>Clique em <strong>"Gerar token de acesso"</strong> ou <strong>"Get User Access Token"</strong></li>
                          <li>Marque as permissões:
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">instagram_basic</code></li>
                              <li><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">instagram_manage_messages</code></li>
                              <li><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">pages_show_list</code></li>
                              <li><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">pages_manage_metadata</code></li>
                            </ul>
                          </li>
                          <li>Clique em <strong>"Gerar token de acesso"</strong> e autorize</li>
                          <li><strong>Copie o token gerado</strong> que aparece no campo "Token de acesso"</li>
                          <li>Cole no campo <strong>"Token de Acesso"</strong> ao lado</li>
                        </ol>
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-500/10 rounded border border-blue-200 dark:border-blue-500/20">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            🔒 Este token é <strong>exclusivo da sua empresa</strong>. Ele será armazenado de forma segura e isolada — outras empresas no sistema não terão acesso.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 7 - Configure Webhook */}
                    <div className="relative pl-6 border-l-2 border-pink-200 dark:border-pink-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-pink-500 border-4 border-white dark:border-slate-900"></div>
                      <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 border border-green-200 dark:border-green-500/20">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">7</span>
                          Configure o Webhook (IMPORTANTE!)
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                          Para receber mensagens no CRM, configure o webhook no seu App:
                        </p>
                        <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside mb-3">
                          <li>No menu lateral do App, vá em <strong>"Instagram"</strong> → <strong>"Configuração da API"</strong></li>
                          <li>Na seção <strong>"2. Configure webhooks"</strong>, expanda clicando na seta</li>
                          <li>Em <strong>"URL de callback"</strong>, cole:</li>
                        </ol>
                        <code className="block w-full bg-slate-100 dark:bg-black/30 p-3 rounded text-xs font-mono text-slate-800 dark:text-slate-300 break-all border border-slate-200 dark:border-white/5 select-all cursor-pointer hover:bg-slate-200 dark:hover:bg-white/5 transition-colors mb-3" onClick={() => {
                          navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver`);
                          toast.success('URL copiada!');
                        }}>
                          📋 Clique para copiar: {import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver
                        </code>
                        <ol start={4} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 list-decimal list-inside">
                          <li>Em <strong>"Verificar token"</strong>, digite: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">azera-crm-token</code></li>
                          <li>Clique em <strong>"Verificar e salvar"</strong></li>
                          <li>Ative o campo <strong>"messages"</strong> (toggle para "Assinado")</li>
                          <li>Na seção <strong>"1. Gere tokens de acesso"</strong>, clique em <strong>"Adicionar conta"</strong> e adicione sua conta do Instagram</li>
                        </ol>
                        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-500/10 rounded border border-amber-200 dark:border-amber-500/20">
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            ⚠️ <strong>Importante:</strong> O App precisa estar em modo <strong>"Ao vivo"</strong> (não "Desenvolvimento") para receber webhooks reais.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Final Step */}
                    <div className="relative pl-6">
                      <div className="bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-500/20 dark:to-rose-500/20 rounded-lg p-4 border border-pink-200 dark:border-pink-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                          <h4 className="text-base font-semibold text-pink-800 dark:text-pink-300">Pronto!</h4>
                        </div>
                        <p className="text-sm text-pink-700 dark:text-pink-300">
                          Preencha os campos acima e clique em "Conectar". Suas mensagens do Instagram Direct aparecerão no CRM!
                        </p>
                      </div>
                    </div>

                    {/* Token Expiration Warning */}
                    <div className="relative pl-6">
                      <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-4 border border-amber-200 dark:border-amber-500/20">
                        <h4 className="text-base font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          🔄 Gerador de Token de Longa Duração (60 dias)
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                          Preencha os campos abaixo para gerar automaticamente a URL de extensão do seu token.
                          Você precisa fazer isso <strong>tanto para o token do Graph API</strong> quanto para usar no Instagram.
                        </p>

                        <div className="space-y-4">
                          {/* Passo 1 - Encontrar dados */}
                          <div className="bg-white dark:bg-black/20 rounded-lg p-3 border border-amber-200 dark:border-amber-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                              <strong className="text-sm text-amber-800 dark:text-amber-300">Encontre seus dados no Meta for Developers</strong>
                            </div>
                            <ul className="ml-8 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                              <li>• Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline font-medium">developers.facebook.com</a> → <strong>Meus Apps</strong> → Selecione seu app</li>
                              <li>• Vá em <strong>Configurações</strong> → <strong>Básico</strong></li>
                              <li>• Copie o <strong>ID do Aplicativo</strong> e a <strong>Chave Secreta</strong></li>
                            </ul>
                          </div>

                          {/* Passo 2 - Inputs */}
                          <div className="bg-white dark:bg-black/20 rounded-lg p-4 border border-amber-200 dark:border-amber-500/20">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                              <strong className="text-sm text-amber-800 dark:text-amber-300">Cole seus dados aqui</strong>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">ID do Aplicativo (App ID)</label>
                                <input
                                  type="text"
                                  value={tokenAppId}
                                  onChange={(e) => setTokenAppId(e.target.value)}
                                  placeholder="Ex: 1234567890123456"
                                  className="w-full px-3 py-2 text-sm border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 placeholder-amber-400"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Chave Secreta (App Secret)</label>
                                <input
                                  type="text"
                                  value={tokenAppSecret}
                                  onChange={(e) => setTokenAppSecret(e.target.value)}
                                  placeholder="Ex: abc123def456..."
                                  className="w-full px-3 py-2 text-sm border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 placeholder-amber-400"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Token do Graph API Explorer (o que você gerou no passo 6)</label>
                                <input
                                  type="text"
                                  value={tokenGraphExplorer}
                                  onChange={(e) => setTokenGraphExplorer(e.target.value)}
                                  placeholder="Cole o token EAA... aqui"
                                  className="w-full px-3 py-2 text-sm border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 placeholder-amber-400"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Passo 3 - URL Gerada */}
                          <div className="bg-white dark:bg-black/20 rounded-lg p-4 border border-amber-200 dark:border-amber-500/20">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">3</span>
                              <strong className="text-sm text-amber-800 dark:text-amber-300">Clique para gerar seu token de 60 dias</strong>
                            </div>

                            {generateExtendedTokenUrl() ? (
                              <div className="space-y-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-600">
                                  <p className="text-xs text-green-700 dark:text-green-300 break-all font-mono">
                                    {generateExtendedTokenUrl()}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleOpenUrl(generateExtendedTokenUrl())}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Abrir URL no Navegador
                                  </button>
                                  <button
                                    onClick={() => handleCopyUrl(generateExtendedTokenUrl())}
                                    className="px-4 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-700 dark:text-amber-200 rounded-lg font-semibold text-sm transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                                Preencha todos os campos acima para gerar a URL automaticamente.
                              </p>
                            )}
                          </div>

                          {/* Passo 4 - Instruções finais */}
                          <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-3 border border-green-200 dark:border-green-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">4</span>
                              <strong className="text-sm text-green-800 dark:text-green-300">Copie o novo token</strong>
                            </div>
                            <ul className="ml-8 space-y-1 text-xs text-green-700 dark:text-green-300">
                              <li>• Ao abrir a URL, aparecerá um JSON com <strong>"access_token"</strong></li>
                              <li>• Copie <strong>apenas o valor</strong> do token (sem aspas)</li>
                              <li>• Esse token dura <strong>60 dias</strong>!</li>
                              <li>• Use esse novo token para conectar o Instagram acima</li>
                            </ul>
                          </div>
                        </div>

                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-4 flex items-center gap-2">
                          💡 <strong>Dica:</strong> Coloque um lembrete no calendário para renovar a cada 50 dias!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting */}
              {/* Row 3: Support & Troubleshooting */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Expert Help */}
                <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-700"></div>
                  <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>

                  <h3 className="text-xl font-bold mb-2 relative z-10">Não entende nada sobre o assunto?</h3>
                  <p className="text-indigo-100 mb-6 relative z-10 text-sm leading-relaxed">
                    Nossos especialistas fazem por você! Entre em contato agora e deixe a parte técnica agntes.
                  </p>

                  <a
                    href="https://wa.me/5531991318312?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20para%20configurar%20os%20canais%20no%20CRM%20Azera."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-indigo-700 px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-lg relative z-10 w-full justify-center sm:w-auto"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Falar com Especialista
                  </a>
                </div>

                {/* Troubleshooting */}
                <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl p-6 transition-colors h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('connectChannels.troubleshooting')}</h3>
                  </div>
                  <div className="space-y-3 text-sm text-gray-600 dark:text-slate-300">
                    <p className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{t('connectChannels.troubleshoot1')}</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{t('connectChannels.troubleshoot2')}</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{t('connectChannels.troubleshoot3')}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Disconnect Modal */}
          {showDisconnectConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl transition-colors">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('connectChannels.confirmDisconnect')}</h3>
                <p className="text-gray-600 dark:text-slate-400 mb-6">
                  {t('connectChannels.disconnectWarning')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDisconnectConfirm(null)}
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-semibold transition-all"
                  >
                    {t('connectChannels.cancel')}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all shadow-sm"
                  >
                    {t('connectChannels.disconnect')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </RequireRole >
  );
}
