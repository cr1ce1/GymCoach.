/* =====================================================================
   STRENOVA APP v3 (2026-11-17)
   - "My week" card on the athlete home: real workouts this week vs the
     weekly target from the profile, streak of weeks on target, and the next
     planned session from the calendar.
   - Page enter motion (content only; #session is excluded because a
     transform there breaks its fixed workout dock).
   ===================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = () => { try { return typeof profile !== 'undefined' ? profile : null; } catch (_) { return null; } };
  const H = () => { try { return typeof history !== 'undefined' && Array.isArray(history) ? history : []; } catch (_) { return []; } };
  const SCH = () => { try { return typeof gtSchedule !== 'undefined' && Array.isArray(gtSchedule) ? gtSchedule : []; } catch (_) { return []; } };
  const role = () => { try { return window.gcCurrentRole || ''; } catch (_) { return ''; } };

  function weekStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
  function weekStats() {
    const target = Math.max(1, Math.min(7, Number((P() || {}).days) || 3));
    const now = new Date(); const ws = weekStart(now);
    const counts = new Map();
    H().forEach((h) => { const d = new Date(h.date || h.created_at || 0); if (isNaN(d)) return; const k = weekStart(d).getTime(); counts.set(k, (counts.get(k) || 0) + 1); });
    const done = counts.get(ws.getTime()) || 0;
    const days = new Set(H().filter((h) => { const d = new Date(h.date || 0); return d >= ws; }).map((h) => (new Date(h.date).getDay() + 6) % 7));
    let streak = 0; const k = new Date(ws);
    if (done < target) k.setDate(k.getDate() - 7); // the current week can still be completed
    for (let i = 0; i < 104; i++) { if ((counts.get(k.getTime()) || 0) >= target) { streak++; k.setDate(k.getDate() - 7); } else break; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const next = SCH().map((s) => ({ ...s, d: new Date(s.date + 'T00:00:00') })).filter((s) => !isNaN(s.d) && s.d >= today).sort((a, b) => a.d - b.d)[0] || null;
    return { target, done, streak, days, next };
  }
  const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  function relDay(d) {
    const t = new Date(); t.setHours(0, 0, 0, 0); const diff = Math.round((d - t) / 86400000);
    if (diff === 0) return 'Сьогодні'; if (diff === 1) return 'Завтра';
    return d.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function renderWeek() {
    const home = $('home'); if (!home || !P() || role() === 'coach') { const c = $('sxWeekCard'); if (c) c.remove(); return; }
    let card = $('sxWeekCard');
    if (!card) {
      card = document.createElement('section'); card.id = 'sxWeekCard'; card.className = 'sx-week'; card.setAttribute('data-no-autotranslate', '');
      const hero = home.querySelector(':scope > .hero'); home.insertBefore(card, hero ? hero.nextSibling : home.firstChild);
    }
    const s = weekStats();
    const pct = Math.min(1, s.done / s.target); const R = 42, C = 2 * Math.PI * R;
    const todayIdx = (new Date().getDay() + 6) % 7;
    const left = Math.max(0, s.target - s.done);
    card.innerHTML = `
      <div class="sx-week-ring" role="img" aria-label="Цього тижня ${s.done} з ${s.target} тренувань">
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" class="trk"/><circle cx="50" cy="50" r="${R}" class="val" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - pct)).toFixed(1)}"/></svg>
        <div class="sx-week-num"><b>${s.done}</b><small>з ${s.target}</small></div>
      </div>
      <div class="sx-week-body">
        <h2>Мій тиждень</h2>
        <p class="sx-week-sub">${pct >= 1 ? 'Тижнева ціль виконана. Сильна робота.' : left === 1 ? 'Ще одне тренування до тижневої цілі.' : `Ще ${left} тренування до тижневої цілі.`}${s.streak > 1 ? ` <span class="sx-week-streak">${s.streak} тиж. поспіль</span>` : ''}</p>
        <ol class="sx-week-days" aria-label="Дні тижня">${DOW.map((d, i) => `<li class="${s.days.has(i) ? 'on' : ''}${i === todayIdx ? ' today' : ''}"><span>${d}</span></li>`).join('')}</ol>
        <div class="sx-week-next">${s.next
          ? `<span>Наступне: <b>${esc(s.next.title || 'Тренування')}</b> · ${esc(relDay(s.next.d))}</span>`
          : '<span>Наступне тренування ще не заплановане.</span><button type="button" class="sx-btn small quiet" data-act="plan-cal">Запланувати</button>'}</div>
        <button type="button" class="sx-btn" data-act="start">Почати тренування</button>
      </div>`;
    card.querySelector('[data-act=start]').onclick = () => window.showPage && window.showPage('recommend');
    const pc = card.querySelector('[data-act=plan-cal]'); if (pc) pc.onclick = () => window.showPage && window.showPage('calendar');
    if (!reduce && !card.dataset.anim) {
      card.dataset.anim = '1'; const v = card.querySelector('.val'); const off = v.style.strokeDashoffset;
      v.style.strokeDashoffset = C.toFixed(1); requestAnimationFrame(() => requestAnimationFrame(() => { v.style.strokeDashoffset = off; }));
    }
    window.Strenova && window.Strenova.arrangeLayout && window.Strenova.arrangeLayout();
  }

  // page enter motion
  function enter(id) {
    if (reduce || id === 'session') return;
    const pg = $(id); if (!pg) return;
    pg.classList.remove('sx-enter'); void pg.offsetWidth; pg.classList.add('sx-enter');
    clearTimeout(pg.__sxEnterT); pg.__sxEnterT = setTimeout(() => pg.classList.remove('sx-enter'), 700);
  }
  document.addEventListener('sx:page', (e) => { const id = e.detail && e.detail.id; enter(id); if (id === 'home') setTimeout(renderWeek, 30); });
  const sp = window.showPage;
  if (typeof sp === 'function' && !sp.__v3) {
    const w = function (id) { const r = sp.apply(this, arguments); if (id === 'home') setTimeout(renderWeek, 60); return r; };
    w.__v3 = true; Object.keys(sp).forEach((k) => { try { w[k] = sp[k]; } catch (_) {} }); window.showPage = w;
  }
  // refresh after login data arrives and after a workout is saved
  let tries = 0; const boot = () => { if (P() && $('home')) renderWeek(); else if (++tries < 40) setTimeout(boot, 400); };
  boot();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && $('home') && $('home').classList.contains('active')) renderWeek(); });
  window.StrenovaV3 = { renderWeek, weekStats };
})();
