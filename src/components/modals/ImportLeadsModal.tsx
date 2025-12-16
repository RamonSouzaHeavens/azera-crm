import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Upload, Check, AlertCircle, ChevronRight, ChevronLeft, FileSpreadsheet, Plus, Trash2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

interface ImportLeadsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  pipelineStages: Array<{ key: string; label: string }>
  existingCustomFields?: Array<{ id: string; field_name: string; field_type: string; options?: string[] }>
}

interface CustomField {
  id: string
  field_name: string
  field_type: string
}

interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
}

interface FieldMapping {
  csvColumn: string
  crmField: string | null
  isUnknown: boolean
  action: 'map' | 'ignore' | 'create'
  fieldType: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'tags' | 'boolean'
  sampleValues: string[]
}

const CRM_FIELDS = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'telefone', label: 'Telefone', required: false },
  { key: 'status', label: 'Status/Etapa', required: false },
  { key: 'valor_potencial', label: 'Valor Potencial', required: false },
  { key: 'notas', label: 'Notas', required: false },
]

// Simple CSV parser
function parseCSV(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Detect field type from sample values
function detectFieldType(values: string[]): 'text' | 'number' | 'date' | 'boolean' {
  const nonEmpty = values.filter(v => v.trim())
  if (nonEmpty.length === 0) return 'text'

  const allNumbers = nonEmpty.every(v => !isNaN(parseFloat(v.replace(/[R$,.\s]/g, '').replace(',', '.'))))
  if (allNumbers) return 'number'

  const datePatterns = [/^\d{1,2}\/\d{1,2}\/\d{2,4}$/, /^\d{4}-\d{2}-\d{2}$/, /^\d{1,2}-\d{1,2}-\d{2,4}$/]
  const allDates = nonEmpty.every(v => datePatterns.some(p => p.test(v)))
  if (allDates) return 'date'

  const booleanValues = ['sim', 'não', 'nao', 'yes', 'no', 'true', 'false', '1', '0', 's', 'n']
  const allBooleans = nonEmpty.every(v => booleanValues.includes(v.toLowerCase()))
  if (allBooleans) return 'boolean'

  return 'text'
}

export function ImportLeadsModal({
  isOpen,
  onClose,
  onSuccess,
  pipelineStages,
  existingCustomFields: existingCustomFieldsProp
}: ImportLeadsModalProps) {
  const { t } = useTranslation()
  const { tenant } = useAuthStore()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setParsedCSV(null)
      setFieldMappings([])
    }
  }, [isOpen])

  // Load existing custom fields (use prop if provided, otherwise load from DB)
  useEffect(() => {
    if (existingCustomFieldsProp && existingCustomFieldsProp.length > 0) {
      setCustomFields(existingCustomFieldsProp)
      return
    }

    const loadCustomFields = async () => {
      if (!tenant?.id || !isOpen) return
      const { data } = await supabase
        .from('lead_custom_fields')
        .select('id, field_name, field_type')
        .eq('tenant_id', tenant.id)
        .order('field_name')
      if (data) setCustomFields(data)
    }
    loadCustomFields()
  }, [tenant?.id, isOpen, existingCustomFieldsProp])

  // Computed values
  const unknownFields = useMemo(() => fieldMappings.filter(m => m.isUnknown), [fieldMappings])
  const fieldsToCreate = useMemo(() => fieldMappings.filter(m => m.action === 'create').length, [fieldMappings])
  const leadsToImport = parsedCSV?.rows.length || 0

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error(t('leads.importInvalidFile', 'Por favor, selecione um arquivo CSV'))
      return
    }

    try {
      const text = await file.text()
      const parsed = parseCSV(text)

      if (parsed.headers.length === 0) {
        toast.error(t('leads.importEmptyFile', 'O arquivo está vazio ou inválido'))
        return
      }

      setParsedCSV(parsed)

      // Auto-map fields and identify unknowns
      const mappings: FieldMapping[] = parsed.headers.map(header => {
        const headerLower = header.toLowerCase().trim()
        const sampleValues = parsed.rows.slice(0, 10).map(row => row[header]).filter(Boolean)

        // Try to match with CRM fields
        const crmMatch = CRM_FIELDS.find(f => {
          const fieldLower = f.key.toLowerCase()
          const labelLower = f.label.toLowerCase()
          return headerLower === fieldLower || headerLower === labelLower ||
            headerLower.includes(fieldLower) || fieldLower.includes(headerLower)
        })

        // Try to match with existing custom fields
        const customMatch = customFields.find((cf: CustomField) => {
          const cfLower = cf.field_name.toLowerCase()
          return headerLower === cfLower || headerLower.includes(cfLower) || cfLower.includes(headerLower)
        })

        const isUnknown = !crmMatch && !customMatch
        const detectedType = detectFieldType(sampleValues)

        return {
          csvColumn: header,
          crmField: crmMatch?.key || (customMatch ? `custom:${customMatch.id}` : null),
          isUnknown,
          action: isUnknown ? 'create' : 'map', // Default to create for unknowns
          fieldType: detectedType,
          sampleValues: sampleValues.slice(0, 3)
        }
      })

      setFieldMappings(mappings)
      setStep(2)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      toast.error(t('leads.importParseError', 'Erro ao processar o arquivo'))
    }
  }, [customFields, t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const updateMapping = (csvColumn: string, updates: Partial<FieldMapping>) => {
    setFieldMappings(prev => prev.map(m =>
      m.csvColumn === csvColumn ? { ...m, ...updates } : m
    ))
  }

  const handleImport = async () => {
    if (!tenant?.id || !parsedCSV) return
    setImporting(true)

    try {
      // 1. Create new custom fields if needed
      const fieldsToCreateList = fieldMappings.filter(f => f.action === 'create')
      const newCustomFieldIds: Record<string, string> = {}

      for (const field of fieldsToCreateList) {
        const { data, error } = await supabase
          .from('lead_custom_fields')
          .insert({
            tenant_id: tenant.id,
            field_name: field.csvColumn,
            field_type: field.fieldType,
            options: [],
            required: false
          })
          .select('id')
          .single()

        if (!error && data) {
          newCustomFieldIds[field.csvColumn] = data.id
        }
      }

      // 2. Import leads
      let successCount = 0
      let errorCount = 0

      for (const row of parsedCSV.rows) {
        const leadData: Record<string, unknown> = {
          tenant_id: tenant.id,
          status: pipelineStages[0]?.key || 'lead'
        }
        const customFieldValues: Record<string, string> = {}

        for (const mapping of fieldMappings) {
          const value = row[mapping.csvColumn]
          if (!value) continue

          if (mapping.action === 'ignore') continue

          if (mapping.action === 'create') {
            const newFieldId = newCustomFieldIds[mapping.csvColumn]
            if (newFieldId) customFieldValues[newFieldId] = value
            continue
          }

          if (mapping.crmField?.startsWith('custom:')) {
            const customFieldId = mapping.crmField.replace('custom:', '')
            customFieldValues[customFieldId] = value
          } else if (mapping.crmField) {
            if (mapping.crmField === 'valor_potencial') {
              const numValue = parseFloat(value.replace(/[R$,.\s]/g, '').replace(',', '.'))
              leadData[mapping.crmField] = isNaN(numValue) ? null : numValue
            } else {
              leadData[mapping.crmField] = value
            }
          }
        }

        if (!leadData.nome) {
          errorCount++
          continue
        }

        let leadId: string | null = null

        // Check if lead with same email already exists (if email is provided)
        if (leadData.email) {
          const { data: existingLead } = await supabase
            .from('clientes')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('email', leadData.email)
            .maybeSingle()

          if (existingLead) {
            // Update existing lead
            const { error: updateError } = await supabase
              .from('clientes')
              .update(leadData)
              .eq('id', existingLead.id)

            if (updateError) {
              console.error('Update error:', updateError)
              errorCount++
              continue
            }
            leadId = existingLead.id
          }
        }

        // Check by phone if no existing lead found and phone is provided
        if (!leadId && leadData.telefone) {
          const { data: existingLead } = await supabase
            .from('clientes')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('telefone', leadData.telefone)
            .maybeSingle()

          if (existingLead) {
            const { error: updateError } = await supabase
              .from('clientes')
              .update(leadData)
              .eq('id', existingLead.id)

            if (updateError) {
              console.error('Update error:', updateError)
              errorCount++
              continue
            }
            leadId = existingLead.id
          }
        }

        // Insert new lead if not found
        if (!leadId) {
          const { data: newLead, error: leadError } = await supabase
            .from('clientes')
            .insert(leadData)
            .select('id')
            .single()

          if (leadError) {
            console.error('Insert error:', leadError)
            errorCount++
            continue
          }
          leadId = newLead?.id || null
        }

        if (!leadId) {
          errorCount++
          continue
        }

        if (leadId && Object.keys(customFieldValues).length > 0) {
          const valuesToInsert = Object.entries(customFieldValues).map(([fieldId, value]) => ({
            lead_id: leadId,
            custom_field_id: fieldId,
            value
          }))
          await supabase.from('lead_custom_field_values').insert(valuesToInsert)
        }

        successCount++
      }

      if (errorCount > 0 && successCount > 0) {
        toast.success(t('leads.importPartialSuccess', '{{success}} leads importados, {{failed}} com erro')
          .replace('{{success}}', String(successCount))
          .replace('{{failed}}', String(errorCount)))
      } else if (successCount > 0) {
        toast.success(t('leads.importSuccess', '{{count}} leads importados com sucesso!')
          .replace('{{count}}', String(successCount)))
      } else {
        toast.error(t('leads.importError', 'Erro ao importar leads'))
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Import error:', error)
      toast.error(t('leads.importError', 'Erro ao importar leads'))
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('leads.importTitle', 'Importar Leads')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('leads.importSubtitle', 'Importe leads de outros CRMs via CSV')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Progress Steps - Simplified to 3 steps */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <div className="flex items-center justify-center max-w-sm mx-auto">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-all ${step >= s ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                    }`}>
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-0.5 mx-2 transition-all ${step > s ? 'bg-green-500' : 'bg-slate-200 dark:bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-12 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{t('leads.importStep1', 'Upload')}</span>
              <span>{t('leads.importStep2Mapping', 'Mapear e Configurar')}</span>
              <span>{t('leads.importStep4', 'Importar')}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
            {/* Step 1: Upload */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Adaptive Technology Banner */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-4">
                  <div className="flex gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-indigo-800 dark:text-indigo-300">
                      <p className="font-semibold mb-1">{t('leads.importAdaptiveTitle', 'Tecnologia Adaptativa')}</p>
                      <p>{t('leads.importAdaptiveText', 'Não se preocupe com campos diferentes! Nossa tecnologia detecta automaticamente todos os campos do seu arquivo e permite criar novos campos personalizados para preservar todas as informações.')}</p>
                    </div>
                  </div>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragOver
                    ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                    : 'border-slate-300 dark:border-white/20 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-500/5'
                    }`}
                >
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    {t('leads.importDragDrop', 'Arraste um arquivo CSV aqui')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {t('leads.importOr', 'ou')}
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    {t('leads.importSelectFile', 'Selecionar arquivo')}
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelect(file)
                      }}
                    />
                  </label>
                </div>

                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-300">
                      <p className="font-medium mb-1">{t('leads.importTip', 'Dica')}</p>
                      <p>{t('leads.importTipText', 'O arquivo CSV deve ter os cabeçalhos na primeira linha. Campos como Nome, Email e Telefone são detectados automaticamente.')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Mapping + Unknown Fields Configuration */}
            {step === 2 && parsedCSV && (
              <div className="space-y-6">
                {/* Unknown Fields Alert */}
                {unknownFields.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                    <div className="flex gap-3">
                      <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                          {t('leads.importDetectedNewFields', 'Identificamos {{count}} campos que não existem no seu CRM:')
                            .replace('{{count}}', String(unknownFields.length))}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {unknownFields.map(f => (
                            <span key={f.csvColumn} className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md text-xs font-medium">
                              {f.csvColumn}
                            </span>
                          ))}
                        </div>
                        <p className="text-amber-700 dark:text-amber-400">
                          {t('leads.importNewFieldsExplanation', 'Configure abaixo se deseja criar esses campos como personalizados ou ignorá-los.')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    {t('leads.importMappingTitle', 'Mapeamento de Campos')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('leads.importMappingSubtitle', 'Associe as colunas do CSV aos campos do CRM')}
                  </p>
                </div>

                {/* Preview Table */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t('leads.importPreview', 'Pré-visualização')} ({parsedCSV.rows.length} {t('leads.leadsTotal', 'leads')})
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10">
                          {parsedCSV.headers.slice(0, 6).map(h => (
                            <th key={h} className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                              {h}
                            </th>
                          ))}
                          {parsedCSV.headers.length > 6 && (
                            <th className="text-left py-2 px-3 font-medium text-slate-400">...</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCSV.rows.slice(0, 2).map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-white/5">
                            {parsedCSV.headers.slice(0, 6).map(h => (
                              <td key={h} className="py-2 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                                {row[h] || '-'}
                              </td>
                            ))}
                            {parsedCSV.headers.length > 6 && (
                              <td className="py-2 px-3 text-slate-400">...</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recognized Fields */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t('leads.importRecognizedFields', 'Campos Reconhecidos')}
                  </h4>
                  {fieldMappings.filter(m => !m.isUnknown).map(mapping => (
                    <div key={mapping.csvColumn} className="flex items-center gap-4 p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{mapping.csvColumn}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <select
                          value={mapping.crmField || ''}
                          onChange={e => updateMapping(mapping.csvColumn, {
                            crmField: e.target.value || null,
                            action: e.target.value ? 'map' : 'ignore'
                          })}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                        >
                          <option value="">{t('leads.doNotImport', 'Não importar')}</option>
                          <optgroup label={t('leads.standardFields', 'Campos Padrão')}>
                            {CRM_FIELDS.map(f => (
                              <option key={f.key} value={f.key}>{f.label} {f.required && '*'}</option>
                            ))}
                          </optgroup>
                          {customFields.length > 0 && (
                            <optgroup label={t('leads.customFields', 'Campos Personalizados')}>
                              {customFields.map((cf: CustomField) => (
                                <option key={cf.id} value={`custom:${cf.id}`}>{cf.field_name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unknown Fields Configuration */}
                {unknownFields.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      {t('leads.importNewFieldsConfig', 'Novos Campos - Configure abaixo')}
                    </h4>
                    {unknownFields.map(field => (
                      <div key={field.csvColumn} className="p-4 bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{field.csvColumn}</p>
                            {field.sampleValues.length > 0 && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {t('leads.importSampleValues', 'Exemplos')}: {field.sampleValues.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => updateMapping(field.csvColumn, { action: 'create' })}
                            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-sm transition-all ${field.action === 'create'
                              ? 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300'
                              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-green-300'
                              }`}
                          >
                            <Plus className="w-4 h-4" />
                            {t('leads.importCreateField', 'Criar campo')}
                          </button>

                          <button
                            onClick={() => updateMapping(field.csvColumn, { action: 'ignore' })}
                            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-sm transition-all ${field.action === 'ignore'
                              ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'
                              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-red-300'
                              }`}
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('leads.importIgnoreField', 'Ignorar')}
                          </button>
                        </div>

                        {field.action === 'create' && (
                          <div className="flex items-center gap-3">
                            <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {t('leads.importFieldType', 'Tipo')}:
                            </label>
                            <select
                              value={field.fieldType}
                              onChange={e => updateMapping(field.csvColumn, { fieldType: e.target.value as FieldMapping['fieldType'] })}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                            >
                              <option value="text">{t('leads.fieldTypeText', 'Texto')}</option>
                              <option value="number">{t('leads.fieldTypeNumber', 'Número')}</option>
                              <option value="date">{t('leads.fieldTypeDate', 'Data')}</option>
                              <option value="select">{t('leads.fieldTypeSelect', 'Seleção Única')}</option>
                              <option value="multiselect">{t('leads.fieldTypeMultiselect', 'Seleção Múltipla')}</option>
                              <option value="tags">{t('leads.fieldTypeTags', 'Tags')}</option>
                              <option value="boolean">{t('leads.fieldTypeBoolean', 'Sim/Não')}</option>
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Summary */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    {t('leads.importSummary', 'Resumo da Importação')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('leads.importReview', 'Revise as informações abaixo antes de confirmar.')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl text-center">
                    <p className="text-4xl font-bold text-green-600 dark:text-green-400">{leadsToImport}</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {t('leads.importLeadsCount', 'leads serão importados')}
                    </p>
                  </div>

                  <div className="p-6 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-center">
                    <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{fieldsToCreate}</p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                      {t('leads.importNewFieldsCount', 'novos campos serão criados')}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t('leads.importMappedFields', 'Campos que serão importados')}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {fieldMappings.filter(m => m.action === 'map' && m.crmField).map(m => (
                      <span key={m.csvColumn} className="px-3 py-1 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-full text-xs text-slate-700 dark:text-slate-300">
                        {m.csvColumn} → {
                          m.crmField?.startsWith('custom:')
                            ? customFields.find((cf: CustomField) => cf.id === m.crmField?.replace('custom:', ''))?.field_name
                            : CRM_FIELDS.find(f => f.key === m.crmField)?.label
                        }
                      </span>
                    ))}
                    {fieldMappings.filter(m => m.action === 'create').map(m => (
                      <span key={m.csvColumn} className="px-3 py-1 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-full text-xs text-green-700 dark:text-green-300">
                        {m.csvColumn} (novo)
                      </span>
                    ))}
                  </div>
                </div>

                {fieldMappings.some(m => m.action === 'ignore') && (
                  <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                      {t('leads.importIgnoredFields', 'Campos que serão ignorados')}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {fieldMappings.filter(m => m.action === 'ignore' || (!m.crmField && m.action !== 'create')).map(m => (
                        <span key={m.csvColumn} className="px-3 py-1 bg-slate-200 dark:bg-white/10 rounded-full text-xs text-slate-500 dark:text-slate-400 line-through">
                          {m.csvColumn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <button
              onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : onClose()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? t('common.cancel', 'Cancelar') : t('common.back', 'Voltar')}
            </button>

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={!fieldMappings.some(m => m.crmField === 'nome' || (m.action === 'map' && m.crmField))}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.next', 'Próximo')}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('leads.importing', 'Importando...')}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {t('leads.importConfirm', 'Confirmar Importação')}
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
