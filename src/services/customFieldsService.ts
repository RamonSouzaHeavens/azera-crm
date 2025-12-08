// =====================================================
// SERVICE: Custom Fields Management
// =====================================================

import { supabase } from '../lib/supabase'
import type {
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldFormData,
  CustomFieldGroup,
  CustomFieldValidationResult,
  FormattedCustomField,
  CustomFieldStats
} from '../types/customFields'

// ============================================================
// CRUD para Definições de Custom Fields
// ============================================================

/**
 * Buscar todas as definições de custom fields de um tenant
 */
export async function getCustomFields(tenantId: string, activeOnly = true): Promise<CustomFieldDefinition[]> {
  let query = supabase
    .from('product_custom_fields')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('field_group', { ascending: true })
    .order('display_order', { ascending: true })

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar custom fields:', error)
    throw error
  }

  return data || []
}

/**
 * Buscar custom fields agrupados
 */
export async function getCustomFieldsByGroup(tenantId: string): Promise<CustomFieldGroup[]> {
  const fields = await getCustomFields(tenantId, true)
  
  const groups = new Map<string, CustomFieldDefinition[]>()
  
  fields.forEach(field => {
    const groupName = field.field_group || 'Sem Grupo'
    if (!groups.has(groupName)) {
      groups.set(groupName, [])
    }
    groups.get(groupName)!.push(field)
  })
  
  return Array.from(groups.entries()).map(([group_name, fields]) => ({
    group_name,
    fields
  }))
}

/**
 * Buscar um custom field específico
 */
export async function getCustomField(fieldId: string): Promise<CustomFieldDefinition | null> {
  const { data, error } = await supabase
    .from('product_custom_fields')
    .select('*')
    .eq('id', fieldId)
    .single()

  if (error) {
    console.error('Erro ao buscar custom field:', error)
    return null
  }

  return data
}

/**
 * Criar novo custom field
 */
export async function createCustomField(
  tenantId: string,
  fieldData: CustomFieldFormData
): Promise<{ success: boolean; field?: CustomFieldDefinition; error?: string }> {
  try {
    // Validar field_key (apenas letras, números e underscore)
    if (!/^[a-z0-9_]+$/.test(fieldData.field_key)) {
      return {
        success: false,
        error: 'A chave do campo deve conter apenas letras minúsculas, números e underscore'
      }
    }

    // Verificar se já existe campo com essa chave
    const { data: existing } = await supabase
      .from('product_custom_fields')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('field_key', fieldData.field_key)
      .single()

    if (existing) {
      return {
        success: false,
        error: 'Já existe um campo com essa chave'
      }
    }

    const { data, error } = await supabase
      .from('product_custom_fields')
      .insert({
        tenant_id: tenantId,
        field_key: fieldData.field_key,
        field_label: fieldData.field_label,
        field_type: fieldData.field_type,
        field_group: fieldData.field_group || null,
        field_options: fieldData.field_options || null,
        field_placeholder: fieldData.field_placeholder || null,
        field_help_text: fieldData.field_help_text || null,
        required: fieldData.required || false,
        show_in_list: fieldData.show_in_list || false,
        show_in_filters: fieldData.show_in_filters || false,
        searchable: fieldData.searchable || false,
        display_order: fieldData.display_order || 0,
        min_value: fieldData.min_value || null,
        max_value: fieldData.max_value || null,
        min_length: fieldData.min_length || null,
        max_length: fieldData.max_length || null,
        pattern: fieldData.pattern || null,
        active: true
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, field: data }
  } catch (error) {
    console.error('Erro ao criar custom field:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Atualizar custom field
 */
export async function updateCustomField(
  fieldId: string,
  fieldData: Partial<CustomFieldFormData>
): Promise<{ success: boolean; field?: CustomFieldDefinition; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('product_custom_fields')
      .update({
        field_label: fieldData.field_label,
        field_type: fieldData.field_type,
        field_group: fieldData.field_group,
        field_options: fieldData.field_options,
        field_placeholder: fieldData.field_placeholder,
        field_help_text: fieldData.field_help_text,
        required: fieldData.required,
        show_in_list: fieldData.show_in_list,
        show_in_filters: fieldData.show_in_filters,
        searchable: fieldData.searchable,
        display_order: fieldData.display_order,
        min_value: fieldData.min_value,
        max_value: fieldData.max_value,
        min_length: fieldData.min_length,
        max_length: fieldData.max_length,
        pattern: fieldData.pattern
      })
      .eq('id', fieldId)
      .select()
      .single()

    if (error) throw error

    return { success: true, field: data }
  } catch (error) {
    console.error('Erro ao atualizar custom field:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Desativar custom field
 */
export async function deactivateCustomField(fieldId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('product_custom_fields')
      .update({ active: false })
      .eq('id', fieldId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Erro ao desativar custom field:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Deletar custom field e todos os seus valores
 */
export async function deleteCustomField(fieldId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Os valores serão deletados automaticamente por CASCADE
    const { error } = await supabase
      .from('product_custom_fields')
      .delete()
      .eq('id', fieldId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar custom field:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// ============================================================
// CRUD para Valores de Custom Fields
// ============================================================

/**
 * Buscar valores de custom fields de um produto
 */
export async function getProductCustomFieldValues(produtoId: string): Promise<CustomFieldValue[]> {
  const { data, error } = await supabase
    .from('product_custom_field_values')
    .select('*')
    .eq('produto_id', produtoId)

  if (error) {
    console.error('Erro ao buscar valores de custom fields:', error)
    throw error
  }

  return data || []
}

/**
 * Buscar produto com custom fields formatados
 */
export async function getProductWithCustomFields(produtoId: string): Promise<Record<string, FormattedCustomField> | null> {
  try {
    // Buscar produto para pegar tenant_id
    const { data: produto } = await supabase
      .from('produtos')
      .select('tenant_id')
      .eq('id', produtoId)
      .single()

    if (!produto) return null

    // Buscar definições de campos
    const fields = await getCustomFields(produto.tenant_id, true)
    
    // Buscar valores
    const values = await getProductCustomFieldValues(produtoId)
    
    // Mapear valores para campos
    const valuesMap = new Map<string, CustomFieldValue>()
    values.forEach(v => valuesMap.set(v.custom_field_id, v))
    
    // Formatar
    const formatted: Record<string, FormattedCustomField> = {}
    
    fields.forEach(field => {
      const value = valuesMap.get(field.id)
      
      let displayValue: string | number | boolean | string[] | null | undefined = null
      
      if (value) {
        if (field.field_type === 'boolean') {
          displayValue = value.value_boolean ?? null
        } else if (field.field_type === 'number' || field.field_type === 'currency' || field.field_type === 'percentage') {
          displayValue = value.value_number ?? null
        } else if (field.field_type === 'date' || field.field_type === 'datetime') {
          displayValue = value.value_date || value.value_datetime || null
        } else if (field.field_type === 'multiselect') {
          displayValue = value.value_json as string[] || []
        } else {
          displayValue = value.value_text ?? null
        }
      }
      
      formatted[field.field_key] = {
        field_id: field.id,
        field_key: field.field_key,
        label: field.field_label,
        type: field.field_type,
        value: displayValue,
        group: field.field_group || undefined,
        required: field.required,
        options: field.field_options || undefined,
        placeholder: field.field_placeholder || undefined,
        help_text: field.field_help_text || undefined
      }
    })
    
    return formatted
  } catch (error) {
    console.error('Erro ao buscar produto com custom fields:', error)
    return null
  }
}

/**
 * Salvar/atualizar valor de custom field
 */
export async function saveCustomFieldValue(
  produtoId: string,
  customFieldId: string,
  value: string | number | boolean | string[] | null,
  fieldType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valueData: Partial<CustomFieldValue> = {
      produto_id: produtoId,
      custom_field_id: customFieldId
    }

    // Determinar qual coluna usar baseado no tipo
    if (fieldType === 'boolean') {
      valueData.value_boolean = value as boolean
    } else if (fieldType === 'number' || fieldType === 'currency' || fieldType === 'percentage') {
      valueData.value_number = value as number
    } else if (fieldType === 'date') {
      valueData.value_date = value as string
    } else if (fieldType === 'datetime') {
      valueData.value_datetime = value as string
    } else if (fieldType === 'multiselect' || Array.isArray(value)) {
      valueData.value_json = value
    } else {
      valueData.value_text = value as string
    }

    const { error } = await supabase
      .from('product_custom_field_values')
      .upsert(valueData, {
        onConflict: 'produto_id,custom_field_id'
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Erro ao salvar valor de custom field:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Salvar múltiplos custom fields de uma vez
 */
export async function saveProductCustomFields(
  produtoId: string,
  customFields: Record<string, string | number | boolean | string[] | null>,
  fieldDefinitions: CustomFieldDefinition[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const promises = Object.entries(customFields).map(([fieldKey, value]) => {
      const field = fieldDefinitions.find(f => f.field_key === fieldKey)
      if (!field) return Promise.resolve({ success: true })
      
      return saveCustomFieldValue(produtoId, field.id, value, field.field_type)
    })

    await Promise.all(promises)

    return { success: true }
  } catch (error) {
    console.error('Erro ao salvar custom fields:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Deletar valor de custom field
 */
export async function deleteCustomFieldValue(
  produtoId: string,
  customFieldId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('product_custom_field_values')
      .delete()
      .eq('produto_id', produtoId)
      .eq('custom_field_id', customFieldId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar valor de custom field:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// ============================================================
// Validação
// ============================================================

/**
 * Validar valor de custom field
 */
export function validateCustomFieldValue(
  field: CustomFieldDefinition,
  value: string | number | boolean | string[] | null | undefined
): CustomFieldValidationResult {
  const errors: string[] = []

  // Campo obrigatório
  if (field.required && (value === null || value === undefined || value === '')) {
    errors.push(`${field.field_label} é obrigatório`)
  }
  // Validações por tipo
  if (value !== null && value !== undefined && value !== '') {
    // Number, currency, percentage
    if (['number', 'currency', 'percentage'].includes(field.field_type)) {
      const numValue = Number(value)
      if (isNaN(numValue)) {
        errors.push(`${field.field_label} deve ser um número válido`)
      } else {
        if (field.min_value != null && numValue < field.min_value) {
          errors.push(`${field.field_label} deve ser maior ou igual a ${field.min_value}`)
        }
        if (field.max_value != null && numValue > field.max_value) {
          errors.push(`${field.field_label} deve ser menor ou igual a ${field.max_value}`)
        }
      }
    }

    // Text, textarea
    if (['text', 'textarea', 'email', 'url', 'phone'].includes(field.field_type)) {
      const strValue = String(value)
      if (field.min_length != null && strValue.length < field.min_length) {
        errors.push(`${field.field_label} deve ter pelo menos ${field.min_length} caracteres`)
      }
      if (field.max_length != null && strValue.length > field.max_length) {
        errors.push(`${field.field_label} deve ter no máximo ${field.max_length} caracteres`)
      }
      if (field.pattern && !new RegExp(field.pattern).test(strValue)) {
        errors.push(`${field.field_label} está em formato inválido`)
      }
    }
    // Email
    if (field.field_type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(value))) {
        errors.push(`${field.field_label} deve ser um email válido`)
      }
    }

    // URL
    if (field.field_type === 'url') {
      try {
        new URL(String(value))
      } catch {
        errors.push(`${field.field_label} deve ser uma URL válida`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// ============================================================
// Estatísticas
// ============================================================

/**
 * Obter estatísticas de uso dos custom fields
 */
export async function getCustomFieldStats(tenantId: string): Promise<CustomFieldStats[]> {
  try {
    const fields = await getCustomFields(tenantId, false)
    
    // Contar produtos do tenant
    const { count: totalProducts } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    const stats: CustomFieldStats[] = []

    for (const field of fields) {
      // Contar valores preenchidos
      const { count: filledCount } = await supabase
        .from('product_custom_field_values')
        .select('*', { count: 'exact', head: true })
        .eq('custom_field_id', field.id)

      stats.push({
        field_id: field.id,
        field_key: field.field_key,
        field_label: field.field_label,
        total_products: totalProducts || 0,
        filled_count: filledCount || 0,
        empty_count: (totalProducts || 0) - (filledCount || 0),
        fill_rate: totalProducts ? ((filledCount || 0) / totalProducts) * 100 : 0
      })
    }

    return stats
  } catch (error) {
    console.error('Erro ao buscar estatísticas de custom fields:', error)
    return []
  }
}
