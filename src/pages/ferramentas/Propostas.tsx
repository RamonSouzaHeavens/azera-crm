import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Download,
  Mail,
  Send,
  FileCheck,
  Loader2,
  ChevronDown,
  Pencil,
  Check,
  Trash2,
  Sparkles,
  Search,
  Briefcase,
  Handshake,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { DocumentPreview, FormData } from '../../components/ferramentas/DocumentPreview'
import { supabase } from '../../lib/supabase'
import { Proposal, ProposalStatus, useProposals } from '../../hooks/useProposals'
import { aiService } from '../../services/aiService'
import jsPDF from 'jspdf'

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type Template = {
  id: string
  name: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

const PROPOSAL_TEMPLATES: Template[] = [
  { id: 't1', name: 'Proposta Comercial', Icon: Briefcase },
  { id: 't2', name: 'Contrato de Servicos', Icon: Handshake },
  { id: 't3', name: 'Orcamento Rapido', Icon: Zap }
]

type ContractStep = 0 | 1 | 2

type ContractForm = {
  contratada: string
  cnpjContratada: string
  enderecoContratada: string
  contratante: string
  cnpjContratante: string
  enderecoContratante: string
  escopo: string
  valor: string
  validadeDias: string
  obrigacoes: string
  penalidades: string
  foro: string
}

type ContractAIResult = {
  summary: string
  clauses: { title: string; body: string }[]
  signatures: string[]
}

const CONTRACT_STEPS: { id: ContractStep; title: string; description: string }[] = [
  { id: 0, title: 'Partes', description: 'Quem contrata e quem presta' },
  { id: 1, title: 'Escopo e valor', description: 'O que sera entregue e por quanto' },
  { id: 2, title: 'Regras', description: 'Obrigacoes, penalidades e foro' }
]

const STATUS_OPTIONS: { value: ProposalStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'sent', label: 'Enviada' },
  { value: 'accepted', label: 'Vendida' },
  { value: 'rejected', label: 'Perdida' }
]

const STATUS_STYLES: Record<ProposalStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  sent: 'bg-sky-100 text-sky-600 border-sky-200',
  accepted: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-600 border-rose-200'
}

export default function Propostas() {
  const navigate = useNavigate()
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    documentValue: '',
    validityDays: '15',
    notes: 'Incluso treinamento de 4h para a equipe.'
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Proposal | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [showClientList, setShowClientList] = useState(false)
  const [contractStep, setContractStep] = useState<ContractStep>(0)
  const [contractForm, setContractForm] = useState<ContractForm>({
    contratada: 'Azera Tecnologia Ltda.',
    cnpjContratada: '',
    enderecoContratada: '',
    contratante: '',
    cnpjContratante: '',
    enderecoContratante: '',
    escopo: '',
    valor: '',
    validadeDias: '12',
    obrigacoes: 'Cumprir SLAs acordados e manter confidencialidade.',
    penalidades: 'Multa de 10% do valor em caso de rescisao antecipada injustificada.',
    foro: 'Foro da comarca de Sao Paulo/SP'
  })
  const [contractAIResult, setContractAIResult] = useState<ContractAIResult | null>(null)
  const [isContractGenerating, setIsContractGenerating] = useState(false)
  const [isContractRegistering, setIsContractRegistering] = useState(false)

  const {
    proposals,
    loading: proposalsLoading,
    error: proposalsError,
    createProposal,
    updateProposalStatus,
    deleteProposal
  } = useProposals()

  useEffect(() => {
    if (searchTerm.length > 2) {
      const fetchClients = async () => {
        const { data } = await supabase
          .from('clientes')
          .select('id, nome, email, telefone, status')
          .ilike('nome', `%${searchTerm}%`)
          .order('nome', { ascending: true })
          .limit(8)

        if (data) setClients(data)
      }
      void fetchClients()
      setShowClientList(true)
    } else {
      setShowClientList(false)
    }
  }, [searchTerm])

  useEffect(() => {
    if (selectedTemplate === 't2') {
      setContractStep(0)
    } else {
      setContractAIResult(null)
    }
  }, [selectedTemplate])

  const selectClient = (client: any) => {
    setFormData((prev) => ({ ...prev, clientName: client.nome }))
    setSearchTerm(client.nome)
    setShowClientList(false)
  }

  const handleClientInput = (value: string) => {
    setFormData((prev) => ({ ...prev, clientName: value }))
    setSearchTerm(value)
  }

  const parseCurrencyValue = (value: string) => {
    const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
    return Number(normalized) || 0
  }

  const updateContractField = (field: keyof ContractForm, value: string) => {
    setContractForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'contratante') {
        setFormData((f) => ({ ...f, clientName: value }))
      }
      if (field === 'valor') {
        setFormData((f) => ({ ...f, documentValue: value }))
      }
      if (field === 'validadeDias') {
        setFormData((f) => ({ ...f, validityDays: value }))
      }
      if (field === 'escopo') {
        setFormData((f) => ({ ...f, notes: value }))
      }
      return next
    })
    setContractAIResult(null)
  }

  const handleGenerateContract = async () => {
    const required = [
      contractForm.contratada,
      contractForm.contratante,
      contractForm.escopo,
      contractForm.valor,
      contractForm.validadeDias
    ]
    if (required.some((value) => !value.trim())) {
      toast.error('Preencha os dados principais antes de gerar o contrato.')
      return
    }

    setIsContractGenerating(true)
    try {
      const { data, error } = await aiService.generateContract(contractForm)
      if (error || !data) {
        throw new Error(error || 'Falha ao gerar contrato com IA.')
      }
      setContractAIResult(data)
      toast.success('Contrato ajustado pela IA.')
    } catch (error) {
      console.error(error)
      toast.error('Nao foi possivel gerar o contrato.')
    } finally {
      setIsContractGenerating(false)
    }
  }

  const buildContractPlainText = (result: ContractAIResult) => {
    const clausesText = result.clauses
      .map((clause, index) => `${index + 1}. ${clause.title}\n${clause.body}`)
      .join('\n\n')
    const assinaturaContratante = contractForm.contratante || 'CONTRATANTE'
    const assinaturaContratada = contractForm.contratada || 'CONTRATADA'
    return [
      'Contrato de Prestacao de Servicos',
      '',
      'Resumo:',
      result.summary,
      '',
      'Clausulas:',
      clausesText,
      '',
      'Assinaturas:',
      `______________________________    ______________________________`,
      `${assinaturaContratada}          ${assinaturaContratante}`
    ].join('\n')
  }

  const downloadContract = (format: 'pdf' | 'doc') => {
    if (!contractAIResult) return
    const filenameBase = `Contrato_${contractForm.contratante || 'cliente'}`
    const plainText = buildContractPlainText(contractAIResult)

    if (format === 'doc') {
      const html = `
        <html>
          <head><meta charset="UTF-8"></head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <h2>Contrato de Prestacao de Servicos</h2>
            ${plainText.replace(/\n/g, '<br/>')}
          </body>
        </html>
      `
      const blob = new Blob([html], { type: 'application/msword' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filenameBase}.doc`
      link.click()
      URL.revokeObjectURL(url)
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Contrato de Prestacao de Servicos', 14, 22)
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    let y = 32

    const addBlock = (title: string, text: string) => {
      doc.setFontSize(11)
      doc.text(title, 14, y)
      y += 6
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(text, 180)
      lines.forEach((line: string) => {
        if (y > 280) {
          doc.addPage()
          y = 20
        }
        doc.text(line, 14, y)
        y += 6
      })
      y += 4
    }

    addBlock('Resumo', contractAIResult.summary)
    contractAIResult.clauses.forEach((clause, index) => {
      addBlock(`${index + 1}. ${clause.title}`, clause.body)
    })

    // Assinaturas
    doc.setFontSize(11)
    doc.text('Assinaturas', 14, y)
    y += 18
    const lineWidth = 70
    doc.line(14, y, 14 + lineWidth, y)
    doc.line(120, y, 120 + lineWidth, y)
    y += 6
    doc.text(contractForm.contratada || 'CONTRATADA', 14, y)
    doc.text(contractForm.contratante || 'CONTRATANTE', 120, y)

    doc.save(`${filenameBase}.pdf`)
  }

  const handleRegisterContract = async () => {
    if (!contractAIResult) {
      toast.error('Gere o contrato com IA antes de registrar.')
      return
    }
    const numericValue = parseCurrencyValue(contractForm.valor || formData.documentValue)
    if (!contractForm.contratante.trim() || numericValue <= 0) {
      toast.error('Informe contratante e valor validos para registrar.')
      return
    }

    setIsContractRegistering(true)
    try {
      await createProposal({
        client_name: contractForm.contratante,
        value: numericValue,
        template_id: 't2',
        status: 'pending'
      })
      toast.success('Contrato registrado no CRM.')
    } catch (error) {
      console.error(error)
      toast.error('Nao foi possivel registrar o contrato.')
    } finally {
      setIsContractRegistering(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedTemplate) return
    const totalValue = parseCurrencyValue(formData.documentValue)

    if (!formData.clientName.trim()) {
      toast.error('Informe o nome do cliente para registrar a proposta.')
      return
    }

    if (totalValue <= 0) {
      toast.error('Informe um valor valido para a proposta.')
      return
    }

    setIsGenerating(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const payload = {
        templateId: selectedTemplate,
        clientName: formData.clientName,
        value: `R$ ${formData.documentValue}`,
        validity: formData.validityDays,
        notes: formData.notes,
        date: new Date().toLocaleDateString('pt-BR')
      }

      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`
        },
        body: JSON.stringify(payload)
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => null)
        throw new Error(err?.error || 'Falha ao gerar PDF na funcao')
      }

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Proposta_${formData.clientName.replace(/\s/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      await createProposal({
        client_name: formData.clientName,
        value: totalValue,
        template_id: selectedTemplate,
        status: 'pending'
      })

      setSelectedTemplate('')
      toast.success('Proposta registrada com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao gerar o PDF. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const stats = useMemo(() => {
    const openValue = proposals
      .filter((proposal) => proposal.status === 'pending')
      .reduce((acc, curr) => acc + curr.value, 0)
    const acceptedValue = proposals
      .filter((proposal) => proposal.status === 'accepted')
      .reduce((acc, curr) => acc + curr.value, 0)
    const acceptedCount = proposals.filter((proposal) => proposal.status === 'accepted').length
    const totalCount = proposals.length
    const conversion = totalCount ? Math.round((acceptedCount / totalCount) * 100) : 0
    return { openValue, acceptedValue, conversion }
  }, [proposals])

  const handleStatusChange = async (proposalId: string, status: ProposalStatus) => {
    setStatusUpdating((prev) => ({ ...prev, [proposalId]: true }))
    try {
      await updateProposalStatus(proposalId, status)
      toast.success('Status atualizado.')
    } catch (error) {
      console.error(error)
      toast.error('Nao foi possivel atualizar o status.')
    } finally {
      setStatusUpdating((prev) => {
        const updated = { ...prev }
        delete updated[proposalId]
        return updated
      })
    }
  }

  const openEmailModal = (doc: Proposal) => {
    setSelectedDocument(doc)
    setEmailModalOpen(true)
  }

  const markProposalAsSent = async (id: string) => {
    try {
      await updateProposalStatus(id, 'sent')
    } catch (error) {
      console.error(error)
      toast.error('Nao foi possivel marcar como enviada.')
    }
  }

  const handleSendEmail = async (provider: 'gmail' | 'outlook' | 'default') => {
    if (!selectedDocument) return
    const subject = encodeURIComponent(`Proposta: ${selectedDocument.template_id}`)
    const body = encodeURIComponent('Ola,\nSegue em anexo.')
    const email = ''
    let url = `mailto:${email}?subject=${subject}&body=${body}`
    if (provider === 'gmail') {
      url = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`
    } else if (provider === 'outlook') {
      url = `https://outlook.live.com/default.aspx?rru=compose&to=${email}&subject=${subject}&body=${body}`
    }
    window.open(url, '_blank')
    setEmailModalOpen(false)
    toast.success('Cliente de email aberto!')
    await markProposalAsSent(selectedDocument.id)
  }

  const handleSendWhatsApp = async (proposal: Proposal) => {
    const message = encodeURIComponent(`Segue o envio da proposta ${proposal.template_id}.`)
    window.open(`https://wa.me/?text=${message}`, '_blank')
    toast.success('WhatsApp aberto para envio.')
    await markProposalAsSent(proposal.id)
  }

  const handleDelete = (proposal: Proposal) => {
    setDeleteTarget(proposal)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProposal(deleteTarget.id)
      toast.success('Proposta excluida.')
    } catch (error) {
      console.error(error)
      toast.error('Nao foi possivel excluir a proposta.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto p-6 md:p-10 min-h-screen text-slate-900 dark:text-slate-100 space-y-10">
      <button
        onClick={() => navigate('/app/ferramentas-pro')}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Ferramentas Pro
      </button>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gerador de Propostas</h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Converta dados do CRM em documentos premium, acompanhe o pipeline e mantenha a equipe alinhada.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Propostas em aberto</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.openValue)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Vendas no mes</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.acceptedValue)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Taxa de conversao</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.conversion}%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Modelos</label>
            {PROPOSAL_TEMPLATES.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`cursor-pointer rounded-2xl border p-3 transition ${
                  selectedTemplate === template.id
                    ? 'bg-white dark:bg-slate-800 border-cyan-500 shadow-lg'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    <template.Icon className="w-5 h-5 text-slate-600 dark:text-slate-200" />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{template.name}</p>
                  {selectedTemplate === template.id && <Check className="w-4 h-4 text-cyan-500 ml-auto" />}
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-5 p-6 relative bg-white dark:bg-slate-900">
            {selectedTemplate === 't2' ? (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <Pencil className="w-4 h-4 text-cyan-600" />
                  Contrato guiado (IA)
                  <span className="ml-auto text-[11px] text-slate-500">Passo {contractStep + 1}/3</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CONTRACT_STEPS.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setContractStep(step.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        contractStep === step.id
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                      }`}
                    >
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">{step.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{step.description}</p>
                    </button>
                  ))}
                </div>

                {contractStep === 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Contratada</label>
                        <input
                          value={contractForm.contratada}
                          onChange={(e) => updateContractField('contratada', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        />
                        <input
                          value={contractForm.cnpjContratada}
                          onChange={(e) => updateContractField('cnpjContratada', e.target.value)}
                          placeholder="CNPJ contratada"
                          className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        />
                        <input
                          value={contractForm.enderecoContratada}
                          onChange={(e) => updateContractField('enderecoContratada', e.target.value)}
                          placeholder="Endereco contratada"
                          className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Contratante</label>
                        <input
                          value={contractForm.contratante}
                          onChange={(e) => updateContractField('contratante', e.target.value)}
                          placeholder="Razao social ou nome do cliente"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        />
                        <input
                          value={contractForm.cnpjContratante}
                          onChange={(e) => updateContractField('cnpjContratante', e.target.value)}
                          placeholder="CNPJ contratante"
                          className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        />
                        <input
                          value={contractForm.enderecoContratante}
                          onChange={(e) => updateContractField('enderecoContratante', e.target.value)}
                          placeholder="Endereco contratante"
                          className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {contractStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Escopo / Produto</label>
                      <textarea
                        rows={4}
                        value={contractForm.escopo}
                        onChange={(e) => updateContractField('escopo', e.target.value)}
                        placeholder="Descreva o que sera entregue e o resultado esperado."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Valor (R$)</label>
                        <input
                          value={contractForm.valor}
                          onChange={(e) => updateContractField('valor', e.target.value)}
                          placeholder="Ex: 15.000,00"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Validade (dias)</label>
                        <input
                          value={contractForm.validadeDias}
                          onChange={(e) => updateContractField('validadeDias', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {contractStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Obrigacoes</label>
                        <textarea
                          rows={4}
                          value={contractForm.obrigacoes}
                          onChange={(e) => updateContractField('obrigacoes', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Penalidades</label>
                        <textarea
                          rows={4}
                          value={contractForm.penalidades}
                          onChange={(e) => updateContractField('penalidades', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Foro</label>
                      <input
                        value={contractForm.foro}
                        onChange={(e) => updateContractField('foro', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {contractStep > 0 && (
                    <button
                      onClick={() => setContractStep((prev) => (prev - 1) as ContractStep)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Voltar
                    </button>
                  )}
                  {contractStep < 2 && (
                    <button
                      onClick={() => setContractStep((prev) => (prev + 1) as ContractStep)}
                      className="px-4 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-200 dark:border-cyan-800"
                    >
                      Avancar
                    </button>
                  )}
                  {contractStep === 2 && (
                    <button
                      onClick={handleGenerateContract}
                      disabled={isContractGenerating}
                      className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-70"
                    >
                      {isContractGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Blindando contrato...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Gerar contrato com IA
                        </>
                      )}
                    </button>
                  )}
                </div>

                {contractAIResult && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
                    <div className="flex flex-wrap gap-2 items-start justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Contrato ajustado</p>
                        <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{contractAIResult.summary}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => downloadContract('pdf')}
                          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-emerald-500/30 shadow-sm"
                        >
                          <FileCheck className="w-4 h-4" /> Salvar PDF
                        </button>
                        <button
                          onClick={() => downloadContract('doc')}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Salvar DOC
                        </button>
                        <button
                          onClick={handleRegisterContract}
                          disabled={isContractRegistering}
                          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-70"
                        >
                          {isContractRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Registrar no CRM
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-72 overflow-auto pr-1">
                      {contractAIResult.clauses.map((clause, index) => (
                        <div
                          key={index}
                          className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-sm"
                        >
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1">
                            {index + 1}. {clause.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{clause.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`space-y-4 transition-all duration-300 ${
                  selectedTemplate ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'
                }`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <Pencil className="w-4 h-4 text-cyan-600" />
                  Preencha os dados
                </div>
                <div className="relative">
                  <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Cliente</label>
                  <div className="relative">
                    <input
                      value={formData.clientName}
                      onChange={(e) => handleClientInput(e.target.value)}
                      placeholder="Buscar cliente ou digitar livremente"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 pl-9 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                    />
                    <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                  </div>
                  {showClientList && clients.length > 0 && (
                    <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1 shadow-lg max-h-48 overflow-auto">
                      {clients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => selectClient(client)}
                          className="p-2 text-sm text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer border-b last:border-0 border-slate-100 dark:border-slate-700/50"
                        >
                          {client.nome} <span className="text-xs text-slate-500">({client.status})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Valor (R$)</label>
                    <input
                      value={formData.documentValue}
                      onChange={(e) => setFormData((prev) => ({ ...prev, documentValue: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Validade (dias)</label>
                    <input
                      value={formData.validityDays}
                      onChange={(e) => setFormData((prev) => ({ ...prev, validityDays: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1">Observacoes</label>
                  <textarea
                    rows={5}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none resize-none"
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!selectedTemplate || isGenerating}
                  className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center justify-center gap-2 transition"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF Premium...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" /> Gerar proposta registrada
                    </>
                  )}
                </button>
              </div>
            )}
            {!selectedTemplate && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm bg-white/80 dark:bg-slate-900/60 backdrop-blur-md">
                <ChevronDown className="w-6 h-6 mb-2 animate-bounce" />
                Selecione um modelo para comecar
              </div>
            )}
          </div>
          <div className="lg:col-span-4 bg-slate-100 dark:bg-slate-950/30 p-6 flex flex-col items-center gap-4 relative">
            <div className="absolute top-3 right-3 text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" /> Live preview
            </div>
            <div className="w-full max-w-[240px] shadow-2xl transition-transform transform hover:scale-105">
              <DocumentPreview templateId={selectedTemplate} data={formData} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-wider text-slate-500">Historico recente ({proposals.length})</h3>
        {proposalsLoading && (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        )}
        {!proposalsLoading &&
          proposals.map((doc) => (
            <div
              key={doc.id}
              className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm transition-all"
            >
              <div className="flex items-center gap-4 flex-1 w-full">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h5 className="font-semibold text-base text-slate-900 dark:text-white">{doc.template_id}</h5>
                    <span
                      className={`px-3 py-0.5 rounded-full border text-[11px] uppercase tracking-wider ${STATUS_STYLES[doc.status]}`}
                    >
                      {STATUS_OPTIONS.find((option) => option.value === doc.status)?.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      Data {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-100 dark:bg-emerald-400/10 px-2 py-0.5 rounded">
                      {formatCurrency(doc.value)}
                    </span>
                    <span>Cliente {doc.client_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                <select
                  value={doc.status}
                  onChange={(e) => handleStatusChange(doc.id, e.target.value as ProposalStatus)}
                  disabled={!!statusUpdating[doc.id]}
                  className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition border border-slate-200 dark:border-slate-700"
                  title="Baixar"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openEmailModal(doc)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 font-medium rounded-lg border border-blue-200 dark:border-blue-600/20 hover:border-blue-300 dark:hover:border-blue-600/30"
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden lg:inline">Email</span>
                </button>
                <button
                  onClick={() => handleSendWhatsApp(doc)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/30"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden lg:inline">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-2.5 text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition border border-rose-200"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        {!proposalsLoading && !proposals.length && (
          <p className="text-sm text-center text-slate-500 dark:text-slate-400">Nenhuma proposta registrada.</p>
        )}
        {proposalsError && <p className="text-sm text-center text-rose-500">{proposalsError}</p>}
      </div>

      {emailModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 text-center border-b border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enviar por email</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Escolha o provedor</p>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => handleSendEmail('gmail')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-sm border border-slate-200 dark:border-transparent">
                  M
                </div>
                <span className="font-medium text-slate-900 dark:text-white">Gmail</span>
              </button>
              <button
                onClick={() => handleSendEmail('outlook')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0078D4] flex items-center justify-center text-white font-bold shadow-sm">
                  O
                </div>
                <span className="font-medium text-slate-900 dark:text-white">Outlook</span>
              </button>
              <button
                onClick={() => handleSendEmail('default')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
              >
                <Mail className="w-5 h-5 ml-1.5" />
                <span className="font-medium">App padrao</span>
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="w-full py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 text-center border-b border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Excluir proposta</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Deseja excluir "{deleteTarget.template_id}" do cliente {deleteTarget.client_name}?
              </p>
            </div>
            <div className="p-4 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="w-full py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 shadow-lg shadow-rose-500/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


