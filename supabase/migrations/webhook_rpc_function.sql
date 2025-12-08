-- Criar uma função RPC para processar webhooks
-- Essa função aceita qualquer requisição sem validação JWT
-- e insere os dados diretamente no banco

CREATE OR REPLACE FUNCTION public.process_webhook_message(
  p_raw_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_provider TEXT;
  v_instance_id TEXT;
  v_contact_phone TEXT;
  v_contact_name TEXT;
  v_message_content TEXT;
  v_message_type TEXT;
  v_is_from_me BOOLEAN;
  v_media_url TEXT;
  v_media_mime_type TEXT;
  v_external_message_id TEXT;
  v_avatar_url TEXT;
  v_tenant_id UUID;
  v_integration_id UUID;
  v_cliente_id UUID;
  v_conversation_id UUID;
  v_payload JSONB;
BEGIN
  -- Log da requisição
  RAISE LOG '[RPC] process_webhook_message - payload size: %', length(p_raw_payload::text) || ' chars';

  -- Unwrap N8N wrapper se necessário
  v_payload := p_raw_payload;
  IF v_payload ->> 'body' IS NOT NULL AND v_payload ->> 'object' IS NULL THEN
    v_payload := v_payload -> 'body';
    RAISE LOG '[RPC] Unwrapped N8N wrapper';
  END IF;

  -- Detectar provider e extrair dados
  IF v_payload ->> 'object' = 'whatsapp_business_account' THEN
    v_provider := 'meta_official';
    v_instance_id := v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'metadata' ->> 'phone_number_id';
    v_contact_phone := v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 ->> 'from';
    v_contact_name := COALESCE(
      v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'contacts' -> 0 -> 'profile' ->> 'name',
      'Desconhecido'
    );
    v_avatar_url := v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'contacts' -> 0 -> 'profile' ->> 'profile_pic';
    v_message_content := COALESCE(v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'text' ->> 'body', '[Mídia]');
    v_message_type := COALESCE(v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 ->> 'type', 'text');
    
    -- Para áudios, extrair URL se disponível
    IF v_message_type = 'audio' THEN
      v_media_url := COALESCE(
        v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'audio' ->> 'url',
        v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'media' ->> 'url',
        NULL
      );
      v_media_mime_type := v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'audio' ->> 'mime_type';
      v_message_content := '[Áudio]';
    ELSIF v_message_type = 'image' THEN
      v_media_url := COALESCE(
        v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'image' ->> 'url',
        v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'image' ->> 'link',
        NULL
      );
      v_message_content := '[Imagem]';
      v_media_mime_type := v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'image' ->> 'mime_type';
    ELSIF v_message_type = 'video' THEN
      v_media_url := COALESCE(
        v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'video' ->> 'url',
        v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'video' ->> 'link',
        NULL
      );
      v_message_content := '[Vídeo]';
      v_media_mime_type := v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'video' ->> 'mime_type';
    ELSIF v_message_type = 'document' THEN
      v_media_url := COALESCE(
        v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'document' ->> 'url',
        v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'document' ->> 'link',
        NULL
      );
      v_message_content := '[Documento]';
      v_media_mime_type := v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 -> 'document' ->> 'mime_type';
    END IF;
    
    v_is_from_me := FALSE;
    v_external_message_id := v_payload -> 'entry' -> 0 -> 'changes' -> 0 -> 'value' -> 'messages' -> 0 ->> 'id';

  ELSIF v_payload ->> 'EventType' = 'messages' OR v_payload -> 'message' IS NOT NULL THEN
    v_provider := 'zapi';
    v_instance_id := COALESCE(
      v_payload ->> 'instanceName',
      v_payload ->> 'instanceId',
      v_payload ->> 'instance',
      v_payload ->> 'token',
      v_payload ->> 'owner'
    );
    v_is_from_me := COALESCE((v_payload -> 'message' ->> 'fromMe')::boolean, FALSE);
    
    -- Extrair número do contato com prioridade correta (evitar LIDs)
    IF v_is_from_me = FALSE THEN
      -- Priorizar chat.phone, depois message.sender_pn (removendo @s.whatsapp.net), evitar message.sender (pode ser LID)
      v_contact_phone := COALESCE(
        v_payload -> 'chat' ->> 'phone',
        regexp_replace(v_payload -> 'message' ->> 'sender_pn', '@s\.whatsapp\.net$', ''),
        v_payload -> 'message' ->> 'sender'
      );
      v_contact_name := COALESCE(v_payload -> 'message' ->> 'senderName', 'Cliente');
    ELSE
      v_contact_phone := COALESCE(v_payload -> 'chat' ->> 'phone', '');
      v_contact_name := COALESCE(v_payload -> 'chat' ->> 'name', 'Cliente');
    END IF;

    v_message_content := COALESCE(
      v_payload -> 'message' ->> 'content',
      v_payload -> 'message' ->> 'text',
      v_payload -> 'message' ->> 'conversation',
      ''
    );
    v_message_type := COALESCE(v_payload -> 'message' ->> 'type', 'text');
    RAISE LOG '[RPC] Z-API Raw Message Type: %', v_message_type;

    v_media_url := COALESCE(
      v_payload -> 'message' ->> 'mediaUrl',
      v_payload -> 'message' ->> 'url',
      v_payload -> 'message' ->> 'URL',
      NULL
    );
    v_media_mime_type := COALESCE(
      v_payload -> 'message' ->> 'mediaType',
      v_payload -> 'message' ->> 'mimeType',
      NULL
    );
    
    -- Normalizar e ajustar tipos de mídia
    IF v_message_type IN ('ptt', 'audio') THEN
      v_message_type := 'audio';
      v_message_content := '[Áudio]';
    ELSIF v_message_type IN ('image', 'foto', 'photo') THEN
      v_message_type := 'image';
      v_message_content := '[Imagem]';
    ELSIF v_message_type IN ('video') THEN
      v_message_type := 'video';
      v_message_content := '[Vídeo]';
    ELSIF v_message_type IN ('document', 'arquivo', 'file') THEN
      v_message_type := 'document';
      v_message_content := '[Documento]';
    ELSIF v_message_type NOT IN ('text', 'image', 'video', 'audio', 'document', 'location', 'sticker', 'template', 'interactive') THEN
      -- Fallback para tipos desconhecidos
      v_message_content := v_message_content || ' [' || v_message_type || ']';
      v_message_type := 'text';
    END IF;
    
    -- Forçar tipo correto baseado no conteúdo
    IF v_message_content = '[Áudio]' AND v_message_type = 'text' THEN
      v_message_type := 'audio';
    ELSIF v_message_content = '[Imagem]' AND v_message_type = 'text' THEN
      v_message_type := 'image';
    ELSIF v_message_content = '[Vídeo]' AND v_message_type = 'text' THEN
      v_message_type := 'video';
    ELSIF v_message_content = '[Documento]' AND v_message_type = 'text' THEN
      v_message_type := 'document';
    END IF;
    IF v_media_url IS NOT NULL AND v_media_mime_type ILIKE 'audio%' THEN
      v_message_type := 'audio';
      v_message_content := '[Áudio]';
    END IF;
    v_avatar_url := v_payload -> 'message' ->> 'profilePicUrl';
    v_external_message_id := COALESCE(v_payload -> 'message' ->> 'id', '');
  ELSE
    RAISE LOG '[RPC] Unknown provider, returning error';
    RETURN jsonb_build_object('error', 'Unknown provider');
  END IF;

  -- Validar dados críticos
  IF v_instance_id IS NULL OR v_instance_id = '' THEN
    RAISE LOG '[RPC] Missing instanceId';
    RETURN jsonb_build_object('error', 'Missing instanceId');
  END IF;

  -- Limpar telefone
  v_contact_phone := regexp_replace(v_contact_phone, '[^0-9]', '', 'g');
  IF v_contact_phone IS NULL OR v_contact_phone = '' THEN
    RAISE LOG '[RPC] Missing contact phone after cleaning';
    RETURN jsonb_build_object('error', 'Missing contact phone');
  END IF;

  -- Validar formato do telefone (rejeitar LIDs e números inválidos)
  IF length(v_contact_phone) < 11 OR length(v_contact_phone) > 15 THEN
    RAISE LOG '[RPC] Invalid phone format (length): %', v_contact_phone;
    RETURN jsonb_build_object('error', 'Invalid phone format');
  END IF;

  -- Rejeitar se parecer com LID (muito longo ou padrão específico)
  IF v_contact_phone ~ '^\d{15,}$' OR v_contact_phone ~ '^55\d{13,}$' THEN
    RAISE LOG '[RPC] Rejecting potential LID: %', v_contact_phone;
    RETURN jsonb_build_object('error', 'Invalid phone number (LID detected)');
  END IF;

  -- Buscar integração
  SELECT id, tenant_id INTO v_integration_id, v_tenant_id
  FROM integrations
  WHERE status = 'active'
    AND (
      (credentials ->> 'instance_id' = v_instance_id) OR
      (credentials ->> 'phone_number_id' = v_instance_id)
    )
  LIMIT 1;

  IF v_integration_id IS NULL THEN
    RAISE LOG '[RPC] Integration not found for instanceId: %', v_instance_id;
    RETURN jsonb_build_object('error', 'Integration not found');
  END IF;

  RAISE LOG '[RPC] Found integration: tenant_id=%', v_tenant_id;

  -- Upsert cliente (SEM ON CONFLICT - usando abordagem diferente)
  SELECT id INTO v_cliente_id
  FROM clientes
  WHERE tenant_id = v_tenant_id AND telefone = v_contact_phone;

  IF v_cliente_id IS NULL THEN
    INSERT INTO clientes (tenant_id, nome, telefone, avatar_url, created_at, updated_at)
    VALUES (v_tenant_id, v_contact_name, v_contact_phone, v_avatar_url, NOW(), NOW())
    RETURNING id INTO v_cliente_id;
  ELSE
    UPDATE clientes
    SET nome = v_contact_name, avatar_url = COALESCE(v_avatar_url, avatar_url), updated_at = NOW()
    WHERE id = v_cliente_id;
  END IF;

  RAISE LOG '[RPC] Upserted client: id=%', v_cliente_id;

  -- Upsert conversation (SEM ON CONFLICT)
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE tenant_id = v_tenant_id AND contact_id = v_cliente_id;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      tenant_id, contact_id, channel,
      last_message_content, last_message_at,
      unread_count, total_messages, status, avatar_url, created_at, updated_at
    )
    VALUES (
      v_tenant_id, v_cliente_id, 'whatsapp',
      SUBSTRING(v_message_content, 1, 100),
      NOW(),
      CASE WHEN v_is_from_me THEN 0 ELSE 1 END,
      1,
      'open', v_avatar_url, NOW(), NOW()
    )
    RETURNING id INTO v_conversation_id;
  ELSE
    UPDATE conversations
    SET
      last_message_content = SUBSTRING(v_message_content, 1, 100),
      last_message_at = NOW(),
      unread_count = conversations.unread_count + CASE WHEN v_is_from_me THEN 0 ELSE 1 END,
      total_messages = conversations.total_messages + 1,
      avatar_url = COALESCE(v_avatar_url, conversations.avatar_url),
      updated_at = NOW()
    WHERE id = v_conversation_id;
  END IF;

  -- Insert message
  INSERT INTO messages (
    conversation_id, direction, message_type, content,
    media_url, media_mime_type, external_message_id, status, created_at, updated_at
  )
  VALUES (
    v_conversation_id,
    CASE WHEN v_is_from_me THEN 'outbound' ELSE 'inbound' END,
    v_message_type, v_message_content,
    v_media_url, v_media_mime_type, v_external_message_id,
    'delivered', NOW(), NOW()
  );

  RAISE LOG '[RPC] Message inserted successfully';

  RETURN jsonb_build_object(
    'success', TRUE,
    'tenant_id', v_tenant_id,
    'integration_id', v_integration_id,
    'cliente_id', v_cliente_id,
    'conversation_id', v_conversation_id,
    'message_type', v_message_type
  );

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[RPC] Error: % %', SQLSTATE, SQLERRM;
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant para public chamador
GRANT EXECUTE ON FUNCTION public.process_webhook_message(JSONB) TO authenticated, anon;

-- Comment
COMMENT ON FUNCTION public.process_webhook_message(JSONB) IS 'RPC para processar webhooks de provedores de mensageria (Uazapi, Meta)';
