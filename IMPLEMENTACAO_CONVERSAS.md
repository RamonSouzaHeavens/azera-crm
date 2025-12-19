# Implementação: Arquivar e Excluir Conversas + Status do Lead

## 📋 Resumo das Alterações

Implementação de funcionalidades para **arquivar** e **excluir** conversas, além de exibir o **status do lead na pipeline** ao lado da data nas conversas.

---

## 🗄️ Alterações no Banco de Dados

### 1. Tabela `conversations`

Foram adicionadas duas novas colunas:

- **`archived`** (BOOLEAN, default: false)
  - Indica se a conversa foi arquivada pelo usuário
  - Permite organizar conversas sem excluí-las permanentemente

- **`deleted_at`** (TIMESTAMPTZ, nullable)
  - Implementa soft delete (exclusão lógica)
  - Quando preenchido, a conversa não aparece mais na lista
  - Permite recuperação futura se necessário

**Índices criados:**
- `idx_conversations_archived` - Para filtrar conversas arquivadas
- `idx_conversations_deleted` - Para filtrar conversas deletadas

### 2. Tabela `clientes`

Foi adicionada uma nova coluna:

- **`etapa_funil_id`** (UUID, nullable, FK para `pipeline_stages`)
  - Vincula o lead à etapa atual no funil de vendas
  - Permite rastrear a progressão do lead no pipeline
  - ON DELETE SET NULL (se a etapa for deletada, o campo fica nulo)

**Índice criado:**
- `idx_clientes_etapa_funil` - Para melhor performance nas queries

---

## 💻 Alterações no Frontend

### 1. Hook `useConversations.ts`

**Interface `Conversation` atualizada:**
```typescript
export interface Conversation {
  // ... campos existentes
  archived?: boolean
  deleted_at?: string
  etapa_funil_id?: string
  etapa_funil_label?: string
  etapa_funil_color?: string
}
```

**Novas funções adicionadas:**

- **`archiveConversation(conversationId: string)`**
  - Arquiva uma conversa
  - Atualização otimista da UI
  - Toast de sucesso/erro

- **`unarchiveConversation(conversationId: string)`**
  - Desarquiva uma conversa
  - Atualização otimista da UI
  - Toast de sucesso/erro

- **`deleteConversation(conversationId: string)`**
  - Exclui uma conversa (soft delete)
  - Remove da lista imediatamente
  - Toast de sucesso/erro

**Query atualizada:**
- Join com `pipeline_stages` para buscar label e cor da etapa
- Filtro `.is('deleted_at', null)` para não mostrar conversas deletadas
- Mapeamento dos novos campos na resposta

### 2. Página `Conversations.tsx`

**Novos estados:**
- `openMenuId` - Controla qual conversa tem o menu de ações aberto
- `showArchived` - Alterna entre conversas ativas e arquivadas

**Novos ícones importados:**
- `Archive` - Para o botão de arquivar
- `MoreVertical` - Para o menu de ações (três pontinhos)

**Filtro de conversas atualizado:**
```typescript
const filteredConversations = conversations.filter(c =>
  (c.categoria || 'trabalho') === categoryTab &&
  (showArchived ? c.archived === true : !c.archived) &&
  (c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.last_message_content?.toLowerCase().includes(searchTerm.toLowerCase()))
);
```

**Header da lista:**
- Botão para alternar entre conversas ativas e arquivadas
- Título dinâmico: "Conversas" ou "Arquivadas"
- Ícone de arquivo com estado visual (verde quando ativo)

**Item da lista de conversas:**

1. **Status do Lead** (novo)
   - Badge pequeno ao lado esquerdo da data
   - Cor dinâmica baseada na etapa do pipeline
   - Texto: label da etapa (ex: "Qualificação", "Proposta")
   - Tamanho: 9px, com padding e border-radius

2. **Menu de Ações** (novo)
   - Botão com três pontinhos (MoreVertical)
   - Aparece apenas no hover
   - Dropdown com opções:
     - **Arquivar** / **Desarquivar** (dependendo do estado)
     - **Excluir** (com confirmação)
   - Fecha ao clicar fora (useEffect)

**Layout atualizado:**
```
┌─────────────────────────────────────────┐
│ [Avatar] [Nome]        [Status] [Data]  │
│          [Última mensagem]      [Badge] │
│                                 [Menu]  │
└─────────────────────────────────────────┘
```

---

## 📁 Arquivos Criados/Modificados

### Arquivos SQL:
1. `supabase/migrations/20251218_add_conversations_archive_delete.sql`
2. `supabase/migrations/20251218_add_clientes_etapa_funil.sql`
3. `SQL_CONVERSAS_ARQUIVAR_EXCLUIR.sql` (consolidado)

### Arquivos TypeScript:
1. `src/hooks/useConversations.ts` (modificado)
2. `src/pages/Conversations.tsx` (modificado)

---

## 🚀 Como Executar

### 1. Executar SQL no Supabase

Você pode executar de duas formas:

**Opção A - Migrations individuais:**
```bash
# No SQL Editor do Supabase, execute em ordem:
1. supabase/migrations/20251218_add_conversations_archive_delete.sql
2. supabase/migrations/20251218_add_clientes_etapa_funil.sql
```

**Opção B - Script consolidado:**
```bash
# Execute o arquivo consolidado:
SQL_CONVERSAS_ARQUIVAR_EXCLUIR.sql
```

### 2. Verificar Instalação

Após executar os SQL's, execute a query de verificação incluída no script para confirmar que:
- Colunas foram criadas
- Índices foram criados
- Tipos de dados estão corretos

---

## 🎯 Funcionalidades Implementadas

### ✅ Arquivar Conversas
- Usuário pode arquivar conversas para organizá-las
- Conversas arquivadas não aparecem na lista principal
- Botão no header para visualizar arquivadas
- Opção de desarquivar

### ✅ Excluir Conversas
- Exclusão lógica (soft delete)
- Confirmação antes de excluir
- Conversa removida da lista imediatamente
- Possibilidade de recuperação futura (via SQL)

### ✅ Status do Lead
- Badge com a etapa atual do pipeline
- Cor personalizada por etapa
- Posicionado ao lado esquerdo da data
- Tamanho pequeno para não poluir a interface

### ✅ Menu de Ações
- Três pontinhos no hover
- Dropdown com opções contextuais
- Fecha ao clicar fora
- Feedback visual claro

---

## 🎨 Design e UX

### Cores e Estilos:
- **Status do Lead**: Cor dinâmica baseada na etapa (pipeline_stages.color)
- **Botão Arquivar**: Verde quando ativo, cinza quando inativo
- **Menu Dropdown**: Fundo branco/slate-800, sombra suave
- **Botão Excluir**: Vermelho com hover vermelho claro

### Interações:
- **Hover**: Menu de ações aparece
- **Click no menu**: Abre dropdown
- **Click fora**: Fecha dropdown
- **Confirmação**: Dialog nativo antes de excluir

### Responsividade:
- Menu se adapta ao espaço disponível
- Status do lead oculto em telas muito pequenas (se necessário)
- Botões mantêm tamanho adequado em mobile

---

## 🔍 Observações Importantes

1. **Soft Delete**: As conversas excluídas não são removidas do banco, apenas marcadas com `deleted_at`. Isso permite recuperação futura se necessário.

2. **Performance**: Índices foram criados para otimizar queries de conversas arquivadas e deletadas.

3. **Etapa do Pipeline**: Se um lead não tiver etapa definida, o badge não será exibido.

4. **Realtime**: As atualizações de arquivamento/exclusão são refletidas em tempo real graças ao Supabase Realtime.

5. **Optimistic UI**: Todas as ações (arquivar, desarquivar, excluir) atualizam a UI imediatamente, antes da confirmação do servidor, para melhor UX.

---

## 📝 Próximos Passos (Opcional)

- [ ] Adicionar filtro por etapa do pipeline
- [ ] Implementar busca por status do lead
- [ ] Adicionar opção de restaurar conversas excluídas
- [ ] Criar página de administração de conversas arquivadas/excluídas
- [ ] Adicionar estatísticas de conversas por etapa

---

**Data de Implementação**: 18/12/2025
**Versão**: 1.0.0
