-- =====================================================
-- RESET AND FIX INTEGRATIONS
-- Descrição: Apaga as tabelas de integração e recria do zero
-- para garantir que a estrutura esteja correta e compatível com o código.
-- =====================================================

-- 1. DROP (Apagar tabelas antigas/incorretas)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;

-- 2. CREATE INTEGRATIONS (Tabela de conexões)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'whatsapp', 'instagram'
  provider TEXT NOT NULL, -- 'meta_official', 'zapi', 'evolution_api'
  status TEXT DEFAULT 'inactive',
  credentials JSONB DEFAULT '{}'::jsonb, -- Armazena tokens, instance_id, etc
  config JSONB DEFAULT '{}'::jsonb, -- Configurações adicionais (webhook_url, etc)
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE CONVERSATIONS (Tabela de conversas/chats)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  last_message_content TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, contact_id)
);

-- 4. CREATE MESSAGES (Tabela de mensagens individuais)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'audio'
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'sent',
  external_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INDEXES (Para performance)
CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- 6. RLS (Segurança)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Simplificadas para garantir funcionamento inicial)
CREATE POLICY "Users can manage integrations in their tenant" ON integrations
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage conversations in their tenant" ON conversations
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage messages in their tenant" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid())
    )
  );

-- 7. TRIGGERS (Updated_at)
CREATE TRIGGER trigger_update_integrations_updated_at
BEFORE UPDATE ON integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
