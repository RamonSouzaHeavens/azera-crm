-- =====================================================
-- AZERA QUEST - Schema de Gamificação
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Tabela principal de estatísticas de gamificação
CREATE TABLE IF NOT EXISTS gamification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_gamification_stats_tenant ON gamification_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gamification_stats_xp ON gamification_stats(tenant_id, xp DESC);

-- 3. Habilitar RLS
ALTER TABLE gamification_stats ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
CREATE POLICY "Users can view team gamification stats"
  ON gamification_stats FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM memberships
    WHERE user_id = auth.uid() AND active = true
  ));

CREATE POLICY "Users can update own gamification stats"
  ON gamification_stats FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert gamification stats"
  ON gamification_stats FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM memberships
    WHERE user_id = auth.uid() AND active = true
  ));

-- =====================================================
-- FUNÇÃO: add_xp
-- Adiciona XP ao usuário e recalcula o nível
-- =====================================================
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_tenant_id UUID, p_amount INTEGER)
RETURNS void AS $$
DECLARE
  v_new_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Inserir ou atualizar stats
  INSERT INTO gamification_stats (user_id, tenant_id, xp, level, last_activity)
  VALUES (p_user_id, p_tenant_id, p_amount, 1, now())
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET
    xp = gamification_stats.xp + p_amount,
    last_activity = now(),
    updated_at = now();

  -- Buscar novo XP
  SELECT xp INTO v_new_xp
  FROM gamification_stats
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

  -- Calcular novo level baseado nos thresholds
  v_new_level := CASE
    WHEN v_new_xp >= 12000 THEN 7  -- Mítico
    WHEN v_new_xp >= 8000 THEN 6   -- Imortal
    WHEN v_new_xp >= 5000 THEN 5   -- Lenda
    WHEN v_new_xp >= 3000 THEN 4   -- Campeão
    WHEN v_new_xp >= 1500 THEN 3   -- Mestre
    WHEN v_new_xp >= 500 THEN 2    -- Caçador
    ELSE 1                          -- Novato
  END;

  -- Atualizar level
  UPDATE gamification_stats
  SET level = v_new_level
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS DE XP AUTOMÁTICO
-- =====================================================

-- Trigger: +50 XP ao criar lead (INSERT em clientes)
CREATE OR REPLACE FUNCTION trg_lead_created_xp() RETURNS TRIGGER AS $$
BEGIN
  -- Só adiciona XP se tiver um responsável (proprietario_id)
  IF NEW.proprietario_id IS NOT NULL THEN
    PERFORM add_xp(NEW.proprietario_id, NEW.tenant_id, 50);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_lead_created_xp ON clientes;
CREATE TRIGGER on_lead_created_xp
AFTER INSERT ON clientes
FOR EACH ROW EXECUTE FUNCTION trg_lead_created_xp();

-- Trigger: +100 XP ao mover lead para Proposta ou Fechamento
CREATE OR REPLACE FUNCTION trg_lead_stage_xp() RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se mudou para estágio avançado (usando campo 'status')
  IF NEW.proprietario_id IS NOT NULL
     AND NEW.status IN ('proposta', 'fechado', 'negociacao')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('proposta', 'fechado', 'negociacao')) THEN
    PERFORM add_xp(NEW.proprietario_id, NEW.tenant_id, 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_lead_stage_change_xp ON clientes;
CREATE TRIGGER on_lead_stage_change_xp
AFTER UPDATE ON clientes
FOR EACH ROW EXECUTE FUNCTION trg_lead_stage_xp();

-- Trigger: +30 XP ao completar tarefa
CREATE OR REPLACE FUNCTION trg_task_completed_xp() RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se a tarefa foi marcada como concluída
  IF NEW.concluida = true
     AND (OLD.concluida IS NULL OR OLD.concluida = false)
     AND NEW.responsavel_id IS NOT NULL THEN
    PERFORM add_xp(NEW.responsavel_id, NEW.tenant_id, 30);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_completed_xp ON tarefas;
CREATE TRIGGER on_task_completed_xp
AFTER UPDATE ON tarefas
FOR EACH ROW EXECUTE FUNCTION trg_task_completed_xp();

-- =====================================================
-- HABILITAR REALTIME (Execute separadamente se necessário)
-- =====================================================
-- No painel do Supabase: Database > Replication
-- Adicione a tabela 'gamification_stats' à lista de Realtime

-- Para habilitar via SQL (pode não funcionar em todos os planos):
-- ALTER PUBLICATION supabase_realtime ADD TABLE gamification_stats;

-- =====================================================
-- PRONTO! Gamificação configurada.
-- Agora quando usuários criarem leads ou completarem tarefas,
-- eles ganharão XP automaticamente.
-- =====================================================
