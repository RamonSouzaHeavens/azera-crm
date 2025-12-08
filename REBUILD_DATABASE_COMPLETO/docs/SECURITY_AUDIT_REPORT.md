# 🚨 Security Audit Report — Azera CRM

**Data**: 15 Nov 2025  
**Status**: ⚠️ CRÍTICO — Senha admin hardcoded

---

## 🔴 Vulnerabilidades Encontradas

### 1. ⚠️ CRÍTICO — Hardcoded Admin Password

**Localização**: `src/stores/authStore.ts:394`

```typescript
if (email === 'admin' && password === 'admintaco1234') {
  // Criar sessão admin bypass
}
```

**Risco**: Qualquer pessoa com acesso ao código (público ou git) pode acessar como admin.

**Exposto em**:
- `src/stores/authStore.ts` (código)
- `src/pages/Login.tsx` (exibido como "Demo Admin")
- `README.md` (documentação pública)
- `dist/assets/index-*.js` (bundle produção)

**Solução IMEDIATA**:
- Remover a linha de hardcoded admin
- Se precisar de admin demo → usar Supabase Auth demo account
- Remover do README public
- Remover do Login.tsx (não mostrar senha)

---

### 2. ✅ BOAS NOTÍCIAS

**Nenhuma outra chave sensível encontrada**:
- ❌ Não há `SERVICE_ROLE_KEY` no frontend (bom!)
- ❌ Não há Stripe secret key no frontend (bom!)
- ✅ Apenas `VITE_SUPABASE_ANON_KEY` (esperado e seguro)
- ✅ `.env.example` não existe (git não expõe)

---

## 📋 Checklist de Segurança

| Item | Status | Nota |
|------|--------|------|
| Hardcoded admin password | 🔴 CRÍTICO | Remover `admintaco1234` |
| Service role em frontend | ✅ OK | Não encontrado |
| Stripe key em frontend | ✅ OK | Não encontrado |
| .env exposto | ✅ OK | Não encontrado |
| Anon key apenas | ✅ OK | Esperado |
| README com secrets | 🟡 AVISO | Atualizar |
| Login mostra demo pwd | 🟡 AVISO | Remover ou mascarar |

---

## ✅ Solução (2 minutos)

### Passo 1: Remover de `authStore.ts`

```diff
- if (email === 'admin' && password === 'admintaco1234') {
-   // bypass admin
- }
```

### Passo 2: Remover de `Login.tsx`

Encontre e delete:
```
<strong className="text-slate-200">Demo Admin:</strong> admin / admintaco1234
```

### Passo 3: Atualizar `README.md`

Remover ou substitui por:
```
Demo: Usar Supabase auth ou pedir acesso ao admin
```

### Passo 4: Rebuild

```bash
npm run build
```

---

## 🎯 Status: PRONTO PARA EXECUÇÃO

Esse é um fix de 2 minutos que fecha a maior brecha de segurança.
