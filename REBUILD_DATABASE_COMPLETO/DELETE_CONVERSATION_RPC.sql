-- Função para deletar uma conversa e suas mensagens
-- Execute este SQL no Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION public.delete_conversation(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_conversation_exists BOOLEAN := FALSE;
BEGIN
  -- Verificar se o usuário tem acesso à conversa (através do tenant)
  SELECT c.tenant_id INTO v_tenant_id
  FROM conversations c
  INNER JOIN memberships m ON m.tenant_id = c.tenant_id
  WHERE c.id = p_conversation_id
    AND m.user_id = p_user_id
    AND m.active = TRUE
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE LOG '[DELETE_CONVERSATION] Access denied for user % on conversation %', p_user_id, p_conversation_id;
    RETURN jsonb_build_object('error', 'Access denied or conversation not found');
  END IF;

  -- Verificar se a conversa existe
  SELECT EXISTS(
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id AND tenant_id = v_tenant_id
  ) INTO v_conversation_exists;

  IF NOT v_conversation_exists THEN
    RAISE LOG '[DELETE_CONVERSATION] Conversation % not found for tenant %', p_conversation_id, v_tenant_id;
    RETURN jsonb_build_object('error', 'Conversation not found');
  END IF;

  -- Deletar mensagens primeiro (por causa da foreign key)
  DELETE FROM messages WHERE conversation_id = p_conversation_id;

  -- Deletar a conversa
  DELETE FROM conversations WHERE id = p_conversation_id AND tenant_id = v_tenant_id;

  RAISE LOG '[DELETE_CONVERSATION] Successfully deleted conversation % for tenant %', p_conversation_id, v_tenant_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'conversation_id', p_conversation_id,
    'tenant_id', v_tenant_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[DELETE_CONVERSATION] Error: % %', SQLSTATE, SQLERRM;
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION public.delete_conversation(UUID, UUID) TO authenticated;