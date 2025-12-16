import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Plus, Settings, Type, Hash, Calendar, List, CheckSquare, X, Trash2, Tags, ListChecks } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface LeadCustomFieldsProps {
  leadId: string;
}

interface CustomField {
  id: string;
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'tags' | 'boolean';
  options: string[];
  required: boolean;
}

interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  value: string;
}

const getFieldIcon = (fieldType: string) => {
  switch (fieldType) {
    case 'text': return <Type className="w-4 h-4" />;
    case 'number': return <Hash className="w-4 h-4" />;
    case 'date': return <Calendar className="w-4 h-4" />;
    case 'select': return <List className="w-4 h-4" />;
    case 'multiselect': return <ListChecks className="w-4 h-4" />;
    case 'tags': return <Tags className="w-4 h-4" />;
    case 'boolean': return <CheckSquare className="w-4 h-4" />;
    default: return <Type className="w-4 h-4" />;
  }
};

export const LeadCustomFields: React.FC<LeadCustomFieldsProps> = ({ leadId }) => {
  const { tenant } = useAuthStore();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showManageModal, setShowManageModal] = useState(false);
  const [newField, setNewField] = useState({
    field_name: '',
    field_type: 'text' as 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'tags' | 'boolean',
    options: [] as string[],
    required: false,
    field_value: ''
  });

  const loadFields = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from('lead_custom_fields')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('field_name');
    setFields(data || []);
  };

  const loadFieldValues = async () => {
    if (!leadId || !tenant?.id) return;
    const { data } = await supabase
      .from('lead_custom_field_values')
      .select('custom_field_id, value')
      .eq('lead_id', leadId);

    const values: Record<string, string> = {};
    data?.forEach(item => {
      values[item.custom_field_id] = item.value;
    });
    setFieldValues(values);
  };

  const deleteField = async (fieldId: string) => {
    if (!confirm('Tem certeza que deseja excluir este campo personalizado? Todos os valores associados serão perdidos.')) return;

    try {
      // Primeiro, excluir valores associados
      await supabase
        .from('lead_custom_field_values')
        .delete()
        .eq('custom_field_id', fieldId);

      // Depois, excluir o campo
      const { error } = await supabase
        .from('lead_custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      // Recarregar campos
      await loadFields();
      await loadFieldValues();
    } catch (error) {
      console.error('Erro ao excluir campo:', error);
    }
  };

  const addField = async () => {
    if (!tenant?.id || !newField.field_name.trim()) return;

    try {
      const { data: newFieldData, error } = await supabase
        .from('lead_custom_fields')
        .insert({
          tenant_id: tenant.id,
          field_name: newField.field_name.trim(),
          field_type: newField.field_type,
          options: newField.options,
          required: newField.required
        })
        .select('id')
        .single();

      if (error) throw error;

      // Criar valor para o campo no lead atual
      if (newFieldData?.id && leadId) {
        await supabase
          .from('lead_custom_field_values')
          .insert({
            lead_id: leadId,
            custom_field_id: newFieldData.id,
            value: newField.field_value
          });
      }

      setNewField({ field_name: '', field_type: 'text', options: [], required: false, field_value: '' });
      await loadFields();
      await loadFieldValues();
    } catch (error) {
      console.error('Erro ao adicionar campo:', error);
    }
  };

  const updateFieldValue = async (fieldId: string, value: string) => {
    // Atualizar state local
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));

    // Salvar no banco
    try {
      const { error } = await supabase
        .from('lead_custom_field_values')
        .upsert({
          lead_id: leadId,
          custom_field_id: fieldId,
          value: value
        }, {
          onConflict: 'lead_id,custom_field_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar valor do campo:', error);
      // Reverter mudança local em caso de erro
      setFieldValues(prev => ({ ...prev, [fieldId]: prev[fieldId] || '' }));
    }
  };

  useEffect(() => {
    void loadFields();
    void loadFieldValues();
  }, [leadId, tenant?.id]);

  const addOption = () => {
    setNewField(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const updateOption = (index: number, value: string) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const renderFieldInput = (field: CustomField) => {
    const value = fieldValues[field.id] || '';

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            placeholder="Digite o texto..."
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
            placeholder="Digite o número..."
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          >
            <option value="">Selecione...</option>
            {field.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'multiselect': {
        const selectedValues = value ? value.split(',').filter(Boolean) : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedValues.map((v, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-md text-sm">
                  {v}
                  <button
                    type="button"
                    onClick={() => {
                      const newValues = selectedValues.filter((_, i) => i !== idx);
                      updateFieldValue(field.id, newValues.join(','));
                    }}
                    className="hover:text-indigo-900 dark:hover:text-indigo-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !selectedValues.includes(e.target.value)) {
                  updateFieldValue(field.id, [...selectedValues, e.target.value].join(','));
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            >
              <option value="">Adicionar opção...</option>
              {field.options.filter(opt => !selectedValues.includes(opt)).map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      }

      case 'tags': {
        const tags = value ? value.split(',').filter(Boolean) : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md text-sm">
                  {tag}
                  <button
                    type="button"
                    onClick={() => {
                      const newTags = tags.filter((_, i) => i !== idx);
                      updateFieldValue(field.id, newTags.join(','));
                    }}
                    className="hover:text-emerald-900 dark:hover:text-emerald-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.currentTarget;
                    const newTag = input.value.trim();
                    if (newTag && !tags.includes(newTag)) {
                      updateFieldValue(field.id, [...tags, newTag].join(','));
                      input.value = '';
                    }
                  }
                }}
                placeholder="Digite e pressione Enter..."
                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm"
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const newTag = input?.value?.trim();
                  if (newTag && !tags.includes(newTag)) {
                    updateFieldValue(field.id, [...tags, newTag].join(','));
                    input.value = '';
                  }
                }}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      }

      case 'boolean':
        return (
          <select
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
          >
            <option value="">Selecione...</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Campos Personalizados ({fields.length})
        </h3>
        <button
          onClick={() => setShowManageModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-lg transition-all text-sm"
        >
          <Settings className="w-4 h-4" />
          Gerenciar
        </button>
      </div>

      {/* Campos personalizados */}
      {fields.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Type className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum campo personalizado configurado</p>
          <p className="text-sm mt-1">Adicione campos personalizados para coletar informações específicas dos leads</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(field => (
            <div key={field.id} className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                {getFieldIcon(field.field_type)}
                <label className="font-medium text-slate-900 dark:text-white">
                  {field.field_name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
              {renderFieldInput(field)}
            </div>
          ))}
        </div>
      )}

      {/* Modal de gerenciamento */}
      <Modal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Gerenciar Campos Personalizados"
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-6">
          {/* Adicionar novo campo */}
          <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Adicionar Novo Campo</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Nome do Campo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome do Campo *
                </label>
                <input
                  type="text"
                  value={newField.field_name}
                  onChange={(e) => setNewField(prev => ({ ...prev, field_name: e.target.value }))}
                  placeholder="Ex: Cargo, Empresa, Origem do Lead..."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              {/* Tipo do Campo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tipo do Campo
                </label>
                <select
                  value={newField.field_type}
                  onChange={(e) => setNewField(prev => ({ ...prev, field_type: e.target.value as 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'tags' | 'boolean' }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="date">Data</option>
                  <option value="select">Seleção Única</option>
                  <option value="multiselect">Seleção Múltipla</option>
                  <option value="tags">Tags (livre)</option>
                  <option value="boolean">Sim/Não</option>
                </select>
              </div>
            </div>

            {/* Opções (para select e multiselect) */}
            {(newField.field_type === 'select' || newField.field_type === 'multiselect') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Opções
                </label>
                <div className="space-y-2">
                  {newField.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Opção ${index + 1}`}
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remover opção"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Opção
                  </button>
                </div>
              </div>
            )}

            {/* Configurações */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                  className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500"
                />
                Campo obrigatório
              </label>
            </div>

            {/* Valor do Campo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Valor do Campo
              </label>
              {newField.field_type === 'text' && (
                <input
                  type="text"
                  value={newField.field_value}
                  onChange={(e) => setNewField(prev => ({ ...prev, field_value: e.target.value }))}
                  placeholder="Digite o valor..."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              )}
              {newField.field_type === 'number' && (
                <input
                  type="number"
                  value={newField.field_value}
                  onChange={(e) => setNewField(prev => ({ ...prev, field_value: e.target.value }))}
                  placeholder="Digite o número..."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                />
              )}
              {newField.field_type === 'date' && (
                <input
                  type="date"
                  value={newField.field_value}
                  onChange={(e) => setNewField(prev => ({ ...prev, field_value: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                />
              )}
              {newField.field_type === 'select' && (
                <select
                  value={newField.field_value}
                  onChange={(e) => setNewField(prev => ({ ...prev, field_value: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                >
                  <option value="">Selecione...</option>
                  {newField.options.filter(opt => opt.trim()).map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
              {newField.field_type === 'boolean' && (
                <select
                  value={newField.field_value}
                  onChange={(e) => setNewField(prev => ({ ...prev, field_value: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                >
                  <option value="">Selecione...</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={addField}
                disabled={!newField.field_name.trim() || (newField.field_type === 'select' && newField.options.filter(opt => opt.trim()).length === 0)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar Campo
              </button>
            </div>
          </div>

          {/* Lista de campos existentes */}
          <div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Campos Configurados</h4>

            {fields.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                  <Plus className="w-8 h-8" />
                </div>
                <p className="font-medium">Nenhum campo personalizado ainda</p>
                <p className="text-sm mt-1">Adicione campos acima para coletar informações específicas dos leads</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fields.map(field => (
                  <div key={field.id} className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getFieldIcon(field.field_type)}
                        <div>
                          <span className="font-medium text-slate-900 dark:text-white">{field.field_name}</span>
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteField(field.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Excluir campo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Tipo: {field.field_type}
                      {field.options.length > 0 && ` • ${field.options.length} opções`}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Código:</span> <code className="bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-xs">{field.id}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
