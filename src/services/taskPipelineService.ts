import { supabase } from '../lib/supabase'

export interface TaskStage {
  id?: string
  tenant_id: string
  key: string
  label: string
  color: string
  order?: number
}

/**
 * Carrega todas as etapas da pipeline de tarefas para um tenant
 */
export async function loadTaskStages(tenantId: string): Promise<TaskStage[]> {
  try {
    const { data, error } = await supabase
      .from('task_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[ERROR] loadTaskStages:', err)
    return []
  }
}

/**
 * Cria uma nova etapa na pipeline de tarefas
 */
export async function createTaskStage(stage: TaskStage): Promise<TaskStage | null> {
  try {
    const { data, error } = await supabase
      .from('task_stages')
      .insert([stage])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[ERROR] createTaskStage:', err)
    return null
  }
}

/**
 * Atualiza uma etapa existente na pipeline de tarefas
 */
export async function updateTaskStage(id: string, updates: Partial<TaskStage>): Promise<TaskStage | null> {
  try {
    const { data, error } = await supabase
      .from('task_stages')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[ERROR] updateTaskStage:', err)
    return null
  }
}

/**
 * Deleta uma etapa da pipeline de tarefas
 */
export async function deleteTaskStage(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('task_stages')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    console.error('[ERROR] deleteTaskStage:', err)
    return false
  }
}

/**
 * Reordena as etapas da pipeline de tarefas (atualiza o campo order para múltiplas etapas)
 */
export async function reorderTaskStages(stages: Array<{ id: string; order: number }>): Promise<boolean> {
  try {
    // Supabase não suporta UPDATE em massa facilmente, então fazemos um por um
    for (const stage of stages) {
      const { error } = await supabase
        .from('task_stages')
        .update({ order: stage.order })
        .eq('id', stage.id)

      if (error) throw error
    }
    return true
  } catch (err) {
    console.error('[ERROR] reorderTaskStages:', err)
    return false
  }
}