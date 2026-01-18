-- Verifica conversas com mensagens não lidas no tenant específico
SELECT
  id,
  contact_name,
  contact_phone,
  unread_count,
  updated_at
FROM conversations
WHERE tenant_id = '54dc3073-600d-4a0f-b5c7-1baaca0490f8'
  AND unread_count > 0
  AND deleted_at IS NULL
ORDER BY updated_at DESC;

-- Resumo: total de conversas com unread_count > 0
SELECT COUNT(*) as total_conversas_nao_lidas
FROM conversations
WHERE tenant_id = '54dc3073-600d-4a0f-b5c7-1baaca0490f8'
  AND unread_count > 0
  AND deleted_at IS NULL;
