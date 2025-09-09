-- Execute este SQL na interface web do Supabase (SQL Editor)
-- para criar a tabela de metas se ela ainda não existir

-- Tabela para armazenar metas mensais
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2023),
  dza_sales_target INTEGER DEFAULT 0,
  mentoria_sales_target INTEGER DEFAULT 0,
  dza_revenue_target DECIMAL(10,2) DEFAULT 0,
  mentoria_revenue_target DECIMAL(10,2) DEFAULT 0,
  global_revenue_target DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir apenas uma meta por mês/ano
  UNIQUE(month, year)
);

-- Índice para busca eficiente por período
CREATE INDEX IF NOT EXISTS idx_goals_month_year ON goals(year, month);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goals_updated_at 
    BEFORE UPDATE ON goals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir meta exemplo para o mês atual
INSERT INTO goals (month, year, dza_sales_target, mentoria_sales_target, dza_revenue_target, mentoria_revenue_target, global_revenue_target)
VALUES (
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  50,  -- Meta: 50 vendas DZA
  20,  -- Meta: 20 vendas Mentoria
  25000.00,  -- Meta: R$ 25.000 DZA
  80000.00,  -- Meta: R$ 80.000 Mentoria
  105000.00  -- Meta: R$ 105.000 Total
)
ON CONFLICT (month, year) DO NOTHING;

-- Verificar se a tabela foi criada com sucesso
SELECT 'Tabela goals criada com sucesso!' as resultado;
SELECT * FROM goals ORDER BY year DESC, month DESC LIMIT 5;