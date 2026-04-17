-- Execute este código no SQL Editor do seu Supabase (Azera DB)
-- Isso adiciona as colunas necessárias para rastrear a comunicação do app local com o Heavens AI.

ALTER TABLE public.tarefas
ADD COLUMN IF NOT EXISTS heavens_client_id TEXT,
ADD COLUMN IF NOT EXISTS heavens_project_id TEXT,
ADD COLUMN IF NOT EXISTS heavens_demand_id TEXT;
