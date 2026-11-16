-- Strenova launch hardening (2026-11-16)
-- Additive and idempotent: no tables, rows or accounts are removed.

-- 1. Real gym programs need more than 2–4 exercises.
alter table public.workout_programs drop constraint if exists workout_programs_exercise_count_check;
alter table public.workout_programs add constraint workout_programs_exercise_count_check
  check (exercise_count between 1 and 30);
alter table public.workout_programs drop constraint if exists workout_programs_exercises_check;
alter table public.workout_programs add constraint workout_programs_exercises_check
  check (jsonb_typeof(exercises) = 'array' and jsonb_array_length(exercises) between 1 and 30);

-- 2. Chat sender identity is stamped on the server, never trusted from the client.
create or replace function private.stamp_coach_message_sender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  new.sender_id := auth.uid();
  select left(coalesce(nullif(trim(up.profile->>'name'), ''), split_part(coalesce(u.email, ''), '@', 1), 'Strenova'), 120)
    into v_name
    from auth.users u
    left join public.user_profiles up on up.user_id = u.id
   where u.id = auth.uid();
  new.sender_name := coalesce(v_name, 'Strenova');
  -- The other participant reads this row; do not copy the sender's email into it.
  new.sender_email := '';
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists gt_coach_messages_stamp_sender on public.gt_coach_messages;
create trigger gt_coach_messages_stamp_sender
  before insert on public.gt_coach_messages
  for each row execute function private.stamp_coach_message_sender();

-- 3. Trigger functions are not callable by API roles.
revoke execute on function private.stamp_coach_message_sender() from public, anon, authenticated;
revoke execute on function private.audit_nutrition_target_change() from public, anon, authenticated;
revoke execute on function private.stamp_nutrition_target_change() from public, anon, authenticated;
revoke execute on function public.gc_touch_updated_at() from public, anon;

-- 4. Coaches may edit their public profile, but not their invite code.
revoke update on public.coach_profiles from anon, authenticated;
grant update (specialization, experience_years, bio, avatar_url, updated_at) on public.coach_profiles to authenticated;
revoke insert, update, delete on public.coach_profiles from anon;
revoke insert, update, delete on public.assigned_workouts from anon;

-- 6. Athletes report progress on an assigned program without gaining write access to the row.
create or replace function public.athlete_set_assignment_status(p_assignment_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_status not in ('in_progress', 'completed') then
    raise exception 'Unsupported status' using errcode = '22023';
  end if;
  update public.assigned_workouts a
     set status = p_status, updated_at = now()
   where a.id = p_assignment_id
     and a.athlete_user_id = auth.uid()
     and a.status <> 'cancelled';
  return found;
end;
$$;
revoke execute on function public.athlete_set_assignment_status(uuid, text) from public, anon;
grant execute on function public.athlete_set_assignment_status(uuid, text) to authenticated;

-- 7. One policy per action on workout_schedule (owner or active coach).
drop policy if exists workout_schedule_delete_active_coach on public.workout_schedule;
drop policy if exists workout_schedule_delete_self on public.workout_schedule;
drop policy if exists workout_schedule_insert_active_coach on public.workout_schedule;
drop policy if exists workout_schedule_insert_self on public.workout_schedule;
drop policy if exists workout_schedule_update_active_coach on public.workout_schedule;
drop policy if exists workout_schedule_update_self on public.workout_schedule;
create policy workout_schedule_insert_owner_or_coach on public.workout_schedule
  for insert to authenticated
  with check (user_id = (select auth.uid()) or private.is_active_coach_for_athlete(user_id));
create policy workout_schedule_update_owner_or_coach on public.workout_schedule
  for update to authenticated
  using (user_id = (select auth.uid()) or private.is_active_coach_for_athlete(user_id))
  with check (user_id = (select auth.uid()) or private.is_active_coach_for_athlete(user_id));
create policy workout_schedule_delete_owner_or_coach on public.workout_schedule
  for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_active_coach_for_athlete(user_id));

-- 8. Index hygiene: drop exact duplicates, cover the remaining foreign keys.
drop index if exists public.athlete_coach_relationship_coach_status_idx;
drop index if exists public.workout_schedule_user_date_idx;
-- (athlete_id, status) is a prefix of athlete_coach_relationship_athlete_status_idx.
drop index if exists public.athlete_coach_relationships_athlete_status_idx;
create index if not exists athlete_nutrition_history_changed_by_idx
  on public.athlete_nutrition_history (changed_by);
create index if not exists athlete_nutrition_targets_updated_by_idx
  on public.athlete_nutrition_targets (updated_by);
create index if not exists workout_logs_user_created_idx
  on public.workout_logs (user_id, created_at desc);

-- 9. Athletes see their own coach's public card. user_profiles stays private
--    (athletes cannot read other users' profiles), so this exposes only the
--    coach's display name and coach_profiles fields — never email.
create or replace function public.get_my_coach()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if auth.uid() is null then return null; end if;
  select jsonb_build_object(
           'coach_id', r.coach_id,
           'relationship_id', r.id,
           'since', r.created_at,
           'name', left(coalesce(nullif(trim(up.profile->>'name'), ''), 'Тренер'), 120),
           'specialization', cp.specialization,
           'experience_years', cp.experience_years,
           'bio', cp.bio,
           'avatar_url', cp.avatar_url)
    into v
    from public.athlete_coach_relationships r
    left join public.user_profiles up on up.user_id = r.coach_id
    left join public.coach_profiles cp on cp.user_id = r.coach_id
   where r.athlete_id = auth.uid() and r.status = 'active'
   order by r.created_at desc
   limit 1;
  return v;
end;
$$;
revoke execute on function public.get_my_coach() from public, anon;
grant execute on function public.get_my_coach() to authenticated;
