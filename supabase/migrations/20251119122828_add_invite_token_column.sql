-- Add invite_token column to team_invites table
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;

-- Generate invite_token for existing invites that don't have one
UPDATE team_invites SET invite_token = gen_random_uuid()::text WHERE invite_token IS NULL;