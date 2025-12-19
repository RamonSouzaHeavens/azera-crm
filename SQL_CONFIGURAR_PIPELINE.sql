-- =====================================================
-- SQL AUXILIAR - Configuração Completa do Pipeline
-- Execute este arquivo DEPOIS do SQL_CONVERSAS_ARQUIVAR_EXCLUIR.sql
-- =====================================================

-- PASSO 1: Descobrir seu TENANT_ID
-- Execute esta query primeiro e anote o ID do seu tenant
SELECT id, name, created_at
FROM tenants
ORDER BY created_at DESC;

-- =====================================================
-- PASSO 2: Criar Etapas do Pipeline
-- IMPORTANTE: Substitua 'SEU_TENANT_ID_AQUI' pelo ID que você anotou acima
-- =====================================================

-- Inserir etapas padrão do pipeline
INSERT INTO pipeline_stages (tenant_id, key, label, color, "order")
VALUES
  -- SUBSTITUA 'SEU_TENANT_ID_AQUI' em todas as linhas abaixo
  ('SEU_TENANT_ID_AQUI', 'lead', 'Lead', '#6B7280', 1),
  ('SEU_TENANT_ID_AQUI', 'qualificacao', 'Qualificação', '#3B82F6', 2),
  ('SEU_TENANT_ID_AQUI', 'proposta', 'Proposta', '#F59E0B', 3),
  ('SEU_TENANT_ID_AQUI', 'negociacao', 'Negociação', '#8B5CF6', 4),
  ('SEU_TENANT_ID_AQUI', 'fechamento', 'Fechamento', '#10B981', 5),
  ('SEU_TENANT_ID_AQUI', 'ganho', 'Ganho', '#059669', 6),
  ('SEU_TENANT_ID_AQUI', 'perdido', 'Perdido', '#EF4444', 7)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PASSO 3: Verificar se as etapas foram criadas
-- =====================================================

SELECT
  key,
  label,
  color,
  "order"
FROM pipeline_stages
WHERE tenant_id = 'SEU_TENANT_ID_AQUI'
ORDER BY "order";

-- =====================================================
-- PASSO 4: Atribuir etapa padrão aos leads sem etapa
-- IMPORTANTE: Substitua 'SEU_TENANT_ID_AQUI' pelo ID do seu tenant
-- =====================================================

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

-- =====================================================
-- PASSO 5: Verificar leads com suas etapas
-- =====================================================

SELECT
  c.nome,
  c.telefone,
  c.status,
  ps.label as etapa_pipeline,
  ps.color as cor_etapa,
  c.created_at
FROM clientes c
LEFT JOIN pipeline_stages ps ON c.etapa_funil_id = ps.id
WHERE c.tenant_id = 'SEU_TENANT_ID_AQUI'
ORDER BY c.created_at DESC
LIMIT 20;

-- =====================================================
-- PASSO 6: Verificar conversas com etapas dos leads
-- =====================================================

SELECT
  conv.id as conversa_id,
  c.nome as lead_nome,
  ps.label as etapa,
  ps.color as cor,
  conv.last_message_at
FROM conversations conv
INNER JOIN clientes c ON conv.contact_id = c.id
LEFT JOIN pipeline_stages ps ON c.etapa_funil_id = ps.id
WHERE conv.tenant_id = 'SEU_TENANT_ID_AQUI'
AND conv.deleted_at IS NULL
ORDER BY conv.last_message_at DESC
LIMIT 10;

-- =====================================================
-- QUERIES ÚTEIS PARA MANUTENÇÃO
-- =====================================================

-- Contar leads por etapa
SELECT
  ps.label as etapa,
  COUNT(c.id) as total_leads
FROM pipeline_stages ps
LEFT JOIN clientes c ON c.etapa_funil_id = ps.id AND c.tenant_id = 'SEU_TENANT_ID_AQUI'
WHERE ps.tenant_id = 'SEU_TENANT_ID_AQUI'
GROUP BY ps.label, ps."order"
ORDER BY ps."order";

-- Ver leads sem etapa definida
SELECT
  id,
  nome,
  telefone,
  status,
  created_at
FROM clientes
WHERE etapa_funil_id IS NULL
AND tenant_id = 'SEU_TENANT_ID_AQUI'
ORDER BY created_at DESC;

-- Atualizar cor de uma etapa específica
-- UPDATE pipeline_stages
-- SET color = '#NOVA_COR'
-- WHERE key = 'qualificacao'
-- AND tenant_id = 'SEU_TENANT_ID_AQUI';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
