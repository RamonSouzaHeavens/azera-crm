# 🚀 Guia de Migração: Azera CRM Universal

## 📋 Visão Geral

Este guia descreve o processo de transformação do Azera CRM de um sistema focado em imóveis para um **CRM Universal** que suporta qualquer tipo de produto/serviço através de **campos personalizados dinâmicos**.

## 🎯 Objetivos

- ✅ Remover dependência de campos específicos de imóveis
- ✅ Criar sistema flexível de campos personalizados (custom fields)
- ✅ Permitir que cada tenant defina seus próprios campos
- ✅ Manter compatibilidade com dados existentes
- ✅ Suportar qualquer tipo de negócio (imóveis, produtos, serviços, etc)

## 🏗️ Nova Arquitetura

### Tabelas Criadas

```
┌─────────────────────────────────┐
│ product_custom_fields           │  ← Definições de campos
│ - id, tenant_id, field_key      │
│ - field_label, field_type       │
│ - validations, visibility...    │
└─────────────────────────────────┘
                 │
                 │ 1:N
                 ▼
┌─────────────────────────────────┐
│ product_custom_field_values     │  ← Valores por produto
│ - produto_id, custom_field_id   │
│ - value_text, value_number...   │
└─────────────────────────────────┘
```

### Tipos de Campos Suportados

| Tipo | Descrição | Uso |
|------|-----------|-----|
| `text` | Texto curto | Nome, código, etc |
| `textarea` | Texto longo | Descrições, observações |
| `number` | Número | Quantidade, medidas |
| `currency` | Moeda (BRL) | Preços, valores |
| `percentage` | Porcentagem | Descontos, taxas |
| `date` | Data | Entregas, vencimentos |
| `datetime` | Data e hora | Timestamps |
| `boolean` | Sim/Não | Flags, status |
| `select` | Seleção única | Categorias, status |
| `multiselect` | Seleção múltipla | Tags, características |
| `url` | URL | Links, sites |
| `email` | Email | Contatos |
| `phone` | Telefone | Contatos |
| `file` | Arquivo | Documentos |
| `image` | Imagem | Fotos, logos |

## 📝 Passo a Passo da Migração

### 1. Backup do Banco de Dados

```bash
# Fazer backup completo do Supabase antes de iniciar
# No dashboard do Supabase: Settings → Database → Backups
```

### 2. Executar Migrations SQL

Execute os arquivos na ordem:

```bash
# 1. Criar estrutura de custom fields
supabase/migrations/20251114000000_universal_produtos_migration.sql

# 2. Migrar dados de imóveis para custom fields
supabase/migrations/20251114000001_migrate_imoveis_to_custom_fields.sql
```

#### Via Dashboard Supabase
1. Acesse: **SQL Editor**
2. Cole o conteúdo do arquivo
3. Clique em **Run**

#### Via CLI
```bash
supabase db push
```

### 3. Verificar Migração

```sql
-- Verificar custom fields criados
SELECT tenant_id, count(*) as total_fields
FROM product_custom_fields
GROUP BY tenant_id;

-- Verificar valores migrados
SELECT 
  p.nome as produto,
  COUNT(cfv.id) as total_valores
FROM produtos p
LEFT JOIN product_custom_field_values cfv ON cfv.produto_id = p.id
GROUP BY p.id, p.nome
ORDER BY total_valores DESC;

-- Verificar produtos categorizados
SELECT categoria, COUNT(*) as total
FROM produtos
GROUP BY categoria;
```

### 4. Atualizar Código Frontend

#### 4.1. Importar novos tipos
```typescript
// Em qualquer arquivo que use produtos
import type { 
  ProdutoUniversal, 
  CustomFieldDefinition 
} from '../types/customFields'
import { 
  getCustomFields, 
  getProductWithCustomFields 
} from '../services/customFieldsService'
```

#### 4.2. Carregar Custom Fields no componente
```typescript
const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])

useEffect(() => {
  async function loadCustomFields() {
    if (!tenantId) return
    const fields = await getCustomFields(tenantId)
    setCustomFields(fields)
  }
  loadCustomFields()
}, [tenantId])
```

#### 4.3. Renderizar campos dinamicamente
```typescript
<CustomFieldsForm 
  customFields={customFields}
  values={produto.custom_fields}
  onChange={(key, value) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [key]: value
      }
    }))
  }}
/>
```

### 5. Criar Campos Personalizados (Admin)

Os tenants podem criar seus próprios campos através da interface de administração:

```typescript
// Exemplo: Criar campo "Marca" para produtos
await createCustomField(tenantId, {
  field_key: 'marca',
  field_label: 'Marca',
  field_type: 'text',
  field_group: 'Informações Básicas',
  required: true,
  show_in_list: true,
  show_in_filters: true,
  searchable: true
})
```

## 🎨 Componentes Reutilizáveis

### CustomFieldInput
```typescript
interface CustomFieldInputProps {
  field: CustomFieldDefinition
  value: any
  onChange: (value: any) => void
  error?: string
}
```

Renderiza automaticamente o input correto baseado no tipo do campo.

### CustomFieldsForm
```typescript
interface CustomFieldsFormProps {
  customFields: CustomFieldDefinition[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors?: Record<string, string>
}
```

Renderiza um formulário completo com todos os custom fields, agrupados.

### CustomFieldValue
```typescript
interface CustomFieldValueProps {
  field: CustomFieldDefinition
  value: any
}
```

Renderiza o valor formatado para exibição (não editável).

## 🔄 Fluxo de Dados

### Criação de Produto

```
1. Usuário preenche form
   ↓
2. Frontend valida custom fields
   ↓
3. Salva produto (campos padrão)
   ↓
4. Salva custom field values
   ↓
5. Retorna produto completo
```

### Listagem de Produtos

```
1. Busca produtos (campos padrão)
   ↓
2. Para cada produto:
   - Busca custom fields definidos
   - Busca valores do produto
   - Mescla dados
   ↓
3. Renderiza listagem com custom fields
```

## 🎯 Casos de Uso

### Imobiliária
```typescript
// Campos personalizados
- Tipo do Imóvel (select)
- Quartos (number)
- Área Total (number)
- Endereço (text)
- Condomínio (currency)
- Aceitação de Pets (boolean)
```

### E-commerce
```typescript
// Campos personalizados
- Marca (text)
- Modelo (text)
- Cor (multiselect)
- Tamanho (select)
- Peso (number)
- Garantia (text)
```

### Serviços
```typescript
// Campos personalizados
- Duração (number)
- Categoria (select)
- Nível de Complexidade (select)
- Requer Agendamento (boolean)
- Profissionais Necessários (number)
```

### Academia
```typescript
// Campos personalizados
- Modalidade (multiselect)
- Duração do Plano (select)
- Inclui Nutricionista (boolean)
- Horários Disponíveis (multiselect)
```

## 🛡️ Segurança (RLS)

Todas as tabelas de custom fields possuem Row Level Security:

```sql
-- Usuários só veem campos do próprio tenant
-- Admins podem criar/editar/deletar campos
-- Valores são isolados por produto/tenant
```

## 📊 Monitoramento

### Estatísticas de Uso
```typescript
const stats = await getCustomFieldStats(tenantId)

// Retorna para cada campo:
// - total_products: Total de produtos
// - filled_count: Quantos preenchidos
// - fill_rate: Taxa de preenchimento (%)
```

### Campos Mais Usados
```sql
SELECT 
  cf.field_label,
  COUNT(cfv.id) as uso
FROM product_custom_fields cf
LEFT JOIN product_custom_field_values cfv ON cfv.custom_field_id = cf.id
WHERE cf.tenant_id = '<tenant_id>'
GROUP BY cf.id, cf.field_label
ORDER BY uso DESC;
```

## 🚨 Troubleshooting

### Erro: "duplicate key value violates unique constraint"
**Causa**: Tentando criar campo com `field_key` já existente  
**Solução**: Use um `field_key` único

### Custom fields não aparecem
**Causa**: Campos desativados (`active = false`)  
**Solução**: Ative os campos ou use `getCustomFields(tenantId, false)`

### Valores não salvam
**Causa**: Tipo de valor incompatível com tipo do campo  
**Solução**: Use `validateCustomFieldValue()` antes de salvar

### Performance lenta em listagens
**Causa**: Muitos custom fields carregados  
**Solução**: Use `show_in_list = true` apenas para campos essenciais

## 🎓 Boas Práticas

1. **Naming Convention**
   - Use `snake_case` para `field_key`
   - Exemplo: `area_total`, `num_quartos`, `aceita_pets`

2. **Agrupamento**
   - Agrupe campos relacionados
   - Exemplo: "Características", "Localização", "Preços"

3. **Validações**
   - Defina `min_value` e `max_value` para números
   - Use `pattern` para formatos específicos
   - Marque campos essenciais como `required`

4. **Performance**
   - Evite carregar todos os campos sempre
   - Use `show_in_list` com critério
   - Cache definições de campos

5. **UX**
   - Forneça `placeholder` e `help_text`
   - Use `field_group` para organizar formulários
   - Ordene com `display_order`

## 📚 Próximos Passos

1. ✅ Executar migrations
2. ✅ Testar migração de dados
3. ⏳ Criar componentes reutilizáveis
4. ⏳ Atualizar páginas de produtos
5. ⏳ Criar painel de gerenciamento de campos
6. ⏳ Documentar API externa
7. ⏳ Treinar equipe

## 🤝 Suporte

- Documentação: `/docs/CUSTOM_FIELDS.md`
- Issues: GitHub Issues
- Email: suporte@azera.com.br

---

**Data da Migração**: 2025-11-14  
**Versão**: 2.0.0  
**Status**: ✅ Pronto para produção
