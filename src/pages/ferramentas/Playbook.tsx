import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  Sparkles,
  Filter,
  RefreshCw,
  PlusCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ObjectionCard } from '../../components/playbook/ObjectionCard'
import { ObjectionFormModal } from '../../components/playbook/ObjectionFormModal'
import {
  ObjectionCardRow,
  ObjectionStage,
  allStages,
  stageVariants,
  useObjectionCards,
  useCreateObjection,
  useDeleteObjection,
  useUpdateObjection
} from '../../hooks/useObjectionPlaybook'
import { aiService } from '../../services/aiService'
import { useAuthStore } from '../../stores/authStore'

interface AIResponse {
  response: string
  rationale: string
  tactic: string
}

export default function Playbook() {
  const navigate = useNavigate()
  const member = useAuthStore((state) => state.member)
  const user = useAuthStore((state) => state.user)
  const { cards, loading, error, refresh } = useObjectionCards()
  const { create, loading: creating, error: createError } = useCreateObjection(refresh)
  const { update, loading: updating, error: updateError } = useUpdateObjection(refresh)
  const { remove, loading: deleting, error: deleteError } = useDeleteObjection(refresh)

  const [query, setQuery] = useState('')
  const [stageFilters, setStageFilters] = useState<ObjectionStage[]>([])
  const [tacticFilters, setTacticFilters] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<ObjectionCardRow | null>(null)
  const [customObjection, setCustomObjection] = useState('')
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const term = query.trim().toLowerCase()
      const matchesQuery =
        !term ||
        card.objection.toLowerCase().includes(term) ||
        card.response.toLowerCase().includes(term) ||
        card.tactic.toLowerCase().includes(term)

      const matchesStage = !stageFilters.length || stageFilters.includes(card.stage)
      const matchesTactic =
        !tacticFilters.length || tacticFilters.includes(card.tactic)

      return matchesQuery && matchesStage && matchesTactic
    })
  }, [cards, query, stageFilters, tacticFilters])

  const tacticOptions = useMemo(() => {
    const unique = Array.from(new Set(cards.map((card) => card.tactic)))
    return unique.sort()
  }, [cards])

  const stats = useMemo(() => {
    const custom = cards.filter((card) => !card.is_default).length
    const defaults = cards.filter((card) => card.is_default).length
    return { total: cards.length, custom, defaults }
  }, [cards])

  const handleStageToggle = (stage: ObjectionStage) => {
    setStageFilters((prev) =>
      prev.includes(stage) ? prev.filter((item) => item !== stage) : [...prev, stage]
    )
  }

  const handleTacticToggle = (tactic: string) => {
    setTacticFilters((prev) =>
      prev.includes(tactic) ? prev.filter((item) => item !== tactic) : [...prev, tactic]
    )
  }

  const openCreateModal = () => {
    setEditingCard(null)
    setIsModalOpen(true)
  }

  const openEditModal = (card: ObjectionCardRow) => {
    setEditingCard(card)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCard(null)
  }

  const handleModalSave = async (payload: {
    objection: string
    response: string
    tactic: string
    stage: ObjectionStage
    team_id?: string | null
  }) => {
    if (editingCard) {
      const result = await update(editingCard.id, payload)
      if (result) {
        toast.success('Card atualizado com sucesso')
        closeModal()
      } else {
        toast.error(updateError ?? 'Não foi possível atualizar o card')
      }
      return
    }

    const result = await create(payload)
    if (result) {
      toast.success('Card criado com sucesso')
      closeModal()
    } else {
      toast.error(createError ?? 'Não foi possível criar o card')
    }
  }

  const handleDeleteCard = async (card: ObjectionCardRow) => {
    if (!confirm('Tem certeza que deseja excluir este card?')) {
      return
    }

    const result = await remove(card.id)
    if (result) {
      toast.success('Card removido')
    } else {
      toast.error(deleteError ?? 'Não foi possível excluir este card')
    }
  }

  const handleAskAI = async () => {
    if (!customObjection.trim()) return
    setLoadingAi(true)
    setAiResponse(null)
    try {
      const { data, error: aiError } = await aiService.handleObjection(customObjection.trim())
      if (aiError) throw new Error(aiError)
      setAiResponse({
        response: data.response,
        rationale: data.rationale,
        tactic: data.tactic
      })
    } catch (err) {
      console.error(err)
      toast.error('Erro ao consultar o coach de vendas IA.')
    } finally {
      setLoadingAi(false)
    }
  }

  const userId = user?.id ?? null

  return (
    <div className="w-full max-w-[1440px] mx-auto p-6 md:p-10 min-h-screen text-slate-900 dark:text-slate-100">
      <button
        onClick={() => navigate('/app/ferramentas-pro')}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Ferramentas Pro
      </button>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Playbook de Objeções</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Cards por etapa do funil, táticas aprovadas pelos times de vendas do Brasil e acesso ao coach IA para
            responder objeções ao vivo.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 hover:bg-cyan-500 transition"
        >
          <PlusCircle className="w-5 h-5" /> Novo card
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por objeção, resposta ou tática"
                className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => { setQuery(''); setStageFilters([]); setTacticFilters([]) }}
                className="rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" /> Limpar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allStages.map((stage) => {
                const active = stageFilters.includes(stage)
                const variant = stageVariants[stage]
                return (
                  <button
                    key={stage}
                    onClick={() => handleStageToggle(stage)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${variant.border} ${variant.bg} ${variant.text} ${
                      active ? 'ring-2 ring-cyan-500' : 'hover:ring-1 hover:ring-cyan-300'
                    }`}
                  >
                    <Filter className="inline w-3 h-3 mr-1" /> {stage}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {tacticOptions.length ? (
                tacticOptions.map((tactic) => (
                  <button
                    type="button"
                    key={tactic}
                    onClick={() => handleTacticToggle(tactic)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-800 ${
                      tacticFilters.includes(tactic) ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tactic}
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">Adicione um card para liberar as táticas.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[140px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Total de cards</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="flex-1 min-w-[140px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Cards do time</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.custom}</p>
              </div>
              <div className="flex-1 min-w-[140px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Cards padrão</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.defaults}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 animate-pulse"
                  />
                ))
              : filteredCards.map((card) => (
                  <ObjectionCard
                    key={card.id}
                    card={card}
                    isEditable={!card.is_default && card.user_id === userId}
                    onEdit={openEditModal}
                    onDelete={handleDeleteCard}
                  />
                ))}
          </div>
          {!loading && !filteredCards.length && (
            <p className="text-sm text-center text-slate-500 dark:text-slate-400">Nenhum card encontrado.</p>
          )}
          {error && (
            <p className="text-sm text-center text-rose-500">{error}</p>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 p-5 shadow-sm sticky top-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Coach IA</p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Objeções em tempo real</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Digite qualquer objeção (mesmo que não esteja no playbook) e receba a resposta tática com justificativa.
            </p>
            <textarea
              value={customObjection}
              onChange={(e) => setCustomObjection(e.target.value)}
              rows={4}
              className="w-full mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Ex: 'Já tenho outro fornecedor e não quero trocar.'"
            />
            <button
              onClick={handleAskAI}
              disabled={loadingAi || !customObjection.trim()}
              className="w-full mt-3 rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 transition disabled:opacity-60"
            >
              {loadingAi ? 'Consultando IA...' : 'Gerar resposta'}
            </button>
            {aiResponse && (
              <div className="mt-4 space-y-3 rounded-2xl border border-purple-200 dark:border-purple-700/40 bg-purple-50 dark:bg-purple-900/40 p-4">
                <p className="text-[11px] uppercase tracking-wider text-purple-600 dark:text-purple-300">Tática sugerida: {aiResponse.tactic}</p>
                <p className="text-sm text-slate-800 dark:text-white leading-relaxed">"{aiResponse.response}"</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-300 italic">Por que funciona? {aiResponse.rationale}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <ObjectionFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleModalSave}
        initial={editingCard ?? undefined}
        saving={creating || updating}
        error={editingCard ? updateError : createError}
        hasTeam={Boolean(member?.tenant_id)}
        teamId={member?.tenant_id ?? null}
      />
    </div>
  )
}
