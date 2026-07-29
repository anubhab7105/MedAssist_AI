-- =====================================================================
-- MedAssist AI — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- =====================================================================

-- ---------------------------------------------------------------------
-- users: extends auth.users with app-specific profile fields
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  medical_history text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a public.users row whenever someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- chat_history
-- ---------------------------------------------------------------------
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  conversation_id uuid not null default gen_random_uuid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_history_user_id_idx on public.chat_history(user_id);
create index if not exists chat_history_conversation_id_idx on public.chat_history(conversation_id);

-- ---------------------------------------------------------------------
-- symptom_history
-- ---------------------------------------------------------------------
create table if not exists public.symptom_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  request_payload jsonb not null,
  response_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists symptom_history_user_id_idx on public.symptom_history(user_id);

-- ---------------------------------------------------------------------
-- saved_locations
-- ---------------------------------------------------------------------
create table if not exists public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_locations_user_id_idx on public.saved_locations(user_id);

-- =====================================================================
-- Row Level Security — every table is locked to the owning user.
-- The backend uses the service-role key (which bypasses RLS) for writes
-- made on the user's behalf after verifying their JWT itself; these
-- policies are the defense-in-depth layer for any direct client access.
-- =====================================================================

alter table public.users enable row level security;
alter table public.chat_history enable row level security;
alter table public.symptom_history enable row level security;
alter table public.saved_locations enable row level security;

create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can view own chat history" on public.chat_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own chat history" on public.chat_history
  for insert with check (auth.uid() = user_id);

create policy "Users can view own symptom history" on public.symptom_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own symptom history" on public.symptom_history
  for insert with check (auth.uid() = user_id);

create policy "Users can manage own saved locations" on public.saved_locations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
