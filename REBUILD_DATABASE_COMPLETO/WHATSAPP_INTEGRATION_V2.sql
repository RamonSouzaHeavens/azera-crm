-- =====================================================
-- WHATSAPP INTEGRATION V2 - COMPLETE REBUILD
-- Última atualização: 2025-11-20
-- =====================================================
-- IMPORTANTE: Execute este script para criar as tabelas
-- de integração do WhatsApp/Uazapi do zero.
-- =====================================================

-- 1. LIMPAR TABELAS ANTIGAS (se existirem)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;

-- 2. CRIAR TABELA DE INTEGRAÇÕES
-- Armazena as conexões com provedores (Uazapi, Meta, etc)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Tipo de canal e provedor
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'telegram')),
  provider TEXT NOT NULL CHECK (provider IN ('uazapi', 'zapi', 'evolution_api', 'meta_official')),
  
  -- Status da conexão
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  is_active BOOLEAN DEFAULT true,
  
  -- Credenciais (JSONB para flexibilidade)
  -- Uazapi: {instance_id, secret_key, base_url}
  -- Meta: {phone_number_id, waba_id, access_token}
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Configurações adicionais
  -- {webhook_url, auto_reply, business_hours, ...}
  config JSONB DEFAULT '{}'::jsonb,
  
  -- Metadados
  last_connected_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Apenas uma integração ativa por canal por tenant
  CONSTRAINT unique_active_integration UNIQUE (tenant_id, channel, is_active)
);

-- 3. CRIAR TABELA DE CONVERSAS
-- Cada conversa representa um chat com um contato
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Canal de origem
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'telegram')),
  
  -- Última mensagem (para preview)
  last_message_content TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contadores
  unread_count INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  
  -- Status da conversa
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived', 'spam')),
  
  -- Atribuição
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Tags (para categorização)
  tags TEXT[] DEFAULT '{}',
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Uma conversa por contato por tenant
  CONSTRAINT unique_conversation UNIQUE (tenant_id, contact_id, channel)
);

-- 4. CRIAR TABELA DE MENSAGENS
-- Armazena todas as mensagens individuais
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Direção da mensagem
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  -- Tipo de conteúdo
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact')),
  
  -- Conteúdo
  content TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  media_size_bytes BIGINT,
  
  -- Metadados de localização (se tipo = location)
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  location_name TEXT,
  
  -- Status de entrega (para outbound)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  
  -- IDs externos (do provedor)
  external_message_id TEXT,
  replied_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Remetente (para inbound, armazena número/ID do WhatsApp)
  sender_id TEXT,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Integrations
CREATE INDEX idx_integrations_tenant_channel ON integrations(tenant_id, channel);
CREATE INDEX idx_integrations_status ON integrations(status) WHERE status = 'active';
CREATE INDEX idx_integrations_provider ON integrations(provider);

-- Conversations
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_unread ON conversations(unread_count) WHERE unread_count > 0;

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_external_id ON messages(external_message_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Integrations: Users can manage integrations in their tenant
DROP POLICY IF EXISTS "Users manage integrations in their tenant" ON integrations;
CREATE POLICY "Users manage integrations in their tenant" ON integrations
  FOR ALL 
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships 
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Conversations: Users can manage conversations in their tenant
DROP POLICY IF EXISTS "Users manage conversations in their tenant" ON conversations;
CREATE POLICY "Users manage conversations in their tenant" ON conversations
  FOR ALL 
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships 
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Messages: Users can manage messages in their tenant's conversations
DROP POLICY IF EXISTS "Users manage messages in their tenant" ON messages;
CREATE POLICY "Users manage messages in their tenant" ON messages
  FOR ALL 
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      INNER JOIN memberships m ON c.tenant_id = m.tenant_id
      WHERE m.user_id = auth.uid() AND m.active = true
    )
  );

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger às tabelas
DROP TRIGGER IF EXISTS trigger_integrations_updated_at ON integrations;
CREATE TRIGGER trigger_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_messages_updated_at ON messages;
CREATE TRIGGER trigger_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar contadores de conversa quando mensagem é inserida
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    total_messages = total_messages + 1,
    unread_count = CASE 
      WHEN NEW.direction = 'inbound' THEN unread_count + 1 
      ELSE unread_count 
    END,
    last_message_content = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_new_message();

-- =====================================================
-- 8. VERIFICAÇÃO
-- =====================================================

-- Listar todas as tabelas criadas
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('integrations', 'conversations', 'messages')
ORDER BY tablename;

-- Contar colunas por tabela
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name IN ('integrations', 'conversations', 'messages')
GROUP BY table_name
ORDER BY table_name;
