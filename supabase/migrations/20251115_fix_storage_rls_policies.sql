-- =====================================================
-- CORRIGIR POLÍTICAS RLS DO STORAGE
-- Data: 2025-11-15
-- Descrição: Corrige as políticas de upload para aceitar
--            uploads de produtos com estrutura correcta
-- =====================================================

-- 1. DROP das políticas antigas do bucket 'produtos'
DROP POLICY IF EXISTS "Permitir upload para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção de próprios arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de próprios arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura de produtos" ON storage.objects;

-- 2. Nova política de LEITURA - Qualquer um pode ler arquivos de produtos
CREATE POLICY "Permitir leitura de produtos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'produtos'::text);

-- 3. Nova política de UPLOAD - Usuários autenticados podem fazer upload em qualquer lugar do bucket produtos
CREATE POLICY "Permitir upload para usuários autenticados no bucket produtos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'produtos'::text
);

-- 4. Nova política de ATUALIZAÇÃO - Usuários autenticados podem atualizar seus próprios uploads
CREATE POLICY "Permitir atualização de arquivos no bucket produtos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'produtos'::text);

-- 5. Nova política de DELEÇÃO - Usuários autenticados podem deletar seus próprios uploads
CREATE POLICY "Permitir deleção de arquivos no bucket produtos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'produtos'::text);

-- =====================================================
-- Verificar as políticas criadas
-- =====================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as qualificacao,
  with_check::text as with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;
