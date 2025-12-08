# Sistema de Campos Personalizados e Filtros

## Visão Geral

Sistema que permite criar campos personalizados dinâmicos em produtos e utilizá-los como filtros na listagem. Os valores são armazenados diretamente na coluna `filtros` (JSONB) da tabela `produtos`, simplificando a arquitetura e eliminando a necessidade de tabelas de relacionamento.

## Arquitetura

### Tabelas Envolvidas

1. **`product_custom_fields`** - Define os campos personalizados
   - `id`: UUID único do campo
   - `tenant_id`: Isolamento multi-tenant
   - `field_key`: Chave técnica única (ex: `field_1699876543210`)
   - `field_label`: Nome exibido ao usuário (ex: "Quantidade de Quartos")
   - `field_type`: Tipo do campo (`text`, `number`, `date`, `select`)
   - `field_options`: Array de opções (apenas para tipo `select`)
   - `field_default`: Valor padrão opcional
   - `show_in_filters`: Booleano - exibir no filtro (✅ default true)
   - `show_in_list`: Booleano - exibir na listagem (✅ default true)
   - `searchable`: Booleano - pesquisável (✅ default true)
   - `active`: Booleano - campo ativo
   - `display_order`: Ordem de exibição

2. **`produtos`** - Armazena os produtos
   - `filtros`: JSONB - armazena valores dos campos personalizados
   - Estrutura: `{ "field_uuid": "valor", "outro_field_uuid": 123 }`

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│ 1. CRIAÇÃO DE CAMPO PERSONALIZADO                      │
│    User → ProdutoNovo.tsx → Modal de Campo             │
│    → Supabase.insert(product_custom_fields)            │
│    → Estado local customFields atualizado              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. PREENCHIMENTO DO PRODUTO                            │
│    User digita no input controlado                     │
│    → onChange atualiza customFieldValues[field.id]     │
│    → Estado: { "uuid-123": "3 quartos" }              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. SALVAMENTO DO PRODUTO                               │
│    handleSalvar() executa                              │
│    → Supabase.insert(produtos)                         │
│    → Campo filtros: customFieldValues (JSONB)          │
│    → DB: { filtros: { "uuid-123": "3 quartos" } }     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. EDIÇÃO DO PRODUTO (NOVO)                            │
│    ProdutoEditar.tsx carrega produto                   │
│    → Lê valores de produtos.filtros                    │
│    → setCustomFieldValues(produto.filtros)             │
│    → User edita campos personalizados                  │
│    → handleSalvar() atualiza produtos.filtros          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. FILTRAGEM NA LISTAGEM                               │
│    ProdutosEquipe.tsx carrega produtos                 │
│    → fetchProdutos() traz produtos.filtros             │
│    → User preenche filtro customFields[uuid] = "3"     │
│    → filteredByStatus verifica item.filtros[uuid]      │
│    → Match: exibe produto                              │
└─────────────────────────────────────────────────────────┘
```

## Implementação

### 1. Criação de Campo Personalizado (ProdutoNovo.tsx)

```typescript
const handleSaveField = async () => {
  const { data, error } = await supabase
    .from('product_custom_fields')
    .insert({
      tenant_id: tenantId,
      field_key: `field_${Date.now()}`,
      field_label: fieldForm.nome,
      field_type: fieldForm.tipo,
      field_default: fieldForm.informacao,
      field_options: fieldForm.tipo === 'select' ? fieldForm.opcoes : null,
      active: true,
      show_in_list: true,
      show_in_filters: true, // ✅ Aparece nos filtros
      searchable: true
    })
    .select()
}
```

### 2. Inputs Controlados com Estado

**PROBLEMA ANTERIOR**: Uso de `defaultValue` impedia React de gerenciar estado

```tsx
// ❌ ERRADO - defaultValue não atualiza estado
<input defaultValue={field.informacao} />
```

**SOLUÇÃO**: Inputs controlados com `value` e `onChange`

```tsx
// ✅ CORRETO - Input controlado
<input
  value={customFieldValues[field.id] || ''}
  onChange={(e) => setCustomFieldValues(prev => ({ 
    ...prev, 
    [field.id]: e.target.value 
  }))}
/>
```

### 3. Inicialização de Valores Padrão

```tsx
useEffect(() => {
  const loadCustomFields = async () => {
    const { data } = await supabase
      .from('product_custom_fields')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
    
    if (data) {
      const fields = data.map(f => ({
        id: f.id,
        nome: f.field_label,
        informacao: f.field_default || '',
        tipo: f.field_type,
        opcoes: f.field_options
      }))
      setCustomFields(fields)
      
      // ✅ Inicializar valores padrão
      const initialValues: Record<string, any> = {}
      fields.forEach(field => {
        if (field.informacao) {
          initialValues[field.id] = field.informacao
        }
      })
      setCustomFieldValues(initialValues)
    }
  }
  
  loadCustomFields()
}, [tenantId])
```

### 4. Salvamento no Produto

```tsx
const handleSalvar = async (e: React.FormEvent) => {
  e.preventDefault()
  
  const novoProduto = {
    tenant_id: tenantId,
    nome: titulo,
    descricao: descricao,
    valor: valor ? Number(valor) : null,
    categoria: categoria,
    capa_url: capa,
    galeria: galeria,
    anexos: anexos,
    filtros: customFieldValues // ✅ JSONB com valores dos campos
  }

  const { data, error } = await supabase
    .from('produtos')
    .insert(novoProduto)
    .select()
    .single()
}
```

### 6. Edição de Produto (ProdutoEditar.tsx)

```tsx
const handleSalvar = async (e: React.FormEvent) => {
  e.preventDefault()
  
  const updateData = {
    nome: titulo,
    descricao: descricao || null,
    valor: valor ? Number(valor) : null,
    capa_url: capa,
    galeria: galeria.length > 0 ? galeria : null,
    anexos: anexos.length > 0 ? anexos : null,
    categoria: categoria || null,
    filtros: customFieldValues // ✅ Atualizar campos personalizados no campo filtros
  }

  const { error } = await supabase
    .from('produtos')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw error
  
  toast.success('Produto atualizado com sucesso!')
  navigate(`/produtos/${id}`)
}
```

### 7. Carregamento de Valores na Edição

```tsx
useEffect(() => {
  const loadProduct = async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()
    
    if (data) {
      setTitulo(data.nome || '')
      setDescricao(data.descricao || '')
      setValor(data.valor ? String(data.valor) : '')
      setCategoria(data.categoria || '')
      setCapa(data.capa_url || null)
      setGaleria((data.galeria as string[]) || [])
      setAnexos((data.anexos as string[]) || [])
      
      // ✅ Carregar valores de campos personalizados do campo filtros
      if (data.filtros && typeof data.filtros === 'object') {
        setCustomFieldValues(data.filtros as Record<string, string | number | null>)
      }
    }
  }
  
  loadProduct()
}, [id, tenantId])
```

```tsx
// Interface do filtro
interface ImovelFilters {
  categoria: string
  precoMin: string
  precoMax: string
  customFields: Record<string, string> // ✅ Campos dinâmicos
}

// Lógica de filtragem
const filteredByStatus = useMemo(() => {
  let result = imoveis

  // Filtro por categoria
  if (filters.categoria) {
    result = result.filter(item => item.categoria === filters.categoria)
  }

  // Filtro por preço
  if (filters.precoMin) {
    const min = Number(filters.precoMin)
    result = result.filter(item => (item.valor || 0) >= min)
  }

  if (filters.precoMax) {
    const max = Number(filters.precoMax)
    result = result.filter(item => (item.valor || 0) <= max)
  }

  // ✅ Filtro por campos personalizados com tipos específicos
  Object.keys(filters.customFields).forEach(fieldId => {
    const filterValue = filters.customFields[fieldId]
    if (filterValue) {
      result = result.filter(item => {
        const itemValue = item.filtros?.[fieldId]
        if (!itemValue) return false
        
        let match = false
        
        // Para campos number: comparação numérica exata
        if (fieldDef?.field_type === 'number') {
          const filterNum = Number(filterValue)
          const itemNum = Number(itemValue)
          match = !isNaN(filterNum) && !isNaN(itemNum) && itemNum === filterNum
        }
        // Para campos select: comparação exata
        else if (fieldDef?.field_type === 'select') {
          match = String(itemValue).toLowerCase() === String(filterValue).toLowerCase()
        }
        // Para campos text/date: busca parcial
        else {
          match = String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase())
        }
        
        return match
      })
    }
  })

  return result
}, [imoveis, filters])
```

### 6. Popup de Filtros com Campos Dinâmicos

```tsx
{/* Campos personalizados dinâmicos */}
{customFieldsForFilters.map(field => (
  <div key={field.id}>
    <label className="block text-xs font-semibold mb-2">
      {field.nome}
    </label>
    
    {field.tipo === 'text' && (
      <input
        type="text"
        value={filters.customFields[field.id] || ''}
        onChange={(e) => setFilters(prev => ({
          ...prev,
          customFields: {
            ...prev.customFields,
            [field.id]: e.target.value
          }
        }))}
        placeholder={`Filtrar por ${field.nome}`}
      />
    )}
    
    {field.tipo === 'number' && (
      <input
        type="number"
        value={filters.customFields[field.id] || ''}
        onChange={(e) => setFilters(prev => ({
          ...prev,
          customFields: {
            ...prev.customFields,
            [field.id]: e.target.value
          }
        }))}
        placeholder={`Filtrar por ${field.nome}`}
      />
    )}
    
    {field.tipo === 'select' && field.opcoes && (
      <select
        value={filters.customFields[field.id] || ''}
        onChange={(e) => setFilters(prev => ({
          ...prev,
          customFields: {
            ...prev.customFields,
            [field.id]: e.target.value
          }
        }))}
      >
        <option value="">Todos</option>
        {field.opcoes.map((opcao, idx) => (
          <option key={idx} value={opcao}>{opcao}</option>
        ))}
      </select>
    )}
  </div>
))}
```

## Tipos de Campos Suportados

### 1. Text (Texto)
- Input livre de texto
- Filtro com busca parcial case-insensitive
- Exemplo: "Endereço", "Observações"

### 2. Number (Número)
- Input numérico
- Filtro exato ou por range
- Exemplo: "Quantidade de Quartos", "Metragem"

### 3. Date (Data)
- Input de calendário (`type="date"`)
- Filtro por data específica ou range
- Exemplo: "Data de Construção", "Validade"

### 4. Select (Seleção)
- Dropdown com opções predefinidas
- Filtro por valor exato
- Exemplo: "Estado", "Tipo de Acabamento"

## Vantagens da Solução JSONB

### ✅ Vantagens

1. **Simplicidade**: Sem joins complexos ou tabelas intermediárias
2. **Performance**: Dados no mesmo registro (menos queries)
3. **Flexibilidade**: Adicionar campos sem alterar schema
4. **Atomicidade**: Salvar e atualizar em uma única operação
5. **Indexação**: PostgreSQL permite índices GIN em JSONB
6. **Queries**: Suporte nativo a operadores JSONB (`->`, `->>`, `@>`)

### ⚠️ Considerações

1. **Limite de tamanho**: JSONB tem limite de 1GB por campo (suficiente)
2. **Normalização**: Dados não normalizados (aceito para flexibilidade)
3. **Validação**: Validar no cliente (não há constraints no JSONB)

## Debugging

### Console Logs Úteis

```tsx
// Verificar valores antes de salvar
console.log('📝 Custom Field Values:', customFieldValues)

// Verificar produto após carregar
console.log('🔍 Filtros do item:', item.filtros)

// Verificar filtros ativos
console.log('🎯 Filtros ativos:', filters.customFields)
```

### Checklist de Validação

- [x] Campo criado aparece em `product_custom_fields` com `show_in_filters=true`
- [x] Input do campo é controlado (`value` + `onChange`)
- [x] `customFieldValues` contém o ID do campo como chave
- [x] Produto salvo tem `filtros` com valor do campo (ProdutoNovo.tsx)
- [x] Produto editado atualiza `filtros` corretamente (ProdutoEditar.tsx)
- [x] Popup de filtro renderiza o campo personalizado
- [x] Filtro compara `item.filtros[fieldId]` com lógica de tipos específica
- [x] Produtos são filtrados conforme esperado (criados e editados)
- [x] Sistema padronizado para usar apenas campo `filtros` (sem `product_custom_field_values`)

## Exemplo Completo

### 1. Criar Campo "Quartos"

```
User → Modal → Nome: "Quartos", Tipo: number
→ Salvar → DB: { field_label: "Quartos", field_type: "number", show_in_filters: true }
```

### 2. Criar Produto

```
User → Título: "Casa", Quartos: 3
→ customFieldValues: { "uuid-quartos": 3 }
→ Salvar → DB: { nome: "Casa", filtros: { "uuid-quartos": 3 } }
```

### 3. Editar Produto

```
User → ProdutoEditar.tsx → Alterar Quartos: 4
→ customFieldValues: { "uuid-quartos": 4 }
→ Salvar → DB: { filtros: { "uuid-quartos": 4 } } (atualizado)
```

### 4. Filtrar

```
User → ProdutosEquipe.tsx → Filtro Quartos: 4
→ filters.customFields: { "uuid-quartos": "4" }
→ item.filtros["uuid-quartos"] === 4 (comparação numérica exata)
→ Match ✅ → Produto exibido
```

## Migração de Dados (RESOLVIDO ✅)

**Status**: Sistema padronizado para usar apenas o campo `filtros` da tabela `produtos`.

**Mudanças Implementadas:**
- ✅ ProdutoNovo.tsx: Salva campos personalizados no campo `filtros` (JSONB)
- ✅ ProdutoEditar.tsx: Carrega e salva campos personalizados no campo `filtros` (JSONB)
- ✅ ProdutosEquipe.tsx: Filtra baseado no campo `filtros` com lógica de tipos específicos
- ✅ Removida dependência da tabela `product_custom_field_values`

**Migração Anterior (se necessário):**
```sql
-- Migrar valores da tabela product_custom_field_values para coluna filtros
UPDATE produtos p
SET filtros = COALESCE(p.filtros, '{}'::jsonb) || (
  SELECT jsonb_object_agg(
    pcfv.custom_field_id, 
    COALESCE(pcfv.value_text, pcfv.value_number::text, pcfv.value_boolean::text, pcfv.value_date::text, pcfv.value_datetime::text, pcfv.value_json::text)
  )
  FROM product_custom_field_values pcfv
  WHERE pcfv.produto_id = p.id
)
WHERE EXISTS (
  SELECT 1 
  FROM product_custom_field_values pcfv 
  WHERE pcfv.produto_id = p.id
);
```

## Próximas Melhorias

1. **Validação de Tipos**: Garantir que number seja número, date seja data válida
2. **Campos Obrigatórios**: Adicionar validação de `required: true`
3. **Máscaras**: Adicionar máscaras para CPF, telefone, CEP, etc
4. **Filtros Avançados**: Range de datas, múltipla seleção
5. **Exportação**: Incluir campos personalizados no CSV
6. **Busca**: Indexar `filtros` com GIN para busca full-text

## Correção de Bug - Inconsistência de Dados (NOVEMBRO 2025)

### 🐛 Problema Identificado
- **Sintoma**: Filtros de campos personalizados mostravam valores incorretos
- **Causa**: ProdutoNovo.tsx salvava no campo `filtros`, mas ProdutoEditar.tsx salvava na tabela `product_custom_field_values`
- **Impacto**: Após editar um produto, os filtros liam valores desatualizados

### ✅ Solução Implementada
1. **Padronização**: Todo o sistema agora usa apenas o campo `filtros` da tabela `produtos`
2. **ProdutoEditar.tsx**: Modificado para carregar e salvar no campo `filtros`
3. **Filtragem**: Implementada lógica de tipos específicos (exato para select, parcial para text, numérico para number)
4. **Limpeza**: Removidos logs de debug e código obsoleto

### 📊 Arquivos Modificados
- `src/pages/ProdutoEditar.tsx`: Padronizado para usar campo `filtros`
- `src/components/team/ProdutosEquipe.tsx`: Lógica de filtragem aprimorada
- `docs/CAMPOS_PERSONALIZADOS_FILTROS.md`: Documentação atualizada

### 🧪 Validação
- ✅ Build sem erros
- ✅ Servidor de desenvolvimento funcionando
- ✅ Filtros funcionam corretamente para produtos criados e editados

## Referências

- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [Supabase JSONB Guide](https://supabase.com/docs/guides/database/json)
- [React Controlled Components](https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable)
