import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download, Check, FileSpreadsheet } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

interface ExportLeadsModalProps {
  isOpen: boolean
  onClose: () => void
  filteredLeadsCount?: number
  allLeadsCount?: number
  filteredLeadIds?: string[]
}

interface CustomField {
  id: string
  field_name: string
  field_type: string
}

const STANDARD_FIELDS = [
  { key: 'nome', label: 'Nome', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'telefone', label: 'Telefone', default: true },
  { key: 'status', label: 'Status/Etapa', default: true },
  { key: 'valor_potencial', label: 'Valor Potencial', default: true },
  { key: 'notas', label: 'Notas', default: false },
  { key: 'created_at', label: 'Data de Criação', default: true },
  { key: 'updated_at', label: 'Data de Atualização', default: false },
]

export function ExportLeadsModal({
  isOpen,
  onClose,
  filteredLeadsCount = 0,
  allLeadsCount = 0,
  filteredLeadIds = []
}: ExportLeadsModalProps) {
  const { t } = useTranslation()
  const { tenant } = useAuthStore()

  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all')
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(STANDARD_FIELDS.filter(f => f.default).map(f => f.key))
  )
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [selectedCustomFields, setSelectedCustomFields] = useState<Set<string>>(new Set())
  const [includeCustomFields, setIncludeCustomFields] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setExportScope('all')
      setSelectedFields(new Set(STANDARD_FIELDS.filter(f => f.default).map(f => f.key)))
      setIncludeCustomFields(false)
      setSelectedCustomFields(new Set())
    }
  }, [isOpen])

  // Load custom fields
  useEffect(() => {
    const loadCustomFields = async () => {
      if (!tenant?.id || !isOpen) return

      const { data, error } = await supabase
        .from('lead_custom_fields')
        .select('id, field_name, field_type')
        .eq('tenant_id', tenant.id)
        .order('field_name')

      if (!error && data) {
        setCustomFields(data)
      }
    }

    loadCustomFields()
  }, [tenant?.id, isOpen])

  const toggleField = (key: string) => {
    const newFields = new Set(selectedFields)
    if (newFields.has(key)) {
      newFields.delete(key)
    } else {
      newFields.add(key)
    }
    setSelectedFields(newFields)
  }

  const toggleCustomField = (id: string) => {
    const newFields = new Set(selectedCustomFields)
    if (newFields.has(id)) {
      newFields.delete(id)
    } else {
      newFields.add(id)
    }
    setSelectedCustomFields(newFields)
  }

  const handleExport = async () => {
    if (!tenant?.id) return

    setExporting(true)

    try {
      // Fetch leads
      let query = supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })

      if (exportScope === 'filtered' && filteredLeadIds.length > 0) {
        query = query.in('id', filteredLeadIds)
      }

      const { data: leads, error } = await query

      if (error) throw error

      if (!leads || leads.length === 0) {
        toast.error(t('leads.exportNoLeads', 'Nenhum lead para exportar'))
        setExporting(false)
        return
      }

      // Fetch custom field values if needed
      let customFieldValues: Record<string, Record<string, string>> = {}
      if (includeCustomFields && selectedCustomFields.size > 0) {
        const leadIds = leads.map(l => l.id)
        const { data: values } = await supabase
          .from('lead_custom_field_values')
          .select('lead_id, custom_field_id, value')
          .in('lead_id', leadIds)
          .in('custom_field_id', Array.from(selectedCustomFields))

        if (values) {
          values.forEach(v => {
            if (!customFieldValues[v.lead_id]) {
              customFieldValues[v.lead_id] = {}
            }
            customFieldValues[v.lead_id][v.custom_field_id] = v.value
          })
        }
      }

      // Build CSV headers
      const headers: string[] = []
      const fieldKeys: string[] = []

      STANDARD_FIELDS.forEach(f => {
        if (selectedFields.has(f.key)) {
          headers.push(f.label)
          fieldKeys.push(f.key)
        }
      })

      if (includeCustomFields) {
        customFields.forEach(cf => {
          if (selectedCustomFields.has(cf.id)) {
            headers.push(cf.field_name)
          }
        })
      }

      // Build CSV rows
      const rows: string[][] = [headers]

      leads.forEach(lead => {
        const row: string[] = []

        fieldKeys.forEach(key => {
          let value = lead[key]
          if (value === null || value === undefined) {
            value = ''
          } else if (key === 'created_at' || key === 'updated_at') {
            value = new Date(value).toLocaleString('pt-BR')
          } else if (key === 'valor_potencial') {
            value = value ? `R$ ${Number(value).toLocaleString('pt-BR')}` : ''
          }
          // Escape quotes and wrap in quotes if contains comma
          value = String(value).replace(/"/g, '""')
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`
          }
          row.push(value)
        })

        // Add custom field values
        if (includeCustomFields) {
          customFields.forEach(cf => {
            if (selectedCustomFields.has(cf.id)) {
              let value = customFieldValues[lead.id]?.[cf.id] || ''
              value = String(value).replace(/"/g, '""')
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value}"`
              }
              row.push(value)
            }
          })
        }

        rows.push(row)
      })

      // Generate CSV content
      const csvContent = rows.map(row => row.join(',')).join('\n')
      const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

      // Download file
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(t('leads.exportSuccess', 'Leads exportados com sucesso!'))
      onClose()
    } catch (error) {
      console.error('Export error:', error)
      toast.error(t('leads.exportError', 'Erro ao exportar leads'))
    } finally {
      setExporting(false)
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
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('leads.exportTitle', 'Exportar Leads')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('leads.exportSubtitle', 'Exporte seus leads em formato CSV')}
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

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Export Scope */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('leads.exportScope', 'Escopo da exportação')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportScope('all')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    exportScope === 'all'
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {t('leads.exportAll', 'Todos os leads')}
                    </span>
                    {exportScope === 'all' && <Check className="w-5 h-5 text-cyan-500" />}
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {allLeadsCount} {t('leads.leadsTotal', 'leads no total')}
                  </span>
                </button>

                <button
                  onClick={() => setExportScope('filtered')}
                  disabled={filteredLeadsCount === 0}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    exportScope === 'filtered'
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  } ${filteredLeadsCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {t('leads.exportFiltered', 'Leads filtrados')}
                    </span>
                    {exportScope === 'filtered' && <Check className="w-5 h-5 text-cyan-500" />}
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {filteredLeadsCount} {t('leads.leadsFiltered', 'leads selecionados')}
                  </span>
                </button>
              </div>
            </div>

            {/* Standard Fields */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('leads.exportFields', 'Campos para exportar')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STANDARD_FIELDS.map(field => (
                  <button
                    key={field.key}
                    onClick={() => toggleField(field.key)}
                    className={`p-3 rounded-lg border transition-all text-left text-sm ${
                      selectedFields.has(field.key)
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedFields.has(field.key) && <Check className="w-4 h-4" />}
                      <span>{field.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCustomFields}
                    onChange={e => setIncludeCustomFields(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-white/20 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('leads.exportIncludeCustomFields', 'Incluir campos personalizados')}
                  </span>
                </label>

                {includeCustomFields && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-8">
                    {customFields.map(field => (
                      <button
                        key={field.id}
                        onClick={() => toggleCustomField(field.id)}
                        className={`p-3 rounded-lg border transition-all text-left text-sm ${
                          selectedCustomFields.has(field.id)
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {selectedCustomFields.has(field.id) && <Check className="w-4 h-4" />}
                          <span>{field.field_name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || selectedFields.size === 0}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('leads.exporting', 'Exportando...')}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {t('leads.exportDownload', 'Baixar CSV')}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
