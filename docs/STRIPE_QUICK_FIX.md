# 🚀 Quick Fix - Stripe Integration Errors

## ❌ Current Errors

```
[Stripe] Erro ao buscar preço price_1SYIXUDrBNWAl6ByAdphz72j: 500 {"error":"Stripe API error: 404"}
stripe-sync-subscription: Failed to load resource: 500
profiles?on_conflict=id: Failed to load resource: 403
```

## ✅ Immediate Solution

### Step 1: Create `.env.local` file

Create a new file at the root of your project:

**File**: `e:\Agência\Gold Age\Azera\CRM Azera\.env.local`

```env
# Copy your actual Supabase credentials
VITE_SUPABASE_URL=https://hdmesxrurdrhmcujospv.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here

# Get these from: https://dashboard.stripe.com/apikeys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Get these from: https://dashboard.stripe.com/products
# Click on each product to see the Price ID
VITE_STRIPE_PRICE_MENSAL=price_XXXXXXXXXXXXXXXXXXXXXXXX
VITE_STRIPE_PRICE_SEMESTRAL=price_XXXXXXXXXXXXXXXXXXXXXXXX
VITE_STRIPE_PRICE_ANUAL=price_XXXXXXXXXXXXXXXXXXXXXXXX
```

### Step 2: Get Your Stripe Price IDs

1. **Go to**: https://dashboard.stripe.com/products
2. **If you don't have products yet**, create them:
   - Click **"+ Add product"**
   - Create 3 products:
     - **Mensal**: R$ 49,90/month (recurring monthly)
     - **Semestral**: R$ 269,90 every 6 months (recurring every 6 months)
     - **Anual**: R$ 479,90/year (recurring yearly)
3. **Copy the Price IDs** from each product (they look like `price_1ABC...`)
4. **Paste them** into your `.env.local` file

### Step 3: Restart Dev Server

```powershell
# Stop the current server (Ctrl+C in the terminal)
# Then restart:
npm run dev
```

### Step 4: Verify It's Working

Open the browser console and look for:

**✅ Success**:
```
[Stripe] ✅ Preço price_XXX encontrado: {...}
[Pricing] Preços carregados da Stripe: {monthly: 49.90, ...}
```

**❌ Still errors?** See `docs/STRIPE_TROUBLESHOOTING.md`

---

## 🔧 Alternative: Use Default Prices (Temporary)

If you want the app to work **right now** without Stripe configuration:

The app will automatically use default prices:
- Mensal: R$ 49,90
- Semestral: R$ 269,90
- Anual: R$ 479,90

**Note**: You won't be able to process actual payments until Stripe is properly configured.

---

## 📖 Full Documentation

- **Troubleshooting**: `docs/STRIPE_TROUBLESHOOTING.md`
- **Production Setup**: `docs/STRIPE_SETUP_PRODUCAO.md`
- **Template**: `.env.template`

---

## 🆘 Still Having Issues?

The improved error messages will now guide you:

```
[Stripe] ⚠️ Price ID "price_XXX" não encontrado na sua conta Stripe.
[Stripe] 💡 Verifique se o Price ID está correto em: https://dashboard.stripe.com/products
[Stripe] 📖 Veja docs/STRIPE_TROUBLESHOOTING.md para mais informações
```

Follow the links in the console messages!
