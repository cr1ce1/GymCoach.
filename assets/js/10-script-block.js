/* Strenova PRO: cloud auth, workouts, stats, calendar and AI */
let gtAuthMode='login',gtUser=null,gtSession=null,gtSchedule=[],gtCloudReady=false;
const gtConfig=window.GTAI_CONFIG||{};
const gtConfigured=!!(gtConfig.SUPABASE_URL&&gtConfig.SUPABASE_ANON_KEY&&!String(gtConfig.SUPABASE_URL).includes('YOUR_')&&!String(gtConfig.SUPABASE_ANON_KEY).includes('YOUR_'));
const gtSupabase=gtConfigured&&window.supabase?window.supabase.createClient(gtConfig.SUPABASE_URL,gtConfig.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
function gtStatus(msg){const el=document.getElementById('authStatus');if(el)el.textContent=msg}
function gcSelectRegistrationRole(role){
 window.gcSignupRole=role==='coach'?'coach':'athlete';
 const coach=window.gcSignupRole==='coach';
 const athleteButton=document.getElementById('gcRoleAthlete');
 const coachButton=document.getElementById('gcRoleCoach');
 if(athleteButton)athleteButton.classList.toggle('active',!coach);
 if(coachButton)coachButton.classList.toggle('active',coach);
 const athleteFields=document.getElementById('gcAthleteFields');
 const coachFields=document.getElementById('gcCoachFields');
 if(athleteFields)athleteFields.hidden=coach;
 if(coachFields)coachFields.hidden=!coach;
}
function gtSetAuthMode(mode){
 gtAuthMode=mode;
 const en=document.documentElement.lang==='en';
 document.getElementById('authTitle').textContent=mode==='login'?(en?'Welcome back!':'З поверненням!'):(en?'Create your account':'Створи свій акаунт');
 document.getElementById('authSubmit').textContent=mode==='login'?(en?'Sign in':'Увійти'):(en?'Create account':'Створити акаунт');
 document.getElementById('authLoginTab').textContent=en?'Sign in':'Увійти';
 document.getElementById('authSignupTab').textContent=en?'Sign up':'Реєстрація';
 document.getElementById('authLoginTab').className=mode==='login'?'btn':'btn secondary';
 document.getElementById('authSignupTab').className=mode==='signup'?'btn':'btn secondary';
 document.getElementById('authPassword').autocomplete=mode==='login'?'current-password':'new-password';
 const signup=document.getElementById('gcSignupFields');
 if(signup)signup.hidden=mode!=='signup';
 gtStatus('');
}function gtShowGate(show){document.getElementById('authGate').hidden=!show;document.body.style.overflow=show?'hidden':''}
function gtToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function gtLocalSchedule(){try{return JSON.parse(localStorage.getItem('gtai_schedule')||'[]')}catch{return []}}
function gtSaveLocalSchedule(){localStorage.setItem('gtai_schedule',JSON.stringify(gtSchedule))}
function gtAuthErrorMessage(err){const en=document.documentElement.lang==='en';const code=String(err?.code||'').toLowerCase();const msg=String(err?.message||'');const lower=msg.toLowerCase();const status=Number(err?.status||0);if(code.includes('over_email_send_rate_limit')||/email.*rate.?limit|rate.?limit.*email|too many emails|email rate limit|over_email_send_rate_limit/i.test(lower)){return en?'The email sending limit has been reached. This limit is imposed by Supabase, not the page. Please stop retrying and try again later. If the account already exists, use “Sign in”. For a permanent fix, the site owner needs to configure a custom SMTP email provider in Supabase.':'Досягнуто ліміту надсилання листів. Це обмеження Supabase, а не сайту. Не повторюй спроби поспіль — спробуй пізніше. Якщо акаунт уже створений, обери «Увійти». Щоб вирішити проблему надовго, власнику сайту потрібно налаштувати власний SMTP у Supabase.'}if(code.includes('over_request_rate_limit')||status===429||/too many requests|request rate limit/i.test(lower)){return en?'Too many authentication requests were made. Wait a few minutes before trying again.':'Було забагато запитів авторизації. Зачекай кілька хвилин і спробуй знову.'}if(/user already registered|user already exists/i.test(lower)){return en?'An account with this email already exists. Switch to “Sign in”.':'Акаунт із цією поштою вже існує. Перемкнися на «Увійти».'}if(/invalid login credentials/i.test(lower)){return en?'The email or password is incorrect. Check them or use the account registration option if you have not signed up yet.':'Неправильна пошта або пароль. Перевір дані або обери реєстрацію, якщо акаунта ще немає.'}if(/for security purposes|only request this after/i.test(lower)){return en?'For security, wait a little before requesting another email, then try again.':'З міркувань безпеки зачекай трохи перед повторним запитом листа, а потім спробуй знову.'}return msg||(en?'Could not sign in. Check the details and try again.':'Не вдалося увійти. Перевір дані й спробуй знову.')}
async function gtAuthSubmit(e){
 e.preventDefault();
 if(!gtSupabase){gtStatus('Авторизація ще не налаштована. Перевір конфігурацію Supabase.');return}
 const email=document.getElementById('authEmail').value.trim();
 const password=document.getElementById('authPassword').value;
 const btn=document.getElementById('authSubmit');
 if(btn.disabled)return;
 const signup=gtAuthMode==='signup';
 let signupData={};
 if(signup){
  const role=window.gcSignupRole||'athlete';
  const fullName=document.getElementById('gcFullName').value.trim();
  const confirmPassword=document.getElementById('gcPasswordConfirm').value;
  if(!fullName){gtStatus('Вкажи ім’я та прізвище.');return}
  if(password!==confirmPassword){gtStatus('Паролі не збігаються.');document.getElementById('gcPasswordConfirm').focus();return}
  if(password.length<8){gtStatus('Пароль має містити щонайменше 8 символів.');return}
  signupData={account_type:role,full_name:fullName};
  if(role==='athlete'){
   const age=Number(document.getElementById('gcAge').value);
   const sport=document.getElementById('gcSport').value.trim();
   if(!Number.isInteger(age)||age<13||age>100){gtStatus('Вкажи коректний вік від 13 років.');return}
   if(!sport){gtStatus('Вкажи спортивний напрям.');return}
   signupData.age=age;
   signupData.sport=sport.slice(0,120);
   signupData.experience_level=document.getElementById('gcExperience').value;
   signupData.coach_invite_code=document.getElementById('gcCoachInvite').value.trim().toUpperCase();
  }else{
   const specialization=document.getElementById('gcCoachSpecialization').value.trim();
   const years=Number(document.getElementById('gcCoachExperience').value||0);
   const bio=document.getElementById('gcCoachBio').value.trim();
   const avatar=document.getElementById('gcCoachAvatar').value.trim();
   if(!specialization){gtStatus('Вкажи спортивну спеціалізацію.');return}
   if(!Number.isInteger(years)||years<0||years>60){gtStatus('Перевір кількість років тренерського досвіду.');return}
   if(avatar&&!avatar.toLowerCase().startsWith('https://')){gtStatus('Посилання на фото має починатися з https://');return}
   signupData.coach_specialization=specialization.slice(0,120);
   signupData.coach_experience_years=years;
   signupData.coach_bio=bio.slice(0,1200);
   signupData.coach_avatar_url=avatar||null;
  }
  signupData.referral_code=document.getElementById('gcReferralCode').value.trim().toUpperCase();
 }
 btn.disabled=true;
 gtStatus(signup?'Створюємо акаунт…':'Входимо…');
 try{
  const result=signup
   ?await gtSupabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.href.split('#')[0],data:signupData}})
   :await gtSupabase.auth.signInWithPassword({email,password});
  if(result.error)throw result.error;
  if(signup&&!result.data.session){
   gtStatus('Акаунт створено. Перевір пошту та підтверди адресу, після цього увійди.');return;
  }
  gtSession=result.data.session;gtUser=result.data.user;
  await gtAfterLogin();
 }catch(err){
  console.warn('Authentication request failed:',{code:err?.code,status:err?.status,message:err?.message});
  gtStatus(gtAuthErrorMessage(err));
 }finally{btn.disabled=false}
}
let gtAfterLoginPromise=null;
async function gtAfterLogin(){
 if(!gtUser||!gtSupabase)return;
 if(gtAfterLoginPromise)return gtAfterLoginPromise;
 const loginUserId=gtUser.id;
 gtAfterLoginPromise=(async()=>{
  gtShowGate(false);gtStatus('');
  const issues=[];
  // Load each resource independently: a missing workout table must not block calendar/profile hydration.
  try{
   const {data:prof,error}=await gtSupabase.from('user_profiles').select('profile').eq('user_id',loginUserId).maybeSingle();
   if(error)throw error;
   if(prof?.profile){
    profile=prof.profile;
    localStorage.setItem('gtai_profile',JSON.stringify(profile));
    localStorage.setItem('gtai_profile_owner_user_id',loginUserId);
   }else{
    let localProfile=null;try{localProfile=JSON.parse(localStorage.getItem('gtai_profile')||'null')}catch(_){}
    const owner=localStorage.getItem('gtai_profile_owner_user_id')||'';
    let recover=!!(localProfile&&localProfile.name&&owner===loginUserId);
    if(localProfile&&localProfile.name&&!owner){
     const ok=confirm((typeof lang!=='undefined'&&lang==='en')?'A profile saved on this device was found. Transfer it to the signed-in account so it can sync across devices?':'Знайдено профіль, збережений на цьому пристрої. Перенести його в поточний акаунт для синхронізації між пристроями?');
     if(ok){recover=true;localStorage.setItem('gtai_profile_owner_user_id',loginUserId)}
    }
    if(recover){profile=localProfile;localStorage.setItem('gtai_profile',JSON.stringify(profile));window.GTSyncProfileToCloud?.(profile)}
    else{
     if(localProfile){try{localStorage.setItem('gtai_profile_backup_'+(owner||'unclaimed'),JSON.stringify({owner:owner||null,profile:localProfile,savedAt:new Date().toISOString()}))}catch(_){}localStorage.removeItem('gtai_profile')}
     profile=null;
     if($('pEmail'))$('pEmail').value=gtUser?.email||'';
    }
   }
  }catch(err){issues.push('profile');console.warn('Supabase profile loading failed:',err?.message||err)}

  if(gtUser?.id!==loginUserId)return;
  try{
   const {data:rows,error}=await gtSupabase.from('workout_logs').select('*').eq('user_id',loginUserId).order('created_at',{ascending:false}).limit(200);
   if(error)throw error;
   history=(rows||[]).map(r=>({id:r.id,name:r.title,date:r.created_at,done:r.completed_exercises,minutes:r.minutes,exercises:r.details?.exercises||[]}));
   localStorage.setItem('gtai_history',JSON.stringify(history));
  }catch(err){issues.push('workouts');console.warn('Supabase workout history loading failed:',err?.message||err)}

  if(gtUser?.id!==loginUserId)return;
  try{
   const {data:sch,error}=await gtSupabase.from('workout_schedule').select('*').eq('user_id',loginUserId).order('scheduled_for',{ascending:true}).limit(100);
   if(error)throw error;
   gtSchedule=(sch||[]).map(r=>({id:r.id,title:r.title,date:r.scheduled_for,details:r.details||{}}));
   gtSaveLocalSchedule();
  }catch(err){issues.push('schedule');console.warn('Supabase schedule loading failed:',err?.message||err);if(!Array.isArray(gtSchedule)||!gtSchedule.length)gtSchedule=gtLocalSchedule()}

  if(gtUser?.id!==loginUserId)return;
  gtCloudReady=issues.length===0;
  if(profile){showPage('home');renderHome();renderPlan();renderHistory();fillEditProfile()}else showPage('setup');
  gtRenderStats();gtRenderSchedule();
  if(issues.length)gtStatus('Вхід успішний. Не всі хмарні дані доступні; локальні записи не видалено. Перевір відповідні таблиці та RLS у Supabase.');
 })().finally(()=>{gtAfterLoginPromise=null});
 return gtAfterLoginPromise;
}
async function gtSyncProfile(){if(!gtSupabase||!gtUser||!profile)return;const {error}=await gtSupabase.from('user_profiles').upsert({user_id:gtUser.id,profile,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)console.error('Profile sync failed:',error)}
async function gtSyncWorkout(item){if(!gtSupabase||!gtUser)return;const {data,error}=await gtSupabase.from('workout_logs').insert({user_id:gtUser.id,title:item.name,completed_exercises:item.done,minutes:item.minutes,details:{exercises:item.exercises||[]},created_at:item.date}).select().single();if(error){console.error(error);return}if(data)item.id=data.id}
function gtEscape(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function gtAltList(name){const n=name.toLowerCase();if(/присід|squat|жим ногами/.test(n))return ['Присідання до стільця','Присідання з власною вагою','Жим ногами','Випади назад'];if(/віджим|жим|груд|push|bench/.test(n))return ['Віджимання від стіни','Віджимання від опори','Жим гантелей лежачи на підлозі'];if(/тяга|спин|row|lat pulldown|підтяг/.test(n))return ['Тяга гантелі однією рукою','Тяга рюкзака в нахилі','Тяга верхнього блока'];if(/планк|dead bug|прес|кор|crunch/.test(n))return ['Dead bug','Планка з колін','Бічна планка'];if(/сідн|місток|glute|hip thrust/.test(n))return ['Сідничний місток','Відведення ноги назад стоячи','Румунська тяга з гантелями'];if(/біцепс|рук|curl|triceps/.test(n))return ['Згинання рук з гантелями','Розгинання рук з гантеллю','Віджимання від опори'];if(/біг|кардіо|ходьб|cardio/.test(n))return ['Швидка ходьба','Кроки на місці','Велотренажер у легкому темпі'];return ['Присідання до стільця','Віджимання від опори','Сідничний місток','Dead bug']}
function gtSubstitute(index){const row=document.querySelector(`[data-session-index="${index}"]`);if(!row)return;const current=row.dataset.exercise;const opts=gtAltList(current).filter(n=>n!==current);const selected=prompt('Вибери заміну, введи номер:\n'+opts.map((v,i)=>`${i+1}. ${v}`).join('\n'));if(selected===null)return;const idx=Number(selected)-1;if(!Number.isInteger(idx)||idx<0||idx>=opts.length){alert('Введи один із номерів у списку.');return}const newName=opts[idx];row.dataset.exercise=newName;row.querySelector('.session-ex-name').textContent=newName;const old=gtSessionExerciseData[index]||{};gtSessionExerciseData[index]={...old,name:newName};}
let gtSessionExerciseData=[];
function gtStartWorkout(name){if(!profile){showPage('setup');return}currentWorkout=name;const plan=buildPlan();let items;if(/^Plan day \d+$/.test(name)){const i=Number(name.split(' ').pop())-1;items=plan.days[i]?.items||plan.days[0].items;currentWorkout=plan.days[i]?.title||name}else if(name==='Recommended workout'){items=plan.days[0].items}else if(name==='Mobility'){items=translations[lang].mobilityExercises.map(x=>[x,'2 × 8–10'])}else items=(exercises[profile.place]||exercises.home);if(name==='Full Body')items=(exercises[profile.place]||exercises.home);currentExercises=items.map(x=>[...x]);gtSessionExerciseData=items.map((x,i)=>({name:x[0],prescription:x[1],sets:Number(String(x[1]).match(/(\d+)/)?.[1]||3),reps:Number(String(x[1]).match(/×\s*(\d+)/)?.[1]||10),weight:0,completed:false}));$('sessionTitle').textContent=currentWorkout;$('exerciseList').innerHTML=gtSessionExerciseData.map((e,i)=>`<div class="session-row" data-session-index="${i}" data-exercise="${gtEscape(e.name)}"><input type="checkbox" aria-label="Виконано" onchange="gtSessionExerciseData[${i}].completed=this.checked"><div class="session-main"><b class="session-ex-name">${gtEscape(e.name)}</b><small style="display:block;color:var(--muted);margin-top:4px">${gtEscape(e.prescription||'3 × 8–12')}</small><div class="session-inputs"><label>Підходи<input type="number" min="1" max="10" value="${e.sets}" onchange="gtSessionExerciseData[${i}].sets=Math.max(1,Math.min(10,Number(this.value)||1))"></label><label>Повторення<input type="number" min="1" max="100" value="${e.reps}" onchange="gtSessionExerciseData[${i}].reps=Math.max(1,Math.min(100,Number(this.value)||1))"></label><label>Вага, кг<input type="number" min="0" max="500" step="0.5" value="${e.weight}" onchange="gtSessionExerciseData[${i}].weight=Math.max(0,Number(this.value)||0)"></label></div><div class="session-actions"><button class="chip" onclick="gtSubstitute(${i})">↻ Замінити вправу</button></div></div></div>`).join('');setTimer(90);showPage('session')}
function gtFinishWorkout(){const done=gtSessionExerciseData.filter(e=>e.completed).length;if(!done&&!confirm('Не позначено завершених вправ. Зберегти тренування?'))return;const record={name:currentWorkout,date:new Date().toISOString(),done,minutes:profile?.duration||30,exercises:gtSessionExerciseData.map(e=>({...e}))};history.unshift(record);localStorage.setItem('gtai_history',JSON.stringify(history));stopTimer();if(gtUser)gtSyncWorkout(record);renderHome();renderHistory();gtRenderStats();showPage('stats');alert('Тренування збережено!')}
function gtRenderStats(){const list=Array.isArray(history)?history:[];const totalMinutes=list.reduce((a,x)=>a+(Number(x.minutes)||0),0),done=list.reduce((a,x)=>a+(Number(x.done)||0),0);const weekStart=new Date();weekStart.setHours(0,0,0,0);weekStart.setDate(weekStart.getDate()-6);const week=list.filter(x=>new Date(x.date)>=weekStart);const metrics=[['Тренувань',list.length],['Хвилин',totalMinutes],['Вправ виконано',done],['Цього тижня',week.length],['Середня тривалість',list.length?Math.round(totalMinutes/list.length):0],['Поточний профіль',gtUser?'Онлайн':'Локально']];const root=$('gtMetricGrid');if(root)root.innerHTML=metrics.map(m=>`<div class="metric"><strong>${gtEscape(m[1])}</strong><small>${gtEscape(m[0])}</small></div>`).join('');const chart=$('gtWeeklyChart');if(chart){const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const key=d.toDateString();days.push({key,label:d.toLocaleDateString('uk-UA',{weekday:'short'}),count:list.filter(x=>new Date(x.date).toDateString()===key).length})}const max=Math.max(1,...days.map(d=>d.count));chart.innerHTML=days.map(d=>`<div class="chart-bar" title="${d.count} тренувань"><span style="height:${Math.max(3,d.count/max*100)}%"></span><small>${gtEscape(d.label)}</small><small>${d.count}</small></div>`).join('')};const prs={};list.forEach(w=>(w.exercises||[]).forEach(e=>{if(!e.name)return;const weight=Number(e.weight)||0,reps=Number(e.reps)||0;const score=weight*reps;if(!prs[e.name]||score>prs[e.name].score)prs[e.name]={weight,reps,score}}));const pr=$('gtPRList');if(pr)pr.innerHTML=Object.keys(prs).length?Object.entries(prs).sort((a,b)=>b[1].score-a[1].score).slice(0,12).map(([n,v])=>`<div class="pr-row"><span>${gtEscape(n)}</span><b>${v.weight?`${v.weight} кг × `:''}${v.reps} повт.</b></div>`).join(''):'<p class="hint">Запиши вагу та повторення під час тренування, щоб тут з’явилися твої рекорди.</p>';const recent=$('gtRecentWorkouts');if(recent)recent.innerHTML=list.length?list.slice(0,5).map(w=>`<div class="pr-row"><span>${gtEscape(w.name)}</span><small>${new Date(w.date).toLocaleDateString('uk-UA')} · ${Number(w.minutes)||0} хв</small></div>`).join(''):'<p class="hint">Поки немає тренувань. Заверши перше заняття, щоб побачити статистику.</p>'}
async function gtAddSchedule(){const title=$('gtScheduleTitle').value.trim()||'Тренування',date=$('gtScheduleDate').value;if(!date){alert('Обери дату.');return}const item={title,date,details:{source:'manual'}};if(gtSupabase&&gtUser){const {data,error}=await gtSupabase.from('workout_schedule').insert({user_id:gtUser.id,title,scheduled_for:date,details:item.details}).select().single();if(error){alert('Не вдалося зберегти розклад у хмарі: '+error.message);return}item.id=data.id}else item.id='local-'+Date.now();gtSchedule.push(item);gtSaveLocalSchedule();$('gtScheduleTitle').value='';gtRenderSchedule()}
async function gtDeleteSchedule(id){if(gtSupabase&&gtUser&&!String(id).startsWith('local-')){const {error}=await gtSupabase.from('workout_schedule').delete().eq('id',id).eq('user_id',gtUser.id);if(error){alert(error.message);return}}gtSchedule=gtSchedule.filter(x=>String(x.id)!==String(id));gtSaveLocalSchedule();gtRenderSchedule()}
async function gtMoveSchedule(id,date){if(!date)return;const item=gtSchedule.find(x=>String(x.id)===String(id));if(!item)return;if(gtSupabase&&gtUser&&!String(id).startsWith('local-')){const {error}=await gtSupabase.from('workout_schedule').update({scheduled_for:date}).eq('id',id).eq('user_id',gtUser.id);if(error){alert('Не вдалося перенести заняття: '+error.message);return}}item.date=date;gtSaveLocalSchedule();gtRenderSchedule()}
function gtRenderSchedule(){const root=$('gtScheduleList');if(!root)return;const sorted=[...gtSchedule].sort((a,b)=>String(a.date).localeCompare(String(b.date)));$('gtScheduleCount').textContent=sorted.length;if(!sorted.length){root.innerHTML='<p class="hint">Поки немає занять у календарі. Додай тренування або створи розклад за планом.</p>';return}root.innerHTML=sorted.map(x=>`<div class="calendar-item"><div><b>${gtEscape(x.title)}</b><small style="display:block;color:var(--muted)">${new Date(x.date+'T12:00:00').toLocaleDateString('uk-UA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</small></div><input type="date" value="${gtEscape(x.date)}" aria-label="Перенести дату" onchange="gtMoveSchedule('${gtEscape(x.id)}',this.value)"><button class="btn secondary calendar-save" onclick="gtDeleteSchedule('${gtEscape(x.id)}')">Видалити</button></div>`).join('')}
async function gtGenerateSchedule(){if(!profile){showPage('setup');return}const plan=buildPlan();const start=new Date();start.setHours(12,0,0,0);const made=[];let dayOffset=1;for(let i=0;i<plan.days.length;i++){const d=new Date(start);d.setDate(d.getDate()+dayOffset);while(d.getDay()===0||d.getDay()===6){d.setDate(d.getDate()+1)}const date=gtTodayFrom(d);const title=plan.days[i].title;let item={title,date,details:{source:'plan',dayIndex:i}};if(gtSupabase&&gtUser){const {data,error}=await gtSupabase.from('workout_schedule').insert({user_id:gtUser.id,title,scheduled_for:date,details:item.details}).select().single();if(error){alert('Розклад не збережено: '+error.message);return}item.id=data.id}else item.id='local-'+Date.now()+'-'+i;made.push(item);dayOffset+=Math.max(1,Math.floor(7/plan.days.length))}gtSchedule=[...gtSchedule,...made];gtSaveLocalSchedule();gtRenderSchedule()}
function gtTodayFrom(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function gtSendChat(){const input=$('chatInput'),q=input.value.trim();if(!q)return;addBubble(q,'user');input.value='';const low=q.toLowerCase();let reply;if(/харч|їж|їжа|калор|білк|кбжв|nutrition|food|calorie/.test(low)){reply='Для харчування відкрий вкладку «Харчування» та додай прийом їжі. Щоденник підрахує калорії, білки, жири й вуглеводи за вибрану дату.'}else if(/план|програм|тренуван|workout|routine|вправ/.test(low)){reply='Почни з вкладки «Тренування»: там є твій план, бібліотека вправ, календар і статистика. Підбирай навантаження під свій рівень і залишай час на відновлення. '+(profile?'Твоя поточна ціль: '+(profile.goal||'регулярність')+'.':'Заповни профіль, щоб персоналізувати план.')}else if(/віднов|recovery|rest|сон|sleep|втом|бол/.test(low)){reply='Відновлення — частина тренувань. Дотримуйся регулярного сну, пий воду та плануй дні легшої активності. Якщо під час вправ виникає біль, зупинись і попроси дорослого або фахівця допомогти оцінити ситуацію.'}else if(/технік|technique|squat|присід|push.?up|віджим|deadlift|тяга/.test(low)){reply='Для техніки: починай повільно, контролюй рух, не поспішай збільшувати вагу й обирай варіант вправи, який можеш виконувати комфортно. Відкрий «Бібліотеку вправ», щоб знайти потрібний рух і переглянути підказки.'}else if(/мотивац|лінь|важко|motivat/.test(low)){reply='Не обов’язково робити ідеальне тренування — важливіша регулярність. Спробуй коротке заняття на 10–15 хвилин або легку розминку й відзнач прогрес у своєму календарі.'}else{reply='Я твій фітнес-помічник у базовому режимі. Запитай про план тренувань, техніку вправ, відновлення або харчовий щоденник. Поки що відповіді підготовлені за сценаріями — платний API для чату не потрібен.'}setTimeout(()=>addBubble(reply,'bot'),140)}
function gtShowPage(id){showPage(id);if(id==='stats')gtRenderStats();if(id==='calendar')gtRenderSchedule()}
// Extend navigation to refresh new pages.
const gtOriginalShowPage=showPage;showPage=function(id){gtOriginalShowPage(id);if(id==='stats')gtRenderStats();if(id==='calendar')gtRenderSchedule()};
// Replace demo-only workout functions with the detailed session workflow.
startWorkout=gtStartWorkout;finishWorkout=gtFinishWorkout;sendChat=gtSendChat;
// Add a launch button to every day in the generated plan.
const gtOriginalRenderPlan=renderPlan;renderPlan=function(){gtOriginalRenderPlan();document.querySelectorAll('#planDays .card').forEach((card,i)=>{if(card.querySelector('.gt-start-day'))return;const b=document.createElement('button');b.className='btn full gt-start-day';b.textContent='▶ Почати це тренування';b.onclick=()=>startWorkout('Plan day '+(i+1));card.appendChild(b)})};
const gtOriginalSaveProfile=saveProfile;saveProfile=function(){gtOriginalSaveProfile();if(profile&&gtUser){gtStatus('Профіль збережено; стан синхронізації відображається біля форми.')}};
const gtOriginalSaveEdited=saveEditedProfile;saveEditedProfile=function(){gtOriginalSaveEdited()};
const gtOriginalLogout=logoutProfile;logoutProfile=async function(){if(gtSupabase&&gtUser){if(!confirm('Вийти з акаунта? Твої дані залишаться збереженими в хмарі.'))return;await gtSupabase.auth.signOut();gtUser=null;gtSession=null;profile=null;history=[];gtSchedule=[];localStorage.removeItem('gtai_profile');localStorage.removeItem('gtai_history');window.__stAuth=0;gtShowGate(true);gtSetAuthMode('login');showPage('setup')}else gtOriginalLogout()};
const gtOriginalClearHistory=clearHistory;clearHistory=async function(){gtOriginalClearHistory();if(gtSupabase&&gtUser){const {error}=await gtSupabase.from('workout_logs').delete().eq('user_id',gtUser.id);if(error)console.error(error)}};
const gtOriginalShowHome=renderHome;renderHome=function(){gtOriginalShowHome();gtRenderStats()};
document.getElementById('authForm').addEventListener('submit',gtAuthSubmit);document.getElementById('gtScheduleDate').value=gtToday();
if(!gtSupabase){gtShowGate(true);gtStatus('Supabase ще не налаштований. Заповни config.js за інструкцією README.md, щоб увімкнути реєстрацію та вхід.');}
else{gtShowGate(true);gtSupabase.auth.getSession().then(async({data,error})=>{if(error){gtStatus(error.message);return}gtSession=data.session;gtUser=data.session?.user||null;if(gtSession)await gtAfterLogin();else gtStatus('Увійди або створи акаунт, щоб продовжити.')});gtSupabase.auth.onAuthStateChange((_event,session)=>{gtSession=session;gtUser=session?.user||null;if(session)setTimeout(()=>gtAfterLogin(),0);else gtShowGate(true)})}
