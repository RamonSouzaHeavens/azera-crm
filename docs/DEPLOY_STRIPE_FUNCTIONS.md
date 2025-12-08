# Deploy das Edge Functions Stripe - Guia Rápido

## Problema Atual
CORS error ao chamar `stripe-checkout` — a função precisa de secrets adicionais do Supabase.

## Secrets Necessários (adicione no Dashboard do Supabase)

Você já tem no painel:
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_WEBHOOK_SECRET  
- ✅ SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_ROLE_KEY)

**Adicione estes (se ainda não existirem):**

```bash
SUPABASE_URL=https://hdmesxrurdrhmcujospv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<valor do SERVICE_ROLE_KEY que você já tem>
SITE_URL=https://azera.space (ou http://localhost:5173 para dev)
```

### Como adicionar via Dashboard
1. Supabase Dashboard → Project → Settings → Edge Functions → Secrets
2. Clique em "Add secret"
3. Nome: `SUPABASE_URL`, Valor: `https://hdmesxrurdrhmcujospv.supabase.co`
4. Repita para `SUPABASE_ANON_KEY` (copie do `.env` local ou Dashboard → API)
5. Repita para `SUPABASE_SERVICE_ROLE_KEY` (copie do painel de secrets existente)
6. Adicione `SITE_URL=https://azera.space`

### Como adicionar via CLI (alternativa)
```powershell
supabase secrets set SUPABASE_URL=https://hdmesxrurdrhmcujospv.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<valor>
supabase secrets set SITE_URL=https://azera.space
```

## Deploy das Funções

Após adicionar os secrets, faça deploy das 3 funções:

```powershell
cd "e:\Agência\Gold Age\Azera\CRM Azera"

# Deploy das funções
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook
```

## Verificar Deploy

```powershell
# Listar funções deployadas
supabase functions list

# Ver logs em tempo real
supabase functions logs --name stripe-checkout
```

## Testar Novamente

1. Após deploy, recarregue a página http://localhost:5173/subscribe
2. Clique em "Assinar Agora"
3. Deve redirecionar para Stripe Checkout sem erro de CORS

## Se o erro persistir

Verifique se a função retorna status 200 no OPTIONS:
```bash
curl -X OPTIONS https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/stripe-checkout \
  -H "Access-Control-Request-Method: POST" \
  -H "Origin: http://localhost:5173"
```

Deve retornar headers CORS com status 200.
