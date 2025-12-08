import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import GmailIcon from '../images/gmail.png'
import OutlookIcon from '../images/outlook.png'
import YahooIcon from '../images/yahoo.png'

export const ConfirmarEmail = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email') || t('confirmEmail.defaultEmail')
  const [countdown, setCountdown] = useState(120)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-200">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl mx-4 px-6 py-12">
        {/* Logo/Header */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 p-[2px] shadow-lg shadow-emerald-500/30">
            <div className="w-full h-full rounded-2xl bg-gray-900/80 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-emerald-300" />
            </div>
          </div>
        </div>

        {/* Card principal */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-cyan-950/40 backdrop-blur-md shadow-2xl shadow-emerald-500/10 p-8 md:p-12">
          <div className="flex flex-col items-center text-center">
            {/* Ícone de sucesso animado */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/50 animate-pulse">
              <span className="text-5xl">📧</span>
            </div>

            {/* Título */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {t('confirmEmail.title')}
            </h1>

            {/* Mensagem */}
            <div className="space-y-4 text-gray-300 mb-8 max-w-lg">
              <p className="text-lg leading-relaxed">
                {t('confirmEmail.congrats')}
              </p>
              <p className="text-lg leading-relaxed">
                {t('confirmEmail.sentTo')}
              </p>
              <p className="text-xl font-semibold text-emerald-400 break-all">
                {email}
              </p>
              <p className="text-base text-gray-400 mt-6">
                {t('confirmEmail.instruction')}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t('confirmEmail.spamWarning')}
              </p>
            </div>

            {/* Atalhos de Email */}
            <div className="mb-10 w-full max-w-lg">
              <p className="text-sm text-gray-400 mb-4 font-medium">{t('confirmEmail.accessQuickly')}</p>
              <div className="grid grid-cols-3 gap-4">
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20"
                >
                  <img src={GmailIcon} alt="Gmail" className="w-12 h-12" />
                  <span className="text-sm font-medium">{t('confirmEmail.gmail')}</span>
                </a>
                <a
                  href="https://outlook.live.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20"
                >
                  <img src={OutlookIcon} alt="Outlook" className="w-12 h-12" />
                  <span className="text-sm font-medium">{t('confirmEmail.outlook')}</span>
                </a>
                <a
                  href="https://mail.yahoo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
                >
                  <img src={YahooIcon} alt="Yahoo" className="w-12 h-12" />
                  <span className="text-sm font-medium">{t('confirmEmail.yahoo')}</span>
                </a>
              </div>
            </div>

            {/* Botão de voltar */}
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              <button
                onClick={() => navigate('/login')}
                className="w-full px-8 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95"
              >
                {t('confirmEmail.backToLogin')}
              </button>
              <p className="text-sm text-gray-500">
                {t('confirmEmail.redirecting')} <span className="font-bold text-emerald-400">{countdown}s</span>
              </p>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>{t('confirmEmail.notReceived')}</p>
          <p className="mt-2">{t('confirmEmail.support')}</p>
        </div>
      </div>
    </div>
  )
}
