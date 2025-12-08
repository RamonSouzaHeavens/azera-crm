-- =====================================================
-- REBUILD STEP 6: INTEGRATIONS & MESSAGING
-- Execute SEXTO (depois do REBUILD_05)
-- =====================================================

-- =====================================================
-- INTEGRATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'whatsapp', 'instagram', etc
  provider TEXT NOT NULL, -- 'meta_official', 'zapi', 'evolution_api'
  status TEXT DEFAULT 'inactive',
  credentials JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONVERSATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  last_message_content TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open', -- 'open', 'closed', 'snoozed'
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, contact_id)
);

-- =====================================================
-- MESSAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'audio', etc
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  external_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist (idempotency for existing tables)
DO $$
BEGIN
    -- Integrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'credentials') THEN
        ALTER TABLE integrations ADD COLUMN credentials JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'config') THEN
        ALTER TABLE integrations ADD COLUMN config JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Conversations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'assigned_to') THEN
        ALTER TABLE conversations ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'unread_count') THEN
        ALTER TABLE conversations ADD COLUMN unread_count INTEGER DEFAULT 0;
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_content') THEN
        ALTER TABLE conversations ADD COLUMN last_message_content TEXT;
    END IF;

    -- Messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'external_message_id') THEN
        ALTER TABLE messages ADD COLUMN external_message_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'media_url') THEN
        ALTER TABLE messages ADD COLUMN media_url TEXT;
    END IF;
END $$;

-- =====================================================
-- INDEXES
-- =====================================================

-- Integrations
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_channel ON integrations(channel);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Integrations
DROP POLICY IF EXISTS "Users can manage integrations in their tenant" ON integrations;
CREATE POLICY "Users can manage integrations in their tenant" ON integrations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Conversations
DROP POLICY IF EXISTS "Users can manage conversations in their tenant" ON conversations;
CREATE POLICY "Users can manage conversations in their tenant" ON conversations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Messages
-- Messages don't have tenant_id directly, so we join with conversations
DROP POLICY IF EXISTS "Users can manage messages in their tenant" ON messages;
CREATE POLICY "Users can manage messages in their tenant" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE tenant_id IN (
        SELECT tenant_id FROM memberships
        WHERE user_id = auth.uid() AND active = true
      )
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Integrations
DROP TRIGGER IF EXISTS trigger_update_integrations_updated_at ON integrations;
CREATE TRIGGER trigger_update_integrations_updated_at
BEFORE UPDATE ON integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Conversations
DROP TRIGGER IF EXISTS trigger_update_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Messages
DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON messages;
CREATE TRIGGER trigger_update_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('integrations', 'conversations', 'messages')
ORDER BY tablename;
