# 🔐 Guia de Setup Stripe para Produção

**Status**: Integração Completa  
**Data**: 15 Nov 2025

---

## 🚀 Pré-Requisitos

1. **Conta Stripe**: https://dashboard.stripe.com
2. **CLI Stripe** (opcional mas recomendado):
   ```bash
   brew install stripe/stripe-cli/stripe  # macOS
   # ou choco install stripe-cli.portable (Windows)
   ```
3. **Node.js + npm** já instalados

---

## 📋 Setup Passo-a-Passo

### 1️⃣ Criar Produtos e Preços no Stripe

1. Acesse https://dashboard.stripe.com/products
2. Clique **"+ Add product"**
3. Para cada plano (Starter, Professional, Enterprise):
   - **Name**: ex. "Azera CRM - Starter"
   - **Pricing**: Selecione "Recurring"
   - **Price**: R$ 99, 299, 999 (dependendo do plano)
   - **Billing period**: Monthly
4. Copie o **Price ID** de cada plano
5. Guarde os IDs:
   ```
   VITE_STRIPE_PRICE_ID_STARTER=price_xxxxx
   VITE_STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxx
   VITE_STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
   ```

### 2️⃣ Obter Chaves de API

1. Acesse https://dashboard.stripe.com/apikeys
2. Copie:
   - **Publishable key** (começa com `pk_live_`)
   - **Secret key** (começa com `sk_live_`)
3. Adicione ao `.env`:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   VITE_STRIPE_SECRET_KEY=sk_live_xxxxx
   ```

### 3️⃣ Criar Edge Function para Checkout

A Edge Function já está criada em `supabase/functions/stripe-create-checkout/index.ts` (criar se não existir):

```typescript
import Stripe from 'https://esm.sh/stripe@latest?target=deno&deno-std=0.140.0'

export async function handleStripeCheckout(
  priceId: string,
  email: string,
  tenantId: string
) {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${Deno.env.get('VITE_SUPABASE_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${Deno.env.get('VITE_SUPABASE_URL')}/subscription`,
    metadata: {
      tenantId,
    },
  })

  return session
}
```

### 4️⃣ Configurar Webhooks

1. Acesse https://dashboard.stripe.com/webhooks
2. Clique **"+ Add endpoint"**
3. **URL**: `https://seu-dominio.com/api/webhooks/stripe`
4. **Events**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copie o **Webhook Secret** (começa com `whsec_`)
6. Adicione ao `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### 5️⃣ Criar Webhook Handler

Criar arquivo `supabase/functions/stripe-webhook/index.ts`:

```typescript
import Stripe from 'https://esm.sh/stripe@latest'

export async function handleWebhook(req: Request) {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  )

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      // Atualizar subscription no banco
      break
    case 'customer.subscription.deleted':
      // Marcar como cancelado
      break
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
```

### 6️⃣ Adicionar Colunas no Banco

Executar SQL no Supabase:

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_stripe_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan_name VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_price_per_month INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_auto_renew BOOLEAN DEFAULT TRUE;
```

---

## 🧪 Teste Local com Stripe CLI

```bash
# 1. Instalar e fazer login
stripe login

# 2. Começar a escutar webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 3. Simular evento
stripe trigger charge.succeeded

# 4. Ver logs
stripe logs tail
```

---

## 💳 Fluxo de Checkout

1. Usuário clica em **"Escolher Plano"**
2. Chama `createCheckoutSession(tenantId, priceId, email)`
3. Redireciona para Stripe Checkout
4. Usuário completa pagamento
5. Webhook `customer.subscription.created` dispara
6. Sistema atualiza `subscription_status = 'active'`
7. Usuário redireciona para dashboard

---

## ⚠️ Auto-Logout por Expiração

1. Hook `useSubscriptionExpiration()` roda a cada 5 min
2. Verifica se `subscription_status` = 'expired' ou 'canceled'
3. Se expirou: chama `handleSubscriptionExpiration()`
4. Faz logout e redireciona para `/login?reason=subscription_expired`

---

## 🔧 Troubleshooting

### "Webhook não chegou"
```bash
# Verificar logs do Stripe
stripe logs tail

# Verificar endpoint
curl -X POST https://seu-dominio/api/webhooks/stripe \
  -H "stripe-signature: ..." \
  -d '{"type": "charge.succeeded"}'
```

### "Checkout redireciona para erro"
- Verificar `VITE_STRIPE_PUBLISHABLE_KEY` está correto
- Verificar `success_url` é acessível
- Testar com `stripe trigger charge.succeeded`

### "Subscription não atualiza no banco"
- Webhook secret errado
- Edge Function não deployada
- Permissões RLS bloqueando update

---

## 📊 Monitoramento

### Verificar Assinaturas Ativas
```sql
SELECT COUNT(*) FROM tenants WHERE subscription_status = 'active';
```

### Ver Receita Mensal
```sql
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as new_subscriptions,
  SUM(subscription_price_per_month) as total_revenue
FROM tenants
WHERE subscription_status IN ('active', 'trialing')
GROUP BY month
ORDER BY month DESC;
```

### Alertas Importantes
- ⚠️ Se `webhook_failed` > 5: investigar URL do webhook
- ⚠️ Se `failed_payments` > 10%: notificar clientes
- ⚠️ Se `churn_rate` > 5%: análise de retenção

---

## 🚀 Deploy em Produção

1. **Certificar-se que:**
   - Todas as env vars estão no Vercel/seu host
   - Stripe keys são `pk_live_` e `sk_live_` (não test)
   - Webhook URL aponta para domínio de produção
   - RLS policies estão ativas
   - Migrations executadas

2. **Fazer teste completo:**
   ```bash
   # Criar assinatura de teste
   curl -X POST $VITE_SUPABASE_URL/functions/v1/stripe-create-checkout \
     -H "Authorization: Bearer $ANON_KEY" \
     -d '{"priceId": "price_xxxxx", "email": "test@example.com", "tenantId": "tenant_id"}'
   ```

3. **Monitorar:**
   - Dashboard Stripe: https://dashboard.stripe.com
   - Logs Supabase: Edge Functions
   - Sentry/LogRocket: Erros do frontend

---

## 📞 Suporte Stripe

- **Documentação**: https://stripe.com/docs
- **CLI Docs**: https://stripe.com/docs/stripe-cli
- **Dashboard**: https://dashboard.stripe.com
- **Status**: https://status.stripe.com
