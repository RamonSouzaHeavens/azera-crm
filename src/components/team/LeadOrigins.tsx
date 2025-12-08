import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Facebook, MessageCircle, Globe, User, Settings, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface LeadOriginsProps {
  leadId: string;
}

interface LeadOrigin {
  id: string;
  name: string;
  type: 'facebook' | 'olx' | 'whatsapp' | 'site' | 'manual';
  is_active: boolean;
}

export const LeadOrigins: React.FC<LeadOriginsProps> = ({ leadId }) => {
  const { tenant } = useAuthStore();
  const [origins, setOrigins] = useState<LeadOrigin[]>([]);
  const [currentOrigin, setCurrentOrigin] = useState<string>('');
  const [showManageOrigins, setShowManageOrigins] = useState(false);
  const [showAddOriginModal, setShowAddOriginModal] = useState(false);
  const [quickOriginName, setQuickOriginName] = useState('');
  const [newOrigin, setNewOrigin] = useState({
    name: '',
    type: 'manual' as 'facebook' | 'olx' | 'whatsapp' | 'site' | 'manual'
  });

  const loadOrigins = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from('lead_origins')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('name');
    setOrigins(data || []);
  };

  const loadCurrentOrigin = async () => {
    if (!leadId || !tenant?.id) return;
    const { data } = await supabase
      .from('clientes')
      .select('origem')
      .eq('id', leadId)
      .eq('tenant_id', tenant.id)
      .single();

    if (data?.origem) {
      setCurrentOrigin(data.origem);
    }
  };

  const updateLeadOrigin = async (originName: string) => {
    if (!leadId || !tenant?.id) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .update({ origem: originName })
        .eq('id', leadId)
        .eq('tenant_id', tenant.id);

      if (error) throw error;
      setCurrentOrigin(originName);
    } catch (error) {
      console.error('Erro ao atualizar origem:', error);
    }
  };

  const addOrigin = async () => {
    if (!tenant?.id || !newOrigin.name.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_origins')
        .insert({
          tenant_id: tenant.id,
          name: newOrigin.name.trim(),
          type: newOrigin.type
        });

      if (error) throw error;

      setNewOrigin({ name: '', type: 'manual' });
      await loadOrigins();
    } catch (error) {
      console.error('Erro ao adicionar origem:', error);
    }
  };

  const addQuickOrigin = async () => {
    if (!tenant?.id || !quickOriginName.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_origins')
        .insert({
          tenant_id: tenant.id,
          name: quickOriginName.trim(),
          type: 'manual'
        });

      if (error) throw error;

      setQuickOriginName('');
      setShowAddOriginModal(false);
      await loadOrigins();
    } catch (error) {
      console.error('Erro ao adicionar origem:', error);
    }
  };

  useEffect(() => {
    void loadOrigins();
    void loadCurrentOrigin();
  }, [leadId, tenant?.id]);

  const getOriginIcon = (type: string) => {
    switch (type) {
      case 'facebook': return <Facebook className="w-4 h-4 text-blue-600" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'olx': return <Globe className="w-4 h-4 text-orange-600" />;
      case 'site': return <Globe className="w-4 h-4 text-purple-600" />;
      default: return <User className="w-4 h-4 text-slate-600" />;
    }
  };

  const getOriginTypeLabel = (type: string) => {
    switch (type) {
      case 'facebook': return 'Facebook';
      case 'whatsapp': return 'WhatsApp';
      case 'olx': return 'OLX';
      case 'site': return 'Site';
      default: return 'Manual';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Origem do Lead</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddOriginModal(true)}
            className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-700 dark:text-blue-300 rounded-lg transition-all text-sm"
            title="Adicionar nova origem"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowManageOrigins(!showManageOrigins)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 text-slate-700 dark:text-slate-300 rounded-lg transition-all text-sm"
          >
            <Settings className="w-4 h-4" />
            Gerenciar
          </button>
        </div>
      </div>

      {/* Origem atual */}
      <div className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Origem selecionada
        </label>
        <select
          value={currentOrigin}
          onChange={(e) => updateLeadOrigin(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
        >
          <option value="">Selecione uma origem...</option>
          {origins.map(origin => (
            <option key={origin.id} value={origin.name}>
              {origin.name} ({getOriginTypeLabel(origin.type)})
            </option>
          ))}
        </select>

        {currentOrigin && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
            {getOriginIcon(origins.find(o => o.name === currentOrigin)?.type || 'manual')}
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Origem: <strong>{currentOrigin}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Gerenciar origens */}
      {showManageOrigins && (
        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">Gerenciar Origens</h4>

          {/* Adicionar nova origem */}
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={newOrigin.name}
                onChange={(e) => setNewOrigin(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da origem"
                className="px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
              />
              <select
                value={newOrigin.type}
                onChange={(e) => setNewOrigin(prev => ({ ...prev, type: e.target.value as any }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
              >
                <option value="manual">Manual</option>
                <option value="facebook">Facebook</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="olx">OLX</option>
                <option value="site">Site</option>
              </select>
              <button
                onClick={addOrigin}
                disabled={!newOrigin.name.trim()}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de origens */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Origens cadastradas</h5>
            {origins.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma origem cadastrada</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {origins.map(origin => (
                  <div key={origin.id} className="flex items-center gap-2 p-2 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                    {getOriginIcon(origin.type)}
                    <span className="text-sm text-slate-900 dark:text-white">{origin.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                      {getOriginTypeLabel(origin.type)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para adicionar origem rápida */}
      <Modal
        isOpen={showAddOriginModal}
        onClose={() => setShowAddOriginModal(false)}
        title="Adicionar Nova Origem"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome da origem
            </label>
            <input
              type="text"
              value={quickOriginName}
              onChange={(e) => setQuickOriginName(e.target.value)}
              placeholder="Digite o nome da origem..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addQuickOrigin();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAddOriginModal(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={addQuickOrigin}
              disabled={!quickOriginName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};