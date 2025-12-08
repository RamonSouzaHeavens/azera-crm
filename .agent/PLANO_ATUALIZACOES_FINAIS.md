# Plano Detalhado de Atualizações Finais - CRM Azera

## 📋 Visão Geral
Este documento detalha todas as atualizações necessárias para os ajustes finais do CRM Azera antes do lançamento.

**Última atualização:** 2025-12-03
**Versão:** 2.0
**Total estimado:** ~20 horas de desenvolvimento

---

## ÍNDICE

1. [Traduções Pendentes](#1-traduções-pendentes)
2. [Gestão de Convites - Bloqueio por Assinatura](#2-gestão-de-convites---bloqueio-por-assinatura)
3. [Dashboard de Equipe](#3-dashboard-de-equipe)
4. [Página de Assinatura - Stripe](#4-página-de-assinatura---stripe)
5. [Upload de Avatar](#5-upload-de-avatar)
6. [Lembretes de Despesas](#6-lembretes-de-despesas)
7. [Página de Documentação](#7-página-de-documentação)
8. [Página de Chaves API](#8-página-de-chaves-api)
9. [Página de Automações](#9-página-de-automações)
10. [Página de Conversas](#10-página-de-conversas)

---

## 1. 🌐 TRADUÇÕES PENDENTES

### 1.1 Traduzir Chaves de Navegação da Equipe
**Arquivo:** `src/i18n/locales/pt-BR.json`

**Chaves a adicionar:**
```json
{
  "team": {
    "tabs": {
      "overview": "Visão Geral",
      "members": "Membros",
      "products": "Produtos",
      "leads": "Leads",
      "metaConnection": "Conexão Meta",
      "metaDistribution": "Distribuição Meta",
      "ads": "Anúncios",
      "invites": "Convites",
      "settings": "Configurações"
    },
    "you": "(você)"
  }
}
```

**Complexidade:** 2/10
**Tempo estimado:** 5 minutos

---

## 2. 🔒 GESTÃO DE CONVITES - BLOQUEIO POR ASSINATURA

### 2.1 Implementar Bloqueio Visual com Blur
**Arquivo:** `src/pages/MinhaEquipe.tsx`

**Requisitos:**
- Quando usuário não tem assinatura ativa, mostrar modal de "Gestão de Convites" com blur
- Aplicar `backdrop-filter: blur(8px)` em todo o conteúdo
- Bloquear interações com `pointer-events: none`
- Adicionar overlay com mensagem de upgrade
- Implementar bloqueio no backend para prevenir bypass via DevTools

**Implementação:**
1. Verificar `subscription_status` do usuário
2. Se não ativo, renderizar componente com:
   - `className="blur-md pointer-events-none select-none"`
   - Overlay absoluto com mensagem
   - Desabilitar todos os event handlers
3. Adicionar validação no backend (RLS policies) para operações de convite

**Complexidade:** 6/10
**Tempo estimado:** 45 minutos

---

## 3. 👥 DASHBOARD DE EQUIPE - DIFERENCIAÇÃO DE PERMISSÕES

### 3.1 Modal de Informações da Equipe
**Arquivo:** `src/pages/MinhaEquipe.tsx`

**Para DONO da equipe:**
```
┌─────────────────────────────────────┐
│  📊 Dashboard da Equipe             │
├─────────────────────────────────────┤
│  👥 Membros Ativos: 5               │
│  💼 Vendedores: 3                   │
│  📈 Leads Hoje: 12                  │
│  🎯 Taxa de Conversão: 23%          │
│  💰 Vendas do Mês: R$ 45.000        │
│                                     │
│  [+ Convidar Membro]                │
└─────────────────────────────────────┘
```

**Para VENDEDOR da equipe:**
```
┌─────────────────────────────────────┐
│  👤 Seu Desempenho                  │
├─────────────────────────────────────┤
│  📈 Seus Leads Hoje: 4              │
│  ✅ Tarefas Concluídas: 8           │
│  🎯 Meta do Mês: 65%                │
│                                     │
│  (Sem opção de convidar)            │
└─────────────────────────────────────┘
```

**Implementação:**
1. Criar componente `TeamDashboardModal.tsx`
2. Verificar `user_role` no `team_members`
3. Renderizar conteúdo condicional baseado em role
4. Adicionar queries específicas para cada tipo de usuário
5. Implementar RLS para proteger dados sensíveis

**Complexidade:** 7/10
**Tempo estimado:** 1h 30min

---

## 4. 💳 PÁGINA DE ASSINATURA - INTEGRAÇÃO STRIPE

### 4.1 Configurar Produtos no .env
**Arquivo:** `.env`

**Produtos Stripe:**
```env
# Plano Mensal
VITE_STRIPE_PRICE_MONTHLY=price_1SYIQvDrBNWAl6ByGBxLBvYy
VITE_STRIPE_PRODUCT_MONTHLY=prod_TVJ3v7PsnrZUBm

# Plano Semestral
VITE_STRIPE_PRICE_BIANNUAL=price_1SYITFDrBNWAl6ByFIXJmCe3
VITE_STRIPE_PRODUCT_BIANNUAL=prod_TVJ5ITU6XUl3KH

# Plano Anual
VITE_STRIPE_PRICE_YEARLY=price_1SYIXUDrBNWAl6ByAdphz72j
VITE_STRIPE_PRODUCT_YEARLY=prod_TVJ9yaPORvYDLd
```

### 4.2 Atualizar Página de Assinatura
**Arquivo:** `src/pages/Subscribe.tsx`

**Preços a exibir:**
- **Mensal:** R$ 80,00/mês
- **Semestral:** R$ 450,00 a cada 6 meses (R$ 75,00/mês)
- **Anual:** R$ 780,00/ano (R$ 65,00/mês)

**Implementação:**
1. Importar variáveis de ambiente
2. Mapear produtos aos botões de assinatura
3. Passar `priceId` correto para checkout Stripe

**Complexidade:** 4/10
**Tempo estimado:** 30 minutos

### 4.3 Modal de Condição de Lançamento
**Arquivo:** `src/components/LaunchOfferModal.tsx` (novo)

**Design:**
- Modal grande (similar ao "você ainda não tem assinatura")
- Design sofisticado com gradientes
- Animações sutis de entrada
- Botão de fechar (apenas admin pode remover permanentemente)

**Copy sugerida:**
```
🚀 Condição Exclusiva de Lançamento

Seja um dos primeiros 100 assinantes do Azera e
garanta para sempre o valor promocional de:

R$ 50,00/mês
VITALÍCIO

Esta é nossa forma de agradecer aos pioneiros que
acreditam em nossa solução e nos ajudam a provar
que o Azera é a ferramenta ideal para empresas e
vendedores autônomos.

Após os primeiros 100 assinantes, o valor retorna
ao preço regular.

[Garantir Meu Desconto Vitalício →]
```

**Implementação:**
1. Criar componente `LaunchOfferModal.tsx`
2. Adicionar estado global para controle de exibição
3. Implementar lógica de contagem de assinantes
4. Adicionar flag no localStorage (pode ser removida manualmente)
5. Criar endpoint admin para desativar modal

**Complexidade:** 6/10
**Tempo estimado:** 1h

### 4.4 Alterar Fonte do Título
**Arquivo:** `src/pages/Subscribe.tsx`

**Mudança:**
```tsx
<h1 className="text-4xl font-bold font-outfit">Planos de Assinatura</h1>
```

**Complexidade:** 1/10
**Tempo estimado:** 2 minutos

---

## 5. 🖼️ UPLOAD DE AVATAR - CORREÇÃO DE BUG

### 5.1 Corrigir Schema da Tabela Profiles
**Arquivo:** `fix-profiles-avatar.sql` (novo)

**Problema:** Coluna `user_id` não encontrada no schema cache

**Solução SQL:**
```sql
-- 1. Verificar estrutura atual da tabela profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles';

-- 2. Atualizar RLS policies para upload de avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON profiles;

CREATE POLICY "Users can update own avatar"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Policy para leitura de avatars
DROP POLICY IF EXISTS "Avatars are publicly readable" ON profiles;

CREATE POLICY "Avatars are publicly readable"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- 4. Garantir que bucket de avatars existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Policies do Storage para avatars
DROP POLICY IF EXISTS "Avatar upload for authenticated users" ON storage.objects;

CREATE POLICY "Avatar upload for authenticated users"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Avatar update for own files" ON storage.objects;

CREATE POLICY "Avatar update for own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Avatar delete for own files" ON storage.objects;

CREATE POLICY "Avatar delete for own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');
```

### 5.2 Corrigir Service de Profile
**Arquivo:** `src/services/profileService.ts`

**Verificar:**
1. Nome correto da coluna (pode ser `id` ao invés de `user_id`)
2. Estrutura do UPDATE
3. Tratamento de erros

**Implementação:**
```typescript
// Verificar estrutura correta da query
const { error } = await supabase
  .from('profiles')
  .update({ avatar_url: avatarUrl })
  .eq('id', userId); // Usar 'id' ao invés de 'user_id'
```

**Complexidade:** 7/10
**Tempo estimado:** 1h (incluindo testes)

---

## 6. 💰 DESPESAS - LEMBRETES RECORRENTES

### 6.1 Criar Tabela de Lembretes
**Arquivo:** `create-expense-reminders.sql` (novo)

**Schema:** Ver arquivo SQL completo no plano original

**Complexidade:** 8/10
**Tempo estimado:** 2h

---

## 7. 📚 PÁGINA DE DOCUMENTAÇÃO - REDESIGN COMPLETO

### 7.1 Melhorar UI dos Guias para Iniciantes
**Arquivos:** `src/components/documentacao/*.tsx`

**Requisitos:**
- Design mais bonito e visual com passo a passo destacado
- Layout horizontal no desktop (menos scroll vertical)
- Cards com ícones e numeração clara
- Animações sutis de entrada

**Complexidade:** 6/10
**Tempo estimado:** 1h 30min

### 7.2 Adicionar Seção de Suporte
**Arquivo:** `src/components/documentacao/SupportSection.tsx` (novo)

**Design:**
```tsx
<div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-8 mt-8">
  <div className="flex items-center gap-6">
    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
      <MessageCircle className="w-8 h-8" />
    </div>
    <div className="flex-1">
      <h3 className="text-2xl font-semibold mb-2">Precisa de Ajuda?</h3>
      <p className="text-gray-400 mb-4">
        Fale com nossos especialistas e tire suas dúvidas sobre a integração
      </p>
      <button className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
        Falar com Especialista
      </button>
    </div>
  </div>
</div>
```

**Complexidade:** 3/10
**Tempo estimado:** 20 min

### 7.3 Remover Tab de Credenciais
**Arquivo:** `src/pages/Documentacao.tsx`

**Ação:** Remover tab "Credenciais" da navegação (manter funcionalidade apenas em "Requisições HTTP")

**Complexidade:** 1/10
**Tempo estimado:** 5 min

### 7.4 Centralizar Barra de Tabs
**Arquivo:** `src/pages/Documentacao.tsx`

**Mudança:**
```tsx
<div className="flex gap-4 justify-center max-w-4xl mx-auto">
```

**Complexidade:** 1/10
**Tempo estimado:** 2 min

### 7.5 Tenant ID com Visualização Oculta
**Arquivo:** `src/components/documentacao/TenantIdDisplay.tsx` (novo)

**Componente completo com ícones de olho e copiar**

**Usar em:**
- Topo da página de documentação
- Página de Credenciais
- Exemplos e Endpoints

**Complexidade:** 4/10
**Tempo estimado:** 30 min

### 7.6 Substituir "Imóvel/Imóveis" por "Produtos"
**Arquivos:** Todos em `src/components/documentacao/` e `src/pages/Documentacao.tsx`

**Ação:** Buscar e substituir globalmente

**Complexidade:** 2/10
**Tempo estimado:** 15 min

### 7.7 Remover Modal Redundante de Tenant ID
**Arquivos:**
- `src/pages/Credenciais.tsx`
- `src/components/documentacao/PaginaExemplos.tsx`
- `src/components/documentacao/PaginaEndpoints.tsx`

**Ação:** Remover modal "Seu Tenant ID para usar nas automações é:" e usar apenas componente `TenantIdDisplay` no topo

**Complexidade:** 2/10
**Tempo estimado:** 10 min

### 7.8 Criar Exemplos Completos de API
**Arquivo:** `src/components/documentacao/ApiExamples.tsx` (novo)

**Exemplos necessários para:**
1. **Leads** (GET, POST, PUT, DELETE)
2. **Conversas** (GET, POST)
3. **Tarefas** (GET, POST, PUT, DELETE)
4. **Produtos** (GET, POST, PUT, DELETE)

**Complexidade:** 7/10
**Tempo estimado:** 2h

### 7.9 Verificar/Criar Edge Functions Faltantes
**Arquivos:** `supabase/functions/`

**Verificar existência e criar se necessário:**
- `api-leads` ✓
- `api-conversas` (criar se não existir)
- `api-tarefas` ✓
- `api-produtos` ✓

**Complexidade:** 6/10
**Tempo estimado:** 1h 30min

### 7.10 Layout Horizontal para Desktop
**Arquivo:** `src/pages/Documentacao.tsx`

**Mudanças:**
- Usar grid de 2 colunas onde possível
- Reduzir espaçamento vertical
- Maximizar uso de largura da tela

**Complexidade:** 5/10
**Tempo estimado:** 45 min

---

## 8. 🔑 PÁGINA DE CHAVES API

### 8.1 Alterar Fonte do Título para Outfit
**Arquivo:** `src/pages/ChavesAPI.tsx`

**Mudança:**
```tsx
<h1 className="text-4xl font-bold font-outfit">Chaves API</h1>
```

**Complexidade:** 1/10
**Tempo estimado:** 2 min

---

## 9. 🔗 PÁGINA DE AUTOMAÇÕES

### 9.1 Alterar Fonte do Título para Outfit
**Arquivo:** `src/pages/Automacoes.tsx`

**Mudança:**
```tsx
<h1 className="text-4xl font-bold font-outfit">Automações</h1>
```

**Complexidade:** 1/10
**Tempo estimado:** 2 min

### 9.2 Sidebar "Como Funciona" Flutuante
**Arquivo:** `src/pages/Automacoes.tsx`

**Implementação:** Sidebar sticky com instruções passo a passo

**Complexidade:** 4/10
**Tempo estimado:** 30 min

### 9.3 Reduzir Tamanho do Modal de Webhook
**Arquivo:** `src/components/WebhookModal.tsx`

**Mudanças:**
- `max-w-2xl` ao invés de `max-w-4xl`
- Reduzir padding interno
- Grid mais compacto

**Complexidade:** 2/10
**Tempo estimado:** 15 min

### 9.4 Verificar e Corrigir Lógica de Webhooks
**Arquivos:**
- `src/services/webhookService.ts`
- `supabase/functions/webhook-handler/`

**Checklist:**
- [ ] Webhooks são salvos corretamente no banco
- [ ] Eventos são disparados nos momentos certos
- [ ] Payload está correto e completo
- [ ] Retry logic funciona em caso de falha
- [ ] Logs de webhook estão sendo registrados

**Complexidade:** 7/10
**Tempo estimado:** 1h 30min

---

## 10. 💬 PÁGINA DE CONVERSAS (CONVERSATIONS)

### 10.1 Remover Espaço em Branco Desnecessário
**Arquivo:** `src/pages/ConnectChannels.tsx`

**Ação:** Identificar e remover padding/margin excessivo

**Complexidade:** 2/10
**Tempo estimado:** 10 min

### 10.2 Carregar Fotos de Perfil Automaticamente
**Arquivo:** `src/pages/Conversations.tsx`

**Implementação:** Buscar foto do Z-API quando conversa é aberta

**Complexidade:** 5/10
**Tempo estimado:** 45 min

### 10.3 Editar Status do Lead na Pipeline
**Arquivo:** `src/pages/Conversations.tsx`

**Componente:** Select que busca todos os estágios da pipeline (incluindo criados pelo usuário)

**Complexidade:** 6/10
**Tempo estimado:** 1h

### 10.4 Corrigir Barra de Pesquisa
**Arquivo:** `src/pages/Conversations.tsx`

**Verificar:** Filtro por nome, telefone e email

**Complexidade:** 3/10
**Tempo estimado:** 20 min

### 10.5 Scroll Automático para Última Mensagem
**Arquivo:** `src/pages/Conversations.tsx`

**Implementação:** useRef + scrollIntoView ao abrir conversa

**Complexidade:** 3/10
**Tempo estimado:** 15 min

### 10.6 Ajustar Cor do Balão de Mensagem Enviada (Dark Mode)
**Arquivo:** `src/pages/Conversations.tsx`

**Mudança:**
```tsx
<div className="bg-green-700 dark:bg-green-800">
```

**Complexidade:** 1/10
**Tempo estimado:** 5 min

### 10.7 Remover Ícone de 3 Pontinhos
**Arquivo:** `src/pages/Conversations.tsx`

**Ação:** Remover botão MoreVertical ao lado de "Caixa de Entrada"

**Complexidade:** 1/10
**Tempo estimado:** 2 min

### 10.8 Substituir Emoji por Integração com Playbook
**Arquivo:** `src/pages/Conversations.tsx`

**Implementação:**
- Substituir ícone de emoji por ícone de raio (Zap)
- Criar modal `PlaybookModal.tsx`
- Buscar cards do playbook de `app/ferramentas-pro/playbook`
- Ao clicar em um card, preencher campo de mensagem com resposta sugerida
- Permitir edição antes de enviar

**Complexidade:** 7/10
**Tempo estimado:** 1h 30min

---

## 📊 RESUMO DE COMPLEXIDADE

| # | Tarefa | Complexidade | Tempo Estimado |
|---|--------|--------------|----------------|
| 1 | Traduções | 2/10 | 5 min |
| 2 | Bloqueio de Convites | 6/10 | 45 min |
| 3 | Dashboard de Equipe | 7/10 | 1h 30min |
| 4 | Stripe (completo) | 5/10 | 1h 32min |
| 5 | Upload de Avatar | 7/10 | 1h |
| 6 | Lembretes de Despesas | 8/10 | 2h |
| 7 | Documentação (completo) | 7/10 | 6h 30min |
| 8 | Chaves API | 1/10 | 2 min |
| 9 | Automações | 6/10 | 2h 15min |
| 10 | Conversas | 6/10 | 4h 15min |

**TOTAL ESTIMADO:** ~20 horas de desenvolvimento

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

### Fase 1 - Ajustes Rápidos (30 min)
1. Traduções (5 min)
2. Fontes Outfit em Subscribe, Chaves API, Automações (6 min)
3. Remover elementos (3 pontinhos, tabs, modais redundantes) (15 min)
4. Ajustes de cor (balão de mensagem) (5 min)

### Fase 2 - Bugs Críticos (2h 30min)
5. Upload de Avatar (1h)
6. Barra de pesquisa Conversas (20 min)
7. Scroll automático mensagens (15 min)
8. Carregar fotos de perfil (45 min)
9. Remover espaço em branco (10 min)

### Fase 3 - Features de Documentação (7h)
10. Tenant ID oculto (30 min)
11. Substituir Imóvel → Produtos (15 min)
12. Layout horizontal (45 min)
13. Centralizar tabs (2 min)
14. Guias melhorados (1h 30min)
15. Seção de suporte (20 min)
16. Exemplos completos de API (2h)
17. Edge Functions faltantes (1h 30min)

### Fase 4 - Features de Negócio (5h)
18. Produtos Stripe (30 min)
19. Modal de Lançamento (1h)
20. Bloqueio de Convites (45 min)
21. Dashboard de Equipe (1h 30min)
22. Lembretes de Despesas (2h)

### Fase 5 - Integrações Avançadas (5h)
23. Pipeline Status Select (1h)
24. Integração Playbook (1h 30min)
25. Webhooks - verificação (1h 30min)
26. Sidebar Automações (30 min)
27. Modal Webhook menor (15 min)

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Antes de cada deploy:
- [ ] Testar em ambiente de desenvolvimento
- [ ] Verificar RLS policies no Supabase
- [ ] Testar com usuário sem assinatura
- [ ] Testar com usuário com assinatura
- [ ] Verificar responsividade mobile
- [ ] Testar em diferentes navegadores
- [ ] Validar segurança contra bypass
- [ ] Verificar logs de erro no console
- [ ] Testar fluxo completo end-to-end

### Específico por feature:

#### Upload de Avatar:
- [ ] Upload funciona
- [ ] Preview atualiza
- [ ] URL salva no perfil
- [ ] Imagem aparece em outros componentes

#### Lembretes:
- [ ] Lembrete aparece no dia correto
- [ ] Status persiste após marcar como pago
- [ ] Não aparece lembretes de outros usuários
- [ ] Funciona em diferentes timezones

#### Stripe:
- [ ] Checkout abre com produto correto
- [ ] Webhook atualiza status
- [ ] Acesso liberado após pagamento
- [ ] Modal de lançamento só aparece quando apropriado

#### Documentação:
- [ ] Todos os exemplos funcionam
- [ ] Tenant ID oculto/visível funciona
- [ ] Copiar funciona
- [ ] Layout horizontal no desktop
- [ ] Responsivo no mobile

#### Conversas:
- [ ] Fotos carregam automaticamente
- [ ] Pipeline status atualiza
- [ ] Pesquisa funciona
- [ ] Scroll vai para última mensagem
- [ ] Playbook abre e preenche mensagem

---

## 🔐 CONSIDERAÇÕES DE SEGURANÇA

### Prioridade ALTA:
1. **RLS em todas as tabelas novas**
2. **Validação server-side de tenant_id**
3. **Sanitização de inputs**
4. **Rate limiting em endpoints sensíveis**
5. **Logs de auditoria para ações críticas**

### Proteções específicas:
- **Convites:** Validar assinatura no backend, não apenas frontend
- **Avatar:** Validar tipo de arquivo, tamanho máximo (2MB)
- **Lembretes:** Garantir isolamento por tenant
- **Stripe:** Validar webhooks com assinatura
- **API:** Validar API keys e tenant_id em todas as requisições
- **Webhooks:** Validar origem e assinatura

---

## 📝 NOTAS FINAIS

- Todos os arquivos SQL devem ser executados em ordem
- Fazer backup do banco antes de aplicar migrations
- Testar cada feature isoladamente antes de integrar
- Documentar qualquer desvio deste plano
- Manter changelog atualizado
- Criar testes automatizados para features críticas
- Monitorar logs após deploy

---

**Criado em:** 2025-12-03
**Versão:** 2.0
**Status:** Aguardando implementação
**Total de tarefas:** 27
**Tempo total estimado:** ~20 horas
