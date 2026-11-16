/* =====================================================================
   STRENOVA ONBOARDING (2026-11-17)
   One full-screen flow for everything before the app:
     start (choose athlete/coach) → sign up → confirm email
     log in · forgot password · set a new password (recovery link)
     first-run setup in small steps → a ready, personalised account
   Works on top of the existing auth/profile code:
   - Supabase auth through the shared gtSupabase client;
   - the DB trigger creates role, profile, coach code from sign-up metadata;
   - answers are saved with GTSyncProfileToCloud (the existing profile sync)
     and coach_profiles (columns coaches may update under RLS).
   ===================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sb = () => { try { return typeof gtSupabase !== 'undefined' ? gtSupabase : null; } catch (_) { return null; } };
  const user = () => { try { return typeof gtUser !== 'undefined' ? gtUser : null; } catch (_) { return null; } };
  const getProfile = () => { try { return typeof profile !== 'undefined' ? profile : null; } catch (_) { return null; } };
  const getHistory = () => { try { return typeof history !== 'undefined' && Array.isArray(history) ? history : []; } catch (_) { return []; } };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const siteUrl = () => location.href.split('#')[0].split('?')[0];
  const ICON = {
    back: '<path d="M15 6l-6 6 6 6"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0112 5c6.5 0 10 7 10 7a17.6 17.6 0 01-3.2 4.2M6.6 6.6A17.4 17.4 0 002 12s3.5 7 10 7a10.6 10.6 0 005.4-1.4M9.9 9.9a3 3 0 004.2 4.2"/>',
    athlete: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    coach: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0111 0"/><path d="M16 5.5a3 3 0 010 5.5M18 19a5 5 0 00-2.5-4.3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"/>'
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ''}</svg>`;

  /* ---------- shell ---------- */
  let root = null, view = null, state = { role: 'athlete', email: '', answers: {}, step: 0 }, googleOn = false;
  function ensureRoot() {
    if (root) return root;
    root = document.createElement('div');
    root.id = 'sxOnb'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('data-no-autotranslate', ''); root.hidden = true;
    root.innerHTML = `<div class="ob-bg" aria-hidden="true"><i></i><i></i></div>
      <div class="ob-top"><button type="button" class="ob-icon" data-ob="back" aria-label="Назад">${icon('back')}</button>
        <div class="ob-brand"><img src="./strenova-icon-64.png" width="28" height="28" alt=""><span>Strenova</span></div>
        <button type="button" class="ob-icon" data-ob="close" aria-label="Закрити">${icon('close')}</button></div>
      <div class="ob-progress" aria-hidden="true"><i></i></div>
      <main class="ob-main"><div class="ob-view" id="sxOnbView" tabindex="-1"></div></main>
      <p class="ob-live" id="sxOnbLive" role="status" aria-live="polite"></p>`;
    document.body.appendChild(root);
    view = $('sxOnbView');
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ob]'); if (!b) return;
      const a = b.dataset.ob;
      if (a === 'close') closeToLanding();
      if (a === 'back') goBack();
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !root.dataset.locked) closeToLanding(); });
    return root;
  }
  let backStack = [];
  function setChrome(o) {
    const vis = (sel, on) => { const el = root.querySelector(sel); el.style.visibility = on ? 'visible' : 'hidden'; el.tabIndex = on ? 0 : -1; el.setAttribute('aria-hidden', String(!on)); };
    vis('[data-ob=back]', !!o.back); vis('[data-ob=close]', !!o.close);
    const bar = root.querySelector('.ob-progress');
    bar.hidden = o.progress == null; if (o.progress != null) bar.firstElementChild.style.transform = `scaleX(${Math.max(0.04, o.progress)})`;
    if (o.locked) root.dataset.locked = '1'; else delete root.dataset.locked;
  }
  function show(name, opts) {
    ensureRoot();
    const r = SCREENS[name]; if (!r) return;
    if (!opts || !opts.noPush) { if (state.screen && state.screen !== name && !(opts && opts.replace)) backStack.push(state.screen); }
    state.screen = name;
    root.hidden = false; document.documentElement.classList.add('sx-onb-open');
    const html = r.render();
    const swap = () => {
      view.innerHTML = html; view.classList.remove('ob-out'); view.classList.add('ob-in');
      setChrome(r.chrome ? r.chrome() : {});
      r.bind && r.bind(view);
      const h = view.querySelector('h1,h2'); (view.querySelector('[autofocus]') || h || view).focus({ preventScroll: true });
      requestAnimationFrame(() => view.classList.remove('ob-in'));
    };
    if (reduce || !view.innerHTML) swap(); else { view.classList.add('ob-out'); setTimeout(swap, 160); }
  }
  function goBack() { const prev = backStack.pop(); if (prev) show(prev, { noPush: true }); else closeToLanding(); }
  function hide() {
    if (!root) return;
    root.hidden = true; document.documentElement.classList.remove('sx-onb-open'); state.screen = null; backStack = [];
  }
  function closeToLanding() {
    if (root && root.dataset.locked) return;
    hide();
    if (!user()) {
      window.__stAuth = 0;
      const L = $('stLanding'); if (L) L.hidden = false;
      const g = $('authGate'); if (g) g.hidden = true;
    }
  }
  function live(msg) { const l = $('sxOnbLive'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); } }

  /* ---------- form helpers ---------- */
  function field(id, label, type, extra) {
    extra = extra || {};
    const pw = type === 'password';
    return `<div class="ob-field${pw ? ' ob-pw' : ''}">
      <label for="${id}">${label}</label>
      <div class="ob-input"><input id="${id}" name="${id}" type="${type}" ${extra.ac ? `autocomplete="${extra.ac}"` : ''} ${extra.im ? `inputmode="${extra.im}"` : ''} ${extra.ph ? `placeholder="${esc(extra.ph)}"` : ''} ${extra.val ? `value="${esc(extra.val)}"` : ''} ${extra.af ? 'autofocus' : ''} ${extra.req === false ? '' : 'required'} aria-describedby="${id}Err${extra.hint ? ` ${id}Hint` : ''}" spellcheck="false" autocapitalize="${type === 'text' ? 'words' : 'off'}">
        ${pw ? `<button type="button" class="ob-eye" data-eye="${id}" aria-label="Показати пароль" aria-pressed="false">${icon('eye')}</button>` : ''}</div>
      ${extra.hint ? `<p class="ob-hint" id="${id}Hint">${extra.hint}</p>` : ''}
      ${extra.meter ? `<div class="ob-meter" id="${id}Meter" aria-hidden="true"><i></i><i></i><i></i><i></i></div>` : ''}
      <p class="ob-err" id="${id}Err"></p></div>`;
  }
  function bindEyes(scope) {
    scope.querySelectorAll('[data-eye]').forEach((b) => b.addEventListener('click', () => {
      const inp = $(b.dataset.eye); const on = inp.type === 'password';
      inp.type = on ? 'text' : 'password'; b.innerHTML = icon(on ? 'eyeOff' : 'eye');
      b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Сховати пароль' : 'Показати пароль');
      inp.focus({ preventScroll: true });
    }));
  }
  function setErr(id, msg) {
    const e = $(id + 'Err'), inp = $(id); if (!e) return;
    e.textContent = msg || ''; if (inp) { inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); inp.closest('.ob-field').classList.toggle('has-err', !!msg); }
  }
  function formErr(msg) { const b = view.querySelector('.ob-formerr'); if (b) { b.textContent = msg || ''; b.hidden = !msg; } if (msg) live(msg); }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.classList.add('is-busy'); btn.innerHTML = `<span class="ob-spin" aria-hidden="true"></span>${esc(label || 'Зачекай…')}`; }
    else { btn.disabled = false; btn.classList.remove('is-busy'); btn.textContent = btn.dataset.label || btn.textContent; }
  }
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  function strength(pw) {
    let s = 0; if (pw.length >= 8) s++; if (pw.length >= 12) s++; if (/[a-zа-яіїєґ]/.test(pw) && /[A-ZА-ЯІЇЄҐ]/.test(pw)) s++; if (/\d/.test(pw) && /[^\w\s]/.test(pw)) s++; else if (/\d/.test(pw)) s += 0.5;
    return Math.min(4, Math.floor(s));
  }
  function authMsg(err) {
    const code = String(err?.code || '').toLowerCase(), m = String(err?.message || '').toLowerCase();
    if (code === 'invalid_credentials' || m.includes('invalid login')) return 'Невірна пошта або пароль.';
    if (code === 'email_not_confirmed' || m.includes('not confirmed')) return 'Пошту ще не підтверджено. Відкрий лист від Strenova або надішли його ще раз.';
    if (code === 'user_already_exists' || m.includes('already registered')) return 'Акаунт із цією поштою вже існує. Увійди або віднови пароль.';
    if (code === 'weak_password' || m.includes('password should')) return 'Пароль надто простий. Використай щонайменше 8 символів, літери й цифри.';
    if (code.includes('rate_limit') || m.includes('rate limit') || m.includes('too many')) return 'Забагато спроб або листів поспіль. Зачекай кілька хвилин і спробуй знову.';
    if (m.includes('failed to fetch') || m.includes('network')) return 'Немає з’єднання з сервером. Перевір інтернет і спробуй ще раз.';
    if (typeof window.gtAuthErrorMessage === 'function') { try { return window.gtAuthErrorMessage(err); } catch (_) {} }
    return 'Не вдалося виконати запит: ' + (err?.message || 'невідома помилка');
  }

  /* ---------- screens ---------- */
  const SCREENS = {};

  SCREENS.start = {
    chrome: () => ({ close: true }),
    render: () => `<div class="ob-hero"><h1>Створімо твій Strenova</h1><p class="ob-lead">Хто ти? Від цього залежить, що буде в кабінеті одразу після входу.</p></div>
      <div class="ob-roles" role="radiogroup" aria-label="Тип акаунта">
        ${['athlete', 'coach'].map((r) => `<button type="button" class="ob-role${state.role === r ? ' on' : ''}" role="radio" aria-checked="${state.role === r}" data-role="${r}">
          <span class="ob-role-ic">${icon(r)}</span>
          <span><b>${r === 'athlete' ? 'Я тренуюся' : 'Я тренер'}</b><small>${r === 'athlete' ? 'План тренувань, запис підходів, харчування та прогрес. Можна підключитися до тренера.' : 'Учні, їхні програми, харчування й результати. Код для запрошення учнів.'}</small></span></button>`).join('')}
      </div>
      <button type="button" class="ob-btn ob-primary" data-act="next">Продовжити</button>
      <p class="ob-alt">Вже маєш акаунт? <button type="button" class="ob-link" data-act="login">Увійти</button></p>`,
    bind(v) {
      v.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => {
        state.role = b.dataset.role;
        v.querySelectorAll('[data-role]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      }));
      v.querySelector('[data-act=next]').onclick = () => show('signup');
      v.querySelector('[data-act=login]').onclick = () => show('login', { replace: true });
    }
  };

  SCREENS.signup = {
    chrome: () => ({ back: true, close: true }),
    render: () => `<div class="ob-hero"><h1>${state.role === 'coach' ? 'Акаунт тренера' : 'Твій акаунт'}</h1><p class="ob-lead">Пошта й пароль — усе інше налаштуємо після входу.</p></div>
      <form class="ob-form" novalidate>
        ${field('obName', 'Ім’я', 'text', { ac: 'name', ph: 'Як до тебе звертатися', af: true })}
        ${field('obEmail', 'Електронна пошта', 'email', { ac: 'email', im: 'email', val: state.email })}
        ${field('obPass', 'Пароль', 'password', { ac: 'new-password', hint: 'Щонайменше 8 символів. Краще з літерами й цифрами.', meter: true })}
        ${field('obPass2', 'Повтори пароль', 'password', { ac: 'new-password' })}
        ${state.role === 'athlete' ? `<details class="ob-more"><summary>Маю код тренера</summary>${field('obInvite', 'Код тренера', 'text', { ph: 'COACH-XXXXXX', req: false, hint: 'Підключимо тебе до тренера після першого входу.' })}</details>` : ''}
        <p class="ob-formerr" role="alert" hidden></p>
        <button type="submit" class="ob-btn ob-primary">Створити акаунт</button>
        <p class="ob-legal">Створюючи акаунт, ти погоджуєшся з <a href="./terms.html" target="_blank" rel="noopener">Умовами використання</a> та <a href="./privacy.html" target="_blank" rel="noopener">Політикою конфіденційності</a>.</p>
      </form>
      <p class="ob-alt">Вже маєш акаунт? <button type="button" class="ob-link" data-act="login">Увійти</button></p>`,
    bind(v) {
      bindEyes(v);
      const pass = $('obPass'), meter = $('obPassMeter');
      pass.addEventListener('input', () => {
        const s = pass.value ? Math.max(1, strength(pass.value)) : 0;
        meter.dataset.s = s; [...meter.children].forEach((i, k) => i.classList.toggle('on', k < s));
      });
      ['obName', 'obEmail', 'obPass', 'obPass2', 'obInvite'].forEach((id) => { const el = $(id); if (el) el.addEventListener('input', () => setErr(id, '')); });
      const inv = $('obInvite'); if (inv) inv.addEventListener('input', () => { inv.value = inv.value.toUpperCase(); });
      v.querySelector('[data-act=login]').onclick = () => show('login', { replace: true });
      v.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault(); formErr('');
        const name = $('obName').value.trim(), email = $('obEmail').value.trim().toLowerCase(), p1 = pass.value, p2 = $('obPass2').value;
        const code = inv ? inv.value.trim().toUpperCase() : '';
        let bad = null;
        const fail = (id, m) => { setErr(id, m); bad = bad || id; };
        if (name.length < 2) fail('obName', 'Вкажи ім’я — щонайменше 2 літери.');
        if (!emailOk(email)) fail('obEmail', 'Перевір адресу пошти, наприклад name@gmail.com.');
        if (p1.length < 8) fail('obPass', 'Пароль має містити щонайменше 8 символів.');
        else if (!/\d/.test(p1) && !/[^\w\s]/.test(p1)) fail('obPass', 'Додай хоча б одну цифру або символ.');
        if (p1 && p2 !== p1) fail('obPass2', 'Паролі не збігаються.');
        if (code && !/^COACH-[A-Z0-9]{4,12}$/.test(code)) fail('obInvite', 'Код має вигляд COACH-XXXXXX.');
        if (bad) { $(bad).focus(); live('Перевір виділені поля.'); return; }
        const client = sb(); if (!client) { formErr('Сервіс тимчасово недоступний. Спробуй пізніше.'); return; }
        const btn = v.querySelector('button[type=submit]'); busy(btn, true, 'Створюємо акаунт…');
        try {
          const { data, error } = await client.auth.signUp({
            email, password: p1,
            options: { emailRedirectTo: siteUrl(), data: { account_type: state.role, full_name: name.slice(0, 120) } }
          });
          if (error) throw error;
          // Supabase answers an existing, confirmed email with an empty identities list.
          if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            throw Object.assign(new Error('User already registered'), { code: 'user_already_exists' });
          }
          state.email = email;
          if (code) store.set('sx_pending_invite', { code, email, at: Date.now() });
          store.set('sx_onb_new', { email, role: state.role, at: Date.now() });
          if (!data.session) show('verify', { replace: true });
          else { hide(); live('Акаунт створено.'); }
        } catch (err) { formErr(authMsg(err)); }
        finally { busy(btn, false); }
      });
    }
  };

  let resendAt = 0;
  SCREENS.verify = {
    chrome: () => ({ close: true }),
    render: () => `<div class="ob-hero ob-center"><span class="ob-badge">${icon('mail')}</span><h1>Підтвердь пошту</h1>
      <p class="ob-lead">Ми надіслали лист на <b>${esc(state.email)}</b>. Натисни посилання в ньому — і повернешся сюди вже в акаунті.</p></div>
      <ul class="ob-tips"><li>Лист приходить за хвилину-дві. Перевір також «Спам» і «Промоакції».</li><li>Посилання відкривай у тому ж браузері, щоб одразу продовжити налаштування.</li></ul>
      <p class="ob-formerr" role="alert" hidden></p>
      <button type="button" class="ob-btn ob-ghost" data-act="resend">Надіслати лист ще раз</button>
      <button type="button" class="ob-btn ob-primary" data-act="login">Я підтвердив — увійти</button>`,
    bind(v) {
      const rb = v.querySelector('[data-act=resend]');
      const tick = () => { const left = Math.ceil((resendAt - Date.now()) / 1000); if (left > 0) { rb.disabled = true; rb.textContent = `Надіслати ще раз через ${left} с`; setTimeout(tick, 1000); } else { rb.disabled = false; rb.textContent = 'Надіслати лист ще раз'; } };
      tick();
      rb.onclick = async () => {
        const client = sb(); if (!client) return;
        busy(rb, true, 'Надсилаємо…');
        const { error } = await client.auth.resend({ type: 'signup', email: state.email, options: { emailRedirectTo: siteUrl() } });
        busy(rb, false);
        if (error) formErr(authMsg(error)); else { formErr(''); live('Лист надіслано ще раз.'); resendAt = Date.now() + 60000; tick(); }
      };
      v.querySelector('[data-act=login]').onclick = () => show('login');
    }
  };

  SCREENS.login = {
    chrome: () => ({ back: backStack.length > 0, close: true }),
    render: () => `<div class="ob-hero"><h1>З поверненням</h1><p class="ob-lead">Увійди, щоб продовжити тренування.</p></div>
      <form class="ob-form" novalidate>
        ${field('obLEmail', 'Електронна пошта', 'email', { ac: 'email', im: 'email', val: state.email, af: !state.email })}
        ${field('obLPass', 'Пароль', 'password', { ac: 'current-password', af: !!state.email })}
        <div class="ob-row-end"><button type="button" class="ob-link" data-act="forgot">Забув пароль?</button></div>
        <p class="ob-formerr" role="alert" hidden></p>
        <button type="submit" class="ob-btn ob-primary">Увійти</button>
        ${googleOn ? '<div class="ob-or"><span>або</span></div><button type="button" class="ob-btn ob-ghost" data-act="google">Увійти через Google</button>' : ''}
      </form>
      <p class="ob-alt">Ще немає акаунта? <button type="button" class="ob-link" data-act="signup">Створити</button></p>`,
    bind(v) {
      bindEyes(v);
      ['obLEmail', 'obLPass'].forEach((id) => $(id).addEventListener('input', () => setErr(id, '')));
      v.querySelector('[data-act=forgot]').onclick = () => { state.email = $('obLEmail').value.trim(); show('forgot'); };
      v.querySelector('[data-act=signup]').onclick = () => show('start', { replace: true });
      const g = v.querySelector('[data-act=google]');
      if (g) g.onclick = () => { if (typeof window.gtGoogleSignIn === 'function') window.gtGoogleSignIn(); };
      v.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault(); formErr('');
        const email = $('obLEmail').value.trim().toLowerCase(), pw = $('obLPass').value;
        let bad = null;
        if (!emailOk(email)) { setErr('obLEmail', 'Перевір адресу пошти.'); bad = 'obLEmail'; }
        if (!pw) { setErr('obLPass', 'Введи пароль.'); bad = bad || 'obLPass'; }
        if (bad) { $(bad).focus(); return; }
        const client = sb(); if (!client) { formErr('Сервіс тимчасово недоступний.'); return; }
        const btn = v.querySelector('button[type=submit]'); busy(btn, true, 'Входимо…');
        try {
          const { error } = await client.auth.signInWithPassword({ email, password: pw });
          if (error) throw error;
          state.email = email; hide();
        } catch (err) {
          formErr(authMsg(err));
          if (String(err?.code || '').includes('email_not_confirmed')) { state.email = email; }
        } finally { busy(btn, false); }
      });
    }
  };

  SCREENS.forgot = {
    chrome: () => ({ back: true, close: true }),
    render: () => `<div class="ob-hero"><span class="ob-badge">${icon('key')}</span><h1>Відновлення пароля</h1><p class="ob-lead">Вкажи пошту акаунта — надішлемо посилання для нового пароля.</p></div>
      <form class="ob-form" novalidate>
        ${field('obFEmail', 'Електронна пошта', 'email', { ac: 'email', im: 'email', val: state.email, af: true })}
        <p class="ob-formerr" role="alert" hidden></p>
        <div class="ob-okbox" hidden></div>
        <button type="submit" class="ob-btn ob-primary">Надіслати посилання</button>
      </form>`,
    bind(v) {
      $('obFEmail').addEventListener('input', () => setErr('obFEmail', ''));
      v.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault(); formErr('');
        const email = $('obFEmail').value.trim().toLowerCase();
        if (!emailOk(email)) { setErr('obFEmail', 'Перевір адресу пошти.'); $('obFEmail').focus(); return; }
        const client = sb(); if (!client) return;
        const btn = v.querySelector('button[type=submit]'); busy(btn, true, 'Надсилаємо…');
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() });
        busy(btn, false);
        if (error) { formErr(authMsg(error)); return; }
        state.email = email;
        const ok = v.querySelector('.ob-okbox'); ok.hidden = false;
        ok.innerHTML = `${icon('check')}<span>Якщо акаунт із поштою <b>${esc(email)}</b> існує, лист уже в дорозі. Відкрий посилання — і задай новий пароль.</span>`;
        btn.textContent = 'Надіслати ще раз'; live('Посилання для відновлення надіслано.');
      });
    }
  };

  SCREENS.reset = {
    chrome: () => ({ locked: true }),
    render: () => `<div class="ob-hero"><span class="ob-badge">${icon('key')}</span><h1>Новий пароль</h1><p class="ob-lead">Придумай пароль, яким будеш входити далі.</p></div>
      <form class="ob-form" novalidate>
        ${field('obRPass', 'Новий пароль', 'password', { ac: 'new-password', af: true, hint: 'Щонайменше 8 символів.', meter: true })}
        ${field('obRPass2', 'Повтори пароль', 'password', { ac: 'new-password' })}
        <p class="ob-formerr" role="alert" hidden></p>
        <button type="submit" class="ob-btn ob-primary">Зберегти пароль</button>
      </form>`,
    bind(v) {
      bindEyes(v);
      const pass = $('obRPass'), meter = $('obRPassMeter');
      pass.addEventListener('input', () => { const s = pass.value ? Math.max(1, strength(pass.value)) : 0; [...meter.children].forEach((i, k) => i.classList.toggle('on', k < s)); meter.dataset.s = s; setErr('obRPass', ''); });
      $('obRPass2').addEventListener('input', () => setErr('obRPass2', ''));
      v.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault(); formErr('');
        const p1 = pass.value, p2 = $('obRPass2').value;
        if (p1.length < 8) { setErr('obRPass', 'Щонайменше 8 символів.'); pass.focus(); return; }
        if (p1 !== p2) { setErr('obRPass2', 'Паролі не збігаються.'); $('obRPass2').focus(); return; }
        const btn = v.querySelector('button[type=submit]'); busy(btn, true, 'Зберігаємо…');
        const { error } = await sb().auth.updateUser({ password: p1 });
        busy(btn, false);
        if (error) { formErr(authMsg(error)); return; }
        delete root.dataset.locked; hide();
        window.Strenova && window.Strenova.toast && window.Strenova.toast('Пароль змінено. Ти в акаунті.', 'good');
      });
    }
  };

  /* ---------- first-run setup ---------- */
  const GOALS = [
    ['strength', 'Стати сильнішим', 'Робочі ваги ростуть щотижня'], ['muscle', 'Набрати м’язову масу', 'Більше об’єму та сили'],
    ['lose', 'Схуднути', 'Менше жиру, краща форма'], ['maintain', 'Підтримувати форму', 'Стабільно і без перевантажень'],
    ['endurance', 'Витривалість', 'Довше, швидше, без задишки'], ['general', 'Загальна активність', 'Рух і самопочуття']
  ];
  const LEVELS = [['beginner', 'Початківець', 'Майже не тренувався або була довга перерва'], ['some', 'Є трохи досвіду', 'Тренуюся час від часу, знаю базові вправи'], ['experienced', 'Досвідчений', 'Регулярно тренуюся більше року']];
  const PLACES = [['gym', 'У залі', 'Штанга, тренажери, гантелі'], ['dumbbells', 'Вдома з гантелями', 'Гантелі та власна вага'], ['home', 'Вдома без обладнання', 'Лише власна вага'], ['outdoor', 'На вулиці', 'Турнік, бруси, біг']];
  const SPEC = ['Силові тренування', 'Схуднення', 'Бодибілдинг', 'Функціональний тренінг', 'Реабілітація', 'Бігові види'];
  function athleteSteps() { return ['goal', 'level', 'place', 'schedule', 'body', 'ready']; }
  function coachSteps() { return ['cspec', 'cabout', 'cready']; }
  const stepList = () => (state.role === 'coach' ? coachSteps() : athleteSteps());
  function choiceGrid(name, items, cur) {
    return `<div class="ob-choices" role="radiogroup">${items.map(([v, t, d]) => `<button type="button" class="ob-choice${cur === v ? ' on' : ''}" role="radio" aria-checked="${cur === v}" data-v="${v}"><b>${t}</b><small>${d}</small><span class="ob-tick">${icon('check')}</span></button>`).join('')}</div>`;
  }
  function bindChoices(v, key, autoNext) {
    v.querySelectorAll('.ob-choice').forEach((b) => b.addEventListener('click', () => {
      state.answers[key] = b.dataset.v;
      v.querySelectorAll('.ob-choice').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      const n = v.querySelector('[data-act=next]'); if (n) n.disabled = false;
      if (autoNext) setTimeout(nextStep, reduce ? 0 : 260);
    }));
  }
  function stepChrome(key) {
    const list = stepList(); const i = list.indexOf(key);
    return () => ({ back: i > 0, close: false, progress: (i + 1) / list.length });
  }
  function stepHead(key, title, lead) {
    const list = stepList(); const i = list.indexOf(key);
    return `<p class="ob-step">Крок ${i + 1} з ${list.length}</p><div class="ob-hero"><h1>${title}</h1>${lead ? `<p class="ob-lead">${lead}</p>` : ''}</div>`;
  }
  function nextStep() { const list = stepList(); const i = list.indexOf(state.screen); if (i >= 0 && list[i + 1]) show(list[i + 1]); }
  const footer = (opt) => `<div class="ob-foot">${opt && opt.skip ? '<button type="button" class="ob-btn ob-quiet" data-act="skip">Пропустити</button>' : ''}<button type="button" class="ob-btn ob-primary" data-act="next" ${opt && opt.disabled ? 'disabled' : ''}>${(opt && opt.label) || 'Далі'}</button></div>`;
  function bindFoot(v, beforeNext) {
    const n = v.querySelector('[data-act=next]'); if (n) n.onclick = () => { if (beforeNext && beforeNext() === false) return; nextStep(); };
    const s = v.querySelector('[data-act=skip]'); if (s) s.onclick = nextStep;
  }

  SCREENS.goal = {
    chrome: stepChrome('goal'),
    render: () => stepHead('goal', 'Яка твоя головна мета?', 'Під неї Strenova підбере вправи, підходи та калорії.') + choiceGrid('goal', GOALS, state.answers.goal) + footer({ disabled: !state.answers.goal }) + '<p class="ob-alt"><button type="button" class="ob-link" data-act="later">Налаштую пізніше</button></p>',
    bind(v) { bindChoices(v, 'goal', true); bindFoot(v); v.querySelector('[data-act=later]').onclick = () => finishSetup(true); }
  };
  SCREENS.level = {
    chrome: stepChrome('level'),
    render: () => stepHead('level', 'Який у тебе досвід?', 'Чесна відповідь — безпечніший старт.') + choiceGrid('level', LEVELS, state.answers.level) + footer({ disabled: !state.answers.level }),
    bind(v) { bindChoices(v, 'level', true); bindFoot(v); }
  };
  SCREENS.place = {
    chrome: stepChrome('place'),
    render: () => stepHead('place', 'Де тренуєшся?', 'Підберемо вправи під обладнання, яке є під рукою.') + choiceGrid('place', PLACES, state.answers.place) + footer({ disabled: !state.answers.place }),
    bind(v) { bindChoices(v, 'place', true); bindFoot(v); }
  };
  SCREENS.schedule = {
    chrome: stepChrome('schedule'),
    render: () => {
      const d = state.answers.days || 3, m = state.answers.duration || 60;
      return stepHead('schedule', 'Скільки часу на тренування?', 'Можна змінити будь-коли в профілі.') +
        `<fieldset class="ob-set"><legend>Днів на тиждень</legend><div class="ob-chips" role="radiogroup">${[2, 3, 4, 5, 6].map((n) => `<button type="button" class="ob-chip${d === n ? ' on' : ''}" role="radio" aria-checked="${d === n}" data-days="${n}">${n}</button>`).join('')}</div></fieldset>
        <fieldset class="ob-set"><legend>Хвилин на одне тренування</legend><div class="ob-chips" role="radiogroup">${[30, 45, 60, 75, 90].map((n) => `<button type="button" class="ob-chip${m === n ? ' on' : ''}" role="radio" aria-checked="${m === n}" data-min="${n}">${n}</button>`).join('')}</div></fieldset>
        <p class="ob-summary" id="obSchedSum"></p>` + footer();
    },
    bind(v) {
      state.answers.days = state.answers.days || 3; state.answers.duration = state.answers.duration || 60;
      const sum = () => { $('obSchedSum').textContent = `${state.answers.days} тренування на тиждень по ${state.answers.duration} хв — близько ${Math.round(state.answers.days * state.answers.duration / 60 * 10) / 10} год на тиждень.`; };
      const pick = (attr, key) => v.querySelectorAll(`[data-${attr}]`).forEach((b) => b.addEventListener('click', () => {
        state.answers[key] = Number(b.dataset[attr === 'days' ? 'days' : 'min']);
        v.querySelectorAll(`[data-${attr}]`).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
        sum();
      }));
      pick('days', 'days'); pick('min', 'duration'); sum(); bindFoot(v);
    }
  };
  SCREENS.body = {
    chrome: stepChrome('body'),
    render: () => {
      const a = state.answers; const p = getProfile() || {};
      const val = (k) => a[k] != null ? a[k] : (p[k] || '');
      return stepHead('body', 'Параметри для розрахунку калорій', 'Необов’язково. Без них план працюватиме, але калорії та БЖВ будуть приблизні.') +
        `<form class="ob-form ob-grid2" novalidate>
          <div class="ob-field ob-span2"><label>Стать</label><div class="ob-chips" role="radiogroup">${[['male', 'Чоловіча'], ['female', 'Жіноча'], ['unspecified', 'Не вказувати']].map(([k, t]) => `<button type="button" class="ob-chip wide${(a.sex || p.sex || 'unspecified') === k ? ' on' : ''}" role="radio" aria-checked="${(a.sex || p.sex || 'unspecified') === k}" data-sex="${k}">${t}</button>`).join('')}</div></div>
          ${field('obAge', 'Вік', 'number', { im: 'numeric', val: val('age'), req: false, ph: '25' })}
          ${field('obHeight', 'Зріст, см', 'number', { im: 'numeric', val: val('height'), req: false, ph: '178' })}
          ${field('obWeight', 'Вага, кг', 'number', { im: 'decimal', val: val('weight'), req: false, ph: '75' })}
          ${field('obTarget', 'Бажана вага, кг', 'number', { im: 'decimal', val: val('targetWeight'), req: false, ph: '72' })}
          <div class="ob-field ob-span2"><label for="obAct">Активність поза тренуваннями</label><div class="ob-input"><select id="obAct">${[['sedentary', 'Переважно сиджу'], ['light', 'Трохи ходжу щодня'], ['moderate', 'Помірно активний'], ['active', 'Багато руху щодня'], ['very_active', 'Фізична робота / спорт щодня']].map(([k, t]) => `<option value="${k}"${(a.activity || p.activity || 'moderate') === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div></div>
        </form>` + footer({ skip: true });
    },
    bind(v) {
      v.querySelectorAll('[data-sex]').forEach((b) => b.addEventListener('click', () => { state.answers.sex = b.dataset.sex; v.querySelectorAll('[data-sex]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); }); }));
      bindFoot(v, () => {
        const num = (id) => { const s = $(id).value.trim().replace(',', '.'); return s === '' ? null : Number(s); };
        const age = num('obAge'), h = num('obHeight'), w = num('obWeight'), tw = num('obTarget');
        let bad = null;
        if (age != null && !(age >= 13 && age <= 100)) { setErr('obAge', 'Від 13 до 100.'); bad = bad || 'obAge'; }
        if (h != null && !(h >= 100 && h <= 230)) { setErr('obHeight', 'Від 100 до 230 см.'); bad = bad || 'obHeight'; }
        if (w != null && !(w >= 25 && w <= 300)) { setErr('obWeight', 'Від 25 до 300 кг.'); bad = bad || 'obWeight'; }
        if (tw != null && !(tw >= 25 && tw <= 300)) { setErr('obTarget', 'Від 25 до 300 кг.'); bad = bad || 'obTarget'; }
        if (bad) { $(bad).focus(); return false; }
        Object.assign(state.answers, { age, height: h, weight: w, targetWeight: tw, activity: $('obAct').value });
        return true;
      });
      ['obAge', 'obHeight', 'obWeight', 'obTarget'].forEach((id) => $(id).addEventListener('input', () => setErr(id, '')));
    }
  };
  SCREENS.ready = {
    chrome: () => ({ progress: 1, locked: true }),
    render: () => `<div class="ob-hero ob-center"><span class="ob-badge ob-good">${icon('check')}</span><h1>Готуємо твій план</h1><p class="ob-lead" id="obReadyLead">Зберігаємо відповіді…</p></div>
      <div class="ob-plan" id="obPlan" aria-live="polite"><div class="sx-skel" style="height:22px;width:60%"></div><div class="sx-skel" style="height:16px;width:90%;margin-top:12px"></div><div class="sx-skel" style="height:16px;width:80%;margin-top:8px"></div></div>
      <div class="ob-foot"><button type="button" class="ob-btn ob-ghost" data-act="home" disabled>На головну</button><button type="button" class="ob-btn ob-primary" data-act="plan" disabled>Відкрити план</button></div>`,
    bind(v) { finishSetup(false, v); }
  };

  SCREENS.cspec = {
    chrome: stepChrome('cspec'),
    render: () => stepHead('cspec', 'Твоя спеціалізація', 'Учні побачать її у твоїй картці.') +
      `<div class="ob-chips wrap" role="group" aria-label="Популярні напрями">${SPEC.map((t) => `<button type="button" class="ob-chip wide${state.answers.spec === t ? ' on' : ''}" data-spec="${esc(t)}">${t}</button>`).join('')}</div>
      <form class="ob-form" novalidate>${field('obSpec', 'Або напиши свою', 'text', { val: state.answers.spec || '', req: false, ph: 'Наприклад, пауерліфтинг' })}</form>` + footer() +
      '<p class="ob-alt"><button type="button" class="ob-link" data-act="later">Налаштую пізніше</button></p>',
    bind(v) {
      v.querySelectorAll('[data-spec]').forEach((b) => b.addEventListener('click', () => { $('obSpec').value = b.dataset.spec; v.querySelectorAll('[data-spec]').forEach((x) => x.classList.toggle('on', x === b)); }));
      bindFoot(v, () => { const s = $('obSpec').value.trim(); if (s.length < 2) { setErr('obSpec', 'Обери напрям або напиши свій.'); $('obSpec').focus(); return false; } state.answers.spec = s.slice(0, 120); return true; });
      v.querySelector('[data-act=later]').onclick = () => finishSetup(true);
    }
  };
  SCREENS.cabout = {
    chrome: stepChrome('cabout'),
    render: () => stepHead('cabout', 'Кілька слів про тебе', 'Необов’язково, але учням легше обрати тренера, який розповів про себе.') +
      `<form class="ob-form" novalidate>${field('obYears', 'Років тренерського досвіду', 'number', { im: 'numeric', val: state.answers.years ?? '', req: false, ph: '3' })}
      <div class="ob-field"><label for="obBio">Про себе</label><div class="ob-input"><textarea id="obBio" rows="4" maxlength="1200" placeholder="Сертифікати, з ким працюєш, підхід до тренувань">${esc(state.answers.bio || '')}</textarea></div><p class="ob-err" id="obBioErr"></p></div></form>` + footer({ skip: true }),
    bind(v) {
      bindFoot(v, () => {
        const y = $('obYears').value.trim(); const n = y === '' ? null : Number(y);
        if (n != null && !(Number.isInteger(n) && n >= 0 && n <= 60)) { setErr('obYears', 'Ціле число від 0 до 60.'); $('obYears').focus(); return false; }
        state.answers.years = n; state.answers.bio = $('obBio').value.trim().slice(0, 1200); return true;
      });
      $('obYears').addEventListener('input', () => setErr('obYears', ''));
    }
  };
  SCREENS.cready = {
    chrome: () => ({ progress: 1, locked: true }),
    render: () => `<div class="ob-hero ob-center"><span class="ob-badge ob-good">${icon('check')}</span><h1>Кабінет тренера готовий</h1><p class="ob-lead" id="obReadyLead">Зберігаємо профіль…</p></div>
      <div class="ob-code" id="obCode"><div class="sx-skel" style="height:40px;width:70%;margin:0 auto"></div></div>
      <ol class="ob-howto"><li>Надішли учню код або посилання.</li><li>Учень реєструється й вводить код у розділі «Мій тренер».</li><li>Він з’явиться у твоєму списку — можна вести програму й харчування.</li></ol>
      <div class="ob-foot"><button type="button" class="ob-btn ob-primary" data-act="dash" disabled>Відкрити кабінет</button></div>`,
    bind(v) { finishSetup(false, v); }
  };

  async function coachCode() {
    const u = user(), client = sb(); if (!u || !client) return null;
    const { data } = await client.from('coach_profiles').select('coach_code').eq('user_id', u.id).maybeSingle();
    return data && data.coach_code;
  }
  function inviteLink(code) { return siteUrl() + '?invite=' + encodeURIComponent(code); }

  async function finishSetup(skipped, v) {
    const u = user(); const p = Object.assign({}, getProfile() || {});
    const a = state.answers;
    if (state.role !== 'coach' && !skipped) {
      ['goal', 'level', 'place', 'sex', 'activity'].forEach((k) => { if (a[k]) p[k] = a[k]; });
      ['days', 'duration', 'age', 'height', 'weight', 'targetWeight'].forEach((k) => { if (a[k] != null && a[k] !== '') p[k] = a[k]; });
    }
    p.sxOnboarded = true; p.sxOnboardedAt = new Date().toISOString();
    if (state.role === 'coach' && a.spec) p.coachSpecialization = a.spec;
    try { profile = p; } catch (_) {}
    try { if (typeof daysChosen !== 'undefined' && p.days) daysChosen = p.days; } catch (_) {}
    let saved = true;
    try { if (typeof window.GTSyncProfileToCloud === 'function') saved = (await window.GTSyncProfileToCloud(p)) !== false; else store.set('gtai_profile', p); } catch (_) { saved = false; }
    if (u) store.set('sx_onb_done_' + u.id, true);
    if (state.role === 'coach' && !skipped && sb() && u) {
      const upd = { specialization: a.spec || 'General fitness', bio: a.bio || '', updated_at: new Date().toISOString() };
      if (a.years != null) upd.experience_years = a.years;
      const { error } = await sb().from('coach_profiles').update(upd).eq('user_id', u.id);
      if (error) saved = false;
    }
    try { window.renderHome && window.renderHome(); } catch (_) {}
    try { window.renderPlan && window.renderPlan(); } catch (_) {}
    try { window.gtEstimateNutrition && window.gtEstimateNutrition(); } catch (_) {}
    if (skipped) { delete root.dataset.locked; hide(); window.showPage && window.showPage(state.role === 'coach' ? 'coach-dashboard' : 'home'); return; }
    if (!v) return;
    const lead = $('obReadyLead');
    if (state.role === 'coach') {
      const code = await coachCode();
      lead.textContent = saved ? 'Профіль збережено. Тепер запроси першого учня.' : 'Профіль збережено на пристрої; синхронізуємо, щойно з’явиться зв’язок.';
      const box = $('obCode');
      box.innerHTML = code ? `<small>Твій код тренера</small><b>${esc(code)}</b><div class="ob-code-act"><button type="button" class="ob-btn ob-ghost" data-act="copy">${icon('copy')}Копіювати посилання</button>${navigator.share ? `<button type="button" class="ob-btn ob-ghost" data-act="share">${icon('share')}Поділитися</button>` : ''}</div>` : '<p class="ob-lead">Код з’явиться в кабінеті тренера.</p>';
      const cp = box.querySelector('[data-act=copy]');
      if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(inviteLink(code)); cp.innerHTML = icon('check') + 'Скопійовано'; live('Посилання скопійовано.'); } catch (_) { live('Не вдалося скопіювати. Код: ' + code); } };
      const sh = box.querySelector('[data-act=share]');
      if (sh) sh.onclick = () => navigator.share({ title: 'Strenova', text: `Тренуймося разом у Strenova. Мій код тренера: ${code}`, url: inviteLink(code) }).catch(() => {});
      const d = v.querySelector('[data-act=dash]'); d.disabled = false;
      d.onclick = () => { delete root.dataset.locked; hide(); window.showPage && window.showPage('coach-dashboard'); };
      return;
    }
    let title = 'Стартова програма', desc = '';
    try { if (typeof buildPlan === 'function') { const plan = buildPlan(); title = plan.title || title; } } catch (_) {}
    const goalT = (GOALS.find((g) => g[0] === p.goal) || [])[1] || '';
    const placeT = (PLACES.find((g) => g[0] === p.place) || [])[1] || '';
    desc = [goalT, placeT, `${p.days} дн/тиж`, `${p.duration} хв`].filter(Boolean).join(' · ');
    lead.textContent = saved ? 'План складено й збережено в акаунті.' : 'План збережено на пристрої; синхронізуємо, щойно з’явиться зв’язок.';
    $('obPlan').innerHTML = `<b>${esc(title)}</b><small>${esc(desc)}</small><ul><li>Розклад на ${p.days} ${p.days >= 5 ? 'днів' : 'дні'} на тиждень — відкривається кнопкою «Почати» в плані.</li><li>Калорії й БЖВ розраховано${p.weight ? '' : ' приблизно — додай вагу в профілі для точності'}.</li><li>Відповіді можна змінити в «Профіль» → «Налаштувати програму».</li></ul>`;
    v.querySelectorAll('[data-act=home],[data-act=plan]').forEach((b) => { b.disabled = false; });
    v.querySelector('[data-act=home]').onclick = () => { delete root.dataset.locked; hide(); window.showPage && window.showPage('home'); };
    v.querySelector('[data-act=plan]').onclick = () => { delete root.dataset.locked; hide(); window.showPage && window.showPage('recommend'); };
  }

  /* ---------- when to show what ---------- */
  function currentRole() {
    try { if (window.gcCurrentRole) return window.gcCurrentRole; } catch (_) {}
    const p = getProfile(); return p && p.accountType === 'coach' ? 'coach' : 'athlete';
  }
  function needsSetup(role) {
    const u = user(), p = getProfile(); if (!u || !p) return false;
    if (p.sxOnboarded || store.get('sx_onb_done_' + u.id)) return false;
    if (role === 'coach') return !p.coachSpecialization || p.coachSpecialization === 'General fitness';
    // accounts created by the sign-up trigger keep its defaults until someone sets them
    const fresh = (p.goal || 'general') === 'general' && Number(p.days || 2) === 2 && Number(p.duration || 30) === 30;
    return fresh && getHistory().length === 0;
  }
  async function acceptPendingInvite() {
    const pend = store.get('sx_pending_invite'); const u = user();
    if (!pend || !u || !sb() || currentRole() !== 'athlete') return;
    if (pend.email && u.email && pend.email !== u.email.toLowerCase()) return;
    store.del('sx_pending_invite');
    const { data, error } = await sb().rpc('accept_coach_invite', { p_invite_code: pend.code });
    const toast = window.Strenova && window.Strenova.toast;
    if (error || (data && data.success === false)) { toast && toast('Не вдалося підключитися до тренера за кодом ' + pend.code + '. Спробуй у розділі «Мій тренер».', 'bad'); }
    else toast && toast('Тебе підключено до тренера' + (data && data.coach_name ? ': ' + data.coach_name : '') + '.', 'good');
  }
  let checking = false;
  async function afterSignIn() {
    if (checking) return; checking = true;
    try {
      for (let i = 0; i < 40; i++) { if (getProfile() && (window.gcCurrentRole || i > 12)) break; await new Promise((r) => setTimeout(r, 250)); }
      if (!user()) return;
      if (state.screen === 'reset') return;
      if (state.screen && !['goal', 'level', 'place', 'schedule', 'body', 'ready', 'cspec', 'cabout', 'cready'].includes(state.screen)) hide();
      await acceptPendingInvite();
      const role = currentRole();
      if (needsSetup(role)) { state.role = role === 'coach' ? 'coach' : 'athlete'; state.answers = {}; backStack = []; show(role === 'coach' ? 'cspec' : 'goal', { noPush: true }); }
    } finally { checking = false; }
  }

  /* ---------- hooks into the existing app ---------- */
  window.stEnter = function (mode) {
    window.__stAuth = 1;
    const L = $('stLanding'); if (L) L.hidden = true;
    const g = $('authGate'); if (g) g.hidden = true;
    backStack = []; state.screen = null;
    show(mode === 'login' ? 'login' : 'start', { noPush: true });
  };
  const origGate = window.gtShowGate;
  window.gtShowGate = function (showGate) {
    if (typeof origGate === 'function') origGate(showGate);
    if (showGate && window.__stAuth && !user()) {
      const g = $('authGate'); if (g) g.hidden = true;
      if (!state.screen) show('login', { noPush: true });
    }
  };
  // "?coach=CODE" links from coaches pre-fill the invite for new athletes
  try {
    const q = new URLSearchParams(location.search); const c = q.get('invite') || q.get('coach');
    if (c && /^COACH-[A-Z0-9]{4,12}$/i.test(c)) { state.role = 'athlete'; store.set('sx_pending_invite', { code: c.toUpperCase(), email: '', at: Date.now() }); }
  } catch (_) {}
  function wireAuth() {
    const client = sb(); if (!client || wireAuth.done) return; wireAuth.done = true;
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { const L = $('stLanding'); if (L) L.hidden = true; backStack = []; show('reset', { noPush: true }); return; }
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) setTimeout(afterSignIn, 300);
      if (!session && event === 'SIGNED_OUT') { state.answers = {}; }
    });
    if (typeof client.supabaseUrl === 'string' && /^https:/.test(client.supabaseUrl)) fetch(client.supabaseUrl + '/auth/v1/settings', { headers: { apikey: client.supabaseKey } })
      .then((r) => r.ok ? r.json() : null).then((j) => { googleOn = !!(j && j.external && j.external.google); }).catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireAuth); else wireAuth();
  setTimeout(wireAuth, 800);

  // "Change my answers later": a card in Profile reopens the setup
  function mountProfileCard() {
    const page = $('profile'); if (!page || !user() || $('sxSetupCard')) return;
    const card = document.createElement('section'); card.id = 'sxSetupCard'; card.className = 'sx-card'; card.setAttribute('data-no-autotranslate', '');
    card.innerHTML = '<div class="sx-between"><div><h3>Налаштувати програму</h3><p class="sx-sub">Мета, досвід, місце, розклад і параметри тіла — у кілька кроків.</p></div><button type="button" class="sx-btn small" data-act="redo">Змінити</button></div>';
    page.insertBefore(card, page.firstElementChild ? page.firstElementChild.nextElementSibling : null);
    card.querySelector('[data-act=redo]').onclick = () => {
      const p = getProfile() || {}; const role = currentRole();
      state.role = role === 'coach' ? 'coach' : 'athlete';
      state.answers = { goal: p.goal, level: p.level, place: p.place, days: Number(p.days) || 3, duration: Number(p.duration) || 60, sex: p.sex, activity: p.activity, spec: p.coachSpecialization };
      backStack = []; show(state.role === 'coach' ? 'cspec' : 'goal', { noPush: true });
    };
  }
  document.addEventListener('sx:page', (e) => { if (e.detail && e.detail.id === 'profile') mountProfileCard(); });
  const sp = window.showPage;
  if (typeof sp === 'function' && !sp.__ob) { const w = function (id) { const r = sp.apply(this, arguments); if (id === 'profile') setTimeout(mountProfileCard, 50); return r; }; w.__ob = true; window.showPage = w; }

  window.StrenovaOnboarding = { open: (m) => window.stEnter(m), show, needsSetup, afterSignIn };
})();
