-- DEBUG: Verificar admin_phones na integração
SELECT
    id,
    tenant_id,
    credentials->>'instance_id' as instance_id,
    config->>'admin_phones' as admin_phones_raw,
    config->'admin_phones' as admin_phones_array,
    is_active
FROM integrations
WHERE channel = 'whatsapp' AND is_active = true;
