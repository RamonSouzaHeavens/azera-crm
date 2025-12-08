-- =====================================================================
-- FIX: Permitir external_message_id NULL na tabela messages
-- =====================================================================
-- Data: 2025-11-24
-- Motivo: Nem sempre temos um external_message_id imediatamente ao enviar
--         mensagens (especialmente em casos de erro ou retry)
-- =====================================================================

-- 1. Remover constraint NOT NULL de external_message_id
ALTER TABLE public.messages 
  ALTER COLUMN external_message_id DROP NOT NULL;

-- 2. Remover constraint UNIQUE (pois pode haver múltiplos NULL)
-- Primeiro, precisamos dropar o constraint existente
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_external_message_id_key;

-- 3. Limpar duplicados antes de criar índice único
-- Manter apenas a mensagem mais recente para cada external_message_id duplicado
WITH duplicates AS (
  SELECT id, external_message_id,
         ROW_NUMBER() OVER (PARTITION BY external_message_id ORDER BY created_at DESC) as rn
  FROM public.messages
  WHERE external_message_id IS NOT NULL
)
UPDATE public.messages
SET external_message_id = NULL
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 4. Criar índice único parcial (ignora NULL)
-- Isso garante que external_message_id seja único quando não for NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id_unique 
  ON public.messages(external_message_id) 
  WHERE external_message_id IS NOT NULL;

-- 5. Atualizar comentário da coluna
COMMENT ON COLUMN public.messages.external_message_id IS 
  'ID da Meta/Gateway (para idempotência). Pode ser NULL se a mensagem ainda não foi enviada ou em caso de erro.';

-- =====================================================================
-- VERIFICAÇÃO
-- =====================================================================
-- Para verificar se a migration foi aplicada corretamente, execute:
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'messages' AND column_name = 'external_message_id';
