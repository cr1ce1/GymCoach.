(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const en=()=>String(document.documentElement.lang||'uk').toLowerCase().startsWith('en');
 const tr=(uk,english)=>en()?english:uk;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const currentUserSafe=()=>{try{return typeof gtUser!=='undefined'?gtUser:null}catch(_){return null}};
 const scheduleRows=()=>{try{return typeof gtSchedule!=='undefined'&&Array.isArray(gtSchedule)?gtSchedule:[]}catch(_){return []}};
 const setScheduleRows=rows=>{try{gtSchedule=rows}catch(_){window.gtSchedule=rows}};
 const scheduleDate=x=>String(x?.date||x?.scheduled_for||'').slice(0,10);
 const plusAllowed=()=>window.GT_PLUS_ACCESS===true;
 let calMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
 let calSelected=dayKey(new Date());
 let showPlanPicker=false;
 let notificationChannel=null;
 let notificationUserId=null;
 let lastNotified=new Set();
 const notifyStorageKey=()=>`gt_coach_notified_${currentUserSafe()?.id||'owner'}`;
 function readLastNotified(){try{lastNotified=new Set(JSON.parse(localStorage.getItem(notifyStorageKey())||'[]'))}catch(_){lastNotified=new Set()}}
 function storeLastNotified(id){lastNotified.add(String(id));try{localStorage.setItem(notifyStorageKey(),JSON.stringify([...lastNotified].slice(-500)))}catch(_){}}

 // Calendar lives directly below the profile card. Hide the obsolete form/list to avoid two competing calendars.
 function mountCalendarInProfile(){
   const profileSec=$('profile'),cal=$('calendar');if(!profileSec||!cal)return;
   cal.classList.remove('page','active');cal.classList.add('gt-profile-calendar');
   const topCard=profileSec.querySelector(':scope > .card');
   if(topCard&&cal.parentElement!==profileSec)topCard.insertAdjacentElement('afterend',cal);
   else if(topCard&&cal.previousElementSibling!==topCard)topCard.insertAdjacentElement('afterend',cal);
   cal.querySelectorAll(':scope > .card').forEach(c=>c.style.display='none');
   cal.querySelectorAll(':scope > .section-head').forEach(h=>{const title=h.querySelector('h2');if(title)title.textContent=tr('Календар тренувань','Workout calendar')});
   let root=$('gtModernCalendar');
   if(!root){root=document.createElement('div');root.id='gtModernCalendar';root.className='gt-calendar-shell';cal.appendChild(root)}
   const lock=$('gtCalendarLock');if(lock&&lock.parentElement!==root)root.appendChild(lock);
   ensureCalendarCss();
   renderCalendar();
 }
 function ensureCalendarCss(){if($('gt-calendar-rework-css'))return;const style=document.createElement('style');style.id='gt-calendar-rework-css';style.textContent=`
 #profile .gt-profile-calendar{position:relative;display:block!important;overflow:visible;margin:16px 0;padding:16px;border-radius:22px;border:1px solid var(--line);background:var(--panel);}
 #profile .gt-profile-calendar>.card{display:none!important}
 #gtModernCalendar{position:relative;isolation:isolate;border-radius:18px;padding:clamp(12px,2vw,20px);background:linear-gradient(145deg,#1f0c2b,#180b20);border:1px solid #47265d;color:#f1e6f9;overflow:hidden;box-shadow:0 14px 32px #0002}
 #gtModernCalendar .gtcal-header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
 #gtModernCalendar .gtcal-overline{font-size:11px;letter-spacing:.14em;color:#c982f8;font-weight:800;text-transform:uppercase}
 #gtModernCalendar .gtcal-month{font-size:clamp(20px,3vw,28px);font-weight:850;text-transform:capitalize;margin-top:4px}
 #gtModernCalendar .gtcal-controls{display:flex;gap:6px;align-items:center}
 #gtModernCalendar .gtcal-controls button{min-width:38px;height:38px;border:1px solid #523366;border-radius:10px;background:#2b133b;color:#f7eaff;cursor:pointer;font-size:18px}
 #gtModernCalendar .gtcal-controls button.today{font-size:12px;padding:0 11px;font-weight:750}
 #gtModernCalendar .gt-calendar-weekdays,#gtModernCalendar .gt-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
 #gtModernCalendar .gt-calendar-weekdays{margin-bottom:7px}
 #gtModernCalendar .gt-calendar-weekdays span{text-align:center;font-size:11px;font-weight:800;color:#c2a9d2;padding:5px 0}
 #gtModernCalendar .gt-calendar-day{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:clamp(42px,7vw,65px);padding:5px 2px;border:1px solid transparent;border-radius:12px;background:#251132;color:#f7eaff;cursor:pointer;font:inherit;font-weight:700;transition:background .15s,border-color .15s,transform .15s}
 #gtModernCalendar .gt-calendar-day:hover{border-color:#8a5ca9;transform:translateY(-1px)}
 #gtModernCalendar .gt-calendar-day.outside{opacity:.35}
 #gtModernCalendar .gt-calendar-day.today{border-color:#cc91f3}
 #gtModernCalendar .gt-calendar-day.selected{background:#d39af9;color:#140a1b;border-color:#d39af9}
 #gtModernCalendar .gtcal-day-dots{display:flex;gap:3px;min-height:5px;align-items:center;justify-content:center}
 #gtModernCalendar .gtcal-dot{width:5px;height:5px;border-radius:99px;background:#d08aff;display:inline-block}
 #gtModernCalendar .gt-calendar-day.selected .gtcal-dot{background:#3c224d}
 #gtModernCalendar .gtcal-selected{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:18px;padding:15px;border:1px solid #4f2d65;border-radius:15px;background:#231030}
 #gtModernCalendar .gtcal-selected strong{display:block;font-size:16px;text-transform:capitalize}
 #gtModernCalendar .gtcal-selected small{display:block;color:#c1a8d2;margin-top:4px}
 #gtModernCalendar button.gtcal-primary{border:0;background:#d39af9;color:#180b21;border-radius:11px;padding:10px 13px;font-weight:850;cursor:pointer}
 #gtModernCalendar button.gtcal-secondary{border:1px solid #533567;background:#2b143a;color:#f1e6f9;border-radius:10px;padding:9px 11px;font-weight:700;cursor:pointer}
 #gtModernCalendar .gtcal-agenda{display:grid;gap:10px;margin-top:12px}
 #gtModernCalendar .gtcal-event{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;background:#1f0e2b;border:1px solid #47275c;border-radius:14px;padding:13px}
 #gtModernCalendar .gtcal-event.done{border-color:#542e6d;background:#1e1027}
 #gtModernCalendar .gtcal-event strong{display:block;line-height:1.35;overflow-wrap:anywhere}
 #gtModernCalendar .gtcal-event small{display:block;color:#c2a9d3;margin-top:5px}
 #gtModernCalendar .gtcal-event.done strong{text-decoration:line-through;opacity:.75}
 #gtModernCalendar .gtcal-event-actions{display:flex;flex-wrap:wrap;gap:6px;grid-column:1/-1;align-items:center}
 #gtModernCalendar .gtcal-event-actions input[type=date]{width:auto;min-width:140px;background:#1a0a24;border:1px solid #513266;color:#f7eaff;border-radius:9px;padding:8px}
 #gtModernCalendar .gtcal-empty{padding:18px 10px;text-align:center;color:#c5add5;border:1px dashed #543568;border-radius:13px;line-height:1.55}
 #gtModernCalendar .gtcal-picker{margin-top:14px;padding:14px;border-radius:14px;border:1px solid #4e2e63;background:#231030}
 #gtModernCalendar .gtcal-picker label{display:block;color:#d3bde1;font-size:13px;margin-bottom:6px}
 #gtModernCalendar .gtcal-picker select{width:100%;padding:11px;border:1px solid #523366;border-radius:10px;background:#1a0926;color:#f7eaff;margin-bottom:10px}
 #gtModernCalendar #gtCalendarLock{position:absolute;inset:0;z-index:80;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;padding:24px;text-align:center;border-radius:18px;background:rgba(15,4,23,.84);border:1px solid #5f357b;backdrop-filter:blur(8px);color:#f5e6ff;line-height:1.55}
 #gtModernCalendar #gtCalendarLock .gt-lock-icon{font-size:38px}
 #gtModernCalendar #gtCalendarLock strong{font-size:19px;color:#fff}
 #gtModernCalendar #gtCalendarLock p{max-width:430px;margin:0;color:#d8c0e8}
 #gtModernCalendar #gtCalendarLock button{border:0;border-radius:12px;padding:12px 16px;background:#d39af9;color:#180b21;font-weight:850;cursor:pointer}
 @media(max-width:540px){#gtModernCalendar .gt-calendar-grid,#gtModernCalendar .gt-calendar-weekdays{gap:3px}#gtModernCalendar .gt-calendar-day{min-height:42px;border-radius:8px;font-size:13px}#gtModernCalendar .gtcal-event{grid-template-columns:1fr}#gtModernCalendar .gtcal-event-actions{grid-column:1}#gtModernCalendar .gtcal-controls button{min-width:34px;height:34px}}
 `;document.head.appendChild(style)}
 function planForCalendar(){try{const p=window.gtGetOptimizedPlan?.();if(p?.days?.length)return p;const q=typeof buildPlan==='function'&&profile?buildPlan():null;return q&&Array.isArray(q.days)?q:{days:[]}}catch(_){return {days:[]}}}
 function ensureCalendarLock(root){let lock=$('gtCalendarLock');if(!lock){lock=document.createElement('div');lock.id='gtCalendarLock'}if(lock.parentElement!==root)root.appendChild(lock);const allowed=plusAllowed();lock.style.display=allowed?'none':'flex';lock.setAttribute('aria-hidden',allowed?'true':'false');lock.innerHTML=`<div class="gt-lock-icon" aria-hidden="true"><svg class="gc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><strong>${tr('Календар — можливість Strenova Plus','Workout calendar is a Strenova Plus feature')}</strong><p>${tr('Переглянь макет календаря. Щоб створювати розклад, відмічати виконані заняття та запускати тренування з плану, потрібен Plus. Доступ надає власник вручну.','Preview the calendar. Plus is required to schedule, mark and start planned workouts. The owner grants access manually.')}</p><button type="button" id="gtCalOpenPlus">${tr('Як отримати Plus','How to get Plus')} →</button>`;const b=$('gtCalOpenPlus');if(b)b.onclick=()=>{window.gtRenderSubscription?.();window.showPage?.('subscription')}}
 function renderCalendar(){
   const root=$('gtModernCalendar');if(!root)return;
   const names=en()?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
   const first=new Date(calMonth.getFullYear(),calMonth.getMonth(),1);const offset=(first.getDay()+6)%7;const gridStart=new Date(first);gridStart.setDate(first.getDate()-offset);
   const rows=scheduleRows().slice().sort((a,b)=>scheduleDate(a).localeCompare(scheduleDate(b)));
   const byDate=new Map();for(const row of rows){const k=scheduleDate(row);if(!k)continue;if(!byDate.has(k))byDate.set(k,[]);byDate.get(k).push(row)}
   const selectedDay=new Date(calSelected+'T12:00:00');if(Number.isNaN(selectedDay.getTime()))calSelected=dayKey(new Date());
   let cells='';for(let i=0;i<42;i++){const d=new Date(gridStart);d.setDate(gridStart.getDate()+i);const k=dayKey(d),items=byDate.get(k)||[],completed=items.filter(x=>x.details?.completed).length;const dots=items.slice(0,3).map(x=>`<i class="gtcal-dot" title="${esc(x.title||'Тренування')}"></i>`).join('');cells+=`<button type="button" class="gt-calendar-day ${d.getMonth()!==calMonth.getMonth()?'outside':''} ${k===dayKey(new Date())?'today':''} ${k===calSelected?'selected':''}" data-gtcal-date="${k}" aria-pressed="${k===calSelected?'true':'false'}" aria-label="${esc(d.toLocaleDateString(en()?'en-US':'uk-UA',{weekday:'long',day:'numeric',month:'long'}))}; ${items.length} ${en()?'workouts':'тренувань'}"><span>${d.getDate()}</span><span class="gtcal-day-dots">${dots}${items.length>3?`<small>+${items.length-3}</small>`:''}</span>${items.length&&completed===items.length?'<span aria-label="Completed">✓</span>':''}</button>`}
   const sessions=byDate.get(calSelected)||[];const formatted=selectedDay.toLocaleDateString(en()?'en-US':'uk-UA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
   const agenda=sessions.length?sessions.map(item=>{const done=!!item.details?.completed;const id=String(item.id||'');return `<article class="gtcal-event ${done?'done':''}" data-gtcal-event="${esc(id)}"><div><strong>${esc(item.title||tr('Тренування','Workout'))}</strong><small>${esc(item.details?.source==='plan'?tr('Із персонального плану','From your plan'):tr('Додане тренування','Added workout'))}${done?' · '+tr('Виконано','Completed'):''}</small></div><div class="gtcal-event-actions"><button type="button" class="gtcal-primary" data-action="start" data-id="${esc(id)}">▶ ${tr('Почати','Start')}</button><button type="button" class="gtcal-secondary" data-action="done" data-id="${esc(id)}">${done?'✓ '+tr('Виконано','Completed'):'○ '+tr('Позначити виконаним','Mark complete')}</button><label class="hint">${tr('Перенести','Reschedule')} <input type="date" data-action="move" data-id="${esc(id)}" value="${esc(scheduleDate(item))}" aria-label="${tr('Нова дата','New date')}"></label><button type="button" class="gtcal-secondary" data-action="delete" data-id="${esc(id)}">${tr('Видалити','Delete')}</button></div></article>`}).join(''):`<div class="gtcal-empty">${tr('На цю дату тренувань немає. Додай заняття з персонального плану нижче.','No workouts on this date. Add one from your training plan below.')}</div>`;
   const plan=planForCalendar();const opts=(plan.days||[]).map((d,i)=>`<option value="${i}">${esc(String(d.title||`Training ${i+1}`).replace(/^\d+\.\s*/,''))}</option>`).join('');
   root.innerHTML=`<div class="gtcal-header"><div><div class="gtcal-overline">${tr('ПЛАНУЙ • ТРЕНУЙСЯ • ВІДСТЕЖУЙ','PLAN • TRAIN • TRACK')}</div><div class="gtcal-month">${esc(new Intl.DateTimeFormat(en()?'en-US':'uk-UA',{month:'long',year:'numeric'}).format(first))}</div></div><div class="gtcal-controls"><button type="button" id="gtCalPrev" aria-label="${tr('Попередній місяць','Previous month')}">‹</button><button type="button" class="today" id="gtCalToday">${tr('Сьогодні','Today')}</button><button type="button" id="gtCalNext" aria-label="${tr('Наступний місяць','Next month')}">›</button></div></div><div class="gt-calendar-weekdays">${names.map(n=>`<span>${n}</span>`).join('')}</div><div class="gt-calendar-grid">${cells}</div><div class="gtcal-selected"><div><strong>${esc(formatted)}</strong><small>${sessions.length?`${sessions.length} ${tr('занять','workouts')} · ${sessions.filter(x=>x.details?.completed).length} ${tr('виконано','completed')}`:tr('План на вибраний день','Plan for the selected day')}</small></div><button type="button" class="gtcal-primary" id="gtCalToggleAdd">＋ ${tr('Додати з плану','Add from plan')}</button></div><div class="gtcal-agenda">${agenda}</div><div class="gtcal-picker" id="gtCalPlanPicker" ${showPlanPicker?'':'hidden'}><label for="gtCalPlanDay">${tr('Вибери тренування з персонального плану','Choose a workout from your plan')}</label><select id="gtCalPlanDay" ${opts?'':'disabled'}>${opts||`<option>${tr('Спочатку створи план тренувань','Create a workout plan first')}</option>`}</select><button type="button" class="gtcal-primary" id="gtCalSavePlan" ${opts?'':'disabled'}>${tr('Додати на цю дату','Add to this date')} →</button><button type="button" class="gtcal-secondary" id="gtCalCancelPlan">${tr('Скасувати','Cancel')}</button><p class="hint">${tr('Вправи та рекомендовані підходи збережуться разом із заняттям.','Exercises and suggested sets will be saved with the workout.')}</p></div>`;
   $('gtCalPrev').onclick=()=>{calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()-1,1);renderCalendar()};$('gtCalNext').onclick=()=>{calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+1,1);renderCalendar()};$('gtCalToday').onclick=()=>{const d=new Date();calMonth=new Date(d.getFullYear(),d.getMonth(),1);calSelected=dayKey(d);showPlanPicker=false;renderCalendar()};
   root.querySelectorAll('[data-gtcal-date]').forEach(b=>b.addEventListener('click',()=>{calSelected=b.dataset.gtcalDate;const d=new Date(calSelected+'T12:00:00');calMonth=new Date(d.getFullYear(),d.getMonth(),1);showPlanPicker=false;renderCalendar()}));
   $('gtCalToggleAdd').onclick=()=>{if(!plusAllowed()){window.gtRenderSubscription?.();window.showPage?.('subscription');return}showPlanPicker=!showPlanPicker;renderCalendar();if(showPlanPicker)$('gtCalPlanDay')?.focus()};$('gtCalCancelPlan').onclick=()=>{showPlanPicker=false;renderCalendar()};$('gtCalSavePlan').onclick=addSelectedPlanDay;
   root.querySelectorAll('[data-action="start"]').forEach(b=>b.onclick=()=>{if(!plusAllowed()){window.gtRenderSubscription?.();window.showPage?.('subscription');return}window.gtStartScheduledWorkout?.(b.dataset.id)});
   root.querySelectorAll('[data-action="done"]').forEach(b=>b.onclick=async()=>{if(!plusAllowed()){window.gtRenderSubscription?.();window.showPage?.('subscription');return}await window.gtToggleScheduledWorkout?.(b.dataset.id);renderCalendar()});
   root.querySelectorAll('[data-action="delete"]').forEach(b=>b.onclick=async()=>{if(!plusAllowed()){window.gtRenderSubscription?.();window.showPage?.('subscription');return}if(!confirm(tr('Видалити це тренування з календаря?','Remove this workout from the calendar?')))return;await window.gtDeleteSchedule?.(b.dataset.id);renderCalendar()});
   root.querySelectorAll('input[data-action="move"]').forEach(inp=>inp.onchange=async()=>{if(!plusAllowed()){window.gtRenderSubscription?.();window.showPage?.('subscription');return}if(!inp.value)return;await window.gtMoveSchedule?.(inp.dataset.id,inp.value);calSelected=inp.value;const d=new Date(calSelected+'T12:00:00');calMonth=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar()});
   ensureCalendarLock(root);
 }
 async function addSelectedPlanDay(){
   if(!plusAllowed()){window.gtRenderSubscription?.();window.showPage?.('subscription');return}
   const idx=Number($('gtCalPlanDay')?.value),plan=planForCalendar(),day=plan.days?.[idx];if(!day){alert(tr('Не знайшов цей день у плані. Онови план і спробуй знову.','Could not find this workout in your plan. Refresh your plan and try again.'));return}
   const existing=scheduleRows().find(x=>scheduleDate(x)===calSelected&&Number(x.details?.dayIndex)===idx&&x.details?.source==='plan');if(existing){alert(tr('Цей день плану вже доданий на вибрану дату.','This plan day is already scheduled on the selected date.'));return}
   const exercises=(day.items||[]).map(x=>Array.isArray(x)?[String(x[0]),String(x[1]||'3 × 8–12')]:[String(x.name||x),String(x.prescription||'3 × 8–12')]);
   const title=String(day.title||tr(`Тренування ${idx+1}`,`Workout ${idx+1}`)).replace(/^\d+\.\s*/,'');const details={source:'plan',dayIndex:idx,exercises};let item={title,date:calSelected,details};
   try{
    if(typeof gtSupabase!=='undefined'&&gtSupabase&&typeof gtUser!=='undefined'&&gtUser){const {data,error}=await gtSupabase.from('workout_schedule').insert({user_id:gtUser.id,title,scheduled_for:calSelected,details}).select().single();if(error)throw error;item={id:data.id,title,date:data.scheduled_for||calSelected,details:data.details||details}}
    else {item.id='local-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)}
    const list=scheduleRows();list.push(item);setScheduleRows(list);try{gtSaveLocalSchedule()}catch(_){localStorage.setItem('gtai_schedule',JSON.stringify(list))}
    showPlanPicker=false;renderCalendar();window.gtRenderSchedule?.();
   }catch(err){alert(tr('Не вдалося зберегти заняття. Перевір вхід та політики Supabase: ','Could not save workout. Check sign-in and Supabase policies: ')+(err?.message||''))}
 }
 // Keep the compact list synchronized for existing code paths while the new calendar is the main UI.
 const oldRenderSchedule=window.gtRenderSchedule;
 if(typeof oldRenderSchedule==='function'&&!oldRenderSchedule.__gtCalendarRework){const wrapped=function(...args){const result=oldRenderSchedule.apply(this,args);renderCalendar();return result};wrapped.__gtCalendarRework=true;window.gtRenderSchedule=wrapped}
 const oldPremium=window.gtUpdatePremiumSurfaces;
 window.gtUpdatePremiumSurfaces=function(isPlus){if(typeof oldPremium==='function')oldPremium(isPlus);const root=$('gtModernCalendar');if(root)ensureCalendarLock(root);renderCalendar()};
 const oldShow=window.showPage;
 if(typeof oldShow==='function'&&!oldShow.__gtCalendarRework){const wrapped=function(id,...args){const calendarLink=id==='calendar';const dest=calendarLink?'profile':id;const result=oldShow.call(this,dest,...args);if(dest==='profile'){mountCalendarInProfile();setTimeout(()=>{mountCalendarInProfile();},0);setTimeout(()=>{if(calendarLink)$('calendar')?.scrollIntoView({behavior:'smooth',block:'start'});},60)}if(dest==='nutrition'){window.gtRenderFood?.();renderFoodCatalog();setTimeout(renderFoodCatalog,0)}if(dest==='coach-inbox'){setTimeout(()=>{mountOwnerNotifications();$('gtOwnerNewMessageBadge')?.remove();},0)}return result};wrapped.__gtCalendarRework=true;window.showPage=wrapped}

 // BJU calculator: choose a food and its weight; values fill the existing food diary form automatically.
 const FOOD_DB=[
  ['oats','Вівсяні пластівці, сухі','Rolled oats, dry',389,16.9,6.9,66.3],['rice','Рис варений','Cooked rice',130,2.7,.3,28.2],['buckwheat','Гречка варена','Cooked buckwheat',92,3.4,.6,19.9],['pasta','Макарони варені','Cooked pasta',157,5.8,.9,30.9],['potato','Картопля варена','Boiled potatoes',87,1.9,.1,20.1],['chicken','Куряче філе готове','Cooked chicken breast',165,31,3.6,0],['turkey','Індичка готова','Cooked turkey',135,29,1.6,0],['beef','Яловичина нежирна готова','Lean cooked beef',217,26,12,0],['salmon','Лосось готовий','Cooked salmon',206,22,12,0],['egg','Яйце ціле','Whole egg',143,13,10,1.1],['yogurt','Йогурт грецький натуральний','Plain Greek yogurt',73,10,2,3.6],['cottage','Сир кисломолочний 5%','Cottage cheese 5%',121,17,5,3],['milk','Молоко 2,5%','Milk 2.5%',52,3,2.5,4.7],['kefir','Кефір 2,5%','Kefir 2.5%',53,3,2.5,4],['banana','Банан','Banana',89,1.1,.3,22.8],['apple','Яблуко','Apple',52,.3,.2,13.8],['orange','Апельсин','Orange',47,.9,.1,11.8],['berries','Ягоди змішані','Mixed berries',57,.7,.3,14.5],['bread','Хліб цільнозерновий','Whole-grain bread',247,13,4.2,41],['whitebread','Хліб білий','White bread',266,8.9,3.2,49],['avocado','Авокадо','Avocado',160,2,14.7,8.5],['almonds','Мигдаль','Almonds',579,21.2,49.9,21.6],['oil','Оливкова олія','Olive oil',884,0,100,0],['tomato','Помідор','Tomato',18,.9,.2,3.9],['cucumber','Огірок','Cucumber',15,.7,.1,3.6],['broccoli','Броколі','Broccoli',35,2.4,.4,7.2],['lentils','Сочевиця варена','Cooked lentils',116,9,.4,20],['beans','Квасоля варена','Cooked beans',127,8.7,.5,22.8],['tofu','Тофу','Tofu',144,17.3,8.7,2.8],['cheese','Сир твердий','Hard cheese',350,25,27,2]
 ];
 function renderFoodCatalog(){
   const nutrition=$('nutrition'),form=$('gtFoodFormTitle')?.closest('.card');if(!nutrition||!form||$('gtFoodCatalogCard'))return;
   const card=document.createElement('div');card.id='gtFoodCatalogCard';card.className='card';card.innerHTML=`<div class="section-head"><h2>${tr('Автоматичний розрахунок БЖВ','Automatic protein, fat & carbs calculator')}</h2><span class="pill">${tr('На основі маси','By weight')}</span></div><p class="gt-muted">${tr('Обери продукт і введи його масу. Натисни кнопку, щоб автоматично порахувати калорії, білки, жири й вуглеводи та одразу додати продукт у щоденник. Для страв поза списком використовуй ручну форму нижче.','Choose a food and enter its weight. Press the button to calculate calories, protein, fat and carbs automatically and add the food to your diary. For foods not listed, use the manual form below.')}</p><div class="gt-food-calc-grid"><label>${tr('Продукт','Food')}<select id="gtFoodCatalogSelect"><option value="">${tr('Вибрати продукт…','Select a food…')}</option>${FOOD_DB.map(f=>`<option value="${f[0]}">${esc(en()?f[2]:f[1])}</option>`).join('')}</select></label><label>${tr('Маса, г','Weight, g')}<input id="gtFoodGrams" type="number" min="1" max="5000" step="1" value="100" inputmode="decimal"></label><button id="gtFoodCalculate" type="button" class="btn">${tr('Розрахувати й додати','Calculate & add')}</button></div><div id="gtFoodCalcResult" class="gt-food-calc-result" aria-live="polite">${tr('Вибери продукт, щоб побачити розрахунок.','Choose a food to see the calculation.')}</div>`;
   form.insertAdjacentElement('beforebegin',card);
   if(!$('gt-food-calc-style')){const st=document.createElement('style');st.id='gt-food-calc-style';st.textContent=`.gt-food-calc-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(100px,1fr) auto;gap:10px;align-items:end}.gt-food-calc-grid label{display:grid;gap:6px;font-size:13px;color:var(--muted)}.gt-food-calc-grid input,.gt-food-calc-grid select{min-width:0;width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--text);padding:11px}.gt-food-calc-result{margin-top:12px;padding:12px;border-radius:12px;background:var(--panel2);color:var(--text);font-size:13px;line-height:1.6}.gt-food-calc-result b{font-size:14px}@media(max-width:620px){.gt-food-calc-grid{grid-template-columns:1fr 1fr}.gt-food-calc-grid label:first-child{grid-column:1/-1}.gt-food-calc-grid button{grid-column:1/-1}}`;document.head.appendChild(st)}
   $('gtFoodCatalogSelect').addEventListener('change',()=>calculateSelectedFood(false,false));$('gtFoodGrams').addEventListener('input',()=>calculateSelectedFood(false,false));$('gtFoodCalculate').addEventListener('click',()=>calculateSelectedFood(true,true));
 }
 function calculateSelectedFood(fill,saveToDiary){
   const key=$('gtFoodCatalogSelect')?.value,grams=Number($('gtFoodGrams')?.value)||0,food=FOOD_DB.find(f=>f[0]===key),result=$('gtFoodCalcResult');if(!food||grams<=0){if(result)result.textContent=tr('Вибери продукт і введи масу більше нуля.','Select a food and enter a weight greater than zero.');return}
   const factor=grams/100,[,nameUk,nameEn,k,p,f,c]=food;const vals=[k,p,f,c].map(x=>Math.round(x*factor*10)/10);const text=`${Math.round(vals[0])} ${tr('ккал','kcal')} · ${vals[1]} ${tr('г білків','g protein')} · ${vals[2]} ${tr('г жирів','g fat')} · ${vals[3]} ${tr('г вуглеводів','g carbs')}`;
   if(result)result.innerHTML=`<b>${esc(en()?nameEn:nameUk)} · ${grams} ${tr('г','g')}</b><br>${esc(text)}<small style="display:block;color:var(--muted);margin-top:5px">${tr('Значення усереднені; бренди та спосіб приготування відрізняються.','Values are approximate; brands and cooking methods vary.')}</small>`;
   if(fill){if($('gtFoodName'))$('gtFoodName').value=(en()?nameEn:nameUk)+`, ${grams} ${tr('г','g')}`;if($('gtFoodKcal'))$('gtFoodKcal').value=String(Math.round(vals[0]));if($('gtFoodP'))$('gtFoodP').value=String(vals[1]);if($('gtFoodF'))$('gtFoodF').value=String(vals[2]);if($('gtFoodC'))$('gtFoodC').value=String(vals[3]);if(saveToDiary&&typeof window.gtSaveFood==='function'){window.gtSaveFood();if(result)result.innerHTML+=`<div style="margin-top:8px;color:#c28ee4;font-weight:700">✓ ${tr('Додано в щоденник. Підсумок дня оновлено.','Added to diary. Daily totals updated.')}</div>`}else $('gtFoodFormTitle')?.scrollIntoView({behavior:'smooth',block:'start'})}
 }
 const oldRenderFood=window.gtRenderFood;
 if(typeof oldRenderFood==='function'&&!oldRenderFood.__gtBjuSync){const wrapped=function(...args){const result=oldRenderFood.apply(this,args);window.gtRenderMacros?.();return result};wrapped.__gtBjuSync=true;window.gtRenderFood=wrapped}
 const oldSaveFood=window.gtSaveFood;
 if(typeof oldSaveFood==='function'&&!oldSaveFood.__gtKcalFromMacros){const wrapped=function(...args){const kcal=$('gtFoodKcal'),p=Number($('gtFoodP')?.value)||0,f=Number($('gtFoodF')?.value)||0,c=Number($('gtFoodC')?.value)||0;if(kcal&&kcal.value.trim()==='')kcal.value=String(Math.round(p*4+f*9+c*4));return oldSaveFood.apply(this,args)};wrapped.__gtKcalFromMacros=true;window.gtSaveFood=wrapped}

 // Browser notifications while the coach dashboard is open. Email webhook (in bundle) covers closed tabs.
 function addOwnerNotificationControls(){
   const inbox=$('coach-inbox'),hero=inbox?.querySelector('.gt-chat-hero');if(!inbox||!hero||$('gtOwnerNotifyCard'))return;
   const card=document.createElement('div');card.id='gtOwnerNotifyCard';card.className='card';card.innerHTML=`<div class="section-head"><h3>${tr('Сповіщення про повідомлення клієнтів','Client message notifications')}</h3><span class="pill" id="gtOwnerNotifyStatus">${tr('Не ввімкнено','Not enabled')}</span></div><p class="hint">${tr('Увімкни сповіщення браузера, щоб бачити нові повідомлення, поки сайт відкритий. Для листів навіть коли сайт закритий налаштуй email webhook з комплекту.','Enable browser notifications for new messages while the site is open. For email when the site is closed, set up the email webhook included in the bundle.')}</p><button type="button" class="btn" id="gtOwnerNotifyEnable">${tr('Увімкнути сповіщення браузера','Enable browser notifications')}</button><span class="hint" id="gtOwnerNotifyHint" role="status"></span>`;hero.insertAdjacentElement('afterend',card);
   const status=$('gtOwnerNotifyStatus'),button=$('gtOwnerNotifyEnable'),hint=$('gtOwnerNotifyHint');if('Notification' in window&&Notification.permission==='granted'){status.textContent=tr('Увімкнено','Enabled');button.textContent=tr('Сповіщення ввімкнено','Notifications enabled')}else if('Notification' in window&&Notification.permission==='denied'){status.textContent=tr('Заблоковано браузером','Blocked by browser');button.disabled=true;hint.textContent=tr('Дозволь сповіщення для цього сайту в налаштуваннях браузера.','Allow notifications for this website in browser settings.')}
   button.onclick=async()=>{if(!('Notification' in window)){hint.textContent=tr('Цей браузер не підтримує системні сповіщення. Email-сповіщення можна налаштувати сервером.','This browser does not support notifications. Server email notifications can still be configured.');return}const perm=await Notification.requestPermission();status.textContent=perm==='granted'?tr('Увімкнено','Enabled'):tr('Не надано дозвіл','Permission not granted');if(perm==='granted'){button.textContent=tr('Сповіщення ввімкнено','Notifications enabled');hint.textContent=tr('Покажи тестове сповіщення','Send a test notification');const test=document.createElement('button');test.type='button';test.className='gtcal-secondary';test.style.marginLeft='8px';test.textContent=tr('Тест','Test');test.onclick=()=>new Notification('Strenova',{body:tr('Сповіщення працюють.','Notifications are working.')});if(!card.querySelector('[data-gt-notify-test]')){test.dataset.gtNotifyTest='1';button.insertAdjacentElement('afterend',test)}}};
 }
 function subscribeOwnerMessages(){
   const sb=(()=>{try{return typeof gtSupabase!=='undefined'?gtSupabase:null}catch(_){return null}})();if(!sb?.channel||notificationChannel)return;
   const user=currentUserSafe();if(!user)return;
   const isCoach=!!document.querySelector('#nav [data-page="coach-inbox"]');if(!isCoach)return;
   readLastNotified();
   notificationUserId=String(user.id);notificationChannel=sb.channel('gt-owner-client-notifications-'+user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'gt_coach_messages'},payload=>{
     const m=payload?.new;if(!m||String(m.sender_id)!==String(m.user_id)||!m.id||lastNotified.has(String(m.id)))return;storeLastNotified(m.id);
     const label=m.sender_name||m.sender_email||tr('Клієнт Strenova','Strenova client');const body=String(m.body||'').slice(0,160);
     if('Notification' in window&&Notification.permission==='granted'){try{const n=new Notification(tr('Нове повідомлення Strenova','New Strenova message'),{body:`${label}: ${body}`,tag:String(m.id)});n.onclick=()=>{window.focus();window.showPage?.('coach-inbox');window.gtOpenCoachThread?.(m.user_id);n.close()}}catch(_){}}
     if(!$('gtOwnerNewMessageBadge')){const nav=document.querySelector('#nav [data-page="coach-inbox"]');if(nav){const badge=document.createElement('span');badge.id='gtOwnerNewMessageBadge';badge.textContent='•';badge.setAttribute('aria-label',tr('Нове повідомлення','New message'));nav.appendChild(badge);nav.style.position='relative'}}
   }).subscribe();
 }
 function mountOwnerNotifications(){addOwnerNotificationControls();subscribeOwnerMessages()}
 window.addEventListener('focus',()=>{subscribeOwnerMessages();if($('coach-inbox')?.classList.contains('active'))mountOwnerNotifications()});
 // The original app has its own auth listener; use retries and role/nav observation so notifications attach after login.
 const mountAllReworkedSurfaces=()=>{mountCalendarInProfile();renderFoodCatalog();mountOwnerNotifications();subscribeOwnerMessages();};
 setTimeout(mountAllReworkedSurfaces,80);
 setTimeout(mountAllReworkedSurfaces,700);
 setTimeout(mountAllReworkedSurfaces,1800);
 document.addEventListener('DOMContentLoaded',mountAllReworkedSurfaces);
 const navRoot=$('nav');
 if(navRoot&&window.MutationObserver){const navObserver=new MutationObserver(()=>{if(document.querySelector('#nav [data-page="coach-inbox"]')){mountOwnerNotifications();subscribeOwnerMessages();}});navObserver.observe(navRoot,{childList:true,subtree:true});}
 try{if(typeof gtSupabase!=='undefined'&&gtSupabase?.auth?.onAuthStateChange){gtSupabase.auth.onAuthStateChange((_event,session)=>{const nextUser=String(session?.user?.id||'');if(nextUser!==notificationUserId){try{if(notificationChannel)gtSupabase.removeChannel(notificationChannel)}catch(_){}notificationChannel=null;notificationUserId=nextUser;lastNotified=new Set();}setTimeout(mountAllReworkedSurfaces,350);});}}catch(err){console.warn('Coach notification auth hook unavailable',err?.message||err)}
 window.addEventListener('storage',e=>{if(e.key==='gtai_schedule'){try{gtSchedule=JSON.parse(e.newValue||'[]')}catch(_){ }renderCalendar()}});
})();
