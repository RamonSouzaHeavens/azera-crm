-- Ver todas as vendas na tabela lead_sales
SELECT * FROM lead_sales LIMIT 20;

-- Ver estrutura da tabela lead_sales
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lead_sales'
ORDER BY ordinal_position;
