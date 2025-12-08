# 🚀 Workflow N8N - Importar Produtos do Excel

## 📋 Workflow Completo

Este é um exemplo completo de workflow N8N para importar produtos de uma planilha Excel para o Azera CRM.

### **Passo 1: Instalar Dependências**
```bash
npm install -g n8n
n8n start
```

### **Passo 2: Criar Workflow**

#### **Node 1: Schedule Trigger**
```json
{
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "dayOfMonth",
          "value": 1
        }
      ]
    }
  },
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1
}
```

#### **Node 2: Read Binary File (Excel)**
```json
{
  "parameters": {
    "filePath": "/caminho/para/sua/planilha.xlsx",
    "options": {}
  },
  "type": "n8n-nodes-base.readBinaryFile",
  "typeVersion": 1
}
```

#### **Node 3: Spreadsheet File**
```json
{
  "parameters": {
    "operation": "readAllSheets",
    "binaryData": true,
    "options": {
      "range": "A1:Z1000",
      "headerRow": 1
    }
  },
  "type": "n8n-nodes-base.spreadsheetFile",
  "typeVersion": 3.1
}
```

#### **Node 4: Function (Transformar Dados)**
```javascript
// Transformar dados da planilha para o formato da API
const produtos = items.map(item => {
  const row = item.json;

  // Validar campos obrigatórios
  if (!row['Nome do Imóvel'] || !row['Preço']) {
    throw new Error(`Produto inválido: ${JSON.stringify(row)}`);
  }

  return {
    nome: row['Nome do Imóvel'],
    preco: parseFloat(row['Preço'].toString().replace(/[R$\s.]/g, '').replace(',', '.')),
    descricao: row['Descrição'] || '',
    tipo: row['Tipo'] || 'apartamento',
    finalidade: row['Finalidade'] || 'venda',
    area_total: row['Área Total'] ? parseFloat(row['Área Total']) : null,
    area_construida: row['Área Construída'] ? parseFloat(row['Área Construída']) : null,
    quartos: row['Quartos'] ? parseInt(row['Quartos']) : null,
    banheiros: row['Banheiros'] ? parseInt(row['Banheiros']) : null,
    vagas_garagem: row['Vagas'] ? parseInt(row['Vagas']) : null,
    endereco: row['Endereço'] || '',
    bairro: row['Bairro'] || '',
    cidade: row['Cidade'] || '',
    cep: row['CEP'] || '',
    destaque: row['Destaque'] === 'Sim' || false,
    ativo: row['Ativo'] !== 'Não',
    tags: row['Tags'] ? row['Tags'].split(',').map(tag => tag.trim()) : [],
    filtros: {
      categoria: row['Categoria'] || 'residencial',
      status: row['Status'] || 'disponivel',
      origem: 'importacao_excel'
    }
  };
});

// Filtrar apenas produtos válidos
const produtosValidos = produtos.filter(produto => produto.nome && produto.preco > 0);

return produtosValidos.map(produto => ({
  json: {
    action: 'create',
    tenant_id: 'e2eb58ef-374a-41be-941f-78529780fa97', // SEU TENANT ID
    produto: produto
  }
}));
```

#### **Node 5: Split In Batches**
```json
{
  "parameters": {
    "batchSize": 5,
    "options": {}
  },
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3
}
```

#### **Node 6: HTTP Request (Criar Produto)**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://hdmesxrurdrhmcujospv.supabase.co/functions/v1/api-produtos",
    "sendHeaders": true,
    "headerParameters": {
      "headerParameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "bodyParameters": [
        {
          "name": "action",
          "value": "={{ $json.action }}"
        },
        {
          "name": "tenant_id",
          "value": "={{ $json.tenant_id }}"
        },
        {
          "name": "produto",
          "value": "={{ JSON.stringify($json.produto) }}"
        }
      ]
    },
    "options": {
      "timeout": 30000
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1
}
```

#### **Node 7: Function (Processar Resposta)**
```javascript
const response = items[0].json;
const httpCode = items[0].httpCode;

// Log de sucesso
if (httpCode === 200 && response.success) {
  console.log(`✅ Produto criado: ${response.produto.nome} (ID: ${response.produto.id})`);
  return {
    json: {
      status: 'success',
      produto_id: response.produto.id,
      produto_nome: response.produto.nome,
      http_code: httpCode
    }
  };
}

// Log de erro
console.error(`❌ Erro ao criar produto:`, {
  http_code: httpCode,
  error: response.error,
  details: response.details,
  produto: items[0].json.produto
});

return {
  json: {
    status: 'error',
    error: response.error,
    details: response.details,
    produto_nome: items[0].json.produto.nome,
    http_code: httpCode
  }
};
```

#### **Node 8: Error Handler**
```javascript
// Configurar para tentar novamente em caso de erro temporário
const httpCode = $items('HTTP Request')[0].httpCode;
const error = $items('HTTP Request')[0].json.error;

// Erros temporários - tentar novamente
if (httpCode === 500 || httpCode === 502 || httpCode === 503) {
  return {
    retry: true,
    delay: 5000, // 5 segundos
    attempts: 3
  };
}

// Erros de validação - parar e logar
if (httpCode === 400) {
  console.error('Erro de validação:', error);
  return { stop: true };
}

// Outros erros - parar
return { stop: true };
```

#### **Node 9: Send Email (Relatório)**
```json
{
  "parameters": {
    "fromEmail": "n8n@seudominio.com",
    "toEmail": "seu@email.com",
    "subject": "Relatório Importação Produtos - {{ $now.format('DD/MM/YYYY') }}",
    "text": "Olá!\n\nImportação de produtos concluída.\n\n📊 Resumo:\n- Total processado: {{ $items().length }}\n- Sucessos: {{ $items().filter(item => item.json.status === 'success').length }}\n- Erros: {{ $items().filter(item => item.json.status === 'error').length }}\n\nVerifique os logs para detalhes.\n\nAtenciosamente,\nN8N Bot",
    "options": {}
  },
  "type": "n8n-nodes-base.sendEmail",
  "typeVersion": 1
}
```

## 📊 Formato da Planilha Excel

### **Colunas Recomendadas**
| Coluna | Obrigatório | Exemplo |
|--------|-------------|---------|
| Nome do Imóvel | ✅ | Apartamento Centro |
| Preço | ✅ | R$ 450.000,00 |
| Descrição | ❌ | Apartamento 3 quartos no centro |
| Tipo | ❌ | apartamento |
| Finalidade | ❌ | venda |
| Área Total | ❌ | 120 |
| Área Construída | ❌ | 100 |
| Quartos | ❌ | 3 |
| Banheiros | ❌ | 2 |
| Vagas | ❌ | 1 |
| Endereço | ❌ | Rua das Flores, 123 |
| Bairro | ❌ | Centro |
| Cidade | ❌ | São Paulo |
| CEP | ❌ | 01234-567 |
| Destaque | ❌ | Sim |
| Ativo | ❌ | Sim |
| Tags | ❌ | centro, 3-quartos |
| Categoria | ❌ | residencial |
| Status | ❌ | disponivel |

## 🎯 Como Executar

1. **Configure o caminho do arquivo Excel** no node "Read Binary File"
2. **Ajuste o tenant_id** no node Function
3. **Configure o email** no node Send Email
4. **Clique em "Execute Workflow"**
5. **Monitore os logs** em tempo real

## 🔍 Monitoramento

### **Logs do N8N**
- Acompanhe o progresso em tempo real
- Veja erros específicos por produto
- Monitore performance (tempo de execução)

### **Logs do Azera CRM**
```sql
-- Ver produtos criados recentemente
SELECT id, nome, preco, created_at
FROM produtos
WHERE tenant_id = 'e2eb58ef-374a-41be-941f-78529780fa97'
AND created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

## 🚨 Tratamento de Erros Comuns

### **Erro: "Tenant não encontrado"**
- Verifique se o `tenant_id` está correto
- Confirme que a equipe existe no Azera CRM

### **Erro: "nome e preco são obrigatórios"**
- Verifique se as colunas da planilha estão nomeadas corretamente
- Confirme que todos os produtos têm nome e preço

### **Erro: "Erro ao processar produto"**
- Verifique os tipos de dados (números, strings)
- Confirme que não há caracteres especiais problemáticos

### **Timeout (30s)**
- Reduza o batch size para 1-2 produtos
- Adicione delay entre requests
- Otimize imagens (se houver)

## 📈 Otimizações

### **Performance**
- Use batch size pequeno (3-5) para evitar timeouts
- Adicione delays entre requests
- Processe apenas produtos modificados

### **Confiabilidade**
- Implemente retry logic para erros temporários
- Valide dados antes de enviar
- Mantenha backup da planilha original

### **Monitoramento**
- Configure alertas por email
- Monitore taxa de sucesso
- Registre métricas de performance

---

**🎯 Este workflow está pronto para uso em produção!** Basta configurar seus dados específicos e executar.