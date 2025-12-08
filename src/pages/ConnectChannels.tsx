import { useState, useEffect } from 'react';
import { MessageCircle, Check, Loader2, Zap, Edit2, Wifi, WifiOff, BookOpen, AlertCircle, Instagram, CheckCircle } from 'lucide-react';
import RequireRole from '../components/auth/RequireRole';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useIntegration } from '../hooks/useIntegration';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';



export default function ConnectChannelsPage() {
  const { } = useAuthStore();
  const { integration, loading, disconnectIntegration, updateIntegration } = useIntegration();
  const { t } = useTranslation();

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    instanceId: '',
    token: '',
    serverUrl: 'https://heavens.uazapi.com',
  });
  const [saving, setSaving] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const isConnected = integration?.status === 'active' && integration?.is_active;

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
    const success = await disconnectIntegration();
    if (success) setShowDisconnectConfirm(false);
  };

  // Instagram State
  const [instagramAccounts, setInstagramAccounts] = useState<any[]>([]);
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const { connectInstagram } = useIntegration();

  // Load Facebook SDK
  useEffect(() => {
    if (!window.FB) {
      const script = document.createElement('script');
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        window.FB.init({
          appId: '1201882808362468',
          cookie: true,
          xfbml: true,
          version: 'v21.0'
        });
      };
      document.body.appendChild(script);
    }
  }, []);

  const handleFacebookLogin = () => {
    if (!window.FB) {
      toast.error('Facebook SDK carregando... aguarde.');
      return;
    }

    setConnectingInstagram(true);
    window.FB.login(async (response: any) => {
      if (response.authResponse) {
        try {
          // Exchange token via Edge Function
          const { data, error } = await supabase.functions.invoke('facebook-exchange-token', {
            body: { shortToken: response.authResponse.accessToken }
          });

          if (error) throw error;

          // Filter pages that have Instagram connected
          const accountsWithIg = data.pages.filter((p: any) => p.instagram_business_account);

          if (accountsWithIg.length === 0) {
            toast.error('Nenhuma conta do Instagram Business encontrada nas suas Páginas.');
          } else {
            setInstagramAccounts(accountsWithIg);
            toast.success(`${accountsWithIg.length} contas do Instagram encontradas!`);
          }
        } catch (err) {
          console.error('Erro ao conectar Facebook:', err);
          toast.error('Erro ao processar login do Facebook.');
        } finally {
          setConnectingInstagram(false);
        }
      } else {
        setConnectingInstagram(false);
      }
    }, {
      scope: 'pages_show_list,instagram_basic,instagram_manage_messages,pages_manage_metadata',
      return_scopes: true
    });
  };

  const confirmInstagramConnection = async (account: any) => {
    setConnectingInstagram(true);
    const success = await connectInstagram(
      account.id,
      account.access_token,
      account.instagram_business_account.id,
      account.name
    );
    if (success) {
      setInstagramAccounts([]);
    }
    setConnectingInstagram(false);
  };

  if (loading) {
    return (
      <RequireRole roles={['owner', 'admin']}>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </RequireRole>
    );
  }

  return (
    <RequireRole roles={['owner', 'admin']}>
      <div className="h-full bg-gray-50 dark:bg-slate-900 p-6 transition-colors overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('connectChannels.title')}</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-2 text-lg">
              {t('connectChannels.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column: Connection Status/Form */}
            <div className="space-y-6">

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
                    {isConnected && integration?.channel === 'whatsapp' && (
                      <div className="flex items-center gap-2 bg-green-100 dark:bg-green-500/20 px-3 py-1 rounded-lg border border-green-200 dark:border-green-500/30">
                        <Wifi className="w-4 h-4 text-green-700 dark:text-green-400" />
                        <span className="text-green-700 dark:text-green-400 text-sm font-medium">{t('connectChannels.connected')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* WhatsApp Content */}
                <div className="p-6">
                  {isConnected && integration?.channel === 'whatsapp' && !isEditing ? (
                    <div className="space-y-6">
                      <div className="rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <h4 className="text-gray-900 dark:text-white font-medium">{t('connectChannels.activeIntegration')}</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-slate-400 block mb-1">{t('connectChannels.instanceId')}</span>
                            <p className="text-gray-900 dark:text-white font-mono bg-white dark:bg-black/20 px-2 py-1 rounded border border-gray-200 dark:border-white/5">{integration?.credentials?.instance_id}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-slate-400 block mb-1">{t('connectChannels.token')}</span>
                            <p className="text-gray-900 dark:text-white font-mono bg-white dark:bg-black/20 px-2 py-1 rounded border border-gray-200 dark:border-white/5">{maskToken(integration?.credentials?.secret_key || '')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setFormData({
                              instanceId: integration?.credentials?.instance_id || '',
                              token: integration?.credentials?.secret_key || '',
                              serverUrl: integration?.credentials?.base_url || 'https://heavens.uazapi.com',
                            });
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-cyan-600 text-white rounded-lg font-semibold transition-all shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          {t('connectChannels.edit')}
                        </button>
                        <button
                          onClick={() => setShowDisconnectConfirm(true)}
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
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl overflow-hidden transition-colors mt-6">
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
                    {isConnected && integration?.channel === 'instagram' && (
                      <div className="flex items-center gap-2 bg-pink-100 dark:bg-pink-500/20 px-3 py-1 rounded-lg border border-pink-200 dark:border-pink-500/30">
                        <Wifi className="w-4 h-4 text-pink-700 dark:text-pink-400" />
                        <span className="text-pink-700 dark:text-pink-400 text-sm font-medium">{t('connectChannels.connected')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {isConnected && integration?.channel === 'instagram' ? (
                    <div className="space-y-6">
                      <div className="rounded-lg bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 p-4 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <Check className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                          <h4 className="text-gray-900 dark:text-white font-medium">Instagram Conectado</h4>
                        </div>
                        <p className="text-gray-600 dark:text-slate-300 text-sm">
                          Página: <strong>{integration.credentials.page_name}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDisconnectConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white border border-gray-200 dark:border-transparent rounded-lg font-semibold transition-all"
                      >
                        <WifiOff className="w-4 h-4" />
                        {t('connectChannels.disconnect')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-gray-600 dark:text-slate-400 text-sm">
                        Conecte sua conta do Instagram Business para receber e responder mensagens diretamente aqui.
                      </p>

                      {instagramAccounts.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Selecione a conta:</p>
                          {instagramAccounts.map((account) => (
                            <button
                              key={account.id}
                              onClick={() => confirmInstagramConnection(account)}
                              disabled={connectingInstagram}
                              className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                {account.instagram_business_account.profile_picture_url ? (
                                  <img src={account.instagram_business_account.profile_picture_url} className="w-8 h-8 rounded-full" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                                    {account.instagram_business_account.username[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{account.instagram_business_account.username}</p>
                                  <p className="text-xs text-gray-500">Página: {account.name}</p>
                                </div>
                              </div>
                              {connectingInstagram ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-gray-400" />}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={handleFacebookLogin}
                          disabled={connectingInstagram}
                          className="w-full py-3 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          {connectingInstagram ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Conectando...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                              </svg>
                              Continuar com Facebook
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Tutorial & Troubleshooting */}
            <div className="space-y-6">
              {/* Quick Tutorial */}
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl p-6 transition-colors">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('connectChannels.howToConnect')}</h3>
                </div>
                <div className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-100 dark:bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-cyan-700 dark:text-cyan-400 text-sm font-medium">1</span>
                    </div>
                    <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                      {t('connectChannels.step1')} <strong className="text-gray-900 dark:text-white">{t('connectChannels.instanceId')}</strong> e <strong className="text-gray-900 dark:text-white">{t('connectChannels.token')}</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-100 dark:bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-cyan-700 dark:text-cyan-400 text-sm font-medium">2</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                        {t('connectChannels.step2')}
                      </p>
                      <code className="block bg-gray-100 dark:bg-slate-800 px-3 py-2 rounded text-xs text-gray-800 dark:text-gray-300 font-mono break-all border border-gray-200 dark:border-transparent">
                        {import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver
                      </code>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-100 dark:bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-cyan-700 dark:text-cyan-400 text-sm font-medium">3</span>
                    </div>
                    <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                      {t('connectChannels.step3')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instagram Tutorial */}
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl p-6 transition-colors mt-6">
                <div className="flex items-center gap-2 mb-6">
                  <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('connectChannels.howToConnectInstagram')}</h3>
                </div>
                <div className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-pink-100 dark:bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-pink-700 dark:text-pink-400 text-sm font-medium">1</span>
                    </div>
                    <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                      Clique em <strong>Continuar com Facebook</strong> e conceda as permissões solicitadas.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-pink-100 dark:bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-pink-700 dark:text-pink-400 text-sm font-medium">2</span>
                    </div>
                    <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                      Selecione a conta do Instagram Business que deseja conectar.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-pink-100 dark:bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-pink-700 dark:text-pink-400 text-sm font-medium">3</span>
                    </div>
                    <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                      Pronto! Suas mensagens aparecerão automaticamente na aba Conversas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl p-6 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('connectChannels.troubleshooting')}</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-600 dark:text-slate-300">
                  <p className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {t('connectChannels.troubleshoot1')}
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {t('connectChannels.troubleshoot2')}
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {t('connectChannels.troubleshoot3')}
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
                  onClick={() => setShowDisconnectConfirm(false)}
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
    </RequireRole>
  );
}
