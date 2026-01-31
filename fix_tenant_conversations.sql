-- ============================================
-- FIX: Desativar integração duplicada
-- ============================================

-- A integração "Heavens" está no tenant errado e é duplicada
-- Vamos DESATIVAR ela (não mover)

-- PASSO 1: Desativar a integração que está no tenant errado
UPDATE integrations
SET is_active = false
WHERE id = 'c4169e1f-831d-4836-a8ea-3c3978e47c4a';

-- PASSO 2: Mover as conversas do tenant errado para o correto
UPDATE conversations
SET tenant_id = 'a823309b-5669-40e4-ad09-08bdc760a195'  -- Heavens (correto)
WHERE tenant_id = 'd39f1a6c-03fe-4a4d-8648-2ab77e480c4e';  -- Teste de criar (errado)

-- PASSO 3: Verificar resultado
SELECT
    id,
    tenant_id,
    credentials->>'instance_id' as instance,
    is_active
FROM integrations
WHERE channel = 'whatsapp';

-- PASSO 4: Contar conversas por tenant
SELECT tenant_id, COUNT(*) as total
FROM conversations
GROUP BY tenant_id;
