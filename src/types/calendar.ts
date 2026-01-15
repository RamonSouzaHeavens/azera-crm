// ============================================================================
// TIPOS DO CALENDÁRIO
// ============================================================================

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled'
export type EventSource = 'manual' | 'whatsapp' | 'google' | 'task'
export type SyncStatus = 'local' | 'synced' | 'pending' | 'error'
export type SyncDirection = 'to_google' | 'from_google' | 'both'
export type CalendarProvider = 'google' | 'outlook' | 'apple'
export type IntegrationStatus = 'connected' | 'disconnected' | 'error'

export type ReminderType = 'whatsapp' | 'push' | 'email'

export interface Reminder {
  type: ReminderType
  minutes_before: number
}

// ============================================================================
// EVENTO DO CALENDÁRIO
// ============================================================================

export interface CalendarEvent {
  id: string
  tenant_id: string
  user_id: string | null

  // Informações do evento
  title: string
  description: string | null
  location: string | null

  // Datas
  start_date: string // ISO string
  end_date: string | null
  all_day: boolean

  // Recorrência
  recurrence_rule: string | null
  recurrence_end: string | null
  parent_event_id: string | null

  // Relacionamentos
  tarefa_id: string | null
  cliente_id: string | null

  // Lembretes
  reminders: Reminder[]

  // Sincronização Google
  google_event_id: string | null
  google_calendar_id: string | null
  last_synced_at: string | null
  sync_status: SyncStatus

  // Metadados
  color: string
  status: EventStatus
  source: EventSource
  source_message: string | null

  created_at: string
  updated_at: string

  // Relacionamentos expandidos (quando fazemos join)
  tarefa?: {
    id: string
    titulo: string
    status: string
  } | null
  cliente?: {
    id: string
    nome: string
  } | null
  user?: {
    id: string
    display_name: string | null
  } | null
}

// ============================================================================
// INTEGRAÇÃO DE CALENDÁRIO
// ============================================================================

export interface CalendarIntegration {
  id: string
  tenant_id: string
  user_id: string

  provider: CalendarProvider

  // Tokens (não expostos no frontend normalmente)
  access_token?: string
  refresh_token?: string
  token_expires_at: string | null

  // Configurações
  calendar_id: string | null
  calendar_name: string | null
  sync_enabled: boolean
  sync_direction: SyncDirection
  last_sync_at: string | null

  // Status
  status: IntegrationStatus
  error_message: string | null

  created_at: string
  updated_at: string
}

// ============================================================================
// FORMULÁRIOS E INPUTS
// ============================================================================

export interface CreateEventInput {
  title: string
  description?: string
  location?: string
  start_date: string
  end_date?: string
  all_day?: boolean
  recurrence_rule?: string
  tarefa_id?: string
  cliente_id?: string
  reminders?: Reminder[]
  color?: string
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus
}

// ============================================================================
// FILTROS E QUERIES
// ============================================================================

export interface EventFilters {
  startDate?: string
  endDate?: string
  status?: EventStatus | 'all'
  source?: EventSource | 'all'
  userId?: string | 'all'
  clienteId?: string
  tarefaId?: string
  searchTerm?: string
}

// ============================================================================
// VISUALIZAÇÕES
// ============================================================================

export type CalendarView = 'month' | 'week' | 'day' | 'list'

export interface CalendarViewState {
  view: CalendarView
  currentDate: Date
  selectedDate: Date | null
  selectedEvent: CalendarEvent | null
}

// ============================================================================
// PROCESSAMENTO DE MENSAGENS WHATSAPP
// ============================================================================

export type AgendaAction =
  | 'create_event'
  | 'create_task'
  | 'list_events'
  | 'cancel_event'
  | 'reschedule_event'
  | 'unknown'

export interface ParsedAgendaCommand {
  action: AgendaAction
  confidence: number // 0-1
  data: {
    title?: string
    date?: string
    time?: string
    location?: string
    duration_minutes?: number
    reminder_minutes?: number
  }
  original_message: string
}

// ============================================================================
// GOOGLE CALENDAR
// ============================================================================

export interface GoogleCalendar {
  id: string
  summary: string
  description?: string
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
}

export interface GoogleEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  status: 'confirmed' | 'tentative' | 'cancelled'
  recurrence?: string[]
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
}

// ============================================================================
// HELPERS
// ============================================================================

export const EVENT_COLORS = [
  { value: '#3B82F6', label: 'Azul', class: 'bg-blue-500' },
  { value: '#10B981', label: 'Verde', class: 'bg-emerald-500' },
  { value: '#F59E0B', label: 'Amarelo', class: 'bg-amber-500' },
  { value: '#EF4444', label: 'Vermelho', class: 'bg-red-500' },
  { value: '#8B5CF6', label: 'Roxo', class: 'bg-violet-500' },
  { value: '#EC4899', label: 'Rosa', class: 'bg-pink-500' },
  { value: '#6B7280', label: 'Cinza', class: 'bg-gray-500' },
  { value: '#06B6D4', label: 'Ciano', class: 'bg-cyan-500' },
] as const

export const REMINDER_OPTIONS = [
  { value: 0, label: 'No momento do evento' },
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 dia antes' },
  { value: 2880, label: '2 dias antes' },
] as const
