# 🚀 DEPLOYMENT - Instruções Completas

## 📋 Checklist Pré-Deploy

- [ ] Código compilado sem erros
- [ ] Testes locais passando
- [ ] Staging testado
- [ ] Migrations prontas
- [ ] Funções Deno testadas
- [ ] Documentação completa
- [ ] Backup do banco de dados

## 🔧 Passo 1: Executar Migração SQL

### Via Dashboard Supabase

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá para "SQL Editor"
4. Clique em "New Query"
5. Cole o conteúdo de: `supabase/migrations/020_criar_automacoes.sql`
6. Clique "Run"
7. Verifique sucesso (sem erros)

### Via CLI (Alternativa)

```bash
cd "e:\Agência\Gold Age\Azera\CRM Azera"
supabase db push
```

### Verificar Tabelas

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('automacoes', 'automacao_logs');

-- Resultado esperado:
-- automacoes
-- automacao_logs
```

## 🎯 Passo 2: Deploy da Função Serverless

### Via Supabase CLI

```bash
# Navigate to project
cd "e:\Agência\Gold Age\Azera\CRM Azera"

# Deploy function
supabase functions deploy webhook-processor
```

### Via Dashboard (Alternativa)

1. Vá para "Edge Functions"
2. Clique "+ Create Function"
3. Nome: `webhook-processor`
4. Cole código de: `supabase/functions/webhook-processor/index.ts`
5. Clique "Deploy"

### Testar Função

```bash
# Via CLI
supabase functions invoke webhook-processor --local

# Via HTTP
curl -X POST http://localhost:54321/functions/v1/webhook-processor \
  -H "Content-Type: application/json" \
  -d '{
    "automacao_id": "test-id",
    "dados": {"teste": true}
  }'
```

## 🏗️ Passo 3: Build da Aplicação

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Verificar Build
```bash
npm run preview
```

## 📦 Passo 4: Deploy no Servidor

### Opção 1: Vercel

```bash
# Login
vercel login

# Deploy
vercel deploy

# Produção
vercel deploy --prod
```

### Opção 2: Netlify

```bash
# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Opção 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

```bash
# Build
docker build -t azera-crm .

# Run
docker run -p 3000:3000 azera-crm
```

## 🔗 Passo 5: Verificar Integração

### 1. Acessar Menu
- [ ] Clique em "Automações" (⚡)
- [ ] Clique em "Documentação" (📖)
- [ ] Ambos devem carregar

### 2. Testar Automação
```
1. Vá para /automacoes
2. Clique "+ Nova Automação"
3. Preencha dados:
   - Nome: "Teste Deploy"
   - URL: "https://webhook.site/seu-id"
   - Tipo: Webhook
   - Evento: Manual
4. Clique "Testar"
5. Verifique sucesso em webhook.site
```

### 3. Testar Documentação
```
1. Vá para /documentacao
2. Como proprietário: deve ver conteúdo
3. Como vendedor: deve ver "Acesso Restrito"
```

### 4. Verificar Logs
```
1. Vá para /automacoes
2. Clique no card da automação
3. Veja histórico de logs
```

## 🔍 Passo 6: Monitoramento

### Verificar Saúde do Sistema

```sql
-- Verificar automações criadas
SELECT COUNT(*) FROM automacoes;

-- Verificar logs
SELECT * FROM automacao_logs ORDER BY created_at DESC LIMIT 10;

-- Verificar erros
SELECT * FROM automacao_logs 
WHERE status = 'erro' 
ORDER BY created_at DESC LIMIT 10;
```

### Monitorar Erros

```javascript
// No browser console
console.log('[Automações] Sistema carregado')

// Verificar no Sentry/LogRocket (se configurado)
// Logs devem ser capturados automaticamente
```

## 🚨 Troubleshooting Deploy

### Erro: "Tabelas não encontradas"
```
Solução:
1. Verifique migração foi executada
2. Confirme tabelas em "SQL Editor"
3. Regenere RLS policies se necessário
```

### Erro: "Função não encontrada"
```
Solução:
1. Verifique função foi deployada
2. Confirme nome: webhook-processor
3. Re-deploy: supabase functions deploy webhook-processor
```

### Erro: "Acesso Negado"
```
Solução:
1. Verifique RLS policies foram criadas
2. Confirme user autenticado
3. Verifique role do usuário
```

### Erro: "CORS"
```
Solução:
1. Configure CORS em seu webhook
2. Aceitar: Content-Type: application/json
3. Retornar 200 OK para sucesso
```

## 📊 Passo 7: Verificar Performance

### Testar Load Times

```bash
# Verificar Automações
curl -w "@curl-format.txt" -o /dev/null -s https://seu-site.com/automacoes

# Verificar Documentação (sem autenticação)
curl -w "@curl-format.txt" -o /dev/null -s https://seu-site.com/documentacao
```

### Monitorar Banco de Dados

```sql
-- Contar registros
SELECT 'automacoes' as tabela, COUNT(*) as total FROM automacoes
UNION ALL
SELECT 'automacao_logs', COUNT(*) FROM automacao_logs;

-- Verificar índices
SELECT * FROM pg_indexes 
WHERE tablename IN ('automacoes', 'automacao_logs');
```

## 🔐 Passo 8: Segurança

### Verificar Configurações

- [ ] HTTPS ativado
- [ ] CORS configurado corretamente
- [ ] RLS policies ativas
- [ ] Secrets não expostos
- [ ] Tokens rotativados

### Testar RLS

```sql
-- Como cliente (verificar que vê apenas seu tenant)
SELECT COUNT(*) FROM automacoes;

-- Resultado: deve ser ≤ 1 (apenas own tenant)
```

## 📱 Passo 9: Validar Responsividade

### Desktop
- [ ] Sidebar funciona
- [ ] Menu expande/colapsa
- [ ] Conteúdo legível
- [ ] Botões acessíveis

### Tablet
- [ ] Layout adaptado
- [ ] Touch-friendly
- [ ] Sem scroll horizontal

### Mobile
- [ ] Menu drawer
- [ ] Botões grandes
- [ ] Responsivo
- [ ] Sem problemas de zoom

## 🎯 Passo 10: Comunicar aos Usuários

### Email para Proprietários

```
Assunto: 🚀 Sistema de Automações Disponível

Olá [Nome],

O sistema de automações do Azera CRM está pronto!

✨ Novidades:
- Sistema de Webhooks e APIs
- Sincronização automática de dados
- Centro de Documentação completo

🚀 Como começar:
1. Vá para Menu → Automações
2. Clique "+ Nova Automação"
3. Teste com seu servidor
4. Leia a documentação em Menu → Documentação

📚 Saiba mais:
Acesse a documentação completa no painel para:
- Exemplos de código
- Guia de segurança
- Troubleshooting
- API Reference

❓ Dúvidas?
Consulte a documentação ou entre em contato.

Bom uso! 🎉
```

### Anúncio no Painel

```
Criar card no Dashboard:
"🎉 Novo: Sistema de Automações!"
"Configure webhooks e sincronize seus dados"
"Acesse em: Menu → Automações"
```

## 📈 Passo 11: Monitoramento Contínuo

### Configurar Alertas

```sql
-- Monitorar tentativas falhadas
SELECT COUNT(*) as falhas_recentes
FROM automacao_logs
WHERE status = 'erro'
AND created_at > now() - interval '1 hour';

-- Alerta se > 10 falhas em 1h
```

### Criar Dashboard

```
Métricas para monitorar:
- Automações ativas
- Total de execuções
- Taxa de sucesso
- Tempo médio
- Erro mais comum
```

## ✅ Passo 12: Validação Final

### Checklist de Conclusão

- [ ] Migração SQL executada
- [ ] Função Serverless deployada
- [ ] Build sem erros
- [ ] App em produção
- [ ] Menu atualizado
- [ ] Automações funcionando
- [ ] Documentação acessível
- [ ] Logs registrando
- [ ] Testes passando
- [ ] Usuários comunicados

## 🎉 Deploy Concluído!

Seu sistema de automações está pronto para uso em produção.

### Próximas Etapas

1. **Monitorar** - Verifique logs regularmente
2. **Educar** - Ensine usuários a usar
3. **Otimizar** - Ajuste conforme feedback
4. **Expandir** - Adicione mais integrações

### Suporte

Em caso de problemas:
1. Verifique erros nos logs
2. Consulte documentação
3. Verifique status do Supabase
4. Teste função Deno
5. Verifique conectividade

## 📞 Contato

Para suporte:
- Documentação: `/documentacao`
- Guia do Usuário: `docs/AUTOMACOES.md`
- Docs Técnicas: `docs/SISTEMA_AUTOMACOES.md`

---

**Status: ✅ PRONTO PARA PRODUÇÃO**

Sucesso no deployment! 🚀
