-- ============================================================================
-- TABELAS DE AGENDA/CALENDÁRIO
-- ============================================================================
-- Executar no Supabase SQL Editor

-- Tabela principal de eventos do calendário
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Informações do evento
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,

  -- Datas
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,

  -- Recorrência (formato iCal RRULE)
  recurrence_rule TEXT,
  recurrence_end DATE,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,

  -- Relacionamentos
  tarefa_id UUID REFERENCES tarefas(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,

  -- Lembretes [{type: 'whatsapp'|'push', minutes_before: 30}]
  reminders JSONB DEFAULT '[]'::jsonb,

  -- Sincronização com Google Calendar
  google_event_id TEXT,
  google_calendar_id TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'synced', 'pending', 'error')),

  -- Metadados
  color TEXT DEFAULT '#3B82F6',
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'whatsapp', 'google', 'task')),
  source_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google ON calendar_events(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_tarefa ON calendar_events(tarefa_id) WHERE tarefa_id IS NOT NULL;

-- Tabela de integrações de calendário (Google Calendar, etc)
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider
  provider TEXT NOT NULL DEFAULT 'google' CHECK (provider IN ('google', 'outlook', 'apple')),
  google_email TEXT,

  -- OAuth Tokens (encriptados pelo Supabase)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Configurações
  calendar_id TEXT,
  calendar_name TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'both' CHECK (sync_direction IN ('to_google', 'from_google', 'both')),
  last_sync_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, user_id, provider)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_tenant ON calendar_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON calendar_integrations(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver eventos do seu tenant" ON calendar_events;
CREATE POLICY "Usuários podem ver eventos do seu tenant" ON calendar_events
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

DROP POLICY IF EXISTS "Usuários podem criar eventos no seu tenant" ON calendar_events;
CREATE POLICY "Usuários podem criar eventos no seu tenant" ON calendar_events
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

DROP POLICY IF EXISTS "Usuários podem atualizar eventos do seu tenant" ON calendar_events;
CREATE POLICY "Usuários podem atualizar eventos do seu tenant" ON calendar_events
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

DROP POLICY IF EXISTS "Usuários podem deletar eventos do seu tenant" ON calendar_events;
CREATE POLICY "Usuários podem deletar eventos do seu tenant" ON calendar_events
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- calendar_integrations
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias integrações" ON calendar_integrations;
CREATE POLICY "Usuários podem ver suas próprias integrações" ON calendar_integrations
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem criar suas próprias integrações" ON calendar_integrations;
CREATE POLICY "Usuários podem criar suas próprias integrações" ON calendar_integrations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias integrações" ON calendar_integrations;
CREATE POLICY "Usuários podem atualizar suas próprias integrações" ON calendar_integrations
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem deletar suas próprias integrações" ON calendar_integrations;
CREATE POLICY "Usuários podem deletar suas próprias integrações" ON calendar_integrations
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendar_events_updated_at ON calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

CREATE OR REPLACE FUNCTION update_calendar_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendar_integrations_updated_at ON calendar_integrations;
CREATE TRIGGER calendar_integrations_updated_at
  BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_integrations_updated_at();

-- ============================================================================
-- FUNÇÃO: Sincronizar tarefa com evento do calendário
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_task_to_calendar_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a tarefa tem data de vencimento, criar/atualizar evento
  IF NEW.data_vencimento IS NOT NULL THEN
    -- Verificar se já existe um evento para esta tarefa
    IF EXISTS (SELECT 1 FROM calendar_events WHERE tarefa_id = NEW.id) THEN
      -- Atualizar evento existente
      UPDATE calendar_events
      SET
        title = NEW.titulo,
        description = NEW.descricao,
        start_date = NEW.data_vencimento,
        end_date = NEW.data_vencimento + interval '1 hour',
        updated_at = now()
      WHERE tarefa_id = NEW.id;
    ELSE
      -- Criar novo evento
      INSERT INTO calendar_events (
        tenant_id,
        user_id,
        title,
        description,
        start_date,
        end_date,
        tarefa_id,
        source,
        color
      ) VALUES (
        NEW.tenant_id,
        NEW.responsavel_id,
        NEW.titulo,
        NEW.descricao,
        NEW.data_vencimento,
        NEW.data_vencimento + interval '1 hour',
        NEW.id,
        'task',
        CASE NEW.prioridade
          WHEN 'urgente' THEN '#EF4444'
          WHEN 'alta' THEN '#F59E0B'
          WHEN 'media' THEN '#3B82F6'
          ELSE '#6B7280'
        END
      );
    END IF;
  ELSE
    -- Se removeu a data de vencimento, marcar evento como cancelado
    UPDATE calendar_events
    SET status = 'cancelled', updated_at = now()
    WHERE tarefa_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar tarefas com o calendário (opcional - ativar se desejado)
-- DROP TRIGGER IF EXISTS sync_task_to_calendar ON tarefas;
-- CREATE TRIGGER sync_task_to_calendar
--   AFTER INSERT OR UPDATE OF titulo, descricao, data_vencimento, prioridade
--   ON tarefas
--   FOR EACH ROW
--   EXECUTE FUNCTION sync_task_to_calendar_event();

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE calendar_events IS 'Eventos do calendário do CRM';
COMMENT ON TABLE calendar_integrations IS 'Integrações com calendários externos (Google, Outlook, etc)';

COMMENT ON COLUMN calendar_events.source IS 'Origem do evento: manual, whatsapp, google, task';
COMMENT ON COLUMN calendar_events.sync_status IS 'Status de sincronização com Google Calendar';
COMMENT ON COLUMN calendar_events.recurrence_rule IS 'Regra de recorrência no formato iCal RRULE';

COMMENT ON COLUMN calendar_integrations.sync_direction IS 'Direção da sincronização: to_google, from_google, both';
