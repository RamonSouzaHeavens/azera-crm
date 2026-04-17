# Tutorial: Como Construir um Assistente com Uazapi do Zero

Este tutorial explica, passo a passo, como construir um sistema que:

- recebe mensagens da Uazapi;
- lê conversas privadas e grupos;
- identifica palavras-chave configuráveis;
- usa IA para entender contexto e detectar demandas;
- cria tarefas ou demandas automaticamente no sistema;
- gera alertas sobre mensagens importantes de grupos ou pessoas prioritárias.

O texto foi escrito para um programador iniciante. A ideia aqui nao e correr para o codigo. Primeiro vamos montar a base certa para o sistema nao nascer quebrado.

## Como usar este tutorial

Este arquivo sera construido por partes. Cada parte vira uma etapa do checklist.

Marque como concluido conforme implementar.

## Checklist Mestre

### Fase 1. Fundacao

- [ ] Entender o objetivo do sistema
- [ ] Definir a arquitetura geral
- [ ] Entender a diferenca entre webhook e leitura periodica
- [ ] Definir os dados minimos que precisam ser salvos
- [ ] Escolher stack do app
- [ ] Criar projeto base
- [ ] Configurar banco de dados

### Fase 2. Integracao com a Uazapi

- [ ] Cadastrar numero e instancia na Uazapi
- [ ] Entender eventos de mensagem recebida
- [ ] Entender eventos de mensagem enviada
- [ ] Configurar URL de webhook
- [ ] Validar autenticacao da integracao
- [ ] Salvar logs brutos dos eventos recebidos

### Fase 3. Modelagem do sistema

- [ ] Criar tabela de integracoes
- [ ] Criar tabela de contatos
- [ ] Criar tabela de conversas
- [ ] Criar tabela de mensagens
- [ ] Criar tabela de grupos
- [ ] Criar tabela de participantes do grupo
- [ ] Criar tabela de regras de palavras-chave
- [ ] Criar tabela de pessoas e grupos importantes
- [ ] Criar tabela de alertas importantes
- [ ] Criar tabela de demandas geradas pela IA
- [ ] Criar tabela de execucoes da IA

### Fase 4. Recebimento de mensagens

- [ ] Criar endpoint para receber webhook
- [ ] Validar payload recebido
- [ ] Identificar se a mensagem e de grupo ou privada
- [ ] Identificar quem enviou a mensagem
- [ ] Identificar tipo da mensagem
- [ ] Evitar duplicatas
- [ ] Salvar mensagem no banco
- [ ] Atualizar conversa com ultimo contexto

### Fase 5. Envio de mensagens

- [ ] Criar servico para enviar texto
- [ ] Criar servico para enviar imagem ou documento
- [ ] Salvar mensagens outbound no banco
- [ ] Atualizar status de entrega
- [ ] Evitar duplicacao quando webhook retornar mensagem da propria API

### Fase 6. Motor de regras

- [ ] Permitir cadastrar palavras-chave por categoria
- [ ] Permitir regras por grupo
- [ ] Permitir regras por contato importante
- [ ] Permitir palavras obrigatorias e palavras bloqueadas
- [ ] Criar fila de mensagens candidatas para analise

### Fase 7. Analise com IA

- [ ] Montar janela de contexto de 1 hora
- [ ] Consolidar mensagens por conversa ou grupo
- [ ] Gerar resumo do contexto recente
- [ ] Classificar se ha demanda
- [ ] Classificar se ha aviso importante
- [ ] Extrair prioridade, prazo, responsavel e origem
- [ ] Salvar confianca da IA
- [ ] Decidir quando criar automaticamente e quando pedir revisao

### Fase 8. Criacao de demandas

- [ ] Criar modulo de demandas
- [ ] Criar rotina para abrir demanda automaticamente
- [ ] Linkar demanda com conversa e mensagens de origem
- [ ] Permitir reprocessamento manual
- [ ] Permitir cancelar falsa deteccao

### Fase 9. Alertas importantes

- [ ] Detectar mensagem importante em grupo
- [ ] Detectar mensagem importante de contato prioritario
- [ ] Criar resumo curto para o usuario
- [ ] Enviar alerta no app
- [ ] Opcional: enviar alerta por WhatsApp, email ou push

### Fase 10. Operacao e qualidade

- [ ] Criar painel de logs
- [ ] Criar painel de configuracoes
- [ ] Criar testes de deduplicacao
- [ ] Criar testes de classificacao
- [ ] Criar limites de custo da IA
- [ ] Criar politica de privacidade e retencao

---

## Parte 1. O Que Voce Esta Construindo

Voce nao esta construindo apenas um chatbot. Voce esta construindo um assistente operacional.

Ele observa mensagens que chegam, entende contexto recente, detecta sinais relevantes e toma uma acao.

As acoes principais sao:

1. criar uma demanda no sistema;
2. criar um alerta importante para voce;
3. ignorar mensagens sem relevancia operacional.

Exemplos:

- "o site caiu de novo" -> pode virar demanda tecnica;
- "precisamos fechar isso ate amanha" -> pode virar demanda comercial;
- "Pastor Marcelo pediu os nomes do evento" -> pode virar alerta importante;
- "grupo da empresa avisou que a reuniao mudou de horario" -> pode virar alerta importante;
- "bom dia pessoal" -> provavelmente nao faz nada.

## Parte 2. Visao Geral da Arquitetura

Um jeito simples e correto de montar esse sistema e separar em 6 camadas:

1. Uazapi
   Recebe e envia mensagens do WhatsApp.

2. Webhook Receiver
   Endpoint HTTP do seu app que recebe os eventos da Uazapi.

3. Banco de Dados
   Salva integracoes, contatos, grupos, conversas, mensagens, regras, alertas e demandas.

4. Motor de Regras
   Decide se uma mensagem merece analise mais profunda.

5. Motor de IA
   Le contexto recente e decide se existe demanda ou aviso importante.

6. Sistema de Acoes
   Cria demanda, alerta, notificacao ou apenas registra observacao.

### Fluxo alto nivel

```text
WhatsApp
   -> Uazapi
   -> webhook do seu app
   -> salvar mensagem no banco
   -> rodar regras
   -> se passar no filtro, chamar IA
   -> IA classifica
   -> criar demanda ou alerta
   -> mostrar no sistema
```

## Parte 3. Webhook vs Ler Tudo Toda Hora

Voce comentou que queria que o sistema "lesse todas as conversas toda hora". Isso pode ser feito, mas nao deve ser o caminho principal.

### O jeito certo

O jeito certo e processar mensagens novas conforme elas chegam por webhook.

Vantagens:

- mais rapido;
- mais barato;
- menos risco de perder mensagem;
- menos risco de criar duplicata;
- mais facil de escalar.

### Quando usar leitura periodica

A leitura periodica pode existir como apoio:

- reconciliação caso um webhook falhe;
- reprocessamento de uma conversa antiga;
- auditoria;
- carga inicial.

### Regra pratica

Use:

- webhook para eventos em tempo real;
- job agendado para verificacao e reprocessamento.

## Parte 4. O Que Precisa Ser Salvo

Antes da IA existir, o seu sistema ja precisa guardar bem os dados.

Se voce nao modelar isso direito, a IA nao vai ter contexto confiavel.

### Dados minimos por integracao

- id da integracao;
- tenant ou empresa dona da integracao;
- numero principal conectado na Uazapi;
- identificador da instancia;
- token ou chave de acesso;
- configuracoes extras.

### Dados minimos por conversa

- id da conversa;
- tenant_id;
- canal;
- tipo: privada ou grupo;
- nome da conversa;
- telefone ou identificador externo;
- ultimo texto;
- data da ultima mensagem;
- total de mensagens;

### Dados minimos por mensagem

- id interno;
- id externo da Uazapi;
- conversa;
- remetente;
- destino;
- se veio de grupo;
- id do grupo;
- id do participante no grupo;
- direcao: inbound ou outbound;
- tipo: texto, imagem, audio, video, documento;
- conteudo textual;
- url de midia;
- data da mensagem;
- payload bruto original.

### Dados minimos para a IA

- mensagem atual;
- mensagens da ultima 1 hora da mesma conversa;
- metadados do remetente;
- metadados do grupo;
- tags de importancia;
- regras de palavras-chave;
- historico de alertas e demandas ja criadas.

## Parte 5. Funcionalidades Minimas da Uazapi Que Voce Precisa

Antes de codar, confirme na documentacao da Uazapi se sua conta entrega:

- webhooks de mensagem recebida;
- webhooks de mensagem enviada;
- identificacao de grupos;
- identificacao de remetente dentro do grupo;
- download de midias;
- envio de mensagem;
- status de entrega;
- identificador unico da mensagem.

Sem esses dados, seu assistente fica incompleto.

### O que voce precisa extrair do payload

Sempre tente extrair estes campos:

- `instanceName` ou equivalente;
- `message.id` ou equivalente;
- `message.fromMe`;
- `message.text` ou `message.content`;
- `message.type` ou `message.mediaType`;
- `chat.id`;
- `chat.name`;
- `chat.phone`;
- identificador do grupo, se houver;
- identificador do participante que enviou a mensagem no grupo;
- horario da mensagem.

## Parte 6. Como Receber Mensagens no Seu App

Voce vai criar um endpoint HTTP publico. Exemplo:

```text
POST /webhooks/uazapi
```

Esse endpoint precisa:

1. receber o JSON;
2. validar se o payload parece legitimo;
3. descobrir qual integracao enviou aquele evento;
4. salvar o payload bruto;
5. normalizar os dados;
6. criar ou atualizar conversa;
7. salvar a mensagem;
8. disparar a analise.

### Estrutura mental do webhook receiver

Pense em 4 etapas:

1. Receber
   O endpoint aceita a requisicao da Uazapi.

2. Validar
   O sistema verifica autenticidade minima e formato.

3. Normalizar
   O sistema transforma o payload da Uazapi em um formato interno padrao.

4. Persistir e acionar
   O sistema grava no banco e chama regras ou fila.

### Exemplo de formato interno padrao

Mesmo que a Uazapi envie campos diferentes no futuro, dentro do seu app voce deve transformar tudo para um padrao proprio:

```json
{
  "provider": "uazapi",
  "integration_id": "uuid",
  "external_message_id": "abc123",
  "conversation_external_id": "grupo-ou-chat",
  "conversation_type": "group",
  "sender_name": "Pastor Marcelo",
  "sender_phone": "5531999999999",
  "group_name": "Igreja Central",
  "direction": "inbound",
  "message_type": "text",
  "content": "Pessoal, preciso dos nomes ate sexta",
  "sent_at": "2026-03-18T14:20:00Z",
  "raw_payload": {}
}
```

Esse passo de normalizacao e essencial.

## Parte 7. Como Tratar Conversas Privadas e Grupos

O sistema precisa diferenciar dois cenarios:

### Conversa privada

Mais simples.

Normalmente existe:

- um contato externo;
- uma conversa;
- varias mensagens.

### Grupo

Mais complexo.

Voce precisa guardar:

- o grupo;
- os participantes;
- quem enviou cada mensagem;
- a conversa do grupo;
- o contexto do grupo.

### Regra importante

No grupo, o autor da mensagem nao e o grupo.

O grupo e o canal.
O autor e uma pessoa dentro do grupo.

Se isso nao for salvo corretamente, depois voce nao consegue gerar avisos como:

- "Pastor Marcelo enviou uma mensagem importante no grupo da igreja";
- "Cliente Joao reportou um problema no grupo do projeto";
- "Diretoria avisou sobre mudanca no prazo no grupo da empresa".

## Parte 8. Como Decidir Se Vale Chamar a IA

Voce nao deve mandar toda mensagem para a IA.

Isso fica caro, lento e barulhento.

Crie um filtro antes.

### Filtro 1. Regras objetivas

Exemplos:

- palavras como `erro`, `urgente`, `prazo`, `vencimento`, `problema`, `reclamacao`;
- grupos marcados como importantes;
- contatos marcados como importantes;
- mensagens enviadas fora do horario normal;
- mensagens com anexos ou comprovantes;
- mensagens de clientes VIP.

### Filtro 2. Janela de contexto

Se uma mensagem passar nas regras, voce busca a ultima 1 hora daquela conversa.

Nao e para analisar apenas a frase isolada.

Exemplo:

- Mensagem sozinha: "ok"
- Contexto da ultima hora: "cliente reclamou de falha", "e urgente", "ok"

So com contexto a IA entende.

### Filtro 3. Deduplicacao de analise

Se 10 mensagens chegarem em 2 minutos, voce nao quer chamar a IA 10 vezes para o mesmo assunto.

Crie uma regra como:

- reagrupar mensagens da mesma conversa por janela de 5 minutos;
- reanalisar somente quando houver mensagem nova relevante;
- guardar hash ou assinatura da analise anterior.

## Parte 9. O Papel da IA Nesse Sistema

A IA nao deve ser solta. Ela precisa ter uma funcao bem definida.

As melhores funcoes aqui sao:

1. resumir o contexto recente;
2. detectar se existe demanda;
3. detectar se existe aviso importante;
4. extrair dados estruturados;
5. dar uma confianca para a decisao.

### Exemplo de saida ideal da IA

```json
{
  "has_demand": true,
  "has_important_alert": true,
  "summary": "Cliente relatou falha no checkout e pediu retorno ainda hoje.",
  "demand_type": "suporte_tecnico",
  "priority": "alta",
  "suggested_title": "Falha no checkout reportada por Cliente X",
  "important_sender": "Cliente X",
  "important_reason": "problema operacional com urgencia",
  "confidence": 0.91
}
```

Perceba que a IA nao cria a demanda diretamente.

Quem cria a demanda e o seu sistema depois de avaliar a confianca e as regras.

## Parte 10. Como Ja Usamos Uazapi Para Receber e Enviar Mensagens

Esta parte e importante porque ela mostra um desenho pratico que um programador consegue copiar.

A ideia e esta:

1. a Uazapi manda eventos para o seu webhook;
2. o seu sistema salva a mensagem;
3. o frontend mostra a conversa;
4. quando o usuario responde, o frontend chama uma funcao interna;
5. essa funcao interna chama a Uazapi para enviar a mensagem;
6. depois o sistema salva a mensagem outbound no banco;
7. quando a Uazapi devolver webhook da propria mensagem enviada, o sistema evita duplicar.

### Fluxo real de recebimento

```text
WhatsApp
   -> Uazapi
   -> POST /functions/v1/webhook-receiver
   -> identificar integracao
   -> normalizar payload
   -> encontrar ou criar conversa
   -> inserir mensagem em messages
   -> atualizar conversations
   -> opcionalmente disparar IA e automacoes
```

### Fluxo real de envio

```text
Tela de conversa
   -> chama send-message
   -> send-message busca a conversa
   -> send-message busca a integracao ativa
   -> send-message escolhe o provider correto
   -> provider Uazapi faz POST para a API externa
   -> se enviar com sucesso, salva em messages
   -> atualiza last_message_content e last_message_at
```

## Parte 11. Recebimento de Mensagens da Uazapi

No modelo usado no projeto, o endpoint principal de entrada e uma edge function publica.

Exemplo:

```text
POST /functions/v1/webhook-receiver
```

Esse endpoint faz o papel de porta de entrada para tudo que vem do WhatsApp via Uazapi.

### O que ele precisa fazer

Passo a passo:

1. receber o body bruto;
2. transformar em JSON;
3. desfazer wrappers, se a Uazapi ou N8N mandar o payload dentro de `body`;
4. validar se existe `message` e `chat`;
5. descobrir qual integracao do banco corresponde a esse evento;
6. extrair telefone, nome, tipo da mensagem e id externo;
7. criar ou atualizar a conversa;
8. salvar a mensagem;
9. evitar duplicatas;
10. repassar para outras rotinas, se necessario.

### Dados importantes que costumam vir

No projeto, os campos usados no recebimento seguem esta logica:

- `instanceName`, `instanceId`, `instance_id` ou `instance`
- `owner`
- `chat`
- `message`
- `message.fromMe`
- `message.text`
- `message.messageid` ou `message.id`
- `chat.wa_chatid`
- `chat.phone`
- `chat.wa_name`
- `chat.imagePreview`
- `chat.wa_lastMessageType`

### Como identificar a integracao correta

Quando o webhook chega, o sistema precisa descobrir a qual conta ou empresa ele pertence.

Uma estrategia segura e:

1. buscar integracoes ativas do canal WhatsApp;
2. tentar casar por `instance_id`;
3. se nao achar, tentar casar pelo numero dono da instancia;
4. se nao achar, tentar casar por `base_url`;
5. se ainda assim nao achar, registrar erro e nao processar.

### Estrutura recomendada do webhook receiver

```ts
async function webhookReceiver(payload) {
  const actualPayload = unwrapPayload(payload)
  const integration = await findIntegration(actualPayload)
  const normalized = normalizeIncomingMessage(actualPayload, integration)
  const conversation = await findOrCreateConversation(normalized)
  await saveIncomingMessage(conversation, normalized)
  await updateConversationSnapshot(conversation, normalized)
  await enqueueAnalysisIfNeeded(conversation, normalized)
}
```

### O que salvar no banco quando receber

Ao receber uma mensagem, salve pelo menos:

- `conversation_id`
- `direction = inbound`
- `message_type`
- `content`
- `media_url`
- `external_message_id`
- `created_at`

E atualize a tabela de conversas com:

- `last_message_content`
- `last_message_at`
- `unread_count`
- `avatar_url`, se tiver vindo novo

### Como evitar duplicata no recebimento

Esse ponto e obrigatorio.

Sempre tente impedir que a mesma mensagem seja inserida duas vezes.

Chave ideal:

- `conversation_id`
- `external_message_id`

Regra:

1. se o `external_message_id` ja existir naquela conversa, ignore;
2. se for webhook de mensagem enviada pela propria API, atualize status em vez de inserir outra linha;
3. se a Uazapi reenviar o mesmo evento, o sistema deve continuar idempotente.

## Parte 12. Envio de Mensagens Para a Uazapi

No projeto atual, o frontend nao chama a Uazapi diretamente.

Isso e correto.

O frontend chama uma funcao interna do seu backend. Essa funcao:

1. busca a conversa;
2. identifica o tenant;
3. encontra a integracao ativa;
4. monta o destinatario;
5. escolhe o provider;
6. envia para a Uazapi;
7. salva o resultado no banco.

### Por que o frontend nao deve chamar a Uazapi direto

Porque o token da Uazapi nao deve ficar exposto no navegador.

Entao o caminho certo e:

```text
Frontend -> sua edge function -> Uazapi
```

### Fluxo detalhado do envio

1. usuario digita a mensagem na tela;
2. o frontend chama algo como `send-message`;
3. a funcao busca a conversa em `conversations`;
4. a funcao busca a integracao em `integrations`;
5. a funcao identifica se o provider e Uazapi;
6. a funcao monta a chamada HTTP externa;
7. se a Uazapi responder com sucesso, a mensagem e salva no banco;
8. a conversa e atualizada com a ultima mensagem.

### Exemplo de envio de texto para Uazapi

Pelo padrao hoje usado no projeto, o envio de texto e parecido com isto:

```http
POST https://api.uazapi.com/send/text
Content-Type: application/json
token: SEU_TOKEN
apikey: SEU_TOKEN

{
  "number": "5531999999999",
  "text": "Ola, sua mensagem foi recebida."
}
```

### Exemplo de envio de midia para Uazapi

```http
POST https://api.uazapi.com/send/media
Content-Type: application/json
token: SEU_TOKEN
apikey: SEU_TOKEN

{
  "number": "5531999999999",
  "type": "image",
  "file": "https://seudominio.com/arquivo.png"
}
```

### Resposta esperada

A API deve devolver algum identificador externo de mensagem.

Exemplo:

- `messageId`
- `id`
- `chatId`

Esse identificador deve ser salvo como `external_message_id`.

## Parte 13. Como Organizar o Codigo de Envio

Mesmo para iniciante, vale separar isso em camadas.

Uma estrutura simples:

### Camada 1. Tela

Responsavel por capturar o texto digitado e chamar a funcao do backend.

Exemplo mental:

```ts
await sendMessage({
  conversationId,
  message: texto
})
```

### Camada 2. Endpoint interno

Responsavel por:

- validar entrada;
- carregar conversa;
- carregar integracao;
- escolher provider;
- tratar erros;
- salvar no banco.

### Camada 3. Provider Uazapi

Responsavel por conhecer os detalhes do HTTP da Uazapi:

- URL;
- headers;
- formato de payload;
- tipos de midia;
- leitura de resposta.

### Exemplo de pseudoimplementacao

```ts
async function sendMessage(conversationId, message) {
  const conversation = await getConversation(conversationId)
  const integration = await getActiveIntegration(conversation.tenant_id)
  const provider = new UazapiProvider(integration.credentials)
  const result = await provider.sendText(conversation.contact_phone, message)
  await saveOutboundMessage(conversation.id, message, result.externalId)
  await updateConversationLastMessage(conversation.id, message)
}
```

## Parte 14. Como Buscar Mensagens Antigas ou Fazer Backfill

Mesmo usando webhook, voce pode precisar buscar mensagens antigas:

- quando uma conversa nova for aberta;
- quando quiser sincronizar historico;
- quando suspeitar que perdeu webhook;
- quando importar uma conta antiga.

No projeto atual existe essa ideia de uma funcao separada para buscar mensagens da API externa.

### Quando usar backfill

Use com cuidado.

Nao e para rodar o tempo todo em todas as conversas.

Use em casos como:

- usuario abriu conversa e quer historico;
- job noturno de reconciliacao;
- suporte manual.

### Fluxo de backfill

```text
abrir conversa
   -> chamar fetch-messages
   -> buscar integracao ativa
   -> chamar endpoint externo da API
   -> receber lista
   -> ignorar duplicatas por external_message_id
   -> salvar o que ainda nao existe
```

### Regra importante

Backfill nunca substitui webhook.

Backfill e complemento.

## Parte 15. Como Tratar Midias Recebidas e Transcricoes

Em muitos projetos, a mensagem nao e so texto.

Voce pode receber:

- audio;
- imagem;
- video;
- documento.

O sistema precisa salvar:

- tipo da mensagem;
- URL da midia;
- texto extra, se existir;
- metadados de mime type.

### Audio

Um caminho comum e:

1. receber o webhook do audio;
2. identificar o `messageId`;
3. chamar endpoint de download da API externa;
4. se quiser, transcrever com IA;
5. salvar a transcricao como contexto adicional.

### Exemplo de download

No desenho usado no projeto, o download ou transcricao do audio segue esta ideia:

```http
POST {base_url}/message/download
Content-Type: application/json
token: SEU_TOKEN

{
  "id": "message-id",
  "generate_mp3": true,
  "transcribe": true,
  "return_link": false,
  "openai_apikey": "SUA_CHAVE"
}
```

### Como isso ajuda o assistente

Se o usuario mandar audio dizendo:

"O cliente reclamou que o pix nao caiu e quer retorno hoje"

Voce nao quer perder isso so porque veio em audio.

Entao a transcricao precisa entrar no contexto que a IA vai analisar.

## Parte 16. O Que o Programador Iniciante Precisa Decorar

Se o programador estiver perdido, ele precisa gravar esta ordem:

### Receber

```text
Uazapi -> webhook -> normalizar -> salvar -> analisar
```

### Enviar

```text
tela -> funcao interna -> Uazapi -> salvar -> atualizar conversa
```

### Reprocessar

```text
job manual -> buscar historico -> deduplicar -> salvar
```

### Regra de ouro

Nunca misture:

- detalhes do payload da Uazapi;
- regras de negocio do CRM;
- logica da IA;
- logica de banco;
- logica do frontend;

tudo no mesmo lugar.

Separe por responsabilidade.

## Parte 17. O Que Vem Nas Proximas Partes

Nas proximas etapas deste tutorial, o ideal e continuar nesta ordem:

1. stack recomendada para iniciante;
2. estrutura de banco com SQL;
3. endpoint de webhook completo;
4. deduplicacao de mensagens;
5. criacao do motor de regras;
6. prompt da IA;
7. criacao automatica de demandas;
8. alertas importantes;
9. painel administrativo;
10. testes e operacao.

---

## Status Desta Etapa

Concluido nesta primeira parte:

- objetivo do sistema;
- arquitetura geral;
- diferenca entre webhook e leitura periodica;
- dados minimos;
- fluxo de recebimento;
- fluxo pratico de recebimento da Uazapi;
- fluxo pratico de envio para a Uazapi;
- explicacao de provider, webhook e backfill;
- tratamento de grupos;
- criterio para chamar a IA;
- papel da IA.

Ainda nao escrito nesta fase:

- stack;
- SQL das tabelas;
- codigo do webhook;
- codigo de envio de mensagens;
- fluxo de criacao de demandas;
- tela de configuracao.
