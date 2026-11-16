/* Strenova V4: backup/restore, explicit draft conflict choices, RPE/RIR, per-exercise rest,
   timer hands-free support, progression suggestions, and sharing context through existing coach chat. */
(function(){
  'use strict';
  if(window.__GTAI_UPGRADE_V4__) return;
  window.__GTAI_UPGRADE_V4__ = true;
  const $ = id => document.getElementById(id);
  const isEn = () => { try { return typeof lang !== 'undefined' ? lang === 'en' : String(document.documentElement.lang||'uk').startsWith('en'); } catch(_) { return false; } };
  const T = (uk,en) => isEn()?en:uk;
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^a-z0-9а-яіїєґ]+/g,' ').trim();
  const readJSON = (k,fb)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x==null?fb:x}catch(_){return fb}};
  const writeJSON = (k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
  const uid = ()=>{try{return typeof gtUser!=='undefined'&&gtUser?.id?String(gtUser.id):''}catch(_){return ''}};
  const ownerKey = ()=>uid()||'local';
  const featureOwnerKey = ()=>{let s='guest';try{s=uid()||(typeof gtSession!=='undefined'&&gtSession?.user?.id)||profile?.email||$('editEmail')?.value||'guest'}catch(_){}return String(s).toLowerCase().replace(/[^a-z0-9@._-]/g,'_')};
  const db = ()=>{try{return typeof gtSupabase!=='undefined'?gtSupabase:null}catch(_){return null}};
  const getWorkouts = ()=>{try{if(typeof history!=='undefined'&&Array.isArray(history))return history}catch(_){}return readJSON('gtai_history',[])};
  const setWorkouts = rows=>{try{if(typeof history!=='undefined')history=rows}catch(_){}writeJSON('gtai_history',rows)};
  const sessionData = ()=>{try{return typeof gtSessionExerciseData!=='undefined'&&Array.isArray(gtSessionExerciseData)?gtSessionExerciseData:[]}catch(_){return []}};
  const clone = value => {try{return JSON.parse(JSON.stringify(value))}catch(_){return value}};
  const uidDraftKey = ()=>`gtai_workout_draft_v2:${ownerKey()}`;
  const pendingWorkoutKey = ()=>`gtai_pending_workouts_v3:${uid()}`;
  const makeId = ()=>{try{if(crypto?.randomUUID)return crypto.randomUUID()}catch(_){}return 'gt-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12)};
  let pendingImport = null;
  let conflictCheckBusy = false;
  let latestCloudConflict = null;
  let wakeLock = null;
  let autoRestToken = 0;
  let suggestionRepaintPending = false;
  let importDialog, conflictCard;

  const css = document.createElement('style');
  css.id='gtai-upgrade-v4-css';
  css.textContent=`
    .gt-v4-card{border:1px solid var(--line);border-radius:18px;background:linear-gradient(145deg,#241031,#1b0c25);padding:16px;margin:14px 0}
    .gt-v4-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .gt-v4-actions button,.gt-v4-button{border:1px solid var(--line);border-radius:11px;background:var(--panel2);color:var(--text);padding:10px 13px;font-weight:800;cursor:pointer;min-height:42px}
    .gt-v4-primary{background:linear-gradient(135deg,#b54ff8,#b34ff6)!important;color:#14041e!important;border-color:#b54ff8!important}
    .gt-v4-status{font-size:12px;line-height:1.55;color:var(--muted);margin-top:8px;white-space:pre-wrap}
    .gt-v4-dialog{position:fixed;inset:0;z-index:3100;display:none;align-items:center;justify-content:center;background:rgba(10,2,15,.84);backdrop-filter:blur(10px);padding:14px}
    .gt-v4-dialog.open{display:flex}.gt-v4-dialog-panel{width:min(100%,700px);max-height:88dvh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 22px 80px #0009}
    .gt-v4-dialog-panel h2{margin:0 0 8px;font-size:22px}.gt-v4-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:12px 0}.gt-v4-summary>div{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--panel2)}.gt-v4-summary strong{display:block;font-size:22px;color:var(--lime)}.gt-v4-summary small{color:var(--muted)}
    .gt-v4-effort{display:flex;gap:7px;flex-wrap:wrap;align-items:center;width:100%;padding-top:7px}.gt-v4-effort label{display:flex;gap:5px;align-items:center;font-size:10px;color:var(--muted)}.gt-v4-effort select,.gt-v4-effort input{width:auto!important;min-width:68px;max-width:100px;padding:7px!important;font-size:12px!important}
    .gt-v4-rest{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:8px 0}.gt-v4-rest label{font-size:11px;color:var(--muted)}.gt-v4-rest input{width:88px!important;padding:8px!important}
    .gt-v4-progression{border:1px solid #59287a;border-radius:13px;background:rgba(181,79,248,.06);padding:11px;margin-top:10px;font-size:12px;line-height:1.55}.gt-v4-progression strong{display:block;color:var(--text);margin-bottom:4px}.gt-v4-progression button{margin-top:8px}.gt-v4-conflict{border-color:#bd8b2c!important;background:linear-gradient(145deg,rgba(79,55,16,.32),rgba(27,12,37,.96))!important}
    .gt-v4-toast{position:fixed;left:12px;right:12px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:4000;max-width:620px;margin:auto;padding:13px 15px;border:1px solid #59287a;border-radius:14px;background:#220d30;color:var(--text);box-shadow:0 12px 40px #0008;font-size:13px;line-height:1.45}
    .gt-v4-handsfree{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;margin-top:12px;padding:10px;border:1px solid var(--line);border-radius:13px}.gt-v4-handsfree label{display:flex;align-items:center;gap:7px;font-size:12px}.gt-v4-handsfree input[type=checkbox]{width:18px;height:18px;accent-color:var(--lime)}
    .gt-v4-modal-list{max-height:32vh;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:8px 12px}.gt-v4-modal-list div{padding:6px 0;border-bottom:1px solid var(--line);font-size:12px}.gt-v4-modal-list div:last-child{border-bottom:0}
    #session .gt-v4-actions button,#session .gt-v4-rest input{min-height:44px}#session .gt-v4-progression{scroll-margin-top:80px}
    @media(max-width:520px){.gt-v4-dialog-panel{padding:15px}.gt-v4-effort{gap:5px}.gt-v4-effort label{flex:1 1 30%;justify-content:space-between}.gt-v4-effort select,.gt-v4-effort input{max-width:96px}.gt-v4-actions button{flex:1 1 140px}.gt-v4-handsfree{justify-content:flex-start}}
    @media(prefers-reduced-motion:reduce){.gt-v4-dialog,.gt-v4-toast{scroll-behavior:auto!important;transition:none!important}}
  `;
  document.head.appendChild(css);

  function toast(message,state='info'){
    let el=$('gtV4Toast');if(!el){el=document.createElement('div');el.id='gtV4Toast';el.className='gt-v4-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el)}
    el.textContent=message;el.style.borderColor=state==='error'?'var(--danger)':state==='success'?'#59287a':'#59287a';el.hidden=false;
    clearTimeout(el._timer);el._timer=setTimeout(()=>{el.hidden=true},5200);
  }
  function todayString(){return new Date().toISOString().slice(0,10)}
  function safeParseWorkout(item){
    if(!item||typeof item!=='object'||Array.isArray(item))return null;
    const name=String(item.name||item.title||'').trim();const date=String(item.date||item.created_at||'');
    if(!name||!date||!Number.isFinite(new Date(date).getTime()))return null;
    const exercises=Array.isArray(item.exercises)?item.exercises:[];
    if(exercises.length>500)return null;
    const cleanExercises=exercises.map(e=>{
      if(!e||typeof e!=='object')return null;
      const n=String(e.name||'').trim();if(!n)return null;
      const logs=Array.isArray(e.setLogs)?e.setLogs.slice(0,50).map(s=>({reps:clamp(s?.reps,0,100,0),weight:clamp(s?.weight,0,500,0),completed:!!s?.completed,edited:!!s?.edited,type:['warmup','working','backoff','dropset'].includes(s?.type)?s.type:'working',rpe:nullableClamp(s?.rpe,1,10),rir:nullableClamp(s?.rir,0,10)})):[];
      return {...e,name:n,setLogs:logs,restSeconds:clamp(e.restSeconds,0,1800,90)};
    });
    if(cleanExercises.some(e=>!e))return null;
    return {...item,name,date,exercises:cleanExercises,minutes:clamp(item.minutes,0,1440,0),done:clamp(item.done,0,500,0)};
  }
  function clamp(v,min,max,fb){const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fb}
  function nullableClamp(v,min,max){if(v===''||v===null||v===undefined)return null;const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):null}
  function recordSignature(w){if(w?.clientRecordId)return `client:${String(w.clientRecordId)}`;const raw=w?.date||w?.created_at||0;const ms=new Date(raw).getTime();const date=Number.isFinite(ms)?new Date(ms).toISOString():String(raw);const ex=(w?.exercises||[]).map(e=>`${norm(e.name)}[${(e.setLogs||[]).map(s=>`${Number(s.weight)||0}x${Number(s.reps)||0}:${s.completed?1:0}:${s.type||''}`).join(';')}]`).join(',');return `${norm(w?.name)}|${date}|${Number(w?.minutes)||0}|${Number(w?.done)||0}|${ex}`}
  function mergeUnique(existing,incoming,keyFn){const arr=Array.isArray(existing)?existing.slice():[];const seen=new Set(arr.map(x=>{try{return keyFn(x)}catch(_){return ''}}));let added=0,dupes=0;for(const raw of incoming||[]){let k;try{k=keyFn(raw)}catch(_){k=''}if(!k||seen.has(k)){dupes++;continue}arr.push(raw);seen.add(k);added++}return {items:arr,added,dupes}}
  function showDialog(dialog){dialog.classList.add('open');document.body.style.overflow='hidden';dialog.querySelector('button, input, textarea, select')?.focus()}
  function closeDialog(dialog){if(!dialog)return;dialog.classList.remove('open');document.body.style.overflow='';}

  // Full backup/restore: explicit data allow-list; never export auth tokens, passwords, or Supabase credentials.
  function archiveObject(){
    let profileCopy=null,schedule=[],foods=[],customPlans=[],templates=[],customExercises=[];
    try{profileCopy=typeof profile!=='undefined'?clone(profile):readJSON('gtai_profile',null)}catch(_){}
    schedule=readJSON('gtai_schedule',[]);
    foods=readJSON(`gtai_food_diary_${featureOwnerKey()}`,[]);
    customPlans=readJSON('gtai_custom_plans',[]);
    templates=readJSON(`gtai_workout_templates_v3:${ownerKey()}`,[]);
    customExercises=readJSON(`gtai_custom_exercises_v2:${ownerKey()}`,[]);
    const w=getWorkouts();
    return {format:'GymCoachBackup',schemaVersion:1,exportedAt:new Date().toISOString(),data:{profile:profileCopy,workouts:w,activeDraft:readJSON(uidDraftKey(),null),schedule,foods,customPlans,templates,customExercises,language:readJSON('gtai_lang','uk'),planVariant:readJSON('gtai_plan_variant',0),trainingProgram:readJSON('gtai_training_program','upperLower')}};
  }
  function downloadFile(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
  function exportFullBackup(){const data=archiveObject();downloadFile(`gymcoach-backup-${todayString()}.json`,JSON.stringify(data,null,2),'application/json;charset=utf-8');toast(T('Резервний архів створено. Збережи його в безпечному місці.','Backup archive created. Store it somewhere safe.'),'success')}
  function safeParseDraft(item){
    if(!item||typeof item!=='object'||Array.isArray(item)||!Array.isArray(item.exercises)||item.exercises.length>500)return null;
    const exercises=item.exercises.map(e=>{
      if(!e||typeof e!=='object'||Array.isArray(e)||!String(e.name||'').trim())return null;
      const setLogs=Array.isArray(e.setLogs)?e.setLogs.slice(0,50).map(s=>({reps:clamp(s?.reps,0,100,0),weight:clamp(s?.weight,0,500,0),completed:!!s?.completed,edited:!!s?.edited,type:['warmup','working','backoff','dropset'].includes(s?.type)?s.type:'working',rpe:nullableClamp(s?.rpe,1,10),rir:nullableClamp(s?.rir,0,10)})):[];
      return {...e,name:String(e.name).trim(),setLogs,restSeconds:clamp(e.restSeconds,0,1800,90)};
    });
    if(exercises.some(e=>!e))return null;
    return {...item,name:String(item.name||item.title||T('Відновлене тренування','Restored workout')).slice(0,160),exercises,updatedAt:item.updatedAt||item.updated_at||new Date().toISOString()};
  }
  function parseArchive(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error(T('Файл має бути JSON-об’єктом.','File must be a JSON object.'));
    let d=raw.data&&typeof raw.data==='object'?raw.data:raw;
    if(raw.format && raw.format!=='GymCoachBackup')throw new Error(T('Невідомий формат архіву.','Unknown backup format.'));
    const possibleWorkouts=d.workouts||d.history;
    if(!Array.isArray(possibleWorkouts))throw new Error(T('У файлі не знайдено масив тренувань (workouts/history).','No workouts/history array found in the file.'));
    if(possibleWorkouts.length>10000)throw new Error(T('В архіві забагато тренувань (максимум 10 000).','Archive has too many workouts (maximum 10,000).'));
    const valid=[];let invalid=0;
    for(const item of possibleWorkouts){const parsed=safeParseWorkout(item);if(parsed)valid.push(parsed);else invalid++}
    for(const field of ['schedule','foods','customPlans','templates','customExercises'])if(d[field]!==undefined&&!Array.isArray(d[field]))throw new Error(T(`Поле ${field} має містити список.`,`Field ${field} must be an array.`));
    const existing=getWorkouts();const duplicateIds=new Set(existing.filter(x=>x.clientRecordId).map(x=>String(x.clientRecordId)));const duplicateSignatures=new Set(existing.map(recordSignature));
    let duplicates=0;for(const w of valid){const sig=recordSignature(w),id=w.clientRecordId?String(w.clientRecordId):'';if((id&&duplicateIds.has(id))||duplicateSignatures.has(sig)){duplicates++;continue}duplicateSignatures.add(sig);if(id)duplicateIds.add(id)}
    const activeDraft=d.activeDraft==null?null:safeParseDraft(d.activeDraft);const invalidDraft=d.activeDraft!=null&&!activeDraft;return {data:d,validWorkouts:valid,invalid,duplicates,added:valid.length-duplicates,activeDraft,invalidDraft,exportedAt:raw.exportedAt||null};
  }
  function ensureImportDialog(){if(importDialog)return importDialog;importDialog=document.createElement('div');importDialog.id='gtV4ImportDialog';importDialog.className='gt-v4-dialog';importDialog.setAttribute('role','dialog');importDialog.setAttribute('aria-modal','true');importDialog.setAttribute('aria-labelledby','gtV4ImportTitle');importDialog.innerHTML=`<div class="gt-v4-dialog-panel"><h2 id="gtV4ImportTitle">${T('Перевірка резервного архіву','Backup preview')}</h2><p id="gtV4ImportIntro" class="hint"></p><div id="gtV4ImportMetrics" class="gt-v4-summary"></div><div id="gtV4ImportList" class="gt-v4-modal-list"></div><p class="gt-v4-status">${T('Режим відновлення лише додає нові записи. Наявні записи не видаляються та не перезаписуються. Профіль імпортується тільки якщо поточний профіль порожній.','Restore runs in merge-only mode. Existing records are not deleted or overwritten. Profile is imported only when no current profile exists.')}</p><div class="gt-v4-actions"><button id="gtV4ConfirmImport" class="gt-v4-primary">${T('Об’єднати та відновити','Merge and restore')}</button><button id="gtV4CancelImport">${T('Скасувати','Cancel')}</button></div><p id="gtV4ImportStatus" class="gt-v4-status" role="status"></p></div>`;document.body.appendChild(importDialog);$('gtV4CancelImport').addEventListener('click',()=>{pendingImport=null;closeDialog(importDialog)});importDialog.addEventListener('click',e=>{if(e.target===importDialog){pendingImport=null;closeDialog(importDialog)}});$('gtV4ConfirmImport').addEventListener('click',applyImport);return importDialog}
  async function readImportFile(file){
    if(!file)return;if(file.size>15*1024*1024){toast(T('Максимальний розмір архіву — 15 МБ.','Maximum archive size is 15 MB.'),'error');return}
    try{const text=await file.text();const parsed=parseArchive(JSON.parse(text));pendingImport=parsed;renderImportPreview(parsed);showDialog(ensureImportDialog())}catch(err){toast((T('Не вдалося прочитати архів: ','Could not read archive: ')+(err?.message||'invalid JSON')),'error')}
  }
  function renderImportPreview(p){
    const d=p.data||{};const currentProfile=(()=>{try{return typeof profile!=='undefined'&&profile?profile:readJSON('gtai_profile',null)}catch(_){return readJSON('gtai_profile',null)}})();
    $('gtV4ImportIntro').textContent=p.exportedAt?T('Архів від ','Archive date: ')+new Date(p.exportedAt).toLocaleString(isEn()?'en-US':'uk-UA'):T('Сумісний JSON-архів тренувань.','Compatible JSON workout archive.');
    const metrics=[['workouts',p.validWorkouts.length,T('Усього в архіві','Workouts in archive')],['add',p.added,T('Нових тренувань','New workouts')],['duplicates',p.duplicates,T('Дублікатів пропущено','Duplicates skipped')],['invalid',p.invalid,T('Некоректних записів','Invalid rows')],['draft',p.activeDraft?.exercises?.length||0,T('Вправ у чернетці','Exercises in unfinished workout')]];
    $('gtV4ImportMetrics').innerHTML=metrics.map(([k,n,label])=>`<div><strong>${n}</strong><small>${label}</small></div>`).join('');
    const counts=[['schedule',T('Заплановані події','Scheduled items')],['foods',T('Записи харчування','Food diary entries')],['customPlans',T('Власні плани','Custom plans')],['templates',T('Шаблони тренувань','Workout templates')],['customExercises',T('Власні вправи','Custom exercises')]];
    $('gtV4ImportList').innerHTML=counts.map(([k,label])=>`<div>${esc(label)}: <b>${Array.isArray(d[k])?d[k].length:0}</b></div>`).join('')+`<div>${esc(T('Профіль','Profile'))}: <b>${d.profile?'є в архіві':'відсутній'}</b> · ${currentProfile?esc(T('поточний профіль збережеться','current profile will be kept')):esc(T('можна відновити','can be restored'))}</div>`;
    $('gtV4ImportStatus').textContent=p.invalidDraft?T('Чернетка в архіві має некоректну структуру й буде пропущена.','The archived draft has an invalid structure and will be skipped.') : ''; $('gtV4ConfirmImport').disabled=p.validWorkouts.length===0&&p.invalid>0&&!p.activeDraft&&!(p.data?.schedule?.length||p.data?.foods?.length||p.data?.customPlans?.length||p.data?.templates?.length||p.data?.customExercises?.length);
  }
  async function cloudSyncImportedWorkouts(newRows){
    const sb=db(),user=uid();if(!user||!newRows.length)return;
    const queue=readJSON(pendingWorkoutKey(),[]);for(const w of newRows){if(!w.clientRecordId)w.clientRecordId=makeId();w.syncStatus='pending';if(!queue.some(x=>x.clientRecordId===w.clientRecordId))queue.push(w)}writeJSON(pendingWorkoutKey(),queue);
    if(!sb||!navigator.onLine)return;
    for(const item of newRows){
      try{
        const row={user_id:user,client_record_id:item.clientRecordId,title:String(item.name||'Workout'),completed_exercises:Number(item.done)||0,minutes:Number(item.minutes)||0,details:window.GT_PLUS_ACCESS===true?{exercises:item.exercises||[]}: {},created_at:item.date||new Date().toISOString()};
        const {data,error}=await sb.from('workout_logs').upsert(row,{onConflict:'user_id,client_record_id'}).select().single();if(error)throw error;
        item.id=data.id;item.syncStatus='synced';
        const q=readJSON(pendingWorkoutKey(),[]).filter(x=>x.clientRecordId!==item.clientRecordId);writeJSON(pendingWorkoutKey(),q);
      }catch(e){console.warn('Imported workout remains queued for sync:',e?.message||e);break}
    }
    setWorkouts(getWorkouts());
  }
  async function syncImportedTemplatesAndExercises(data){
    const sb=db(),user=uid();if(!sb||!user||!navigator.onLine)return {templates:0,exercises:0};let tc=0,ec=0;
    for(const r of Array.isArray(data.templates)?data.templates:[]){try{const {error}=await sb.from('workout_templates').upsert({user_id:user,name:String(r.name||'Imported template').slice(0,120),details:r.details||{},updated_at:r.updatedAt||new Date().toISOString()},{onConflict:'user_id,name'});if(error)throw error;tc++}catch(e){console.warn('Template import cloud sync pending:',e?.message||e)}}
    for(const r of Array.isArray(data.customExercises)?data.customExercises:[]){try{if(!r?.name)continue;const {error}=await sb.from('user_custom_exercises').upsert({user_id:user,name:String(r.name).slice(0,100),en_name:r.en||null,category:r.category||'Власні',muscles:r.muscles||null,instructions:r.how||null,mistakes:r.mistakes||null,aliases:r.aliases||[],equipment:r.equipment||[],training_location:r.location||'all',difficulty:r.difficulty||null,video_url:r.videoUrl||null,notes:r.notes||null,updated_at:new Date().toISOString()},{onConflict:'user_id,name'});if(error)throw error;ec++}catch(e){console.warn('Custom exercise import cloud sync pending:',e?.message||e)}}
    return {templates:tc,exercises:ec};
  }
  async function applyImport(){
    const p=pendingImport;if(!p)return;const b=$('gtV4ConfirmImport');b.disabled=true;b.textContent=T('Відновлення…','Restoring…');
    try{
      const d=p.data||{};const existing=getWorkouts();const seenIds=new Set(existing.filter(x=>x.clientRecordId).map(x=>String(x.clientRecordId)));const seenSigs=new Set(existing.map(recordSignature));const newRows=[];
      for(const source of p.validWorkouts){const sig=recordSignature(source);if((source.clientRecordId&&seenIds.has(String(source.clientRecordId)))||seenSigs.has(sig))continue;const row={...source,id:null,clientRecordId:source.clientRecordId||makeId(),importedAt:new Date().toISOString()};newRows.push(row);seenSigs.add(sig);seenIds.add(String(row.clientRecordId))}
      const merged=existing.concat(newRows).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));setWorkouts(merged);
      // Schedule, food, personal plans, templates and custom exercises are merged by identity, never replaced wholesale.
      let schedule=readJSON('gtai_schedule',[]);const ms=mergeUnique(schedule,d.schedule||[],x=>String(x.id||`${norm(x.title)}|${x.date||x.scheduled_for||''}`));writeJSON('gtai_schedule',ms.items);try{if(typeof gtSchedule!=='undefined')gtSchedule=ms.items;window.gtRenderSchedule?.()}catch(_){}
      const foodsKey=`gtai_food_diary_${featureOwnerKey()}`;const oldFoods=readJSON(foodsKey,[]);const mf=mergeUnique(oldFoods,d.foods||[],x=>String(x.id||`${x.date}|${norm(x.name)}|${x.mealType||''}|${x.kcal||0}`));writeJSON(foodsKey,mf.items);window.gtRenderFood?.();
      const plans=readJSON('gtai_custom_plans',[]);const mp=mergeUnique(plans,d.customPlans||[],x=>String(x.id||norm(x.name)));writeJSON('gtai_custom_plans',mp.items);
      const tk=`gtai_workout_templates_v3:${ownerKey()}`;const oldTemplates=readJSON(tk,[]);const incomingTemplates=(d.templates||[]).map(x=>({...x,id:'local-import-'+makeId()}));const mt=mergeUnique(oldTemplates,incomingTemplates,x=>norm(x.name));writeJSON(tk,mt.items);
      const ck=`gtai_custom_exercises_v2:${ownerKey()}`;const oldCustom=readJSON(ck,[]);const mc=mergeUnique(oldCustom,d.customExercises||[],x=>norm(x.name));writeJSON(ck,mc.items);
      const hadProfile=(()=>{try{return !!(typeof profile!=='undefined'&&profile)||!!readJSON('gtai_profile',null)}catch(_){return !!readJSON('gtai_profile',null)}})();let profileRestored=false;
      if(d.profile&&!hadProfile){const ok=confirm(T('У поточному акаунті немає профілю. Відновити профіль з архіву?','This account has no profile. Restore the profile from the archive?'));if(ok){try{profile=clone(d.profile)}catch(_){}writeJSON('gtai_profile',d.profile);profileRestored=true;try{window.GTSyncProfileToCloud?.(d.profile)}catch(_){} }}
      // An unfinished session is a separate candidate: never silently replace a current draft.
      let draftCandidateSaved=false;
      if(p.activeDraft){
        const currentDraft=readJSON(uidDraftKey(),null);
        if(!currentDraft?.exercises?.length){
          if(confirm(T('В архіві є незавершене тренування. Відновити його як поточну чернетку?','The archive contains an unfinished workout. Restore it as the current draft?'))){
            writeJSON(uidDraftKey(),clone(p.activeDraft));
            if(uid()){
              let synced=false;try{if(typeof window.GT_SYNC_DRAFT_SAFELY==='function')synced=await window.GT_SYNC_DRAFT_SAFELY(clone(p.activeDraft))===true}catch(_){}
              if(!synced)writeJSON(archivedDraftCandidateKey(),clone(p.activeDraft));
            }
          }
        }else if(draftContentSignature(currentDraft)!==draftContentSignature(p.activeDraft)){
          writeJSON(archivedDraftCandidateKey(),clone(p.activeDraft));draftCandidateSaved=true;
        }
      }
      // Merge-only restore. Preserve current language/plan variant; never include or touch auth tokens.
      await cloudSyncImportedWorkouts(newRows);
      const cloudCounts=await syncImportedTemplatesAndExercises(d);
      if(!uid()){
        // Keep an independent guest-import bundle: login can reload cloud history over gtai_history.
        // Preserve imported content outside that mutable cache so it can be merged after sign-in.
        const pendingKey='gtai_pending_archive_restore:local';const prior=readJSON(pendingKey,{});
        const combined={
          workouts:mergeUnique(prior.workouts||[],newRows,x=>x.clientRecordId||recordSignature(x)).items,
          schedule:mergeUnique(prior.schedule||[],d.schedule||[],x=>String(x.id||`${norm(x.title)}|${x.date||x.scheduled_for||''}`)).items,
          foods:mergeUnique(prior.foods||[],d.foods||[],x=>String(x.id||`${x.date}|${norm(x.name)}|${x.mealType||''}|${x.kcal||0}`)).items,
          customPlans:mergeUnique(prior.customPlans||[],d.customPlans||[],x=>String(x.id||norm(x.name))).items,
          templates:mergeUnique(prior.templates||[],d.templates||[],x=>norm(x.name)).items,
          customExercises:mergeUnique(prior.customExercises||[],d.customExercises||[],x=>norm(x.name)).items,
          activeDraft:p.activeDraft||prior.activeDraft||null,
          savedAt:new Date().toISOString()
        };writeJSON(pendingKey,combined);
      }
      try{(d.customExercises||[]).forEach(r=>{if(!r?.name)return;const lib=typeof libraryExercises!=='undefined'&&Array.isArray(libraryExercises)?libraryExercises:null;if(lib&&!lib.some(x=>norm(x.name)===norm(r.name)))lib.push(r)});window.renderLibrary?.()}catch(_){}
      try{window.showPage?.('home');window.renderHome?.();window.renderHistory?.();window.gtRenderStats?.();window.gtRenderSchedule?.()}catch(_){}
      const msg=T(`Відновлення завершено: додано ${newRows.length} тренувань; дублікати пропущено. Плани, харчування, шаблони й вправи об’єднано без видалення наявних записів.`,`Restore complete: added ${newRows.length} workouts; duplicates skipped. Plans, food diary, templates and exercises were merged without deleting existing data.`);
      $('gtV4ImportStatus').textContent=msg+(uid()?T('\nСинхронізація хмарних записів виконана або залишилася в черзі за наявності помилок.','\nCloud records were synced or remain queued if errors occurred.'):T('\nДані відновлено локально; увійди в акаунт для доступної хмарної синхронізації.','\nData restored locally; sign in for available cloud sync.'));
      toast(draftCandidateSaved?msg+' '+T('Архівну чернетку збережено окремо, щоб не перезаписати поточну.','Archived draft was saved separately to avoid overwriting the current one.'):msg,'success');pendingImport=null;setTimeout(()=>closeDialog(importDialog),900);setTimeout(ensureArchivedDraftCard,120);
    }catch(err){$('gtV4ImportStatus').textContent=T('Помилка відновлення: ','Restore error: ')+(err?.message||String(err));b.disabled=false;b.textContent=T('Повторити','Retry');return}
    b.disabled=false;b.textContent=T('Об’єднати та відновити','Merge and restore');
  }
  function archivedDraftCandidateKey(){return `gtai_archive_draft_candidate:${ownerKey()}`}
  function ensureArchivedDraftCard(){
    const candidate=readJSON(archivedDraftCandidateKey(),null);let host=$('session')?.classList.contains('active')?$('session'): $('home');
    let card=$('gtV4ArchivedDraftCard');
    if(candidate&&readJSON(`gtai_archive_draft_candidate_dismissed:${ownerKey()}`,'')===draftContentSignature(candidate)){if(card)card.remove();return}
    if(!candidate||!host){if(card)card.remove();return}
    if(!card){card=document.createElement('section');card.id='gtV4ArchivedDraftCard';card.className='gt-v4-card gt-v4-conflict';host.insertAdjacentElement('afterbegin',card)}else if(card.parentElement!==host)host.insertAdjacentElement('afterbegin',card);
    const current=readJSON(uidDraftKey(),null);const names=(candidate.exercises||[]).slice(0,5).map(x=>esc(x.name)).join(', ');
    card.innerHTML=`<div class="section-head"><h3>${T('Знайдено незавершене тренування з архіву','Unfinished workout found in backup')}</h3><span class="pill">${(candidate.exercises||[]).length} ${T('вправ','exercises')}</span></div><p class="hint">${T('Поточну чернетку не замінено. Обери, чи відновлювати архівну версію; перед заміною поточна буде збережена в резерві.','Your current draft was not replaced. Choose whether to restore the archived version; the current version will be backed up first.')}</p><div class="gt-v4-modal-list"><div><b>${T('Архівна версія','Archived version')}:</b> ${esc(candidate.name||T('Тренування','Workout'))} — ${names||'—'}</div><div><b>${T('Поточна версія','Current version')}:</b> ${esc(current?.name||T('відсутня','none'))}</div></div><div class="gt-v4-actions"><button type="button" class="gt-v4-primary" id="gtV4RestoreArchivedDraft">${T('Відновити архівну чернетку','Restore archived draft')}</button><button type="button" id="gtV4DismissArchivedDraft">${T('Залишити в резерві','Keep in backup')}</button></div><p class="gt-v4-status" id="gtV4ArchivedDraftStatus"></p>`;
    $('gtV4RestoreArchivedDraft').addEventListener('click',async()=>{
      if(!confirm(T('Замінити поточну чернетку архівною? Поточну версію буде збережено для відновлення.','Replace the current draft with the archived one? The current version will be backed up.')))return;
      const k=uidDraftKey();const live=readJSON(k,null);writeJSON(`gtai_workout_draft_conflict_backup:${ownerKey()}`,{savedAt:new Date().toISOString(),local:clone(live),archived:clone(candidate)});writeJSON(k,clone(candidate));
      let synced=false;try{if(uid()&&typeof window.GT_SYNC_DRAFT_SAFELY==='function')synced=await window.GT_SYNC_DRAFT_SAFELY(clone(candidate))===true}catch(_){}
      localStorage.removeItem(archivedDraftCandidateKey());card.remove();toast(synced?T('Архівну чернетку відновлено та синхронізовано.','Archived draft restored and synced.'):T('Архівну чернетку відновлено локально. Хмарну версію потрібно перевірити окремо.','Archived draft restored locally. Cloud version still needs review.'),synced?'success':'info');
      if($('session')?.classList.contains('active'))setTimeout(()=>location.reload(),250);else checkDraftConflict();
    });
    $('gtV4DismissArchivedDraft').addEventListener('click',()=>{writeJSON(`gtai_archive_draft_candidate_dismissed:${ownerKey()}`,draftContentSignature(candidate));card.remove();toast(T('Попередження приховано. Архівна чернетка залишилася в локальному резерві.','Notice dismissed. The archived draft remains in local recovery storage.'))});
  }
  function ensureBackupCard(){
    const home=$('home');if(!home||$('gtV4BackupCard'))return;
    const card=document.createElement('section');card.id='gtV4BackupCard';card.className='gt-v4-card';card.innerHTML=`<div class="section-head"><h2>${T('Резервна копія та відновлення','Backup & restore')}</h2><span class="pill">JSON</span></div><p class="muted">${T('Створи повний архів тренувань, профілю, календаря, харчового щоденника, шаблонів і власних вправ. Відновлення об’єднує записи й пропускає дублікати; чинні дані не видаляються.','Export a backup of workouts, profile, calendar, food diary, templates and custom exercises. Restore merges records and skips duplicates; current data is not deleted.')}</p><div class="gt-v4-actions"><button type="button" id="gtV4ExportBackup" class="gt-v4-primary">↓ ${T('Завантажити архів','Download backup')}</button><button type="button" id="gtV4PickBackup">↑ ${T('Перевірити архів','Preview restore')}</button><input id="gtV4BackupFile" type="file" accept="application/json,.json" hidden></div><p class="gt-v4-status" id="gtV4BackupStatus">${T('Архів не містить паролів, токенів авторизації або секретних API-ключів.','The archive does not contain passwords, auth tokens or secret API keys.')}</p>`;
    const target=$('gtQuickActionsV3')||home.querySelector('.card.stats')||home.querySelector('.hero');if(target)target.insertAdjacentElement('afterend',card);else home.append(card);
    $('gtV4ExportBackup').addEventListener('click',exportFullBackup);$('gtV4PickBackup').addEventListener('click',()=>$('gtV4BackupFile').click());$('gtV4BackupFile').addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';readImportFile(f)});
  }

  // Compare a local draft with cloud metadata before any explicit overwrite. The pre-existing CAS writer remains in charge.
  function draftContentSignature(d){try{return JSON.stringify({name:d?.name,restSeconds:d?.restSeconds,exercises:(d?.exercises||[]).map(e=>({name:e.name,notes:e.notes,restSeconds:e.restSeconds,prescription:e.prescription,setLogs:(e.setLogs||[]).map(s=>({reps:s.reps,weight:s.weight,completed:s.completed,type:s.type,rpe:s.rpe,rir:s.rir}))}))})}catch(_){return ''}}
  function ensureConflictCard(){
    if(conflictCard)return conflictCard;conflictCard=document.createElement('section');conflictCard.id='gtV4SyncConflictCard';conflictCard.className='gt-v4-card gt-v4-conflict';conflictCard.hidden=true;
    const host=$('session')?.querySelector('#gtWorkoutDraftControls')||$('home')?.querySelector('.hero')||document.querySelector('main');host?.insertAdjacentElement('afterend',conflictCard);return conflictCard;
  }
  function attachConflictCard(){if(!conflictCard)return;const host=$('session')?.classList.contains('active')?($('gtWorkoutDraftControls')||$('session')):($('gtWorkoutResumeCard')||$('home')?.querySelector('.hero')||document.querySelector('main'));if(host&&conflictCard.previousElementSibling!==host)host.insertAdjacentElement('afterend',conflictCard)}
  function draftPreviewLines(d){return (d.exercises||[]).slice(0,6).map(e=>{const sets=(e.setLogs||[]).slice(0,4).map(s=>`${Number(s.weight)||0}kg×${Number(s.reps)||0}${s.completed?'✓':''}`).join(', ');return `${e.name||'—'}${sets?' ['+sets+']':''}`})}
  function renderConflictCard(local,remote){
    const el=ensureConflictCard();attachConflictCard();if(!el)return;
    const ld=local.updatedAt?new Date(local.updatedAt).toLocaleString(isEn()?'en-US':'uk-UA'):'—';const rd=remote.updatedAt?new Date(remote.updatedAt).toLocaleString(isEn()?'en-US':'uk-UA'):'—';
    const localNames=draftPreviewLines(local);const remoteNames=draftPreviewLines(remote);
    el.hidden=false;el.innerHTML=`<div class="section-head"><h3>${T('Виявлено дві версії чернетки','Two draft versions found')}</h3><span class="pill">${T('Потрібен вибір','Choose a version')}</span></div><p class="hint">${T('Інша копія має відмінні дані. Жодна версія не буде перезаписана без твого вибору.','Another device has a different draft. Neither copy will be overwritten without your choice.')}</p><div class="gt-v4-summary"><div><strong>${esc(local.exercises?.length||0)}</strong><small>${T('Вправ на цьому пристрої','Exercises on this device')}<br>${esc(ld)}</small></div><div><strong>${esc(remote.exercises?.length||0)}</strong><small>${T('Вправ у хмарі','Exercises in cloud')}<br>${esc(rd)}</small></div></div><div class="gt-v4-modal-list"><div><b>${T('Цей пристрій','This device')}:</b> ${esc(local.name||'Workout')} — ${esc(localNames.join(', ')||'—')}</div><div><b>${T('Хмарна версія','Cloud version')}:</b> ${esc(remote.name||'Workout')} — ${esc(remoteNames.join(', ')||'—')}</div></div><div class="gt-v4-actions"><button class="gt-v4-primary" id="gtV4KeepLocal">${T('Залишити версію пристрою','Keep this device version')}</button><button id="gtV4UseCloud">${T('Відновити хмарну версію','Use cloud version')}</button><button id="gtV4HideConflict">${T('Вирішити пізніше','Decide later')}</button></div><p class="gt-v4-status" id="gtV4ConflictStatus"></p>`;
    $('gtV4KeepLocal').addEventListener('click',async()=>{
      const status=$('gtV4ConflictStatus');const chosen=clone(local);chosen.updatedAt=new Date().toISOString();
      writeJSON(`gtai_workout_draft_conflict_backup:${uid()}`,{savedAt:new Date().toISOString(),local:clone(local),cloud:clone(remote)});writeJSON(uidDraftKey(),chosen);status.textContent=T('Поточну версію збережено як локальну копію. Перевіряємо умовне оновлення хмари…','Kept this device version locally. Attempting a conditional cloud update…');
      const writer=window.GT_SYNC_DRAFT_SAFELY;
      if(typeof writer==='function'){const ok=await writer(chosen);status.textContent=ok?T('Версію пристрою синхронізовано.','Device version synced.'):T('Версія пристрою збережена як локальна копія. Хмара могла змінитися ще раз; оновлення не підтверджено.','Device copy retained locally. Cloud may have changed again; update was not confirmed.');if(ok){el.hidden=true;latestCloudConflict=null}}else status.textContent=T('Локальну версію збережено. Без доступної функції синхронізації хмара не змінювалася.','Local version saved. Cloud was not changed because sync is unavailable.');
    });
    $('gtV4UseCloud').addEventListener('click',()=>{
      if(!confirm(T('Зробити хмарну версію поточною? Локальна копія буде збережена в резерві для можливого відновлення.','Make the cloud version current? The local copy will be backed up for possible recovery.')))return;
      writeJSON(`gtai_workout_draft_conflict_backup:${uid()}`,{savedAt:new Date().toISOString(),local:clone(local),cloud:clone(remote)});writeJSON(uidDraftKey(),{...clone(remote),updatedAt:remote.updatedAt||new Date().toISOString()});el.hidden=true;latestCloudConflict=null;toast(T('Хмарну версію завантажено. Перезавантаж сторінку або продовж тренування з картки відновлення.','Cloud version loaded. Reload the page or resume from the workout card.'),'success');
      if($('session')?.classList.contains('active'))setTimeout(()=>location.reload(),250);
      else{try{document.getElementById('gtResumeWorkoutBtn')?.scrollIntoView({behavior:'smooth',block:'center'})}catch(_){}}
    });
    $('gtV4HideConflict').addEventListener('click',()=>{el.hidden=true;latestCloudConflict={local,remote,hidden:true};});
  }
  async function checkDraftConflict(){
    if(conflictCheckBusy||!uid()||!navigator.onLine||!db())return;const local=readJSON(uidDraftKey(),null);if(!local?.exercises?.length)return;
    conflictCheckBusy=true;
    try{
      const {data,error}=await db().from('workout_drafts').select('details,updated_at').eq('user_id',uid()).maybeSingle();if(error)throw error;
      if(!data?.details?.exercises?.length)return;
      const remote={...data.details,updatedAt:data.updated_at||data.details.updatedAt||''};const lts=new Date(local.updatedAt||0).getTime(),rts=new Date(remote.updatedAt||0).getTime();const differs=draftContentSignature(local)!==draftContentSignature(remote);const apart=Math.abs(lts-rts);
      // Prompt for a divergent cloud-newer copy immediately, or a divergent device-newer copy once it is not just a brief debounce window.
      if(differs && (rts>lts || (lts>rts && apart>15000))){
        const signature=`${remote.updatedAt}|${draftContentSignature(remote)}`;
        if(latestCloudConflict?.signature===signature)return;
        latestCloudConflict={signature,local,remote};renderConflictCard(local,remote);
      } else if(latestCloudConflict&&!latestCloudConflict.hidden){if(conflictCard)conflictCard.hidden=true;latestCloudConflict=null}
    }catch(err){console.warn('Draft conflict inspection failed; existing guarded sync remains in place:',err?.message||err)}finally{conflictCheckBusy=false}
  }

  // Keep metadata from set fields in the local draft; the existing draft serializer preserves the main shape.
  function patchDraftMetadata(){
    try{
      const k=uidDraftKey(),draft=readJSON(k,null);if(!draft||!Array.isArray(draft.exercises))return;
      const live=sessionData();for(let i=0;i<live.length;i++){const e=live[i];const d=draft.exercises[i];if(!d||norm(d.name)!==norm(e.name))continue;d.restSeconds=clamp(e.restSeconds,0,1800,90);d.setLogs=(d.setLogs||[]).map((s,j)=>({...s,...(e.setLogs?.[j]?{type:e.setLogs[j].type||'working',rpe:e.setLogs[j].rpe??null,rir:e.setLogs[j].rir??null}: {})}));}
      writeJSON(k,draft);
    }catch(_){}
  }
  let patchTimer=null;
  function queueMetadataPatch(){clearTimeout(patchTimer);patchTimer=setTimeout(patchDraftMetadata,40)}
  function decorateEffortFields(){
    if(window.GT_PLUS_ACCESS!==true)return;
    document.querySelectorAll('#exerciseList .gt-logged-exercise').forEach((exercise,i)=>{
      const index=Number(exercise.dataset.sessionIndex??i);const e=sessionData()[index];if(!e)return;
      const rows=[...exercise.querySelectorAll('.gt-set-row')],bars=[...exercise.querySelectorAll('.gt-set-extra')];
      bars.forEach((bar,j)=>{
        bar.dataset.gtV4SetIndex=String(j);const s=e.setLogs?.[j];if(!s)return;
        let panel=bar.querySelector('.gt-v4-effort');if(!panel){panel=document.createElement('div');panel.className='gt-v4-effort';panel.innerHTML=`<label>${T('Тип','Type')}<select data-v4-field="type"><option value="warmup">${T('Розминка','Warm-up')}</option><option value="working">${T('Робочий','Working')}</option><option value="backoff">${T('Знижений','Back-off')}</option><option value="dropset">Drop set</option></select></label><label>RPE <input data-v4-field="rpe" type="number" min="1" max="10" step="0.5" inputmode="decimal" placeholder="1–10"></label><label>RIR <input data-v4-field="rir" type="number" min="0" max="10" step="1" inputmode="numeric" placeholder="0–10"></label>`;bar.appendChild(panel);
          panel.querySelectorAll('[data-v4-field]').forEach(input=>input.addEventListener('change',()=>{const live=sessionData()[index]?.setLogs?.[Number(bar.dataset.gtV4SetIndex)];if(!live)return;const f=input.dataset.v4Field;if(f==='type')live.type=input.value;else live[f]=input.value===''?null:clamp(input.value,f==='rpe'?1:0,10,null);live.edited=true;queueMetadataPatch();}));
        }
        const type=panel.querySelector('[data-v4-field="type"]'),rpe=panel.querySelector('[data-v4-field="rpe"]'),rir=panel.querySelector('[data-v4-field="rir"]');if(type&&document.activeElement!==type)type.value=s.type||'working';if(rpe&&document.activeElement!==rpe)rpe.value=s.rpe??'';if(rir&&document.activeElement!==rir)rir.value=s.rir??'';
      });
    });
  }
  function decorateRestTimeControls(){
    document.querySelectorAll('#exerciseList .gt-logged-exercise').forEach((row,i)=>{
      const index=Number(row.dataset.sessionIndex??i),e=sessionData()[index];const countRow=row.querySelector('.gt-set-count-row');if(!e||!countRow)return;
      let block=countRow.querySelector('.gt-v4-rest');if(!block){block=document.createElement('div');block.className='gt-v4-rest';block.innerHTML=`<label>${T('Відпочинок для цієї вправи, с','Rest for this exercise, sec')} <input type="number" min="0" max="1800" step="15" value="90" inputmode="numeric" data-v4-rest-time></label><small class="hint">${T('Автозапуск після позначення підходу','Auto-start when a set is completed')}</small>`;countRow.insertAdjacentElement('afterend',block);block.querySelector('[data-v4-rest-time]').addEventListener('change',()=>{const current=sessionData()[index];if(current)current.restSeconds=clamp(block.querySelector('[data-v4-rest-time]').value,0,1800,90);queueMetadataPatch();});}
      const input=block.querySelector('[data-v4-rest-time]');if(input&&document.activeElement!==input)input.value=clamp(e.restSeconds,0,1800,90);
    });
  }
  function progressionFor(name,prescription){
    const logs=getWorkouts().slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));let prev=null;
    for(const w of logs){const e=(w.exercises||[]).find(x=>norm(x.name)===norm(name));if(!e)continue;const sets=Array.isArray(e.setLogs)?e.setLogs:[];const working=sets.filter(s=>(s.type||'working')==='working'&&Number(s.weight)>0&&Number(s.reps)>0&&(s.completed||s.edited));if(working.length){prev={workout:w,exercise:e,sets:working};break;}if(Number(e.weight)>0&&Number(e.reps)>0){prev={workout:w,exercise:e,sets:[{weight:Number(e.weight),reps:Number(e.reps),completed:true,type:'working'}]};break;}}
    if(!prev)return null;
    const range=String(prescription||'').match(/(?:×|x)\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);const repMin=range?Number(range[1]):8;const repMax=range&&range[2]?Number(range[2]):repMin;
    const maxWeight=Math.max(...prev.sets.map(s=>Number(s.weight)||0));const reached=prev.sets.every(s=>Number(s.reps)>=repMax);const increase=maxWeight>=60?2.5:1.25;const target=reached?Math.round((maxWeight+increase)*100)/100:maxWeight;
    const allSets=prev.sets;const reps=allSets.map(s=>Number(s.reps)||0);const date=prev.workout.date?new Date(prev.workout.date).toLocaleDateString(isEn()?'en-US':'uk-UA'):'';
    return {date,maxWeight,target,reached,repMin,repMax,sets:allSets.length,minReps:Math.min(...reps),maxReps:Math.max(...reps),summary:allSets.map((s,i)=>`${i+1}) ${s.weight} кг × ${s.reps}`).join(' · ')};
  }
  function renderProgressionSuggestions(){
    if(window.GT_PLUS_ACCESS!==true)return;
    document.querySelectorAll('#exerciseList .gt-logged-exercise').forEach((row,i)=>{
      const index=Number(row.dataset.sessionIndex??i),e=sessionData()[index];if(!e)return;
      const old=row.querySelector('.gt-v4-progression');if(old&&old.dataset.exercise===norm(e.name)&&old.dataset.prescription===String(e.prescription||''))return;old?.remove();
      const p=progressionFor(e.name,e.prescription);if(!p)return;
      const card=document.createElement('div');card.className='gt-v4-progression';card.dataset.exercise=norm(e.name);card.dataset.prescription=String(e.prescription||'');
      card.innerHTML=`<strong>${T('Підказка прогресії на основі твоєї історії','Progression tip based on your history')}</strong><div>${T('Попереднє тренування','Previous workout')}${p.date?' · '+esc(p.date):''}: ${esc(p.summary)}.</div><div>${p.reached?T('Усі збережені робочі підходи досягли верхньої межі повторень. Можна спробувати невеликий крок ваги.','All recorded working sets reached the top of the rep range. A small weight increase may be reasonable.'):T('Спробуй повторити вагу й поступово додати повторення в робочих підходах.','Consider keeping the weight and gradually adding reps to working sets.')} ${T('Пропозиція','Suggestion')}: <b>${p.target} кг</b>.</div><button type="button" class="gt-v4-button" data-v4-apply-weight>${T('Заповнити лише порожні ваги','Fill only empty weight fields')}</button><small style="display:block;color:var(--muted);margin-top:5px">${T('Це лише підказка. Дані вже заповнених підходів не змінюються.','Suggestion only. Already-entered set weights will not be changed.')}</small>`;
      card.querySelector('[data-v4-apply-weight]').addEventListener('click',()=>{
        const ex=sessionData()[index];if(!ex)return;let filled=0;
        (ex.setLogs||[]).forEach((s,j)=>{if((s.type||'working')==='working'&&(!Number(s.weight)||Number(s.weight)<=0)){s.weight=p.target;s.edited=true;const sr=[...row.querySelectorAll('.gt-set-row')][j];const inp=sr?.querySelectorAll('input')[1];if(inp)inp.value=String(p.target);filled++}});
        if(filled){try{(ex.setLogs||[]).forEach((s,j)=>{if((s.type||'working')==='working'&&Number(s.weight)===p.target&&typeof gtWorkoutSetChange==='function')gtWorkoutSetChange(index,j,'weight',p.target)})}catch(_){}queueMetadataPatch();toast(T(`Заповнено вагу в ${filled} порожніх робочих підходах. Перевір її перед виконанням.`,`Filled weights for ${filled} empty working sets. Check them before training.`),'success')}else toast(T('У робочих підходах уже є ваги — нічого не змінено.','Weights are already entered for working sets; nothing changed.'));
      });
      const note=row.querySelector('.gt-exercise-note');if(note)note.insertAdjacentElement('afterend',card);else row.querySelector('.session-main')?.appendChild(card);
    });
  }
  function scheduleWorkoutEnhancements(){
    if(suggestionRepaintPending)return;suggestionRepaintPending=true;setTimeout(()=>{suggestionRepaintPending=false;decorateEffortFields();renderProgressionSuggestions();patchDraftMetadata();},0);
  }

  // Hands-free training: auto-rest on a completed set, optional sound/vibration, screen wake lock.
  function hfKey(){return `gtai_handsfree_v1:${ownerKey()}`}
  function getHF(){return {...{sound:true,vibrate:true,wake:true,autoRest:false},...readJSON(hfKey(),{}),autoRest:false}}
  function saveHF(p){writeJSON(hfKey(),p)}
  function beep(){try{const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;const ctx=new Ctx();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=880;gain.gain.value=.08;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.25);osc.onended=()=>ctx.close()}catch(_){} }
  async function requestWakeLock(){
    if(!('wakeLock' in navigator)){toast(T('Цей браузер не підтримує утримання екрана активним.','This browser does not support keeping the screen awake.'));return false}
    try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null});toast(T('Екран залишатиметься активним, доки це дозволяє браузер.','Screen will stay awake while the browser permits it.'),'success');return true}catch(e){toast(T('Не вдалося активувати утримання екрана. Спробуй натиснути кнопку ще раз.','Could not keep the screen awake. Try the button again.'));return false}
  }
  async function releaseWakeLock(){try{if(wakeLock){await wakeLock.release();wakeLock=null}}catch(_){}}
  function ensureHandsFreePanel(){
    const timerCard=$('session')?.querySelector('.timer');if(!timerCard||$('gtV4HandsFree'))return;
    const p=getHF();const box=document.createElement('div');box.id='gtV4HandsFree';box.className='gt-v4-handsfree';box.innerHTML=`<label><input type="checkbox" data-hf="sound" ${p.sound?'checked':''}> ${T('Звук','Sound')}</label><label><input type="checkbox" data-hf="vibrate" ${p.vibrate?'checked':''}> ${T('Вібрація','Vibration')}</label><button type="button" class="gt-v4-button" id="gtV4WakeLock">${T('Екран активний','Keep screen awake')}</button><small id="gtV4WakeStatus" class="hint" role="status">${T('Натисни кнопку, щоб дозволити утримання екрана (якщо підтримується).','Press to request an awake screen (if supported).')}</small>`;
    timerCard.appendChild(box);box.querySelectorAll('[data-hf]').forEach(inp=>inp.addEventListener('change',()=>{const next=getHF();next[inp.dataset.hf]=inp.checked;saveHF(next)}));$('gtV4WakeLock').addEventListener('click',async()=>{const ok=await requestWakeLock();$('gtV4WakeStatus').textContent=ok?T('Екран активний під час тренування.','Screen wake lock is active.'):T('Режим недоступний або не дозволений браузером.','Unavailable or denied by the browser.')});
  }
  function restCompletionFeedback(){const p=getHF();if(p.sound)beep();if(p.vibrate&&navigator.vibrate)try{navigator.vibrate([120,60,120])}catch(_){}toast(T('Відпочинок завершено. Можна починати наступний підхід.','Rest finished. You can begin the next set.'),'success')}
  function wrapRestAlert(){
    if(window.__GTAI_V4_ALERT_WRAPPED)return;const original=window.alert.bind(window);window.__GTAI_V4_ALERT_WRAPPED=true;window.alert=function(message){const m=String(message||'');if(/rest time is over|час відпочинку завершено/i.test(m)){restCompletionFeedback();return}return original(message)};
  }
  function autoStartRestFromSet(event){
    // Rest after a set/exercise is disabled per user request.
    return;
    const cb=event.target;if(!cb?.matches?.('[data-gt-set-done]')||!cb.checked)return;
    const hf=getHF();if(!hf.autoRest)return;
    const bar=cb.closest('.gt-set-extra'),row=cb.closest('.gt-logged-exercise');if(!bar||!row)return;
    const index=Number(row.dataset.sessionIndex||0),setIndex=Number(bar.dataset.gtV4SetIndex||0),ex=sessionData()[index];if(!ex)return;
    const rest=clamp(ex.restSeconds,0,1800,90);if(rest<=0)return;
    const token=++autoRestToken;
    setTimeout(()=>{if(token!==autoRestToken||!$('session')?.classList.contains('active'))return;try{if(typeof running!=='undefined'&&running)stopTimer();setTimer(rest);toggleTimer()}catch(err){console.warn('Could not auto-start rest timer:',err?.message||err)}},20);
  }
  function installWakeLockPageWatch(){
    const watcher=new MutationObserver(()=>{if(!$('session')?.classList.contains('active'))releaseWakeLock()});
    document.querySelectorAll('.page').forEach(p=>watcher.observe(p,{attributes:true,attributeFilter:['class']}));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseWakeLock();else if($('session')?.classList.contains('active')&&getHF().wake&&wakeLock===null){/* browsers may require a new gesture; do not auto-prompt */}});
    window.addEventListener('online',()=>{setTimeout(checkDraftConflict,250)});
  }

  // Reuse the existing Plus coach chat. Sharing is a manual preview/fill action; nothing is sent automatically.
  function formatWorkoutForCoach(w){
    if(!w)return '';
    const out=[`${T('Прошу переглянути тренування','Please review my workout')}: ${w.name||T('Тренування','Workout')}`,`${T('Дата','Date')}: ${w.date||new Date().toISOString()}`];
    for(const e of (w.exercises||[]).slice(0,30)){
      out.push(`\n${e.name}${e.notes?' — '+String(e.notes).slice(0,180):''}`);
      const sets=Array.isArray(e.setLogs)?e.setLogs:[];
      if(sets.length)sets.slice(0,15).forEach((s,i)=>out.push(`${i+1}. ${s.type||'working'} · ${Number(s.weight)||0} kg × ${Number(s.reps)||0}${s.rpe!=null?' · RPE '+s.rpe:''}${s.rir!=null?' · RIR '+s.rir:''}${s.completed?' ✓':''}`));
      else if(e.weight||e.reps)out.push(`${e.weight||0} kg × ${e.reps||0}`);
    }
    return out.join('\n').slice(0,1900);
  }
  function shareWithCoach(source){const box=$('gtLiveCoachInput');const message=formatWorkoutForCoach(source);if(!message){toast(T('Немає даних тренування для передачі тренеру.','No workout data to share.'));return}window.showPage?.('coach-live');setTimeout(()=>{const input=$('gtLiveCoachInput');if(input){input.value=message;input.focus();toast(T('Підсумок додано до чернетки повідомлення. Перевір його й натисни «Надіслати» в чинному чаті з тренером.','Workout summary added to the message draft. Review it and press Send in the existing coach chat.'),'success')}else toast(T('Чат недоступний на цьому екрані. Перевір доступ Strenova Plus.','Chat is not available on this screen. Check Strenova Plus access.'))},150)}
  function ensureCoachShareAction(){
    const form=$('gtLiveCoachForm');
    // Respect the existing PLUS gate. These controls never create an alternate way into the private coach chat.
    if(!form||window.GT_PLUS_ACCESS!==true||form.style.display==='none'){
      document.querySelectorAll('#gtV4ShareActions,#gtV4ShareFromSession').forEach(el=>el.remove());return;
    }
    if(form&&!$('gtV4ShareLastWorkout')){const controls=document.createElement('div');controls.id='gtV4ShareActions';controls.className='gt-v4-actions';controls.style.margin='0 0 10px';controls.innerHTML=`<button type="button" id="gtV4ShareLastWorkout">${T('Поділитися останнім тренуванням із тренером','Share last workout with coach')}</button><button type="button" id="gtV4ShareCurrentWorkout">${T('Передати поточне тренування','Share current workout')}</button>`;form.insertAdjacentElement('beforebegin',controls);$('gtV4ShareLastWorkout').addEventListener('click',()=>shareWithCoach(getWorkouts()[0]));$('gtV4ShareCurrentWorkout').addEventListener('click',()=>{if(!$('session')?.classList.contains('active')){toast(T('Спочатку відкрий активне тренування або поділись останнім завершеним.','Open an active workout first, or share the last completed one.'));return}shareWithCoach({name:typeof currentWorkout!=='undefined'?currentWorkout:T('Поточне тренування','Current workout'),date:new Date().toISOString(),exercises:sessionData().map(e=>({...e,setLogs:(e.setLogs||[]).map(s=>({...s}))}))})})}
    const banner=$('gtActiveExerciseBanner');if(banner&&!$('gtV4ShareFromSession')){const btn=document.createElement('button');btn.id='gtV4ShareFromSession';btn.type='button';btn.textContent=T('✉ Передати тренеру','✉ Share with coach');btn.addEventListener('click',()=>shareWithCoach({name:typeof currentWorkout!=='undefined'?currentWorkout:'Workout',date:new Date().toISOString(),exercises:sessionData().map(e=>({...e,setLogs:(e.setLogs||[]).map(s=>({...s}))}))}));banner.querySelector('.gt-workout-controls')?.appendChild(btn)}
  }

  // Protect local saves and show available cloud-vs-device draft choices.
  function checkTimerNavigation(){if($('session')?.classList.contains('active')){ensureHandsFreePanel();ensureCoachShareAction()}}
  function observeSession(){const root=$('exerciseList');if(root&&!root.dataset.gtV4Observer){root.dataset.gtV4Observer='1';const mo=new MutationObserver(()=>scheduleWorkoutEnhancements());mo.observe(root,{childList:true,subtree:true});root.addEventListener('input',()=>queueMetadataPatch());root.addEventListener('change',()=>queueMetadataPatch());root.addEventListener('change',autoStartRestFromSet,true)}scheduleWorkoutEnhancements();ensureHandsFreePanel();ensureCoachShareAction()}
  async function restoreGuestArchiveAfterLogin(){
    const user=uid();if(!user)return;const pending=readJSON('gtai_pending_archive_restore:local',null);if(!pending||typeof pending!=='object')return;
    try{
      // Merge restored sessions into the freshly loaded account history; don't replace server records.
      const existing=getWorkouts();const have=new Set(existing.map(recordSignature));const imported=[];
      for(const w of (pending.workouts||[])){const sig=recordSignature(w);if(have.has(sig))continue;const row={...w,id:null,clientRecordId:w.clientRecordId||makeId(),syncStatus:'pending'};imported.push(row);have.add(sig)}
      setWorkouts(existing.concat(imported).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)));
      const sched=mergeUnique(readJSON('gtai_schedule',[]),pending.schedule||[],x=>String(x.id||`${norm(x.title)}|${x.date||x.scheduled_for||''}`));writeJSON('gtai_schedule',sched.items);try{if(typeof gtSchedule!=='undefined')gtSchedule=sched.items}catch(_){}
      const foodKey=`gtai_food_diary_${featureOwnerKey()}`;const food=mergeUnique(readJSON(foodKey,[]),pending.foods||[],x=>String(x.id||`${x.date}|${norm(x.name)}|${x.mealType||''}|${x.kcal||0}`));writeJSON(foodKey,food.items);
      const plans=mergeUnique(readJSON('gtai_custom_plans',[]),pending.customPlans||[],x=>String(x.id||norm(x.name)));writeJSON('gtai_custom_plans',plans.items);
      const templateKey=`gtai_workout_templates_v3:${ownerKey()}`;const templateIncoming=(pending.templates||[]).map(x=>({...x,id:'local-import-'+makeId()}));const tm=mergeUnique(readJSON(templateKey,[]),templateIncoming,x=>norm(x.name));writeJSON(templateKey,tm.items);
      const customKey=`gtai_custom_exercises_v2:${ownerKey()}`;const cm=mergeUnique(readJSON(customKey,[]),pending.customExercises||[],x=>norm(x.name));writeJSON(customKey,cm.items);
      if(pending.activeDraft&&!readJSON(archivedDraftCandidateKey(),null))writeJSON(archivedDraftCandidateKey(),pending.activeDraft);
      try{(pending.customExercises||[]).forEach(r=>{if(!r?.name)return;const lib=typeof libraryExercises!=='undefined'&&Array.isArray(libraryExercises)?libraryExercises:null;if(lib&&!lib.some(x=>norm(x.name)===norm(r.name)))lib.push(r)})}catch(_){}
      await cloudSyncImportedWorkouts(imported);
      await syncImportedTemplatesAndExercises({templates:pending.templates||[],customExercises:pending.customExercises||[]});
      localStorage.removeItem('gtai_pending_archive_restore:local');
      try{window.gtRenderFood?.();window.gtRenderSchedule?.();window.renderHistory?.();window.gtRenderStats?.();window.renderLibrary?.();ensureArchivedDraftCard()}catch(_){}
      toast(T('Архів, відновлений до входу, об’єднано з поточним акаунтом. Дублікати не перезаписувалися.','The archive restored before sign-in has been merged into this account. Duplicates were not overwritten.'),'success');
    }catch(err){console.warn('Guest archive transfer remains available for retry:',err?.message||err);toast(T('Архів збережено локально, але перенесення в акаунт не завершено. Повторна спроба буде доступна під час наступного входу.','The archive remains local, but transfer to the account is incomplete. It can be retried on the next sign-in.'),'error')}
  }
  function wrapAfterLoginV4(){
    const original=window.gtAfterLogin;if(typeof original!=='function'||original.__gtV4ConflictCheck)return;
    const wrapped=async function(...args){const result=await original.apply(this,args);await restoreGuestArchiveAfterLogin();setTimeout(()=>{ensureBackupCard();checkDraftConflict()},350);return result};
    wrapped.__gtV4ConflictCheck=true;window.gtAfterLogin=wrapped;try{gtAfterLogin=wrapped}catch(_){}
  }
  function wrapShowPage(){
    const original=window.showPage;if(typeof original!=='function'||original.__gtV4Enhancements)return;
    const wrapped=function(id,...args){const result=original.apply(this,[id,...args]);setTimeout(()=>{if(id==='home'){ensureBackupCard();ensureArchivedDraftCard()}if(id==='session'){observeSession();ensureHandsFreePanel();ensureCoachShareAction();attachConflictCard();ensureArchivedDraftCard()}if(id==='coach-live')ensureCoachShareAction();if(id==='stats'||id==='history')ensureBackupCard()},70);if(id!=='session')releaseWakeLock();return result};wrapped.__gtV4Enhancements=true;window.showPage=wrapped;try{showPage=wrapped}catch(_){}
  }
  function init(){
    ensureBackupCard();ensureArchivedDraftCard();wrapAfterLoginV4();wrapShowPage();wrapRestAlert();installWakeLockPageWatch();
    if($('session')?.classList.contains('active'))observeSession();
    ensureCoachShareAction();
    document.addEventListener('input',e=>{if(e.target.closest?.('#exerciseList'))queueMetadataPatch()});
    document.addEventListener('change',e=>{if(e.target.closest?.('#exerciseList'))queueMetadataPatch()});
    window.addEventListener('focus',()=>{checkDraftConflict();ensureBackupCard()});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDraftConflict()});
    setInterval(()=>{if(!document.hidden&&$('session')?.classList.contains('active'))checkDraftConflict()},30000);
    setTimeout(checkDraftConflict,1200);
    // Check conflict again only when the page returns or connectivity is restored; avoids polling Supabase every few seconds.
    document.addEventListener('click',e=>{if(e.target.closest?.('#gtPauseWorkoutBtn'))releaseWakeLock()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
