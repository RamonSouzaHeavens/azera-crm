import { type LucideIcon, ArrowLeft, CalendarDays, Sparkles, Plus, Trash2, Mail, Linkedin, MessageSquare, Phone, GitBranch, Zap, DownloadCloud } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { aiService } from '../../services/aiService'
import toast from 'react-hot-toast'

type Channel = 'email' | 'linkedin' | 'sms' | 'call'
type Trigger = 'none' | 'open' | 'reply' | 'click'

interface SequenceStep {
  id: string
  subject: string
  delay: number
  body: string
  channel: Channel
  trigger: Trigger
}

const channelOrder: Channel[] = ['email', 'linkedin', 'sms', 'call']
const triggerOrder: Trigger[] = ['none', 'open', 'reply', 'click']

const channelMeta: Record<Channel, { label: string; color: string; Icon: LucideIcon }> = {
  email: { label: 'Email', color: 'text-cyan-500', Icon: Mail },
  linkedin: { label: 'LinkedIn', color: 'text-sky-500', Icon: Linkedin },
  sms: { label: 'SMS', color: 'text-emerald-500', Icon: MessageSquare },
  call: { label: 'Call', color: 'text-amber-500', Icon: Phone }
}

const triggerLabels: Record<Trigger, string> = {
  none: 'Sequência linear',
  open: 'Se abrir → siga para o próximo passo',
  reply: 'Se responder → pause ou reaja',
  click: 'Se clicar → envie o próximo ativo'
}

const templateLibrary = [
  {
    id: 'value-prop',
    title: 'Current → Value → CTA',
    description: 'Estabelece a situação atual do lead, conecta valor e encerra em CTA claro.'
  },
  {
    id: 'ghost-followup',
    title: 'Ghost Follow-up',
    description: 'Lembretes curtos com tom humano e urgência suave para retomar a conversa.'
  },
  {
    id: 'hyper-personalized',
    title: 'Hyper Personalized',
    description: 'Referências de dados específicos do lead (empresa, setor, dores).'
  }
]

const tutorialSteps = [
  {
    title: '1. Configure o objetivo e persona',
    description: 'Use o bloco de IA para informar objetivo (+ persona, prospect, empresa e dores). Escolha um template e tom realista.'
  },
  {
    title: '2. Gere a cadência com IA',
    description: 'Clique em "Gerar Sequência" para criar passos com canais e gatilhos inteligentes. A IA entrega assunto, corpo, canal e trigger.'
  },
  {
    title: '3. Ajuste manualmente',
    description: 'Adicione ou edite passos no editor manual, escolha o canal (email/LinkedIn/SMS/call) e defina gatilhos condicionais.'
  },
  {
    title: '4. Use a linha do tempo e analytics',
    description: 'Acompanhe o preview cronológico, veja métricas (open, reply, meetings e deliverability) e valide o fluxo antes de ativar.'
  },
  {
    title: '5. Aqueça domínio e exporte',
    description: 'Dispare a sequência de warm-up e exporte o JSON para CRM ou ferramenta favorita. Clique em "Exportar relatório para CRM".'
  }
]

const deliverabilityTips = [
  'Priorize warm-up + sequências curtas para novos domínios.',
  'Use gatilhos condicionais para evitar cadências genéricas.',
  'Monitore respostas e exporte para HubSpot/Salesforce quando pronto.'
]

const warmupBlueprint: Omit<SequenceStep, 'id'>[] = [
  {
    subject: 'Teste de entrega e warm-up',
    delay: 0,
    body: 'Estamos verificando se tudo chega certinho antes da cadência oficial.',
    channel: 'email',
    trigger: 'none'
  },
  {
    subject: 'Confirmação de recepção',
    delay: 1,
    body: 'Só um alinhamento rápido para garantir que a caixa chegou e está ativa.',
    channel: 'email',
    trigger: 'none'
  }
]

const isChannel = (value: any): value is Channel => channelOrder.includes(value)
const isTrigger = (value: any): value is Trigger => triggerOrder.includes(value)

export default function SequenciaEmail() {
  const navigate = useNavigate()

  const [steps, setSteps] = useState<SequenceStep[]>([
    {
      id: 's1',
      subject: 'Proposta Inicial',
      delay: 0,
      body: 'Ol�, compartilho a proposta inicial e pr�ximos passos.',
      channel: 'email',
      trigger: 'none'
    },
    {
      id: 's2',
      subject: 'Relembrar valor',
      delay: 3,
      body: 'Detalhei novamente os ganhos e cases similares.',
      channel: 'email',
      trigger: 'open'
    },
    {
      id: 's3',
      subject: 'Pr�ximo passo',
      delay: 7,
      body: 'Vamos alinhar a assinatura e definir a implem.',
      channel: 'call',
      trigger: 'reply'
    }
  ])

  const [subject, setSubject] = useState('')
  const [delay, setDelay] = useState(2)
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState<Channel>('email')
  const [trigger, setTrigger] = useState<Trigger>('none')

  const [goal, setGoal] = useState('')
  const [persona, setPersona] = useState('')
  const [prospectName, setProspectName] = useState('')
  const [company, setCompany] = useState('')
  const [painPoints, setPainPoints] = useState('')
  const [tone, setTone] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(templateLibrary[0].id)
  const [loadingAi, setLoadingAi] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)

  const analytics = useMemo(() => {
    const emailSteps = steps.filter((step) => step.channel === 'email').length
    const openRate = Math.min(98, 62 + emailSteps * 3)
    const replyTriggers = steps.filter((step) => step.trigger === 'reply').length
    const replyRate = Math.min(55, 25 + replyTriggers * 4)
    const meetings = Math.max(3, Math.min(20, Math.round(8 + steps.length * 1.5)))
    const deliverabilityScore = Math.min(99, Math.round(openRate * 0.95))
    return { openRate, replyRate, meetings, deliverabilityScore }
  }, [steps])

  const handleSaveStep = () => {
    if (!subject || !body) {
      toast.error('Preencha assunto e mensagem')
      return
    }

    const updatedStep = { subject, delay, body, channel, trigger }

    setSteps((prev) => {
      if (editingStepId) {
        return prev.map((step) =>
          step.id === editingStepId ? { ...step, ...updatedStep } : step
        )
      }

      return [...prev, { id: `s-${Date.now()}`, ...updatedStep }]
    })

    if (editingStepId) {
      toast.success('Passo atualizado!')
    } else {
      toast.success('Passo adicionado!')
    }

    setSteps((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, subject, delay, body, channel, trigger }
    ])
    setSubject('')
    setBody('')
    setDelay(2)
    setChannel('email')
    setTrigger('none')
    setEditingStepId(null)
  }

  const handleAddStep = () => {
    handleSaveStep()
  }

  const handleDeleteStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  const handleBeginEdit = (step: SequenceStep) => {
    setEditingStepId(step.id)
    setSubject(step.subject)
    setDelay(step.delay)
    setBody(step.body)
    setChannel(step.channel)
    setTrigger(step.trigger)
  }

  const handleCancelEdition = () => {
    setEditingStepId(null)
    setSubject('')
    setDelay(2)
    setBody('')
    setChannel('email')
    setTrigger('none')
  }

  const handleGenerateSequence = async () => {
    if (!goal || !persona) {
      toast.error('Defina objetivo e persona para a IA')
      return
    }

    setLoadingAi(true)
    try {
      const { data, error } = await aiService.generateEmailSequence({
        goal,
        targetPersona: persona,
        prospectName,
        companyName: company,
        painPoints,
        tone,
        template: selectedTemplate
      })

      if (error) {
        throw new Error(error)
      }

      const newSteps = (data?.steps ?? []).map((s: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        subject: s.subject ?? `Passo ${index + 1}`,
        delay: typeof s.day === 'number' ? s.day : index * 2,
        body: s.body ?? 'Conteúdo a ser personalizado.',
        channel: isChannel(s.channel) ? s.channel : 'email',
        trigger: isTrigger(s.trigger) ? s.trigger : 'none'
      }))

      if (!newSteps.length) {
        throw new Error('AI retornou sem passos')
      }

      setSteps(newSteps)
      toast.success('Sequência gerada pela IA!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar sequência. Tente outra combinação.')
    } finally {
      setLoadingAi(false)
    }
  }

  const handleWarmup = () => {
    const warmupSteps = warmupBlueprint.map((step, index) => ({
      ...step,
      id: `warmup-${Date.now()}-${index + 1}`
    }))

    setSteps((prev) => [...warmupSteps, ...prev])
    toast.success('Sequência de warm-up adicionada')
  }

  const handleExport = () => {
    if (typeof document === 'undefined') {
      toast.error('Exportação indisponível neste ambiente')
      return
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      goal,
      persona,
      steps
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `sequencia-email-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Sequência exportada como JSON para CRM')
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto p-6 md:p-10 min-h-screen text-slate-900 dark:text-slate-100">
      <button
        onClick={() => navigate('/app/ferramentas-pro')}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Ferramentas Pro
      </button>

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sequência de Cadência Inteligente</h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
              Crie cadências multichannel com IA, gatilhos condicionais, análise de entregabilidade e exportação
              direta para o CRM.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="self-start rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
          >
            Tutorial de como usar
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Inclua dados do prospect, personalize o tom, escolha o template e lance uma sequência com timeline, analytics e
          warm-up em poucos cliques.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-10 bg-purple-500/5 rounded-full blur-2xl -mr-5 -mt-5 pointer-events-none" />
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">Gerador de Sequência com IA</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs uppercase text-slate-500 tracking-wider block mb-1">Objetivo</label>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ex: Agendar reunião com CEO"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500 tracking-wider block mb-1">Público-alvo</label>
                <input
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  placeholder="Ex: Diretores de Marketing de SaaS"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs uppercase text-slate-500 tracking-wider block mb-1">Prospect</label>
                <input
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  placeholder="Nome do contato"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500 tracking-wider block mb-1">Empresa</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Empresa / setor"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500 tracking-wider block mb-1">Tom desejado</label>
                <input
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="Ex: direto e consultivo"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <label className="text-xs uppercase text-slate-500 tracking-wider block mb-1">Pontos de dor</label>
              <textarea
                rows={3}
                value={painPoints}
                onChange={(e) => setPainPoints(e.target.value)}
                placeholder="Liste dores ou oportunidades para o prospect"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2 mb-4">
              <label className="text-xs uppercase text-slate-500 tracking-wider block mb-1">Templates & frameworks</label>
              <div className="flex flex-wrap gap-2">
                {templateLibrary.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`px-3 py-1.5 rounded-2xl border text-xs font-semibold transition ${
                      selectedTemplate === template.id
                        ? 'bg-purple-600 text-white border-transparent'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {template.title}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 tracking-wide">
                Templates inspirados em frameworks de resposta do mercado para reforçar personalização e clareza na CTA.
              </p>
            </div>
            <button
              onClick={handleGenerateSequence}
              disabled={loadingAi}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-medium text-white text-sm shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingAi ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loadingAi ? 'Criando estratégia...' : 'Gerar Sequência Completa com IA'}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
                <Mail className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Adicionar passo manual
              </div>
              {editingStepId && (
                <p className="text-[11px] text-amber-500">Editando passo selecionado. Clique em “Cancelar edição” para começar do zero.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase text-slate-500 tracking-wider">Assunto</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase text-slate-500 tracking-wider">Atraso (dias)</label>
              <input
                type="number"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase text-slate-500 tracking-wider">Mensagem</label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 tracking-wider">Canal</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as Channel)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                >
                  {channelOrder.map((option) => (
                    <option key={option} value={option}>
                      {channelMeta[option].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 tracking-wider">Gatilho</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as Trigger)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                >
                  {triggerOrder.map((option) => (
                    <option key={option} value={option}>
                      {triggerLabels[option]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSaveStep}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> {editingStepId ? 'Salvar alterações' : 'Adicionar passo'}
              </button>
              {editingStepId && (
                <button
                  type="button"
                  onClick={handleCancelEdition}
                  className="w-full py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 h-fit sticky top-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
                <CalendarDays className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Linha do tempo
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Clique em um passo para carregar no editor e ajustar canais/gatilhos.
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Preview cronológico com canais, gatilhos e a possibilidade de ajustar entregabilidade antes de ativar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleWarmup}
                className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              >
                <Zap className="w-4 h-4" /> Sequência de warm-up
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              >
                <DownloadCloud className="w-4 h-4" /> Exportar JSON
              </button>
            </div>
          </div>

          <div className="space-y-3 relative">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800" />
            {steps.map((step) => {
              const { Icon, color, label } = channelMeta[step.channel]
              return (
                <div key={step.id} className="relative pl-10 group">
                  <div className="absolute left-[11px] top-4 w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600 group-hover:border-cyan-500 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900 transition-colors z-10" />
                <div
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
                  onClick={() => handleBeginEdit(step)}
                >
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 mb-1">
                    <span className="font-medium text-slate-900 dark:text-white">{step.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded">
                        Dia {step.delay}
                      </span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDeleteStep(step.id)
                          }}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      <Icon className={`w-3 h-3 ${color}`} />
                      <span>{label}</span>
                      {step.trigger !== 'none' && (
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <GitBranch className="w-3 h-3" /> {triggerLabels[step.trigger]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">{step.body}</p>
                  </div>
                </div>
              )
            })}
            {steps.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-10">Nenhum passo na sequência.</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-center">
              <p className="text-sm text-slate-500">Open rate estimado</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{analytics.openRate}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-center">
              <p className="text-sm text-slate-500">Reply rate projetado</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{analytics.replyRate}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-center">
              <p className="text-sm text-slate-500">Meetings previstos</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{analytics.meetings}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-center">
              <p className="text-sm text-slate-500">Deliverability score</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                {analytics.deliverabilityScore}%
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Tracking e entregabilidade</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Use esse painel para validar ganhos antes de exportar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Exportar relatório para CRM
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
              {deliverabilityTips.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-px text-amber-500">•</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Como usar a Sequência de Cadência</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Siga cada passo para criar, ajustar e disparar cadências inteligentes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTutorial(false)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Fechar
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {tutorialSteps.map((step) => (
                <div key={step.title} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{step.title}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{step.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTutorial(false)}
                className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
              >
                Já entendi, vamos criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
