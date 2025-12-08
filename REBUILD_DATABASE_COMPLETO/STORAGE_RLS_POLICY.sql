-- =====================================================
-- RLS POLICY PARA BUCKET PRODUTOS
-- Copie e execute no SQL Editor do Supabase
-- =====================================================

-- Permitir que usuários autenticados façam upload para o bucket produtos
CREATE POLICY "Permitir upload para usuários autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'produtos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir que usuários vejam objetos do bucket produtos
CREATE POLICY "Permitir leitura de produtos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'produtos');

-- Permitir que usuários atualizem seus próprios arquivos
CREATE POLICY "Permitir atualização de próprios arquivos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'produtos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir que usuários deletem seus próprios arquivos
CREATE POLICY "Permitir deleção de próprios arquivos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'produtos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
