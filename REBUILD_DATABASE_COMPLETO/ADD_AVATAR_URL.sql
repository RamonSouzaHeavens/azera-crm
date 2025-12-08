-- =====================================================
-- ADD AVATAR_URL TO CONVERSATIONS TABLE
-- =====================================================

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
  AND column_name = 'avatar_url';
