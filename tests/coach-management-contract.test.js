import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20261114150000_strenova_coach_management.sql', import.meta.url), 'utf8');

test('role switching is server-derived and never grants admin', () => {
  assert.match(sql, /p_role\s+not in\s*\('athlete','coach'\)/i);
  assert.match(sql, /Admin role cannot be changed/i);
  assert.match(sql, /auth\.uid\(\)/i);
});

test('coach acceptance validates the athlete row rather than the coach caller', () => {
  const fn = sql.match(/create or replace function public\.review_coach_connection[\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(fn, /where\s+ur\.user_id\s*=\s*v_athlete\s+and\s+ur\.role\s*=\s*'athlete'/i);
  assert.doesNotMatch(fn, /private\.has_role\(v_athlete,\s*'athlete'\)/i);
});

test('profile access returns only an explicit allow-list', () => {
  const fn = sql.match(/create or replace function public\.coach_athlete_profile\(p_athlete_id uuid\)[\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(fn, /Active coach relationship required/i);
  assert.match(fn, /'name'/);
  assert.match(fn, /'weight'/);
  assert.doesNotMatch(fn, /'email'/i);
  assert.doesNotMatch(fn, /return\s+v_profile\s*;/i);
});

test('nutrition targets are relationship-scoped and have an append-only history trigger', () => {
  assert.match(sql, /create table if not exists public\.coach_nutrition_targets/i);
  assert.match(sql, /private\.is_active_coach_for_athlete\(athlete_id\)/i);
  assert.match(sql, /create table if not exists public\.coach_nutrition_target_history/i);
  assert.match(sql, /after insert or update on public\.coach_nutrition_targets/i);
  assert.match(sql, /grant select on public\.coach_nutrition_target_history to authenticated/i);
});

test('coach schedule update policies include USING and WITH CHECK', () => {
  const policy = sql.match(/create policy workout_schedule_coach_update[\s\S]*?;/i)?.[0] || '';
  assert.match(policy, /using\s*\(/i);
  assert.match(policy, /with check\s*\(/i);
});

test('program editor data is owned by the authenticated coach', () => {
  assert.match(sql, /create policy workout_days_coach_insert/i);
  assert.match(sql, /p\.coach_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.match(sql, /working_weight/i);
  assert.match(sql, /coach_comment/i);
  assert.match(sql, /create or replace function public\.coach_save_program/i);
});

test('pending connection requests can only be reviewed by their target coach', () => {
  const fn = sql.match(/create or replace function public\.review_coach_connection[\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(fn, /r\.coach_id\s*=\s*v_uid/i);
  assert.match(fn, /v_status\s*<>\s*'pending'/i);
  assert.match(fn, /p_action\s+not in\s*\('accept','reject'\)/i);
});
