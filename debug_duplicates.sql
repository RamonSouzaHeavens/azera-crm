
-- Verificar se existem conversas duplicadas para o mesmo telefone
SELECT contact_phone, count(*), array_agg(id) as ids
FROM conversations
GROUP BY contact_phone
HAVING count(*) > 1;

-- Verificar as últimas mensagens de uma conversa específica (troque o ID se necessário)
SELECT id, conversation_id, content, direction, external_message_id, created_at
FROM messages
WHERE conversation_id IN (
    SELECT id FROM conversations WHERE contact_phone LIKE '%553191318312%' -- Seu número do print
)
ORDER BY created_at DESC;
