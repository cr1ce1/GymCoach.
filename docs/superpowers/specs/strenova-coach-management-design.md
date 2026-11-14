# Strenova Coach Management — Design

## Goal
Extend the existing Strenova application with safe post-signup role switching, coach/athlete request approval, coach-managed athlete nutrition targets, workout programs and schedules, and lower-cost dashboard loading without replacing the current single-page application or changing Plus behavior.

## Current architecture and decisions
- Keep the existing GitHub Pages application and its HTML/CSS/JavaScript layout.
- Reuse `public.user_roles`, `public.user_profiles`, `public.coach_profiles`, `public.coach_invites`, `public.athlete_coach_relationships`, `public.workout_programs`, `public.workout_days`, `public.workout_exercises`, `public.assigned_workouts`, `public.workout_schedule`, and `public.workout_logs`.
- Keep the current admin/owner role and owner-admin Edge Function unchanged.
- Add only the missing persisted domain data: coach-managed nutrition targets and an append-only change history. Store time/status/notes for appointments in the existing `workout_schedule.details` JSONB to avoid a destructive schedule rewrite.
- Role changes are self-service only for `athlete` and `coach`. They never add or remove `admin`; coach profile, invites, historical relationships, workout logs, assigned programs, subscriptions, and profile fields remain intact.
- New coach connections are requests first. A coach accepts or rejects a pending request. The existing legacy `accept_coach_invite` RPC remains available for backwards compatibility.
- Coach access to athlete profile fields is through a narrowly scoped authenticated RPC that returns only the fields needed for coaching, rather than broadening access to the complete profile JSON.
- RLS remains the enforcement boundary for schedule changes, nutrition targets, programs, and workout items. UI checks are additional only.
- Client and workout lists are fetched in ordered, bounded pages. Avoid dropping existing indexes merely because the advisor calls them unused on a small current dataset.
- No nutrition calorie deficit is generated. For an athlete under 18, the UI records coach-entered values but disables automatic calorie-to-macro calculations and displays an appropriate professional-guidance notice.

## User-facing behavior
1. A profile setting switches between Athlete and Coach after confirmation. The account remains the same.
2. Switching to Coach creates or reuses the coach profile and invite code. Switching back to Athlete hides coach controls but leaves coach history and relationships stored for later restoration.
3. An athlete submits a coach code or invite link. A pending request appears to the coach. The coach can accept or reject it. Existing active links are not duplicated; one athlete cannot have two active coaches.
4. The coach can open a whitelisted client summary, inspect workout history, set nutrition target data and review its history, edit/assign workout programs, and maintain a client's schedule.
5. Athletes can see their own assigned program, schedule and current coach-managed nutrition values.

## Security invariants
- All self-service RPCs derive the actor from `auth.uid()`; they never trust a user ID or role supplied by the browser.
- The role-switch RPC accepts only `athlete` or `coach`, rejects admin accounts, and records role changes.
- Coach reads/writes require an active row in `athlete_coach_relationships` matching the current coach and target athlete.
- Profile RPC exposes only a fixed allow-list of profile fields.
- Program edits require ownership of the parent program. Assigned-workout creation still requires an active coach relationship.
- Schedule write policies include both `USING` and `WITH CHECK` where applicable so a coach cannot reassign the row to another athlete.
- Nutrition data is one current target per athlete and an append-only, actor-stamped history.
- Function privileges are explicit. Every SECURITY DEFINER function fixes an empty search_path and schema-qualifies relation names.

## Non-goals
- No redesign or frontend framework migration.
- No deletion of existing accounts, relationships, programs, logs, Plus subscriptions, or referral data.
- No change to owner-panel authorization, Plus billing, or the legacy invite RPC.
- No production deployment from this feature branch until migration and frontend review have passed.

## Known verification limits
- Repository clone/network access is unavailable in the current execution environment; changes are authored through the connected GitHub API.
- Browser-based end-to-end checks with real athlete/coach accounts cannot be claimed unless a connected browser and test accounts are available.
- The migration is prepared for review on the feature branch; production schema changes require a separate reviewed application step.
