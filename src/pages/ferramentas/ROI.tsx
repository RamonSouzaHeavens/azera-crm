import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ArrowLeft, TrendingUp, DollarSign, Clock, Zap, Share2, Home, Briefcase, Building2, Percent } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (latest) => Math.round(latest))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' })
    return controls.stop
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = rounded.on('change', (latest) => setDisplayValue(latest))
    return () => unsubscribe()
  }, [rounded])

  return <span>{prefix}{displayValue.toLocaleString('pt-BR')}{suffix}</span>
}

export default function ROICalculator() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'general' | 'real-estate'>('general')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden items-center justify-center py-8">
        <div className="max-w-7xl mx-auto w-full flex flex-col max-h-full px-6">
          {/* Tab Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex-shrink-0"
          >
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all text-base ${activeTab === 'general'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                <Briefcase className="w-5 h-5" />
                Calculadora Geral
              </button>
              <button
                onClick={() => setActiveTab('real-estate')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all text-base ${activeTab === 'real-estate'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                <Home className="w-5 h-5" />
                Investimento Imóveis
              </button>
            </div>
          </motion.div>

          {/* Content - flex-1 para ocupar espaço restante */}
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'general' ? <GeneralCalculator /> : <RealEstateCalculator />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== CALCULADORA GERAL ====================
function GeneralCalculator() {
  const [clientName, setClientName] = useState('')
  const [yourCompany, setYourCompany] = useState('')
  const [solutionName, setSolutionName] = useState('Minha Solução')
  const [setupCost, setSetupCost] = useState(5000)
  const [monthlyCost, setMonthlyCost] = useState(1500)
  const [revenueIncrease, setRevenueIncrease] = useState(15000)
  const [timeSaved, setTimeSaved] = useState(40)
  const [hourlyRate, setHourlyRate] = useState(80)
  const [costReduction, setCostReduction] = useState(3000)

  const result = useMemo(() => {
    const timeSavingsValue = timeSaved * hourlyRate
    const monthlyGain = revenueIncrease + timeSavingsValue + costReduction
    const totalCost12m = setupCost + (monthlyCost * 12)
    const totalGain12m = monthlyGain * 12
    const netProfit12m = totalGain12m - totalCost12m
    const roi = totalCost12m > 0 ? ((netProfit12m / totalCost12m) * 100) : 0
    const monthlyNet = monthlyGain - monthlyCost
    const payback = monthlyNet > 0 ? (setupCost / monthlyNet) : 999

    return { roi, payback, monthlyGain, monthlyNet, netProfit12m, totalCost12m, totalGain12m, timeSavingsValue }
  }, [setupCost, monthlyCost, revenueIncrease, timeSaved, hourlyRate, costReduction])

  const chartData = useMemo(() => {
    const data = []
    let cumulativeCost = setupCost
    let cumulativeGain = 0

    for (let i = 1; i <= 12; i++) {
      cumulativeCost += monthlyCost
      cumulativeGain += result.monthlyGain
      data.push({
        month: `Mês ${i}`,
        investimento: Math.round(cumulativeCost),
        retorno: Math.round(cumulativeGain),
        lucro: Math.round(cumulativeGain - cumulativeCost)
      })
    }
    return data
  }, [setupCost, monthlyCost, result.monthlyGain])

  const generatePDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20).setFont('helvetica', 'bold')
    doc.text(yourCompany || 'Sua Empresa', 14, 20)
    doc.setFontSize(16).setTextColor(6, 182, 212)
    doc.text('Análise de ROI', 14, 30)
    doc.setFontSize(12).setTextColor(100, 100, 100)
    doc.text(`Cliente: ${clientName || 'Cliente'}`, 14, 38)
    doc.text(`Solução: ${solutionName}`, 14, 44)
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 50)

    const summary = [
      ['Investimento Total (12 meses)', formatCurrency(result.totalCost12m)],
      ['Retorno Total (12 meses)', formatCurrency(result.totalGain12m)],
      ['Lucro Líquido (12 meses)', formatCurrency(result.netProfit12m)],
      ['ROI', `${result.roi.toFixed(0)}%`],
      ['Payback', `${result.payback.toFixed(1)} meses`]
    ]

    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor']],
      body: summary,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212] }
    })

    doc.setFontSize(10).setTextColor(150, 150, 150)
    doc.text(`Gerado por ${yourCompany || 'Sua Empresa'}`, 14, doc.internal.pageSize.height - 10)
    doc.save(`ROI_${clientName || 'Cliente'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    toast.success('PDF gerado com sucesso!')
  }

  return (
    <div className="grid lg:grid-cols-12 gap-4 h-full">
      <div className="lg:col-span-5 space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent">
        {/* Back Button */}
        <button
          onClick={() => navigate('/app/ferramentas-pro')}
          className="flex items-center gap-2 text-base text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        {/* Client Info */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Informações da Proposta</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nome do Cliente</label>
              <input
                type="text"
                placeholder="Empresa XYZ Ltda"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full px-3 py-2 text-base rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sua Empresa</label>
                <input
                  type="text"
                  placeholder="Minha Empresa"
                  value={yourCompany}
                  onChange={e => setYourCompany(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome da Solução</label>
                <input
                  type="text"
                  placeholder="Sistema de Gestão"
                  value={solutionName}
                  onChange={e => setSolutionName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Investment */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-500" />
            Investimento
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Investimento Inicial" value={setupCost} onChange={setSetupCost} prefix="R$ " />
            <InputField label="Custo Mensal" value={monthlyCost} onChange={setMonthlyCost} prefix="R$ " />
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Benefícios Mensais
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Aumento de Receita" value={revenueIncrease} onChange={setRevenueIncrease} prefix="R$ " />
              <InputField label="Redução de Custos" value={costReduction} onChange={setCostReduction} prefix="R$ " />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <InputField label="Horas Economizadas" value={timeSaved} onChange={setTimeSaved} suffix=" h" />
              <InputField label="Valor da Hora" value={hourlyRate} onChange={setHourlyRate} prefix="R$ " />
            </div>
          </div>
        </div>
      </div>

      <ResultsPanel result={result} chartData={chartData} onGeneratePDF={generatePDF} />
    </div>
  )
}

// ==================== CALCULADORA IMOBILIÁRIA ====================
function RealEstateCalculator() {
  const [clientName, setClientName] = useState('')
  const [yourCompany, setYourCompany] = useState('')

  // Dados do imóvel
  const [propertyValue, setPropertyValue] = useState(500000) // Valor do imóvel
  const [downPayment, setDownPayment] = useState(100000) // Entrada
  const [monthlyRent, setMonthlyRent] = useState(2500) // Aluguel mensal esperado
  const [appreciation, setAppreciation] = useState(8) // Valorização anual (%)
  const [monthlyCosts, setMonthlyCosts] = useState(500) // Custos mensais (condomínio, IPTU, etc)
  const [vacancyRate, setVacancyRate] = useState(5) // Taxa de vacância (%)

  const result = useMemo(() => {
    // Aluguel líquido (considerando vacância)
    const effectiveRent = monthlyRent * (1 - vacancyRate / 100)
    const monthlyNet = effectiveRent - monthlyCosts
    const yearlyRent = monthlyNet * 12

    // Valorização do imóvel
    const appreciationValue = propertyValue * (appreciation / 100)
    const totalYearlyGain = yearlyRent + appreciationValue

    // ROI
    const roi = downPayment > 0 ? ((totalYearlyGain / downPayment) * 100) : 0

    // Payback (anos)
    const payback = monthlyNet > 0 ? (downPayment / monthlyNet / 12) : 999

    // Yield (Retorno do aluguel)
    const yieldRate = (yearlyRent / propertyValue) * 100

    // Cap Rate
    const capRate = ((monthlyRent * 12 - monthlyCosts * 12) / propertyValue) * 100

    return {
      roi,
      payback,
      monthlyNet,
      yearlyRent,
      appreciationValue,
      totalYearlyGain,
      yieldRate,
      capRate,
      effectiveRent
    }
  }, [propertyValue, downPayment, monthlyRent, appreciation, monthlyCosts, vacancyRate])

  const chartData = useMemo(() => {
    const data = []
    let cumulativeInvestment = downPayment
    let cumulativeReturn = 0
    let currentValue = propertyValue

    for (let i = 1; i <= 10; i++) {
      cumulativeReturn += result.yearlyRent
      currentValue = currentValue * (1 + appreciation / 100)
      const equity = currentValue - propertyValue + downPayment

      data.push({
        year: `Ano ${i}`,
        investimento: Math.round(cumulativeInvestment),
        aluguel: Math.round(cumulativeReturn),
        patrimonio: Math.round(equity)
      })
    }
    return data
  }, [downPayment, propertyValue, result.yearlyRent, appreciation])

  const generatePDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20).setFont('helvetica', 'bold')
    doc.text(yourCompany || 'Sua Imobiliária', 14, 20)
    doc.setFontSize(16).setTextColor(6, 182, 212)
    doc.text('Análise de Investimento Imobiliário', 14, 30)
    doc.setFontSize(12).setTextColor(100, 100, 100)
    doc.text(`Cliente: ${clientName || 'Cliente'}`, 14, 38)
    doc.text(`Imóvel: ${formatCurrency(propertyValue)}`, 14, 44)
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 50)

    const summary = [
      ['Valor do Imóvel', formatCurrency(propertyValue)],
      ['Entrada', formatCurrency(downPayment)],
      ['ROI Anual', `${result.roi.toFixed(1)}%`],
      ['Payback', `${result.payback.toFixed(1)} anos`],
      ['Yield (Retorno Aluguel)', `${result.yieldRate.toFixed(2)}%`],
      ['Cap Rate', `${result.capRate.toFixed(2)}%`],
      ['Renda Mensal Líquida', formatCurrency(result.monthlyNet)]
    ]

    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor']],
      body: summary,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212] }
    })

    doc.setFontSize(10).setTextColor(150, 150, 150)
    doc.text(`Gerado por ${yourCompany || 'Sua Imobiliária'}`, 14, doc.internal.pageSize.height - 10)
    doc.save(`Investimento_Imovel_${clientName || 'Cliente'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    toast.success('PDF gerado com sucesso!')
  }

  return (
    <div className="grid lg:grid-cols-12 gap-4 h-full">
      <div className="lg:col-span-5 space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent">
        {/* Back Button */}
        <button
          onClick={() => navigate('/app/ferramentas-pro')}
          className="flex items-center gap-2 text-base text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        {/* Client Info */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Informações</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do Cliente</label>
              <input
                type="text"
                placeholder="João Silva"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sua Imobiliária</label>
              <input
                type="text"
                placeholder="Imobiliária Prime"
                value={yourCompany}
                onChange={e => setYourCompany(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Property Data */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-500" />
            Dados do Imóvel
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Valor do Imóvel" value={propertyValue} onChange={setPropertyValue} prefix="R$ " />
              <InputField label="Entrada" value={downPayment} onChange={setDownPayment} prefix="R$ " />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <InputField label="Aluguel Mensal" value={monthlyRent} onChange={setMonthlyRent} prefix="R$ " />
              <InputField label="Custos Mensais" value={monthlyCosts} onChange={setMonthlyCosts} prefix="R$ " />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <InputField label="Valorização Anual" value={appreciation} onChange={setAppreciation} suffix="%" />
              <InputField label="Taxa de Vacância" value={vacancyRate} onChange={setVacancyRate} suffix="%" />
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 border border-cyan-200 dark:border-cyan-800">
          <h4 className="text-sm font-bold text-cyan-900 dark:text-cyan-300 mb-2">💡 Indicadores Importantes</h4>
          <ul className="text-sm text-cyan-800 dark:text-cyan-400 space-y-1">
            <li><strong>Yield:</strong> Retorno do aluguel sobre o valor do imóvel</li>
            <li><strong>Cap Rate:</strong> Taxa de capitalização (retorno líquido)</li>
            <li><strong>Payback:</strong> Tempo para recuperar o investimento</li>
          </ul>
        </div>
      </div>

      <RealEstateResultsPanel result={result} chartData={chartData} onGeneratePDF={generatePDF} />
    </div>
  )
}

// ==================== COMPONENTS ====================
function InputField({ label, value, onChange, prefix = '', suffix = '' }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 text-base font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
        />
        {(prefix || suffix) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
            {prefix}{suffix}
          </div>
        )}
      </div>
    </div>
  )
}

function ResultsPanel({ result, chartData, onGeneratePDF }: any) {
  return (
    <div className="lg:col-span-7 space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent">
      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-2xl">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium opacity-80 mb-2">Retorno sobre Investimento</div>
            <div className="text-5xl font-black mb-2">
              <AnimatedNumber value={result.roi} suffix="%" />
            </div>
            <div className="text-sm opacity-90">
              Para cada R$ 1 investido, retorna R$ {((result.roi / 100) + 1).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium opacity-80 mb-2">Tempo de Retorno</div>
            <div className="text-5xl font-black mb-2">
              <AnimatedNumber value={result.payback} suffix="" />
            </div>
            <div className="text-sm opacity-90">
              {result.payback < 12 ? 'meses para recuperar investimento' : 'ROI negativo'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KPICard label="Ganho Mensal" value={formatCurrency(result.monthlyGain)} color="emerald" icon={<TrendingUp className="w-5 h-5" />} />
        <KPICard label="Lucro Mensal" value={formatCurrency(result.monthlyNet)} color="blue" icon={<DollarSign className="w-5 h-5" />} />
        <KPICard label="Lucro 12 Meses" value={formatCurrency(result.netProfit12m)} color="purple" icon={<Zap className="w-5 h-5" />} />
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Projeção de 12 Meses</h4>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tickFormatter={v => `R$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
            />
            <Line type="monotone" dataKey="investimento" stroke="#ef4444" strokeWidth={2} name="Investimento" dot={false} />
            <Line type="monotone" dataKey="retorno" stroke="#10b981" strokeWidth={2} name="Retorno" dot={false} />
            <Line type="monotone" dataKey="lucro" stroke="#06b6d4" strokeWidth={3} name="Lucro Líquido" dot={{ fill: '#06b6d4', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onGeneratePDF}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 text-base"
        >
          <Download className="w-5 h-5" />
          Gerar Proposta em PDF
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
            toast.success('Link copiado!')
          }}
          className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-all flex items-center gap-2 text-base"
        >
          <Share2 className="w-5 h-5" />
          Compartilhar
        </button>
      </div>
    </div>
  )
}

function RealEstateResultsPanel({ result, chartData, onGeneratePDF }: any) {
  return (
    <div className="lg:col-span-7 space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent">
      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-2xl">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium opacity-80 mb-2">ROI Anual</div>
            <div className="text-5xl font-black mb-2">
              <AnimatedNumber value={result.roi} suffix="%" />
            </div>
            <div className="text-sm opacity-90">
              Retorno total sobre a entrada
            </div>
          </div>
          <div>
            <div className="text-sm font-medium opacity-80 mb-2">Payback</div>
            <div className="text-5xl font-black mb-2">
              <AnimatedNumber value={result.payback} suffix="" />
            </div>
            <div className="text-sm opacity-90">
              anos para recuperar investimento
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KPICard label="Yield" value={`${result.yieldRate.toFixed(2)}%`} color="emerald" icon={<Percent className="w-5 h-5" />} />
        <KPICard label="Cap Rate" value={`${result.capRate.toFixed(2)}%`} color="blue" icon={<TrendingUp className="w-5 h-5" />} />
        <KPICard label="Renda Mensal" value={formatCurrency(result.monthlyNet)} color="purple" icon={<DollarSign className="w-5 h-5" />} />
        <KPICard label="Renda Anual" value={formatCurrency(result.yearlyRent)} color="amber" icon={<Zap className="w-5 h-5" />} />
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Projeção de 10 Anos</h4>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tickFormatter={v => `R$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
            />
            <Line type="monotone" dataKey="investimento" stroke="#ef4444" strokeWidth={2} name="Investimento" dot={false} />
            <Line type="monotone" dataKey="aluguel" stroke="#10b981" strokeWidth={2} name="Aluguel Acumulado" dot={false} />
            <Line type="monotone" dataKey="patrimonio" stroke="#06b6d4" strokeWidth={3} name="Patrimônio" dot={{ fill: '#06b6d4', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={onGeneratePDF}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 text-sm"
        >
          <Download className="w-4 h-4" />
          Gerar Análise em PDF
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
            toast.success('Link copiado!')
          }}
          className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-all flex items-center gap-2 text-sm"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar
        </button>
      </div>
    </div>
  )
}

function KPICard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  const colors = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600'
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
        {icon}
        <span className="text-sm font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-xl font-black bg-gradient-to-r ${colors[color as keyof typeof colors]} bg-clip-text text-transparent`}>
        {value}
      </div>
    </div>
  )
}
