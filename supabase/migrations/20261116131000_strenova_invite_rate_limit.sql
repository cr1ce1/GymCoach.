-- Strenova: throttle coach-invite guessing.
-- APPLY TOGETHER WITH THE FRONTEND DEPLOY of branch strenova-launch-overhaul:
-- accept_coach_invite now returns {success:false,error} instead of raising for a bad code,
-- so failed attempts can be recorded (an exception would roll the record back).

-- 5. Invite codes: throttle guessing (10 failed attempts per hour per account).
create table if not exists private.coach_invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists coach_invite_attempts_user_time_idx
  on private.coach_invite_attempts (user_id, attempted_at desc);
revoke all on private.coach_invite_attempts from public, anon, authenticated;

create or replace function public.accept_coach_invite(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_athlete uuid := auth.uid();
  v_coach uuid;
  v_invite uuid;
  v_existing uuid;
  v_coach_name text;
  v_failed int;
begin
  if v_athlete is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not private.has_role(v_athlete, 'athlete') then
    raise exception 'Only athlete accounts can accept a coach invite' using errcode = '42501';
  end if;
  select count(*) into v_failed from private.coach_invite_attempts a
   where a.user_id = v_athlete and a.attempted_at > now() - interval '1 hour';
  if v_failed >= 10 then
    return jsonb_build_object('success', false, 'error', 'rate_limited');
  end if;
  select i.coach_id, i.id into v_coach, v_invite
    from public.coach_invites i
   where upper(i.invite_code) = upper(trim(coalesce(p_invite_code, '')))
     and i.is_active = true
     and (i.expires_at is null or i.expires_at > now())
   limit 1;
  if v_coach is null then
    insert into private.coach_invite_attempts(user_id) values (v_athlete);
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;
  if v_coach = v_athlete then
    return jsonb_build_object('success', false, 'error', 'self_invite');
  end if;
  select r.coach_id into v_existing
    from public.athlete_coach_relationships r
   where r.athlete_id = v_athlete and r.status = 'active'
   limit 1;
  if v_existing is not null and v_existing <> v_coach then
    return jsonb_build_object('success', false, 'error', 'already_connected');
  end if;
  insert into public.athlete_coach_relationships(coach_id, athlete_id, invite_id, status)
  values (v_coach, v_athlete, v_invite, 'active')
  on conflict (coach_id, athlete_id) do update
    set invite_id = excluded.invite_id, status = 'active', updated_at = now();
  select coalesce(up.profile->>'name', 'Coach') into v_coach_name
    from public.user_profiles up where up.user_id = v_coach;
  return jsonb_build_object('success', true, 'coach_id', v_coach, 'coach_name', coalesce(v_coach_name, 'Coach'));
end;
$$;
revoke execute on function public.accept_coach_invite(text) from public, anon;
grant execute on function public.accept_coach_invite(text) to authenticated;

