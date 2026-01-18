-- Debug: Ver todas as integrações WhatsApp ativas
SELECT
    id,
    tenant_id,
    channel,
    provider,
    status,
    is_active,
    credentials->>'instance_id' as instance_id,
    credentials->>'instance_owner' as instance_owner,
    credentials->>'base_url' as base_url,
    config
FROM integrations
WHERE channel IN ('whatsapp', 'wpp', 'whatsapp-api', 'uazapi')
ORDER BY created_at DESC;

-- O problema é que o webhook recebe owner='5511936598541' mas sua integração
-- tem instance_owner='5531...' (número diferente!)

-- Para corrigir, você precisa atualizar o instance_owner da integração "Heavens"
-- com o número correto do WhatsApp conectado à instância UAZAPI.

-- EXEMPLO DE CORREÇÃO (substitua o ID e o número correto):
-- UPDATE integrations
-- SET credentials = jsonb_set(
--     credentials,
--     '{instance_owner}',
--     '"5511936598541"'::jsonb
-- )
-- WHERE id = 'SEU_INTEGRATION_ID';
