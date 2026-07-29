-- LückenSprint cloud progress. Run in Supabase SQL Editor as the project owner.
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  progress_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  device_id text,
  revision bigint not null default 0
);

create index if not exists user_progress_updated_at_idx on public.user_progress(updated_at desc);

alter table public.user_progress enable row level security;

drop policy if exists "Users read own progress" on public.user_progress;
drop policy if exists "Users insert own progress" on public.user_progress;
drop policy if exists "Users update own progress" on public.user_progress;
drop policy if exists "Users delete own progress" on public.user_progress;

create policy "Users read own progress" on public.user_progress
  for select using (auth.uid() = user_id);
create policy "Users insert own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);
create policy "Users update own progress" on public.user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own progress" on public.user_progress
  for delete using (auth.uid() = user_id);
