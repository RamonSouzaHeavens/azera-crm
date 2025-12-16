import { useState, useEffect } from 'react'
import {
  Trophy, Plus, Edit2, Trash2, Save, X,
  ChevronDown, Power, Search, AlertTriangle,
  Sparkles, Target
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Modal } from '../ui/Modal'
import toast from 'react-hot-toast'

// ============================================================================
// TIPOS
// ============================================================================

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
type AchievementCategory = 'vendas' | 'leads' | 'propostas' | 'tarefas' | 'atividades' | 'especial'

interface Achievement {
  id: string
  tenant_id: string | null
  key: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  metric_type: string
  metric_threshold: number
  tier: AchievementTier
  points: number
  is_active: boolean
  is_default: boolean
  display_order: number
}

// ============================================================================
// CONSTANTES
// ============================================================================

const CATEGORIES: { value: AchievementCategory, label: string }[] = [
  { value: 'vendas', label: '📈 Vendas' },
  { value: 'leads', label: '👥 Leads/Contatos' },
  { value: 'propostas', label: '📄 Propostas' },
  { value: 'tarefas', label: '✅ Tarefas' },
  { value: 'atividades', label: '📞 Atividades' },
  { value: 'especial', label: '⭐ Especial' }
]

const METRIC_TYPES: { value: string, label: string, category: AchievementCategory }[] = [
  { value: 'count_vendas', label: 'Número de Vendas', category: 'vendas' },
  { value: 'count_leads', label: 'Número de Leads', category: 'leads' },
  { value: 'count_propostas', label: 'Número de Propostas', category: 'propostas' },
  { value: 'count_tarefas', label: 'Tarefas Concluídas', category: 'tarefas' },
  { value: 'count_ligacoes', label: 'Número de Ligações', category: 'atividades' },
  { value: 'count_reunioes', label: 'Número de Reuniões', category: 'atividades' }
]

const TIERS: { value: AchievementTier, label: string, color: string }[] = [
  { value: 'bronze', label: 'Bronze', color: 'text-amber-600' },
  { value: 'silver', label: 'Prata', color: 'text-slate-400' },
  { value: 'gold', label: 'Ouro', color: 'text-yellow-500' },
  { value: 'platinum', label: 'Platina', color: 'text-cyan-400' },
  { value: 'diamond', label: 'Diamante', color: 'text-purple-400' }
]

const EMOJI_OPTIONS = ['🏆', '⭐', '🥇', '🥈', '🥉', '🎯', '💫', '🔥', '⚡', '🚀', '👑', '💎', '🏅', '📈', '💪', '🤝', '📞', '✅', '🎉', '🌟']

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function GerenciarConquistas() {
  const { member } = useAuthStore()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    key: '',
    name: '',
    description: '',
    icon: '🏆',
    category: 'vendas' as AchievementCategory,
    metric_type: 'count_vendas',
    metric_threshold: 10,
    tier: 'bronze' as AchievementTier,
    points: 25,
    is_active: true,
    display_order: 0
  })

  // Carregar conquistas
  useEffect(() => {
    async function loadAchievements() {
      if (!member?.tenant_id) return

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('achievement_definitions')
          .select('*')
          .or(`tenant_id.is.null,tenant_id.eq.${member.tenant_id}`)
          .order('display_order', { ascending: true })

        if (error) throw error
        setAchievements(data || [])
      } catch (error) {
        console.error('Erro ao carregar conquistas:', error)
        toast.error('Erro ao carregar conquistas')
      } finally {
        setLoading(false)
      }
    }

    loadAchievements()
  }, [member?.tenant_id])

  // Abrir modal para criar
  const handleCreate = () => {
    setEditingAchievement(null)
    setForm({
      key: '',
      name: '',
      description: '',
      icon: '🏆',
      category: 'vendas',
      metric_type: 'count_vendas',
      metric_threshold: 10,
      tier: 'bronze',
      points: 25,
      is_active: true,
      display_order: achievements.length + 1
    })
    setShowModal(true)
  }

  // Abrir modal para editar
  const handleEdit = (achievement: Achievement) => {
    if (achievement.is_default) {
      toast.error('Conquistas padrão não podem ser editadas')
      return
    }
    setEditingAchievement(achievement)
    setForm({
      key: achievement.key,
      name: achievement.name,
      description: achievement.description || '',
      icon: achievement.icon,
      category: achievement.category,
      metric_type: achievement.metric_type,
      metric_threshold: achievement.metric_threshold,
      tier: achievement.tier,
      points: achievement.points,
      is_active: achievement.is_active,
      display_order: achievement.display_order
    })
    setShowModal(true)
  }

  // Salvar conquista
  const handleSave = async () => {
    if (!member?.tenant_id) return
    if (!form.key || !form.name) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    const toastId = toast.loading(editingAchievement ? 'Atualizando...' : 'Criando...')

    try {
      if (editingAchievement) {
        // Atualizar
        const { error } = await supabase
          .from('achievement_definitions')
          .update({
            key: form.key,
            name: form.name,
            description: form.description,
            icon: form.icon,
            category: form.category,
            metric_type: form.metric_type,
            metric_threshold: form.metric_threshold,
            tier: form.tier,
            points: form.points,
            is_active: form.is_active,
            display_order: form.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAchievement.id)

        if (error) throw error
        toast.success('Conquista atualizada!', { id: toastId })
      } else {
        // Criar
        const { error } = await supabase
          .from('achievement_definitions')
          .insert({
            tenant_id: member.tenant_id,
            key: form.key,
            name: form.name,
            description: form.description,
            icon: form.icon,
            category: form.category,
            metric_type: form.metric_type,
            metric_threshold: form.metric_threshold,
            tier: form.tier,
            points: form.points,
            is_active: form.is_active,
            is_default: false,
            display_order: form.display_order
          })

        if (error) throw error
        toast.success('Conquista criada!', { id: toastId })
      }

      // Recarregar
      setShowModal(false)
      const { data } = await supabase
        .from('achievement_definitions')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${member.tenant_id}`)
        .order('display_order', { ascending: true })
      setAchievements(data || [])

    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast.error(error.message || 'Erro ao salvar conquista', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  // Toggle ativo/inativo
  const handleToggleActive = async (achievement: Achievement) => {
    const toastId = toast.loading('Atualizando...')
    try {
      const { error } = await supabase
        .from('achievement_definitions')
        .update({ is_active: !achievement.is_active })
        .eq('id', achievement.id)

      if (error) throw error

      setAchievements(prev =>
        prev.map(a => a.id === achievement.id ? { ...a, is_active: !a.is_active } : a)
      )
      toast.success(`Conquista ${achievement.is_active ? 'desativada' : 'ativada'}!`, { id: toastId })
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao atualizar', { id: toastId })
    }
  }

  // Excluir conquista
  const handleDelete = async (achievement: Achievement) => {
    if (achievement.is_default) {
      toast.error('Conquistas padrão não podem ser excluídas')
      return
    }

    if (!confirm(`Excluir conquista "${achievement.name}"?`)) return

    const toastId = toast.loading('Excluindo...')
    try {
      const { error } = await supabase
        .from('achievement_definitions')
        .delete()
        .eq('id', achievement.id)

      if (error) throw error

      setAchievements(prev => prev.filter(a => a.id !== achievement.id))
      toast.success('Conquista excluída!', { id: toastId })
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao excluir', { id: toastId })
    }
  }

  // Filtrar por busca
  const filteredAchievements = achievements.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Métricas filtradas por categoria
  const availableMetrics = METRIC_TYPES.filter(m => m.category === form.category)

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Gerenciar Conquistas
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure as conquistas disponíveis para sua equipe
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nova Conquista
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar conquistas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Tabela de Conquistas */}
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Conquista</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Meta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Nível</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">XP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredAchievements.map(achievement => (
                <tr key={achievement.id} className="hover:bg-slate-700/20 transition-colors">
                  {/* Conquista */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div>
                        <p className="font-medium text-white">{achievement.name}</p>
                        <p className="text-xs text-slate-500">{achievement.key}</p>
                      </div>
                      {achievement.is_default && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Padrão
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-300 capitalize">{achievement.category}</span>
                  </td>

                  {/* Meta */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-white">{achievement.metric_threshold}</span>
                  </td>

                  {/* Nível */}
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium capitalize ${TIERS.find(t => t.value === achievement.tier)?.color}`}>
                      {achievement.tier}
                    </span>
                  </td>

                  {/* XP */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-yellow-400">+{achievement.points}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(achievement)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                        achievement.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {achievement.is_active ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(achievement)}
                        disabled={achievement.is_default}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={achievement.is_default ? 'Conquistas padrão não podem ser editadas' : 'Editar'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(achievement)}
                        disabled={achievement.is_default}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={achievement.is_default ? 'Conquistas padrão não podem ser excluídas' : 'Excluir'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAchievements.length === 0 && (
          <div className="py-12 text-center">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma conquista encontrada</p>
          </div>
        )}
      </div>

      {/* Aviso sobre conquistas padrão */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-400">Sobre conquistas padrão</p>
          <p className="text-xs text-amber-300/70 mt-1">
            As conquistas marcadas como "Padrão" são globais do sistema e não podem ser editadas ou excluídas.
            Você pode desativá-las se não quiser que apareçam para sua equipe.
          </p>
        </div>
      </div>

      {/* Modal de Criar/Editar */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAchievement ? 'Editar Conquista' : 'Nova Conquista'}
      >
        <div className="space-y-4">
          {/* Linha 1: Key + Nome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Chave Única *</label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                placeholder="ex: custom_sales_200"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Campeão de Vendas"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Descrição</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Realize 200 vendas"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Linha 2: Ícone + Categoria + Métrica */}
          <div className="grid grid-cols-3 gap-4">
            {/* Ícone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Ícone</label>
              <div className="relative">
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 appearance-none text-2xl"
                >
                  {EMOJI_OPTIONS.map(emoji => (
                    <option key={emoji} value={emoji}>{emoji}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Categoria</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => {
                    const cat = e.target.value as AchievementCategory
                    const firstMetric = METRIC_TYPES.find(m => m.category === cat)
                    setForm({
                      ...form,
                      category: cat,
                      metric_type: firstMetric?.value || 'count_vendas'
                    })
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 appearance-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Métrica */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Métrica</label>
              <div className="relative">
                <select
                  value={form.metric_type}
                  onChange={(e) => setForm({ ...form, metric_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 appearance-none"
                >
                  {availableMetrics.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Linha 3: Threshold + Tier + Points */}
          <div className="grid grid-cols-3 gap-4">
            {/* Threshold */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Meta (quantidade)</label>
              <input
                type="number"
                min="1"
                value={form.metric_threshold}
                onChange={(e) => setForm({ ...form, metric_threshold: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Tier */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nível</label>
              <div className="relative">
                <select
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: e.target.value as AchievementTier })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 appearance-none"
                >
                  {TIERS.map(tier => (
                    <option key={tier.value} value={tier.value}>{tier.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Points */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Pontos XP</label>
              <input
                type="number"
                min="1"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-2">Preview:</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{form.icon}</span>
              <div>
                <p className="font-bold text-white">{form.name || 'Nome da Conquista'}</p>
                <p className="text-sm text-slate-400">{form.description || 'Descrição...'}</p>
              </div>
              <div className="ml-auto text-right">
                <p className={`text-sm font-medium capitalize ${TIERS.find(t => t.value === form.tier)?.color}`}>
                  {form.tier}
                </p>
                <p className="text-xs text-yellow-400 font-bold">+{form.points} XP</p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {editingAchievement ? 'Atualizar' : 'Criar'}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
