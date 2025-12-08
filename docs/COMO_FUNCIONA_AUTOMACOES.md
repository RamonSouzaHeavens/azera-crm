# 🚀 Como Funciona a Aba de Automações

## 📋 Visão Geral

A aba **Automações** é o centro de controle para gerenciar webhooks e APIs que sincronizam seus dados com sistemas externos. Você pode:

- ✅ **Criar automações** para enviar dados em tempo real
- ✅ **Testar webhooks** antes de ativar
- ✅ **Monitorar execuções** com logs detalhados
- ✅ **Gerenciar ativas/inativas** sem deletar
- ✅ **Ver histórico** de tentativas (sucesso/erro)

## 🎯 Fluxo Principal

```
┌─────────────────────────┐
│   Ir em Automações      │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Clicar "+ Nova"         │
└────────────┬────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Preencher Dados:                        │
│ - Nome (obrigatório)                    │
│ - URL (obrigatório)                     │
│ - Tipo: webhook ou API                  │
│ - Entidade: produtos/leads/imóveis      │
│ - Evento: criação/atualização/deleção   │
│ - Headers (opcional, JSON)              │
│ - Body Template (opcional)              │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Salvar Automação                        │
│ (Criada com Status = ATIVA por padrão)  │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Clicar ⚡ "Testar" para validar         │
│ (Envia dados fake para seu endpoint)    │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Ver Resultado:                          │
│ ✅ Sucesso: webhook funcionando!        │
│ ❌ Erro: ajustar URL ou headers         │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Sistema está pronto! Quando alguém:     │
│ • Criar um produto                      │
│ • Atualizar um produto                  │
│ • Deletar um produto                    │
│ → Seus webhooks executam automaticamente│
└─────────────────────────────────────────┘
```

## 🎨 Interface da Aba

### **Header**
```
[⚡] Automações
    "Sincronize seus dados com webhooks e APIs"
    [+ Nova Automação]  [🔄 Atualizar]
```

### **Filtros**
```
[Todos]  [Ativos]  [Inativos]
```
- Filtra automações por status
- Útil quando você tem muitas automações

### **Cards de Automação**
```
┌──────────────────────────────────────┐
│  Nome: Sincronizar com N8N           │
│  🔗 https://webhook.site/...         │
│  📍 Tipo: Webhook                    │
│  🎯 Entidade: produtos               │
│  📌 Evento: criação                  │
│                                      │
│  Status: ✅ ATIVO                    │
│  Último: ✅ Sucesso (há 2 minutos)   │
│  Tentativas falhadas: 0              │
│                                      │
│  [⚡ Testar]  [✏️ Editar]  [🗑️]      │
└──────────────────────────────────────┘
```

## 📝 Campo por Campo

### **Nome**
- Identificador único para você
- Exemplo: "Sincronizar com N8N", "Atualizar Google Sheets"
- **Obrigatório**

### **Tipo**
- **Webhook**: Sistema externo recebe dados quando ocorre evento
- **API**: Você envia dados para API externa
- Ambos funcionam da mesma forma na prática

### **URL**
- Endereço onde seus dados serão enviados
- Exemplos:
  - `https://webhook.site/seu-codigo`
  - `https://seu-n8n.com/webhook/produtos`
  - `https://api.sistema-externo.com/produtos`
- **Obrigatório**
- Deve ser HTTPS em produção

### **Método HTTP**
- **POST** (padrão): Enviar dados novos
- **PUT**: Atualizar dados completos
- **PATCH**: Atualizar dados parciais
- **GET**: Pouco usado para webhooks

### **Entidade Alvo**
- **produtos**: Disparar quando produto é criado/atualizado/deletado
- **leads**: Disparar quando lead é criado/atualizado
- **imóveis**: Disparar quando imóvel é criado/atualizado
- **tarefas**: Disparar quando tarefa é criada/atualizada

### **Evento**
- **criacao**: Quando novo registro é criado
- **atualizacao**: Quando registro existente é modificado
- **delecao**: Quando registro é deletado
- **manual**: Você clica em "Testar" para disparar manualmente

### **Headers** (opcional)
Dados adicionais no cabeçalho da requisição:
```json
{
  "Authorization": "Bearer seu-token-aqui",
  "X-API-Key": "sua-chave",
  "X-Custom-Header": "valor"
}
```

### **Body Template** (opcional)
Template customizado para os dados enviados:
```json
{
  "produto_id": "{{id}}",
  "produto_nome": "{{nome}}",
  "preco_final": "{{preco}}",
  "timestamp": "{{criado_em}}"
}
```

### **Frequência** (opcional)
Executar a cada X minutos (para automações recorrentes)

## 🧪 Testando uma Automação

### **Passo 1: Criar Automação**
```
Nome: Teste Webhook
URL: https://webhook.site/seu-codigo-unico
Tipo: Webhook
Entidade: produtos
Evento: manual
[Salvar]
```

### **Passo 2: Clicar em "Testar"**
- O sistema envia dados fictícios para sua URL
- Você vê o resultado em tempo real

### **Resultado Possível**
```
✅ Sucesso!
HTTP Status: 200
Tempo: 234ms
Resposta: {"received": true}
```

### **Se der erro**
```
❌ Erro!
HTTP Status: 404
Erro: URL não encontrada
Tente verificar a URL e tentar novamente
```

## 📊 Logs de Execução

Cada automação tem um histórico de execuções:

```
Data/Hora          Status    Tempo   HTTP  Erro
──────────────────────────────────────────────
11/11 14:25:30     ✅ OK     234ms   200   -
11/11 14:20:15     ✅ OK     189ms   200   -
11/11 14:15:42     ❌ ERRO   5001ms  500   Timeout
11/11 14:10:08     ✅ OK     167ms   200   -
```

**O que significa cada coluna:**
- **Status**: ✅ OK ou ❌ ERRO
- **Tempo**: Quanto levou em milissegundos
- **HTTP**: Código de resposta do servidor
- **Erro**: Mensagem de erro (se houver)

## 🔄 Como Funciona em Tempo Real

### **Exemplo: Criar um Produto**

```
1️⃣ Você vai em "Produtos" → "+ Novo"
   Preenche dados e clica "Salvar"

2️⃣ Sistema salva no banco de dados

3️⃣ Sistema detecta: "Novo produto criado"

4️⃣ Sistema busca automações com:
   - Entidade = "produtos"
   - Evento = "criacao"
   - Status = "ativo"

5️⃣ Para cada automação encontrada:
   - Prepara os dados do produto
   - Faz requisição POST para sua URL
   - Registra resultado em logs

6️⃣ Se sucesso: ✅ Webhook executado
   Se erro: ❌ Registra erro + tenta novamente

7️⃣ Você vê tudo nos logs da automação
```

## 💡 Casos de Uso Comuns

### **Caso 1: Sincronizar com Google Sheets**
```
Nome: Exportar para Google Sheets
URL: https://seu-n8n.com/webhook/sheets
Entidade: produtos
Evento: criacao
⏰ Frequência: Manual (você controla)
```
Resultado: Cada novo produto aparece no Google Sheets

### **Caso 2: Notificar via Email**
```
Nome: Email quando novo lead
URL: https://seu-n8n.com/webhook/email
Entidade: leads
Evento: criacao
```
Resultado: Você recebe email a cada novo lead

### **Caso 3: Sincronizar com CRM Externo**
```
Nome: Sincronizar com HubSpot
URL: https://api.hubapi.com/crm/v3/objects/products
Entidade: produtos
Evento: atualizacao
Headers: {"Authorization": "Bearer seu-token"}
```
Resultado: Produto atualizado no HubSpot automaticamente

### **Caso 4: Gerar Relatório Automático**
```
Nome: Relatório Diário
URL: https://seu-servidor.com/relatorio
Evento: manual
⏰ Frequência: 1440 minutos (1x por dia)
```
Resultado: Relatório gerado todo dia às mesmas horas

## 🚨 Troubleshooting

### **Automação não dispara?**
1. Verifique se status é ✅ ATIVO
2. Teste manualmente (clique ⚡)
3. Verifique logs: algum erro visível?
4. Confirme que a entidade/evento estão corretos

### **Erro 404 ao testar**
- A URL não existe ou está incorreta
- Verifique digitação
- Teste a URL no navegador primeiro

### **Erro 500 (Timeout)**
- Seu endpoint está lento
- O sistema aguarda máximo 30 segundos
- Otimize o processamento no seu endpoint
- Considere usar fila (job queue)

### **Dados chegando incorretos**
- Verifique headers (Authorization, etc)
- Verifique body_template
- Confirme que JSON está válido

### **Webhook nunca foi executado**
- Evento não aconteceu ainda
- Use evento "manual" para testar
- Verifique se há permissões corretas

## 🎯 Dicas Importantes

### **1. Sempre teste antes de ativar**
```
[Criar automação]
[Testar] → Aguardar resultado
[Se OK: ativar]
[Se erro: ajustar]
```

### **2. Use webhook.site para debug**
```
1. Vá para https://webhook.site
2. Copie a URL gerada
3. Cole em sua automação
4. Clique "Testar"
5. Veja exatamente o que foi enviado
```

### **3. Monitore logs regularmente**
- Se muitos erros → investigar
- Se sucesso consistente → tudo ok
- Guarde logs para auditoria

### **4. Comece simples**
```
❌ Não comece com:
- Headers complexos
- Body templates customizados
- Múltiplas entidades

✅ Comece com:
- URL simples
- Evento manual
- Testar tudo antes
```

### **5. Documente suas automações**
```
Nome: Sincronizar com N8N
URL: https://seu-n8n.com/webhook/produtos
Propósito: Enviar novos produtos para fila de processamento
Mantido por: você@empresa.com
Data criação: 11/11/2025
Status: Produção
```

## 🔐 Segurança

### **Nunca exponha secrets na automação:**
```
❌ Errado:
URL: https://api.externa.com/produtos?api_key=sk-123456

✅ Correto:
URL: https://seu-n8n.com/webhook/protegido
Headers: {"X-API-Key": "sk-123456"}
```

### **Use HTTPS sempre**
- Nunca HTTP em produção
- Dados são sensíveis
- Seu servidor deve ter certificado SSL

### **Adicione autenticação**
```json
Headers:
{
  "Authorization": "Bearer seu-jwt-token",
  "X-Webhook-Secret": "seu-secret-aqui"
}
```

---

## 🚀 Próximos Passos

1. **Crie sua primeira automação** (manual, para testar)
2. **Teste com webhook.site** para ver dados
3. **Configure N8N** para receber (vimos como criar produtos)
4. **Ative automação real** com entidade/evento corretos
5. **Monitore logs** nos primeiros dias

**Qualquer dúvida? Consulte:**
- `docs/AUTOMACOES.md` - Guia do usuário
- `docs/SISTEMA_AUTOMACOES.md` - Documentação técnica
- `docs/API_PRODUTOS_N8N.md` - Integração N8N

Sucesso! 🎉