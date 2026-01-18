// ============================================================================
// PÁGINA: Agenda
// ============================================================================

import { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CalendarDays,
  LayoutGrid,
  List,
  RefreshCw,
  Settings,
  X,
  Trash2,
  MessageCircle
} from 'lucide-react'

// Hooks
import { useCalendarEvents, useCalendarViewState, useUpcomingEvents } from '../hooks/useCalendarEvents'

// Types
import type { CalendarEvent, CreateEventInput, GoogleIntegration } from '../types/calendar'
import { EVENT_COLORS } from '../types/calendar'

// Services & Libs
import { formatEventDate } from '../services/agendaService'
import { supabase } from '../lib/supabase'

import { GoogleCalendarModal } from '../components/calendar/GoogleCalendarModal'
import { WhatsAppAgendaModal } from '../components/calendar/WhatsAppAgendaModal'


// Card de Evento
function EventCard({
  event,
  compact = false,
  onClick
}: {
  event: CalendarEvent
  compact?: boolean
  onClick?: () => void
}) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left px-2 py-1 rounded text-xs font-medium truncate transition-colors hover:brightness-110"
        style={{ backgroundColor: event.color + '20', color: event.color }}
      >
        {event.all_day ? '' : new Date(event.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' '}
        {event.title}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-1 h-full min-h-[40px] rounded-full"
          style={{ backgroundColor: event.color }}
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate group-hover:text-cyan-300 transition-colors">
            {event.title}
          </h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatEventDate(event.start_date, event.end_date, event.all_day)}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
          </div>
          {event.source === 'whatsapp' && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-purple-400">
              <MessageCircle className="w-3 h-3" />
              Via WhatsApp
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// Modal de Evento
function EventModal({
  event,
  isOpen,
  onClose,
  onDelete,
  isDeleting
}: {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  if (!isOpen || !event) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-4 h-4 rounded-full mt-1 flex-shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            style={{ backgroundColor: event.color }}
          />
          <div>
            <h2 className="text-xl font-bold text-white font-outfit">{event.title}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {formatEventDate(event.start_date, event.end_date, event.all_day)}
            </p>
          </div>
        </div>

        {event.description && (
          <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-slate-300 leading-relaxed">{event.description}</p>
          </div>
        )}

        {event.location && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-white/5 text-sm text-slate-300">
            <MapPin className="w-4 h-4 text-cyan-400" />
            {event.location}
          </div>
        )}

        {event.source_message && (
          <div className="mb-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <p className="text-xs text-purple-400 mb-2 flex items-center gap-1 font-semibold uppercase tracking-wider">
              <MessageCircle className="w-3 h-3" />
              Criado via WhatsApp
            </p>
            <p className="text-sm text-slate-200 italic leading-relaxed">"{event.source_message}"</p>
          </div>
        )}

        {event.tarefa && (
          <div className="mb-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <p className="text-xs text-cyan-400 mb-1 font-semibold uppercase tracking-wider">Vinculado à tarefa</p>
            <p className="text-sm text-white font-medium">{event.tarefa.titulo}</p>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-semibold transition flex items-center justify-center gap-2 border border-rose-500/20"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Removendo...' : 'Remover'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 border border-white/10"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal de Criar Evento
function CreateEventModal({
  isOpen,
  onClose,
  onCreate,
  selectedDate,
  isCreating
}: {
  isOpen: boolean
  onClose: () => void
  onCreate: (input: CreateEventInput) => void
  selectedDate: Date | null
  isCreating: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState(selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState('#3B82F6')

  // Sincronizar data quando selectedDate mudar
  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0])
    }
  }, [selectedDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const startDate = new Date(`${date}T${allDay ? '00:00' : time}:00`)
    const endDate = new Date(`${date}T${allDay ? '23:59' : endTime}:00`)

    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      all_day: allDay,
      color
    })

    // Reset form
    setTitle('')
    setDescription('')
    setLocation('')
    setAllDay(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 font-outfit">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Plus className="w-6 h-6" />
          </div>
          Novo Evento
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider text-xs">
              Título do Evento *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de Alinhamento"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider text-xs">
                Data *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-mono"
                required
              />
            </div>
            <div className="flex items-end pb-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${allDay ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${allDay ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Dia inteiro</span>
              </label>
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider text-xs">
                  Início
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider text-xs">
                  Término
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider text-xs">
              Local
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Escritório, Zoom, Google Meet..."
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider text-xs">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes importantes para este evento..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none transition-all leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider text-xs">
              Cor de Destaque
            </label>
            <div className="flex flex-wrap gap-3">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-10 h-10 rounded-xl transition-all relative ${color === c.value ? 'ring-2 ring-white ring-offset-4 ring-offset-[#0f172a] scale-110 shadow-lg' : 'hover:scale-105 opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {color === c.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="flex-[2] py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold transition-all hover:shadow-xl hover:shadow-cyan-500/30 active:scale-[0.98] disabled:opacity-50"
            >
              {isCreating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </div>
              ) : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default function Agenda() {
  const {
    view,
    setView,
    currentDate,
    goToToday,
    goToPrevious,
    goToNext,
    getViewTitle,
    selectedDate,
    selectDate,
    selectedEventId,
    selectEvent
  } = useCalendarViewState()

  const {
    events,
    isLoading,
    createEvent,
    deleteEvent,
    isCreating,
    isDeleting,
    refetch
  } = useCalendarEvents({ view, currentDate })

  const { events: upcomingEvents } = useUpcomingEvents(10)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [googleIntegration, setGoogleIntegration] = useState<GoogleIntegration | null>(null)
  const [selectedEventData, setSelectedEventData] = useState<CalendarEvent | null>(null)

  // Verificar status do Google Calendar
  const checkGoogleStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single()

      setGoogleIntegration(data)
    } catch (e) {
      console.error('Erro ao verificar Google:', e)
    }
  }

  useEffect(() => {
    checkGoogleStatus()
  }, [])

  // Buscar dados do evento selecionado
  useEffect(() => {
    if (selectedEventId) {
      const event = events.find(e => e.id === selectedEventId)
      setSelectedEventData(event || null)
    } else {
      setSelectedEventData(null)
    }
  }, [selectedEventId, events])

  const handleSelectEvent = (eventId: string) => {
    selectEvent(eventId)
  }

  const handleCloseEventModal = () => {
    selectEvent(null)
    setSelectedEventData(null)
  }

  const handleDeleteEvent = () => {
    if (selectedEventId) {
      deleteEvent(selectedEventId)
      handleCloseEventModal()
    }
  }

  useEffect(() => {
    // Esconder scrollbar do layout pai durante o uso da Agenda
    const main = document.querySelector('main')
    if (main) {
      const originalOverflow = main.style.overflow
      main.style.overflow = 'hidden'
      return () => {
        main.style.overflow = originalOverflow
      }
    }
  }, [])

  return (
    <div className="h-full bg-background p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-outfit">Agenda</h1>
            <p className="text-slate-400">Gerencie seus eventos e compromissos</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Navegação */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            <button
              onClick={goToPrevious}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Hoje
            </button>
            <button
              onClick={goToNext}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Título do período */}
          <div className="px-4 py-2 bg-white/5 rounded-xl">
            <span className="text-white font-medium capitalize">{getViewTitle()}</span>
          </div>

          {/* Seletor de View */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setView('month')}
              className={`p-2 rounded-lg transition ${view === 'month' ? 'bg-white/10 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Mês"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('week')}
              className={`p-2 rounded-lg transition ${view === 'week' ? 'bg-white/10 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Semana"
            >
              <CalendarDays className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition ${view === 'list' ? 'bg-white/10 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Lista"
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 border border-white/10 rounded-xl hover:brightness-110 text-white transition disabled:opacity-50 min-w-[140px] shadow-lg shadow-black/20"
            title="Sincronizar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="font-medium">Sincronizar</span>
          </button>

          {/* WhatsApp Agenda */}
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-800 border border-purple-500/30 rounded-xl text-white hover:brightness-110 transition min-w-[140px] shadow-lg shadow-purple-500/20"
            title="Configurar Agenda via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium">WhatsApp</span>
          </button>

          {/* Botão Criar */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all hover:scale-105 min-w-[160px]"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lado Esquerdo: Calendário */}
        <div className="lg:col-span-3 flex flex-col overflow-hidden bg-white/5 rounded-2xl border border-white/10">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                <p className="text-slate-400 animate-pulse font-medium tracking-wide uppercase text-xs">Carregando Agenda...</p>
              </div>
            </div>
          ) : view === 'month' ? (
            <div className="flex-1 p-4">
              <MonthlyCalendar
                currentDate={currentDate}
                events={events}
                onSelectDate={(date) => {
                  selectDate(date)
                  setIsCreateModalOpen(true)
                }}
                onSelectEvent={handleSelectEvent}
              />
            </div>
          ) : view === 'week' ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <WeeklyView
                currentDate={currentDate}
                events={events}
                onSelectEvent={handleSelectEvent}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="max-w-4xl mx-auto space-y-8">
                {Object.entries(
                  events.reduce((acc, event) => {
                    const date = new Date(event.start_date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                    if (!acc[date]) acc[date] = []
                    acc[date].push(event)
                    return acc
                  }, {} as Record<string, CalendarEvent[]>)
                ).map(([date, dayEvents]) => (
                  <div key={date} className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-cyan-500/30">{date}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dayEvents.map(event => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onClick={() => handleSelectEvent(event.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p>Nenhum evento encontrado para este período.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: Próximos Eventos & Integrações */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Próximos Compromissos */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5 flex flex-col overflow-hidden max-h-[60%]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 shrink-0">
              <Clock className="w-5 h-5 text-cyan-400" />
              Próximos Compromissos
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {upcomingEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent(event.id)}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-1 h-10 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: event.color }} />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{event.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        {formatEventDate(event.start_date)}
                      </p>
                      {event.location && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {upcomingEvents.length === 0 && (
                <div className="py-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                  <p className="text-xs text-slate-500 italic">Tudo limpo por aqui!</p>
                </div>
              )}
            </div>
          </div>

          {/* Integração Google */}
          <div className="bg-gradient-to-br from-blue-500/10 to-green-500/10 rounded-2xl border border-blue-500/20 p-5 shrink-0 shadow-lg shadow-blue-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-white flex items-center justify-center shadow-md">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white font-outfit truncate">Google Calendar</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  {googleIntegration ? 'Sincronizado' : 'Não Conectado'}
                </p>
              </div>
            </div>

            {googleIntegration && (
              <div className="mb-4 text-xs font-medium text-slate-300 bg-white/5 p-2 rounded-lg border border-white/10 truncate">
                {googleIntegration.google_email}
              </div>
            )}

            <button
              onClick={() => setIsGoogleModalOpen(true)}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:scale-105 flex items-center justify-center gap-2 group"
            >
              <Settings className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-500" />
              Configurar Integração
            </button>
          </div>
        </div>
      </div>

      {/* Modais */}
      <EventModal
        event={selectedEventData}
        isOpen={!!selectedEventId}
        onClose={handleCloseEventModal}
        onDelete={handleDeleteEvent}
        isDeleting={isDeleting}
      />

      {isCreateModalOpen && (
        <CreateEventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={createEvent}
          selectedDate={selectedDate}
          isCreating={isCreating}
        />
      )}

      {isGoogleModalOpen && (
        <GoogleCalendarModal
          isOpen={isGoogleModalOpen}
          onClose={() => {
            setIsGoogleModalOpen(false)
            checkGoogleStatus()
            refetch()
          }}
        />
      )}

      {isWhatsAppModalOpen && (
        <WhatsAppAgendaModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
        />
      )}
    </div>
  )
}

// ============================================================================
// COMPONENTES AUXILIARES DE VIEW
// ============================================================================

function MonthlyCalendar({
  currentDate,
  events,
  onSelectDate,
  onSelectEvent
}: {
  currentDate: Date
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onSelectEvent: (eventId: string) => void
}) {
  const years = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(years, month, 1)
  const lastDayOfMonth = new Date(years, month + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const totalDays = lastDayOfMonth.getDate()

  const prevMonthLastDay = new Date(years, month, 0).getDate()
  const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = []

  // Dias do mês anterior
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(years, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
      isToday: false
    })
  }

  // Dias do mês atual
  const today = new Date()
  for (let i = 1; i <= totalDays; i++) {
    const date = new Date(years, month, i)
    days.push({
      date,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString()
    })
  }

  // Dias do próximo mês
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(years, month + 1, i),
      isCurrentMonth: false,
      isToday: false
    })
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-white/5 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        {days.map((day, idx) => {
          const dateStr = day.date.toISOString().split('T')[0]
          const dayEvents = events.filter(e => e.start_date.startsWith(dateStr))

          return (
            <div
              key={idx}
              className={`min-h-0 relative flex flex-col p-2 transition-all hover:bg-white/5 group ${day.isCurrentMonth ? 'bg-[#0f172a]/50' : 'bg-black/20 opacity-40'}`}
              onClick={() => onSelectDate(day.date)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${day.isToday ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-slate-400 group-hover:text-white'}`}>
                  {day.date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <div className="bg-cyan-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold text-cyan-400 uppercase">
                    {dayEvents.length} {dayEvents.length === 1 ? 'Evento' : 'Eventos'}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectEvent(event.id)
                    }}
                    className="w-full text-left px-2 py-1 rounded text-[10px] font-bold truncate transition-all hover:brightness-125 border-l-2 flex items-center gap-1"
                    style={{
                      backgroundColor: event.color + '15',
                      color: event.color,
                      borderColor: event.color
                    }}
                  >
                    {!event.all_day && (
                      <span className="opacity-50 shrink-0">
                        {new Date(event.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className="truncate uppercase tracking-tight">{event.title}</span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-slate-500 font-bold pl-1 uppercase">
                    + {dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeeklyView({
  currentDate,
  events,
  onSelectEvent
}: {
  currentDate: Date
  events: CalendarEvent[]
  onSelectEvent: (eventId: string) => void
}) {
  const startOfWeek = new Date(currentDate)
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

  const daysArr = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  // Horas do dia (8h às 20h)
  const hours = Array.from({ length: 14 }, (_, i) => i + 7)

  return (
    <div className="flex flex-col h-full bg-[#0f172a]/50 rounded-xl border border-white/5 overflow-hidden">
      {/* Header com dias da semana */}
      <div className="grid grid-cols-[80px_1fr] border-b border-white/10 shrink-0">
        <div className="p-4 border-r border-white/10" />
        <div className="grid grid-cols-7">
          {daysArr.map((day, idx) => (
            <div key={idx} className={`p-4 text-center border-r border-white/5 last:border-r-0 ${day.toDateString() === new Date().toDateString() ? 'bg-cyan-500/5' : ''}`}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-bold w-10 h-10 flex items-center justify-center rounded-xl mx-auto ${day.toDateString() === new Date().toDateString() ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-white'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de Horários */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-[80px_1fr] relative">
          {/* Coluna de Horas */}
          <div className="shrink-0 border-r border-white/10">
            {hours.map(hour => (
              <div key={hour} className="h-20 p-2 text-right text-[10px] font-bold text-slate-500 border-b border-white/5 flex flex-col justify-start">
                {hour}:00
              </div>
            ))}
          </div>

          {/* Grid de Eventos */}
          <div className="grid grid-cols-7 relative">
            {daysArr.map((day, dayIdx) => {
              const dayStr = day.toISOString().split('T')[0]
              const dayEvents = events.filter(e => e.start_date.startsWith(dayStr) && !e.all_day)

              return (
                <div key={dayIdx} className="relative border-r border-white/5 last:border-r-0">
                  {hours.map(hour => (
                    <div key={hour} className="h-20 border-b border-white/5" />
                  ))}
                  {dayEvents.map(event => {
                    const startDate = new Date(event.start_date)
                    const startHour = startDate.getHours()
                    const startMin = startDate.getMinutes()
                    const top = (startHour - 7) * 80 + (startMin / 60) * 80

                    // Duração estimada (1h se não houver end_date)
                    const end = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000)
                    const durationMs = end.getTime() - startDate.getTime()
                    const height = (durationMs / (1000 * 60 * 60)) * 80

                    return (
                      <div
                        key={event.id}
                        onClick={() => onSelectEvent(event.id)}
                        className="absolute left-1 right-1 rounded-lg p-2 text-[10px] leading-tight cursor-pointer hover:brightness-125 transition-all border-l-2 shadow-lg z-10 overflow-hidden"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: event.color + '20',
                          color: event.color,
                          borderColor: event.color
                        }}
                      >
                        <div className="font-bold uppercase tracking-tight truncate">{event.title}</div>
                        <div className="opacity-70 font-mono">{startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
