import { useState, useMemo } from 'react'
import { Lock } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import PaginaRequisicoes from '../components/documentacao/PaginaRequisicoes'
import PaginaIniciantes from '../components/documentacao/PaginaIniciantes'
import { useTranslation } from 'react-i18next'

export default function Documentacao() {
  const { member } = useAuthStore()
  const [aba, setAba] = useState<'inicio' | 'iniciantes' | 'credenciais' | 'requisicoes'>('inicio')
  const { t } = useTranslation()

  const possuiAcesso = useMemo(() => {
    if (!member) return false
    return member.role === 'owner'
  }, [member])

  // Acesso negado (não owner)
  if (!possuiAcesso) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t('documentation.accessRestricted.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {t('documentation.accessRestricted.description')}
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('documentation.accessRestricted.contactOwner')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-slate-900 dark:text-slate-200 flex flex-col min-h-full relative overflow-hidden">
      {/* Background decorativo */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
      </div>

      <div className="flex-1 overflow-y-auto pb-6 px-6 relative z-10">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.06),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.06),transparent_45%)]" />

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 flex justify-center">
            <div className="flex gap-8">
              <button
                onClick={() => setAba('inicio')}
                className={`px-4 py-4 font-medium border-b-2 transition-all ${aba === 'inicio'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
              >
                {t('documentation.tabs.home')}
              </button>
              <button
                onClick={() => setAba('iniciantes')}
                className={`px-4 py-4 font-medium border-b-2 transition-all ${aba === 'iniciantes'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
              >
                {t('documentation.tabs.beginners')}
              </button>
              {/* Tab Credenciais removida */}
              <button
                onClick={() => setAba('requisicoes')}
                className={`px-4 py-4 font-medium border-b-2 transition-all ${aba === 'requisicoes'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
              >
                {t('documentation.tabs.requests')}
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo das abas */}
        {aba === 'inicio' && (
          <div className="max-w-[1600px] mx-auto space-y-12 pt-12 px-6">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('documentation.home.title')}
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                {t('documentation.home.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Card Iniciantes */}
              <div
                onClick={() => setAba('iniciantes')}
                className="group cursor-pointer bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-8 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t('documentation.cards.beginners.title')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6">
                  {t('documentation.cards.beginners.description')}
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform">
                  {t('documentation.cards.beginners.button')} →
                </div>
              </div>

              {/* Card API/Requisições */}
              <div
                onClick={() => setAba('requisicoes')}
                className="group cursor-pointer bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-8 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t('documentation.cards.api.title')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6">
                  {t('documentation.cards.api.description')}
                </p>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium group-hover:translate-x-2 transition-transform">
                  {t('documentation.cards.api.button')} →
                </div>
              </div>
            </div>

            {/* Seção de Suporte */}
            <div className="max-w-5xl mx-auto mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">
                    Precisa de ajuda especializada?
                  </h3>
                  <p className="text-blue-100 text-lg max-w-xl">
                    Nossa equipe de engenheiros está pronta para ajudar você a integrar o Azera CRM ao seu sistema. Agende uma call técnica gratuita.
                  </p>
                </div>
                <button
                  onClick={() => window.open('https://wa.me/5531991318312?text=Olá! Preciso de ajuda com a integração do Azera CRM.', '_blank')}
                  className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                >
                  Falar com Especialista
                </button>
              </div>
            </div>
          </div>
        )}

        {aba === 'iniciantes' && <PaginaIniciantes />}

        {aba === 'requisicoes' && <PaginaRequisicoes />}
      </div>
    </div>
  )
}
