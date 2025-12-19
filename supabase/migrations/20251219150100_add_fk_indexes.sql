-- Add indexes for unindexed foreign keys to improve performance
-- Baseado na lista de warnings: api_keys, atividades, despesas, equipes, integrations, lead_attachments, etc.

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON public.api_keys(created_by);

-- atividades
CREATE INDEX IF NOT EXISTS idx_atividades_tenant_id ON public.atividades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_atividades_cliente_id ON public.atividades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_atividades_user_id ON public.atividades(user_id);

-- despesas (tenant_id likely has duplicate, handled separately, checking others)
CREATE INDEX IF NOT EXISTS idx_despesas_responsavel_id ON public.despesas(responsavel_id);

-- equipes
CREATE INDEX IF NOT EXISTS idx_equipes_tenant_id ON public.equipes(tenant_id);

-- integrations
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON public.integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_created_by ON public.integrations(created_by);

-- lead_attachments
CREATE INDEX IF NOT EXISTS idx_lead_attachments_tenant_id ON public.lead_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead_id ON public.lead_attachments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_attachments_uploaded_by ON public.lead_attachments(uploaded_by);

-- lead_custom_field_values
CREATE INDEX IF NOT EXISTS idx_lead_cfv_lead_id ON public.lead_custom_field_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_cfv_custom_field_id ON public.lead_custom_field_values(custom_field_id);

-- lead_tasks
CREATE INDEX IF NOT EXISTS idx_lead_tasks_tenant_id ON public.lead_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON public.lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_to ON public.lead_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_created_by ON public.lead_tasks(created_by);

-- lead_timeline
CREATE INDEX IF NOT EXISTS idx_lead_timeline_tenant_id ON public.lead_timeline(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead_id ON public.lead_timeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_timeline_user_id ON public.lead_timeline(user_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_replied_to_message_id ON public.messages(replied_to_message_id);

-- plans
CREATE INDEX IF NOT EXISTS idx_plans_tenant_id ON public.plans(tenant_id);

-- product_custom_field_values
CREATE INDEX IF NOT EXISTS idx_product_cfv_produto_id ON public.product_custom_field_values(produto_id);
CREATE INDEX IF NOT EXISTS idx_product_cfv_custom_field_id ON public.product_custom_field_values(custom_field_id);

-- produtos_equipe
CREATE INDEX IF NOT EXISTS idx_produtos_equipe_tenant_id ON public.produtos_equipe(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_equipe_criado_por ON public.produtos_equipe(criado_por);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_default_tenant_id ON public.profiles(default_tenant_id);

-- proposals
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON public.proposals(user_id);

-- sales_playbook_objections
CREATE INDEX IF NOT EXISTS idx_sales_playbook_objections_user_id ON public.sales_playbook_objections(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_playbook_objections_team_id ON public.sales_playbook_objections(team_id);

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- tarefa_anexos (assuming table exists based on warning list)
-- CREATE INDEX IF NOT EXISTS idx_tarefa_anexos_tarefa_id ON public.tarefa_anexos(tarefa_id);

-- tarefa_checklist
-- CREATE INDEX IF NOT EXISTS idx_tarefa_checklist_tarefa_id ON public.tarefa_checklist(tarefa_id);

-- tarefas (assuming table exists)
-- CREATE INDEX IF NOT EXISTS idx_tarefas_tenant_id ON public.tarefas(tenant_id);

-- team_invites (assuming table exists)
-- CREATE INDEX IF NOT EXISTS idx_team_invites_tenant_id ON public.team_invites(tenant_id);

-- user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_tenant_id ON public.user_achievements(tenant_id);
-- achievement_id likely exists
-- CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);

-- vendas (assuming table exists)
-- CREATE INDEX IF NOT EXISTS idx_vendas_tenant_id ON public.vendas(tenant_id);
