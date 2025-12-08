import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, AlertCircle } from 'lucide-react'

const OAuthCallback = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    // Capturar o access_token do fragmento da URL
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      console.error('OAuth Error:', error, errorDescription)
      // Redirecionar de volta para a página de equipes com erro
      setTimeout(() => {
        navigate('/equipe?tab=conexao-meta&error=' + encodeURIComponent(errorDescription || error))
      }, 3000)
      return
    }

    if (accessToken) {
      // Salvar o token no localStorage
      localStorage.setItem('facebook_access_token', accessToken)
      console.log('Facebook access token saved successfully')

      // Redirecionar de volta para a aba de Conexão Meta
      setTimeout(() => {
        navigate('/equipe?tab=conexao-meta&connected=true')
      }, 2000)
    } else {
      // Nenhum token encontrado
      setTimeout(() => {
        navigate('/equipe?tab=conexao-meta&error=no_token')
      }, 3000)
    }
  }, [navigate])

  // Determinar se houve sucesso ou erro
  const hash = window.location.hash
  const params = new URLSearchParams(hash.substring(1))
  const hasError = params.get('error')
  const hasToken = params.get('access_token')

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="rounded-3xl bg-white/5 border border-white/10 p-8 shadow-2xl text-center">
          {hasError ? (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">
                {t('oauthCallback.error.title')}
              </h2>
              <p className="text-slate-400 mb-6">
                {t('oauthCallback.error.description')}
              </p>
              <div className="w-8 h-8 border-2 border-red-500/50 border-t-red-400 rounded-full animate-spin mx-auto"></div>
            </>
          ) : hasToken ? (
            <>
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">
                {t('oauthCallback.success.title')}
              </h2>
              <p className="text-slate-400 mb-6">
                {t('oauthCallback.success.description')}
              </p>
              <div className="w-8 h-8 border-2 border-green-500/50 border-t-green-400 rounded-full animate-spin mx-auto"></div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 border-2 border-blue-500/50 border-t-blue-400 rounded-full animate-spin"></div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">
                {t('oauthCallback.loading.title')}
              </h2>
              <p className="text-slate-400">
                {t('oauthCallback.loading.description')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default OAuthCallback