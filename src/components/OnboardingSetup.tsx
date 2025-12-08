import { useState } from 'react'
import { ChevronRight, ChevronLeft, Upload, GitBranch, Zap, CheckCircle2, X } from 'lucide-react'

interface OnboardingSetupProps {
  onComplete: () => void
  onSkip: () => void
}

type Step = 'produtos' | 'pipeline' | 'automacao' | 'complete'

const STEPS: Step[] = ['produtos', 'pipeline', 'automacao']
const PIPELINE_STAGES = ['Prospecção', 'Apresentação', 'Negociação', 'Fechamento']

export function OnboardingSetup({ onComplete, onSkip }: OnboardingSetupProps) {
  const [currentStep, setCurrentStep] = useState<Step>('produtos')
  const [productsUploaded, setProductsUploaded] = useState(false)
  const [automationConfigured, setAutomationConfigured] = useState(false)

  const goToNextStep = () => {
    if (currentStep === 'produtos') {
      setCurrentStep('pipeline')
    } else if (currentStep === 'pipeline') {
      setCurrentStep('automacao')
    } else if (currentStep === 'automacao') {
      setCurrentStep('complete')
    }
  }

  const goToPreviousStep = () => {
    if (currentStep === 'pipeline') {
      setCurrentStep('produtos')
    } else if (currentStep === 'automacao') {
      setCurrentStep('pipeline')
    }
  }

  const handleComplete = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-white/10 max-w-2xl w-full overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Configuração Inicial</h2>
            <p className="text-slate-400 text-sm mt-1">3 passos para começar</p>
          </div>
          <button
            onClick={onSkip}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-6">
          <div className="flex gap-2">
            {STEPS.map((step) => (
              <div key={step} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${(currentStep === 'complete' ||
                    STEPS.indexOf(step) < STEPS.indexOf(currentStep as Step))
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : currentStep === step
                      ? 'bg-cyan-500'
                      : 'bg-white/10'
                  }`} />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px]">

          {/* Passo 1: Produtos */}
          {currentStep === 'produtos' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Upload className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-2xl font-bold text-white">Importe seus Produtos</h3>
                </div>
                <p className="text-slate-400">Comece importando um catálogo de produtos. Isso ajuda a organizar suas ofertas e vinculá-las aos seus leads.</p>
              </div>

              <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-2xl p-8 text-center">
                <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-white font-semibold mb-2">Arraste um arquivo CSV ou Excel</p>
                <p className="text-slate-400 text-sm mb-6">Formatos aceitos: .csv, .xlsx, .xls</p>
                <button
                  onClick={() => setProductsUploaded(true)}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all active:scale-95"
                >
                  Selecionar arquivo
                </button>
              </div>

              {productsUploaded && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-300 font-medium">Produtos importados com sucesso!</span>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  💡 <strong>Dica:</strong> Você pode atualizar seus produtos depois. Por agora, é importante ter um catálogo base para começar.
                </p>
              </div>
            </div>
          )}

          {/* Passo 2: Pipeline */}
          {currentStep === 'pipeline' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <GitBranch className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-2xl font-bold text-white">Configure seu Pipeline</h3>
                </div>
                <p className="text-slate-400">Defina os estágios de vendas (ex: Prospecting, Negociação, Ganho). Isso organiza seu fluxo de vendas.</p>
              </div>

              <div className="space-y-3">
                {PIPELINE_STAGES.map((stage, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-white font-medium flex-1">{stage}</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                ))}
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-emerald-300 font-medium">Pipeline padrão criado!</span>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  💡 <strong>Dica:</strong> Você pode customizar ou adicionar novos estágios a qualquer momento em <strong>Configurações</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Passo 3: Automação */}
          {currentStep === 'automacao' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6 text-purple-400" />
                  <h3 className="text-2xl font-bold text-white">Crie sua Primeira Automação</h3>
                </div>
                <p className="text-slate-400">Configure um webhook ou automação para sincronizar dados com WhatsApp, email ou seu CRM externo.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="automation"
                    defaultChecked
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-white font-semibold">WhatsApp Automático</p>
                    <p className="text-slate-400 text-sm">Enviar mensagens quando um lead entra no CRM</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="automation"
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-white font-semibold">Email Automático</p>
                    <p className="text-slate-400 text-sm">Enviar campanhas por email automaticamente</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="automation"
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-white font-semibold">Sincronizar com Integrações</p>
                    <p className="text-slate-400 text-sm">Conectar com N8N, Zapier ou APIs externas</p>
                  </div>
                </label>
              </div>

              <button
                onClick={() => setAutomationConfigured(true)}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95"
              >
                Configurar Automação
              </button>

              {automationConfigured && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-300 font-medium">Automação configurada! Você pode ajustá-la depois.</span>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  💡 <strong>Dica:</strong> Comece com algo simples. Você aprenderá mais sobre automações em <strong>Automações</strong> → <strong>Webhooks</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Completo */}
          {currentStep === 'complete' && (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-2">Pronto para Começar!</h3>
                <p className="text-slate-400">Você completou a configuração inicial. Agora você tem:</p>
              </div>
              <div className="space-y-2 text-left bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-white">✓ Produtos importados</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-white">✓ Pipeline de vendas configurado</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-white">✓ Primeira automação ativa</span>
                </div>
              </div>
              <p className="text-slate-400">Explore o menu e customize tudo de acordo com suas necessidades!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === 'produtos'}
            className="px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Voltar
          </button>

          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors font-medium"
            >
              Pular
            </button>
            {currentStep !== 'complete' ? (
              <button
                onClick={goToNextStep}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 flex items-center gap-2"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95"
              >
                Começar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}