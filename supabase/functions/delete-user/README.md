# Delete User Edge Function

## Descrição
Edge Function segura para deletar contas de usuário do sistema Azera CRM, incluindo remoção do `auth.users` do Supabase.

## Deploy

### 1. Instalar Supabase CLI
```bash
# Windows (via Scoop)
scoop install supabase

# Ou via npm
npm install -g supabase
```

### 2. Login no Supabase
```bash
supabase login
```

### 3. Linkar com seu projeto
```bash
supabase link --project-ref <seu-project-id>
```

Para encontrar o project-id:
- Vá em https://supabase.com/dashboard
- Selecione seu projeto
- Na URL você verá: `https://supabase.com/dashboard/project/<project-id>`

### 4. Deploy da função
```bash
supabase functions deploy delete-user
```

### 5. Verificar deploy
A função estará disponível em:
```
https://<seu-project-id>.supabase.co/functions/v1/delete-user
```

## Uso

A função é chamada automaticamente quando o usuário clica em "Excluir Conta" nas Configurações.

### Endpoint
```
POST https://<seu-project-id>.supabase.co/functions/v1/delete-user
```

### Headers Obrigatórios
```
Authorization: Bearer <user-access-token>
Content-Type: application/json
```

### Resposta de Sucesso
```json
{
  "success": true,
  "message": "Conta deletada com sucesso"
}
```

### Resposta de Erro
```json
{
  "error": "Mensagem de erro",
  "details": "Detalhes técnicos"
}
```

## Segurança

- ✅ Valida token JWT do usuário antes de executar
- ✅ Usa SERVICE_ROLE apenas no servidor (não exposto)
- ✅ Permite que usuário delete apenas sua própria conta
- ✅ Suporta CORS para chamadas do frontend
- ✅ Remove todos os dados relacionados antes de deletar auth.users

## Operações Executadas

1. Valida autenticação do usuário
2. Deleta registros de `members` 
3. Deleta registros de `memberships`
4. Deleta convites pendentes em `team_invites`
5. Marca perfis como desabilitados em `profiles` e `user_profiles`
6. Deleta usuário de `auth.users` via Admin API

## Logs

Para ver logs da função em produção:
```bash
supabase functions logs delete-user
```

Ou no dashboard:
- Vá em Edge Functions → delete-user → Logs
