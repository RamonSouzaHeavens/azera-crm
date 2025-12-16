import { useMemo } from 'react'
import type { CustomFieldDefinition } from '../../types/customFields'
import {
  Type,
  Hash,
  DollarSign,
  Percent,
  Calendar,
  Clock,
  ToggleLeft,
  ChevronDown,
  Link as LinkIcon,
  Mail,
  Phone,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Tags
} from 'lucide-react'

interface CustomFieldInputProps {
  field: CustomFieldDefinition
  value: string | number | boolean | string[] | null | undefined
  onChange: (value: string | number | boolean | string[] | null) => void
  error?: string
  disabled?: boolean
}

export function CustomFieldInput({ field, value, onChange, error, disabled }: CustomFieldInputProps) {
  // Icon mapping
  const icon = useMemo(() => {
    const iconClass = "w-4 h-4 text-slate-400"
    switch (field.field_type) {
      case 'text':
      case 'textarea':
        return <Type className={iconClass} />
      case 'number':
        return <Hash className={iconClass} />
      case 'currency':
        return <DollarSign className={iconClass} />
      case 'percentage':
        return <Percent className={iconClass} />
      case 'date':
        return <Calendar className={iconClass} />
      case 'datetime':
        return <Clock className={iconClass} />
      case 'boolean':
        return <ToggleLeft className={iconClass} />
      case 'select':
      case 'multiselect':
        return <ChevronDown className={iconClass} />
      case 'tags':
        return <Tags className={iconClass} />
      case 'url':
        return <LinkIcon className={iconClass} />
      case 'email':
        return <Mail className={iconClass} />
      case 'phone':
        return <Phone className={iconClass} />
      case 'file':
        return <FileText className={iconClass} />
      case 'image':
        return <ImageIcon className={iconClass} />
      default:
        return <Type className={iconClass} />
    }
  }, [field.field_type])

  const baseInputClass = `w-full px-4 py-2.5 rounded-xl bg-white/5 border text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
    error
      ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
      : 'border-white/10 focus:border-cyan-500 focus:ring-cyan-500/20'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`

  const renderInput = () => {
    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <input
            type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={field.field_placeholder || undefined}
            disabled={disabled}
            className={baseInputClass}
            pattern={field.pattern || undefined}
            minLength={field.min_length || undefined}
            maxLength={field.max_length || undefined}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={field.field_placeholder || undefined}
            disabled={disabled}
            className={`${baseInputClass} min-h-[100px] resize-none`}
            minLength={field.min_length || undefined}
            maxLength={field.max_length || undefined}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.field_placeholder || undefined}
            disabled={disabled}
            className={baseInputClass}
            min={field.min_value || undefined}
            max={field.max_value || undefined}
          />
        )

      case 'currency':
        return (
          <input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.field_placeholder || 'R$ 0,00'}
            disabled={disabled}
            className={baseInputClass}
            step="0.01"
            min={field.min_value || 0}
          />
        )

      case 'percentage':
        return (
          <div className="relative">
            <input
              type="number"
              value={(value as number) || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              placeholder={field.field_placeholder || '0'}
              disabled={disabled}
              className={baseInputClass}
              min={0}
              max={100}
              step="0.1"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
          </div>
        )

      case 'date':
        return (
          <input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className={baseInputClass}
          />
        )

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className={baseInputClass}
          />
        )

      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={(value as boolean) || false}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded border-2 border-white/30 bg-slate-800/80 checked:bg-cyan-500 checked:border-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-slate-300">
              {field.field_placeholder || 'Sim'}
            </span>
          </label>
        )

      case 'select':
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className={baseInputClass}
          >
            <option value="">Selecione...</option>
            {field.field_options?.map((option) => (
              <option key={option} value={option} className="bg-slate-800">
                {option}
              </option>
            ))}
          </select>
        )

      case 'multiselect': {
        const selectedValues = (value as string[]) || []
        return (
          <div className="space-y-2">
            {field.field_options?.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedValues, option])
                    } else {
                      onChange(selectedValues.filter(v => v !== option))
                    }
                  }}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-2 border-white/30 bg-slate-800/80 checked:bg-cyan-500 checked:border-cyan-400"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        )
      }

      case 'tags': {
        const tags = (value as string[]) || []
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-md text-sm">
                  {tag}
                  <button
                    type="button"
                    onClick={() => {
                      const newTags = tags.filter((_, i) => i !== idx)
                      onChange(newTags.length ? newTags : null)
                    }}
                    disabled={disabled}
                    className="hover:text-emerald-100 disabled:opacity-50"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder={field.field_placeholder || "Digite e pressione Enter..."}
              disabled={disabled}
              className={baseInputClass}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const input = e.currentTarget
                  const newTag = input.value.trim()
                  if (newTag && !tags.includes(newTag)) {
                    onChange([...tags, newTag])
                    input.value = ''
                  }
                }
              }}
            />
          </div>
        )
      }

      default:
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={field.field_placeholder || undefined}
            disabled={disabled}
            className={baseInputClass}
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
        {icon}
        {field.field_label}
        {field.required && <span className="text-rose-400">*</span>}
      </label>

      {/* Input */}
      {renderInput()}

      {/* Help text */}
      {field.field_help_text && !error && (
        <p className="text-xs text-slate-400 flex items-start gap-1">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {field.field_help_text}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-400 flex items-start gap-1">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
