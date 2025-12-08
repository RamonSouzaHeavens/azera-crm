-- Function to validate API key
CREATE OR REPLACE FUNCTION validate_api_key(input_key TEXT)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name TEXT,
  permissions TEXT[],
  is_active BOOLEAN,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_hash TEXT;
  matches_count INT;
BEGIN
  -- Hash the input key
  SELECT encode(digest(input_key, 'sha256'), 'hex') INTO v_key_hash;

  -- DEBUG: mostrar hash calculado e quantas chaves combinam (temporário)
  RAISE NOTICE 'DEBUG SQL === key_hash: %', v_key_hash;
  SELECT COUNT(*) FROM api_keys WHERE key_hash = v_key_hash INTO matches_count;
  RAISE NOTICE 'DEBUG SQL === matches_count: %', matches_count;

  -- Return the key info if it matches and is active
  RETURN QUERY
  SELECT
    ak.id,
    ak.tenant_id,
    ak.name,
    ak.permissions,
    ak.is_active,
    ak.expires_at
  FROM api_keys ak
  WHERE ak.key_hash = v_key_hash
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
END;
$$;