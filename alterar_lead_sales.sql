-- Remover a restrição NOT NULL da coluna lead_id na tabela lead_sales
ALTER TABLE lead_sales ALTER COLUMN lead_id DROP NOT NULL;

-- Se existir alguma constraint de chave estrangeira que force, verificar (geralmente não força not null)
-- Mas é bom garantir que a vendas sem lead sejam permitidas.
