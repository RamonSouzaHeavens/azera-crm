import React, { useState, useEffect } from 'react'
import {
  X,
  RefreshCw,
  Calendar,
  CheckCircle,
  LogOut,
  ShieldCheck
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  getCalendarIntegration,
  disconnectCalendarIntegration,
  saveCalendarIntegration
} from '../../services/agendaService'
import type { CalendarIntegration } from '../../types/calendar'
import toast from 'react-hot-toast'

interface GoogleCalendarModalProps {
  isOpen: boolean
  onClose: () => void
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null)
  const [syncEnabled, setSyncEnabled] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadIntegration()
    }
  }, [isOpen])

  const loadIntegration = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const data = await getCalendarIntegration(user.id)
      setIntegration(data)
      if (data) {
        setSyncEnabled(data.sync_enabled)
      }
    } catch (e) {
      console.error('Erro ao carregar integração:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Chamar a edge function que gera a URL de autorização
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: {
          action: 'get_auth_url',
          redirect_url: window.location.origin + '/app/agenda'
        }
      })

      if (error) throw error
      if (data?.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast.error('URL de autenticação não retornada')
      }
    } catch (e) {
      console.error('Erro ao conectar Google:', e)
      toast.error('Erro ao iniciar conexão com Google')
    }
  }

  const handleDisconnect = async () => {
    if (!integration) return
    if (!confirm('Tem certeza que deseja desconectar sua conta Google?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await disconnectCalendarIntegration(user.id)
      toast.success('Google Calendar desconectado')
      loadIntegration()
    } catch (e) {
      console.error('Erro ao desconectar:', e)
      toast.error('Erro ao desconectar')
    }
  }

  const handleToggleSync = async () => {
    if (!integration) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updated = await saveCalendarIntegration(integration.tenant_id, user.id, 'google', {
        sync_enabled: !syncEnabled
      })
      setSyncEnabled(updated.sync_enabled)
      toast.success(updated.sync_enabled ? 'Sincronização ativada' : 'Sincronização pausada')
    } catch (e) {
      console.error('Erro ao alterar sync:', e)
      toast.error('Erro ao atualizar configuração')
    }
  }

  const handleManualSync = async () => {
    try {
      setSyncing(true)
      const { error } = await supabase.functions.invoke('google-calendar-sync')
      if (error) throw error
      toast.success('Sincronização concluída!')
      loadIntegration()
    } catch (e) {
      console.error('Erro ao sincronizar:', e)
      toast.error('Erro ao sincronizar eventos')
    } finally {
      setSyncing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Calendar</h2>
              <p className="text-xs text-slate-400">Integração de Agenda</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-400">Carregando configurações...</p>
            </div>
          ) : integration?.status === 'connected' ? (
            <>
              {/* Status Conectado */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{integration.google_email}</p>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Conta conectada
                  </p>
                </div>
              </div>

              {/* Controles */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 border-dashed">
                  <div>
                    <p className="text-sm font-medium text-white">Sincronização Automática</p>
                    <p className="text-xs text-slate-400">Ativa o sync bidirecional</p>
                  </div>
                  <button
                    onClick={handleToggleSync}
                    className={`relative w-12 h-6 rounded-full transition-colors ${syncEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${syncEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-sm font-medium text-rose-400 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Desconectar
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Segurança
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O Azera só acessa os dados necessários para manter seu calendário atualizado. Você pode revogar o acesso a qualquer momento.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Estado Desconectado */}
              <div className="text-center py-6 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-white flex items-center justify-center shadow-xl shadow-blue-500/10 border border-white/10">
                  <svg className="w-10 h-10" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Conectar Google Calendar</h3>
                  <p className="text-sm text-slate-400 px-4">
                    Sincronize seus eventos do Azera com seu Google Calendar automaticamente.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <button
                  onClick={handleConnect}
                  className="w-full py-4 bg-white text-[#0f172a] font-bold rounded-2xl shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  </svg>
                  Fazer login com Google
                </button>

                <p className="text-[10px] text-center text-slate-500 max-w-[80%] mx-auto">
                  Ao conectar, você concorda com nossos termos de serviço e política de privacidade sobre o uso de dados da API do Google.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/5 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition border border-white/10"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
