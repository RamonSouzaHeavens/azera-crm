# 🌐 Guia de Requisições HTTP - Como Fazer Chamadas de API

## 📚 Índice
1. [O que é uma Requisição HTTP?](#o-que-é)
2. [Ferramentas para Fazer Requisições](#ferramentas)
3. [Entendendo cURL](#entendendo-curl)
4. [Exemplos Passo a Passo](#exemplos)
5. [Troubleshooting](#troubleshooting)

---

## 📖 O que é uma Requisição HTTP? {#o-que-é}

Uma **requisição HTTP** é um pedido que seu computador faz para um servidor (no caso, o Azera CRM).

### **Analogia do Mundo Real**

```
Você          →  Garçom        →  Cozinha (Servidor)
(Cliente)        (HTTP)           (Azera CRM)

Você: "Quero um café com açúcar"
           ↓
Garçom leva o pedido
           ↓
Cozinha: "Ok, aqui está seu café!"
           ↓
Garçom traz de volta
           ↓
Você recebe o café
```

### **No Azera CRM**

```
Seu Computador  →  Internet  →  Servidor Supabase
                     (HTTP)

Você: "Mova o lead João para a etapa Fechamento"
                      ↓
HTTP envia requisição
                      ↓
Servidor: "Ok! Lead movido!"
                      ↓
Resultado retorna para você
```

---

## 🛠️ Ferramentas para Fazer Requisições {#ferramentas}

### **1. Terminal/PowerShell (cURL)** ⭐ Recomendado
- ✅ Sempre disponível
- ✅ Fácil de usar
- ✅ Bom para automação

### **2. Postman**
- 🎯 Interface visual
- 📦 Salva histórico
- 📊 Melhor para debugging

### **3. Insomnia**
- 🎨 Design moderno
- 📝 Documentação integrada
- 🚀 Fácil de usar

### **4. VS Code REST Client**
- 💻 Extensão gratuita
- 📄 Arquivo `.http` próprio
- ⚡ Rápido

---

## 🔧 Entendendo cURL {#entendendo-curl}

### **O que é cURL?**

**cURL** = **Client URL**

É um programa que permite fazer requisições HTTP diretamente do terminal/PowerShell.

### **Estrutura Básica do cURL**

```bash
curl -X [MÉTODO] [URL] \
  -H "Header-Name: Header-Value" \
  -d '{"json": "dados"}'
```

**Traduzindo:**
- `-X POST` = Método HTTP (GET, POST, PUT, DELETE, PATCH)
- `[URL]` = Endereço do servidor
- `-H` = Header (informação adicional)
- `-d` = Data (dados a enviar)
- `\` = Continua na próxima linha (no PowerShell use `;` no final)

### **Exemplo Simples**

```bash
curl https://www.google.com
```

**O que faz:**
1. Faz uma requisição GET para google.com
2. Recebe o HTML da página
3. Imprime tudo no terminal

---

## 📋 Exemplos Passo a Passo {#exemplos}

### **Exemplo 1: Criar um Produto**

#### **Passo 1: Entenda o que você precisa**

```
API: https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos
Método: POST
Dados:
  - action: "create"
  - tenant_id: "seu-tenant-id"
  - produto: { nome, preco, ... }
```

#### **Passo 2: Monte o cURL**

N8N (HTTP Request node):

- Headers:
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "create",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "produto": {
    "nome": "Apartamento Centro",
    "preco": 450000,
    "tipo": "apartamento",
    "quartos": 3
  }
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos" -H "Content-Type: application/json" -d '{"action":"create","tenant_id":"e2eb58ef-374a-41be-941f-78529780fa97","produto":{"nome":"Apartamento Centro","preco":450000,"tipo":"apartamento","quartos":3}}'
```

#### **Passo 3: Execute**

Copie o comando acima e cole no **PowerShell** ou **Terminal**.

#### **Passo 4: Interprete o Resultado**

```json
{
  "success": true,
  "action": "create",
  "produto": {
    "id": "abc123",
    "nome": "Apartamento Centro",
    "preco": 450000,
    ...
  }
}
```

✅ **Sucesso!** Produto criado!

---

### **Exemplo 2: Mover um Lead na Esteira**

#### **Passo 1: Dados Necessários**

- `tenant_id`: ID da sua equipe
- `lead_id`: ID do lead
- `stage_id`: ID da etapa destino

#### **Passo 2: Monte o cURL**

N8N (HTTP Request node):

- Headers:
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "move",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "lead_id": "lead-id-aqui",
  "stage_id": "stage-id-aqui"
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads" -H "Content-Type: application/json" -d '{"action":"move","tenant_id":"e2eb58ef-374a-41be-941f-78529780fa97","lead_id":"lead-id-aqui","stage_id":"stage-id-aqui"}'
```

#### **Passo 3: Execute e veja resultado**

```json
{
  "success": true,
  "action": "move",
  "lead": {
    "id": "lead-id-aqui",
    "nome": "João Silva",
    "status": "stage-id-aqui"
  }
}
```

✅ **Sucesso!** Lead movido!

---

### **Exemplo 3: Atualizar Dados do Lead**

#### **Passo 1: Prepare os dados**

Campos permitidos:
- `nome`
- `email`
- `telefone`
- `valor_potencial`
- `notas`

#### **Passo 2: Monte o cURL**

N8N (HTTP Request node):

- Headers:
  - `Content-Type`: `application/json`

- Body (raw JSON):

```json
{
  "action": "update",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "lead_id": "lead-id-aqui",
  "data": {
    "email": "novo@email.com",
    "valor_potencial": 150000,
    "notas": "Cliente interessado"
  }
}
```

Linha única (PowerShell / Terminal):

```bash
curl -X POST "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads" -H "Content-Type: application/json" -d '{"action":"update","tenant_id":"e2eb58ef-374a-41be-941f-78529780fa97","lead_id":"lead-id-aqui","data":{"email":"novo@email.com","valor_potencial":150000,"notas":"Cliente interessado"}}'
```

#### **Passo 3: Execute**

```json
{
  "success": true,
  "action": "update",
  "lead": {
    "id": "lead-id-aqui",
    "email": "novo@email.com",
    "valor_potencial": 150000
  }
}
```

✅ **Sucesso!** Lead atualizado!

---

## 🎯 Métodos HTTP Explicados

### **GET** - Buscar dados
```bash
curl -X GET https://api.exemplo.com/produtos
```
**Use quando:** Quer apenas ler dados, sem modificar

### **POST** - Criar dados
```bash
curl -X POST https://api.exemplo.com/produtos \
  -H "Content-Type: application/json" \
  -d '{"nome": "Produto"}'
```
**Use quando:** Quer criar algo novo

### **PUT** - Atualizar completamente
```bash
curl -X PUT https://api.exemplo.com/produtos/123 \
  -d '{"nome": "Novo nome", ...tudo}'
```
**Use quando:** Quer substituir tudo

### **PATCH** - Atualizar parcialmente
```bash
curl -X PATCH https://api.exemplo.com/produtos/123 \
  -d '{"nome": "Novo nome"}'
```
**Use quando:** Quer mudar só alguns campos

### **DELETE** - Deletar
```bash
curl -X DELETE https://api.exemplo.com/produtos/123
```
**Use quando:** Quer remover algo

---

## 📝 Headers (Cabeçalhos) Explicados

Headers são informações extras sobre sua requisição.

### **Cabeçalhos Comuns**

```bash
-H "Content-Type: application/json"
   ↓
   Diz ao servidor: "Estou enviando dados em formato JSON"

-H "Authorization: Bearer seu-token-aqui"
   ↓
   Diz ao servidor: "Aqui está minha autenticação"

-H "X-Custom-Header: valor"
   ↓
   Header customizado para sua aplicação
```

### **Exemplo com Headers**

```bash
curl -X POST https://api.exemplo.com/produtos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token123" \
  -d '{"nome": "Produto"}'
```

---

## 💾 Salvando Requisições (Arquivo .http)

### **VS Code - Extensão REST Client**

Crie arquivo `requisicoes.http`:

```http
### Criar Produto
POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos
Content-Type: application/json

{
  "action": "create",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "produto": {
    "nome": "Apartamento Centro",
    "preco": 450000
  }
}

###

### Criar Lead
POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads
Content-Type: application/json

{
  "action": "create",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "data": {
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "+55 11 99999-9999",
    "valor_potencial": 50000
  }
}

###

### Mover Lead
POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads
Content-Type: application/json

{
  "action": "move",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "lead_id": "lead-id",
  "stage_id": "stage-id"
}

###

### Atualizar Lead
POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-leads
Content-Type: application/json

{
  "action": "update",
  "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
  "lead_id": "lead-id",
  "data": {
    "email": "novo@email.com",
    "valor_potencial": 150000
  }
}
```

**Como usar:**
1. Instale "REST Client" no VS Code
2. Clique em "Send Request" sobre cada requisição
3. Veja resultado na aba lateral

---

## 🚨 Troubleshooting {#troubleshooting}

### **Erro: "401 Unauthorized"**
```
Significa: Você não tem permissão
Solução: Verifique token/autenticação
```

### **Erro: "404 Not Found"**
```
Significa: URL ou recurso não existe
Solução: Verifique URL está correta
```

### **Erro: "400 Bad Request"**
```
Significa: Seus dados estão incorretos
Solução: Verifique JSON, campos obrigatórios
```

### **Erro: "500 Internal Server Error"**
```
Significa: Erro no servidor
Solução: Tente novamente ou contate suporte
```

### **cURL não funciona no PowerShell**

Se receber: `curl: (3) Illegal characters found in URL`

**Solução:** Use citação dupla e escape correto:

```powershell
# Errado
curl -X POST https://api.com -d '{"json": "valor"}'

# Correto
curl -X POST 'https://api.com' -H 'Content-Type: application/json' -d '{\"json\": \"valor\"}'

# Ou melhor: use arquivo temporário
$json = @{json = "valor"} | ConvertTo-Json
curl -X POST 'https://api.com' -H 'Content-Type: application/json' -d $json
```

---

## 🔐 Dicas de Segurança

### ✅ **Faça assim:**
```bash
# Usar variáveis de ambiente
$tenantId = "seu-id"
$leadId = "lead-id"

curl -X POST 'https://...' \
  -d "{\"tenant_id\": \"$tenantId\", \"lead_id\": \"$leadId\"}"
```

### ❌ **Não faça assim:**
```bash
# Nunca deixar IDs sensíveis expostos em scripts
curl -X POST 'https://...' \
  -d '{"api_key": "sk-123456-abc", ...}'
```

---

## 📚 Recursos Adicionais

- **cURL Documentation**: https://curl.se/docs/
- **HTTP Methods**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
- **JSON Format**: https://www.json.org/
- **REST API Basics**: https://restfulapi.net/

---

## 🎯 Próximos Passos

1. ✅ Entender o que é HTTP
2. ✅ Aprender cURL
3. ✅ Fazer primeira requisição
4. ✅ Integrar com N8N
5. ✅ Automatizar workflows

---

**Alguma dúvida? Consulte a documentação específica:**
- `docs/API_PRODUTOS_N8N.md` - Criar produtos
- `docs/API_LEADS_ESTEIRA.md` - Mover leads
- `docs/WORKFLOW_N8N_EXEMPLO.md` - Workflows

**Bom aprendizado!** 🚀