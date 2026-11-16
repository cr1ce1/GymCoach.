(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const isEn=()=>String(document.documentElement.lang||'uk').toLowerCase().startsWith('en');
 const tr=(uk,en)=>isEn()?en:uk;
 const factors={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9};
 function ensureHomeBjuCard(){
   const home=$('home');if(!home||$('gtHomeBjuCard'))return;
   const hero=home.querySelector('.hero');if(!hero)return;
   const card=document.createElement('div');card.className='card';card.id='gtHomeBjuCard';
   card.innerHTML=`<div class="section-head"><h2>${tr('Твій БЖВ на день','Your daily macros')}</h2><span class="pill">${tr('За профілем','From profile')}</span></div><div class="gt-home-bju-grid"><div class="gt-home-bju-item"><strong id="gtHomeMacroP">—</strong><small>${tr('Білки','Protein')}</small></div><div class="gt-home-bju-item"><strong id="gtHomeMacroF">—</strong><small>${tr('Жири','Fat')}</small></div><div class="gt-home-bju-item"><strong id="gtHomeMacroC">—</strong><small>${tr('Вуглеводи','Carbohydrates')}</small></div></div><p class="gt-muted" id="gtHomeMacroNote">${tr('Заповни профіль, щоб побачити персональні орієнтири.','Complete your profile to see personalized guidance.')}</p><div class="gt-home-bju-intake"><b>${tr('Вже записано сьогодні:','Logged today:')}</b> <span id="gtHomeBjuIntake">${tr('0 г білків · 0 г жирів · 0 г вуглеводів','0 g protein · 0 g fat · 0 g carbs')}</span></div><button class="btn secondary" type="button" id="gtHomeOpenNutrition">${tr('Відкрити щоденник харчування →','Open food diary →')}</button>`;
   hero.insertAdjacentElement('afterend',card);
   $('gtHomeOpenNutrition')?.addEventListener('click',()=>window.showPage?.('nutrition'));
 }
 function n(id){return Number($(id)?.textContent?.replace(/[^\d.-]/g,'')||0)}
 function calculateTargets(p){
   const age=Number(p?.age),kg=Number(p?.weight),cm=Number(p?.height),sex=p?.sex||'unspecified';
   if(!(age>0&&kg>0))return {kind:'missing',note:tr('У профілі вкажи вік і вагу. Для орієнтира вуглеводів також потрібні зріст та активність.','Enter age and weight in your profile. Height and activity are also needed to estimate carbohydrates.')};
   if(age<18)return {kind:'young',note:tr('До 18 років застосунок не призначає персональні цільові грами БЖВ за дорослими формулами. У щоденнику автоматично рахуються фактичні білки, жири й вуглеводи їжі. Для особистих норм порадься з сімейним лікарем або дієтологом.','Under 18, the app does not assign personal macro targets from adult equations. The diary still calculates protein, fat and carbohydrates in food. Ask a qualified health professional for personal targets.')};
   if(!(cm>0&&factors[p?.activity]))return {kind:'missing',note:tr('Додай зріст та рівень активності в профілі — тоді розрахунок БЖВ буде повнішим.','Add your height and activity level to complete the macro estimate.')};
   const sexConstant=sex==='male'?5:sex==='female'?-161:-78;
   const bmr=10*kg+6.25*cm-5*age+sexConstant;
   let kcal=bmr*(factors[p.activity]||1.55);
   if(p.goal==='lose')kcal*=0.85;else if(p.goal==='muscle')kcal*=1.10;
   const rates={maintain:1.4,muscle:1.8,lose:1.6,strength:1.7,endurance:1.5,sport:1.6,general:1.4};
   const protein=Math.round(kg*(rates[p.goal]||1.4));
   const fat=Math.round(Math.max(kg,kcal*0.25/9));
   const carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));
   return {kind:'adult',protein,fat,carbs,note:sex==='unspecified'?tr('Орієнтовний дорослий розрахунок; стать не вказана, тому енерговитрати оцінено усереднено. Значення не є медичним приписом.','Adult estimate; sex was not specified, so energy needs use an averaged equation. This is not medical advice.'):tr('Орієнтовний дорослий розрахунок за профілем. Фактичні потреби можуть відрізнятися; це не медичний припис.','Approximate adult estimate based on your profile. Actual needs may differ; this is not medical advice.')};
 }
 function refreshHomeBju(){
   ensureHomeBjuCard();if(!$('gtHomeBjuCard'))return;
   let p={};try{p=typeof profile!=='undefined'&&profile?profile:{}}catch(_){p={}}
   const result=calculateTargets(p);
   if(result.kind==='adult'){
     $('gtHomeMacroP').textContent=result.protein+' '+tr('г','g');$('gtHomeMacroF').textContent=result.fat+' '+tr('г','g');$('gtHomeMacroC').textContent=result.carbs+' '+tr('г','g');
   }else if(result.kind==='young'){
     $('gtHomeMacroP').textContent=tr('за потребою','needs-based');$('gtHomeMacroF').textContent=tr('за потребою','needs-based');$('gtHomeMacroC').textContent=tr('за потребою','needs-based');
   }else{
     $('gtHomeMacroP').textContent='—';$('gtHomeMacroF').textContent='—';$('gtHomeMacroC').textContent='—';
   }
   $('gtHomeMacroNote').textContent=result.note;
   const actualP=$('gtProtein')?.textContent||'0 г',actualF=$('gtFat')?.textContent||'0 г',actualC=$('gtCarbs')?.textContent||'0 г';
   $('gtHomeBjuIntake').textContent=`${actualP} ${tr('білків','protein')} · ${actualF} ${tr('жирів','fat')} · ${actualC} ${tr('вуглеводів','carbs')}`;
   const macroCard=$('gtMacroCard');if(macroCard&&typeof window.gtRenderMacros==='function')window.gtRenderMacros();
 }
 // Place BJU on the home screen and refresh it after login, profile save/edit and food diary updates.
 const afterLogin=window.gtAfterLogin;
 if(typeof afterLogin==='function'&&!afterLogin.__gtFinalBju){
   const wrapped=async function(...args){let authId='';try{authId=typeof gtUser!=='undefined'&&gtUser?.id?String(gtUser.id):''}catch(_){}const result=await afterLogin.apply(this,args);if(authId){try{localStorage.setItem('gtai_last_auth_user',authId)}catch(_){}}setTimeout(()=>{window.gtEstimateNutrition?.();window.gtRenderFood?.();refreshHomeBju()},0);return result};wrapped.__gtFinalBju=true;window.gtAfterLogin=wrapped;
 }
 for(const fnName of ['saveProfile','saveEditedProfile']){
   const original=window[fnName];if(typeof original==='function'&&!original.__gtFinalBju){
     const wrapped=function(...args){const result=original.apply(this,args);setTimeout(()=>{window.gtEstimateNutrition?.();refreshHomeBju()},0);return result};wrapped.__gtFinalBju=true;window[fnName]=wrapped;
   }
 }
 const oldRenderFood=window.gtRenderFood;
 if(typeof oldRenderFood==='function'&&!oldRenderFood.__gtRefreshHomeBju){const wrapped=function(...args){const result=oldRenderFood.apply(this,args);setTimeout(refreshHomeBju,0);return result};wrapped.__gtRefreshHomeBju=true;window.gtRenderFood=wrapped}
 const oldSaveFood=window.gtSaveFood;
 if(typeof oldSaveFood==='function'&&!oldSaveFood.__gtRefreshHomeBju){const wrapped=function(...args){const result=oldSaveFood.apply(this,args);setTimeout(refreshHomeBju,0);return result};wrapped.__gtRefreshHomeBju=true;window.gtSaveFood=wrapped}
 const oldShowPage=window.showPage;
 if(typeof oldShowPage==='function'&&!oldShowPage.__gtFinalBju){const wrapped=function(id,...args){const result=oldShowPage.call(this,id,...args);if(id==='home'||id==='nutrition'||id==='profile')setTimeout(()=>{window.gtEstimateNutrition?.();refreshHomeBju()},0);return result};wrapped.__gtFinalBju=true;window.showPage=wrapped}

 function enhanceChatLock(){
   const lock=$('gtCoachLock');if(!lock||lock.querySelector('.gt-refresh-access'))return;
   if(lock.style.display==='none'||lock.getAttribute('aria-hidden')==='true')return;
   const button=document.createElement('button');button.type='button';button.className='gt-refresh-access';button.textContent=tr('Перевірити доступ знову','Refresh access');button.addEventListener('click',async()=>{button.disabled=true;button.textContent=tr('Перевіряємо…','Checking…');try{if(typeof window.gtRefreshPlusAccess==='function')await window.gtRefreshPlusAccess();}catch(err){console.warn('Access refresh failed:',err?.message||err)}setTimeout(()=>{button.disabled=false;button.textContent=tr('Перевірити доступ знову','Refresh access');enhanceChatLock()},1000)});lock.appendChild(button);
 }
 const oldRefresh=window.gtRefreshPlusAccess;
 if(typeof oldRefresh==='function'&&!oldRefresh.__gtFinalChat){const wrapped=async function(...args){const result=await oldRefresh.apply(this,args);setTimeout(enhanceChatLock,20);return result};wrapped.__gtFinalChat=true;window.gtRefreshPlusAccess=wrapped}
 const chatObserver=new MutationObserver(()=>enhanceChatLock());
 function boot(){ensureHomeBjuCard();window.gtEstimateNutrition?.();window.gtRenderFood?.();refreshHomeBju();enhanceChatLock();if(document.body)chatObserver.observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.addEventListener('focus',()=>{setTimeout(()=>{window.gtRefreshPlusAccess?.();refreshHomeBju()},50)});
})();
