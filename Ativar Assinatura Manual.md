# 🔑 Ativar Assinatura Manual

Este documento contém os comandos SQL para ativar manualmente uma assinatura no banco de dados Supabase.

> ⚠️ **Execute estes comandos no Supabase Dashboard → SQL Editor**

---

## 📋 Status de Assinatura Válidos

| Status | Descrição | Acesso |
|--------|-----------|--------|
| `active` | Assinatura ativa | ✅ Liberado |
| `trialing` | Período de trial | ✅ Liberado |
| `past_due` | Pagamento atrasado | ❌ Bloqueado |
| `canceled` | Cancelada | ❌ Bloqueado |
| `incomplete` | Pagamento incompleto | ❌ Bloqueado |

---

## 1️⃣ Buscar o ID do Usuário

Primeiro, encontre o `user_id` do usuário que você quer ativar:

```sql
-- Buscar usuário pelo email
SELECT id, email, created_at
FROM auth.users
WHERE email = 'email@cliente.com';
```

---

## 2️⃣ Ativar Assinatura (Método Recomendado)

Substitua `'COLE_O_USER_ID_AQUI'` pelo ID do usuário encontrado no passo anterior:

```sql
-- 1. PRIMEIRO: Deletar qualquer subscription antiga do usuário (limpar)
DELETE FROM subscriptions
WHERE user_id = 'COLE_O_USER_ID_AQUI';

-- 2. DEPOIS: Inserir uma nova assinatura ativa
INSERT INTO subscriptions (
  user_id,
  status,
  current_period_start,
  current_period_end,
  stripe_subscription_id,
  stripe_customer_id,
  provider
) VALUES (
  'COLE_O_USER_ID_AQUI',                  -- UUID do usuário (de auth.users)
  'active',                                -- Status ativo
  NOW(),                                   -- Início agora
  NOW() + INTERVAL '1 year',               -- Válido por 1 ano
  'manual_' || gen_random_uuid()::text,    -- ID único para assinaturas manuais
  'manual_customer_' || gen_random_uuid()::text, -- Customer ID único
  'manual'                                 -- Provider manual
);
```

### ⏱️ Opções de Duração:
- `INTERVAL '30 days'` → 1 mês
- `INTERVAL '6 months'` → 6 meses
- `INTERVAL '1 year'` → 1 ano
- `INTERVAL '999 years'` → Vitalício (praticamente)

---

## 3️⃣ Script Automatizado (Tudo em Um)

Este script busca o usuário pelo email e ativa a assinatura automaticamente:

```sql
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'email@cliente.com';  -- 👈 ALTERE AQUI
  v_duracao INTERVAL := '1 year';        -- 👈 ALTERE A DURAÇÃO AQUI
BEGIN
  -- Busca o usuário pelo email
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Usuário com email "%" não encontrado', v_email;
  END IF;

  -- Deleta qualquer subscription antiga do usuário
  DELETE FROM subscriptions WHERE user_id = v_user_id;

  -- Insere nova subscription ativa
  INSERT INTO subscriptions (
    user_id,
    status,
    current_period_start,
    current_period_end,
    stripe_subscription_id,
    stripe_customer_id,
    provider
  )
  VALUES (
    v_user_id,
    'active',
    NOW(),
    NOW() + v_duracao,
    'manual_' || gen_random_uuid()::text,
    'manual_customer_' || gen_random_uuid()::text,
    'manual'
  );

  RAISE NOTICE '✅ Assinatura ativada para: % (user_id: %)', v_email, v_user_id;
  RAISE NOTICE '📅 Válida até: %', NOW() + v_duracao;
END $$;
```

---

## 4️⃣ Verificar Assinaturas Ativas

```sql
-- Listar todas as assinaturas com detalhes do usuário
SELECT
  s.id AS subscription_id,
  s.user_id,
  u.email,
  s.status,
  s.current_period_start,
  s.current_period_end,
  CASE
    WHEN s.current_period_end > NOW() THEN '✅ Válida'
    ELSE '❌ Expirada'
  END AS situacao,
  s.stripe_subscription_id
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
ORDER BY s.updated_at DESC;
```

---

## 5️⃣ Cancelar/Desativar Assinatura

```sql
-- Cancelar assinatura de um usuário
UPDATE subscriptions
SET status = 'canceled',
    canceled_at = NOW(),
    updated_at = NOW()
WHERE user_id = 'COLE_O_USER_ID_AQUI';
```

---

## 6️⃣ Estender Assinatura Existente

```sql
-- Adiciona mais tempo a uma assinatura existente
UPDATE subscriptions
SET current_period_end = current_period_end + INTERVAL '1 year',
    updated_at = NOW()
WHERE user_id = 'COLE_O_USER_ID_AQUI';
```

---

## 📝 Notas Importantes

1. **Assinaturas manuais** usam o prefixo `manual_` no `stripe_subscription_id` para diferenciá-las das assinaturas do Stripe.

2. **O sistema verifica** os status `active` ou `trialing` para liberar acesso às funcionalidades premium.

3. **Após ativar**, o usuário precisa fazer logout e login novamente para que a mudança seja refletida na interface.

4. **Para trial de 14 dias:**
```sql
-- Deletar subscription anterior (se existir)
DELETE FROM subscriptions WHERE user_id = 'USER_ID_AQUI';

-- Inserir trial
INSERT INTO subscriptions (
  user_id,
  status,
  current_period_start,
  current_period_end,
  trial_start,
  trial_end,
  stripe_subscription_id,
  stripe_customer_id,
  provider
)
VALUES (
  'USER_ID_AQUI',
  'trialing',
  NOW(),
  NOW() + INTERVAL '14 days',
  NOW(),
  NOW() + INTERVAL '14 days',
  'trial_' || gen_random_uuid()::text,
  'trial_customer_' || gen_random_uuid()::text,
  'manual'
);
```

---

## ⚠️ Troubleshooting: Assinatura Não Funciona

Se a assinatura foi criada mas o usuário ainda vê o "Premium Gate" (tela de bloqueio), verifique:

### 1. O campo `status` DEVE ser `active` ou `trialing`

> **Este é o campo mais importante!** O sistema ignora completamente `current_period_end` se o `status` não for válido.

```sql
-- Verificar o status atual
SELECT user_id, email, status, current_period_end
FROM subscriptions
JOIN auth.users ON auth.users.id = subscriptions.user_id
WHERE email = 'email@cliente.com';
```

Se o status estiver como `canceled`, `incomplete`, `past_due` ou qualquer outro valor:

```sql
-- Corrigir o status para ativo
UPDATE subscriptions
SET status = 'active', updated_at = NOW()
WHERE user_id = 'USER_ID_AQUI';
```

### 2. Verificar se o `user_id` está correto

O `user_id` na tabela `subscriptions` DEVE corresponder exatamente ao `id` do usuário na tabela `auth.users`.

```sql
-- Comparar IDs
SELECT
  u.id AS auth_user_id,
  u.email,
  s.user_id AS subscription_user_id,
  s.status
FROM auth.users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.email = 'email@cliente.com';
```

### 3. Forçar atualização no frontend

Após corrigir no banco:
1. Fazer **logout** no app
2. Fazer **login** novamente
3. Ou pressionar **F5** para recarregar a página

---

*Documento atualizado em: 22/12/2024*
*Azera CRM - Sistema de Gerenciamento de Assinaturas*
