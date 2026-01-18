import React, { useState, useEffect } from 'react'
import { X, MessageCircle, Calendar as CalendarIcon, Info, Loader2, Save, Power, Zap } from 'lucide-react'
import { useIntegration } from '../../hooks/useIntegration'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface WhatsAppAgendaModalProps {
  isOpen: boolean
  onClose: () => void
}

export const WhatsAppAgendaModal: React.FC<WhatsAppAgendaModalProps> = ({ isOpen, onClose }) => {
  const { whatsappIntegration, loading, fetchIntegration } = useIntegration()
  const [isActive, setIsActive] = useState(false)
  const [trigger, setTrigger] = useState('Azera')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (whatsappIntegration) {
      setIsActive(whatsappIntegration.config?.whatsapp_agenda_active || false)
      setTrigger(whatsappIntegration.config?.whatsapp_agenda_trigger || 'Azera')
    }
  }, [whatsappIntegration])

  const handleSave = async () => {
    if (!whatsappIntegration) {
      toast.error('WhatsApp não está conectado!')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('integrations')
        .update({
          config: {
            ...whatsappIntegration.config,
            whatsapp_agenda_active: isActive,
            whatsapp_agenda_trigger: trigger
          }
        })
        .eq('id', whatsappIntegration.id)

      if (error) throw error

      toast.success('Configurações salvas com sucesso!')
      await fetchIntegration()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar config WhatsApp Agenda:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-purple-500/20 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Agenda via WhatsApp</h2>
              <p className="text-slate-400 text-sm">Crie eventos enviando mensagens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-medium">Status da Integração</p>
                <p className="text-slate-400 text-sm">{isActive ? 'Ativado' : 'Desativado'}</p>
              </div>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-purple-600' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {!whatsappIntegration && (
             <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
             <Info className="w-5 h-5 text-amber-500 shrink-0" />
             <p className="text-amber-200/80 text-sm leading-relaxed">
               <strong>Atenção:</strong> Você precisa conectar seu WhatsApp na página de <a href="/connect" className="text-amber-500 underline font-medium">Canais</a> para que esta funcionalidade funcione.
             </p>
           </div>
          )}

          {/* Trigger */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Gatilho de Agendamento
            </label>
            <input
              type="text"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="Ex: Azera"
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
            />
            <p className="text-xs text-slate-500">
              Palavra que deve iniciar a mensagem para ser reconhecida como um agendamento.
            </p>
          </div>

          {/* Como funciona */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Como enviar o comando?</h3>
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Exemplo de mensagem:</p>
                <p className="text-sm text-slate-200 font-mono italic">
                  "{trigger} Agendar reunião com João amanhã às 14h na Av. Paulista"
                </p>
              </div>
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex gap-2">
                  <div className="w-1 h-1 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  Envie o gatilho seguido da descrição do evento.
                </li>
                <li className="flex gap-2">
                  <div className="w-1 h-1 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  Nossa IA processará a data, hora e local automaticamente.
                </li>
                <li className="flex gap-2">
                  <div className="w-1 h-1 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  Você receberá uma confirmação na agenda do Azera.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !whatsappIntegration}
            className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Configuração
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
