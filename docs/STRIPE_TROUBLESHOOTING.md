# 🔧 Stripe Integration Troubleshooting Guide

**Data**: 2025-12-02
**Status**: Resolução de Erros Críticos

---

## 🚨 Erros Identificados

### 1. Stripe Price ID Inválido (404)
```
[Stripe] Erro ao buscar preço price_1SYIXUDrBNWAl6ByAdphz72j: 500 {"error":"Stripe API error: 404"}
```

**Causa**: O Price ID configurado não existe na sua conta Stripe.

**Solução**:

#### Passo 1: Verificar Price IDs na Stripe

1. Acesse: https://dashboard.stripe.com/products
2. Para cada produto, clique para ver detalhes
3. Copie o **Price ID** (formato: `price_xxxxxxxxxxxxx`)

#### Passo 2: Configurar Variáveis de Ambiente

Você precisa configurar os Price IDs corretos. Existem duas opções:

**Opção A: Usar Supabase Secrets (Recomendado para Produção)**

```bash
# Navegue até o diretório do projeto
cd "e:\Agência\Gold Age\Azera\CRM Azera"

# Configure os secrets no Supabase
npx supabase secrets set VITE_STRIPE_PRICE_MENSAL=price_SEU_ID_MENSAL
npx supabase secrets set VITE_STRIPE_PRICE_SEMESTRAL=price_SEU_ID_SEMESTRAL
npx supabase secrets set VITE_STRIPE_PRICE_ANUAL=price_SEU_ID_ANUAL
```

**Opção B: Criar arquivo .env.local (Desenvolvimento)**

Crie o arquivo `e:\Agência\Gold Age\Azera\CRM Azera\.env.local`:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_ou_pk_live_XXXXXXXX
VITE_STRIPE_SECRET_KEY=sk_test_ou_sk_live_XXXXXXXX

# Price IDs - Substitua pelos IDs reais da sua conta Stripe
VITE_STRIPE_PRICE_MENSAL=price_XXXXXXXXXXXXXXX
VITE_STRIPE_PRICE_SEMESTRAL=price_XXXXXXXXXXXXXXX
VITE_STRIPE_PRICE_ANUAL=price_XXXXXXXXXXXXXXX

# Price IDs de Teste (Opcional)
VITE_STRIPE_PRICE_MENSAL_TEST=price_XXXXXXXXXXXXXXX
VITE_STRIPE_PRICE_SEMESTRAL_TEST=price_XXXXXXXXXXXXXXX
VITE_STRIPE_PRICE_ANUAL_TEST=price_XXXXXXXXXXXXXXX
```

#### Passo 3: Reiniciar o Servidor de Desenvolvimento

```bash
# Pare o servidor atual (Ctrl+C)
# Reinicie
npm run dev
```

---

### 2. Stripe Sync Subscription Failures (500)

```
stripe-sync-subscription:1 Failed to load resource: the server responded with a status of 500 ()
```

**Causa**: A Edge Function está tentando sincronizar subscriptions mas encontra erros.

**Solução**:

#### Verificar Logs da Edge Function

```bash
# Ver logs em tempo real
npx supabase functions logs stripe-sync-subscription --follow
```

#### Verificar Configuração do Supabase

Certifique-se de que as seguintes variáveis estão configuradas no Supabase:

1. Acesse: https://supabase.com/dashboard/project/SEU_PROJETO/settings/api
2. Vá em **Edge Functions** → **Secrets**
3. Adicione:
   - `STRIPE_SECRET_KEY`: sua chave secreta da Stripe
   - `SUPABASE_URL`: URL do seu projeto
   - `SUPABASE_SERVICE_ROLE_KEY`: chave de serviço

---

### 3. Profiles 403 Error

```
profiles?on_conflict=id:1 Failed to load resource: the server responded with a status of 403 ()
```

**Causa**: Política RLS (Row Level Security) bloqueando acesso à tabela profiles.

**Solução**:

#### Verificar Políticas RLS

Execute no SQL Editor do Supabase:

```sql
-- Ver políticas atuais
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Se necessário, criar política de leitura
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Se necessário, criar política de atualização
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

---

## 🛠️ Solução Temporária: Desabilitar Busca de Preços da Stripe

Se você quiser que o site funcione enquanto configura a Stripe, pode usar os preços fixos do código:

### Modificar `stripeService.ts`

Comente a busca de preços da Stripe temporariamente:

```typescript
// Em getAvailablePlans(), comente estas linhas:
/*
try {
  const priceIds = Object.values(STRIPE_PRICE_IDS).filter(Boolean)
  if (priceIds.length > 0) {
    stripePrices = await getPricesFromStripe(priceIds)
  }
} catch (error) {
  console.error('[getAvailablePlans] Erro ao buscar preços da Stripe:', error)
}
*/
```

Isso fará o sistema usar os preços padrão definidos em `plans.ts`.

---

## ✅ Checklist de Configuração Completa

### Stripe Dashboard
- [ ] Produtos criados no Stripe
- [ ] Price IDs copiados
- [ ] Chaves de API copiadas (Publishable e Secret)
- [ ] Webhook configurado (se aplicável)

### Configuração Local
- [ ] Arquivo `.env.local` criado com todas as variáveis
- [ ] Price IDs corretos configurados
- [ ] Servidor reiniciado após mudanças

### Supabase
- [ ] Secrets configurados nas Edge Functions
- [ ] Políticas RLS verificadas na tabela `profiles`
- [ ] Tabela `subscriptions` existe e está configurada

### Testes
- [ ] Página de pricing carrega sem erros 404
- [ ] Console não mostra erros de Stripe
- [ ] Preços são exibidos corretamente

---

## 🔍 Como Verificar se Está Funcionando

### 1. Verificar Variáveis de Ambiente

Adicione temporariamente no console do navegador:

```javascript
console.log('Stripe Config:', {
  hasPublishableKey: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  hasMonthlyPrice: !!import.meta.env.VITE_STRIPE_PRICE_MENSAL,
  hasSemiannualPrice: !!import.meta.env.VITE_STRIPE_PRICE_SEMESTRAL,
  hasAnnualPrice: !!import.meta.env.VITE_STRIPE_PRICE_ANUAL
})
```

### 2. Verificar Logs do Console

Após reiniciar, você deve ver:

```
[Pricing] Buscando preços da Stripe... ["price_XXX", "price_YYY", "price_ZZZ"]
[Pricing] Preços carregados da Stripe: {monthly: 49.90, semiannual: 269.90, annual: 479.90}
```

**NÃO** deve aparecer:

```
[Stripe] Erro ao buscar preço price_XXX: 500 {"error":"Stripe API error: 404"}
```

---

## 🆘 Ainda com Problemas?

### Opção 1: Criar Produtos de Teste na Stripe

Se você ainda não tem produtos configurados:

1. Acesse: https://dashboard.stripe.com/test/products
2. Clique em **"+ Add product"**
3. Crie 3 produtos:
   - **Mensal**: R$ 49,90/mês
   - **Semestral**: R$ 269,90 a cada 6 meses
   - **Anual**: R$ 479,90/ano
4. Copie os Price IDs e configure no `.env.local`

### Opção 2: Usar Modo Fallback

O código já tem valores padrão. Se você não configurar os Price IDs, ele usará:
- Mensal: R$ 49,90
- Semestral: R$ 269,90
- Anual: R$ 479,90

Mas você **não poderá processar pagamentos** sem configurar a Stripe corretamente.

---

## 📞 Próximos Passos

1. **Imediato**: Configure os Price IDs corretos no `.env.local`
2. **Curto Prazo**: Configure os Supabase Secrets para produção
3. **Médio Prazo**: Configure webhooks da Stripe
4. **Longo Prazo**: Implemente testes automatizados de pagamento

---

## 📚 Documentação Relacionada

- [STRIPE_SETUP_PRODUCAO.md](./STRIPE_SETUP_PRODUCAO.md) - Setup completo da Stripe
- [DEPLOY_STRIPE_FUNCTIONS.md](./DEPLOY_STRIPE_FUNCTIONS.md) - Deploy das Edge Functions
- [Stripe Dashboard](https://dashboard.stripe.com) - Gerenciar produtos e preços
