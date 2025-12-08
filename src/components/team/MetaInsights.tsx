import React, { useState, useEffect } from 'react';
import { BarChart3, DollarSign, Users, RefreshCw, Facebook, Calendar, Target, Eye, MousePointerClick } from 'lucide-react';
import { useMetaConnection } from '../../hooks/useMetaConnection';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  form_name: string;
  page_name: string;
  created_at: string;
  assigned_to_name?: string;
  meta_auto_assigned?: boolean;
}

interface Permission {
  permission: string;
  status: string;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time: string;
  updated_time: string;
}

interface Campaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  objective: string;
  daily_budget?: number;
  lifetime_budget?: number;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cost_per_conversion: number;
  created_time: string;
  updated_time: string;
}

const MetaInsights: React.FC = () => {
  const { connection } = useMetaConnection();
  const { member } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    last7Days: 0
  });
  const [campaignStats, setCampaignStats] = useState({
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    activeCampaigns: 0
  });

  // Dados fictícios para o gráfico (últimos 15 dias) - REMOVIDO PARA VERSÃO MINIMALISTA

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

  const formatNumber = (value: number) =>
    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString('pt-BR');

  const formatPercentage = (value: number) => `${Number(value || 0).toFixed(2)}%`;

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  };

  const fetchLeads = async () => {
    if (!connection.isConnected) return;

    setLoading(true);
    try {
      // Buscar leads do tenant atual (simulando leads do Facebook)
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, email, created_at, assigned_to_name, meta_auto_assigned')
        .eq('tenant_id', member?.tenant_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transformar dados para o formato esperado
      const transformedLeads = (data || []).map((lead) => ({
        id: lead.id,
        name: lead.nome,
        phone: lead.telefone,
        email: lead.email,
        form_name: 'Formulário Facebook', // Placeholder
        page_name: connection.pageName || 'Página Facebook',
        created_at: lead.created_at,
        assigned_to_name: lead.assigned_to_name,
        meta_auto_assigned: lead.meta_auto_assigned
      }));

      setLeads(transformedLeads);

      // Calcular estatísticas
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const total = transformedLeads.length;
      const todayCount = transformedLeads.filter((lead: Lead) =>
        new Date(lead.created_at) >= today
      ).length;
      const last7DaysCount = transformedLeads.filter((lead: Lead) =>
        new Date(lead.created_at) >= sevenDaysAgo
      ).length;

      setStats({ total, today: todayCount, last7Days: last7DaysCount });
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      toast.error('Erro ao carregar dados dos anúncios');
    } finally {
      setLoading(false);
    }
  };

  const checkTokenValidity = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id&access_token=${token}`
      );
      const isValid = response.ok;
      setTokenExpired(!isValid);
      return isValid;
    } catch (error) {
      setTokenExpired(true);
      return false;
    }
  };

  const fetchCampaigns = async () => {
    if (!connection.isConnected || !connection.userAccessToken) return;

    // Verificar se o token ainda é válido
    const isTokenValid = await checkTokenValidity(connection.userAccessToken);
    if (!isTokenValid) {
      toast.error('Token do Facebook expirado. Reconecte sua conta do Facebook.');
      return;
    }

    setLoadingCampaigns(true);
    try {
      // Verificar permissões do token primeiro
      const permissionsResponse = await fetch(
        `https://graph.facebook.com/v20.0/me/permissions?access_token=${connection.userAccessToken}`
      );

      if (!permissionsResponse.ok) {
        console.error('Erro ao verificar permissões:', permissionsResponse.status);
        if (permissionsResponse.status === 400) {
          toast.error('Token do Facebook expirado ou inválido. Reconecte sua conta do Facebook.');
        } else {
          toast.error('Erro ao verificar permissões do Facebook. Tente novamente.');
        }
        return;
      }

      const permissionsData = await permissionsResponse.json();
      const hasAdsPermission = permissionsData.data?.some((p: Permission) =>
        (p.permission === 'ads_read' || p.permission === 'ads_management') && p.status === 'granted'
      );

      if (!hasAdsPermission) {
        toast.error('Sua conta do Facebook não tem permissão para acessar anúncios. Verifique as permissões no Facebook Business Manager.');
        return;
      }

      // Verificar se temos adAccountId salvo
      if (!connection.adAccountId) {
        toast.error('Conta de anúncios não configurada. Reconecte sua conta do Facebook na aba Conexão Meta.');
        return;
      }

      const adAccountId = connection.adAccountId; // Usar o ID salvo na conexão

      const tokenToUse = connection.userAccessToken; // Token do usuário tem permissões de ads_management

      // Debug: verificar token e permissões
      console.log('🔍 Tentando buscar campanhas...');
      console.log('📋 Ad Account ID:', adAccountId);
      console.log('🔑 Token usado:', tokenToUse?.substring(0, 20) + '...');

      // Verificar permissões do token ANTES de buscar campanhas
      const debugPermissionsRes = await fetch(
        `https://graph.facebook.com/v20.0/me/permissions?access_token=${tokenToUse}`
      );
      const debugPermissions = await debugPermissionsRes.json();
      console.log('✅ Permissões do token:', debugPermissions.data?.map((p: Permission) => `${p.permission}:${p.status}`));

      // Antes de buscar campanhas, verificar acesso à Ad Account
      const adAccountCheckRes = await fetch(
        `https://graph.facebook.com/v20.0/${adAccountId}?fields=id,name,account_status&access_token=${tokenToUse}`
      );

      if (!adAccountCheckRes.ok) {
        const errorData = await adAccountCheckRes.json();
        console.error('❌ Sem acesso à Ad Account:', errorData);
        toast.error('Você não tem permissão para acessar esta Conta de Anúncios. Verifique suas permissões no Facebook Business Manager.');
        return;
      }

      const adAccountData = await adAccountCheckRes.json();
      console.log('✅ Ad Account acessível:', adAccountData);

      // Usar apenas campos básicos primeiro para testar
      const campaignsResponse = await fetch(
        `https://graph.facebook.com/v20.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time&access_token=${tokenToUse}&limit=50`
      );

      console.log('📊 Status da resposta:', campaignsResponse.status);

      if (!campaignsResponse.ok) {
        const errorText = await campaignsResponse.text();
        console.error('❌ Erro detalhado:', errorText);

        try {
          const errorData = JSON.parse(errorText);
          console.error('❌ Erro JSON:', errorData);

          // Mensagem específica baseada no erro
          if (errorData.error?.code === 190) {
            toast.error('Token expirado ou inválido. Reconecte sua conta do Facebook.');
          } else if (errorData.error?.code === 100) {
            toast.error('Sua conta não tem permissão para acessar esta Conta de Anúncios. Verifique suas permissões no Business Manager.');
          } else {
            toast.error(`Erro do Facebook: ${errorData.error?.message || 'Erro desconhecido'}`);
          }
        } catch {
          toast.error('Erro ao buscar campanhas. Verifique o console para detalhes.');
        }
        return;
      }

      const campaignsData = await campaignsResponse.json();

      if (campaignsData.data) {
        // Buscar insights para cada campanha
        const campaignsWithInsights = await Promise.all(
          campaignsData.data.map(async (campaign: CampaignData) => {
            try {
              const insightsResponse = await fetch(
                `https://graph.facebook.com/v20.0/${campaign.id}/insights?fields=spend,impressions,clicks,reach,frequency,ctr,cpc,cpm,conversions,cost_per_conversion&date_preset=last_7d&access_token=${tokenToUse}`
              );

              let insights = {
                spend: 0,
                impressions: 0,
                clicks: 0,
                reach: 0,
                frequency: 0,
                ctr: 0,
                cpc: 0,
                cpm: 0,
                conversions: 0,
                cost_per_conversion: 0
              };

              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();
                if (insightsData.data && insightsData.data.length > 0) {
                  const insight = insightsData.data[0];
                  insights = {
                    spend: parseFloat(insight.spend || '0'),
                    impressions: parseInt(insight.impressions || '0'),
                    clicks: parseInt(insight.clicks || '0'),
                    reach: parseInt(insight.reach || '0'),
                    frequency: parseFloat(insight.frequency || '0'),
                    ctr: parseFloat(insight.ctr || '0'),
                    cpc: parseFloat(insight.cpc || '0'),
                    cpm: parseFloat(insight.cpm || '0'),
                    conversions: parseInt(insight.conversions || '0'),
                    cost_per_conversion: parseFloat(insight.cost_per_conversion || '0')
                  };
                }
              } else {
                console.warn(`Não foi possível obter insights para a campanha ${campaign.id}`);
              }

              return {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : undefined,
                lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : undefined,
                spend: insights.spend,
                impressions: insights.impressions,
                clicks: insights.clicks,
                reach: insights.reach,
                frequency: insights.frequency,
                ctr: insights.ctr,
                cpc: insights.cpc,
                cpm: insights.cpm,
                conversions: insights.conversions,
                cost_per_conversion: insights.cost_per_conversion,
                created_time: campaign.created_time,
                updated_time: campaign.updated_time
              };
            } catch (error) {
              console.error(`Erro ao buscar insights da campanha ${campaign.id}:`, error);
              // Retornar campanha com dados vazios em caso de erro
              return {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : undefined,
                lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : undefined,
                spend: 0,
                impressions: 0,
                clicks: 0,
                reach: 0,
                frequency: 0,
                ctr: 0,
                cpc: 0,
                cpm: 0,
                conversions: 0,
                cost_per_conversion: 0,
                created_time: campaign.created_time,
                updated_time: campaign.updated_time
              };
            }
          })
        );

        setCampaigns(campaignsWithInsights);
        setSelectedCampaignId((prev) => {
          if (prev && campaignsWithInsights.some((c) => c.id === prev)) {
            return prev;
          }
          return campaignsWithInsights[0]?.id ?? null;
        });

        // Calcular estatísticas das campanhas
        const totalSpend = campaignsWithInsights.reduce((sum, c) => sum + c.spend, 0);
        const totalImpressions = campaignsWithInsights.reduce((sum, c) => sum + c.impressions, 0);
        const totalClicks = campaignsWithInsights.reduce((sum, c) => sum + c.clicks, 0);
        const totalConversions = campaignsWithInsights.reduce((sum, c) => sum + c.conversions, 0);
        const activeCampaigns = campaignsWithInsights.filter(c => c.status === 'ACTIVE').length;

        setCampaignStats({
          totalSpend,
          totalImpressions,
          totalClicks,
          totalConversions,
          activeCampaigns
        });
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
        } else {
          toast.error('Erro ao carregar dados das campanhas. Verifique suas permissões do Facebook.');
        }
      } else {
        toast.error('Erro desconhecido ao carregar campanhas.');
      }
    } finally {
      setLoadingCampaigns(false);
    }
  };



  useEffect(() => {
    if (connection.isConnected) {
      fetchLeads();
      fetchCampaigns();
    }
  }, [connection.isConnected]);

  if (!connection.isConnected) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-8 text-center shadow-sm dark:shadow-none">
          <Facebook className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Conecte sua conta do Facebook Ads
          </h3>
          <p className="text-gray-500 dark:text-slate-400 mb-6">
            Você ainda não conectou sua conta do Facebook Ads. Vá até a aba "Conexão Meta" para conectar e visualizar seus dados.
          </p>
          <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg">
            Ir para Conexão Meta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Facebook Ads
          </h2>
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {tokenExpired && (
          <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">Token expirado</p>
                <p className="text-red-500 dark:text-red-300 text-xs">Reconecte sua conta do Facebook</p>
              </div>
              <button
                onClick={() => window.location.href = '/minha-equipe?tab=conexao-meta'}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm ml-3"
              >
                Reconectar
              </button>
            </div>
          </div>
        )}

        {/* Cards de métricas compactos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Leads</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Hoje</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.today}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">7 dias</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.last7Days}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
            <div className="flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-slate-400">Página</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{connection.pageName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leads recentes - tabela simplificada */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Leads Recentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-slate-400">Data</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-slate-400">Nome</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-slate-400">Contato</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="py-2 px-3 text-gray-600 dark:text-slate-400 text-xs">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 text-gray-900 dark:text-white font-medium text-sm">{lead.name}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-slate-400 text-sm">
                      {lead.phone || lead.email || '-'}
                    </td>
                    <td className="py-2 px-3">
                      {lead.assigned_to_name ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Atribuído
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200">
                          Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                      Nenhum lead encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Seção de Campanhas - mais compacta */}
      <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Campanhas ({campaignStats.activeCampaigns} ativas)
          </h3>
        </div>

        {/* Cards de Estatísticas das Campanhas - mais compactos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Gasto</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  R$ {campaignStats.totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Impressões</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {(campaignStats.totalImpressions / 1000).toFixed(1)}k
                </p>
              </div>
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Cliques</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {campaignStats.totalClicks.toLocaleString('pt-BR')}
                </p>
              </div>
              <MousePointerClick className="w-5 h-5 text-purple-500" />
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Conversões</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {campaignStats.totalConversions}
                </p>
              </div>
              <Target className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Lista completa de campanhas com detalhes estilo dashboard */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-2/3 overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-slate-400 w-1/5">Campanha</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-slate-400">Impressões</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-slate-400">Cliques</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-slate-400 hidden md:table-cell">Conversões</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-slate-400 hidden lg:table-cell">CTR</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-slate-400 hidden lg:table-cell">CPC</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-slate-400 hidden xl:table-cell">CPM</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-slate-400">Gasto</th>
                </tr>
              </thead>
              <tbody>
                {loadingCampaigns ? (
                  <tr>
                    <td colSpan={9} className="py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-500 dark:text-slate-400">Carregando campanhas...</span>
                      </div>
                    </td>
                  </tr>
                ) : campaigns.length > 0 ? (
                  campaigns.map((campaign) => {
                    const isSelected = selectedCampaignId === campaign.id;
                    const statusLabel =
                      campaign.status === 'ACTIVE'
                        ? 'Ativa'
                        : campaign.status === 'PAUSED'
                          ? 'Pausada'
                          : campaign.status;

                    return (
                      <tr
                        key={campaign.id}
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        className={`border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-white/10' : ''}`}
                      >
                        <td className="py-2 px-3">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{campaign.name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                            {campaign.objective || 'Objetivo não informado'}
                          </p>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ${campaign.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200'
                              : campaign.status === 'PAUSED'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-slate-700/50 dark:text-slate-200'
                              }`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                          {formatNumber(campaign.impressions)}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                          {campaign.clicks.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600 dark:text-slate-300 hidden md:table-cell">
                          {campaign.conversions.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600 dark:text-slate-300 hidden lg:table-cell">
                          {formatPercentage(campaign.ctr)}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600 dark:text-slate-300 hidden lg:table-cell">
                          {campaign.cpc ? formatCurrency(campaign.cpc).replace('R$', '').trim() : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600 dark:text-slate-300 hidden xl:table-cell">
                          {campaign.cpm ? formatCurrency(campaign.cpm).replace('R$', '').trim() : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(campaign.spend)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                      Nenhuma campanha encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:w-1/3">
            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 h-full">
              {selectedCampaignId ? (
                (() => {
                  const campaign = campaigns.find((c) => c.id === selectedCampaignId);
                  if (!campaign) {
                    return (
                      <div className="text-sm text-gray-500 dark:text-slate-400">
                        Selecione uma campanha para ver os detalhes.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Campanha selecionada</p>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.name}</h4>
                        <p className="text-xs text-gray-400 dark:text-slate-400">{campaign.objective || 'Objetivo não informado'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-md bg-white dark:bg-slate-900/30 border border-gray-200 dark:border-white/5 p-3 shadow-sm dark:shadow-none">
                          <p className="text-gray-500 dark:text-slate-400">Gasto</p>
                          <p className="text-gray-900 dark:text-white text-base font-semibold">{formatCurrency(campaign.spend)}</p>
                        </div>
                        <div className="rounded-md bg-white dark:bg-slate-900/30 border border-gray-200 dark:border-white/5 p-3 shadow-sm dark:shadow-none">
                          <p className="text-gray-500 dark:text-slate-400">Impressões</p>
                          <p className="text-gray-900 dark:text-white text-base font-semibold">{campaign.impressions.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-md bg-white dark:bg-slate-900/30 border border-gray-200 dark:border-white/5 p-3 shadow-sm dark:shadow-none">
                          <p className="text-gray-500 dark:text-slate-400">Cliques</p>
                          <p className="text-gray-900 dark:text-white text-base font-semibold">{campaign.clicks.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-md bg-white dark:bg-slate-900/30 border border-gray-200 dark:border-white/5 p-3 shadow-sm dark:shadow-none">
                          <p className="text-gray-500 dark:text-slate-400">Conversões</p>
                          <p className="text-gray-900 dark:text-white text-base font-semibold">{campaign.conversions.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">CTR</p>
                          <p className="text-gray-900 dark:text-white font-semibold">{formatPercentage(campaign.ctr)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Frequência</p>
                          <p className="text-gray-900 dark:text-white font-semibold">{campaign.frequency?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">CPC</p>
                          <p className="text-gray-900 dark:text-white font-semibold">{campaign.cpc ? formatCurrency(campaign.cpc) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">CPM</p>
                          <p className="text-gray-900 dark:text-white font-semibold">{campaign.cpm ? formatCurrency(campaign.cpm) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Custo por Conversão</p>
                          <p className="text-gray-900 dark:text-white font-semibold">
                            {campaign.cost_per_conversion ? formatCurrency(campaign.cost_per_conversion) : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-md bg-white dark:bg-slate-900/30 border border-gray-200 dark:border-white/5 p-3 text-xs space-y-1 shadow-sm dark:shadow-none">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-slate-400">Status</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{campaign.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-slate-400">Orçamento diário</span>
                          <span className="text-gray-900 dark:text-white font-semibold">
                            {campaign.daily_budget ? formatCurrency(campaign.daily_budget / 100) : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-slate-400">Orçamento vitalício</span>
                          <span className="text-gray-900 dark:text-white font-semibold">
                            {campaign.lifetime_budget ? formatCurrency(campaign.lifetime_budget / 100) : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-slate-400">Criada em</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{formatDate(campaign.created_time)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-slate-400">Atualizada em</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{formatDate(campaign.updated_time)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  Nenhuma campanha carregada ainda. Conecte-se ou atualize os dados.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetaInsights;
