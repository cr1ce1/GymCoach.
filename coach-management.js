import { createTtlCache, escapeHtml, normalizeProgramDays, pageBounds, validateNutritionTarget } from './coach-management-core.js';

const $ = id => document.getElementById(id);
const cache = createTtlCache({ ttlMs: 20000, maxEntries: 80 });
const state = { user: null, role: 'athlete', tab: 'clients', clients: [], pending: [], selected: null, page: 0, programId: null, scheduleId: null, loading: false };
const esc = escapeHtml;
const val = value => esc(value == null || value === '' ? '—' : value);

function client() {
  try { return typeof gtSupabase !== 'undefined' ? gtSupabase : null; } catch { return null; }
}
function appUser() {
  try { return typeof gtUser !== 'undefined' && gtUser ? gtUser : null; } catch { return null; }
}
async function resolveUser() {
  const known = appUser();
  if (known && known.id) return known;
  const supabase = client();
  if (!supabase || !supabase.auth || !supabase.auth.getUser) return null;
  const result = await supabase.auth.getUser();
  if (result.error) throw result.error;
  return result.data && result.data.user || null;
}
function note(node, value, type) {
  if (!node) return;
  node.textContent = value || '';
  node.className = 'cm-message' + (type ? ' is-' + type : '');
}
function btn(label, action, attrs, secondary) {
  return '<button type="button" class="btn' + (secondary ? ' secondary' : '') + '" data-cm-action="' + action + '" ' + (attrs || '') + '>' + esc(label) + '</button>';
}
function addStyles() {
  if ($('cm-styles')) return;
  const style = document.createElement('style');
  style.id = 'cm-styles';
  style.textContent = '.cm-panel{display:grid;gap:14px;margin-top:16px}.cm-card{border:1px solid var(--border,rgba(255,255,255,.1));border-radius:16px;padding:15px;min-width:0}.cm-tabs,.cm-actions{display:flex;flex-wrap:wrap;gap:8px}.cm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.cm-stat{padding:12px;border-radius:12px;background:rgba(255,255,255,.04)}.cm-stat strong{display:block;font-size:21px}.cm-list{display:grid;gap:9px}.cm-item{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:11px;border-radius:12px;background:rgba(255,255,255,.035)}.cm-item small{display:block;opacity:.7;margin-top:3px}.cm-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cm-form .field{min-width:0}.cm-full{grid-column:1/-1}.cm-json{width:100%;min-height:180px;resize:vertical;font:12px/1.5 monospace}.cm-message{min-height:1.3em;font-size:13px}.cm-message.is-error{color:#ff8585}.cm-message.is-success{color:#80d7a6}.cm-muted{opacity:.72}@media(max-width:650px){.cm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cm-form{grid-template-columns:1fr}.cm-full{grid-column:auto}}';
  document.head.appendChild(style);
}
async function loadRole() {
  const result = await client().from('user_roles').select('role').eq('user_id', state.user.id);
  if (result.error) throw result.error;
  const roles = (result.data || []).map(row => row.role);
  return roles.includes('admin') ? 'admin' : roles.includes('coach') ? 'coach' : 'athlete';
}
function roleCard() {
  const profile = $('profile');
  if (!profile || !state.user || $('cm-role-card')) return;
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'cm-role-card';
  if (state.role === 'admin') {
    card.innerHTML = '<h3>Тип облікового запису</h3><p class="cm-muted">Адміністративну роль не можна змінити через цей перемикач.</p>';
  } else {
    card.innerHTML = '<h3>Тип облікового запису</h3><p class="cm-muted">Можна перемикатися між ролями без нового акаунта. Історія та дані зберігаються.</p><div class="field"><label for="cm-role-select">Моя роль</label><select id="cm-role-select"><option value="athlete">Атлет</option><option value="coach">Тренер</option></select></div>' + btn('Змінити роль','switch-role') + '<p id="cm-role-message" class="cm-message" role="status"></p>';
    $('cm-role-select', card);
    card.querySelector('#cm-role-select').value = state.role;
  }
  profile.appendChild(card);
}
async function switchRole() {
  const select = $('cm-role-select');
  const status = $('cm-role-message');
  const role = select && select.value;
  if (!['athlete','coach'].includes(role) || role === state.role) return;
  const details = role === 'coach'
    ? 'Відкриється кабінет тренера. Поточний зв’язок, де ти є атлетом, буде тимчасово призупинено.'
    : 'Функції тренера буде вимкнено. Клієнти та історія залишаться збереженими.';
  if (!confirm('Змінити роль? ' + details)) { select.value = state.role; return; }
  select.disabled = true;
  note(status, 'Змінюємо роль…');
  const result = await client().rpc('switch_account_role', { p_role: role });
  if (result.error) {
    select.disabled = false;
    select.value = state.role;
    return note(status, result.error.message, 'error');
  }
  if (!result.data || !result.data.success || result.data.role !== role) {
    select.disabled = false;
    select.value = state.role;
    return note(status, 'Сервер не підтвердив зміну ролі.', 'error');
  }
  window.gcCurrentRole = role;
  window.gcHydratedUserId = null;
  location.reload();
}
async function relationships(status, page) {
  const bounds = pageBounds(page || 0, 25);
  const key = 'rel:' + status + ':' + bounds.page;
  if (cache.get(key)) return cache.get(key);
  const result = await client().from('athlete_coach_relationships').select('id,athlete_id,status,created_at')
    .eq('coach_id', state.user.id).eq('status', status).order('created_at',{ascending:false}).range(bounds.from,bounds.to);
  if (result.error) throw result.error;
  return cache.set(key, result.data || []);
}
async function profiles(ids, pending) {
  const result = [];
  for (let i = 0; i < ids.length; i += 25) {
    const group = ids.slice(i, i + 25);
    const query = pending
      ? client().rpc('coach_pending_request_profiles',{p_relationship_ids:group})
      : client().rpc('coach_athlete_profiles',{p_athlete_ids:group});
    const response = await query;
    if (response.error) throw response.error;
    if (Array.isArray(response.data)) result.push.apply(result,response.data);
  }
  return result;
}
async function loadLists(page) {
  const activeRows = await relationships('active',page || 0);
  const pendingRows = await relationships('pending',0);
  const both = await Promise.all([
    profiles(activeRows.map(row=>row.athlete_id),false),
    profiles(pendingRows.map(row=>row.id),true)
  ]);
  const map = new Map(both[0].map(row=>[row.user_id,row]));
  const pendingMap = new Map(both[1].map(row=>[row.relationship_id,row]));
  state.clients = activeRows.map(row=>Object.assign({},map.get(row.athlete_id),{user_id:row.athlete_id,relationship_id:row.id}));
  state.pending = pendingRows.map(row=>pendingMap.get(row.id)).filter(Boolean);
  state.page = page || 0;
  if (!state.selected && state.clients.length) state.selected = state.clients[0].user_id;
}
async function updateStats() {
  const uid = state.user.id;
  const result = await Promise.all([
    client().from('athlete_coach_relationships').select('id',{count:'exact',head:true}).eq('coach_id',uid).eq('status','active'),
    client().from('athlete_coach_relationships').select('id',{count:'exact',head:true}).eq('coach_id',uid).eq('status','pending'),
    client().from('workout_programs').select('id',{count:'exact',head:true}).eq('coach_id',uid).eq('is_library',false)
  ]);
  for (const item of result) if (item.error) throw item.error;
  if ($('cm-active-count')) $('cm-active-count').textContent = result[0].count || 0;
  if ($('cm-pending-count')) $('cm-pending-count').textContent = result[1].count || 0;
  if ($('cm-program-count')) $('cm-program-count').textContent = result[2].count || 0;
}
function mountCoach() {
  const root = $('coach-dashboardContent');
  if (!root || state.role !== 'coach' || !state.user || $('cm-coach-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'cm-coach-panel';
  panel.className = 'cm-panel';
  panel.innerHTML = '<div class="cm-card"><div class="cm-grid"><div class="cm-stat"><strong id="cm-active-count">—</strong>Активні клієнти</div><div class="cm-stat"><strong id="cm-pending-count">—</strong>Нові запити</div><div class="cm-stat"><strong id="cm-program-count">—</strong>Мої програми</div></div></div><div class="cm-tabs">' +
    ['clients','nutrition','programs','schedule','stats'].map((tab,i)=>'<button type="button" class="btn secondary" data-cm-tab="'+tab+'">'+['Клієнти','КБЖВ','Програми','Календар','Статистика'][i]+'</button>').join('') +
    '</div><div id="cm-content" class="cm-card"><p class="cm-muted">Завантажуємо…</p></div>';
  root.appendChild(panel);
  panel.addEventListener('click', coachClick);
  panel.addEventListener('change', coachChange);
  renderTab('clients');
}
async function renderTab(tab) {
  state.tab = tab;
  const content = $('cm-content');
  if (!content) return;
  document.querySelectorAll('[data-cm-tab]').forEach(el=>el.classList.toggle('active',el.dataset.cmTab===tab));
  content.innerHTML = '<p class="cm-muted">Завантажуємо…</p>';
  try {
    await updateStats();
    if (tab === 'clients') await renderClients(content);
    if (tab === 'nutrition') await renderNutrition(content);
    if (tab === 'programs') await renderPrograms(content);
    if (tab === 'schedule') await renderSchedule(content);
    if (tab === 'stats') await renderStats(content);
  } catch(error) { note(content,error.message || 'Помилка завантаження.','error'); }
}
async function renderClients(content) {
  const pendingRows = await relationships('pending',0);
  await loadLists(state.page);
  const selected = state.clients.find(row=>row.user_id===state.selected);
  let html = '<h3>Запити на співпрацю</h3><div class="cm-list">';
  html += state.pending.length ? state.pending.map(row=>'<div class="cm-item"><div><strong>'+val(row.name || 'Спортсмен')+'</strong><small>'+val(row.sport)+'</small></div><div class="cm-actions">'+btn('Прийняти','review','data-id="'+esc(row.relationship_id)+'"')+btn('Відхилити','review','data-id="'+esc(row.relationship_id)+'" data-decision="reject"',true)+'</div></div>').join('') : '<p class="cm-muted">Нових запитів немає.</p>';
  html += '</div><h3>Мої спортсмени</h3><div class="cm-list">';
  html += state.clients.length ? state.clients.map(row=>'<div class="cm-item"><div><strong>'+val(row.name || 'Спортсмен')+'</strong><small>'+val(row.sport)+' · '+val(row.goal)+'</small></div>'+btn('Відкрити','client','data-id="'+esc(row.user_id)+'"')+'</div>').join('') : '<p class="cm-muted">Поки немає активних клієнтів.</p>';
  html += '</div><div class="cm-actions">'+btn('Попередні','page','data-page="'+Math.max(0,state.page-1)+'"',true)+btn('Наступні','page','data-page="'+(state.page+1)+'"',true)+'</div><div id="cm-detail"></div><p id="cm-client-message" class="cm-message" role="status"></p>';
  content.innerHTML = html;
  if (selected) await renderClient(selected.user_id);
}
async function renderClient(id) {
  state.selected = id;
  const holder = $('cm-detail');
  if (!holder) return;
  holder.innerHTML = '<p class="cm-muted">Завантажуємо профіль…</p>';
  const results = await Promise.all([
    client().rpc('coach_athlete_profile',{p_athlete_id:id}),
    client().from('workout_logs').select('id,title,created_at,completed_exercises').eq('user_id',id).order('created_at',{ascending:false}).limit(20)
  ]);
  if (results[0].error) throw results[0].error;
  const p = results[0].data || {};
  const logHtml = results[1].error ? '<p class="cm-muted">Історія тренувань недоступна.</p>' :
    (results[1].data || []).map(row=>'<div class="cm-item"><div><strong>'+val(row.title)+'</strong><small>'+val(new Date(row.created_at).toLocaleDateString('uk-UA'))+'</small></div>'+val(row.completed_exercises)+' вправ</div>').join('') || '<p class="cm-muted">Записів поки немає.</p>';
  holder.innerHTML = '<div class="cm-card"><h3>'+val(p.name || 'Профіль спортсмена')+'</h3><div class="cm-grid"><div>Вік<strong>'+val(p.age)+'</strong></div><div>Зріст<strong>'+val(p.height)+' см</strong></div><div>Вага<strong>'+val(p.weight)+' кг</strong></div><div>Мета<strong>'+val(p.goal)+'</strong></div><div>Рівень<strong>'+val(p.level)+'</strong></div><div>Місце<strong>'+val(p.place)+'</strong></div></div><h4>Останні тренування</h4><div class="cm-list">'+logHtml+'</div><div class="cm-actions">'+btn('КБЖВ','tab','data-tab="nutrition"')+btn('Програма','tab','data-tab="programs"',true)+btn('Календар','tab','data-tab="schedule"',true)+'</div></div>';
}
function clientSelect(id) {
  return '<div class="field"><label for="'+id+'">Спортсмен</label><select id="'+id+'">'+state.clients.map(row=>'<option value="'+esc(row.user_id)+'" '+(row.user_id===state.selected?'selected':'')+'>'+esc(row.name || 'Спортсмен')+'</option>').join('')+'</select></div>';
}
async function renderNutrition(content) {
  await loadLists(0);
  content.innerHTML = '<h3>Керування КБЖВ</h3>'+clientSelect('cm-nutrition-client')+
    '<p class="cm-muted">Ручне введення значень. Автоматичний розрахунок макросів для клієнтів до 18 років вимкнений.</p><div class="cm-form">'+
    '<div class="field"><label for="cm-kcal">Калорії, ккал</label><input id="cm-kcal" type="number" min="0" max="15000" step="1"></div>'+
    '<div class="field"><label for="cm-protein">Білки, г</label><input id="cm-protein" type="number" min="0" max="2000" step="0.1"></div>'+
    '<div class="field"><label for="cm-fat">Жири, г</label><input id="cm-fat" type="number" min="0" max="2000" step="0.1"></div>'+
    '<div class="field"><label for="cm-carbs">Вуглеводи, г</label><input id="cm-carbs" type="number" min="0" max="2000" step="0.1"></div>'+
    '<div class="field"><label for="cm-water">Вода, мл</label><input id="cm-water" type="number" min="0" max="15000" step="1"></div>'+
    '<div class="field"><label for="cm-notes">Примітка</label><input id="cm-notes" maxlength="1000"></div></div>'+
    btn('Зберегти КБЖВ','save-nutrition')+btn('Відновити попередні','restore-nutrition','',true)+
    '<p id="cm-nutrition-message" class="cm-message" role="status"></p><h3>Історія змін</h3><div id="cm-nutrition-history" class="cm-list"></div>';
  await loadNutritionTarget($('#cm-nutrition-client').value);
}
async function loadNutritionTarget(id) {
  if (!id) return;
  const result = await Promise.all([
    client().from('coach_nutrition_targets').select('calories_kcal,protein_g,fat_g,carbs_g,water_ml,notes').eq('athlete_id',id).maybeSingle(),
    client().from('coach_nutrition_target_history').select('id,snapshot,changed_at').eq('athlete_id',id).order('changed_at',{ascending:false}).limit(10)
  ]);
  if (result[0].error) throw result[0].error;
  const value = result[0].data || {};
  [['cm-kcal','calories_kcal'],['cm-protein','protein_g'],['cm-fat','fat_g'],['cm-carbs','carbs_g'],['cm-water','water_ml'],['cm-notes','notes']].forEach(pair=>{if($(pair[0]))$(pair[0]).value=value[pair[1]] ?? '';});
  const history = $('cm-nutrition-history');
  if (history) history.innerHTML = (result[1].data || []).map(row=>'<div class="cm-item"><div><strong>'+esc(new Date(row.changed_at).toLocaleString('uk-UA'))+'</strong><small>Ккал '+val(row.snapshot.calories_kcal)+' · Б '+val(row.snapshot.protein_g)+' · Ж '+val(row.snapshot.fat_g)+' · В '+val(row.snapshot.carbs_g)+'</small></div></div>').join('') || '<p class="cm-muted">Історія порожня.</p>';
}
async function saveNutrition() {
  const id = $('cm-nutrition-client').value;
  const valid = validateNutritionTarget({
    calories_kcal:$('cm-kcal').value,protein_g:$('cm-protein').value,fat_g:$('cm-fat').value,
    carbs_g:$('cm-carbs').value,water_ml:$('cm-water').value,notes:$('cm-notes').value
  });
  if (!valid.valid) return note($('cm-nutrition-message'),Object.values(valid.errors).join(' '),'error');
  const result = await client().from('coach_nutrition_targets').upsert(Object.assign({
    athlete_id:id,coach_id:state.user.id,updated_by:state.user.id,updated_at:new Date().toISOString()
  },valid.normalized),{onConflict:'athlete_id'});
  if (result.error) return note($('cm-nutrition-message'),result.error.message,'error');
  note($('cm-nutrition-message'),'Збережено. Спортсмен побачить нові значення у своєму кабінеті.','success');
  await loadNutritionTarget(id);
}
async function restoreNutrition() {
  const id = $('cm-nutrition-client').value;
  const result = await client().from('coach_nutrition_target_history').select('snapshot')
    .eq('athlete_id',id).order('changed_at',{ascending:false}).range(1,1).maybeSingle();
  if (result.error) return note($('cm-nutrition-message'),result.error.message,'error');
  if (!result.data) return note($('cm-nutrition-message'),'Попередніх значень немає.','error');
  const row = result.data.snapshot;
  [['cm-kcal','calories_kcal'],['cm-protein','protein_g'],['cm-fat','fat_g'],['cm-carbs','carbs_g'],['cm-water','water_ml'],['cm-notes','notes']].forEach(pair=>{$(pair[0]).value=row[pair[1]] ?? '';});
  note($('cm-nutrition-message'),'Попередні значення завантажено у форму. Натисни «Зберегти КБЖВ», щоб відновити їх.','success');
}
async function renderPrograms(content) {
  await loadLists(0);
  const result = await client().from('workout_programs').select('id,name,category,updated_at').eq('coach_id',state.user.id).eq('is_library',false).order('updated_at',{ascending:false}).limit(25);
  if (result.error) throw result.error;
  content.innerHTML = '<h3>Програми тренувань</h3>'+clientSelect('cm-program-client')+
    '<div class="cm-form"><div class="field"><label for="cm-program-name">Назва</label><input id="cm-program-name" maxlength="120" value="Індивідуальна програма"></div>'+
    '<div class="field"><label for="cm-program-category">Тип</label><select id="cm-program-category"><option>Full Body</option><option>Split</option><option>Upper/Lower</option></select></div>'+
    '<div class="field cm-full"><label for="cm-program-days">Тренувальні дні та вправи (JSON)</label><textarea id="cm-program-days" class="cm-json" spellcheck="false"></textarea></div></div>'+
    '<p class="cm-muted">Кожен день має містити 1–20 вправ. Для вправ можна задати підходи, повторення, відпочинок, вагу та коментар.</p>'+
    btn('Зберегти й призначити','save-program')+btn('Нова програма','clear-program','',true)+
    '<p id="cm-program-message" class="cm-message" role="status"></p><h3>Збережені програми</h3><div class="cm-list" id="cm-program-list">'+
    (result.data || []).map(row=>'<div class="cm-item"><div><strong>'+val(row.name)+'</strong><small>'+val(row.category)+'</small></div><div class="cm-actions">'+btn('Редагувати','edit-program','data-id="'+esc(row.id)+'"',true)+btn('Видалити','delete-program','data-id="'+esc(row.id)+'"',true)+'</div></div>').join('')+'</div>';
  $('cm-program-days').value = JSON.stringify([{name:'День 1',focus:'Загальна підготовка',exercises:[{name:'Назва вправи',sets:3,reps:'8-12',rest_seconds:60,working_weight:null,coach_comment:''}]}],null,2);
}
async function editProgram(id) {
  const p = await client().from('workout_programs').select('id,name,category').eq('id',id).eq('coach_id',state.user.id).maybeSingle();
  if (p.error) throw p.error;
  if (!p.data) throw new Error('Програму не знайдено.');
  const days = await client().from('workout_days').select('id,day_number,name,focus').eq('program_id',id).order('day_number');
  if (days.error) throw days.error;
  const dayIds = (days.data || []).map(row=>row.id);
  const exercises = dayIds.length ? await client().from('workout_exercises')
    .select('workout_day_id,sort_order,name,sets,reps,rest_seconds,working_weight,coach_comment')
    .in('workout_day_id',dayIds).order('sort_order') : {data:[],error:null};
  if (exercises.error) throw exercises.error;
  state.programId = id;
  $('cm-program-name').value = p.data.name;
  $('cm-program-category').value = p.data.category;
  $('cm-program-days').value = JSON.stringify((days.data || []).map(day=>({
    name:day.name,focus:day.focus,
    exercises:(exercises.data || []).filter(item=>item.workout_day_id===day.id).map(item=>({
      name:item.name,sets:item.sets,reps:item.reps,rest_seconds:item.rest_seconds,
      working_weight:item.working_weight,coach_comment:item.coach_comment
    }))
  })),null,2);
  note($('cm-program-message'),'Програму завантажено для редагування.','success');
}
async function saveProgram() {
  const id = $('cm-program-client').value;
  let days;
  try { days = normalizeProgramDays(JSON.parse($('cm-program-days').value)); }
  catch(error) { return note($('cm-program-message'),error.message,'error'); }
  const result = await client().rpc('coach_save_program',{
    p_program_id:state.programId,p_athlete_id:id,p_name:$('cm-program-name').value.trim(),
    p_category:$('cm-program-category').value,p_days:days,p_due_date:null
  });
  if (result.error) return note($('cm-program-message'),result.error.message,'error');
  state.programId = null;
  cache.invalidate();
  note($('cm-program-message'),'Програму збережено та призначено.','success');
  await renderPrograms($('cm-content'));
}
async function deleteProgram(id) {
  if (!confirm('Видалити програму та пов’язані з нею призначення? Записи історії тренувань зберігаються окремо.')) return;
  const result = await client().from('workout_programs').delete().eq('id',id).eq('coach_id',state.user.id);
  if (result.error) throw result.error;
  await renderPrograms($('cm-content'));
}
async function renderSchedule(content) {
  await loadLists(0);
  content.innerHTML = '<h3>Календар клієнта</h3>'+clientSelect('cm-schedule-client')+
    '<div class="cm-form"><div class="field"><label for="cm-event-title">Назва</label><input id="cm-event-title" maxlength="120" value="Тренування"></div>'+
    '<div class="field"><label for="cm-event-date">Дата</label><input id="cm-event-date" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>'+
    '<div class="field"><label for="cm-event-time">Час</label><input id="cm-event-time" type="time"></div>'+
    '<div class="field"><label for="cm-event-status">Статус</label><select id="cm-event-status"><option value="planned">Заплановано</option><option value="completed">Виконано</option><option value="missed">Пропущено</option><option value="cancelled">Скасовано</option></select></div>'+
    '<div class="field cm-full"><label for="cm-event-notes">Примітки</label><input id="cm-event-notes" maxlength="1000"></div></div>'+
    btn('Зберегти тренування','save-schedule')+btn('Очистити форму','clear-schedule','',true)+
    '<p id="cm-schedule-message" class="cm-message" role="status"></p><h3>Заплановані події</h3><div id="cm-schedule-list" class="cm-list"></div>';
  await loadSchedule();
}
async function loadSchedule() {
  const id = $('cm-schedule-client').value;
  const result = await client().from('workout_schedule').select('id,title,scheduled_for,details')
    .eq('user_id',id).order('scheduled_for',{ascending:true}).limit(50);
  if (result.error) throw result.error;
  $('cm-schedule-list').innerHTML = (result.data || []).map(row=>{
    const d = row.details || {};
    const status = ({planned:'Заплановано',completed:'Виконано',missed:'Пропущено',cancelled:'Скасовано'})[d.status] || 'Заплановано';
    return '<div class="cm-item"><div><strong>'+val(row.title)+'</strong><small>'+val(row.scheduled_for)+' · '+val(d.time)+' · '+status+'</small><small>'+val(d.notes)+'</small></div><div class="cm-actions">'+btn('Редагувати','edit-schedule','data-id="'+esc(row.id)+'"',true)+btn('Видалити','delete-schedule','data-id="'+esc(row.id)+'"',true)+'</div></div>';
  }).join('') || '<p class="cm-muted">Подій немає.</p>';
}
async function saveSchedule() {
  const athlete = $('cm-schedule-client').value;
  const title = $('cm-event-title').value.trim();
  const date = $('cm-event-date').value;
  const notes = $('cm-event-notes').value.trim();
  if (!athlete || !title || title.length>120 || !date || notes.length>1000) return note($('cm-schedule-message'),'Заповни спортсмена, назву та дату.','error');
  let existingDetails = {};
  if (state.scheduleId) {
    const existing = await client().from('workout_schedule').select('details')
      .eq('id',state.scheduleId).eq('user_id',athlete).maybeSingle();
    if (existing.error) return note($('cm-schedule-message'),existing.error.message,'error');
    existingDetails = existing.data && existing.data.details && typeof existing.data.details === 'object'
      ? existing.data.details : {};
  }
  const payload = {user_id:athlete,title,scheduled_for:date,details:Object.assign({},existingDetails,{
    time:$('cm-event-time').value || null,status:$('cm-event-status').value,notes
  })};
  const query = state.scheduleId
    ? client().from('workout_schedule').update(payload).eq('id',state.scheduleId).eq('user_id',athlete)
    : client().from('workout_schedule').insert(payload);
  const result = await query;
  if (result.error) return note($('cm-schedule-message'),result.error.message,'error');
  state.scheduleId = null;
  note($('cm-schedule-message'),'Календар оновлено.','success');
  await loadSchedule();
}
async function editSchedule(id) {
  const result = await client().from('workout_schedule').select('id,title,scheduled_for,details').eq('id',id).eq('user_id',$('cm-schedule-client').value).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Подію не знайдено.');
  const row = result.data;
  state.scheduleId = row.id;
  $('cm-event-title').value = row.title;
  $('cm-event-date').value = row.scheduled_for;
  $('cm-event-time').value = row.details && row.details.time || '';
  $('cm-event-status').value = row.details && row.details.status || 'planned';
  $('cm-event-notes').value = row.details && row.details.notes || '';
}
async function deleteSchedule(id) {
  if (!confirm('Видалити подію з календаря клієнта?')) return;
  const result = await client().from('workout_schedule').delete().eq('id',id).eq('user_id',$('cm-schedule-client').value);
  if (result.error) throw result.error;
  await loadSchedule();
}
async function renderStats(content) {
  await loadLists(0);
  const ids = state.clients.map(row=>row.user_id);
  if (!ids.length) { content.innerHTML='<h3>Статистика</h3><p class="cm-muted">Підключи спортсменів, щоб бачити статистику.</p>'; return; }
  const result = await Promise.all([
    client().from('workout_logs').select('id,user_id,created_at').in('user_id',ids).order('created_at',{ascending:false}).limit(250),
    client().from('workout_schedule').select('id,user_id,scheduled_for,details').in('user_id',ids).limit(250),
    client().from('assigned_workouts').select('id,status,athlete_user_id').eq('coach_id',state.user.id).neq('status','cancelled').limit(100)
  ]);
  for (const row of result) if (row.error) throw row.error;
  const logRows = result[0].data || [];
  const scheduleRows = result[1].data || [];
  const assignedRows = result[2].data || [];
  const next = scheduleRows.filter(row=>row.scheduled_for>=new Date().toISOString().slice(0,10) && (!row.details || row.details.status!=='cancelled')).length;
  const complete = assignedRows.filter(row=>row.status==='completed').length;
  content.innerHTML = '<h3>Статистика клієнтів</h3><div class="cm-grid"><div class="cm-stat"><strong>'+logRows.length+'</strong>Записів тренувань</div><div class="cm-stat"><strong>'+complete+'</strong>Завершених програм</div><div class="cm-stat"><strong>'+next+'</strong>Майбутніх тренувань</div></div><div class="cm-list" style="margin-top:12px">'+state.clients.map(row=>{
    const count = logRows.filter(item=>item.user_id===row.user_id).length;
    const future = scheduleRows.filter(item=>item.user_id===row.user_id && item.scheduled_for>=new Date().toISOString().slice(0,10)).length;
    return '<div class="cm-item"><div><strong>'+val(row.name)+'</strong><small>'+count+' тренувань · '+future+' майбутніх занять</small></div></div>';
  }).join('')+'</div>';
}
async function coachClick(event) {
  const tab = event.target.closest('[data-cm-tab]');
  if (tab) return renderTab(tab.dataset.cmTab);
  const action = event.target.closest('[data-cm-action]');
  if (!action || !action.closest('#cm-coach-panel')) return;
  const kind = action.dataset.cmAction;
  try {
    if (kind==='review') {
      action.disabled=true;
      const result = await client().rpc('review_coach_connection',{p_relationship_id:action.dataset.id,p_action:action.dataset.decision || 'accept'});
      if (result.error) throw result.error;
      cache.invalidate('rel:');
      await renderTab('clients');
    } else if (kind==='client') {
      state.selected=action.dataset.id;
      await renderClient(state.selected);
    } else if (kind==='page') {
      state.page=Math.max(0,Number(action.dataset.page)||0);
      await renderTab('clients');
    } else if (kind==='tab') await renderTab(action.dataset.tab);
    else if (kind==='save-nutrition') await saveNutrition();
    else if (kind==='restore-nutrition') await restoreNutrition();
    else if (kind==='save-program') await saveProgram();
    else if (kind==='clear-program') { state.programId=null; await renderPrograms($('cm-content')); }
    else if (kind==='edit-program') await editProgram(action.dataset.id);
    else if (kind==='delete-program') await deleteProgram(action.dataset.id);
    else if (kind==='save-schedule') await saveSchedule();
    else if (kind==='edit-schedule') await editSchedule(action.dataset.id);
    else if (kind==='delete-schedule') await deleteSchedule(action.dataset.id);
    else if (kind==='clear-schedule') { state.scheduleId=null; $('cm-event-title').value='Тренування'; $('cm-event-date').value=new Date().toISOString().slice(0,10); $('cm-event-time').value=''; $('cm-event-notes').value=''; $('cm-event-status').value='planned'; }
  } catch(error) {
    note($('cm-client-message') || $('cm-program-message') || $('cm-schedule-message') || $('cm-nutrition-message') || $('cm-content'),error.message || 'Не вдалося виконати дію.','error');
  } finally { action.disabled=false; }
}
async function coachChange(event) {
  if (event.target.id==='cm-nutrition-client') await loadNutritionTarget(event.target.value);
  if (event.target.id==='cm-schedule-client') await loadSchedule();
  if (event.target.id==='cm-program-client') state.selected=event.target.value;
}

function mountAthleteConnection() {
  const root = $('coach-connectContent');
  if (!root || state.role!=='athlete' || !state.user || $('cm-athlete-connection')) return;
  const card=document.createElement('div');
  card.id='cm-athlete-connection';
  card.className='cm-card';
  root.appendChild(card);
  loadAthleteConnection(card).catch(error=>note(card,error.message || 'Помилка зв’язку.','error'));
}
async function loadAthleteConnection(card) {
  const result = await client().from('athlete_coach_relationships').select('id,coach_id,status,created_at')
    .eq('athlete_id',state.user.id).in('status',['active','pending']).order('created_at',{ascending:false}).limit(5);
  if (result.error) throw result.error;
  const active=(result.data||[]).find(row=>row.status==='active');
  const pending=(result.data||[]).find(row=>row.status==='pending');
  card.innerHTML='<h3>Зв’язок із тренером</h3>' +
    (active ? '<p>Є активний зв’язок із тренером. Календар і дані тренувань синхронізуються.</p>' :
    pending ? '<p>Запит на співпрацю очікує підтвердження тренером.</p>' :
    '<p class="cm-muted">Активного тренера поки немає. Введи код або скористайся посиланням-запрошення.</p>') +
    (!active ? '<div class="field"><label for="cm-coach-code">Код тренера</label><input id="cm-coach-code" maxlength="32" placeholder="COACH-XXXXXX"></div>'+btn('Надіслати запит','request-coach') : btn('Припинити співпрацю','disconnect-coach','data-id="'+esc(active.id)+'"',true)) +
    '<p id="cm-athlete-status" class="cm-message" role="status"></p>';
  const invite = new URLSearchParams(location.search).get('invite') || state.user.user_metadata?.coach_invite_code;
  if (invite && $('cm-coach-code')) $('cm-coach-code').value=invite.toUpperCase();
}
async function requestCoach() {
  const code=$('cm-coach-code')?.value.trim().toUpperCase();
  if (!code) return note($('cm-athlete-status'),'Введи код тренера.','error');
  note($('cm-athlete-status'),'Надсилаємо запит…');
  const result=await client().rpc('request_coach_connection',{p_invite_code:code});
  if (result.error) return note($('cm-athlete-status'),result.error.message,'error');
  cache.invalidate('rel:');
  note($('cm-athlete-status'),result.data?.status==='active'?'Зв’язок уже активний.':'Запит надіслано. Тренер має його підтвердити.','success');
  await loadAthleteConnection($('cm-athlete-connection'));
}
async function disconnectCoach(id) {
  if (!confirm('Припинити співпрацю? Історія та збережені дані залишаться.')) return;
  const result=await client().rpc('disconnect_coach_relationship',{p_relationship_id:id});
  if (result.error) throw result.error;
  await loadAthleteConnection($('cm-athlete-connection'));
}
function mountAthleteNutrition() {
  if (state.role!=='athlete' || !state.user || !$('nutrition') || $('cm-athlete-nutrition')) return;
  const card=document.createElement('div');
  card.className='card cm-card';
  card.id='cm-athlete-nutrition';
  card.innerHTML='<h3>Цілі від тренера</h3><p class="cm-muted">Показники, які тренер зберіг для твого профілю.</p><div id="cm-athlete-values" class="cm-grid">Завантажуємо…</div><p id="cm-athlete-updated" class="cm-muted"></p>';
  $('nutrition').appendChild(card);
  client().from('coach_nutrition_targets').select('calories_kcal,protein_g,fat_g,carbs_g,water_ml,updated_at')
    .eq('athlete_id',state.user.id).maybeSingle().then(result=>{
      if(result.error) return note(card,result.error.message,'error');
      if(!result.data) return $('cm-athlete-values').textContent='Тренер ще не встановив цілі.';
      const data=result.data;
      $('cm-athlete-values').innerHTML=[['Калорії',data.calories_kcal,'ккал'],['Білки',data.protein_g,'г'],['Жири',data.fat_g,'г'],['Вуглеводи',data.carbs_g,'г'],['Вода',data.water_ml,'мл']]
        .map(row=>'<div class="cm-stat"><strong>'+val(row[1])+'</strong>'+esc(row[0]+' · '+row[2])+'</div>').join('');
      $('cm-athlete-updated').textContent='Оновлено: '+new Date(data.updated_at).toLocaleString('uk-UA');
    }).catch(error=>note(card,error.message,'error'));
}
function mountRoleObserver() {
  const observer=new MutationObserver(()=>{
    if(state.role==='coach' && !$('cm-coach-panel')) mountCoach();
    if(state.role==='athlete' && !$('cm-athlete-connection')) mountAthleteConnection();
    if(state.role==='athlete' && !$('cm-athlete-nutrition')) mountAthleteNutrition();
    if(state.user && !$('cm-role-card')) roleCard();
  });
  observer.observe(document.body,{childList:true,subtree:true});
}
async function init() {
  if(state.loading) return;
  state.loading=true;
  try {
    const user=await resolveUser();
    if(!user || !client()) return;
    state.user=user;
    state.role=await loadRole();
    addStyles();
    roleCard();
    if(state.role==='coach') mountCoach();
    if(state.role==='athlete') {
      mountAthleteConnection();
      mountAthleteNutrition();
      window.gcAcceptCoachInvite=async function() {
        const oldValue=$('gcAcceptCoachCode')?.value || '';
        mountAthleteConnection();
        if ($('cm-coach-code')) $('cm-coach-code').value=oldValue;
        await requestCoach();
      };
      window.gcDisconnectCoach=async function(id) {
        try { await disconnectCoach(id); } catch(error) { alert(error.message || 'Не вдалося від’єднати тренера.'); }
      };
    }
  } catch(error) {
    console.warn('Strenova coach management:',error?.message || error);
  } finally { state.loading=false; }
}
document.addEventListener('click',async event=>{
  const action=event.target.closest('[data-cm-action]');
  if(!action || action.closest('#cm-coach-panel')) return;
  try {
    if(action.dataset.cmAction==='switch-role') await switchRole();
    if(action.dataset.cmAction==='request-coach') await requestCoach();
    if(action.dataset.cmAction==='disconnect-coach') await disconnectCoach(action.dataset.id);
  } catch(error) {
    note($('cm-athlete-status') || $('cm-role-message'),error.message || 'Не вдалося виконати дію.','error');
  }
});
document.addEventListener('DOMContentLoaded',()=>{ init(); mountRoleObserver(); });
window.addEventListener('load',init,{once:true});
const previousAfterLogin=window.gtAfterLogin;
if(typeof previousAfterLogin==='function' && !previousAfterLogin.__cmWrapped) {
  const wrapped=async function(...args) {
    const result=await previousAfterLogin.apply(this,args);
    state.loading=false;
    await init();
    return result;
  };
  wrapped.__cmWrapped=true;
  window.gtAfterLogin=wrapped;
}
