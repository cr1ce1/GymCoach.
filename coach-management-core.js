/** Pure, browser-independent helpers used by the Strenova coach UI. */

const roundToOneDecimal = value => Math.round((value + Number.EPSILON) * 10) / 10;

export function calculateMacrosFromCalories(calories, options = {}) {
  const age = Number(options.age);
  if (!Number.isFinite(age) || age <= 0) {
    throw new TypeError('A valid age is required before calculating macros.');
  }
  if (age < 18) {
    return {
      available: false,
      reason: 'minor_requires_professional_review',
      message: 'For athletes under 18, macro values must be reviewed by a qualified health professional; automatic calorie-based calculation is disabled.'
    };
  }

  const kcal = Number(calories);
  if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 15000) {
    throw new RangeError('Calories must be a number greater than 0 and no more than 15000.');
  }

  const proteinPercent = Number(options.proteinPercent ?? 25);
  const fatPercent = Number(options.fatPercent ?? 30);
  const carbsPercent = Number(options.carbsPercent ?? 45);
  const percentages = [proteinPercent, fatPercent, carbsPercent];
  if (percentages.some(value => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new RangeError('Macro percentages must be between 0 and 100.');
  }
  if (Math.abs(percentages.reduce((sum, value) => sum + value, 0) - 100) > 0.001) {
    throw new RangeError('Macro percentages must sum to 100.');
  }

  return {
    available: true,
    protein_g: roundToOneDecimal((kcal * proteinPercent / 100) / 4),
    fat_g: roundToOneDecimal((kcal * fatPercent / 100) / 9),
    carbs_g: roundToOneDecimal((kcal * carbsPercent / 100) / 4)
  };
}

export function validateNutritionTarget(target = {}) {
  const errors = {};
  const ranges = {
    calories_kcal: [0, 15000],
    protein_g: [0, 2000],
    fat_g: [0, 2000],
    carbs_g: [0, 2000],
    water_ml: [0, 15000]
  };
  const normalized = {};

  for (const [key, [min, max]] of Object.entries(ranges)) {
    const raw = target[key];
    if (raw === undefined || raw === null || raw === '') {
      normalized[key] = null;
      continue;
    }
    const value = Number(raw);
    const requiresInteger = key === 'calories_kcal' || key === 'water_ml';
    if (!Number.isFinite(value) || value < min || value > max || (requiresInteger && !Number.isInteger(value))) {
      errors[key] = requiresInteger
        ? `Value must be a whole number between ${min} and ${max}.`
        : `Value must be between ${min} and ${max}.`;
    } else {
      normalized[key] = value;
    }
  }

  const notes = String(target.notes ?? '').trim();
  if (notes.length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.';
  normalized.notes = notes;

  return { valid: Object.keys(errors).length === 0, errors, normalized };
}

/** Supabase .range(from, to) uses an inclusive upper bound. */
export function pageBounds(page = 0, pageSize = 25) {
  const safePage = Number.isFinite(Number(page)) ? Math.max(0, Math.floor(Number(page))) : 0;
  const safeSize = Number.isFinite(Number(pageSize))
    ? Math.min(100, Math.max(1, Math.floor(Number(pageSize))))
    : 25;
  return {
    from: safePage * safeSize,
    to: safePage * safeSize + safeSize - 1,
    page: safePage,
    pageSize: safeSize
  };
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

/** Small in-memory TTL cache; call invalidate after a successful mutation. */
export function createTtlCache({ ttlMs = 30000, maxEntries = 100 } = {}) {
  const entries = new Map();
  const limit = Math.max(1, Math.floor(Number(maxEntries) || 100));
  const ttl = Math.max(0, Number(ttlMs) || 0);

  return {
    get(key) {
      const entry = entries.get(String(key));
      if (!entry) return undefined;
      if (Date.now() - entry.createdAt > ttl) {
        entries.delete(String(key));
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      const normalizedKey = String(key);
      entries.delete(normalizedKey);
      entries.set(normalizedKey, { value, createdAt: Date.now() });
      while (entries.size > limit) entries.delete(entries.keys().next().value);
      return value;
    },
    invalidate(prefix) {
      if (prefix === undefined) {
        entries.clear();
        return;
      }
      const start = String(prefix);
      for (const key of entries.keys()) {
        if (key.startsWith(start)) entries.delete(key);
      }
    },
    get size() {
      return entries.size;
    }
  };
}
