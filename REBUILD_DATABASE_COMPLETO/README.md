# 🗂️ REBUILD DATABASE COMPLETO - CRM AZERA

Esta pasta contém **TODOS** os arquivos necessários para reconstruir o banco de dados do zero.

---

## 📋 ORDEM DE EXECUÇÃO

Execute os arquivos **EXATAMENTE NESTA ORDEM** no Supabase SQL Editor:

### **REBUILD DO BANCO (5 arquivos principais)**

1. ✅ **REBUILD_01_ENUMS_EXTENSIONS.sql**
   - Cria extensões e ENUMs
   - Tempo: ~30 segundos

2. ✅ **REBUILD_02_CORE_TABLES.sql**
   - Cria tabelas fundamentais (tenants, profiles, memberships)
   - Tempo: ~1 minuto

3. ✅ **REBUILD_03_BUSINESS_TABLES.sql**
   - Cria tabelas de negócio (clientes, produtos, tarefas)
   - Tempo: ~1 minuto

4. ✅ **REBUILD_04_AUTOMATIONS_WEBHOOKS.sql**
   - Cria automações, webhooks e API keys
   - Tempo: ~45 segundos

5. ✅ **REBUILD_05_INDEXES_RLS_TRIGGERS.sql**
   - Cria índices, RLS policies e triggers
   - Tempo: ~2 minutos

### **CORREÇÕES ADICIONAIS (4 arquivos)**

6. ⚠️ **FIX_TAREFA_ANEXOS.sql**
   - Cria tabela de anexos de tarefas (estava faltando)
   - Tempo: ~10 segundos
   - **CRÍTICO:** Sem isso, upload de anexos em tarefas não funciona

7. ⚠️ **FIX_RPC_FUNCTIONS.sql**
   - Cria funções RPC para leads
   - Tempo: ~15 segundos
   - **IMPORTANTE:** Sem isso, timeline de leads não funciona

8. ⚠️ **FIX_TEAM_RPC_FUNCTIONS.sql**
   - Cria funções RPC para equipes (create_tenant_with_owner, join_team_with_code, get_team_overview)
   - Tempo: ~20 segundos
   - **CRÍTICO:** Sem isso, não consegue criar equipes nem adicionar membros

9. 🆕 **20251119_create_pipeline_stages_table.sql**
   - Cria tabela pipeline_stages (estava faltando)
   - Tempo: ~15 segundos
   - **CRÍTICO:** Sem isso, pipeline de leads não funciona

10. 🆕 **20251119_fix_missing_columns.sql**
    - Adiciona campos faltantes (ativa/ativo) em campanhas e produtos
    - Tempo: ~10 segundos
    - **CRÍTICO:** Sem isso, queries retornam erro 400

---

## 📚 DOCUMENTAÇÃO

- **ANALISE_COMPLETA_APP.md** - Relatório técnico detalhado
- **CHECKLIST_CORRECOES.md** - Passo a passo para executar
- **README.md** - Este arquivo

---

## ⏱️ TEMPO TOTAL

**~8 minutos** para executar todos os 10 arquivos SQL.

---

## ✅ O QUE SERÁ CRIADO

### Tabelas (40 no total)
- tenants, profiles, memberships
- clientes, produtos, campanhas
- tarefas, vendas, despesas
- automacoes, webhooks, api_keys
- lead_origins, lead_custom_fields
- E mais 25 tabelas...

### Índices
- 150+ índices para performance

### RLS Policies
- Políticas de segurança multi-tenant em todas as tabelas

### Triggers
- Auto-update de `updated_at` em 30+ tabelas

### Funções RPC
- `create_tenant_with_owner`
- `join_team_with_code`
- `get_team_overview`
- `add_lead_activity`
- `ensure_default_lead_options`
- E mais 10+ funções...

---

## 🚨 IMPORTANTE

1. **Execute na ordem correta** (1 → 7)
2. **Aguarde cada script terminar** antes de executar o próximo
3. **Não pule nenhum arquivo** (todos são necessários)
4. **Verifique erros** após cada execução

---

## 🆘 TROUBLESHOOTING

### "Extensão já existe"
✅ Normal - o script usa `IF NOT EXISTS`

### "Tabela já existe"
✅ Normal - o script usa `IF NOT EXISTS`

### "Erro de referência circular"
❌ Você pulou algum arquivo - execute na ordem

### "Função não existe"
❌ Execute FIX_RPC_FUNCTIONS.sql

---

## 📞 SUPORTE

Se tiver problemas:
1. Verifique se executou na ordem correta
2. Leia CHECKLIST_CORRECOES.md
3. Veja ANALISE_COMPLETA_APP.md para detalhes técnicos

---

**Criado em:** 19/11/2025  
**Versão:** 1.1 - Adicionadas migrations pipeline_stages e campos faltantes  
**Status:** Testado e Validado ✅
