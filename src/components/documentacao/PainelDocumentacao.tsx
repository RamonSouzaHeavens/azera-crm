import { useState } from 'react'
import { 
  Book, 
  ChevronRight, 
  Copy, 
  Check,
  Zap,
  Code,
  Shield,
  AlertCircle,
  Terminal
} from 'lucide-react'
import toast from 'react-hot-toast'

interface DocSection {
  id: string
  titulo: string
  icone: React.ReactNode
  conteudo: React.ReactNode
}

export function PainelDocumentacao() {
  const [secaoAtiva, setSecaoAtiva] = useState('visao-geral')
  const [copiado, setCopiado] = useState<string | null>(null)

  const copiarTexto = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto)
    setCopiado(id)
    toast.success('Copiado!')
    setTimeout(() => setCopiado(null), 2000)
  }

  const secoes: DocSection[] = [
    {
      id: 'visao-geral',
      titulo: 'Visão Geral',
      icone: <Book className="w-5 h-5" />,
      conteudo: (
        <div className="space-y-4">
          <p className="text-slate-700 dark:text-slate-300">
            Bem-vindo ao painel de documentação do Azera CRM! Aqui você encontra guias completos sobre:
          </p>
          <ul className="space-y-2">
            {[
              'Sistema de Automações e Webhooks',
              'Integração com APIs Externas',
              'Como Sincronizar Dados',
              'Segurança e Validação',
              'Troubleshooting e FAQ',
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: 'automacoes',
      titulo: 'Sistema de Automações',
      icone: <Zap className="w-5 h-5" />,
      conteudo: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">O que são Automações?</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              Automações permitem sincronizar dados entre o Azera e sistemas externos via webhooks e APIs. Quando um evento ocorre (novo imóvel, lead, etc), dados são automaticamente enviados para seu sistema.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Casos de Uso</h3>
            <div className="space-y-3">
              {[
                { titulo: 'CRM Externo', desc: 'Sincronizar leads e imóveis com outro CRM' },
                { titulo: 'Email Marketing', desc: 'Enviar novos leads para ferramenta de marketing' },
                { titulo: 'Backup Automático', desc: 'Fazer backup de dados em servidor externo' },
                { titulo: 'Integração ERP', desc: 'Sincronizar produtos com sistema ERP' },
              ].map((caso, idx) => (
                <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/30">
                  <p className="font-medium text-blue-900 dark:text-blue-300">{caso.titulo}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">{caso.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Como Começar</h3>
            <ol className="space-y-2 text-slate-700 dark:text-slate-300">
              <li>1. Acesse <strong>Menu → Automações</strong></li>
              <li>2. Clique em <strong>"+ Nova Automação"</strong></li>
              <li>3. Preencha a URL de seu servidor (webhook)</li>
              <li>4. Configure qual evento disparar (criação, atualização, etc)</li>
              <li>5. Teste com o botão ⚡ <strong>Testar</strong></li>
              <li>6. Ative quando estiver funcionando</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'webhook',
      titulo: 'Como Receber Webhooks',
      icone: <Code className="w-5 h-5" />,
      conteudo: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Estrutura da Requisição</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              Quando um evento é disparado, enviamos uma requisição HTTP (POST, PUT, PATCH ou GET) para sua URL com os dados:
            </p>
            <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm text-slate-100 font-mono">
{`POST /webhook HTTP/1.1
Host: seu-servidor.com
Content-Type: application/json
X-Webhook-Secret: seu-secret-aqui

{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "tenant_id": "uuid-tenant",
  "nome": "Apartamento Luxo",
  "preco": 500000,
  "tipo": "apartamento",
  "quartos": 3,
  "banheiros": 2,
  "created_at": "2025-01-15T10:30:00Z"
}`}
              </pre>
            </div>
            <button
              onClick={() => copiarTexto(
                `POST /webhook HTTP/1.1\nHost: seu-servidor.com\nContent-Type: application/json\nX-Webhook-Secret: seu-secret-aqui`,
                'webhook-exemplo'
              )}
              className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
            >
              {copiado === 'webhook-exemplo' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copiar Exemplo
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Exemplo em Node.js</h3>
            <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm text-slate-100 font-mono">
{`const express = require('express')
const app = express()

app.post('/webhook', express.json(), (req, res) => {
  // Validar secret
  const secret = req.headers['x-webhook-secret']
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ erro: 'Unauthorized' })
  }

  const dados = req.body
  console.log('Dados recebidos:', dados)
  
  // Processar dados
  // - Salvar no seu banco
  // - Enviar para terceiros
  // etc
  
  res.json({ sucesso: true })
})

app.listen(3000)`}
              </pre>
            </div>
            <button
              onClick={() => copiarTexto(
                `const express = require('express')\nconst app = express()\n\napp.post('/webhook', express.json(), (req, res) => {\n  const secret = req.headers['x-webhook-secret']\n  if (secret !== process.env.WEBHOOK_SECRET) {\n    return res.status(401).json({ erro: 'Unauthorized' })\n  }\n  res.json({ sucesso: true })\n})\n\napp.listen(3000)`,
                'webhook-nodejs'
              )}
              className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
            >
              {copiado === 'webhook-nodejs' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copiar Código
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Exemplo em Python</h3>
            <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm text-slate-100 font-mono">
{`from flask import Flask, request
import os

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    # Validar secret
    secret = request.headers.get('X-Webhook-Secret')
    if secret != os.getenv('WEBHOOK_SECRET'):
        return {'erro': 'Unauthorized'}, 401
    
    dados = request.get_json()
    print('Dados:', dados)
    
    # Processar...
    
    return {'sucesso': True}, 200

if __name__ == '__main__':
    app.run(port=3000)`}
              </pre>
            </div>
            <button
              onClick={() => copiarTexto(
                `from flask import Flask, request\nimport os\n\napp = Flask(__name__)\n\n@app.route('/webhook', methods=['POST'])\ndef webhook():\n    secret = request.headers.get('X-Webhook-Secret')\n    if secret != os.getenv('WEBHOOK_SECRET'):\n        return {'erro': 'Unauthorized'}, 401\n    return {'sucesso': True}, 200`,
                'webhook-python'
              )}
              className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
            >
              {copiado === 'webhook-python' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copiar Código
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'seguranca',
      titulo: 'Segurança',
      icone: <Shield className="w-5 h-5" />,
      conteudo: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Validar Webhook Secret</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              Sempre valide que a requisição veio realmente do Azera usando o header <code className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-sm">X-Webhook-Secret</code>:
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Importante:</strong> Sempre validar o secret. Nunca processe webhooks sem verificar autenticidade.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Boas Práticas</h3>
            <ul className="space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Validar secret</strong> antes de processar dados</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Retornar HTTP 200</strong> rapidamente, processar depois</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Adicionar logging</strong> para debug</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Usar HTTPS</strong> em produção</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                <span><strong>Não processar</strong> sem validar secret</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                <span><strong>Não fazer operações longas</strong> antes de responder</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Onde Encontrar o Secret</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              1. Vá para <strong>Automações</strong><br/>
              2. Clique no card da automação<br/>
              3. Procure pelo campo <strong>"Webhook Secret"</strong><br/>
              4. Clique no ícone de olho para revelar ou cópia para copiar
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'webhooks-tutorial',
      titulo: 'Tutorial Webhooks Completo',
      icone: <Zap className="w-5 h-5" />,
      conteudo: (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>📚 Guia Completo:</strong> Leia o tutorial detalhado em <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">docs/WEBHOOKS_TUTORIAL.md</code>
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">1️⃣ Criar Uma Subscription</h3>
            <ol className="space-y-2 text-slate-700 dark:text-slate-300">
              <li>1. Vá em <strong>Automações</strong> na sidebar</li>
              <li>2. Clique em <strong>"Gerenciar Webhooks"</strong></li>
              <li>3. Preencha o formulário:
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• <strong>Nome</strong>: Identificação (ex: "Lead para N8N")</li>
                  <li>• <strong>URL</strong>: https://seu-servidor.com/webhook</li>
                  <li>• <strong>Eventos</strong>: lead.created, lead.updated (separados por vírgula)</li>
                </ul>
              </li>
              <li>4. Clique em <strong>"Criar webhook"</strong></li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">2️⃣ Testar com Webhook.site</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              Use <strong>webhook.site</strong> para testes rápidos sem precisar de servidor:
            </p>
            <ol className="space-y-2 text-slate-700 dark:text-slate-300">
              <li>1. Abra https://webhook.site</li>
              <li>2. Copie a URL gerada</li>
              <li>3. Crie uma subscription com essa URL</li>
              <li>4. Dispare um evento (crie um lead, produto, etc)</li>
              <li>5. Veja em tempo real no webhook.site</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">3️⃣ Ver Eventos Disparados</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              A aba <strong>"Eventos"</strong> mostra todos os eventos que ocorreram no seu tenant:
            </p>
            <ul className="space-y-2 text-slate-700 dark:text-slate-300">
              <li>• Tipo de evento (ex: lead.created)</li>
              <li>• Data e hora</li>
              <li>• Payload completo em JSON</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">4️⃣ Monitorar Logs e Reenviar</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              A aba <strong>"Logs"</strong> permite ver tentativas de entrega e reenviar manualmente:
            </p>
            <ul className="space-y-2 text-slate-700 dark:text-slate-300">
              <li><strong>Status:</strong> success, pending, ou dead</li>
              <li><strong>Tentativas:</strong> Quantas vezes foi enviado</li>
              <li><strong>Código HTTP:</strong> Resposta do seu servidor</li>
              <li><strong>Reenviar:</strong> Botão para reenvio manual</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">5️⃣ Como o Dispatcher Funciona</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              O sistema tem retry automático com backoff exponencial:
            </p>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded text-sm space-y-1 text-slate-700 dark:text-slate-300">
              <div>1ª falha → Próxima em <strong>1 minuto</strong></div>
              <div>2ª falha → Próxima em <strong>5 minutos</strong></div>
              <div>3ª falha → Próxima em <strong>15 minutos</strong></div>
              <div>4ª falha → Próxima em <strong>1 hora</strong></div>
              <div>5ª falha → Próxima em <strong>6 horas</strong></div>
              <div>6ª falha → Próxima em <strong>24 horas</strong></div>
              <div>Após 6 falhas → Marcado como <strong>"dead"</strong></div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Webhook Signature (HMAC)</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              Todo webhook vem assinado com HMAC-SHA256 no header <code className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-sm">X-Azera-Signature</code>
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 flex gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Sempre valide a signature!</strong> Nunca processe um webhook sem verificar autenticidade.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">📖 Mais Informações</h3>
            <p className="text-slate-700 dark:text-slate-300">
              Para um guia completo com exemplos em Node.js, Python, troubleshooting, melhores práticas e mais, consulte:
            </p>
            <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-900/50 rounded text-sm font-mono text-slate-800 dark:text-slate-200">
              <code>docs/WEBHOOKS_TUTORIAL.md</code>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      titulo: 'Troubleshooting',
      icone: <AlertCircle className="w-5 h-5" />,
      conteudo: (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">❌ "Erro 400 - Bad Request"</h3>
            <div className="space-y-2 text-slate-700 dark:text-slate-300">
              <p><strong>Causas possíveis:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>URL inválida ou malformada</li>
                <li>Método HTTP incorreto</li>
                <li>Servidor retornando erro na requisição</li>
              </ul>
              <p className="mt-3"><strong>Solução:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Teste a URL no Postman/curl</li>
                <li>Verifique o método (GET, POST, etc)</li>
                <li>Veja os logs do seu servidor</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">❌ "Erro 401 - Unauthorized"</h3>
            <div className="space-y-2 text-slate-700 dark:text-slate-300">
              <p><strong>Causas possíveis:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Token de autenticação expirado ou inválido</li>
                <li>Webhook Secret incorreto</li>
                <li>Permissões insuficientes no servidor destino</li>
              </ul>
              <p className="mt-3"><strong>Solução:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Copie o Webhook Secret correto</li>
                <li>Verifique autenticação em seus headers</li>
                <li>Confirme permissões no servidor</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">❌ "Timeout ou Conexão Recusada"</h3>
            <div className="space-y-2 text-slate-700 dark:text-slate-300">
              <p><strong>Causas possíveis:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Servidor não está rodando</li>
                <li>Firewall bloqueando conexão</li>
                <li>DNS não resolvendo o domínio</li>
              </ul>
              <p className="mt-3"><strong>Solução:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Verificar se servidor está online</li>
                <li>Confirmar URL está acessível de fora</li>
                <li>Testar: <code className="bg-slate-200 dark:bg-slate-800 px-1">curl https://seu-url.com</code></li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">❓ Webhook não está recebendo</h3>
            <div className="space-y-2 text-slate-700 dark:text-slate-300">
              <p><strong>Checklist:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>✓ Automação está ATIVA? (verde)</li>
                <li>✓ Evento correto configurado?</li>
                <li>✓ URL está correta?</li>
                <li>✓ Teste com botão ⚡ funcionou?</li>
                <li>✓ Verificar firewall/CORS</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'api-reference',
      titulo: 'API Reference',
      icone: <Terminal className="w-5 h-5" />,
      conteudo: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Como Obter IDs dos Estágios</h3>
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900/30">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📊 Método 1: Interface Kanban</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Acesse <strong>Menu → Leads</strong> → Modo Kanban.<br/>
                  Os IDs e Keys aparecem abaixo do nome de cada coluna.
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-900/30">
                <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">💾 Método 2: SQL Query</h4>
                <div className="bg-slate-900 p-3 rounded text-sm text-slate-100 font-mono overflow-x-auto">
                  SELECT id, key, label FROM pipeline_stages<br/>
                  WHERE tenant_id = 'seu-tenant-id'<br/>
                  ORDER BY "order" ASC;
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Campos de Dados Disponíveis</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-3">Dependendo da entidade, esses campos são enviados:</p>
            
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Produtos/Imóveis:</p>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded text-sm space-y-1 font-mono text-slate-700 dark:text-slate-300">
                  <div>id, tenant_id, nome, descricao</div>
                  <div>preco, tipo, finalidade, ativo</div>
                  <div>area_total, area_construida</div>
                  <div>quartos, banheiros, vagas_garagem</div>
                  <div>endereco, bairro, cidade, cep</div>
                  <div>capa_url, galeria_urls, arquivo_urls</div>
                  <div>created_at, updated_at, filtros</div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Leads/Clientes:</p>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded text-sm space-y-1 font-mono text-slate-700 dark:text-slate-300">
                  <div>id, tenant_id, nome, email</div>
                  <div>telefone, empresa, cargo</div>
                  <div>tags, status, created_at, updated_at</div>
                  <div>valor_potencial, notas, origem</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Testes com cURL</h3>
            <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm text-slate-100 font-mono">
{`curl -X POST https://seu-servidor.com/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Secret: seu-secret" \\
  -d '{
    "id": "123",
    "nome": "Teste",
    "preco": 500000
  }'`}
              </pre>
            </div>
            <button
              onClick={() => copiarTexto(
                `curl -X POST https://seu-servidor.com/webhook -H "Content-Type: application/json" -H "X-Webhook-Secret: seu-secret" -d '{"id":"123","nome":"Teste","preco":500000}'`,
                'curl-exemplo'
              )}
              className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
            >
              {copiado === 'curl-exemplo' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copiar cURL
            </button>
          </div>
        </div>
      ),
    },
  ]

  const secaoAtualIndex = secoes.findIndex(s => s.id === secaoAtiva)
  const secaoAtualData = secoes[secaoAtualIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-center">
              <Book className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Centro de Documentação
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Guias completos para integração e automação
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/30">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ℹ️ Este painel é visível apenas para proprietários da equipe. Compartilhe as informações relevantes com seu time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de Navegação */}
          <div className="lg:col-span-1">
            <nav className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 p-2 sticky top-8">
              <div className="space-y-1">
                {secoes.map((secao) => (
                  <button
                    key={secao.id}
                    onClick={() => setSecaoAtiva(secao.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      secaoAtiva === secao.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {secao.icone}
                    <span className="flex-1 text-left text-sm font-medium">{secao.titulo}</span>
                    {secaoAtiva === secao.id && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </nav>
          </div>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 p-8">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
                <span>Documentação</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">{secaoAtualData?.titulo}</span>
              </div>

              {/* Conteúdo */}
              <div className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-p:text-slate-700 dark:prose-p:text-slate-300">
                {secaoAtualData?.conteudo}
              </div>

              {/* Navegação */}
              {secaoAtualIndex !== undefined && (
                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10 flex justify-between">
                  {secaoAtualIndex > 0 ? (
                    <button
                      onClick={() => setSecaoAtiva(secoes[secaoAtualIndex - 1].id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      ← Anterior
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {secaoAtualIndex < secoes.length - 1 && (
                    <button
                      onClick={() => setSecaoAtiva(secoes[secaoAtualIndex + 1].id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Próxima →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
