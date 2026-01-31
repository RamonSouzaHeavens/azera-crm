-- CORRIGIR: Adicionar admin_phones na integração correta (infiniteimoveis)
UPDATE integrations
SET config = COALESCE(config, '{}'::jsonb) || '{"admin_phones": ["5531991318312"]}'::jsonb
WHERE id = 'f4217b8c-80e7-442e-bc44-4e4bf56b7e62';

-- Verificar resultado
SELECT
    id,
    credentials->>'instance_id' as instance_id,
    config->'admin_phones' as admin_phones
FROM integrations
WHERE channel = 'whatsapp' AND is_active = true;
