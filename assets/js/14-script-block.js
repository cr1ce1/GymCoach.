/* Requested targeted updates: nutrition formulas, exercise technique links, more plan variants, theme-matched language switch. */
(function(){
 const $=id=>document.getElementById(id);
 const style=document.createElement('style');
 style.textContent=`
 .lang{display:inline-flex;align-items:center;gap:0;padding:4px;border-radius:999px;background:var(--panel);border:1px solid var(--line);min-width:112px;justify-content:space-between;color:var(--muted);box-shadow:inset 0 1px 5px #0005}
 .lang::before{content:'UA';display:inline-grid;place-items:center;min-width:48px;padding:7px 10px;border-radius:999px;font-size:12px;font-weight:900;order:1;color:var(--text)}
 .lang{font-size:0}.lang::after{content:'EN';display:inline-grid;place-items:center;min-width:48px;padding:7px 10px;border-radius:999px;font-size:12px;font-weight:900;order:2;color:var(--muted)}
 html[lang="en"] .lang::before{background:var(--lime);color:#14061e;order:2}
 html[lang="en"] .lang::after{order:1}
 html[lang="uk"] .lang::before{background:var(--lime);color:#14061e}
 .tech-video{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:7px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--lime);font-size:12px;font-weight:800;text-decoration:none}
 .tech-video:hover{border-color:var(--lime)}
 `;
 document.head.append(style);
 // Replace energy estimate with Mifflin–St Jeor and the supplied activity factors.
 window.gtEstimateNutrition=function(){
   const p=(typeof profile!=='undefined'&&profile)||{};
   const out=$('gtTargetKcal'),advice=$('gtNutritionAdvice');if(!out||!advice)return;
   const age=Number(p.age),kg=Number(p.weight),cm=Number(p.height),sex=p.sex;
   const factors={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9};
   if(!(age>0&&kg>0&&cm>0&&sex&&sex!=='unspecified')){
     out.textContent='—';advice.textContent='Заповни вік, зріст, вагу та стать у профілі для орієнтовного розрахунку за Міффліном—Сан Жеором.';window.gtRenderMacros?.();return;
   }
   const bmr=10*kg+6.25*cm-5*age+(sex==='male'?5:-161);
   let target=Math.round(bmr*(factors[p.activity]||1.55));
   // Do not prescribe weight-loss deficits or bulking surpluses to minors.
   if(age>=18){if(p.goal==='lose')target=Math.round(target*.85);else if(p.goal==='muscle')target=Math.round(target*1.10);}
   out.textContent=Math.round(target).toLocaleString('uk-UA');
   advice.textContent=age<18
     ? 'Орієнтир за формулою Міффліна—Сан Жеора; у підлітків формула може бути неточною через ріст. Не використовуй це число для обмеження їжі чи схуднення — за індивідуальними потребами звернись до сімейного лікаря або дієтолога.'
     : `BMR ${Math.round(bmr)} ккал × коефіцієнт активності ${factors[p.activity]||1.55}. ${p.goal==='lose'?'Для мети обрано помірне коригування −15%.':p.goal==='muscle'?'Для мети обрано +10%.':'Орієнтир для підтримки ваги.'} Це приблизна оцінка, не медична рекомендація.`;
   const total=Number($('gtKcal')?.textContent)||0,bar=$('gtKcalProgress');if(bar)bar.style.width=Math.min(100,total/target*100)+'%';
   window.gtRenderMacros?.();
 };
 // Macro targets follow the requested gram/kg method and 4/9/4 kcal values.
 window.gtRenderMacros=function(){
   const p=(typeof profile!=='undefined'&&profile)||{},box=$('gtMacroAdvice');
   if(!box||!p.weight||!p.age)return;
   const kg=Number(p.weight),age=Number(p.age),goal=p.goal||'maintain';
   const training=goal!=='general'&&goal!=='maintain';
   const protein=Math.round(kg*(training?1.6:age<18?1.2:1.0));
   const fat=Math.round(kg*(age<18?1.0:0.9));
   const kcal=Number(($('gtTargetKcal')?.textContent||'').replace(/[^\d]/g,''))||null;
   const carbs=kcal?Math.max(0,Math.round((kcal-protein*4-fat*9)/4)):null;
   if($('gtMacroP'))$('gtMacroP').textContent=protein+' г';
   if($('gtMacroF'))$('gtMacroF').textContent=fat+' г';
   if($('gtMacroC'))$('gtMacroC').textContent=carbs===null?'—':carbs+' г';
   box.textContent=age<18
    ? 'Приблизові орієнтири за масою тіла; потреби підлітків змінюються під час росту. Не обмежуй калорії або вуглеводи за цим числом.'
    : 'Розрахунок: білки 4 ккал/г, жири 9 ккал/г, вуглеводи 4 ккал/г. Білки та жири оцінено в г/кг, вуглеводи — як залишок калорій. Значення орієнтовні.';
 };
 // Give every displayed exercise a one-click video technique search, without changing existing exercise cards/layout.
 function addTechniqueLinks(){
   const areas=[...document.querySelectorAll('#exerciseList .session-main, #libraryList .exercise-card, #libraryList .card, #planDays .card')];
   areas.forEach(area=>{
     const name=area.querySelector('.session-ex-name, h3, .details b, b');
     if(!name||area.querySelector('.tech-video'))return;
     const exercise=name.textContent.trim();if(!exercise)return;
     const a=document.createElement('a');a.className='tech-video';a.target='_blank';a.rel='noopener noreferrer';
     a.href='https://www.youtube.com/results?search_query='+encodeURIComponent(exercise+' proper exercise technique tutorial');
     a.textContent=(document.documentElement.lang==='en'?'▶ Watch proper technique':'▶ Відео правильної техніки');
     name.insertAdjacentElement('afterend',a);
   });
 }
 const observer=new MutationObserver(()=>addTechniqueLinks());
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',()=>{addTechniqueLinks();window.gtEstimateNutrition?.()});
 const oldChangePlan=window.changePlan;
 window.changePlan=function(){
   if(typeof planVariant!=='undefined'){planVariant=(planVariant+1)%30;localStorage.setItem('gtai_plan_variant',String(planVariant));renderPlan();const b=document.querySelector('#recommend button[onclick="changePlan()"]');if(b)b.textContent=lang==='uk'?'✓ План оновлено — ще варіант':'✓ Plan updated — another option';}
   else if(oldChangePlan)oldChangePlan();
 };
 const oldStart=window.gtStartWorkout;
 if(oldStart)window.gtStartWorkout=function(name){oldStart(name);addTechniqueLinks()};
 const oldRenderLibrary=window.renderLibrary;
 if(oldRenderLibrary)window.renderLibrary=function(){oldRenderLibrary();addTechniqueLinks()};
 const oldShow=window.showPage;
 if(oldShow)window.showPage=function(id){oldShow(id);if(id==='nutrition')window.gtEstimateNutrition?.();setTimeout(addTechniqueLinks,50)};
})();
