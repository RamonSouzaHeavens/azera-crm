# 🔧 Guia de Configuração - Status da Pipeline nas Conversas

## ⚠️ IMPORTANTE: Siga estes passos em ordem!

### Passo 1: Executar SQL's no Supabase ✅

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo do arquivo `SQL_CONVERSAS_ARQUIVAR_EXCLUIR.sql`
4. Clique em **Run** para executar

**Ou execute os arquivos individuais:**
- `supabase/migrations/20251218_add_conversations_archive_delete.sql`
- `supabase/migrations/20251218_add_clientes_etapa_funil.sql`

### Passo 2: Verificar se as colunas foram criadas ✅

Execute esta query no SQL Editor para verificar:

```sql
-- Verificar colunas criadas
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('conversations', 'clientes')
  AND column_name IN ('archived', 'deleted_at', 'etapa_funil_id')
ORDER BY table_name, column_name;
```

**Resultado esperado:**
```
table_name    | column_name     | data_type
--------------+-----------------+-------------------------
clientes      | etapa_funil_id  | uuid
conversations | archived        | boolean
conversations | deleted_at      | timestamp with time zone
```

### Passo 3: Criar Etapas do Pipeline (se ainda não existir) ✅

Execute este SQL para criar etapas padrão:

```sql
-- Inserir etapas padrão do pipeline (ajuste o tenant_id)
INSERT INTO pipeline_stages (tenant_id, key, label, color, "order")
VALUES
  -- SUBSTITUA 'SEU_TENANT_ID_AQUI' pelo ID do seu tenant
  ('SEU_TENANT_ID_AQUI', 'lead', 'Lead', '#6B7280', 1),
  ('SEU_TENANT_ID_AQUI', 'qualificacao', 'Qualificação', '#3B82F6', 2),
  ('SEU_TENANT_ID_AQUI', 'proposta', 'Proposta', '#F59E0B', 3),
  ('SEU_TENANT_ID_AQUI', 'negociacao', 'Negociação', '#8B5CF6', 4),
  ('SEU_TENANT_ID_AQUI', 'fechamento', 'Fechamento', '#10B981', 5),
  ('SEU_TENANT_ID_AQUI', 'ganho', 'Ganho', '#059669', 6),
  ('SEU_TENANT_ID_AQUI', 'perdido', 'Perdido', '#EF4444', 7)
ON CONFLICT DO NOTHING;
```

**Como descobrir seu tenant_id:**
```sql
-- Descobrir seu tenant_id
SELECT id, name FROM tenants LIMIT 5;
```

### Passo 4: Atribuir Etapas aos Leads ✅

Agora você precisa atribuir etapas aos seus leads. Você pode fazer isso de duas formas:

**Opção A - Atribuir etapa padrão a todos os leads sem etapa:**
```sql
-- Atribuir etapa "Lead" para todos os leads sem etapa
UPDATE clientes
SET etapa_funil_id = (
  SELECT id FROM pipeline_stages
  WHERE key = 'lead'
  AND tenant_id = 'SEU_TENANT_ID_AQUI'
  LIMIT 1
)
WHERE etapa_funil_id IS NULL
AND tenant_id = 'SEU_TENANT_ID_AQUI';
```

**Opção B - Atribuir manualmente pela interface:**
- Vá na página de Leads
- Edite cada lead
- Selecione a etapa do pipeline

### Passo 5: Verificar se está funcionando ✅

Execute esta query para ver os leads com suas etapas:

```sql
-- Ver leads com suas etapas
SELECT
  c.nome,
  c.telefone,
  ps.label as etapa,
  ps.color as cor_etapa
FROM clientes c
LEFT JOIN pipeline_stages ps ON c.etapa_funil_id = ps.id
WHERE c.tenant_id = 'SEU_TENANT_ID_AQUI'
LIMIT 10;
```

### Passo 6: Testar na Interface ✅

1. Recarregue a página de Conversas (F5)
2. Verifique se o badge da etapa aparece ao lado da data
3. O badge deve ter:
   - Texto: nome da etapa (ex: "Qualificação")
   - Cor: cor definida na pipeline_stages
   - Tamanho: pequeno (9px)

---

## 🐛 Troubleshooting

### Problema: Badge não aparece

**Possíveis causas:**

1. **SQL não foi executado**
   - Solução: Execute o SQL do Passo 1

2. **Lead não tem etapa definida**
   - Solução: Execute o SQL do Passo 4

3. **Etapas não foram criadas**
   - Solução: Execute o SQL do Passo 3

4. **Erro na query do Supabase**
   - Solução: Verifique o console do navegador (F12)
   - Procure por erros relacionados a "pipeline_stages"

### Problema: Erro "column does not exist"

**Solução:**
- Execute novamente os SQL's do Passo 1
- Verifique se as colunas foram criadas (Passo 2)

### Problema: Badge aparece mas sem cor

**Solução:**
- Verifique se a etapa tem cor definida:
```sql
SELECT key, label, color FROM pipeline_stages
WHERE tenant_id = 'SEU_TENANT_ID_AQUI';
```

---

## 📝 Checklist Final

- [ ] SQL's executados no Supabase
- [ ] Colunas verificadas (Passo 2)
- [ ] Etapas do pipeline criadas (Passo 3)
- [ ] Tenant ID identificado
- [ ] Leads com etapas atribuídas (Passo 4)
- [ ] Query de verificação executada (Passo 5)
- [ ] Página recarregada (F5)
- [ ] Badge aparecendo na interface

---

**Após seguir todos os passos, o status da pipeline deve aparecer ao lado da data em cada conversa!** 🎉
