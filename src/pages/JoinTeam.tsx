import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { validateInviteToken, acceptInvite, InviteInfo } from '../services/equipeService'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'
import {
  Users,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Phone,
  Briefcase,
  ArrowRight,
  Lock
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

type SimpleInviteInfo = {
  tenant_id: string
  tenant: {
    name: string
    logo_url?: string | null
  }
  role: 'vendedor'
  email: string
  nome: string
  cargo: string
}

const JoinTeam: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { canJoinTeam } = useSubscriptionLimits()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | SimpleInviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSimpleInvite, setIsSimpleInvite] = useState(false)

  const [formData, setFormData] = useState({
    nome: user?.user_metadata?.nome || '',
    telefone: user?.user_metadata?.telefone || '',
    cargo: ''
  })

  const tenantId = searchParams.get('tenant') || searchParams.get('team') || searchParams.get('id')
  const token = searchParams.get('token')

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (!tenantId && !token) {
      setError(t('joinTeam.errors.invalidLink'))
      setLoading(false)
      return
    }

    validateInvite()
  }, [tenantId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const validateInvite = async () => {
    try {
      setLoading(true)

      // Convite simples por tenant_id
      if (tenantId) {
        const tenantInfo = await validateTenantForInvite(tenantId)
        if (!tenantInfo) {
          setError(t('joinTeam.errors.teamNotFound'))
          return
        }

        setInviteInfo({
          tenant_id: tenantId,
          tenant: tenantInfo,
          role: 'vendedor',
          email: user?.email || '',
          nome: '',
          cargo: ''
        })
        setIsSimpleInvite(true)
      }
      // Convite completo por token
      else if (token) {
        const info = await validateInviteToken(token)
        if (!info) {
          setError(t('joinTeam.errors.invalidOrExpired'))
          return
        }

        setInviteInfo(info)
        setIsSimpleInvite(false)

        if (info.nome && !formData.nome) {
          setFormData(prev => ({ ...prev, nome: info.nome }))
        }
        if ((info as any).cargo && !formData.cargo) {
          setFormData(prev => ({ ...prev, cargo: (info as any).cargo || '' }))
        }
      }

    } catch (err) {
      console.error('Erro ao validar convite:', err)
      setError(t('joinTeam.errors.validationError'))
    } finally {
      setLoading(false)
    }
  }

  const validateTenantForInvite = async (tenantId: string) => {
    const { data, error } = await supabase
      .from('tenants')
      .select('name, logo_url')
      .eq('id', tenantId)
      .single()

    if (error || !data) return null
    return data
  }

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteInfo) {
      toast.error(t('joinTeam.errors.noInviteInfo'))
      return
    }

    if (!formData.nome.trim()) {
      toast.error(t('joinTeam.errors.nameRequired'))
      return
    }

    try {
      setSubmitting(true)

      if (isSimpleInvite && tenantId) {
        // Aceitar convite simples (sem token)
        const { error } = await supabase.rpc('accept_simple_invite', {
          p_tenant_id: tenantId,
          p_nome: formData.nome.trim(),
          p_telefone: formData.telefone || null,
          p_cargo: formData.cargo || null
        })

        if (error) throw error

        toast.success(t('joinTeam.success.simple'))
      } else {
        // Aceitar convite completo (com token)
        await acceptInvite(token!, {
          nome: formData.nome.trim(),
          telefone: formData.telefone || undefined,
          cargo: formData.cargo || undefined
        })
        toast.success(t('joinTeam.success.full'))
      }

      navigate('/dashboard')
    } catch (err: any) {
      console.error('Erro ao aceitar convite:', err)
      toast.error(err?.message || t('joinTeam.errors.acceptError'))
    } finally {
      setSubmitting(false)
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('joinTeam.loading')}</p>
        </div>
      </div>
    )
  }

  // Erro
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('joinTeam.error.title')}</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('joinTeam.error.backToDashboard')}
          </button>
        </div>
      </div>
    )
  }

  if (!inviteInfo) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {inviteInfo.tenant.logo_url ? (
              <img src={inviteInfo.tenant.logo_url} alt={inviteInfo.tenant.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <Users className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('joinTeam.title')}
          </h1>
          <p className="text-gray-600">
            {t('joinTeam.invitedToTeam', { team: inviteInfo.tenant.name })}
          </p>
          {!isSimpleInvite && 'invited_by_name' in inviteInfo && inviteInfo.invited_by_name && (
            <p className="text-sm text-gray-500 mt-2">
              {t('joinTeam.invitedBy', { name: inviteInfo.invited_by_name })}
            </p>
          )}
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-600">{t('joinTeam.email')}:</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-600">{t('joinTeam.role')}:</span>
            <span className="text-sm font-medium capitalize">
              {t(`joinTeam.roles.${inviteInfo.role}`)}
            </span>
          </div>
        </div>

        <form onSubmit={handleAcceptInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              {t('joinTeam.form.name.label')} *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('joinTeam.form.name.placeholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              {t('joinTeam.form.phone.label')}
            </label>
            <input
              type="tel"
              value={formData.telefone}
              onChange={(e) => handleInputChange('telefone', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-2" />
              {t('joinTeam.form.position.label')}
            </label>
            <input
              type="text"
              value={formData.cargo}
              onChange={(e) => handleInputChange('cargo', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('joinTeam.form.position.placeholder')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.nome.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t('joinTeam.acceptButton')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            {t('joinTeam.terms')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default JoinTeam