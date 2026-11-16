(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const en = () => String(document.documentElement.lang || 'uk').toLowerCase().startsWith('en');
  const tr = (uk, english) => en() ? english : uk;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const css = document.createElement('style');
  css.id = 'gt-final-enhancements-css';
  css.textContent = `
    #gtProgressCard{position:relative;overflow:hidden;margin:16px 0}
    #gtProgressCard .gt-progress-body{transition:filter .18s,opacity .18s}
    #gtProgressCard.gt-premium-locked .gt-progress-body{filter:blur(2px);opacity:.42;pointer-events:none;user-select:none}
    .gt-feature-lock{position:absolute;z-index:15;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:24px;background:rgba(19,8,27,.88);border:1px solid #55346b;border-radius:18px;color:#f5e6ff;backdrop-filter:blur(6px)}
    .gt-feature-lock .gt-lock-icon{font-size:34px;line-height:1}
    .gt-feature-lock strong{font-size:17px;color:#fff}
    .gt-feature-lock p{max-width:440px;margin:0;color:#d3bfe1;font-size:13px;line-height:1.55}
    .gt-feature-lock button{border:0;border-radius:11px;padding:10px 15px;background:#b14ef3;color:#130a19;font-weight:800;cursor:pointer}
    .gt-progress-controls{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin:14px 0}
    .gt-progress-controls label{display:block;color:var(--muted);font-size:12px;margin-bottom:5px}
    .gt-progress-controls select{width:100%;padding:11px;background:#141016;color:var(--text);border:1px solid var(--line);border-radius:10px}
    .gt-progress-chart{width:100%;min-height:180px;display:block;overflow:visible;color:var(--lime)}
    .gt-progress-summary{padding:12px 14px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;font-size:13px;line-height:1.6;margin:10px 0}
    .gt-progress-empty{padding:16px;border:1px dashed var(--line);border-radius:12px;color:var(--muted);line-height:1.55}
    .gt-set-count-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px}
    .gt-set-count-row label,.gt-set-row label{font-size:11px;color:var(--muted)}
    .gt-set-count-row input,.gt-set-row input{width:100%;min-width:0;margin-top:5px;padding:9px;background:#141016;color:var(--text);border:1px solid var(--line);border-radius:9px}
    .gt-set-count-row input{max-width:90px}
    .gt-set-log-panel{position:relative;margin-top:10px;border:1px solid var(--line);border-radius:12px;padding:10px;background:rgba(10,8,12,.18)}
    .gt-set-log-panel h4{font-size:12px;margin:0 0 8px;color:var(--muted);font-weight:700}
    .gt-set-row{display:grid;grid-template-columns:72px minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:end;padding:8px 0;border-top:1px solid var(--line)}
    .gt-set-row:first-of-type{border-top:0}
    .gt-set-number{font-size:12px;color:var(--text);padding-bottom:12px;font-weight:700}
    .gt-session-free-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px;margin-bottom:12px;border:1px solid #5b416d;border-radius:12px;background:#261432;color:#f0dbfe;font-size:13px;line-height:1.5}
    .gt-session-free-banner button{border:0;border-radius:9px;background:#b14ef3;color:#130a19;padding:8px 12px;font-weight:800;cursor:pointer}
    .gt-session-completion{width:22px;height:22px;flex:none;accent-color:var(--lime);margin-top:2px}
    .gt-session-exercise-heading{display:flex;align-items:flex-start;gap:10px;min-width:0}
    .gt-session-exercise-heading .details{flex:1;min-width:0}
    .gt-session-exercise-heading b{display:block;overflow-wrap:anywhere}
    .gt-agenda-item{grid-template-columns:auto minmax(0,1fr)}
    .gt-agenda-actions{grid-column:2;display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
    .gt-agenda-actions button{font-size:11px;border:1px solid #59396e;border-radius:9px;padding:7px 9px;background:#2b143a;color:#f0dbfe;cursor:pointer}
    .gt-agenda-actions button.primary{background:#b14ef3;border-color:#b14ef3;color:#130b19;font-weight:800}
    .gt-agenda-actions button.done{background:#30193f;border-color:#5c3477;color:#dbb5f5}
    .gt-agenda-item.gt-schedule-done .gt-agenda-copy strong{text-decoration:line-through;opacity:.7}
    .gt-sub-manual-note{padding:13px 15px;border:1px solid var(--line);background:var(--panel2);border-radius:13px;color:var(--muted);line-height:1.6;font-size:13px;margin-top:12px}
    @media(max-width:480px){.gt-set-row{grid-template-columns:58px minmax(0,1fr) minmax(0,1fr);gap:6px}.gt-set-row input{padding:8px 6px}.gt-agenda-actions{grid-column:1/-1}.gt-feature-lock{padding:14px}}
  `;
  if (!$('gt-final-enhancements-css')) document.head.appendChild(css);

  // Access only comes from the Supabase membership check. Fail closed when the service is absent.
  window.GT_PLUS_ACCESS = false;
  const oldUpdatePremium = window.gtUpdatePremiumSurfaces;
  window.gtUpdatePremiumSurfaces = function(isPlus){
    window.GT_PLUS_ACCESS = isPlus === true;
    if (typeof oldUpdatePremium === 'function') oldUpdatePremium(window.GT_PLUS_ACCESS);
    applyPremiumUi();
  };
  function openPlus(){ window.gtRenderSubscription?.(); window.showPage?.('subscription'); }
  function applyPremiumUi(){
    const allowed = window.GT_PLUS_ACCESS === true;
    const subscriptionMessage=$('gtSubscriptionMessage');
    if(subscriptionMessage)subscriptionMessage.textContent=allowed?tr('Твій доступ Plus перевірено через Supabase.','Your Plus access was verified through Supabase.'):tr('Оплата зараз вимкнена. Попроси власника Strenova вручну додати Plus до твого акаунта.','Payments are off. Ask the Strenova owner to grant Plus to your account manually.');
    const card = $('gtProgressCard');
    if(card){
      card.classList.toggle('gt-premium-locked',!allowed);
      let lock=card.querySelector('.gt-feature-lock');
      if(!allowed && !lock){lock=document.createElement('div');lock.className='gt-feature-lock';lock.innerHTML=`<div class="gt-lock-icon" aria-hidden="true"><svg class="gc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><strong>${tr('Графік прогресу — Strenova Plus','Progress chart — Strenova Plus')}</strong><p>${tr('Графік за збереженими тренуваннями, записи ваги та особисті рекорди доступні з Plus.','Charts from saved workouts, weight logging and personal records are available with Plus.')}</p><button type="button" data-gt-open-plus>${tr('Як отримати Plus','How to get Plus')} →</button>`;card.appendChild(lock);lock.querySelector('[data-gt-open-plus]').addEventListener('click',openPlus)}
      if(allowed&&lock)lock.remove();
    }
    const list=$('exerciseList');
    if(list){
      list.querySelectorAll('.gt-set-log-panel').forEach(el=>{el.style.display=allowed?'block':'none'});
      let banner=list.querySelector('.gt-session-free-banner');
      if(!allowed && list.querySelector('.gt-set-log-panel') && !banner){banner=document.createElement('div');banner.className='gt-session-free-banner';banner.innerHTML=`<span>🔒 ${tr('Запис підходів, повторень і кілограмів доступний із Strenova Plus.','Logging sets, reps and weights is available with Strenova Plus.')}</span><button type="button" data-gt-open-plus>${tr('Переглянути Plus','View Plus')}</button>`;list.prepend(banner);banner.querySelector('button').addEventListener('click',openPlus)}
      if(allowed&&banner)banner.remove();
    }
    decorateCalendarAgenda();
  }

  // Replace the former checkout button with a manual-access information page. No payment is initiated.
  window.gtRenderSubscription = function(){
    const page=$('subscription'); if(!page)return;
    const allowed=window.GT_PLUS_ACCESS===true;
    const english=en();
    const featureList=english
      ? '<li>Private live chat with the coach</li><li>Workout calendar connected to your plan</li><li>Per-set reps and weight logging</li><li>Progress chart based on saved workout history</li><li>Exercise records and extended statistics</li>'
      : '<li>Особистий чат із тренером</li><li>Календар, пов’язаний із твоїм планом</li><li>Запис повторень і ваги для кожного підходу</li><li>Графік прогресу на основі історії тренувань</li><li>Особисті рекорди та розширена статистика</li>';
    page.innerHTML=`<div class="gt-sub-wrap"><div class="gt-sub-hero"><span class="eyebrow">STRENOVA PLUS</span><h1>${english?'Extra tools for your training':'Більше можливостей для тренувань'}</h1><p>${english?'Plus access is assigned manually by the Strenova owner. Payments are currently disabled.':'Доступ Plus власник Strenova надає вручну. Приймання платежів на сайті зараз вимкнене.'}</p><span class="pill">${allowed?(english?'Current plan: Strenova Plus':'Поточний план: Strenova Plus'):(english?'Current plan: Free':'Поточний план: Безкоштовний')}</span></div><div class="gt-sub-plans"><article class="gt-sub-plan"><span class="gt-sub-status">${english?'CURRENT PLAN':'ПОТОЧНИЙ ПЛАН'}</span><h2>${english?'Free':'Безкоштовний'}</h2><div class="gt-sub-price">${english?'Free':'Безкоштовно'}</div><ul><li>${english?'Profile and tailored workout plan':'Профіль і персональний план'}</li><li>${english?'Exercise library and basic workout history':'Бібліотека вправ і базова історія'}</li></ul></article><article class="gt-sub-plan featured"><span class="gt-sub-status">${allowed?(english?'ACTIVE ACCESS':'ДОСТУП АКТИВНИЙ'):(english?'MANUAL ACCESS':'ДОСТУП ЗА ЗАПРОШЕННЯМ')}</span><h2>Strenova Plus</h2><div class="gt-sub-price">${allowed?(english?'ACTIVE':'АКТИВНО'):(english?'₴150 / 30 days':'150 грн / 30 днів')}</div><ul>${featureList}</ul><div id="gtSubscriptionMessage" class="gt-sub-message" role="status">${allowed?(english?'Your Plus access has been confirmed by Supabase.':'Твій доступ Plus підтверджено через Supabase.'):(english?'Payments are off. Ask the Strenova owner to grant Plus to your account.':'Оплата зараз вимкнена. Щоб отримати доступ, попроси власника Strenova вручну додати Plus до твого акаунта.')}</div></article></div><div class="gt-sub-manual-note">${english?'Security: membership is read from Supabase. The page does not provide a local switch to unlock Plus.':'Захист: статус підписки перевіряється через Supabase. На сайті немає перемикача, який самостійно відкриває Plus.'}</div></div>`;
  };
  window.gtStartSubscription = function(){
    const msg=$('gtSubscriptionMessage');
    if(msg)msg.textContent=tr('Оплата вимкнена. Plus надається власником вручну через Supabase.','Payments are disabled. Plus is granted manually by the owner through Supabase.');
  };

  // Keep the basic workout history available to everyone, but do not send detailed set data
  // for non-Plus accounts. Supabase RLS independently validates this on the server.
  window.gtSyncWorkout = async function(item){
    try{
      if(typeof gtSupabase==='undefined'||!gtSupabase||typeof gtUser==='undefined'||!gtUser)return;
      const row={user_id:gtUser.id,title:item.name,completed_exercises:item.done,minutes:item.minutes,created_at:item.date};
      if(window.GT_PLUS_ACCESS===true)row.details={exercises:item.exercises||[]};
      else row.details={};
      const {data,error}=await gtSupabase.from('workout_logs').insert(row).select().single();
      if(error){console.warn('Workout cloud save rejected:',error.message);return;}
      if(data)item.id=data.id;
    }catch(err){console.warn('Workout cloud save failed:',err?.message||err);}
  };

  // Workout logger: all workout entry points share the same detailed session editor.
  let activeScheduleId = null;
  let launchingSchedule = false;
  function getPlanItems(){
    try { const forced=window.GT_FORCE_SESSION_ITEMS; if(Array.isArray(forced)&&forced.length){window.GT_FORCE_SESSION_ITEMS=null;return forced.map(x=>Array.isArray(x)?[String(x[0]??''),String(x[1]??'3 × 8–12')]:[String(x?.name??x??''),String(x?.prescription??'3 × 8–12')]).filter(x=>x[0].trim());} const a=(typeof currentExercises!=='undefined'&&Array.isArray(currentExercises))?currentExercises:[]; return a.map(x=>Array.isArray(x)?[String(x[0]??''),String(x[1]??'3 × 8–12')]:[String(x?.name??x??''),String(x?.prescription??'3 × 8–12')]).filter(x=>x[0].trim()); }
    catch(_){ return []; }
  }
  function parsePrescription(value){
    const m=String(value||'').match(/(\d+)\s*[x×]\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
    const count=m?Math.max(1,Math.min(10,Number(m[1])||3)):3;
    const low=m?Number(m[2])||10:10,high=m&&m[3]?Number(m[3])||low:low;
    const reps=Math.max(1,Math.min(100,Math.round((low+high)/2)));
    return {count,reps};
  }
  function syncExerciseLegacy(e){
    e.sets = Array.isArray(e.setLogs)?e.setLogs.length:(Number(e.sets)||0);
    const logs=Array.isArray(e.setLogs)?e.setLogs:[];
    e.reps=logs.length?Math.round(logs.reduce((sum,x)=>sum+(Number(x.reps)||0),0)/logs.length):(Number(e.reps)||0);
    e.weight=logs.reduce((max,x)=>Math.max(max,Number(x.weight)||0),0);
    e.totalReps=logs.reduce((sum,x)=>sum+(Number(x.reps)||0),0);
    return e;
  }
  function renderExerciseLogger(){
    const root=$('exerciseList'); if(!root)return;
    const items=getPlanItems();
    if(!items.length){root.innerHTML=`<p class="hint">${tr('У цьому тренуванні немає вправ. Повернись до плану й обери інше заняття.','There are no exercises in this workout. Return to your plan and choose another session.')}</p>`;applyPremiumUi();return;}
    const raw=[];
    for(const [name,prescription] of items){
      const parsed=parsePrescription(prescription);
      raw.push(syncExerciseLegacy({name,prescription,completed:false,setLogs:Array.from({length:parsed.count},()=>({reps:parsed.reps,weight:0})),sets:parsed.count,reps:parsed.reps,weight:0,totalReps:parsed.count*parsed.reps}));
    }
    try{gtSessionExerciseData=raw;}catch(_){window.gtSessionExerciseData=raw;}
    const rows=raw.map((e,i)=>{
      const link=(()=>{try{return typeof techniqueUrl==='function'?techniqueUrl(e.name):''}catch(_){return ''}})();
      const video=link?`<a class="tech-video" href="${escapeHtml(link)}" target="_blank" rel="noopener">▶ ${tr('Відео техніки','Technique video')}</a>`:'';
      const setInputs=e.setLogs.map((s,j)=>`<div class="gt-set-row"><span class="gt-set-number">${tr('Підхід','Set')} ${j+1}</span><label>${tr('Повторення','Reps')}<input type="number" inputmode="numeric" min="1" max="100" value="${s.reps}" onchange="gtWorkoutSetChange(${i},${j},'reps',this.value)"></label><label>${tr('Вага, кг','Weight, kg')}<input type="number" inputmode="decimal" min="0" max="500" step="0.5" value="${s.weight}" onchange="gtWorkoutSetChange(${i},${j},'weight',this.value)"></label></div>`).join('');
      return `<div class="session-row gt-logged-exercise" data-session-index="${i}" data-exercise="${escapeHtml(e.name)}"><div class="session-main"><div class="gt-session-exercise-heading"><input class="gt-session-completion" type="checkbox" aria-label="${tr('Вправу виконано','Exercise completed')}" onchange="gtToggleExerciseDone(${i},this.checked)"><div class="details"><b class="session-ex-name">${escapeHtml(e.name)}</b><small style="display:block;color:var(--muted);margin-top:4px">${escapeHtml(e.prescription||'3 × 8–12')}</small>${video}</div></div><div class="gt-set-count-row"><label>${tr('Кількість підходів','Number of sets')}<input type="number" min="1" max="10" value="${e.setLogs.length}" onchange="gtWorkoutSetCount(${i},this.value)"></label><button type="button" class="chip" onclick="gtSubstitute(${i})">↻ ${tr('Замінити вправу','Substitute exercise')}</button></div><div class="gt-set-log-panel"><h4>${tr('Результат кожного підходу','Each set result')}</h4>${setInputs}</div></div></div>`;
    }).join('');
    root.innerHTML=rows;
    applyPremiumUi();
  }
  window.gtWorkoutSetChange=function(i,j,field,value){
    let e;try{e=gtSessionExerciseData?.[i]}catch(_){e=window.gtSessionExerciseData?.[i]}
    if(!e||!Array.isArray(e.setLogs)||!e.setLogs[j])return;
    const n=Number(value);
    if(field==='reps')e.setLogs[j].reps=Math.max(1,Math.min(100,Number.isFinite(n)?Math.round(n):1));
    else if(field==='weight')e.setLogs[j].weight=Math.max(0,Math.min(500,Number.isFinite(n)?n:0));
    else if(field==='type'&&['warmup','working','backoff','dropset'].includes(String(value)))e.setLogs[j].type=String(value);
    syncExerciseLegacy(e);
  };
  window.gtWorkoutSetCount=function(i,value){
    let e;try{e=gtSessionExerciseData?.[i]}catch(_){e=window.gtSessionExerciseData?.[i]}
    if(!e)return;
    const n=Math.max(1,Math.min(10,Math.round(Number(value)||1)));
    const logs=Array.isArray(e.setLogs)?e.setLogs.slice():[];
    const avg=logs.length?Math.round(logs.reduce((s,x)=>s+(Number(x.reps)||0),0)/logs.length):10;
    while(logs.length<n)logs.push({reps:avg,weight:logs.length?Number(logs[logs.length-1].weight)||0:0,type:'working'});
    logs.length=n;e.setLogs=logs;syncExerciseLegacy(e);renderExerciseLoggerPreserveData();
  };
  function renderExerciseLoggerPreserveData(){
    // Rebuild only each per-exercise set editor while preserving the typed data for every exercise.
    const root=$('exerciseList');if(!root)return;
    const active=document.activeElement;const focusIndex=active?.closest?.('[data-session-index]')?.dataset.sessionIndex;
    const focusSet=active?.closest?.('.gt-set-row')?.querySelector('.gt-set-number')?.textContent||'';
    root.querySelectorAll('.gt-logged-exercise').forEach((row,i)=>{
      const e=(()=>{try{return gtSessionExerciseData[i]}catch(_){return window.gtSessionExerciseData?.[i]}})();if(!e)return;
      const panel=row.querySelector('.gt-set-log-panel');if(panel){panel.innerHTML=`<h4>${tr('Результат кожного підходу','Each set result')}</h4>`+e.setLogs.map((s,j)=>`<div class="gt-set-row"><span class="gt-set-number">${tr('Підхід','Set')} ${j+1}</span><label>${tr('Повторення','Reps')}<input type="number" inputmode="numeric" min="1" max="100" value="${s.reps}" onchange="gtWorkoutSetChange(${i},${j},'reps',this.value)"></label><label>${tr('Вага, кг','Weight, kg')}<input type="number" inputmode="decimal" min="0" max="500" step="0.5" value="${s.weight}" onchange="gtWorkoutSetChange(${i},${j},'weight',this.value)"></label></div>`).join('')}
      const count=row.querySelector('.gt-set-count-row input');if(count)count.value=e.setLogs.length;
    });
    applyPremiumUi();
  }
  window.gtToggleExerciseDone=function(i,value){let e;try{e=gtSessionExerciseData?.[i]}catch(_){e=window.gtSessionExerciseData?.[i]}if(e)e.completed=!!value};

  function wrapStart(entry){
    if(typeof entry!=='function')return entry;
    const wrapped=function(...args){
      if(!launchingSchedule)activeScheduleId=null;
      const result=entry.apply(this,args);
      const after=()=>{renderExerciseLogger();if(!launchingSchedule)activeScheduleId=null;};
      if(result&&typeof result.then==='function')return result.then(v=>{after();return v});
      after();return result;
    };
    wrapped.__gtUniformLogger=true;return wrapped;
  }
  const originalStart=window.startWorkout;
  const originalGtStart=window.gtStartWorkout;
  const originalHubStart=window.gtStartHubDay;
  const originalCustomStart=window.gtStartCustomPlan;
  if(typeof originalStart==='function'&&!originalStart.__gtUniformLogger)window.startWorkout=wrapStart(originalStart);
  if(typeof originalGtStart==='function'&&!originalGtStart.__gtUniformLogger)window.gtStartWorkout=wrapStart(originalGtStart);
  if(typeof originalHubStart==='function'&&!originalHubStart.__gtUniformLogger)window.gtStartHubDay=wrapStart(originalHubStart);
  if(typeof originalCustomStart==='function'&&!originalCustomStart.__gtUniformLogger)window.gtStartCustomPlan=wrapStart(originalCustomStart);

  function parseDateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function getSchedule(){try{return typeof gtSchedule!=='undefined'&&Array.isArray(gtSchedule)?gtSchedule:[]}catch(_){return []}}
  function saveSchedule(){try{gtSaveLocalSchedule()}catch(_){try{localStorage.setItem('gtai_schedule',JSON.stringify(getSchedule()))}catch(__){}}}
  async function persistScheduleDetails(item,oldDetails){
    try{
      if(typeof gtSupabase!=='undefined'&&gtSupabase&&typeof gtUser!=='undefined'&&gtUser&&!String(item.id||'').startsWith('local-')){
        const {error}=await gtSupabase.from('workout_schedule').update({details:item.details||{}}).eq('id',item.id).eq('user_id',gtUser.id);
        if(error){item.details=oldDetails;saveSchedule();window.gtRenderSchedule?.();alert(tr('Не вдалося зберегти зміну календаря: ','Could not save calendar change: ')+error.message);return false;}
      }
      saveSchedule();window.gtRenderSchedule?.();return true;
    }catch(err){item.details=oldDetails;saveSchedule();window.gtRenderSchedule?.();console.warn('Schedule update failed',err);return false;}
  }
  window.gtToggleScheduledWorkout=async function(id){
    if(!window.GT_PLUS_ACCESS){openPlus();return;}
    const item=getSchedule().find(x=>String(x.id)===String(id));if(!item)return;
    const old=item.details||{};item.details={...old,completed:!old.completed,completedAt:!old.completed?new Date().toISOString():null};
    await persistScheduleDetails(item,old);
  };
  window.gtStartScheduledWorkout=function(id){
    if(!window.GT_PLUS_ACCESS){openPlus();return;}
    const item=getSchedule().find(x=>String(x.id)===String(id));if(!item)return;
    activeScheduleId=String(item.id);launchingSchedule=true;
    const details=item.details||{};
    try{
      currentWorkout=String(item.title||tr('Тренування','Workout'));
      const saved=Array.isArray(details.exercises)?details.exercises:[];
      let parsed=saved.map(x=>Array.isArray(x)?[String(x[0]||''),String(x[1]||'3 × 8–12')]:[String(x?.name||x||''),String(x?.prescription||'3 × 8–12')]).filter(x=>x[0].trim());
      if(!parsed.length&&details.source==='plan'&&Number.isInteger(Number(details.dayIndex))){
        const optimized=window.gtGetOptimizedPlan?.();
        const day=optimized?.days?.[Number(details.dayIndex)];
        if(day?.items?.length)parsed=day.items.map(x=>Array.isArray(x)?[...x]:[x.name||String(x),'3 × 8–12']);
        else if(window.gtStartWorkout){window.gtStartWorkout('Plan day '+(Number(details.dayIndex)+1));activeScheduleId=String(item.id);return;}
      }
      if(!parsed.length)parsed=[...(typeof buildPlan==='function'&&profile?(buildPlan().days?.[0]?.items||[]):[])].map(x=>[...x]);
      currentExercises=parsed;
      const title=$('sessionTitle');if(title)title.textContent=currentWorkout;
      window.showPage?.('session');renderExerciseLogger();activeScheduleId=String(item.id);
    }finally{launchingSchedule=false;}
  };
  function decorateCalendarAgenda(){
    const root=$('gtModernCalendar');if(!root)return;
    const date=root.querySelector('.gt-calendar-day.selected')?.dataset.calDate;if(!date)return;
    const items=getSchedule().filter(x=>String(x.date||'').slice(0,10)===date);
    const rows=root.querySelectorAll('.gt-day-agenda .gt-agenda-item');
    rows.forEach((row,i)=>{
      if(row.dataset.gtAgendaActions==='1')return;
      const title=row.querySelector('.gt-agenda-copy strong')?.textContent||'';
      let item=items[i];
      if(!item||String(item.title||tr('Тренування','Workout'))!==title)item=items.find(x=>String(x.title||tr('Тренування','Workout'))===title);
      if(!item)return;
      row.dataset.gtAgendaActions='1';
      const done=!!item.details?.completed;row.classList.toggle('gt-schedule-done',done);
      const actions=document.createElement('div');actions.className='gt-agenda-actions';
      const start=document.createElement('button');start.type='button';start.className='primary';start.textContent=tr('▶ Почати','▶ Start');start.addEventListener('click',()=>window.gtStartScheduledWorkout(item.id));
      const mark=document.createElement('button');mark.type='button';mark.className=done?'done':'';mark.textContent=done?tr('✓ Виконано','✓ Completed'):tr('Позначити виконаним','Mark completed');mark.addEventListener('click',()=>window.gtToggleScheduledWorkout(item.id));
      actions.append(start,mark);row.appendChild(actions);
    });
  }
  function observeCalendar(){
    const calRoot=$('gtModernCalendar');
    if(calRoot&&window.MutationObserver&&!calRoot.dataset.gtFinalObserver){
      calRoot.dataset.gtFinalObserver='1';
      const observer=new MutationObserver(()=>decorateCalendarAgenda());
      observer.observe(calRoot,{childList:true,subtree:true});
      decorateCalendarAgenda();
    }
  }
  const oldRenderSchedule=window.gtRenderSchedule;
  if(typeof oldRenderSchedule==='function'){window.gtRenderSchedule=function(...args){const out=oldRenderSchedule.apply(this,args);decorateCalendarAgenda();return out;}}

  // Plus-guard all schedule mutations at the UI boundary; database policies are added separately.
  for(const name of ['gtAddSchedule','gtDeleteSchedule','gtMoveSchedule','gtGenerateSchedule']){
    const original=window[name];
    if(typeof original==='function'&&!original.__gtPlusGuard){
      const guarded=function(...args){if(!window.GT_PLUS_ACCESS){openPlus();return;}return original.apply(this,args)};
      guarded.__gtPlusGuard=true;window[name]=guarded;
    }
  }

  // Make every path used by the site to finish a workout persist the same detailed format.
  window.gtFinishWorkout=async function(){
    const arr=(()=>{try{return Array.isArray(gtSessionExerciseData)?gtSessionExerciseData:(window.gtSessionExerciseData||[])}catch(_){return window.gtSessionExerciseData||[]}})();
    const done=arr.filter(e=>e.completed).length;
    if(!done&&!confirm(tr('Не позначено виконаних вправ. Зберегти тренування?','No completed exercises are checked. Save the workout anyway?')))return;
    const premium=window.GT_PLUS_ACCESS===true;
    const exercises=arr.map(source=>{
      const e=syncExerciseLegacy({...source});
      if(!premium)return {name:e.name,prescription:e.prescription,completed:!!e.completed,sets:0,reps:0,weight:0,totalReps:0,setLogs:[]};
      return {...e,notes:String(e.notes||''),replacementHistory:Array.isArray(e.replacementHistory)?e.replacementHistory:[],setLogs:(e.setLogs||[]).map(s=>({reps:Number(s.reps)||0,weight:Number(s.weight)||0,completed:!!s.completed,edited:!!s.edited}))};
    });
    const record={name:typeof currentWorkout!=='undefined'?currentWorkout:tr('Тренування','Workout'),date:new Date().toISOString(),done,minutes:Number(profile?.duration)||30,exercises};
    try{history.unshift(record);localStorage.setItem('gtai_history',JSON.stringify(history));}catch(err){console.warn('Could not save workout to local history',err);}
    try{if(typeof gtSupabase!=='undefined'&&gtSupabase&&typeof gtUser!=='undefined'&&gtUser)await gtSyncWorkout(record);}catch(err){console.warn('Workout sync failed',err);}
    if(activeScheduleId){const item=getSchedule().find(x=>String(x.id)===String(activeScheduleId));if(item){const old=item.details||{};item.details={...old,completed:true,completedAt:new Date().toISOString()};await persistScheduleDetails(item,old);}activeScheduleId=null;}
    try{stopTimer()}catch(_){}
    try{renderHome()}catch(_){}try{renderHistory()}catch(_){}try{window.gtRenderStats?.()}catch(_){}
    window.showPage?.('stats');alert(tr('Тренування збережено!','Workout saved!'));
  };
  window.finishWorkout=window.gtFinishWorkout;
  try{finishWorkout=window.gtFinishWorkout}catch(_){}

  // Use safe energy estimates for adults and avoid assigning restrictive calorie/macronutrient targets to minors.
  window.gtRenderMacros=function(){
    const p=(typeof profile!=='undefined'&&profile)||{};const box=$('gtMacroAdvice');if(!box)return;
    const set=(id,v)=>{if($(id))$(id).textContent=v};const age=Number(p.age),kg=Number(p.weight);
    if(!(age>0&&kg>0)){set('gtMacroP','—');set('gtMacroF','—');set('gtMacroC','—');box.textContent=tr('Заповни вік і вагу у профілі для загального пояснення КБЖВ.','Enter age and weight in the profile for general macro guidance.');return;}
    if(age<18){set('gtMacroP',tr('за потребою','needs-based'));set('gtMacroF',tr('за потребою','needs-based'));set('gtMacroC',tr('за потребою','needs-based'));box.textContent=tr('До 18 років застосунок не встановлює персональні грами КБЖВ або дефіцит калорій за дорослими формулами. Потреби змінюються під час росту й залежать від спорту. Харчуйся регулярно та різноманітно; для персонального розрахунку звернись до сімейного лікаря або дієтолога.','Under 18, the app does not assign personal macro grams or calorie deficits using adult formulas. Needs change with growth and sport. Eat regularly and varied; ask a qualified health professional for an individualized estimate.');return;}
    const kcalText=String($('gtTargetKcal')?.textContent||'');const target=Number(kcalText.replace(/[^\d]/g,''))||0;
    if(!target){set('gtMacroP','—');set('gtMacroF','—');set('gtMacroC','—');box.textContent=tr('Для розподілу КБЖВ заповни зріст, вагу, вік, стать та активність.','Enter height, weight, age, sex and activity for a macro estimate.');return;}
    const goal=p.goal||'maintain';const rates={maintain:1.4,muscle:1.8,lose:1.6,strength:1.7,endurance:1.5,sport:1.6,general:1.4};const proteinRate=rates[goal]||1.4;
    const protein=Math.round(kg*proteinRate);const fat=Math.round(Math.max(kg,target*.25/9));const carbs=Math.max(0,Math.round((target-protein*4-fat*9)/4));
    set('gtMacroP',protein+' г');set('gtMacroF',fat+' г');set('gtMacroC',carbs+' г');
    box.textContent=tr(`Орієнтир для дорослих: білок ${proteinRate.toLocaleString('uk-UA')} г/кг; жири — близько 25% енергії, але не нижче орієнтира 1 г/кг; вуглеводи — решта за формулою 4/9/4 ккал на грам. Це оцінка, а не медичний припис.`,`Adult estimate: protein ${proteinRate.toLocaleString('en-US')} g/kg; fat about 25% of energy, with a guide minimum of 1 g/kg; carbs provide the remainder using 4/9/4 kcal per gram. Estimate only, not medical advice.`);
  };
  window.gtEstimateNutrition=function(){
    const p=(typeof profile!=='undefined'&&profile)||{};const out=$('gtTargetKcal'),advice=$('gtNutritionAdvice');if(!out||!advice)return;
    const set=(id,v)=>{if($(id))$(id).textContent=v};const age=Number(p.age),kg=Number(p.weight),cm=Number(p.height),sex=p.sex||'unspecified';
    const factors={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9};const mult=factors[p.activity]||1.55;
    if(age>0&&age<18){
      let low,high;if(age<=13){low=sex==='male'?2300:2100;high=sex==='male'?2600:2400}else{low=sex==='male'?2700:2200;high=sex==='male'?3200:2800}
      const bump={sedentary:0,light:0,moderate:100,active:200,very_active:300}[p.activity]||0;low+=bump;high+=bump;
      out.textContent=`${low.toLocaleString('uk-UA')}–${high.toLocaleString('uk-UA')}`;set('gtBMRValue','—');set('gtTDEEValue','—');set('gtEnergyFormula',tr('Для підлітків це широкий віковий орієнтир, не персональна ціль; доросла формула й корекція за метою не застосовуються.','For teens, this is a broad age-based reference, not an individualized target; adult equations and goal adjustments are not applied.'));
      advice.textContent=tr('Енергія також потрібна для росту. Не використовуй орієнтир для обмеження їжі або схуднення; за персональними рекомендаціями звернись до сімейного лікаря чи дієтолога.','Energy is also needed for growth. Do not use this reference to restrict food or lose weight; ask a qualified health professional for personal guidance.');
    } else if(age>=18&&kg>0&&cm>0&&sex!=='unspecified'){
      const bmr=10*kg+6.25*cm-5*age+(sex==='male'?5:-161);const tdee=bmr*mult;let target=tdee;let note=tr('підтримка','maintenance');
      if(p.goal==='lose'){target=tdee*.85;note=tr('орієнтовно −15% для дорослих','estimated −15% for adults')}else if(p.goal==='muscle'){target=tdee*1.10;note=tr('орієнтовно +10% для дорослих','estimated +10% for adults')}
      const rb=Math.round(bmr),rt=Math.round(tdee),rc=Math.round(target);out.textContent=rc.toLocaleString('uk-UA');set('gtBMRValue',rb.toLocaleString('uk-UA'));set('gtTDEEValue',rt.toLocaleString('uk-UA'));
      set('gtEnergyFormula',tr(`BMR = 10 × ${kg} + 6,25 × ${cm} − 5 × ${age} ${sex==='male'?'+ 5':'− 161'} = ${rb} ккал. TDEE = BMR × ${mult} = ${rt} ккал. Мета: ${note}.`,`BMR = 10 × ${kg} + 6.25 × ${cm} − 5 × ${age} ${sex==='male'?'+ 5':'− 161'} = ${rb} kcal. TDEE = BMR × ${mult} = ${rt} kcal. Goal: ${note}.`));
      advice.textContent=tr('Приблизний дорослий розрахунок за Міффліном—Сан Жеором. Фактичні потреби залежать від здоров’я та навантаження.','Approximate adult estimate using Mifflin–St Jeor. Actual needs depend on health and activity.');
    } else {
      out.textContent='—';set('gtBMRValue','—');set('gtTDEEValue','—');set('gtEnergyFormula',tr('Заповни вік, зріст, вагу та стать у профілі.','Enter age, height, weight and sex in the profile.'));advice.textContent=tr('Для дорослого орієнтира потрібні вік, зріст, вага, стать для формули та активність.','The adult estimate needs age, height, weight, sex for the equation, and activity.');
    }
    const total=Number($('gtKcal')?.textContent)||0;const bar=$('gtKcalProgress');const targetNow=age>=18&&kg>0&&cm>0&&sex!=='unspecified'?Number(String(out.textContent).replace(/[^\d]/g,''))||0:0;if(bar)bar.style.width=(targetNow?Math.min(100,total/targetNow*100):0)+'%';window.gtRenderMacros?.();
  };

  // Progress graph lives directly in the Training tab and uses all saved workout history.
  function mountProgressCard(){
    const page=$('recommend');if(!page||$('gtProgressCard'))return;
    const card=document.createElement('div');card.className='card';card.id='gtProgressCard';
    card.innerHTML=`<div class="section-head"><div><h3>${tr('Прогрес за вправами','Exercise progress')}</h3><p class="hint">${tr('Графік будується зі збережених тренувань, включно зі старою історією, де вже записані вага або повторення.','The chart uses saved workouts, including older records that already contain weight or rep data.')}</p></div><span class="pill">Plus</span></div><div class="gt-progress-body"><div class="gt-progress-controls"><div><label for="gtProgressExercise">${tr('Вправа','Exercise')}</label><select id="gtProgressExercise"></select></div></div><div id="gtProgressSummary" class="gt-progress-summary">${tr('Запиши тренування з підходами, щоб побачити зміни.','Log a workout with sets to see progress.')}</div><div id="gtProgressChart"></div></div>`;
    const anchor=$('planDays');if(anchor)anchor.insertAdjacentElement('afterend',card);else page.appendChild(card);
    $('gtProgressExercise').addEventListener('change',renderProgressChart);
  }
  function historyRows(){try{return typeof history!=='undefined'&&Array.isArray(history)?history:[]}catch(_){return []}}
  function getSetLogs(e){
    if(Array.isArray(e?.setLogs)&&e.setLogs.length)return e.setLogs.map(s=>({reps:Number(s.reps)||0,weight:Number(s.weight)||0}));
    if(Array.isArray(e?.sets)&&e.sets.length)return e.sets.map(s=>({reps:Number(s.reps)||0,weight:Number(s.weight)||0}));
    const count=Math.max(1,Math.min(10,Number(e?.sets)||1));const reps=Math.max(0,Number(e?.reps)||0);const weight=Math.max(0,Number(e?.weight)||0);
    return reps?Array.from({length:count},()=>({reps,weight})):[];
  }
  function collectProgress(){
    const names=new Set();for(const workout of historyRows())for(const ex of workout.exercises||[])if(ex?.name&&getSetLogs(ex).length)names.add(String(ex.name));
    return [...names].sort((a,b)=>a.localeCompare(b,en()?'en':'uk'));
  }
  function pointsForExercise(name){
    const matching=[];for(const w of historyRows()){const e=(w.exercises||[]).find(x=>String(x?.name||'')===name);if(!e)continue;const logs=getSetLogs(e);if(!logs.length)continue;const weight=Math.max(0,...logs.map(x=>x.weight));const reps=logs.reduce((s,x)=>s+x.reps,0);if(reps||weight)matching.push({date:new Date(w.date||w.created_at||Date.now()),weight,reps});}
    const weighted=matching.some(p=>p.weight>0);return {metric:weighted?'weight':'reps',points:matching.filter(p=>weighted?p.weight>0:p.reps>0).sort((a,b)=>a.date-b.date).map(p=>({date:p.date,value:weighted?p.weight:p.reps}))};
  }
  function shortDate(date){return new Date(date).toLocaleDateString(en()?'en-US':'uk-UA',{day:'numeric',month:'short'});}
  function renderProgressChart(){
    const select=$('gtProgressExercise'),chart=$('gtProgressChart'),summary=$('gtProgressSummary');if(!select||!chart||!summary)return;
    const names=collectProgress();const old=select.value;select.innerHTML=names.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    if(!names.length){select.disabled=true;chart.innerHTML=`<div class="gt-progress-empty">${tr('Поки немає збережених показників вправ. Після запису підходів, повторень і ваги тут з’явиться графік. Старі тренування без детальних показників не можна використати для графіка ваги.','No saved exercise metrics yet. After logging sets, reps and weights, a chart will appear. Older workouts without detailed measurements cannot be used for a weight chart.')}</div>`;summary.textContent=tr('Дані зберігаються в історії тренувань.','Data comes from workout history.');return;}
    select.disabled=false;if(names.includes(old))select.value=old;
    const data=pointsForExercise(select.value);const pts=data.points;const metric=data.metric==='weight'?tr('Найбільша робоча вага (кг)','Top working weight (kg)'):tr('Повторення за тренування','Reps per workout');
    if(!pts.length){chart.innerHTML=`<div class="gt-progress-empty">${tr('Для цієї вправи ще немає достатньо збережених значень.','There are not enough saved values for this exercise yet.')}</div>`;summary.textContent=metric;return;}
    const vals=pts.map(p=>p.value);const first=vals[0],last=vals[vals.length-1],change=last-first;const sign=change>0?'+':'';
    summary.textContent=`${metric}: ${first} → ${last} · ${tr('зміна','change')} ${sign}${change} · ${pts.length} ${tr('записів','records')}`;
    const W=640,H=245,L=54,R=18,T=22,B=47,plotW=W-L-R,plotH=H-T-B;let min=Math.min(...vals),max=Math.max(...vals);if(max===min){min=Math.max(0,min-1);max=max+1;}const pad=(max-min)*.12;min=Math.max(0,min-pad);max+=pad;const x=i=>pts.length===1?L+plotW/2:L+i*plotW/(pts.length-1);const y=v=>T+(max-v)/(max-min)*plotH;
    const ticks=Array.from({length:4},(_,i)=>min+(max-min)*i/3);const grid=ticks.map(v=>`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#312737" stroke-width="1"/><text x="${L-9}" y="${y(v)+4}" font-size="11" text-anchor="end" fill="currentColor">${Number(v.toFixed(1))}</text>`).join('');
    const poly=pts.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ');const circles=pts.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="4.5" fill="currentColor"><title>${escapeHtml(shortDate(p.date))}: ${p.value}</title></circle>`).join('');
    const labels=pts.map((p,i)=>i===0||i===pts.length-1||i===Math.floor(pts.length/2)?`<text x="${x(i)}" y="${H-18}" font-size="11" text-anchor="middle" fill="currentColor">${escapeHtml(shortDate(p.date))}</text>`:'').join('');
    chart.innerHTML=`<svg class="gt-progress-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(tr('Графік прогресу вправи','Exercise progress chart'))}">${grid}<polyline points="${poly}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${circles}${labels}</svg><p class="hint">${pts.length<2?tr('Це перший запис для вправи. Наступні тренування додадуть точки для порівняння.','This is the first record for this exercise. Future workouts will add points for comparison.') : tr('Кожна точка — збережене тренування. Показник: ','Each point is a saved workout. Metric: ')+metric+'.'}</p>`;
  }
  const oldStats=window.gtRenderStats;
  if(typeof oldStats==='function')window.gtRenderStats=function(...args){const result=oldStats.apply(this,args);renderProgressChart();applyPremiumUi();return result};
  const oldRenderHome=window.renderHome;
  if(typeof oldRenderHome==='function')window.renderHome=function(...args){const result=oldRenderHome.apply(this,args);renderProgressChart();return result};
  const oldSaveEdited=window.saveEditedProfile;
  if(typeof oldSaveEdited==='function')window.saveEditedProfile=function(...args){const result=oldSaveEdited.apply(this,args);setTimeout(()=>window.gtEstimateNutrition?.(),0);return result};
  const oldSaveProfile=window.saveProfile;
  if(typeof oldSaveProfile==='function')window.saveProfile=function(...args){const result=oldSaveProfile.apply(this,args);setTimeout(()=>window.gtEstimateNutrition?.(),0);return result};
  const oldShow=window.showPage;
  if(typeof oldShow==='function')window.showPage=function(id,...args){const result=oldShow.call(this,id,...args);if(id==='recommend'||id==='stats')renderProgressChart();if(id==='nutrition')window.gtEstimateNutrition?.();if(id==='profile'){setTimeout(()=>{const c=$('calendar');if(c&&$('profile')&&!c.classList.contains('gt-profile-calendar')){c.classList.remove('page','active');c.classList.add('gt-profile-calendar');const card=$('profile').querySelector(':scope > .card');if(card&&c.previousElementSibling!==card)card.insertAdjacentElement('afterend',c)}},0)}return result};

  // Preserve older workouts that were saved locally before account/cloud sync was enabled.
  // Cloud rows are authoritative for synchronized records; local-only entries are merged and de-duplicated.
  const originalAfterLogin = window.gtAfterLogin;
  if(typeof originalAfterLogin==='function'&&!originalAfterLogin.__gtPreserveLocalHistory){
    const wrappedAfterLogin=async function(...args){
      let localBefore=[];
      try{const parsed=JSON.parse(localStorage.getItem('gtai_history')||'[]');if(Array.isArray(parsed))localBefore=parsed;}catch(_){localBefore=[];}
      const result=await originalAfterLogin.apply(this,args);
      try{
        if(typeof gtUser==='undefined'||!gtUser)return result;
        const merged=historyRows().slice();
        const makeKey=w=>{
          const rawDate=w?.date||w?.created_at||'';const ms=new Date(rawDate).getTime();
          const dateKey=Number.isFinite(ms)?String(Math.floor(ms/1000)):'no-date';
          return `${String(w?.name||w?.title||'').trim().toLowerCase()}|${dateKey}|${Number(w?.done??w?.completed_exercises)||0}|${Number(w?.minutes)||0}`;
        };
        const seen=new Set(merged.map(makeKey));
        for(const w of localBefore){const key=makeKey(w);if(!seen.has(key)){merged.push(w);seen.add(key);}}
        merged.sort((a,b)=>new Date(b.date||b.created_at||0).getTime()-new Date(a.date||a.created_at||0).getTime());
        history=merged;
        localStorage.setItem('gtai_history',JSON.stringify(merged));
        if(typeof renderHistory==='function')renderHistory();
        if(typeof renderHome==='function')renderHome();
        window.gtRenderStats?.();renderProgressChart();
      }catch(err){console.warn('Could not merge local workout history:',err?.message||err);}
      return result;
    };
    wrappedAfterLogin.__gtPreserveLocalHistory=true;
    window.gtAfterLogin=wrappedAfterLogin;
  }

  // Initial hooks run after the existing app scripts have created the corresponding views.
  const boot=()=>{mountProgressCard();renderProgressChart();observeCalendar();decorateCalendarAgenda();applyPremiumUi();window.gtEstimateNutrition?.();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('focus',()=>{window.gtRefreshPlusAccess?.();renderProgressChart()});
})();
