/* Strenova feature switches. Loaded before every other app script.
   subscription: the Strenova Plus page, its entry points and the Plus paywall.
     Off for now: the plan is to finish it later, so its code stays in place
     (assets/js/18-gt-subscription-page.js, the #subscription section, the
     gt_subscriptions checks) and switching this back to true restores it.
     While it is off, the features that used to sit behind the paywall are
     available to every signed-in user. Server-side checks are unchanged. */
(function () {
  'use strict';
  window.STRENOVA_FEATURES = Object.assign({ subscription: false }, window.STRENOVA_FEATURES || {});
  window.strenovaFeature = function (name) { return window.STRENOVA_FEATURES[name] !== false; };
  document.documentElement.classList.toggle('sx-no-subscription', !window.strenovaFeature('subscription'));

  /* Save one finished workout idempotently by (user_id, client_record_id).
     The database guards this pair with a partial unique index, which PostgREST
     cannot use as an upsert (ON CONFLICT) target, so look the row up first. */
  window.gtSaveWorkoutLog = async function (sb, row) {
    const find = () => sb.from('workout_logs').select('*').eq('user_id', row.user_id).eq('client_record_id', row.client_record_id).maybeSingle();
    const { data: found, error: findError } = await find();
    if (findError) throw findError;
    if (found) {
      const { data, error } = await sb.from('workout_logs').update(row).eq('id', found.id).eq('user_id', row.user_id).select().single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await sb.from('workout_logs').insert(row).select().single();
    if (!error) return data;
    if (error.code === '23505') { const again = await find(); if (again.data) return again.data; }
    throw error;
  };
})();
