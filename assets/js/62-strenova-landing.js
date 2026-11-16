/* =====================================================================
   STRENOVA LANDING v2 (2026-11-16)
   - Ukrainian copy lives in the markup; English comes from EN below.
   - Live set-logging demo that mirrors the real gym focus screen.
   ===================================================================== */
(function () {
  'use strict';
  const root = document.querySelector('#stLanding .ln');
  if (!root) return;

  const EN = {
    navGym: 'In the gym', navCoach: 'For coaches', navPrice: 'Pricing', navFaq: 'FAQ', navProgress: 'Progress', dragHint: 'Drag to spin the barbell',
    login: 'Log in', signup: 'Create account',
    h1: 'Log every set. Watch your weights go up.',
    lead: 'Strenova is a workout log built for the gym. Today’s plan, weight and reps in one tap, a rest timer and your progress history. A coach can manage your program and nutrition.',
    ctaStart: 'Start for free', ctaLogin: 'I already have an account',
    heroFine: 'Works in the browser on phone and desktop. You can add it to your home screen like an app.',
    demoDay: 'Legs · exercise 2 of 6', demoTag: 'Demo', demoEx: 'Barbell back squat',
    demoPlan: 'Plan 4 × 6–8', demoLast: 'last time 77.5 kg × 8',
    restLabel: 'Rest', restSkip: 'Next', demoHint: 'Tap ✓ to complete a set. Demo data is not saved anywhere.',
    gymH: 'Nothing to hunt for between sets',
    gymLead: 'The workout screen shows one exercise at a time. Big buttons, no tiny fields — easy to use one-handed between sets.',
    s1h: 'Open today’s workout', s1p: 'From your profile, from your coach or your own plan. Exercises, sets and working weights are right there.',
    s2h: 'Log weight and reps', s2p: '± buttons change the weight by 2.5 kg. Values carry over to the next set automatically.',
    s3h: 'Rest on a timer', s3p: 'A timer with an alert starts after every set. The screen stays on during the workout where the browser supports it.',
    progH: 'Progress you can read at a glance',
    progLead: 'Every finished workout goes into your history. Working weights, personal records and consistency are calculated from it.',
    f1h: 'History and charts', f1p: 'What you did, when, and with what weight.',
    f2h: 'Workout calendar', f2p: 'Plan training days and move sessions.',
    f3h: 'Nutrition', f3p: 'Food diary with calories and macros.',
    f4h: 'Exercise library', f4p: 'Technique cues and common mistakes.',
    coachH: 'For coaches: clients, programs and nutrition in one place',
    coachLead: 'Sign up as a coach and send a client your code. Once they connect, you see their workouts and can manage their program.',
    c1: 'Programs with sets, reps and working weight', c2: 'Calorie, protein, fat and carb targets for each client',
    c3: 'Training schedule and the results of every workout', c4: 'Clients connect themselves and can disconnect at any time',
    codeLabel: 'Coach code', codeName: 'Olena K.', codeMeta: 'Last workout today', codeName2: 'Max T.', codeMeta2: '3 workouts this week',
    priceH: 'Pricing', freeH: 'Free', freeAmt: '₴0',
    fr1: 'Training program from your profile and your own plans', fr2: 'Set logging, rest timer, history',
    fr3: 'Calendar, nutrition, exercise library', fr4: 'Connect to a coach with a code', freeCta: 'Create account',
    plusAmt: '₴150 / 30 days', pl1: 'Private chat with your coach', pl2: 'Everything in the free plan',
    plusNote: 'Online payment is not available yet. The Strenova owner enables Plus for your account manually.',
    faqH: 'Questions',
    q1: 'Where is my data stored?', a1: 'In your Strenova account on servers in the EU. Only you and the coach you connect to can see your records. The current workout draft is also kept on your device, so a weak signal in the gym won’t erase logged sets.',
    q2: 'Can a coach see my workouts without permission?', a2: 'No. A coach sees your data only after you enter their code. You can disconnect at any time under “My coach”.',
    q3: 'How do I install Strenova on my phone?', a3: 'Open the site in Safari (iPhone) or Chrome (Android) and choose “Add to Home Screen”.', a3btn: 'Step-by-step guide',
    q4: 'Are the calorie numbers medical advice?', a4: 'No. Calories and macros are estimates from standard formulas. If you have a medical condition or injury, talk to a doctor.',
    finalH: 'Your first workout in five minutes',
    finalP: 'Fill in a short profile and Strenova builds a starting program for your experience, goal and equipment.',
    privacy: 'Privacy policy', terms: 'Terms of use',
    vidH: 'See how it works', vidP: 'A one-minute tour of Strenova: training in the gym, progress and working with a coach. Ukrainian narration captions.', vidPlay: 'Watch the video'
  };
  const UK = {};
  root.querySelectorAll('[data-ln]').forEach((el) => { if (!(el.dataset.ln in UK)) UK[el.dataset.ln] = el.textContent; });
  UK.s3p = 'Після кожного підходу запускається таймер із сигналом. Екран не гасне, поки триває тренування, якщо браузер це підтримує.';
  UK.ariaDemo = 'Демонстрація екрана тренування'; EN.ariaDemo = 'Workout screen demo';

  const curLang = () => { try { return localStorage.getItem('gtai_lang') === 'en' ? 'en' : 'uk'; } catch (_) { return 'uk'; } };
  function apply() {
    const L = curLang(); const pack = L === 'en' ? EN : UK;
    root.querySelectorAll('[data-ln]').forEach((el) => { const v = pack[el.dataset.ln]; if (v != null) el.textContent = v; });
    const demo = root.querySelector('.ln-demo'); if (demo) demo.setAttribute('aria-label', pack.ariaDemo);
    const lb = document.getElementById('stLangButton');
    if (lb) { lb.textContent = L === 'en' ? 'EN' : 'UK'; lb.setAttribute('aria-label', L === 'en' ? 'Language: English. Switch to Ukrainian' : 'Мова: українська. Перемкнути на англійську'); }
    document.documentElement.lang = L;
    const y = document.getElementById('stYear'); if (y) y.textContent = String(new Date().getFullYear());
    splitHero();
    renderSets();
  }

  /* ---------- live demo ---------- */
  const sets = [
    { w: 80, r: 8, done: true },
    { w: 80, r: 8, done: false },
    { w: 80, r: 7, done: false },
    { w: 80, r: 6, done: false }
  ];
  const fmtW = (v) => (curLang() === 'en' ? String(v) : String(v).replace('.', ','));
  const checkSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
  function renderSets() {
    const box = document.getElementById('lnSets'); if (!box) return;
    const en = curLang() === 'en'; const next = sets.findIndex((s) => !s.done);
    box.innerHTML = sets.map((s, i) => `<div class="ln-set${s.done ? ' done' : ''}${i === next ? ' next' : ''}" role="listitem">
      <span class="ln-n">${i + 1}</span>
      <div class="ln-step"><button type="button" data-i="${i}" data-f="w" data-d="-2.5" aria-label="${en ? 'Less weight' : 'Менша вага'}">−</button><output aria-live="polite">${fmtW(s.w)}<small>${en ? 'kg' : 'кг'}</small></output><button type="button" data-i="${i}" data-f="w" data-d="2.5" aria-label="${en ? 'More weight' : 'Більша вага'}">+</button></div>
      <div class="ln-step"><button type="button" data-i="${i}" data-f="r" data-d="-1" aria-label="${en ? 'Fewer reps' : 'Менше повторень'}">−</button><output aria-live="polite">${s.r}<small>${en ? 'reps' : 'пов'}</small></output><button type="button" data-i="${i}" data-f="r" data-d="1" aria-label="${en ? 'More reps' : 'Більше повторень'}">+</button></div>
      <button type="button" class="ln-ok" data-ok="${i}" aria-pressed="${s.done}" aria-label="${en ? 'Set' : 'Підхід'} ${i + 1}: ${s.done ? (en ? 'done' : 'виконано') : (en ? 'mark done' : 'позначити виконаним')}">${checkSvg}</button></div>`).join('');
  }
  let rest = null;
  function startRest(sec) {
    const box = document.getElementById('lnRest'), t = document.getElementById('lnRestT'), bar = document.getElementById('lnRestBar');
    if (!box) return; clearInterval(rest?.timer);
    rest = { end: Date.now() + sec * 1000, total: sec };
    const tick = () => {
      const left = Math.max(0, Math.round((rest.end - Date.now()) / 1000));
      t.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      bar.style.width = (left / rest.total) * 100 + '%';
      if (!left) stopRest();
    };
    box.hidden = false; tick(); rest.timer = setInterval(tick, 1000);
  }
  function stopRest() { clearInterval(rest?.timer); rest = null; const b = document.getElementById('lnRest'); if (b) b.hidden = true; }
  root.addEventListener('click', (e) => {
    const st = e.target.closest('[data-f]');
    if (st) {
      const s = sets[Number(st.dataset.i)]; const d = Number(st.dataset.d);
      if (st.dataset.f === 'w') s.w = Math.max(0, Math.min(400, s.w + d)); else s.r = Math.max(0, Math.min(50, s.r + d));
      renderSets(); return;
    }
    const ok = e.target.closest('[data-ok]');
    if (ok) {
      const i = Number(ok.dataset.ok); const s = sets[i]; s.done = !s.done;
      if (s.done && sets[i + 1] && !sets[i + 1].done) sets[i + 1].w = s.w;
      renderSets();
      if (s.done && sets.some((x) => !x.done)) startRest(90); else stopRest();
      const again = document.querySelector(`#lnSets [data-ok="${i}"]`); if (again) again.focus();
      return;
    }
    if (e.target.closest('#lnRestSkip')) stopRest();
  });

  /* ---------- promo video: loads only on demand ---------- */
  const vid = document.getElementById('lnVideoEl'), player = document.getElementById('lnPlayer'), playBtn = document.getElementById('lnPlay');
  if (vid && player && playBtn) {
    const vertical = () => window.matchMedia('(max-width: 599px) and (orientation: portrait)').matches;
    vid.poster = vertical() ? './assets/video/poster-9x16.jpg' : './assets/video/poster-16x9.jpg';
    playBtn.addEventListener('click', () => {
      if (!vid.src) {
        vid.src = vertical() ? './assets/video/strenova-promo-9x16.mp4?v=20261116c' : './assets/video/strenova-promo-16x9.mp4?v=20261116c';
        vid.preload = 'auto';
      }
      vid.controls = true; player.classList.add('is-playing');
      const p = vid.play(); if (p && p.catch) p.catch(() => {});
      vid.focus({ preventScroll: true });
    });
    vid.addEventListener('ended', () => { player.classList.remove('is-playing'); vid.controls = false; try { vid.currentTime = 0; } catch (_) {} });
    // stop the sound when the visitor leaves the landing (sign-up, log-in)
    const land = document.getElementById('stLanding');
    if (land) new MutationObserver(() => { if (land.hidden && !vid.paused) vid.pause(); }).observe(land, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !vid.paused) vid.pause(); });
  }

  /* ---------- v3 motion: split headline, reveals, colour worlds, parallax, 3D ---------- */
  const land = document.getElementById('stLanding');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function splitHero() {
    const h = document.getElementById('lnH1'); if (!h) return;
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="ln-wd" aria-hidden="true"><span style="transition-delay:${(i * 0.055).toFixed(3)}s">${w.replace(/[&<>]/g, '')}</span></span>`).join(' ');
  }
  const WORLDS = {
    violet: [[143, 109, 255], [62, 214, 160]],
    ember: [[255, 92, 54], [255, 181, 71]],
    ice: [[57, 212, 255], [143, 109, 255]],
    graphite: [[150, 140, 200], [62, 214, 160]]
  };
  let bar = null, world = 'violet';
  function setWorld(w) {
    if (!WORLDS[w] || w === world) return; world = w;
    const [a, b] = WORLDS[w];
    root.style.setProperty('--acc', a.join(','));
    root.style.setProperty('--acc2', b.join(','));
    if (bar) bar.setAccent(a.map((v) => v / 255), b.map((v) => v / 255));
  }
  if ('IntersectionObserver' in window) {
    const rev = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target; const sib = [...el.parentElement.children].filter((x) => x.classList.contains('ln-reveal'));
        el.style.transitionDelay = Math.min(0.32, sib.indexOf(el) * 0.08) + 's';
        el.classList.add('is-in'); rev.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    root.querySelectorAll('.ln-reveal').forEach((el) => rev.observe(el));
    const links = {}; root.querySelectorAll('.ln-links a').forEach((a) => { links[a.getAttribute('href').slice(1)] = a; });
    const wo = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        setWorld(en.target.dataset.world);
        Object.values(links).forEach((a) => a.classList.remove('is-current'));
        if (links[en.target.id]) links[en.target.id].classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    root.querySelectorAll('[data-world]').forEach((el) => wo.observe(el));
  } else root.querySelectorAll('.ln-reveal').forEach((el) => el.classList.add('is-in'));

  // parallax + giant wordmark drift + barbell scroll, one rAF per scroll frame
  const depthEls = [...root.querySelectorAll('[data-depth]')];
  const giants = [...root.querySelectorAll('.ln-giant-word')];
  const hero = root.querySelector('.ln-hero');
  let ticking = false;
  function onScroll() {
    if (ticking || !land || land.hidden) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const vh = window.innerHeight;
      if (!reduce) {
        depthEls.forEach((el) => {
          const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
          el.style.setProperty('--py', (((r.top + r.height / 2) - vh / 2) * -Number(el.dataset.depth)).toFixed(1) + 'px');
        });
        giants.forEach((g, i) => {
          const r = g.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return;
          const k = ((r.top + r.height / 2) - vh / 2) / vh;
          g.style.transform = `translate3d(${(i === 0 ? -k * 12 : k * 14).toFixed(2)}vw,0,0)`;
        });
      }
      if (bar && hero) { const r = hero.getBoundingClientRect(); bar.setScroll(Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)))); }
    });
  }
  if (land) land.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  function startHero() {
    if (!land || land.hidden || root.classList.contains('is-live')) return;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-live')));
    // never leave the headline hidden if animation frames are paused (background tab, prerender)
    setTimeout(() => root.classList.add('is-live'), 1200);
    const cv = document.getElementById('lnBarbell'), stage = cv && cv.parentElement;
    if (cv && window.StrenovaBarbell && !bar) {
      bar = window.StrenovaBarbell.mount(cv, { onReady: () => stage.classList.add('is-3d') });
      if (bar) {
        const [a, b] = WORLDS[world]; bar.setAccent(a.map((v) => v / 255), b.map((v) => v / 255));
        cv.addEventListener('pointerdown', () => stage.classList.add('was-dragged'), { once: true });
      }
    }
    onScroll();
  }
  if (land) new MutationObserver(startHero).observe(land, { attributes: true, attributeFilter: ['hidden'] });
  if (document.readyState === 'complete') startHero(); else window.addEventListener('load', startHero, { once: true });
  setTimeout(startHero, 400);

  // subtle tilt on the demo card for mouse users
  const tilt = root.querySelector('.ln-tilt');
  if (tilt && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    tilt.addEventListener('pointermove', (e) => {
      const r = tilt.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `perspective(1200px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
    });
    tilt.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
  }

  const prev = window.stSetLanguage;
  if (typeof prev === 'function' && !prev.__ln) {
    const wrapped = function () { const r = prev.apply(this, arguments); apply(); return r; };
    wrapped.__ln = true; window.stSetLanguage = wrapped;
  }
  apply();
})();
