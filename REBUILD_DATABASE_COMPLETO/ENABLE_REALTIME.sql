-- =====================================================
-- ENABLE REALTIME FOR CONVERSATIONS AND MESSAGES
-- =====================================================
-- Execute this in Supabase SQL Editor to enable real-time updates
-- =====================================================

-- Enable realtime for conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('conversations', 'messages');
