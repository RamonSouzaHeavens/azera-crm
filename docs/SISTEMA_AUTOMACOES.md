# 🚀 Sistema de Automações - Resumo Implementado

## 📦 O Que Foi Criado

### 1. **Service de Automações** (`src/services/automacaoService.ts`)
- ✅ Criar, ler, atualizar e deletar automações
- ✅ Testar automações (fazer requisições de teste)
- ✅ Registrar logs de execução
- ✅ Obter histórico de logs
- ✅ Gerar secrets para webhooks
- ✅ Tipagem TypeScript completa

**Funções principais:**
- `criarAutomacao()` - Criar nova automação
- `listarAutomacoes()` - Listar automações do tenant
- `atualizarAutomacao()` - Atualizar configurações
- `deletarAutomacao()` - Deletar automação
- `testarAutomacao()` - Fazer teste de integração
- `registrarLogAutomacao()` - Registrar execução
- `obterLogsAutomacao()` - Histórico de logs

### 2. **Componentes UI** 

#### CardWebhook (`src/components/automacoes/CardWebhook.tsx`)
- Exibe informações da automação
- Mostra status último/atual
- Copia webhook secret e URL
- Botões para testar, editar, deletar
- Toggle para ativar/desativar
- Status visual com cores

#### ModalAutomacao (`src/components/automacoes/ModalAutomacao.tsx`)
- Formulário completo para criar/editar
- Campos para:
  - Nome da automação
  - Tipo (Webhook ou API)
  - URL de destino
  - Método HTTP (GET, POST, PUT, PATCH)
  - Entidade alvo (Produtos, Leads, Imóveis, Tarefas)
  - Evento (Criação, Atualização, Deleção, Manual)
  - Headers HTTP (JSON)
  - Template do Body (JSON)
  - Frequência de execução (minutos)

### 3. **Página de Automações** (`src/pages/Automacoes.tsx`)
- Interface completa de gerenciamento
- Filtros (Todos, Ativos, Inativos)
- Listar automações em grid responsivo
- Criar nova automação
- Editar existentes
- Deletar com confirmação
- Testar integrações
- Ativar/desativar
- Estados de loading e vazio

### 4. **Banco de Dados** (SQL)
**Tabela: `automacoes`**
- id, tenant_id, nome
- tipo, url, webhook_secret
- metodo_http, headers, body_template
- entidade_alvo, evento
- ativo, tentativas_falhadas
- ultimo_status, ultimo_erro
- ultima_execucao, proxima_execucao
- frequencia_minutos
- timestamps

**Tabela: `automacao_logs`**
- id, automacao_id
- status, dados_enviados, resposta
- erro, codigo_http, tempo_ms
- timestamp

**Índices:**
- tenant_id, ativo, automacao_id, created_at (descending)

**RLS Policies:**
- Usuários veem apenas automações do seu tenant
- Apenas sistema pode criar logs

### 5. **Função Serverless** (`supabase/functions/webhook-processor/`)
- Processa webhooks recebidos
- Valida automação ativa
- Executa requisição HTTP
- Registra resultado em log
- Atualiza status da automação
- Trata erros graciosamente
- Suporta todos os métodos HTTP

### 6. **Integração com App**
- Rota `/automacoes` adicionada em `App.tsx`
- Componente Automacoes importado e roteado
- Acessível apenas para usuários autenticados

## 🎯 Funcionalidades Principais

### Para Usuários
1. ✅ Criar webhooks/APIs para sincronizar dados
2. ✅ Configurar quais eventos disparar
3. ✅ Testar integrações antes de ativar
4. ✅ Monitorar execuções via logs
5. ✅ Ativar/desativar on-the-fly
6. ✅ Copiar URLs e secrets automaticamente
7. ✅ Ver último status e erros

### Automações Suportadas
- 📡 **Webhook**: URL que recebe dados quando evento ocorre
- 🔌 **API**: Integração com sistemas externos
- 🎯 **Entidades**: Produtos, Leads, Imóveis, Tarefas
- 📅 **Eventos**: Criação, Atualização, Deleção, Manual
- ⏰ **Frequência**: Execução periódica opcional

### Segurança
- 🔐 Webhook Secret automático
- 👥 RLS policies por tenant
- ✅ Validação de Headers
- 🛡️ Verificação de autenticação
- 🚨 Rastreamento de erros

## 📊 Dados Disponíveis

Ao disparar uma automação, os seguintes dados são enviados:

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "nome": "Apartamento Luxo",
  "preco": 500000,
  "tipo": "apartamento",
  "finalidade": "venda",
  "area_total": 120,
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
  "updated_at": "2025-01-15T10:30:00Z"
}
```

## 🔄 Fluxo de Execução

1. **Evento Ocorre** (criação, atualização, etc)
2. **Trigger Acionado** → Busca automações ativas do tipo
3. **Requisição Enviada** → HTTP GET/POST/PUT/PATCH
4. **Resposta Recebida** → Armazena resultado
5. **Log Registrado** → Status, tempo, resposta
6. **Status Atualizado** → Automação reflete resultado

## 📈 Próximos Passos (Opcionais)

1. **Triggers em Tempo Real**
   - Adicionar triggers automáticos no banco de dados
   - Chamar funções serverless automaticamente

2. **Retry Automático**
   - Implementar retry com backoff exponencial
   - Desativar após N tentativas falhadas

3. **Agendador de Tarefas**
   - Execução periódica de automações
   - Cron jobs para sincronização

4. **Transformação de Dados**
   - Mapeamento de campos entre sistemas
   - Conversão de formatos

5. **Template Engine**
   - Usar variáveis nos headers
   - Condicionais nos bodies

6. **Auditoria Completa**
   - Registrar quem criou/editou automações
   - Histórico de alterações de configuração

## 🚀 Como Começar

### 1. **Executar Migração SQL**
```bash
# No dashboard Supabase ou via CLI
supabase db push
```

### 2. **Deploy da Função Serverless**
```bash
supabase functions deploy webhook-processor
```

### 3. **Acessar a Interface**
- Vá para `/automacoes` no aplicativo
- Clique em "+ Nova Automação"
- Preencha os campos
- Teste com o botão ⚡
- Ative quando satisfeito

### 4. **Integrar seu Sistema**
- Receba requisições em seu servidor
- Valide o Webhook Secret
- Processe os dados
- Responda com HTTP 200

## 📝 Exemplos de Uso

### Sincronizar com outro CRM
```
Nome: Sync CRM Externo
Tipo: Webhook
URL: https://seu-crm.com/api/imovel/webhook
Metodo: POST
Entidade: Produtos/Imóveis
Evento: Criacao, Atualizacao
```

### Backup em Cloud Storage
```
Nome: Backup AWS S3
Tipo: API
URL: https://sua-lambda.amazonaws.com/backup
Metodo: PUT
Entidade: Produtos/Imóveis
Evento: Atualizacao
```

### Notificação de Marketing
```
Nome: Email Marketing
Tipo: Webhook
URL: https://marketing.com/api/leads
Metodo: POST
Entidade: Leads/Clientes
Evento: Criacao
```

## ✅ Checklist de Implementação

- [x] Service de automações criado
- [x] Componentes UI criados
- [x] Página de Automações criada
- [x] Tabelas de BD criadas
- [x] RLS Policies configuradas
- [x] Função serverless criada
- [x] Rotas integradas ao App
- [x] Documentação completa
- [ ] Testes unitários
- [ ] Testes E2E
- [ ] Deploy em produção

## 🎓 Documentação

- **Usuário Final**: `docs/AUTOMACOES.md`
- **Técnico**: Este arquivo
- **API**: Funções em `src/services/automacaoService.ts`

## 🆘 Troubleshooting

### "Tabelas não encontradas"
→ Execute a migração SQL no Supabase

### "Função não disparando"
→ Verifique se a automação está ativa
→ Verifique o evento configurado
→ Veja os logs

### "Webhook não recebendo dados"
→ Teste manualmente com botão ⚡
→ Verifique URL está correta
→ Verifique firewall/CORS

## 📞 Suporte
- Consulte `docs/AUTOMACOES.md` para guia do usuário
- Verifique logs de automação na interface
- Teste webhook com curl/Postman
