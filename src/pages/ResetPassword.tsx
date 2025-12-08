import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export default function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const resetPasswordSchema = yup.object({
    password: yup
      .string()
      .min(6, t('resetPassword.validation.passwordMin'))
      .required(t('resetPassword.validation.passwordRequired')),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], t('resetPassword.validation.passwordMismatch'))
      .required(t('resetPassword.validation.confirmRequired'))
  })

  type ResetPasswordData = {
    password: string
    confirmPassword: string
  }

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validToken, setValidToken] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const form = useForm<ResetPasswordData>({
    resolver: yupResolver(resetPasswordSchema)
  })

  // Verificar se o token é válido ao carregar a página
  useEffect(() => {
    const checkToken = async () => {
      // Tenta obter tokens de múltiplas formas possíveis
      const accessToken =
        searchParams.get('access_token') ||
        new URLSearchParams(window.location.hash.replace('#', '')).get('access_token')

      const refreshToken =
        searchParams.get('refresh_token') ||
        new URLSearchParams(window.location.hash.replace('#', '')).get('refresh_token')

      const error = searchParams.get('error')
      const errorCode = searchParams.get('error_code')

      // Se tem token, tenta usar mesmo que tenha erro
      if (accessToken && refreshToken) {
        try {
          const { error: sessionError, data } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (sessionError) {
            console.error('Erro ao setSession:', sessionError)
            // Mesmo com erro, tenta continuar
          }

          if (data?.session?.user) {
            setValidToken(true)
            return
          }
        } catch (err) {
          console.error('Erro ao fazer reset de senha:', err)
        }
      }

      // Se chegou aqui, algo deu errado
      console.error('Não conseguiu estabelecer sessão')

      if (error === 'access_denied' && errorCode === 'otp_expired') {
        setErrorMessage(t('resetPassword.errors.linkExpired'))
      } else if (error) {
        setErrorMessage(t('resetPassword.errors.linkError', { error }))
      } else if (!accessToken || !refreshToken) {
        setErrorMessage(t('resetPassword.errors.tokenNotFound'))
      } else {
        setErrorMessage(t('resetPassword.errors.linkInvalid'))
      }

      setValidToken(false)
    }

    checkToken()
  }, [searchParams, t])

  const handleResetPassword = async (data: ResetPasswordData) => {
    try {
      setLoading(true)

      const { error } = await supabase.auth.updateUser({
        password: data.password
      })

      if (error) {
        throw error
      }

      setSuccess(true)
      toast.success(t('resetPassword.success.message'))

      // Redirecionar após alguns segundos
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      console.error('Erro ao resetar senha:', error)
      if (error instanceof Error) {
        toast.error(error.message || t('resetPassword.errors.updateFailed'))
      } else {
        toast.error(t('resetPassword.errors.unknown'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-200 p-4">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.08),transparent_35%)]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {success ? (
          <>
            {/* Success State */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-semibold text-white tracking-wide mb-2">
                {t('resetPassword.success.title')}
              </h1>
              <p className="text-gray-400 mb-8">
                {t('resetPassword.success.redirecting')}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white transition-all"
              >
                {t('resetPassword.actions.backToLogin')}
              </button>
            </div>
          </>
        ) : validToken === false ? (
          <>
            {/* Error State */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 mb-6">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-3xl font-semibold text-white tracking-wide mb-2">
                {t('resetPassword.errors.invalidLink')}
              </h1>
              <p className="text-gray-400 mb-8">
                {errorMessage}
              </p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white transition-all"
              >
                {t('resetPassword.actions.requestNewLink')}
              </button>
            </div>
          </>
        ) : validToken === null ? (
          <>
            {/* Loading State */}
            <div className="text-center py-12">
              <div className="inline-block animate-spin">
                <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full" />
              </div>
              <p className="text-gray-400 mt-4">{t('resetPassword.loading.verifying')}</p>
            </div>
          </>
        ) : (
          <>
            {/* Form State */}
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-white tracking-wide">{t('resetPassword.form.title')}</h1>
              <p className="text-sm text-gray-400 mt-2">{t('resetPassword.form.subtitle')}</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md shadow-xl shadow-black/30 p-6 md:p-7">
              <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-5">
                {/* Nova Senha */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">{t('resetPassword.form.newPassword')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      {...form.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('resetPassword.form.passwordPlaceholder')}
                      autoComplete="new-password"
                      className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">{t('resetPassword.form.confirmPassword')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      {...form.register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('resetPassword.form.confirmPlaceholder')}
                      autoComplete="new-password"
                      className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 rounded-xl font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    {t('resetPassword.actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white transition-all disabled:opacity-50"
                  >
                    {loading ? t('resetPassword.actions.setting') : t('resetPassword.actions.submit')}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}