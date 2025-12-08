# 📖 Documentação Central - Todas as APIs

## 🚀 Bem-vindo ao Guia de Integração do Azera CRM!

Aqui você encontra tudo o que precisa para integrar o Azera CRM com sistemas externos usando APIs e webhooks.

---

## 📚 Começar Aqui

### 1️⃣ **Aprenda o Básico**
Se você é novo em requisições HTTP:
→ Leia: [`GUIA_REQUISICOES_HTTP.md`](./GUIA_REQUISICOES_HTTP.md)

**O que você vai aprender:**
- O que é uma requisição HTTP
- Como usar cURL
- Exemplos passo a passo
- Dicas de segurança

---

## 🔌 APIs Disponíveis

### 📦 **API de Produtos**
📄 Arquivo: [`API_PRODUTOS_N8N.md`](./API_PRODUTOS_N8N.md)

**Use para:**
- ✅ Criar novos produtos
- ✅ Atualizar preços e dados
- ✅ Sincronizar com N8N/Zapier

**Endpoint:**
```
POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos
```

**Exemplo:**
```bash
curl -X POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "tenant_id": "seu-tenant-id",
    "produto": {
      "nome": "Apartamento Centro",
      "preco": 450000
    }
  }'
```

---

### 👥 **API de Leads - Esteira (Pipeline)**
📄 Arquivo: [`API_LEADS_ESTEIRA.md`](./API_LEADS_ESTEIRA.md)

**Use para:**
- ✅ Criar novos leads
- ✅ Mover leads entre estágios
- ✅ Atualizar dados do lead
- ✅ Sincronizar com CRM externo

**Endpoint:**
```
POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads
```

**Exemplo - Criar Lead:**
```bash
curl -X POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "tenant_id": "seu-tenant-id",
    "data": {
      "nome": "João Silva",
      "email": "joao@email.com",
      "telefone": "+55 11 99999-9999"
    }
  }'
```

**Exemplo - Mover Lead:**
```bash
curl -X POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads \
  -H "Content-Type: application/json" \
  -d '{
    "action": "move",
    "tenant_id": "seu-tenant-id",
    "lead_id": "uuid-do-lead",
    "stage_id": "uuid-da-etapa"
  }'
```

**Exemplo - Atualizar Lead:**
```bash
curl -X POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "tenant_id": "seu-tenant-id",
    "lead_id": "uuid-do-lead",
    "data": {
      "email": "novo@email.com",
      "valor_potencial": 150000
    }
  }'
```

---

### 🔗 **Sistema de Automações (Webhooks)**
📄 Arquivo: [`AUTOMACOES.md`](./AUTOMACOES.md)

**Use para:**
- ✅ Disparar ações quando algo acontece (criar produto, atualizar lead, etc)
- ✅ Sincronizar dados em tempo real
- ✅ Integrar com N8N, Zapier, Make.com

**Configurar no CRM:**
1. Vá em Menu → Automações
2. Clique "+ Nova Automação"
3. Configure webhook/API
4. Selecione entidade e evento
5. Teste com ⚡

---

## 🎯 Workflows Prontos

### **Workflow 1: Importar Produtos do Excel**
📄 Arquivo: [`WORKFLOW_N8N_EXEMPLO.md`](./WORKFLOW_N8N_EXEMPLO.md)

**Passo a passo:**
1. Carregar Excel
2. Transformar dados
3. Criar produtos em lote
4. Notificar equipe

### **Workflow 2: Sincronizar com HubSpot**
**Conceito:**
```
HubSpot → N8N → API Azera CRM
Deal criado → Mover lead → Atualizar no CRM
```

### **Workflow 3: Importar de Google Sheets**
**Conceito:**
```
Google Sheets → N8N → API Azera CRM
Linha adicionada → Criar produto/lead → Sincronizado
```

---

## 🛠️ Ferramentas Recomendadas

### **Para Testar APIs**
- **cURL** (Linha de comando) ⭐ Recomendado
- **Postman** (Interface visual)
- **Insomnia** (Moderno e fácil)
- **REST Client** (Extensão VS Code)

### **Para Automatizar**
- **N8N** (Aberto, auto-hospedado) ⭐ Recomendado
- **Zapier** (SaaS, mais simples)
- **Make.com** (Alternativa Zapier)
- **IFTTT** (Simples, básico)

---

## 🔑 Como Obter IDs Importantes

### **tenant_id** (ID da sua equipe)
```sql
SELECT id, name FROM tenants WHERE owner_id = auth.uid();
```
Ou no CRM: Configurações → Minha Equipe → ID

### **lead_id** (ID do lead)
```sql
SELECT id, nome FROM clientes WHERE tenant_id = 'seu-tenant-id';
```

### **stage_id** (ID da etapa da pipeline)
```sql
SELECT id, label FROM pipeline_stages WHERE tenant_id = 'seu-tenant-id';
```

### **produto_id** (ID do produto)
```sql
SELECT id, nome FROM produtos WHERE tenant_id = 'seu-tenant-id';
```

---

## 📊 Estrutura das Respostas

### **Resposta de Sucesso**
```json
{
  "success": true,
  "action": "create",
  "produto": {
    "id": "uuid...",
    "nome": "...",
    "created_at": "2025-11-12T..."
  }
}
```

### **Resposta de Erro**
```json
{
  "error": "Mensagem do erro",
  "details": "Detalhes técnicos"
}
```

**Códigos HTTP:**
- ✅ `200` - Sucesso
- ⚠️ `400` - Erro de validação
- ❌ `404` - Não encontrado
- 🔴 `500` - Erro do servidor

---

## 🔐 Segurança

### ✅ **Boas Práticas**
1. Use HTTPS sempre (nunca HTTP em produção)
2. Valide todos os dados antes de enviar
3. Use variáveis de ambiente para IDs sensíveis
4. Teste em ambiente de desenvolvimento primeiro
5. Monitore logs de execução

### ❌ **Evite**
1. Não coloque senhas/tokens em scripts
2. Não valide apenas no cliente (valide no servidor)
3. Não use HTTP em produção
4. Não deixe credenciais em repositórios Git

---

## 🚨 Troubleshooting Comum

### **Erro: "Tenant não encontrado"**
```
Solução: Verifique o tenant_id está correto
SQL: SELECT id FROM tenants;
```

### **Erro: "Lead não encontrado"**
```
Solução: Verifique lead_id e que pertence ao tenant
SQL: SELECT id FROM clientes WHERE tenant_id = '...';
```

### **Erro: "Campos não permitidos"**
```
Solução: Use apenas campos permitidos
Ver: docs/API_LEADS_ESTEIRA.md
```

### **cURL não funciona**
```
Solução (PowerShell):
Use aspas duplas e escape correto
Ou use arquivo .http com REST Client
```

---

## 📈 Performance & Limites

- **Rate Limit**: ~1000 requisições/minuto
- **Timeout**: 30 segundos por requisição
- **Payload Máximo**: 1MB
- **Recomendação**: Use batch processing para grandes volumes

---

## 🎓 Aprenda Mais

### **Conceitos Importantes**
- HTTP Methods (GET, POST, PUT, DELETE, PATCH)
- Headers e como usá-los
- JSON format
- REST API principles
- Autenticação e autorização

### **Recursos Externos**
- [cURL Documentation](https://curl.se/docs/)
- [HTTP Status Codes](https://httpwg.org/specs/rfc7231.html#status.codes)
- [JSON Format](https://www.json.org/)
- [REST API Best Practices](https://restfulapi.net/)

---

## 🗂️ Índice Completo de Documentação

```
docs/
├── INDEX.md (você está aqui!)
├── GUIA_REQUISICOES_HTTP.md ⭐ Começar aqui
├── API_PRODUTOS_N8N.md
├── API_LEADS_ESTEIRA.md
├── AUTOMACOES.md
├── WORKFLOW_N8N_EXEMPLO.md
├── COMO_FUNCIONA_AUTOMACOES.md
└── ... (mais documentos)
```

---

## ✅ Checklist para Começar

- [ ] Entender o que é HTTP (GUIA_REQUISICOES_HTTP.md)
- [ ] Obter IDs (tenant_id, lead_id, stage_id)
- [ ] Testar primeira requisição com cURL
- [ ] Verificar resposta (success: true)
- [ ] Integrar com N8N (opcional)
- [ ] Criar workflow automático (opcional)
- [ ] Monitorar logs regularmente

---

## 🆘 Precisa de Ajuda?

1. **Consulte a documentação** - Provavelmente tem resposta aqui
2. **Veja exemplos práticos** - GUIA_REQUISICOES_HTTP.md tem muitos
3. **Teste com cURL** - Sempre comece simples
4. **Verifique IDs** - A maioria dos erros é por ID incorreto
5. **Leia mensagens de erro** - São bem descritivas

---

## 🚀 Próximos Passos

1. Leia `GUIA_REQUISICOES_HTTP.md`
2. Escolha uma API (Produtos ou Leads)
3. Faça sua primeira requisição com cURL
4. Veja o resultado no CRM
5. Integre com N8N (opcional)
6. Automatize! 🎉

---

**Bom aprendizado e bom uso do Azera CRM!** 💪

*Última atualização: 12 de novembro de 2025*