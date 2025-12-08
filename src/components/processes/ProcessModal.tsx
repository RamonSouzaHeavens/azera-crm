import { useState, useEffect } from 'react';
import { X, Calendar, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import {
  createProcess,
  updateProcess,
  type ClientProcess,
  type CreateProcessData,
  type UpdateProcessData,
} from '../../services/processService';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ProcessModalProps {
  open: boolean;
  onClose: () => void;
  process?: ClientProcess | null;
  onSuccess?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'baixa', color: 'bg-gray-400' },
  { value: 'media', color: 'bg-yellow-400' },
  { value: 'alta', color: 'bg-red-400' },
] as const;

const STATUS_OPTIONS = [
  { value: 'backlog' },
  { value: 'em_andamento' },
  { value: 'revisao' },
  { value: 'concluido' },
] as const;

export function ProcessModal({ open, onClose, process, onSuccess }: ProcessModalProps) {
  const { t } = useTranslation();
  const { tenant, member } = useAuthStore();

  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; display_name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    description: '',
    priority: 'media' as 'baixa' | 'media' | 'alta',
    status: 'backlog' as 'backlog' | 'em_andamento' | 'revisao' | 'concluido',
    responsible_user_id: '',
    start_date: '',
    expected_end_date: '',
    external_link: '',
  });

  // Carregar dados ao abrir o modal
  useEffect(() => {
    if (open) {
      loadClients();
      loadUsers();

      if (process) {
        setFormData({
          client_id: process.client_id || '',
          title: process.title || '',
          description: process.description || '',
          priority: process.priority || 'media',
          status: process.status || 'backlog',
          responsible_user_id: process.responsible_user_id || '',
          start_date: process.start_date ? process.start_date.split('T')[0] : '',
          expected_end_date: process.expected_end_date ? process.expected_end_date.split('T')[0] : '',
          external_link: process.external_link || '',
        });
      } else {
        setFormData({
          client_id: '',
          title: '',
          description: '',
          priority: 'media',
          status: 'backlog',
          responsible_user_id: '',
          start_date: '',
          expected_end_date: '',
          external_link: '',
        });
      }
    }
  }, [open, process]);

  const loadClients = async () => {
    if (!tenant?.id && !member?.tenant_id) return;

    try {
      setClientLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('id, nome')
        .eq('tenant_id', tenant?.id || member?.tenant_id || '')
        .in('tipo', ['lead', 'cliente'])
        .order('nome');

      if (error) throw error;
      const mapped = data?.map((c) => ({ id: c.id, name: c.nome })) || [];
      setClients(mapped);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      toast.error(t('processModal.errors.loadClients'));
    } finally {
      setClientLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!tenant?.id && !member?.tenant_id) return;

    try {
      setUserLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('tenant_id', tenant?.id || member?.tenant_id || '')
        .order('display_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      toast.error(t('processModal.errors.loadUsers'));
    } finally {
      setUserLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id || !formData.title.trim()) {
      toast.error(t('processModal.errors.requiredFields'));
      return;
    }

    try {
      setLoading(true);

      if (process) {
        const updateData: UpdateProcessData = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: formData.status,
          responsible_user_id: formData.responsible_user_id || undefined,
          start_date: formData.start_date || undefined,
          expected_end_date: formData.expected_end_date || undefined,
          external_link: formData.external_link || undefined,
        };
        await updateProcess(process.id, updateData);
        toast.success(t('processModal.success.updated'));
      } else {
        const createData: CreateProcessData = {
          client_id: formData.client_id,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          responsible_user_id: formData.responsible_user_id || undefined,
          start_date: formData.start_date || undefined,
          expected_end_date: formData.expected_end_date || undefined,
          external_link: formData.external_link || undefined,
        };
        await createProcess(createData);
        toast.success(t('processModal.success.created'));
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar processo:', err);
      toast.error(t('processModal.errors.save'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-semibold text-white">
            {process ? t('processModal.title.edit') : t('processModal.title.create')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('processModal.fields.client.label')} <span className="text-red-400">*</span>
              </label>
              {clientLoading ? (
                <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">{t('processModal.fields.client.placeholder')}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-gray-800">
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('processModal.fields.title.label')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder={t('processModal.fields.title.placeholder')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('processModal.fields.description.label')}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder={t('processModal.fields.description.placeholder')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('processModal.fields.priority.label')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, priority: opt.value }))}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${formData.priority === opt.value
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 hover:border-white/20'
                      }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${opt.color}`} />
                    <span className="text-sm text-white">{t(`processModal.fields.priority.options.${opt.value}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('processModal.fields.status.label')}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-gray-800">
                    {t(`processModal.fields.status.options.${opt.value}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('processModal.fields.responsible.label')}
              </label>
              {userLoading ? (
                <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <select
                  name="responsible_user_id"
                  value={formData.responsible_user_id}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">{t('processModal.fields.responsible.none')}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-gray-800">
                      {u.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Datas */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('processModal.fields.startDate')}
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <Calendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('processModal.fields.expectedEndDate')}
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="expected_end_date"
                  value={formData.expected_end_date}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <Calendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Link Externo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('processModal.fields.externalLink')}
              </label>
              <div className="relative">
                <input
                  type="url"
                  name="external_link"
                  value={formData.external_link}
                  onChange={handleChange}
                  placeholder="https://"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 pl-10"
                />
                <LinkIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex items-center gap-2">
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {process ? t('processModal.actions.update') : t('processModal.actions.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}