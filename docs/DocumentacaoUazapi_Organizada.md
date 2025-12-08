# Documentação Uazapi - Organizada

Esta é uma organização estruturada da documentação da API Uazapi para melhor compreensão.

## 1. Administração
Endpoints para administração geral do sistema. Requerem um admintoken para autenticação.

### POST /instance/init
Criar Instancia

**Descrição:** Cria uma nova instância do WhatsApp.

**Campos obrigatórios:**
- name: string (Nome da instância)

**Campos opcionais:**
- systemName: string (Nome do sistema, padrão 'uazapiGO')
- adminField01: string (Campo administrativo 1)
- adminField02: string (Campo administrativo 2)

**Estados possíveis:** disconnected, connecting, connected

### GET /instance/all
Listar todas as instâncias

**Descrição:** Retorna lista completa de todas as instâncias.

**Respostas:**
- 200: Lista de instâncias
- 401: Token inválido
- 403: Token de administrador inválido
- 500: Erro interno

### POST /instance/updateAdminFields
Atualizar campos administrativos

**Descrição:** Atualiza campos administrativos de uma instância.

**Campos obrigatórios:**
- id: string (ID da instância)

**Campos opcionais:**
- adminField01: string
- adminField02: string

### GET /instance/webhook
Ver Webhook Global

**Descrição:** Retorna configuração atual do webhook global.

### POST /instance/webhook
Configurar Webhook Global

**Descrição:** Configura webhook global para receber eventos.

**Campos obrigatórios:**
- url: string (URL do webhook)
- events: string (Tipos de eventos separados por vírgula)

## 2. Enviar Mensagem
Endpoints para envio de mensagens do WhatsApp com diferentes tipos de conteúdo.

### Campos Opcionais Comuns
Todos os endpoints suportam:
- delay: integer (Atraso em ms)
- readchat: boolean (Marcar chat como lido)
- readmessages: boolean (Marcar mensagens como lidas)
- replyid: string (ID da mensagem para responder)
- mentions: string (Números para mencionar)
- forward: boolean (Marcar como encaminhada)
- track_source: string (Origem do rastreamento)
- track_id: string (ID para rastreamento)
- placeholders: object (Substituições)

### POST /send/text
Enviar Mensagem de Texto

**Descrição:** Envia mensagem de texto simples.

**Campos obrigatórios:**
- number: string (Número do destinatário)
- text: string (Conteúdo da mensagem)

### POST /send/media
Enviar Mídia

**Descrição:** Envia imagem, vídeo, documento, áudio, sticker.

**Tipos suportados:** image, video, document, audio, myaudio, ptt, sticker

**Campos obrigatórios:**
- number: string
- type: string
- file: string (URL ou base64)

**Campos opcionais:**
- text: string (Caption)
- docName: string (Nome do arquivo para documentos)

### POST /send/contact
Enviar Cartão de Contato

**Descrição:** Envia vCard de contato.

**Campos obrigatórios:**
- number: string
- fullName: string
- phoneNumber: string

**Campos opcionais:**
- organization: string
- email: string
- url: string

### POST /send/location
Enviar Localização

**Descrição:** Envia localização com coordenadas.

**Campos obrigatórios:**
- number: string
- latitude: number
- longitude: number

**Campos opcionais:**
- address: string
- name: string

### POST /send/list
Enviar Lista

**Descrição:** Envia mensagem com lista de opções.

**Campos obrigatórios:**
- number: string
- title: string
- buttonText: string
- footer: string
- sections: array (Seções com títulos e opções)

### POST /send/button
Enviar Botões

**Descrição:** Envia mensagem com botões clicáveis.

**Campos obrigatórios:**
- number: string
- title: string
- buttonText: string
- footer: string
- buttons: array (Botões com texto e ID)

### POST /message/react
Reagir a Mensagem

**Descrição:** Adiciona ou remove reação emoji a uma mensagem.

**Campos obrigatórios:**
- number: string
- text: string (Emoji ou vazio para remover)
- id: string (ID da mensagem)

### POST /message/delete
Apagar Mensagem

**Descrição:** Apaga mensagem para todos.

**Campos obrigatórios:**
- id: string (ID da mensagem)

## 3. Gerenciamento de Chats e Leads
Endpoints para gerenciar conversas e informações de leads.

### GET /chat/find
Buscar Chat

**Descrição:** Busca informações de um chat específico.

**Parâmetros de query:**
- id: string (ID do chat)

### POST /chat/createLead
Criar Lead

**Descrição:** Cria novo lead associado a um chat.

**Campos obrigatórios:**
- id: string (ID do chat)

**Campos opcionais:** lead_field01 a lead_field20, lead_tags, etc.

### POST /chat/editLead
Editar Lead

**Descrição:** Atualiza informações de lead.

**Campos obrigatórios:**
- id: string (ID do chat)

**Campos opcionais:** status, assigned_to, kanban_position, lead_tags, etc.

### GET /chat/list
Listar Chats

**Descrição:** Lista chats com filtros.

**Parâmetros de query:** status, assigned_to, tags, etc.

## 4. Funções de API
Endpoints para gerenciar funções personalizadas.

### POST /function/create
Criar Função

**Descrição:** Cria nova função de API.

**Campos obrigatórios:**
- name: string
- code: string

### GET /function/list
Listar Funções

**Descrição:** Lista todas as funções configuradas.

## Notas Gerais
- Todos os endpoints requerem autenticação via token de instância, exceto administração que usa admintoken.
- Formatos de resposta incluem códigos HTTP padrão e mensagens de erro.
- Suporte a webhooks para eventos em tempo real.
- Integração com sistemas CRM para gerenciamento de leads.</content>
<parameter name="filePath">e:\Agência\Gold Age\Azera\CRM Azera\DocumentacaoUazapi_Organizada.md