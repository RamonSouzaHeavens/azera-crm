import { useState, useEffect } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Building, User, Phone, Lock, Eye, EyeOff, Mail, MessageCircle } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import GmailIcon from '../images/gmail.png'
import OutlookIcon from '../images/outlook.png'
import YahooIcon from '../images/yahoo.png'
import Iridescence from '../components/ui/ethereal-shadow'

interface LoginData { email: string; password: string }
interface SignUpData {
  email: string;
  password: string;
  name: string;
  tenantName: string;
  personalEmail?: string;
  telefone?: string;
}

export const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [showEmailExistsModal, setShowEmailExistsModal] = useState(false)
  const [existingEmail, setExistingEmail] = useState('')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  const navigate = useNavigate()
  const { user, isAdmin, signIn, signUp } = useAuthStore()
  const { t } = useTranslation()

  // Schemas moved inside to use t()
  const loginSchema = yup.object({
    email: yup.string().required(t('auth.validation.emailRequired')),
    password: yup.string().min(6, t('auth.validation.passwordMin')).required(t('auth.validation.passwordRequired')),
  })

  const signupSchema = yup.object({
    name: yup.string().required(t('auth.validation.nameRequired')),
    email: yup.string().email(t('auth.validation.emailInvalid')).required(t('auth.validation.emailRequired')),
    password: yup.string().min(6, t('auth.validation.passwordMin')).required(t('auth.validation.passwordRequired')),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], t('auth.validation.passwordMatch'))
      .required(t('auth.validation.confirmRequired')),
    tenantName: yup.string().required(t('auth.validation.tenantNameRequired')),
    personalEmail: yup.string().email(t('auth.validation.personalEmailInvalid')).optional(),
    telefone: yup.string().optional(),
  })

  const loginForm = useForm({ resolver: yupResolver(loginSchema) })
  const signupForm = useForm({ resolver: yupResolver(signupSchema) })

  // Função para reenviar email de confirmação
  const handleResendConfirmationEmail = async () => {
    if (!confirmEmail) return

    setResendingEmail(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: confirmEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      })

      if (error) {
        console.error('Erro ao reenviar:', error)
        toast.error(t('auth.toasts.resendError'))
      } else {
        toast.success(t('auth.toasts.resendSuccess'))
      }
    } catch (err) {
      console.error('Erro:', err)
      toast.error(t('auth.toasts.resendError'))
    } finally {
      setResendingEmail(false)
    }
  }

  useEffect(() => {
    if ((user || isAdmin) && !showConfirmModal) {
      // Não fazer nada aqui, deixar o handleLogin fazer o redirect
    }
  }, [user, isAdmin, showConfirmModal])

  if ((user || isAdmin) && !showConfirmModal) {
    // Deixar isRedirecting ser true para evitar render do formulário
    return <Navigate to="/app/dashboard" replace />
  }

  const handleLogin = async (data: LoginData) => {
    try {
      console.log('🔐 Tentando fazer login...');
      await signIn(data.email, data.password)
      console.log('✅ Login bem-sucedido!');
      toast.success(t('auth.toasts.loginSuccess'))

      // Verificar se há convite pendente
      const pendingToken = localStorage.getItem('pending_invite_token')
      if (pendingToken) {
        console.log('🎯 Convite pendente encontrado, redirecionando...')
        localStorage.removeItem('pending_invite_token')
        navigate(`/invite/accept?token=${encodeURIComponent(pendingToken)}`)
        return
      }

      // O useEffect vai redirecionar automaticamente após o estado atualizar
      // Não fazer navigate aqui para evitar conflito
    } catch (error: unknown) {
      console.error('❌ Erro no login:', error);
      const errorMessage = error instanceof Error ? (error.message || 'Erro ao fazer login') : 'Ocorreu um erro desconhecido'
      console.error('Mensagem de erro:', errorMessage);
      toast.error(errorMessage)
    }
  }

  const handleSignUp = async (data: SignUpData) => {
    try {
      await signUp(data.email, data.password, data.name, data.tenantName, data.personalEmail, data.telefone)
      toast.success(t('auth.toasts.accountCreated'))
      setConfirmEmail(signupForm.getValues('email'))
      setShowConfirmModal(true)
      setIsSignUp(false)

      // Verificar se há convite pendente após criação da conta
      const pendingToken = localStorage.getItem('pending_invite_token')
      if (pendingToken) {
        console.log('🎯 Convite pendente encontrado após criar conta')
        // Não remover o token ainda, será removido quando o convite for aceito
        // O usuário precisará confirmar o email primeiro, então isso será processado no login
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'

      // Log do erro para debug
      console.error('❌ signUp - erro:', err)

      // Tratar erro de confirmação de email de forma amigável
      if (errorMessage.includes('CONFIRM_EMAIL_REQUIRED')) {
        console.log('✅ Redirecionando para página de confirmação de email')
        const email = signupForm.getValues('email')
        console.log('📧 Email para redirecionar:', email)
        console.log('🚀 Executando redirecionamento...')
        navigate(`/confirmar-email?email=${encodeURIComponent(email)}`)
        return
      }

      // Detectar se é email já registrado
      if (errorMessage.includes('User already registered') ||
        errorMessage.includes('Email already registered') ||
        errorMessage.includes('already exists')) {
        console.log('📧 Email já registrado detectado')
        setExistingEmail(data.email)
        setShowEmailExistsModal(true)
      } else {
        toast.error(err instanceof Error ? (err.message || t('auth.toasts.createError')) : t('common.error'))
      }
    }
  }

  return (
    <Iridescence
      color={[0.03, 0.03, 0.08]}
      mouseReact={false}
      amplitude={0.1}
      speed={0.3}
    >
      {/* Container centralizado */}
      <div className="flex items-center justify-center min-h-screen p-4 md:p-6" data-login-page>
        <div className="w-full max-w-md">
          {/* Header do formulário */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 mx-auto">
              {isSignUp ? <User className="w-6 h-6 text-blue-400" /> : <Lock className="w-6 h-6 text-blue-400" />}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              {isSignUp ? t('auth.registerTitle') : t('auth.loginTitle')}
            </h2>
            <p className="text-sm md:text-base text-slate-400">
              {isSignUp ? t('auth.branding.subtitle') : t('auth.loginSubtitle')}
            </p>
          </div>

          {/* Card com design premium */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-8 md:p-10 font-['Outfit'] backdrop-blur-xl">
            {isSignUp ? (
              <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text opacity-70">{t('auth.labels.fullName')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 opacity-70 w-5 h-5" />
                    <input
                      {...signupForm.register('name')}
                      type="text"
                      placeholder={t('auth.placeholders.name')}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-blue-500/30 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  {signupForm.formState.errors.name && (
                    <p className="text-xs text-rose-500">{signupForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text opacity-70">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary opacity-50 w-5 h-5" />
                    <input
                      {...signupForm.register('email')}
                      type="email"
                      placeholder={t('auth.placeholders.email')}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-blue-500/30 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  {signupForm.formState.errors.email && (
                    <p className="text-xs text-rose-500">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text opacity-70">{t('auth.labels.tenantName')}</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 opacity-70 w-5 h-5" />
                    <input
                      {...signupForm.register('tenantName')}
                      type="text"
                      placeholder={t('auth.placeholders.tenantName')}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-blue-500/30 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  {signupForm.formState.errors.tenantName && (
                    <p className="text-xs text-rose-500">{signupForm.formState.errors.tenantName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text opacity-70">{t('auth.labels.personalEmail')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary opacity-50 w-5 h-5" />
                    <input
                      {...signupForm.register('personalEmail')}
                      type="email"
                      placeholder={t('auth.placeholders.personalEmail')}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-blue-500/30 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  {signupForm.formState.errors.personalEmail && (
                    <p className="text-xs text-rose-500">{signupForm.formState.errors.personalEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text opacity-70">{t('auth.labels.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 opacity-70 w-5 h-5" />
                    <input
                      {...signupForm.register('telefone')}
                      type="tel"
                      placeholder={t('auth.placeholders.phone')}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-blue-500/30 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  {signupForm.formState.errors.telefone && (
                    <p className="text-xs text-rose-500">{signupForm.formState.errors.telefone.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text opacity-70">{t('auth.password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary opacity-50 w-5 h-5" />
                    <input
                      {...signupForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.placeholders.password')}
                      className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-blue-500/30 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text opacity-40 hover:opacity-70 transition-opacity"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {signupForm.formState.errors.password && (
                    <p className="text-xs text-rose-500">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text opacity-70">{t('auth.confirmPassword')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary opacity-50 w-5 h-5" />
                    <input
                      {...signupForm.register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('auth.placeholders.confirmPassword')}
                      className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-blue-500/30 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text opacity-40 hover:opacity-70 transition-opacity"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-rose-500">{signupForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-600 text-white transition-all transform active:scale-[0.98] text-lg hover:from-blue-600 hover:to-cyan-700"
                >
                  {t('auth.buttons.createAccount')}
                </button>
              </form>
            ) : (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6" data-login-form>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{t('auth.email')}</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/60 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      {...loginForm.register('email')}
                      type="text"
                      placeholder={t('auth.placeholders.loginEmail')}
                      className="w-full pl-12 pr-4 py-3.5 rounded-lg bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all focus:bg-white/[0.08]"
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-rose-400">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{t('auth.password')}</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/60 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      {...loginForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.placeholders.loginPassword')}
                      className="w-full pl-12 pr-12 py-3.5 rounded-lg bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all focus:bg-white/[0.08]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400/60 hover:text-blue-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-rose-400">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-cyan-600 text-white transition-all duration-200 active:scale-95 text-base hover:from-blue-600 hover:to-cyan-700 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  {t('auth.buttons.enter')}
                </button>
                {/* Esqueci a senha */}
                <div className="mt-3 text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    {t('auth.buttons.forgotPassword')}
                  </Link>
                </div>
              </form>
            )}

            {/* Social - OCULTO TEMPORARIAMENTE */}
            {/* <div className="mt-8">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-400">Ou continue com</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition">
                  <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.6-2.6C16.6 3 14.5 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c7 0 9.3-4.9 8.6-8.1H12z"/><path fill="#34A853" d="M3.9 7.3l3.2 2.4c.9-2.6 3.3-3.9 5-3.9 1.5 0 2.5.6 3.1 1.1l2.6-2.6C16.6 3 14.5 2 12 2 8.4 2 5.3 4.1 3.9 7.3z"/><path fill="#FBBC05" d="M12 22c2.9 0 5.4-1 7.2-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8C4 20.5 7.7 22 12 22z"/><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h5.9c-.3 1.4-1 2.5-2.2 3.3l2.8 2.1c2.1-1.9 3.1-4.7 3.1-7.5z"/></svg>
                  <span className="text-sm text-slate-200">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M18.7 19.5c-.8 1.2-1.7 2.5-3 2.5s-1.8-.8-3.3-.8-2 .8-3.3.8c-1.3 0-2.3-1.3-3.1-2.5C4.2 17 2.9 12.4 4.7 9.4 5.6 7.9 7.1 7 8.8 7c1.2 0 2.3.9 3.1.9.8 0 2.3-1.1 3.8-.9 1.6.2 3 .9 3.7 2-2.1 1.1-2.5 4-1.1 5.9.3.4 1 .9 1 .9-.2.7-.6 1.8-1.6 2.7zM13 3.5c.7-.8 1.9-1.5 2.9-1.5.1 1.2-.3 2.3-1 3.2-.7.8-1.8 1.5-2.9 1.4-.1-1.2.4-2.3 1-3.1z"/></svg>
                  <span className="text-sm text-slate-200">Apple</span>
                </button>
              </div>
            </div> */}

            {/* Footer / trocar estado */}
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-sm text-slate-400">
                {isSignUp ? t('auth.buttons.haveAccount') : t('auth.buttons.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(v => !v)}
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  {isSignUp ? t('auth.buttons.login') : t('auth.buttons.freeAccount')}
                </button>
              </p>
            </div>

            {/* Suporte */}
            <div className="mt-6 text-center">
              <a
                href="https://wa.me/5531991318312"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all text-sm text-emerald-300"
              >
                <MessageCircle className="w-4 h-4" />
                {t('auth.support.text')} <span className="font-medium">{t('auth.support.link')}</span>
              </a>

              <div className="mt-6 flex justify-center gap-4 text-xs text-slate-500">
                <Link to="/politica-privacidade" className="hover:text-slate-300 transition-colors">
                  Política de Privacidade
                </Link>
                <span>•</span>
                <Link to="/termos-uso" className="hover:text-slate-300 transition-colors">
                  Termos de Uso
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowConfirmModal(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                <span className="text-2xl">📨</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{t('auth.modals.accountCreated.title')}</h3>
                <p className="text-gray-400 text-sm">{t('auth.modals.accountCreated.subtitle')}</p>
              </div>
            </div>
            <div className="space-y-3 text-gray-300">
              <p className="text-sm">{t('auth.modals.accountCreated.message')} <strong>{confirmEmail}</strong></p>
              <ul className="text-sm list-disc pl-5 space-y-1">
                <li>{t('auth.modals.accountCreated.spam')}</li>
                <li>{t('auth.modals.accountCreated.clickLink')}</li>
                <li>{t('auth.modals.accountCreated.loginAfter')}</li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleResendConfirmationEmail}
                disabled={resendingEmail}
                className="w-full px-4 py-2 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all disabled:opacity-50"
              >
                {resendingEmail ? t('auth.modals.accountCreated.resending') : t('auth.modals.accountCreated.resend')}
              </button>
              <button
                onClick={() => { setShowConfirmModal(false); setIsSignUp(false) }}
                className="w-full px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800"
              >
                {t('auth.modals.accountCreated.understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Email já existe */}
      {showEmailExistsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowEmailExistsModal(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{t('auth.modals.emailExists.title')}</h3>
                <p className="text-gray-400 text-sm">{t('auth.modals.emailExists.subtitle')}</p>
              </div>
            </div>
            <div className="space-y-3 text-gray-300">
              <p className="text-sm">
                {t('auth.modals.emailExists.message')}
              </p>
              <p className="text-sm">
                {t('auth.modals.emailExists.whatToDo')}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowEmailExistsModal(false)
                  setIsSignUp(false)
                  loginForm.setValue('email', existingEmail)
                }}
                className="w-full px-4 py-2 rounded-xl font-medium text-sm bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 transition-all"
              >
                {t('auth.modals.emailExists.login')}
              </button>
              <button
                onClick={() => {
                  setShowEmailExistsModal(false)
                  setIsSignUp(false)
                  setTimeout(() => {
                    loginForm.setValue('email', existingEmail)
                    // Rola para o formulário de login
                    document.querySelector('[data-login-form]')?.scrollIntoView({ behavior: 'smooth' })
                  }, 100)
                }}
                className="w-full px-4 py-2 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all"
              >
                {t('auth.modals.emailExists.recover')}
              </button>
              <button
                onClick={() => setShowEmailExistsModal(false)}
                className="w-full px-4 py-2 rounded-xl font-medium text-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-gray-400"
              >
                {t('auth.modals.emailExists.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup: Conta criada com sucesso */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowSuccessPopup(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/90 to-cyan-950/90 p-8 text-slate-200">
            <div className="flex flex-col items-center text-center">
              {/* Ícone de sucesso animado */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/50 animate-pulse">
                <span className="text-4xl">📧</span>
              </div>

              {/* Título */}
              <h3 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                {t('auth.modals.successPopup.title')}
              </h3>

              {/* Mensagem */}
              <div className="space-y-3 text-gray-300 mb-6">
                <p className="text-base leading-relaxed">
                  {t('auth.modals.successPopup.message1')}
                </p>
                <p className="text-base leading-relaxed">
                  <Trans
                    i18nKey="auth.modals.successPopup.message2"
                    components={{ strong: <strong className="text-emerald-400" /> }}
                  />
                </p>
                <p className="text-sm text-gray-400 mt-4">
                  {t('auth.modals.successPopup.spamWarning')}
                </p>
              </div>

              {/* Atalhos de Email */}
              <div className="mb-8 w-full">
                <p className="text-sm text-gray-400 mb-3">{t('auth.modals.successPopup.accessEmail')}</p>
                <div className="flex gap-3 justify-center">
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all hover:scale-105"
                  >
                    <img src={GmailIcon} alt="Gmail" className="w-10 h-10" />
                    <span className="text-xs font-medium">Gmail</span>
                  </a>
                  <a
                    href="https://outlook.live.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all hover:scale-105"
                  >
                    <img src={OutlookIcon} alt="Outlook" className="w-10 h-10" />
                    <span className="text-xs font-medium">Outlook</span>
                  </a>
                  <a
                    href="https://mail.yahoo.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all hover:scale-105"
                  >
                    <img src={YahooIcon} alt="Yahoo" className="w-10 h-10" />
                    <span className="text-xs font-medium">Yahoo</span>
                  </a>
                </div>
              </div>

              {/* Botão */}
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="w-full px-6 py-3 rounded-xl font-semibold text-base bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {t('auth.modals.successPopup.button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Iridescence>
  )
}
