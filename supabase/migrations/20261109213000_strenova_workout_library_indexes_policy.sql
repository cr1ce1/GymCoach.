-- Avoid duplicate permissive SELECT policies and index workout-library foreign keys.
drop policy if exists workout_programs_read_published_library on public.workout_programs;
drop policy if exists workout_programs_read_owner_or_assigned on public.workout_programs;
create policy workout_programs_read_owner_or_assigned on public.workout_programs
for select to authenticated using (
  coach_id = (select auth.uid())
  or private.is_program_assigned_to_current_user(id)
  or private.is_admin()
  or (is_library = true and is_published = true)
);
create index if not exists workout_days_program_id_idx on public.workout_days(program_id);
create index if not exists workout_exercises_day_id_idx on public.workout_exercises(workout_day_id);
create index if not exists program_sources_program_id_idx on public.program_sources(program_id);
create index if not exists user_active_programs_program_id_idx on public.user_active_programs(program_id);
create index if not exists user_program_history_program_id_idx on public.user_program_history(program_id);
create index if not exists user_program_history_user_id_idx on public.user_program_history(user_id);
