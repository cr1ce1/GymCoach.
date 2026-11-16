/* =====================================================================
   STRENOVA GYM FOCUS MODE (2026-11-16)
   One exercise at a time, big steppers for weight/reps, one-tap set
   completion, automatic rest timer, next-exercise preview.
   It drives the existing session inputs, so drafts, autosave, history
   and finishing keep working through the established code paths.
   ===================================================================== */
(function () {
  'use strict';
  const S = (window.Strenova = window.Strenova || {});
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = (n) => (S.icon ? S.icon(n) : '');
  const MODE_KEY = 'strenova_session_mode';
  const IDX_KEY = 'strenova_focus_index';
  const START_KEY = 'strenova_focus_started';
  const state = { idx: Number(sessionStorage.getItem(IDX_KEY) || 0), rest: null, wake: null, observer: null, renderTimer: null, clock: null };

  const mode = () => { try { return localStorage.getItem(MODE_KEY) || 'focus'; } catch (_) { return 'focus'; } };
  const setMode = (m) => { try { localStorage.setItem(MODE_KEY, m); } catch (_) {} };

  /* ---------- read the legacy session DOM ---------- */
  function rows() { return [...document.querySelectorAll('#exerciseList .gt-logged-exercise, #exerciseList > .session-row')]; }
  function setRowsOf(row) {
    return [...row.querySelectorAll('.gt-set-row')].map((sr) => {
      const inputs = sr.querySelectorAll('input[type=number]');
      let extra = sr.nextElementSibling; if (!extra || !extra.classList.contains('gt-set-extra')) extra = null;
      return { el: sr, reps: inputs[0] || null, weight: inputs[1] || null, done: extra ? extra.querySelector('input[data-gt-set-done]') : null };
    });
  }
  function readExercise(row, i) {
    const name = row.querySelector('.session-ex-name')?.textContent.trim() || row.dataset.exercise || 'Вправа ' + (i + 1);
    const target = row.querySelector('.gt-session-exercise-heading small, .details small, .session-main > small')?.textContent.trim() || '';
    const prev = row.querySelector('.gt-previous-result')?.textContent.trim() || '';
    const sets = setRowsOf(row);
    const exDone = row.querySelector('.gt-session-completion');
    const doneCount = sets.filter((s) => s.done?.checked).length;
    const complete = sets.length ? doneCount === sets.length : !!exDone?.checked;
    return { row, name, en: row.dataset.exercise || '', target, prev, sets, exDone, doneCount, complete };
  }
  const fire = (el) => { if (!el) return; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const setVal = (el, v) => { if (!el) return; el.value = v; fire(el); };
  const fmtNum = (v) => { const n = Number(v); if (!Number.isFinite(n)) return '0'; return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10); };

  /* ---------- rest timer ---------- */
  function restDefault() {
    const sel = document.querySelector('#session .chip.selected');
    const m = sel && String(sel.textContent).match(/(\d+)/);
    return m ? Number(m[1]) : 90;
  }
  function ensureRestDock() {
    let d = $('sxRest'); if (d) return d;
    d = document.createElement('div'); d.id = 'sxRest'; d.className = 'sx-rest'; d.setAttribute('role', 'timer'); d.setAttribute('aria-live', 'off');
    d.innerHTML = `<div><div class="sx-rest-label">Відпочинок</div><div class="sx-rest-time" id="sxRestTime">0:00</div></div>
      <button type="button" data-rest="-15" aria-label="Мінус 15 секунд">−15</button><button type="button" data-rest="15" aria-label="Плюс 15 секунд">+15</button>
      <button type="button" class="go" data-rest="skip">Далі</button><span class="sx-rest-bar" id="sxRestBar"></span>`;
    document.body.appendChild(d);
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rest]'); if (!b || !state.rest) return;
      if (b.dataset.rest === 'skip') return stopRest();
      state.rest.end += Number(b.dataset.rest) * 1000; state.rest.total = Math.max(5, state.rest.total + Number(b.dataset.rest)); tickRest();
    });
    return d;
  }
  function beep() {
    try { if (navigator.vibrate) navigator.vibrate([180, 80, 180]); } catch (_) {}
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      const ctx = state.audio || (state.audio = new Ctx());
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      o.start(); o.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  }
  function startRest(seconds) {
    const d = ensureRestDock(); clearInterval(state.rest?.timer);
    const total = Math.max(5, seconds || restDefault());
    state.rest = { end: Date.now() + total * 1000, total, alerted: false, timer: setInterval(tickRest, 250) };
    d.classList.add('show'); d.classList.remove('over'); tickRest();
  }
  function tickRest() {
    const r = state.rest; if (!r) return;
    const left = Math.round((r.end - Date.now()) / 1000);
    const abs = Math.abs(left); const t = `${left < 0 ? '+' : ''}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
    const el = $('sxRestTime'); if (el) el.textContent = t;
    const bar = $('sxRestBar'); if (bar) bar.style.width = Math.max(0, Math.min(100, (left / r.total) * 100)) + '%';
    const d = $('sxRest');
    if (left <= 0 && !r.alerted) { r.alerted = true; d?.classList.add('over'); const lab = d?.querySelector('.sx-rest-label'); if (lab) lab.textContent = 'Час на наступний підхід'; beep(); }
    if (left < -300) stopRest();
  }
  function stopRest() {
    clearInterval(state.rest?.timer); state.rest = null;
    const d = $('sxRest'); if (d) { d.classList.remove('show', 'over'); const lab = d.querySelector('.sx-rest-label'); if (lab) lab.textContent = 'Відпочинок'; }
  }

  /* ---------- wake lock while training ---------- */
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !state.wake && document.visibilityState === 'visible') { state.wake = await navigator.wakeLock.request('screen'); state.wake.addEventListener('release', () => { state.wake = null; }); }
      if (!on && state.wake) { await state.wake.release(); state.wake = null; }
    } catch (_) { state.wake = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && active()) keepAwake(true); });

  /* ---------- render ---------- */
  const active = () => $('session')?.classList.contains('active') && rows().length > 0;
  function elapsed() {
    let st = Number(sessionStorage.getItem(START_KEY) || 0);
    if (!st) { st = Date.now(); sessionStorage.setItem(START_KEY, String(st)); }
    const m = Math.floor((Date.now() - st) / 60000); return m < 60 ? m + ' хв' : Math.floor(m / 60) + ' год ' + (m % 60) + ' хв';
  }
  function ensureHost() {
    const session = $('session'); if (!session) return null;
    let host = $('sxFocus');
    if (!host) { host = document.createElement('div'); host.id = 'sxFocus'; session.insertBefore(host, session.firstChild); }
    return host;
  }
  function technique(ex) {
    const t = S.findTechnique ? S.findTechnique(ex.name, ex.en) : null;
    const video = ex.row.querySelector('a.tech-video')?.href || ('https://www.youtube.com/results?search_query=' + encodeURIComponent((ex.en || ex.name) + ' exercise technique'));
    return { t, video };
  }

  function render() {
    const session = $('session'); if (!session) return;
    const list = rows();
    const onSession = session.classList.contains('active');
    document.body.classList.toggle('sx-training', onSession && mode() === 'focus' && list.length > 0);
    const hdr = document.querySelector('header.top');
    if (hdr) { const pos = getComputedStyle(hdr).position; document.documentElement.style.setProperty('--sx-head-h', (pos === 'fixed' || pos === 'sticky') ? hdr.offsetHeight + 'px' : '0px'); }
    if (mode() !== 'focus' || !list.length) { session.classList.remove('sx-focus-on'); const h = $('sxFocus'); if (h) h.innerHTML = list.length ? listToggleHtml() : ''; bindToggle(); return; }
    session.classList.add('sx-focus-on');
    const host = ensureHost(); if (!host) return;
    if (host.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return; // don't clobber typing
    const all = list.map(readExercise);
    if (state.idx >= all.length) state.idx = all.length - 1; if (state.idx < 0) state.idx = 0;
    const ex = all[state.idx]; const next = all[state.idx + 1];
    const totalSets = all.reduce((s, e) => s + Math.max(e.sets.length, 1), 0);
    const doneSets = all.reduce((s, e) => s + (e.sets.length ? e.doneCount : (e.complete ? 1 : 0)), 0);
    const title = $('sessionTitle')?.textContent.trim() || 'Тренування';
    const nextSet = ex.sets.findIndex((s) => !s.done?.checked);
    const { t, video } = technique(ex);
    host.innerHTML = `
      <div class="sx-fx-top">
        <div class="sx-between"><h2>${esc(title)}</h2><div class="sx-row" style="gap:4px;flex-wrap:nowrap"><button type="button" class="sx-btn small quiet" data-fx="list" aria-label="Показати всі вправи списком">${icon('list')}Список</button><button type="button" class="sx-icon-btn" data-fx="min" aria-label="Згорнути тренування. Прогрес збережеться">${icon('down')}</button></div></div>
        <div class="sx-fx-meta"><span>Вправа <b>${state.idx + 1}</b> з ${all.length}</span><span>Підходи <b>${doneSets}</b>/${totalSets}</span><span>${icon('timer').replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-3px"')} <b id="sxElapsed">${elapsed()}</b></span></div>
        <div class="sx-progress" aria-hidden="true"><span style="width:${totalSets ? Math.round((doneSets / totalSets) * 100) : 0}%"></span></div>
      </div>
      <nav class="sx-fx-pager" aria-label="Вправи">${all.map((e, i) => `<button type="button" data-go="${i}" class="${e.complete ? 'done' : ''}" ${i === state.idx ? 'aria-current="step"' : ''} aria-label="${esc(e.name)}${e.complete ? ', виконано' : ''}">${e.complete ? icon('check').replace('<svg', '<svg style="width:18px;height:18px"') : i + 1}</button>`).join('')}</nav>
      <section class="sx-fx-ex" aria-labelledby="sxExName">
        <h3 id="sxExName">${esc(ex.name)}</h3>
        <div class="sx-fx-target">${ex.target ? `<span class="sx-badge violet">План: ${esc(ex.target)}</span>` : ''}${ex.complete ? '<span class="sx-badge mint">Виконано</span>' : ''}
          <button type="button" class="sx-btn small ghost" data-fx="tech">${icon('info')}Техніка</button></div>
        ${ex.prev && !/ще немає/i.test(ex.prev) ? `<p class="sx-fx-prev">${esc(ex.prev)}</p>` : ''}
        <div id="sxTech" hidden></div>
        ${ex.sets.length ? `<div class="sx-set-head" aria-hidden="true"><span>#</span><span>Вага, кг</span><span>Повтори</span><span></span></div>
        <div class="sx-sets">${ex.sets.map((s, i) => {
          const done = !!s.done?.checked;
          return `<div class="sx-set ${done ? 'is-done' : ''} ${i === nextSet ? 'is-next' : ''}" data-set="${i}">
            <span class="sx-set-n">${i + 1}</span>
            <div class="sx-step"><button type="button" data-step="weight" data-d="-2.5" aria-label="Зменшити вагу підходу ${i + 1}">−</button><input inputmode="decimal" data-in="weight" value="${esc(fmtNum(s.weight?.value))}" aria-label="Вага підходу ${i + 1}, кг"><button type="button" data-step="weight" data-d="2.5" aria-label="Збільшити вагу підходу ${i + 1}">+</button></div>
            <div class="sx-step"><button type="button" data-step="reps" data-d="-1" aria-label="Менше повторень у підході ${i + 1}">−</button><input inputmode="numeric" data-in="reps" value="${esc(fmtNum(s.reps?.value))}" aria-label="Повторення підходу ${i + 1}"><button type="button" data-step="reps" data-d="1" aria-label="Більше повторень у підході ${i + 1}">+</button></div>
            <button type="button" class="sx-done" data-done aria-pressed="${done}" aria-label="${done ? 'Скасувати виконання' : 'Позначити виконаним'} підхід ${i + 1}">${icon('check')}</button>
          </div>`; }).join('')}</div>` : `<button type="button" class="sx-btn block ${ex.complete ? 'ghost' : ''}" data-fx="exdone">${icon('check')}${ex.complete ? 'Скасувати виконання' : 'Вправу виконано'}</button>`}
        <div class="sx-fx-tools">
          ${ex.sets.length ? `<button type="button" class="sx-btn small ghost" data-fx="addset">${icon('plus')}Підхід</button>` : ''}
          <button type="button" class="sx-btn small ghost" data-fx="rest">${icon('timer')}Відпочинок</button>
          <button type="button" class="sx-btn small quiet" data-fx="more">Заміна, RPE, нотатки</button>
        </div>
      </section>
      <div class="sx-fx-nav">
        <button type="button" class="sx-icon-btn" style="height:auto;min-height:60px;width:60px" data-fx="prev" ${state.idx === 0 ? 'disabled' : ''} aria-label="Попередня вправа">${icon('left')}</button>
        ${next ? `<button type="button" class="sx-fx-next" data-fx="next"><small>Далі</small><b>${esc(next.name)}</b><small>${esc(next.target)}</small></button>` : `<button type="button" class="sx-fx-next" data-fx="finish"><small>Остання вправа</small><b>Завершити тренування</b></button>`}
      </div>
      <button type="button" class="sx-btn block sx-fx-finish ${doneSets === totalSets ? '' : 'ghost'}" data-fx="finish">${icon('check')}Завершити й зберегти</button>`;
    bind(host, ex, all, t, video);
  }

  function listToggleHtml() {
    return `<div class="sx-between" style="margin:0 0 12px"><span class="sx-sub">Режим списку</span><button type="button" class="sx-btn small ghost" data-fx="focus">${icon('focus')}Режим фокусу</button></div>`;
  }
  function bindToggle() {
    const b = document.querySelector('#sxFocus [data-fx=focus]');
    if (b) b.onclick = () => { setMode('focus'); render(); window.scrollTo({ top: 0 }); };
  }

  function bind(host, ex, all, t, video) {
    host.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(Number(b.dataset.go)));
    host.querySelector('[data-fx=list]').onclick = () => { setMode('list'); render(); };
    host.querySelector('[data-fx=min]').onclick = () => { stopRest(); document.body.classList.remove('sx-training'); if (typeof window.showPage === 'function') window.showPage('home'); S.toast && S.toast('Тренування збережено як чернетку. Продовжиш з головної.'); };
    host.querySelector('[data-fx=prev]').onclick = () => go(state.idx - 1);
    host.querySelectorAll('[data-fx=finish]').forEach((b) => b.onclick = finish);
    const nx = host.querySelector('[data-fx=next]'); if (nx) nx.onclick = () => go(state.idx + 1);
    host.querySelector('[data-fx=rest]').onclick = () => startRest();
    host.querySelector('[data-fx=more]').onclick = () => { setMode('list'); render(); setTimeout(() => ex.row.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
    const add = host.querySelector('[data-fx=addset]');
    if (add) add.onclick = () => { const btn = [...ex.row.querySelectorAll('button')].find((b) => /Додати підхід|Add set/i.test(b.textContent)); if (btn) { btn.click(); schedule(); } };
    const exd = host.querySelector('[data-fx=exdone]');
    if (exd) exd.onclick = () => { if (ex.exDone) { ex.exDone.checked = !ex.exDone.checked; fire(ex.exDone); } if (ex.exDone?.checked && all[state.idx + 1]) go(state.idx + 1); else render(); };
    host.querySelector('[data-fx=tech]').onclick = () => {
      const box = $('sxTech'); if (!box) return;
      if (!box.hidden) { box.hidden = true; return; }
      box.hidden = false;
      box.innerHTML = `<div class="sx-card" style="margin:0 0 12px;background:var(--sx-s2)">${t ? `${t.muscles ? `<p class="sx-sub"><b style="color:var(--sx-text)">М’язи:</b> ${esc(t.muscles)}</p>` : ''}${t.how ? `<p style="margin:8px 0">${esc(t.how)}</p>` : ''}${t.mistakes ? `<p class="sx-sub"><b style="color:var(--sx-text)">Типові помилки:</b> ${esc(t.mistakes)}</p>` : ''}` : '<p class="sx-sub">Опису цієї вправи ще немає в бібліотеці.</p>'}
        <a class="sx-btn small ghost" style="margin-top:10px" href="${esc(video)}" target="_blank" rel="noopener noreferrer">${icon('play')}Відео техніки</a></div>`;
    };
    host.querySelectorAll('.sx-set').forEach((rowEl) => {
      const i = Number(rowEl.dataset.set); const s = ex.sets[i];
      rowEl.querySelectorAll('[data-step]').forEach((b) => b.onclick = () => {
        const field = b.dataset.step, d = Number(b.dataset.d), inp = s[field]; if (!inp) return;
        const v = Math.max(0, Math.min(field === 'weight' ? 500 : 100, (Number(inp.value) || 0) + d));
        setVal(inp, fmtNum(v)); rowEl.querySelector(`[data-in=${field}]`).value = fmtNum(v);
      });
      rowEl.querySelectorAll('[data-in]').forEach((inp) => {
        inp.addEventListener('focus', () => inp.select());
        inp.addEventListener('change', () => { const field = inp.dataset.in; const v = Math.max(0, Math.min(field === 'weight' ? 500 : 100, Number(String(inp.value).replace(',', '.')) || 0)); inp.value = fmtNum(v); setVal(s[field], fmtNum(v)); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
      });
      rowEl.querySelector('[data-done]').onclick = () => toggleSet(ex, i);
    });
  }

  function toggleSet(ex, i) {
    const s = ex.sets[i]; if (!s?.done) return;
    const nowDone = !s.done.checked;
    s.done.checked = nowDone; fire(s.done);
    if (nowDone) {
      // Carry this set's numbers into the next empty set — the usual case in the gym.
      const nxt = ex.sets[i + 1];
      if (nxt && !nxt.done?.checked) {
        if (nxt.weight && !Number(nxt.weight.value) && Number(s.weight?.value)) setVal(nxt.weight, s.weight.value);
        if (nxt.reps && !Number(nxt.reps.value) && Number(s.reps?.value)) setVal(nxt.reps, s.reps.value);
      }
      const allDone = ex.sets.every((x) => x.done?.checked);
      if (allDone && ex.exDone && !ex.exDone.checked) { ex.exDone.checked = true; fire(ex.exDone); }
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (_) {}
      const restAttr = Number(ex.row.dataset.rest || 0);
      if (!(allDone && state.idx === rows().length - 1)) startRest(restAttr || undefined);
      if (allDone && rows()[state.idx + 1]) { state.idx += 1; sessionStorage.setItem(IDX_KEY, String(state.idx)); }
    } else if (ex.exDone?.checked) { ex.exDone.checked = false; fire(ex.exDone); }
    render();
  }

  function go(i) {
    const n = rows().length; if (i < 0 || i >= n) return;
    state.idx = i; sessionStorage.setItem(IDX_KEY, String(i)); render();
    const top = $('sxFocus'); if (top) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.scrollY - 70), behavior: 'smooth' });
  }

  function finish() {
    const btn = [...document.querySelectorAll('#session button')].find((b) => !b.closest('#sxFocus') && /Завершити й зберегти|Finish and save/i.test(b.textContent));
    if (!btn) { S.toast && S.toast('Не знайдено кнопку завершення', 'bad'); return; }
    stopRest(); btn.click();
    setTimeout(() => { if (!$('session')?.classList.contains('active')) { sessionStorage.removeItem(IDX_KEY); sessionStorage.removeItem(START_KEY); state.idx = 0; keepAwake(false); } }, 400);
  }

  function schedule() { clearTimeout(state.renderTimer); state.renderTimer = setTimeout(render, 90); }

  function observe() {
    const list = $('exerciseList'); if (!list || state.observer) return;
    state.observer = new MutationObserver((muts) => {
      if (!active()) return;
      // Re-render only for structural changes made by the legacy layers.
      if (muts.some((m) => m.type === 'childList' && [...m.addedNodes, ...m.removedNodes].some((n) => n.nodeType === 1))) schedule();
    });
    state.observer.observe(list, { childList: true, subtree: true });
  }

  function onSessionShown() {
    observe();
    if (!sessionStorage.getItem(START_KEY)) sessionStorage.setItem(START_KEY, String(Date.now()));
    render(); keepAwake(true);
    clearInterval(state.clock);
    state.clock = setInterval(() => { if (!active()) { clearInterval(state.clock); return; } const e = $('sxElapsed'); if (e) e.textContent = elapsed(); }, 30000);
  }

  function boot() {
    const onPage = (id) => {
      if (id === 'session') setTimeout(onSessionShown, 60);
      else { keepAwake(false); document.body.classList.remove('sx-training'); }
    };
    if (S.onPage) S.onPage(onPage); else document.addEventListener('sx:page', (e) => onPage(e.detail.id));
    document.addEventListener('sx:session-ready', () => { state.idx = 0; sessionStorage.setItem(IDX_KEY, '0'); sessionStorage.setItem(START_KEY, String(Date.now())); render(); });
    // A newly started workout resets focus position.
    ['gtStartWorkout', 'startWorkout', 'gtStartHubDay', 'gtStartCustomPlan'].forEach((n) => {
      const fn = window[n]; if (typeof fn !== 'function' || fn.__sxReset) return;
      const w = function () { state.idx = 0; sessionStorage.setItem(IDX_KEY, '0'); sessionStorage.setItem(START_KEY, String(Date.now())); stopRest(); return fn.apply(this, arguments); };
      w.__sxReset = true; window[n] = w;
    });
    if ($('session')?.classList.contains('active')) onSessionShown();
  }
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot, { once: true });
  S.gym = { render, startRest, stopRest };
})();
