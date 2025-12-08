// src/pages/ForgotPassword.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft,
  Mail,
  Send,
  CheckCircle2,
  Building2,
  Clock,
  Shield
} from 'lucide-react'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  // const navigate = useNavigate()

  const forgotPasswordSchema = yup.object({
    email: yup
      .string()
      .email(t('forgotPassword.emailInvalid'))
      .required(t('forgotPassword.emailRequired'))
  })

  type ForgotPasswordData = {
    email: string
  }

  const form = useForm<ForgotPasswordData>({
    resolver: yupResolver(forgotPasswordSchema)
  })

  const handleForgotPassword = async (data: ForgotPasswordData) => {
    try {
      setLoading(true)

      console.log('📧 Tentando resetar senha para:', data.email)

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        console.error('❌ Erro do Supabase:', error)
        throw error
      }

      console.log('✅ Email de recuperação enviado com sucesso!')
      setSentEmail(data.email)
      setEmailSent(true)
      toast.success(t('forgotPassword.successToast'))

    } catch (error: unknown) {
      console.error('Erro ao enviar email:', error)
      if (error instanceof Error) {
        console.log('Mensagem de erro:', error.message)
        // Não revelar se o email existe ou não por segurança
        if (error.message.includes('Email not confirmed') ||
          error.message.includes('User not found')) {
          toast.error(t('forgotPassword.genericError'))
        } else {
          toast.error(error.message || t('forgotPassword.errorToast'))
        }
      } else {
        toast.error(t('forgotPassword.unknownError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!sentEmail) return

    try {
      setLoading(true)

      const { error } = await supabase.auth.resetPasswordForEmail(sentEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      toast.success(t('forgotPassword.resendSuccess'))
    } catch (error) {
      console.error('Erro ao reenviar:', error)
      toast.error(t('forgotPassword.resendError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden flex items-center justify-center
                bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-200 p-4">

      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.08),transparent_35%)]" />
      </div>

      <div className="w-full max-w-md relative z-10">

        {!emailSent ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('forgotPassword.backToLogin')}
              </Link>

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-[2px] shadow-lg shadow-cyan-500/20 mb-6">
                <div className="w-full h-full rounded-2xl bg-gray-900/80 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-cyan-300" />
                </div>
              </div>

              <h1 className="text-3xl font-semibold text-white tracking-wide">
                {t('forgotPassword.title')}
              </h1>
              <p className="text-sm text-gray-400 mt-2">
                {t('forgotPassword.subtitle')}
              </p>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md shadow-xl shadow-black/30 p-6 md:p-7">

              <form onSubmit={form.handleSubmit(handleForgotPassword)} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">{t('forgotPassword.emailLabel')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      {...form.register('email')}
                      type="email"
                      placeholder={t('forgotPassword.emailPlaceholder')}
                      autoComplete="email"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-xs text-rose-400">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold shadow-lg shadow-cyan-500/20 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      {t('forgotPassword.sending')}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />
                      {t('forgotPassword.submitButton')}
                    </div>
                  )}
                </button>
              </form>

              {/* Security Note */}
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-gray-300 mb-1">
                      <strong>{t('forgotPassword.securityNote')}</strong>
                    </p>
                    <ul className="text-gray-400 space-y-1 text-xs">
                      <li>{t('forgotPassword.securityList1')}</li>
                      <li>{t('forgotPassword.securityList2')}</li>
                      <li>{t('forgotPassword.securityList3')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  {t('forgotPassword.rememberedPassword')}{' '}
                  <Link
                    to="/login"
                    className="text-cyan-300 hover:text-cyan-200 font-medium transition-colors"
                  >
                    {t('forgotPassword.loginLink')}
                  </Link>
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-semibold text-white mb-3">
              {t('forgotPassword.emailSentTitle')}
            </h1>

            <p className="text-gray-400 mb-6">
              {t('forgotPassword.emailSentDesc')}{' '}
              <span className="text-white font-medium">{sentEmail}</span>
            </p>

            <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md shadow-xl shadow-black/30 p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-left">
                  <Clock className="w-5 h-5 text-cyan-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-gray-300 font-medium mb-1">{t('forgotPassword.nextSteps')}</p>
                    <ol className="text-gray-400 space-y-1">
                      <li>{t('forgotPassword.step1')}</li>
                      <li>{t('forgotPassword.step2')}</li>
                      <li>{t('forgotPassword.step3')}</li>
                    </ol>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleResendEmail}
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? t('forgotPassword.resending') : t('forgotPassword.resendButton')}
                    </button>

                    <Link
                      to="/login"
                      className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-medium text-center transition-all"
                    >
                      {t('forgotPassword.backToLogin')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="text-left">
                <p className="text-yellow-300 font-medium mb-2 text-sm">
                  {t('forgotPassword.troubleshootTitle')}
                </p>
                <ul className="text-yellow-200/80 text-xs space-y-1">
                  <li>{t('forgotPassword.troubleshoot1')}</li>
                  <li>{t('forgotPassword.troubleshoot2')}</li>
                  <li>{t('forgotPassword.troubleshoot3')}</li>
                  <li>{t('forgotPassword.troubleshoot4')}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}