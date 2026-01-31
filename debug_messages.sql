
-- Debug messages
SELECT id, conversation_id, content, direction, external_message_id, created_at
FROM messages
ORDER BY created_at DESC
LIMIT 20;

-- Check if there are duplicates of external_message_id
SELECT external_message_id, count(*)
FROM messages
WHERE external_message_id IS NOT NULL
GROUP BY external_message_id
HAVING count(*) > 1;
