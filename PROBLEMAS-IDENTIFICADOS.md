# Problemas Identificados e Soluções

## 1. ❌ Problema: Não consegue criar despesas (Policy Issue)

### Causa
As Row Level Security (RLS) policies da tabela `despesas` no Supabase estão incorretas ou ausentes, impedindo que usuários autenticados criem novas despesas.

### Solução
Execute o script SQL `fix-despesas-policies.sql` no SQL Editor do Supabase. Este script:
- Remove policies antigas (se existirem)
- Habilita RLS na tabela
- Cria policies corretas para SELECT, INSERT, UPDATE e DELETE
- Adiciona índices para melhorar performance

### Passos:
1. Abra o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole o conteúdo do arquivo `fix-despesas-policies.sql`
4. Execute o script
5. Teste criando uma nova despesa

---

## 2. ❌ Problema: Fotos de perfil não carregam no WhatsApp

### Causa
Há uma inconsistência entre os nomes dos campos usados no código:
- O serviço `webhookService.ts` salva a foto como `avatar_url` (linha 217)
- O componente `Conversations.tsx` tenta acessar `avatar` (linha 663)
- A tabela `conversations` tem ambos os campos: `avatar` e `avatar_url`

### Solução
Atualizar o componente `Conversations.tsx` para usar o campo correto.

#### Arquivo: `src/pages/Conversations.tsx`

**Linha 663-664** (dentro do map de mensagens):
```tsx
// ANTES:
{selectedConversa?.avatar ? (
  <img src={selectedConversa.avatar} className="w-full h-full object-cover" />

// DEPOIS:
{(selectedConversa?.avatar || selectedConversa?.avatar_url) ? (
  <img src={selectedConversa?.avatar || selectedConversa?.avatar_url} className="w-full h-full object-cover" />
```

**Linha 504-506** (na lista de conversas):
```tsx
// ANTES:
{conversa.avatar && conversa.avatar.startsWith('http') ? (
  <img
    src={conversa.avatar}

// DEPOIS:
{(conversa.avatar || conversa.avatar_url) && (conversa.avatar || conversa.avatar_url)?.startsWith('http') ? (
  <img
    src={conversa.avatar || conversa.avatar_url}
```

**Linha 850-851** (no painel lateral):
```tsx
// ANTES:
{selectedConversa?.avatar ? (
  <img src={selectedConversa.avatar} className="w-full h-full object-cover rounded-full shadow-lg" />

// DEPOIS:
{(selectedConversa?.avatar || selectedConversa?.avatar_url) ? (
  <img src={selectedConversa?.avatar || selectedConversa?.avatar_url} className="w-full h-full object-cover rounded-full shadow-lg" />
```

### Verificação Adicional
Também verifique se o webhook está salvando corretamente. No arquivo `webhookService.ts`, linha 217, confirme que está atualizando ambos os campos:

```typescript
// Atualizar conversations com ambos os campos para compatibilidade
await supabase
  .from('conversations')
  .update({
    avatar: avatarUrl,      // Campo antigo (para compatibilidade)
    avatar_url: avatarUrl   // Campo novo (padrão)
  })
  .eq('id', conversationId)
```

---

## 3. ⚠️ Problema: Arquivo Tarefas.tsx corrompido

### Causa
Múltiplas edições simultâneas causaram problemas na estrutura JSX do arquivo.

### Status
Você mencionou que vai corrigir manualmente. Os problemas principais são:
- Estrutura HTML quebrada na linha ~455-460 (botão "Adicionar Nova Coluna")
- Modal de filtros fora de posição (linha ~460)
- Condicional de modal ausente
- Fechamento de divs desbalanceado

---

## Resumo de Ações Necessárias

### ✅ Imediatas:
1. **Executar** `fix-despesas-policies.sql` no Supabase
2. **Atualizar** `Conversations.tsx` para usar `avatar || avatar_url`
3. **Corrigir** estrutura JSX do `Tarefas.tsx` (você fará manualmente)

### 🔍 Verificações:
- Testar criação de despesas após aplicar as policies
- Testar se as fotos de perfil aparecem nas conversas do WhatsApp
- Verificar se o webhook está salvando avatares corretamente

### 📝 Melhorias Futuras:
- Padronizar uso de `avatar_url` em todo o código (remover `avatar`)
- Adicionar tratamento de erro mais robusto no `fetchContactAvatar`
- Considerar cache de avatares para reduzir chamadas à API
