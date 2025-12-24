// =====================================================
// COMPONENT: Preset Activation
// Modal/página para visualizar e aplicar presets
// =====================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, X, Loader2, Sparkles,
  GitBranch, Hash, FileText, CheckCircle2,
  Zap, ChevronRight, AlertCircle, Trash2
} from 'lucide-react'
import {
  getAvailablePresets,
  getPresetById,
  applyPreset,
  checkPresetApplied,
  revertPreset,
  type PresetConfig
} from '../services/presetService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

interface PresetActivationProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
  presetId?: string // Se passado, mostra apenas este preset
}

export function PresetActivation({ isOpen, onClose, onComplete, presetId }: PresetActivationProps) {
  const { tenant, user } = useAuthStore()
  const tenantId = tenant?.id ?? ''
  const userId = user?.id ?? ''

  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [presets, setPresets] = useState<PresetConfig[]>([])
  const [selectedPreset, setSelectedPreset] = useState<PresetConfig | null>(null)
  const [appliedPresets, setAppliedPresets] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<{
    success: boolean
    applied: { pipelineStages: number; leadFields: number; productFields: number; playbooks: number }
    errors: string[]
  } | null>(null)

  // Carregar presets
  useEffect(() => {
    async function loadPresets() {
      setLoading(true)

      const available = presetId
        ? [getPresetById(presetId)].filter(Boolean) as PresetConfig[]
        : getAvailablePresets()

      setPresets(available)

      // Só auto-seleciona se um presetId específico foi passado
      if (presetId && available.length === 1) {
        setSelectedPreset(available[0])
      }

      // Verificar quais já foram aplicados
      if (tenantId) {
        const appliedSet = new Set<string>()
        for (const preset of available) {
          const isApplied = await checkPresetApplied(tenantId, preset.id)
          if (isApplied) appliedSet.add(preset.id)
        }
        setAppliedPresets(appliedSet)
      }

      setLoading(false)
    }

    if (isOpen) {
      loadPresets()
      setResult(null)
    }
  }, [isOpen, presetId, tenantId])

  // Aplicar preset
  const handleApply = async () => {
    if (!selectedPreset || !tenantId || !userId) return

    setApplying(true)
    setResult(null)

    try {
      const applyResult = await applyPreset(tenantId, selectedPreset.id, userId)
      setResult(applyResult)

      if (applyResult.success) {
        setAppliedPresets(prev => new Set(prev).add(selectedPreset.id))
        toast.success('Preset aplicado com sucesso!')

        // Aguardar um pouco para mostrar resultado antes de fechar
        setTimeout(() => {
          onComplete?.()
        }, 2000)
      } else if (applyResult.errors.length > 0) {
        toast.error(applyResult.errors[0])
      }
    } catch (err) {
      console.error('[PresetActivation] Erro:', err)
      toast.error('Erro ao aplicar preset')
    } finally {
      setApplying(false)
    }
  }

  // Reverter preset
  const handleRevert = async () => {
    if (!selectedPreset || !tenantId || !userId) return

    if (!confirm('Tem certeza? Isso irá remover os playbooks e campos criados por este preset. Dados já preenchidos nesses campos serão perdidos.')) return

    setReverting(true)

    try {
      const result = await revertPreset(tenantId, selectedPreset.id)

      if (result.success) {
        setAppliedPresets(prev => {
          const next = new Set(prev)
          next.delete(selectedPreset.id)
          return next
        })
        toast.success('Preset revertido com sucesso!')
        onClose() // Fecha o modal após reverter para evitar estados inconsistentes
      } else if (result.errors.length > 0) {
        toast.error(result.errors[0])
      }
    } catch (err) {
      console.error('[PresetActivation] Erro ao reverter:', err)
      toast.error('Erro ao reverter preset')
    } finally {
      setReverting(false)
    }
  }

  if (!isOpen) return null

  const isAlreadyApplied = selectedPreset ? appliedPresets.has(selectedPreset.id) : false

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-[#0a0a0b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Configuração Rápida</h2>
                <p className="text-sm text-gray-400">Aplique um preset para começar rapidamente</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
                <p className="text-gray-400 text-sm">Carregando presets...</p>
              </div>
            ) : result?.success ? (
              // Resultado de sucesso
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Preset Aplicado!</h3>
                <p className="text-gray-400 mb-6">Sua conta foi configurada com sucesso.</p>

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-2xl font-bold text-cyan-400">{result.applied.pipelineStages}</p>
                    <p className="text-xs text-gray-400">Etapas do Funil</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-2xl font-bold text-blue-400">{result.applied.productFields}</p>
                    <p className="text-xs text-gray-400">Campos de Produto</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-2xl font-bold text-purple-400">{result.applied.leadFields}</p>
                    <p className="text-xs text-gray-400">Campos de Lead</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-2xl font-bold text-amber-400">{result.applied.playbooks}</p>
                    <p className="text-xs text-gray-400">Playbooks</p>
                  </div>
                </div>
              </motion.div>
            ) : selectedPreset ? (
              // Detalhes do preset selecionado
              <div className="space-y-6">
                {/* Preset Header */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-3xl">
                    {selectedPreset.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-white">{selectedPreset.name}</h3>
                      {isAlreadyApplied && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                          Aplicado
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{selectedPreset.description}</p>
                  </div>
                </div>

                {/* O que será criado */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wide">O que será configurado:</h4>

                  <div className="grid gap-3">
                    <PresetFeatureCard
                      icon={<GitBranch className="w-4 h-4" />}
                      title="Pipeline de Vendas"
                      description={`${selectedPreset.pipelineStages.length} etapas do funil de vendas`}
                      items={selectedPreset.pipelineStages.map(s => s.label)}
                      color="cyan"
                    />

                    <PresetFeatureCard
                      icon={<Hash className="w-4 h-4" />}
                      title={selectedPreset.category === 'real_estate' ? 'Campos para Imóveis' : 'Campos para Produtos/Serviços'}
                      description={`${selectedPreset.productCustomFields.length} campos personalizados`}
                      items={selectedPreset.productCustomFields.slice(0, 5).map(f => f.field_label)}
                      moreCount={Math.max(0, selectedPreset.productCustomFields.length - 5)}
                      color="blue"
                    />

                    <PresetFeatureCard
                      icon={<Hash className="w-4 h-4" />}
                      title="Campos para Leads"
                      description={`${selectedPreset.leadCustomFields.length} campos de qualificação`}
                      items={selectedPreset.leadCustomFields.slice(0, 5).map(f => f.field_label)}
                      moreCount={Math.max(0, selectedPreset.leadCustomFields.length - 5)}
                      color="purple"
                    />

                    <PresetFeatureCard
                      icon={<FileText className="w-4 h-4" />}
                      title="Playbooks de Vendas"
                      description={`${selectedPreset.playbooks.length} scripts prontos`}
                      items={selectedPreset.playbooks.map(p => p.name)}
                      color="amber"
                    />
                  </div>
                </div>

                {/* Aviso */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-300 font-medium mb-1">Não se preocupe!</p>
                    <p className="text-blue-400/80">
                      Seus dados existentes NÃO serão apagados. O preset apenas adiciona novas configurações.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Lista de presets
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset)}
                    className="flex flex-col items-start p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/[0.07] transition-all group text-left h-full relative overflow-hidden"
                  >
                    {/* Background Glow Effect */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 blur-2xl rounded-bl-full -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex justify-between items-start w-full mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-white/5 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-violet-500/20 transition-all duration-300">
                        {preset.icon}
                      </div>

                      {appliedPresets.has(preset.id) && (
                        <span className="px-2 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20">
                          INSTALADO
                        </span>
                      )}
                    </div>

                    <div className="relative z-10 w-full">
                      <h3 className="font-bold text-white text-lg mb-2 group-hover:text-violet-400 transition-colors">
                        {preset.name}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 w-full flex items-center text-xs font-medium text-gray-500 group-hover:text-cyan-400 transition-colors">
                      <span>Ver detalhes</span>
                      <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && !result?.success && (
            <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/[0.02]">
              {selectedPreset && presets.length > 1 ? (
                <button
                  onClick={() => setSelectedPreset(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  ← Voltar
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Pular por agora
                </button>
              )}

              {selectedPreset && (
                isAlreadyApplied ? (
                  <button
                    onClick={handleRevert}
                    disabled={reverting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20"
                  >
                    {reverting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Revertendo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Desinstalar Preset
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Aplicar Preset
                      </>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Sub-componente para cards de features
function PresetFeatureCard({
  icon,
  title,
  description,
  items,
  moreCount = 0,
  color
}: {
  icon: React.ReactNode
  title: string
  description: string
  items: string[]
  moreCount?: number
  color: 'cyan' | 'blue' | 'purple' | 'amber'
}) {
  const colorClasses = {
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  }

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <h5 className="font-medium text-white text-sm">{title}</h5>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="px-2 py-0.5 text-xs rounded-md bg-white/5 text-gray-300 border border-white/10"
          >
            {item}
          </span>
        ))}
        {moreCount > 0 && (
          <span className="px-2 py-0.5 text-xs rounded-md bg-white/10 text-gray-400">
            +{moreCount} mais
          </span>
        )}
      </div>
    </div>
  )
}

// Export um componente wrapper mais simples para uso direto
export function PresetActivationButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className || "flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all hover:scale-105 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 hover:from-violet-500/20 hover:to-cyan-500/20 text-violet-400 border border-violet-500/30"}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">Presets</span>
      </button>

      <PresetActivation
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
