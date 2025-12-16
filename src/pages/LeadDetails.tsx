import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { LeadTimeline } from '../components/team/LeadTimeline';
// Certifique-se de que o arquivo existe em src/components/team/LeadAttachments.tsx
import { LeadAttachments } from '../components/team/LeadAttachments';
import { LeadCustomFields } from '../components/team/LeadCustomFields';
import { AddActivityModal } from '../components/team/AddActivityModal';
import { Plus, Edit3, Save, X, ChevronDown } from 'lucide-react';
import { getTeamOverview } from '../services/equipeService';
import toast from 'react-hot-toast';

interface Lead {
  id: string;
  tenant_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  notas: string | null;
  valor_potencial: number | null;
  campanha_id: string | null;
  compartilhado_equipe: boolean;
  proprietario_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  origem_id?: string | null;
  motivo_perda_id?: string | null;
  campo_personalizado_id?: string | null;
}

interface LeadOrigin {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface LeadLossReason {
  id: string;
  tenant_id: string;
  category: string;
  reason: string;
  is_active: boolean;
}

const LeadDetails: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { tenant, user } = useAuthStore();
  const { t } = useTranslation();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const [timelineKey, setTimelineKey] = useState(0);
  const [modalAddActivity, setModalAddActivity] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});

  // Estados para modais de adicionar opções
  const [modalAddOpen, setModalAddOpen] = useState(false);
  const [modalAddType, setModalAddType] = useState<'origem' | 'motivo_perda' | 'campo_personalizado' | null>(null);
  const [modalAddValue, setModalAddValue] = useState('');
  const [origins, setOrigins] = useState<LeadOrigin[]>([]);
  const [lossReasons, setLossReasons] = useState<LeadLossReason[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string, name: string }[]>([]);

  // Funções para adicionar opções
  const handleConfirmAdd = async () => {
    if (!modalAddValue.trim() || !tenant || !modalAddType) return;

    try {
      if (modalAddType === 'origem') {
        const { data, error } = await supabase
          .from('lead_origins')
          .insert({
            tenant_id: tenant.id,
            name: modalAddValue.trim(),
            type: 'manual'
          })
          .select()
          .single();

        if (error) throw error;
        setOrigins(prev => [...prev, data]);
      } else if (modalAddType === 'motivo_perda') {
        const { data, error } = await supabase
          .from('lead_loss_reasons')
          .insert({
            tenant_id: tenant.id,
            category: 'Outros',
            reason: modalAddValue.trim()
          })
          .select()
          .single();

        if (error) throw error;
        setLossReasons(prev => [...prev, data]);
      } else if (modalAddType === 'campo_personalizado') {
        const { error } = await supabase
          .from('lead_custom_fields')
          .insert({
            tenant_id: tenant.id,
            field_name: modalAddValue.trim(),
            field_type: 'text'
          });

        if (error) throw error;
        // O componente LeadCustomFields irá recarregar automaticamente
      }

      setModalAddOpen(false);
      setModalAddValue('');
      setModalAddType(null);
    } catch (error) {
      console.error('Erro ao adicionar opção:', error);
      alert(t('leadDetails.addOptionError'));
    }
  };

  const startEditing = () => {
    if (!lead) return;
    setEditedLead({
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      notas: lead.notas,
      valor_potencial: lead.valor_potencial,
      status: lead.status,
      compartilhado_equipe: lead.compartilhado_equipe,
      proprietario_id: lead.proprietario_id
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedLead({});
    setIsEditing(false);
  };

  const saveLeadChanges = async () => {
    if (!lead || !tenant) return;

    setSavingLead(true);

    // Dados que serão enviados para atualização
    const updateData = {
      nome: editedLead.nome,
      email: editedLead.email,
      telefone: editedLead.telefone,
      notas: editedLead.notas,
      valor_potencial: editedLead.valor_potencial,
      status: editedLead.status,
      compartilhado_equipe: editedLead.compartilhado_equipe,
      proprietario_id: editedLead.proprietario_id || null,
      updated_at: new Date().toISOString()
    };

    console.log('[DEBUG saveLeadChanges] Lead ID:', lead.id);
    console.log('[DEBUG saveLeadChanges] Tenant ID:', tenant.id);
    console.log('[DEBUG saveLeadChanges] Update Data:', JSON.stringify(updateData, null, 2));
    console.log('[DEBUG saveLeadChanges] proprietario_id type:', typeof updateData.proprietario_id, 'value:', updateData.proprietario_id);

    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', lead.id)
        .eq('tenant_id', tenant.id)
        .select();

      console.log('[DEBUG saveLeadChanges] Supabase response - data:', data);
      console.log('[DEBUG saveLeadChanges] Supabase response - error:', error);

      if (error) {
        console.error('[DEBUG saveLeadChanges] Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // Atualizar o lead local
      setLead(prev => prev ? { ...prev, ...editedLead, updated_at: new Date().toISOString() } : null);
      setIsEditing(false);
      setEditedLead({});
      toast.success('Alterações salvas com sucesso!');
    } catch (error: any) {
      console.error('[DEBUG saveLeadChanges] Caught error:', error);
      console.error('[DEBUG saveLeadChanges] Error stringify:', JSON.stringify(error, null, 2));
      toast.error(error?.message || t('leadDetails.saveChangesError'));
    } finally {
      setSavingLead(false);
    }
  };

  const handleOrigemChange = async (value: string) => {
    if (!lead || !tenant) return;
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ origem_id: value || null, updated_at: new Date().toISOString() })
        .eq('id', lead.id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      setLead(prev => prev ? { ...prev, origem_id: value || null, updated_at: new Date().toISOString() } : null);
    } catch (error) {
      console.error('Erro ao atualizar origem:', error);
      alert(t('leadDetails.updateOriginError'));
    }
  };

  const handleMotivoPerdaChange = async (value: string) => {
    if (!lead || !tenant) return;
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ motivo_perda_id: value || null, updated_at: new Date().toISOString() })
        .eq('id', lead.id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      setLead(prev => prev ? { ...prev, motivo_perda_id: value || null, updated_at: new Date().toISOString() } : null);
    } catch (error) {
      console.error('Erro ao atualizar motivo de perda:', error);
      alert(t('leadDetails.updateLossReasonError'));
    }
  };



  useEffect(() => {
    const fetchLead = async () => {
      if (!leadId || !tenant) {
        console.warn('[LeadDetails] Tenant não disponível, tentando novamente em 1s...');
        // Tentar novamente em 1 segundo se tenant não estiver disponível
        setTimeout(() => {
          if (tenant) {
            fetchLead();
          } else {
            console.error('[LeadDetails] Tenant ainda não disponível após retry');
            setLoading(false);
          }
        }, 1000);
        return;
      }

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', leadId)
        .eq('tenant_id', tenant.id)
        .single();

      if (error) {
        console.error('[LeadDetails] Erro ao carregar lead:', error);
      } else {
        setLead(data);
      }
      setLoading(false);
    };

    fetchLead();
  }, [leadId, tenant]);

  // Carregar opções disponíveis
  useEffect(() => {
    const fetchOptions = async () => {
      if (!tenant) return;

      try {
        // Garantir opções padrão
        await supabase.rpc('ensure_default_lead_options', { p_tenant_id: tenant.id });

        // Carregar origens
        const { data: originsData, error: originsError } = await supabase
          .from('lead_origins')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('name');

        if (originsError) throw originsError;
        setOrigins(originsData || []);

        // Carregar motivos de perda
        const { data: lossReasonsData, error: lossReasonsError } = await supabase
          .from('lead_loss_reasons')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('category, reason');

        if (lossReasonsError) throw lossReasonsError;
        setLossReasons(lossReasonsData || []);

        // Carregar campos personalizados
        // O componente LeadCustomFields gerencia isso internamente
      } catch (error) {
        console.error('Erro ao carregar opções:', error);
      }
    };

    fetchOptions();

    // Carregar membros da equipe
    const loadTeamMembers = async () => {
      if (!tenant?.id) return
      try {
        const overview = await getTeamOverview()

        if (overview?.members && overview.members.length > 0) {
          const team = overview.members.map((m: any) => ({
            id: m.user_id || m.id,
            name: m.nome || m.email || 'Usuário',
          }))
          setTeamMembers(team)
        } else if (user?.id) {
          // Fallback: usuário atual
          setTeamMembers([{ id: user.id, name: user.email || 'Você' }])
        }
      } catch (err) {
        console.error('[ERROR] loadTeamMembers:', err)
        // Fallback em caso de erro
        if (user?.id) {
          setTeamMembers([{ id: user.id, name: user.email || 'Você' }])
        }
      }
    }
    loadTeamMembers()
  }, [tenant]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        {/* Spinner animado */}
        <div className="relative flex justify-center">
          <div className="w-16 h-16 border-4 border-slate-300 dark:border-slate-600 rounded-full animate-spin border-t-slate-600 dark:border-t-slate-400"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-slate-500 dark:border-t-slate-500 opacity-20"></div>
        </div>

        {/* Texto com fade */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 animate-pulse">
            {t('leadDetails.loadingTitle')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse delay-100">
            {t('leadDetails.loadingSubtitle')}
          </p>
        </div>

        {/* Pontos animados */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );

  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('leadDetails.sessionErrorTitle')}</h3>
          <p className="text-slate-600 dark:text-slate-400">{t('leadDetails.sessionErrorDescription')}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            {t('leadDetails.reloadPage')}
          </button>
        </div>
      </div>
    );
  }

  if (!lead) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('leadDetails.notFoundTitle')}</h3>
        <p className="text-slate-600 dark:text-slate-400">{t('leadDetails.notFoundDescription')}</p>
        <button
          onClick={() => navigate('/app/clientes')}
          className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          {t('leadDetails.backToLeads')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-full p-6 bg-white dark:bg-[#0C1326] text-slate-900 dark:text-slate-200 flex flex-col">
      {/* HUD glow grid background + overlay (mesma do Leads) */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.06),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.06),transparent_45%)]" />

      <main className="relative flex-1 w-full px-3.5 sm:px-4 py-3.5 sm:py-6 overflow-y-auto">
        <div className="w-full sm:max-w-7xl sm:mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{lead.nome}</h1>
            <button
              onClick={() => navigate('/app/clientes')}
              className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all font-medium text-sm"
            >
              {t('leadDetails.back')}
            </button>
          </div>

          <div className="rounded-lg p-5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('leadDetails.informationTitle')}</h2>
              {!isEditing ? (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg transition-all text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  {t('leadDetails.edit')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={saveLeadChanges}
                    disabled={savingLead}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all text-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingLead ? t('leadDetails.saving') : t('leadDetails.save')}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-sm"
                  >
                    <X className="w-4 h-4" />
                    {t('leadDetails.cancel')}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ID do Lead para automações */}
              <div className="md:col-span-2 mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('leadDetails.leadIdLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-mono text-sm">
                    {lead.id}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lead.id)
                      // Toast opcional se disponível
                    }}
                    className="px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-sm transition-all"
                    title={t('leadDetails.copyId')}
                  >
                    {t('leadDetails.copy')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('leadDetails.nameLabel')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedLead.nome || ''}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">{lead.nome}</p>
                )}
              </div>



              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.owner', 'Responsável')}
                </label>
                {isEditing ? (
                  <select
                    value={editedLead.proprietario_id || ''}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, proprietario_id: e.target.value || null }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  >
                    <option value="">Sem responsável</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">
                    {teamMembers.find(m => m.id === lead.proprietario_id)?.name || 'Sem responsável'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('leadDetails.emailLabel')}
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedLead.email || ''}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">{lead.email || 'Não informado'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('leadDetails.phoneLabel')}
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedLead.telefone || ''}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, telefone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">{lead.telefone || 'Não informado'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('leadDetails.statusLabel')}
                </label>
                {isEditing ? (
                  <select
                    value={editedLead.status || ''}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  >
                    <option value="novo">Novo</option>
                    <option value="contatado">Contatado</option>
                    <option value="qualificado">Qualificado</option>
                    <option value="proposta">Proposta</option>
                    <option value="negociacao">Negociação</option>
                    <option value="fechado">Fechado</option>
                    <option value="perdido">Perdido</option>
                  </select>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">{lead.status}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('leadDetails.potentialValueLabel')}
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedLead.valor_potencial || ''}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, valor_potencial: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">{lead.valor_potencial ? `R$ ${lead.valor_potencial.toLocaleString('pt-BR')}` : 'Não informado'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('leadDetails.sharedWithTeamLabel')}
                </label>
                {isEditing ? (
                  <select
                    value={editedLead.compartilhado_equipe ? 'true' : 'false'}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, compartilhado_equipe: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">{lead.compartilhado_equipe ? 'Sim' : 'Não'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('leadDetails.createdAtLabel')}
                </label>
                <p className="text-slate-600 dark:text-slate-400">{new Date(lead.created_at).toLocaleString('pt-BR')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('leadDetails.updatedAtLabel')}
                </label>
                <p className="text-slate-600 dark:text-slate-400">{new Date(lead.updated_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Campos personalizados */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('leadDetails.customFieldsTitle')}</h3>
              <LeadCustomFields leadId={lead.id} />
            </div>

            {/* Campos adicionais */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('leadDetails.leadOrigin')}</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={lead.origem_id || ''}
                        onChange={(e) => handleOrigemChange(e.target.value)}
                        className="w-full px-3 py-2 pr-8 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 appearance-none hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                      >
                        <option value="">{t('leadDetails.selectPlaceholder')}</option>
                        {origins.map((origin) => (
                          <option key={origin.id} value={origin.id}>{origin.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModalAddType('origem');
                        setModalAddValue('');
                        setModalAddOpen(true);
                      }}
                      className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 rounded-lg flex items-center justify-center transition-all"
                      title={t('leadDetails.addOrigin')}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('leadDetails.lossReason')}</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={lead.motivo_perda_id || ''}
                        onChange={(e) => handleMotivoPerdaChange(e.target.value)}
                        className="w-full px-3 py-2 pr-8 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 appearance-none hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                      >
                        <option value="">{t('leadDetails.selectPlaceholder')}</option>
                        {lossReasons.map((reason) => (
                          <option key={reason.id} value={reason.id}>{reason.category}: {reason.reason}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModalAddType('motivo_perda');
                        setModalAddValue('');
                        setModalAddOpen(true);
                      }}
                      className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 rounded-lg flex items-center justify-center transition-all"
                      title={t('leadDetails.addLossReason')}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas</label>
              {isEditing ? (
                <textarea
                  value={editedLead.notas || ''}
                  onChange={(e) => setEditedLead(prev => ({ ...prev, notas: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
                  placeholder="Adicione notas sobre o lead..."
                />
              ) : (
                lead.notas ? (
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{lead.notas}</p>
                ) : (
                  <p className="text-slate-500 dark:text-slate-500 italic">Nenhuma nota adicionada</p>
                )
              )}
            </div>
          </div>

          <div className="rounded-lg p-5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('leadDetails.timelineTitle')}</h2>
              <button
                onClick={() => setModalAddActivity(true)}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 rounded-lg transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                {t('leadDetails.addActivity')}
              </button>
            </div>



            <LeadTimeline leadId={lead.id} key={timelineKey} />
          </div>

          <div className="rounded-lg p-5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Anexos</h2>
            <LeadAttachments leadId={lead.id} />
          </div>
        </div>
      </main>

      {/* Modal para adicionar atividade */}
      <AddActivityModal
        isOpen={modalAddActivity}
        onClose={() => setModalAddActivity(false)}
        leadId={lead.id}
        tenantId={tenant.id}
        userId={user?.id || ''}
        onSuccess={() => setTimelineKey(prev => prev + 1)}
      />

      {/* Modal para adicionar opções */}
      {modalAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalAddOpen(false)}></div>

          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('leadDetails.addOption')}
            </h3>

            <input
              type="text"
              value={modalAddValue}
              onChange={(e) => setModalAddValue(e.target.value)}
              placeholder={t('leadDetails.optionPlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd()}
            />

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setModalAddOpen(false)}
                className="px-6 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-300 dark:border-white/10 font-medium transition-all"
              >
                {t('leadDetails.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={!modalAddValue.trim()}
                className="px-6 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('leadDetails.add')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeadDetails;
