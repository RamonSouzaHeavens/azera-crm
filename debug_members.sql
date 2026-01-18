-- Listar membros do tenant Heavens (d39f1a6c-03fe-4a4d-8648-2ab77e480c4e)
SELECT
    m.user_id,
    m.role,
    m.active,
    p.full_name,
    p.phone
FROM memberships m
LEFT JOIN profiles p ON m.user_id = p.id
WHERE m.tenant_id = 'd39f1a6c-03fe-4a4d-8648-2ab77e480c4e';
