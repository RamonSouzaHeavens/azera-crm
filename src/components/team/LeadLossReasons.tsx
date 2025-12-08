import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { XCircle, Settings, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface LeadLossReasonsProps {
  leadId: string;
}

interface LossReason {
  id: string;
  category: string;
  reason: string;
  is_active: boolean;
}

export const LeadLossReasons: React.FC<LeadLossReasonsProps> = ({ leadId }) => {
  const { tenant } = useAuthStore();
  const [reasons, setReasons] = useState<LossReason[]>([]);
  const [showManageReasons, setShowManageReasons] = useState(false);
  const [showAddReasonModal, setShowAddReasonModal] = useState(false);
  const [quickReason, setQuickReason] = useState({ category: '', reason: '' });
  const [newReason, setNewReason] = useState({
    category: '',
    reason: ''
  });

  const loadReasons = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from('lead_loss_reasons')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('category, reason');
    setReasons(data || []);
  };

  const addReason = async () => {
    if (!tenant?.id || !newReason.category.trim() || !newReason.reason.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_loss_reasons')
        .insert({
          tenant_id: tenant.id,
          category: newReason.category.trim(),
          reason: newReason.reason.trim()
        });

      if (error) throw error;

      setNewReason({ category: '', reason: '' });
      await loadReasons();
    } catch (error) {
      console.error('Erro ao adicionar motivo:', error);
    }
  };

  const addQuickReason = async () => {
    if (!tenant?.id || !quickReason.category.trim() || !quickReason.reason.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_loss_reasons')
        .insert({
          tenant_id: tenant.id,
          category: quickReason.category.trim(),
          reason: quickReason.reason.trim()
        });

      if (error) throw error;

      setQuickReason({ category: '', reason: '' });
      setShowAddReasonModal(false);
      await loadReasons();
    } catch (error) {
      console.error('Erro ao adicionar motivo:', error);
    }
  };

  const markLeadAsLost = async (reasonId: string) => {
    if (!leadId || !tenant?.id) return;

    try {
      // Primeiro, buscar o motivo para ter os detalhes
      const reason = reasons.find(r => r.id === reasonId);
      if (!reason) return;

      // Atualizar o lead com status perdido e adicionar ao timeline
      const { error: leadError } = await supabase
        .from('clientes')
        .update({
          status: 'perdido',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .eq('tenant_id', tenant.id);

      if (leadError) throw leadError;

      // Adicionar entrada no timeline
      const { error: timelineError } = await supabase
        .from('lead_timeline')
        .insert({
          lead_id: leadId,
          tenant_id: tenant.id,
          type: 'status_change',
          title: 'Lead perdido',
          description: `Motivo: ${reason.category} - ${reason.reason}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          metadata: { loss_reason_id: reasonId, category: reason.category, reason: reason.reason }
        });

      if (timelineError) throw timelineError;

      alert('Lead marcado como perdido com sucesso!');
    } catch (error) {
      console.error('Erro ao marcar lead como perdido:', error);
      alert('Erro ao marcar lead como perdido');
    }
  };

  useEffect(() => {
    void loadReasons();
  }, [tenant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Agrupar motivos por categoria
  const reasonsByCategory = reasons.reduce((acc, reason) => {
    if (!acc[reason.category]) {
      acc[reason.category] = [];
    }
    acc[reason.category].push(reason);
    return acc;
  }, {} as Record<string, LossReason[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Marcar como Perdido</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddReasonModal(true)}
            className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-700 dark:text-red-300 rounded-lg transition-all text-sm"
            title="Adicionar novo motivo"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowManageReasons(!showManageReasons)}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-700 dark:text-red-300 rounded-lg transition-all text-sm"
          >
            <Settings className="w-4 h-4" />
            Gerenciar Motivos
          </button>
        </div>
      </div>

      {/* Motivos de perda por categoria */}
      <div className="space-y-4">
        {Object.entries(reasonsByCategory).map(([category, categoryReasons]) => (
          <div key={category} className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">{category}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {categoryReasons.map(reason => (
                <button
                  key={reason.id}
                  onClick={() => markLeadAsLost(reason.id)}
                  className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-all text-left group"
                >
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700 dark:text-red-300 group-hover:text-red-800 dark:group-hover:text-red-200">
                    {reason.reason}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(reasonsByCategory).length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum motivo de perda cadastrado</p>
            <p className="text-sm mt-1">Configure motivos de perda para poder marcar leads como perdidos</p>
          </div>
        )}
      </div>

      {/* Gerenciar motivos */}
      {showManageReasons && (
        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">Gerenciar Motivos de Perda</h4>

          {/* Adicionar novo motivo */}
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={newReason.category}
                onChange={(e) => setNewReason(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Categoria (ex: Preço, Concorrente)"
                className="px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
              />
              <input
                type="text"
                value={newReason.reason}
                onChange={(e) => setNewReason(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Motivo específico"
                className="px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
              />
              <button
                onClick={addReason}
                disabled={!newReason.category.trim() || !newReason.reason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de motivos */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Motivos cadastrados</h5>
            {reasons.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum motivo cadastrado</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(reasonsByCategory).map(([category, categoryReasons]) => (
                  <div key={category} className="space-y-1">
                    <h6 className="text-sm font-medium text-slate-600 dark:text-slate-400">{category}</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 ml-4">
                      {categoryReasons.map(reason => (
                        <div key={reason.id} className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 px-2 py-1 rounded border">
                          {reason.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para adicionar motivo rápido */}
      <Modal
        isOpen={showAddReasonModal}
        onClose={() => setShowAddReasonModal(false)}
        title="Adicionar Novo Motivo de Perda"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Categoria
            </label>
            <input
              type="text"
              value={quickReason.category}
              onChange={(e) => setQuickReason(prev => ({ ...prev, category: e.target.value }))}
              placeholder="Ex: Preço, Concorrente, Tempo..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Motivo específico
            </label>
            <input
              type="text"
              value={quickReason.reason}
              onChange={(e) => setQuickReason(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Descreva o motivo..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && quickReason.category.trim() && quickReason.reason.trim()) {
                  addQuickReason();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAddReasonModal(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={addQuickReason}
              disabled={!quickReason.category.trim() || !quickReason.reason.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};