import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, CheckCircle, Circle, Calendar, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import toast from 'react-hot-toast'

interface Task {
  id: string
  titulo: string
  descricao: string | null
  status: string
  prioridade: string
  responsavel_id: string | null
  data_vencimento: string | null
  created_at: string
  responsavel?: {
    display_name: string | null
  } | null
  responsavel_nome?: string | null
}

interface ProcessTasksProps {
  processId: string
  clientId: string
}

const PRIORITY_COLORS = {
  baixa: 'bg-gray-400',
  media: 'bg-yellow-400',
  alta: 'bg-orange-400',
  urgente: 'bg-red-400'
}

export function ProcessTasks({ processId, clientId }: ProcessTasksProps) {
  const { tenant } = useAuthStore()
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tarefas')
        .select(`
          id, titulo, descricao, status, prioridade, 
          responsavel_id, responsavel_nome, data_vencimento, created_at,
          responsavel:profiles(display_name)
        `)
        .eq('process_id', processId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Corrigir o formato do responsavel para corresponder à interface Task
      const formattedData = data?.map(task => ({
        ...task,
        responsavel: task.responsavel && Array.isArray(task.responsavel)
          ? task.responsavel[0] || null
          : task.responsavel || null,
        responsavel_nome: (task as Record<string, unknown>).responsavel_nome as string ?? null
      })) || []

      setTasks(formattedData)
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error)
      toast.error(t('processTasks.loadError'))
    } finally {
      setLoading(false)
    }
  }, [processId, t])

  useEffect(() => {
    if (processId) {
      loadTasks()
    }
  }, [processId, loadTasks])

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !tenant?.id) return

    try {
      setAddingTask(true)
      const { data, error } = await supabase
        .from('tarefas')
        .insert({
          tenant_id: tenant.id,
          titulo: newTaskTitle,
          status: 'a_fazer',
          prioridade: 'media',
          cliente_id: clientId,
          process_id: processId
        })
        .select(`
          id, titulo, descricao, status, prioridade, 
          responsavel_id, responsavel_nome, data_vencimento, created_at,
          responsavel:profiles(display_name)
        `)
        .single()

      if (error) throw error

      // Corrigir o formato do responsavel para corresponder à interface Task
      const formattedTask = {
        ...data,
        responsavel: data.responsavel && Array.isArray(data.responsavel)
          ? data.responsavel[0] || null
          : data.responsavel || null,
        responsavel_nome: (data as Record<string, unknown>).responsavel_nome as string ?? null
      }

      setTasks(prev => [formattedTask, ...prev])
      setNewTaskTitle('')
      toast.success(t('processTasks.addSuccess'))
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error)
      toast.error(t('processTasks.addError'))
    } finally {
      setAddingTask(false)
    }
  }

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'concluida' ? 'a_fazer' : 'concluida'
      const { error } = await supabase
        .from('tarefas')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, status: newStatus }
            : task
        )
      )
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
      toast.error(t('processTasks.updateError'))
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm(t('processTasks.deleteConfirm'))) return

    try {
      const { error } = await supabase
        .from('tarefas')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.filter(task => task.id !== taskId))
      toast.success(t('processTasks.deleteSuccess'))
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error)
      toast.error(t('processTasks.deleteError'))
    }
  }

  const formatDate = (date?: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Adicionar nova tarefa */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder={t('processTasks.placeholder')}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
        />
        <Button
          onClick={handleAddTask}
          disabled={!newTaskTitle.trim() || addingTask}
          className="flex items-center gap-2"
        >
          {addingTask ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {t('processTasks.addButton')}
        </Button>
      </div>

      {/* Lista de tarefas */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>{t('processTasks.emptyState')}</p>
            <p className="text-sm mt-1">{t('processTasks.emptyStateHint')}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className="mt-1"
                  aria-label={t('processTasks.toggleStatus')}
                >
                  {task.status === 'concluida' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 hover:text-cyan-400" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`font-medium ${task.status === 'concluida' ? 'line-through text-gray-400' : 'text-white'}`}>
                      {task.titulo}
                    </h4>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.prioridade as keyof typeof PRIORITY_COLORS] || 'bg-gray-400'}`} />
                      <button
                        className="p-1 hover:bg-white/10 rounded"
                        aria-label={t('processTasks.editButton')}
                      >
                        <Edit className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 hover:bg-white/10 rounded"
                        aria-label={t('processTasks.deleteButton')}
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {task.descricao && (
                    <p className="text-sm text-gray-400 mt-1">{task.descricao}</p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    {task.data_vencimento && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.data_vencimento)}
                      </div>
                    )}

                    {(task.responsavel?.display_name || task.responsavel_nome) && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.responsavel?.display_name ?? task.responsavel_nome}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}