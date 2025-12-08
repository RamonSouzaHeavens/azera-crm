import { supabase } from '../lib/supabase'

export interface PipelineStage {
  id?: string
  tenant_id: string
  key: string
  label: string
  color: string
  order?: number
}

/**
 * Carrega todas as etapas da pipeline para um tenant
 */
export async function loadPipelineStages(tenantId: string): Promise<PipelineStage[]> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[ERROR] loadPipelineStages:', err)
    return []
  }
}

/**
 * Cria uma nova etapa na pipeline
 */
export async function createPipelineStage(stage: PipelineStage): Promise<PipelineStage | null> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert([stage])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[ERROR] createPipelineStage:', err)
    return null
  }
}

/**
 * Atualiza uma etapa existente
 */
export async function updatePipelineStage(id: string, updates: Partial<PipelineStage>): Promise<PipelineStage | null> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[ERROR] updatePipelineStage:', err)
    return null
  }
}

/**
 * Deleta uma etapa da pipeline
 */
export async function deletePipelineStage(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    console.error('[ERROR] deletePipelineStage:', err)
    return false
  }
}

/**
 * Reordena as etapas (atualiza o campo order para múltiplas etapas)
 */
export async function reorderPipelineStages(stages: Array<{ id: string; order: number }>): Promise<boolean> {
  try {
    // Supabase não suporta UPDATE em massa facilmente, então fazemos um por um
    for (const stage of stages) {
      const { error } = await supabase
        .from('pipeline_stages')
        .update({ order: stage.order })
        .eq('id', stage.id)

      if (error) throw error
    }
    return true
  } catch (err) {
    console.error('[ERROR] reorderPipelineStages:', err)
    return false
  }
}
