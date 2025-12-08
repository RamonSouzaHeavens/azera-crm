import React, { useState, useEffect, useCallback } from 'react';
import { Users, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Vendedor {
  id: string; // membership id
  user_id: string; // user id for assignment
  nome: string;
  email: string;
  receive_meta_leads: boolean;
  last_meta_lead_received_at: string | null;
}

const DistribuicaoMetaLeads: React.FC = () => {
  const { member } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  // Verificar permissões
  const canManage = ['owner', 'admin', 'administrador'].includes(member?.role || '');

  // Carregar configurações e vendedores
  const loadData = useCallback(async () => {
    if (!member?.tenant_id) return;

    setLoading(true);
    try {
      // Carregar configuração do tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('meta_leads_distribution_enabled')
        .eq('id', member.tenant_id)
        .single();

      if (tenantError) throw tenantError;
      setEnabled(tenantData?.meta_leads_distribution_enabled || false);

      // Carregar vendedores (memberships + profiles)
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('memberships')
        .select('id, user_id, receive_meta_leads, last_meta_lead_received_at')
        .eq('tenant_id', member.tenant_id)
        .eq('role', 'vendedor')
        .eq('active', true);

      if (membershipsError) throw membershipsError;

      if (membershipsData && membershipsData.length > 0) {
        // Buscar perfis dos usuários
        const userIds = membershipsData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, display_name')
          .in('id', userIds);

        // Combinar dados
        const vendedores = membershipsData.map(membership => {
          const profile = profilesData?.find(p => p.id === membership.user_id);
          return {
            id: membership.id,
            user_id: membership.user_id,
            nome: profile?.full_name || profile?.display_name || 'Usuário',
            email: '', // Não temos email na memberships, deixar vazio por enquanto
            receive_meta_leads: membership.receive_meta_leads || false,
            last_meta_lead_received_at: membership.last_meta_lead_received_at
          };
        });

        setVendedores(vendedores);
      } else {
        setVendedores([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [member?.tenant_id]);

  // Salvar configurações
  const saveSettings = async () => {
    if (!member?.tenant_id) return;

    setSaving(true);
    try {
      // Atualizar tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ meta_leads_distribution_enabled: enabled })
        .eq('id', member.tenant_id);

      if (tenantError) throw tenantError;

      // Atualizar vendedores
      for (const vendedor of vendedores) {
        const { error: memberError } = await supabase
          .from('memberships')
          .update({ receive_meta_leads: vendedor.receive_meta_leads })
          .eq('id', vendedor.id);

        if (memberError) throw memberError;
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Toggle vendedor
  const toggleVendedor = (id: string) => {
    setVendedores(prev =>
      prev.map(v =>
        v.id === id ? { ...v, receive_meta_leads: !v.receive_meta_leads } : v
      )
    );
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!canManage) {
    return (
      <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 shadow-sm dark:shadow-none">
        <div className="text-center text-gray-500 dark:text-slate-400">
          Você não tem permissão para acessar esta funcionalidade.
        </div>
      </div>
    );
  }

  const vendedoresAtivos = vendedores.filter(v => v.receive_meta_leads).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Distribuição Automática de Leads do Facebook
          </h2>
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-sm">
          Configure como os leads vindos do Facebook serão distribuídos automaticamente para os membros da equipe.
        </p>
      </div>

      {/* Toggle Principal */}
      <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ativar distribuição automática
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              Quando ativado, novos leads do Facebook serão atribuídos automaticamente aos vendedores disponíveis.
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-slate-600'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        {!enabled && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">
                A distribuição está desativada. Leads do Facebook ficarão sem responsável.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Configurações quando ativado */}
      {enabled && (
        <div className="rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Vendedores Disponíveis
          </h3>

          {/* Estatísticas */}
          <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-transparent">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-slate-300">
                {vendedoresAtivos} vendedor{vendedoresAtivos !== 1 ? 'es' : ''} na fila de distribuição
              </span>
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Distribuição round-robin</span>
              </div>
            </div>
          </div>

          {/* Lista de vendedores */}
          <div className="space-y-3">
            {vendedores.map((vendedor) => (
              <div
                key={vendedor.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/30 rounded-lg border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={vendedor.receive_meta_leads}
                    onChange={() => toggleVendedor(vendedor.id)}
                    className="w-4 h-4 text-cyan-500 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">{vendedor.nome}</p>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">{vendedor.email}</p>
                  </div>
                </div>
                {vendedor.last_meta_lead_received_at && (
                  <div className="text-right">
                    <p className="text-gray-400 dark:text-slate-400 text-xs">Último lead</p>
                    <p className="text-gray-700 dark:text-slate-300 text-sm">
                      {new Date(vendedor.last_meta_lead_received_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {vendedores.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                Nenhum vendedor ativo encontrado na equipe.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
};

export default DistribuicaoMetaLeads;
