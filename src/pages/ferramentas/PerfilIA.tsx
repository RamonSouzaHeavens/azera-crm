// src/components/PerfilIAPro.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { Sparkles, Save, User, AlertCircle, Linkedin, Instagram, Building, Briefcase, ArrowLeft } from 'lucide-react'
import { aiService } from '../../services/aiService'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!)

export default function PerfilIAPro() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [transcript, setTranscript] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [instagram, setInstagram] = useState('')
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')

  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Carrega leads
  useEffect(() => {
    loadLeads()
  }, [])

  // Auto-fill inputs when lead is selected (if data exists)
  useEffect(() => {
    if (selectedLead) {
      setLinkedin(selectedLead.linkedin || '')
      setInstagram(selectedLead.instagram || '')
      setRole('')
      setCompany('')
    } else {
      setLinkedin('')
      setInstagram('')
      setRole('')
      setCompany('')
    }
  }, [selectedLead])

  async function loadLeads() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, email, telefone, status')
        .order('nome', { ascending: true })
      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      console.error('Erro ao carregar leads:', err)
      toast.error('Falha ao buscar leads')
    }
  }

  async function analyzeWithAI() {
    if (!selectedLead) return toast.error('Selecione um lead primeiro')
    if (!transcript.trim() && !linkedin && !instagram) return toast.error('Forneça pelo menos uma transcrição ou rede social')

    setLoading(true)
    try {
      const { data, error } = await aiService.analyzeProfile({
        transcript,
        leadName: selectedLead.nome,
        linkedin,
        instagram,
        role,
        company
      })

      if (error) throw new Error(error)

      setAnalysis(data)
      toast.success('Análise concluída com maestria!')
    } catch (err) {
      console.error(err)
      toast.error('Erro na análise. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function saveAnalysis() {
    if (!analysis || !selectedLead) return

    setSaving(true)
    const { error } = await supabase
      .from('lead_profiles')
      .upsert({
        cliente_id: selectedLead.id,
        transcript,
        analysis: analysis,
        tone: analysis.tone,
        personality_type: analysis.personality,
        recommended_approach: analysis.recommendation,
        confidence_score: analysis.confidence,
        triggers: analysis.triggers
      }, { onConflict: 'cliente_id' })

    if (!error) {
      toast.success('Perfil salvo! Seu time agora sabe exatamente como abordar esse lead.')
    } else {
      toast.error('Erro ao salvar')
    }
    setSaving(false)
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto p-6 md:p-8 space-y-8">
      <button
        onClick={() => navigate('/app/ferramentas-pro')}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-4">
        <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
          <Sparkles className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">Análise de Perfil com IA</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Descubra a personalidade do lead e a melhor estratégia de venda.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Coluna da Esquerda: Inputs */}
        <div className="lg:col-span-1 space-y-6">

          {/* Seleção de Lead */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              1. Selecione o Lead
            </label>
            <select
              value={selectedLead?.id || ''}
              onChange={(e) => setSelectedLead(leads.find(l => String(l.id) === e.target.value))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
            >
              <option value="">-- Escolha um lead --</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>
                  {lead.nome}
                </option>
              ))}
            </select>

            {selectedLead && (
              <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-800 flex items-center justify-center text-cyan-700 dark:text-cyan-300 font-bold">
                  {selectedLead.nome.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{selectedLead.nome}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedLead.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Dados Extras */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
              2. Enriqueça os dados (Opcional)
            </label>

            <div className="space-y-3">
              <div className="relative">
                <Linkedin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="URL do LinkedIn"
                  value={linkedin}
                  onChange={e => setLinkedin(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:border-cyan-500 outline-none"
                />
              </div>
              <div className="relative">
                <Instagram className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="@instagram"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:border-cyan-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cargo"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:border-cyan-500 outline-none"
                  />
                </div>
                <div className="relative">
                  <Building className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Empresa"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transcrição */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-full">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              3. Contexto da Conversa
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={6}
              placeholder="Cole aqui anotações, emails ou transcrições de chamadas..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 outline-none resize-none flex-1 text-sm"
            />
          </div>

          <button
            onClick={analyzeWithAI}
            disabled={loading || !selectedLead}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
          >
            {loading ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                Analisando Perfil...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Análise Completa
              </>
            )}
          </button>
        </div>

        {/* Coluna da Direita: Resultados */}
        <div className="lg:col-span-2">
          {analysis ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

              {/* Card Principal */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex items-center justify-between mb-8 relative">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {selectedLead.nome}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Análise de Perfil Comportamental</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
                      {analysis.personality}
                    </div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Perfil DISC</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 relative">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Tom de Voz</h3>
                      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 font-medium inline-block">
                        {analysis.tone}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Probabilidade de Compra</h3>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-1000"
                            style={{ width: `${analysis.confidence}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{analysis.confidence}%</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Gatilhos Mentais</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.triggers?.map((trigger: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-100 dark:border-blue-800">
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-cyan-500" />
                      Como Vender
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                      {analysis.recommendation}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={saveAnalysis}
                    disabled={saving}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar no CRM'}
                  </button>
                </div>
              </div>

              {/* Template de Email */}
              {analysis.template && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                    Sugestão de Mensagem
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <pre className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {analysis.template}
                    </pre>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(analysis.template)
                        toast.success('Copiado!')
                      }}
                      className="text-sm text-cyan-600 dark:text-cyan-400 font-medium hover:underline"
                    >
                      Copiar texto
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Estado Vazio */
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <User className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Nenhum perfil analisado
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Selecione um lead e preencha as informações ao lado para receber uma análise comportamental completa baseada em IA.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
