-- Strenova owner-only authorization and structured workout library.
create table if not exists public.owner_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint owner_permissions_fixed_owner check (user_id = 'bd340729-7dd9-4d57-a170-ebb7b22e1a49'::uuid)
);
insert into public.owner_permissions(user_id) values ('bd340729-7dd9-4d57-a170-ebb7b22e1a49'::uuid)
on conflict (user_id) do nothing;
alter table public.owner_permissions enable row level security;
revoke all on public.owner_permissions from anon, authenticated;
grant select on public.owner_permissions to authenticated;
drop policy if exists owner_permissions_read_self on public.owner_permissions;
create policy owner_permissions_read_self on public.owner_permissions for select to authenticated
using (user_id = (select auth.uid()));

create or replace function private.is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() = 'bd340729-7dd9-4d57-a170-ebb7b22e1a49'::uuid
  and exists (select 1 from public.owner_permissions op where op.user_id = (select auth.uid()));
$$;
revoke all on function private.is_owner() from public, anon;
grant execute on function private.is_owner() to authenticated;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.is_owner(); $$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function public.admin_search_users(p_search text default '')
returns table(user_id uuid,email text,display_name text,account_role text,subscription_status text,
subscription_expires_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare v_search text := left(trim(coalesce(p_search,'')),120);
begin
  if auth.uid() is null or not private.is_owner() then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  return query
  select u.id,u.email::text,
    coalesce(up.profile->>'name',u.raw_user_meta_data->>'full_name',split_part(coalesce(u.email,''),'@',1)),
    coalesce((select r.role from public.user_roles r where r.user_id=u.id
      order by case r.role when 'coach' then 1 when 'athlete' then 2 else 3 end limit 1),'athlete'),
    coalesce(s.status,'inactive'),s.expires_at,u.created_at
  from auth.users u
  left join public.user_profiles up on up.user_id=u.id
  left join public.gt_subscriptions s on s.user_id=u.id
  where v_search='' or u.email ilike '%'||v_search||'%'
    or u.id::text ilike '%'||v_search||'%'
    or coalesce(up.profile->>'name',u.raw_user_meta_data->>'full_name','') ilike '%'||v_search||'%'
  order by u.created_at desc limit 100;
end;
$$;
revoke all on function public.admin_search_users(text) from public, anon;
grant execute on function public.admin_search_users(text) to authenticated;

create or replace function public.admin_set_plus(p_target_user_id uuid,p_duration_days integer,p_reason text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_start timestamptz := now(); v_expiry timestamptz;
begin
  if auth.uid() is null or not private.is_owner() then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if p_target_user_id is null or not exists(select 1 from auth.users where id=p_target_user_id) then
    raise exception 'User not found';
  end if;
  if p_duration_days not in (0,7,30,90,180,365) then raise exception 'Unsupported Plus duration'; end if;
  v_expiry := case when p_duration_days=0 then null else v_start+make_interval(days=>p_duration_days) end;
  insert into public.gt_subscriptions(user_id,status,plan,starts_at,expires_at,updated_at)
  values(p_target_user_id,'active','plus',v_start,v_expiry,now())
  on conflict(user_id) do update set status='active',plan='plus',starts_at=excluded.starts_at,
    expires_at=excluded.expires_at,updated_at=now();
  insert into public.subscription_history(user_id,changed_by,event_type,duration_days,reason,starts_at,expires_at)
  values(p_target_user_id,auth.uid(),'granted',p_duration_days,
    nullif(left(coalesce(p_reason,'term changed by owner'),500),''),v_start,v_expiry);
  return jsonb_build_object('success',true,'user_id',p_target_user_id,'status','active','expires_at',v_expiry);
end;
$$;
revoke all on function public.admin_set_plus(uuid,integer,text) from public, anon;
grant execute on function public.admin_set_plus(uuid,integer,text) to authenticated;

alter table public.workout_programs
  add column if not exists is_library boolean not null default false,
  add column if not exists is_published boolean not null default false,
  add column if not exists description text not null default '',
  add column if not exists weekly_frequency smallint,
  add column if not exists training_location text[] not null default '{}',
  add column if not exists goal text[] not null default '{}',
  add column if not exists equipment text[] not null default '{}',
  add column if not exists muscle_groups text[] not null default '{}',
  add column if not exists schedule jsonb not null default '[]'::jsonb,
  add column if not exists safety_notes text not null default '',
  add column if not exists age_guidance text not null default '',
  add constraint workout_programs_weekly_frequency_check check (weekly_frequency is null or weekly_frequency between 2 and 5);
create index if not exists workout_programs_library_idx on public.workout_programs(is_library,is_published,weekly_frequency);
drop policy if exists workout_programs_read_published_library on public.workout_programs;
create policy workout_programs_read_published_library on public.workout_programs
for select to authenticated using (is_library=true and is_published=true);

create table if not exists public.workout_days (
 id uuid primary key default gen_random_uuid(), program_id uuid not null references public.workout_programs(id) on delete cascade,
 day_number smallint not null check(day_number between 1 and 7), name text not null check(char_length(name) between 1 and 100),
 focus text not null default '', is_rest_day boolean not null default false, unique(program_id,day_number)
);
create table if not exists public.workout_exercises (
 id uuid primary key default gen_random_uuid(), workout_day_id uuid not null references public.workout_days(id) on delete cascade,
 sort_order smallint not null default 1 check(sort_order>0), name text not null check(char_length(name) between 1 and 120),
 sets smallint check(sets between 1 and 6), reps text,
 duration_seconds integer check(duration_seconds is null or duration_seconds between 1 and 3600),
 rest_seconds integer check(rest_seconds is null or rest_seconds between 0 and 600),
 muscle_groups text[] not null default '{}', equipment text[] not null default '{}',
 instructions text not null default '', safety_notes text not null default '', unique(workout_day_id,sort_order)
);
create table if not exists public.program_sources (
 id uuid primary key default gen_random_uuid(), program_id uuid not null references public.workout_programs(id) on delete cascade,
 organization text not null, title text not null, source_url text, publication_year smallint,
 evidence_note text not null default '', created_at timestamptz not null default now(),
 check(source_url is null or source_url ~ '^https://')
);
create table if not exists public.user_workout_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 goal text not null check(goal in ('fitness','strength','endurance','sport','activity')),
 training_location text not null check(training_location in ('gym','home','outdoor','mixed')),
 equipment text[] not null default '{}', sessions_per_week smallint not null check(sessions_per_week between 2 and 5),
 experience_level text not null check(experience_level in ('beginner','intermediate','advanced')),
 session_duration text not null check(session_duration in ('20-30','30-45','45-60','60+')),
 updated_at timestamptz not null default now()
);
create table if not exists public.user_active_programs (
 user_id uuid primary key references auth.users(id) on delete cascade,
 program_id uuid not null references public.workout_programs(id), selected_at timestamptz not null default now()
);
create table if not exists public.user_program_history (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 program_id uuid not null references public.workout_programs(id), selected_at timestamptz not null default now(),
 ended_at timestamptz, selection_reason text not null default 'user_selected'
);

alter table public.workout_days enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.program_sources enable row level security;
alter table public.user_workout_preferences enable row level security;
alter table public.user_active_programs enable row level security;
alter table public.user_program_history enable row level security;
drop policy if exists workout_days_read_program_access on public.workout_days;
create policy workout_days_read_program_access on public.workout_days for select to authenticated using (
 exists(select 1 from public.workout_programs p where p.id=program_id and
 ( (p.is_library and p.is_published) or p.coach_id=(select auth.uid())
   or private.is_program_assigned_to_current_user(p.id) or private.is_admin()))
);
drop policy if exists workout_exercises_read_program_access on public.workout_exercises;
create policy workout_exercises_read_program_access on public.workout_exercises for select to authenticated using (
 exists(select 1 from public.workout_days d join public.workout_programs p on p.id=d.program_id
 where d.id=workout_day_id and ((p.is_library and p.is_published) or p.coach_id=(select auth.uid())
 or private.is_program_assigned_to_current_user(p.id) or private.is_admin()))
);
drop policy if exists program_sources_read_published on public.program_sources;
create policy program_sources_read_published on public.program_sources for select to authenticated using (
 exists(select 1 from public.workout_programs p where p.id=program_id and
 ((p.is_library and p.is_published) or p.coach_id=(select auth.uid()) or private.is_admin()))
);
drop policy if exists user_workout_preferences_self on public.user_workout_preferences;
create policy user_workout_preferences_self on public.user_workout_preferences for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists user_active_programs_self on public.user_active_programs;
create policy user_active_programs_self on public.user_active_programs for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists user_program_history_self on public.user_program_history;
create policy user_program_history_self on public.user_program_history for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select on public.workout_days,public.workout_exercises,public.program_sources to authenticated;
grant select,insert,update,delete on public.user_workout_preferences,public.user_active_programs,public.user_program_history to authenticated;
