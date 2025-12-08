import { useState } from 'react'
import { Play, Key, Zap, CheckCircle, ArrowRight, BookOpen, Code, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PaginaIniciantes() {
  const [secaoAtiva, setSecaoAtiva] = useState<'automacao' | 'api'>('automacao')
  const { t } = useTranslation()

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {t('documentation.beginners.title')}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {t('documentation.beginners.subtitle')}
        </p>
      </div>

      {/* Seletor de Seção */}
      <div className="flex justify-center">
        <div className="bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-sm">
          <button
            onClick={() => setSecaoAtiva('automacao')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${secaoAtiva === 'automacao'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
          >
            <Zap className="w-4 h-4" />
            {t('documentation.beginners.automations')}
          </button>
          <button
            onClick={() => setSecaoAtiva('api')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${secaoAtiva === 'api'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
          >
            <Key className="w-4 h-4" />
            {t('documentation.beginners.apiKeys')}
          </button>
        </div>
      </div>

      {/* Conteúdo da Seção */}
      {secaoAtiva === 'automacao' && <SecaoAutomacao />}
      {secaoAtiva === 'api' && <SecaoAPI />}
    </div>
  )
}

function SecaoAutomacao() {
  const { t } = useTranslation()

  const passos = [
    {
      numero: 1,
      titulo: t('documentation.beginners.automationsSection.steps.1.title'),
      descricao: t('documentation.beginners.automationsSection.steps.1.desc'),
      icone: Settings
    },
    {
      numero: 2,
      titulo: t('documentation.beginners.automationsSection.steps.2.title'),
      descricao: t('documentation.beginners.automationsSection.steps.2.desc'),
      icone: Play
    },
    {
      numero: 3,
      titulo: t('documentation.beginners.automationsSection.steps.3.title'),
      descricao: t('documentation.beginners.automationsSection.steps.3.desc'),
      icone: CheckCircle
    },
    {
      numero: 4,
      titulo: t('documentation.beginners.automationsSection.steps.4.title'),
      descricao: t('documentation.beginners.automationsSection.steps.4.desc'),
      icone: ArrowRight
    },
    {
      numero: 5,
      titulo: t('documentation.beginners.automationsSection.steps.5.title'),
      descricao: t('documentation.beginners.automationsSection.steps.5.desc'),
      icone: Code
    },
    {
      numero: 6,
      titulo: t('documentation.beginners.automationsSection.steps.6.title'),
      descricao: t('documentation.beginners.automationsSection.steps.6.desc'),
      icone: Play
    },
    {
      numero: 7,
      titulo: t('documentation.beginners.automationsSection.steps.7.title'),
      descricao: t('documentation.beginners.automationsSection.steps.7.desc'),
      icone: CheckCircle
    }
  ]

  const tipsList = t('documentation.beginners.automationsSection.tips.list', { returnObjects: true }) as string[]
  const varsList = t('documentation.beginners.automationsSection.httpConfig.vars.list', { returnObjects: true }) as string[]

  return (
    <div className="space-y-8">
      <div className="bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-500" />
          {t('documentation.beginners.automationsSection.title')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {t('documentation.beginners.automationsSection.desc')}
        </p>
      </div>

      <div className="relative space-y-8 pl-8 md:pl-0">
        {/* Linha conectora vertical */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-transparent md:left-1/2 md:-ml-0.5 hidden md:block"></div>

        {passos.map((passo, index) => (
          <div key={passo.numero} className={`relative flex flex-col md:flex-row items-center gap-8 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>

            {/* Conteúdo */}
            <div className="flex-1 w-full">
              <div className="bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:border-blue-500/30 transition-colors relative group">
                <div className={`absolute top-6 ${index % 2 === 0 ? 'md:-right-3 right-auto -left-3' : 'md:-left-3 -left-3'} w-6 h-6 bg-slate-900 transform rotate-45 border-t border-l border-white/10 hidden md:block`}></div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                    Passo {passo.numero}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {passo.titulo}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {passo.descricao}
                </p>
              </div>
            </div>

            {/* Ícone Central */}
            <div className="absolute left-0 md:left-1/2 md:-ml-6 w-12 h-12 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center z-10 shadow-lg shadow-blue-500/20">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <passo.icone className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Espaço vazio para o outro lado */}
            <div className="flex-1 hidden md:block"></div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-200 dark:border-green-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-2">
          {t('documentation.beginners.automationsSection.tips.title')}
        </h3>
        <ul className="space-y-2 text-green-700 dark:text-green-300">
          {Array.isArray(tipsList) && tipsList.map((tip, index) => (
            <li key={index}>• {tip}</li>
          ))}
        </ul>
      </div>

      <div className="bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-blue-500" />
          {t('documentation.beginners.automationsSection.httpConfig.title')}
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-slate-900 dark:text-white mb-2">
              {t('documentation.beginners.automationsSection.httpConfig.whenToUse.title')}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
              {t('documentation.beginners.automationsSection.httpConfig.whenToUse.desc')}
            </p>
          </div>

          <div>
            <h4 className="text-md font-medium text-slate-900 dark:text-white mb-2">
              {t('documentation.beginners.automationsSection.httpConfig.headers.title')}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
              {t('documentation.beginners.automationsSection.httpConfig.headers.desc')}
            </p>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-green-400">
              <div><span className="text-slate-400">// Headers na configuração da automação:</span></div>
              <div>{'{'}</div>
              <div>&nbsp;&nbsp;"Authorization": "Bearer SUA_CHAVE_API",</div>
              <div>&nbsp;&nbsp;"Content-Type": "application/json",</div>
              <div>&nbsp;&nbsp;"X-Source": "Azera-Automation"</div>
              <div>{'}'}</div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-slate-900 dark:text-white mb-2">
              {t('documentation.beginners.automationsSection.httpConfig.body.title')}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
              {t('documentation.beginners.automationsSection.httpConfig.body.desc')}
            </p>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-blue-400">
              <div><span className="text-slate-400">// Body com dados dinâmicos:</span></div>
              <div>{'{'}</div>
              <div>&nbsp;&nbsp;"lead_id": "&#123;lead.id&#125;",</div>
              <div>&nbsp;&nbsp;"nome": "&#123;lead.nome&#125;",</div>
              <div>&nbsp;&nbsp;"email": "&#123;lead.email&#125;",</div>
              <div>&nbsp;&nbsp;"telefone": "&#123;lead.telefone&#125;",</div>
              <div>&nbsp;&nbsp;"origem": "automacao_azera",</div>
              <div>&nbsp;&nbsp;"timestamp": "&#123;timestamp&#125;"</div>
              <div>{'}'}</div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
              {t('documentation.beginners.automationsSection.httpConfig.vars.title')}
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <code>&#123;lead.id&#125;</code> - {varsList[0]}</li>
              <li>• <code>&#123;lead.nome&#125;</code> - {varsList[1]}</li>
              <li>• <code>&#123;lead.email&#125;</code> - {varsList[2]}</li>
              <li>• <code>&#123;lead.telefone&#125;</code> - {varsList[3]}</li>
              <li>• <code>&#123;timestamp&#125;</code> - {varsList[4]}</li>
              <li>• <code>&#123;user.name&#125;</code> - {varsList[5]}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('documentation.beginners.automationsSection.example.title')}
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('documentation.beginners.automationsSection.example.scenario')}
            </h4>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 space-y-2">
              <div className="text-slate-400">// Configuração da Ação HTTP:</div>
              <div><strong>URL:</strong> https://api.chatbot.com/webhook</div>
              <div><strong>Método:</strong> POST</div>
              <div><strong>Headers:</strong></div>
              <div className="ml-4">{`{
  "Authorization": "Bearer CHAVE_DO_CHATBOT",
  "Content-Type": "application/json"
}`}</div>
              <div><strong>Body:</strong></div>
              <div className="ml-4">{`{
  "lead_id": "{lead.id}",
  "nome": "{lead.nome}",
  "email": "{lead.email}",
  "mensagem": "Olá {lead.nome}! Bem-vindo ao nosso sistema!"
}`}</div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-2">
              {t('documentation.beginners.automationsSection.example.result.title')}
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {t('documentation.beginners.automationsSection.example.result.desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SecaoAPI() {
  const { t } = useTranslation()

  const passos = [
    {
      numero: 1,
      titulo: t('documentation.beginners.apiSection.steps.1.title'),
      descricao: t('documentation.beginners.apiSection.steps.1.desc'),
      icone: Settings
    },
    {
      numero: 2,
      titulo: t('documentation.beginners.apiSection.steps.2.title'),
      descricao: t('documentation.beginners.apiSection.steps.2.desc'),
      icone: Key
    },
    {
      numero: 3,
      titulo: t('documentation.beginners.apiSection.steps.3.title'),
      descricao: t('documentation.beginners.apiSection.steps.3.desc'),
      icone: CheckCircle
    },
    {
      numero: 4,
      titulo: t('documentation.beginners.apiSection.steps.4.title'),
      descricao: t('documentation.beginners.apiSection.steps.4.desc'),
      icone: Settings
    },
    {
      numero: 5,
      titulo: t('documentation.beginners.apiSection.steps.5.title'),
      descricao: t('documentation.beginners.apiSection.steps.5.desc'),
      icone: Key
    },
    {
      numero: 6,
      titulo: t('documentation.beginners.apiSection.steps.6.title'),
      descricao: t('documentation.beginners.apiSection.steps.6.desc'),
      icone: Code
    },
    {
      numero: 7,
      titulo: t('documentation.beginners.apiSection.steps.7.title'),
      descricao: t('documentation.beginners.apiSection.steps.7.desc'),
      icone: Code
    },
    {
      numero: 8,
      titulo: t('documentation.beginners.apiSection.steps.8.title'),
      descricao: t('documentation.beginners.apiSection.steps.8.desc'),
      icone: Code
    }
  ]

  const tipsList = t('documentation.beginners.apiSection.config.tips.list', { returnObjects: true }) as string[]
  const securityList = t('documentation.beginners.apiSection.security.list', { returnObjects: true }) as string[]

  return (
    <div className="space-y-8">
      <div className="bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Key className="w-6 h-6 text-purple-500" />
          {t('documentation.beginners.apiSection.title')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {t('documentation.beginners.apiSection.desc')}
        </p>
      </div>

      <div className="relative space-y-8 pl-8 md:pl-0">
        {/* Linha conectora vertical */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-pink-500 to-transparent md:left-1/2 md:-ml-0.5 hidden md:block"></div>

        {passos.map((passo, index) => (
          <div key={passo.numero} className={`relative flex flex-col md:flex-row items-center gap-8 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>

            {/* Conteúdo */}
            <div className="flex-1 w-full">
              <div className="bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:border-purple-500/30 transition-colors relative group">
                <div className={`absolute top-6 ${index % 2 === 0 ? 'md:-right-3 right-auto -left-3' : 'md:-left-3 -left-3'} w-6 h-6 bg-slate-900 transform rotate-45 border-t border-l border-white/10 hidden md:block`}></div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-500">
                    Passo {passo.numero}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {passo.titulo}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {passo.descricao}
                </p>
              </div>
            </div>

            {/* Ícone Central */}
            <div className="absolute left-0 md:left-1/2 md:-ml-6 w-12 h-12 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center z-10 shadow-lg shadow-purple-500/20">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                <passo.icone className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Espaço vazio para o outro lado */}
            <div className="flex-1 hidden md:block"></div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('documentation.beginners.apiSection.config.title')}
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-slate-900 dark:text-white mb-2">
              {t('documentation.beginners.apiSection.config.headers.title')}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
              {t('documentation.beginners.apiSection.config.headers.desc')}
            </p>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-green-400">
              <div><span className="text-slate-400">// Formato dos Headers:</span></div>
              <div>{'{'}</div>
              <div>&nbsp;&nbsp;"Authorization": "Bearer SUA_CHAVE_API",</div>
              <div>&nbsp;&nbsp;"Content-Type": "application/json",</div>
              <div>&nbsp;&nbsp;"X-Custom": "valor personalizado" <span className="text-slate-400">// opcional</span></div>
              <div>{'}'}</div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-slate-900 dark:text-white mb-2">
              {t('documentation.beginners.apiSection.config.body.title')}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
              {t('documentation.beginners.apiSection.config.body.desc')}
            </p>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-blue-400">
              <div><span className="text-slate-400">// Exemplo para criar um lead:</span></div>
              <div>{'{'}</div>
              <div>&nbsp;&nbsp;"nome": "João Silva",</div>
              <div>&nbsp;&nbsp;"email": "joao@email.com",</div>
              <div>&nbsp;&nbsp;"telefone": "+55 11 99999-9999",</div>
              <div>&nbsp;&nbsp;"status": "lead"</div>
              <div>{'}'}</div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
              {t('documentation.beginners.apiSection.config.tips.title')}
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              {Array.isArray(tipsList) && tipsList.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('documentation.beginners.apiSection.examples.title')}
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('documentation.beginners.apiSection.examples.curl')}
            </h4>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-green-400 overflow-x-auto">
              <div className="text-slate-400 mb-1"># Criar um novo lead</div>
              <div>curl -X POST https://api.azera.com/leads \</div>
              <div>&nbsp;&nbsp;-H "Authorization: Bearer SUA_CHAVE_API" \</div>
              <div>&nbsp;&nbsp;-H "Content-Type: application/json" \</div>
              <div>&nbsp;&nbsp;-d &#39;&#123;"nome": "João Silva", "email": "joao@email.com"&#125;&#39;</div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('documentation.beginners.apiSection.examples.js')}
            </h4>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm text-blue-400 overflow-x-auto">
              <div className="text-slate-400 mb-1">// JavaScript com fetch</div>
              <div>fetch('https://api.azera.com/leads', &#123;</div>
              <div>&nbsp;&nbsp;method: 'POST',</div>
              <div>&nbsp;&nbsp;headers: &#123;</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;'Authorization': 'Bearer SUA_CHAVE_API',</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;'Content-Type': 'application/json'</div>
              <div>&nbsp;&nbsp;&#125;,</div>
              <div>&nbsp;&nbsp;body: JSON.stringify(&#123;</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;nome: 'João Silva',</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;email: 'joao@email.com'</div>
              <div>&nbsp;&nbsp;&#125;)</div>
              <div>&#125;)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
          {t('documentation.beginners.apiSection.security.title')}
        </h3>
        <ul className="space-y-2 text-red-700 dark:text-red-300">
          {Array.isArray(securityList) && securityList.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
