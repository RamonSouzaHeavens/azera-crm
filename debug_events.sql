-- Verificar eventos criados - Versão SUPER SEGURA
SELECT
    id,
    title,
    start_date,
    tenant_id,
    source,
    created_at
    -- user_id (Vou tentar sem user_id primeiro pra garantir que rode, depois vemos se user_id existe)
FROM calendar_events
ORDER BY created_at DESC
LIMIT 5;
