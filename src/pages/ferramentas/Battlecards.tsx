import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Target, Sparkles, Download, Zap, TrendingUp, Award, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface BattlecardData {
  // Seu Produto
  yourProduct: string
  yourPrice: string
  yourFeatures: string
  yourDifferentiators: string

  // Concorrente
  competitorName: string
  competitorPrice: string
  competitorFeatures: string

  // Contexto
  clientName: string
  clientPainPoints: string
}

interface AIAnalysis {
  strengths: string[]
  weaknesses: string[]
  strategy: string[]
  talkingPoints: string[]
  objectionHandling: { objection: string; response: string }[]
}

export default function Battlecards() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)

  const [formData, setFormData] = useState<BattlecardData>({
    yourProduct: '',
    yourPrice: '',
    yourFeatures: '',
    yourDifferentiators: '',
    competitorName: '',
    competitorPrice: '',
    competitorFeatures: '',
    clientName: '',
    clientPainPoints: ''
  })

  const handleInputChange = (field: keyof BattlecardData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const fillExample = () => {
    setFormData({
      yourProduct: 'Azera CRM',
      yourPrice: 'R$ 297/mês',
      yourFeatures: 'Automação de WhatsApp nativa, IA para análise e qualificação de leads, Gerador automático de propostas e contratos, Central de atendimento omnichannel, Integração com Instagram e Facebook, Dashboards em tempo real',
      yourDifferentiators: 'Única plataforma com IA nativa para análise de perfil de cliente, Implementação completa em 7 dias ou dinheiro de volta, Suporte via WhatsApp 24/7 em português, Preço fixo sem cobranças por usuário adicional, Gerador de ROI e propostas integrado',
      competitorName: 'RD Station CRM',
      competitorPrice: 'R$ 59/usuário/mês (mínimo 2 usuários)',
      competitorFeatures: 'Gestão de pipeline de vendas, Relatórios e dashboards, Integração com RD Marketing, Automação de e-mails, Aplicativo mobile',
      clientName: 'Imobiliária Horizonte',
      clientPainPoints: 'Precisa automatizar atendimento via WhatsApp para não perder leads, Quer qualificar leads automaticamente antes de passar para corretores, Busca reduzir tempo de criação de propostas personalizadas, Necessita integrar redes sociais ao CRM, Equipe de 8 corretores precisa de acesso ilimitado'
    })
    toast.success('Exemplo preenchido! Agora clique em "Gerar Estratégia"')
  }

  const handleAnalyze = async () => {
    // Validação
    if (!formData.yourProduct || !formData.competitorName) {
      toast.error('Preencha pelo menos o nome do seu produto e do concorrente')
      return
    }

    setLoading(true)
    try {
      // Prompt otimizado para economizar tokens
      const prompt = `Análise competitiva:
MEU PRODUTO: ${formData.yourProduct}
Preço: ${formData.yourPrice || 'N/A'}
Features: ${formData.yourFeatures || 'N/A'}
Diferenciais: ${formData.yourDifferentiators || 'N/A'}

CONCORRENTE: ${formData.competitorName}
Preço: ${formData.competitorPrice || 'N/A'}
Features: ${formData.competitorFeatures || 'N/A'}

CLIENTE: ${formData.clientName || 'Prospect'}
Dores: ${formData.clientPainPoints || 'N/A'}

Retorne APENAS JSON válido:
{
  "strengths": ["3 pontos fortes MEUS vs concorrente"],
  "weaknesses": ["3 pontos fracos do CONCORRENTE"],
  "strategy": ["3 estratégias de venda"],
  "talkingPoints": ["4 argumentos de venda"],
  "objectionHandling": [{"objection": "objeção comum", "response": "resposta"}]
}`

      const { data, error } = await supabase.functions.invoke('openai-proxy', {
        body: {
          prompt,
          max_tokens: 1500,
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' }
        }
      })

      if (error) throw new Error(error.message)

      const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text

      if (!content) throw new Error('Sem resposta da IA')

      // Parse da resposta
      const analysisData = JSON.parse(content)
      setAnalysis(analysisData)
      toast.success('Análise gerada com sucesso!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar análise. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = () => {
    toast.success('Funcionalidade de PDF em desenvolvimento!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={() => navigate('/app/ferramentas-pro')}
            className="flex items-center gap-2 text-base text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Battlecards Competitivos
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Compare seu produto com a concorrência e receba uma estratégia de venda personalizada pela IA
              </p>
            </div>
            <button
              onClick={fillExample}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-5 h-5" />
              Preencher Exemplo
            </button>
          </div>
        </motion.div>

        {/* Form Section - 3 Columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-3 gap-6 mb-8"
        >
          {/* Seu Produto */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Seu Produto/Serviço
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome do Produto</label>
                <input
                  type="text"
                  placeholder="Ex: Azera CRM"
                  value={formData.yourProduct}
                  onChange={(e) => handleInputChange('yourProduct', e.target.value)}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preço</label>
                <input
                  type="text"
                  placeholder="Ex: R$ 297/mês"
                  value={formData.yourPrice}
                  onChange={(e) => handleInputChange('yourPrice', e.target.value)}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Principais Funcionalidades</label>
                <textarea
                  placeholder="Descreva as principais features do seu produto..."
                  value={formData.yourFeatures}
                  onChange={(e) => handleInputChange('yourFeatures', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none resize-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Seus Diferenciais</label>
                <textarea
                  placeholder="O que torna seu produto único e melhor..."
                  value={formData.yourDifferentiators}
                  onChange={(e) => handleInputChange('yourDifferentiators', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Concorrente */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Concorrente
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome do Concorrente</label>
                <input
                  type="text"
                  placeholder="Ex: RD Station, Salesforce..."
                  value={formData.competitorName}
                  onChange={(e) => handleInputChange('competitorName', e.target.value)}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preço (se souber)</label>
                <input
                  type="text"
                  placeholder="Ex: R$ 500/mês"
                  value={formData.competitorPrice}
                  onChange={(e) => handleInputChange('competitorPrice', e.target.value)}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Funcionalidades Conhecidas</label>
                <textarea
                  placeholder="O que você sabe sobre as features deles..."
                  value={formData.competitorFeatures}
                  onChange={(e) => handleInputChange('competitorFeatures', e.target.value)}
                  rows={7}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 outline-none resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Contexto do Cliente */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Contexto do Cliente
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome do Cliente</label>
                <input
                  type="text"
                  placeholder="Ex: Imobiliária Horizonte"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Dores e Necessidades</label>
                <textarea
                  placeholder="Quais problemas o cliente precisa resolver? O que ele busca?"
                  value={formData.clientPainPoints}
                  onChange={(e) => handleInputChange('clientPainPoints', e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none resize-none transition-all"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Analyze Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8 flex justify-center"
        >
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="max-w-2xl flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white font-black rounded-2xl shadow-2xl shadow-cyan-500/30 transition-all hover:shadow-cyan-500/50 hover:scale-[1.02] active:scale-95 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Sparkles className="w-6 h-6 animate-spin" />
                <span>Analisando com IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                <span>Gerar Estratégia de Venda com IA</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Results Section - 5 Columns */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-5 gap-6 mb-8"
          >
            {/* Pontos Fortes */}
            <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-teal-950/50 rounded-2xl p-6 border-2 border-emerald-200 dark:border-emerald-800 shadow-xl shadow-emerald-200/50 dark:shadow-emerald-900/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Seus Pontos Fortes</h3>
              </div>
              <ul className="space-y-4">
                {analysis.strengths.map((strength, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-4 bg-white/60 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800"
                  >
                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0 text-xl">✓</span>
                    <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{strength}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Pontos Fracos do Concorrente */}
            <div className="bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 dark:from-red-950/50 dark:via-rose-950/50 dark:to-pink-950/50 rounded-2xl p-6 border-2 border-red-200 dark:border-red-800 shadow-xl shadow-red-200/50 dark:shadow-red-900/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-500 rounded-lg">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-red-900 dark:text-red-100">Pontos Fracos Deles</h3>
              </div>
              <ul className="space-y-4">
                {analysis.weaknesses.map((weakness, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-4 bg-white/60 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
                  >
                    <span className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0 text-xl">✗</span>
                    <span className="text-sm font-medium text-red-900 dark:text-red-100">{weakness}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Estratégia */}
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Estratégia</h3>
              </div>
              <div className="space-y-4">
                {analysis.strategy.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                        {i + 1}
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Argumentos */}
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Argumentos</h3>
              </div>
              <div className="space-y-4">
                {analysis.talkingPoints.map((point, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800"
                  >
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <span className="text-amber-600 dark:text-amber-400 mr-2">💡</span>
                      {point}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Objeções */}
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Objeções</h3>
              </div>
              <div className="space-y-4">
                {analysis.objectionHandling.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800"
                  >
                    <p className="text-sm font-bold text-purple-900 dark:text-purple-100 mb-2">
                      ❓ {item.objection}
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      💬 {item.response}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Download Button */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center"
          >
            <button
              onClick={handleDownloadPDF}
              className="max-w-2xl flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95"
            >
              <Download className="w-5 h-5" />
              Baixar Battlecard em PDF
            </button>
          </motion.div>
        )}

        {/* Empty State */}
        {!analysis && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center max-w-lg">
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 blur-3xl opacity-20"></div>
                <Sparkles className="w-20 h-20 text-slate-300 dark:text-slate-700 mx-auto relative" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Pronto para vencer a concorrência?
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Preencha as informações acima e nossa IA irá criar uma estratégia de venda personalizada para você
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
