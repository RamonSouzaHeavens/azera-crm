-- =====================================================
-- DIAGNÓSTICO COMPLETO - PROBLEMA STRIPE SUBSCRIPTION
-- =====================================================

## PROBLEMAS IDENTIFICADOS

### 1. CORS Error em stripe-sync-subscription
STATUS: CRÍTICO
- A função retorna 500 antes do OPTIONS ser processado
- O preflight request falha, bloqueando a chamada POST
- Causa: Secrets não configurados no Supabase

### 2. Status fica "incomplete" após checkout
STATUS: CRÍTICO
- Checkout é bem-sucedido (redireciona para /success)
- Mas stripe-sync-subscription falha ao sincronizar com Stripe
- A função syncStripeSubscription silencia o erro (linha 251: if (error) { return; })
- Sem sincronização, subscription fica com status "incomplete"

### 3. "Próxima Cobrança" mostra "Carregando..."
STATUS: CONSEQUÊNCIA
- Sem status correto, o frontend não consegue calcular próxima cobrança
- Ver em SubscriptionStatus.tsx ou useSubscription hook

## SOLUÇÃO NECESSÁRIA

### PASSO 1: Configurar Secrets no Supabase Dashboard
Acesso: Project → Settings → Edge Functions → Secrets

Adicionar os seguintes secrets:
```
SUPABASE_URL=https://hdmesxrurdrhmcujospv.supabase.co
SUPABASE_ANON_KEY=(copiar do Dashboard → API → anon key)
SUPABASE_SERVICE_ROLE_KEY=(copiar do Dashboard → API → service_role key)
STRIPE_SECRET_KEY=(já deve estar presente)
STRIPE_WEBHOOK_SECRET=(já deve estar presente)
SITE_URL=http://localhost:5173 (para dev) ou https://azera.space (prod)
```

### PASSO 2: Fazer Deploy das Edge Functions
```powershell
cd "e:\Agência\Gold Age\Azera\CRM Azera"

# Deploy de stripe-checkout (já está funcionando, mas fazer redeploy)
supabase functions deploy stripe-checkout

# Deploy de stripe-sync-subscription (PRINCIPAL)
supabase functions deploy stripe-sync-subscription

# Deploy de stripe-portal (para customer portal)
supabase functions deploy stripe-portal

# (OPCIONAL) Deploy de stripe-webhook se houver
supabase functions deploy stripe-webhook
```

### PASSO 3: Verificar Deploy
```powershell
# Listar funções
supabase functions list

# Ver logs em tempo real
supabase functions logs --name stripe-sync-subscription --tail 100
```

### PASSO 4: Testar Fluxo Completo
1. Fazer logout total
2. Fazer login
3. Ir para /subscribe
4. Clicar em "Assinar Agora"
5. Completar checkout no Stripe (usar cartão de teste: 4242 4242 4242 4242)
6. Deve retornar para /success e carregar subscription corretamente

## ARQUIVOS ENVOLVIDOS

### Edge Functions:
- stripe-checkout: ✅ Funcionando (cria subscription com status "incomplete")
- stripe-sync-subscription: ❌ FALHANDO (não consegue sincronizar com Stripe)
- stripe-portal: ⚠️ Necessário para customer portal

### Frontend:
- src/stores/authStore.ts (linha 251): syncStripeSubscription silencia erros
- src/hooks/useSubscription.ts: Carrega dados da subscription
- src/pages/Subscribe.tsx: Inicia checkout
- src/components/SubscriptionStatus.tsx: Mostra status

## VERIFICAÇÃO TÉCNICA

Para confirmar que os secrets estão corretos:
```powershell
# Via CLI
supabase secrets list

# Deve retornar todos os secrets configurados
```

Para testar CORS:
```powershell
curl -X OPTIONS https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/stripe-sync-subscription `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type, authorization" `
  -H "Origin: http://localhost:5173"

# Deve retornar status 200 com headers CORS corretos
```

## PRÓXIMOS PASSOS

1. Adicionar todos os secrets no Supabase Dashboard
2. Fazer deploy das 3 funções Stripe
3. Recarregar página e testar assinatura completa
4. Verificar logs em tempo real: `supabase functions logs --name stripe-sync-subscription --tail 100`
5. Se ainda houver erro, compartilhar os logs aqui