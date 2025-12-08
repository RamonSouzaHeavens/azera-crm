# Sistema de Código de Entrada para Equipes

## 📋 Resumo das Mudanças

Um novo sistema foi implementado que permite que vendedores entrem nas equipes usando um código de 8 caracteres único, sem necessidade de convite por email.

---

## 🔧 Componentes Criados

### 1. **Migration 017** - `017_add_team_join_code.sql`
Adiciona suporte para código de entrada no banco de dados:
- Coluna `join_code` na tabela `tenants` (8 caracteres, único)
- Função `generate_unique_join_code()` - gera código aleatório único
- Trigger `trigger_set_join_code` - gera código automaticamente ao criar tenant
- Função RPC `join_team_with_code()` - permite usuários entrarem com código

### 2. **Serviço** - `src/services/equipeService.ts`
Função `joinTeamWithCode(joinCode: string)` para chamar a RPC do Supabase

### 3. **Componentes React**

#### `EntrarComCodigo.tsx`
Component separado para entrada com código (pode ser usado em modal/tela dedicada)
- Input para código de 8 caracteres
- Validação de código
- Tratamento de erros

#### `CodigoEquipe.tsx`
Component para exibir o código da equipe (para o owner)
- Mostra o código gerado
- Botão de cópia com feedback visual
- Instruções sobre como usar

### 4. **MinhaEquipe.tsx** - Atualizado
- `handleEntrarEquipe()` agora aceita 3 formatos:
  1. **UUID** (ID da equipe) - redireciona para JoinTeam
  2. **Código de 8 caracteres** - usa novo sistema de código
  3. **Token de convite** - sistema antigo (ainda funciona)

---

## 🚀 Como Usar

### Para Owners (Compartilhar Código):

1. **Execute a migration 017** no Supabase
2. **Importe o componente** `CodigoEquipe` no dashboard da equipe:

```tsx
import { CodigoEquipe } from '../components/team/CodigoEquipe'

// Na página da equipe:
<CodigoEquipe 
  codigoEquipe={equipe.join_code} 
  nomeEquipe={equipe.nome}
/>
```

### Para Vendedores (Entrar com Código):

1. Já funciona no modal "Entrar em Equipe"
2. Digite o código de 8 caracteres
3. Clique em "Entrar na Equipe"
4. Será adicionado automaticamente à equipe

---

## 📦 Exemplos de Código

### Chamar a função diretamente:

```tsx
import { joinTeamWithCode } from '../services/equipeService'

try {
  const { tenant_id, tenant_name } = await joinTeamWithCode('ABC12345')
  console.log(`Entrou na equipe: ${tenant_name}`)
} catch (error) {
  console.error('Erro:', error.message)
}
```

### Usar o componente de entrada:

```tsx
import { EntrarComCodigo } from '../components/team/EntrarComCodigo'

<EntrarComCodigo
  onSuccess={(tenantId) => {
    console.log('Entrou na equipe:', tenantId)
    // Redirecionar ou atualizar
  }}
  onBack={() => {
    // Voltar para menu anterior
  }}
/>
```

### Exibir código da equipe:

```tsx
import { CodigoEquipe } from '../components/team/CodigoEquipe'

<CodigoEquipe
  codigoEquipe="ABC12345"
  nomeEquipe="Minha Equipe"
/>
```

---

## 🔐 Segurança

- ✅ Código é gerado automaticamente (não manuseado manualmente)
- ✅ Código é único por tenant (UNIQUE constraint)
- ✅ Função RPC usa SECURITY DEFINER (segura)
- ✅ Verificação de autenticação (`auth.uid()`)
- ✅ Evita duplicação (ON CONFLICT)
- ✅ RLS policies protegem acesso

---

## 🎯 Fluxo Completo

```
Owner cria equipe
    ↓
Sistema gera código único automaticamente (ex: ABC12345)
    ↓
Owner compartilha código com vendedores
    ↓
Vendedor entra no CRM e abre modal "Entrar em Equipe"
    ↓
Vendedor digita código
    ↓
Sistema chama join_team_with_code() no Supabase
    ↓
Função cria membership + member
    ↓
Vendedor é adicionado à equipe automaticamente
    ↓
✅ Sucesso - Vendedor pode acessar equipe
```

---

## 📝 Próximos Passos

1. ✅ Executar migration 017 no Supabase
2. ✅ Importar `CodigoEquipe` no dashboard
3. ✅ Testar entrada com código no modal
4. ✅ Documentar no onboarding (como compartilhar código)

---

## 🐛 Troubleshooting

**Erro: "Código inválido ou expirado"**
- Verifique se o código tem exatamente 8 caracteres
- Confirme que o código está em UPPERCASE
- Certifique-se de que o tenant existe no Supabase

**Erro: "Você já é membro desta equipe"**
- Usuário já estava nesta equipe
- Tente entrar em uma equipe diferente

**Função não encontrada**
- Execute migration 017
- Aguarde o cache do Supabase sincronizar (5-10 segundos)
- Recarregue a página

---

## 📊 Dados Armazenados

```json
{
  "tenants": {
    "id": "uuid",
    "name": "string",
    "join_code": "ABC12345",  // ← Nova coluna
    "logo_url": "string",
    "slogan": "string",
    "created_at": "timestamp"
  }
}
```

---

**Data da Implementação**: 02 de Novembro de 2025
**Versão**: 1.0
