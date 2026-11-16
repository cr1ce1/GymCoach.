(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const en=()=>String(document.documentElement.lang||'uk').toLowerCase().startsWith('en');
 const tr=(uk,english)=>en()?english:uk;
 const css=document.createElement('style');
 css.textContent=`
  #profile .gt-profile-overview{position:relative;align-items:center;padding-right:14px;flex-wrap:wrap}
  #profile .gt-profile-overview>div:nth-child(2){flex:1;min-width:150px}
  #profile .gtProfileToggle{margin-left:auto;flex:none;border:1px solid #593174;border-radius:12px;background:#2c123e;color:#f0dbfe;padding:9px 12px;font-weight:800;cursor:pointer}
  #profile .gt-profile-card-collapsed>:not(.gt-profile-overview){display:none!important}
  #profile .gt-profile-calendar{display:block!important;position:relative;overflow:hidden;padding:14px;border:1px solid #492660;border-radius:22px;background:linear-gradient(145deg,#230e31,#190a23);margin:14px 0 18px}
  #profile .gt-profile-calendar>.section-head{margin-top:0}
  #profile .gt-profile-calendar .gt-calendar-shell{margin-top:12px}
  #gtCalendarLock,#coach-live .gt-chat-lock{position:absolute;z-index:20;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;background:rgba(17,5,25,.86);border:1px solid #593174;border-radius:20px;backdrop-filter:blur(7px);color:#f5e6ff;line-height:1.6}
  #gtCalendarLock .gt-lock-icon,#coach-live .gt-chat-lock .gt-lock-icon{font-size:38px;line-height:1}
  #gtCalendarLock strong,#coach-live .gt-chat-lock strong{font-size:18px;color:#fff}
  #gtCalendarLock p,#coach-live .gt-chat-lock p{max-width:460px;margin:0;color:#d9bfeb}
  #gtCalendarLock button,#coach-live .gt-chat-lock button{border:0;border-radius:12px;padding:12px 17px;background:linear-gradient(100deg,#b54ff8,#bc60fa);color:#1a0726;font-weight:900;cursor:pointer}
  #coach-live .gt-chat-layout{position:relative}
  #coach-live .gt-chat-layout.gt-locked{filter:none}
  #coach-live .gt-chat-layout.gt-locked>*:not(.gt-chat-lock){filter:blur(2px);opacity:.42;pointer-events:none;user-select:none}
  #coach-live .gt-chat-lock{position:absolute;inset:0;min-height:100%;width:100%;box-sizing:border-box}
  #gtEnergyBreakdown .gt-metrics{margin-top:10px}
  #gtEnergyBreakdown .gt-metric strong{font-size:clamp(18px,3vw,26px)}
  @media(max-width:600px){#profile .gtProfileToggle{width:100%;margin-left:0}#profile .gt-profile-calendar{padding:10px}}
 `;
 document.head.appendChild(css);

 function mountProfileCalendar(){
  const profileSec=$('profile'),calendar=$('calendar');
  if(!profileSec||!calendar)return;
  const cards=[...profileSec.querySelectorAll(':scope > .card')];
  const mainCard=cards[0];
  calendar.classList.remove('page','active');
  calendar.classList.add('gt-profile-calendar');
  calendar.setAttribute('aria-label',tr('Календар тренувань профілю','Profile workout calendar'));
  if(mainCard&&calendar.parentElement!==profileSec)mainCard.insertAdjacentElement('afterend',calendar);
  else if(mainCard&&calendar.previousElementSibling!==mainCard)mainCard.insertAdjacentElement('afterend',calendar);
  if(!$('gtCalendarLock')){
   const lock=document.createElement('div');lock.id='gtCalendarLock';lock.innerHTML=`<div class="gt-lock-icon" aria-hidden="true"><svg class="gc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><strong>${tr('Календар — можливість Strenova Plus','Calendar is a Strenova Plus feature')}</strong><p>${tr('Оформи Plus, щоб планувати тренування, переглядати розклад і змінювати дати занять.','Upgrade to Plus to plan workouts, view your schedule and reschedule sessions.')}</p><button type="button" onclick="gtOpenPlusFromLock()">${tr('Відкрити Strenova Plus','View Strenova Plus')} →</button>`;
   calendar.appendChild(lock);
  }
 }
 window.gtOpenPlusFromLock=function(){window.gtRenderSubscription?.();window.showPage?.('subscription')};

 function mountCoachLock(){
  const live=$('coach-live');if(!live)return;
  const layout=live.querySelector('.gt-chat-layout');if(!layout)return;
  let lock=$('gtCoachLock');
  if(!lock){lock=document.createElement('div');lock.id='gtCoachLock';lock.className='gt-chat-lock';layout.appendChild(lock)}
  else if(lock.parentElement!==layout)layout.appendChild(lock);
  lock.innerHTML=`<div class="gt-lock-icon" aria-hidden="true"><svg class="gc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><strong>${tr('Особистий чат із тренером','Personal chat with your coach')}</strong><p>${tr('Тут ти зможеш писати мені напряму, отримувати відповіді та узгоджувати зміни у своєму плані. Доступ відкривається з активним Strenova Plus.','Message me directly, get replies and discuss updates to your workout plan. Access unlocks with an active Strenova Plus membership.')}</p><button type="button" onclick="gtOpenPlusFromLock()">${tr('Оформити Plus','Get Plus')} →</button>`;
 }

 window.gtUpdatePremiumSurfaces=function(isPlus){
  const unlocked=!!isPlus;
  const calLock=$('gtCalendarLock');
  if(calLock){calLock.style.display=unlocked?'none':'flex';calLock.setAttribute('aria-hidden',unlocked?'true':'false')}
  const layout=$('coach-live')?.querySelector('.gt-chat-layout');
  const chatLock=$('gtCoachLock');
  if(layout)layout.classList.toggle('gt-locked',!unlocked);
  if(chatLock){
   chatLock.style.display=unlocked?'none':'flex';chatLock.setAttribute('aria-hidden',unlocked?'true':'false');
   if(!unlocked)chatLock.innerHTML=`<div class="gt-lock-icon" aria-hidden="true"><svg class="gc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><strong>${tr('Особистий чат із тренером','Personal chat with your coach')}</strong><p>${tr('Тут ти зможеш писати мені напряму, отримувати відповіді та узгоджувати зміни у своєму плані. Доступ відкривається з активним Strenova Plus.','Message me directly, get replies and discuss updates to your workout plan. Access unlocks with an active Strenova Plus membership.')}</p><button type="button" onclick="gtOpenPlusFromLock()">${tr('Оформити Plus','Get Plus')} →</button>`;
  }
 };

 function setupProfileCollapse(){
  const profileSec=$('profile'),card=profileSec?.querySelector(':scope > .card');
  if(!card)return;
  const overview=card.querySelector('.gt-profile-overview');
  if(!overview||overview.querySelector('.gtProfileToggle'))return;
  const button=document.createElement('button');button.type='button';button.className='gtProfileToggle';button.setAttribute('aria-expanded','false');
  const setCollapsed=collapsed=>{
   card.classList.toggle('gt-profile-card-collapsed',collapsed);
   button.setAttribute('aria-expanded',collapsed?'false':'true');
   button.textContent=collapsed?tr('✎ Редагувати профіль','✎ Edit profile'):tr('Згорнути профіль ↑','Collapse profile ↑');
  };
  button.addEventListener('click',()=>setCollapsed(!card.classList.contains('gt-profile-card-collapsed')));
  overview.appendChild(button);
  setCollapsed(!!(typeof profile!=='undefined'&&profile));
  window.gtCollapseProfileCard=()=>setCollapsed(true);
 }

 // Replace the standalone calendar page with its contents inside the profile, immediately under the profile card.
 function mountAll(){
  mountProfileCalendar();
  setupProfileCollapse();
  mountCoachLock();
  const c=$('coach-live');
  if(c){const title=c.querySelector('.gt-chat-hero h1');if(title)title.textContent=tr('Чат зі мною','Chat with me');const para=c.querySelector('.gt-chat-hero p');if(para)para.textContent=tr('Напиши мені щодо техніки вправ, розкладу або змін у плані. Я відповідаю особисто, коли переглядаю повідомлення.','Message me about exercise technique, your schedule or plan changes. I reply personally when I review messages.')}
  const oldGate=$('gtCoachLock');
  const isPlus=oldGate?oldGate.style.display==='none':false;
  window.gtUpdatePremiumSurfaces(isPlus);
  if(typeof window.gtRenderSchedule==='function')window.gtRenderSchedule();
  if(typeof window.gtEstimateNutrition==='function')window.gtEstimateNutrition();
 }

 // Route old AI coach links to the human chat; route any legacy calendar link to Profile.
 const prevShow=window.showPage;
 if(typeof prevShow==='function'&&!prevShow.__gtNewRoutes){
  const wrapped=function(id){
   if(id==='coach')id='coach-live';
   if(id==='calendar'){
    prevShow('profile');
    mountProfileCalendar();
    setTimeout(()=>{$('calendar')?.scrollIntoView({behavior:'smooth',block:'start'})},40);
    return;
   }
   prevShow(id);
   if(id==='profile'){
    mountProfileCalendar();setupProfileCollapse();
    setTimeout(()=>{$('calendar')?.classList.add('gt-profile-calendar')},0);
   }
   if(id==='coach-live'){
    mountCoachLock();
    // Existing access control sets the real state; never treat a missing configuration as paid.
    setTimeout(()=>window.gtUpdatePremiumSurfaces($('gtCoachLock')?.style.display==='none'),0);
   }
  };
  wrapped.__gtNewRoutes=true;window.showPage=wrapped;
 }

 // Avoid stale locks after a hosted checkout returns to the site; access still depends on Supabase confirmation.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&typeof window.gtRefreshPlusAccess==='function')window.gtRefreshPlusAccess()});
 window.addEventListener('focus',()=>{if(typeof window.gtRefreshPlusAccess==='function')window.gtRefreshPlusAccess()});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountAll);else mountAll();

 // New nutrition estimate: adult BMR -> activity-adjusted TDEE -> goal adjustment -> 4/9/4 macros.
 function makeEnergyCard(){
  const nutrition=$('nutrition');if(!nutrition||$('gtEnergyBreakdown'))return;
  const card=document.createElement('div');card.className='card';card.id='gtEnergyBreakdown';
  card.innerHTML=`<div class="section-head"><h2>${tr('Розрахунок енерговитрат','Energy estimate')}</h2><span class="pill">${tr('За профілем','From profile')}</span></div><div class="gt-metrics"><div class="gt-metric"><strong id="gtBMRValue">—</strong><small>BMR · ${tr('ккал у спокої','kcal at rest')}</small></div><div class="gt-metric"><strong id="gtTDEEValue">—</strong><small>TDEE · ${tr('до корекції мети','before goal adjustment')}</small></div></div><p id="gtEnergyFormula" class="gt-muted">${tr('Заповни профіль, щоб побачити орієнтовний розрахунок.','Complete your profile for an estimated calculation.')}</p>`;
  const first=nutrition.querySelector(':scope > .card');
  if(first)first.insertAdjacentElement('afterend',card);else nutrition.prepend(card);
 }
 window.gtRenderMacros=function(){
  const p=(typeof profile!=='undefined'&&profile)||{};
  const box=$('gtMacroAdvice');if(!box)return;
  const age=Number(p.age),kg=Number(p.weight),energyText=String($('gtTargetKcal')?.textContent||'');
  const set=(id,value)=>{if($(id))$(id).textContent=value};
  if(!(age>0&&kg>0)){
   set('gtMacroP','—');set('gtMacroF','—');set('gtMacroC','—');
   box.textContent=tr('Заповни вік і вагу в профілі, щоб отримати орієнтовну інформацію про КБЖВ.','Enter age and weight in your profile for an estimated macro breakdown.');return;
  }
  if(age<18){
   // Growing users do not receive calorie-deficit or macro-restriction targets.
   set('gtMacroP',tr('за потребою','as needed'));set('gtMacroF',tr('за потребою','as needed'));set('gtMacroC',tr('за потребою','as needed'));
   box.textContent=tr('До 18 років не розраховуємо цільові грами КБЖВ за дорослою формулою. Потреби залежать від росту й спорту; їж регулярно та різноманітно. За персональними нормами звернись до сімейного лікаря або дієтолога.','Under 18, adult macro-target formulas are not used. Needs vary with growth and sport; eat regularly and diversely. Ask a qualified health professional for personalized guidance.');
   return;
  }
  const target=Number(energyText.replace(/[^\d]/g,''))||0;
  if(!target){set('gtMacroP','—');set('gtMacroF','—');set('gtMacroC','—');box.textContent=tr('Для розподілу КБЖВ заповни зріст, вагу, вік, стать і активність.','Enter height, weight, age, sex and activity for a macro estimate.');return;}
  const goal=p.goal||'maintain';
  const proteinRate=(goal==='muscle'?1.8:goal==='strength'?1.7:goal==='endurance'?1.5:goal==='sport'?1.6:1.4);
  const protein=Math.round(kg*proteinRate);
  const fat=Math.round(Math.max(kg,target*0.25/9));
  const carbs=Math.max(0,Math.round((target-protein*4-fat*9)/4));
  set('gtMacroP',protein+' г');set('gtMacroF',fat+' г');set('gtMacroC',carbs+' г');
  box.textContent=tr(`Білки: ${proteinRate.toLocaleString('uk-UA')} г/кг; жири — близько 25% енергії, але не менше орієнтира 1 г/кг; вуглеводи — залишок за формулою 4 ккал/г білка, 9 ккал/г жиру й 4 ккал/г вуглеводів. Це оцінка, не медичний припис.`,`Protein: ${proteinRate.toLocaleString('en-US')} g/kg; fat: about 25% of energy, with a 1 g/kg guide minimum; carbohydrates provide the remaining energy using 4 kcal/g protein, 9 kcal/g fat and 4 kcal/g carbs. Estimate only, not medical advice.`);
 };
 window.gtEstimateNutrition=function(){
  const p=(typeof profile!=='undefined'&&profile)||{};
  const out=$('gtTargetKcal'),advice=$('gtNutritionAdvice');
  if(!out||!advice)return;
  makeEnergyCard();
  const set=(id,value)=>{if($(id))$(id).textContent=value};
  const age=Number(p.age),kg=Number(p.weight),cm=Number(p.height),sex=p.sex||'unspecified';
  const mults={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9};
  const mult=mults[p.activity]||1.55;
  let bmr=null,tdee=null,target=null;
  if(age>0&&age<18){
   let low,high;
   if(age<=13){low=sex==='male'?2300:2100;high=sex==='male'?2600:2400}
   else if(age<=17){low=sex==='male'?2700:2200;high=sex==='male'?3200:2800}
   else{low=2200;high=2800}
   const bump={sedentary:0,light:0,moderate:100,active:200,very_active:300}[p.activity]||0;
   low+=bump;high+=bump;
   out.textContent=`${low.toLocaleString('uk-UA')}–${high.toLocaleString('uk-UA')}`;
   set('gtBMRValue','—');set('gtTDEEValue','—');
   set('gtEnergyFormula',tr('Для підлітків показано лише широкий віковий орієнтир; формули дорослих і корекція калорій за метою тут не застосовуються.','For teens, only a broad age-based reference is shown; adult formulas and goal-based calorie adjustments are not applied.'));
   advice.textContent=tr('Це широкий віковий орієнтир, а не персональна норма. Потреби змінюються через ріст і спорт; не використовуй його для обмеження їжі або схуднення. За персональними рекомендаціями звернись до сімейного лікаря чи дієтолога.','This is a broad age-based reference, not a personalized target. Needs vary with growth and sport; do not use it to restrict food or lose weight. Ask a qualified health professional for personalized guidance.');
  }else if(age>=18&&kg>0&&cm>0&&sex!=='unspecified'){
   bmr=10*kg+6.25*cm-5*age+(sex==='male'?5:-161);
   tdee=bmr*mult;
   target=tdee;
   let goalNote=tr('підтримка ваги','weight maintenance');
   if(p.goal==='lose'){target=tdee*.85;goalNote=tr('орієнтовне коригування −15% для дорослих','an estimated −15% adjustment for adults')}
   else if(p.goal==='muscle'){target=tdee*1.10;goalNote=tr('орієнтовне коригування +10% для дорослих','an estimated +10% adjustment for adults')}
   target=Math.round(target);bmr=Math.round(bmr);tdee=Math.round(tdee);
   out.textContent=target.toLocaleString('uk-UA');
   set('gtBMRValue',bmr.toLocaleString('uk-UA'));set('gtTDEEValue',tdee.toLocaleString('uk-UA'));
   set('gtEnergyFormula',tr(`BMR = 10 × ${kg} + 6,25 × ${cm} − 5 × ${age} ${sex==='male'?'+ 5':'− 161'} = ${bmr} ккал. TDEE = BMR × ${mult} = ${tdee} ккал. Мета: ${goalNote}.`,`BMR = 10 × ${kg} + 6.25 × ${cm} − 5 × ${age} ${sex==='male'?'+ 5':'− 161'} = ${bmr} kcal. TDEE = BMR × ${mult} = ${tdee} kcal. Goal adjustment: ${goalNote}.`));
   advice.textContent=tr('Це приблизний розрахунок за Міффліном—Сан Жеором. Реальні потреби можуть відрізнятись через здоров’я, склад тіла та інтенсивність тренувань.','This is an estimate using Mifflin–St Jeor. Actual needs vary with health, body composition and workout intensity.');
  }else{
   out.textContent='—';set('gtBMRValue','—');set('gtTDEEValue','—');
   set('gtEnergyFormula',tr('Заповни вік, зріст, вагу, стать та активність у профілі.','Enter age, height, weight, sex and activity in your profile.'));
   advice.textContent=tr('Для розрахунку дорослого потрібні вік, зріст, вага та стать для формули.','Age, height, weight and sex for the formula are required for the adult estimate.');
  }
  const total=Number($('gtKcal')?.textContent)||0,bar=$('gtKcalProgress');
  if(bar)bar.style.width=(target?Math.min(100,total/target*100):0)+'%';
  window.gtRenderMacros?.();
 };

 // Recalculate immediately after any profile save and whenever nutrition is opened.
 const oldSaveEdited=window.saveEditedProfile;
 if(typeof oldSaveEdited==='function'&&!oldSaveEdited.__gtMacroSave){
  const wrapped=function(){oldSaveEdited();setTimeout(()=>{window.gtEstimateNutrition?.();window.gtCollapseProfileCard?.()},0)};
  wrapped.__gtMacroSave=true;window.saveEditedProfile=wrapped;
 }
 const oldSaveProfile=window.saveProfile;
 if(typeof oldSaveProfile==='function'&&!oldSaveProfile.__gtMacroSave){
  const wrapped=function(){oldSaveProfile();setTimeout(()=>window.gtEstimateNutrition?.(),0)};
  wrapped.__gtMacroSave=true;window.saveProfile=wrapped;
 }
 const priorShow=window.showPage;
 if(typeof priorShow==='function'&&!priorShow.__gtMacroRefresh){
  const wrapped=function(id){priorShow(id);if(id==='nutrition'){window.gtEstimateNutrition?.()}if(id==='profile'){setupProfileCollapse();mountProfileCalendar()}};
  wrapped.__gtMacroRefresh=true;window.showPage=wrapped;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{makeEnergyCard();window.gtEstimateNutrition?.()});
 else {makeEnergyCard();window.gtEstimateNutrition?.()}
})();
