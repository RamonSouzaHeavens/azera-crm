-- Verificar formato do telefone no perfil
SELECT id, full_name, phone
FROM profiles
WHERE phone IS NOT NULL AND phone != ''
LIMIT 5;
