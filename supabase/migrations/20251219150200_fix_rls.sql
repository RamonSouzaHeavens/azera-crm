-- Fix RLS policies to avoiding initplan execution (performance) and duplicate permissive policies

-- 1. Table: despesas
-- Consolidate duplicate policies and optimize auth.uid() check
DROP POLICY IF EXISTS "Users can view expenses from their tenant" ON public.despesas;
DROP POLICY IF EXISTS "Users can insert expenses to their tenant" ON public.despesas;
DROP POLICY IF EXISTS "Users can update expenses from their tenant" ON public.despesas;
DROP POLICY IF EXISTS "Users can delete expenses from their tenant" ON public.despesas;
DROP POLICY IF EXISTS "Users can manage despesas in their tenant" ON public.despesas;

CREATE POLICY "Users can manage expenses in their tenant" ON public.despesas
FOR ALL
USING (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
  )
);

-- 2. Table: tenants
DROP POLICY IF EXISTS "Owners e admins podem atualizar tenants" ON public.tenants;
CREATE POLICY "Owners e admins podem atualizar tenants" ON public.tenants
FOR UPDATE
USING (
  id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
    AND memberships.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
    AND memberships.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Owner can delete their tenant" ON public.tenants;
CREATE POLICY "Owner can delete their tenant" ON public.tenants
FOR DELETE
USING (
  id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
    AND memberships.role = 'owner'
  )
);

-- 3. Table: clientes
DROP POLICY IF EXISTS "clientes_update_own_tenant" ON public.clientes;
CREATE POLICY "clientes_update_own_tenant" ON public.clientes
FOR UPDATE
USING (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Membros podem inserir leads no tenant" ON public.clientes;
CREATE POLICY "Membros podem inserir leads no tenant" ON public.clientes
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
  )
);

-- 4. Table: achievement_definitions
DROP POLICY IF EXISTS "Membros podem ver conquistas do tenant ou globais" ON public.achievement_definitions;
CREATE POLICY "Membros podem ver conquistas do tenant ou globais" ON public.achievement_definitions
FOR SELECT
USING (
  tenant_id IS NULL OR
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Owners e admins podem gerenciar conquistas do tenant" ON public.achievement_definitions;
CREATE POLICY "Owners e admins podem gerenciar conquistas do tenant" ON public.achievement_definitions
FOR ALL
USING (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
    AND memberships.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
    AND memberships.role IN ('owner', 'admin')
  )
);

-- 5. Table: user_achievements
DROP POLICY IF EXISTS "Membros podem ver conquistas do próprio tenant" ON public.user_achievements;
CREATE POLICY "Membros podem ver conquistas do próprio tenant" ON public.user_achievements
FOR SELECT
USING (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias conquistas" ON public.user_achievements;
CREATE POLICY "Usuários podem atualizar suas próprias conquistas" ON public.user_achievements
FOR UPDATE
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- 6. Table: lead_custom_field_values
DROP POLICY IF EXISTS "Membros podem ver lead_custom_field_values" ON public.lead_custom_field_values;
DROP POLICY IF EXISTS "Membros podem inserir lead_custom_field_values" ON public.lead_custom_field_values;
DROP POLICY IF EXISTS "Membros podem atualizar lead_custom_field_values" ON public.lead_custom_field_values;
DROP POLICY IF EXISTS "Membros podem deletar lead_custom_field_values" ON public.lead_custom_field_values;

-- Assuming lead_custom_field_values links to lead_id which links to tenant
CREATE POLICY "Membros podem manage lead_custom_field_values" ON public.lead_custom_field_values
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clientes
    WHERE clientes.id = lead_custom_field_values.lead_id
    AND clientes.tenant_id IN (
      SELECT memberships.tenant_id
      FROM memberships
      WHERE memberships.user_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clientes
    WHERE clientes.id = lead_custom_field_values.lead_id
    AND clientes.tenant_id IN (
      SELECT memberships.tenant_id
      FROM memberships
      WHERE memberships.user_id = (SELECT auth.uid())
    )
  )
);

-- 7. Table: produtos
DROP POLICY IF EXISTS "Owners e admins podem inserir produtos" ON public.produtos;
DROP POLICY IF EXISTS "Owners e admins podem atualizar produtos" ON public.produtos;
DROP POLICY IF EXISTS "Owners e admins podem deletar produtos" ON public.produtos;

CREATE POLICY "Owners e admins podem manage produtos" ON public.produtos
FOR ALL
USING (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
    AND memberships.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
    AND memberships.role IN ('owner', 'admin')
  )
);

-- 8. Table: tarefa_checklist
DROP POLICY IF EXISTS "tarefa_checklist_insert_policy" ON public.tarefa_checklist;
DROP POLICY IF EXISTS "Allow members to insert checklist for their tenant tasks" ON public.tarefa_checklist;
DROP POLICY IF EXISTS "tarefa_checklist_select_policy" ON public.tarefa_checklist;

CREATE POLICY "Members can manage tarefa_checklist" ON public.tarefa_checklist
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM tarefas t
    JOIN memberships m ON m.tenant_id = t.tenant_id
    WHERE t.id = tarefa_checklist.tarefa_id
    AND m.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM tarefas t
    JOIN memberships m ON m.tenant_id = t.tenant_id
    WHERE t.id = tarefa_checklist.tarefa_id
    AND m.user_id = (SELECT auth.uid())
  )
);

-- 9. Table: profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT
WITH CHECK (
  id = (SELECT auth.uid())
);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (
  id = (SELECT auth.uid())
)
WITH CHECK (
  id = (SELECT auth.uid())
);

-- 10. Table: subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
FOR SELECT
USING (
  user_id = (SELECT auth.uid())
);

-- 11. Table: gamification_stats
DROP POLICY IF EXISTS "Users can view team gamification stats" ON public.gamification_stats;
CREATE POLICY "Users can view team gamification stats" ON public.gamification_stats
FOR SELECT
USING (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update own gamification stats" ON public.gamification_stats;
CREATE POLICY "Users can update own gamification stats" ON public.gamification_stats
FOR UPDATE
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);
