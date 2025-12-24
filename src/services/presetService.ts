// =====================================================
// SERVICE: Preset Management
// Gerencia a aplicação de presets pré-configurados
// =====================================================

import { supabase } from '../lib/supabase'
import { createPipelineStage, loadPipelineStages } from './pipelineService'

// ============================================================
// Types
// ============================================================

export interface PipelineStagePreset {
  key: string
  label: string
  color: string
  order: number
}

export interface CustomFieldPreset {
  field_key: string
  field_label: string
  field_type: string
  field_options?: string[]
  field_group?: string
  field_placeholder?: string
  field_help_text?: string
  field_default?: string
  display_order: number
  required: boolean
  show_in_list: boolean
  show_in_filters: boolean
  searchable?: boolean
  min_value?: number
  max_value?: number
}

export interface PlaybookPreset {
  name: string
  category: 'scripts' | 'objections' | 'templates' | 'tips'
  content: string
  order: number
}

export interface PresetConfig {
  id: string
  name: string
  description: string
  icon: string
  category: 'real_estate' | 'generic' | 'services' | 'ecommerce'
  pipelineStages: PipelineStagePreset[]
  leadCustomFields: CustomFieldPreset[]
  productCustomFields: CustomFieldPreset[]
  playbooks: PlaybookPreset[]
}

export interface ApplyPresetResult {
  success: boolean
  applied: {
    pipelineStages: number
    leadFields: number
    productFields: number
    playbooks: number
  }
  errors: string[]
}

// ============================================================
// Preset Registry
// ============================================================

import { REAL_ESTATE_PRESET } from '../data/presets/realEstatePreset'
import { B2B_SERVICES_PRESET } from '../data/presets/b2bServicesPreset'
import { WELLNESS_PRESET } from '../data/presets/wellnessPreset'
import { MARKETING_PRESET } from '../data/presets/marketingAgencyPreset'

const PRESET_REGISTRY: Record<string, PresetConfig> = {
  'real_estate_premium': REAL_ESTATE_PRESET,
  'b2b_services': B2B_SERVICES_PRESET,
  'wellness_beauty': WELLNESS_PRESET,
  'marketing_agency': MARKETING_PRESET
}

// ============================================================
// Public Functions
// ============================================================

/**
 * Retorna todos os presets disponíveis
 */
export function getAvailablePresets(): PresetConfig[] {
  // Retorna explicitamente ambos os presets para garantir que apareçam na lista
  return Object.values(PRESET_REGISTRY)
}

/**
 * Retorna um preset específico pelo ID
 */
export function getPresetById(presetId: string): PresetConfig | null {
  return PRESET_REGISTRY[presetId] || null
}

/**
 * Verifica se um preset já foi aplicado para um tenant
 */
export async function checkPresetApplied(tenantId: string, presetId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('tenant_presets')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('preset_id', presetId)
      .maybeSingle()

    if (error) {
      console.error('[checkPresetApplied] Erro:', error)
      return false
    }

    return !!data
  } catch (err) {
    console.error('[checkPresetApplied] Exceção:', err)
    return false
  }
}

/**
 * Aplica um preset completo para um tenant
 */
export async function applyPreset(
  tenantId: string,
  presetId: string,
  userId: string
): Promise<ApplyPresetResult> {
  const result: ApplyPresetResult = {
    success: false,
    applied: {
      pipelineStages: 0,
      leadFields: 0,
      productFields: 0,
      playbooks: 0
    },
    errors: []
  }

  // Buscar preset
  const preset = getPresetById(presetId)
  if (!preset) {
    result.errors.push(`Preset "${presetId}" não encontrado`)
    return result
  }

  // Verificar se já foi aplicado
  const alreadyApplied = await checkPresetApplied(tenantId, presetId)
  if (alreadyApplied) {
    result.errors.push('Este preset já foi aplicado anteriormente')
    return result
  }

  try {
    // 1. Aplicar Pipeline Stages
    const pipelineResult = await applyPipelineStages(tenantId, preset.pipelineStages)
    result.applied.pipelineStages = pipelineResult.count
    if (pipelineResult.errors.length > 0) {
      result.errors.push(...pipelineResult.errors)
    }

    // 2. Aplicar Campos Personalizados para Produtos
    const productFieldsResult = await applyProductCustomFields(tenantId, preset.productCustomFields)
    result.applied.productFields = productFieldsResult.count
    if (productFieldsResult.errors.length > 0) {
      result.errors.push(...productFieldsResult.errors)
    }

    // 3. Aplicar Campos Personalizados para Leads
    const leadFieldsResult = await applyLeadCustomFields(tenantId, preset.leadCustomFields)
    result.applied.leadFields = leadFieldsResult.count
    if (leadFieldsResult.errors.length > 0) {
      result.errors.push(...leadFieldsResult.errors)
    }

    // 4. Aplicar Playbooks (usando sales_playbook_objections)
    const playbooksResult = await applyPlaybooks(tenantId, userId, preset.playbooks)
    result.applied.playbooks = playbooksResult.count
    if (playbooksResult.errors.length > 0) {
      result.errors.push(...playbooksResult.errors)
    }

    // 5. Registrar que o preset foi aplicado
    const { error: registerError } = await supabase
      .from('tenant_presets')
      .insert({
        tenant_id: tenantId,
        preset_id: presetId,
        applied_by: userId
      })

    if (registerError) {
      // Se a tabela não existir, apenas logamos, não é crítico
      console.warn('[applyPreset] Erro ao registrar preset (tabela pode não existir):', registerError)
    }

    result.success = true
    return result

  } catch (err) {
    console.error('[applyPreset] Erro geral:', err)
    result.errors.push(err instanceof Error ? err.message : 'Erro desconhecido')
    return result
  }
}

/**
 * Reverte (remove) um preset aplicado para um tenant
 * CUIDADO: Isso remove configurações e pode impactar dados
 */
export async function revertPreset(
  tenantId: string,
  presetId: string
): Promise<{ success: boolean; errors: string[] }> {
  const result = { success: false, errors: [] as string[] }

  // Buscar preset
  const preset = getPresetById(presetId)
  if (!preset) {
    result.errors.push(`Preset "${presetId}" não encontrado`)
    return result
  }

  try {
    // 1. Remover Playbooks
    const playbooks = preset.playbooks.map(p => p.name)
    if (playbooks.length > 0) {
      const { error } = await supabase
        .from('sales_playbook_objections')
        .delete()
        .eq('team_id', tenantId)
        .in('objection', playbooks)

      if (error) result.errors.push(`Erro ao remover playbooks: ${error.message}`)
    }

    // 2. Remover Campos de Lead
    const leadFields = preset.leadCustomFields.map(f => f.field_label)
    if (leadFields.length > 0) {
      const { error } = await supabase
        .from('lead_custom_fields')
        .delete()
        .eq('tenant_id', tenantId)
        .in('field_name', leadFields)

      if (error) result.errors.push(`Erro ao remover campos de lead: ${error.message}`)
    }

    // 3. Remover Campos de Produto
    const productFields = preset.productCustomFields.map(f => f.field_label)
    if (productFields.length > 0) {
      const { error } = await supabase
        .from('product_custom_fields')
        .delete()
        .eq('tenant_id', tenantId)
        .in('field_name', productFields)

      if (error) result.errors.push(`Erro ao remover campos de produto: ${error.message}`)
    }

    // 4. Remover Stages (apenas se vazios)
    // Isso é mais complexo, pois depende de constraints. Vamos tentar deletar pelo label/key.
    const pipelineStages = preset.pipelineStages.map(s => s.key)
    if (pipelineStages.length > 0) {
      // Primeiro buscamos os IDs dos stages
      const { data: stagesToDelete } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('key', pipelineStages)

      if (stagesToDelete && stagesToDelete.length > 0) {
        const stageIds = stagesToDelete.map(s => s.id)

        // Tentar deletar. Se houver leads vinculados, o banco vai bloquear (FK constraint).
        // Não vamos forçar delete cascade em stages para segurança.
        const { error } = await supabase
          .from('pipeline_stages')
          .delete()
          .in('id', stageIds)

        if (error) {
          console.warn('[revertPreset] Não foi possível remover alguns stages (provavelmente têm leads):', error.message)
          // Não adicionamos ao result.errors para não falhar a reversão geral, apenas logamos
        }
      }
    }

    // 5. Remover registro de aplicação
    const { error: unregisterError } = await supabase
      .from('tenant_presets')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('preset_id', presetId)

    if (unregisterError) {
      console.warn('[revertPreset] Erro ao remover registro do preset:', unregisterError)
    }

    result.success = true
    return result

  } catch (err) {
    console.error('[revertPreset] Erro geral:', err)
    result.errors.push(err instanceof Error ? err.message : 'Erro desconhecido')
    return result
  }
}

// ============================================================
// Private Functions - Aplicadores
// ============================================================

async function applyPipelineStages(
  tenantId: string,
  stages: PipelineStagePreset[]
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = []
  let count = 0

  // Verificar stages existentes
  const existingStages = await loadPipelineStages(tenantId)
  const existingKeys = new Set(existingStages.map(s => s.key))

  // Calcular próximo order
  const maxOrder = existingStages.length > 0
    ? Math.max(...existingStages.map(s => s.order || 0))
    : 0

  for (const stage of stages) {
    // Pular se já existe
    if (existingKeys.has(stage.key)) {
      console.log(`[applyPipelineStages] Stage "${stage.key}" já existe, pulando...`)
      continue
    }

    const newStage = await createPipelineStage({
      tenant_id: tenantId,
      key: stage.key,
      label: stage.label,
      color: stage.color,
      order: maxOrder + stage.order
    })

    if (newStage) {
      count++
    } else {
      errors.push(`Falha ao criar etapa "${stage.label}"`)
    }
  }

  return { count, errors }
}

/**
 * Aplica campos personalizados para produtos
 * Schema: id, tenant_id, field_name, field_type, options (jsonb), required, active,
 *         searchable, show_in_list, show_in_filters, display_order, min_value, max_value, etc.
 */
async function applyProductCustomFields(
  tenantId: string,
  fields: CustomFieldPreset[]
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = []
  let count = 0

  // Verificar campos existentes (por field_name)
  const { data: existingFields } = await supabase
    .from('product_custom_fields')
    .select('field_name')
    .eq('tenant_id', tenantId)

  const existingNames = new Set(existingFields?.map(f => f.field_name.toLowerCase()) || [])

  // Calcular próximo display_order
  const { data: maxOrderData } = await supabase
    .from('product_custom_fields')
    .select('display_order')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxOrderData?.[0]?.display_order || 0

  for (const field of fields) {
    // Pular se já existe (comparar por nome normalizado)
    if (existingNames.has(field.field_label.toLowerCase())) {
      console.log(`[applyProductCustomFields] Campo "${field.field_label}" já existe, pulando...`)
      continue
    }

    const { error } = await supabase
      .from('product_custom_fields')
      .insert({
        tenant_id: tenantId,
        field_name: field.field_label, // Usar field_label como field_name
        field_type: field.field_type,
        options: field.field_options ? field.field_options : null, // jsonb
        required: field.required || false,
        active: true,
        searchable: field.searchable || false,
        show_in_list: field.show_in_list || false,
        show_in_filters: field.show_in_filters || false,
        display_order: maxOrder + field.display_order,
        min_value: field.min_value || null,
        max_value: field.max_value || null
      })

    if (error) {
      console.error(`[applyProductCustomFields] Erro ao criar "${field.field_label}":`, error)
      errors.push(`Falha ao criar campo "${field.field_label}"`)
    } else {
      count++
    }
  }

  return { count, errors }
}

/**
 * Aplica campos personalizados para leads
 * Schema existente: id, tenant_id, field_name, field_type, options (jsonb), required, active
 */
async function applyLeadCustomFields(
  tenantId: string,
  fields: CustomFieldPreset[]
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = []
  let count = 0

  // Verificar campos existentes (por field_name)
  const { data: existingFields, error: checkError } = await supabase
    .from('lead_custom_fields')
    .select('field_name')
    .eq('tenant_id', tenantId)

  if (checkError) {
    console.warn('[applyLeadCustomFields] Erro ao verificar campos:', checkError.message)
    errors.push('Erro ao verificar campos de leads existentes')
    return { count: 0, errors }
  }

  const existingNames = new Set(existingFields?.map(f => f.field_name.toLowerCase()) || [])

  for (const field of fields) {
    // Pular se já existe (comparar por nome normalizado)
    if (existingNames.has(field.field_label.toLowerCase())) {
      console.log(`[applyLeadCustomFields] Campo "${field.field_label}" já existe, pulando...`)
      continue
    }

    const { error } = await supabase
      .from('lead_custom_fields')
      .insert({
        tenant_id: tenantId,
        field_name: field.field_label, // Usar field_label como field_name
        field_type: field.field_type,
        options: field.field_options ? field.field_options : null, // jsonb
        required: field.required || false,
        active: true
      })

    if (error) {
      console.error(`[applyLeadCustomFields] Erro ao criar "${field.field_label}":`, error)
      errors.push(`Falha ao criar campo de lead "${field.field_label}"`)
    } else {
      count++
    }
  }

  return { count, errors }
}

/**
 * Aplica playbooks usando a tabela sales_playbook_objections
 * Schema: id, user_id, team_id, objection, response, tactic, stage, is_default
 */
async function applyPlaybooks(
  tenantId: string,
  userId: string,
  playbooks: PlaybookPreset[]
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = []
  let count = 0

  // Verificar playbooks existentes do usuário neste tenant
  const { data: existingPlaybooks, error: checkError } = await supabase
    .from('sales_playbook_objections')
    .select('objection')
    .eq('team_id', tenantId)
    .eq('user_id', userId)

  if (checkError) {
    console.warn('[applyPlaybooks] Erro ao verificar playbooks:', checkError.message)
    // Continuar mesmo com erro - tabela pode estar vazia
  }

  const existingNames = new Set(existingPlaybooks?.map(p => p.objection.toLowerCase()) || [])

  for (const playbook of playbooks) {
    // Pular se já existe
    if (existingNames.has(playbook.name.toLowerCase())) {
      console.log(`[applyPlaybooks] Playbook "${playbook.name}" já existe, pulando...`)
      continue
    }

    // Mapear para o schema de sales_playbook_objections
    // objection = título/nome, response = conteúdo, tactic = categoria, stage = ordem
    const { error } = await supabase
      .from('sales_playbook_objections')
      .insert({
        user_id: userId,
        team_id: tenantId,
        objection: playbook.name, // Título do playbook
        response: playbook.content, // Conteúdo completo
        tactic: playbook.category, // Categoria (scripts, objections, etc)
        stage: `preset_${playbook.order}`, // Ordem como stage
        is_default: false
      })

    if (error) {
      console.error(`[applyPlaybooks] Erro ao criar "${playbook.name}":`, error)
      errors.push(`Falha ao criar playbook "${playbook.name}"`)
    } else {
      count++
    }
  }

  return { count, errors }
}
