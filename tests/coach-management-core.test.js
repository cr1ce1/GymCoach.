import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMacrosFromCalories, validateNutritionTarget, pageBounds,
  escapeHtml, createTtlCache, normalizeProgramDays
} from '../coach-management-core.js';

test('calculates adult macros from percentages totaling 100', () => {
  const result = calculateMacrosFromCalories(2000, { age: 25 });
  assert.equal(result.available, true);
  assert.equal(result.protein_g, 125);
  assert.equal(result.fat_g, 66.7);
  assert.equal(result.carbs_g, 225);
});

test('disables automatic macro calculations for users under 18', () => {
  const result = calculateMacrosFromCalories(2000, { age: 17 });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'minor_requires_professional_review');
});

test('rejects invalid calorie values and percentage totals', () => {
  assert.throws(() => calculateMacrosFromCalories(0, { age: 25 }), RangeError);
  assert.throws(() => calculateMacrosFromCalories(2000, {
    age: 25, proteinPercent: 30, fatPercent: 30, carbsPercent: 30
  }), RangeError);
});

test('validates and normalizes persisted nutrition target values', () => {
  const result = validateNutritionTarget({
    calories_kcal: '2100', protein_g: '125.5', fat_g: 70,
    carbs_g: 240, water_ml: '1800', notes: '  Plan reviewed  '
  });
  assert.equal(result.valid, true);
  assert.equal(result.normalized.calories_kcal, 2100);
  assert.equal(result.normalized.protein_g, 125.5);
  assert.equal(result.normalized.notes, 'Plan reviewed');
});

test('rejects fractional calories and out-of-range nutrition values', () => {
  const result = validateNutritionTarget({ calories_kcal: 2000.5, water_ml: 16000, protein_g: -1 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.calories_kcal);
  assert.ok(result.errors.water_ml);
  assert.ok(result.errors.protein_g);
});

test('uses inclusive Supabase range bounds and clamps page sizes', () => {
  assert.deepEqual(pageBounds(2, 25), { from: 50, to: 74, page: 2, pageSize: 25 });
  assert.deepEqual(pageBounds(-2, 500), { from: 0, to: 99, page: 0, pageSize: 100 });
});

test('escapes all HTML-sensitive characters', () => {
  assert.equal(escapeHtml("<img src=x onerror='x'>"), '&lt;img src=x onerror=&#39;x&#39;&gt;');
});

test('invalidates cached entries by prefix and evicts old entries at capacity', () => {
  const cache = createTtlCache({ ttlMs: 60000, maxEntries: 2 });
  cache.set('client:1', { id: 1 });
  cache.set('client:2', { id: 2 });
  cache.set('schedule:1', { id: 3 });
  assert.equal(cache.size, 2);
  assert.equal(cache.get('client:1'), undefined);
  assert.deepEqual(cache.get('client:2'), { id: 2 });
  cache.invalidate('client:');
  assert.equal(cache.get('client:2'), undefined);
  assert.equal(cache.size, 1);
});

test('normalizes 2-5 training days with 2-4 exercises per day', () => {
  const days = normalizeProgramDays([
    {
      name: 'Верх тіла', focus: 'Верх',
      exercises: [
        { name: 'Тяга блока', sets: 3, reps: '8-12', rest_seconds: 90, working_weight: 25.5, coach_comment: 'Контроль руху' },
        { name: 'Жим гантелей', sets: 3, reps: '8-12', rest_seconds: 90 }
      ]
    },
    {
      name: 'Низ тіла', focus: 'Низ',
      exercises: [
        { name: 'Присідання', sets: 3, reps: '8-10', rest_seconds: 90 },
        { name: 'Розгинання ніг', sets: 2, reps: '10-12', rest_seconds: 60 }
      ]
    }
  ]);
  assert.equal(days.length, 2);
  assert.equal(days[0].exercises[0].working_weight, 25.5);
  assert.equal(days[0].exercises[0].sort_order, 1);
  assert.equal(days[1].day_number, 2);
});

test('rejects invalid day counts, exercise counts, sets, rest and weights', () => {
  assert.throws(() => normalizeProgramDays([]), RangeError);
  assert.throws(() => normalizeProgramDays([{ name: 'Only one day', exercises: [] }]), RangeError);
  const oneExercise = [
    { name: 'Day 1', exercises: [{ name: 'A' }, { name: 'B' }] },
    { name: 'Day 2', exercises: [{ name: 'A' }] }
  ];
  assert.throws(() => normalizeProgramDays(oneExercise), RangeError);
  const invalidSets = [
    { name: 'Day 1', exercises: [{ name: 'A', sets: 7 }, { name: 'B' }] },
    { name: 'Day 2', exercises: [{ name: 'A' }, { name: 'B' }] }
  ];
  assert.throws(() => normalizeProgramDays(invalidSets), RangeError);
  const invalidRest = [
    { name: 'Day 1', exercises: [{ name: 'A', rest_seconds: 601 }, { name: 'B' }] },
    { name: 'Day 2', exercises: [{ name: 'A' }, { name: 'B' }] }
  ];
  assert.throws(() => normalizeProgramDays(invalidRest), RangeError);
  const invalidWeight = [
    { name: 'Day 1', exercises: [{ name: 'A', working_weight: -1 }, { name: 'B' }] },
    { name: 'Day 2', exercises: [{ name: 'A' }, { name: 'B' }] }
  ];
  assert.throws(() => normalizeProgramDays(invalidWeight), RangeError);
  const sixDays = Array.from({ length: 6 }, (_, i) => ({
    name: 'Day ' + (i + 1), exercises: [{ name: 'A' }, { name: 'B' }]
  }));
  assert.throws(() => normalizeProgramDays(sixDays), RangeError);
});
