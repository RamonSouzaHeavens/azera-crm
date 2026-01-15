// ============================================================================
// SERVIÇO DE AGENDA/CALENDÁRIO
// ============================================================================

import { supabase } from '../lib/supabase'
import type {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  EventFilters,
  CalendarIntegration,
  Reminder
} from '../types/calendar'

// ============================================================================
// EVENTOS DO CALENDÁRIO
// ============================================================================

/**
 * Buscar eventos do calendário com filtros
 */
export async function getCalendarEvents(
  tenantId: string,
  filters?: EventFilters
): Promise<CalendarEvent[]> {
  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      tarefa:tarefas(id, titulo, status),
      cliente:clientes(id, nome)
    `)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .order('start_date', { ascending: true })

  // Filtrar por período
  if (filters?.startDate) {
    query = query.gte('start_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('start_date', filters.endDate)
  }

  // Filtrar por status
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // Filtrar por fonte
  if (filters?.source && filters.source !== 'all') {
    query = query.eq('source', filters.source)
  }

  // Filtrar por usuário
  if (filters?.userId && filters.userId !== 'all') {
    query = query.eq('user_id', filters.userId)
  }

  // Filtrar por cliente
  if (filters?.clienteId) {
    query = query.eq('cliente_id', filters.clienteId)
  }

  // Filtrar por tarefa
  if (filters?.tarefaId) {
    query = query.eq('tarefa_id', filters.tarefaId)
  }

  // Busca por texto
  if (filters?.searchTerm) {
    query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[agendaService] Erro ao buscar eventos:', error)
    throw error
  }

  return (data || []) as CalendarEvent[]
}

/**
 * Buscar um evento específico por ID
 */
export async function getCalendarEventById(eventId: string): Promise<CalendarEvent | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      tarefa:tarefas(id, titulo, status),
      cliente:clientes(id, nome)
    `)
    .eq('id', eventId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[agendaService] Erro ao buscar evento:', error)
    throw error
  }

  return data as CalendarEvent
}

/**
 * Criar um novo evento
 */
export async function createCalendarEvent(
  tenantId: string,
  userId: string | null,
  input: CreateEventInput
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      start_date: input.start_date,
      end_date: input.end_date || null,
      all_day: input.all_day || false,
      recurrence_rule: input.recurrence_rule || null,
      tarefa_id: input.tarefa_id || null,
      cliente_id: input.cliente_id || null,
      reminders: input.reminders || [],
      color: input.color || '#3B82F6',
      source: 'manual'
    })
    .select()
    .single()

  if (error) {
    console.error('[agendaService] Erro ao criar evento:', error)
    throw error
  }

  return data as CalendarEvent
}

/**
 * Criar evento a partir de uma mensagem do WhatsApp
 */
export async function createEventFromWhatsApp(
  tenantId: string,
  userId: string | null,
  parsedData: {
    title: string
    date: string
    time?: string
    location?: string
    duration_minutes?: number
  },
  originalMessage: string
): Promise<CalendarEvent> {
  // Construir a data/hora
  let startDate = new Date(parsedData.date)
  if (parsedData.time) {
    const [hours, minutes] = parsedData.time.split(':').map(Number)
    startDate.setHours(hours, minutes, 0, 0)
  }

  // Calcular data de término
  let endDate = new Date(startDate)
  if (parsedData.duration_minutes) {
    endDate.setMinutes(endDate.getMinutes() + parsedData.duration_minutes)
  } else {
    endDate.setHours(endDate.getHours() + 1) // Default: 1 hora
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      title: parsedData.title,
      location: parsedData.location || null,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      all_day: !parsedData.time,
      source: 'whatsapp',
      source_message: originalMessage,
      color: '#8B5CF6', // Roxo para eventos do WhatsApp
      reminders: [{ type: 'whatsapp' as const, minutes_before: 30 }]
    })
    .select()
    .single()

  if (error) {
    console.error('[agendaService] Erro ao criar evento do WhatsApp:', error)
    throw error
  }

  return data as CalendarEvent
}

/**
 * Atualizar um evento
 */
export async function updateCalendarEvent(
  eventId: string,
  input: UpdateEventInput
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      ...(input.title && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.start_date && { start_date: input.start_date }),
      ...(input.end_date !== undefined && { end_date: input.end_date }),
      ...(input.all_day !== undefined && { all_day: input.all_day }),
      ...(input.recurrence_rule !== undefined && { recurrence_rule: input.recurrence_rule }),
      ...(input.tarefa_id !== undefined && { tarefa_id: input.tarefa_id }),
      ...(input.cliente_id !== undefined && { cliente_id: input.cliente_id }),
      ...(input.reminders && { reminders: input.reminders }),
      ...(input.color && { color: input.color }),
      ...(input.status && { status: input.status })
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    console.error('[agendaService] Erro ao atualizar evento:', error)
    throw error
  }

  return data as CalendarEvent
}

/**
 * Deletar (cancelar) um evento
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  // Soft delete - marcamos como cancelado
  const { error } = await supabase
    .from('calendar_events')
    .update({ status: 'cancelled' })
    .eq('id', eventId)

  if (error) {
    console.error('[agendaService] Erro ao deletar evento:', error)
    throw error
  }
}

/**
 * Deletar permanentemente um evento
 */
export async function permanentlyDeleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)

  if (error) {
    console.error('[agendaService] Erro ao deletar evento permanentemente:', error)
    throw error
  }
}

// ============================================================================
// INTEGRAÇÕES
// ============================================================================

/**
 * Buscar integração do usuário
 */
export async function getCalendarIntegration(
  userId: string,
  provider: 'google' = 'google'
): Promise<CalendarIntegration | null> {
  const { data, error } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) {
    console.error('[agendaService] Erro ao buscar integração:', error)
    throw error
  }

  return data as CalendarIntegration | null
}

/**
 * Salvar/atualizar integração
 */
export async function saveCalendarIntegration(
  tenantId: string,
  userId: string,
  provider: 'google',
  data: Partial<CalendarIntegration>
): Promise<CalendarIntegration> {
  const { data: result, error } = await supabase
    .from('calendar_integrations')
    .upsert({
      tenant_id: tenantId,
      user_id: userId,
      provider,
      ...data
    }, {
      onConflict: 'tenant_id,user_id,provider'
    })
    .select()
    .single()

  if (error) {
    console.error('[agendaService] Erro ao salvar integração:', error)
    throw error
  }

  return result as CalendarIntegration
}

/**
 * Desconectar integração
 */
export async function disconnectCalendarIntegration(
  userId: string,
  provider: 'google' = 'google'
): Promise<void> {
  const { error } = await supabase
    .from('calendar_integrations')
    .update({
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null
    })
    .eq('user_id', userId)
    .eq('provider', provider)

  if (error) {
    console.error('[agendaService] Erro ao desconectar integração:', error)
    throw error
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Obter eventos de um dia específico
 */
export async function getEventsForDay(
  tenantId: string,
  date: Date
): Promise<CalendarEvent[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return getCalendarEvents(tenantId, {
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString()
  })
}

/**
 * Obter eventos de uma semana
 */
export async function getEventsForWeek(
  tenantId: string,
  date: Date
): Promise<CalendarEvent[]> {
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return getCalendarEvents(tenantId, {
    startDate: startOfWeek.toISOString(),
    endDate: endOfWeek.toISOString()
  })
}

/**
 * Obter eventos de um mês
 */
export async function getEventsForMonth(
  tenantId: string,
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const startOfMonth = new Date(year, month, 1)
  startOfMonth.setHours(0, 0, 0, 0)

  const endOfMonth = new Date(year, month + 1, 0)
  endOfMonth.setHours(23, 59, 59, 999)

  return getCalendarEvents(tenantId, {
    startDate: startOfMonth.toISOString(),
    endDate: endOfMonth.toISOString()
  })
}

/**
 * Obter próximos eventos
 */
export async function getUpcomingEvents(
  tenantId: string,
  limit: number = 5
): Promise<CalendarEvent[]> {
  const now = new Date()

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      tarefa:tarefas(id, titulo, status),
      cliente:clientes(id, nome)
    `)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('start_date', now.toISOString())
    .order('start_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[agendaService] Erro ao buscar próximos eventos:', error)
    throw error
  }

  return (data || []) as CalendarEvent[]
}

/**
 * Buscar eventos que precisam de lembrete
 */
export async function getEventsNeedingReminder(
  tenantId: string
): Promise<CalendarEvent[]> {
  const now = new Date()
  const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000)

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'confirmed')
    .gte('start_date', now.toISOString())
    .lte('start_date', in30Minutes.toISOString())
    .not('reminders', 'eq', '[]')

  if (error) {
    console.error('[agendaService] Erro ao buscar eventos para lembrete:', error)
    throw error
  }

  return (data || []) as CalendarEvent[]
}

// ============================================================================
// FORMATAÇÃO
// ============================================================================

/**
 * Formatar data para exibição
 */
export function formatEventDate(startDate: string, endDate?: string | null, allDay?: boolean): string {
  const start = new Date(startDate)

  if (allDay) {
    return start.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  const dateStr = start.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })

  const timeStr = start.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (endDate) {
    const end = new Date(endDate)
    const endTimeStr = end.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    return `${dateStr}, ${timeStr} - ${endTimeStr}`
  }

  return `${dateStr}, ${timeStr}`
}

/**
 * Formatar duração do evento
 */
export function formatEventDuration(startDate: string, endDate?: string | null): string {
  if (!endDate) return ''

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffMs = end.getTime() - start.getTime()
  const diffMinutes = Math.round(diffMs / 60000)

  if (diffMinutes < 60) {
    return `${diffMinutes} min`
  }

  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}min`
}
