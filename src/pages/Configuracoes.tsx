import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Building, Building2, Shield, Save, User, Phone, Mail, Upload, FileText, Trash2, DollarSign, ArrowLeftRight, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/ui/Modal'
import { useAuthStore, type AuthState } from '../stores/authStore'
import { getUserProfile, updateUserProfile, uploadAvatar } from '../services/profileService'
import { ExpenseManager } from '../components/ExpenseManager'
import { SubscriptionCard } from '../components/SubscriptionCard'

import { useTranslation } from 'react-i18next'

// ====================================================================
// Página NOVA — Configurações (HUD Heavens) com estrutura reescrita
// - React Hook Form + reset() ao receber dados
// - Sem keys dinâmicas que forçam remount
// - Fetches estáveis; .maybeSingle() no company_settings
// ====================================================================

type TabId = 'perfil' | 'empresa' | 'seguranca' | 'documentos_legais' | 'financeiro'

type PerfilForm = {
  full_name: string
  display_name: string
  phone: string
}

type EmpresaForm = {
  nome_fantasia: string
  email: string
  telefone: string
  cnpj: string
  endereco: string
  cep: string
  cidade: string
  estado: string
  pais: string
}

export default function ConfiguracoesNova() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabId>('perfil')
  const location = useLocation()

  // Detecta a aba através da URL
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tabParam = params.get('tab') as TabId
    if (tabParam && ['perfil', 'empresa', 'seguranca', 'documentos_legais', 'financeiro'].includes(tabParam)) {
      setTab(tabParam)
    }
  }, [location.search])

  // ✅ Pega só o que é necessário do store
  const user = useAuthStore((state: AuthState) => state.user)
  const tenant = useAuthStore((state: AuthState) => state.tenant)
  const member = useAuthStore((state: AuthState) => state.member)
  const setProfile = useAuthStore((state: AuthState) => state.setProfile)
  const userId = user?.id ?? ''
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])

  // Apenas owners podem ver/gerenciar o centro financeiro
  const isOwner = member?.role === 'owner'
  const podeGerenciarFinanceiro = isOwner

  // =======================
  // PERFIL
  // =======================
  const [avatarUrl, setAvatarUrl] = useState<string>('') // url pública salva no perfil
  const [avatarBust, setAvatarBust] = useState<number>(0) // cache-busting controlado
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const {
    register: registerPerfil,
    handleSubmit: handleSubmitPerfil,
    reset: resetPerfil,
    formState: { isDirty: perfilDirty },
  } = useForm<PerfilForm>({
    defaultValues: { full_name: '', display_name: '', phone: '' },
  })

  // carrega perfil 1x (ou quando userId muda) e popula via reset()
  useEffect(() => {
    if (!userId) return
    let cancelled = false

      ; (async () => {
        try {
          const profile = await getUserProfile()
          const meta = user?.user_metadata || {}

          // Prioridade: Profile > Meta > Auth > Vazio
          const p = {
            full_name: profile?.full_name || meta.full_name || meta.name || '',
            display_name: profile?.display_name || profile?.full_name || meta.full_name || meta.name || '',
            phone: profile?.phone || meta.phone || user?.phone || '',
            avatar: profile?.avatar_url || meta.avatar_url || '',
          }

          if (cancelled) return
          resetPerfil({
            full_name: p.full_name,
            display_name: p.display_name,
            phone: p.phone,
          })
          setAvatarUrl(p.avatar || '')
        } catch (e) {
          if (!cancelled) console.error('Erro ao carregar perfil:', e)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [userId, user?.user_metadata, resetPerfil])

  const onSubmitPerfil = useCallback(
    async (values: PerfilForm) => {
      console.log('🔵 [onSubmitPerfil] Iniciando salvamento de perfil...')
      console.log('📋 [onSubmitPerfil] Values recebidos:', values)
      console.log('📷 [onSubmitPerfil] Avatar URL:', avatarUrl)
      console.log('👤 [onSubmitPerfil] userId:', userId)

      if (!userId) {
        console.error('❌ [onSubmitPerfil] userId não definido!')
        return
      }

      try {
        setSavingProfile(true)
        const profileData = {
          full_name: values.full_name || '',
          display_name: values.display_name || '',
          phone: values.phone || '',
          avatar_url: avatarUrl || null,
          profile_completed: true,
        }
        console.log('📤 [onSubmitPerfil] Enviando dados:', profileData)

        const ok = await updateUserProfile(profileData)
        console.log('✅ [onSubmitPerfil] updateUserProfile retornou:', ok)

        if (!ok) {
          console.error('❌ [onSubmitPerfil] updateUserProfile retornou false')
          throw new Error('Falha ao atualizar perfil')
        }

        console.log('✅ [onSubmitPerfil] Perfil salvo com sucesso!')

        // 🔄 Recarregar o profile no store para atualizar o header
        console.log('🔄 [onSubmitPerfil] Atualizando store...')
        const updatedProfile = await getUserProfile()
        if (updatedProfile) {
          // Converter UserProfile para ProfileRow
          const profileRow = {
            id: updatedProfile.id,
            display_name: updatedProfile.display_name || values.display_name || values.full_name,
            avatar_url: updatedProfile.avatar_url,
            phone: updatedProfile.phone,
            default_tenant_id: null,
            created_at: updatedProfile.created_at
          }
          setProfile(profileRow)
          console.log('✅ [onSubmitPerfil] Profile atualizado no store:', profileRow)
        } else {
          console.warn('⚠️ [onSubmitPerfil] getUserProfile retornou null')
        }

        toast.success('Perfil atualizado!')
      } catch (e) {
        const error = e as { name?: string; message?: string; code?: string; details?: unknown }
        console.error('❌ [onSubmitPerfil] Erro ao salvar perfil:', e)
        console.error('📌 Detalhes do erro:', {
          name: error?.name,
          message: error?.message,
          code: error?.code,
          details: error?.details,
        })
        toast.error(`Erro ao atualizar perfil: ${error?.message || 'Desconhecido'}`)
      } finally {
        setSavingProfile(false)
      }
    },
    [userId, avatarUrl, setProfile]
  )

  const inputFileRef = useRef<HTMLInputElement | null>(null)
  const handleAvatarUpload = useCallback(async (evt?: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt?.target?.files?.[0]
    if (!file || !userId) return

    if (!file.type.startsWith('image/')) return toast.error('Formato inválido. Envie uma imagem.')
    if (file.size > 5 * 1024 * 1024) return toast.error('Imagem muito grande. Máx. 5MB.')

    try {
      setUploadingAvatar(true)
      const publicUrl = await uploadAvatar(file)
      if (!publicUrl) throw new Error('Upload não retornou URL')

      console.log('✅ Avatar URL:', publicUrl)

      const ok = await updateUserProfile({ avatar_url: publicUrl })
      if (!ok) throw new Error('Erro ao salvar avatar no perfil')

      setAvatarUrl(publicUrl)
      setAvatarBust(Date.now())

      // 🔄 Recarregar o profile no store para atualizar o header
      const updatedProfile = await getUserProfile()
      if (updatedProfile) {
        // Converter UserProfile para ProfileRow
        const profileRow = {
          id: updatedProfile.id,
          display_name: updatedProfile.display_name,
          avatar_url: updatedProfile.avatar_url,
          phone: updatedProfile.phone,
          default_tenant_id: null,
          created_at: updatedProfile.created_at
        }
        setProfile(profileRow)
        console.log('✅ Profile atualizado no store:', profileRow)
      }

      toast.success('Avatar atualizado com sucesso!')
    } catch (e) {
      console.error('❌ Erro no avatar:', e)
      toast.error('Erro ao atualizar avatar')
    } finally {
      setUploadingAvatar(false)
      if (inputFileRef.current) inputFileRef.current.value = ''
    }
  }, [userId, setProfile])

  // =======================
  // EMPRESA
  // =======================
  const [savingEmpresa, setSavingEmpresa] = useState(false)
  const {
    register: registerEmpresa,
    handleSubmit: handleSubmitEmpresa,
    reset: resetEmpresa,
    formState: { isDirty: empresaDirty },
  } = useForm<EmpresaForm>({
    defaultValues: {
      nome_fantasia: '',
      email: '',
      telefone: '',
      cnpj: '',
      endereco: '',
      cep: '',
      cidade: '',
      estado: '',
      pais: 'Brasil',
    },
  })

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false

      ; (async () => {
        try {
          const { data, error } = await supabase
            .from('company_settings')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle() // evita 406 quando não há registro
          if (error) console.warn('company_settings:', error)

          const c = data || {
            nome_fantasia: '',
            email: '',
            telefone: '',
            cnpj: '',
            endereco: '',
            cep: '',
            cidade: '',
            estado: '',
            pais: 'Brasil',
          }
          if (cancelled) return
          resetEmpresa(c)
        } catch (e) {
          if (!cancelled) console.error('Erro ao carregar empresa:', e)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [tenantId, resetEmpresa])

  const onSubmitEmpresa = useCallback(
    async (values: EmpresaForm) => {
      if (!tenantId) return
      try {
        setSavingEmpresa(true)
        const payload = { ...values, tenant_id: tenantId }
        const { error } = await supabase.from('company_settings').upsert(payload, { onConflict: 'tenant_id' })
        if (error) throw error

        window.dispatchEvent(new CustomEvent('companyNameUpdated', { detail: { nome_fantasia: values.nome_fantasia } }))
        toast.success('Configurações salvas!')
      } catch (e) {
        console.error(e)
        toast.error('Falha ao salvar configurações da empresa.')
      } finally {
        setSavingEmpresa(false)
      }
    },
    [tenantId]
  )



  // =======================
  // SENHA
  // =======================
  const [savingPassword, setSavingPassword] = useState(false)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })

  // Delete account state
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const navigate = useNavigate()

  // Handler to delete account (removes app data and signs out)
  const handleDeleteAccount = useCallback(async () => {
    if (!user) return
    if (deleteAccountConfirmText.trim().toLowerCase() !== (user.email || '').trim().toLowerCase()) {
      toast.error('Confirmação inválida. Digite seu email para confirmar.')
      return
    }

    setDeletingAccount(true)
    try {
      // Chamar Edge Function para deletar conta de forma segura
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      if (!accessToken) {
        toast.error('Sessão expirada. Faça login novamente.')
        return
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation_email: deleteAccountConfirmText
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Erro ao deletar conta:', errorData)
        toast.error(errorData.error || 'Erro ao deletar conta. Tente novamente.')
        return
      }

      // Sucesso - sign out e redirecionar
      await supabase.auth.signOut()
      try {
        await useAuthStore.getState().signOut()
      } catch {
        // ignore
      }
      toast.success('Conta deletada com sucesso!')
      navigate('/login')
    } catch (err) {
      console.error('Erro excluindo conta:', err)
      toast.error('Erro ao excluir conta. Tente novamente.')
    } finally {
      setDeletingAccount(false)
      setShowDeleteAccountModal(false)
      setDeleteAccountConfirmText('')
    }
  }, [user, deleteAccountConfirmText, navigate])

  const handleChangePwd = useCallback((k: 'current' | 'next' | 'confirm', v: string) => {
    setPwd((p) => ({ ...p, [k]: v }))
  }, [])

  const handleAtualizarSenha = useCallback(async () => {
    console.log('[DEBUG] === INÍCIO MUDANÇA DE SENHA ===')

    // Validações básicas
    if (!pwd.current || !pwd.next || !pwd.confirm) {
      toast.error('Preencha todos os campos')
      return
    }

    if (pwd.next !== pwd.confirm) {
      toast.error('Nova senha e confirmação não coincidem')
      return
    }

    if (pwd.next.length < 6) {
      toast.error('Nova senha deve ter pelo menos 6 caracteres')
      return
    }

    setSavingPassword(true)

    try {
      // ✅ ESTRATÉGIA 1: Tentar updateUser diretamente (mais simples)
      console.log('[DEBUG] Tentativa 1: updateUser direto...')

      const { data, error } = await supabase.auth.updateUser({
        password: pwd.next
      })

      if (!error) {
        console.log('[DEBUG] ✅ SUCESSO! Senha alterada diretamente. User:', data?.user?.id)

        // Sucesso!
        setPwd({ current: '', next: '', confirm: '' })
        toast.success('✅ Senha alterada! Logout em 3 segundos...')

        setTimeout(async () => {
          await supabase.auth.signOut()
          window.location.reload()
        }, 3000)

        return
      }

      // ✅ ESTRATÉGIA 2: Se falhou, pode ser que precise validar senha atual
      console.log('[DEBUG] Tentativa 1 falhou:', error.message)

      if (error.message.includes('current password') ||
        error.message.includes('password confirmation') ||
        error.message.includes('reauthentication')) {

        console.log('[DEBUG] Tentativa 2: Validando senha atual primeiro...')

        // Primeiro valida a senha atual
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: pwd.current,
        })

        if (signInError) {
          console.error('[DEBUG] Senha atual incorreta:', signInError.message)
          toast.error('Senha atual incorreta')
          return
        }

        console.log('[DEBUG] Senha atual validada, tentando updateUser novamente...')

        // Agora tenta atualizar novamente
        const { data: retryData, error: retryError } = await supabase.auth.updateUser({
          password: pwd.next
        })

        if (retryError) {
          console.error('[DEBUG] Falhou na segunda tentativa:', retryError.message)
          toast.error('Erro: ' + retryError.message)
          return
        }

        console.log('[DEBUG] ✅ SUCESSO na segunda tentativa! User:', retryData?.user?.id)

        // Sucesso!
        setPwd({ current: '', next: '', confirm: '' })
        toast.success('✅ Senha alterada! Logout em 3 segundos...')

        setTimeout(async () => {
          await supabase.auth.signOut()
          window.location.reload()
        }, 3000)

      } else {
        // Erro diferente
        console.error('[DEBUG] Erro não relacionado à validação:', error.message)
        toast.error('Erro: ' + error.message)
      }

    } catch (error) {
      console.error('[DEBUG] Erro inesperado:', error)
      toast.error('Erro inesperado ao alterar senha')
    } finally {
      setSavingPassword(false)
      console.log('[DEBUG] === FIM MUDANÇA DE SENHA ===')
    }
  }, [pwd, user?.email])

  // =======================
  // UI
  // =======================
  const allTabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; ring: string; ownerOnly?: boolean }[] = [
    { id: 'perfil', label: t('settings.tabs.profile'), icon: User, ring: 'ring-cyan-500/30' },
    { id: 'empresa', label: t('settings.tabs.company'), icon: Building, ring: 'ring-purple-500/30' },
    { id: 'financeiro', label: t('settings.tabs.financial'), icon: DollarSign, ring: 'ring-emerald-500/30', ownerOnly: true },
    { id: 'seguranca', label: t('settings.tabs.security'), icon: Shield, ring: 'ring-emerald-500/30' },
    { id: 'documentos_legais', label: t('settings.tabs.documents'), icon: FileText, ring: 'ring-blue-500/30' },
  ]

  // Filtra tabs baseado em permissões
  const tabs = allTabs.filter(tab => !tab.ownerOnly || isOwner)

  return (
    <div className="text-slate-900 dark:text-slate-200 flex flex-col min-h-full relative overflow-hidden">
      {/* HUD glow grid background + overlay */}
      {/* <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)]" style={{ backgroundSize: '120px 120px' }} />
      </div> */}

      <div className="flex-1 space-y-6 max-h-[calc(100vh-80px)] overflow-y-auto pb-6 px-6 relative z-10">
        <header className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold font-outfit text-slate-900 dark:text-white">{t('settings.title')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('settings.subtitle')}</p>
            </div>

          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="rounded-2xl p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 sticky top-6">
              <nav className="space-y-2">
                {tabs.map((t) => {
                  const Icon = t.icon
                  const isActive = tab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all border ${isActive
                        ? `bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-sm`
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      {t.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Tabs (mobile) */}
          <div className="lg:hidden">
            <div className="rounded-2xl p-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 mb-2 overflow-x-auto">
              <div className="flex space-x-2">
                {tabs.map((t) => {
                  const Icon = t.icon
                  const isActive = tab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all border ${isActive
                        ? `bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-300`
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <main className="lg:col-span-3">
            <div className="rounded-2xl p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 shadow-sm">
              {tab === 'perfil' && (
                <section className="space-y-8">
                  <Header title={t('settings.profile.title')} subtitle={t('settings.profile.subtitle')} icon={<User className="w-5 h-5 text-slate-900 dark:text-white" />} />

                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-r from-cyan-500 to-cyan-600 border border-slate-200 dark:border-white/10">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl + (avatarUrl.includes('?') ? '&' : '?') + `t=${avatarBust}`}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('❌ Erro ao carregar avatar. URL:', avatarUrl)
                              console.error('Status:', (e.target as HTMLImageElement).complete)
                              // Não oculta, mostra as iniciais como fallback
                            }}
                            onLoad={() => {
                              console.log('✅ Avatar carregado com sucesso')
                            }}
                          />
                        ) : (
                          <span className="text-white font-semibold text-lg">
                            {(user?.email?.[0] || 'U').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <label className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border border-slate-200 dark:border-white/10 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 transition-colors ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Upload className="w-4 h-4 text-white" />
                        <input ref={inputFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                      </label>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">{t('settings.profile.avatarTitle')}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.profile.avatarDesc')}</p>
                      {uploadingAvatar && <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">{t('settings.profile.uploading')}</p>}
                    </div>
                  </div>

                  {/* Form Perfil */}
                  <form onSubmit={handleSubmitPerfil(onSubmitPerfil)} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Field label={t('settings.profile.fullName')} icon={<User className="w-4 h-4 text-slate-400 dark:text-gray-400" />}>
                      <input {...registerPerfil('full_name')} type="text" className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500" placeholder={t('settings.profile.fullNamePlaceholder')} />
                    </Field>

                    <Field label={t('settings.profile.displayName')}>
                      <input {...registerPerfil('display_name')} type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500" placeholder={t('settings.profile.displayNamePlaceholder')} />
                    </Field>

                    <Field label={t('settings.profile.email')} icon={<Mail className="w-4 h-4 text-slate-400 dark:text-gray-400" />}>
                      <input value={user?.email || ''} disabled className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 dark:text-gray-400 cursor-not-allowed" placeholder={t('settings.profile.emailPlaceholder')} />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.profile.emailHelp')}</p>
                    </Field>

                    <Field label={t('settings.profile.phone')} icon={<Phone className="w-4 h-4 text-slate-400 dark:text-gray-400" />}>
                      <input {...registerPerfil('phone')} type="tel" className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500" placeholder={t('settings.profile.phonePlaceholder')} />
                    </Field>

                    <div className="md:col-span-2 flex justify-end pt-2">
                      <button disabled={savingProfile || !perfilDirty} className={`px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2 text-white bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all shadow-lg ${savingProfile || !perfilDirty ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01] hover:from-cyan-600 hover:to-cyan-700'}`}>
                        <Save className="w-4 h-4" />
                        {savingProfile ? t('settings.profile.saving') : t('settings.profile.save')}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {tab === 'empresa' && (
                <section className="space-y-8">
                  <Header title={t('settings.company.title')} subtitle={t('settings.company.subtitle')} icon={<Building className="w-5 h-5 text-slate-900 dark:text-white" />} />
                  <form onSubmit={handleSubmitEmpresa(onSubmitEmpresa)} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Field label={t('settings.company.teamName')} icon={<Building2 className="w-4 h-4 text-slate-600 dark:text-gray-400" />} full>
                      <input {...registerEmpresa('nome_fantasia')} type="text" className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500" placeholder={t('settings.company.teamNamePlaceholder')} />
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('settings.company.teamNameHelp')}</p>
                    </Field>



                    <Field label={t('settings.company.cnpj')}>
                      <input {...registerEmpresa('cnpj')} type="text" className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500" placeholder={t('settings.company.cnpjPlaceholder')} />
                    </Field>

                    <Field label={t('settings.company.phone')} icon={<Phone className="w-4 h-4 text-slate-600 dark:text-gray-400" />}>
                      <input {...registerEmpresa('telefone')} type="text" className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500" placeholder={t('settings.company.phonePlaceholder')} />
                    </Field>

                    <Field label={t('settings.company.email')} icon={<Mail className="w-4 h-4 text-slate-600 dark:text-gray-400" />}>
                      <input {...registerEmpresa('email')} type="email" className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500" placeholder={t('settings.company.emailPlaceholder')} />
                    </Field>

                    <Field label={t('settings.company.address')} full>
                      <input {...registerEmpresa('endereco')} type="text" className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500" placeholder={t('settings.company.addressPlaceholder')} />
                    </Field>

                    <Field label={t('settings.company.zip')}>
                      <input {...registerEmpresa('cep')} type="text" className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500" placeholder={t('settings.company.zipPlaceholder')} />
                    </Field>

                    <Field label={t('settings.company.city')}>
                      <input {...registerEmpresa('cidade')} type="text" className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500" />
                    </Field>

                    <Field label={t('settings.company.state')}>
                      <input {...registerEmpresa('estado')} type="text" className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500" />
                    </Field>

                    <Field label={t('settings.company.country')}>
                      <input {...registerEmpresa('pais')} type="text" className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500" />
                    </Field>

                    <div className="md:col-span-2 flex justify-end pt-2">
                      <button disabled={savingEmpresa || !empresaDirty} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 transition-colors shadow-lg ${savingEmpresa || !empresaDirty ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01] hover:from-cyan-600 hover:to-cyan-700'}`}>
                        <Save className="w-4 h-4" />
                        {savingEmpresa ? t('settings.company.saving') : t('settings.company.save')}
                      </button>
                    </div>
                  </form>

                </section>
              )}

              {tab === 'financeiro' && (
                <section className="space-y-8">
                  <Header
                    title={t('settings.financial.title')}
                    subtitle={t('settings.financial.subtitle')}
                    icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                  />

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      {t('settings.financial.description')}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate('/app/dashboard')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        {t('settings.financial.backToDashboard')}
                      </button>
                    </div>
                  </div>

                  {podeGerenciarFinanceiro ? (
                    <>
                      <ExpenseManager tenantId={tenantId} canManage={podeGerenciarFinanceiro} className="mt-2" />
                      <div className="border-t border-slate-200 dark:border-white/10 pt-8">
                        <SubscriptionCard />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-8 text-center text-gray-700 dark:text-slate-300">
                      <Lock className="w-8 h-8 mx-auto mb-4 text-rose-400 dark:text-rose-300" />
                      <p className="text-sm">{t('settings.financial.locked')}</p>
                    </div>
                  )}
                </section>
              )}

              {tab === 'seguranca' && (
                <section className="space-y-8">
                  <Header title={t('settings.security.title')} subtitle={t('settings.security.subtitle')} icon={<Shield className="w-5 h-5 text-slate-900 dark:text-white" />} />

                  <div className="rounded-lg p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> {t('settings.security.changePassword')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <LabeledInput label={t('settings.security.currentPassword')}>
                        <input type="password" value={pwd.current} onChange={(e) => handleChangePwd('current', e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-50 border border-slate-200 dark:border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 dark:text-slate-900 placeholder-slate-400 dark:placeholder-slate-500" placeholder={t('settings.security.currentPasswordPlaceholder')} />
                      </LabeledInput>

                      <LabeledInput label={t('settings.security.newPassword')}>
                        <input type="password" value={pwd.next} onChange={(e) => handleChangePwd('next', e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-50 border border-slate-200 dark:border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 dark:text-slate-900 placeholder-slate-400 dark:placeholder-slate-500" placeholder={t('settings.security.newPasswordPlaceholder')} />
                      </LabeledInput>

                      <LabeledInput label={t('settings.security.confirmPassword')} full>
                        <input type="password" value={pwd.confirm} onChange={(e) => handleChangePwd('confirm', e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-50 border border-slate-200 dark:border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 dark:text-slate-900 placeholder-slate-400 dark:placeholder-slate-500" placeholder={t('settings.security.confirmPasswordPlaceholder')} />
                      </LabeledInput>
                    </div>

                    <div className="mt-4">
                      <button onClick={handleAtualizarSenha} disabled={savingPassword || !pwd.current || !pwd.next || !pwd.confirm} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 transition-colors shadow-lg ${savingPassword || !pwd.current || !pwd.next || !pwd.confirm ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01] hover:from-emerald-600 hover:to-cyan-600'}`}>
                        <Save className="w-4 h-4" />
                        {savingPassword ? t('settings.security.updating') : t('settings.security.updatePassword')}
                      </button>
                    </div>
                  </div>

                  {/* Zona de Perigo - Excluir Conta */}
                  <div className="rounded-lg p-6 bg-red-100 dark:bg-red-500/5 border border-red-300 dark:border-red-500/20 mt-6">
                    <h4 className="font-semibold text-red-900 dark:text-red-300 mb-4 flex items-center gap-2">
                      <Trash2 className="w-5 h-5 text-red-700 dark:text-red-400" /> {t('settings.security.dangerZone')}
                    </h4>
                    <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-red-200 dark:border-red-500/10 mb-4">
                      <h5 className="font-medium text-red-900 dark:text-red-300 mb-2">{t('settings.security.deleteAccount')}</h5>
                      <p className="text-red-800 dark:text-red-400 text-sm mb-4">{t('settings.security.deleteAccountDesc')}</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowDeleteAccountModal(true)}
                          className="px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          {t('settings.security.deleteAccount')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* MODAL: Excluir Conta */}
                  <Modal
                    isOpen={showDeleteAccountModal}
                    onClose={() => {
                      setShowDeleteAccountModal(false)
                      setDeleteAccountConfirmText('')
                    }}
                    title={t('settings.security.modalTitle')}
                  >
                    <div className="space-y-6">
                      <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-lg">
                        <p className="text-red-800 dark:text-red-400 font-semibold mb-2">{t('settings.security.irreversible')}</p>
                        <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed">
                          {t('settings.security.modalDesc')}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-3">
                          {t('settings.security.confirmEmail')} <span className="text-red-600 dark:text-red-400 font-semibold">{user?.email}</span>
                        </label>
                        <input
                          type="text"
                          value={deleteAccountConfirmText}
                          onChange={(e) => setDeleteAccountConfirmText(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/30 transition-all"
                          placeholder={t('settings.security.confirmPlaceholder')}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                      <button
                        onClick={() => {
                          setShowDeleteAccountModal(false)
                          setDeleteAccountConfirmText('')
                        }}
                        className="flex-1 py-3 px-6 border border-slate-200 dark:border-white/20 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 font-medium"
                      >
                        {t('settings.security.cancel')}
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount || deleteAccountConfirmText.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase()}
                        className="flex-1 py-3 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg disabled:opacity-50 hover:shadow-red-500/20 hover:scale-105 active:scale-95"
                      >
                        {deletingAccount ? t('settings.security.deleting') : t('settings.security.deleteAccountPermanent')}
                      </button>
                    </div>
                  </Modal>
                </section>
              )}

              {tab === 'documentos_legais' && (
                <section className="space-y-8">
                  <Header title={t('settings.documents.title')} subtitle={t('settings.documents.subtitle')} icon={<FileText className="w-5 h-5 text-slate-900 dark:text-white" />} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <a href="#" className="group p-6 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 transition-all hover:shadow-lg hover:shadow-cyan-500/5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">{t('settings.documents.privacyPolicy')}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('settings.documents.privacyDesc')}</p>
                        </div>
                        <FileText className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                      </div>
                      <div className="mt-4 text-xs font-medium text-cyan-600 dark:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('settings.documents.open')}
                      </div>
                    </a>

                    <a href="#" className="group p-6 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">{t('settings.documents.termsOfService')}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('settings.documents.termsDesc')}</p>
                        </div>
                        <FileText className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                      </div>
                      <div className="mt-4 text-xs font-medium text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('settings.documents.open')}
                      </div>
                    </a>
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

// ====================================================================
// Subcomponentes de UI
// ====================================================================

function Header({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  icon,
  full,
}: {
  label: string
  children: React.ReactNode
  icon?: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={`space-y-2 ${full ? 'md:col-span-2' : ''}`}>
      <label className="text-xs uppercase text-gray-400">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
        {children}
      </div>
    </div>
  )
}


function LabeledInput({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? 'md:col-span-2' : ''}`}>
      <label className="text-xs uppercase text-gray-400">{label}</label>
      {children}
    </div>
  )
}
