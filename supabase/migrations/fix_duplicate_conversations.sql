-- Limpar conversas duplicadas, mantendo apenas a mais recente por tenant_id e contact_id
DELETE FROM conversations
WHERE id NOT IN (
  SELECT DISTINCT ON (tenant_id, contact_id) id
  FROM conversations
  ORDER BY tenant_id, contact_id, last_message_at DESC
);

-- Adicionar constraint única para prevenir duplicatas futuras
ALTER TABLE conversations
ADD CONSTRAINT unique_tenant_contact
UNIQUE (tenant_id, contact_id);