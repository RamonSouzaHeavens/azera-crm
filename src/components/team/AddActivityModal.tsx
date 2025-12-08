import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  tenantId: string;
  userId: string;
  onSuccess: () => void;
  activityToEdit?: {
    id: string;
    type: string;
    title: string;
    description?: string;
  } | null;
}

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  leadId,
  tenantId,
  userId,
  onSuccess,
  activityToEdit
}) => {
  const { t } = useTranslation();
  const [newActivity, setNewActivity] = useState({
    type: 'nota' as 'nota' | 'atividade' | 'interacao',
    title: '',
    description: ''
  });
  const [savingActivity, setSavingActivity] = useState(false);

  // Preencher formulário ao abrir para edição
  useEffect(() => {
    if (isOpen && activityToEdit) {
      setNewActivity({
        type: (activityToEdit.type as 'nota' | 'atividade' | 'interacao') || 'nota',
        title: activityToEdit.title || '',
        description: activityToEdit.description || ''
      });
    } else if (isOpen && !activityToEdit) {
      // Resetar se for novo
      setNewActivity({
        type: 'nota',
        title: '',
        description: ''
      });
    }
  }, [isOpen, activityToEdit]);

  const handleSubmit = async () => {
    if (!newActivity.title.trim()) {
      alert(t('leadDetails.activityTitleRequired'));
      return;
    }

    setSavingActivity(true);
    try {
      const content = `**${newActivity.title.trim()}**\n${newActivity.description.trim() || ''}`;

      if (activityToEdit) {
        // Update existing activity
        const { error } = await supabase
          .from('atividades')
          .update({
            tipo: newActivity.type,
            conteudo: content
          })
          .eq('id', activityToEdit.id)
          .eq('tenant_id', tenantId);

        if (error) throw error;
      } else {
        // Create new activity
        const { error } = await supabase
          .from('atividades')
          .insert({
            tenant_id: tenantId,
            cliente_id: leadId,
            user_id: userId,
            tipo: newActivity.type,
            conteudo: content
          });

        if (error) throw error;
      }

      setNewActivity({ type: 'nota', title: '', description: '' });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar atividade:', error);
      alert(t('leadDetails.addActivityError'));
    } finally {
      setSavingActivity(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bg-white dark:bg-slate-900/98 border border-slate-300 dark:border-white/10 rounded-2xl p-6 shadow-2xl w-96 max-w-[90vw]">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {activityToEdit ? t('leadDetails.editActivityTitle') : t('leadDetails.addActivityTitle')}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('leadDetails.activityTypeLabel')}</label>
            <select
              value={newActivity.type}
              onChange={(e) => setNewActivity(prev => ({ ...prev, type: e.target.value as 'nota' | 'atividade' | 'interacao' }))}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
            >
              <option value="nota">{t('leadDetails.activityTypeNote')}</option>
              <option value="atividade">{t('leadDetails.activityTypeActivity')}</option>
              <option value="interacao">{t('leadDetails.activityTypeInteraction')}</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('leadDetails.activityTitleLabel')}</label>
            <input
              type="text"
              value={newActivity.title}
              onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Ligação realizada, Email enviado..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('leadDetails.activityDescriptionLabel')}</label>
            <textarea
              value={newActivity.description}
              onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('leadDetails.activityDescriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-300 dark:border-white/10 font-medium transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={savingActivity}
              className="px-6 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingActivity ? t('leadDetails.activitySaving') : (activityToEdit ? t('common.save') : t('leadDetails.activityAddButton'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
