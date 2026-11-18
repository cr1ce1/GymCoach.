/* =====================================================================
   STRENOVA PROGRESS (2026-11-17)
   1. Weight progression: a next-session target for every exercise, worked
      out from the athlete's own logged sets. Shown in gym mode, in the
      session list and next to exercises in the training plan.
   2. Offline: a small status pill, and retries of the workout outbox
      (gtai_pending_workouts_v3, kept by 28-gt-coach-complete-upgrades-v3)
      while the app stays open. The service worker keeps the shell offline.
   3. Workout summary after "Finish": duration, tonnage, sets, records,
      plus a 1080x1920 story card to save or share.
   Only data the athlete actually logged is shown.
   ===================================================================== */
(function () {
  'use strict';
  const S = (window.Strenova = window.Strenova || {});
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = (n) => (S.icon ? S.icon(n) : '');
  const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[’'`«»"()]/g, '').replace(/[^a-zа-яіїєґ0-9]+/gi, ' ').trim();
  const num = (v) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const EN = () => { try { return localStorage.getItem('gtai_lang') === 'en'; } catch (_) { return false; } };
  const T = (uk, en) => (EN() ? en : uk);
  const LOC = () => (EN() ? 'en-US' : 'uk-UA');
  const KG = () => T('кг', 'kg'), REPS = () => T('повт.', 'reps');
  const kg = (n) => Number(n).toLocaleString(LOC(), { maximumFractionDigits: 2 });
  const toast = (m, k) => (S.toast ? S.toast(m, k) : null);

  /* =================================================================
     History access
     ================================================================= */
  function workouts() {
    try { if (Array.isArray(history)) return history; } catch (_) {}
    try { const h = JSON.parse(localStorage.getItem('gtai_history') || '[]'); return Array.isArray(h) ? h : []; } catch (_) { return []; }
  }
  // Working sets that were actually performed (ticked, or typed into during the session).
  function setsOf(e) {
    if (!e) return [];
    const raw = Array.isArray(e.setLogs) && e.setLogs.length ? e.setLogs : Array.isArray(e.sets) ? e.sets : [];
    const out = raw.filter((s) => s && typeof s === 'object' && (s.type || 'working') === 'working' && num(s.reps) > 0 && (s.completed || s.edited || s.done))
      .map((s) => ({ weight: Math.max(0, num(s.weight)), reps: Math.round(num(s.reps)) }));
    if (!out.length && !raw.length && num(e.reps) > 0 && (e.completed || e.done || num(e.weight) > 0)) out.push({ weight: Math.max(0, num(e.weight)), reps: Math.round(num(e.reps)) });
    return out;
  }
  const byDateDesc = (a, b) => new Date(b.date || 0) - new Date(a.date || 0);
  function sessionsFor(name, skip) {
    const key = norm(name); if (!key) return [];
    const out = [];
    for (const w of workouts().slice().sort(byDateDesc)) {
      if (skip && w === skip) continue;
      const e = (w.exercises || []).find((x) => norm(x.name) === key);
      const sets = setsOf(e);
      if (sets.length) out.push({ date: w.date, sets, prescription: e.prescription || '' });
    }
    return out;
  }

  /* =================================================================
     1. Progression rules
     ================================================================= */
  const LOWER = /присід|squat|станов|deadlift|румунськ|жим ног|leg press|випад|lunge|hip thrust|сідничн|ягодичн|болгарськ|гакк|hack|good morning|тяга з підлоги/i;
  function repRange(text, fallback) {
    const t = String(text || '');
    let m = t.match(/(\d+)\s*[–—-]\s*(\d+)\s*(?:повт|reps?)?\s*$/i) || t.match(/[×x]\s*(\d+)\s*[–—-]\s*(\d+)/i);
    if (m) return [Number(m[1]), Number(m[2])];
    m = t.match(/[×x]\s*(\d+)/i);
    if (m) return [Number(m[1]), Number(m[1])];
    return [fallback, fallback];
  }
  function topOf(sets) {
    const w = Math.max(...sets.map((s) => s.weight));
    const atTop = sets.filter((s) => s.weight === w);
    return { weight: w, reps: atTop.map((s) => s.reps) };
  }
  const roundDown = (v, step) => Math.max(step, Math.floor(v / step + 1e-9) * step);

  // Returns null when there is no logged history for the exercise.
  function suggest(name, prescription) {
    const hist = sessionsFor(name); if (!hist.length) return null;
    const last = hist[0], prev = hist[1];
    const top = topOf(last.sets);
    const [repMin, repMax] = repRange(prescription || last.prescription, Math.max(...top.reps));
    const lower = LOWER.test(name);
    const small = top.weight > 0 && top.weight < 20;
    const step = lower && top.weight >= 40 ? 5 : 2.5;
    const hit = top.reps.every((r) => r >= repMax);
    const inRange = top.reps.every((r) => r >= repMin);
    let next, action;
    if (top.weight === 0) {
      next = { weight: 0, reps: hit ? Math.max(...top.reps) + 1 : inRange ? Math.min(repMax, Math.min(...top.reps) + 1) : repMin }; action = inRange ? 'reps' : 'hold';
    } else if (hit) {
      // Light weights jump a lot in percent, so add reps first; when reps run well past the range, add a small step.
      const most = Math.max(...top.reps);
      if (small && most < repMax + 3) { next = { weight: top.weight, reps: most + 1 }; action = 'reps'; }
      else if (small) { next = { weight: top.weight + (top.weight < 10 ? 1 : 2.5), reps: repMin }; action = 'up'; }
      else { next = { weight: top.weight + step, reps: repMin }; action = 'up'; }
    } else if (inRange) {
      next = { weight: top.weight, reps: Math.min(repMax, Math.min(...top.reps) + 1) }; action = 'reps';
    } else {
      const pTop = prev ? topOf(prev.sets) : null;
      const pMissed = pTop && pTop.weight >= top.weight && !pTop.reps.every((r) => r >= repMin);
      if (pMissed) { next = { weight: roundDown(top.weight * 0.9, small ? 1 : 2.5), reps: repMin }; action = 'deload'; }
      else { next = { weight: top.weight, reps: repMin }; action = 'hold'; }
    }
    const reason = {
      up: T('Усі повторення виконано, тож додаємо вагу.', 'You hit every rep, so the weight goes up.'),
      reps: top.weight === 0 ? T('Додай одне повторення.', 'Add one rep.') : T('Вага та сама, додай повторення.', 'Same weight, add a rep.'),
      hold: T('Минулого разу не всі повторення вийшли. Повтори цю вагу.', 'Some reps were missed last time. Repeat this weight.'),
      deload: T('Двічі поспіль не вийшло. Трохи легше, щоб відновитися й піти далі.', 'Missed twice in a row. Go a bit lighter, recover and build back up.')
    }[action];
    const lastText = top.weight > 0 ? `${kg(top.weight)} ${KG()} × ${top.reps.join(', ')}` : `${top.reps.join(', ')} ${REPS()}`;
    const nextText = next.weight > 0 ? `${kg(next.weight)} ${KG()} × ${next.reps}` : `${next.reps} ${REPS()}`;
    return { name, last: top, lastDate: last.date, next, action, reason, lastText, nextText, repMin, repMax };
  }
  const ARROW = { up: '↑', reps: '', hold: '', deload: '↓' };
  function cardHtml(p, withApply) {
    return `<div class="sx-prog sx-prog-${p.action}" data-sx-prog>
      <div class="sx-prog-row"><span class="sx-prog-k">${T('Минулого разу', 'Last time')}</span><b>${esc(p.lastText)}</b></div>
      <div class="sx-prog-row"><span class="sx-prog-k">${T('Сьогодні', 'Today')}</span><b class="sx-prog-next">${ARROW[p.action] ? `<span aria-hidden="true">${ARROW[p.action]}</span> ` : ''}${esc(p.nextText)}</b></div>
      <p class="sx-prog-why">${esc(p.reason)}</p>
      ${withApply ? `<button type="button" class="sx-btn small ghost" data-sx-apply>${T('Підставити в підходи', 'Fill in my sets')}</button>` : ''}</div>`;
  }
  const fire = (el) => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  // Fill the suggestion into sets that are not done yet. Weights the athlete already typed are kept.
  function applyToRow(row, p) {
    let n = 0;
    row.querySelectorAll('.gt-set-row').forEach((sr) => {
      const inputs = sr.querySelectorAll('input[type=number]');
      const extra = sr.nextElementSibling && sr.nextElementSibling.classList.contains('gt-set-extra') ? sr.nextElementSibling : null;
      if (extra && extra.querySelector('input[data-gt-set-done]')?.checked) return;
      const reps = inputs[0], weight = inputs[1];
      if (weight && p.next.weight > 0 && !num(weight.value)) { weight.value = p.next.weight; fire(weight); n++; }
      if (reps && (!num(reps.value) || num(reps.value) !== p.next.reps)) { reps.value = p.next.reps; fire(reps); n++; }
    });
    return n;
  }

  /* ---------- session list rows (gym focus mode reads the same rows) ---------- */
  function rowTarget(row) { return row.querySelector('.gt-session-exercise-heading small, .details small, .session-main > small')?.textContent.trim() || ''; }
  function rowName(row) { return row.querySelector('.session-ex-name')?.textContent.trim() || ''; }
  function decorateSessionRows() {
    document.querySelectorAll('#exerciseList .gt-logged-exercise').forEach((row) => {
      const name = rowName(row); if (!name) return;
      const target = rowTarget(row);
      const sig = norm(name) + '|' + target;
      let box = row.querySelector(':scope [data-sx-prog-host]');
      if (box && box.dataset.sig === sig) return;
      const p = suggest(name, target);
      if (!p) { if (box) box.remove(); return; }
      if (!box) {
        box = document.createElement('div'); box.dataset.sxProgHost = '';
        const anchor = row.querySelector('.gt-session-exercise-heading') || row.firstElementChild;
        if (anchor) anchor.insertAdjacentElement('afterend', box); else row.prepend(box);
      }
      box.dataset.sig = sig; box.innerHTML = cardHtml(p, true);
      box.querySelector('[data-sx-apply]').onclick = () => { applyToRow(row, p) ? toast(T('Підставлено: ', 'Filled in: ') + p.nextText, 'good') : toast(T('Усі підходи вже заповнені', 'All sets are already filled in')); S.gym?.render?.(); };
    });
  }
  // Used by gym focus mode (61-strenova-gym.js).
  S.progression = {
    suggest,
    html: (name, target) => { const p = suggest(name, target); return p ? cardHtml(p, true) : ''; },
    apply: (row) => { const p = suggest(rowName(row), rowTarget(row)); return p ? applyToRow(row, p) : 0; },
    forRow: (row) => suggest(rowName(row), rowTarget(row))
  };

  /* ---------- training plan ---------- */
  function decoratePlan() {
    const page = $('recommend'); if (!page) return;
    page.querySelectorAll('.th-ex-name').forEach((el) => {
      const name = el.textContent.trim();
      const rx = el.parentElement.querySelector(':scope > .th-ex-prescription');
      let chip = el.parentElement.querySelector(':scope > .sx-prog-chip');
      const p = suggest(name, rx ? rx.textContent : '');
      if (!p) { chip?.remove(); return; }
      const text = (ARROW[p.action] ? ARROW[p.action] + ' ' : '') + p.nextText;
      if (chip && chip.dataset.text === text) return;
      if (!chip) { chip = document.createElement('span'); chip.className = 'sx-prog-chip'; (rx || el).insertAdjacentElement('afterend', chip); }
      chip.dataset.text = text; chip.className = 'sx-prog-chip sx-prog-' + p.action;
      chip.title = `${T('Минулого разу', 'Last time')}: ${p.lastText}. ${p.reason}`;
      chip.innerHTML = `<span class="sx-vh">${T('Наступного разу: ', 'Next time: ')}</span>${esc(text)}`;
    });
  }

  /* =================================================================
     2. Offline status + outbox retries
     ================================================================= */
  const uid = () => { try { return (typeof gtUser !== 'undefined' && gtUser && gtUser.id) || null; } catch (_) { return null; } };
  const outboxKey = () => `gtai_pending_workouts_v3:${uid()}`;
  function outbox() { if (!uid()) return []; try { const q = JSON.parse(localStorage.getItem(outboxKey()) || '[]'); return Array.isArray(q) ? q : []; } catch (_) { return []; } }
  function inApp() { return document.body.classList.contains('st-app-shell') || $('session')?.classList.contains('active'); }
  let syncing = false, lastPending = 0;
  function renderNet() {
    let pill = $('sxNet');
    const offline = navigator.onLine === false;
    const pending = outbox().length;
    const show = inApp() && (offline || pending > 0 || syncing);
    if (!show) { if (pill) pill.hidden = true; return; }
    if (!pill) { pill = document.createElement('div'); pill.id = 'sxNet'; pill.className = 'sx-net'; pill.setAttribute('role', 'status'); pill.setAttribute('aria-live', 'polite'); document.body.appendChild(pill); }
    pill.hidden = false;
    const head = document.querySelector('header.top');
    const hb = head ? head.getBoundingClientRect().bottom : 0;
    pill.style.top = Math.max(8, Math.min(hb, 120)) + 8 + 'px';
    pill.classList.toggle('is-off', offline);
    pill.innerHTML = offline
      ? `<span class="sx-net-dot"></span>${T('Офлайн · усе зберігається на телефоні', 'Offline · everything is saved on this device')}${pending ? ` · ${T('у черзі', 'queued')} ${pending}` : ''}`
      : syncing ? `<span class="sx-net-dot"></span>${T('Синхронізація…', 'Syncing…')}` : `<span class="sx-net-dot"></span>${T('Очікує синхронізації', 'Waiting to sync')}: ${pending}`;
  }
  async function flush() {
    if (syncing || navigator.onLine === false || !uid() || typeof window.gtSyncWorkout !== 'function') return;
    const queue = outbox();
    if (!queue.length) { if (lastPending > 0) { lastPending = 0; toast(T('Тренування синхронізовано', 'Workout synced'), 'good'); } renderNet(); return; }
    lastPending = queue.length;
    syncing = true; renderNet();
    let ok = 0;
    try {
      for (const item of queue) { const done = await window.gtSyncWorkout(item); if (!done) break; ok++; }
    } catch (err) { console.warn('Strenova outbox retry failed:', err?.message || err); }
    syncing = false; renderNet();
    lastPending = outbox().length;
    if (ok) { toast(ok === 1 ? T('Тренування синхронізовано', 'Workout synced') : `${T('Синхронізовано тренувань', 'Workouts synced')}: ${ok}`, 'good'); try { window.renderHistory?.(); window.gtRenderStats?.(); } catch (_) {} }
  }
  window.addEventListener('online', () => { lastPending = Math.max(lastPending, outbox().length); renderNet(); setTimeout(flush, 1500); });
  window.addEventListener('offline', () => { renderNet(); toast(T('Немає інтернету. Усе, що ти запишеш, збережеться на телефоні.', 'No internet. Everything you log is saved on this device.')); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderNet(); flush(); } });
  setInterval(() => { const n = outbox().length; if (n !== lastPending) { lastPending = n; renderNet(); } if (n) flush(); }, 45000);

  // Keep everything the page loaded in the service-worker cache, so the next start works offline
  // even right after the first visit (files fetched before the worker took control are not cached otherwise).
  function warmCache() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      const urls = performance.getEntriesByType('resource').map((e) => e.name)
        .filter((u) => (u.startsWith(location.origin) && /\.(js|css|woff2?|png|svg|webp|jpg|jpeg|webmanifest)(\?|$)/i.test(u) && !/\/config\.js|\/sw\.js/.test(u)) || u.startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@'));
      urls.push(location.origin + location.pathname.replace(/[^/]*$/, '') + 'config.js');
      (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: 'sx-cache', urls: [...new Set(urls)] });
    }).catch(() => {});
  }

  /* =================================================================
     3. Workout summary + story card
     ================================================================= */
  function summarize(rec) {
    const older = workouts().filter((w) => w !== rec);
    let sets = 0, volume = 0, reps = 0;
    const records = [], lines = [];
    for (const e of rec.exercises || []) {
      const ss = setsOf(e); if (!ss.length) continue;
      sets += ss.length; reps += ss.reduce((a, s) => a + s.reps, 0); volume += ss.reduce((a, s) => a + s.weight * s.reps, 0);
      const top = topOf(ss);
      lines.push({ name: e.name, text: top.weight > 0 ? `${kg(top.weight)} ${KG()} × ${Math.max(...top.reps)}` : `${Math.max(...top.reps)} ${REPS()}` });
      if (top.weight <= 0) continue;
      const key = norm(e.name);
      let prevBest = 0, seen = false;
      for (const w of older) { const x = (w.exercises || []).find((y) => norm(y.name) === key); const xs = setsOf(x); if (xs.length) { seen = true; prevBest = Math.max(prevBest, ...xs.map((s) => s.weight)); } }
      if (seen && top.weight > prevBest) records.push({ name: e.name, weight: top.weight, reps: Math.max(...top.reps), prev: prevBest });
    }
    const minutes = Number(rec.duration_minutes || rec.minutes) || 0;
    return { name: rec.name || T('Тренування', 'Workout'), date: rec.date ? new Date(rec.date) : new Date(), minutes, sets, reps, volume: Math.round(volume), exercises: Number(rec.done) || (rec.exercises || []).filter((e) => e.completed || setsOf(e).length).length, records, lines, pending: rec.syncStatus === 'pending' || navigator.onLine === false };
  }
  const durText = (m) => (m >= 60 ? `${Math.floor(m / 60)} ${T('год', 'h')} ${m % 60} ${T('хв', 'min')}` : `${m} ${T('хв', 'min')}`);
  const dateText = (d) => d.toLocaleDateString(LOC(), { day: 'numeric', month: 'long' });

  let lastFocus = null;
  function closeSummary() {
    const el = $('sxSummary'); if (!el) return;
    el.remove(); document.body.classList.remove('sx-summary-open');
    try { lastFocus?.focus?.(); } catch (_) {}
  }
  function showSummary(rec) {
    const d = summarize(rec);
    closeSummary();
    lastFocus = document.activeElement;
    const el = document.createElement('div');
    el.id = 'sxSummary'; el.className = 'sx-sum' + (reduce() ? '' : ' sx-sum-anim');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'sxSumTitle');
    const stat = (v, l) => `<div class="sx-sum-stat"><b>${v}</b><span>${l}</span></div>`;
    el.innerHTML = `<div class="sx-sum-panel">
      <div class="sx-sum-mark" aria-hidden="true">${icon('check')}</div>
      <p class="sx-sum-date">${esc(dateText(d.date))}</p>
      <h2 id="sxSumTitle">${T('Тренування завершено', 'Workout complete')}</h2>
      <p class="sx-sum-name">${esc(d.name)}</p>
      <div class="sx-sum-grid">
        ${stat(d.minutes ? esc(durText(d.minutes)) : '—', T('час', 'time'))}
        ${stat(d.volume ? esc(kg(d.volume)) + `<small> ${KG()}</small>` : '—', T('тоннаж', 'volume'))}
        ${stat(d.sets || '—', T('підходів', 'sets'))}
        ${stat(d.exercises || '—', T('вправ', 'exercises'))}
      </div>
      ${d.records.length ? `<div class="sx-sum-prs"><h3>${T('Нові рекорди', 'New records')}</h3><ul>${d.records.map((r) => `<li><span>${esc(r.name)}</span><b>${esc(kg(r.weight))} ${KG()} × ${r.reps}</b><small>${T('було', 'was')} ${esc(kg(r.prev))} ${KG()}</small></li>`).join('')}</ul></div>` : ''}
      ${!d.sets ? `<p class="sx-sum-note">${T('Підходи з вагою та повтореннями не записані, тому тоннажу й рекордів немає.', 'No sets with weight and reps were logged, so there is no volume or records.')}</p>` : ''}
      ${d.pending ? `<p class="sx-sum-note">${navigator.onLine === false ? T('Збережено на телефоні. Синхронізуємо з акаунтом, коли з’явиться інтернет.', 'Saved on this device. It will sync to your account when you are back online.') : T('Збережено на телефоні, але акаунт ще не підтвердив запис. Повторимо автоматично.', 'Saved on this device, but your account has not confirmed it yet. We will retry automatically.')}</p>` : ''}
      <div class="sx-sum-actions">
        <button type="button" class="sx-btn block" data-sum="story">${icon('share')}${T('Зберегти для сторіс', 'Save for stories')}</button>
        <button type="button" class="sx-btn block ghost" data-sum="close">${T('Готово', 'Done')}</button>
      </div></div>`;
    document.body.appendChild(el); document.body.classList.add('sx-summary-open');
    const btnStory = el.querySelector('[data-sum=story]');
    btnStory.onclick = async () => { btnStory.disabled = true; try { await shareStory(d); } finally { btnStory.disabled = false; } };
    el.querySelector('[data-sum=close]').onclick = closeSummary;
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSummary();
      if (e.key === 'Tab') { const f = [...el.querySelectorAll('button:not([disabled])')]; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    setTimeout(() => btnStory.focus(), 30);
  }

  /* ---------- 1080x1920 story card ---------- */
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  function fit(ctx, text, maxW) { let t = String(text); if (ctx.measureText(t).width <= maxW) return t; while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; }
  async function drawStory(d) {
    try { await Promise.all([document.fonts.load('600 80px Unbounded'), document.fonts.load('500 40px Onest'), document.fonts.load('700 40px Onest')]); } catch (_) {}
    const W = 1080, H = 1920, P = 96;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const DISPLAY = '"Unbounded", "Onest", system-ui, sans-serif', BODY = '"Onest", system-ui, sans-serif';
    x.fillStyle = '#111015'; x.fillRect(0, 0, W, H);
    let g = x.createRadialGradient(W * 0.85, 260, 40, W * 0.85, 260, 900); g.addColorStop(0, 'rgba(143,109,255,.55)'); g.addColorStop(1, 'rgba(143,109,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createRadialGradient(80, H - 200, 40, 80, H - 200, 800); g.addColorStop(0, 'rgba(255,181,71,.28)'); g.addColorStop(1, 'rgba(255,181,71,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.textBaseline = 'alphabetic';
    x.fillStyle = '#f4f2f8'; x.font = `600 44px ${DISPLAY}`; x.fillText('STRENOVA', P, 170);
    x.fillStyle = '#a29eae'; x.font = `500 38px ${BODY}`; x.textAlign = 'right'; x.fillText(dateText(d.date), W - P, 170); x.textAlign = 'left';
    x.fillStyle = '#c9c5d3'; x.font = `500 42px ${BODY}`; x.fillText(T('Тренування завершено', 'Workout complete'), P, 380);
    x.fillStyle = '#f4f2f8'; x.font = `600 88px ${DISPLAY}`;
    let y = 490; for (const l of wrap(x, d.name, W - P * 2).slice(0, 2)) { x.fillText(fit(x, l, W - P * 2), P, y); y += 106; }
    // stats 2x2
    y += 40;
    const cells = [[d.minutes ? durText(d.minutes) : '—', T('час', 'time')], [d.volume ? kg(d.volume) + ' ' + KG() : '—', T('тоннаж', 'volume')], [String(d.sets || '—'), T('підходів', 'sets')], [String(d.exercises || '—'), T('вправ', 'exercises')]];
    const cw = (W - P * 2 - 32) / 2, ch = 210;
    cells.forEach(([v, l], i) => {
      const cx = P + (i % 2) * (cw + 32), cy = y + Math.floor(i / 2) * (ch + 32);
      x.fillStyle = 'rgba(255,255,255,.06)'; x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 2;
      x.beginPath(); x.roundRect ? x.roundRect(cx, cy, cw, ch, 36) : x.rect(cx, cy, cw, ch); x.fill(); x.stroke();
      x.fillStyle = '#f4f2f8'; x.font = `600 64px ${DISPLAY}`; x.fillText(fit(x, v, cw - 72), cx + 36, cy + 112);
      x.fillStyle = '#a29eae'; x.font = `500 36px ${BODY}`; x.fillText(l, cx + 36, cy + 170);
    });
    y += ch * 2 + 32 + 110;
    if (d.records.length) {
      x.fillStyle = '#ffb547'; x.font = `600 40px ${DISPLAY}`; x.fillText(T('Нові рекорди', 'New records'), P, y); y += 70;
      for (const r of d.records.slice(0, 3)) {
        x.fillStyle = '#f4f2f8'; x.font = `500 42px ${BODY}`; x.fillText(fit(x, r.name, W - P * 2 - 330), P, y);
        x.fillStyle = '#ffb547'; x.font = `700 42px ${BODY}`; x.textAlign = 'right'; x.fillText(`${kg(r.weight)} ${KG()} × ${r.reps}`, W - P, y); x.textAlign = 'left'; y += 72;
      }
      y += 40;
    }
    const room = Math.floor((H - 260 - y) / 66);
    if (d.lines.length && room > 0) {
      x.fillStyle = '#c9c5d3'; x.font = `600 36px ${DISPLAY}`; x.fillText(T('Вправи', 'Exercises'), P, y); y += 62;
      for (const ln of d.lines.slice(0, Math.min(room - 1, 6))) {
        x.fillStyle = '#c9c5d3'; x.font = `500 38px ${BODY}`; x.fillText(fit(x, ln.name, W - P * 2 - 300), P, y);
        x.fillStyle = '#f4f2f8'; x.font = `700 38px ${BODY}`; x.textAlign = 'right'; x.fillText(ln.text, W - P, y); x.textAlign = 'left'; y += 66;
      }
    }
    x.fillStyle = '#8f6dff'; x.fillRect(P, H - 190, 120, 8);
    x.fillStyle = '#a29eae'; x.font = `500 34px ${BODY}`; x.fillText(T('Записано в Strenova', 'Logged with Strenova'), P, H - 120);
    return c;
  }
  async function shareStory(d) {
    const canvas = await drawStory(d);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) { toast(T('Не вдалося створити картинку', 'Could not create the image'), 'bad'); return; }
    const fname = `strenova-${d.date.toISOString().slice(0, 10)}.png`;
    const file = typeof File === 'function' ? new File([blob], fname, { type: 'image/png' }) : null;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: T('Моє тренування', 'My workout') }); return; }
    } catch (err) { if (err && err.name === 'AbortError') return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(T('Картинку збережено', 'Image saved'), 'good');
  }
  S.summary = { show: showSummary, summarize, drawStory };

  // A debounced draft upload that started before "Finish" can land after the draft was deleted
  // and make the finished session reappear as "continue workout". Delete it once more when it is safe.
  async function dropFinishedDraft() {
    if ($('session')?.classList.contains('active')) return; // a new workout has already started
    const id = uid() || 'local';
    try { localStorage.removeItem('gtai_workout_draft_v2:' + id); } catch (_) {}
    const sb = (() => { try { return typeof gtSupabase !== 'undefined' ? gtSupabase : null; } catch (_) { return null; } })();
    if (sb && uid() && navigator.onLine !== false) {
      try { const { error } = await sb.from('workout_drafts').delete().eq('user_id', uid()); if (error) console.warn('Could not clear the finished draft:', error.message); } catch (_) {}
    }
  }

  // Workouts still waiting in the outbox are not in the cloud yet; keep them in the history after a reload.
  function mergeOutbox() {
    const queue = outbox(); if (!queue.length) return;
    let list = workouts();
    const have = new Set(list.map((w) => w.clientRecordId).filter(Boolean));
    const add = queue.filter((w) => w && w.clientRecordId && !have.has(w.clientRecordId));
    if (!add.length) return;
    list = add.concat(list).sort(byDateDesc);
    try { history = list; } catch (_) {}
    try { localStorage.setItem('gtai_history', JSON.stringify(list)); } catch (_) {}
    try { window.renderHome?.(); window.renderHistory?.(); window.gtRenderStats?.(); } catch (_) {}
    try { S.renderWeek?.(); window.StrenovaV3?.renderWeek?.(); } catch (_) {}
  }

  function wrapFinish() {
    const original = window.gtFinishWorkout;
    if (typeof original !== 'function' || original.__sxSummary) return;
    const wrapped = async function (...args) {
      const before = workouts()[0];
      const nativeAlert = window.alert;
      // The legacy save path ends with a blocking "Workout saved!" alert; the summary replaces it.
      window.alert = function (msg) { if (/Тренування збережено|Workout saved/i.test(String(msg))) return; return nativeAlert.apply(window, arguments); };
      let out;
      try { out = await original.apply(this, args); }
      finally { window.alert = nativeAlert; }
      const rec = workouts()[0];
      if (rec && rec !== before) { showSummary(rec); renderNet(); setTimeout(dropFinishedDraft, 2500); setTimeout(dropFinishedDraft, 9000); }
      return out;
    };
    wrapped.__sxSummary = true;
    Object.keys(original).forEach((k) => { try { wrapped[k] = original[k]; } catch (_) {} });
    window.gtFinishWorkout = wrapped; window.finishWorkout = wrapped;
  }

  /* =================================================================
     Boot
     ================================================================= */
  let planTimer = null, rowTimer = null;
  const schedulePlan = () => { clearTimeout(planTimer); planTimer = setTimeout(decoratePlan, 120); };
  const scheduleRows = () => { clearTimeout(rowTimer); rowTimer = setTimeout(decorateSessionRows, 150); };
  function boot() {
    wrapFinish();
    const onPage = (id) => { if (id === 'recommend') schedulePlan(); if (id === 'session') scheduleRows(); setTimeout(renderNet, 200); };
    if (S.onPage) S.onPage(onPage); else document.addEventListener('sx:page', (e) => onPage(e.detail.id));
    const rec = $('recommend'); if (rec) new MutationObserver(() => { if (rec.classList.contains('active') || rec.querySelector('.th-ex-name')) schedulePlan(); }).observe(rec, { childList: true, subtree: true });
    const list = $('exerciseList'); if (list) new MutationObserver((m) => { if (m.some((x) => [...x.addedNodes].some((n) => n.nodeType === 1 && !n.closest?.('[data-sx-prog-host]')))) scheduleRows(); }).observe(list, { childList: true, subtree: true });
    schedulePlan(); scheduleRows(); renderNet();
    const afterLogin = window.gtAfterLogin;
    if (typeof afterLogin === 'function' && !afterLogin.__sxProgress) {
      const w = async function (...a) { const r = await afterLogin.apply(this, a); mergeOutbox(); schedulePlan(); renderNet(); setTimeout(flush, 2000); return r; };
      w.__sxProgress = true; window.gtAfterLogin = w; try { gtAfterLogin = w; } catch (_) {}
    }
    setTimeout(warmCache, 4000);
    // The first sign-in usually finishes before this module boots, so wait for it here as well.
    let tries = 0;
    const afterFirstLogin = () => {
      let busy = false; try { busy = typeof gtAfterLoginPromise !== 'undefined' && !!gtAfterLoginPromise; } catch (_) {}
      if (uid() && !busy) { mergeOutbox(); renderNet(); flush(); return; }
      if (++tries < 40) setTimeout(afterFirstLogin, 500);
    };
    setTimeout(afterFirstLogin, 800);
  }
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot, { once: true });
})();
