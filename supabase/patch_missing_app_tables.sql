-- Strenova: additive repair for the live Supabase project.
-- Safe to re-run. This file creates only the three app tables that were missing.
-- Existing tables, policies, and user records are intentionally left untouched.

create table if not exists public.workout_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  title text not null default 'Workout',
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint workout_templates_user_name_key unique (user_id, name)
);

create table if not exists public.user_custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  en_name text,
  category text not null default 'Власні',
  muscles text,
  instructions text,
  mistakes text,
  aliases jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,
  training_location text not null default 'all',
  difficulty text,
  video_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_custom_exercises_user_name_key unique (user_id, name)
);

alter table public.workout_drafts enable row level security;
alter table public.workout_templates enable row level security;
alter table public.user_custom_exercises enable row level security;

drop policy if exists "Users manage own drafts" on public.workout_drafts;
create policy "Users manage own drafts" on public.workout_drafts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own templates" on public.workout_templates;
create policy "Users manage own templates" on public.workout_templates
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own custom exercises" on public.user_custom_exercises;
create policy "Users manage own custom exercises" on public.user_custom_exercises
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.workout_drafts to authenticated;
grant select, insert, update, delete on public.workout_templates to authenticated;
grant select, insert, update, delete on public.user_custom_exercises to authenticated;

notify pgrst, 'reload schema';
