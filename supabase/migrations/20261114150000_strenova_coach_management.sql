-- Strenova: role switching, coach requests, coach-managed nutrition, programs and schedule.
-- Additive migration: existing users, programmes, subscriptions and history are preserved.

-- A coach who temporarily switches to Athlete is suspended, not deleted. This keeps
-- relationships recoverable while preventing coach access until the Coach role returns.
alter table public.athlete_coach_relationships
  drop constraint if exists athlete_coach_relationships_status_check;
alter table public.athlete_coach_relationships
  add constraint athlete_coach_relationships_status_check
  check (status = any (array['pending'::text, 'active'::text, 'rejected'::text, 'ended'::text, 'suspended'::text]));

create table if not exists public.account_role_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_role text,
  to_role text not null check (to_role in ('athlete','coach')),
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  constraint account_role_history_from_role_check
    check (from_role is null or from_role in ('athlete','coach'))
);

alter table public.account_role_history enable row level security;
drop policy if exists account_role_history_read_self_or_admin on public.account_role_history;
create policy account_role_history_read_self_or_admin
  on public.account_role_history for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());
revoke all on public.account_role_history from anon, authenticated;
grant select on public.account_role_history to authenticated;

-- A current coach role is required for every coach-side helper. This automatically
-- disables retained coach access while a user is using the Athlete role.
create or replace function private.is_active_coach_for_athlete(p_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.athlete_coach_relationships r
     where r.coach_id = (select auth.uid())
       and r.athlete_id = p_athlete_id
       and r.status = 'active'
       and exists (
         select 1 from public.user_roles ur
          where ur.user_id = (select auth.uid()) and ur.role = 'coach'
       )
  );
$$;

create or replace function private.is_connected_to_coach(p_coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.athlete_coach_relationships r
     where r.athlete_id = (select auth.uid())
       and r.coach_id = p_coach_id
       and r.status = 'active'
       and exists (
         select 1 from public.user_roles ur
          where ur.user_id = p_coach_id and ur.role = 'coach'
       )
  );
$$;

revoke all on function private.is_active_coach_for_athlete(uuid) from public, anon;
revoke all on function private.is_connected_to_coach(uuid) from public, anon;
grant execute on function private.is_active_coach_for_athlete(uuid) to authenticated;
grant execute on function private.is_connected_to_coach(uuid) to authenticated;

create or replace function public.switch_account_role(p_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_previous_role text;
  v_code text;
  v_profile jsonb;
  v_specialization text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_role is null or p_role not in ('athlete','coach') then
    raise exception 'Only Athlete or Coach roles can be selected' using errcode = '22023';
  end if;
  if private.is_admin() or exists (
    select 1 from public.user_roles r where r.user_id=v_uid and r.role='admin'
  ) then
    raise exception 'Admin role cannot be changed through self-service role switching' using errcode = '42501';
  end if;

  select case when exists(select 1 from public.user_roles r where r.user_id=v_uid and r.role='coach')
              then 'coach' else 'athlete' end
    into v_previous_role;

  select coalesce(up.profile, '{}'::jsonb)
    into v_profile
    from public.user_profiles up
   where up.user_id = v_uid;
  v_specialization := left(coalesce(nullif(trim(v_profile->>'coachSpecialization'),''),'General fitness'),120);

  -- A role change is a reversible visibility/access switch. Historical rows remain.
  if v_previous_role <> p_role then
    if p_role = 'coach' then
      update public.athlete_coach_relationships
         set status='suspended', updated_at=now()
       where athlete_id=v_uid and status='active';
       update public.athlete_coach_relationships set status='rejected',updated_at=now() where athlete_id=v_uid and status='pending';

      insert into public.user_roles(user_id,role)
      values (v_uid,'coach') on conflict (user_id,role) do nothing;
      delete from public.user_roles where user_id=v_uid and role='athlete';
      insert into public.gt_user_roles(user_id,role)
      values (v_uid,'coach') on conflict (user_id) do update set role=excluded.role;

      insert into public.coach_profiles(user_id,specialization,experience_years,bio,avatar_url,coach_code)
      values (
        v_uid,
        v_specialization,
        0,
        '',
        null,
        'COACH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))
      ) on conflict (user_id) do nothing;

      select cp.coach_code into v_code from public.coach_profiles cp where cp.user_id=v_uid;
      insert into public.coach_invites(coach_id,invite_code,is_active,expires_at)
      values (v_uid,v_code,true,null)
      on conflict (invite_code) do update set is_active=true, expires_at=null;

      -- Restore previous coach-client links only when the athlete has no other active coach.
      update public.athlete_coach_relationships r
         set status='active', updated_at=now()
       where r.coach_id=v_uid
         and r.status='suspended'
         and not exists (
           select 1 from public.athlete_coach_relationships active_r
            where active_r.athlete_id=r.athlete_id and active_r.status='active'
         );
    else
      update public.athlete_coach_relationships
         set status='suspended', updated_at=now()
       where coach_id=v_uid and status='active';
       update public.athlete_coach_relationships set status='rejected',updated_at=now() where coach_id=v_uid and status='pending';

      insert into public.user_roles(user_id,role)
      values (v_uid,'athlete') on conflict (user_id,role) do nothing;
      delete from public.user_roles where user_id=v_uid and role='coach';
      delete from public.gt_user_roles where user_id=v_uid;

      -- Restore the user's own former athlete-to-coach relationship when available.
      update public.athlete_coach_relationships r
         set status='active', updated_at=now()
       where r.athlete_id=v_uid
         and r.status='suspended'
         and not exists (
           select 1 from public.athlete_coach_relationships active_r
            where active_r.athlete_id=v_uid and active_r.status='active'
         );
    end if;

    insert into public.account_role_history(user_id,from_role,to_role,changed_by)
    values (v_uid,v_previous_role,p_role,v_uid);
  else
    -- Repair missing coach identity records without replacing profile/history data.
    if p_role='coach' then
      insert into public.coach_profiles(user_id,specialization,experience_years,bio,avatar_url,coach_code)
      values (v_uid,v_specialization,0,'',null,'COACH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)))
      on conflict (user_id) do nothing;
      select cp.coach_code into v_code from public.coach_profiles cp where cp.user_id=v_uid;
      insert into public.coach_invites(coach_id,invite_code,is_active,expires_at)
      values (v_uid,v_code,true,null)
      on conflict (invite_code) do update set is_active=true, expires_at=null;
      insert into public.gt_user_roles(user_id,role) values(v_uid,'coach') on conflict(user_id) do nothing;
    end if;
  end if;

  update public.user_profiles
     set profile=jsonb_set(coalesce(profile,'{}'::jsonb),'{accountType}',to_jsonb(p_role),true),
         updated_at=now()
   where user_id=v_uid;
  if not found then
    insert into public.user_profiles(user_id,profile,created_at,updated_at)
    values(v_uid,jsonb_build_object('accountType',p_role),now(),now());
  end if;

  return jsonb_build_object(
    'success',true,
    'role',p_role,
    'coach_code',case when p_role='coach' then v_code else null end,
    'relationships_preserved',true
  );
end;
$$;

revoke all on function public.switch_account_role(text) from public, anon, authenticated;
grant execute on function public.switch_account_role(text) to authenticated;

create or replace function public.request_coach_connection(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_athlete uuid := auth.uid();
  v_coach uuid;
  v_invite uuid;
  v_existing public.athlete_coach_relationships%rowtype;
  v_relationship_id uuid;
  v_active_coach uuid;
begin
  if v_athlete is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not private.has_role(v_athlete,'athlete') then raise exception 'Only Athlete accounts can request a coach' using errcode='42501'; end if;

  select i.coach_id,i.id into v_coach,v_invite
    from public.coach_invites i
   where upper(i.invite_code)=upper(trim(coalesce(p_invite_code,'')))
     and i.is_active=true
     and (i.expires_at is null or i.expires_at>now())
   limit 1;
  if v_coach is null then raise exception 'Invite code not found or expired' using errcode='22023'; end if;
  if v_coach=v_athlete then raise exception 'You cannot connect to your own coach account' using errcode='22023'; end if;
  if not exists(select 1 from public.user_roles r where r.user_id=v_coach and r.role='coach') then
    raise exception 'This coach account is not active' using errcode='22023';
  end if;

  select r.coach_id into v_active_coach
    from public.athlete_coach_relationships r
   where r.athlete_id=v_athlete and r.status='active'
   limit 1;
  if v_active_coach is not null and v_active_coach<>v_coach then
    raise exception 'You already have an active coach. Disconnect first.' using errcode='23505';
  end if;

  select * into v_existing
    from public.athlete_coach_relationships r
   where r.coach_id=v_coach and r.athlete_id=v_athlete
   for update;

  if found and v_existing.status='active' then
    return jsonb_build_object('success',true,'status','active','relationship_id',v_existing.id);
  elsif found then
    update public.athlete_coach_relationships
       set invite_id=v_invite,status='pending',updated_at=now()
     where id=v_existing.id;
    return jsonb_build_object('success',true,'status','pending','relationship_id',v_existing.id);
  else
    insert into public.athlete_coach_relationships(coach_id,athlete_id,invite_id,status)
    values(v_coach,v_athlete,v_invite,'pending')
    returning id into v_relationship_id;
    return jsonb_build_object('success',true,'status','pending','relationship_id',v_relationship_id);
  end if;
end;
$$;

-- Legacy entry point: connection requests must still be approved by the coach.
create or replace function public.accept_coach_invite(p_invite_code text) returns jsonb
language plpgsql security definer set search_path = ''
as $cm$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  return public.request_coach_connection(p_invite_code);
end;
$cm$;
revoke all on function public.accept_coach_invite(text) from public,anon,authenticated;
grant execute on function public.accept_coach_invite(text) to authenticated;
create or replace function public.review_coach_connection(p_relationship_id uuid,p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_athlete uuid;
  v_status text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_action is null or p_action not in ('accept','reject') then raise exception 'Action must be accept or reject' using errcode='22023'; end if;
  if not private.has_role(v_uid,'coach') then raise exception 'Coach access required' using errcode='42501'; end if;

  select r.athlete_id,r.status into v_athlete,v_status
    from public.athlete_coach_relationships r
   where r.id=p_relationship_id and r.coach_id=v_uid
   for update;
  if v_athlete is null then raise exception 'Connection request not found' using errcode='P0002'; end if;
  if v_status<>'pending' then raise exception 'Connection request is no longer pending' using errcode='22023'; end if;

  perform 1 from auth.users u where u.id=v_athlete for update;
  if p_action='reject' then
    update public.athlete_coach_relationships
       set status='rejected',updated_at=now()
     where id=p_relationship_id and coach_id=v_uid and status='pending';
    return jsonb_build_object('success',true,'status','rejected','relationship_id',p_relationship_id);
  end if;

  if not exists (select 1 from public.user_roles ur where ur.user_id=v_athlete and ur.role='athlete') then
    raise exception 'The requesting account is no longer an athlete' using errcode='42501';
  end if;

  if exists(
    select 1 from public.athlete_coach_relationships r
     where r.athlete_id=v_athlete and r.status='active' and r.coach_id<>v_uid
  ) then raise exception 'Athlete already has another active coach' using errcode='23505'; end if;

  update public.athlete_coach_relationships
     set status='active',updated_at=now()
   where id=p_relationship_id and coach_id=v_uid and status='pending';
  return jsonb_build_object('success',true,'status','active','relationship_id',p_relationship_id);
exception when unique_violation then
  raise exception 'Athlete already has another active coach' using errcode='23505';
end;
$$;

create or replace function public.coach_athlete_profile(p_athlete_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not (private.is_active_coach_for_athlete(p_athlete_id) or private.is_admin()) then
    raise exception 'Active coach relationship required' using errcode='42501';
  end if;

  select up.profile into v_profile
    from public.user_profiles up
   where up.user_id=p_athlete_id;
  if v_profile is null then raise exception 'Athlete profile not found' using errcode='P0002'; end if;

  -- Explicit allow-list: never expose the complete profile JSON, email or private notes.
  return jsonb_build_object(
    'user_id',p_athlete_id,
    'name',v_profile->>'name',
    'age',v_profile->>'age',
    'height',v_profile->>'height',
    'weight',v_profile->>'weight',
    'targetWeight',v_profile->>'targetWeight',
    'goal',v_profile->>'goal',
    'level',v_profile->>'level',
    'place',v_profile->>'place',
    'days',v_profile->>'days',
    'duration',v_profile->>'duration',
    'sport',v_profile->>'sport'
  );
end;
$$;

create or replace function public.coach_athlete_profiles(p_athlete_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_requested_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  select count(distinct x) into v_requested_count from unnest(coalesce(p_athlete_ids,'{}'::uuid[])) x;
  if v_requested_count > 25 then raise exception 'Request no more than 25 athlete profiles at once' using errcode='22023'; end if;
  if exists (
    select 1 from (select distinct x as athlete_id from unnest(coalesce(p_athlete_ids,'{}'::uuid[])) x) requested
     where not (private.is_active_coach_for_athlete(requested.athlete_id) or private.is_admin())
  ) then raise exception 'Every athlete must be an active client of this coach' using errcode='42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',up.user_id,
    'name',up.profile->>'name',
    'age',up.profile->>'age',
    'height',up.profile->>'height',
    'weight',up.profile->>'weight',
    'targetWeight',up.profile->>'targetWeight',
    'goal',up.profile->>'goal',
    'level',up.profile->>'level',
    'place',up.profile->>'place',
    'days',up.profile->>'days',
    'duration',up.profile->>'duration',
    'sport',up.profile->>'sport'
  ) order by up.profile->>'name'), '[]'::jsonb)
    into v_result
    from public.user_profiles up
   where up.user_id = any(coalesce(p_athlete_ids,'{}'::uuid[]));
  return v_result;
end;
$$;

revoke all on function public.request_coach_connection(text) from public, anon, authenticated;
revoke all on function public.review_coach_connection(uuid,text) from public, anon, authenticated;
revoke all on function public.coach_athlete_profile(uuid) from public, anon, authenticated;
revoke all on function public.coach_athlete_profiles(uuid[]) from public, anon, authenticated;
grant execute on function public.request_coach_connection(text) to authenticated;
grant execute on function public.review_coach_connection(uuid,text) to authenticated;
grant execute on function public.coach_athlete_profile(uuid) to authenticated;
grant execute on function public.coach_athlete_profiles(uuid[]) to authenticated;

-- Coach-managed nutrition targets and immutable audit snapshots.
create table if not exists public.coach_nutrition_targets (
  athlete_id uuid primary key references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  calories_kcal integer,
  protein_g numeric(8,2),
  fat_g numeric(8,2),
  carbs_g numeric(8,2),
  water_ml integer,
  notes text not null default '',
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_nutrition_targets_calories_check check (calories_kcal is null or calories_kcal between 0 and 15000),
  constraint coach_nutrition_targets_protein_check check (protein_g is null or protein_g between 0 and 2000),
  constraint coach_nutrition_targets_fat_check check (fat_g is null or fat_g between 0 and 2000),
  constraint coach_nutrition_targets_carbs_check check (carbs_g is null or carbs_g between 0 and 2000),
  constraint coach_nutrition_targets_water_check check (water_ml is null or water_ml between 0 and 15000),
  constraint coach_nutrition_targets_notes_check check (char_length(notes)<=1000)
);

create table if not exists public.coach_nutrition_target_history (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id),
  changed_by uuid not null references auth.users(id),
  snapshot jsonb not null,
  changed_at timestamptz not null default now()
);

create index if not exists coach_nutrition_targets_coach_updated_idx
  on public.coach_nutrition_targets(coach_id,updated_at desc);
create index if not exists coach_nutrition_target_history_athlete_changed_idx
  on public.coach_nutrition_target_history(athlete_id,changed_at desc);

alter table public.coach_nutrition_targets enable row level security;
alter table public.coach_nutrition_target_history enable row level security;

-- Explicit grants are required for the Supabase Data API; RLS remains the row boundary.
revoke all on public.coach_nutrition_targets from anon, authenticated;
revoke all on public.coach_nutrition_target_history from anon, authenticated;
grant select,insert,update on public.coach_nutrition_targets to authenticated;
grant select on public.coach_nutrition_target_history to authenticated;

drop policy if exists coach_nutrition_targets_read_participants on public.coach_nutrition_targets;
create policy coach_nutrition_targets_read_participants
  on public.coach_nutrition_targets for select to authenticated
  using (
    athlete_id=(select auth.uid())
    or (coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach') and private.is_active_coach_for_athlete(athlete_id))
    or private.is_admin()
  );
drop policy if exists coach_nutrition_targets_insert_active_coach on public.coach_nutrition_targets;
create policy coach_nutrition_targets_insert_active_coach
  on public.coach_nutrition_targets for insert to authenticated
  with check (
    coach_id=(select auth.uid())
    and updated_by=(select auth.uid())
    and private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(athlete_id)
  );
drop policy if exists coach_nutrition_targets_update_active_coach on public.coach_nutrition_targets;
create policy coach_nutrition_targets_update_active_coach
  on public.coach_nutrition_targets for update to authenticated
  using (
    private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(athlete_id)
  )
  with check (
    coach_id=(select auth.uid())
    and updated_by=(select auth.uid())
    and private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(athlete_id)
  );
drop policy if exists coach_nutrition_target_history_read_participants on public.coach_nutrition_target_history;
create policy coach_nutrition_target_history_read_participants
  on public.coach_nutrition_target_history for select to authenticated
  using (
    athlete_id=(select auth.uid())
    or (coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach') and private.is_active_coach_for_athlete(athlete_id))
    or private.is_admin()
  );

create or replace function private.capture_coach_nutrition_target_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op='UPDATE'
     and old.coach_id is not distinct from new.coach_id
     and old.calories_kcal is not distinct from new.calories_kcal
     and old.protein_g is not distinct from new.protein_g
     and old.fat_g is not distinct from new.fat_g
     and old.carbs_g is not distinct from new.carbs_g
     and old.water_ml is not distinct from new.water_ml
     and old.notes is not distinct from new.notes then
    return new;
  end if;

  insert into public.coach_nutrition_target_history(athlete_id,coach_id,changed_by,snapshot)
  values(
    new.athlete_id,
    new.coach_id,
    coalesce(auth.uid(),new.updated_by),
    jsonb_build_object(
      'calories_kcal',new.calories_kcal,
      'protein_g',new.protein_g,
      'fat_g',new.fat_g,
      'carbs_g',new.carbs_g,
      'water_ml',new.water_ml,
      'notes',new.notes
    )
  );
  return new;
end;
$$;
revoke all on function private.capture_coach_nutrition_target_history() from public, anon, authenticated;
drop trigger if exists coach_nutrition_target_history_capture on public.coach_nutrition_targets;
create trigger coach_nutrition_target_history_capture
  after insert or update on public.coach_nutrition_targets
  for each row execute function private.capture_coach_nutrition_target_history();

-- Schedules remain athlete-owned rows; an active coach may also maintain that athlete's row.
drop policy if exists workout_schedule_read_self_coach_admin on public.workout_schedule;
create policy workout_schedule_read_self_coach_admin
  on public.workout_schedule for select to authenticated
  using (
    user_id=(select auth.uid())
    or (private.has_role((select auth.uid()),'coach') and private.is_active_coach_for_athlete(user_id))
    or private.is_admin()
  );
drop policy if exists workout_schedule_coach_insert on public.workout_schedule;
create policy workout_schedule_coach_insert
  on public.workout_schedule for insert to authenticated
  with check (
    private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(user_id)
  );
drop policy if exists workout_schedule_coach_update on public.workout_schedule;
create policy workout_schedule_coach_update
  on public.workout_schedule for update to authenticated
  using (
    private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(user_id)
  )
  with check (
    private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(user_id)
  );
drop policy if exists workout_schedule_coach_delete on public.workout_schedule;
create policy workout_schedule_coach_delete
  on public.workout_schedule for delete to authenticated
  using (
    private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(user_id)
  );

-- Restrict retained coach ownership after a user switches to Athlete.
drop policy if exists relationships_read_participants on public.athlete_coach_relationships;
create policy relationships_read_participants
  on public.athlete_coach_relationships for select to authenticated
  using (
    athlete_id=(select auth.uid())
    or (coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach'))
    or private.is_admin()
  );
drop policy if exists coach_invites_read_owner on public.coach_invites;
create policy coach_invites_read_owner
  on public.coach_invites for select to authenticated
  using ((coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach')) or private.is_admin());

drop policy if exists assigned_workouts_read_participants on public.assigned_workouts;
create policy assigned_workouts_read_participants
  on public.assigned_workouts for select to authenticated
  using (
    athlete_user_id=(select auth.uid())
    or (coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach') and private.is_active_coach_for_athlete(athlete_user_id))
    or private.is_admin()
  );
drop policy if exists assigned_workouts_update_owner on public.assigned_workouts;
create policy assigned_workouts_update_owner
  on public.assigned_workouts for update to authenticated
  using (
    (coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach') and private.is_active_coach_for_athlete(athlete_user_id))
    or private.is_admin()
  )
  with check (
    (coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach') and private.is_active_coach_for_athlete(athlete_user_id))
    or private.is_admin()
  );
drop policy if exists assigned_workouts_delete_owner on public.assigned_workouts;
create policy assigned_workouts_delete_owner
  on public.assigned_workouts for delete to authenticated
  using (
    (coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach') and private.is_active_coach_for_athlete(athlete_user_id))
    or private.is_admin()
  );

drop policy if exists workout_logs_read_self_coach_admin on public.workout_logs;
create policy workout_logs_read_self_coach_admin
  on public.workout_logs for select to authenticated
  using (
    user_id=(select auth.uid())
    or (private.has_role((select auth.uid()),'coach') and private.is_active_coach_for_athlete(user_id))
    or private.is_admin()
  );

drop policy if exists workout_programs_read_owner_or_assigned on public.workout_programs;
create policy workout_programs_read_owner_or_assigned
  on public.workout_programs for select to authenticated
  using (
    (coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach'))
    or private.is_program_assigned_to_current_user(id)
    or private.is_admin()
    or (is_library=true and is_published=true)
  );
drop policy if exists workout_programs_update_owner on public.workout_programs;
create policy workout_programs_update_owner
  on public.workout_programs for update to authenticated
  using ((coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach')) or private.is_admin())
  with check ((coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach')) or private.is_admin());
drop policy if exists workout_programs_delete_owner on public.workout_programs;
create policy workout_programs_delete_owner
  on public.workout_programs for delete to authenticated
  using ((coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach')) or private.is_admin());

drop policy if exists workout_days_read_program_access on public.workout_days;
create policy workout_days_read_program_access
  on public.workout_days for select to authenticated
  using (
    exists(
      select 1 from public.workout_programs p
       where p.id=workout_days.program_id
         and (
           (p.coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach'))
           or (p.is_library=true and p.is_published=true)
           or private.is_program_assigned_to_current_user(p.id)
           or private.is_admin()
         )
    )
  );
drop policy if exists workout_exercises_read_program_access on public.workout_exercises;
create policy workout_exercises_read_program_access
  on public.workout_exercises for select to authenticated
  using (
    exists(
      select 1 from public.workout_days d
      join public.workout_programs p on p.id=d.program_id
       where d.id=workout_exercises.workout_day_id
         and (
           (p.coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach'))
           or (p.is_library=true and p.is_published=true)
           or private.is_program_assigned_to_current_user(p.id)
           or private.is_admin()
         )
    )
  );

-- Extend the existing exercise table without replacing saved exercise data.
alter table public.workout_exercises
  add column if not exists working_weight numeric(8,2),
  add column if not exists coach_comment text not null default '';

do $cm$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.workout_exercises'::regclass and conname='workout_exercises_working_weight_check') then
    alter table public.workout_exercises add constraint workout_exercises_working_weight_check check (working_weight is null or working_weight between 0 and 1500);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.workout_exercises'::regclass and conname='workout_exercises_coach_comment_check') then
    alter table public.workout_exercises add constraint workout_exercises_coach_comment_check check (char_length(coach_comment)<=500);
  end if;
end;
$cm$;
-- Program days and exercises can be edited only through a parent program owned by this coach.
grant select,insert,update,delete on public.workout_days,public.workout_exercises to authenticated;

drop policy if exists workout_days_coach_insert on public.workout_days;
create policy workout_days_coach_insert
  on public.workout_days for insert to authenticated
  with check (
    exists(select 1 from public.workout_programs p
      where p.id=workout_days.program_id
        and p.coach_id=(select auth.uid())
        and private.has_role((select auth.uid()),'coach'))
  );
drop policy if exists workout_days_coach_update on public.workout_days;
create policy workout_days_coach_update
  on public.workout_days for update to authenticated
  using (
    exists(select 1 from public.workout_programs p
      where p.id=workout_days.program_id
        and p.coach_id=(select auth.uid())
        and private.has_role((select auth.uid()),'coach'))
  )
  with check (
    exists(select 1 from public.workout_programs p
      where p.id=workout_days.program_id
        and p.coach_id=(select auth.uid())
        and private.has_role((select auth.uid()),'coach'))
  );
drop policy if exists workout_days_coach_delete on public.workout_days;
create policy workout_days_coach_delete
  on public.workout_days for delete to authenticated
  using (
    exists(select 1 from public.workout_programs p
      where p.id=workout_days.program_id
        and p.coach_id=(select auth.uid())
        and private.has_role((select auth.uid()),'coach'))
  );

drop policy if exists workout_exercises_coach_insert on public.workout_exercises;
create policy workout_exercises_coach_insert
  on public.workout_exercises for insert to authenticated
  with check (
    exists(select 1 from public.workout_days d
      join public.workout_programs p on p.id=d.program_id
      where d.id=workout_exercises.workout_day_id
        and p.coach_id=(select auth.uid())
        and private.has_role((select auth.uid()),'coach'))
  );
drop policy if exists workout_exercises_coach_update on public.workout_exercises;
create policy workout_exercises_coach_update
  on public.workout_exercises for update to authenticated
  using (
    exists(select 1 from public.workout_days d
      join public.workout_programs p on p.id=d.program_id
      where d.id=workout_exercises.workout_day_id
        and p.coach_id=(select auth.uid())
        and private.has_role((select auth.uid()),'coach'))
  )
  with check (
    exists(select 1 from public.workout_days d
      join public.workout_programs p on p.id=d.program_id
      where d.id=workout_exercises.workout_day_id
        and p.coach_id=(select auth.uid())
        and private.has_role((select auth.uid()),'coach'))
  );
drop policy if exists workout_exercises_coach_delete on public.workout_exercises;
create policy workout_exercises_coach_delete
  on public.workout_exercises for delete to authenticated
  using (
    exists(select 1 from public.workout_days d
      join public.workout_programs p on p.id=d.program_id
      where d.id=workout_exercises.workout_day_id
        and p.coach_id=(select auth.uid())
        and private.has_role((select auth.uid()),'coach'))
  );

create or replace function public.coach_pending_request_profiles(p_relationship_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path = ''
as $cm$
declare
  v_uid uuid := auth.uid();
  v_count integer;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not private.has_role(v_uid,'coach') then raise exception 'Coach access required' using errcode='42501'; end if;
  select count(distinct x) into v_count from unnest(coalesce(p_relationship_ids,'{}'::uuid[])) x;
  if v_count > 25 then raise exception 'Request no more than 25 pending requests at once' using errcode='22023'; end if;
  if exists (
    select 1 from unnest(coalesce(p_relationship_ids,'{}'::uuid[])) requested(id)
    left join public.athlete_coach_relationships r
      on r.id=requested.id and r.coach_id=v_uid and r.status='pending'
    where r.id is null
  ) then raise exception 'Every request must belong to this coach and still be pending' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'relationship_id',r.id,
    'athlete_id',r.athlete_id,
    'name',up.profile->>'name',
    'sport',up.profile->>'sport'
  ) order by r.created_at desc),'[]'::jsonb)
    into v_result
    from public.athlete_coach_relationships r
    left join public.user_profiles up on up.user_id=r.athlete_id
   where r.id=any(coalesce(p_relationship_ids,'{}'::uuid[]))
     and r.coach_id=v_uid and r.status='pending';
  return v_result;
end;
$cm$;

revoke all on function public.coach_pending_request_profiles(uuid[]) from public,anon,authenticated;
grant execute on function public.coach_pending_request_profiles(uuid[]) to authenticated;

create or replace function public.coach_save_program(
  p_program_id uuid, p_athlete_id uuid, p_name text, p_category text,
  p_days jsonb, p_due_date date default null
)
returns uuid language plpgsql security definer set search_path = ''
as $cm$
declare
  v_uid uuid := auth.uid(); v_program_id uuid := p_program_id;
  v_day jsonb; v_exercise jsonb; v_day_id uuid;
  v_day_number smallint := 0; v_exercise_number smallint; v_first_day_count smallint := 0;
  v_name text := trim(coalesce(p_name,'')); v_category text := trim(coalesce(p_category,''));
  v_day_name text; v_focus text; v_exercise_name text; v_reps text;
  v_sets_text text; v_rest_text text; v_weight_text text;
  v_sets smallint; v_rest integer; v_weight numeric(8,2); v_comment text;
  v_first_day_exercises jsonb := '[]'::jsonb; v_assignment_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not private.has_role(v_uid,'coach') then raise exception 'Coach access required' using errcode='42501'; end if;
  if p_athlete_id is null or not private.is_active_coach_for_athlete(p_athlete_id) then
    raise exception 'An active athlete relationship is required' using errcode='42501';
  end if;
  if v_name='' or char_length(v_name)>120 then raise exception 'Program name must contain 1-120 characters' using errcode='22023'; end if;
  if v_category not in ('Full Body','Split','Upper/Lower') then raise exception 'Unsupported program category' using errcode='22023'; end if;
  if p_days is null or jsonb_typeof(p_days)<>'array' then raise exception 'Program days must be a JSON array' using errcode='22023'; end if;
  if jsonb_array_length(p_days)<2 or jsonb_array_length(p_days)>5 then raise exception 'A program must contain 2-5 training days' using errcode='22023'; end if;
  if v_program_id is not null then
    perform 1 from public.workout_programs p where p.id=v_program_id and p.coach_id=v_uid and p.is_library=false for update;
    if not found then raise exception 'Program not found or not owned by this coach' using errcode='42501'; end if;
    if exists (select 1 from public.assigned_workouts a where a.program_id=v_program_id
      and a.athlete_user_id<>p_athlete_id and a.status<>'cancelled') then
      raise exception 'This program belongs to another athlete assignment. Save a separate program for this athlete.' using errcode='22023';
    end if;
    if exists (select 1 from public.assigned_workouts a where a.program_id=v_program_id and a.status='completed') then
      raise exception 'A completed program is historical and cannot be overwritten. Create a new program.' using errcode='22023';
    end if;
    delete from public.workout_exercises e using public.workout_days d where e.workout_day_id=d.id and d.program_id=v_program_id;
    delete from public.workout_days where program_id=v_program_id;
  else
    -- The legacy summary column represents 2-4 exercises from a single workout day.
    insert into public.workout_programs(coach_id,name,category,variation,difficulty,exercise_count,exercises,weekly_frequency,schedule,is_library,is_published,description,created_at,updated_at)
    values(v_uid,v_name,v_category,'Coach plan','beginner',2,jsonb_build_array('{}'::jsonb,'{}'::jsonb),jsonb_array_length(p_days)::smallint,p_days,false,false,'',now(),now())
    returning id into v_program_id;
  end if;
  for v_day in select value from jsonb_array_elements(p_days) loop
    v_day_number:=v_day_number+1;
    v_day_name:=trim(coalesce(v_day->>'name',''));
    v_focus:=trim(coalesce(v_day->>'focus',''));
    if v_day_name='' or char_length(v_day_name)>100 or char_length(v_focus)>120 then raise exception 'Invalid training day name or focus' using errcode='22023'; end if;
    if jsonb_typeof(v_day->'exercises') is distinct from 'array' then raise exception 'Each training day must contain an exercises array' using errcode='22023'; end if;
    if jsonb_array_length(v_day->'exercises')<2 or jsonb_array_length(v_day->'exercises')>4 then raise exception 'Each day must contain 2-4 exercises' using errcode='22023'; end if;
    insert into public.workout_days(program_id,day_number,name,focus,is_rest_day) values(v_program_id,v_day_number,v_day_name,v_focus,false) returning id into v_day_id;
    v_exercise_number:=0;
    for v_exercise in select value from jsonb_array_elements(v_day->'exercises') loop
      v_exercise_number:=v_exercise_number+1;
      v_exercise_name:=trim(coalesce(v_exercise->>'name',''));
      v_reps:=trim(coalesce(v_exercise->>'reps','8-12'));
      v_sets_text:=coalesce(nullif(trim(v_exercise->>'sets'),''),'3');
      v_rest_text:=coalesce(nullif(trim(v_exercise->>'rest_seconds'),''),'60');
      v_weight_text:=nullif(trim(v_exercise->>'working_weight'),'');
      v_comment:=trim(coalesce(v_exercise->>'coach_comment',''));
      if v_exercise_name='' or char_length(v_exercise_name)>120 then raise exception 'Invalid exercise name' using errcode='22023'; end if;
      if v_reps='' or char_length(v_reps)>40 then raise exception 'Invalid repetitions value' using errcode='22023'; end if;
      if v_sets_text ~ '[^0-9]' or v_sets_text='' then raise exception 'Sets must be a whole number' using errcode='22023'; end if;
      begin v_sets:=v_sets_text::smallint; exception when others then raise exception 'Sets must be a whole number' using errcode='22023'; end;
      if v_sets<1 or v_sets>6 then raise exception 'Sets must be 1-6' using errcode='22023'; end if;
      if v_rest_text ~ '[^0-9]' or v_rest_text='' then raise exception 'Rest must be a whole number of seconds' using errcode='22023'; end if;
      begin v_rest:=v_rest_text::integer; exception when others then raise exception 'Rest must be a whole number of seconds' using errcode='22023'; end;
      if v_rest<0 or v_rest>600 then raise exception 'Rest must be 0-600 seconds' using errcode='22023'; end if;
      if v_weight_text is not null then
        begin v_weight:=v_weight_text::numeric(8,2); exception when others then raise exception 'Working weight must be a non-negative number' using errcode='22023'; end;
        if v_weight<0 or v_weight>1500 then raise exception 'Working weight must be 0-1500' using errcode='22023'; end if;
      else v_weight:=null; end if;
      if char_length(v_comment)>500 then raise exception 'Exercise notes must be 500 characters or fewer' using errcode='22023'; end if;
      insert into public.workout_exercises(workout_day_id,sort_order,name,sets,reps,rest_seconds,working_weight,coach_comment)
      values(v_day_id,v_exercise_number,v_exercise_name,v_sets,v_reps,v_rest,v_weight,v_comment);
      if v_day_number=1 then
        v_first_day_exercises:=v_first_day_exercises || jsonb_build_array(jsonb_build_object('name',v_exercise_name,'sets',v_sets,'reps',v_reps,'rest_seconds',v_rest,'working_weight',v_weight,'coach_comment',v_comment));
        v_first_day_count:=v_first_day_count+1;
      end if;
    end loop;
  end loop;
  update public.workout_programs set name=v_name,category=v_category,exercise_count=v_first_day_count,exercises=v_first_day_exercises,weekly_frequency=jsonb_array_length(p_days)::smallint,schedule=p_days,updated_at=now() where id=v_program_id and coach_id=v_uid;
  select a.id into v_assignment_id from public.assigned_workouts a where a.program_id=v_program_id and a.coach_id=v_uid and a.athlete_user_id=p_athlete_id and a.status in ('assigned','in_progress') order by a.assigned_at desc limit 1 for update;
  if found then update public.assigned_workouts set due_date=p_due_date,updated_at=now() where id=v_assignment_id;
  else insert into public.assigned_workouts(program_id,coach_id,athlete_user_id,status,due_date,assigned_at,updated_at) values(v_program_id,v_uid,p_athlete_id,'assigned',p_due_date,now(),now()); end if;
  return v_program_id;
end;
$cm$;
revoke all on function public.coach_save_program(uuid,uuid,text,text,jsonb,date) from public,anon,authenticated;
grant execute on function public.coach_save_program(uuid,uuid,text,text,jsonb,date) to authenticated;

create or replace function public.coach_delete_program(p_program_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $cm$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not private.has_role(v_uid,'coach') then raise exception 'Coach access required' using errcode='42501'; end if;
  perform 1 from public.workout_programs p where p.id=p_program_id and p.coach_id=v_uid and p.is_library=false for update;
  if not found then raise exception 'Program not found or not owned by this coach' using errcode='42501'; end if;
  if exists (select 1 from public.assigned_workouts a where a.program_id=p_program_id) then
    raise exception 'This program has assignment history. Cancel or keep it; assigned programs cannot be deleted without losing history.' using errcode='22023';
  end if;
  delete from public.workout_programs where id=p_program_id and coach_id=v_uid;
  return found;
end;
$cm$;
revoke all on function public.coach_delete_program(uuid) from public,anon,authenticated;
grant execute on function public.coach_delete_program(uuid) to authenticated;

create or replace function private.has_workout_program_assignments(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1 from public.assigned_workouts a where a.program_id=p_program_id
  );
$;
revoke all on function private.has_workout_program_assignments(uuid) from public,anon;
grant execute on function private.has_workout_program_assignments(uuid) to authenticated;

drop policy if exists workout_programs_delete_owner on public.workout_programs;
create policy workout_programs_delete_owner
  on public.workout_programs for delete to authenticated
  using (
    (
      (coach_id=(select auth.uid()) and private.has_role((select auth.uid()),'coach'))
      or private.is_admin()
    )
    and not private.has_workout_program_assignments(workout_programs.id)
  );

-- Keep grants restricted; there is no direct browser write path to role history or audit history.
revoke all on public.coach_nutrition_target_history from anon,authenticated;
grant select on public.coach_nutrition_target_history to authenticated;

comment on table public.coach_nutrition_targets is
  'Coach-managed nutrition values for one currently connected athlete; no automatic calorie deficit is generated.';
comment on table public.coach_nutrition_target_history is
  'Append-only snapshots of coach-managed nutrition target changes.';
comment on table public.account_role_history is
  'Audit trail for self-service athlete/coach role changes. Admin role is never self-service.';
