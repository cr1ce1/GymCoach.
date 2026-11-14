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


test('migration keeps every dollar-quoted SQL body complete', () => {
  const cmQuotes = sql.split('$cm$').length - 1;
  const standardQuotes = sql.split('$$').length - 1;
  assert.equal(cmQuotes % 2, 0);
  assert.equal(standardQuotes % 2, 0);
  assert.equal(cmQuotes, 8);
  const malformed = sql.split('\n').filter(line =>
    ['as $', 'do $', '$;'].includes(line.trim())
  );
  assert.deepEqual(malformed, []);
});

test('legacy invite RPC creates a pending request and cannot auto-approve', () => {
  const start = sql.indexOf('create or replace function public.accept_coach_invite');
  const end = sql.indexOf('create or replace function public.review_coach_connection', start);
  const fn = sql.slice(start, end);
  assert.match(fn, /request_coach_connection\(p_invite_code\)/i);
  assert.doesNotMatch(fn, /status\s*=\s*'active'/i);
});

test('pending request profiles are limited to the current coach and pending relationships', () => {
  const start = sql.indexOf('create or replace function public.coach_pending_request_profiles');
  const end = sql.indexOf('revoke all on function public.coach_pending_request_profiles', start);
  const fn = sql.slice(start, end);
  assert.match(fn, /r\.coach_id\s*=\s*v_uid/i);
  assert.match(fn, /r\.status\s*=\s*'pending'/i);
  assert.match(fn, /Request no more than 25/i);
  assert.doesNotMatch(fn, /email/i);
});

test('program save RPC writes day/exercise rows and assignment atomically', () => {
  const start = sql.indexOf('create or replace function public.coach_save_program');
  const end = sql.indexOf('revoke all on function public.coach_save_program', start);
  const fn = sql.slice(start, end);
  assert.match(fn, /private\.is_active_coach_for_athlete\(p_athlete_id\)/i);
  assert.match(fn, /insert into public\.workout_days/i);
  assert.match(fn, /insert into public\.workout_exercises/i);
  assert.match(fn, /insert into public\.assigned_workouts/i);
  assert.match(fn, /another athlete assignment/i);
});


test('completed program history cannot be overwritten through the coach editor', () => {
  const start = sql.indexOf('create or replace function public.coach_save_program');
  const end = sql.indexOf('revoke all on function public.coach_save_program', start);
  const fn = sql.slice(start, end);
  assert.match(fn, /a\.status\s*=\s*'completed'/i);
  assert.match(fn, /historical and cannot be overwritten/i);
  assert.match(fn, /a\.athlete_user_id\s*<>\s*p_athlete_id/i);
});
