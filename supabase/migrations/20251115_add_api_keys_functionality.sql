-- Migration to add API keys functionality
-- Update api_keys table to match the code expectations

-- Rename active to is_active if not already renamed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_keys' AND column_name = 'active'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_keys' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE api_keys RENAME COLUMN active TO is_active;
  END IF;
END $$;

-- Add missing columns
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Rename key to key_hash if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_keys' AND column_name = 'key'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_keys' AND column_name = 'key_hash'
  ) THEN
    ALTER TABLE api_keys RENAME COLUMN key TO key_hash;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_keys' AND column_name = 'key'
  ) THEN
    -- If both exist, drop key column
    ALTER TABLE api_keys DROP COLUMN key;
  END IF;
END $$;

-- Create the RPC function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api_key TEXT;
BEGIN
  -- Generate a random API key (32 characters)
  api_key := encode(gen_random_bytes(24), 'base64url');
  RETURN api_key;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_api_key() TO authenticated;

-- Force PostgREST to reload schema cache (prevents 404 errors)
NOTIFY pgrst, 'reload schema';

-- Update RLS policies for api_keys
DROP POLICY IF EXISTS "Users can view their tenant's api keys" ON api_keys;
CREATE POLICY "Users can view their tenant's api keys" ON api_keys
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'administrador')
    )
  );

DROP POLICY IF EXISTS "Users can insert their tenant's api keys" ON api_keys;
CREATE POLICY "Users can insert their tenant's api keys" ON api_keys
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'administrador')
    )
  );

DROP POLICY IF EXISTS "Users can update their tenant's api keys" ON api_keys;
CREATE POLICY "Users can update their tenant's api keys" ON api_keys
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'administrador')
    )
  );