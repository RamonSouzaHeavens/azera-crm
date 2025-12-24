
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {
  Plus, DollarSign, Calendar, CheckCircle2, AlertCircle,
  Repeat, Trash2, Edit2, Loader2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import {
  getLeadSales, createSale, createRecurringSales, deleteSale, updateSale,
  type Sale, type NewSale
} from '../../services/salesService';
import toast from 'react-hot-toast';

interface LeadSalesTabProps {
  leadId: string;
}

export const LeadSalesTab: React.FC<LeadSalesTabProps> = ({ leadId }) => {
  const { tenant } = useAuthStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRevenue: 0, pendingRevenue: 0, count: 0 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [saleForm, setSaleForm] = useState({
    title: '',
    value: '',
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'paid',
    is_recurring: false,
    recurrence_count: 12,
  });

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await getLeadSales(leadId);
      setSales(data);

      // Calcular resumo
      const total = data.filter(s => s.status === 'paid').reduce((acc, curr) => acc + Number(curr.value), 0);
      const pending = data.filter(s => s.status === 'pending').reduce((acc, curr) => acc + Number(curr.value), 0);
      setSummary({ totalRevenue: total, pendingRevenue: pending, count: data.length });

    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      toast.error('Erro ao carregar histórico financeiro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) loadSales();
  }, [leadId]);

  const handleSubmit = async () => {
    if (!tenant?.id) return;
    if (!saleForm.title || !saleForm.value || !saleForm.due_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      const baseValue = Number(saleForm.value); // Valor por parcela

      if (saleForm.is_recurring) {
        // Lógica de Recorrência
        const recurrenceId = crypto.randomUUID();
        const salesToCreate: NewSale[] = [];
        const baseDate = new Date(saleForm.due_date);

        for (let i = 0; i < saleForm.recurrence_count; i++) {
          const dueDate = new Date(baseDate);
          dueDate.setMonth(baseDate.getMonth() + i);

          salesToCreate.push({
            tenant_id: tenant.id,
            lead_id: leadId,
            title: `${saleForm.title} (${i + 1}/${saleForm.recurrence_count})`,
            value: baseValue,
            due_date: dueDate.toISOString(),
            status: i === 0 && saleForm.status === 'paid' ? 'paid' : 'pending', // Só a primeira pode nascer paga se selecionado, ou todas? Vamos assumir que futuras são pending por via de regra, mas user pode querer marcar tudo como pago. Vamos manter pending para futuras por padrão.
            recurrence_id: recurrenceId
          });
        }

        // Ajuste: O usuário marcou status 'Pago'?
        // Se sim, geralmente é só a primeira parcela (entrada) ou se for retroativo.
        // Vamos simplicar: O status do form aplica a TODAS se for uma ação em massa?
        // Melhor: Aplicar o status do form apenas para a primeira, restante 'pending'.
        // Ou deixar o usuário escolher? Vamos forçar 'pending' para > 1 por segurança, exceto a primeira.

        if (saleForm.status === 'paid') {
          salesToCreate[0].status = 'paid';
          // As outras (índice 1+) ficam 'pending' como definido acima
        } else {
          salesToCreate[0].status = 'pending';
        }

        await createRecurringSales(salesToCreate);
        toast.success(`${saleForm.recurrence_count} parcelas geradas com sucesso!`);

      } else {
        // Venda Única
        await createSale({
          tenant_id: tenant.id,
          lead_id: leadId,
          title: saleForm.title,
          value: baseValue,
          due_date: new Date(saleForm.due_date).toISOString(),
          status: saleForm.status,
          recurrence_id: null
        });
        toast.success('Venda registrada com sucesso!');
      }

      setIsModalOpen(false);
      setSaleForm({
        title: '',
        value: '',
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        is_recurring: false,
        recurrence_count: 12
      });
      loadSales();

    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      toast.error('Erro ao salvar venda');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Essa ação não pode ser desfeita.')) return;
    try {
      await deleteSale(id);
      toast.success('Venda excluída');
      loadSales();
    } catch (err) {
      toast.error('Erro ao excluir');
    }
  };

  const handleToggleStatus = async (sale: Sale) => {
    const newStatus = sale.status === 'paid' ? 'pending' : 'paid';
    try {
      await updateSale(sale.id, { status: newStatus });
      toast.success(`Status alterado para ${newStatus === 'paid' ? 'Pago' : 'Pendente'}`);
      loadSales();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Receita Total (LTV)</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {summary.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">A Receber</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {summary.pendingRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg shadow-lg shadow-emerald-500/20 transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            Nova Venda
          </button>
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma venda registrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm item-left text-left">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium text-left">Valor</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {new Date(sale.due_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {sale.title}
                        {sale.recurrence_id && (
                          <div title="Venda Recorrente">
                            <Repeat className="w-3 h-3 text-slate-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-mono">
                      {Number(sale.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(sale)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sale.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                          : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                          }`}
                      >
                        {sale.status === 'paid' ? (
                          <><CheckCircle2 className="w-3 h-3" /> Pago</>
                        ) : (
                          <><AlertCircle className="w-3 h-3" /> Pendente</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Venda */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Venda"
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4 pt-2">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={saleForm.title}
              onChange={e => setSaleForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Consultoria Mensal, Taxa de Setup..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.value}
                  onChange={e => setSaleForm(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data / Vencimento
              </label>
              <input
                type="date"
                value={saleForm.due_date}
                onChange={e => setSaleForm(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status Inicial
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={saleForm.status === 'pending'}
                  onChange={() => setSaleForm(prev => ({ ...prev, status: 'pending' }))}
                  className="text-amber-500 focus:ring-amber-500"
                />
                <span className="text-slate-700 dark:text-slate-300">Pendente (A Receber)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={saleForm.status === 'paid'}
                  onChange={() => setSaleForm(prev => ({ ...prev, status: 'paid' }))}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-slate-700 dark:text-slate-300">Pago (Recebido)</span>
              </label>
            </div>
          </div>

          {/* Recorrência Toggle */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${saleForm.is_recurring ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${saleForm.is_recurring ? 'translate-x-4' : ''}`} />
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={saleForm.is_recurring}
                onChange={e => setSaleForm(prev => ({ ...prev, is_recurring: e.target.checked }))}
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-white">Venda Recorrente?</span>
                <span className="block text-xs text-slate-500">Gera parcelas mensais automaticamente</span>
              </div>
            </label>

            {/* Opções de Recorrência */}
            {saleForm.is_recurring && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 animate-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Número de Meses (Parcelas)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={saleForm.recurrence_count}
                    onChange={e => setSaleForm(prev => ({ ...prev, recurrence_count: parseInt(e.target.value) || 2 }))}
                    className="w-24 px-3 py-2 rounded-lg bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                  <span className="text-sm text-slate-500">meses</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Serão gerados <strong>{saleForm.recurrence_count} lançamentos</strong> mensais a partir de {new Date(saleForm.due_date).toLocaleDateString()}.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {saleForm.is_recurring ? 'Gerar Parcelas' : 'Salvar Venda'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
