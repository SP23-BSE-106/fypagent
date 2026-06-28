-- API keys table (already exists, but ensure it exists)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy (if not exists)
DROP POLICY IF EXISTS api_keys_policy ON api_keys;
CREATE POLICY api_keys_policy ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Make sure user_id is not nullable and has index
ALTER TABLE api_keys ALTER COLUMN user_id SET NOT NULL;

-- Add unique constraint for user+provider
ALTER TABLE api_keys ADD CONSTRAINT api_keys_user_provider_unique UNIQUE (user_id, provider);