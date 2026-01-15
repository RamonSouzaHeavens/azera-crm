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
import { useCalendarEvents, useCalendarViewState, useUpcomingEvents } from '../hooks/useCalendarEvents'
import type { CalendarEvent, CreateEventInput } from '../types/calendar'
import { formatEventDate } from '../services/agendaService'
import { EVENT_COLORS } from '../types/calendar'
import toast from 'react-hot-toast'

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

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
        className="w-full text-left px-2 py-1 rounded text-xs font-medium truncate transition-all hover:scale-105"
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
      <div className="relative bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
            style={{ backgroundColor: event.color }}
          />
          <div>
            <h2 className="text-xl font-bold text-white">{event.title}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {formatEventDate(event.start_date, event.end_date, event.all_day)}
            </p>
          </div>
        </div>

        {event.description && (
          <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-slate-300">{event.description}</p>
          </div>
        )}

        {event.location && (
          <div className="flex items-center gap-2 mb-4 text-sm text-slate-300">
            <MapPin className="w-4 h-4 text-slate-400" />
            {event.location}
          </div>
        )}

        {event.source_message && (
          <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <p className="text-xs text-purple-300 mb-1 flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Criado via WhatsApp
            </p>
            <p className="text-sm text-slate-300 italic">"{event.source_message}"</p>
          </div>
        )}

        {event.tarefa && (
          <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <p className="text-xs text-cyan-300 mb-1">Vinculado à tarefa</p>
            <p className="text-sm text-white font-medium">{event.tarefa.titulo}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Removendo...' : 'Remover'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
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
      <div className="relative bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-cyan-400" />
          Novo Evento
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião com cliente"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Data *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="mr-2"
                />
                Dia inteiro
              </label>
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Início
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Término
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Local
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Escritório, Zoom, etc"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do evento..."
              rows={3}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cor
            </label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-medium transition hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50"
            >
              {isCreating ? 'Criando...' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// MODAL: Integração Google Calendar
// ============================================================================

interface GoogleIntegration {
  id: string
  google_email: string
  status: string
  last_sync_at: string | null
}

function GoogleCalendarModal({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [integration, setIntegration] = useState<GoogleIntegration | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar status da integração ao abrir o modal
  useEffect(() => {
    if (!isOpen) return

    const checkIntegration = async () => {
      setIsLoading(true)
      try {
        const { supabase } = await import('../lib/supabase')
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setIntegration(null)
          return
        }

        const { data } = await supabase
          .from('calendar_integrations')
          .select('id, google_email, status, last_sync_at')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .single()

        setIntegration(data || null)
      } catch (error) {
        console.error('Erro ao verificar integração:', error)
        setIntegration(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkIntegration()
  }, [isOpen])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // Obter token do usuário logado
      const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession())

      if (!session?.access_token) {
        toast.error('Você precisa estar logado para conectar')
        return
      }

      // Chamar Edge Function para obter URL de OAuth
      const response = await fetch(
        'https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/google-calendar-oauth',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data = await response.json()

      if (data.authUrl) {
        // Redirecionar para Google OAuth
        window.location.href = data.authUrl
      } else {
        toast.error(data.error || 'Erro ao iniciar conexão')
      }
    } catch (error) {
      console.error('Erro ao conectar:', error)
      toast.error('Erro ao conectar com Google')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar sua conta Google?')) return

    setIsDisconnecting(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'google')

      if (error) throw error

      setIntegration(null)
      toast.success('Conta Google desconectada!')
    } catch (error) {
      console.error('Erro ao desconectar:', error)
      toast.error('Erro ao desconectar')
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (!isOpen) return null

  const isConnected = integration?.status === 'connected'

  // URL do vídeo tutorial (substitua pelo seu vídeo)
  const videoUrl = "" // Deixar vazio até ter o vídeo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-green-500/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM12 17a5 5 0 110-10 5 5 0 010 10z" />
                <path d="M12 8v4l3 1.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Conectar Google Calendar</h2>
              <p className="text-slate-400">Sincronize seus eventos automaticamente</p>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Espaço para Vídeo Tutorial */}
          <div className="rounded-xl overflow-hidden bg-slate-900/50 border border-white/10">
            {videoUrl ? (
              <div className="aspect-video">
                <iframe
                  src={videoUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center text-slate-500">
                <svg className="w-16 h-16 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Vídeo tutorial em breve</p>
              </div>
            )}
          </div>

          {/* Passos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">?</span>
              Como funciona?
            </h3>

            <div className="space-y-3">
              <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-white">Clique em "Conectar com Google"</h4>
                  <p className="text-sm text-slate-400">Você será redirecionado para a página de login do Google</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-white">Autorize o acesso ao seu calendário</h4>
                  <p className="text-sm text-slate-400">Permita que o Azera leia e crie eventos no seu Google Calendar</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-white">Pronto! Seus eventos serão sincronizados</h4>
                  <p className="text-sm text-slate-400">Eventos criados aqui aparecerão no Google e vice-versa</p>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso importante - Cadastro prévio */}
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-cyan-300">📱 Cadastro Prévio Necessário</h4>
                <p className="text-sm text-cyan-200/80 mt-1">
                  Para conectar seu Google Calendar, primeiro precisamos adicionar seu email
                  na lista de acesso. <strong>Envie uma mensagem no WhatsApp</strong> com o email
                  da sua conta Google que deseja conectar.
                </p>
                <a
                  href="https://wa.me/5531991318312?text=Olá!%20Quero%20conectar%20meu%20Google%20Calendar%20no%20Azera.%20Meu%20email%20é:%20"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Enviar meu email via WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Status de conexão */}
          <div className={`p-4 rounded-xl border ${isConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-white/10'}`}>
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-500 animate-pulse" />
                <span className="text-sm text-slate-400">Verificando...</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <span className="text-sm text-green-400 font-medium">Conectado</span>
                    <p className="text-xs text-slate-400">{integration?.google_email}</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="text-xs text-red-400 hover:text-red-300 transition"
                >
                  {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-500 animate-pulse" />
                  <span className="text-sm text-slate-400">Não conectado</span>
                </div>
                <span className="text-xs text-slate-500">Clique abaixo para conectar</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition"
          >
            {isConnected ? 'Fechar' : 'Cancelar'}
          </button>
          {!isConnected && (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Conectando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Conectar com Google
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CALENDÁRIO MENSAL
// ============================================================================

function MonthCalendar({
  currentDate,
  eventsByDate,
  onSelectDate,
  onSelectEvent,
  selectedDate
}: {
  currentDate: Date
  eventsByDate: Record<string, CalendarEvent[]>
  onSelectDate: (date: Date) => void
  onSelectEvent: (eventId: string) => void
  selectedDate: Date | null
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Calcular dias do mês
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDay = firstDayOfMonth.getDay()

  // Dias do mês anterior
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  // Gerar array de dias
  const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

  // Dias do mês anterior
  for (let i = startingDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false
    })
  }

  // Dias do mês atual
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    })
  }

  // Dias do próximo mês
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      {/* Header dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-white/10">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {days.map(({ date, isCurrentMonth }, index) => {
          const dateKey = date.toISOString().split('T')[0]
          const dayEvents = eventsByDate[dateKey] || []
          const isToday = date.getTime() === today.getTime()
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()

          return (
            <button
              key={index}
              onClick={() => onSelectDate(date)}
              className={`
                relative min-h-[100px] p-2 border-b border-r border-white/5 text-left transition-all
                ${isCurrentMonth ? 'bg-transparent hover:bg-white/5' : 'bg-white/[0.02] opacity-50'}
                ${isSelected ? 'bg-cyan-500/10 ring-1 ring-cyan-500/50' : ''}
              `}
            >
              <span
                className={`
                  inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                  ${isToday ? 'bg-cyan-500 text-white' : 'text-slate-300'}
                `}
              >
                {date.getDate()}
              </span>

              {/* Eventos do dia */}
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    compact
                    onClick={() => onSelectEvent(event.id)}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-xs text-slate-400 pl-2">
                    +{dayEvents.length - 3} mais
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// SIDEBAR COM PRÓXIMOS EVENTOS
// ============================================================================

function EventsSidebar({ onSelectEvent }: { onSelectEvent: (eventId: string) => void }) {
  const { events, isLoading } = useUpcomingEvents(10)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarIcon className="w-12 h-12 mx-auto text-slate-500 mb-3" />
        <p className="text-slate-400">Nenhum evento próximo</p>
        <p className="text-sm text-slate-500">Crie um evento para começar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={() => onSelectEvent(event.id)}
        />
      ))}
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
    selectedDate,
    goToToday,
    goToPrevious,
    goToNext,
    selectDate,
    selectEvent,
    selectedEventId,
    getViewTitle
  } = useCalendarViewState()

  const {
    events,
    eventsByDate,
    isLoading,
    refetch,
    createEvent,
    deleteEvent,
    isCreating,
    isDeleting
  } = useCalendarEvents({ view, currentDate })

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false)
  const [googleIntegration, setGoogleIntegration] = useState<GoogleIntegration | null>(null)
  const [selectedEventData, setSelectedEventData] = useState<CalendarEvent | null>(null)

  // Verificar status do Google Calendar
  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const { supabase } = await import('../lib/supabase')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('calendar_integrations')
          .select('id, google_email, status, last_sync_at')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .single()

        setGoogleIntegration(data || null)

        // Sincronizar se conectado
        if (data?.status === 'connected') {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            fetch('https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/google-calendar-sync', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              }
            }).then(res => res.json())
              .then(d => { if (d.success) refetch() })
              .catch(e => console.error('Erro sync:', e))
          }
        }
      } catch (error) {
        console.error('Erro ao verificar Google:', error)
      }
    }

    checkGoogleStatus()


  }, [isGoogleModalOpen])



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

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
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
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Botão Criar */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Layout Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="h-[600px] bg-white/5 rounded-2xl animate-pulse flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
            </div>
          ) : view === 'month' ? (
            <MonthCalendar
              currentDate={currentDate}
              eventsByDate={eventsByDate}
              onSelectDate={selectDate}
              onSelectEvent={handleSelectEvent}
              selectedDate={selectedDate}
            />
          ) : view === 'list' ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Próximos Eventos</h3>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                  <p className="text-slate-400">Nenhum evento encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => handleSelectEvent(event.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
              <p className="text-slate-400">Visualização semanal em breve...</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Mini calendário / Info do dia selecionado */}
          {selectedDate && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              {eventsByDate[selectedDate.toISOString().split('T')[0]]?.length ? (
                <div className="space-y-2">
                  {eventsByDate[selectedDate.toISOString().split('T')[0]].map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      compact
                      onClick={() => handleSelectEvent(event.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Nenhum evento</p>
              )}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full mt-3 py-2 text-sm text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-4 h-4" />
                Adicionar evento
              </button>
            </div>
          )}

          {/* Próximos eventos */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Próximos Eventos
            </h3>
            <EventsSidebar onSelectEvent={handleSelectEvent} />
          </div>

          {/* Card de integração Google Calendar */}
          <div className="bg-gradient-to-br from-blue-500/10 to-green-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm0 3.6c1.38 0 2.7.36 3.84 1.02L12 8.52 8.16 4.62A8.4 8.4 0 0112 3.6zM6.78 5.94L10.62 9.78 4.62 15.78A8.4 8.4 0 013.6 12c0-2.28.9-4.38 2.4-5.94l.78-.12zm-2.16 11.1l6-6L12 12.42l-1.38 1.38-6 6A8.4 8.4 0 014.62 17.04zM12 20.4a8.4 8.4 0 01-5.16-1.74l6-6L14.22 11.28l4.02 4.02A8.4 8.4 0 0112 20.4zm7.02-4.14l-5.64-5.64L14.76 9.24l4.62 4.62a8.4 8.4 0 01-.36 2.4z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-white">Google Calendar</h4>
                <p className="text-xs text-slate-400">
                  {googleIntegration ? 'Sincronização Ativa' : 'Sincronize seus eventos'}
                </p>
              </div>
            </div>

            {googleIntegration ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-300 font-medium truncate">
                    {googleIntegration.google_email}
                  </span>
                </div>
                <button
                  onClick={() => setIsGoogleModalOpen(true)}
                  className="w-full py-2 text-sm bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition flex items-center justify-center gap-2"
                >
                  Configurar
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-300 mb-3">
                  Conecte sua conta Google para sincronizar eventos automaticamente.
                </p>
                <button
                  onClick={() => setIsGoogleModalOpen(true)}
                  className="w-full py-2 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Conectar Google
                </button>
              </>
            )}
          </div>

          {/* Card de integração WhatsApp */}
          <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Agenda via WhatsApp</h4>
                <p className="text-xs text-slate-400">Crie eventos por mensagem</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Envie: <span className="text-purple-300 italic">"Azera, me lembra de ir ao médico dia 20 às 14h"</span>
            </p>
            <button className="w-full py-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl transition flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" />
              Configurar
            </button>
          </div>
        </div>
      </div>

      {/* Modais */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createEvent}
        selectedDate={selectedDate}
        isCreating={isCreating}
      />

      <EventModal
        event={selectedEventData}
        isOpen={!!selectedEventId}
        onClose={handleCloseEventModal}
        onDelete={handleDeleteEvent}
        isDeleting={isDeleting}
      />

      <GoogleCalendarModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
      />
    </div>
  )
}
