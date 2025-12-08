# 🔑 Setup Completo - API Keys (Passo a Passo)

## ⚠️ IMPORTANTE
Execute **TODO** o conteúdo do arquivo `SETUP_API_KEYS_COMPLETO.sql` de uma vez só no Supabase SQL Editor.

---

## 📋 Passo a Passo

### 1️⃣ Abrir Supabase Dashboard
- Acesse: https://supabase.com/dashboard
- Selecione seu projeto
- Vá em **SQL Editor** (menu lateral esquerdo)

### 2️⃣ Executar o Script Completo
- Clique em **"New Query"**
- Copie **TODO** o conteúdo de `SETUP_API_KEYS_COMPLETO.sql`
- Cole no editor
- Clique em **"Run"** (ou pressione `Ctrl+Enter`)

### 3️⃣ Verificar os Resultados
Após executar, você verá 4 tabelas de verificação:

#### ✅ Resultado Esperado #1 - Função Criada
```
status: ✅ FUNÇÃO CRIADA
schema: public
function_name: generate_api_key
return_type: text
anon_can_execute: true
auth_can_execute: true
```

#### ✅ Resultado Esperado #2 - Tabela Configurada
Deve mostrar colunas incluindo:
- `id` (uuid)
- `tenant_id` (uuid)
- `name` (text)
- `key_hash` (text) ← **importante**
- `permissions` (ARRAY) ← **importante**
- `expires_at` (timestamp) ← **importante**
- `is_active` (boolean) ← **importante**
- `created_by` (uuid)
- `created_at`, `updated_at`, `last_used_at`

#### ✅ Resultado Esperado #3 - Políticas RLS
Deve mostrar 3 políticas:
- `Users can view their tenant's api keys` (SELECT)
- `Users can insert their tenant's api keys` (INSERT)
- `Users can update their tenant's api keys` (UPDATE)

#### ✅ Resultado Esperado #4 - Teste da Função
```
status: ✅ TESTE FUNÇÃO
chave_gerada: abc123xyz... (string aleatória de ~32 caracteres)
```

---

## 🧪 Teste Manual no App

### 4️⃣ Limpar Cache do Browser
- Pressione `Ctrl+Shift+R` (hard reload)
- Ou abra em janela anônima

### 5️⃣ Testar Criação de Chave
1. Faça login como **owner** ou **admin** do tenant
2. Acesse a página **API Keys** (`/api-keys`)
3. Clique em **"Nova Chave"**
4. Preencha o nome (ex: "Teste 1")
5. Clique em **"Criar"**

**✅ Sucesso:**
- Toast verde: "Chave API criada com sucesso!"
- Modal com a chave gerada (anote, aparece só uma vez)
- Chave aparece na listagem

**❌ Se falhar:**
- Veja o console do browser (`F12` → Console)
- Copie o erro completo e me envie

---

## 🔧 Teste via REST (PowerShell) - Opcional

Execute no PowerShell para confirmar que a RPC está acessível:

```powershell
cd "e:\Agência\Gold Age\Azera\CRM Azera"
$anon = (Get-Content .env | Select-String 'VITE_SUPABASE_ANON_KEY' | ForEach-Object { $_.ToString().Split('=',2)[1].Trim() })
$response = Invoke-RestMethod -Method Post -Uri "https://hdmesxrurdrhmcujospv.supabase.co/rest/v1/rpc/generate_api_key" -Headers @{ "apikey" = $anon; "Authorization" = "Bearer $anon"; "Content-Type" = "application/json" } -Body '{}'
Write-Host "✅ Chave gerada: $response" -ForegroundColor Green
```

**Resultado esperado:**
```
✅ Chave gerada: abc123xyz...
```

---

## ❓ Troubleshooting

### Erro: 404 (Not Found)
**Causa:** PostgREST não recarregou o cache.

**Solução:**
```sql
NOTIFY pgrst, 'reload schema';
```
Execute novamente e teste.

---

### Erro: 403 (Forbidden)
**Causa:** Usuário não é owner/admin do tenant.

**Verificar:**
```sql
SELECT 
  m.role,
  m.active,
  u.email
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
WHERE u.id = auth.uid();
```

Se `role` não for `owner`, `admin` ou `administrador`, peça ao proprietário para alterar.

---

### Erro: "key_hash" não existe
**Causa:** Migração da tabela não foi aplicada.

**Solução:** Execute novamente `SETUP_API_KEYS_COMPLETO.sql` completo.

---

## 📁 Arquivos Relacionados

- `SETUP_API_KEYS_COMPLETO.sql` ← **Execute este**
- `src/pages/ApiKeys.tsx` ← Código do painel
- `supabase/migrations/20251115_add_api_keys_functionality.sql` ← Migração original
- `docs/FIX_RPC_404.md` ← Documentação do erro 404

---

## ✅ Checklist Final

- [ ] Executei `SETUP_API_KEYS_COMPLETO.sql` no Supabase SQL Editor
- [ ] Vi os 4 resultados de verificação (função, tabela, políticas, teste)
- [ ] Limpei o cache do browser (Ctrl+Shift+R)
- [ ] Testei criar uma chave no painel como owner/admin
- [ ] Chave foi criada com sucesso e apareceu no modal

**Se todos os itens estão ✅, o sistema está funcionando!**
