# Incidente: API Keys — Passo a Passo de Correção (19/11/2025)

Breve: Ao validar chaves API estava ocorrendo erro 500 por mismatch de hash e erro SQL (ambiguidade). Segue registro passo-a-passo para recriar ou repetir a correção.

## Problema identificado
- Hash calculado no cliente não batia com o hash calculado no servidor (encoding/bytes).
- Função SQL `validate_api_key` tinha variável com mesmo nome da coluna (`key_hash`) gerando erro 42702.

## Arquivos alterados
- `src/pages/ApiKeys.tsx` — corrigido `btoa(String.fromCharCode(...randomBytes))` para conversão byte-a-byte; adicionado logs temporários no cliente:
  - `=== DEBUG CLIENT === chaveRaw (first20): ...`
  - `=== DEBUG CLIENT === keyHash: ...`
  - `=== DEBUG CLIENT === chaveRaw length: ...`
- `supabase/functions/api-leads/index.ts` — validação do header (trim + regex base64url), cálculo de SHA-256 com `TextEncoder`, logs de debug com prefixo `=== DEBUG SERVIDOR ===`, logs antes/depois da chamada RPC e ajuste de escopo de variáveis.
- `supabase/validate_api_key.sql` — renomeada variável para `v_key_hash`, uso de `encode(digest(input_key, 'sha256'),'hex')`, e adição de `RAISE NOTICE` temporários para debug (hash e `matches_count`).
- `test-api.js` (na raiz) — script Node para testar `list/read/move/update` e imprimir `Client-side SHA256`.

## Como aplicar as correções (passo-a-passo)
1. Atualize a função SQL no banco:
   - Copie o conteúdo de `supabase/validate_api_key.sql` e cole no SQL Editor do Supabase, execute.
   - Alternativa via psql/CLI: conectar ao banco e rodar `psql -f supabase/validate_api_key.sql`.
2. Faça o deploy da Edge Function modificada:
```powershell
cd "e:\Agência\Gold Age\Azera\CRM Azera"
supabase functions deploy api-leads --debug
```
3. Gere uma nova API Key via UI (IMPORTANTE: a chave RAW mostrada UMA VEZ deve ser copiada).
4. Teste com `test-api.js` ou via n8n/curl:
```powershell
$env:RAW_KEY="SUA_CHAVE_RAW_AQUI"
$env:TENANT_ID="SEU_TENANT_ID_AQUI"
node .\test-api.js
```
5. Verifique logs da função enquanto testa:
```powershell
supabase functions logs api-leads
```
- Procure por `=== DEBUG SERVIDOR === serverHash:` e pelos `RAISE NOTICE` do SQL (`DEBUG SQL === key_hash:` e `matches_count`).
6. Compare o `Client-side SHA256 (hex)` (do `test-api.js` ou console do browser) com o `serverHash` dos logs — devem bater.

## Limpeza / Pós-validação (quando estiver OK em produção)
- Remover todos os `console.log` do cliente e `RAISE NOTICE` do SQL.
- Remover/limitar logs sensíveis em produção (mostrar apenas primeiros 10-20 chars quando necessário).
- Criar índices (se ainda não existirem):
```sql
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys (tenant_id);
```
- Validar políticas RLS e permissões (teste com chaves com `leads.read` apenas e chaves com `leads.write`).

---

Arquivo criado automaticamente pelo time de manutenção em 19/11/2025.
