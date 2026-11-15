-- Tighten coach assignment writes to active athlete relationships and coach-owned programs.
begin;

drop policy if exists assigned_workouts_update_owner on public.assigned_workouts;
create policy assigned_workouts_update_owner
on public.assigned_workouts for update to authenticated
using (
  (
    coach_id = (select auth.uid())
    and private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(athlete_user_id)
    and exists (
      select 1 from public.workout_programs p
      where p.id = assigned_workouts.program_id
        and p.coach_id = (select auth.uid())
    )
  )
  or private.is_admin()
)
with check (
  (
    coach_id = (select auth.uid())
    and private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(athlete_user_id)
    and exists (
      select 1 from public.workout_programs p
      where p.id = assigned_workouts.program_id
        and p.coach_id = (select auth.uid())
    )
  )
  or private.is_admin()
);

drop policy if exists assigned_workouts_delete_owner on public.assigned_workouts;
create policy assigned_workouts_delete_owner
on public.assigned_workouts for delete to authenticated
using (
  (
    coach_id = (select auth.uid())
    and private.has_role((select auth.uid()),'coach')
    and private.is_active_coach_for_athlete(athlete_user_id)
  )
  or private.is_admin()
);

commit;
