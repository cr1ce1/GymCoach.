/* =====================================================================
   STRENOVA APP LAYER v2 (2026-11-16)
   - shared helpers (escape, toast, icons, page events)
   - account role card (replaces the old observer that re-queried
     Supabase on every DOM mutation)
   - coach workspace: clients, client detail, visual program editor,
     nutrition targets, calendar
   - athlete side: coach connection, coach targets, assigned programs
   ===================================================================== */
(function () {
  'use strict';
  const S = (window.Strenova = window.Strenova || {});
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sb = () => { try { return typeof gtSupabase !== 'undefined' ? gtSupabase : null; } catch (_) { return null; } };
  const me = () => { try { return typeof gtUser !== 'undefined' ? gtUser : null; } catch (_) { return null; } };
  const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
  const fmtDate = (d, opts) => { try { return new Date(d).toLocaleDateString('uk-UA', opts || { day: 'numeric', month: 'short' }); } catch (_) { return ''; } };
  const today = () => new Date().toISOString().slice(0, 10);
  S.esc = esc; S.sb = sb; S.me = me;

  /* ---------- icons (one stroke family, 1.8px) ---------- */
  const P = {
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    up: '<path d="M18 15l-6-6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
    share: '<path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M12 3v12M7 8l5-5 5 5"/>',
    play: '<path d="M7 5v14l11-7z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    focus: '<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><circle cx="12" cy="12" r="3"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
  S.icon = icon;

  /* ---------- toast ---------- */
  let toastEl = null, toastTimer = null;
  S.toast = function (msg, kind) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'sx-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.className = 'sx-toast show ' + (kind || '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.className = 'sx-toast'; }, 2600);
  };
  const setStatus = (el, msg, kind) => { if (!el) return; el.textContent = msg || ''; el.className = 'sx-status ' + (kind || ''); };

  S.copy = async function (text, okMsg) {
    try { await navigator.clipboard.writeText(text); }
    catch (_) { const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (__) {} t.remove(); }
    S.toast(okMsg || 'Скопійовано', 'good');
  };
  // Replace blocking alert() in the older copy helper with a toast.
  window.gcCopyText = (text) => S.copy(text);

  /* ---------- page change events ---------- */
  function hookShowPage() {
    const original = window.showPage;
    if (typeof original !== 'function' || original.__sxHooked) return;
    const hooked = function (id) {
      const r = original.apply(this, arguments);
      try { document.dispatchEvent(new CustomEvent('sx:page', { detail: { id } })); } catch (_) {}
      return r;
    };
    hooked.__sxHooked = true;
    window.showPage = hooked;
  }
  S.onPage = (fn) => document.addEventListener('sx:page', (e) => fn(e.detail.id));

  /* =====================================================================
     ACCOUNT ROLE CARD (profile)
     ===================================================================== */
  function mountRoleCard() {
    const page = $('profile'); const role = window.gcCurrentRole;
    if (!page || !role || !me()) return;
    let card = $('gcAccountRoleCard');
    if (!card) { card = document.createElement('section'); card.id = 'gcAccountRoleCard'; card.className = 'sx-card'; page.appendChild(card); }
    if (card.dataset.role === role) return;
    card.dataset.role = role;
    if (role === 'admin') { card.innerHTML = '<h3>Тип акаунта</h3><p class="sx-sub">Адміністративні права змінюються лише на сервері.</p>'; return; }
    card.innerHTML = `<h3>Тип акаунта</h3>
      <p class="sx-sub">Атлет тренується за планом. Тренер веде учнів, складає програми й цілі харчування. Дані, історія та Plus зберігаються під час перемикання.</p>
      <div class="sx-seg" role="tablist" aria-label="Тип акаунта" style="margin-top:12px">
        <button type="button" role="tab" data-role="athlete" aria-selected="${role === 'athlete'}">Атлет</button>
        <button type="button" role="tab" data-role="coach" aria-selected="${role === 'coach'}">Тренер</button>
      </div><p class="sx-status" id="sxRoleStatus" role="status"></p>`;
    card.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', async () => {
      const next = b.dataset.role; if (next === window.gcCurrentRole) return;
      const msg = next === 'coach' ? 'Перемкнути акаунт на тренера? Твої тренування й дані залишаться.' : 'Перемкнути акаунт на атлета? Зв’язки з учнями збережуться, але керування ними буде призупинено.';
      if (!confirm(msg)) return;
      setStatus($('sxRoleStatus'), 'Змінюємо тип акаунта…');
      const { error } = await sb().rpc('set_my_account_role', { p_role: next });
      if (error) { setStatus($('sxRoleStatus'), 'Не вдалося змінити: ' + error.message, 'bad'); return; }
      setStatus($('sxRoleStatus'), 'Готово. Оновлюємо кабінет…', 'good');
      location.reload();
    }));
  }

  /* =====================================================================
     EXERCISE NAME SOURCE (for editor suggestions + technique)
     ===================================================================== */
  S.library = function () {
    try { return Array.isArray(libraryExercises) ? libraryExercises : []; } catch (_) { return []; }
  };
  S.findTechnique = function (name, enName) {
    const n = String(name || '').toLowerCase().trim(), e = String(enName || '').toLowerCase().trim();
    return S.library().find((x) => String(x.name || '').toLowerCase() === n || (e && String(x.en || '').toLowerCase() === e) || String(x.en || '').toLowerCase() === n) || null;
  };
  function exerciseDatalist() {
    if ($('sxExerciseNames')) return;
    const dl = document.createElement('datalist'); dl.id = 'sxExerciseNames';
    const names = [...new Set(S.library().map((x) => x.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uk'));
    dl.innerHTML = names.map((n) => `<option value="${esc(n)}"></option>`).join('');
    document.body.appendChild(dl);
  }

  /* =====================================================================
     COACH WORKSPACE
     ===================================================================== */
  const CATEGORIES = [['strength', 'Сила'], ['hypertrophy', 'Маса'], ['fat-loss', 'Схуднення'], ['full-body', 'Все тіло'], ['upper', 'Верх тіла'], ['lower', 'Низ тіла'], ['push', 'Жим'], ['pull', 'Тяга'], ['legs', 'Ноги'], ['mobility', 'Мобільність'], ['cardio', 'Кардіо'], ['other', 'Інше']];
  const catLabel = (c) => (CATEGORIES.find((x) => x[0] === c) || [c, c || 'Програма'])[1];
  const STATUS = { assigned: ['Призначено', 'violet'], in_progress: ['Виконується', 'amber'], completed: ['Виконано', 'mint'], cancelled: ['Скасовано', ''] };
  const C = { u: null, athletes: [], logs: [], programs: [], assignments: [], view: 'clients', clientId: null, tab: 'progress', draft: null, cache: {} };
  const nameOf = (a) => a?.profile?.name || a?.profile?.email || 'Учень';
  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?';

  async function coachLoad() {
    const s = sb(), u = C.u;
    const [cp, inv, rels, progs, asg] = await Promise.all([
      s.from('coach_profiles').select('coach_code,specialization,experience_years,bio').eq('user_id', u.id).maybeSingle(),
      s.from('coach_invites').select('invite_code').eq('coach_id', u.id).eq('is_active', true).limit(1).maybeSingle(),
      s.from('athlete_coach_relationships').select('id,athlete_id,status,created_at').eq('coach_id', u.id).eq('status', 'active').order('created_at', { ascending: false }),
      s.from('workout_programs').select('id,name,category,description,exercises,exercise_count,updated_at').eq('coach_id', u.id).order('updated_at', { ascending: false }).limit(200),
      s.from('assigned_workouts').select('id,program_id,athlete_user_id,status,due_date,notes,assigned_at').eq('coach_id', u.id).neq('status', 'cancelled').order('assigned_at', { ascending: false }).limit(300)
    ]);
    if (rels.error) throw rels.error;
    C.coach = cp.data || {}; C.code = inv.data?.invite_code || cp.data?.coach_code || '';
    C.programs = progs.data || []; C.assignments = asg.data || [];
    const ids = (rels.data || []).map((r) => r.athlete_id);
    C.athletes = []; C.logs = [];
    if (ids.length) {
      const [pr, lg] = await Promise.all([
        s.from('user_profiles').select('user_id,profile').in('user_id', ids),
        s.from('workout_logs').select('id,user_id,title,created_at,completed_exercises,minutes,details').in('user_id', ids).order('created_at', { ascending: false }).limit(400)
      ]);
      const pmap = new Map((pr.data || []).map((p) => [p.user_id, p.profile || {}]));
      C.athletes = (rels.data || []).map((r) => ({ id: r.athlete_id, rel: r, profile: pmap.get(r.athlete_id) || {} }));
      C.logs = lg.data || [];
    }
  }

  function coachRoot() { return $('coach-dashboardContent'); }

  S.coachMount = async function (u) {
    const root = coachRoot(); if (!root || !sb() || !u) return;
    C.u = u; exerciseDatalist();
    root.innerHTML = '<div class="sx-ws"><p class="sx-sub">Завантажуємо учнів…</p></div>';
    try { await coachLoad(); } catch (e) { root.innerHTML = `<div class="sx-ws"><div class="sx-card"><h3>Не вдалося завантажити кабінет</h3><p class="sx-sub">${esc(e.message || e)}</p><button class="sx-btn ghost" type="button" data-act="retry">Спробувати ще раз</button></div></div>`; root.querySelector('[data-act=retry]').onclick = () => S.coachMount(u); return; }
    coachRender();
  };

  function logsFor(id) { return C.logs.filter((l) => l.user_id === id); }
  function weekBuckets(logs, weeks) {
    const out = Array(weeks).fill(0); const now = Date.now(), wk = 7 * 864e5;
    logs.forEach((l) => { const i = Math.floor((now - new Date(l.created_at).getTime()) / wk); if (i >= 0 && i < weeks) out[weeks - 1 - i]++; });
    return out;
  }

  function coachRender() {
    const root = coachRoot(); if (!root) return;
    if (C.view === 'client' && C.clientId) return renderClient(root);
    if (C.view === 'editor' && C.draft) return renderEditor(root);
    const link = new URL(location.origin + location.pathname); link.searchParams.set('invite', C.code);
    const week = C.logs.filter((l) => Date.now() - new Date(l.created_at).getTime() < 7 * 864e5).length;
    root.innerHTML = `<div class="sx-ws">
      <div class="sx-ws-head"><h2>Мої учні</h2><p class="sx-sub">Запрошуй учнів кодом, веди програми й цілі харчування.</p></div>
      <section class="sx-invite" aria-label="Код тренера">
        <div class="sx-between"><div><p class="sx-sub">Твій код тренера</p><div class="sx-invite-code">${esc(C.code || '—')}</div></div></div>
        <div class="sx-row">
          <button class="sx-btn small" type="button" data-act="share">${icon('share')}Поділитися посиланням</button>
          <button class="sx-btn small ghost" type="button" data-act="copy">${icon('copy')}Копіювати код</button>
        </div>
        <p class="sx-sub">Учень вводить код у розділі «Мій тренер» або відкриває посилання. Підключення відбувається лише після його підтвердження.</p>
      </section>
      <div class="sx-kpis">
        <div class="sx-kpi"><b>${C.athletes.length}</b><span>учнів</span></div>
        <div class="sx-kpi"><b>${week}</b><span>тренувань за 7 днів</span></div>
        <div class="sx-kpi"><b>${C.programs.length}</b><span>програм</span></div>
      </div>
      <div class="sx-seg" role="tablist" aria-label="Розділ">
        <button type="button" role="tab" data-view="clients" aria-selected="${C.view !== 'programs'}">Учні</button>
        <button type="button" role="tab" data-view="programs" aria-selected="${C.view === 'programs'}">Програми</button>
      </div>
      <div id="sxCoachBody"></div></div>`;
    root.querySelector('[data-act=copy]').onclick = () => S.copy(C.code, 'Код скопійовано');
    root.querySelector('[data-act=share]').onclick = async () => {
      const url = link.toString();
      if (navigator.share) { try { await navigator.share({ title: 'Strenova', text: 'Підключайся до мене в Strenova. Код тренера: ' + C.code, url }); return; } catch (_) { return; } }
      S.copy(url, 'Посилання скопійовано');
    };
    root.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { C.view = b.dataset.view; coachRender(); });
    const body = $('sxCoachBody');
    if (C.view === 'programs') return renderProgramList(body);
    if (!C.athletes.length) { body.innerHTML = '<div class="sx-empty">Поки немає учнів. Надішли код або посилання — учень з’явиться тут одразу після підключення.</div>'; return; }
    body.innerHTML = '<div class="sx-list">' + C.athletes.map((a) => {
      const l = logsFor(a.id); const last = l[0];
      const active = C.assignments.filter((x) => x.athlete_user_id === a.id).length;
      return `<button type="button" class="sx-item tap" data-client="${esc(a.id)}"><span class="sx-avatar">${esc(initials(nameOf(a)))}</span>
        <span class="sx-grow"><b>${esc(nameOf(a))}</b><small>${last ? 'Останнє тренування ' + esc(fmtDate(last.created_at)) : 'Ще без тренувань'} · програм: ${active}</small></span>${icon('right')}</button>`;
    }).join('') + '</div>';
    body.querySelectorAll('[data-client]').forEach((b) => b.onclick = () => { C.clientId = b.dataset.client; C.view = 'client'; C.tab = 'progress'; coachRender(); window.scrollTo({ top: 0 }); });
  }

  function renderProgramList(body) {
    body.innerHTML = `<div class="sx-stack"><button class="sx-btn block" type="button" data-act="new">${icon('plus')}Нова програма</button>
      ${C.programs.length ? '<div class="sx-list">' + C.programs.map((p) => `<div class="sx-item"><span class="sx-grow"><b>${esc(p.name)}</b><small>${esc(catLabel(p.category))} · ${(p.exercises || []).length} вправ · оновлено ${esc(fmtDate(p.updated_at))}</small></span>
        <button class="sx-icon-btn" type="button" data-edit="${esc(p.id)}" aria-label="Редагувати ${esc(p.name)}">${icon('edit')}</button>
        <button class="sx-icon-btn" type="button" data-dup="${esc(p.id)}" aria-label="Дублювати ${esc(p.name)}">${icon('copy')}</button></div>`).join('') + '</div>' : '<div class="sx-empty">Створи першу програму: додай вправи, підходи, повторення та робочу вагу.</div>'}</div>`;
    body.querySelector('[data-act=new]').onclick = () => openEditor(null);
    body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => openEditor(C.programs.find((p) => p.id === b.dataset.edit)));
    body.querySelectorAll('[data-dup]').forEach((b) => b.onclick = () => { const p = C.programs.find((x) => x.id === b.dataset.dup); openEditor({ ...p, id: null, name: (p.name + ' (копія)').slice(0, 120) }); });
  }

  /* ---------- program editor ---------- */
  function normaliseExercise(e) {
    const reps = String(e?.reps ?? '').replace(/\s*повторень|\s*повторення/g, '').trim();
    return { name: String(e?.name || '').slice(0, 120), sets: Math.max(1, Math.min(10, Number(e?.sets) || 3)), reps: reps || '8–12', weight: num(e?.weight) ?? '', rest: Number(e?.rest) || 90, notes: String(e?.notes || e?.muscles || '').slice(0, 300) };
  }
  function openEditor(p, opts) {
    C.draft = { id: p?.id || null, name: p?.name || '', category: p?.category || 'strength', description: p?.description || '', exercises: (p?.exercises?.length ? p.exercises : [{}]).map(normaliseExercise), assignTo: opts?.assignTo || null, back: C.view === 'client' ? 'client' : 'programs' };
    C.view = 'editor'; coachRender(); window.scrollTo({ top: 0 });
  }
  function readEditor(root) {
    const d = C.draft;
    d.name = root.querySelector('#sxPName').value.trim().slice(0, 120);
    d.category = root.querySelector('#sxPCat').value;
    d.description = root.querySelector('#sxPDesc').value.trim().slice(0, 1000);
    d.exercises = [...root.querySelectorAll('.sx-ex-edit')].map((row) => ({
      name: row.querySelector('[data-f=name]').value.trim().slice(0, 120),
      sets: Math.max(1, Math.min(10, Number(row.querySelector('[data-f=sets]').value) || 1)),
      reps: row.querySelector('[data-f=reps]').value.trim().slice(0, 20) || '8–12',
      weight: num(row.querySelector('[data-f=weight]').value) ?? '',
      rest: Math.max(0, Math.min(600, Number(row.querySelector('[data-f=rest]').value) || 0)),
      notes: row.querySelector('[data-f=notes]').value.trim().slice(0, 300)
    }));
  }
  function renderEditor(root) {
    const d = C.draft;
    const client = d.assignTo ? C.athletes.find((a) => a.id === d.assignTo) : null;
    root.innerHTML = `<div class="sx-ws">
      <div class="sx-row"><button class="sx-btn small quiet" type="button" data-act="back">${icon('left')}Назад</button></div>
      <div class="sx-ws-head"><h2>${d.id ? 'Редагування програми' : 'Нова програма'}</h2>${client ? `<p class="sx-sub">Після збереження буде призначена: ${esc(nameOf(client))}</p>` : ''}</div>
      <div class="sx-card sx-stack">
        <label class="sx-field"><span>Назва</span><input id="sxPName" maxlength="120" required value="${esc(d.name)}" placeholder="Наприклад, Сила · день А"></label>
        <label class="sx-field"><span>Напрям</span><select id="sxPCat">${CATEGORIES.map(([v, l]) => `<option value="${v}" ${v === d.category ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="sx-field"><span>Коментар для учня (необов’язково)</span><textarea id="sxPDesc" maxlength="1000" rows="2" placeholder="Темп, розминка, на що звернути увагу">${esc(d.description)}</textarea></label>
      </div>
      <div class="sx-between"><h3 style="margin:0">Вправи · ${d.exercises.length}</h3></div>
      <div class="sx-stack" id="sxExList">${d.exercises.map((e, i) => `<div class="sx-ex-edit" data-i="${i}">
          <div class="sx-ex-edit-top"><span class="sx-set-n">${i + 1}</span><input data-f="name" list="sxExerciseNames" maxlength="120" value="${esc(e.name)}" placeholder="Назва вправи" aria-label="Назва вправи ${i + 1}">
            <div class="sx-ex-edit-actions"><button class="sx-icon-btn" type="button" data-move="-1" aria-label="Вище">${icon('up')}</button><button class="sx-icon-btn" type="button" data-move="1" aria-label="Нижче">${icon('down')}</button><button class="sx-icon-btn" type="button" data-del aria-label="Видалити вправу">${icon('trash')}</button></div></div>
          <div class="sx-ex-edit-grid">
            <label>Підходи<input data-f="sets" type="number" inputmode="numeric" min="1" max="10" value="${esc(e.sets)}"></label>
            <label>Повторення<input data-f="reps" maxlength="20" value="${esc(e.reps)}" placeholder="8–12"></label>
            <label>Вага, кг<input data-f="weight" type="number" inputmode="decimal" min="0" max="500" step="0.5" value="${esc(e.weight)}" placeholder="—"></label>
            <label>Відпочинок, с<input data-f="rest" type="number" inputmode="numeric" min="0" max="600" step="15" value="${esc(e.rest)}"></label>
          </div>
          <input data-f="notes" maxlength="300" value="${esc(e.notes)}" placeholder="Підказка до техніки (необов’язково)" aria-label="Підказка до вправи ${i + 1}">
        </div>`).join('')}</div>
      <button class="sx-btn ghost block" type="button" data-act="add">${icon('plus')}Додати вправу</button>
      ${d.id ? `<button class="sx-btn danger block" type="button" data-act="delete">${icon('trash')}Видалити програму</button>` : ''}
      <p class="sx-status" id="sxPStatus" role="status"></p>
      <div class="sx-sticky-save"><button class="sx-btn" type="button" data-act="save">${icon('check')}${d.assignTo ? 'Зберегти й призначити' : 'Зберегти програму'}</button></div>
    </div>`;
    root.querySelector('[data-act=back]').onclick = () => { C.view = d.back; C.draft = null; coachRender(); };
    root.querySelector('[data-act=add]').onclick = () => { readEditor(root); d.exercises.push(normaliseExercise({})); renderEditor(root); const inputs = root.querySelectorAll('[data-f=name]'); inputs[inputs.length - 1]?.focus(); };
    root.querySelectorAll('.sx-ex-edit').forEach((row) => {
      const i = Number(row.dataset.i);
      row.querySelector('[data-del]').onclick = () => { readEditor(root); if (d.exercises.length === 1) { S.toast('У програмі має бути хоча б одна вправа', 'bad'); return; } d.exercises.splice(i, 1); renderEditor(root); };
      row.querySelectorAll('[data-move]').forEach((b) => b.onclick = () => { readEditor(root); const j = i + Number(b.dataset.move); if (j < 0 || j >= d.exercises.length) return; [d.exercises[i], d.exercises[j]] = [d.exercises[j], d.exercises[i]]; renderEditor(root); });
    });
    const del = root.querySelector('[data-act=delete]');
    if (del) del.onclick = async () => {
      if (!confirm('Видалити програму? Учні, яким її призначено, більше її не побачать.')) return;
      const { error } = await sb().from('workout_programs').delete().eq('id', d.id).eq('coach_id', C.u.id);
      if (error) { setStatus($('sxPStatus'), 'Не вдалося видалити: ' + error.message, 'bad'); return; }
      S.toast('Програму видалено', 'good'); C.draft = null; C.view = 'programs'; await coachLoad(); coachRender();
    };
    root.querySelector('[data-act=save]').onclick = async (ev) => {
      readEditor(root);
      const exercises = d.exercises.filter((e) => e.name);
      if (!d.name) { setStatus($('sxPStatus'), 'Вкажи назву програми.', 'bad'); root.querySelector('#sxPName').focus(); return; }
      if (!exercises.length) { setStatus($('sxPStatus'), 'Додай хоча б одну вправу з назвою.', 'bad'); return; }
      const btn = ev.currentTarget; btn.disabled = true; setStatus($('sxPStatus'), 'Зберігаємо…');
      const payload = { name: d.name, category: d.category, description: d.description, exercises, exercise_count: exercises.length, updated_at: new Date().toISOString() };
      let res;
      if (d.id) res = await sb().from('workout_programs').update(payload).eq('id', d.id).eq('coach_id', C.u.id).select('id').single();
      else res = await sb().from('workout_programs').insert({ ...payload, coach_id: C.u.id, variation: 'Coach', difficulty: 'beginner' }).select('id').single();
      if (res.error) {
        btn.disabled = false;
        const tooMany = /exercise_count_check|exercises_check/.test(res.error.message || '');
        setStatus($('sxPStatus'), tooMany ? 'База даних поки приймає лише 2–4 вправи в програмі. Потрібно застосувати міграцію 20261116130000_strenova_launch_hardening.sql.' : 'Не вдалося зберегти: ' + res.error.message, 'bad');
        return;
      }
      if (d.assignTo) {
        const a = await sb().from('assigned_workouts').insert({ program_id: res.data.id, coach_id: C.u.id, athlete_user_id: d.assignTo });
        if (a.error) { btn.disabled = false; setStatus($('sxPStatus'), 'Програму збережено, але не призначено: ' + a.error.message, 'bad'); return; }
      }
      S.toast(d.assignTo ? 'Програму збережено й призначено' : 'Програму збережено', 'good');
      const back = d.back; C.draft = null; C.view = back; await coachLoad(); coachRender();
    };
  }

  /* ---------- client detail ---------- */
  function renderClient(root) {
    const a = C.athletes.find((x) => x.id === C.clientId);
    if (!a) { C.view = 'clients'; return coachRender(); }
    const p = a.profile || {}; const logs = logsFor(a.id);
    const facts = [p.age && p.age + ' р.', p.height && p.height + ' см', p.weight && p.weight + ' кг', p.targetWeight && 'ціль ' + p.targetWeight + ' кг'].filter(Boolean).join(' · ');
    root.innerHTML = `<div class="sx-ws">
      <div class="sx-row"><button class="sx-btn small quiet" type="button" data-act="back">${icon('left')}Усі учні</button></div>
      <div class="sx-row" style="gap:14px"><span class="sx-avatar" style="width:56px;height:56px;font-size:1.1rem">${esc(initials(nameOf(a)))}</span>
        <div style="min-width:0"><h2 style="margin:0">${esc(nameOf(a))}</h2><p class="sx-sub">${esc(facts || 'Параметри тіла ще не заповнені')}</p></div></div>
      <div class="sx-seg" role="tablist" aria-label="Розділи учня">
        ${[['progress', 'Прогрес'], ['programs', 'Програми'], ['nutrition', 'Харчування'], ['calendar', 'Календар']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${C.tab === k}">${l}</button>`).join('')}
      </div>
      <div id="sxClientBody"></div></div>`;
    root.querySelector('[data-act=back]').onclick = () => { C.view = 'clients'; coachRender(); };
    root.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { C.tab = b.dataset.tab; renderClient(root); });
    const body = $('sxClientBody');
    if (C.tab === 'progress') return clientProgress(body, a, logs);
    if (C.tab === 'programs') return clientPrograms(body, a);
    if (C.tab === 'nutrition') return clientNutrition(body, a);
    if (C.tab === 'calendar') return clientCalendar(body, a);
  }

  function topLifts(logs) {
    const best = new Map();
    logs.forEach((l) => (l.details?.exercises || []).forEach((e) => (e.sets || e.setLog || []).forEach((s) => {
      const w = Number(s.weight) || 0; if (!w) return; const k = e.name || e.exercise; const cur = best.get(k);
      if (!cur || w > cur.w) best.set(k, { w, reps: s.reps, at: l.created_at });
    })));
    return [...best.entries()].sort((x, y) => y[1].w - x[1].w).slice(0, 6);
  }
  function clientProgress(body, a, logs) {
    const weeks = weekBuckets(logs, 8), max = Math.max(1, ...weeks);
    const mins = logs.slice(0, 20).reduce((s, l) => s + (Number(l.minutes) || 0), 0);
    const lifts = topLifts(logs);
    body.innerHTML = `<div class="sx-stack">
      <div class="sx-kpis"><div class="sx-kpi"><b>${logs.length}</b><span>тренувань</span></div><div class="sx-kpi"><b>${weeks[7]}</b><span>цього тижня</span></div><div class="sx-kpi"><b>${logs.length ? Math.round(mins / Math.min(20, logs.length)) : 0}</b><span>хв у середньому</span></div></div>
      <div class="sx-card"><h3>Регулярність, 8 тижнів</h3>
        <div class="sx-bars" role="img" aria-label="Тренувань по тижнях: ${weeks.join(', ')}">${weeks.map((w) => `<i class="${w ? '' : 'zero'}" style="height:${Math.max(6, (w / max) * 100)}%" title="${w}"></i>`).join('')}</div>
        <div class="sx-bars-labels">${weeks.map((w, i) => `<span>${i === 7 ? 'зараз' : w}</span>`).join('')}</div></div>
      ${lifts.length ? `<div class="sx-card"><h3>Найкращі робочі ваги</h3><div class="sx-list">${lifts.map(([n, v]) => `<div class="sx-item"><span class="sx-grow"><b>${esc(n)}</b><small>${esc(fmtDate(v.at))}</small></span><span class="sx-num">${esc(v.w)} кг × ${esc(v.reps || '—')}</span></div>`).join('')}</div></div>` : ''}
      <div class="sx-card"><h3>Останні тренування</h3>${logs.length ? '<div class="sx-list">' + logs.slice(0, 12).map((l) => `<div class="sx-item"><span class="sx-grow"><b>${esc(l.title || 'Тренування')}</b><small>${esc(fmtDate(l.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))} · вправ: ${esc(l.completed_exercises || 0)}${l.minutes ? ' · ' + esc(l.minutes) + ' хв' : ''}</small></span></div>`).join('') + '</div>' : '<div class="sx-empty">Учень ще не зберіг жодного тренування.</div>'}</div>
    </div>`;
  }

  function clientPrograms(body, a) {
    const list = C.assignments.filter((x) => x.athlete_user_id === a.id);
    const pmap = new Map(C.programs.map((p) => [p.id, p]));
    body.innerHTML = `<div class="sx-stack">
      <div class="sx-card sx-stack"><h3>Призначити програму</h3>
        ${C.programs.length ? `<label class="sx-field"><span>Програма</span><select id="sxAssignSel">${C.programs.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${(p.exercises || []).length} вправ</option>`).join('')}</select></label>
        <label class="sx-field"><span>Виконати до (необов’язково)</span><input id="sxAssignDue" type="date" min="${today()}"></label>
        <div class="sx-row"><button class="sx-btn" type="button" data-act="assign">${icon('check')}Призначити</button><button class="sx-btn ghost" type="button" data-act="edit-sel">${icon('edit')}Редагувати</button></div>` : '<p class="sx-sub">У тебе ще немає програм.</p>'}
        <button class="sx-btn ghost" type="button" data-act="new">${icon('plus')}Створити програму для ${esc(nameOf(a))}</button>
        <p class="sx-status" id="sxAssignStatus" role="status"></p></div>
      <div class="sx-card"><h3>Призначено</h3>${list.length ? '<div class="sx-list">' + list.map((x) => { const p = pmap.get(x.program_id); const st = STATUS[x.status] || [x.status, '']; return `<div class="sx-item"><span class="sx-grow"><b>${esc(p?.name || 'Програма')}</b><small>${(p?.exercises || []).length} вправ${x.due_date ? ' · до ' + esc(fmtDate(x.due_date)) : ''}</small></span><span class="sx-badge ${st[1]}">${esc(st[0])}</span>
        ${p ? `<button class="sx-icon-btn" type="button" data-editp="${esc(p.id)}" aria-label="Редагувати програму">${icon('edit')}</button>` : ''}<button class="sx-icon-btn" type="button" data-cancel="${esc(x.id)}" aria-label="Скасувати призначення">${icon('x')}</button></div>`; }).join('') + '</div>' : '<div class="sx-empty">Учню ще не призначено жодної програми.</div>'}</div></div>`;
    const sel = $('sxAssignSel');
    body.querySelector('[data-act=new]').onclick = () => openEditor(null, { assignTo: a.id });
    const editSel = body.querySelector('[data-act=edit-sel]'); if (editSel) editSel.onclick = () => openEditor(C.programs.find((p) => p.id === sel.value));
    body.querySelectorAll('[data-editp]').forEach((b) => b.onclick = () => openEditor(C.programs.find((p) => p.id === b.dataset.editp)));
    const assign = body.querySelector('[data-act=assign]');
    if (assign) assign.onclick = async () => {
      assign.disabled = true;
      const { error } = await sb().from('assigned_workouts').insert({ program_id: sel.value, coach_id: C.u.id, athlete_user_id: a.id, due_date: $('sxAssignDue').value || null });
      assign.disabled = false;
      if (error) { setStatus($('sxAssignStatus'), 'Не вдалося призначити: ' + error.message, 'bad'); return; }
      S.toast('Програму призначено', 'good'); await coachLoad(); renderClient(coachRoot());
    };
    body.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = async () => {
      if (!confirm('Скасувати це призначення?')) return;
      const { error } = await sb().from('assigned_workouts').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', b.dataset.cancel).eq('coach_id', C.u.id);
      if (error) { S.toast('Не вдалося: ' + error.message, 'bad'); return; }
      S.toast('Призначення скасовано'); await coachLoad(); renderClient(coachRoot());
    });
  }

  async function clientNutrition(body, a) {
    body.innerHTML = '<p class="sx-sub">Завантажуємо…</p>';
    const [t, h] = await Promise.all([
      sb().from('athlete_nutrition_targets').select('*').eq('athlete_id', a.id).maybeSingle(),
      sb().from('athlete_nutrition_history').select('id,calories_kcal,protein_g,fat_g,carbs_g,water_ml,changed_at').eq('athlete_id', a.id).order('changed_at', { ascending: false }).limit(6)
    ]);
    const n = t.data || {};
    const field = (id, label, v, max, step) => `<label class="sx-field"><span>${label}</span><input id="${id}" type="number" inputmode="decimal" min="0" max="${max}" step="${step}" value="${esc(v ?? '')}"></label>`;
    body.innerHTML = `<div class="sx-stack"><div class="sx-card sx-stack"><div><h3>Ціль харчування на день</h3><p class="sx-sub">Учень бачить ці значення у своєму розділі «Харчування».</p></div>
      ${field('sxNKcal', 'Калорії, ккал', n.calories_kcal, 20000, 10)}
      <div class="sx-grid3">${field('sxNP', 'Білки, г', n.protein_g, 2000, 1)}${field('sxNF', 'Жири, г', n.fat_g, 2000, 1)}${field('sxNC', 'Вуглеводи, г', n.carbs_g, 3000, 1)}</div>
      ${field('sxNW', 'Вода, мл', n.water_ml, 20000, 50)}
      <p class="sx-sub" id="sxNCheck"></p>
      <label class="sx-field"><span>План харчування / коментар</span><textarea id="sxNNotes" maxlength="1000" rows="4" placeholder="Наприклад: 4 прийоми їжі, білок у кожному, овочі двічі на день">${esc(n.notes || '')}</textarea></label>
      <button class="sx-btn" type="button" data-act="save">${icon('check')}Зберегти ціль</button><p class="sx-status" id="sxNStatus" role="status"></p></div>
      <div class="sx-card"><h3>Історія змін</h3>${(h.data || []).length ? '<div class="sx-list">' + h.data.map((x) => `<div class="sx-item"><span class="sx-grow"><b>${esc(x.calories_kcal ?? '—')} ккал</b><small>Б ${esc(x.protein_g ?? '—')} · Ж ${esc(x.fat_g ?? '—')} · В ${esc(x.carbs_g ?? '—')} · вода ${esc(x.water_ml ?? '—')} мл</small></span><small>${esc(fmtDate(x.changed_at))}</small></div>`).join('') + '</div>' : '<div class="sx-empty">Змін ще не було.</div>'}</div></div>`;
    const check = () => { const p = Number($('sxNP').value) || 0, f = Number($('sxNF').value) || 0, c = Number($('sxNC').value) || 0, k = Number($('sxNKcal').value) || 0; const est = Math.round(p * 4 + f * 9 + c * 4); $('sxNCheck').textContent = est ? `За БЖВ виходить ≈ ${est} ккал${k ? (Math.abs(est - k) > k * 0.1 ? ' — це більше ніж на 10% відрізняється від цілі.' : ' — узгоджено з ціллю.') : '.'}` : ''; };
    ['sxNKcal', 'sxNP', 'sxNF', 'sxNC'].forEach((id) => $(id).addEventListener('input', check)); check();
    body.querySelector('[data-act=save]').onclick = async (ev) => {
      const btn = ev.currentTarget; btn.disabled = true; setStatus($('sxNStatus'), 'Зберігаємо…');
      const { error } = await sb().from('athlete_nutrition_targets').upsert({ athlete_id: a.id, calories_kcal: num($('sxNKcal').value) == null ? null : Math.round(num($('sxNKcal').value)), protein_g: num($('sxNP').value), fat_g: num($('sxNF').value), carbs_g: num($('sxNC').value), water_ml: num($('sxNW').value) == null ? null : Math.round(num($('sxNW').value)), notes: $('sxNNotes').value.trim() }, { onConflict: 'athlete_id' });
      btn.disabled = false;
      if (error) { setStatus($('sxNStatus'), 'Не вдалося зберегти: ' + error.message, 'bad'); return; }
      S.toast('Ціль харчування збережено', 'good'); clientNutrition(body, a);
    };
  }

  async function clientCalendar(body, a) {
    body.innerHTML = '<p class="sx-sub">Завантажуємо…</p>';
    const from = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const { data, error } = await sb().from('workout_schedule').select('id,title,scheduled_for,details').eq('user_id', a.id).gte('scheduled_for', from).order('scheduled_for', { ascending: true }).limit(100);
    const rows = data || [];
    body.innerHTML = `<div class="sx-stack"><div class="sx-card sx-stack"><h3>Додати заняття</h3>
      <div class="sx-grid2"><label class="sx-field"><span>Дата</span><input id="sxCDate" type="date" value="${today()}"></label>
      <label class="sx-field"><span>Програма</span><select id="sxCProg"><option value="">Без програми</option>${C.programs.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label></div>
      <label class="sx-field"><span>Назва</span><input id="sxCTitle" maxlength="120" placeholder="Тренування"></label>
      <button class="sx-btn" type="button" data-act="add">${icon('plus')}Додати в календар</button><p class="sx-status" id="sxCStatus" role="status">${error ? esc(error.message) : ''}</p></div>
      <div class="sx-card"><h3>Найближчі та недавні</h3>${rows.length ? '<div class="sx-list">' + rows.map((r) => `<div class="sx-item" data-row="${esc(r.id)}"><span class="sx-grow"><b>${esc(r.title)}</b><small>${esc(fmtDate(r.scheduled_for, { weekday: 'short', day: 'numeric', month: 'short' }))}${r.details?.assigned_by_coach ? ' · від тренера' : ''}</small></span>
        <input type="date" value="${esc(r.scheduled_for)}" aria-label="Перенести на дату" style="max-width:150px"><button class="sx-icon-btn" type="button" data-del aria-label="Видалити заняття">${icon('trash')}</button></div>`).join('') + '</div>' : '<div class="sx-empty">На найближчі дні занять немає.</div>'}</div></div>`;
    $('sxCProg').onchange = () => { const p = C.programs.find((x) => x.id === $('sxCProg').value); if (p && !$('sxCTitle').value) $('sxCTitle').value = p.name; };
    body.querySelector('[data-act=add]').onclick = async () => {
      const date = $('sxCDate').value; if (!date) { setStatus($('sxCStatus'), 'Обери дату.', 'bad'); return; }
      const program_id = $('sxCProg').value || null;
      const { error: e } = await sb().from('workout_schedule').insert({ user_id: a.id, title: $('sxCTitle').value.trim() || 'Тренування', scheduled_for: date, details: { assigned_by_coach: C.u.id, program_id } });
      if (e) { setStatus($('sxCStatus'), 'Не вдалося додати: ' + e.message, 'bad'); return; }
      S.toast('Заняття додано', 'good'); clientCalendar(body, a);
    };
    body.querySelectorAll('[data-row]').forEach((row) => {
      const id = row.dataset.row;
      row.querySelector('input[type=date]').onchange = async (ev) => { const { error: e } = await sb().from('workout_schedule').update({ scheduled_for: ev.target.value }).eq('id', id).eq('user_id', a.id); S.toast(e ? 'Не вдалося перенести: ' + e.message : 'Заняття перенесено', e ? 'bad' : 'good'); };
      row.querySelector('[data-del]').onclick = async () => { if (!confirm('Видалити заняття з календаря учня?')) return; const { error: e } = await sb().from('workout_schedule').delete().eq('id', id).eq('user_id', a.id); if (e) S.toast('Не вдалося: ' + e.message, 'bad'); else clientCalendar(body, a); };
    });
  }

  /* =====================================================================
     ATHLETE: coach connection, targets, assigned programs
     ===================================================================== */
  const A = { u: null, rel: null, coach: null, targets: null, assignments: [], programs: new Map(), loaded: false };
  async function athleteLoad(u) {
    const s = sb(); A.u = u;
    const [rel, tgt, asg] = await Promise.all([
      s.from('athlete_coach_relationships').select('id,coach_id,status,created_at').eq('athlete_id', u.id).eq('status', 'active').maybeSingle(),
      s.from('athlete_nutrition_targets').select('calories_kcal,protein_g,fat_g,carbs_g,water_ml,notes,updated_at,updated_by').eq('athlete_id', u.id).maybeSingle(),
      s.from('assigned_workouts').select('id,program_id,coach_id,status,due_date,notes,assigned_at').eq('athlete_user_id', u.id).neq('status', 'cancelled').order('assigned_at', { ascending: false }).limit(50)
    ]);
    A.rel = rel.data || null; A.targets = tgt.data || null; A.assignments = asg.data || [];
    A.coach = null;
    if (A.rel) {
      const c = await s.rpc('get_my_coach');
      if (!c.error && c.data) A.coach = c.data;
      else { const cp = await s.from('coach_profiles').select('specialization,experience_years,bio').eq('user_id', A.rel.coach_id).maybeSingle(); A.coach = { name: 'Твій тренер', ...(cp.data || {}) }; }
    }
    const ids = [...new Set(A.assignments.map((x) => x.program_id))];
    A.programs = new Map();
    if (ids.length) { const p = await s.from('workout_programs').select('id,name,category,description,exercises').in('id', ids); (p.data || []).forEach((x) => A.programs.set(x.id, x)); }
    A.loaded = true;
  }
  function targetsHtml(t, compact) {
    if (!t || [t.calories_kcal, t.protein_g, t.fat_g, t.carbs_g, t.water_ml].every((v) => v == null)) return '';
    const cell = (v, l) => `<div><b>${v == null ? '—' : esc(Math.round(Number(v)))}</b><span>${l}</span></div>`;
    return `<div class="sx-coach-target">${cell(t.calories_kcal, 'ккал')}${cell(t.protein_g, 'білки, г')}${cell(t.fat_g, 'жири, г')}${cell(t.carbs_g, 'вуглеводи, г')}${cell(t.water_ml != null ? t.water_ml / 1000 : null, 'вода, л')}</div>${!compact && t.notes ? `<div class="sx-note">${esc(t.notes)}</div>` : ''}`;
  }
  function assignmentHtml(x) {
    const p = A.programs.get(x.program_id); if (!p) return '';
    const st = STATUS[x.status] || [x.status, ''];
    return `<div class="sx-item"><span class="sx-grow"><b>${esc(p.name)}</b><small>${(p.exercises || []).length} вправ${x.due_date ? ' · до ' + esc(fmtDate(x.due_date)) : ''}</small></span><span class="sx-badge ${st[1]}">${esc(st[0])}</span>
      <button class="sx-btn small" type="button" data-start="${esc(x.id)}">${icon('play')}Почати</button></div>`;
  }
  function bindStart(root) {
    root.querySelectorAll('[data-start]').forEach((b) => b.onclick = () => S.startAssigned(b.dataset.start));
  }
  S.startAssigned = function (assignmentId) {
    const x = A.assignments.find((y) => y.id === assignmentId); const p = x && A.programs.get(x.program_id);
    if (!p) return;
    let bank = null, prof = null;
    try { bank = exercises; prof = profile; } catch (_) {}
    if (!bank || typeof window.gtStartWorkout !== 'function') { S.toast('Не вдалося відкрити тренування', 'bad'); return; }
    if (!prof) { S.toast('Спочатку заповни короткий профіль', 'bad'); window.showPage('setup'); return; }
    const items = (p.exercises || []).filter((e) => e && e.name).map((e) => [e.name, `${Math.max(1, Number(e.sets) || 3)} × ${e.reps || '8–12'}`]);
    if (!items.length) { S.toast('У програмі немає вправ', 'bad'); return; }
    const place = prof.place || 'home'; const saved = { place: bank[place], home: bank.home };
    bank[place] = items; bank.home = items;
    try { window.gtStartWorkout('Full Body'); }
    finally { setTimeout(() => { bank[place] = saved.place; bank.home = saved.home; }, 600); }
    setTimeout(() => {
      try { currentWorkout = p.name; } catch (_) {}
      const t = $('sessionTitle'); if (t) t.textContent = p.name;
      // Pre-fill the coach's working weights into empty set fields.
      const rows = document.querySelectorAll('#exerciseList .gt-logged-exercise, #exerciseList .session-row');
      (p.exercises || []).forEach((e, i) => {
        const w = Number(e.weight); if (!w || !rows[i]) return;
        rows[i].querySelectorAll('.gt-set-row').forEach((sr) => { const inp = sr.querySelectorAll('input[type=number]')[1]; if (inp && !Number(inp.value)) { inp.value = w; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); } });
      });
      document.dispatchEvent(new CustomEvent('sx:session-ready'));
    }, 350);
    if (x.status === 'assigned') sb().rpc('athlete_set_assignment_status', { p_assignment_id: x.id, p_status: 'in_progress' }).then(({ error }) => { if (!error) x.status = 'in_progress'; });
  };

  function renderConnect() {
    const root = $('coach-connectContent'); if (!root) return;
    const sec = $('coach-connect'); if (sec) sec.querySelectorAll(':scope>.section-head,:scope>p.muted').forEach((n) => n.style.display = 'none');
    const pending = (new URLSearchParams(location.search).get('invite') || A.u?.user_metadata?.coach_invite_code || '').trim().toUpperCase();
    if (A.rel) {
      const c = A.coach || {};
      root.innerHTML = `<div class="sx-ws"><div class="sx-ws-head"><h2>Мій тренер</h2></div>
        <div class="sx-card"><div class="sx-row" style="gap:14px"><span class="sx-avatar">${esc(initials(c.name || 'Т'))}</span><div><b>${esc(c.name || 'Твій тренер')}</b><p class="sx-sub">${esc([c.specialization, c.experience_years ? c.experience_years + ' р. досвіду' : ''].filter(Boolean).join(' · ') || 'Підключено')}</p></div></div>${c.bio ? `<p class="sx-sub" style="margin-top:10px">${esc(c.bio)}</p>` : ''}</div>
        <div class="sx-card"><h3>Програми від тренера</h3>${A.assignments.length ? '<div class="sx-list">' + A.assignments.map(assignmentHtml).join('') + '</div>' : '<div class="sx-empty">Тренер ще не призначив програм.</div>'}</div>
        <div class="sx-card"><h3>Ціль харчування</h3>${targetsHtml(A.targets) || '<p class="sx-sub">Тренер ще не встановив ціль. Поки використовується розрахунок за профілем.</p>'}</div>
        <div class="sx-row"><button class="sx-btn ghost" type="button" data-act="chat">Написати тренеру</button><button class="sx-btn quiet" type="button" data-act="disconnect">Від’єднатися від тренера</button></div></div>`;
      bindStart(root);
      root.querySelector('[data-act=chat]').onclick = () => window.showPage('coach-live');
      root.querySelector('[data-act=disconnect]').onclick = async () => {
        if (!confirm('Від’єднатися від тренера? Він більше не бачитиме твої тренування й не зможе змінювати план.')) return;
        const { error } = await sb().rpc('disconnect_coach_relationship', { p_relationship_id: A.rel.id });
        if (error) { S.toast('Не вдалося: ' + error.message, 'bad'); return; }
        S.toast('Тренера від’єднано'); await S.athleteMount(A.u);
      };
      return;
    }
    root.innerHTML = `<div class="sx-ws"><div class="sx-ws-head"><h2>Мій тренер</h2><p class="sx-sub">Попроси в тренера код і введи його тут. Після підключення тренер бачитиме твої тренування, зможе призначати програми й ціль харчування.</p></div>
      <form class="sx-card sx-stack" id="sxConnectForm" novalidate><label class="sx-field"><span>Код тренера</span><input id="sxCoachCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="32" placeholder="COACH-XXXXXX" value="${esc(pending)}" required></label>
        <button class="sx-btn" type="submit">${icon('check')}Підключитися</button><p class="sx-status" id="sxConnectStatus" role="status"></p></form></div>`;
    $('sxConnectForm').onsubmit = async (ev) => {
      ev.preventDefault();
      const code = $('sxCoachCode').value.trim().toUpperCase(); if (!code) { setStatus($('sxConnectStatus'), 'Введи код тренера.', 'bad'); return; }
      setStatus($('sxConnectStatus'), 'Перевіряємо код…');
      const { data, error } = await sb().rpc('accept_coach_invite', { p_invite_code: code });
      const reason = error ? error.message : (data && data.success === false ? data.error : null);
      if (reason) {
        const map = { not_found: 'Код не знайдено або він більше не дійсний.', rate_limited: 'Забагато спроб. Спробуй через годину.', already_connected: 'Ти вже підключений до іншого тренера. Спочатку від’єднайся.', self_invite: 'Це твій власний код.' };
        setStatus($('sxConnectStatus'), map[reason] || (/not found|expired/i.test(reason) ? map.not_found : /another coach/i.test(reason) ? map.already_connected : /Only athlete/i.test(reason) ? 'Підключитися до тренера може лише акаунт атлета.' : 'Не вдалося підключитися: ' + reason), 'bad');
        return;
      }
      const q = new URLSearchParams(location.search); q.delete('invite'); window.history.replaceState({}, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
      S.toast('Тренера підключено', 'good'); await S.athleteMount(A.u);
    };
  }
  function renderNutritionCoach() {
    const page = $('nutrition'); if (!page) return;
    let box = $('sxNutritionCoach');
    const html = targetsHtml(A.targets);
    if (!html) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('section'); box.id = 'sxNutritionCoach'; box.className = 'sx-card'; box.style.marginBottom = '14px'; const first = page.querySelector('.hero, .card, section, div'); page.insertBefore(box, first ? first.nextSibling : page.firstChild); }
    box.innerHTML = `<div class="sx-between"><h3 style="margin:0">Ціль від тренера</h3>${A.targets?.updated_at ? `<span class="sx-badge violet">оновлено ${esc(fmtDate(A.targets.updated_at))}</span>` : ''}</div>${html}<p class="sx-sub" style="margin-top:10px">Розрахунки нижче — загальний орієнтир за профілем. Пріоритет має ціль тренера.</p>`;
  }
  function renderHomeCoach() {
    const home = $('home'); if (!home) return;
    let box = $('sxHomeCoach');
    const open = A.assignments.filter((x) => x.status !== 'completed' && A.programs.get(x.program_id));
    if (!A.rel && !open.length) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('section'); box.id = 'sxHomeCoach'; box.className = 'sx-card'; box.style.margin = '0 0 14px'; const anchor = home.querySelector('.hero') || home.firstElementChild; if (anchor && anchor.nextSibling) home.insertBefore(box, anchor.nextSibling); else home.appendChild(box); }
    box.innerHTML = `<div class="sx-between"><h3 style="margin:0">Від тренера</h3><button class="sx-btn small quiet" type="button" data-act="open">Усе ${icon('right')}</button></div>
      ${open.length ? '<div class="sx-list" style="margin-top:10px">' + open.slice(0, 2).map(assignmentHtml).join('') + '</div>' : '<p class="sx-sub">Нових програм немає.</p>'}${targetsHtml(A.targets, true)}`;
    bindStart(box);
    box.querySelector('[data-act=open]').onclick = () => window.showPage('coach-connect');
  }
  S.athleteMount = async function (u) {
    if (!sb() || !u) return;
    try { await athleteLoad(u); } catch (e) { console.warn('Strenova athlete coach data:', e?.message || e); return; }
    renderConnect(); renderNutritionCoach(); renderHomeCoach();
  };

  /* =====================================================================
     LAYOUT: one job per screen
     Home = today (resume, plan, coach, week, progress, food, quick start).
     Tools move to the screen where they are used; nothing is deleted.
     ===================================================================== */
  const lang = () => { try { return localStorage.getItem('gtai_lang') === 'en' ? 'en' : 'uk'; } catch (_) { return 'uk'; } };
  let arranging = false, homeObserver = null, arrangeTimer = null;
  function moveInto(id, dest, before) {
    const el = $(id); if (!el || !dest || el.parentElement === dest) return;
    if (before && before.parentElement === dest) dest.insertBefore(el, before); else dest.appendChild(el);
  }
  function arrangeLayout() {
    const home = $('home'); if (!home || arranging) return;
    arranging = true;
    try {
      const pick = (sel) => home.querySelector(':scope > ' + sel);
      const order = [pick('#gtWorkoutResumeCard'), pick('.hero'), pick('#sxWeekCard'), pick('#sxHomeCoach'), pick('.st-home-stats'), pick('.st-home-progress-head'), pick('#recent'), pick('#gtHomeBjuCard'), pick('.st-home-quick-head'), pick('.st-home-quick-head + .grid') || pick('.grid')].filter(Boolean);
      order.forEach((el, i) => { if (home.children[i] !== el) home.insertBefore(el, home.children[i] || null); });
      const rec = $('recommend'), stats = $('stats'), profile = $('profile');
      moveInto('gtQuickActionsV3', rec); moveInto('gtPersonalTemplatesPanel', rec);
      moveInto('gtHomeExtras', stats);
      moveInto('gtV4BackupCard', profile, $('gcAccountRoleCard'));
      home.classList.add('sx-home');
    } finally { arranging = false; }
    const plus = $('stProfilePlusLink');
    if (plus && !plus.dataset.sx) {
      plus.dataset.sx = '1'; plus.setAttribute('data-no-autotranslate', '');
      const tag = plus.querySelector('.tag'); if (tag) tag.textContent = 'Strenova Plus';
    }
    if (plus) {
      const h = plus.querySelector('h3'), p = plus.querySelector('p');
      if (h) h.textContent = lang() === 'en' ? 'Chat with your coach' : 'Чат із тренером';
      if (p) p.textContent = lang() === 'en' ? 'Strenova Plus: what is included and how to get access.' : 'Strenova Plus: що входить і як отримати доступ.';
    }
  }
  function scheduleArrange() { clearTimeout(arrangeTimer); arrangeTimer = setTimeout(arrangeLayout, 60); }
  function watchHome() {
    const home = $('home'); if (!home || homeObserver) return;
    homeObserver = new MutationObserver(() => { if (!arranging) scheduleArrange(); });
    homeObserver.observe(home, { childList: true });
  }
  // The fifth tab follows the account role instead of a generic "Clients / Coach".
  function roleNav(role) {
    const btn = document.querySelector('nav#nav button[data-page="coach"]'); if (!btn) return;
    const coach = role === 'coach';
    const label = coach ? (lang() === 'en' ? 'Clients' : 'Учні') : (lang() === 'en' ? 'Coach' : 'Тренер');
    const i = btn.querySelector('i'); if (i) { i.removeAttribute('data-st-ui'); i.textContent = label; }
    btn.setAttribute('aria-label', label);
    btn.dataset.sxTarget = coach ? 'coach-dashboard' : role === 'admin' ? 'admin-dashboard' : 'coach-connect';
    // One entry per destination in the sidebar/drawer: the primary tab already
    // covers "My coach" / "My clients"; the chat keeps an explicit name.
    document.querySelectorAll('nav#nav button[data-page="coach-connect"], nav#nav button[data-page="coach-dashboard"]').forEach((x) => { if (x !== btn) x.hidden = true; });
    document.querySelectorAll('nav#nav button[data-page="coach-live"] i, nav#nav button[data-page="coach-inbox"] i').forEach((x) => { x.removeAttribute('data-st-ui'); x.textContent = coach ? (lang() === 'en' ? 'Client chats' : 'Чати з учнями') : (lang() === 'en' ? 'Coach chat' : 'Чат із тренером'); });
    // 46-strenova-router.js routes this tab through window.__stOpenCoachTab.
    window.__stOpenCoachTab = () => { window.showPage(btn.dataset.sxTarget); syncNavActive(btn.dataset.sxTarget); };
  }
  function syncNavActive(id) {
    const btn = document.querySelector('nav#nav button[data-page="coach"]'); if (!btn) return;
    if (['coach-dashboard', 'coach-connect', 'admin-dashboard', 'coach'].includes(id)) {
      document.querySelectorAll('nav#nav button.active').forEach((b) => b !== btn && b.classList.remove('active'));
      btn.classList.add('active');
    }
  }
  S.arrangeLayout = arrangeLayout;

  /* ---------- account deletion (profile) ---------- */
  function mountDeleteCard() {
    const page = $('profile'); if (!page || !sb() || !me()) return;
    let card = $('sxDeleteAccount');
    if (!card) { card = document.createElement('section'); card.id = 'sxDeleteAccount'; card.className = 'sx-card'; card.setAttribute('data-no-autotranslate', ''); page.appendChild(card); }
    else if (card.dataset.ready) { if (card !== page.lastElementChild) page.appendChild(card); return; }
    card.dataset.ready = '1';
    card.innerHTML = `<h3>Видалення акаунта</h3>
      <p class="sx-sub">Акаунт і всі дані в хмарі буде видалено назавжди: профіль, тренування, розклад, повідомлення, зв’язки з тренером або учнями. Скасувати це неможливо.</p>
      <details style="margin-top:10px"><summary class="sx-btn small danger" style="list-style:none;display:inline-flex">Видалити акаунт</summary>
        <form class="sx-stack" id="sxDeleteForm" style="margin-top:12px" novalidate>
          <label class="sx-field"><span>Щоб підтвердити, введи слово ВИДАЛИТИ</span><input id="sxDeleteConfirm" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
          <button class="sx-btn danger" type="submit">Видалити назавжди</button>
          <p class="sx-status" id="sxDeleteStatus" role="status"></p>
        </form></details>`;
    $('sxDeleteForm').onsubmit = async (ev) => {
      ev.preventDefault();
      const word = $('sxDeleteConfirm').value.trim().toUpperCase(), st = $('sxDeleteStatus');
      if (word !== 'ВИДАЛИТИ' && word !== 'DELETE') { setStatus(st, 'Введи слово ВИДАЛИТИ великими літерами.', 'bad'); return; }
      const btn = ev.submitter || ev.target.querySelector('button'); btn.disabled = true; setStatus(st, 'Видаляємо…');
      const { error } = await sb().rpc('delete_my_account', { p_confirm: word });
      if (error) {
        btn.disabled = false;
        const missing = error.code === 'PGRST202' || /could not find the function/i.test(error.message || '');
        setStatus(st, missing ? 'Видалення ще не ввімкнене на сервері. Напиши власнику Strenova — він видалить акаунт вручну.' : /owner/i.test(error.message) ? 'Акаунт власника не можна видалити із застосунку.' : 'Не вдалося видалити: ' + error.message, 'bad');
        return;
      }
      try { await sb().auth.signOut(); } catch (_) {}
      try { Object.keys(localStorage).filter((k) => /^(gtai_|gt_|strenova_|sb-)/.test(k)).forEach((k) => localStorage.removeItem(k)); sessionStorage.clear(); } catch (_) {}
      location.replace(location.pathname);
    };
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  S.onRole = function (role, u) {
    mountRoleCard(); roleNav(role); scheduleArrange(); mountDeleteCard();
    if (role === 'coach') S.coachMount(u);
    else if (role !== 'admin') S.athleteMount(u);
  };
  function boot() {
    hookShowPage();
    S.onPage((id) => {
      if (id === 'profile') { mountRoleCard(); mountDeleteCard(); }
      if (id === 'nutrition' && A.loaded) renderNutritionCoach();
      if (id === 'coach-dashboard' && C.u && C.view !== 'editor') coachRender();
      if (id === 'home') scheduleArrange();
      try { roleNav(window.gcCurrentRole || 'athlete'); } catch (_) {}
      syncNavActive(id);
    });
    const kick = () => { watchHome(); arrangeLayout(); };
    // Deep links from PWA shortcuts: ?page=recommend|nutrition|stats|calendar|profile
    const want = new URLSearchParams(location.search).get('page');
    if (want && ['recommend', 'nutrition', 'stats', 'calendar', 'profile', 'history', 'library', 'coach-connect'].includes(want)) {
      let tries = 0;
      const open = () => { if (me() && $(want)) { window.showPage(want); return; } if (++tries < 20) setTimeout(open, 300); };
      setTimeout(open, 600);
    }
    if (document.readyState === 'complete') kick(); else window.addEventListener('load', kick, { once: true });
    setTimeout(kick, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
  window.addEventListener('load', hookShowPage, { once: true });
})();
