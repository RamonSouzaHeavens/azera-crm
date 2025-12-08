-- =====================================================
-- ALTERAR TABELA PRODUTOS - ADICIONAR COLUNAS FALTANTES
-- Data: 2025-11-15
-- Descrição: Adiciona as colunas que faltam para suportar
--            upload de capa, galeria, anexos e categoria
-- =====================================================

-- Adicionar coluna galeria (array de URLs)
ALTER TABLE IF EXISTS produtos
ADD COLUMN IF NOT EXISTS galeria TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Adicionar coluna anexos (array de URLs)
ALTER TABLE IF EXISTS produtos
ADD COLUMN IF NOT EXISTS anexos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Adicionar coluna categoria (enum ou text)
ALTER TABLE IF EXISTS produtos
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT NULL;

-- Comentários descritivos
COMMENT ON COLUMN produtos.capa_url IS 'URL da imagem de capa principal do produto';
COMMENT ON COLUMN produtos.galeria IS 'Array de URLs das imagens da galeria';
COMMENT ON COLUMN produtos.anexos IS 'Array de URLs dos documentos anexados (PDF, DOC, etc)';
COMMENT ON COLUMN produtos.categoria IS 'Categoria do produto (servico, produto, consulta, pacote)';

-- Verificar as colunas adicionadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'produtos'
ORDER BY ordinal_position;
