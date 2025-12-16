-- Adiciona coluna de proprietário na tabela de clientes (leads)
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS proprietario_id UUID REFERENCES auth.users(id);

-- Cria índice para performance nas buscas por proprietário
CREATE INDEX IF NOT EXISTS idx_clientes_proprietario ON clientes(proprietario_id);

-- Opcional: Definir o usuário que criou como proprietário inicial para leads existentes
-- (Se existir coluna created_by ou similar. Se não, pode deixar NULL ou definir um padrão)
-- UPDATE clientes SET proprietario_id = (select auth.uid()) WHERE proprietario_id IS NULL;
