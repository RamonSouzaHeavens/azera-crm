# Implementação de Modalidades Dinâmicas

## Resumo
O campo de Modalidade foi transformado de um input de texto para um **select com botão +**, permitindo que os usuários selecionem modalidades padrão ou adicionem novas.

## Arquivos Criados/Modificados

### 1. **supabase/migrations/add_modalidades_table.sql**
Criado novo arquivo com SQL para:
- Criar tabela `produto_filtro_modalidades`
- Definir RLS (Row Level Security)
- Criar RPC functions para buscar e adicionar modalidades

**Ações necessárias no Supabase:**
1. Ir para: https://app.supabase.com/project/[seu-projeto]/sql/new
2. Cole o conteúdo de `supabase/migrations/add_modalidades_table.sql`
3. Execute o SQL

### 2. **src/services/modalidadesService.ts**
Novo serviço com funções:
- `getModalidades(tenantId)` - Buscar todas as modalidades do tenant
- `addModalidade(tenantId, nome)` - Adicionar nova modalidade
- `loadModalidades(tenantId)` - Carrega e popula modalidades

### 3. **src/pages/ImovelEditar.tsx**
Modificações:
- Importado `addModalidade` do novo serviço
- Campo de input substituído por select com botão +
- Handler atualizado para salvar no Supabase

## Modalidades Padrão

As seguintes modalidades estão configuradas como padrão:
- R2V
- HMP
- HIS2
- N.R.
- MCMV
- Casa Verde e Amarela
- Alto Padrão
- Econômico
- Pró-Cotista

## Como Usar

### Para o Usuário:
1. Selecionar modalidade do dropdown
2. Clicar no botão `+` para adicionar nova modalidade
3. Digitar o nome e confirmar
4. A nova modalidade é salva no Supabase e fica disponível para seleção

### Para o Desenvolvedor:

Se precisar inicializar modalidades para um tenant específico:

```sql
INSERT INTO produto_filtro_modalidades (tenant_id, nome) 
VALUES 
  ('{tenant_id}', 'R2V'),
  ('{tenant_id}', 'HMP'),
  ('{tenant_id}', 'HIS2'),
  ('{tenant_id}', 'N.R.'),
  ('{tenant_id}', 'MCMV'),
  ('{tenant_id}', 'Casa Verde e Amarela'),
  ('{tenant_id}', 'Alto Padrão'),
  ('{tenant_id}', 'Econômico'),
  ('{tenant_id}', 'Pró-Cotista')
ON CONFLICT (tenant_id, nome) DO NOTHING;
```

## RPC Functions

### get_tenant_modalidades(p_tenant_id)
```sql
SELECT id, nome FROM produto_filtro_modalidades 
WHERE tenant_id = p_tenant_id 
ORDER BY nome ASC
```

### add_tenant_modalidade(p_tenant_id, p_nome)
```sql
INSERT INTO produto_filtro_modalidades (tenant_id, nome)
VALUES (p_tenant_id, p_nome)
RETURNING id, nome, created_at
```

## Segurança

✅ RLS habilitado - usuários só veem modalidades do seu tenant
✅ Validação de entrada (nome não pode estar vazio)
✅ Constraint UNIQUE(tenant_id, nome) - evita duplicatas

## Próximos Passos (Opcional)

1. **Trigger automático**: Criar trigger para popular modalidades padrão automaticamente quando um novo tenant é criado
2. **Admin UI**: Página de administração para gerenciar modalidades globais
3. **Sincronização**: Se tiver múltiplos ambientes, sincronizar modalidades entre eles
