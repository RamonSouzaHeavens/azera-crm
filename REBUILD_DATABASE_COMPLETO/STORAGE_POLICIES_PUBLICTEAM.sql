-- =====================================================
-- POLÍTICAS DE ACESSO PARA O BUCKET "publicteam"
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PRIMEIRO: REMOVER POLÍTICAS EXISTENTES (se houver)
-- =====================================================

DROP POLICY IF EXISTS "Public Access for Team Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update team logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete team logos" ON storage.objects;
DROP POLICY IF EXISTS "publicteam_public_select" ON storage.objects;
DROP POLICY IF EXISTS "publicteam_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "publicteam_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "publicteam_auth_delete" ON storage.objects;

-- =====================================================
-- CRIAR POLÍTICAS SIMPLES E FUNCIONAIS
-- =====================================================

-- 1. SELECT (Leitura Pública) - Qualquer pessoa pode ver
CREATE POLICY "publicteam_public_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'publicteam');

-- 2. INSERT (Upload) - Usuários autenticados podem fazer upload
CREATE POLICY "publicteam_auth_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'publicteam');

-- 3. UPDATE - Usuários autenticados podem atualizar
CREATE POLICY "publicteam_auth_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'publicteam')
WITH CHECK (bucket_id = 'publicteam');

-- 4. DELETE - Usuários autenticados podem deletar
CREATE POLICY "publicteam_auth_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'publicteam');

-- =====================================================
-- VERIFICAR SE O BUCKET EXISTE E É PÚBLICO
-- =====================================================

-- Atualizar bucket para ser público (caso não esteja)
UPDATE storage.buckets
SET public = true
WHERE id = 'publicteam';

-- Se o bucket não existir, criar:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('publicteam', 'publicteam', true)
-- ON CONFLICT (id) DO UPDATE SET public = true;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'publicteam%'
ORDER BY policyname;

-- Verificar se bucket é público
SELECT id, name, public FROM storage.buckets WHERE id = 'publicteam';
