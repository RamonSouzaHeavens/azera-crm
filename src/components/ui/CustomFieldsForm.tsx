import { useMemo, useEffect, useState } from 'react'
import type { CustomFieldDefinition } from '../../types/customFields'
import { CustomFieldInput } from './CustomFieldInput'
import { getCustomFields } from '../../services/customFieldsService'

interface CustomFieldsFormProps {
  customFields?: CustomFieldDefinition[]
  tenantId?: string
  values: Record<string, string | number | boolean | string[] | null>
  onChange: (key: string, value: string | number | boolean | string[] | null) => void
  errors?: Record<string, string>
  disabled?: boolean
  showGroups?: boolean
}

interface FieldGroup {
  name: string
  fields: CustomFieldDefinition[]
}

export function CustomFieldsForm({ 
  customFields: propCustomFields, 
  tenantId,
  values, 
  onChange, 
  errors = {}, 
  disabled = false,
  showGroups = true 
}: CustomFieldsFormProps) {
  const [loadedFields, setLoadedFields] = useState<CustomFieldDefinition[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Carrega campos personalizados se tenantId fornecido e propCustomFields não fornecido
  useEffect(() => {
    if (propCustomFields || !tenantId) return

    const loadFields = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const fields = await getCustomFields(tenantId)
        setLoadedFields(fields)
      } catch (error) {
        console.error('Erro ao carregar campos personalizados:', error)
        setLoadError('Erro ao carregar campos personalizados')
        setLoadedFields([])
      } finally {
        setIsLoading(false)
      }
    }

    loadFields()
  }, [tenantId, propCustomFields])

  // Use provided fields or loaded fields
  const customFields = useMemo(() => propCustomFields || loadedFields || [], [propCustomFields, loadedFields])

  // Agrupar campos
  const groupedFields = useMemo<FieldGroup[]>(() => {
    if (!customFields || customFields.length === 0) {
      return []
    }

    if (!showGroups) {
      return [{
        name: 'Campos Personalizados',
        fields: customFields
      }]
    }

    const groups = new Map<string, CustomFieldDefinition[]>()
    
    customFields.forEach(field => {
      const groupName = field.field_group || 'Outros'
      if (!groups.has(groupName)) {
        groups.set(groupName, [])
      }
      groups.get(groupName)!.push(field)
    })
    
    // Ordenar campos dentro de cada grupo
    groups.forEach(fields => {
      fields.sort((a, b) => a.display_order - b.display_order)
    })
    
    return Array.from(groups.entries())
      .map(([name, fields]) => ({ name, fields }))
      .sort((a, b) => {
        // Grupos específicos vêm primeiro
        const orderMap: Record<string, number> = {
          'Informações Básicas': 1,
          'Características': 2,
          'Localização': 3,
          'Preços': 4,
          'Empreendimento': 5,
        }
        const aOrder = orderMap[a.name] || 99
        const bOrder = orderMap[b.name] || 99
        return aOrder - bOrder
      })
  }, [customFields, showGroups])

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
        <p className="text-slate-400 mt-2">Carregando campos personalizados...</p>
      </div>
    )
  }

  // Erro ao carregar
  if (loadError) {
    return (
      <div className="p-8 text-center rounded-2xl bg-red-500/10 border border-red-500/20">
        <p className="text-red-400">{loadError}</p>
      </div>
    )
  }

  // Nenhum campo configurado
  if (customFields.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10">
        <p className="text-slate-400">
          Nenhum campo personalizado configurado.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Configure campos personalizados nas configurações do sistema.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groupedFields.map((group) => (
        <div key={group.name} className="space-y-4">
          {/* Group Header */}
          {showGroups && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                {group.name}
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          )}

          {/* Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {group.fields.map((field) => (
              <div 
                key={field.id}
                className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}
              >
                <CustomFieldInput
                  field={field}
                  value={values[field.field_key]}
                  onChange={(value) => onChange(field.field_key, value)}
                  error={errors[field.field_key]}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Variação compacta para filtros
interface CustomFieldsFiltersProps {
  customFields: CustomFieldDefinition[]
  values: Record<string, string | number | boolean | string[] | null>
  onChange: (key: string, value: string | number | boolean | string[] | null) => void
}

export function CustomFieldsFilters({ customFields, values, onChange }: CustomFieldsFiltersProps) {
  const filterFields = customFields.filter(f => f.show_in_filters)

  if (filterFields.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-300">Filtros Personalizados</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filterFields.map((field) => (
          <CustomFieldInput
            key={field.id}
            field={field}
            value={values[field.field_key]}
            onChange={(value) => onChange(field.field_key, value)}
          />
        ))}
      </div>
    </div>
  )
}

// Display value (não editável) - REMOVIDO
// Esta função será re-implementada quando FormattedCustomField type estiver disponível

// Grid de valores (para cards/listagem) - REMOVIDO  
// Esta função será re-implementada quando FormattedCustomField type estiver disponível

