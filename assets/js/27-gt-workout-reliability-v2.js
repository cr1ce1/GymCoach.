(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const isEn = () => String(document.documentElement.lang || 'uk').toLowerCase().startsWith('en');
  const tr = (uk, en) => isEn() ? en : uk;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase(isEn()?'en':'uk').trim();
  const userId = () => { try { return typeof gtUser !== 'undefined' && gtUser?.id ? String(gtUser.id) : ''; } catch (_) { return ''; } };
  const accountKey = () => userId() || 'local';
  const draftKey = () => 'gtai_workout_draft_v2:' + accountKey();
  const customKey = () => 'gtai_custom_exercises_v2:' + accountKey();
  let cloudSaveTimer = null;
  let customExercises = [];
  let activeReplacementIndex = -1;
  let restoringDraft = false;
  let finishingWorkout = false;
  let pauseTransition = false;

  const css = document.createElement('style');
  css.id = 'gt-workout-reliability-v2-css';
  css.textContent = `
    #gtWorkoutResumeCard{border-color:#5c2a7d;background:linear-gradient(145deg,#29103a,#1c0c26);margin:14px 0}
    #gtWorkoutResumeCard .gt-resume-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    #gtWorkoutResumeCard button,#gtWorkoutDraftControls button{border:1px solid var(--line);border-radius:11px;padding:10px 13px;font-weight:800;cursor:pointer}
    #gtWorkoutResumeCard .gt-resume-primary,#gtWorkoutDraftControls .gt-draft-primary{background:linear-gradient(135deg,#b54ff8,#b34ff6);color:#14041e;border-color:#b54ff8}
    #gtWorkoutResumeCard .gt-resume-secondary,#gtWorkoutDraftControls .gt-draft-secondary{background:var(--panel2);color:var(--text)}
    #gtWorkoutDraftControls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-color:#59287a}
    #gtWorkoutDraftControls p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
    #gtWorkoutDraftControls .gt-draft-actions{display:flex;gap:8px;flex-wrap:wrap}
    .gt-copy-prev-set{display:block;margin:0 0 8px auto;background:var(--panel2);border:1px solid var(--line);color:var(--text);border-radius:9px;padding:7px 10px;font-size:11px;font-weight:800;cursor:pointer}
    .gt-copy-prev-set:disabled{opacity:.4;cursor:not-allowed}
    #gtExerciseReplaceDialog{position:fixed;inset:0;z-index:2500;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(10,2,15,.82);backdrop-filter:blur(10px)}
    #gtExerciseReplaceDialog.open{display:flex}
    #gtExerciseReplaceDialog .gt-replace-panel{width:min(100%,680px);max-height:min(88vh,900px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:18px;box-shadow:0 24px 80px #0009}
    #gtExerciseReplaceDialog .gt-replace-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    #gtExerciseReplaceDialog h2{font-size:21px;margin:0}
    #gtExerciseReplaceDialog .gt-replace-close{border:1px solid var(--line);border-radius:10px;padding:8px 11px;background:var(--panel2);color:var(--text)}
    #gtExerciseReplaceSearch{width:100%;margin:13px 0}
    #gtExerciseReplaceResults{display:grid;gap:8px}
    .gt-replace-result{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--line);border-radius:13px;background:var(--panel2)}
    .gt-replace-result strong{display:block;overflow-wrap:anywhere}.gt-replace-result small{display:block;color:var(--muted);font-size:12px;margin-top:4px}
    .gt-replace-result button{flex-shrink:0;border:0;border-radius:9px;padding:9px 11px;background:linear-gradient(135deg,#b54ff8,#b34ff6);color:#14041e;font-weight:850}
    #gtCustomExerciseEditor{margin:14px 0;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:16px}
    #gtCustomExerciseEditor h3{margin:0 0 6px;font-size:18px}
    #gtCustomExerciseEditor .gt-custom-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    #gtCustomExerciseEditor label{display:block;font-size:12px;margin:7px 0;color:var(--muted)}
    #gtCustomExerciseEditor input,#gtCustomExerciseEditor select,#gtCustomExerciseEditor textarea{width:100%;margin-top:5px;min-width:0}
    #gtCustomExerciseEditor .gt-custom-wide{grid-column:1/-1}
    #gtCustomExerciseStatus{font-size:12px;color:var(--muted);line-height:1.5;margin-top:9px;white-space:pre-wrap}
    #gtCustomExerciseEditor .gt-custom-save{border:0;border-radius:11px;background:linear-gradient(135deg,#b54ff8,#b34ff6);color:#14041e;padding:11px 14px;font-weight:850}
    @media(max-width:520px){#gtCustomExerciseEditor .gt-custom-grid{grid-template-columns:1fr}.gt-custom-wide{grid-column:auto}.gt-replace-result{align-items:flex-start}.gt-replace-result button{white-space:normal}.gt-copy-prev-set{width:100%;margin-bottom:5px}}
  `;
  document.head.appendChild(css);

  function plusAllowed(){ try { return window.GT_PLUS_ACCESS === true; } catch (_) { return false; } }
  function getSupabase(){ try { return typeof gtSupabase !== 'undefined' ? gtSupabase : null; } catch (_) { return null; } }
  function readDraft(){ try { const value=JSON.parse(localStorage.getItem(draftKey())||'null'); return value && Array.isArray(value.exercises) ? value : null; } catch (_) { return null; } }
  function writeLocalDraft(snapshot){ try { localStorage.setItem(draftKey(),JSON.stringify(snapshot)); return true; } catch (err) { console.warn('Workout draft could not be saved locally',err); return false; } }
  function currentSessionData(){ try { return Array.isArray(gtSessionExerciseData) ? gtSessionExerciseData : []; } catch (_) { return []; } }
  function makeDraftSnapshot(){
    const detailed=plusAllowed();
    const data=currentSessionData().map(source=>{
      const e={...source};
      if(detailed){e.setLogs=(Array.isArray(source.setLogs)?source.setLogs:[]).map(s=>({reps:Math.max(0,Number(s.reps)||0),weight:Math.max(0,Number(s.weight)||0),completed:!!s.completed,edited:!!s.edited}));}
      else {e.setLogs=[];e.sets=0;e.reps=0;e.weight=0;e.totalReps=0;}
      return e;
    });
    return {version:2,name:String(typeof currentWorkout!=='undefined'?currentWorkout:''),updatedAt:new Date().toISOString(),timerSeconds:(()=>{try{return Math.max(0,Number(timer)||0)}catch(_){return 90}})(),exercises:data,source:'workout-session'};
  }
  async function syncDraftToCloud(snapshot){
    if(typeof window.GT_SYNC_DRAFT_SAFELY==='function')return window.GT_SYNC_DRAFT_SAFELY(snapshot);
    const sb=getSupabase(), uid=userId();
    if(!sb||!uid)return false;
    try{
      const {error}=await sb.from('workout_drafts').upsert({user_id:uid,title:snapshot.name,details:snapshot,updated_at:snapshot.updatedAt},{onConflict:'user_id'});
      if(error)throw error;
      return true;
    }catch(err){console.warn('Workout draft cloud sync unavailable; local draft retained:',err?.message||err);return false;}
  }
  async function saveDraftNow(){
    if(!String(typeof currentWorkout!=='undefined'?currentWorkout:'').trim() || !currentSessionData().length) return false;
    const snapshot=makeDraftSnapshot();
    const ok=writeLocalDraft(snapshot);
    refreshResumeCard();
    await syncDraftToCloud(snapshot);
    return ok;
  }
  function queueDraftSave(){
    const snapshot=makeDraftSnapshot();
    writeLocalDraft(snapshot);
    if(cloudSaveTimer)clearTimeout(cloudSaveTimer);
    cloudSaveTimer=setTimeout(()=>{cloudSaveTimer=null;syncDraftToCloud(snapshot)},1200);
  }
  async function clearDraft(){
    if(cloudSaveTimer){clearTimeout(cloudSaveTimer);cloudSaveTimer=null;}
    try{localStorage.removeItem(draftKey())}catch(_){}
    const sb=getSupabase(),uid=userId();
    if(sb&&uid){try{const {error}=await sb.from('workout_drafts').delete().eq('user_id',uid);if(error)console.warn('Could not clear cloud workout draft:',error.message)}catch(err){console.warn('Could not clear cloud workout draft:',err?.message||err)}}
    refreshResumeCard();
  }
  async function loadCloudDraft(){
    const sb=getSupabase(),uid=userId();if(!sb||!uid)return;
    try{
      const {data,error}=await sb.from('workout_drafts').select('details,updated_at').eq('user_id',uid).maybeSingle();
      if(error)throw error;
      if(data?.details&&Array.isArray(data.details.exercises)){
        const cloud={...data.details,updatedAt:data.updated_at||data.details.updatedAt||new Date().toISOString()};
        const local=readDraft();
        if(!local){writeLocalDraft(cloud);}
        else if(new Date(cloud.updatedAt).getTime()>new Date(local.updatedAt||0).getTime()){
          const contentOnly=d=>JSON.stringify({name:d?.name||'',exercises:(d?.exercises||[]).map(e=>({name:e.name||'',notes:e.notes||'',setLogs:(e.setLogs||[]).map(s=>({reps:s.reps,weight:s.weight,completed:s.completed,type:s.type,rpe:s.rpe,rir:s.rir}))}))});
          if(contentOnly(local)!==contentOnly(cloud)){
            // Preserve both copies. The v4 UI will offer an explicit device-vs-cloud choice.
            try{localStorage.setItem(`gtai_workout_draft_conflict_candidate:${uid}`,JSON.stringify({savedAt:new Date().toISOString(),local,cloud}))}catch(_){}
          }else{writeLocalDraft(cloud);}
        }
      }else if(readDraft()){
        const local=readDraft();
        await sb.from('workout_drafts').upsert({user_id:uid,title:local.name,details:local,updated_at:local.updatedAt||new Date().toISOString()},{onConflict:'user_id'});
      }
    }catch(err){console.warn('Workout draft could not be loaded from Supabase; using local copy if available:',err?.message||err)}
    refreshResumeCard();
  }
  function parsePrescriptionLocal(value){
    const m=String(value||'').match(/(\d+)\s*[x×]\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
    const count=m?Math.max(1,Math.min(10,Number(m[1])||3)):3;
    const low=m?Number(m[2])||10:10, high=m&&m[3]?Number(m[3])||low:low;
    return {count,reps:Math.max(1,Math.min(100,Math.round((low+high)/2)))};
  }
  function renderDraftExercises(exercises){
    const root=$('exerciseList');if(!root)return;
    const detailed=plusAllowed();
    root.innerHTML=(exercises||[]).map((source,i)=>{
      const e={...source};const parsed=parsePrescriptionLocal(e.prescription);
      let logs=detailed&&Array.isArray(e.setLogs)&&e.setLogs.length?e.setLogs.map(s=>({...s,reps:Math.max(1,Math.min(100,Number(s.reps)||parsed.reps)),weight:Math.max(0,Math.min(500,Number(s.weight)||0)),completed:!!s.completed,edited:!!s.edited})):Array.from({length:parsed.count},()=>({reps:parsed.reps,weight:0,completed:false,edited:false}));
      if(!detailed)logs=[];
      e.setLogs=logs;e.sets=logs.length||parsed.count;e.reps=parsed.reps;e.weight=0;e.completed=!!source.completed;
      return {e,i};
    }).map(({e,i})=>{
      const links=(()=>{try{return typeof techniqueUrl==='function'?techniqueUrl(e.name):''}catch(_){return ''}})();
      const video=links?`<a class="tech-video" href="${esc(links)}" target="_blank" rel="noopener">▶ ${tr('Відео техніки','Technique video')}</a>`:'';
      const setsHtml=(e.setLogs||[]).map((s,j)=>`<div class="gt-set-row"><span class="gt-set-number">${tr('Підхід','Set')} ${j+1}</span><label>${tr('Повторення','Reps')}<input type="number" inputmode="numeric" min="1" max="100" value="${s.reps}" onchange="gtWorkoutSetChange(${i},${j},'reps',this.value)"></label><label>${tr('Вага, кг','Weight, kg')}<input type="number" inputmode="decimal" min="0" max="500" step="0.5" value="${s.weight}" onchange="gtWorkoutSetChange(${i},${j},'weight',this.value)"></label></div>`).join('');
      return `<div class="session-row gt-logged-exercise" data-session-index="${i}" data-exercise="${esc(e.name)}"><div class="session-main"><div class="gt-session-exercise-heading"><input class="gt-session-completion" type="checkbox" aria-label="${tr('Вправу виконано','Exercise completed')}" ${e.completed?'checked':''} onchange="gtToggleExerciseDone(${i},this.checked)"><div class="details"><b class="session-ex-name">${esc(e.name)}</b><small style="display:block;color:var(--muted);margin-top:4px">${esc(e.prescription||'3 × 8–12')}</small>${video}</div></div><div class="gt-set-count-row"><label>${tr('Кількість підходів','Number of sets')}<input type="number" min="1" max="10" value="${e.setLogs?.length||parsePrescriptionLocal(e.prescription).count}" onchange="gtWorkoutSetCount(${i},this.value)"></label><button type="button" class="chip" onclick="gtSubstitute(${i})">↻ ${tr('Замінити вправу','Substitute exercise')}</button></div><div class="gt-set-log-panel"><h4>${tr('Результат кожного підходу','Each set result')}</h4>${setsHtml}</div></div></div>`;
    }).join('');
    try{if(typeof window.gtUpdatePremiumSurfaces==='function')window.gtUpdatePremiumSurfaces(plusAllowed())}catch(_){}
  }
  function resumeDraft(){
    const snapshot=readDraft();if(!snapshot)return;
    restoringDraft=true;
    try{
      currentWorkout=String(snapshot.name||tr('Тренування','Workout'));
      currentExercises=(snapshot.exercises||[]).map(e=>[String(e.name||''),String(e.prescription||'3 × 8–12')]);
      gtSessionExerciseData=(snapshot.exercises||[]).map(source=>{
        const e={...source};const parsed=parsePrescriptionLocal(e.prescription);
        if(plusAllowed()&&Array.isArray(e.setLogs)&&e.setLogs.length){e.setLogs=e.setLogs.map(s=>({...s,reps:Math.max(1,Number(s.reps)||parsed.reps),weight:Math.max(0,Number(s.weight)||0),completed:!!s.completed,edited:!!s.edited}));}
        else e.setLogs=plusAllowed()?Array.from({length:parsed.count},()=>({reps:parsed.reps,weight:0})):[];
        e.sets=e.setLogs.length||parsed.count;e.reps=parsed.reps;e.weight=0;e.completed=!!source.completed;return e;
      });
      if($('sessionTitle'))$('sessionTitle').textContent=currentWorkout;
      renderDraftExercises(snapshot.exercises||[]);
      try{if(typeof setTimer==='function')setTimer(Math.max(0,Number(snapshot.timerSeconds)||90))}catch(_){}
      ensureDraftControls();
      window.showPage?.('session');
      if($('sessionTitle'))$('sessionTitle').textContent=currentWorkout;
      queueDraftSave();
    }finally{restoringDraft=false}
  }
  function refreshResumeCard(){
    const home=$('home');if(!home)return;
    let card=$('gtWorkoutResumeCard');
    if(!card){card=document.createElement('div');card.id='gtWorkoutResumeCard';card.className='card';const hero=home.querySelector('.hero');if(hero)hero.insertAdjacentElement('afterend',card);else home.prepend(card);}
    const d=readDraft();card.hidden=!d;if(!d)return;
    const date=d.updatedAt?new Date(d.updatedAt).toLocaleString(isEn()?'en-US':'uk-UA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    card.innerHTML=`<div class="row"><div><span class="tag">${tr('ЧЕРНЕТКА ТРЕНУВАННЯ','PAUSED WORKOUT')}</span><h3 style="margin:7px 0">${esc(d.name||tr('Тренування','Workout'))}</h3><p class="hint" style="margin:0">${(d.exercises||[]).length} ${tr('вправ','exercises')} · ${tr('збережено','saved')} ${esc(date)}</p></div><span class="pill">${tr('Не завершено','In progress')}</span></div><div class="gt-resume-actions"><button type="button" class="gt-resume-primary" id="gtResumeWorkoutBtn">▶ ${tr('Продовжити тренування','Resume workout')}</button><button type="button" class="gt-resume-secondary" id="gtDiscardWorkoutDraftBtn">${tr('Видалити чернетку','Discard draft')}</button></div><p id="gtDraftSyncInfo" class="hint" style="margin:9px 0 0">${userId()?tr('Чернетка зберігається локально та синхронізується через Supabase, якщо міграцію застосовано.','Draft is stored locally and syncs through Supabase when the migration is applied.'):tr('Чернетка збережена в цьому браузері. Увійди, щоб синхронізувати її між пристроями.','Draft is saved in this browser. Sign in to sync across devices.')}</p>`;
    $('gtResumeWorkoutBtn')?.addEventListener('click',resumeDraft);
    $('gtDiscardWorkoutDraftBtn')?.addEventListener('click',async()=>{if(!confirm(tr('Видалити збережену чернетку тренування?','Discard the saved workout draft?')))return;await clearDraft();});
  }
  function ensureDraftControls(){
    const session=$('session');if(!session)return;
    let box=$('gtWorkoutDraftControls');
    if(!box){box=document.createElement('div');box.className='card';box.id='gtWorkoutDraftControls';const intro=session.querySelector('p.muted');if(intro)intro.insertAdjacentElement('afterend',box);else session.prepend(box);}
    box.innerHTML=`<div><strong>${tr('Автозбереження тренування','Workout autosave')}</strong><p>${tr('Зміни зберігаються як чернетка. Можна перейти на інший розділ і повернутися пізніше.','Changes are saved as a draft. You can leave this page and return later.')}</p></div><div class="gt-draft-actions"><button type="button" class="gt-draft-primary" id="gtPauseWorkoutBtn">Ⅱ ${tr('Призупинити й зберегти','Pause and save')}</button></div>`;
    $('gtPauseWorkoutBtn')?.addEventListener('click',async()=>{pauseTransition=true;try{await saveDraftNow();try{stopTimer()}catch(_){}window.showPage?.('home')}finally{pauseTransition=false}});
  }
  function injectQuickCopyButtons(){
    if(!plusAllowed())return;
    document.querySelectorAll('#exerciseList .gt-logged-exercise').forEach((exerciseRow,i)=>{
      const rows=[...exerciseRow.querySelectorAll('.gt-set-row')];
      rows.forEach((row,j)=>{
        // The set editor inserts a completion/delete toolbar between the set row and the
        // next set. Identify controls by their target set, not by nextElementSibling,
        // otherwise the MutationObserver can inject duplicate copy buttons indefinitely.
        const existing=exerciseRow.querySelector(`.gt-copy-prev-set[data-copy-set="${j}"]`);
        if(j===0){existing?.remove();return;}
        if(existing)return;
        const button=document.createElement('button');button.type='button';button.className='gt-copy-prev-set';button.dataset.copySet=String(j);button.textContent=tr('↳ Копіювати вагу й повторення з підходу ','↳ Copy weight and reps from set ')+(j);
        button.addEventListener('click',()=>{
          let ex;try{ex=gtSessionExerciseData[Number(exerciseRow.dataset.sessionIndex??i)]}catch(_){ex=null}if(!ex||!ex.setLogs?.[j]||!ex.setLogs[j-1])return;
          // Copy only weight and repetitions; completion is a new action for this set.
          ex.setLogs[j]={reps:Number(ex.setLogs[j-1].reps)||1,weight:Number(ex.setLogs[j-1].weight)||0,completed:false,edited:false};
          const inputs=row.querySelectorAll('input');if(inputs[0])inputs[0].value=ex.setLogs[j].reps;if(inputs[1])inputs[1].value=ex.setLogs[j].weight;
          try{const sessionIndex=Number(exerciseRow.dataset.sessionIndex??i);if(typeof gtWorkoutSetChange==='function'){gtWorkoutSetChange(sessionIndex,j,'reps',ex.setLogs[j].reps);gtWorkoutSetChange(sessionIndex,j,'weight',ex.setLogs[j].weight)}}catch(_){}
          queueDraftSave();
        });
        row.insertAdjacentElement('afterend',button);
      });
    });
  }
  function replaceDialog(){
    let dialog=$('gtExerciseReplaceDialog');if(dialog)return dialog;
    dialog=document.createElement('div');dialog.id='gtExerciseReplaceDialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','gtExerciseReplaceTitle');
    dialog.innerHTML=`<div class="gt-replace-panel"><div class="gt-replace-head"><h2 id="gtExerciseReplaceTitle">${tr('Пошук вправи в усьому каталозі','Search the entire exercise library')}</h2><button type="button" class="gt-replace-close" id="gtExerciseReplaceClose">✕ ${tr('Закрити','Close')}</button></div><p class="hint">${tr('Пошук охоплює всі вбудовані вправи та твої власні вправи, українською й англійською.','Search covers all built-in exercises and your own exercises, in Ukrainian and English.')}</p><input id="gtExerciseReplaceSearch" type="search" placeholder="${tr('Назва, м’язи, обладнання…','Name, muscles, equipment…')}" autocomplete="off"><div id="gtExerciseReplaceCount" class="hint"></div><div id="gtExerciseReplaceResults"></div></div>`;
    document.body.appendChild(dialog);
    $('gtExerciseReplaceClose').addEventListener('click',closeReplaceDialog);
    dialog.addEventListener('click',e=>{if(e.target===dialog)closeReplaceDialog()});
    $('gtExerciseReplaceSearch').addEventListener('input',renderReplacementResults);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.classList.contains('open'))closeReplaceDialog()});
    return dialog;
  }
  function allExerciseRecords(){
    const items=Array.isArray(libraryExercises)?libraryExercises.slice():[];
    const seen=new Set(items.map(e=>norm(e.name)));
    for(const e of customExercises){if(e?.name&&!seen.has(norm(e.name))){items.push(e);seen.add(norm(e.name))}}
    return items;
  }
  function renderReplacementResults(){
    const q=norm($('gtExerciseReplaceSearch')?.value||'');const root=$('gtExerciseReplaceResults');if(!root)return;
    const all=allExerciseRecords();const matches=all.filter(e=>!q||norm([e.name,e.en,e.muscles,e.category,...(e.aliases||[])].filter(Boolean).join(' ')).includes(q));
    $('gtExerciseReplaceCount').textContent=tr('Знайдено','Found')+': '+matches.length+' '+tr('вправ','exercises');
    root.innerHTML=matches.map(e=>`<div class="gt-replace-result"><div><strong>${esc(isEn()?(e.en||e.name):e.name)}</strong><small>${esc(e.category||tr('Власна вправа','Custom exercise'))}${e.muscles?' · '+esc(e.muscles):''}</small></div><button type="button" data-name="${esc(e.name)}" data-prescription="${esc(e.prescription||'')}">${tr('Обрати','Select')}</button></div>`).join('')||`<div class="empty">${tr('Не знайдено. Спробуй коротшу назву або іншу мову.','No matches. Try a shorter name or another language.')}</div>`;
    root.querySelectorAll('button[data-name]').forEach(b=>b.addEventListener('click',()=>chooseReplacement(b.dataset.name,b.dataset.prescription)));
  }
  function openReplaceDialog(index){
    activeReplacementIndex=Number(index);const dialog=replaceDialog();dialog.classList.add('open');$('gtExerciseReplaceSearch').value='';renderReplacementResults();$('gtExerciseReplaceSearch').focus();
  }
  function closeReplaceDialog(){const dialog=$('gtExerciseReplaceDialog');if(dialog)dialog.classList.remove('open');activeReplacementIndex=-1;}
  function chooseReplacement(name,prescription){
    const i=activeReplacementIndex;let data;try{data=gtSessionExerciseData}catch(_){data=[]}
    const e=Array.isArray(data)?data[i]:null;if(!e||!name)return;
    e.name=String(name);if(prescription)e.prescription=prescription;
    try{if(Array.isArray(currentExercises)&&currentExercises[i])currentExercises[i]=[e.name,e.prescription||'3 × 8–12']}catch(_){}
    const row=document.querySelector(`#exerciseList [data-session-index="${i}"]`);
    if(row){row.dataset.exercise=e.name;const title=row.querySelector('.session-ex-name');if(title)title.textContent=e.name;const small=row.querySelector('.session-main .details small');if(small&&e.prescription)small.textContent=e.prescription;}
    closeReplaceDialog();queueDraftSave();
  }
  window.gtSubstitute=function(index){openReplaceDialog(index)};
  try{gtSubstitute=window.gtSubstitute}catch(_){}

  function loadLocalCustomExercises(){
    try{const value=JSON.parse(localStorage.getItem(customKey())||'[]');return Array.isArray(value)?value:[]}catch(_){return []}
  }
  function applyCustomExerciseRecords(records){
    const oldNames=new Set(customExercises.map(e=>norm(e.name)));
    const normalized=(records||[]).filter(e=>e&&String(e.name||'').trim()).map(e=>({
      name:String(e.name).trim(),en:String(e.en||e.en_name||'').trim(),category:String(e.category||'Власні').trim(),muscles:String(e.muscles||'').trim(),how:String(e.how||e.instructions||'').trim(),mistakes:String(e.mistakes||'').trim(),aliases:Array.isArray(e.aliases)?e.aliases:[],equipment:Array.isArray(e.equipment)?e.equipment:(e.equipment?[e.equipment]:[]),location:String(e.location||e.training_location||e.place||'all'),difficulty:String(e.difficulty||''),videoUrl:String(e.videoUrl||e.video_url||''),notes:String(e.notes||''),_gtUserExercise:true,customId:e.id||e.exercise_id||null
    }));
    customExercises=normalized;
    for(let i=libraryExercises.length-1;i>=0;i--){if(libraryExercises[i]?._gtUserExercise)libraryExercises.splice(i,1)}
    const seen=new Set(libraryExercises.map(e=>norm(e.name)));
    for(const e of normalized){if(!seen.has(norm(e.name))){libraryExercises.push(e);seen.add(norm(e.name))}}
    if($('exerciseSearch')&&typeof renderLibrary==='function')renderLibrary();
    renderReplacementResultsIfOpen();
  }
  function renderReplacementResultsIfOpen(){const dialog=$('gtExerciseReplaceDialog');if(dialog?.classList.contains('open'))renderReplacementResults()}
  async function loadUserCustomExercises(){
    const local=loadLocalCustomExercises();applyCustomExerciseRecords(local);
    const sb=getSupabase(),uid=userId();if(!sb||!uid)return;
    try{
      const {data,error}=await sb.from('user_custom_exercises').select('*').eq('user_id',uid).order('created_at',{ascending:true});
      if(error)throw error;
      const cloud=(data||[]).map(r=>({id:r.id,name:r.name,en:r.en_name,category:r.category,muscles:r.muscles,how:r.instructions,mistakes:r.mistakes,aliases:r.aliases||[],equipment:r.equipment||[],location:r.training_location||'all',difficulty:r.difficulty||'',videoUrl:r.video_url||'',notes:r.notes||''}));
      const merged=[...cloud];const seen=new Set(cloud.map(e=>norm(e.name)));for(const e of local){if(!seen.has(norm(e.name))){merged.push(e);seen.add(norm(e.name));}}
      applyCustomExerciseRecords(merged);
      try{localStorage.setItem(customKey(),JSON.stringify(merged))}catch(_){}
    }catch(err){console.warn('Custom exercise cloud library unavailable; local records remain usable:',err?.message||err)}
  }
  function ensureCustomExerciseEditor(){
    const page=$('library');if(!page||$('gtCustomExerciseEditor'))return;
    const card=document.createElement('section');card.className='card';card.id='gtCustomExerciseEditor';
    card.innerHTML=`<h3>${tr('Створи власну вправу','Create your own exercise')}</h3><p class="hint">${tr('Власна вправа з’явиться в пошуку бібліотеки та у вікні заміни вправ. Для синхронізації між пристроями потрібні таблиця й RLS з окремої SQL-міграції.','Your exercise will appear in library search and exercise replacement. Cross-device sync needs the table and RLS from the separate SQL migration.')}</p><form id="gtCustomExerciseForm"><div class="gt-custom-grid"><label>${tr('Назва *','Name *')}<input id="gtCustomExerciseName" maxlength="100" required autocomplete="off" placeholder="${tr('Наприклад, жим у тренажері','e.g. machine chest press')}"></label><label>${tr('Англійська назва (необов’язково)','English name (optional)')}<input id="gtCustomExerciseEn" maxlength="100" autocomplete="off"></label><label>${tr('Категорія','Category')}<select id="gtCustomExerciseCategory"><option value="Ноги">${tr('Ноги','Legs')}</option><option value="Груди">${tr('Груди','Chest')}</option><option value="Спина">${tr('Спина','Back')}</option><option value="Плечі">${tr('Плечі','Shoulders')}</option><option value="Руки">${tr('Руки','Arms')}</option><option value="Трицепс">${tr('Трицепс','Triceps')}</option><option value="Кор">${tr('Кор','Core')}</option><option value="Сідниці">${tr('Сідниці','Glutes')}</option><option value="Усе тіло">${tr('Усе тіло','Full body')}</option><option value="Мобільність">${tr('Мобільність','Mobility')}</option><option value="Власні">${tr('Власні','Custom')}</option></select></label><label>${tr('Основні м’язи','Main muscles')}<input id="gtCustomExerciseMuscles" maxlength="180" placeholder="${tr('Наприклад, груди, трицепс','e.g. chest, triceps')}"></label><label class="gt-custom-wide">${tr('Як виконувати','Instructions')}<textarea id="gtCustomExerciseHow" rows="2" maxlength="1000" placeholder="${tr('Коротка інструкція (необов’язково)','Short instructions (optional)')}"></textarea></label><label class="gt-custom-wide">${tr('Поширені помилки (необов’язково)','Common mistakes (optional)')}<textarea id="gtCustomExerciseMistakes" rows="2" maxlength="700"></textarea></label></div><div style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="gt-custom-save" type="submit">＋ ${tr('Зберегти вправу','Save exercise')}</button><button class="btn secondary" type="reset">${tr('Очистити форму','Clear form')}</button></div><div id="gtCustomExerciseStatus" role="status"></div></form>`;
    const search=$('exerciseSearch')?.closest('.field');if(search)search.insertAdjacentElement('beforebegin',card);else page.appendChild(card);
    $('gtCustomExerciseForm').addEventListener('submit',saveCustomExercise);
  }
  async function saveCustomExercise(event){
    event.preventDefault();const status=$('gtCustomExerciseStatus');
    const record={name:$('gtCustomExerciseName').value.trim(),en:$('gtCustomExerciseEn').value.trim(),category:$('gtCustomExerciseCategory').value,muscles:$('gtCustomExerciseMuscles').value.trim(),how:$('gtCustomExerciseHow').value.trim(),mistakes:$('gtCustomExerciseMistakes').value.trim(),aliases:[],_gtUserExercise:true};
    if(!record.name){$('gtCustomExerciseName').focus();return;}
    if(allExerciseRecords().some(e=>norm(e.name)===norm(record.name))){if(status)status.textContent=tr('Вправа з такою назвою вже є в бібліотеці. Зміни назву або знайди її в пошуку.','An exercise with this name already exists. Change the name or find it in the library.');return;}
    const uid=userId(),sb=getSupabase();let cloudSaved=false;
    try{
      if(uid&&sb){const {data,error}=await sb.from('user_custom_exercises').upsert({user_id:uid,name:record.name,en_name:record.en||null,category:record.category,muscles:record.muscles||null,instructions:record.how||null,mistakes:record.mistakes||null,aliases:record.aliases},{onConflict:'user_id,name'}).select().single();if(error)throw error;record.id=data?.id;cloudSaved=true;}
    }catch(err){console.warn('Custom exercise not synced to Supabase:',err?.message||err)}
    const local=loadLocalCustomExercises();local.push(record);try{localStorage.setItem(customKey(),JSON.stringify(local))}catch(err){console.warn('Custom exercise browser save failed',err)}
    applyCustomExerciseRecords([...customExercises,record]);
    if(typeof renderLibrary==='function')renderLibrary();
    $('gtCustomExerciseForm').reset();
    if(status)status.textContent=cloudSaved?tr('Вправу збережено та синхронізовано з акаунтом.','Exercise saved and synced to your account.'):uid?tr('Вправу збережено в цьому браузері. Хмарна синхронізація не підтверджена — перевір SQL-міграцію та RLS.','Exercise saved in this browser. Cloud sync is unconfirmed — check the SQL migration and RLS.'):tr('Вправу збережено в цьому браузері. Щоб мати її на іншому пристрої, увійди в акаунт і збережи після застосування SQL-міграції.','Exercise saved in this browser. To use it on another device, sign in and save after applying the SQL migration.');
  }
  function installInputObserver(){
    const list=$('exerciseList');if(!list||list.dataset.gtReliabilityHook)return;list.dataset.gtReliabilityHook='1';
    list.addEventListener('change',()=>setTimeout(()=>{queueDraftSave();injectQuickCopyButtons()},0));
    list.addEventListener('input',()=>setTimeout(()=>{queueDraftSave()},0));
    const observer=new MutationObserver(()=>{injectQuickCopyButtons();ensureDraftControls()});observer.observe(list,{childList:true,subtree:true});
  }
  function wrapPageNavigation(){
    const original=window.showPage;if(typeof original!=='function'||original.__gtDraftAutosave)return;
    const wrapped=function(id,...args){
      try{if($('session')?.classList.contains('active')&&id!=='session'&&!restoringDraft&&!finishingWorkout&&!pauseTransition){writeLocalDraft(makeDraftSnapshot());if(cloudSaveTimer)clearTimeout(cloudSaveTimer);saveDraftNow();try{stopTimer()}catch(_){} }}catch(err){console.warn('Could not autosave session before navigation:',err?.message||err)}
      const result=original.call(this,id,...args);if(id==='home')refreshResumeCard();if(id==='session'){ensureDraftControls();injectQuickCopyButtons()}return result;
    };
    wrapped.__gtDraftAutosave=true;window.showPage=wrapped;try{showPage=wrapped}catch(_){}
  }
  function wrapFinish(){
    const original=window.gtFinishWorkout;if(typeof original!=='function'||original.__gtDraftCleanup)return;
    const wrapped=async function(...args){const before=(()=>{try{return Array.isArray(history)?history.length:0}catch(_){return 0}})();finishingWorkout=true;let result;try{result=await original.apply(this,args)}finally{finishingWorkout=false}const after=(()=>{try{return Array.isArray(history)?history.length:before}catch(_){return before}})();if(after>before)await clearDraft();return result;};
    wrapped.__gtDraftCleanup=true;window.gtFinishWorkout=wrapped;window.finishWorkout=wrapped;try{gtFinishWorkout=wrapped;finishWorkout=wrapped}catch(_){}
  }
  async function afterLoginExtras(){await loadUserCustomExercises();await loadCloudDraft();ensureCustomExerciseEditor();refreshResumeCard();}

  // Exposed for 28-gt-coach-complete-upgrades-v3.js, which calls it after login and on reconnect.
  window.gtSyncLocalCustomExercises=function(){return syncLocalCustomExercises()};
  async function syncLocalCustomExercises(){
    const sb=db(),uid=userId();if(!sb||!uid||!navigator.onLine)return;
    const local=customList();if(!local.length)return;
    for(const r of local){try{const {data,error}=await sb.from('user_custom_exercises').upsert({user_id:uid,name:r.name,en_name:r.en||null,category:r.category||'Власні',muscles:r.muscles||null,instructions:r.how||null,mistakes:r.mistakes||null,aliases:r.aliases||[],equipment:r.equipment||[],training_location:r.location||'all',difficulty:r.difficulty||null,video_url:r.videoUrl||null,notes:r.notes||null,updated_at:new Date().toISOString()},{onConflict:'user_id,name'}).select().single();if(error)throw error;if(data){const idx=local.findIndex(x=>norm(x.name)===norm(r.name));if(idx>=0)local[idx]=normalizeCloudExercise(data);}}catch(err){console.warn('Pending custom exercise remains locally:',r.name,err?.message||err);}}
    writeJSON(localCustomKey(),local);if(typeof window.renderLibrary==='function')window.renderLibrary();
  }
  function wrapAfterLogin(){
    const original=window.gtAfterLogin;if(typeof original!=='function'||original.__gtReliabilityExtras)return;
    const wrapped=async function(...args){const result=await original.apply(this,args);await afterLoginExtras();return result;};wrapped.__gtReliabilityExtras=true;window.gtAfterLogin=wrapped;try{gtAfterLogin=wrapped}catch(_){}
  }
  function onLanguageChanged(){
    // Rebuild only new surfaces so the existing bilingual app remains in control of all original views.
    if($('gtCustomExerciseEditor')){const form=$('gtCustomExerciseForm');const values={name:$('gtCustomExerciseName')?.value||'',en:$('gtCustomExerciseEn')?.value||'',muscles:$('gtCustomExerciseMuscles')?.value||'',how:$('gtCustomExerciseHow')?.value||'',mistakes:$('gtCustomExerciseMistakes')?.value||'',category:$('gtCustomExerciseCategory')?.value||'Ноги'};const editor=$('gtCustomExerciseEditor');editor.remove();ensureCustomExerciseEditor();$('gtCustomExerciseName').value=values.name;$('gtCustomExerciseEn').value=values.en;$('gtCustomExerciseMuscles').value=values.muscles;$('gtCustomExerciseHow').value=values.how;$('gtCustomExerciseMistakes').value=values.mistakes;$('gtCustomExerciseCategory').value=values.category;}
    refreshResumeCard();const dialog=$('gtExerciseReplaceDialog');if(dialog?.classList.contains('open')){const q=$('gtExerciseReplaceSearch').value;dialog.remove();activeReplacementIndex=activeReplacementIndex;const d=replaceDialog();d.classList.add('open');$('gtExerciseReplaceSearch').value=q;renderReplacementResults();}
  }
  function wrapLogoutCustomIsolation(){
    const original=window.logoutProfile;if(typeof original!=='function'||original.__gtCustomIsolation)return;
    const wrapped=async function(...args){const priorUser=userId();const result=await original.apply(this,args);if(priorUser&&!userId()){customExercises=[];applyCustomExerciseRecords(loadLocalCustomExercises());refreshResumeCard();}return result};
    wrapped.__gtCustomIsolation=true;window.logoutProfile=wrapped;try{logoutProfile=wrapped}catch(_){}
  }
  function wrapLanguageToggle(){const original=window.toggleLang;if(typeof original!=='function'||original.__gtReliabilityLang)return;const wrapped=function(...args){const r=original.apply(this,args);setTimeout(onLanguageChanged,0);return r};wrapped.__gtReliabilityLang=true;window.toggleLang=wrapped;try{toggleLang=wrapped}catch(_){}}

  function init(){
    ensureCustomExerciseEditor();applyCustomExerciseRecords(loadLocalCustomExercises());
    ensureDraftControls();refreshResumeCard();installInputObserver();injectQuickCopyButtons();
    wrapPageNavigation();wrapFinish();wrapAfterLogin();wrapLanguageToggle();wrapLogoutCustomIsolation();
    window.addEventListener('beforeunload',()=>{try{if($('session')?.classList.contains('active'))writeLocalDraft(makeDraftSnapshot())}catch(_){}});
    if(userId())afterLoginExtras();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
