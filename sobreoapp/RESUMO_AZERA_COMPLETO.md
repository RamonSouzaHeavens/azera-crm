# 🚀 Azera CRM - Resumo Executivo Completo

**Última Atualização:** 12 de Dezembro de 2025

---

## 📌 Visão Geral

O **Azera** é um CRM SaaS moderno e completo, projetado para **qualquer tipo de empresa** que precisa gerenciar vendas, leads e equipes de forma profissional. Diferente de CRMs genéricos, o Azera combina **simplicidade de uso** com **poder de automação**, permitindo que empresas de todos os tamanhos organizem suas vendas e escalem resultados.

### 🎯 Proposta de Valor
> "Chega de perder leads por desorganização. Automatize follow-ups, organize seu pipeline visual e coloque sua equipe inteira na mesma página."

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilização** | TailwindCSS + Framer Motion (animações) |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) |
| **Estado** | Zustand + React Query |
| **Formulários** | React Hook Form + Yup |
| **Gráficos** | Recharts |
| **Pagamentos** | Stripe (subscriptions + webhooks) |
| **Integrações** | Z-API (WhatsApp), Meta/Facebook APIs |
| **Deploy** | Vercel + Supabase Cloud |

---

## 🏗️ Arquitetura

### Multi-Tenant com Isolamento Total
- **Row Level Security (RLS)** no PostgreSQL
- Cada empresa tem seus dados 100% isolados
- Autenticação JWT via Supabase Auth
- Criptografia end-to-end

### Sistema de Equipes
- **Roles**: Owner, Admin, Vendedor
- Permissões granulares por função
- Convites por email ou código de equipe
- Onboarding simplificado para novos membros

---

## 📱 Módulos e Funcionalidades

### 1. 📊 Dashboard
- KPIs em tempo real (vendas, leads, conversão, tarefas)
- Gráficos de performance mensal
- Pipeline visual (Kanban resumido)
- Atividades recentes
- Tarefas do dia e atrasadas
- Conversas não lidas
- Saudação inteligente baseada no horário
- Upload de avatar do usuário

### 2. 👥 Gestão de Leads
- **Pipeline Visual Kanban** (drag & drop)
- **Visualizações**: Grid, Lista, Kanban
- Campos personalizados ilimitados
- Timeline de atividades por lead
- Anexos e documentos
- Status customizáveis
- Filtros avançados (status, data, valor, etc.)
- Busca inteligente
- Métricas de conversão automáticas
- Configuração dinâmica de etapas do funil

### 3. 📦 Produtos/Imóveis
- CRUD completo de produtos
- Upload múltiplo de imagens
- Filtros avançados (tipo, preço, tags)
- Associação com leads
- Campos customizados
- Visualização em grid/lista
- Detalhamento completo do produto

### 4. 💬 Conversas (Inbox Unificado)
- **WhatsApp integrado** (via Z-API)
- **Instagram integrado** (via Meta API)
- Chat em tempo real
- Envio de texto, áudio e arquivos
- Avatar do contato via API
- Pesquisa de conversas
- Exclusão de conversas
- Integração com leads existentes
- Playbook de objeções integrado
- Modal para adicionar atividades

### 5. ✅ Gestão de Tarefas
- CRUD completo de tarefas
- Visualização Grid e Kanban
- Prioridades (baixa, média, alta, urgente)
- Status (pendente, em progresso, bloqueada, concluída)
- Associação com leads e produtos
- Múltiplos responsáveis
- Checklists
- Filtros por status, prioridade, cliente, responsável
- Período de vencimento
- Registro de tempo gasto

### 6. ⚡ Automações (Webhooks)
- Sistema de triggers e ações
- Webhooks ilimitados
- Ativar/desativar automações
- Testar automações
- Integração com N8N, Zapier, Make
- Dispatcher assíncrono

### 7. 👨‍👩‍👧‍👦 Gestão de Equipes
- Criar e gerenciar equipes
- Convites por email
- Código de equipe para entrada rápida
- Roles e permissões (Owner/Admin/Vendedor)
- Dashboard de membros
- Estatísticas da equipe
- Sair/Deletar equipe
- Configurações da equipe

### 8. 🔌 Conectar Canais
- **WhatsApp Business** (via Z-API)
- **Instagram** (via Meta/Facebook OAuth)
- Interface visual de configuração
- Status de conexão em tempo real
- Desconectar integrações

### 9. 🔑 API Keys
- Geração de chaves API personalizadas
- Documentação integrada
- Revogação de chaves
- Controle de acesso

### 10. 💰 Assinaturas (Billing)
- Planos: Gratuito, Mensal, Semestral, Anual
- Checkout via Stripe
- Portal de gerenciamento
- Webhooks automáticos para sincronização
- Trial de 14 dias

### 11. ⚙️ Configurações
- **Perfil**: Nome, foto, telefone
- **Empresa**: Nome fantasia, CNPJ, endereço, contato
- **Tema**: Dark/Light mode
- **Idioma**: Português (BR) e Inglês (US)
- **Notificações**: Configuração de alertas

### 12. 💸 Gestão de Despesas
- CRUD de despesas
- Tipos: Fixa, Variável, Pontual
- Categorias (Aluguel, Internet, Marketing, etc.)
- Resumo por tipo
- Controle de vencimento

### 13. 📚 Documentação
- Visão geral do sistema
- Exemplos de API
- Estrutura de webhooks
- Guias de integração

---

## 🧰 Ferramentas Pro (Aceleradores de Vendas)

| Ferramenta | Descrição | Status |
|------------|-----------|--------|
| **Calculadora de ROI** | Projeta impacto financeiro para justificar investimento | ✅ Disponível |
| **Gerador de Propostas** | Cria contratos e propostas profissionais automaticamente | ✅ Disponível |
| **Battlecards** | Comparativo competitivo com pontos fortes vs concorrentes | ✅ Disponível |
| **Playbook de Objeções** | Respostas prontas para objeções comuns ("está caro", "vou pensar") | ✅ Disponível |
| **Enriquecimento de Dados** | Encontra emails, cargos e telefones de leads | 🔜 Em breve |
| **Análise de Perfil (IA)** | Identificação DISC e recomendações de abordagem | 🔜 Em breve |
| **Resumo de Reunião** | Ata automática com decisões e próximos passos | 🔜 Em breve |
| **Sequência de Cadência** | Jornada de emails com templates e prazos inteligentes | 🔜 Em breve |

---

## 🔗 Supabase Edge Functions

| Função | Propósito |
|--------|-----------|
| `api-leads` | API REST para leads |
| `api-produtos` | API REST para produtos |
| `api-tarefas` | API REST para tarefas |
| `configure-zapi` | Configuração do Z-API (WhatsApp) |
| `delete-user` | Exclusão de usuário |
| `disconnect-integration` | Desconectar integrações |
| `execute-webhook` | Execução de webhooks |
| `facebook-exchange-token` | Troca de token OAuth do Facebook |
| `fetch-avatar` | Busca avatar de contatos |
| `fetch-messages` | Busca mensagens de conversas |
| `generate-proposal` | Geração de propostas com IA |
| `openai-proxy` | Proxy para OpenAI |
| `send-invite` | Envio de convites por email |
| `send-message` | Envio de mensagens (WhatsApp/Instagram) |
| `stripe-*` | Funções de pagamento (checkout, webhook, portal, etc.) |
| `trigger-dispatcher` | Disparo de triggers de automação |
| `webhook-dispatcher` | Processamento assíncrono de webhooks |
| `webhook-processor` | Processamento de payloads |
| `webhook-receiver` | Recebimento de webhooks externos |

---

## 🎨 Design System

### Filosofia Visual
- **Glassmorphism** com blur e transparências
- **Dark mode** como padrão
- Animações suaves com **Framer Motion**
- UI responsiva (mobile-first)
- Tipografia: **Outfit** + system fonts

### Cores Principais
| Cor | Hex | Uso |
|-----|-----|-----|
| Primária (Azul) | `#3B82F6` | Ações principais |
| Secundária (Verde) | `#10B981` | Sucesso, confirmações |
| Accent (Cyan) | `#22D3EE` | Destaques, links |
| Warning (Amber) | `#F59E0B` | Alertas |
| Danger (Red) | `#EF4444` | Erros, exclusões |

### Breakpoints
| Device | Largura |
|--------|---------|
| Mobile | < 768px |
| Tablet | 768px - 1024px |
| Desktop | > 1024px |

---

## 🌍 Internacionalização

- **Português (Brasil)** - pt-BR
- **Inglês (EUA)** - en-US
- Arquivos JSON estruturados em `src/i18n/locales/`
- +2200 linhas de traduções
- Sistema de chaves aninhadas

---

## 🔒 Segurança

| Feature | Implementação |
|---------|---------------|
| Autenticação | JWT via Supabase Auth |
| Autorização | RLS (Row Level Security) |
| Isolamento | Multi-tenant por tenant_id |
| Criptografia | End-to-end |
| Backups | Diários automáticos |
| Validação | Yup schemas + server-side |
| LGPD | Política de privacidade + termos |

---

## 📈 Casos de Uso

### 👤 Profissionais Liberais
- Campos personalizados por cliente
- Lembretes e follow-ups automáticos
- Acesso móvel com sincronização

### 👥 Equipes & Empresas
- Distribuição automática de leads
- Dashboards individuais de performance
- Permissões avançadas por roles

### 🏢 Qualquer Segmento
- Imobiliárias, consultorias, agências
- E-commerce, B2B, serviços
- Adaptável a qualquer modelo de negócio

---

## 💳 Planos de Preços

| Plano | Preço | Características |
|-------|-------|-----------------|
| **Starter** | Grátis | Funcionalidades básicas |
| **Mensal** | R$40/mês | Todas as features |
| **Semestral** | R$35/mês | Economia de 12.5% |
| **Anual** | R$30/mês | Economia de 25% |

- 14 dias de trial grátis
- Sem cartão para testar
- Cancele a qualquer momento

---

## 🚀 Roadmap Futuro

### Próximas Features
- [ ] IA para sugestões de follow-up
- [ ] Enriquecimento automático de leads
- [ ] Resumo de reuniões com IA
- [ ] Sequências de email automatizadas
- [ ] Análise de perfil DISC

### Melhorias Planejadas
- [ ] Onboarding guiado interativo
- [ ] Notificações push
- [ ] Analytics avançado
- [ ] Gamificação para vendedores

### Expansão
- [ ] App mobile nativo
- [ ] Integração com calendários
- [ ] Email marketing integrado
- [ ] Mais integrações de mensageria

---

## 📞 Contato e Suporte

- **Website**: [azera.com.br](https://azera.com.br)
- **Email**: contato@azera.com.br
- **WhatsApp**: Disponível no site
- **Horário**: Seg-Sex, 9h às 18h

---

## 📝 Tagline

> **"O CRM que transforma equipes em máquinas de resultados."**

---

*Documento gerado automaticamente em 12/12/2025*
