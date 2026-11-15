/* Strenova coach dashboard enhancements. Loaded after the main application scripts. */
(function () {
  'use strict';

  const getClient = () => (typeof gtSupabase !== 'undefined' ? gtSupabase : null);
  const getUser = async () => {
    if (typeof gtUser !== 'undefined' && gtUser) return gtUser;
    const client = getClient();
    if (!client) return null;
    const result = await client.auth.getUser();
    return result.data?.user || null;
  };
  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const status = (node, message, bad = false) => {
    if (!node) return;
    node.textContent = message || '';
    node.style.color = bad ? 'var(--danger, #ff8d82)' : '';
  };

  let roleMountPromise = null;

  async function mountRoleCard() {
    if (roleMountPromise) return roleMountPromise;
    roleMountPromise = (async () => {
      const profilePage = byId('profile');
      const client = getClient();
      if (!profilePage || !client) return;
      const user = await getUser();
      if (!user) return;

      // Older accounts may have only a legacy role record or no role row yet.
      const [roleResult, legacyResult, profileResult] = await Promise.all([
        client.from('user_roles').select('role').eq('user_id', user.id),
        client.from('gt_user_roles').select('role').eq('user_id', user.id).maybeSingle(),
        client.from('user_profiles').select('profile').eq('user_id', user.id).maybeSingle()
      ]);
      const roles = roleResult.data || [];
      const profileRole = profileResult.data?.profile?.accountType;
      const role = roles.some((r) => r.role === 'admin')
        ? 'admin'
        : (roles.some((r) => r.role === 'coach') || legacyResult.data?.role === 'coach' || profileRole === 'coach')
          ? 'coach' : 'athlete';
      window.gcCurrentRole = role;

      let card = byId('gcAccountRoleCard');
      if (!card) {
        card = document.createElement('section');
        card.className = 'gc-platform-card';
        card.id = 'gcAccountRoleCard';
        profilePage.appendChild(card);
      }
      if (role === 'admin') {
        card.innerHTML = '<h3>Тип акаунта</h3><p class="muted">Адміністративні права захищені й не можуть змінюватися через цей перемикач.</p>';
        return;
      }
      if (!card.querySelector('#gcAccountRoleSelect')) {
        card.innerHTML = `
          <h3>Тип акаунта</h3>
          <p class="muted">Вибери, як використовувати Strenova. Роль можна змінювати будь-коли; профіль, історія та Plus залишаються.</p>
          <div class="field">
            <label for="gcAccountRoleSelect">Мій тип</label>
            <select id="gcAccountRoleSelect">
              <option value="athlete">Атлет</option>
              <option value="coach">Тренер</option>
            </select>
          </div>
          <button class="btn secondary" id="gcAccountRoleSave" type="button">Зберегти роль</button>
          <p class="gc-platform-status" id="gcAccountRoleStatus" role="status"></p>`;
        const select = card.querySelector('#gcAccountRoleSelect');
        card.querySelector('#gcAccountRoleSave').addEventListener('click', async () => {
          const nextRole = select.value;
          const currentRole = window.gcCurrentRole || 'athlete';
          if (!['athlete', 'coach'].includes(nextRole) || nextRole === currentRole) return;
          const message = nextRole === 'coach'
            ? 'Перемкнути акаунт на тренера? Твої дані та Plus залишаться.'
            : 'Перемкнути акаунт на атлета? Дані та зв’язки збережуться, але керування учнями буде призупинено.';
          if (!window.confirm(message)) return;
          const button = card.querySelector('#gcAccountRoleSave');
          button.disabled = true;
          status(byId('gcAccountRoleStatus'), 'Змінюємо роль…');
          const { error } = await client.rpc('set_my_account_role', { p_role: nextRole });
          if (error) {
            button.disabled = false;
            status(byId('gcAccountRoleStatus'), 'Не вдалося змінити роль: ' + error.message, true);
            return;
          }
          status(byId('gcAccountRoleStatus'), 'Роль змінено. Оновлюємо кабінет…');
          window.location.reload();
        });
      }
      card.querySelector('#gcAccountRoleSelect').value = role;
    })();
    try { await roleMountPromise; }
    finally { roleMountPromise = null; }
  }

  function createCoachTools(root) {
    if (!root || byId('gcCoachEditTools') || window.gcCurrentRole !== 'coach') return;
    const card = document.createElement('section');
    card.className = 'gc-platform-card';
    card.id = 'gcCoachEditTools';
    card.innerHTML = `
      <h3>Керування спортсменом</h3>
      <p class="muted">КБЖВ, вода, календар і програми синхронізуються з акаунтом вибраного спортсмена.</p>
      <div class="field"><label for="gcCoachAthleteSelect">Спортсмен</label><select id="gcCoachAthleteSelect"><option value="">Завантаження…</option></select></div>
      <div id="gcCoachAthleteEditor" hidden>
        <div class="gc-platform-card">
          <h3>Харчові орієнтири</h3>
          <div class="grid3">
            <div class="field"><label for="gcNCalories">Ккал</label><input id="gcNCalories" type="number" min="0" max="20000" step="1"></div>
            <div class="field"><label for="gcNProtein">Білки, г</label><input id="gcNProtein" type="number" min="0" max="2000" step="0.5"></div>
            <div class="field"><label for="gcNFat">Жири, г</label><input id="gcNFat" type="number" min="0" max="2000" step="0.5"></div>
            <div class="field"><label for="gcNCarbs">Вуглеводи, г</label><input id="gcNCarbs" type="number" min="0" max="3000" step="0.5"></div>
            <div class="field"><label for="gcNWater">Вода, мл</label><input id="gcNWater" type="number" min="0" max="20000" step="50"></div>
          </div>
          <div class="field"><label for="gcNNotes">Коментар тренера</label><textarea id="gcNNotes" maxlength="1000" rows="2"></textarea></div>
          <button class="btn" id="gcNSave" type="button">Зберегти КБЖВ</button>
          <p id="gcNStatus" class="gc-platform-status" role="status"></p>
          <div id="gcNHistory" class="gc-platform-list"></div>
        </div>
        <div class="gc-platform-card">
          <h3>Календар спортсмена</h3>
          <div class="grid">
            <div class="field"><label for="gcScheduleTitle">Назва заняття</label><input id="gcScheduleTitle" maxlength="120" placeholder="Тренування"></div>
            <div class="field"><label for="gcScheduleDate">Дата</label><input id="gcScheduleDate" type="date"></div>
          </div>
          <button class="btn" id="gcScheduleAdd" type="button">Додати заняття</button>
          <p id="gcScheduleStatus" class="gc-platform-status" role="status"></p>
          <div id="gcScheduleList" class="gc-platform-list"></div>
        </div>
        <div class="gc-platform-card">
          <h3>Редагування програм</h3>
          <div class="field"><label for="gcProgramSelect">Моя програма</label><select id="gcProgramSelect"></select></div>
          <div class="field"><label for="gcProgramEditName">Назва</label><input id="gcProgramEditName" maxlength="120"></div>
          <div class="field"><label for="gcProgramEditExercises">Вправи (JSON, 2–4 елементи)</label><textarea id="gcProgramEditExercises" rows="7" spellcheck="false"></textarea></div>
          <div class="gc-platform-actions">
            <button class="btn secondary" id="gcProgramSave" type="button">Зберегти зміни</button>
            <button class="btn" id="gcProgramAssign" type="button">Призначити спортсмену</button>
          </div>
          <p id="gcProgramStatus" class="gc-platform-status" role="status"></p>
        </div>
      </div>`;
    root.appendChild(card);
    initializeCoachEditor(card);
  }

  async function initializeCoachEditor(card) {
    const client = getClient();
    const user = await getUser();
    if (!client || !user) return;
    const select = byId('gcCoachAthleteSelect');
    const editor = byId('gcCoachAthleteEditor');
    const { data: relations, error } = await client
      .from('athlete_coach_relationships')
      .select('athlete_id')
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) {
      select.innerHTML = '<option value="">Не вдалося завантажити список</option>';
      return;
    }
    const ids = [...new Set((relations || []).map((r) => r.athlete_id))];
    if (!ids.length) {
      select.innerHTML = '<option value="">Немає підключених спортсменів</option>';
      return;
    }
    const { data: profiles } = await client.from('user_profiles').select('user_id,profile').in('user_id', ids);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.profile || {}]));
    select.innerHTML = ids.map((id) => {
      const p = profileMap.get(id) || {};
      return `<option value="${escapeHtml(id)}">${escapeHtml(p.name || ('Спортсмен ' + id.slice(0, 8)))}</option>`;
    }).join('');
    select.addEventListener('change', () => loadAthleteEditor(select.value));
    byId('gcNSave').addEventListener('click', saveNutrition);
    byId('gcScheduleAdd').addEventListener('click', addScheduleEntry);
    byId('gcProgramSelect').addEventListener('change', loadProgramEditor);
    byId('gcProgramSave').addEventListener('click', saveProgramEditor);
    byId('gcProgramAssign').addEventListener('click', assignProgram);
    byId('gcScheduleList').addEventListener('click', handleScheduleAction);
    await loadAthleteEditor(ids[0]);
  }

  async function loadAthleteEditor(athleteId) {
    const client = getClient();
    const editor = byId('gcCoachAthleteEditor');
    if (!client || !athleteId || !editor) return;
    editor.hidden = false;
    editor.dataset.athleteId = athleteId;
    status(byId('gcNStatus'), 'Завантажуємо дані…');
    const [nutrition, schedule, programs, history] = await Promise.all([
      client.from('athlete_nutrition_targets').select('*').eq('athlete_id', athleteId).maybeSingle(),
      client.from('workout_schedule').select('id,title,scheduled_for,details').eq('user_id', athleteId).order('scheduled_for', { ascending: true }).limit(100),
      client.from('workout_programs').select('id,name,category,exercises,exercise_count').eq('coach_id', (await getUser())?.id).order('updated_at', { ascending: false }).limit(100),
      client.from('athlete_nutrition_history').select('id,calories_kcal,protein_g,fat_g,carbs_g,water_ml,changed_at').eq('athlete_id', athleteId).order('changed_at', { ascending: false }).limit(8)
    ]);
    if (nutrition.error) status(byId('gcNStatus'), nutrition.error.message, true);
    const n = nutrition.data || {};
    byId('gcNCalories').value = n.calories_kcal ?? '';
    byId('gcNProtein').value = n.protein_g ?? '';
    byId('gcNFat').value = n.fat_g ?? '';
    byId('gcNCarbs').value = n.carbs_g ?? '';
    byId('gcNWater').value = n.water_ml ?? '';
    byId('gcNNotes').value = n.notes ?? '';
    status(byId('gcNStatus'), nutrition.error ? nutrition.error.message : '');
    byId('gcNHistory').innerHTML = (history.data || []).map((h) =>
      `<div class="gc-platform-item"><div><strong>${escapeHtml(new Date(h.changed_at).toLocaleString('uk-UA'))}</strong><small>Ккал: ${escapeHtml(h.calories_kcal ?? '—')} · Б: ${escapeHtml(h.protein_g ?? '—')} · Ж: ${escapeHtml(h.fat_g ?? '—')} · В: ${escapeHtml(h.carbs_g ?? '—')} · Вода: ${escapeHtml(h.water_ml ?? '—')} мл</small></div></div>`
    ).join('') || '<p class="muted">Історія змін з’явиться після першого збереження.</p>';
    renderSchedule(schedule.data || []);
    const programSelect = byId('gcProgramSelect');
    programSelect.innerHTML = (programs.data || []).map((p) =>
      `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} · ${escapeHtml(p.category)}</option>`
    ).join('') || '<option value="">Немає збережених програм</option>';
    programSelect._programs = programs.data || [];
    loadProgramEditor();
  }

  async function saveNutrition() {
    const client = getClient();
    const user = await getUser();
    const athleteId = byId('gcCoachAthleteEditor')?.dataset.athleteId;
    if (!client || !user || !athleteId) return;
    const numberOrNull = (id) => byId(id).value === '' ? null : Number(byId(id).value);
    const payload = {
      athlete_id: athleteId,
      calories_kcal: numberOrNull('gcNCalories'),
      protein_g: numberOrNull('gcNProtein'),
      fat_g: numberOrNull('gcNFat'),
      carbs_g: numberOrNull('gcNCarbs'),
      water_ml: numberOrNull('gcNWater'),
      notes: byId('gcNNotes').value.trim()
    };
    status(byId('gcNStatus'), 'Зберігаємо…');
    const { error } = await client.from('athlete_nutrition_targets').upsert(payload, { onConflict: 'athlete_id' });
    status(byId('gcNStatus'), error ? 'Помилка збереження: ' + error.message : 'Зміни збережено, історію оновлено.', !!error);
    if (!error) await loadAthleteEditor(athleteId);
  }

  function renderSchedule(rows) {
    const root = byId('gcScheduleList');
    root.innerHTML = rows.map((r) => `
      <div class="gc-platform-item" data-schedule-id="${escapeHtml(r.id)}">
        <div class="field"><label>Заняття</label><input data-schedule-title maxlength="120" value="${escapeHtml(r.title)}"></div>
        <div class="field"><label>Дата</label><input data-schedule-date type="date" value="${escapeHtml(r.scheduled_for)}"></div>
        <div class="gc-platform-actions"><button class="btn secondary" type="button" data-schedule-action="save">Зберегти</button><button class="btn secondary" type="button" data-schedule-action="delete">Видалити</button></div>
      </div>`).join('') || '<p class="muted">У календарі поки немає занять.</p>';
  }

  async function addScheduleEntry() {
    const client = getClient();
    const athleteId = byId('gcCoachAthleteEditor')?.dataset.athleteId;
    const user = await getUser();
    const title = byId('gcScheduleTitle').value.trim() || 'Тренування';
    const date = byId('gcScheduleDate').value;
    if (!client || !user || !athleteId || !date) {
      status(byId('gcScheduleStatus'), 'Вкажи дату заняття.', true);
      return;
    }
    const { error } = await client.from('workout_schedule').insert({
      user_id: athleteId, title, scheduled_for: date, details: { assigned_by_coach: user.id }
    });
    status(byId('gcScheduleStatus'), error ? 'Не вдалося додати: ' + error.message : 'Заняття додано до календаря спортсмена.', !!error);
    if (!error) {
      byId('gcScheduleTitle').value = '';
      await refreshSchedule(athleteId);
    }
  }

  async function refreshSchedule(athleteId) {
    const client = getClient();
    const { data, error } = await client.from('workout_schedule')
      .select('id,title,scheduled_for,details').eq('user_id', athleteId)
      .order('scheduled_for', { ascending: true }).limit(100);
    if (error) status(byId('gcScheduleStatus'), error.message, true);
    else renderSchedule(data || []);
  }

  async function handleScheduleAction(event) {
    const button = event.target.closest('[data-schedule-action]');
    if (!button) return;
    const row = button.closest('[data-schedule-id]');
    const client = getClient();
    const athleteId = byId('gcCoachAthleteEditor')?.dataset.athleteId;
    if (!row || !client || !athleteId) return;
    const id = row.dataset.scheduleId;
    let result;
    if (button.dataset.scheduleAction === 'delete') {
      if (!window.confirm('Видалити це заняття з календаря спортсмена?')) return;
      result = await client.from('workout_schedule').delete().eq('id', id).eq('user_id', athleteId);
    } else {
      const title = row.querySelector('[data-schedule-title]').value.trim() || 'Тренування';
      const scheduled_for = row.querySelector('[data-schedule-date]').value;
      if (!scheduled_for) {
        status(byId('gcScheduleStatus'), 'Вкажи дату.', true);
        return;
      }
      result = await client.from('workout_schedule').update({ title, scheduled_for }).eq('id', id).eq('user_id', athleteId);
    }
    status(byId('gcScheduleStatus'), result.error ? result.error.message : 'Календар оновлено.', !!result.error);
    if (!result.error) await refreshSchedule(athleteId);
  }

  function loadProgramEditor() {
    const select = byId('gcProgramSelect');
    const p = select?._programs?.find((x) => x.id === select.value);
    byId('gcProgramEditName').value = p?.name || '';
    byId('gcProgramEditExercises').value = p ? JSON.stringify(p.exercises || [], null, 2) : '';
  }

  async function saveProgramEditor() {
    const client = getClient();
    const id = byId('gcProgramSelect').value;
    const name = byId('gcProgramEditName').value.trim();
    let exercises;
    try { exercises = JSON.parse(byId('gcProgramEditExercises').value); }
    catch (_) { status(byId('gcProgramStatus'), 'Перевір JSON: формат некоректний.', true); return; }
    if (!id || !name || !Array.isArray(exercises) || exercises.length < 2 || exercises.length > 4) {
      status(byId('gcProgramStatus'), 'Потрібно обрати програму, вказати назву та залишити 2–4 вправи.', true);
      return;
    }
    const clientUser = await getUser();
    const { error } = await client.from('workout_programs').update({
      name, exercises, exercise_count: exercises.length, updated_at: new Date().toISOString()
    }).eq('id', id).eq('coach_id', clientUser.id);
    status(byId('gcProgramStatus'), error ? 'Не вдалося зберегти: ' + error.message : 'Програму оновлено.', !!error);
    if (!error) {
      const p = byId('gcProgramSelect')._programs.find((x) => x.id === id);
      if (p) Object.assign(p, { name, exercises, exercise_count: exercises.length });
    }
  }

  async function assignProgram() {
    const client = getClient();
    const user = await getUser();
    const athleteId = byId('gcCoachAthleteEditor')?.dataset.athleteId;
    const programId = byId('gcProgramSelect').value;
    if (!client || !user || !athleteId || !programId) {
      status(byId('gcProgramStatus'), 'Обери спортсмена та програму.', true);
      return;
    }
    const { error } = await client.from('assigned_workouts').insert({
      program_id: programId, coach_id: user.id, athlete_user_id: athleteId
    });
    status(byId('gcProgramStatus'), error ? 'Не вдалося призначити: ' + error.message : 'Програму призначено спортсмену.', !!error);
  }

  function watchCoachDashboard() {
    const root = byId('coach-dashboardContent');
    if (!root) return;
    if (root.dataset.gcCoachObserver === '1') return;
    root.dataset.gcCoachObserver = '1';
    const observer = new MutationObserver(() => {
      if (window.gcCurrentRole === 'coach' && root.children.length) createCoachTools(root);
    });
    observer.observe(root, { childList: true });
    if (window.gcCurrentRole === 'coach' && root.children.length) createCoachTools(root);
  }

  function boot() {
    mountRoleCard();
    watchCoachDashboard();
  }
  function observeProfileMount() {
    if (!document.documentElement || document.documentElement.dataset.gcRoleObserver === '1') return;
    document.documentElement.dataset.gcRoleObserver = '1';
    const observer = new MutationObserver(() => {
      if (byId('profile') && getClient()) mountRoleCard();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  observeProfileMount();
  window.addEventListener('load', boot, { once: true });
  if (getClient()) getClient().auth.onAuthStateChange(() => {
    setTimeout(() => { mountRoleCard(); watchCoachDashboard(); }, 250);
  });
})();
