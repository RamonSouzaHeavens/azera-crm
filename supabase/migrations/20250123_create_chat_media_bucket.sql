-- Create chat-media bucket for user-uploaded media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access to chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload to chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Service Upload to chat-media" ON storage.objects;

-- Allow public access to the chat-media bucket
CREATE POLICY "Public Access to chat-media"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat-media' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload to chat-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'chat-media' );

-- Allow service role to upload (for webhook)
CREATE POLICY "Service Upload to chat-media"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK ( bucket_id = 'chat-media' );
