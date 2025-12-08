-- 2025-11-27 00:10:00 | Create proposals table for CRM
create extension if not exists "pgcrypto";

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  value numeric(14,2) not null,
  status text not null default 'pending',
  template_id text not null,
  file_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.refresh_proposals_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_proposals_timestamp
  before update on public.proposals
  for each row execute procedure public.refresh_proposals_timestamp();

alter table public.proposals enable row level security;

create policy "Proposals: owners can read" on public.proposals
  for select using (
    user_id = auth.uid()
  );

create policy "Proposals: owners can insert" on public.proposals
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );

create policy "Proposals: owners can update status" on public.proposals
  for update using (
    auth.uid() is not null
    and user_id = auth.uid()
  ) with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );

create policy "Proposals: owners can delete" on public.proposals
  for delete using (
    auth.uid() is not null
    and user_id = auth.uid()
  );
