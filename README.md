# Sistema Azera - CRM Imobiliário

Sistema de CRM especializado para imobiliárias com arquitetura multi-tenant, construído com React, TypeScript e Supabase.

## 🚀 Características

- **Multi-tenant**: Isolamento completo de dados entre empresas
- **Autenticação segura**: Integração com Supabase Auth
- **Dashboard interativo**: Gráficos e KPIs em tempo real
- **Gestão de Imóveis**: Interface completa para propriedades imobiliárias
- **Sistema de Leads**: Pipeline visual com drag & drop
- **Relatórios**: Análises e métricas de vendas
- **Sistema de Equipes**: Convites e colaboração entre agentes
- **Dark/Light mode**: Tema claro e escuro
- **Responsivo**: Funciona em desktop, tablet e mobile

## 📚 Documentação

Toda a documentação técnica está organizada na pasta [`docs/`](docs/README.md):
- Sistema de convites e equipes
- Upload e gestão de arquivos
- Importação de dados via CSV
- Checklists de validação

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Estado**: Zustand + React Query
- **Gráficos**: Recharts
- **Forms**: React Hook Form + Yup
- **UI**: Componentes customizados

## 📦 Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd crm-saas
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o Supabase**
   - Crie um projeto no [Supabase](https://supabase.com)
   - Copie `.env.example` para `.env`
   - Preencha as variáveis do Supabase
   - Execute as migrations SQL no SQL Editor

4. **Execute o projeto**
```bash
npm run dev
```

## 🗄️ Configuração do Banco

Execute o script SQL em `supabase/migrations/create_crm_schema.sql` no SQL Editor do Supabase para criar:

- Tabelas: tenants, members, clientes, vendas
- Políticas RLS para isolamento multi-tenant
- Índices para performance
- Triggers para timestamp automático

## 👥 Login de Teste

- Crie uma conta nova pelo formulário de signup
- Use seu email e senha

## 🎨 Design System

### Cores
- **Primária**: Azul (#3B82F6)
- **Secundária**: Verde (#10B981)
- **Accent**: Laranja (#F59E0B)
- **Neutros**: Escala de cinzas

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🏗️ Arquitetura

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (Button, Input, Card)
│   └── layout/         # Layout (Sidebar, Header)
├── pages/              # Páginas da aplicação
├── stores/             # Estado global (Zustand)
├── lib/                # Configurações e utilidades
└── App.tsx             # Componente principal
```

## 🔐 Segurança

- **RLS (Row Level Security)**: Isolamento automático de dados
- **Autenticação JWT**: Tokens seguros do Supabase
- **Políticas personalizadas**: Controle granular de acesso
- **Validação**: Schemas Yup para forms

## 📱 Funcionalidades

### Dashboard
- Cards de KPIs animados
- Gráficos de vendas e pipeline
- Atividade recente
- Métricas em tempo real

### Clientes
- Grid editável inline
- Kanban com drag & drop
- Busca e filtros
- Status personalizáveis

### Relatórios
- Vendas vs Meta
- Produtos mais vendidos
- Performance de vendedores
- Funil de conversão

### Configurações
- Gestão da empresa
- Convite de membros
- Notificações
- Segurança

## 🚀 Deploy

O projeto está pronto para deploy em:
- Vercel
- Netlify
- Render
- Qualquer provedor que suporte SPA

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.