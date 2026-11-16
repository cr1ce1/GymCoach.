/* Customizable training plan + macro guide */
(function(){
 const $=id=>document.getElementById(id);
 const key='gtai_custom_plan';
 const weekdays=[['1','Понеділок'],['2','Вівторок'],['3','Середа'],['4','Четвер'],['5','П’ятниця'],['6','Субота'],['0','Неділя']];
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}};
 const save=o=>{localStorage.setItem(key,JSON.stringify(o));};
 function defaults(){const p=read();if(!p.type)p.type=((typeof profile!=='undefined'&&profile&&Number(profile.days)>=4)?'upper':'full');if(!p.days)p.days=['2','4','6'].slice(0,Math.max(2,Math.min(5,Number((typeof profile!=='undefined'&&profile)?profile.days:3)||3)));return p}
 function addUI(){
  const section=$('recommend');if(!section||$('gtPlanEditor'))return;
  const card=document.createElement('div');card.className='card';card.id='gtPlanEditor';
  card.innerHTML=`<div class="section-head"><h2>⚙️ Налаштування плану</h2><span class="pill">Автопідбір</span></div>
  <p class="muted">Програма запропонує розподіл за кількістю тренувань, але ти можеш змінити його та додати власні вправи.</p>
  <div class="field"><label for="gtPlanType">Тип програми</label><select id="gtPlanType"><option value="auto">Рекомендувати автоматично</option><option value="full">Full Body — усе тіло</option><option value="split">Split — окремі групи м’язів</option><option value="upper">Upper/Lower — верх / низ</option></select></div>
  <div class="field"><label>Дні тренувань</label><div class="chips" id="gtWeekdays">${weekdays.map(([v,n])=>`<label class="chip" style="display:flex;align-items:center;gap:6px"><input type="checkbox" value="${v}" style="width:auto;padding:0!important">${n}</label>`).join('')}</div><p class="hint">Для 3 занять типовий варіант — вівторок, четвер і субота.</p></div>
  <div class="field"><label for="gtPlanWish">Побажання та обмеження</label><textarea id="gtPlanWish" rows="2" placeholder="Наприклад: не хочу тренувати ноги; без стрибків"></textarea></div>
  <div class="field"><label for="gtOwnExercises">Мої вправи (по одній на рядок)</label><textarea id="gtOwnExercises" rows="3" placeholder="Наприклад: підтягування\\nжим гантелей"></textarea></div>
  <button class="btn full" id="gtSavePlan">Зберегти та оновити план</button>`;
  section.insertBefore(card,section.querySelector('#planTitle')?.closest('.card')||section.children[1]);
  const p=defaults();$('gtPlanType').value=p.type;$('gtPlanWish').value=p.wish||'';$('gtOwnExercises').value=(p.own||[]).join('\\n');
  document.querySelectorAll('#gtWeekdays input').forEach(x=>x.checked=p.days.includes(x.value));
  $('gtSavePlan').onclick=()=>{
   const selected=[...document.querySelectorAll('#gtWeekdays input:checked')].map(x=>x.value);
   if(!selected.length){alert('Обери хоча б один день тренування.');return}
   const settings={type:$('gtPlanType').value,days:selected,wish:$('gtPlanWish').value.trim(),own:$('gtOwnExercises').value.split('\\n').map(x=>x.trim()).filter(Boolean)};
   save(settings);
   if(typeof profile!=='undefined'&&profile){profile.days=selected.length;localStorage.setItem('gtai_profile',JSON.stringify(profile))}
   renderPlan();if(typeof window.gtGenerateSchedule==='function'){} 
   const msg=$('gtPlanSavedMsg');if(msg)msg.textContent='План збережено.';
  };
  const msg=document.createElement('p');msg.id='gtPlanSavedMsg';msg.className='hint';card.append(msg);
 }
 const oldBuild=window.buildPlan;
 if(typeof oldBuild==='function')window.buildPlan=function(){
  const plan=oldBuild();const cfg=read();if(!cfg.type)return plan;
  const wish=(cfg.wish||'').toLowerCase();
  const avoidLegs=/не хочу.*ног|без ног|не тренув.*ног|avoid legs|no legs/.test(wish);
  const avoidJump=/без стриб|не хочу стриб|no jump/.test(wish);
  const categorize=e=>{const n=(e[0]+' '+(e[1]||'')).toLowerCase();
   if(/ног|присід|випад|литк|квадриц|leg|squat|lunge|calf|сіднич|румунськ/.test(n))return 'lower';
   if(/груд|жим|віджим|спин|тяг|плеч|біцеп|трицеп|рук|chest|back|shoulder|arm|pull|push/.test(n))return 'upper';
   return 'core';
  };
  let type=cfg.type;
  if(type==='auto')type=(Number(profile?.days)>=4?'upper':'full');
  if(avoidLegs)plan.days=plan.days.map(d=>({...d,items:d.items.filter(e=>categorize(e)!=='lower')}));
  if(avoidJump)plan.days=plan.days.map(d=>({...d,items:d.items.filter(e=>!/стриб|jump/i.test(e[0]))}));
  if(cfg.own?.length)plan.days[0]?.items.push(...cfg.own.map(n=>[n,'Власна вправа']));
  if(type==='split'){
   const n=plan.days.length;
   plan.days=plan.days.map((d,i)=>({...d,title:`${i+1}. ${i%2===0?'Груди, плечі й трицепс':'Спина й біцепс'}`}));
  }else if(type==='upper'){
   plan.days=plan.days.map((d,i)=>({...d,title:`${i+1}. ${i%2===0?'Upper — верх тіла':'Lower — низ тіла'}`,items:(i%2===0?d.items.filter(e=>categorize(e)!=='lower'):d.items.filter(e=>categorize(e)!=='upper'))}));
  }else plan.days=plan.days.map((d,i)=>({...d,title:`${i+1}. Full Body — усе тіло`}));
  if(cfg.days?.length)plan.days=plan.days.map((d,i)=>({...d,title:`${weekdays.find(w=>w[0]===cfg.days[i%cfg.days.length])?.[1]||'День тренування'} · ${d.title.split(' · ').pop()}`}));
  if(avoidLegs)plan.title+=' · без вправ на ноги';
  return plan;
 };
 const oldRender=window.renderPlan;
 if(typeof oldRender==='function')window.renderPlan=function(){oldRender();addUI();};
 // Macro targets use the app's existing energy estimate where available; no calorie target is changed.
 window.gtRenderMacros=function(){
  const p=(typeof profile!=='undefined'&&profile)||{};const box=$('gtMacroAdvice');if(!box)return;
  if(!p.weight||!p.age){box.textContent='Заповни вік і вагу в профілі, щоб отримати орієнтовний розподіл БЖВ.';return}
  const kg=Number(p.weight),age=Number(p.age),goal=p.goal||'maintain';
  const protein=age<18?Math.round(kg*1.3):Math.round(kg*(goal==='muscle'||goal==='strength'?1.6:goal==='endurance'?1.4:1.2));
  const fat=Math.round(kg*(age<18?.9:.8));
  const kcalText=$('gtTargetKcal')?.textContent||'';
  const energy=Number(kcalText.replace(/[^\d]/g,''))||null;
  let carbs=energy?Math.max(0,Math.round((energy-protein*4-fat*9)/4)):null;
  if(age<18)carbs=null; // avoid presenting a restrictive energy-derived target for growing teens
  $('gtMacroP').textContent=`${protein} г`; $('gtMacroF').textContent=`${fat} г`; $('gtMacroC').textContent=carbs===null?'за потребою':`${carbs} г`;
  box.textContent=age<18?'Орієнтир білка й жирів розраховано приблизно за масою тіла. У підлітковому віці потреби залежать від росту та спорту: не обмежуй вуглеводи й загальну кількість їжі; за точним планом звернись до лікаря або дієтолога.':
   `Орієнтир: білок за масою тіла та метою (${goal==='muscle'||goal==='strength'?'підтримка силових тренувань':'загальна активність'}), жири — приблизно 0,8 г/кг; вуглеводи — залишок від наявного енергетичного орієнтира. Це приблизні значення, не медичний припис.`;
 };
 function addMacroUI(){const nutrition=$('nutrition');if(!nutrition||$('gtMacroCard'))return;const card=document.createElement('div');card.className='card';card.id='gtMacroCard';card.innerHTML=`<div class="section-head"><h2>БЖВ на день</h2><span class="pill">Орієнтовно</span></div><div class="gt-metrics"><div class="gt-metric"><strong id="gtMacroP">—</strong><small>Білки</small></div><div class="gt-metric"><strong id="gtMacroF">—</strong><small>Жири</small></div><div class="gt-metric"><strong id="gtMacroC">—</strong><small>Вуглеводи</small></div></div><p id="gtMacroAdvice" class="gt-muted">Розрахунок залежить від профілю, ваги, віку та мети тренування.</p><p class="hint">Для дорослих використано орієнтири в г/кг і наявний енергетичний розрахунок застосунку. Для користувачів до 18 років показані лише загальні орієнтири без розрахунку вуглеводів від калорій.</p>`;nutrition.insertBefore(card,nutrition.children[1]);}
 const observer=new MutationObserver(()=>{if($('recommend')?.classList.contains('active'))addUI();if($('nutrition'))addMacroUI()});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addUI();addMacroUI();window.gtRenderMacros();});
 else {addUI();addMacroUI();window.gtRenderMacros()}

 const prevEstimate=window.gtEstimateNutrition;
 if(typeof prevEstimate==='function')window.gtEstimateNutrition=function(){prevEstimate();window.gtRenderMacros()};
 const oldShow=window.showPage;
 if(typeof oldShow==='function')window.showPage=function(id){oldShow(id);if(id==='recommend')addUI();if(id==='nutrition'){addMacroUI();window.gtRenderMacros()}};
})();
