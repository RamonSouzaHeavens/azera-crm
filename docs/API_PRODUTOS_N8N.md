# 🚀 API de Produtos - Integração N8N

## 📋 Visão Geral

Esta API permite que sistemas externos (como N8N) criem e atualizem produtos no Azera CRM através de requisições HTTP.

**Endpoint:** `https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos`

## 🔧 Como Usar no N8N

### Passo 1: Instalar N8N
```bash
npm install -g n8n
n8n start
```

### Passo 2: Criar Workflow
1. Abra o N8N (http://localhost:5678)
2. Clique em "Add first step"
3. Escolha "HTTP Request"

### Passo 3: Configurar HTTP Request

#### **Criar Produto**
```json
{
  "method": "POST",
  "url": "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "action": "create",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "produto": {
      "nome": "Apartamento Centro",
      "preco": 450000,
      "descricao": "Apartamento 3 quartos no centro",
      "tipo": "apartamento",
      "finalidade": "venda",
      "area_total": 120,
      "area_construida": 100,
      "quartos": 3,
      "banheiros": 2,
      "vagas_garagem": 1,
      "endereco": "Rua das Flores, 123",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "cep": "01234-567",
      "destaque": true,
      "ativo": true,
      "tags": ["centro", "3-quartos"],
      "capa_url": "https://exemplo.com/imagem.jpg",
      "galeria_urls": ["https://exemplo.com/img1.jpg", "https://exemplo.com/img2.jpg"],
      "filtros": {
        "categoria": "residencial",
        "status": "disponivel"
      }
    }
  }
}
```

#### **Atualizar Produto**
```json
{
  "method": "POST",
  "url": "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "action": "update",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "produto_id": "uuid-do-produto-aqui",
    "produto": {
      "preco": 480000,
      "destaque": false,
      "ativo": true
    }
  }
}
```

## 📊 Campos do Produto

### **Obrigatórios para Criação**
- `nome`: string - Nome do produto
- `preco`: number - Preço do produto

### **Opcionais**
- `descricao`: string - Descrição detalhada
- `tipo`: string - Tipo do imóvel (apartamento, casa, etc.)
- `finalidade`: string - Venda ou locação
- `area_total`: number - Área total em m²
- `area_construida`: number - Área construída em m²
- `quartos`: number - Número de quartos
- `banheiros`: number - Número de banheiros
- `vagas_garagem`: number - Número de vagas
- `endereco`: string - Endereço completo
- `bairro`: string - Bairro
- `cidade`: string - Cidade
- `cep`: string - CEP
- `destaque`: boolean - Produto em destaque
- `ativo`: boolean - Produto ativo
- `tags`: string[] - Array de tags
- `capa_url`: string - URL da imagem principal
- `galeria_urls`: string[] - URLs das imagens da galeria
- `arquivo_urls`: string[] - URLs de arquivos anexos
- `filtros`: object - Filtros personalizados
- `proprietario_id`: string - ID do proprietário

## 🎯 Exemplos Práticos no N8N

### **Exemplo 1: Importar de Planilha Excel**

1. **Adicione "Spreadsheet File" node**
   - Carregue seu arquivo Excel
   - Configure as colunas

2. **Adicione "Function" node** para transformar dados:
```javascript
// Transformar dados da planilha
const produtos = items.map(item => ({
  nome: item.json['Nome do Imóvel'],
  preco: parseFloat(item.json['Preço']),
  descricao: item.json['Descrição'],
  tipo: item.json['Tipo'],
  endereco: item.json['Endereço'],
  bairro: item.json['Bairro'],
  cidade: item.json['Cidade'],
  quartos: parseInt(item.json['Quartos']) || null,
  banheiros: parseInt(item.json['Banheiros']) || null,
  area_total: parseFloat(item.json['Área Total']) || null
}))

return produtos.map(produto => ({ json: produto }))
```

3. **Adicione "HTTP Request" node** para cada produto:
   - Use o JSON acima
   - Configure para enviar um produto por vez

### **Exemplo 2: Sincronizar com Sistema Externo**

1. **Adicione "HTTP Request" node** para buscar dados externos
2. **Adicione "Function" node** para mapear campos
3. **Adicione "HTTP Request" node** para enviar ao Azera CRM

### **Exemplo 3: Atualização Automática de Preços**

1. **Adicione "Schedule Trigger"** (diário)
2. **Adicione "HTTP Request"** para buscar produtos
3. **Adicione "Function"** para calcular novos preços
4. **Adicione "HTTP Request"** para atualizar cada produto

## 🔍 Como Obter o tenant_id

O `tenant_id` é o ID da sua equipe no Azera CRM. Você pode encontrá-lo:

1. **Via Interface**: Vá em Configurações → Minha Equipe
2. **Via Banco**: Execute no SQL Editor:
```sql
SELECT id, name FROM tenants WHERE id = 'seu-tenant-id';
```

## 📤 Respostas da API

### **Sucesso (200)**
```json
{
  "success": true,
  "action": "create",
  "produto": {
    "id": "uuid-gerado",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "nome": "Apartamento Centro",
    "preco": 450000,
    "created_at": "2025-11-11T...",
    "updated_at": "2025-11-11T..."
  }
}
```

### **Erro (400/404/500)**
```json
{
  "error": "Mensagem de erro",
  "details": "Detalhes técnicos"
}
```

## 🚨 Tratamento de Erros no N8N

### **Adicione "Error Handler" node**
- Configure para capturar erros HTTP
- Adicione lógica de retry
- Registre erros em log

### **Exemplo de Error Handler**
```javascript
// Se erro 500, tentar novamente
if (inputData.httpCode === 500) {
  return { retry: true, delay: 5000 }
}

// Se erro de validação, parar e logar
if (inputData.httpCode === 400) {
  console.error('Erro de validação:', inputData.response)
  return { stop: true }
}

return { continue: true }
```

## 🔐 Segurança

- A API atualmente **não requer autenticação** (verify_jwt = false)
- Em produção, considere adicionar autenticação via API keys
- Use HTTPS sempre
- Valide dados antes de enviar

## 📊 Limites e Boas Práticas

- **Rate Limit**: ~1000 requests/minuto
- **Timeout**: 30 segundos por request
- **Payload**: Máximo 1MB por request
- **Campos obrigatórios**: Sempre valide antes de enviar
- **Ids únicos**: Use UUIDs válidos para updates

## 🧪 Testando a API

### **Via cURL** (Recomendado para começar)

**O que fazer:**
1. Abra PowerShell ou Terminal
2. Copie o comando abaixo
3. Cole e execute

```bash
curl -X POST https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "tenant_id": "e2eb58ef-374a-41be-941f-78529780fa97",
    "produto": {
      "nome": "Teste API",
      "preco": 100000
    }
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "action": "create",
  "produto": {
    "id": "abc123...",
    "nome": "Teste API",
    "preco": 100000,
    "created_at": "2025-11-12T..."
  }
}
```

✅ Se viu isso, funcionou! Seu produto foi criado no CRM.

**Quer aprender mais sobre requisições HTTP?** Veja `docs/GUIA_REQUISICOES_HTTP.md`

### **Via Postman**
1. Method: POST
2. URL: `https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos`
3. Headers: `Content-Type: application/json`
4. Body: JSON conforme exemplos acima

## 🎯 Próximos Passos

1. **Execute a migração SQL** das automações (se ainda não fez)
2. **Deploy da função**: `supabase functions deploy api-produtos`
3. **Teste a API** com dados reais
4. **Configure seu workflow no N8N**
5. **Monitore logs** no Supabase Dashboard

---

**🚀 Pronto para integrar!** Qualquer dúvida, consulte a documentação completa em `docs/API_PRODUTOS.md`