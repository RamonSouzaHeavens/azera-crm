import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react'

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
  created_at: string;
}

interface LeadTasksProps {
  leadId: string;
}

export const LeadTasks: React.FC<LeadTasksProps> = ({ leadId }) => {
  const { tenant, user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: ''
  });
  const [saving, setSaving] = useState(false);

  const loadTasks = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from('lead_tasks')
      .select('*')
      .eq('lead_id', leadId)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    setTasks(data || []);
  };

  const addTask = async () => {
    if (!tenant?.id || !user?.id || !newTask.title.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('lead_tasks')
        .insert({
          lead_id: leadId,
          tenant_id: tenant.id,
          title: newTask.title.trim(),
          description: newTask.description.trim() || null,
          due_date: newTask.due_date || null,
          created_by: user.id
        });

      if (error) throw error;

      setNewTask({ title: '', description: '', due_date: '' });
      setShowAddForm(false);
      await loadTasks();
    } catch (error) {
      console.error('Erro ao adicionar task:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_tasks')
        .update({ is_completed: completed })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Erro ao atualizar task:', error);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, [leadId, tenant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const getTaskIcon = (task: Task) => {
    if (task.is_completed) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (task.due_date && new Date(task.due_date) < new Date()) return <AlertCircle className="w-5 h-5 text-red-500" />;
    return <Clock className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Tasks ({tasks.filter(t => !t.is_completed).length} pendentes)
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Task
        </button>
      </div>

      {showAddForm && (
        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Título da Task</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Ligar para o cliente, Enviar proposta..."
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Descrição (opcional)</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes da task..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Data de vencimento (opcional)</label>
              <input
                type="datetime-local"
                value={newTask.due_date}
                onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={addTask}
                disabled={saving || !newTask.title.trim()}
                className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Adicionar Task'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma task criada ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`p-4 rounded-lg border transition-all ${
                task.is_completed
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleTask(task.id, !task.is_completed)}
                  className="mt-0.5"
                >
                  {getTaskIcon(task)}
                </button>

                <div className="flex-1">
                  <h4 className={`font-medium ${task.is_completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className={`text-sm mt-1 ${task.is_completed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Criado em {new Date(task.created_at).toLocaleString('pt-BR')}</span>
                    {task.due_date && (
                      <span className={new Date(task.due_date) < new Date() && !task.is_completed ? 'text-red-500' : ''}>
                        Vence em {new Date(task.due_date).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};