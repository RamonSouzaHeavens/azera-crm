-- =====================================================
-- CRIAÇÃO DA TABELA lead_sales
-- Permite múltiplas vendas por lead, recorrência e histórico financeiro.
-- =====================================================

-- Dropar tabela se já existir (para recriar limpa)
DROP TABLE IF EXISTS lead_sales CASCADE;

CREATE TABLE lead_sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,

  title text NOT NULL, -- Ex: "Mensalidade #1", "Taxa de Adesão"
  value numeric(12, 2) NOT NULL, -- Valor monetário
  due_date timestamp with time zone NOT NULL, -- Data de vencimento/competência

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'canceled')),
  recurrence_id uuid, -- UUID compartilhado entre parcelas de uma mesma venda recorrente
  product_id uuid, -- ID opcional se quiser linkar com tabela de produtos no futuro

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_lead_sales_tenant ON lead_sales(tenant_id);
CREATE INDEX idx_lead_sales_lead ON lead_sales(lead_id);
CREATE INDEX idx_lead_sales_status ON lead_sales(status);
CREATE INDEX idx_lead_sales_date ON lead_sales(due_date);
CREATE INDEX idx_lead_sales_recurrence ON lead_sales(recurrence_id);

-- Trigger para updated_at (reutiliza função existente ou cria)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lead_sales_modtime ON lead_sales;
CREATE TRIGGER update_lead_sales_modtime
    BEFORE UPDATE ON lead_sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEGURANÇA (RLS)
-- =====================================================
ALTER TABLE lead_sales ENABLE ROW LEVEL SECURITY;

-- Políticas baseadas na tabela memberships (padrão do projeto)
DROP POLICY IF EXISTS "Users can view sales from their tenant" ON lead_sales;
CREATE POLICY "Users can view sales from their tenant"
    ON lead_sales FOR SELECT
    USING (
      tenant_id IN (
        SELECT m.tenant_id FROM memberships m WHERE m.user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Users can insert sales for their tenant" ON lead_sales;
CREATE POLICY "Users can insert sales for their tenant"
    ON lead_sales FOR INSERT
    WITH CHECK (
      tenant_id IN (
        SELECT m.tenant_id FROM memberships m WHERE m.user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Users can update sales from their tenant" ON lead_sales;
CREATE POLICY "Users can update sales from their tenant"
    ON lead_sales FOR UPDATE
    USING (
      tenant_id IN (
        SELECT m.tenant_id FROM memberships m WHERE m.user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Users can delete sales from their tenant" ON lead_sales;
CREATE POLICY "Users can delete sales from their tenant"
    ON lead_sales FOR DELETE
    USING (
      tenant_id IN (
        SELECT m.tenant_id FROM memberships m WHERE m.user_id = auth.uid()
      )
    );

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE lead_sales IS 'Registra transações financeiras (vendas) associadas a leads. Suporta múltiplas vendas por lead e recorrência.';
COMMENT ON COLUMN lead_sales.recurrence_id IS 'UUID gerado no frontend para agrupar parcelas de uma mesma venda recorrente.';
COMMENT ON COLUMN lead_sales.status IS 'Status da venda: pending (pendente), paid (pago), overdue (vencido), canceled (cancelado).';
COMMENT ON COLUMN lead_sales.due_date IS 'Data de vencimento da parcela ou competência da venda.';
