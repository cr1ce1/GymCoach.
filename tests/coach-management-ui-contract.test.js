import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const adapter = await readFile(new URL('../coach-management.js', import.meta.url), 'utf8');

test('existing Strenova app loads the isolated coach adapter without replacing layout', () => {
  assert.match(html, /<script[^>]+src=["']\.\/coach-management\.js["'][^>]+type=["']module["']/i);
  assert.match(html, /id=["']profile["']/i);
  assert.match(html, /mountSection\(['"]coach-dashboard['"]/i);
  assert.match(html, /coach-dashboardContent/i);
});

test('role controls use the authenticated self-service RPC', () => {
  assert.match(adapter, /switch_account_role/);
  assert.match(adapter, /p_role/);
  assert.match(adapter, /Тренер|Атлет/i);
  assert.match(adapter, /confirm\(/);
});

test('coach dashboard includes requests, details, nutrition, programs and schedule', () => {
  for (const feature of [
    'review_coach_connection', 'coach_athlete_profile',
    'coach_nutrition_targets', 'coach_nutrition_target_history',
    'coach_save_program', 'workout_schedule'
  ]) assert.ok(adapter.includes(feature), 'Missing feature integration: ' + feature);
});

test('athlete connection uses pending requests, not auto-acceptance', () => {
  assert.match(adapter, /request_coach_connection/);
  assert.doesNotMatch(adapter, /rpc\(['"]accept_coach_invite['"]/);
});

test('client lists are bounded and profile data uses the allow-list RPC', () => {
  assert.match(adapter, /coach_athlete_profiles/);
  assert.match(adapter, /\.range\(/);
  assert.match(adapter, /\.limit\(/);
});


test('schedule edits preserve existing JSON details instead of replacing unknown fields', () => {
  const start = adapter.indexOf('async function saveSchedule()');
  const end = adapter.indexOf('async function editSchedule', start);
  const fn = adapter.slice(start, end);
  assert.match(fn, /select\('details'\)/);
  assert.match(fn, /Object\.assign\(\{\},existingDetails/);
});


test('coach UI exposes a personal invite link and bounded role-safe macro calculator', () => {
  assert.match(adapter, /coach_profiles'\)\.select\('coach_code'\)/);
  assert.match(adapter, /cm-invite-link/);
  assert.match(adapter, /copyInviteLink/);
  assert.match(adapter, /calculateMacrosFromCalories/);
  assert.match(adapter, /age < 18/);
  assert.match(adapter, /coach_athlete_profile/);
});


test('coach can end only the displayed relationship without deleting history', () => {
  assert.match(adapter, /remove-client/);
  assert.match(adapter, /disconnect_coach_relationship/);
  assert.match(adapter, /Програми, календар та історія залишаться збереженими/);
});
