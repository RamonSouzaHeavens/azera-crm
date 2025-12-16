import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, DollarSign, ToggleLeft, ToggleRight, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { expenseService, type Despesa, type NovaDespesa } from '../services/expenseService'

interface ExpenseManagerProps {
  className?: string
  tenantId?: string | null
  canManage: boolean
}

// Mantido fora pois são valores usados no backend,
// a tradução será aplicada apenas na exibição.
const categorias = [
  'Aluguel',
  'Internet',
  'Telefone',
  'Software/Licenças',
  'Marketing',
  'Recursos Humanos',
  'Escritório',
  'Financeiro',
  'Outros'
]

export function ExpenseManager({ className, tenantId, canManage }: ExpenseManagerProps) {
  const { t } = useTranslation()
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<NovaDespesa>({
    categoria: 'Outros',
    descricao: '',
    valor: 0,
    tipo: 'fixa',
    data_vencimento: '',
    ativa: true
  })

  useEffect(() => {
    if (!tenantId || !canManage) {
      setLoading(false)
      return
    }
    void loadDespesas()
  }, [tenantId, canManage])

  const loadDespesas = async () => {
    if (!tenantId || !canManage) return
    try {
      setLoading(true)
      const dados = await expenseService.getDespesas(tenantId)
      setDespesas(dados)
    } catch (error) {
      console.error('Erro ao carregar despesas:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      categoria: 'Outros',
      descricao: '',
      valor: 0,
      tipo: 'fixa',
      data_vencimento: '',
      ativa: true
    })
    setEditingDespesa(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.descricao || formData.valor <= 0) {
      toast.error(t('expenseManager.toasts.requiredFields'))
      return
    }

    try {
      if (!tenantId) {
        toast.error(t('expenseManager.toasts.selectTeam'))
        return
      }
      setSaving(true)

      if (editingDespesa) {
        await expenseService.atualizarDespesa(tenantId, editingDespesa.id, formData)
      } else {
        await expenseService.criarDespesa(tenantId, formData)
      }

      await loadDespesas()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar despesa:', error)
      toast.error(t('expenseManager.toasts.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (despesa: Despesa) => {
    setFormData({
      categoria: despesa.categoria,
      descricao: despesa.descricao,
      valor: despesa.valor,
      tipo: despesa.tipo,
      data_vencimento: despesa.data_vencimento || '',
      ativa: despesa.ativa
    })
    setEditingDespesa(despesa)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    // Usando toast como confirmação
    toast((toastData) => (
      <div className="flex flex-col gap-2">
        <span>{t('expenseManager.toasts.deleteConfirm')}</span>
        <div className="flex gap-2">
          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            onClick={async () => {
              toast.dismiss(toastData.id)
              if (!tenantId) return
              try {
                await expenseService.deletarDespesa(tenantId, id)
                await loadDespesas()
                toast.success(t('expenseManager.toasts.deleteSuccess'))
              } catch (error) {
                console.error('Erro ao deletar despesa:', error)
                toast.error(t('expenseManager.toasts.deleteError'))
              }
            }}
          >
            {t('expenseManager.toasts.buttons.delete')}
          </button>
          <button
            className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
            onClick={() => toast.dismiss(toastData.id)}
          >
            {t('expenseManager.toasts.buttons.cancel')}
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const handleToggleAtiva = async (despesa: Despesa) => {
    try {
      if (!tenantId) return
      await expenseService.toggleAtivaDespesa(tenantId, despesa.id, !despesa.ativa)
      await loadDespesas()
    } catch (error) {
      console.error('Erro ao alterar status da despesa:', error)
    }
  }

  const totalDespesas = despesas.filter(d => d.ativa).reduce((sum, d) => sum + d.valor, 0)
  const totalFixas = despesas.filter(d => d.ativa && d.tipo === 'fixa').reduce((sum, d) => sum + d.valor, 0)
  const totalVariaveis = despesas.filter(d => d.ativa && d.tipo === 'variavel').reduce((sum, d) => sum + d.valor, 0)

  if (!canManage) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <Lock className="h-7 w-7 text-red-600 dark:text-red-300" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t('expenseManager.accessRestricted.title')}</h3>
          <p className="text-sm text-slate-300">
            {t('expenseManager.accessRestricted.description')}
          </p>
        </div>
      </div>
    )
  }

  if (!tenantId) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <p className="text-slate-400">{t('expenseManager.selectTeam')}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="text-slate-400">{t('expenseManager.loading')}</div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header com resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-white/5 border border-white/10">
          <div className="text-xs uppercase text-slate-400 mb-1">{t('expenseManager.summary.total')}</div>
          <div className="text-xl font-bold text-white">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="rounded-xl p-4 bg-white/5 border border-white/10">
          <div className="text-xs uppercase text-slate-400 mb-1">{t('expenseManager.summary.fixed')}</div>
          <div className="text-xl font-bold text-rose-400">R$ {totalFixas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="rounded-xl p-4 bg-white/5 border border-white/10">
          <div className="text-xs uppercase text-slate-400 mb-1">{t('expenseManager.summary.variable')}</div>
          <div className="text-xl font-bold text-purple-400">R$ {totalVariaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Botão adicionar */}
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-white">{t('expenseManager.header.title')}</h4>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('expenseManager.header.addButton')}
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 bg-white/5 border border-white/10 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-lg font-medium text-white">
              {editingDespesa ? t('expenseManager.form.titleEdit') : t('expenseManager.form.titleNew')}
            </h5>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-slate-400 mb-2">{t('expenseManager.form.labels.description')}</label>
              <input
                type="text"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-white placeholder-slate-500"
                placeholder={t('expenseManager.form.placeholders.description')}
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-400 mb-2">{t('expenseManager.form.labels.category')}</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-white"
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat} className="bg-slate-800">
                    {t(`expenseManager.categories.${cat}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-400 mb-2">{t('expenseManager.form.labels.value')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-white placeholder-slate-500"
                placeholder={t('expenseManager.form.placeholders.value')}
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-400 mb-2">{t('expenseManager.form.labels.type')}</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'fixa' | 'variavel' | 'pontual' | 'mensal' | 'pessoal' })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-white"
              >
                <option value="fixa" className="bg-slate-800">{t('expenseManager.form.types.fixed')}</option>
                <option value="variavel" className="bg-slate-800">{t('expenseManager.form.types.variable')}</option>
                <option value="pontual" className="bg-slate-800">{t('expenseManager.form.types.oneTime')}</option>
                <option value="mensal" className="bg-slate-800">{t('expenseManager.form.types.monthly')}</option>
                <option value="pessoal" className="bg-slate-800">{t('expenseManager.form.types.personal')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-400 mb-2">{t('expenseManager.form.labels.dueDate')}</label>
              <input
                type="date"
                value={formData.data_vencimento || ''}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-white"
              />
            </div>

            <div></div> {/* Espaço vazio para manter o grid alinhado */}

            <div className="md:col-span-2">
              <label className="block text-xs uppercase text-slate-400 mb-2">{t('expenseManager.form.labels.additionalDetails')}</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-white placeholder-slate-500 resize-none"
                rows={2}
                placeholder={t('expenseManager.form.placeholders.details')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors"
            >
              {t('expenseManager.form.buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 transition-colors disabled:opacity-50"
            >
              {saving ? t('expenseManager.form.buttons.saving') : editingDespesa ? t('expenseManager.form.buttons.update') : t('expenseManager.form.buttons.save')}
            </button>
          </div>
        </form>
      )}

      {/* Lista de despesas */}
      <div className="space-y-3">
        {despesas.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('expenseManager.emptyState.text')}</p>
            <p className="text-sm">{t('expenseManager.emptyState.subtext')}</p>
          </div>
        ) : (
          despesas.map((despesa) => (
            <div
              key={despesa.id}
              className={`rounded-xl p-4 border transition-all ${despesa.ativa
                ? 'bg-white/5 border-white/10 hover:border-white/20'
                : 'bg-slate-800/30 border-slate-700/50 opacity-60'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h6 className="font-medium text-white">{despesa.descricao}</h6>
                    <span className={`text-xs px-2 py-1 rounded-full ${despesa.tipo === 'fixa'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-purple-500/20 text-purple-300'
                      }`}>
                      {t(`expenseManager.form.types.${despesa.tipo === 'fixa' ? 'fixed' : despesa.tipo === 'variavel' ? 'variable' : 'oneTime'}`)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-600/50 text-slate-300">
                      {t(`expenseManager.categories.${despesa.categoria}`) || despesa.categoria}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="font-bold text-lg text-white">
                      R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {despesa.descricao && (
                      <span>{despesa.descricao}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAtiva(despesa)}
                    className={`p-1 rounded transition-colors ${despesa.ativa ? 'text-green-400 hover:text-green-300' : 'text-slate-500 hover:text-slate-400'
                      }`}
                    title={despesa.ativa ? t('expenseManager.actions.toggleInactive') : t('expenseManager.actions.toggleActive')}
                  >
                    {despesa.ativa ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(despesa)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title={t('expenseManager.actions.edit')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(despesa.id)}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    title={t('expenseManager.actions.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
