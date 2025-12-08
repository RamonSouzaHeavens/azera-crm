import React, { useState } from 'react'
import { Copy, Check, Key, Terminal, Code, BookOpen } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation, Trans } from 'react-i18next'
import { TenantIdDisplay } from './TenantIdDisplay'

type IconType = React.ComponentType<{ className?: string }>
type InfoBoxType = 'info' | 'warning' | 'danger' | 'success'
type CredentialVariant = 'default' | 'warning' | 'success'
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface BotaoProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon: IconType
}

interface CopyButtonProps {
  text: string
  id: string
  label?: string
}

interface InfoBoxProps {
  type?: InfoBoxType
  title: string
  children: React.ReactNode
}

interface CodeBlockProps {
  code: string
}

interface CredentialFieldProps {
  label: string
  value: string
  id: string
  variant?: CredentialVariant
}

interface EndpointItemProps {
  method: HttpMethod
  path: string
  description?: string
}

export default function PaginaRequisicoes() {
  const { t } = useTranslation()
  const [aba, setAba] = useState<'inicio' | 'credenciais' | 'exemplos' | 'endpoints'>('inicio')
  const [subAba, setSubAba] = useState<'leads' | 'tarefas' | 'produtos' | 'conversas'>('leads')
  const [copiado, setCopiado] = useState<string>('')

  // Dados reais do usuário
  const { tenant } = useAuthStore()
  const tenantId = tenant?.id || 'tenant_abc123def456'
  const apiKey = '<SUA_API_KEY>' // O usuário deve gerar na página de Credenciais
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co'

  const copiar = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiado(id)
    setTimeout(() => setCopiado(''), 2000)
  }

  const Botao: React.FC<BotaoProps> = ({ active, onClick, children, icon: Icon }) => (
    <button
      onClick={onClick}
      className={`px-5 py-3 font-medium flex items-center gap-2 border-b-2 transition-all ${active
        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  )

  const CopyButton = ({ text, id, label }: CopyButtonProps) => (
    <button
      onClick={() => copiar(text, id)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors border border-slate-200 dark:border-slate-700"
    >
      {copiado === id ? (
        <>
          <Check className="w-3 h-3" />
          {t('documentation.requests.common.copied')}
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {label || t('documentation.requests.common.copy')}
        </>
      )}
    </button>
  )

  const InfoBox = ({ type = 'info', title, children }: InfoBoxProps) => {
    const styles = {
      info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-100',
      warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-100',
      danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-100',
      success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-100'
    }

    return (
      <div className={`border p-4 rounded-lg ${styles[type]}`}>
        <h3 className="font-semibold mb-2">{title}</h3>
        <div className="text-sm opacity-90">{children}</div>
      </div>
    )
  }

  const CodeBlock = ({ code }: CodeBlockProps) => (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 h-full">
      <pre className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
        {code}
      </pre>
    </div>
  )

  const CredentialField = ({ label, value, id, variant = 'default' }: CredentialFieldProps) => {
    const variants = {
      default: 'bg-blue-600 hover:bg-blue-700',
      warning: 'bg-amber-600 hover:bg-amber-700',
      success: 'bg-emerald-600 hover:bg-emerald-700'
    }

    return (
      <div>
        <label className="font-medium text-slate-700 dark:text-slate-300 block mb-2">
          {label}
        </label>
        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg font-mono text-sm mb-3 break-all text-slate-800 dark:text-slate-200">
          {value}
        </div>
        <button
          onClick={() => copiar(value, id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors ${variants[variant]}`}
        >
          {copiado === id ? (
            <>
              <Check className="w-3 h-3" />
              {t('documentation.requests.common.copied')}
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              {t('documentation.requests.common.copy')}
            </>
          )}
        </button>
      </div>
    )
  }

  const EndpointItem = ({ method, path, description }: EndpointItemProps) => {
    const methodColors = {
      GET: 'text-emerald-600 dark:text-emerald-400',
      POST: 'text-blue-600 dark:text-blue-400',
      PATCH: 'text-amber-600 dark:text-amber-400',
      DELETE: 'text-red-600 dark:text-red-400'
    }

    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 h-full">
        <div className="flex items-center gap-3 mb-1">
          <span className={`font-bold text-sm ${methodColors[method]}`}>
            {method}
          </span>
          <code className="text-sm text-slate-700 dark:text-slate-300 break-all">
            {path}
          </code>
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {description}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="w-full max-w-[1920px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-4xl font-bold font-outfit text-slate-900 dark:text-white">
                {t('documentation.requests.title')}
              </h1>
              <p className="text-base mt-1 text-slate-600 dark:text-slate-400">
                {t('documentation.requests.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <Botao
            active={aba === 'inicio'}
            onClick={() => setAba('inicio')}
            icon={BookOpen}
          >
            {t('documentation.requests.tabs.start')}
          </Botao>
          <Botao
            active={aba === 'credenciais'}
            onClick={() => setAba('credenciais')}
            icon={Key}
          >
            {t('documentation.requests.tabs.credentials')}
          </Botao>
          <Botao
            active={aba === 'exemplos'}
            onClick={() => setAba('exemplos')}
            icon={Terminal}
          >
            {t('documentation.requests.tabs.examples')}
          </Botao>
          <Botao
            active={aba === 'endpoints'}
            onClick={() => setAba('endpoints')}
            icon={Code}
          >
            {t('documentation.requests.tabs.endpoints')}
          </Botao>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">

          {/* Início Tab */}
          {aba === 'inicio' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  {t('documentation.requests.start.overviewTitle')}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('documentation.requests.start.overviewDesc')}
                </p>
              </div>

              <InfoBox type="success" title={t('documentation.requests.start.quickStartTitle')}>
                <ol className="space-y-2 list-decimal list-inside">
                  <li>
                    <Trans i18nKey="documentation.requests.start.quickStartStep1" components={{ strong: <strong /> }} />
                  </li>
                  <li>
                    <Trans i18nKey="documentation.requests.start.quickStartStep2" components={{ strong: <strong /> }} />
                  </li>
                  <li>{t('documentation.requests.start.quickStartStep3')}</li>
                </ol>
              </InfoBox>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  {t('documentation.requests.start.resourcesTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                      {t('documentation.requests.start.resources.leads.title')}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t('documentation.requests.start.resources.leads.desc')}
                    </p>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                      {t('documentation.requests.examples.tabs.properties')}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Gerencie seu catálogo de produtos, incluindo criação, atualização de preços e status.
                    </p>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                      {t('documentation.requests.start.resources.tasks.title')}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t('documentation.requests.start.resources.tasks.desc')}
                    </p>
                  </div>
                </div>
              </div>

              <InfoBox type="warning" title={t('documentation.requests.start.importantTitle')}>
                <p>
                  <Trans i18nKey="documentation.requests.start.importantDesc" components={{ strong: <strong /> }} />
                </p>
              </InfoBox>
            </div>
          )}

          {/* Credenciais Tab */}
          {aba === 'credenciais' && (
            <div className="space-y-6">
              <InfoBox type="danger" title={t('documentation.requests.credentials.securityTitle')}>
                <p>
                  {t('documentation.requests.credentials.securityDesc')}
                </p>
                <div className="mt-4">
                  <a
                    href="/app/api-keys"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    Gerenciar Chaves de API
                  </a>
                </div>
              </InfoBox>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <TenantIdDisplay tenantId={tenantId} />
                </div>

                <CredentialField
                  label={t('documentation.requests.credentials.fields.apiKey')}
                  value={apiKey}
                  id="key"
                  variant="warning"
                />

                <CredentialField
                  label={t('documentation.requests.credentials.fields.baseUrl')}
                  value={baseUrl}
                  id="url"
                  variant="success"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  {t('documentation.requests.credentials.howToUseTitle')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {t('documentation.requests.credentials.howToUseDesc')}
                </p>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    <span><strong>{t('documentation.requests.credentials.headerLabel')}</strong> <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Authorization: Bearer {'{sua-api-key}'}</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    <span><strong>{t('documentation.requests.credentials.bodyLabel')}</strong> <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{`"tenant_id": "{seu-tenant-id}"`}</code></span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Exemplos Tab */}
          {aba === 'exemplos' && (
            <div className="space-y-6">
              {/* Sub-navigation for examples */}
              <div className="flex gap-2 mb-8 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <button
                  onClick={() => setSubAba('leads')}
                  className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${subAba === 'leads'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 scale-105'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-md'
                    }`}
                >
                  {t('documentation.requests.examples.tabs.leads')}
                </button>
                <button
                  onClick={() => setSubAba('conversas')}
                  className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${subAba === 'conversas'
                    ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-500/25 scale-105'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-md'
                    }`}
                >
                  Conversas
                </button>
                <button
                  onClick={() => setSubAba('tarefas')}
                  className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${subAba === 'tarefas'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 scale-105'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-md'
                    }`}
                >
                  {t('documentation.requests.examples.tabs.tasks')}
                </button>
                <button
                  onClick={() => setSubAba('produtos')}
                  className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${subAba === 'produtos'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/25 scale-105'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-md'
                    }`}
                >
                  {t('documentation.requests.examples.tabs.properties')}
                </button>
              </div>

              {/* Leads Examples */}
              {subAba === 'leads' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">📋</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {t('documentation.requests.examples.leads.title')}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.leads.list')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-leads" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "list",\n    "tenant_id": "${tenantId}"\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-leads" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "list", "tenant_id": "${tenantId}"}'`}
                        id="leads-list"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.leads.search')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-leads" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "list",\n    "tenant_id": "${tenantId}"\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-leads" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "list", "tenant_id": "${tenantId}"}'`}
                        id="leads-search"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.leads.create')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-leads" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "create",\n    "tenant_id": "${tenantId}",\n    "data": {\n      "nome": "João Silva",\n      "email": "joao@email.com",\n      "telefone": "+55 11 99999-9999",\n      "valor_potencial": 50000\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-leads" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "create", "tenant_id": "${tenantId}", "data": {"nome": "João Silva", "email": "joao@email.com", "telefone": "+55 11 99999-9999", "valor_potencial": 50000}}'`}
                        id="leads-create"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.leads.update')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-leads" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "update",\n    "tenant_id": "${tenantId}",\n    "lead_id": "LEAD_ID",\n    "data": {\n      "status": "contatado",\n      "notas": "Cliente interessado no produto"\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-leads" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "update", "tenant_id": "${tenantId}", "lead_id": "LEAD_ID", "data": {"status": "contatado", "notas": "Cliente interessado no produto"}}'`}
                        id="leads-update"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.leads.move')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-leads" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "move",\n    "tenant_id": "${tenantId}",\n    "lead_id": "LEAD_ID",\n    "stage_id": "STAGE_ID"\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-leads" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "move", "tenant_id": "${tenantId}", "lead_id": "LEAD_ID", "stage_id": "STAGE_ID"}'`}
                        id="leads-move"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.leads.read')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-leads" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "read",\n    "tenant_id": "${tenantId}",\n    "lead_id": "LEAD_ID"\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-leads" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "read", "tenant_id": "${tenantId}", "lead_id": "LEAD_ID"}'`}
                        id="leads-read"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conversas Examples */}
              {subAba === 'conversas' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">💬</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Conversas
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        Listar Conversas
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-conversas" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "list",\n    "tenant_id": "${tenantId}"\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-conversas" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "list", "tenant_id": "${tenantId}"}'`}
                        id="conversas-list"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        Enviar Mensagem
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-conversas" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "send_message",\n    "tenant_id": "${tenantId}",\n    "conversation_id": "CONVERSATION_ID",\n    "content": "Olá, como posso ajudar?"\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-conversas" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "send_message", "tenant_id": "${tenantId}", "conversation_id": "CONVERSATION_ID", "content": "Olá, como posso ajudar?"}'`}
                        id="conversas-send"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        Ler Conversa
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-conversas" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "read",\n    "tenant_id": "${tenantId}",\n    "conversation_id": "CONVERSATION_ID"\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-conversas" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "read", "tenant_id": "${tenantId}", "conversation_id": "CONVERSATION_ID"}'`}
                        id="conversas-read"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tarefas Examples */}
              {subAba === 'tarefas' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">✅</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {t('documentation.requests.examples.tasks.title')}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.tasks.list')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "list",\n    "tenant_id": "${tenantId}"\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "list", "tenant_id": "${tenantId}"}'`}
                        id="tasks-list"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.tasks.create')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "create",\n    "tenant_id": "${tenantId}",\n    "data": {\n      "titulo": "Ligar para cliente",\n      "descricao": "Retornar ligação do João sobre o produto",\n      "status": "pendente",\n      "prioridade": "alta"\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "create", "tenant_id": "${tenantId}", "data": {"titulo": "Ligar para cliente", "descricao": "Retornar ligação do João", "status": "pendente", "prioridade": "alta"}}'`}
                        id="tasks-create"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.tasks.complete')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "update",\n    "tenant_id": "${tenantId}",\n    "task_id": "TASK_ID",\n    "data": {\n      "status": "concluida",\n      "notas": "Tarefa finalizada"\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "update", "tenant_id": "${tenantId}", "task_id": "TASK_ID", "data": {"status": "concluida", "notas": "Tarefa finalizada"}}'`}
                        id="tasks-complete"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.tasks.reschedule')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "update",\n    "tenant_id": "${tenantId}",\n    "task_id": "TASK_ID",\n    "data": {\n      "data_vencimento": "2024-01-20T14:00:00Z"\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "update", "tenant_id": "${tenantId}", "task_id": "TASK_ID", "data": {"data_vencimento": "2024-01-20T14:00:00Z"}}'`}
                        id="tasks-reschedule"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        Editar Tarefa
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "update",\n    "tenant_id": "${tenantId}",\n    "task_id": "TASK_ID",\n    "data": {\n      "titulo": "Novo Título da Tarefa",\n      "descricao": "Descrição atualizada via API"\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-tarefas" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "update", "tenant_id": "${tenantId}", "task_id": "TASK_ID", "data": {"titulo": "Novo Título da Tarefa", "descricao": "Descrição atualizada via API"}}'`}
                        id="tasks-edit"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Produtos Examples */}
              {subAba === 'produtos' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">📦</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {t('documentation.requests.examples.properties.title')}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.properties.list')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-produtos" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "list",\n    "tenant_id": "${tenantId}"\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-produtos" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "list", "tenant_id": "${tenantId}"}'`}
                        id="properties-list"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.properties.create')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-produtos" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "create",\n    "tenant_id": "${tenantId}",\n    "produto": {\n      "nome": "Produto Exemplo",\n      "descricao": "Descrição do produto",\n      "tipo": "servico",\n      "preco": 1500,\n      "ativo": true\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-produtos" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "create", "tenant_id": "${tenantId}", "produto": {"nome": "Produto Exemplo", "descricao": "Descrição do produto", "tipo": "servico", "preco": 1500, "ativo": true}}'`}
                        id="properties-create"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.properties.update')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-produtos" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "update",\n    "tenant_id": "${tenantId}",\n    "produto_id": "PRODUTO_ID",\n    "produto": {\n      "nome": "Nome Atualizado",\n      "descricao": "Nova descrição"\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-produtos" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "update", "tenant_id": "${tenantId}", "produto_id": "PRODUTO_ID", "produto": {"nome": "Nome Atualizado", "descricao": "Nova descrição"}}'`}
                        id="properties-edit"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.properties.updatePrice')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-produtos" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "update",\n    "tenant_id": "${tenantId}",\n    "produto_id": "PRODUTO_ID",\n    "produto": {\n      "preco": 2000\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-produtos" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "update", "tenant_id": "${tenantId}", "produto_id": "PRODUTO_ID", "produto": {"preco": 2000}}'`}
                        id="properties-update-price"
                      />
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        {t('documentation.requests.examples.properties.sold')}
                      </h4>
                      <div className="flex-1 mb-3">
                        <CodeBlock
                          code={`curl -X POST "${baseUrl}/functions/v1/api-produtos" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "update",\n    "tenant_id": "${tenantId}",\n    "produto_id": "PRODUTO_ID",\n    "produto": {\n      "ativo": false,\n      "filtros": { "status": "vendido" }\n    }\n  }'`}
                        />
                      </div>
                      <CopyButton
                        text={`curl -X POST "${baseUrl}/functions/v1/api-produtos" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"action": "update", "tenant_id": "${tenantId}", "produto_id": "PRODUTO_ID", "produto": {"ativo": false, "filtros": { "status": "vendido" }}}'`}
                        id="properties-sold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Endpoints Tab */}
          {aba === 'endpoints' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  {t('documentation.requests.endpoints.leadsTitle')}
                </h3>
                <div className="space-y-3">
                  <EndpointItem
                    method="GET"
                    path="/rest/v1/clientes"
                    description={t('documentation.requests.endpoints.descriptions.listClients')}
                  />
                  <EndpointItem
                    method="POST"
                    path="/rest/v1/clientes"
                    description={t('documentation.requests.endpoints.descriptions.createClient')}
                  />
                  <EndpointItem
                    method="PATCH"
                    path="/rest/v1/clientes?id=eq.{id}"
                    description={t('documentation.requests.endpoints.descriptions.updateClient')}
                  />
                  <EndpointItem
                    method="DELETE"
                    path="/rest/v1/clientes?id=eq.{id}"
                    description={t('documentation.requests.endpoints.descriptions.deleteClient')}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  Conversas
                </h3>
                <div className="space-y-3">
                  <EndpointItem
                    method="GET"
                    path="/rest/v1/conversas"
                    description="Listar Conversas"
                  />
                  <EndpointItem
                    method="POST"
                    path="/rest/v1/conversas"
                    description="Criar Conversa"
                  />
                  <EndpointItem
                    method="PATCH"
                    path="/rest/v1/conversas?id=eq.{id}"
                    description="Atualizar Conversa"
                  />
                  <EndpointItem
                    method="POST"
                    path="/rest/v1/messages"
                    description="Enviar Mensagem"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  {t('documentation.requests.endpoints.propertiesTitle')}
                </h3>
                <div className="space-y-3">
                  <EndpointItem
                    method="GET"
                    path="/rest/v1/produtos"
                    description="Listar Produtos"
                  />
                  <EndpointItem
                    method="POST"
                    path="/rest/v1/produtos"
                    description="Criar Produto"
                  />
                  <EndpointItem
                    method="PATCH"
                    path="/rest/v1/produtos?id=eq.{id}"
                    description="Atualizar Produto"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  {t('documentation.requests.endpoints.tasksTitle')}
                </h3>
                <div className="space-y-3">
                  <EndpointItem
                    method="GET"
                    path="/rest/v1/tarefas"
                    description={t('documentation.requests.endpoints.descriptions.listTasks')}
                  />
                  <EndpointItem
                    method="POST"
                    path="/rest/v1/tarefas"
                    description="Criar Tarefa"
                  />
                  <EndpointItem
                    method="PATCH"
                    path="/rest/v1/tarefas?id=eq.{id}"
                    description="Atualizar Tarefa"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
