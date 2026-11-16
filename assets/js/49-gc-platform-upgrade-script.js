(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sb=()=>{try{return typeof gtSupabase!=='undefined'?gtSupabase:null}catch(_){return null}};
 const user=()=>{try{return typeof gtUser!=='undefined'?gtUser:null}catch(_){return null}};
 const main=()=>document.querySelector('main');
 const query=new URLSearchParams(location.search);
 window.gcSignupRole=window.gcSignupRole||'athlete';
 window.gcCurrentRole='athlete';
 window.gcCurrentCoach=null;
 window.gcCurrentWorkout=null;
 window.gcCurrentWorkoutName='GymCoach workout';
 window.gcSelectedAthlete=null;
 function status(id,msg){const e=$(id);if(e)e.textContent=msg||''}
 function pendingInvite(){return (query.get('invite')||user()?.user_metadata?.coach_invite_code||'').trim().toUpperCase()}
 function pendingReferral(){return (query.get('ref')||'').trim().toUpperCase()}
 function seedAuthQueryFields(){
  if($('gcCoachInvite')&&pendingInvite())$('gcCoachInvite').value=pendingInvite();
  if($('gcReferralCode')&&pendingReferral())$('gcReferralCode').value=pendingReferral();
 }
 function navButton(id,label,action){
  const nav=$('nav');if(!nav||nav.querySelector('[data-page="'+id+'"]'))return;
  const b=document.createElement('button');b.type='button';b.dataset.page=id;
  b.innerHTML='<span>✦</span><i>'+safe(label)+'</i>';b.addEventListener('click',action);nav.appendChild(b);
 }
 function mountSection(id,title,description){
  const m=main();if(!m||$(id))return $(id);
  const sec=document.createElement('section');sec.className='page';sec.id=id;
  sec.innerHTML='<div class="section-head"><h2>'+safe(title)+'</h2></div><p class="muted">'+safe(description||'')+'</p><div id="'+id+'Content"></div>';
  const footer=m.querySelector('.footer');m.insertBefore(sec,footer||null);return sec;
 }
 function mountPages(){
  mountSection('coach-dashboard','Мої спортсмени','Запрошуй учнів, переглядай прогрес і призначай програми.');
  mountSection('coach-connect','Мій тренер','Введи код тренера та підтверди підключення. Прив’язка відбудеться лише після твоєї дії.');
  mountSection('admin-dashboard','Адмін-панель','Керування користувачами та підписками з перевіркою прав на сервері.');
  const recommend=$('recommend');
  if(recommend&&!$('gcWorkoutBuilder')){
   const box=document.createElement('div');box.className='gc-platform-card';box.id='gcWorkoutBuilder';
   box.innerHTML='<div class="section-head"><div><span class="tag">WORKOUT BUILDER</span><h2>Конструктор тренувань</h2></div></div><div class="gc-workout-controls"><div class="field"><label for="gcWorkoutCategory">Категорія</label><select id="gcWorkoutCategory"></select></div><div class="field"><label for="gcWorkoutVariation">Варіація</label><select id="gcWorkoutVariation"><option value="0">Базова</option><option value="1">Альтернативна</option><option value="2">Різноманітна</option></select></div><div class="field"><label for="gcWorkoutCount">Кількість вправ</label><select id="gcWorkoutCount"><option>2</option><option selected>3</option><option>4</option></select></div></div><div class="gc-platform-actions"><button class="btn" type="button" onclick="gcGenerateWorkout()">Створити тренування</button><button class="btn secondary" type="button" onclick="gcSaveFavoriteWorkout()">Зберегти улюблене</button></div><div id="gcWorkoutGenerated" class="gc-platform-list"></div><div id="gcWorkoutStatus" class="gc-platform-status" role="status"></div>';
   recommend.insertBefore(box,recommend.firstChild);
  }
 }
 const BANK={
  'Upper Body':[['Віджимання від опори','Груди, плечі, трицепс'],['Тяга еластичної стрічки','Спина, біцепс'],['Жим гантелей сидячи з легким опором','Плечі'],['Тяга гантелі з опорою','Спина'],['Віджимання від стіни','Груди, трицепс'],['Зведення лопаток стоячи','Верх спини'],['Згинання рук з легким опором','Біцепс'],['Розгинання рук зі стрічкою','Трицепс']],
  'Lower Body':[['Присідання до лави','Стегна, сідниці'],['Сідничний місток','Сідниці'],['Кроки на невисоку платформу','Стегна'],['Підйоми на носки','Литки'],['Випади назад з опорою','Стегна, сідниці'],['Відведення ноги стоячи','Сідниці'],['Нахил таза назад без ваги','Задня поверхня стегна'],['Марш на місці','Ноги, серцево-судинна система']],
  'Push':[['Віджимання від стіни','Груди, трицепс'],['Жим гантелей лежачи на підлозі з легким опором','Груди'],['Жим гантелей сидячи з легким опором','Плечі'],['Розгинання рук зі стрічкою','Трицепс'],['Віджимання від високої опори','Груди, трицепс'],['Підйом рук у сторони без важких обтяжень','Плечі']],
  'Pull':[['Тяга стрічки до корпуса','Спина'],['Тяга гантелі з опорою','Спина'],['Зведення лопаток','Верх спини'],['Згинання рук з легким опором','Біцепс'],['Розведення рук зі стрічкою','Задні дельти'],['Підйом рук у формі літери W','Верх спини']],
  'Legs':[['Присідання до лави','Квадрицепси, сідниці'],['Сідничний місток','Сідниці'],['Кроки на платформу','Ноги'],['Підйоми на носки','Литки'],['Випади назад з опорою','Ноги'],['Відведення стегна лежачи на боці','Сідниці']],
  'Full Body':[['Присідання до лави','Ноги'],['Віджимання від опори','Груди, руки'],['Тяга стрічки до корпуса','Спина'],['Bird-dog','Корпус'],['Марш на місці','Кардіо'],['Сідничний місток','Сідниці']],
  'Chest':[['Віджимання від стіни','Груди'],['Віджимання від високої опори','Груди, трицепс'],['Жим гантелей лежачи на підлозі з легким опором','Груди'],['Зведення долонь перед грудьми','Груди'],['Віджимання від опори на колінах за комфортної техніки','Груди']],
  'Back':[['Тяга стрічки до корпуса','Спина'],['Тяга гантелі з опорою','Спина'],['Зведення лопаток','Верх спини'],['Bird-dog','М’язи спини, корпус'],['Розведення рук зі стрічкою','Верх спини'],['Підйом рук у формі W','Верх спини']],
  'Shoulders':[['Колові рухи плечима','Плечовий пояс'],['Жим гантелей сидячи з легким опором','Плечі'],['Підйом рук у сторони без важких обтяжень','Середні дельти'],['Підйом рук перед собою без важких обтяжень','Передні дельти'],['Зведення лопаток','Верх спини']],
  'Arms':[['Згинання рук з легким опором','Біцепс'],['Розгинання рук зі стрічкою','Трицепс'],['Згинання рук нейтральним хватом','Передпліччя, біцепс'],['Розгинання рук з легкою стрічкою над головою','Трицепс'],['Стискання м’якого м’яча','Передпліччя']],
  'Core':[['Dead bug','Корпус'],['Bird-dog','Корпус'],['Бічна планка з колін','Косі м’язи живота'],['Планка від високої опори','Корпус'],['Підкручування таза лежачи','Корпус'],['Дихання з напруженням корпусу','Корпус']],
  'Cardio':[['Ходьба в комфортному темпі','Серцево-судинна система'],['Марш на місці','Серцево-судинна система'],['Кроки вбік','Серцево-судинна система'],['Низькоударні кроки на платформу','Серцево-судинна система'],['Легкі рухи руками й ногами стоячи','Загальна витривалість'],['Танцювальні кроки','Серцево-судинна система']]
 };
 const categories=Object.keys(BANK);
 function initWorkoutControls(){
  const select=$('gcWorkoutCategory');if(!select)return;
  select.innerHTML=categories.map(c=>'<option>'+safe(c)+'</option>').join('');
  gcGenerateWorkout();
 }
 function exercisePrescription(category,index){
  const cardio=category==='Cardio';
  const core=category==='Core';
  return {sets:2,reps:cardio?'30–45 секунд':core?'15–25 секунд':'8–12 повторень',rest:60};
 }
 window.gcGenerateWorkout=function(){
  const category=$('gcWorkoutCategory')?.value||'Full Body';
  const variation=Number($('gcWorkoutVariation')?.value||0);
  const count=Number($('gcWorkoutCount')?.value||3);
  const pool=BANK[category]||BANK['Full Body'];
  const shift=variation*2;
  const arranged=pool.slice(shift).concat(pool.slice(0,shift));
  const chosen=arranged.slice(0,Math.max(2,Math.min(4,count)));
  window.gcCurrentWorkoutName=category+' — '+['Базова','Альтернативна','Різноманітна'][variation];
  window.gcCurrentWorkout=chosen.map((x,i)=>({name:x[0],muscles:x[1],...exercisePrescription(category,i)}));
  renderGeneratedWorkout();
  status('gcWorkoutStatus','Враховано помірний стартовий обсяг. Обирай комфортний варіант і зупиняйся при болю.');
 };
 function renderGeneratedWorkout(){
  const root=$('gcWorkoutGenerated');if(!root)return;
  root.innerHTML=(window.gcCurrentWorkout||[]).map((x,i)=>'<div class="gc-workout-exercise"><div class="gc-platform-row"><strong>'+safe(i+1+'. '+x.name)+'</strong><button class="btn secondary" type="button" onclick="gcReplaceExercise('+i+')">Замінити</button></div><small>М’язи: '+safe(x.muscles)+' · '+x.sets+' підходи · '+safe(x.reps)+' · відпочинок '+x.rest+' с</small></div>').join('');
 }
 window.gcReplaceExercise=function(index){
  const category=$('gcWorkoutCategory')?.value||'Full Body',pool=BANK[category]||BANK['Full Body'];
  const current=window.gcCurrentWorkout?.[index];if(!current)return;
  const candidates=pool.filter(x=>x[0]!==current.name);const replacement=candidates[Math.floor(Math.random()*candidates.length)]||pool[0];
  window.gcCurrentWorkout[index]={...current,name:replacement[0],muscles:replacement[1]};
  renderGeneratedWorkout();
 };
 window.gcSaveFavoriteWorkout=async function(){
  const s=sb(),u=user(),items=window.gcCurrentWorkout||[];
  if(!s||!u){status('gcWorkoutStatus','Увійди, щоб зберегти улюблену програму.');return}
  if(items.length<2){status('gcWorkoutStatus','Спочатку створи програму.');return}
  const name=window.gcCurrentWorkoutName||'GymCoach workout';
  const {error}=await s.from('workout_templates').upsert({user_id:u.id,name,details:{category:$('gcWorkoutCategory')?.value,variation:$('gcWorkoutVariation')?.value,exercises:items}},{onConflict:'user_id,name'});
  status('gcWorkoutStatus',error?'Не вдалося зберегти: '+error.message:'Тренування додано до улюблених.');
 };
 function renderNavRole(){
  if(window.gcCurrentRole==='coach')navButton('coach-dashboard','Мої спортсмени',()=>window.showPage('coach-dashboard'));
  else if(window.gcCurrentRole==='admin')navButton('admin-dashboard','Адмін',()=>window.showPage('admin-dashboard'));
  else navButton('coach-connect','Мій тренер',()=>window.showPage('coach-connect'));
  const nav=$('nav');if(nav)nav.querySelectorAll('[data-page]').forEach(b=>{b.style.minWidth='0';b.style.flex='1 1 0'});
 }
 async function loadReferralCard(u){
  const s=sb();if(!s||!u)return;
  let code=null,count=0;
  const [c,e]=await Promise.all([
   s.from('referral_codes').select('code').eq('user_id',u.id).maybeSingle(),
   s.from('referral_events').select('id',{count:'exact',head:true}).eq('referrer_id',u.id)
  ]);
  if(!c.error)code=c.data?.code||null;
  if(!e.error)count=e.count||0;
  const root=$('profile');if(!root)return;
  let box=$('gcReferralCard');if(!box){box=document.createElement('div');box.className='gc-platform-card';box.id='gcReferralCard';root.appendChild(box)}
  const link=new URL(location.href);link.searchParams.set('ref',code||'');
  box.innerHTML='<h3>Моє реферальне посилання</h3><p class="muted">Код для запрошення друзів та відстеження реєстрацій.</p><div class="gc-platform-item"><div><strong>'+safe(code||'Готується')+'</strong><small>Успішні реєстрації: '+count+'</small></div><button class="btn secondary" type="button" onclick="gcCopyText('+JSON.stringify(link.toString()).replaceAll(String.fromCharCode(34),"&quot;")+')">Скопіювати</button></div>';
 }
 window.gcCopyText=async function(text){
  try{await navigator.clipboard.writeText(text);alert('Скопійовано.')}
  catch(_){const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();alert('Скопійовано.')}
 };
 async function loadAthleteDashboard(u){
  const root=$('coach-connectContent');if(!root)return;
  const code=pendingInvite()||u.user_metadata?.coach_invite_code||'';
  const s=sb();
  let rel=null;
  if(s){const q=await s.from('athlete_coach_relationships').select('id,coach_id,status,created_at').eq('athlete_id',u.id).eq('status','active').maybeSingle();if(!q.error)rel=q.data}
  let coachName='';
  if(rel&&s){const p=await s.from('user_profiles').select('profile').eq('user_id',rel.coach_id).maybeSingle();coachName=p.data?.profile?.name||'Тренер'}
  root.innerHTML='<div class="gc-platform-card"><h3>Підключення до тренера</h3>'+(rel?'<p>Ти підключений до: <strong>'+safe(coachName)+'</strong></p><button class="btn secondary" type="button" onclick="gcDisconnectCoach('+JSON.stringify(rel.id).replaceAll(String.fromCharCode(34),"&quot;")+')">Від’єднати тренера</button>':'<p class="muted">Ще немає підтвердженого підключення.</p>')+'<div class="field"><label for="gcAcceptCoachCode">Код тренера</label><input id="gcAcceptCoachCode" value="'+safe(code)+'" maxlength="32" placeholder="COACH-XXXXXX"/></div><button class="btn" type="button" onclick="gcAcceptCoachInvite()">Підтвердити запрошення</button><p id="gcConnectStatus" class="gc-platform-status" role="status"></p></div>';
  await loadAssignedWorkouts(u);
 }
 window.gcAcceptCoachInvite=async function(){
  const s=sb(),code=$('gcAcceptCoachCode')?.value.trim().toUpperCase();
  if(!s||!code){status('gcConnectStatus','Вкажи код тренера.');return}
  const {data,error}=await s.rpc('accept_coach_invite',{p_invite_code:code});
  status('gcConnectStatus',error?'Не вдалося підключитися: '+error.message:'Запрошення підтверджено. Тепер тренер бачить твій прогрес.');
  if(!error){query.delete('invite');window.history.replaceState({},'',location.pathname+(query.toString()?'?'+query.toString():'')+location.hash);await loadAthleteDashboard(user())}
 };
 window.gcDisconnectCoach=async function(id){
  if(!confirm('Від’єднати тренера від акаунта?'))return;
  const s=sb();if(!s)return;const {error}=await s.rpc('disconnect_coach_relationship',{p_relationship_id:id});
  if(error)alert('Не вдалося від’єднати: '+error.message);else await loadAthleteDashboard(user());
 };
 async function loadAssignedWorkouts(u){
  const s=sb(),root=$('coach-connectContent');if(!s||!root)return;
  const {data,error}=await s.from('assigned_workouts').select('id,program_id,coach_id,status,due_date,assigned_at').eq('athlete_user_id',u.id).neq('status','cancelled').order('assigned_at',{ascending:false}).limit(50);
  if(error)return;
  let programs=[];
  if(data?.length){const ids=[...new Set(data.map(x=>x.program_id))];const p=await s.from('workout_programs').select('id,name,category,exercises').in('id',ids);if(!p.error)programs=p.data||[]}
  const map=new Map(programs.map(p=>[p.id,p]));
  const wrap=document.createElement('div');wrap.className='gc-platform-card';wrap.innerHTML='<h3>Призначені тренування</h3>'+(data?.length?data.map(x=>{const p=map.get(x.program_id);return '<div class="gc-platform-item"><div><strong>'+safe(p?.name||'Тренувальна програма')+'</strong><small>'+safe(p?.category||'')+' · '+safe(x.status)+'</small></div><span>'+safe(x.due_date||'Без терміну')+'</span></div>'}).join(''):'<p class="muted">Поки немає призначених програм.</p>');
  root.appendChild(wrap);
 }
 async function loadCoachDashboard(u){
  const s=sb(),root=$('coach-dashboardContent');if(!s||!root)return;
  root.innerHTML='<p class="muted">Завантажуємо спортсменів…</p>';
  const [cp,inv,rels]=await Promise.all([
   s.from('coach_profiles').select('coach_code,specialization,experience_years,bio').eq('user_id',u.id).maybeSingle(),
   s.from('coach_invites').select('invite_code').eq('coach_id',u.id).eq('is_active',true).limit(1).maybeSingle(),
   s.from('athlete_coach_relationships').select('id,athlete_id,status,created_at').eq('coach_id',u.id).eq('status','active').order('created_at',{ascending:false})
  ]);
  if(cp.error||rels.error){root.innerHTML='<p class="gc-platform-status">Помилка завантаження: '+safe(cp.error?.message||rels.error?.message)+'</p>';return}
  window.gcCurrentCoach=cp.data;
  const code=inv.data?.invite_code||cp.data?.coach_code||'';
  const link=new URL(location.href);link.searchParams.set('invite',code);
  const ids=(rels.data||[]).map(x=>x.athlete_id);
  let profiles=[],logs=[];
  if(ids.length){
   const [pr,lg]=await Promise.all([
    s.from('user_profiles').select('user_id,profile').in('user_id',ids),
    s.from('workout_logs').select('id,user_id,title,created_at,completed_exercises').in('user_id',ids).order('created_at',{ascending:false}).limit(250)
   ]);
   profiles=pr.data||[];logs=lg.data||[];
  }
  const [programRows,assignedRows]=await Promise.all([
   s.from('workout_programs').select('id,name,category,updated_at').eq('coach_id',u.id).order('updated_at',{ascending:false}).limit(100),
   s.from('assigned_workouts').select('id,program_id,athlete_user_id,status,due_date').eq('coach_id',u.id).neq('status','cancelled').order('assigned_at',{ascending:false}).limit(100)
  ]);
  const programs=programRows.error?[]:(programRows.data||[]);
  const assignments=assignedRows.error?[]:(assignedRows.data||[]);
  const programMap=new Map(programs.map(p=>[p.id,p]));
  const pmap=new Map(profiles.map(x=>[x.user_id,x.profile||{}]));
  const lmap=new Map();logs.forEach(x=>lmap.set(x.user_id,(lmap.get(x.user_id)||0)+1));
  root.innerHTML=`
   <div class="gc-platform-card">
    <div class="gc-platform-row"><div><span class="tag">COACH INVITE</span><h3>${safe(code)}</h3><small class="muted">${safe(cp.data?.specialization||'')} · ${safe(cp.data?.experience_years||0)} років досвіду</small></div><button class="btn secondary" type="button" onclick="gcCopyText(${JSON.stringify(link.toString()).replaceAll(String.fromCharCode(34),'&quot;')})">Скопіювати посилання</button></div>
   </div>
   <div class="gc-platform-grid">
    <div class="gc-platform-stat"><strong>${(rels.data||[]).length}</strong><small>Активних спортсменів</small></div>
    <div class="gc-platform-stat"><strong>${logs.length}</strong><small>Тренувальних записів</small></div>
    <div class="gc-platform-stat"><strong>${programs.length}</strong><small>Мої програми</small></div>
   </div>
   <div class="gc-platform-card"><h3>Мої спортсмени</h3><div class="gc-platform-list">
    ${ids.length?(rels.data||[]).map(x=>{const p=pmap.get(x.athlete_id)||{};return '<div class="gc-platform-item"><div><strong>'+safe(p.name||'Спортсмен')+'</strong><small>'+safe(p.sport||'')+' · '+(lmap.get(x.athlete_id)||0)+' тренувань у вибірці</small></div><button class="btn secondary" type="button" onclick="gcSelectAthlete(\''+safe(x.athlete_id)+'\')">Обрати</button></div>'}).join(''):'<p class="muted">Поки немає підключених спортсменів. Поділися кодом або посиланням.</p>'}
   </div></div>
   <div class="gc-platform-card"><h3>Призначити програму</h3><p class="muted">Створи тренування в конструкторі, обери підключеного спортсмена та признач програму.</p>
    <div class="field"><label for="gcAssignAthlete">Спортсмен</label><select id="gcAssignAthlete">${(rels.data||[]).map(x=>'<option value="'+safe(x.athlete_id)+'">'+safe(pmap.get(x.athlete_id)?.name||x.athlete_id.slice(0,8))+'</option>').join('')}</select></div>
    <div class="field"><label for="gcProgramName">Назва програми</label><input id="gcProgramName" maxlength="120" value="${safe(window.gcCurrentWorkoutName||'GymCoach workout')}"/></div>
    <button class="btn" type="button" onclick="gcAssignCurrentWorkout()">Зберегти та призначити</button><p id="gcAssignStatus" class="gc-platform-status" role="status"></p>
   </div>
   <div class="gc-platform-card"><h3>Мої програми</h3><div class="gc-platform-list">
    ${programs.length?programs.map(p=>'<div class="gc-platform-item"><div><strong>'+safe(p.name)+'</strong><small>'+safe(p.category)+' · оновлено '+safe(new Date(p.updated_at).toLocaleDateString('uk-UA'))+'</small></div><div class="gc-platform-actions"><button class="btn secondary" type="button" onclick="gcCoachRenameProgram(\''+safe(p.id)+'\')">Перейменувати</button><button class="btn secondary" type="button" onclick="gcCoachDeleteProgram(\''+safe(p.id)+'\')">Видалити</button></div></div>').join(''):'<p class="muted">Збережених програм ще немає.</p>'}
   </div></div>
   <div class="gc-platform-card"><h3>Призначені програми</h3><div class="gc-platform-list">
    ${assignments.length?assignments.map(a=>'<div class="gc-platform-item"><div><strong>'+safe(programMap.get(a.program_id)?.name||'Програма')+'</strong><small>'+safe(pmap.get(a.athlete_user_id)?.name||'Спортсмен')+' · '+safe(a.status)+'</small></div><button class="btn secondary" type="button" onclick="gcCoachCancelAssignment(\''+safe(a.id)+'\')">Прибрати</button></div>').join(''):'<p class="muted">Активних призначень ще немає.</p>'}
   </div></div>`;

 }

 window.gcCoachRenameProgram=async function(id){
  const s=sb(),u=user();if(!s||!u)return;
  const current=prompt('Нова назва програми:');const name=String(current||'').trim().slice(0,120);if(!name)return;
  const {error}=await s.from('workout_programs').update({name,updated_at:new Date().toISOString()}).eq('id',id).eq('coach_id',u.id);
  if(error){alert('Не вдалося оновити програму: '+error.message);return}
  await loadCoachDashboard(u);
 };
 window.gcCoachDeleteProgram=async function(id){
  const s=sb(),u=user();if(!s||!u)return;
  if(!confirm('Видалити програму та її призначення спортсменам?'))return;
  const {error}=await s.from('workout_programs').delete().eq('id',id).eq('coach_id',u.id);
  if(error){alert('Не вдалося видалити програму: '+error.message);return}
  await loadCoachDashboard(u);
 };
 window.gcCoachCancelAssignment=async function(id){
  const s=sb(),u=user();if(!s||!u)return;
  if(!confirm('Прибрати призначення цієї програми?'))return;
  const {error}=await s.from('assigned_workouts').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',id).eq('coach_id',u.id);
  if(error){alert('Не вдалося змінити призначення: '+error.message);return}
  await loadCoachDashboard(u);
 };
 window.gcSelectAthlete=function(id){window.gcSelectedAthlete=id;const s=$('gcAssignAthlete');if(s)s.value=id;alert('Спортсмен обраний.');};
 window.gcAssignCurrentWorkout=async function(){
  const s=sb(),u=user(),athlete=$('gcAssignAthlete')?.value,items=window.gcCurrentWorkout||[];
  if(!s||!u||!athlete||items.length<2){status('gcAssignStatus','Обери спортсмена та створи програму з 2–4 вправ.');return}
  const category=$('gcWorkoutCategory')?.value||'Full Body';
  const name=$('gcProgramName')?.value.trim()||window.gcCurrentWorkoutName;
  const difficulty=profile?.level||'beginner';
  const {data:program,error}=await s.from('workout_programs').insert({coach_id:u.id,name,category,variation:window.gcCurrentWorkoutName,difficulty: ['beginner','some','experienced'].includes(difficulty)?difficulty:'beginner',exercise_count:items.length,exercises:items}).select('id').single();
  if(error){status('gcAssignStatus','Не вдалося зберегти програму: '+error.message);return}
  const assigned=await s.from('assigned_workouts').insert({program_id:program.id,coach_id:u.id,athlete_user_id:athlete});
  status('gcAssignStatus',assigned.error?'Програму збережено, але не вдалося призначити: '+assigned.error.message:'Програму успішно призначено спортсмену.');
 };
 async function loadAdminDashboard(){
  const root=$('admin-dashboardContent'),s=sb();if(!root||!s)return;
  root.innerHTML='<div class="gc-platform-card"><div class="gc-platform-row"><h3>Статистика сайту</h3><button class="btn secondary" type="button" onclick="gcAdminLoadStats()">Оновити</button></div><div id="gcAdminStats" class="gc-platform-grid"></div></div><div class="gc-platform-card"><h3>Користувачі</h3><div class="field"><label for="gcAdminSearch">Пошук за ім’ям або email</label><input id="gcAdminSearch" placeholder="Введи ім’я або email"/></div><div class="gc-platform-grid"><div class="field"><label for="gcAdminRoleFilter">Тип акаунта</label><select id="gcAdminRoleFilter"><option value="all">Усі</option><option value="athlete">Athlete</option><option value="coach">Coach</option><option value="admin">Admin</option></select></div><div class="field"><label for="gcAdminSubFilter">Підписка</label><select id="gcAdminSubFilter"><option value="all">Усі статуси</option><option value="active">Активна</option><option value="inactive">Без Plus</option><option value="cancelled">Скасована</option><option value="expired">Завершена</option></select></div></div><button class="btn" type="button" onclick="gcAdminSearchUsers()">Знайти</button><div id="gcAdminUsers" class="gc-platform-list"></div><div id="gcAdminStatus" class="gc-platform-status" role="status"></div><div class="gc-platform-card"><h3>Керування Plus</h3><p id="gcAdminSelected" class="muted">Спочатку обери користувача зі списку.</p><div class="field"><label for="gcPlusDuration">Термін</label><select id="gcPlusDuration"><option value="7">7 днів</option><option value="30" selected>30 днів</option><option value="90">90 днів</option><option value="180">180 днів</option><option value="365">365 днів</option><option value="0">Назавжди</option></select></div><div class="field"><label for="gcPlusReason">Причина (необов’язково)</label><input id="gcPlusReason" maxlength="500" placeholder="Подарунок, підтримка…"/></div><div class="gc-platform-actions"><button class="btn" type="button" onclick="gcAdminGrantPlus()">Видати / продовжити Plus</button><button class="btn secondary" type="button" onclick="gcAdminCancelPlus()">Скасувати Plus</button></div></div></div>';
  await window.gcAdminLoadStats();
 }
 window.gcAdminLoadStats=async function(){
  const s=sb();if(!s)return;
  const {data,error}=await s.rpc('admin_dashboard_stats');
  if(error){status('gcAdminStats','Недоступно: '+error.message);return}
  const labels=[['users_total','Усього користувачів'],['athletes','Спортсменів'],['coaches','Тренерів'],['plus_active','Активний Plus'],['referrals','Рефералів'],['signups_7d','Реєстрацій за 7 днів']];
  const root=$('gcAdminStats');if(root)root.innerHTML=labels.map(([k,l])=>'<div class="gc-platform-stat"><strong>'+safe(data[k]||0)+'</strong><small>'+safe(l)+'</small></div>').join('');
 };
 window.gcAdminSearchUsers=async function(){
  const s=sb(),q=$('gcAdminSearch')?.value.trim()||'';if(!s)return;
  status('gcAdminStatus','Шукаємо…');
  const {data,error}=await s.rpc('admin_search_users',{p_search:q});
  if(error){status('gcAdminStatus','Помилка: '+error.message);return}
  const roleFilter=$('gcAdminRoleFilter')?.value||'all',subFilter=$('gcAdminSubFilter')?.value||'all';
  const filtered=(data||[]).filter(x=>(roleFilter==='all'||x.account_role===roleFilter)&&(subFilter==='all'||x.subscription_status===subFilter));
  const root=$('gcAdminUsers');
  if(root)root.innerHTML=filtered.map(x=>'<div class="gc-platform-item"><div><strong>'+safe(x.display_name||'Користувач')+'</strong><small>'+safe(x.email)+' · '+safe(x.account_role)+' · Plus: '+safe(x.subscription_status)+' · Реєстрація: '+safe(new Date(x.created_at).toLocaleDateString('uk-UA'))+'</small></div><button class="btn secondary" type="button" onclick="gcAdminSelectUser('+JSON.stringify(x.user_id).replaceAll(String.fromCharCode(34),'&quot;')+','+JSON.stringify(x.email||'').replaceAll(String.fromCharCode(34),'&quot;')+')">Обрати</button></div>').join('')||'<p class="muted">Нікого не знайдено за цими фільтрами.</p>';
  status('gcAdminStatus','Знайдено: '+filtered.length);
 };
 window.gcAdminSelectUser=function(id,email){window.gcAdminTarget=id;status('gcAdminSelected',email+' · '+id)};
 window.gcAdminGrantPlus=async function(){
  const s=sb(),id=window.gcAdminTarget;if(!s||!id){status('gcAdminStatus','Обери користувача.');return}
  const {data,error}=await s.rpc('admin_grant_plus',{p_target_user_id:id,p_duration_days:Number($('gcPlusDuration')?.value||30),p_reason:$('gcPlusReason')?.value||null});
  status('gcAdminStatus',error?'Помилка: '+error.message:'Plus активовано. Термін: '+(data?.expires_at||'назавжди'));
  if(!error)await window.gcAdminSearchUsers();
 };
 window.gcAdminCancelPlus=async function(){
  const s=sb(),id=window.gcAdminTarget;if(!s||!id){status('gcAdminStatus','Обери користувача.');return}
  if(!confirm('Скасувати Plus для цього користувача?'))return;
  const {error}=await s.rpc('admin_cancel_plus',{p_target_user_id:id,p_reason:$('gcPlusReason')?.value||null});
  status('gcAdminStatus',error?'Помилка: '+error.message:'Підписку скасовано.');
  if(!error)await window.gcAdminSearchUsers();
 };
 async function hydrate(){
  const s=sb(),u=user();if(!s||!u)return;
  if(window.gcHydratedUserId===u.id)return;
  mountPages();seedAuthQueryFields();
  let role='athlete';
  const rr=await s.from('user_roles').select('role').eq('user_id',u.id);
  if(!rr.error&&rr.data?.length){
   role=rr.data.some(x=>x.role==='admin')?'admin':rr.data.some(x=>x.role==='coach')?'coach':'athlete';
  }
  window.gcCurrentRole=role;
  renderNavRole();
  await loadReferralCard(u);
  if(role==='coach')await loadCoachDashboard(u);
  else if(role==='admin')await loadAdminDashboard();
  else await loadAthleteDashboard(u);
  window.gcHydratedUserId=u.id;
 }
 window.addEventListener('load',()=>{if(user())hydrate().catch(e=>console.warn('GymCoach initial account hydration:',e?.message||e));},{once:true});
 const oldAfterLogin=window.gtAfterLogin;
 if(typeof oldAfterLogin==='function'&&!oldAfterLogin.__gcHydrate){
  const wrapped=async function(...args){const result=await oldAfterLogin.apply(this,args);try{await hydrate()}catch(e){console.warn('GymCoach account modules:',e?.message||e)}return result};
  wrapped.__gcHydrate=true;window.gtAfterLogin=wrapped;
 }
 document.addEventListener('DOMContentLoaded',()=>{
  seedAuthQueryFields();mountPages();initWorkoutControls();
  if(window.gtSetAuthMode)gtSetAuthMode(window.gtAuthMode||'login');
 });
 if(document.readyState!=='loading'){seedAuthQueryFields();mountPages();initWorkoutControls()}
})();
