import { useState } from 'react'
import { Copy, Check, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'

export function PainelCredenciais() {
  const { user, tenant } = useAuthStore()
  const [copiado, setCopiado] = useState<string | null>(null)
  const [mostrarToken, setMostrarToken] = useState(false)
  const [mostrarKey, setMostrarKey] = useState(false)

  const copiarTexto = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto)
    setCopiado(id)
    toast.success('Copiado para a área de transferência!')
    setTimeout(() => setCopiado(null), 2000)
  }

  // Gerar valores de exemplo (em produção, vêm da API)
  const apiKey = `sk_live_${tenant?.id?.slice(0, 16) || 'seu_tenant_id'}_${user?.id?.slice(0, 16) || 'seu_user_id'}`
  const jwtToken = user?.user_metadata?.['custom_jwt'] || `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  const tenantId = tenant?.id || 'seu-tenant-id-aqui'
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            🔑 Suas Credenciais de API
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Guarde essas credenciais com segurança. Use-as para integrar o Azera CRM com suas aplicações.
          </p>
        </div>

        {/* Aviso de Segurança */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 mb-8 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200 mb-1">🔒 Mantenha estas chaves em segurança</p>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              <li>• Nunca compartilhe suas credenciais publicamente</li>
              <li>• Não faça commit das credenciais em repositórios públicos</li>
              <li>• Use variáveis de ambiente (.env) em seu servidor</li>
              <li>• Regenere as chaves se suspeitar de comprometimento</li>
            </ul>
          </div>
        </div>

        {/* Credenciais */}
        <div className="space-y-6">
          {/* Tenant ID */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tenant ID</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Identificador único da sua equipe</p>
              </div>
              <span className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-mono">
                PÚBLICO
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-900 dark:text-slate-100 break-all">
              {tenantId}
            </div>
            <button
              onClick={() => copiarTexto(tenantId, 'tenant-id')}
              className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
              {copiado === 'tenant-id' ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Tenant ID
                </>
              )}
            </button>
          </div>

          {/* API Key */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">API Key</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Chave para autenticação de aplicações</p>
              </div>
              <span className="text-xs px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-mono">
                SECRETO
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-900 dark:text-slate-100 break-all flex items-center justify-between">
              <span>{mostrarKey ? apiKey : '•'.repeat(apiKey.length)}</span>
              <button
                onClick={() => setMostrarKey(!mostrarKey)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-2"
              >
                {mostrarKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => copiarTexto(apiKey, 'api-key')}
              className="mt-3 w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
              {copiado === 'api-key' ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar API Key
                </>
              )}
            </button>
          </div>

          {/* JWT Token */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">JWT Token</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Token de autenticação do usuário (muda frequentemente)</p>
              </div>
              <span className="text-xs px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-mono">
                SECRETO
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-900 dark:text-slate-100 break-all flex items-center justify-between">
              <span>{mostrarToken ? jwtToken : jwtToken.slice(0, 20) + '...'}</span>
              <button
                onClick={() => setMostrarToken(!mostrarToken)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-2"
              >
                {mostrarToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => copiarTexto(jwtToken, 'jwt-token')}
              className="mt-3 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
              {copiado === 'jwt-token' ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar JWT Token
                </>
              )}
            </button>
          </div>

          {/* Base URL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">URL Base da API</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Raiz de todas as requisições API</p>
              </div>
              <span className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-mono">
                PÚBLICO
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-900 dark:text-slate-100 break-all">
              {baseUrl}
            </div>
            <button
              onClick={() => copiarTexto(baseUrl, 'base-url')}
              className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
              {copiado === 'base-url' ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar URL Base
                </>
              )}
            </button>
          </div>
        </div>

        {/* Regenerar Chaves */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Regenerar Chaves</h4>
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
                Se suspeitar que suas credenciais foram comprometidas, regenere-as aqui.
                Suas integrações ativas deixarão de funcionar até que você atualize as novas credenciais lá.
              </p>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                🔄 Regenerar Todas as Chaves
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>Precisa de ajuda? Confira a documentação de <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 underline">Requisições HTTP</a></p>
        </div>
      </div>
    </div>
  )
}
