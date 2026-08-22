create extension if not exists pgcrypto;

create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  kind text not null,
  external_id text,
  title text not null,
  description text,
  status text not null default 'open',
  priority text not null default 'none',
  due_at timestamptz,
  estimated_minutes integer,
  tags text[] not null default '{}',
  related_person text,
  related_project text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, source, external_id)
);

create table public.work_item_overlays (
  work_item_id uuid primary key references public.work_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  snooze_until timestamptz,
  ignored_at timestamptz,
  next_action text,
  notes text,
  reminder_at timestamptz,
  waiting_for_person text,
  waiting_for_expected text,
  waiting_since timestamptz,
  last_follow_up_at timestamptz,
  suggested_follow_up_at timestamptz
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  external_id text not null,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_all_day boolean not null default false,
  location text,
  raw jsonb,
  unique (user_id, source, external_id)
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  encrypted_tokens text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table public.sync_cursors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  cursor text,
  last_synced_at timestamptz,
  unique (user_id, provider)
);

create index work_items_user_status_idx on public.work_items (user_id, status);
create index calendar_events_user_start_idx on public.calendar_events (user_id, start_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger work_items_updated_at
before update on public.work_items
for each row execute procedure public.set_updated_at();

create trigger connections_updated_at
before update on public.connections
for each row execute procedure public.set_updated_at();

alter table public.work_items enable row level security;
alter table public.work_item_overlays enable row level security;
alter table public.calendar_events enable row level security;
alter table public.connections enable row level security;
alter table public.sync_cursors enable row level security;

create policy work_items_own on public.work_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy overlays_own on public.work_item_overlays
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy calendar_events_own on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy connections_own on public.connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sync_cursors_own on public.sync_cursors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
