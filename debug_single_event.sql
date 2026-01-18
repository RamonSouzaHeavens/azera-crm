-- Verificar se o evento tem user_id preenchido
SELECT
    id,
    title,
    start_date,
    user_id,  -- Essa coluna EXISTE em calendar_events, preciso ver o valor dela
    tenant_id,
    source
FROM calendar_events
WHERE id = '3f412d54-efac-4d83-bddb-052f0bb7e043';
