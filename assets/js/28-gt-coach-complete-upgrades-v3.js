(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const en = () => { try { return typeof lang !== 'undefined' ? lang === 'en' : document.documentElement.lang === 'en'; } catch (_) { return document.documentElement.lang === 'en'; } };
  const T = (uk, english) => en() ? english : uk;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('uk').replace(/[^a-z0-9а-яіїєґ]+/g,' ').trim();
  const userId = () => { try { return typeof gtUser !== 'undefined' && gtUser?.id ? String(gtUser.id) : ''; } catch (_) { return ''; } };
  const accountKey = () => userId() || 'local';
  const key = name => `gtai_${name}_v3:${accountKey()}`;
  const readJSON = (k, fallback) => { try { const x = JSON.parse(localStorage.getItem(k) || 'null'); return x == null ? fallback : x; } catch (_) { return fallback; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
  const db = () => { try { return typeof gtSupabase !== 'undefined' ? gtSupabase : null; } catch (_) { return null; } };
  const lib = () => { try { return Array.isArray(libraryExercises) ? libraryExercises : []; } catch (_) { return []; } };
  const workoutData = () => { try { return Array.isArray(gtSessionExerciseData) ? gtSessionExerciseData : []; } catch (_) { return []; } };
  const workouts = () => { try { return typeof history !== 'undefined' && Array.isArray(history) ? history : []; } catch (_) { return []; } };
  const debounce = (fn, ms=250) => { let handle; return (...args) => { clearTimeout(handle); handle=setTimeout(()=>fn(...args),ms); }; };
  let favoriteNames = new Set(readJSON(key('favorites'), []));
  let templates = readJSON(key('workout_templates'), []);
  let customSaveBusy = false;
  let replaceFilters = {muscles:'',equipment:'',place:'',difficulty:''};
  let savingStatusTimer = null;
  let dragSourceIndex = -1;

  const style = document.createElement('style');
  style.id = 'gt-coach-complete-upgrades-v3-css';
  style.textContent = `
   .gt-status-strip{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:8px}
   .gt-status-dot{width:7px;height:7px;border-radius:50%;display:inline-block;background:#8422c5}
   .gt-status-dot.pending{background:#f59e0b}.gt-status-dot.error{background:#fb7185}
   .gt-set-extra{display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap;padding:4px 0 8px 0;margin-bottom:4px}
   .gt-set-extra label{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted);font-weight:700}
   .gt-set-extra input[type=checkbox]{width:18px;height:18px;accent-color:var(--lime)}
   .gt-set-extra button,.gt-workout-controls button,.gt-template-row button,.gt-library-tools button,.gt-replace-filters button,.gt-history-row button{background:var(--panel2);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:8px 10px;font-weight:750;cursor:pointer}
   .gt-set-extra button:disabled{opacity:.35;cursor:not-allowed}
   .gt-exercise-note{width:100%;margin-top:10px;min-height:60px}
   .gt-previous-result{font-size:12px;color:var(--muted);background:rgba(181,79,248,.07);border:1px solid var(--line);border-radius:11px;padding:10px;margin-top:9px;line-height:1.6}
   .gt-workout-controls{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.gt-workout-controls button{font-size:12px}
   .gt-active-exercise-banner{border:1px solid #6b2b96;border-radius:15px;padding:14px;margin:8px 0 12px;background:linear-gradient(135deg,rgba(56,14,84,.5),rgba(27,9,39,.7))}
   .gt-active-exercise-banner strong{font-size:17px;display:block}.gt-active-exercise-banner small{color:var(--muted)}
   .gt-replace-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.gt-replace-filters label{min-width:0;font-size:11px;color:var(--muted)}.gt-replace-filters select{width:100%;margin-top:5px;min-width:0;padding:9px!important;font-size:12px}
   .gt-replace-create{margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(16,3,24,.35)}.gt-replace-create[hidden]{display:none!important}
   .gt-replace-create-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gt-replace-create-grid label{font-size:11px;color:var(--muted)}.gt-replace-create-grid input,.gt-replace-create-grid select,.gt-replace-create-grid textarea{width:100%;min-width:0;margin-top:4px}
   .gt-inline-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
   .gt-library-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}.gt-library-tools select{max-width:220px}.gt-fav-button{float:right;border:1px solid var(--line);background:var(--panel2);border-radius:10px;padding:7px 9px;color:var(--text);cursor:pointer}.gt-fav-button[aria-pressed=true]{color:#fbbf24;border-color:#b38b2c}.gt-library-empty{grid-column:1/-1}
   .gt-summary-metrics{grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin:10px 0}.gt-summary-metrics .metric strong{font-size:clamp(18px,3vw,24px);overflow-wrap:anywhere}.gt-template-panel{margin:14px 0}.gt-template-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:12px 0}.gt-template-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;border-bottom:1px solid var(--line)}.gt-template-row:last-child{border-bottom:0}.gt-template-copy{min-width:0}.gt-template-copy strong{display:block;overflow-wrap:anywhere}.gt-template-copy small{color:var(--muted)}.gt-template-actions{display:flex;gap:6px;flex-wrap:wrap}.gt-template-actions button{font-size:11px}
   .gt-export-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.gt-progress-bars{display:flex;align-items:end;gap:8px;height:170px;padding:12px 0 0}.gt-progress-bar{flex:1;min-width:18px;text-align:center;height:100%;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:5px}.gt-progress-bar span{display:block;width:min(100%,35px);min-height:2px;border-radius:7px 7px 2px 2px;background:linear-gradient(180deg,#b54ff8,#ab4beb)}.gt-progress-bar small{font-size:10px;color:var(--muted)}.gt-progress-legend{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5}.gt-history-row{padding:11px 0;border-bottom:1px solid var(--line)}.gt-history-row:last-child{border-bottom:0}.gt-history-row strong{display:block}.gt-history-row small{display:block;color:var(--muted);margin-top:4px}
   .gt-confirm-line{font-size:12px;color:var(--muted);margin-top:8px}.gt-drag-hint{font-size:11px;color:var(--muted);margin:6px 0}.gt-rank-actions{display:flex;gap:5px;margin:7px 0}.gt-rank-actions button{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:9px;padding:6px 9px;cursor:pointer}
   @media(max-width:650px){.gt-replace-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.gt-template-row{align-items:flex-start;flex-direction:column}.gt-template-actions{width:100%}.gt-template-actions button{flex:1}.gt-replace-create-grid{grid-template-columns:1fr}.gt-template-form{grid-template-columns:1fr}.gt-library-tools select{flex:1;max-width:none}.gt-active-exercise-banner{padding:12px}.gt-workout-controls button{min-height:40px}}
   @media(prefers-reduced-motion:reduce){.gt-active-exercise-banner,.gt-template-row,.gt-progress-bar{transition:none!important}}
  `;
  document.head.appendChild(style);

  function showSaveStatus(state, text){
    const host=$('gtWorkoutDraftControls'); if(!host)return;
    let strip=$('gtSaveStatusStrip');
    if(!strip){strip=document.createElement('div');strip.id='gtSaveStatusStrip';strip.className='gt-status-strip';host.appendChild(strip)}
    const cls=state==='error'?'error':state==='pending'?'pending':'';
    strip.innerHTML=`<span class="gt-status-dot ${cls}"></span><span>${esc(text)}</span>`;
  }
  const showPending = () => showSaveStatus('pending',T('Збереження змін…','Saving changes…'));
  const showLocalSaved = () => showSaveStatus(navigator.onLine?'':'error',navigator.onLine?T('Збережено локально · синхронізація перевіряється','Saved locally · cloud sync will be checked'):T('Збережено локально · немає з’єднання','Saved locally · offline'));
  async function syncDraftSafely(snapshot){
    const sb=db(),uid=userId();
    if(!sb||!uid||!navigator.onLine)return false;
    const draft={...snapshot,updatedAt:snapshot.updatedAt||new Date().toISOString()};
    // Optimistic compare-and-swap: do not replace a newer draft saved from another device.
    for(let attempt=0;attempt<3;attempt++){
      try{
        const {data:remote,error}=await sb.from('workout_drafts').select('details,updated_at').eq('user_id',uid).maybeSingle();
        if(error)throw error;
        const remoteTs=remote?.updated_at?new Date(remote.updated_at).getTime():0;
        const localTs=new Date(draft.updatedAt).getTime();
        if(remote && remoteTs>localTs){
          showSaveStatus('error',T('У хмарі є новіша чернетка. Вона не перезаписана старішими даними.','A newer cloud draft exists. It was not overwritten with older data.'));
          return false;
        }
        if(!remote){
          const {error:insertError}=await sb.from('workout_drafts').insert({user_id:uid,title:draft.name||'Workout',details:draft,updated_at:draft.updatedAt});
          if(!insertError){showSaveStatus('saved',T('Синхронізовано з акаунтом','Synced to account'));return true;}
          if(attempt<2 && (insertError.code==='23505'||/duplicate|unique/i.test(insertError.message||'')))continue;
          throw insertError;
        }
        const {data,error:updateError}=await sb.from('workout_drafts').update({title:draft.name||'Workout',details:draft,updated_at:draft.updatedAt}).eq('user_id',uid).eq('updated_at',remote.updated_at).select('user_id').maybeSingle();
        if(updateError)throw updateError;
        if(data){showSaveStatus('saved',T('Синхронізовано з акаунтом','Synced to account'));return true;}
      }catch(err){
        console.warn('Guarded workout draft sync unavailable; keeping local draft:',err?.message||err);
        showSaveStatus('error',T('Збережено локально; хмарна синхронізація не підтверджена','Saved locally; cloud sync not confirmed'));
        return false;
      }
    }
    showSaveStatus('error',T('Інша копія тренування змінилася. Онови дані перед новими змінами.','Another device changed this workout. Refresh before making further changes.'));
    return false;
  }
  // Route every cloud save through the guarded timestamp check rather than a blind upsert.
  window.GT_SYNC_DRAFT_SAFELY=syncDraftSafely;
  const syncDraftLater=debounce(async()=>{
    try{
      if(!$('session')?.classList.contains('active'))return;
      const snapshot=readJSON(`gtai_workout_draft_v2:${accountKey()}`,null);
      if(snapshot)await syncDraftSafely(snapshot);
    }catch(_){showSaveStatus('error',T('Не вдалося синхронізувати чернетку','Could not sync the draft'));}
  },500);

  function listEquipment(e){
    const a=Array.isArray(e?.equipment)?e.equipment:(e?.equipment?[e.equipment]:[]);
    return a.map(x=>String(x).toLowerCase());
  }
  function equipmentLabel(e){
    const a=listEquipment(e).filter(x=>!['home','gym','outdoor','all','everywhere'].includes(x));
    const labels={bodyweight:T('Без обладнання','Bodyweight'),dumbbells:T('Гантелі','Dumbbells'),barbell:T('Штанга','Barbell'),machine:T('Тренажер','Machine'),cable:T('Блок','Cable'),bands:T('Гумки','Bands'),kettlebell:T('Гиря','Kettlebell'),bench:T('Лава','Bench'),rings:T('Кільця/петлі','Rings/suspension'),other:T('Інше','Other')};
    if(a.length)return a.map(x=>labels[x]||x).join(', ');
    if(e?._gtUserExercise||e?.videoUrl||e?.equipmentType)return T('Не вказано','Not specified');
    return T('Дані не вказані','Not specified');
  }
  function locationValues(e){
    const x=String(e?.location||e?.training_location||e?.place||'').toLowerCase();
    if(x)return [x];
    const a=listEquipment(e);return a.filter(v=>['home','gym','outdoor','all','everywhere'].includes(v));
  }
  function normalizeCloudExercise(r){return {id:r.id,name:r.name,en:r.en_name||'',category:r.category||'Власні',muscles:r.muscles||'',how:r.instructions||'',mistakes:r.mistakes||'',aliases:r.aliases||[],equipment:r.equipment||[],location:r.training_location||'all',difficulty:r.difficulty||'',videoUrl:r.video_url||'',notes:r.notes||'',_gtUserExercise:true};}
  function localCustomKey(){return `gtai_custom_exercises_v2:${accountKey()}`;}
  function customList(){return readJSON(localCustomKey(),[]).filter(x=>x&&x.name);}
  function fuzzySame(a,b){
    const x=norm(a),y=norm(b); if(!x||!y)return false;if(x===y)return true;
    if(Math.min(x.length,y.length)>=7&&(x.includes(y)||y.includes(x)))return true;
    if(Math.max(x.length,y.length)>80)return false;
    let prev=Array.from({length:y.length+1},(_,i)=>i);
    for(let i=1;i<=x.length;i++){const curr=[i];for(let j=1;j<=y.length;j++)curr[j]=Math.min(curr[j-1]+1,prev[j]+1,prev[j-1]+(x[i-1]===y[j-1]?0:1));prev=curr;}
    return prev[y.length] <= (Math.max(x.length,y.length)>12?2:1);
  }
  function allNameRecords(){return lib().map(e=>({name:e.name,en:e.en||'',...e}));}
  async function saveCustomRecord(record, statusNode, saveButton){
    if(customSaveBusy)return false;
    customSaveBusy=true;if(saveButton)saveButton.disabled=true;
    try{
      const all=allNameRecords();
      const exact=all.find(e=>norm(e.name)===norm(record.name));
      if(exact){if(statusNode)statusNode.textContent=T('Така вправа вже існує. Знайди її в бібліотеці замість повторного створення.','This exercise already exists. Find it in the library instead of creating a duplicate.');return false;}
      const similar=all.filter(e=>fuzzySame(e.name,record.name)).slice(0,3);
      if(similar.length&&!confirm(T('Знайдено схожу назву: ','Similar exercise name found: ')+similar.map(e=>e.name).join(', ')+T('. Створити окрему вправу?','. Create a separate exercise anyway?')))return false;
      const local=customList();const row={...record,_gtUserExercise:true,createdAt:new Date().toISOString()};
      // Browser copy is written before attempting network access, so brief outages do not lose the exercise.
      local.push(row);writeJSON(localCustomKey(),local);
      const sb=db(),uid=userId();let cloudSaved=false;
      if(sb&&uid&&navigator.onLine){
        try{
          const payload={user_id:uid,name:row.name,en_name:row.en||null,category:row.category||'Власні',muscles:row.muscles||null,instructions:row.how||null,mistakes:row.mistakes||null,aliases:row.aliases||[],equipment:row.equipment||[],training_location:row.location||'all',difficulty:row.difficulty||null,video_url:row.videoUrl||null,notes:row.notes||null,updated_at:new Date().toISOString()};
          const {data,error}=await sb.from('user_custom_exercises').upsert(payload,{onConflict:'user_id,name'}).select().single();
          if(error)throw error;cloudSaved=true;Object.assign(row,normalizeCloudExercise(data));
          const fresh=customList().filter(x=>norm(x.name)!==norm(row.name));fresh.push(row);writeJSON(localCustomKey(),fresh);
        }catch(err){console.warn('Custom exercise retained locally; cloud save failed:',err?.message||err);}
      }
      // Merge safely into the existing library used by both the catalog and workout picker.
      const duplicate=lib().findIndex(e=>norm(e.name)===norm(row.name));
      if(duplicate>=0)lib()[duplicate]=row;else lib().push(row);
      if(typeof window.renderLibrary==='function')window.renderLibrary();
      fillLibrarySearchSuggestions();filterReplaceDialog();
      if(statusNode)statusNode.textContent=cloudSaved?T('Вправу збережено й синхронізовано з акаунтом.','Exercise saved and synced to your account.'):T('Вправу збережено на цьому пристрої. Хмарну синхронізацію не підтверджено.','Exercise saved on this device. Cloud sync was not confirmed.');
      return true;
    }finally{customSaveBusy=false;if(saveButton)saveButton.disabled=false;}
  }
  function readFormValue(prefix, id){return $(prefix+id)?.value?.trim()||'';}
  function formRecord(prefix){
    const name=readFormValue(prefix,'Name');
    const equipment=readFormValue(prefix,'Equipment');
    return {name,en:readFormValue(prefix,'En'),category:readFormValue(prefix,'Category')||'Власні',muscles:readFormValue(prefix,'Muscles'),how:readFormValue(prefix,'How'),mistakes:readFormValue(prefix,'Mistakes'),aliases:[],equipment:equipment?[equipment]:[],equipmentType:equipment,location:readFormValue(prefix,'Location')||'all',difficulty:readFormValue(prefix,'Difficulty')||'',videoUrl:readFormValue(prefix,'Video'),notes:readFormValue(prefix,'Notes')};
  }
  function addCustomFieldsToExistingForm(){
    const form=$('gtCustomExerciseForm');if(!form||$('gtCustomExerciseEquipment'))return;
    const grid=form.querySelector('.gt-custom-grid');if(!grid)return;
    const wrap=document.createElement('div');wrap.className='gt-custom-grid gt-custom-extra-fields';wrap.innerHTML=`
      <label>${T('Обладнання','Equipment')}<select id="gtCustomExerciseEquipment"><option value="bodyweight">${T('Без обладнання','Bodyweight')}</option><option value="dumbbells">${T('Гантелі','Dumbbells')}</option><option value="barbell">${T('Штанга','Barbell')}</option><option value="machine">${T('Тренажер','Machine')}</option><option value="cable">${T('Блок','Cable')}</option><option value="bands">${T('Гумки','Bands')}</option><option value="kettlebell">${T('Гиря','Kettlebell')}</option><option value="other">${T('Інше','Other')}</option></select></label>
      <label>${T('Місце виконання','Training location')}<select id="gtCustomExerciseLocation"><option value="all">${T('Всюди','Anywhere')}</option><option value="home">${T('Вдома','Home')}</option><option value="gym">${T('У спортзалі','Gym')}</option><option value="outdoor">${T('Надворі','Outdoor')}</option></select></label>
      <label>${T('Рівень складності','Difficulty')}<select id="gtCustomExerciseDifficulty"><option value="beginner">${T('Початковий','Beginner')}</option><option value="intermediate">${T('Середній','Intermediate')}</option><option value="advanced">${T('Просунутий','Advanced')}</option></select></label>
      <label>${T('Відеопосилання (необов’язково)','Video URL (optional)')}<input id="gtCustomExerciseVideo" type="url" maxlength="500" placeholder="https://…"></label>
      <label class="gt-custom-wide">${T('Примітки (необов’язково)','Notes (optional)')}<textarea id="gtCustomExerciseNotes" rows="2" maxlength="700"></textarea></label>`;
    grid.insertAdjacentElement('afterend',wrap);
    // Own capture handler prevents the older handler from saving only the short form fields.
    form.addEventListener('submit',async e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const record=formRecord('gtCustomExercise');
      const status=$('gtCustomExerciseStatus'),button=form.querySelector('button[type=submit]');
      if(!record.name){$('gtCustomExerciseName')?.focus();return;}
      if(record.videoUrl&&!/^https:\/\//i.test(record.videoUrl)){if(status)status.textContent=T('Для відео використай безпечне посилання https://.','Use a secure https:// URL for video.');return;}
      const ok=await saveCustomRecord(record,status,button);
      if(ok){const values={equipment:$('gtCustomExerciseEquipment')?.value||'bodyweight',location:$('gtCustomExerciseLocation')?.value||'all',difficulty:$('gtCustomExerciseDifficulty')?.value||'beginner'};form.reset();$('gtCustomExerciseEquipment').value=values.equipment;$('gtCustomExerciseLocation').value=values.location;$('gtCustomExerciseDifficulty').value=values.difficulty;}
    },true);
  }
  function replacementFormMarkup(){
    return `<div class="gt-replace-create" id="gtReplaceCreateWrap" hidden><h3>${T('Нова власна вправа','New custom exercise')}</h3><form id="gtReplaceCreateForm"><div class="gt-replace-create-grid">
      <label>${T('Назва *','Name *')}<input id="gtReplaceNewName" required maxlength="100" autocomplete="off"></label>
      <label>${T('Англійська назва','English name')}<input id="gtReplaceNewEn" maxlength="100"></label>
      <label>${T('Група м’язів','Muscle group')}<select id="gtReplaceNewCategory"><option>Груди</option><option>Спина</option><option>Плечі</option><option>Біцепс</option><option>Трицепс</option><option>Передпліччя</option><option>Ноги</option><option>Сідниці</option><option>Литки</option><option>Прес</option><option>Усе тіло</option><option>Власні</option></select></label>
      <label>${T('Обладнання','Equipment')}<select id="gtReplaceNewEquipment"><option value="bodyweight">${T('Без обладнання','Bodyweight')}</option><option value="dumbbells">${T('Гантелі','Dumbbells')}</option><option value="barbell">${T('Штанга','Barbell')}</option><option value="machine">${T('Тренажер','Machine')}</option><option value="cable">${T('Блок','Cable')}</option><option value="bands">${T('Гумки','Bands')}</option><option value="kettlebell">${T('Гиря','Kettlebell')}</option><option value="other">${T('Інше','Other')}</option></select></label>
      <label>${T('Місце','Location')}<select id="gtReplaceNewLocation"><option value="all">${T('Всюди','Anywhere')}</option><option value="home">${T('Вдома','Home')}</option><option value="gym">${T('У спортзалі','Gym')}</option><option value="outdoor">${T('Надворі','Outdoor')}</option></select></label>
      <label>${T('Складність','Difficulty')}<select id="gtReplaceNewDifficulty"><option value="beginner">${T('Початковий','Beginner')}</option><option value="intermediate">${T('Середній','Intermediate')}</option><option value="advanced">${T('Просунутий','Advanced')}</option></select></label>
      <label class="gt-replace-wide">${T('Основні м’язи','Main muscles')}<input id="gtReplaceNewMuscles" maxlength="180"></label>
      <label class="gt-replace-wide">${T('Опис техніки','Technique')}<textarea id="gtReplaceNewHow" rows="2" maxlength="1000"></textarea></label>
      <label class="gt-replace-wide">${T('Відеопосилання (необов’язково)','Video URL (optional)')}<input id="gtReplaceNewVideo" type="url" maxlength="500" placeholder="https://…"></label>
      <label class="gt-replace-wide">${T('Примітки','Notes')}<textarea id="gtReplaceNewNotes" rows="2" maxlength="700"></textarea></label>
    </div><div class="gt-inline-actions"><button class="btn" type="submit">＋ ${T('Зберегти вправу','Save exercise')}</button><button class="btn secondary" type="button" id="gtReplaceCreateCancel">${T('Скасувати','Cancel')}</button></div><p id="gtReplaceCreateStatus" class="hint" role="status"></p></form></div>`;
  }
  function addReplaceFilters(){
    const dialog=$('gtExerciseReplaceDialog');if(!dialog||$('gtReplaceFilters'))return;
    const search=$('gtExerciseReplaceSearch');if(!search)return;
    const filters=document.createElement('div');filters.id='gtReplaceFilters';filters.className='gt-replace-filters';
    filters.innerHTML=`
      <label>${T('М’язи','Muscles')}<select data-filter="muscles"><option value="">${T('Усі групи','All groups')}</option>${['Груди','Спина','Плечі','Біцепс','Трицепс','Передпліччя','Ноги','Сідниці','Литки','Прес','Усе тіло'].map(x=>`<option>${x}</option>`).join('')}<option value="__unknown">${T('Не вказано','Not specified')}</option></select></label>
      <label>${T('Обладнання','Equipment')}<select data-filter="equipment"><option value="">${T('Усе','All')}</option><option value="bodyweight">${T('Без обладнання','Bodyweight')}</option><option value="dumbbells">${T('Гантелі','Dumbbells')}</option><option value="barbell">${T('Штанга','Barbell')}</option><option value="machine">${T('Тренажер','Machine')}</option><option value="cable">${T('Блок','Cable')}</option><option value="bands">${T('Гумки','Bands')}</option><option value="__unknown">${T('Не вказано','Not specified')}</option></select></label>
      <label>${T('Місце','Location')}<select data-filter="place"><option value="">${T('Усюди','Anywhere')}</option><option value="home">${T('Вдома','Home')}</option><option value="gym">${T('Спортзал','Gym')}</option><option value="outdoor">${T('Надворі','Outdoor')}</option><option value="__unknown">${T('Не вказано','Not specified')}</option></select></label>
      <label>${T('Складність','Difficulty')}<select data-filter="difficulty"><option value="">${T('Усі рівні','All levels')}</option><option value="beginner">${T('Початковий','Beginner')}</option><option value="intermediate">${T('Середній','Intermediate')}</option><option value="advanced">${T('Просунутий','Advanced')}</option><option value="__unknown">${T('Не вказано','Not specified')}</option></select></label>`;
    search.insertAdjacentElement('afterend',filters);
    filters.querySelectorAll('select').forEach(s=>s.addEventListener('change',()=>{replaceFilters[s.dataset.filter]=s.value;filterReplaceDialog()}));
    const count=$('gtExerciseReplaceCount');if(count)count.insertAdjacentHTML('afterend',`<div class="gt-inline-actions"><button type="button" class="btn secondary" id="gtShowInlineCreate">＋ ${T('Створити власну вправу','Create custom exercise')}</button></div>${replacementFormMarkup()}`);
    $('gtShowInlineCreate')?.addEventListener('click',()=>{const wrap=$('gtReplaceCreateWrap');if(wrap){wrap.hidden=!wrap.hidden;if(!wrap.hidden)$('gtReplaceNewName')?.focus()}});
    $('gtReplaceCreateCancel')?.addEventListener('click',()=>{$('gtReplaceCreateWrap').hidden=true});
    $('gtReplaceCreateForm')?.addEventListener('submit',async e=>{
      e.preventDefault();const status=$('gtReplaceCreateStatus'),button=e.currentTarget.querySelector('button[type=submit]');
      const r={name:$('gtReplaceNewName').value.trim(),en:$('gtReplaceNewEn').value.trim(),category:$('gtReplaceNewCategory').value,muscles:$('gtReplaceNewMuscles').value.trim(),how:$('gtReplaceNewHow').value.trim(),mistakes:'',aliases:[],equipment:[$('gtReplaceNewEquipment').value],equipmentType:$('gtReplaceNewEquipment').value,location:$('gtReplaceNewLocation').value,difficulty:$('gtReplaceNewDifficulty').value,videoUrl:$('gtReplaceNewVideo').value.trim(),notes:$('gtReplaceNewNotes').value.trim()};
      if(!r.name)return;if(r.videoUrl&&!/^https:\/\//i.test(r.videoUrl)){status.textContent=T('Використай посилання https://.','Use an https:// URL.');return;}
      const ok=await saveCustomRecord(r,status,button);if(ok){const name=r.name;e.currentTarget.reset();$('gtReplaceCreateWrap').hidden=true;$('gtExerciseReplaceSearch').value=name;$('gtExerciseReplaceSearch').dispatchEvent(new Event('input',{bubbles:true}));filterReplaceDialog();}
    });
    const results=$('gtExerciseReplaceResults');if(results&&!results.dataset.gtFilterHook){results.dataset.gtFilterHook='1';new MutationObserver(()=>filterReplaceDialog()).observe(results,{childList:true});results.addEventListener('click',e=>{const b=e.target.closest('button[data-name]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();applyReplacement(b.dataset.name,b.dataset.prescription);},true);}
    filterReplaceDialog();
  }
  function metaForName(name){return lib().find(e=>norm(e.name)===norm(name))||{};}
  function includesSelected(values, wanted){
    if(!wanted)return true;
    if(wanted==='__unknown')return !values.length;
    if(!values.length)return false; // Unknown metadata must not masquerade as a match for a specific filter.
    return values.includes(String(wanted).toLowerCase())||values.some(v=>norm(v).includes(norm(wanted)));
  }
  function filterReplaceDialog(){
    const root=$('gtExerciseReplaceResults');if(!root)return;
    const filters=$('gtReplaceFilters');
    const query=norm($('gtExerciseReplaceSearch')?.value||'');
    const nodes=[...root.querySelectorAll('.gt-replace-result')];
    nodes.forEach(node=>{
      const name=node.querySelector('button[data-name]')?.dataset.name||node.querySelector('strong')?.textContent||'';const e=metaForName(name);
      const matchesQuery=!query||norm([e.name,e.en,e.muscles,e.category,...(e.aliases||[])].join(' ')).includes(query);
      const muscle=String(e.category||e.muscles||'').toLowerCase();const chosenMuscle=replaceFilters.muscles;
      const matchMuscle=!chosenMuscle||(chosenMuscle==='__unknown'?!e.category&&!e.muscles:muscle.includes(chosenMuscle.toLowerCase())||String(e.muscles||'').toLowerCase().includes(chosenMuscle.toLowerCase()));
      const eq=listEquipment(e).filter(x=>!['home','gym','outdoor','all','everywhere'].includes(x));
      const place=locationValues(e);
      const match=matchesQuery&&matchMuscle&&includesSelected(eq,replaceFilters.equipment)&&includesSelected(place,replaceFilters.place)&&includesSelected(e.difficulty?[String(e.difficulty).toLowerCase()]:[],replaceFilters.difficulty);
      node.hidden=!match;
      let near=node.querySelector('.gt-similar-badge');
      if(near)near.remove();
    });
    // Bring same-muscle movements to the top, without taking away manual choice.
    const idx=Number(window.GTActiveReplacementIndex);const current=workoutData()[idx];const target=norm(current?.name||'');const base=metaForName(current?.name||'');
    const muscleTokens=norm(base.muscles||base.category).split(' ').filter(x=>x.length>3);
    const visible=nodes.filter(n=>!n.hidden).sort((a,b)=>{
      function score(n){const e=metaForName(n.querySelector('button[data-name]')?.dataset.name||'');const hay=norm([e.muscles,e.category].join(' '));return muscleTokens.reduce((sum,t)=>sum+(hay.includes(t)?1:0),0)}
      return score(b)-score(a);
    });
    const desired=[...visible,...nodes.filter(n=>n.hidden)];
    // Avoid re-appending nodes when the order is already correct: a MutationObserver
    // watches this list, so unconditional appendChild would keep it firing forever.
    if(desired.some((node,index)=>nodes[index]!==node))desired.forEach(n=>root.appendChild(n));
    const actualVisible=root.querySelectorAll('.gt-replace-result:not([hidden])').length;
    const empty=root.querySelector('.gt-replace-filter-empty');if(actualVisible===0){if(!empty)root.insertAdjacentHTML('beforeend',`<div class="empty gt-replace-filter-empty">${T('За цими фільтрами вправ не знайдено. Зміни фільтри або створи власну.','No exercises match these filters. Change filters or create a custom exercise.')}</div>`)}else if(empty)empty.remove();
  }
  function isRecorded(e){return !!(e?.notes||e?.setLogs?.some(s=>s.completed||s.edited||Number(s.weight)>0)||e?.completed);}
  function parseRepsPrescription(v){const m=String(v||'').match(/(\d+)\s*[x×]\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);return {sets:Math.max(1,Math.min(10,Number(m?.[1])||3)),reps:Math.max(1,Math.min(100,Number(m?.[2])||10))};}
  function refreshSessionRowMeta(i){
    const e=workoutData()[i];const row=document.querySelector(`#exerciseList [data-session-index=\"${i}\"]`);if(!e||!row)return;
    row.dataset.exercise=e.name||'';
    const title=row.querySelector('.session-ex-name');if(title)title.textContent=e.name||'';
    const details=row.querySelector('.details');const small=details?.querySelector('small');if(small)small.textContent=e.prescription||'3 × 8–12';
    let link=details?.querySelector('a.tech-video');let href='';try{href=typeof techniqueUrl==='function'?techniqueUrl(e.name):''}catch(_){}
    if(href){if(!link){link=document.createElement('a');link.className='tech-video';link.target='_blank';link.rel='noopener';if(small)small.insertAdjacentElement('afterend',link);else details?.appendChild(link);}if(link){link.href=href;link.textContent=tr('Відео техніки','Technique video');}}
    else link?.remove();
    const done=row.querySelector('.gt-session-completion');if(done)done.checked=!!e.completed;
  }
  function applyReplacement(name,prescription){
    const idx=Number(window.GTActiveReplacementIndex);const arr=workoutData();const e=arr[idx];if(!e||!name)return;
    const next=metaForName(name);const oldName=e.name;const hasData=isRecorded(e);
    if(norm(oldName)===norm(name)){closeDialog();return;}
    if(hasData&&!confirm(T(`У вправі «${oldName}» уже є результати. Їх буде збережено в історії заміни, а підходи нової вправи почнуться окремо. Продовжити?`,`“${oldName}” already has results. They will be retained in replacement history, and the new exercise will start with fresh sets. Continue?`)))return;
    if(hasData){e.replacementHistory=Array.isArray(e.replacementHistory)?e.replacementHistory:[];e.replacementHistory.push({name:oldName,replacedAt:new Date().toISOString(),prescription:e.prescription||'',notes:e.notes||'',category:e.category||'',muscles:e.muscles||'',equipment:Array.isArray(e.equipment)?e.equipment.slice():e.equipment||[],location:e.location||'all',difficulty:e.difficulty||'',completed:!!e.completed,sets:e.sets,reps:e.reps,weight:e.weight,setLogs:(e.setLogs||[]).map(s=>({...s}))});}
    const parsed=parseRepsPrescription(prescription||next.prescription||'3 × 10');
    e.name=String(name);e.prescription=String(prescription||next.prescription||'3 × 10');e.category=next.category||e.category;e.muscles=next.muscles||'';e.equipment=next.equipment||[];e.location=next.location||'all';e.difficulty=next.difficulty||'';e.notes='';e.completed=false;e.sets=parsed.sets;e.reps=parsed.reps;e.weight=0;e.setLogs=Array.from({length:parsed.sets},()=>({reps:parsed.reps,weight:0,completed:false,edited:false}));
    try{if(Array.isArray(currentExercises)&&currentExercises[idx])currentExercises[idx]=[e.name,e.prescription];}catch(_){}
    // Rebuild the set editor to match the selected exercise's planned set count.
    if(typeof gtWorkoutSetCount==='function')gtWorkoutSetCount(idx,e.setLogs.length);else renderSessionExtras();
    refreshSessionRowMeta(idx);
    closeDialog();renderSessionExtras();showPending();persistDraftNow();
  }
  function undoReplacement(i){
    const e=workoutData()[i];if(!e||!Array.isArray(e.replacementHistory)||!e.replacementHistory.length)return;
    const previous=e.replacementHistory.pop();const priorStack=e.replacementHistory.slice();
    const current={name:e.name,prescription:e.prescription||'',notes:e.notes||'',category:e.category||'',muscles:e.muscles||'',equipment:Array.isArray(e.equipment)?e.equipment.slice():e.equipment||[],location:e.location||'all',difficulty:e.difficulty||'',completed:!!e.completed,sets:e.sets,reps:e.reps,weight:e.weight,setLogs:(e.setLogs||[]).map(s=>({...s}))};
    Object.assign(e,{...previous});e.replacementHistory=priorStack.concat([current]);
    try{if(Array.isArray(currentExercises)&&currentExercises[i])currentExercises[i]=[e.name,e.prescription||'3 × 8–12']}catch(_){}
    if(typeof gtWorkoutSetCount==='function')gtWorkoutSetCount(i,e.setLogs?.length||1);else renderSessionExtras();
    refreshSessionRowMeta(i);
    renderSessionExtras();persistDraftNow();
  }
  function closeDialog(){const d=$('gtExerciseReplaceDialog');if(d)d.classList.remove('open');window.GTActiveReplacementIndex=-1;}

  function decorateSetRows(){
    if(!$('session'))return;
    document.querySelectorAll('#exerciseList .gt-logged-exercise').forEach((exercise,i)=>{
      const idx=Number(exercise.dataset.sessionIndex??i);const e=workoutData()[idx];if(!e)return;
      const panel=exercise.querySelector('.gt-set-log-panel');if(!panel)return;
      const setRows=[...panel.querySelectorAll('.gt-set-row')];setRows.forEach((row,j)=>{
        const s=e.setLogs?.[j];if(!s)return;
        if(!row.dataset.gtSetDecorated){row.dataset.gtSetDecorated='1';const extras=document.createElement('div');extras.className='gt-set-extra';extras.innerHTML=`<label><input type="checkbox" data-gt-set-done="1" ${s.completed?'checked':''}> ${T('Підхід виконано','Set completed')}</label><button type="button" data-gt-delete-set="1" ${setRows.length<=1?'disabled':''}>${T('Видалити підхід','Delete set')}</button>`;row.insertAdjacentElement('afterend',extras);
          extras.querySelector('[data-gt-set-done]').addEventListener('change',ev=>{s.completed=ev.target.checked;s.edited=true;showPending();persistDraftNow();});
          extras.querySelector('[data-gt-delete-set]').addEventListener('click',()=>deleteSet(idx,j));
          row.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{if(s){s.edited=true;showPending();}}));
        }
      });
      let add=panel.querySelector(':scope > .gt-add-set-row');if(!add){add=document.createElement('div');add.className='gt-add-set-row gt-inline-actions';add.innerHTML=`<button class="btn secondary" type="button">＋ ${T('Додати підхід','Add set')}</button>`;add.querySelector('button').addEventListener('click',()=>addSet(idx));panel.appendChild(add);}
      let note=exercise.querySelector('.gt-exercise-note');
      if(!note){note=document.createElement('textarea');note.className='gt-exercise-note';note.rows=2;note.maxLength=700;note.placeholder=T('Примітка до вправи (необов’язково)','Exercise note (optional)');note.value=e.notes||'';note.dataset.exerciseKey=norm(e.name);note.setAttribute('aria-label',T('Примітка до вправи','Exercise note'));exercise.querySelector('.session-main')?.appendChild(note);const saveExerciseNote=debounce(()=>{const live=workoutData()[idx];if(live)live.notes=note.value;showPending();persistDraftNow();},250);note.addEventListener('input',()=>{const live=workoutData()[idx];if(live)live.notes=note.value;showPending();saveExerciseNote();});}
      else if(note.dataset.exerciseKey!==norm(e.name)){note.value=e.notes||'';note.dataset.exerciseKey=norm(e.name);}
      let prev=exercise.querySelector('.gt-previous-result');
      if(prev&&prev.dataset.exerciseKey!==norm(e.name)){prev.remove();prev=null;}
      if(!prev){prev=document.createElement('div');prev.className='gt-previous-result';prev.dataset.exerciseKey=norm(e.name);const prevData=previousForExercise(e.name);if(prevData){prev.innerHTML=`<strong>${T('Минулого разу','Last time')}:</strong> ${esc(prevData.date)} · ${esc(prevData.summary)} <button type="button" class="gt-copy-previous-all">${T('Скопіювати попередні значення','Copy previous values')}</button>`;prev.querySelector('button').addEventListener('click',()=>copyPrevious(idx,prevData));}else{prev.textContent=T('Попередніх результатів ще немає. Запиши поточний підхід, щоб почати відстежувати прогрес.','No previous results yet. Log this workout to start tracking progress.');}
        const controls=exercise.querySelector('.gt-set-count-row');if(controls)controls.insertAdjacentElement('afterend',prev);else panel.insertAdjacentElement('beforebegin',prev);
      }
      let undo=exercise.querySelector('.gt-undo-replacement');if(e.replacementHistory?.length){if(!undo){undo=document.createElement('button');undo.type='button';undo.className='btn secondary gt-undo-replacement';undo.style.marginTop='8px';undo.addEventListener('click',()=>undoReplacement(idx));const place=exercise.querySelector('.session-main');place?.appendChild(undo);}const undoText=T('↶ Відновити попередню вправу','↶ Restore previous exercise');if(undo.textContent!==undoText)undo.textContent=undoText;undo.hidden=false;}else if(undo){undo.hidden=true;}
    });
  }
  function deleteSet(i,j){
    const e=workoutData()[i];if(!e||!Array.isArray(e.setLogs)||e.setLogs.length<=1)return;
    if(!confirm(T('Видалити цей підхід?','Delete this set?')))return;
    e.setLogs.splice(j,1);if(typeof gtWorkoutSetCount==='function')gtWorkoutSetCount(i,e.setLogs.length);else renderSessionExtras();persistDraftNow();
  }
  function addSet(i){
    const e=workoutData()[i];if(!e)return;if(!Array.isArray(e.setLogs))e.setLogs=[];if(e.setLogs.length>=10){alert(T('Максимум 10 підходів для однієї вправи.','Maximum 10 sets per exercise.'));return;}
    const parsed=parseRepsPrescription(e.prescription);e.setLogs.push({reps:parsed.reps,weight:0,completed:false,edited:false});e.sets=e.setLogs.length;
    if(typeof gtWorkoutSetCount==='function')gtWorkoutSetCount(i,e.setLogs.length);else renderSessionExtras();persistDraftNow();
  }
  function previousForExercise(name){
    const rows=workouts();for(const w of rows){const e=(w.exercises||[]).find(x=>norm(x.name)===norm(name));if(!e)continue;
      const sets=Array.isArray(e.setLogs)?e.setLogs:[];if(!sets.length&&!e.weight&&!e.reps)continue;
      const date=w.date?new Date(w.date).toLocaleDateString(en()?'en-US':'uk-UA'):'—';
      const summary=sets.length?sets.map((s,i)=>`${i+1}: ${Number(s.weight)||0}×${Number(s.reps)||0}`).join(' · '):`${Number(e.weight)||0}×${Number(e.reps)||0}`;
      return {date,summary,sets:sets.map(s=>({reps:Number(s.reps)||1,weight:Number(s.weight)||0,completed:false,edited:false}))};
    }return null;
  }
  function copyPrevious(i,p){
    const e=workoutData()[i];if(!e||!p)return;
    if(!confirm(T('Скопіювати попередні ваги та повторення в поточні підходи? Поточні значення буде замінено.','Copy previous weights and reps into the current sets? Current values will be replaced.')))return;
    e.setLogs=(p.sets||[]).slice(0,10).map(s=>({...s,completed:false,edited:false}));if(!e.setLogs.length)e.setLogs=[{reps:10,weight:0,completed:false,edited:false}];e.sets=e.setLogs.length;
    if(typeof gtWorkoutSetCount==='function')gtWorkoutSetCount(i,e.setLogs.length);renderSessionExtras();persistDraftNow();
  }
  function buildActiveBanner(){
    const list=$('exerciseList');if(!list||!$('session'))return;
    let banner=$('gtActiveExerciseBanner');if(!banner){banner=document.createElement('div');banner.id='gtActiveExerciseBanner';banner.className='gt-active-exercise-banner';list.insertAdjacentElement('beforebegin',banner);}
    const rows=[...document.querySelectorAll('#exerciseList .gt-logged-exercise')];
    if(!rows.length){banner.innerHTML=`<strong>${T('Готовий почати?','Ready to begin?')}</strong><small>${T('Додай вправи до поточного плану або відкрий бібліотеку.','Add exercises to this workout or open the library.')}</small>`;return;}
    const idx=Math.max(0,rows.findIndex(r=>r.querySelector('.gt-session-completion')?.checked===false));const current=workoutData()[idx]||workoutData()[0];const next=workoutData()[idx+1];
    banner.innerHTML=`<strong>${T('Поточна вправа','Current exercise')}: ${esc(current?.name||'')}</strong><small>${T('Вправа','Exercise')} ${idx+1} ${T('з','of')} ${workoutData().length}${next?' · '+T('Далі','Next')+': '+esc(next.name):' · '+T('Це остання вправа','This is the last exercise')}</small><div class="gt-workout-controls"><button type="button" id="gtSaveTemplateFromSession">${T('Зберегти як шаблон','Save as template')}</button><button type="button" id="gtOpenTemplatePanel">${T('Мої шаблони','My templates')}</button><button type="button" id="gtExportFromSession">${T('Експорт історії','Export history')}</button></div>`;
    $('gtSaveTemplateFromSession')?.addEventListener('click',()=>saveCurrentTemplate());
    $('gtOpenTemplatePanel')?.addEventListener('click',()=>{showPage('home');$('gtPersonalTemplatesPanel')?.scrollIntoView({behavior:'smooth',block:'start'})});
    $('gtExportFromSession')?.addEventListener('click',()=>exportWorkouts('json'));
  }
  function renderSessionExtras(){decorateSetRows();buildActiveBanner();ensureTimerControls();}
  function persistDraftNow(){
    try{
      const session=$('session');if(!session?.classList.contains('active'))return;
      showPending();
      // Existing reliability script owns the canonical local draft and cloud sync; nudge its event path.
      document.dispatchEvent(new Event('gt-workout-dirty'));
      if($('exerciseList')){$('exerciseList').dispatchEvent(new Event('change',{bubbles:true}));}
      showLocalSaved();syncDraftLater();
    }catch(err){console.warn('Session local save notification error',err);}
  }
  function ensureTimerControls(){
    const timer=$('session')?.querySelector('.timer');if(!timer||$('gtCustomRestSeconds'))return;
    const chips=timer.querySelector('.chips');if(chips){const extras=document.createElement('div');extras.className='chips gt-more-rest-times';extras.style.justifyContent='center';extras.style.marginTop='8px';extras.innerHTML=`<button type="button" class="chip" data-seconds="45">45 s</button><button type="button" class="chip" data-seconds="180">180 s</button>`;chips.insertAdjacentElement('afterend',extras);extras.querySelectorAll('[data-seconds]').forEach(b=>b.addEventListener('click',()=>setTimer(Number(b.dataset.seconds))));}
    const controls=document.createElement('div');controls.className='gt-inline-actions';controls.style.justifyContent='center';controls.innerHTML=`<label>${T('Свій час, с','Custom seconds')} <input id="gtCustomRestSeconds" type="number" inputmode="numeric" min="0" max="1800" value="90" style="width:100px"></label><button class="btn secondary" type="button" id="gtApplyRestSeconds">${T('Встановити','Set')}</button><button class="btn secondary" type="button" id="gtSkipRest">${T('Пропустити відпочинок','Skip rest')}</button>`;timer.appendChild(controls);
    $('gtApplyRestSeconds')?.addEventListener('click',()=>{const n=Math.max(0,Math.min(1800,Number($('gtCustomRestSeconds').value)||0));setTimer(n)});
    $('gtSkipRest')?.addEventListener('click',()=>{try{stopTimer()}catch(_){}setTimer(0);if($('clock'))$('clock').textContent='00:00';});
  }

  function ensureTemplatePanel(){
    let panel=$('gtPersonalTemplatesPanel');if(panel)return panel;
    panel=document.createElement('section');panel.id='gtPersonalTemplatesPanel';panel.className='card gt-template-panel';
    panel.innerHTML=`<div class="section-head"><h3>${T('Особисті шаблони тренувань','Personal workout templates')}</h3><span class="pill" id="gtTemplateCount">0</span></div><p class="hint">${T('Збережи заняття, щоб швидко запускати його знову. Підходи в шаблоні — це план, а не автоматичне підставлення попередніх результатів.','Save a workout to launch it again. Template sets define the plan and do not automatically overwrite your next results.')}</p><form id="gtTemplateForm" class="gt-template-form"><input id="gtTemplateName" maxlength="100" placeholder="${T('Назва шаблону','Template name')}" required><button class="btn" type="submit">＋ ${T('Зберегти поточне тренування','Save current workout')}</button></form><div id="gtTemplateStatus" class="hint" role="status"></div><div id="gtTemplatesList"></div>`;
    const home=$('home');if(home){const last=home.querySelector('.section-head h2[data-i="quickStart"]')?.closest('.section-head');if(last)last.insertAdjacentElement('afterend',panel);else home.appendChild(panel);}else document.querySelector('main')?.appendChild(panel);
    $('gtTemplateForm')?.addEventListener('submit',e=>{e.preventDefault();saveCurrentTemplate($('gtTemplateName').value.trim());});
    return panel;
  }
  function exerciseTemplateSnapshot(){
    const arr=workoutData();if(arr.length)return arr.map(e=>({name:String(e.name||''),prescription:String(e.prescription||'3 × 8–12')})).filter(e=>e.name);
    try{const p=typeof buildPlan==='function'&&typeof profile!=='undefined'&&profile?buildPlan():null;return (p?.days?.[0]?.items||[]).map(e=>Array.isArray(e)?{name:e[0],prescription:e[1]}:{name:e.name,prescription:e.prescription||'3 × 8–12'}).filter(e=>e.name);}catch(_){return[];}
  }
  async function saveCurrentTemplate(nameOverride, idOverride){
    const name=String(nameOverride||$('gtTemplateName')?.value||currentWorkout||T('Моє тренування','My workout')).trim();if(!name){$('gtTemplateName')?.focus();return;}
    const details={exercises:exerciseTemplateSnapshot(),updatedAt:new Date().toISOString(),version:1};if(!details.exercises.length){alert(T('Немає вправ для збереження в шаблоні.','There are no exercises to save as a template.'));return;}
    const editId=idOverride||window.GTEditingTemplateId||null;
    let current=Array.isArray(templates)?templates:[];
    if(!editId&&current.some(t=>norm(t.name)===norm(name))){if(!confirm(T('Шаблон із такою назвою вже є. Замінити його?','A template with that name already exists. Replace it?')))return;}
    const existing=editId?current.find(t=>String(t.id)===String(editId)):current.find(t=>norm(t.name)===norm(name));
    const rec={id:existing?.id||`local-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,details,updatedAt:details.updatedAt};
    current=existing?current.map(t=>t===existing?rec:t):[rec,...current.filter(t=>norm(t.name)!==norm(name))];templates=current;writeJSON(key('workout_templates'),templates);renderTemplates();
    const sb=db(),uid=userId();let synced=false;
    if(sb&&uid&&navigator.onLine){try{
      if(existing?.id&&!String(existing.id).startsWith('local-')){const {data,error}=await sb.from('workout_templates').update({name,details,updated_at:rec.updatedAt}).eq('id',existing.id).eq('user_id',uid).select().maybeSingle();if(error)throw error;synced=!!data;}
      else {const {data,error}=await sb.from('workout_templates').upsert({user_id:uid,name,details,updated_at:rec.updatedAt},{onConflict:'user_id,name'}).select().single();if(error)throw error;rec.id=data.id;templates=templates.map(t=>t===rec?{...rec,id:data.id}:t);writeJSON(key('workout_templates'),templates);synced=true;}
    }catch(err){console.warn('Template saved locally, cloud sync failed',err?.message||err)}}
    const status=$('gtTemplateStatus');if(status)status.textContent=synced?T('Шаблон збережено й синхронізовано.','Template saved and synced.'):T('Шаблон збережено локально. Синхронізація з хмарою не підтверджена.','Template saved locally. Cloud sync was not confirmed.');
    window.GTEditingTemplateId=null;$('gtTemplateName').value='';renderTemplates();
  }
  window.gtSaveCurrentTemplate=(nameOverride,idOverride)=>saveCurrentTemplate(nameOverride,idOverride);
  async function loadTemplates(){
    const local=readJSON(key('workout_templates'),[]);templates=Array.isArray(local)?local:[];
    const sb=db(),uid=userId();if(sb&&uid){try{const {data,error}=await sb.from('workout_templates').select('*').eq('user_id',uid).order('updated_at',{ascending:false});if(error)throw error;
      const cloud=(data||[]).map(r=>({id:r.id,name:r.name,details:r.details||{exercises:[]},updatedAt:r.updated_at||r.details?.updatedAt}));
      const byId=new Map(cloud.map(t=>[String(t.id),t]));const byName=new Map(cloud.map(t=>[norm(t.name),t]));
      const merged=[...cloud];for(const t of templates){const idx=merged.findIndex(c=>String(c.id)===String(t.id)||norm(c.name)===norm(t.name));if(idx<0)merged.push(t);else if(String(t.id).startsWith('local-')&&new Date(t.updatedAt||0)>new Date(merged[idx].updatedAt||0))merged[idx]=t;}
      templates=merged.filter((t,i,a)=>a.findIndex(x=>norm(x.name)===norm(t.name))===i);writeJSON(key('workout_templates'),templates);
      await syncLocalTemplates();
    }catch(err){console.warn('Templates cloud load unavailable; local copy retained',err?.message||err)}}
    renderTemplates();
  }
  async function syncLocalTemplates(){
    const sb=db(),uid=userId();if(!sb||!uid||!navigator.onLine)return;
    let changed=false;
    for(const rec of templates){if(!String(rec.id||'').startsWith('local-'))continue;try{
      const payload={user_id:uid,name:String(rec.name||'').trim(),details:rec.details||{exercises:[]},updated_at:rec.updatedAt||new Date().toISOString()};
      const {data,error}=await sb.from('workout_templates').upsert(payload,{onConflict:'user_id,name'}).select('id,name,details,updated_at').single();
      if(error)throw error;if(data){rec.id=data.id;rec.details=data.details||rec.details;rec.updatedAt=data.updated_at||rec.updatedAt;changed=true;}
    }catch(err){console.warn('Template remains stored locally until sync succeeds:',rec.name,err?.message||err)}}
    if(changed)writeJSON(key('workout_templates'),templates);
  }
  function startWorkoutFromItems(name, entries, editingTemplateId=null){
    const normalized=(entries||[]).map(e=>Array.isArray(e)?{name:String(e[0]||''),prescription:String(e[1]||'3 × 8–12')}:{name:String(e.name||''),prescription:String(e.prescription||'3 × 8–12')}).filter(e=>e.name);
    if(!normalized.length){alert(T('У цьому тренуванні немає вправ.','There are no exercises in this workout.'));return false;}
    try{window.GT_FORCE_SESSION_ITEMS=null;window.startWorkout?.(name);}catch(err){console.warn('Existing workout launcher could not start:',err?.message||err)}
    currentWorkout=String(name||T('Тренування','Workout'));currentExercises=normalized.map(e=>[e.name,e.prescription]);window.GTEditingTemplateId=editingTemplateId;
    const detailed=true; // Per-set reps and weight entry is available to every user.
    gtSessionExerciseData=normalized.map(e=>{const d=parseRepsPrescription(e.prescription);const setLogs=detailed?Array.from({length:d.sets},()=>({reps:d.reps,weight:0,completed:false,edited:false})):[];return {...e,sets:d.sets,reps:d.reps,weight:0,completed:false,notes:'',setLogs};});
    const host=$('exerciseList');if(!host)return false;
    host.innerHTML=gtSessionExerciseData.map((e,i)=>{
      const rows=(e.setLogs||[]).map((set,j)=>`<div class="gt-set-row"><span class="gt-set-number">${T('Підхід','Set')} ${j+1}</span><label>${T('Повторення','Reps')}<input aria-label="${T('Повторення','Reps')}" type="number" inputmode="numeric" min="1" max="100" value="${set.reps}" onchange="gtWorkoutSetChange(${i},${j},'reps',this.value)"></label><label>${T('Вага, кг','Weight, kg')}<input aria-label="${T('Вага в кілограмах','Weight in kilograms')}" type="number" inputmode="decimal" min="0" max="500" step="0.5" value="${set.weight||''}" placeholder="0" onchange="gtWorkoutSetChange(${i},${j},'weight',this.value)"></label><label class="gt-set-type-label">${T('Тип підходу','Set type')}<select aria-label="${T('Тип підходу','Set type')}" onchange="gtWorkoutSetChange(${i},${j},'type',this.value)"><option value="warmup" ${(set.type||'working')==='warmup'?'selected':''}>${T('Розминка','Warm-up')}</option><option value="working" ${(set.type||'working')==='working'?'selected':''}>${T('Робочий','Working')}</option></select></label></div>`).join('');
      return `<div class="session-row gt-logged-exercise" data-session-index="${i}" data-exercise="${esc(e.name)}"><div class="session-main"><div class="gt-session-exercise-heading"><input class="gt-session-completion" type="checkbox" aria-label="${T('Вправу виконано','Exercise completed')}" onchange="gtToggleExerciseDone(${i},this.checked)"><div class="details"><b class="session-ex-name">${esc(e.name)}</b><small style="display:block;color:var(--muted);margin-top:4px">${esc(e.prescription)}</small></div></div><div class="gt-set-count-row">${detailed?`<label>${T('Кількість підходів','Number of sets')}<input type="number" min="1" max="10" value="${e.setLogs.length}" onchange="gtWorkoutSetCount(${i},this.value)"></label>`:''}<button type="button" class="chip" onclick="gtSubstitute(${i})">↻ ${T('Замінити вправу','Substitute exercise')}</button></div><div class="gt-set-log-panel">${detailed?`<h4>${T('Вага та повторення для кожного підходу','Weight and reps for each set')}</h4><p class="gt-weight-help">${T('Введи вагу в кг навпроти кожного підходу. Обери «Розминка» або «Робочий»; дані збережуться разом із тренуванням.','Enter the load in kg for each set. Choose “Warm-up” or “Working”; the values are saved with the workout.')}</p>${rows}`:''}</div></div></div>`;
    }).join('');
    if($('sessionTitle'))$('sessionTitle').textContent=currentWorkout;
    window.showPage?.('session');try{setTimer(90)}catch(_){};renderSessionExtras();installDragReorder();persistDraftNow();return true;
  }
  window.gtStartWorkoutFromItems=startWorkoutFromItems;
  async function templateAction(action,id){
    const rec=templates.find(t=>String(t.id)===String(id));if(!rec)return;
    if(action==='start'||action==='edit'){
      const entries=(rec.details?.exercises||[]).map(e=>Array.isArray(e)?{name:e[0],prescription:e[1]||'3 × 8–12'}:{name:e.name,prescription:e.prescription||'3 × 8–12'}).filter(e=>e.name);
      if(!entries.length){alert(T('У шаблоні немає вправ.','This template contains no exercises.'));return;}
      startWorkoutFromItems(rec.name,entries,action==='edit'?rec.id:null);
      if(action==='edit'){showPage('home');const title=$('gtTemplateName');if(title)title.value=rec.name;const status=$('gtTemplateStatus');if(status)status.textContent=T('Шаблон відкрито для редагування. Після змін натисни «Зберегти поточне тренування», щоб оновити його.','Template opened for editing. After changes, press “Save current workout” to update it.');showPage('session');}
    } else if(action==='duplicate'){
      const name=prompt(T('Назва копії','Copy name'),rec.name+' '+T('копія','copy'));if(!name?.trim())return;const dup={...rec,id:`local-${Date.now()}`,name:name.trim(),updatedAt:new Date().toISOString()};templates.unshift(dup);writeJSON(key('workout_templates'),templates);renderTemplates();await saveTemplateCloud(dup);
    } else if(action==='rename'){
      const name=prompt(T('Нова назва шаблону','New template name'),rec.name);if(!name?.trim())return;if(templates.some(t=>t.id!==rec.id&&norm(t.name)===norm(name))){alert(T('Така назва вже використовується.','That name is already in use.'));return;}const old=rec.name;rec.name=name.trim();rec.updatedAt=new Date().toISOString();writeJSON(key('workout_templates'),templates);renderTemplates();await renameTemplateCloud(rec,old);
    } else if(action==='delete'){
      if(!confirm(T(`Видалити шаблон «${rec.name}»?` ,`Delete template “${rec.name}”?`)))return;templates=templates.filter(t=>String(t.id)!==String(id));writeJSON(key('workout_templates'),templates);renderTemplates();const sb=db(),uid=userId();if(sb&&uid&&!String(id).startsWith('local-')){const {error}=await sb.from('workout_templates').delete().eq('id',id).eq('user_id',uid);if(error)alert(T('Шаблон видалено локально, але не з хмари: ','Template deleted locally but not from cloud: ')+error.message);}
    }
  }
  async function saveTemplateCloud(rec){const sb=db(),uid=userId();if(!sb||!uid||!navigator.onLine)return;try{const {data,error}=await sb.from('workout_templates').upsert({user_id:uid,name:rec.name,details:rec.details,updated_at:rec.updatedAt},{onConflict:'user_id,name'}).select().single();if(error)throw error;rec.id=data.id;writeJSON(key('workout_templates'),templates);renderTemplates()}catch(e){console.warn('Template cloud save failed; local copy retained',e?.message||e)}}
  async function renameTemplateCloud(rec,oldName){const sb=db(),uid=userId();if(!sb||!uid)return;try{if(String(rec.id).startsWith('local-')){await saveTemplateCloud(rec);return;}const {error}=await sb.from('workout_templates').update({name:rec.name,updated_at:rec.updatedAt}).eq('id',rec.id).eq('user_id',uid);if(error)throw error;}catch(e){console.warn('Template rename cloud save failed',e?.message||e)}}
  function renderTemplates(){
    const list=$('gtTemplatesList');if(!list)return;const count=$('gtTemplateCount');if(count)count.textContent=String(templates.length);
    if(!templates.length){list.innerHTML=`<p class="empty">${T('Ще немає шаблонів. Заверши або запусти тренування й збережи його як шаблон.','No templates yet. Start a workout and save it as a template.')}</p>`;return;}
    list.innerHTML=templates.map(t=>`<div class="gt-template-row"><div class="gt-template-copy"><strong>${esc(t.name)}</strong><small>${(t.details?.exercises||[]).length} ${T('вправ','exercises')} · ${esc(t.updatedAt?new Date(t.updatedAt).toLocaleDateString(en()?'en-US':'uk-UA'):'')}</small></div><div class="gt-template-actions"><button data-template-action="start" data-id="${esc(t.id)}">▶ ${T('Почати','Start')}</button><button data-template-action="edit" data-id="${esc(t.id)}">${T('Редагувати','Edit')}</button><button data-template-action="duplicate" data-id="${esc(t.id)}">${T('Копіювати','Copy')}</button><button data-template-action="rename" data-id="${esc(t.id)}">${T('Перейменувати','Rename')}</button><button data-template-action="delete" data-id="${esc(t.id)}">${T('Видалити','Delete')}</button></div></div>`).join('');
    list.querySelectorAll('[data-template-action]').forEach(b=>b.addEventListener('click',()=>templateAction(b.dataset.templateAction,b.dataset.id)));
  }

  function addLibraryTools(){
    const page=$('library'),root=$('libraryList');if(!page||!root||$('gtLibraryTools'))return;
    const tools=document.createElement('div');tools.id='gtLibraryTools';tools.className='gt-library-tools';tools.innerHTML=`<button type="button" id="gtShowFavorites" aria-pressed="false">☆ ${T('Лише обране','Favorites only')}</button><label>${T('Сортування','Sort')} <select id="gtLibrarySort"><option value="default">${T('За каталогом','Default')}</option><option value="az">${T('Назва A–Я','Name A–Z')}</option><option value="za">${T('Назва Я–A','Name Z–A')}</option></select></label><label>${T('Обладнання','Equipment')} <select id="gtLibraryEquipment"><option value="">${T('Усе обладнання','All equipment')}</option><option value="bodyweight">${T('Без обладнання','Bodyweight')}</option><option value="dumbbells">${T('Гантелі','Dumbbells')}</option><option value="barbell">${T('Штанга','Barbell')}</option><option value="machine">${T('Тренажер','Machine')}</option><option value="cable">${T('Блок','Cable')}</option><option value="bands">${T('Гумки','Bands')}</option><option value="kettlebell">${T('Гиря','Kettlebell')}</option><option value="other">${T('Інше','Other')}</option></select></label><label>${T('Місце','Location')} <select id="gtLibraryLocation"><option value="">${T('Усюди','Any location')}</option><option value="home">${T('Вдома','Home')}</option><option value="gym">${T('У спортзалі','Gym')}</option><option value="outdoor">${T('Надворі','Outdoor')}</option></select></label><label>${T('Рівень','Difficulty')} <select id="gtLibraryDifficulty"><option value="">${T('Усі рівні','All levels')}</option><option value="beginner">${T('Початковий','Beginner')}</option><option value="intermediate">${T('Середній','Intermediate')}</option><option value="advanced">${T('Просунутий','Advanced')}</option></select></label><small class="hint">${T('Обране зберігається для цього акаунта на цьому пристрої.','Favorites are stored for this account on this device.')}</small>`;
    $('libraryFilters')?.insertAdjacentElement('afterend',tools);
    $('gtShowFavorites').addEventListener('click',e=>{const on=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'★ '+T('Показати весь каталог','Show all exercises'):'☆ '+T('Лише обране','Favorites only');decorateLibrary();});
    ['gtLibrarySort','gtLibraryEquipment','gtLibraryLocation','gtLibraryDifficulty'].forEach(id=>$(id)?.addEventListener('change',decorateLibrary));
    const search=$('exerciseSearch');if(search){let dl=$('gtLibrarySearchSuggestions');if(!dl){dl=document.createElement('datalist');dl.id='gtLibrarySearchSuggestions';document.body.appendChild(dl);}search.setAttribute('list',dl.id);const fill=debounce(()=>fillLibrarySearchSuggestions(),120);search.addEventListener('input',fill);fillLibrarySearchSuggestions();}
  }
  function fillLibrarySearchSuggestions(){
    const search=$('exerciseSearch'),dl=$('gtLibrarySearchSuggestions');if(!search||!dl)return;
    const q=norm(search.value);const matches=lib().filter(e=>!q||norm([e.name,e.en,e.en_name,...(e.aliases||[])].join(' ')).includes(q)).slice(0,35);
    dl.innerHTML=matches.map(e=>`<option value="${esc(e.name||'')}"></option>`).join('');
  }
  function equipmentMatches(meta, value){
    if(!value)return true;let items=meta?.equipment??meta?.equipmentType??meta?.equipment_type??[];if(!Array.isArray(items))items=[items];return items.some(x=>norm(x)===norm(value)||norm(x).includes(norm(value)));
  }
  function locationMatches(meta, value){if(!value)return true;const loc=meta?.location??meta?.training_location??meta?.trainingLocation??'';if(!loc)return false;return norm(loc)===norm(value)||norm(loc)==='all'||norm(loc)==='anywhere';}
  function difficultyMatches(meta, value){if(!value)return true;const d=meta?.difficulty??meta?.level??'';return !!d&&(norm(d)===norm(value)||({beginner:['новачок','початковий','початківець','easy'],intermediate:['середній','moderate'],advanced:['просунутий','складний','hard']}[value]||[]).some(v=>norm(d).includes(norm(v))));}
  function decorateLibrary(){
    const root=$('libraryList');if(!root)return;const only=$('gtShowFavorites')?.getAttribute('aria-pressed')==='true';const sort=$('gtLibrarySort')?.value||'default';const eq=$('gtLibraryEquipment')?.value||'',loc=$('gtLibraryLocation')?.value||'',diff=$('gtLibraryDifficulty')?.value||'';
    let cards=[...root.querySelectorAll('.exercise-card')];
    cards.forEach(card=>{
      const name=card.querySelector('h3')?.textContent?.trim()||'';const fav=favoriteNames.has(norm(name));const meta=lib().find(e=>norm(e.name)===norm(name));let button=card.querySelector('.gt-fav-button');
      if(!button){button=document.createElement('button');button.type='button';button.className='gt-fav-button';card.querySelector('.tag')?.insertAdjacentElement('afterend',button);}
      button.textContent=fav?'★':'☆';button.title=fav?T('Прибрати з обраного','Remove from favorites'):T('Додати в обране','Add to favorites');button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(fav));
      if(!button.dataset.bound){button.dataset.bound='1';button.addEventListener('click',()=>{const n=card.querySelector('h3')?.textContent?.trim()||'';if(favoriteNames.has(norm(n)))favoriteNames.delete(norm(n));else favoriteNames.add(norm(n));writeJSON(key('favorites'),[...favoriteNames]);decorateLibrary();});}
      const hidden= (only&&!fav)||!equipmentMatches(meta,eq)||!locationMatches(meta,loc)||!difficultyMatches(meta,diff);card.hidden=hidden;
    });
    if(sort==='az'||sort==='za'){cards.sort((a,b)=>{const d=(a.querySelector('h3')?.textContent||'').localeCompare(b.querySelector('h3')?.textContent||'',en()?'en':'uk');return sort==='az'?d:-d});cards.forEach(c=>root.appendChild(c));}
    const count=[...root.querySelectorAll('.exercise-card')].filter(c=>!c.hidden).length;const no=root.querySelector('.gt-library-empty');if(!count){if(!no)root.insertAdjacentHTML('beforeend',`<div class="card empty gt-library-empty">${T('Немає вправ за цим запитом. Спробуй інший фільтр або створи власну вправу.','No exercises match. Try another filter or create a custom exercise.')}</div>`)}else no?.remove();
  }
  function installLibraryWrapper(){
    if(typeof window.renderLibrary!=='function'||window.renderLibrary.__gtCompleteV3)return;
    const orig=window.renderLibrary;const wrapped=function(...args){const res=orig.apply(this,args);addLibraryTools();setTimeout(decorateLibrary,0);return res;};wrapped.__gtCompleteV3=true;window.renderLibrary=wrapped;try{renderLibrary=wrapped}catch(_){}
  }

  function ensureAnalytics(){
    const page=$('stats');if(!page||$('gtVolumeProgressCard'))return;
    const card=document.createElement('div');card.id='gtVolumeProgressCard';card.className='card';card.innerHTML=`<div class="section-head"><h3>${T('Обсяг роботи та історія вправ','Training volume and exercise history')}</h3></div><p class="hint">${T('Графіки використовують лише фактично збережені підходи з вагою та повтореннями. Старі тренування без детальних записів не доповнюються вигаданими значеннями.','Charts use only saved set weights and reps. Older workouts without details are not filled with invented values.')}</p><div class="field"><label for="gtExerciseProgressSelect">${T('Історія конкретної вправи','Exercise history')}</label><select id="gtExerciseProgressSelect"><option value="">${T('Обери вправу','Select exercise')}</option></select></div><div id="gtExerciseProgressDetail"></div><h4>${T('Обсяг роботи за тренування','Volume per workout')}</h4><div id="gtVolumeChart"></div>`;
    const rec=$('gtRecentWorkouts')?.closest('.card');if(rec){let summary=$('gtLastWorkoutSummaryCard');if(!summary){summary=document.createElement('div');summary.id='gtLastWorkoutSummaryCard';summary.className='card';summary.innerHTML=`<div class="section-head"><h3>${T('Підсумок останнього тренування','Last workout summary')}</h3></div><div id="gtLastWorkoutSummary"></div>`;rec.insertAdjacentElement('afterend',summary);}summary.insertAdjacentElement('afterend',card);}else page.appendChild(card);
    $('gtExerciseProgressSelect')?.addEventListener('change',renderAnalytics);
    const exCard=$('gtPRList')?.closest('.card');if(exCard&&!$('gtProgressExportButtons')){const actions=document.createElement('div');actions.id='gtProgressExportButtons';actions.className='gt-export-actions';actions.innerHTML=`<button type="button" class="btn secondary" id="gtExportJson">${T('Завантажити JSON','Export JSON')}</button><button type="button" class="btn secondary" id="gtExportCsv">${T('Завантажити CSV','Export CSV')}</button>`;exCard.appendChild(actions);$('gtExportJson').addEventListener('click',()=>exportWorkouts('json'));$('gtExportCsv').addEventListener('click',()=>exportWorkouts('csv'));}
  }
  function allSetRows(workout, exerciseName){
    const out=[];
    for(const e of workout.exercises||[]){if(exerciseName&&norm(e.name)!==norm(exerciseName))continue;
      if(Array.isArray(e.setLogs)&&e.setLogs.length){for(let i=0;i<e.setLogs.length;i++){const s=e.setLogs[i]||{};const reps=Number(s.reps)||0,weight=Number(s.weight)||0;const completed=Object.prototype.hasOwnProperty.call(s,'completed')?!!s.completed:(reps>0&&weight>=0&&(s.edited||weight>0));if(completed)out.push({name:e.name,date:workout.date,workout:workout.name,weight,reps,volume:weight*reps,set:i+1});}}
      else if(Number(e.weight)>0&&Number(e.reps)>0)out.push({name:e.name,date:workout.date,workout:workout.name,weight:Number(e.weight),reps:Number(e.reps),volume:Number(e.weight)*Number(e.reps),set:1});
    }return out;
  }
  function workoutSummary(w){
    const exercises=Array.isArray(w?.exercises)?w.exercises:[];
    const marked=exercises.filter(e=>e.completed||(e.setLogs||[]).some(s=>s.completed)).length;
    const detailed=true; // Per-set reps and weight entry is available to every user.
    const sets=detailed?allSetRows(w,null):[];
    return {date:w?.date||'',name:w?.name||T('Тренування','Workout'),minutes:Math.max(0,Number(w?.duration_minutes||w?.minutes)||0),exercises:marked,sets:sets.length,reps:sets.reduce((a,s)=>a+s.reps,0),volume:sets.reduce((a,s)=>a+s.volume,0),detailed};
  }
  function renderLastWorkoutSummary(list){
    const host=$('gtLastWorkoutSummary');if(!host)return;
    const latest=list.slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))[0];
    if(!latest){host.innerHTML=`<p class=\"empty\">${T('Ще немає збережених тренувань. Заверши перше заняття, щоб побачити підсумок.','No saved workouts yet. Finish your first session to see a summary.')}</p>`;return;}
    const s=workoutSummary(latest);const date=s.date?new Date(s.date).toLocaleDateString(en()?'en-US':'uk-UA',{year:'numeric',month:'short',day:'numeric'}):'—';
    const metrics=[[T('Тривалість','Duration'),`${s.minutes} ${T('хв','min')}`],[T('Вправи','Exercises'),s.exercises]];
    if(s.detailed)metrics.push([T('Виконані підходи','Completed sets'),s.sets],[T('Повторення','Reps'),s.reps],[T('Обсяг','Volume'),`${Math.round(s.volume).toLocaleString()} kg·reps`]);
    host.innerHTML=`<p class=\"hint\">${esc(s.name)} · ${esc(date)}</p><div class=\"metric-grid gt-summary-metrics\">${metrics.map(([label,value])=>`<div class=\"metric\"><strong>${esc(value)}</strong><small>${esc(label)}</small></div>`).join('')}</div>${s.detailed&&!s.sets?`<p class=\"hint\">${T('У цьому тренуванні немає позначених завершених підходів.','This workout has no sets marked as completed.')}</p>`:''}${!s.detailed?`<p class=\"hint\">🔒 ${T('Детальний обсяг, повторення та робоча вага доступні з Strenova Plus.','Detailed volume, reps and working weights are available with Strenova Plus.')}</p>`:''}`;
  }
  function renderRealPersonalRecords(list){
    const host=$('gtPRList');if(!host)return;
    if(window.GT_PLUS_ACCESS!==true){host.innerHTML=`<p class=\"hint\">🔒 ${T('Особисті рекорди за вагою та повтореннями доступні з Strenova Plus.','Personal records for weights and reps are available with Strenova Plus.')}</p><button type=\"button\" class=\"btn secondary\" id=\"gtPRPlusButton\">${T('Переглянути Plus','View Plus')}</button>`;host.querySelector('#gtPRPlusButton')?.addEventListener('click',()=>{window.showPage?.('subscription')});return;}
    const records=new Map();
    for(const w of list){for(const row of allSetRows(w,null)){if(row.weight<=0||row.reps<=0)continue;const prev=records.get(norm(row.name));if(!prev||row.weight>prev.weight||(row.weight===prev.weight&&row.reps>prev.reps))records.set(norm(row.name),{...row});}}
    const sorted=[...records.values()].sort((a,b)=>b.weight-a.weight||b.volume-a.volume).slice(0,20);
    host.innerHTML=sorted.length?sorted.map(r=>`<div class=\"pr-row\"><span>${esc(r.name)}<small style=\"display:block;color:var(--muted)\">${esc(r.date?new Date(r.date).toLocaleDateString(en()?'en-US':'uk-UA'):'—')}</small></span><b>${r.weight} кг × ${r.reps}</b></div>`).join(''):`<p class=\"hint\">${T('Поки немає зафіксованих особистих рекордів. Познач підхід як виконаний і введи вагу та повторення.','No recorded personal records yet. Mark a set complete and enter weight and reps.')}</p>`;
  }
  function renderAnalytics(){
    const select=$('gtExerciseProgressSelect'),detail=$('gtExerciseProgressDetail'),chart=$('gtVolumeChart');if(!select||!detail||!chart)return;
    const list=workouts().slice().sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    const names=[...new Set(list.flatMap(w=>(w.exercises||[]).map(e=>e.name).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,en()?'en':'uk'));
    const picked=select.value;select.innerHTML=`<option value="">${T('Обери вправу','Select exercise')}</option>`+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');if(names.includes(picked))select.value=picked;
    const selected=select.value;
    if(!selected){detail.innerHTML=`<p class="empty">${T('Обери вправу, щоб побачити історію ваги за датами. Дані з’являться після збереження результатів підходів.','Choose an exercise to view its recorded weight history. Data appears after set results are saved.')}</p>`;}
    else{
      const points=[];for(const w of list){const sets=allSetRows(w,selected);if(sets.length){points.push({date:w.date?new Date(w.date).toLocaleDateString(en()?'en-US':'uk-UA',{day:'numeric',month:'short'}):'—',weight:Math.max(...sets.map(s=>s.weight)),reps:sets.reduce((sum,s)=>sum+s.reps,0),volume:sets.reduce((sum,s)=>sum+s.volume,0),workout:w.name});}}
      if(!points.length)detail.innerHTML=`<p class="empty">${T('Для цієї вправи немає збережених ваги й повторень.','No saved weights and reps for this exercise yet.')}</p>`;
      else{
        const max=Math.max(1,...points.map(p=>p.weight));detail.innerHTML=`<div class="gt-progress-legend">${T('Найбільша вага в підході за тренування.','Heaviest set per workout.')} </div><div class="gt-progress-bars">${points.slice(-12).map(p=>`<div class="gt-progress-bar" title="${esc(p.workout)} · ${p.weight} kg"><span style="height:${Math.max(3,p.weight/max*100)}%"></span><small>${esc(p.date)}</small><small>${p.weight} kg</small></div>`).join('')}</div><div class="gt-progress-legend">${T('Останній запис','Latest')}: ${points[points.length-1].weight} кг · ${points[points.length-1].reps} ${T('повторень сумарно','total reps')} · ${Math.round(points[points.length-1].volume).toLocaleString()} kg·reps</div><div>${points.slice().reverse().slice(0,10).map(p=>`<div class="gt-history-row"><strong>${esc(p.date)} · ${p.weight} кг</strong><small>${esc(p.workout)} · ${p.reps} ${T('повт.','reps')} · ${Math.round(p.volume).toLocaleString()} kg·reps</small></div>`).join('')}</div>`;
      }
    }
    const volumes=list.map(w=>({w,label:w.date?new Date(w.date).toLocaleDateString(en()?'en-US':'uk-UA',{day:'numeric',month:'short'}):'—',value:(w.exercises||[]).reduce((sum,e)=>sum+allSetRows({exercises:[e]},null).reduce((a,s)=>a+s.volume,0),0)})).filter(x=>x.value>0);
    if(!volumes.length)chart.innerHTML=`<p class="empty">${T('Ще немає достатніх записів для графіка обсягу. Запиши вагу, повторення та познач виконані підходи.','Not enough recorded data for a volume chart yet. Log weights/reps and mark completed sets.')}</p>`;
    else{const max=Math.max(1,...volumes.map(x=>x.value));chart.innerHTML=`<div class="gt-progress-bars">${volumes.slice(-12).map(x=>`<div class="gt-progress-bar" title="${esc(x.w.name)} · ${Math.round(x.value)} kg·reps"><span style="height:${Math.max(3,x.value/max*100)}%"></span><small>${esc(x.label)}</small><small>${Math.round(x.value).toLocaleString()}</small></div>`).join('')}</div><p class="gt-progress-legend">${T('Обсяг = сума ваги × повторення для підходів, позначених виконаними або збережених у старому форматі.','Volume = sum of weight × reps for completed sets or saved legacy entries.')}</p>`;}
    renderLastWorkoutSummary(list);renderRealPersonalRecords(list);
  }
  function downloadFile(name, content, type){
    const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportWorkouts(format){
    const list=workouts();if(!list.length){alert(T('Поки немає тренувань для експорту.','There are no workouts to export yet.'));return;}
    if(format==='csv'){
      const rows=[["workout_name","date","minutes","exercise","set","weight_kg","reps","completed","exercise_note"]];
      for(const w of list){for(const e of w.exercises||[]){const sets=Array.isArray(e.setLogs)&&e.setLogs.length?e.setLogs:[{weight:e.weight||0,reps:e.reps||0,completed:e.completed}];sets.forEach((s,i)=>rows.push([w.name||'',w.date||'',w.minutes||'',e.name||'',i+1,Number(s.weight)||0,Number(s.reps)||0,Boolean(s.completed),e.notes||'']));}}
      const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');downloadFile(`gymcoach-workouts-${new Date().toISOString().slice(0,10)}.csv`,'\ufeff'+csv,'text/csv;charset=utf-8');
    }else downloadFile(`gymcoach-workouts-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({exportedAt:new Date().toISOString(),workouts:list},null,2),'application/json;charset=utf-8');
  }
  window.gtExportWorkouts=exportWorkouts;

  function forceItemsForStarter(){
    const old=window.gtStartWorkout||window.startWorkout;if(typeof old!=='function'||old.__gtForceItems)return;
    const wrapped=function(name,...args){const force=Array.isArray(window.GT_FORCE_SESSION_ITEMS)?window.GT_FORCE_SESSION_ITEMS:null;window.GT_FORCE_SESSION_ITEMS=null;const out=old.call(this,name,...args);if(force){try{currentWorkout=String(name||currentWorkout);currentExercises=force.map(x=>Array.isArray(x)?[String(x[0]),String(x[1]||'3 × 8–12')]:[String(x.name),String(x.prescription||'3 × 8–12')]);window.GT_FORCE_SESSION_ITEMS=force;}catch(_){}}return out;};wrapped.__gtForceItems=true;
    // Wrap the outer public entry once; the logger reads GT_FORCE_SESSION_ITEMS from getPlanItems below.
    window.gtStartWorkout=wrapped;window.startWorkout=wrapped;try{gtStartWorkout=wrapped;startWorkout=wrapped}catch(_){}
  }
  function setRepeatItemsHook(){
    // getPlanItems is scoped to the session logger. Patch the source through a small exposed override used before launch.
    if(window.GT_GET_PLAN_ITEMS_PATCHED)return;window.GT_GET_PLAN_ITEMS_PATCHED=true;
  }
  function repeatLastWorkout(){
    const last=workouts()[0];if(!last){alert(T('Ще немає тренувань для повторення. Спочатку заверши тренування.','No workout to repeat yet. Complete a workout first.'));return;}
    const items=(last.exercises||[]).map(e=>[e.name,e.prescription||'3 × 8–12']).filter(x=>x[0]);
    if(!items.length){alert(T('У попередньому тренуванні немає збереженого списку вправ.','The previous workout does not contain a saved exercise list.'));return;}
    startWorkoutFromItems(T('Повторення: ','Repeat: ')+(last.name||'Workout'),items,null);
  }
  function addHomeQuickActions(){
    const home=$('home');if(!home||$('gtQuickActionsV3'))return;const grid=home.querySelector('.grid');if(!grid)return;
    const card=document.createElement('div');card.id='gtQuickActionsV3';card.className='card';card.innerHTML=`<div class="section-head"><h3>${T('Швидкі дії','Quick actions')}</h3></div><div class="gt-inline-actions"><button class="btn secondary" id="gtRepeatLastWorkout">↻ ${T('Повторити останнє тренування','Repeat last workout')}</button><button class="btn secondary" id="gtExportJsonHome">${T('Експорт JSON','Export JSON')}</button><button class="btn secondary" id="gtExportCsvHome">${T('Експорт CSV','Export CSV')}</button></div><p class="hint" id="gtQuickActionHint">${workouts().length?T('Почни з попереднього списку вправ — нові результати записуватимуться окремо.','Start with your last exercise list; new results are logged separately.'):T('Після першого тренування тут з’явиться швидке повторення.','Repeat-workout shortcut appears after your first saved session.')}</p>`;
    grid.insertAdjacentElement('afterend',card);$('gtRepeatLastWorkout').addEventListener('click',repeatLastWorkout);$('gtExportJsonHome').addEventListener('click',()=>exportWorkouts('json'));$('gtExportCsvHome').addEventListener('click',()=>exportWorkouts('csv'));
  }

  function installReplacementHooks(){
    const oldSub=window.gtSubstitute;if(typeof oldSub==='function'&&!oldSub.__gtAdvancedReplace){const wrap=function(i,...args){window.GTActiveReplacementIndex=Number(i);const r=oldSub.call(this,i,...args);setTimeout(()=>{addReplaceFilters();filterReplaceDialog();},0);return r};wrap.__gtAdvancedReplace=true;window.gtSubstitute=wrap;try{gtSubstitute=wrap}catch(_){} }
    const dialog=$('gtExerciseReplaceDialog');if(dialog){addReplaceFilters();}
  }
  function installSessionObserver(){
    const root=$('exerciseList');if(root&&!root.dataset.gtCompleteV3){root.dataset.gtCompleteV3='1';
      const obs=new MutationObserver(()=>{renderSessionExtras()});obs.observe(root,{childList:true,subtree:true});
      root.addEventListener('input',()=>{showPending();syncDraftLater()});root.addEventListener('change',()=>{showPending();syncDraftLater()});
    }
  }
  function installDragReorder(){
    const root=$('exerciseList');if(!root)return;
    [...root.querySelectorAll('.gt-logged-exercise')].forEach(row=>{
      if(row.dataset.gtReorder==='1')return;row.dataset.gtReorder='1';row.draggable=true;
      const idx=Number(row.dataset.sessionIndex||0);const controls=document.createElement('div');controls.className='gt-rank-actions';controls.innerHTML=`<button type="button" data-move="-1" aria-label="${T('Перемістити вгору','Move up')}">↑</button><button type="button" data-move="1" aria-label="${T('Перемістити вниз','Move down')}">↓</button><span class="gt-drag-hint">${T('Перетягни або зміни порядок','Drag or reorder')}</span>`;
      row.querySelector('.session-main')?.prepend(controls);
      controls.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>moveExercise(Number(row.dataset.sessionIndex),Number(b.dataset.move))));
      row.addEventListener('dragstart',e=>{dragSourceIndex=Number(row.dataset.sessionIndex);e.dataTransfer?.setData('text/plain',String(dragSourceIndex));if(e.dataTransfer)e.dataTransfer.effectAllowed='move';});
      row.addEventListener('dragover',e=>{e.preventDefault();row.style.outline='2px dashed var(--lime)'});row.addEventListener('dragleave',()=>row.style.outline='');row.addEventListener('drop',e=>{e.preventDefault();row.style.outline='';const from=dragSourceIndex>=0?dragSourceIndex:Number(e.dataTransfer?.getData('text/plain'));moveExercise(from,Number(row.dataset.sessionIndex));dragSourceIndex=-1;});
    });
  }
  function reindexInlineHandlers(){
    const rows=[...document.querySelectorAll('#exerciseList .gt-logged-exercise')];rows.forEach((row,newIndex)=>{
      row.dataset.sessionIndex=String(newIndex);row.dataset.exercise=workoutData()[newIndex]?.name||'';
      row.querySelectorAll('[onchange],[onclick]').forEach(el=>['onchange','onclick'].forEach(attr=>{const val=el.getAttribute(attr);if(!val)return;let next=val.replace(/(gtWorkoutSetChange\()\d+/g,`$1${newIndex}`).replace(/(gtWorkoutSetCount\()\d+/g,`$1${newIndex}`).replace(/(gtToggleExerciseDone\()\d+/g,`$1${newIndex}`).replace(/(gtSubstitute\()\d+/g,`$1${newIndex}`).replace(/(gtToggleWorkoutSetCompleted\()\d+/g,`$1${newIndex}`);if(next!==val)el.setAttribute(attr,next)}));
      row.querySelectorAll('[data-gt-delete-set]').forEach((b,j)=>{const extras=b.closest('.gt-set-extra');const sr=extras?.previousElementSibling?.classList.contains('gt-copy-prev-set')?extras.previousElementSibling.previousElementSibling:extras?.previousElementSibling;const idx=[...row.querySelectorAll('.gt-set-row')].indexOf(sr);b.onclick=null;if(extras) b.addEventListener('click',()=>{});});
    });
  }
  function moveExercise(from,to){
    const data=workoutData();if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=data.length||to>=data.length||from===to)return;
    const rows=[...document.querySelectorAll('#exerciseList .gt-logged-exercise')];const row=rows[from];if(!row)return;
    const e=data.splice(from,1)[0];data.splice(to,0,e);
    try{const c=currentExercises.splice(from,1)[0];currentExercises.splice(to,0,c)}catch(_){}
    const target=rows[to];if(from<to)target.insertAdjacentElement('afterend',row);else target.insertAdjacentElement('beforebegin',row);
    // After reordering, rerender once so inline numeric handlers and labels match the new model order.
    const host=$('exerciseList');if(host){
      const snap=data.map(x=>({...x,setLogs:(x.setLogs||[]).map(s=>({...s}))}));
      host.querySelectorAll('.gt-logged-exercise').forEach((r,i)=>{r.dataset.sessionIndex=String(i);r.dataset.exercise=snap[i]?.name||'';});
      reindexInlineHandlers();renderSessionExtras();persistDraftNow();
    }
  }
  function wrapStartForTimer(){
    const names=['gtStartWorkout','startWorkout','gtStartHubDay','gtStartScheduledWorkout'];
    names.forEach(n=>{const old=window[n];if(typeof old!=='function'||old.__gtStartClock)return;const wrapped=function(...args){const was=$('session')?.classList.contains('active');const r=old.apply(this,args);if(!was){window.GTWorkoutStartedAt=Date.now();try{localStorage.setItem(key('session_started_at'),String(window.GTWorkoutStartedAt))}catch(_){} }setTimeout(()=>{installSessionObserver();renderSessionExtras();installDragReorder();},30);return r};wrapped.__gtStartClock=true;window[n]=wrapped;try{if(n==='gtStartWorkout')gtStartWorkout=wrapped;if(n==='startWorkout')startWorkout=wrapped;if(n==='gtStartHubDay')gtStartHubDay=wrapped;if(n==='gtStartScheduledWorkout')gtStartScheduledWorkout=wrapped}catch(_){} });
  }
  function wrapFinishWorkout(){
    const old=window.gtFinishWorkout;if(typeof old!=='function'||old.__gtDurationV3)return;
    const wrapped=async function(...args){
      const arr=workoutData();for(const e of arr){for(const s of e.setLogs||[])if(s.edited&&!Object.prototype.hasOwnProperty.call(s,'completed'))s.completed=true;}
      const start=Number(window.GTWorkoutStartedAt)||Number(localStorage.getItem(key('session_started_at')))||0;
      const out=await old.apply(this,args);
      try{const record=workouts()[0];if(record){if(start){const elapsed=Math.max(1,Math.round((Date.now()-start)/60000));record.minutes=elapsed;record.duration_minutes=elapsed;}const summary=workoutSummary(record);record.summary={durationMinutes:summary.minutes,completedExercises:summary.exercises,completedSets:summary.detailed?summary.sets:null,totalReps:summary.detailed?summary.reps:null,totalVolumeKgReps:summary.detailed?summary.volume:null,calculatedAt:new Date().toISOString()};writeJSON('gtai_history',workouts());if(db()&&userId()&&record.id){try{const patch={minutes:record.minutes};const {error}=await db().from('workout_logs').update(patch).eq('id',record.id).eq('user_id',userId());if(error)console.warn('Workout duration sync failed:',error.message)}catch(syncErr){console.warn('Workout duration sync failed:',syncErr?.message||syncErr)}}}}catch(e){console.warn('Could not update workout summary',e?.message||e)}
      window.GTWorkoutStartedAt=null;try{localStorage.removeItem(key('session_started_at'))}catch(_){};renderAnalytics();addHomeQuickActions();return out;
    };wrapped.__gtDurationV3=true;window.gtFinishWorkout=wrapped;window.finishWorkout=wrapped;try{gtFinishWorkout=wrapped;finishWorkout=wrapped}catch(_){}
  }
  function installAnalyticsWrapper(){
    ensureAnalytics();const old=window.gtRenderStats;if(typeof old==='function'&&!old.__gtAnalyticsV3){const wrapped=function(...args){const r=old.apply(this,args);ensureAnalytics();renderAnalytics();const chart=$('gtWeeklyChart');if(chart&&!workouts().length)chart.innerHTML=`<p class="empty">${T('Поки немає тренувань за цей період.','No workouts recorded for this period yet.')}</p>`;return r};wrapped.__gtAnalyticsV3=true;window.gtRenderStats=wrapped;try{gtRenderStats=wrapped}catch(_){} }
  }
  function ensureProfileSyncStatus(){
    const places=[['#setup button[onclick="saveProfile()"]','gtSetupProfileSyncStatus'],['#profile button[onclick="saveEditedProfile()"]','gtEditProfileSyncStatus']];
    for(const [selector,id] of places){const button=document.querySelector(selector);if(button&&!$(id)){const p=document.createElement('p');p.id=id;p.className='hint';p.setAttribute('role','status');p.textContent=T('Профіль зберігається локально; стан хмарної синхронізації буде показано після збереження.','Profile is saved locally; cloud sync status will be shown after saving.');button.insertAdjacentElement('afterend',p);}}
  }
  function profileSyncStatus(message,state=''){
    ensureProfileSyncStatus();for(const id of ['gtSetupProfileSyncStatus','gtEditProfileSyncStatus']){const el=$(id);if(el){el.textContent=message;el.dataset.state=state;el.style.color=state==='error'?'var(--danger)':state==='saved'?'var(--lime)':'var(--muted)';}}
  }
  async function persistProfileToCloud(p){
    const copy=(()=>{try{return JSON.parse(JSON.stringify(p))}catch(_){return p}})();const uid=userId(),sb=db();
    try{localStorage.setItem('gtai_profile',JSON.stringify(copy));if(uid)localStorage.setItem('gtai_profile_owner_user_id',uid)}catch(_){}
    if(!uid){profileSyncStatus(T('Профіль збережено на цьому пристрої. Увійди в акаунт, щоб синхронізувати його між пристроями.','Profile saved on this device. Sign in to sync it across devices.'),'local');return false;}
    const pending={profile:copy,updatedAt:new Date().toISOString()};writeJSON(key('pending_profile_sync'),pending);
    if(!sb||!navigator.onLine){profileSyncStatus(T('Профіль збережено локально. Синхронізація очікує з’єднання із Supabase.','Profile saved locally. Sync is waiting for a Supabase connection.'),'pending');return false;}
    profileSyncStatus(T('Синхронізація профілю…','Syncing profile…'),'pending');
    try{
      const {error}=await sb.from('user_profiles').upsert({user_id:uid,profile:copy,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(error)throw error;
      try{localStorage.removeItem(key('pending_profile_sync'))}catch(_){}
      profileSyncStatus(T('Профіль синхронізовано з акаунтом.','Profile synced to your account.'),'saved');return true;
    }catch(err){console.warn('Profile cloud sync failed; local copy retained:',err?.message||err);writeJSON(key('pending_profile_sync'),pending);profileSyncStatus(T('Профіль збережено локально, але хмарне збереження не підтверджено. Перевір user_profiles та RLS.','Profile saved locally, but cloud save was not confirmed. Check user_profiles and RLS.'),'error');return false;}
  }
  window.GTSyncProfileToCloud=persistProfileToCloud;
  function wrapProfileCloudSave(fnName){
    const original=window[fnName];if(typeof original!=='function'||original.__gtProfileCloudSync)return;
    const wrapped=function(...args){const before=(()=>{try{return JSON.stringify(profile??null)}catch(_){return ''}})();const result=original.apply(this,args);const after=(()=>{try{return JSON.stringify(profile??null)}catch(_){return ''}})();if(after&&after!=='null'&&after!==before){const copy=(()=>{try{return JSON.parse(after)}catch(_){return profile}})();try{localStorage.setItem('gtai_profile',JSON.stringify(copy))}catch(_){}void persistProfileToCloud(copy);}return result;};wrapped.__gtProfileCloudSync=true;window[fnName]=wrapped;try{if(fnName==='saveProfile')saveProfile=wrapped;if(fnName==='saveEditedProfile')saveEditedProfile=wrapped}catch(_){}
  }
  function wrapAfterLogin(){
    const old=window.gtAfterLogin;if(typeof old!=='function'||old.__gtMoreDataV3)return;const wrapped=async function(...args){const r=await old.apply(this,args);favoriteNames=new Set(readJSON(key('favorites'),[]));hydrateLocalCustomExercises();await loadTemplates();await syncLocalCustomExercises();await flushPendingWorkoutQueue();addCustomFieldsToExistingForm();installLibraryWrapper();if(typeof window.renderLibrary==='function')window.renderLibrary();return r;};wrapped.__gtMoreDataV3=true;window.gtAfterLogin=wrapped;try{gtAfterLogin=wrapped}catch(_){}
  }
  function addSessionStatusCard(){
    const controls=$('gtWorkoutDraftControls');if(controls&&!$('gtSaveStatusStrip'))showSaveStatus('saved',T('Автозбереження локальної чернетки активне','Local draft autosave is active'));
  }
  const pendingWorkoutKey = uid => `gtai_pending_workouts_v3:${uid}`;
  function makeClientRecordId(){
    try{if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID()}catch(_){}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)});
  }
  function writeHistoryCache(){try{localStorage.setItem('gtai_history',JSON.stringify(workouts()))}catch(_){} }
  function showWorkoutSyncStatus(message,state='saved'){
    const page=$('stats');if(page){let el=$('gtWorkoutSyncStatus');if(!el){el=document.createElement('p');el.id='gtWorkoutSyncStatus';el.className='hint card';el.setAttribute('role','status');const head=page.querySelector('.section-head');if(head)head.insertAdjacentElement('afterend',el);else page.prepend(el);}el.textContent=message;el.dataset.state=state;el.style.borderColor=state==='error'?'var(--danger)':state==='pending'?'#f59e0b':'var(--line)';}
    if($('gtWorkoutDraftControls'))showSaveStatus(state==='error'?'error':state==='pending'?'pending':'saved',message);
  }
  function getPendingWorkoutQueue(uid){const q=readJSON(pendingWorkoutKey(uid),[]);return Array.isArray(q)?q:[];}
  function storePendingWorkoutQueue(uid,queue){writeJSON(pendingWorkoutKey(uid),queue);}
  async function syncFinishedWorkoutReliably(item){
    const sb=db(),uid=userId();if(!item||!sb||!uid)return false;
    if(!item.clientRecordId)item.clientRecordId=makeClientRecordId();
    item.syncStatus='pending';writeHistoryCache();
    let queue=getPendingWorkoutQueue(uid);const index=queue.findIndex(x=>x.clientRecordId===item.clientRecordId);
    if(index>=0)queue[index]=item;else queue.push(item);storePendingWorkoutQueue(uid,queue);
    if(!navigator.onLine){showWorkoutSyncStatus(T('Тренування збережено локально й додано до черги синхронізації.','Workout saved locally and queued for sync.'),'pending');return false;}
    showWorkoutSyncStatus(T('Синхронізація тренування…','Syncing workout…'),'pending');
    try{
      // Do not send per-set values for FREE accounts. Supabase remains the authority for access.
      const row={user_id:uid,client_record_id:item.clientRecordId,title:String(item.name||T('Тренування','Workout')),completed_exercises:Number(item.done)||0,minutes:Number(item.minutes)||0,details:window.GT_PLUS_ACCESS===true?{exercises:item.exercises||[]}: {},created_at:item.date||new Date().toISOString()};
      const {data,error}=await sb.from('workout_logs').upsert(row,{onConflict:'user_id,client_record_id'}).select().single();
      if(error)throw error;
      item.id=data.id;item.syncStatus='synced';
      queue=getPendingWorkoutQueue(uid).filter(x=>x.clientRecordId!==item.clientRecordId);storePendingWorkoutQueue(uid,queue);
      let list=workouts();const existing=list.find(x=>x.clientRecordId===item.clientRecordId||String(x.id)===String(data.id));
      if(existing){Object.assign(existing,item)}else{list=[item,...list];try{history=list}catch(_){}}
      writeHistoryCache();showWorkoutSyncStatus(T('Тренування синхронізовано з акаунтом.','Workout synced to your account.'),'saved');
      return true;
    }catch(err){
      // Keep the outbox entry until an idempotent retry succeeds; don't drop the local record.
      storePendingWorkoutQueue(uid,getPendingWorkoutQueue(uid).map(x=>x.clientRecordId===item.clientRecordId?item:x));
      console.warn('Workout retained locally in sync outbox:',err?.message||err);
      showWorkoutSyncStatus(T('Тренування збережено локально, але хмару ще не підтверджено. Повторимо синхронізацію автоматично.','Workout saved locally; cloud confirmation is pending. Sync will retry automatically.'),'error');
      return false;
    }
  }
  async function flushPendingWorkoutQueue(){
    const uid=userId();if(!uid||!db()||!navigator.onLine)return;
    const queue=getPendingWorkoutQueue(uid);for(const item of queue){const ok=await syncFinishedWorkoutReliably(item);if(!ok)break;}
  }
  function wrapWorkoutSyncOutbox(){
    const current=window.gtSyncWorkout;if(typeof current!=='function'||current.__gtOutboxV3)return;
    const wrapped=async function(item){return syncFinishedWorkoutReliably(item)};wrapped.__gtOutboxV3=true;window.gtSyncWorkout=wrapped;try{gtSyncWorkout=wrapped}catch(_){}
  }
  function wrapCompleteLanguageToggle(){
    const original=window.toggleLang;
    if(typeof original!=='function'||original.__gtCompleteLanguageFields)return;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      // The legacy bilingual hook rebuilds the custom-exercise form. Reattach
      // the added fields and submit guard only after that rebuild has finished.
      setTimeout(()=>{addCustomFieldsToExistingForm();addReplaceFilters();addLibraryTools();installLibraryWrapper();decorateLibrary();},80);
      return result;
    };
    wrapped.__gtCompleteLanguageFields=true;
    window.toggleLang=wrapped;try{toggleLang=wrapped}catch(_){}
  }
  function init(){
    addCustomFieldsToExistingForm();addReplaceFilters();addLibraryTools();installLibraryWrapper();addHomeQuickActions();ensureTemplatePanel();loadTemplates();ensureAnalytics();installAnalyticsWrapper();installReplacementHooks();installSessionObserver();wrapStartForTimer();wrapFinishWorkout();wrapWorkoutSyncOutbox();wrapAfterLogin();wrapProfileCloudSave('saveProfile');wrapProfileCloudSave('saveEditedProfile');wrapCompleteLanguageToggle();ensureProfileSyncStatus();addSessionStatusCard();
    const origShow=window.showPage;if(typeof origShow==='function'&&!origShow.__gtCompleteV3){const wrapped=function(id,...args){const r=origShow.call(this,id,...args);setTimeout(()=>{if(id==='session'){installSessionObserver();renderSessionExtras();installDragReorder();}if(id==='stats'){installAnalyticsWrapper();renderAnalytics();}if(id==='library'){addLibraryTools();decorateLibrary();}},50);return r};wrapped.__gtCompleteV3=true;window.showPage=wrapped;try{showPage=wrapped}catch(_){} }
    document.addEventListener('input',e=>{if(e.target.closest?.('#exerciseList')){showPending();syncDraftLater();}});
    window.addEventListener('online',()=>{const snap=readJSON(`gtai_workout_draft_v2:${accountKey()}`,null);if(snap)syncDraftSafely(snap);const pendingProfile=readJSON(key('pending_profile_sync'),null);if(pendingProfile?.profile)persistProfileToCloud(pendingProfile.profile);loadTemplates();syncLocalCustomExercises();flushPendingWorkoutQueue();});
    window.addEventListener('focus',()=>{favoriteNames=new Set(readJSON(key('favorites'),[]));setTimeout(()=>{decorateLibrary();renderTemplates();},50)});
    try{if($('session')?.classList.contains('active')){window.GTWorkoutStartedAt=Number(localStorage.getItem(key('session_started_at')))||Date.now();installDragReorder();renderSessionExtras();}}catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
