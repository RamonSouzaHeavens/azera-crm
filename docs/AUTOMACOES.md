# 🤖 Guia de Automações - Webhooks e APIs

## 📋 Visão Geral

O sistema de automações permite sincronizar dados entre o Azera CRM e outros sistemas através de **Webhooks** e **APIs**. Você pode:

- Receber notificações de eventos (criação, atualização, deleção)
- Sincronizar dados automaticamente com sistemas externos
- Executar integrações personalizadas
- Monitorar tentativas e erros

## 🎯 Casos de Uso

### 1. **Sincronização com CRM Externo**
Quando um novo imóvel é criado no Azera, notificar automaticamente outro CRM para atualizar inventário.

### 2. **Pipeline de Vendas**
Enviar leads para uma ferramenta de automação de marketing quando criados.

### 3. **Backup Automático**
Fazer backup de dados em um servidor externo para cada mudança.

### 4. **Integrações ERP**
Sincronizar produtos com sistema ERP quando preços mudam.

## 🚀 Como Começar

### Passo 1: Acessar Automações
1. Vá para **Menu** → **Automações**
2. Clique em **"+ Nova Automação"**

### Passo 2: Configurar Automação

#### Campo: **Nome**
- Identificação amigável (ex: "Sync CRM Externo", "Backup RealState")

#### Campo: **Tipo**
- **Webhook**: Você fornece uma URL e nós enviamos dados
- **API**: Você consome uma API nossa

#### Campo: **URL**
- URL do seu servidor que receberá os dados
- Exemplo: `https://seu-crm.com/api/webhook/imovels`
- Deve retornar HTTP 200 para sucesso

#### Campo: **Método HTTP**
- **POST**: Enviar dados (recomendado)
- **PUT**: Atualizar dados existentes
- **PATCH**: Atualizar parcialmente
- **GET**: Apenas para testes

#### Campo: **Entidade Alvo**
- Qual tipo de dado sincronizar:
  - **Produtos/Imóveis**: Dados de imóveis
  - **Leads/Clientes**: Leads e contatos
  - **Tarefas**: Tarefas do time

#### Campo: **Evento**
- Quando disparar:
  - **Criação**: Novo registro
  - **Atualização**: Registro modificado
  - **Deleção**: Registro removido
  - **Manual**: Executar sob demanda

#### Campo: **Headers HTTP** (JSON)
```json
{
  "Authorization": "Bearer SEU_TOKEN",
  "X-Custom-Header": "valor",
  "Content-Type": "application/json"
}
```

#### Campo: **Template do Body** (JSON)
Define quais campos enviar:
```json
{
  "id": "{id}",
  "nome": "{nome}",
  "preco": "{preco}",
  "tipo": "{tipo}",
  "timestamp": "{updated_at}"
}
```

#### Campo: **Frequência** (minutos)
- Para execução periódica
- Deixe em branco para executar apenas no evento

### Passo 3: Testar
1. Clique no botão **"⚡ Testar"**
2. Verifique o resultado:
   - ✅ Verde = Sucesso
   - ❌ Vermelho = Erro
   - Analise a resposta do servidor

### Passo 4: Ativar
1. Quando satisfeito, clique **"Ativar"**
2. A automação começará a funcionar imediatamente

## 📊 Dados Disponíveis por Tipo

### Produtos/Imóveis
```json
{
  "id": "uuid-do-imovel",
  "tenant_id": "uuid-do-tenant",
  "nome": "Apartamento Luxo",
  "descricao": "3 quartos, 2 banhos",
  "preco": 500000,
  "tipo": "apartamento",
  "finalidade": "venda",
  "area_total": 120,
  "area_construida": 100,
  "quartos": 3,
  "banheiros": 2,
  "vagas_garagem": 2,
  "endereco": "Rua X, 100",
  "bairro": "Centro",
  "cidade": "São Paulo",
  "cep": "01000-000",
  "capa_url": "https://...",
  "ativo": true,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z",
  "filtros": { /* dados de filtros */ }
}
```

### Leads/Clientes
```json
{
  "id": "uuid-do-lead",
  "tenant_id": "uuid-do-tenant",
  "nome": "João Silva",
  "email": "joao@example.com",
  "telefone": "+55 11 98765-4321",
  "empresa": "Tech Corp",
  "cargo": "Gerente",
  "tags": ["qualificado", "high-value"],
  "created_at": "2025-01-15T10:30:00Z"
}
```

## 🔐 Segurança

### Webhook Secret
- Gerado automaticamente para webhooks
- Use para validar que a requisição veio do Azera
- Header: `X-Webhook-Secret`

### Validação de Webhook
```javascript
// Node.js exemplo
const secret = req.headers['x-webhook-secret']
const expectedSecret = process.env.WEBHOOK_SECRET

if (secret !== expectedSecret) {
  return res.status(401).json({ erro: 'Unauthorized' })
}

// Processar webhook seguramente
```

## 📈 Monitoramento

### Status da Automação
- **✅ Sucesso**: Última execução foi bem-sucedida
- **❌ Erro**: Última execução falhou
- **⏳ Pendente**: Aguardando primeira execução

### Histórico de Logs
1. Clique no botão **"Detalhes"** de uma automação
2. Veja:
   - Data/hora da execução
   - Status (sucesso/erro)
   - Tempo de resposta
   - Resposta do servidor
   - Erros (se houver)

### Tentativas Falhadas
- Contador de falhas consecutivas
- Reseta quando sucesso
- Sistema desativa após 10 falhas consecutivas

## 🆘 Troubleshooting

### "Erro 400 - Bad Request"
- Verifique se o URL está correto
- Verifique se o método HTTP está correto
- Valide o formato JSON dos headers e body template

### "Erro 401 - Unauthorized"
- Verifique o token de autenticação
- Verifique o Webhook Secret
- Confirme as permissões no servidor destino

### "Erro 500 - Internal Server Error"
- Verifique a implementação do seu webhook
- Veja os logs do seu servidor
- Teste manualmente com curl ou Postman

### "Timeout"
- Aumentar timeout no seu servidor
- Processar webhook de forma assíncrona
- Retornar sucesso antes de processar dados

### "Dados não sincronizando"
1. Confirme que a automação está **ativa** (toggle verde)
2. Verifique o **evento** configurado
3. Procure erros no histórico de logs
4. Teste manualmente com o botão **"⚡ Testar"**

## 📝 Exemplos

### Exemplo 1: Webhook Simples (Node.js + Express)
```javascript
const express = require('express')
const app = express()

app.post('/webhook/imoveis', express.json(), (req, res) => {
  const secret = req.headers['x-webhook-secret']
  
  // Validar secret
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ erro: 'Unauthorized' })
  }

  const dados = req.body
  console.log('Novo imóvel recebido:', dados)

  // Processar dados
  // - Salvar no seu banco
  // - Enviar para terceiros
  // - Atualizar cache
  // etc

  // Responder com sucesso
  res.json({ 
    sucesso: true, 
    mensagem: 'Dados sincronizados' 
  })
})

app.listen(3000)
```

### Exemplo 2: Validação com Crypto (Python + Flask)
```python
from flask import Flask, request
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET')

@app.route('/webhook/imoveis', methods=['POST'])
def webhook_imoveis():
    # Validar secret
    secret = request.headers.get('X-Webhook-Secret')
    if not hmac.compare_digest(secret, WEBHOOK_SECRET):
        return {'erro': 'Unauthorized'}, 401
    
    dados = request.get_json()
    
    # Processar...
    print(f"Imóvel: {dados['nome']}")
    
    return {'sucesso': True}, 200

if __name__ == '__main__':
    app.run(port=3000)
```

## 🔗 API Reference

### Executar Automação Manualmente
```bash
POST /api/automacoes/{id}/executar
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "dados": {
    "customField": "value"
  }
}
```

### Listar Automações
```bash
GET /api/automacoes
Authorization: Bearer YOUR_TOKEN
```

### Obter Detalhes
```bash
GET /api/automacoes/{id}
Authorization: Bearer YOUR_TOKEN
```

### Obter Logs
```bash
GET /api/automacoes/{id}/logs?limite=50
Authorization: Bearer YOUR_TOKEN
```

## ✅ Checklist

- [ ] Criar webhook/API no seu servidor
- [ ] Testar webhook com curl/Postman
- [ ] Acessar Automações no Azera
- [ ] Criar nova automação
- [ ] Configurar URL e headers
- [ ] Testar com botão "⚡ Testar"
- [ ] Verificar resposta nos logs
- [ ] Ativar automação
- [ ] Monitorar primeiras execuções
- [ ] Ajustar conforme necessário

## 💡 Dicas

1. **Sempre fazer teste antes de ativar**
2. **Usar eventos específicos, não tudo**
3. **Adicionar logging no seu webhook**
4. **Validar todos os dados recebidos**
5. **Processar webhooks de forma assíncrona**
6. **Monitorar tentativas falhadas**
7. **Usar senhas/tokens fortes**
8. **Documentar sua integração**

## 📞 Suporte

- Dúvidas? Acesse a seção de Automações
- Verifique os logs de erro
- Teste manualmente seu webhook
- Consulte a documentação da API do Azera
