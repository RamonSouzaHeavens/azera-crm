// src/components/equipe/ConexaoMeta.tsx
import React, { useState } from 'react';
import { Facebook, Loader2, CheckCircle, Wallet } from 'lucide-react';
import { useMetaConnection } from '../../hooks/useMetaConnection';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

declare global {
  interface Window {
    FB: any;
  }
}

const ConexaoMeta: React.FC = () => {
  const { connection, connect, disconnect } = useMetaConnection();
  const [loading, setLoading] = useState(false);
  const [connectingAccount, setConnectingAccount] = useState(false);
  const [adAccounts, setAdAccounts] = useState<{ id: string; name: string }[]>([]);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{
    pageId: string;
    pageName: string;
    pageAccessToken: string;
    userAccessToken: string;
  } | null>(null);
  // Limpar conexões antigas que podem ter estrutura diferente
  React.useEffect(() => {
    const savedConnection = localStorage.getItem('meta_connection');
    if (savedConnection) {
      try {
        const parsed = JSON.parse(savedConnection);
        // Se não tem adAccountId, limpar para forçar reconexão
        if (!parsed.adAccountId) {
          localStorage.removeItem('meta_connection');
          console.log('Conexão antiga limpa - reconecte para obter adAccountId');
        }
      } catch (error) {
        console.error('Erro ao verificar conexão salva:', error);
        localStorage.removeItem('meta_connection');
      }
    }
  }, []);

  const resetAccountSelection = () => {
    setAdAccounts([]);
    setSelectedAdAccountId(null);
    setPendingConnection(null);
    setConnectingAccount(false);
  };

  const handleTokenExchange = async (shortToken: string) => {
    try {
      // Usar a Edge Function para troca segura de token
      const { data, error } = await supabase.functions.invoke('facebook-exchange-token', {
        body: { shortToken }
      });

      if (error) throw error;

      const { longLivedToken, pages, adAccounts: fetchedAdAccounts } = data;

      if (!pages || pages.length === 0) {
        toast.error('Nenhuma página encontrada');
        return;
      }

      const page = pages[0];
      const pageAccessToken = page.access_token;

      const availableAccounts = (fetchedAdAccounts || []).map((account: any) => ({
        id: account.id,
        name: account.name || account.account_id
      }));

      if (availableAccounts.length === 0) {
        console.warn('⚠️ Nenhuma Ad Account encontrada - usuário pode não ter permissões');
        toast.error('Sua conta não tem acesso a nenhuma Conta de Anúncios do Facebook. Configure no Business Manager.');
        return;
      }

      // Se só existir uma conta, conecta automaticamente
      if (availableAccounts.length === 1) {
        const onlyAccount = availableAccounts[0];
        connect(page.id, page.name, pageAccessToken, longLivedToken, onlyAccount.id, onlyAccount.name);
        toast.success(`Conectado à página: ${page.name} ✅\nConta de anúncios: ${onlyAccount.name}`);
        resetAccountSelection();
        return;
      }

      // Caso contrário, permitir que o usuário escolha
      setPendingConnection({
        pageId: page.id,
        pageName: page.name,
        pageAccessToken,
        userAccessToken: longLivedToken
      });
      setAdAccounts(availableAccounts);
      setSelectedAdAccountId(availableAccounts[0]?.id ?? null);
      toast.success('Página conectada! Escolha qual conta de anúncios deseja usar.');
    } catch (error) {
      console.error(error);
      toast.error('Erro na conexão com Facebook');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    if (!window.FB) {
      toast.error('Facebook carregando... Tente novamente em 5 segundos');
      return;
    }

    setLoading(true);
    resetAccountSelection();

    window.FB.login((response: { authResponse?: { accessToken: string } }) => {
      if (response.authResponse) {
        handleTokenExchange(response.authResponse.accessToken);
      } else {
        toast.error('Você cancelou ou negou o login');
        setLoading(false);
      }
    }, {
      scope: 'pages_show_list,pages_read_engagement,pages_manage_ads,ads_read,ads_management,business_management,leads_retrieval',
      return_scopes: true
    });
  };

  const handleAccountSelection = async () => {
    if (!pendingConnection || !selectedAdAccountId) {
      toast.error('Selecione uma conta de anúncios');
      return;
    }

    const selectedAccount = adAccounts.find((acc) => acc.id === selectedAdAccountId);
    setConnectingAccount(true);
    try {
      await connect(
        pendingConnection.pageId,
        pendingConnection.pageName,
        pendingConnection.pageAccessToken,
        pendingConnection.userAccessToken,
        selectedAdAccountId,
        selectedAccount?.name
      );
      toast.success(
        `Conectado à página: ${pendingConnection.pageName} ✅\nConta de anúncios: ${selectedAccount?.name || selectedAdAccountId
        }`
      );
      resetAccountSelection();
    } catch (error) {
      console.error('Erro ao salvar conexão:', error);
      toast.error('Não foi possível salvar a conta selecionada. Tente novamente.');
    } finally {
      setConnectingAccount(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    resetAccountSelection();
    toast.success('Desconectado com sucesso');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-8 text-center shadow-sm dark:shadow-none">
        {connection.isConnected ? (
          <>
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Conectado!</h3>
            <p className="text-cyan-600 dark:text-cyan-400 text-lg mb-2">Página: {connection.pageName}</p>
            {connection.adAccountId && (
              <p className="text-sm text-gray-500 dark:text-white/70 mb-6">
                Conta de anúncios: {connection.adAccountName || connection.adAccountId}
              </p>
            )}
            <button onClick={handleDisconnect} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
              Desconectar
            </button>
          </>
        ) : (
          <>
            <Facebook className="w-20 h-20 text-blue-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Conectar Facebook Ads</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Conecte para ver campanhas, leads em tempo real e distribuir automaticamente para sua equipe
            </p>
            <button
              onClick={handleFacebookLogin}
              disabled={loading}
              className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl flex items-center gap-3 mx-auto transition shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <> <Loader2 className="w-6 h-6 animate-spin" /> Conectando... </>
              ) : (
                <> <Facebook className="w-7 h-7" /> Conectar com Facebook </>
              )}
            </button>

            {!connection.isConnected && pendingConnection && adAccounts.length > 0 && (
              <div className="mt-8 text-left bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                  <div>
                    <p className="text-gray-900 dark:text-white font-semibold">Selecione a conta de anúncios</p>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                      Encontramos {adAccounts.length} contas ativas em <span className="font-semibold">{pendingConnection.pageName}</span>.
                      Escolha qual deseja conectar.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {adAccounts.map((account) => (
                    <label
                      key={account.id}
                      className={`flex items-center justify-between border rounded-lg px-4 py-3 cursor-pointer transition ${selectedAdAccountId === account.id
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-900 dark:text-white'
                          : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 hover:border-gray-300 dark:hover:border-white/30 bg-white dark:bg-transparent'
                        }`}
                    >
                      <div>
                        <p className="font-semibold">{account.name}</p>
                        <p className="text-xs text-gray-500 dark:text-white/60">{account.id}</p>
                      </div>
                      <input
                        type="radio"
                        name="adAccount"
                        className="form-radio text-cyan-500 focus:ring-cyan-500"
                        checked={selectedAdAccountId === account.id}
                        onChange={() => setSelectedAdAccountId(account.id)}
                      />
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleAccountSelection}
                  disabled={connectingAccount || !selectedAdAccountId}
                  className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition disabled:opacity-60 shadow-md"
                >
                  {connectingAccount ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando conexão...
                    </span>
                  ) : (
                    'Usar conta selecionada'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConexaoMeta;
