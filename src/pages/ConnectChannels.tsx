import { useState, useEffect } from 'react';
import { MessageCircle, Check, Loader2, Zap, Edit2, Wifi, WifiOff, BookOpen, AlertCircle, CheckCircle, UserPlus, Plus, X, Shield } from 'lucide-react';
import RequireRole from '../components/auth/RequireRole';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useIntegration } from '../hooks/useIntegration';
import { useTranslation } from 'react-i18next';
import PremiumGate from '../components/premium/PremiumGate';

export default function ConnectChannelsPage() {
  const { } = useAuthStore();
  const { whatsappIntegration, loading, disconnectIntegration, updateIntegration, updateAdminPhones } = useIntegration();
  const { t } = useTranslation();

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    instanceId: '',
    token: '',
    serverUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<'whatsapp' | null>(null);

  // Admin phones state
  const [adminPhones, setAdminPhones] = useState<string[]>([]);
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [savingAdmins, setSavingAdmins] = useState(false);

  // Carregar telefones admin quando integração mudar
  useEffect(() => {
    if (whatsappIntegration?.config?.admin_phones) {
      setAdminPhones(whatsappIntegration.config.admin_phones);
    }
  }, [whatsappIntegration]);

  const isWhatsAppConnected = whatsappIntegration?.status === 'active' && whatsappIntegration?.is_active;

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
      setFormData({ instanceId: '', token: '', serverUrl: '' });
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

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada!');
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
      <PremiumGate featureName="Conectar Canais">
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
                  <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl overflow-hidden transition-colors w-full">
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
                                  serverUrl: whatsappIntegration?.credentials?.base_url || '',
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
                                placeholder="https://sua-instancia.uazapi.com"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400"
                              />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            {isEditing && (
                              <button
                                onClick={() => {
                                  setIsEditing(false);
                                  setFormData({ instanceId: '', token: '', serverUrl: '' });
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

                  {/* WhatsApp Tutorial */}
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
                </div>
              </div>

              {/* Row 2: Admin Phones Section */}
              {isWhatsAppConnected && (
                <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl p-6 transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Números de Administrador</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Apenas esses números podem usar comandos do bot (relatórios, agenda, vendas)
                      </p>
                    </div>
                  </div>

                  {/* Lista de admins */}
                  <div className="space-y-3 mb-4">
                    {adminPhones.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-white/5 rounded-lg border border-dashed border-gray-300 dark:border-white/10">
                        <p className="text-sm">Nenhum administrador cadastrado.</p>
                        <p className="text-xs mt-1">Adicione números de telefone para restringir o acesso.</p>
                      </div>
                    ) : (
                      adminPhones.map((phone, index) => (
                        <div key={index} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-gray-900 dark:text-white font-mono">{phone}</span>
                          </div>
                          <button
                            onClick={() => {
                              const newList = adminPhones.filter((_, i) => i !== index);
                              setAdminPhones(newList);
                            }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Adicionar novo número */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newAdminPhone}
                      onChange={(e) => setNewAdminPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 5531912345678"
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 font-mono"
                    />
                    <button
                      onClick={() => {
                        if (newAdminPhone.length >= 10 && !adminPhones.includes(newAdminPhone)) {
                          setAdminPhones([...adminPhones, newAdminPhone]);
                          setNewAdminPhone('');
                        } else if (adminPhones.includes(newAdminPhone)) {
                          toast.error('Número já cadastrado');
                        } else {
                          toast.error('Digite um número válido');
                        }
                      }}
                      className="flex-shrink-0 px-4 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>

                  {/* Botão Salvar */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={async () => {
                        setSavingAdmins(true);
                        await updateAdminPhones(adminPhones);
                        setSavingAdmins(false);
                      }}
                      disabled={savingAdmins}
                      className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-cyan-600 text-white rounded-lg font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingAdmins ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Salvar Administradores
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Confirmação de Desconexão */}
        {showDisconnectConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-gray-200 dark:border-white/10 transform animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-6 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                Desconectar {showDisconnectConfirm === 'whatsapp' ? 'WhatsApp' : 'Instagram'}?
              </h3>

              <p className="text-gray-600 dark:text-slate-400 text-center mb-8 leading-relaxed">
                Você parará de receber mensagens e notificações através deste canal. Esta ação pode ser revertida a qualquer momento reconectando as credenciais.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowDisconnectConfirm(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-xl font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </PremiumGate>

    </RequireRole>
  );
}
