-- 2025-11-27 00:00:00 | Create table for playbook of objections
create extension if not exists "pgcrypto";

create table if not exists public.sales_playbook_objections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid null references tenants(id) on delete set null,
  objection text not null,
  response text not null,
  tactic text not null,
  stage text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.refresh_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_objections_timestamp
  before update on public.sales_playbook_objections
  for each row execute procedure public.refresh_updated_at_column();

alter table public.sales_playbook_objections enable row level security;

create policy "Playbook: allow reading defaults and own teams" on public.sales_playbook_objections
  for select using (
    is_default or
    user_id = auth.uid() or
    (
      team_id is not null and exists (
        select 1
        from memberships m
        where m.user_id = auth.uid()
          and m.tenant_id = team_id
          and m.active = true
      )
    )
  );

create policy "Playbook: insert owned row" on public.sales_playbook_objections
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and (
      team_id is null or exists (
        select 1 from memberships m
        where m.user_id = auth.uid()
          and m.tenant_id = team_id
          and m.active = true
      )
    )
  );

create policy "Playbook: update own cards" on public.sales_playbook_objections
  for update using (
    auth.uid() is not null
    and user_id = auth.uid()
    and is_default = false
  ) with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and is_default = false
  );

create policy "Playbook: delete own cards" on public.sales_playbook_objections
  for delete using (
    auth.uid() is not null
    and user_id = auth.uid()
    and is_default = false
  );
