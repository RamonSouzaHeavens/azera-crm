# Guia de Configuração do Meta App (Facebook Developers)

Este guia descreve o passo a passo para configurar o aplicativo no **Meta for Developers** para permitir que os usuários do Azera CRM conectem suas contas do Instagram (para chat) e Facebook Ads (para leads).

---

## 1. Criar o Aplicativo

1. Acesse [developers.facebook.com](https://developers.facebook.com/).
2. Clique em **Meus Apps** > **Criar App**.
3. Selecione o caso de uso: **Outro** > **Empresa** (Business).
4. Dê um nome ao app (ex: "Azera CRM Integration").
5. Conecte a uma Conta Empresarial (Business Manager) se tiver.

## 2. Configurações Básicas

No menu lateral, vá em **Configurações** > **Básico**:

1. **Nome de exibição**: O nome que aparecerá para o usuário ao logar.
2. **URL da Política de Privacidade**: `https://seu-dominio.com/politica-privacidade` (Obrigatório para aprovação).
3. **URL dos Termos de Serviço**: `https://seu-dominio.com/termos-uso`.
4. **Ícone do App**: Carregue a logo do Azera (1024x1024).
5. **Categoria**: "Negócios e Páginas" ou "Produtividade".
6. Role até o fim e clique em **Adicionar Plataforma**:
   - Escolha **Website**.
   - Em **URL do Site**, coloque a URL de produção: `https://seu-dominio.com/`.

## 3. Adicionar Produtos

No painel (Dashboard), adicione os seguintes produtos:

### A. Login do Facebook para Empresas (Facebook Login for Business)
1. Vá em **Configurações** do produto.
2. **Valid OAuth Redirect URIs**:
   - Adicione a URL de produção: `https://seu-dominio.com/`
   - Adicione localhost para testes: `http://localhost:5173/`
3. **Login com o JavaScript SDK**:
   - Ative "Login com o JavaScript SDK".
   - Em **Allowed Domains for the JavaScript SDK**, adicione: `https://seu-dominio.com` e `http://localhost:5173`.

### B. Instagram Graph API
Este produto é necessário para acessar as DMs do Instagram. Não requer configuração extra imediata, apenas a adição.

### C. Webhooks
Necessário para receber mensagens em tempo real.

1. Selecione o objeto **Instagram**.
2. Clique em **Subscribe to this object**.
3. **Callback URL**: A URL da sua Edge Function no Supabase:
   - `https://<SEU_PROJETO>.supabase.co/functions/v1/webhook-receiver`
4. **Verify Token**: O token que você definir no código (padrão: `azera-crm-token`).
5. Após validar, inscreva-se nos campos (Subscribe):
   - `messages`
   - `messaging_postbacks`
   - `message_reactions` (opcional)

> **Nota**: Para receber leads em tempo real, você também pode configurar o Webhook do objeto **Page** e assinar o campo `leadgen`.

## 4. Permissões Necessárias (Por Funcionalidade)

Para que o Azera CRM funcione corretamente, você precisa solicitar as seguintes permissões na **Revisão do App (App Review)**. Elas estão divididas pelo recurso que habilitam:

### A. Para Conversas (Instagram Direct)
Permite enviar e receber mensagens do Instagram dentro do CRM.
- **`instagram_basic`**: Para ler o perfil do Instagram (nome, foto).
- **`instagram_manage_messages`**: Para ler e enviar mensagens (DMs).
- **`pages_show_list`**: Para listar as Páginas do Facebook e encontrar a conta do Instagram vinculada.
- **`pages_manage_metadata`**: Para configurar automaticamente os Webhooks de mensagens.

### B. Para Distribuição de Leads (Facebook Lead Ads)
Permite receber leads das campanhas em tempo real.
- **`leads_retrieval`**: Permissão principal para baixar os dados dos leads.
- **`pages_show_list`**: Para listar as páginas onde os anúncios estão rodando.
- **`pages_manage_metadata`**: Para inscrever o CRM no recebimento de leads da Página (Webhook).

### C. Para Dados de Campanhas (Insights)
Permite ver o desempenho dos anúncios no painel do CRM.
- **`ads_read`**: Para ler dados de campanhas, conjuntos de anúncios e anúncios.
- **`ads_management`**: (Opcional, mas recomendado) Garante acesso completo à estrutura da conta de anúncios para relatórios mais detalhados.

### Resumo para Copiar na Revisão:
Ao solicitar a revisão, explique o uso de cada uma:

| Permissão | Explicação Sugerida |
|-----------|---------------------|
| `instagram_manage_messages` | "O App permite que empresas respondam clientes do Instagram Direct em uma caixa de entrada centralizada." |
| `leads_retrieval` | "O App sincroniza leads gerados em formulários do Facebook (Lead Ads) para distribuição imediata à equipe de vendas." |
| `ads_read` | "O App exibe um painel de desempenho das campanhas para que o gestor acompanhe o ROI dos anúncios." |

## 5. Modo de Desenvolvimento vs. Live

- **Modo Desenvolvimento**: Apenas usuários listados em "Funções" (Roles) no painel do desenvolvedor (Administradores, Desenvolvedores, Testadores) podem conectar. Use isso para testar.
- **Modo Live (Ao Vivo)**: Após a aprovação da análise (App Review), mude o switch no topo da tela para "Live". Agora qualquer usuário do Instagram/Facebook poderá conectar.

## 6. Credenciais no Código

No seu projeto Azera CRM, você precisa atualizar as variáveis de ambiente ou o código da Edge Function com:

- **App ID**: Copie de Configurações > Básico.
- **App Secret**: Copie de Configurações > Básico.

Essas credenciais devem ser colocadas na Edge Function `facebook-exchange-token` (ou nas variáveis de ambiente do Supabase `FACEBOOK_APP_ID` e `FACEBOOK_APP_SECRET`).

---

**Dica de Suporte**: Se o usuário encontrar erro ao conectar, verifique se a conta dele é uma **Conta Comercial (Business Account)** no Instagram e se está vinculada a uma **Página do Facebook**. Contas pessoais ou de criador de conteúdo (Creator) podem ter limitações.
