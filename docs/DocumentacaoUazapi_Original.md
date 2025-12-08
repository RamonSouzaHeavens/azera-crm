POST
/instance/connect
Conectar instância ao WhatsApp
Inicia o processo de conexão de uma instância ao WhatsApp. Este endpoint:

Requer o token de autenticação da instância
Recebe o número de telefone associado à conta WhatsApp
Gera um QR code caso não passe o campo phone
Ou Gera código de pareamento se passar o o campo phone
Atualiza o status da instância para "connecting"
O processo de conexão permanece pendente até que:

O QR code seja escaneado no WhatsApp do celular, ou
O código de pareamento seja usado no WhatsApp
Timeout de 2 minutos para QRCode seja atingido ou 5 minutos para o código de pareamento
Use o endpoint /instance/status para monitorar o progresso da conexão.

Estados possíveis da instância:

disconnected: Desconectado do WhatsApp
connecting: Em processo de conexão
connected: Conectado e autenticado
Exemplo de requisição:

{
  "phone": "5511999999999"
}
Request
Body
phone
string
required
Número de telefone no formato internacional (ex: 5511999999999)

Example: "5511999999999"

Responses

200
Sucesso

401
Token inválido/expirado

404
Instância não encontrada

429
Limite de conexões simultâneas atingido

500
Erro interno

POST
/instance/disconnect
Desconectar instância
Desconecta a instância do WhatsApp, encerrando a sessão atual. Esta operação:

Encerra a conexão ativa

Requer novo QR code para reconectar

Diferenças entre desconectar e hibernar:

Desconectar: Encerra completamente a sessão, exigindo novo login

Hibernar: Mantém a sessão ativa, apenas pausa a conexão

Use este endpoint para:

Encerrar completamente uma sessão

Forçar uma nova autenticação

Limpar credenciais de uma instância

Reiniciar o processo de conexão

Estados possíveis após desconectar:

disconnected: Desconectado do WhatsApp

connecting: Em processo de reconexão (após usar /instance/connect)

GET
/instance/status
Verificar status da instância
Retorna o status atual de uma instância, incluindo:

Estado da conexão (disconnected, connecting, connected)
QR code atualizado (se em processo de conexão)
Código de pareamento (se disponível)
Informações da última desconexão
Detalhes completos da instância
Este endpoint é particularmente útil para:

Monitorar o progresso da conexão
Obter QR codes atualizados durante o processo de conexão
Verificar o estado atual da instância
Identificar problemas de conexão
Estados possíveis:

disconnected: Desconectado do WhatsApp
connecting: Em processo de conexão (aguardando QR code ou código de pareamento)
connected: Conectado e autenticado com sucesso
Responses

200
Sucesso

401
Token inválido/expirado

404
Instância não encontrada

500
Erro interno

GET
/webhook
Ver Webhook da Instância
Retorna a configuração atual do webhook da instância, incluindo:

URL configurada
Eventos ativos
Filtros aplicados
Configurações adicionais
Exemplo de resposta:

[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "enabled": true,
    "url": "https://example.com/webhook",
    "events": ["messages", "messages_update"],
    "excludeMessages": ["wasSentByApi", "isGroupNo"],
    "addUrlEvents": true,
    "addUrlTypesMessages": true
  },
  {
    "id": "987fcdeb-51k3-09j8-x543-864297539100",
    "enabled": true,
    "url": "https://outro-endpoint.com/webhook",
    "events": ["connection", "presence"],
    "excludeMessages": [],
    "addUrlEvents": false,
    "addUrlTypesMessages": false
  }
]
A resposta é sempre um array, mesmo quando há apenas um webhook configurado.

Responses

200
Configuração do webhook retornada com sucesso

401
Token inválido ou não fornecido

500
Erro interno do servidor

POST
/webhook
Configurar Webhook da Instância
Gerencia a configuração de webhooks para receber eventos em tempo real da instância. Permite gerenciar múltiplos webhooks por instância através do campo ID e action.

🚀 Modo Simples (Recomendado)
Uso mais fácil - sem complexidade de IDs:

Não inclua action nem id no payload
Gerencia automaticamente um único webhook por instância
Cria novo ou atualiza o existente automaticamente
Recomendado: Sempre use "excludeMessages": ["wasSentByApi"] para evitar loops
Exemplo: {"url": "https://meusite.com/webhook", "events": ["messages"], "excludeMessages": ["wasSentByApi"]}
🧪 Sites para Testes (ordenados por qualidade)
Para testar webhooks durante desenvolvimento:

https://webhook.cool/ - ⭐ Melhor opção (sem rate limit, interface limpa)
https://rbaskets.in/ - ⭐ Boa alternativa (confiável, baixo rate limit)
https://webhook.site/ - ⚠️ Evitar se possível (rate limit agressivo)
⚙️ Modo Avançado (Para múltiplos webhooks)
Para usuários que precisam de múltiplos webhooks por instância:

💡 Dica: Mesmo precisando de múltiplos webhooks, considere usar addUrlEvents no modo simples. Um único webhook pode receber diferentes tipos de eventos em URLs específicas (ex: /webhook/message, /webhook/connection), eliminando a necessidade de múltiplos webhooks.

Criar Novo Webhook:

Use action: "add"
Não inclua id no payload
O sistema gera ID automaticamente
Atualizar Webhook Existente:

Use action: "update"
Inclua o id do webhook no payload
Todos os campos serão atualizados
Remover Webhook:

Use action: "delete"
Inclua apenas o id do webhook
Outros campos são ignorados
Eventos Disponíveis
connection: Alterações no estado da conexão
history: Recebimento de histórico de mensagens
messages: Novas mensagens recebidas
messages_update: Atualizações em mensagens existentes
call: Eventos de chamadas VoIP
contacts: Atualizações na agenda de contatos
presence: Alterações no status de presença
groups: Modificações em grupos
labels: Gerenciamento de etiquetas
chats: Eventos de conversas
chat_labels: Alterações em etiquetas de conversas
blocks: Bloqueios/desbloqueios
leads: Atualizações de leads
sender: Atualizações de campanhas, quando inicia, e quando completa
Remover mensagens com base nos filtros:

wasSentByApi: Mensagens originadas pela API ⚠️ IMPORTANTE: Use sempre este filtro para evitar loops em automações
wasNotSentByApi: Mensagens não originadas pela API
fromMeYes: Mensagens enviadas pelo usuário
fromMeNo: Mensagens recebidas de terceiros
isGroupYes: Mensagens em grupos
isGroupNo: Mensagens em conversas individuais
💡 Prevenção de Loops: Se você tem automações que enviam mensagens via API, sempre inclua "excludeMessages": ["wasSentByApi"] no seu webhook. Caso prefira receber esses eventos, certifique-se de que sua automação detecta mensagens enviadas pela própria API para não criar loops infinitos.

Ações Suportadas:

add: Registrar novo webhook
delete: Remover webhook existente
Parâmetros de URL:

addUrlEvents (boolean): Quando ativo, adiciona o tipo do evento como path parameter na URL. Exemplo: https://api.example.com/webhook/{evento}
addUrlTypesMessages (boolean): Quando ativo, adiciona o tipo da mensagem como path parameter na URL. Exemplo: https://api.example.com/webhook/{tipo_mensagem}
Combinações de Parâmetros:

Ambos ativos: https://api.example.com/webhook/{evento}/{tipo_mensagem} Exemplo real: https://api.example.com/webhook/message/conversation
Apenas eventos: https://api.example.com/webhook/message
Apenas tipos: https://api.example.com/webhook/conversation
Notas Técnicas:

Os parâmetros são adicionados na ordem: evento → tipo mensagem
A URL deve ser configurada para aceitar esses parâmetros dinâmicos
Funciona com qualquer combinação de eventos/mensagens
Request
Body
id
string
ID único do webhook (necessário para update/delete)

Example: "123e4567-e89b-12d3-a456-426614174000"

enabled
boolean
Habilita/desabilita o webhook

Example: true

url
string
required
URL para receber os eventos

Example: "https://example.com/webhook"

events
array
Lista de eventos monitorados

excludeMessages
array
Filtros para excluir tipos de mensagens

addUrlEvents
boolean
Adiciona o tipo do evento como parâmetro na URL.

false (padrão): URL normal
true: Adiciona evento na URL (ex: /webhook/message)
addUrlTypesMessages
boolean
Adiciona o tipo da mensagem como parâmetro na URL.

false (padrão): URL normal
true: Adiciona tipo da mensagem (ex: /webhook/conversation)
action
string
Ação a ser executada:

add: criar novo webhook
update: atualizar webhook existente (requer id)
delete: remover webhook (requer apenas id) Se não informado, opera no modo simples (único webhook)
Responses

200
Webhook configurado ou atualizado com sucesso

400
Requisição inválida

401
Token inválido ou não fornecido

500
Erro interno do servidor

POST
/send/text
Enviar mensagem de texto
Envia uma mensagem de texto para um contato ou grupo.

Recursos Específicos
Preview de links com suporte a personalização automática ou customizada
Formatação básica do texto
Substituição automática de placeholders dinâmicos
Campos Comuns
Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions, forward, track_source, track_id, placeholders e envio para grupos.

Preview de Links
Preview Automático
{
  "number": "5511999999999",
  "text": "Confira: https://exemplo.com",
  "linkPreview": true
}
Preview Personalizado
{
  "number": "5511999999999",
  "text": "Confira nosso site! https://exemplo.com",
  "linkPreview": true,
  "linkPreviewTitle": "Título Personalizado",
  "linkPreviewDescription": "Uma descrição personalizada do link",
  "linkPreviewImage": "https://exemplo.com/imagem.jpg",
  "linkPreviewLarge": true
}
Request
Body
number
string
required
Número do destinatário (formato internacional)

Example: "5511999999999"

text
string
required
Texto da mensagem (aceita placeholders)

Example: "Olá {{name}}! Como posso ajudar?"

linkPreview
boolean
Ativa/desativa preview de links. Se true, procura automaticamente um link no texto para gerar preview.

Comportamento:

Se apenas linkPreview=true: gera preview automático do primeiro link encontrado no texto
Se fornecidos campos personalizados (title, description, image): usa os valores fornecidos
Se campos personalizados parciais: combina com dados automáticos do link como fallback
Example: true

linkPreviewTitle
string
Define um título personalizado para o preview do link

Example: "Título Personalizado"

linkPreviewDescription
string
Define uma descrição personalizada para o preview do link

Example: "Descrição personalizada do link"

linkPreviewImage
string
URL ou Base64 da imagem para usar no preview do link

Example: "https://exemplo.com/imagem.jpg"

linkPreviewLarge
boolean
Se true, gera um preview grande com upload da imagem. Se false, gera um preview pequeno sem upload

Example: true

replyid
string
ID da mensagem para responder

Example: "3EB0538DA65A59F6D8A251"

mentions
string
Números para mencionar (separados por vírgula)

Example: "5511999999999,5511888888888"

readchat
boolean
Marca conversa como lida após envio

Example: true

readmessages
boolean
Marca últimas mensagens recebidas como lidas

Example: true

delay
integer
Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...'

Example: 1000

forward
boolean
Marca a mensagem como encaminhada no WhatsApp

Example: true

track_source
string
Origem do rastreamento da mensagem

Example: "chatwoot"

track_id
string
ID para rastreamento da mensagem (aceita valores duplicados)

Example: "msg_123456789"

Responses

200
Mensagem enviada com sucesso

400
Requisição inválida

401
Não autorizado

429
Limite de requisições excedido

500
Erro interno do servidor

POST
/globalwebhook
Configurar Webhook Global
Configura um webhook global que receberá eventos de todas as instâncias.

🚀 Configuração Simples (Recomendada)
Para a maioria dos casos de uso:

Configure apenas URL e eventos desejados
Modo simples por padrão (sem complexidade)
Recomendado: Sempre use "excludeMessages": ["wasSentByApi"] para evitar loops
Exemplo: {"url": "https://webhook.cool/global", "events": ["messages", "connection"], "excludeMessages": ["wasSentByApi"]}
🧪 Sites para Testes (ordenados por qualidade)
Para testar webhooks durante desenvolvimento:

https://webhook.cool/ - ⭐ Melhor opção (sem rate limit, interface limpa)
https://rbaskets.in/ - ⭐ Boa alternativa (confiável, baixo rate limit)
https://webhook.site/ - ⚠️ Evitar se possível (rate limit agressivo)
Funcionalidades Principais:
Configuração de URL para recebimento de eventos
Seleção granular de tipos de eventos
Filtragem avançada de mensagens
Parâmetros adicionais na URL
Eventos Disponíveis:

connection: Alterações no estado da conexão
history: Recebimento de histórico de mensagens
messages: Novas mensagens recebidas
messages_update: Atualizações em mensagens existentes
call: Eventos de chamadas VoIP
contacts: Atualizações na agenda de contatos
presence: Alterações no status de presença
groups: Modificações em grupos
labels: Gerenciamento de etiquetas
chats: Eventos de conversas
chat_labels: Alterações em etiquetas de conversas
blocks: Bloqueios/desbloqueios
leads: Atualizações de leads
sender: Atualizações de campanhas, quando inicia, e quando completa
Remover mensagens com base nos filtros:

wasSentByApi: Mensagens originadas pela API ⚠️ IMPORTANTE: Use sempre este filtro para evitar loops em automações
wasNotSentByApi: Mensagens não originadas pela API
fromMeYes: Mensagens enviadas pelo usuário
fromMeNo: Mensagens recebidas de terceiros
isGroupYes: Mensagens em grupos
isGroupNo: Mensagens em conversas individuais
💡 Prevenção de Loops Globais: O webhook global recebe eventos de TODAS as instâncias. Se você tem automações que enviam mensagens via API, sempre inclua "excludeMessages": ["wasSentByApi"]. Caso prefira receber esses eventos, certifique-se de que sua automação detecta mensagens enviadas pela própria API para não criar loops infinitos em múltiplas instâncias.

Parâmetros de URL:

addUrlEvents (boolean): Quando ativo, adiciona o tipo do evento como path parameter na URL. Exemplo: https://api.example.com/webhook/{evento}
addUrlTypesMessages (boolean): Quando ativo, adiciona o tipo da mensagem como path parameter na URL. Exemplo: https://api.example.com/webhook/{tipo_mensagem}
Combinações de Parâmetros:

Ambos ativos: https://api.example.com/webhook/{evento}/{tipo_mensagem} Exemplo real: https://api.example.com/webhook/message/conversation
Apenas eventos: https://api.example.com/webhook/message
Apenas tipos: https://api.example.com/webhook/conversation
Notas Técnicas:

Os parâmetros são adicionados na ordem: evento → tipo mensagem
A URL deve ser configurada para aceitar esses parâmetros dinâmicos
Funciona com qualquer combinação de eventos/mensagens
Request
Body
url
string
required
URL para receber os eventos

Example: "https://webhook.cool/global"

events
array
required
Lista de eventos monitorados

Example: ["messages","connection"]

excludeMessages
array
Filtros para excluir tipos de mensagens

Example: ["wasSentByApi"]

addUrlEvents
boolean
Adiciona o tipo do evento como parâmetro na URL.

false (padrão): URL normal
true: Adiciona evento na URL (ex: /webhook/message)
addUrlTypesMessages
boolean
Adiciona o tipo da mensagem como parâmetro na URL.

false (padrão): URL normal
true: Adiciona tipo da mensagem (ex: /webhook/conversation)
Responses

200
Webhook global configurado com sucesso

400
Payload inválido

401
Token de administrador não fornecido

403
Token de administrador inválido ou servidor demo

500
Erro interno do servidor

TAG
CRM
Sistema completo de gestão de relacionamento com clientes integrado à API.

💾 Armazenamento interno: Todos os dados dos leads ficam salvos diretamente na API, eliminando a necessidade de bancos de dados externos. Sua aplicação pode focar apenas na interface e lógica de negócio.

Recursos disponíveis:
📋 20+ campos personalizáveis: Nome, telefone, email, empresa, observações, etc.
🏷️ Sistema de etiquetas: Organize e categorize seus contatos
🔍 Busca avançada: Filtre por qualquer campo ou etiqueta
📊 Histórico completo: Todas as interações ficam registradas automaticamente
🎯 Placeholders em mensagens:
Use variáveis dinâmicas nas mensagens para personalização automática:

Olá {{nome}}! Vi que você trabalha na {{empresa}}.
Seu email {{email}} está correto?
Observações: {{observacoes}}
Fluxo típico:
Captura: Leads chegam via WhatsApp ou formulários
Enriquecimento: Adicione dados usando /chat/editLead
Segmentação: Organize com etiquetas
Comunicação: Envie mensagens personalizadas com placeholders
Acompanhamento: Histórico fica salvo automaticamente
Ideal para: Vendas, marketing, atendimento, qualificação de leads

POST
Atualizar campos personalizados de leads
POST
Edita informações de lead

Atualizar campos personalizados de leads
Atualiza os campos personalizados (custom fields) de uma instância. Permite configurar até 20 campos personalizados para armazenamento de informações adicionais sobre leads.

Cada campo pode armazenar até 255 caracteres e aceita qualquer tipo de dado.

Campos disponíveis:

lead_field01 a lead_field20
Exemplo de uso:

Armazenar informações adicionais sobre leads
Criar campos personalizados para integração com outros sistemas
Armazenar tags ou categorias personalizadas
Manter histórico de interações com o lead
Exemplo de requisição:

{
  "lead_field01": "nome",
  "lead_field02": "email",
  "lead_field03": "telefone",
  "lead_field04": "cidade",
  "lead_field05": "estado",
  "lead_field06": "idade",
  "lead_field07": "interesses",
  "lead_field08": "origem",
  "lead_field09": "status",
  "lead_field10": "valor",
  "lead_field11": "observacoes",
  "lead_field12": "ultima_interacao",
  "lead_field13": "proximo_contato",
  "lead_field14": "vendedor",
  "lead_field15": "produto_interesse",
  "lead_field16": "fonte_captacao",
  "lead_field17": "score",
  "lead_field18": "tags",
  "lead_field19": "historico",
  "lead_field20": "custom"
}
Exemplo de resposta:

{
  "success": true,
  "message": "Custom fields updated successfully",
  "instance": {
    "id": "r183e2ef9597845",
    "name": "minha-instancia",
    "fieldsMap": {
      "lead_field01": "nome",
      "lead_field02": "email",
      "lead_field03": "telefone",
      "lead_field04": "cidade",
      "lead_field05": "estado",
      "lead_field06": "idade",
      "lead_field07": "interesses",
      "lead_field08": "origem",
      "lead_field09": "status",
      "lead_field10": "valor",
      "lead_field11": "observacoes",
      "lead_field12": "ultima_interacao",
      "lead_field13": "proximo_contato",
      "lead_field14": "vendedor",
      "lead_field15": "produto_interesse",
      "lead_field16": "fonte_captacao",
      "lead_field17": "score",
      "lead_field18": "tags",
      "lead_field19": "historico",
      "lead_field20": "custom"
    }
  }
}
Erros comuns:

400: Campos inválidos ou payload mal formatado
401: Token inválido ou expirado
404: Instância não encontrada
500: Erro ao atualizar campos no banco de dados
Restrições:

Cada campo pode ter no máximo 255 caracteres
Campos vazios serão mantidos com seus valores atuais
Apenas os campos enviados serão atualizados
Request
Body
lead_field01
string
Campo personalizado 01

lead_field02
string
Campo personalizado 02

lead_field03
string
Campo personalizado 03

lead_field04
string
Campo personalizado 04

lead_field05
string
Campo personalizado 05

lead_field06
string
Campo personalizado 06

lead_field07
string
Campo personalizado 07

lead_field08
string
Campo personalizado 08

lead_field09
string
Campo personalizado 09

lead_field10
string
Campo personalizado 10

lead_field11
string
Campo personalizado 11

lead_field12
string
Campo personalizado 12

lead_field13
string
Campo personalizado 13

lead_field14
string
Campo personalizado 14

lead_field15
string
Campo personalizado 15

lead_field16
string
Campo personalizado 16

lead_field17
string
Campo personalizado 17

lead_field18
string
Campo personalizado 18

lead_field19
string
Campo personalizado 19

lead_field20
string
Campo personalizado 20

CATEGORIA
ChatBot
Sistema avançado de chatbots com inteligência artificial

Esta categoria contém recursos sofisticados para criar chatbots inteligentes e automatizar conversas usando IA. Ideal para empresas que precisam de atendimento automatizado avançado e respostas contextuais.

Recursos de IA incluídos:
🤖 IA Conversacional: Integração com múltiplos provedores (OpenAI, Anthropic, Google, DeepSeek)
🧠 Base de Conhecimento: Sistema de embeddings com Qdrant para respostas contextuais
⚙️ Funções Personalizadas: Integração com APIs externas e lógica de negócio complexa
🎯 Triggers Inteligentes: Ativação automática baseada em contexto e palavras-chave
📋 Configurações Avançadas: Personalização completa do comportamento do bot
Casos de uso:
Atendimento automatizado 24/7
Qualificação automática de leads
Suporte técnico com base de conhecimento
Agendamento de reuniões e consultas
FAQ dinâmico e contextual
Ideal para: Empresas médias/grandes, desenvolvedores, agências, sistemas de atendimento complexos

Requer: Conhecimento técnico para configuração adequada e chaves de API dos provedores de IA

Estatísticas da Categoria
Tags incluídas

5

Total de endpoints

9

Tags nesta categoria
POST
/instance/updatechatbotsettings
Chatbot Configurações
Explicação dos campos:

openai_apikey: Chave da API OpenAI (começa com "sk-")

chatbot_enabled: Habilita/desabilita o chatbot

chatbot_ignoreGroups: Define se o chatbot deve ignorar mensagens de grupos

chatbot_stopConversation: Palavra-chave que os usuários podem usar para parar o chatbot

chatbot_stopMinutes: Por quantos minutos o chatbot deve ficar desativado após receber o comando de parada

chatbot_stopWhenYouSendMsg: Por quantos minutos o chatbot deve ficar desativado após você enviar uma mensagem fora da API, 0 desliga.

Request
Body
No request body schema defined

POST
/trigger/edit
Criar, atualizar ou excluir um trigger do chatbot
Endpoint para gerenciar triggers do chatbot. Suporta:

Criação de novos triggers
Atualização de triggers existentes
Exclusão de triggers por ID
Request
Body
id
string
ID do trigger. Vazio para criação, obrigatório para atualização/exclusão

delete
boolean
Quando verdadeiro, exclui o trigger especificado pelo id

trigger
string
required