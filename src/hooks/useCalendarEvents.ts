// ============================================================================
// HOOK: useCalendarEvents
// ============================================================================

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import {
  getCalendarEvents,
  getUpcomingEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById
} from '../services/agendaService'
import type {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  EventFilters,
  CalendarView
} from '../types/calendar'
import toast from 'react-hot-toast'

interface UseCalendarEventsOptions {
  view?: CalendarView
  currentDate?: Date
  filters?: EventFilters
  enabled?: boolean
}

export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const { view = 'month', currentDate = new Date(), filters, enabled = true } = options
  const { tenant, user } = useAuthStore()
  const tenantId = tenant?.id
  const queryClient = useQueryClient()

  // Calcular período baseado na view
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    switch (view) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        start.setDate(currentDate.getDate() - currentDate.getDay())
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
      default:
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(end.getMonth() + 1)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
        break
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    }
  }, [view, currentDate])

  // Query key
  const queryKey = ['calendar-events', tenantId, view, startDate, endDate, filters]

  // Query principal
  const {
    data: events = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId) return []
      return getCalendarEvents(tenantId, {
        ...filters,
        startDate,
        endDate
      })
    },
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  // Eventos agrupados por data
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {}

    events.forEach(event => {
      const dateKey = new Date(event.start_date).toISOString().split('T')[0]
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })

    return grouped
  }, [events])

  // Criar evento
  const createMutation = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      if (!tenantId) throw new Error('Tenant não encontrado')
      return createCalendarEvent(tenantId, user?.id || null, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento criado com sucesso!')
    },
    onError: (error: Error) => {
      console.error('Erro ao criar evento:', error)
      toast.error('Erro ao criar evento')
    }
  })

  // Atualizar evento
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateEventInput & { id: string }) => {
      return updateCalendarEvent(id, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento atualizado!')
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar evento:', error)
      toast.error('Erro ao atualizar evento')
    }
  })

  // Deletar evento
  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return deleteCalendarEvent(eventId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento removido!')
    },
    onError: (error: Error) => {
      console.error('Erro ao remover evento:', error)
      toast.error('Erro ao remover evento')
    }
  })

  return {
    events,
    eventsByDate,
    isLoading,
    error,
    refetch,
    createEvent: createMutation.mutate,
    updateEvent: updateMutation.mutate,
    deleteEvent: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}

// ============================================================================
// HOOK: useUpcomingEvents
// ============================================================================

export function useUpcomingEvents(limit: number = 5) {
  const { tenant } = useAuthStore()
  const tenantId = tenant?.id

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['upcoming-events', tenantId, limit],
    queryFn: async () => {
      if (!tenantId) return []
      return getUpcomingEvents(tenantId, limit)
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })

  return { events, isLoading, refetch }
}

// ============================================================================
// HOOK: useCalendarEvent (single event)
// ============================================================================

export function useCalendarEvent(eventId: string | null) {
  const queryClient = useQueryClient()

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['calendar-event', eventId],
    queryFn: async () => {
      if (!eventId) return null
      return getCalendarEventById(eventId)
    },
    enabled: !!eventId
  })

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateEventInput) => {
      if (!eventId) throw new Error('Event ID não fornecido')
      return updateCalendarEvent(eventId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento atualizado!')
    },
    onError: () => {
      toast.error('Erro ao atualizar evento')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error('Event ID não fornecido')
      return deleteCalendarEvent(eventId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento removido!')
    },
    onError: () => {
      toast.error('Erro ao remover evento')
    }
  })

  return {
    event,
    isLoading,
    error,
    updateEvent: updateMutation.mutate,
    deleteEvent: deleteMutation.mutate,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}

// ============================================================================
// HOOK: useCalendarViewState
// ============================================================================

export function useCalendarViewState() {
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToPrevious = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() - 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, view])

  const goToNext = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() + 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, view])

  const selectDate = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  const selectEvent = useCallback((eventId: string | null) => {
    setSelectedEventId(eventId)
  }, [])

  const getViewTitle = useCallback(() => {
    switch (view) {
      case 'day':
        return currentDate.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      case 'week':
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)

        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.getDate()} - ${weekEnd.getDate()} de ${weekEnd.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
        }
        return `${weekStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`
      case 'month':
      default:
        return currentDate.toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric'
        })
    }
  }, [currentDate, view])

  return {
    view,
    setView,
    currentDate,
    setCurrentDate,
    selectedDate,
    selectedEventId,
    goToToday,
    goToPrevious,
    goToNext,
    selectDate,
    selectEvent,
    getViewTitle
  }
}
