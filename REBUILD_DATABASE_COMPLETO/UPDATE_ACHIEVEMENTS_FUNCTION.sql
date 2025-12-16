-- Atualização da função de verificação de conquistas
-- Execute este script para corrigir a lógica de atribuição de métricas aos usuários

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
          AND (v.status = 'concluida' OR v.status = 'ganho');

      -- LEADS: Baseado no proprietário do lead/cliente
      WHEN 'count_leads' THEN
        SELECT COUNT(id) INTO v_count
        FROM clientes
        WHERE proprietario_id = p_user_id
          AND tenant_id = p_tenant_id;

      -- PROPOSTAS: Baseado no criador da proposta
      WHEN 'count_propostas' THEN
        SELECT COUNT(id) INTO v_count
        FROM proposals
        WHERE user_id = p_user_id;

      -- TAREFAS: Baseado no responsável pela tarefa
      WHEN 'count_tarefas' THEN
        SELECT COUNT(id) INTO v_count
        FROM tarefas
        WHERE responsavel_id = p_user_id
          AND tenant_id = p_tenant_id
          AND (status = 'concluida' OR status = 'done');

      -- LIGAÇÕES: Baseado no lead_timeline
      WHEN 'count_ligacoes' THEN
        SELECT COUNT(id) INTO v_count
        FROM lead_timeline
        WHERE user_id = p_user_id
          AND tenant_id = p_tenant_id
          AND (event_type = 'call' OR event_type = 'ligacao');

      -- REUNIÕES: Baseado no lead_timeline
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
