-- =====================================================
-- SISTEMA DE CONQUISTAS (ACHIEVEMENTS)
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABELA: achievement_definitions
-- Define as conquistas disponíveis no sistema
-- =====================================================

CREATE TABLE IF NOT EXISTS achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = conquista global/padrão

  -- Identificação
  key TEXT NOT NULL, -- Chave única: 'sales_5', 'leads_10', etc
  name TEXT NOT NULL, -- Nome exibido: "Vendedor em Ascensão"
  description TEXT, -- Descrição: "Realize 5 vendas"
  icon TEXT NOT NULL DEFAULT '🏆', -- Emoji ou nome do ícone

  -- Categoria e Tipo
  category TEXT NOT NULL CHECK (category IN ('vendas', 'leads', 'propostas', 'tarefas', 'atividades', 'especial')),

  -- Critério para desbloquear
  metric_type TEXT NOT NULL, -- 'count_vendas', 'count_leads', 'count_propostas', etc
  metric_threshold INTEGER NOT NULL DEFAULT 1, -- Quantidade necessária (5, 10, 25, 50, 100)

  -- Níveis/Raridade
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  points INTEGER NOT NULL DEFAULT 10, -- Pontos de XP ganhos

  -- Status
  is_active BOOLEAN DEFAULT true, -- Se a conquista está ativa
  is_default BOOLEAN DEFAULT false, -- Se é uma conquista padrão do sistema

  -- Ordenação
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Chave única por tenant + key
  UNIQUE(tenant_id, key)
);

-- =====================================================
-- 2. TABELA: user_achievements
-- Registra conquistas desbloqueadas por usuário
-- =====================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,

  -- Progresso
  current_progress INTEGER DEFAULT 0, -- Progresso atual (ex: 3 de 5)
  unlocked_at TIMESTAMPTZ, -- Data do desbloqueio (NULL = não desbloqueado ainda)

  -- Flags
  is_unlocked BOOLEAN DEFAULT false,
  is_notified BOOLEAN DEFAULT false, -- Se o usuário foi notificado
  is_featured BOOLEAN DEFAULT false, -- Se está em destaque no perfil

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cada usuário pode ter cada conquista apenas uma vez por tenant
  UNIQUE(user_id, tenant_id, achievement_id)
);

-- =====================================================
-- 3. INSERIR CONQUISTAS PADRÃO
-- =====================================================

-- Conquistas de VENDAS
INSERT INTO achievement_definitions (key, name, description, icon, category, metric_type, metric_threshold, tier, points, is_default, display_order) VALUES
('sales_1', 'Primeira Venda', 'Realize sua primeira venda', '🎯', 'vendas', 'count_vendas', 1, 'bronze', 10, true, 1),
('sales_5', 'Vendedor em Ascensão', 'Realize 5 vendas', '⭐', 'vendas', 'count_vendas', 5, 'bronze', 25, true, 2),
('sales_10', 'Vendedor Experiente', 'Realize 10 vendas', '🌟', 'vendas', 'count_vendas', 10, 'silver', 50, true, 3),
('sales_25', 'Vendedor Top', 'Realize 25 vendas', '💫', 'vendas', 'count_vendas', 25, 'gold', 100, true, 4),
('sales_50', 'Mestre das Vendas', 'Realize 50 vendas', '🏅', 'vendas', 'count_vendas', 50, 'platinum', 200, true, 5),
('sales_100', 'Lenda das Vendas', 'Realize 100 vendas', '👑', 'vendas', 'count_vendas', 100, 'diamond', 500, true, 6)
ON CONFLICT (tenant_id, key) DO NOTHING;

-- Conquistas de LEADS/CONTATOS
INSERT INTO achievement_definitions (key, name, description, icon, category, metric_type, metric_threshold, tier, points, is_default, display_order) VALUES
('leads_1', 'Primeiro Contato', 'Adicione seu primeiro lead', '📞', 'leads', 'count_leads', 1, 'bronze', 10, true, 10),
('leads_10', 'Networking Iniciante', 'Adicione 10 leads', '🤝', 'leads', 'count_leads', 10, 'bronze', 25, true, 11),
('leads_25', 'Networking Avançado', 'Adicione 25 leads', '🌐', 'leads', 'count_leads', 25, 'silver', 50, true, 12),
('leads_50', 'Mestre do Networking', 'Adicione 50 leads', '🔗', 'leads', 'count_leads', 50, 'gold', 100, true, 13),
('leads_100', 'Rei do Networking', 'Adicione 100 leads', '👥', 'leads', 'count_leads', 100, 'platinum', 200, true, 14)
ON CONFLICT (tenant_id, key) DO NOTHING;

-- Conquistas de PROPOSTAS
INSERT INTO achievement_definitions (key, name, description, icon, category, metric_type, metric_threshold, tier, points, is_default, display_order) VALUES
('proposals_1', 'Primeira Proposta', 'Envie sua primeira proposta', '📄', 'propostas', 'count_propostas', 1, 'bronze', 10, true, 20),
('proposals_10', 'Propostas em Série', 'Envie 10 propostas', '📑', 'propostas', 'count_propostas', 10, 'silver', 50, true, 21),
('proposals_25', 'Propostas Mestre', 'Envie 25 propostas', '📋', 'propostas', 'count_propostas', 25, 'gold', 100, true, 22),
('proposals_50', 'Propostas Campeão', 'Envie 50 propostas', '🏆', 'propostas', 'count_propostas', 50, 'platinum', 200, true, 23)
ON CONFLICT (tenant_id, key) DO NOTHING;

-- Conquistas de TAREFAS
INSERT INTO achievement_definitions (key, name, description, icon, category, metric_type, metric_threshold, tier, points, is_default, display_order) VALUES
('tasks_1', 'Primeira Tarefa', 'Complete sua primeira tarefa', '✅', 'tarefas', 'count_tarefas', 1, 'bronze', 10, true, 30),
('tasks_10', 'Produtivo', 'Complete 10 tarefas', '📝', 'tarefas', 'count_tarefas', 10, 'bronze', 25, true, 31),
('tasks_50', 'Máquina de Produtividade', 'Complete 50 tarefas', '⚡', 'tarefas', 'count_tarefas', 50, 'silver', 100, true, 32),
('tasks_100', 'Rei da Produtividade', 'Complete 100 tarefas', '🚀', 'tarefas', 'count_tarefas', 100, 'gold', 200, true, 33)
ON CONFLICT (tenant_id, key) DO NOTHING;

-- Conquistas de ATIVIDADES (ligações, reuniões)
INSERT INTO achievement_definitions (key, name, description, icon, category, metric_type, metric_threshold, tier, points, is_default, display_order) VALUES
('calls_10', 'Telefone Quente', 'Registre 10 ligações', '📱', 'atividades', 'count_ligacoes', 10, 'bronze', 25, true, 40),
('calls_50', 'Call Center', 'Registre 50 ligações', '☎️', 'atividades', 'count_ligacoes', 50, 'silver', 75, true, 41),
('meetings_5', 'Reuniões', 'Registre 5 reuniões', '👔', 'atividades', 'count_reunioes', 5, 'bronze', 25, true, 42),
('meetings_25', 'Mestre das Reuniões', 'Registre 25 reuniões', '🤵', 'atividades', 'count_reunioes', 25, 'silver', 75, true, 43)
ON CONFLICT (tenant_id, key) DO NOTHING;

-- =====================================================
-- 4. POLÍTICAS RLS
-- =====================================================

ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Políticas para achievement_definitions
CREATE POLICY "Membros podem ver conquistas do tenant ou globais"
ON achievement_definitions FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL -- Conquistas globais/padrão
  OR tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = auth.uid() AND memberships.active = true
  )
);

CREATE POLICY "Owners e admins podem gerenciar conquistas do tenant"
ON achievement_definitions FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = auth.uid()
      AND memberships.active = true
      AND memberships.role IN ('owner', 'admin', 'administrador')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = auth.uid()
      AND memberships.active = true
      AND memberships.role IN ('owner', 'admin', 'administrador')
  )
);

-- Políticas para user_achievements
CREATE POLICY "Membros podem ver conquistas do próprio tenant"
ON user_achievements FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = auth.uid() AND memberships.active = true
  )
);

CREATE POLICY "Sistema pode inserir/atualizar conquistas"
ON user_achievements FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = auth.uid() AND memberships.active = true
  )
);

CREATE POLICY "Usuários podem atualizar suas próprias conquistas"
ON user_achievements FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_achievement_definitions_tenant ON achievement_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_category ON achievement_definitions(category);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_active ON achievement_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_tenant ON user_achievements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(is_unlocked);

-- =====================================================
-- 6. FUNÇÃO PARA VERIFICAR E DESBLOQUEAR CONQUISTAS
-- (Pode ser chamada após ações importantes)
-- =====================================================

CREATE OR REPLACE FUNCTION check_and_unlock_achievements(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE(
  achievement_key TEXT,
  achievement_name TEXT,
  newly_unlocked BOOLEAN
) AS $$
DECLARE
  v_achievement RECORD;
  v_count INTEGER;
  v_unlocked BOOLEAN;
BEGIN
  -- Para cada conquista ativa
  FOR v_achievement IN
    SELECT * FROM achievement_definitions
    WHERE is_active = true
      AND (tenant_id IS NULL OR tenant_id = p_tenant_id)
  LOOP
    -- Calcular a contagem baseada no tipo de métrica
    CASE v_achievement.metric_type
      -- VENDAS: Baseado no proprietário do cliente da venda
      WHEN 'count_vendas' THEN
        SELECT COUNT(v.id) INTO v_count
        FROM vendas v
        JOIN clientes c ON c.id = v.cliente_id
        WHERE c.proprietario_id = p_user_id
          AND v.tenant_id = p_tenant_id
          AND (v.status = 'concluida' OR v.status = 'ganho'); -- Verifica status de venda concluída

      -- LEADS: Baseado no proprietário do lead/cliente
      WHEN 'count_leads' THEN
        SELECT COUNT(id) INTO v_count
        FROM clientes
        WHERE proprietario_id = p_user_id
          AND tenant_id = p_tenant_id;

      -- PROPOSTAS: Baseado no criador da proposta (user_id)
      WHEN 'count_propostas' THEN
        SELECT COUNT(id) INTO v_count
        FROM proposals
        WHERE user_id = p_user_id;

      -- TAREFAS: Baseado no responsável pela tarefa (responsavel_id)
      WHEN 'count_tarefas' THEN
        SELECT COUNT(id) INTO v_count
        FROM tarefas
        WHERE responsavel_id = p_user_id
          AND tenant_id = p_tenant_id
          AND (status = 'concluida' OR status = 'done');

      -- LIGAÇÕES: Baseado no lead_timeline (eventos de ligação)
      WHEN 'count_ligacoes' THEN
        SELECT COUNT(id) INTO v_count
        FROM lead_timeline
        WHERE user_id = p_user_id
          AND tenant_id = p_tenant_id
          AND (event_type = 'call' OR event_type = 'ligacao');

      -- REUNIÕES: Baseado no lead_timeline (eventos de reunião)
      WHEN 'count_reunioes' THEN
        SELECT COUNT(id) INTO v_count
        FROM lead_timeline
        WHERE user_id = p_user_id
          AND tenant_id = p_tenant_id
          AND (event_type = 'meeting' OR event_type = 'reuniao');

      ELSE
        v_count := 0;
    END CASE;

    -- Verificar se atingiu o threshold
    v_unlocked := v_count >= v_achievement.metric_threshold;

    -- Inserir ou atualizar o progresso
    INSERT INTO user_achievements (
      user_id, tenant_id, achievement_id,
      current_progress, is_unlocked, unlocked_at
    )
    VALUES (
      p_user_id, p_tenant_id, v_achievement.id,
      v_count, v_unlocked, CASE WHEN v_unlocked THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, tenant_id, achievement_id)
    DO UPDATE SET
      current_progress = v_count,
      is_unlocked = v_unlocked,
      unlocked_at = CASE
        WHEN v_unlocked AND user_achievements.unlocked_at IS NULL THEN NOW()
        ELSE user_achievements.unlocked_at
      END,
      updated_at = NOW();

    -- Retornar conquistas recém desbloqueadas
    IF v_unlocked THEN
      achievement_key := v_achievement.key;
      achievement_name := v_achievement.name;
      newly_unlocked := v_unlocked;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 'achievement_definitions' as tabela, COUNT(*) as registros FROM achievement_definitions
UNION ALL
SELECT 'user_achievements' as tabela, COUNT(*) as registros FROM user_achievements;
