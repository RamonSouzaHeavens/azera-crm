// =====================================================
// TYPES: Custom Fields para Produtos Universais
// =====================================================

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'tags'
  | 'url'
  | 'email'
  | 'phone'
  | 'file'
  | 'image'

export interface CustomFieldDefinition {
  id: string
  tenant_id: string
  field_key: string
  field_label: string
  field_type: CustomFieldType
  field_options?: string[] | null // Para select/multiselect
  field_default?: string | null
  field_placeholder?: string | null
  field_help_text?: string | null

  // Validações
  required: boolean
  min_value?: number | null
  max_value?: number | null
  min_length?: number | null
  max_length?: number | null
  pattern?: string | null // Regex

  // Organização
  field_group?: string | null
  display_order: number

  // Visibilidade
  show_in_list: boolean
  show_in_filters: boolean
  searchable: boolean

  active: boolean
  created_at: string
  updated_at: string
}

export interface CustomFieldValue {
  id: string
  produto_id: string
  custom_field_id: string
  value_text?: string | null
  value_number?: number | null
  value_boolean?: boolean | null
  value_date?: string | null
  value_datetime?: string | null
  value_json?: unknown | null
  created_at: string
  updated_at: string
}

// Helper type para valores formatados
export interface FormattedCustomField {
  field_id: string
  field_key: string
  label: string
  type: CustomFieldType
  value: string | number | boolean | string[] | null | undefined
  group?: string
  required: boolean
  options?: string[]
  placeholder?: string
  help_text?: string
}

// Produto Universal (substituir antigo ImovelRow/ProdutoRow)
export interface ProdutoUniversal {
  // Campos padrão (sempre presentes)
  id: string
  tenant_id: string
  equipe_id?: string | null

  // Informações básicas
  nome: string
  descricao?: string | null
  categoria: string // 'imovel', 'produto', 'servico', etc
  subcategoria?: string | null
  codigo_referencia?: string | null

  // Preço e estoque
  preco?: number | null
  preco_custo?: number | null
  unidade_medida: string
  quantidade_estoque?: number | null

  // Status e destaque
  ativo: boolean
  destaque: boolean

  // Mídia
  capa_url?: string | null
  galeria_urls?: string[] | null
  arquivo_urls?: string[] | null

  // Tags e metadados
  tags?: string[] | null

  // Timestamps
  created_at: string
  updated_at: string

  // Campos personalizados (carregados dinamicamente)
  custom_fields?: Record<string, FormattedCustomField>

  // Relacionamento
  equipe?: {
    id: string
    nome: string
  } | null
}

// Form para criar/editar produto
export interface ProdutoFormData {
  // Campos padrão
  nome: string
  descricao?: string
  categoria: string
  subcategoria?: string
  codigo_referencia?: string
  preco?: number | string
  preco_custo?: number | string
  unidade_medida?: string
  quantidade_estoque?: number | string
  ativo: boolean
  destaque: boolean
  tags?: string
  capa_url?: string | null
  galeria_urls?: string[]
  arquivo_urls?: string[]

  // Custom fields (chave => valor)
  custom_fields?: Record<string, string | number | boolean | string[] | null>
}

// Filtros para busca de produtos
export interface ProdutoFilters {
  categoria?: string
  subcategoria?: string
  ativo?: boolean
  destaque?: boolean
  preco_min?: number
  preco_max?: number
  tags?: string[]
  search?: string

  // Custom field filters (chave => valor)
  custom_filters?: Record<string, string | number | boolean | string[]>
}

// Response da API com custom fields
export interface ProdutoWithCustomFields extends ProdutoUniversal {
  custom_fields: Record<string, FormattedCustomField>
}

// Para edição de definições de custom fields
export interface CustomFieldFormData {
  field_key: string
  field_label: string
  field_type: CustomFieldType
  field_group?: string
  display_order?: number
  required?: boolean
  show_in_list?: boolean
  show_in_filters?: boolean
  searchable?: boolean
  field_options?: string[]
  field_placeholder?: string
  field_help_text?: string
  min_value?: number
  max_value?: number
  min_length?: number
  max_length?: number
  pattern?: string
}

// Agrupamento de campos para renderização
export interface CustomFieldGroup {
  group_name: string
  fields: CustomFieldDefinition[]
}

// Validação de campo customizado
export interface CustomFieldValidationResult {
  valid: boolean
  errors: string[]
}

// Estatísticas de uso de custom fields
export interface CustomFieldStats {
  field_id: string
  field_key: string
  field_label: string
  total_products: number
  filled_count: number
  empty_count: number
  fill_rate: number
  unique_values?: number
}
