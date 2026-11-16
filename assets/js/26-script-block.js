/* GYM COACH AI visual refresh: preserve the existing app and add styling on top. */
(function(){
  const $ = id => document.getElementById(id);
  const style = document.createElement('style');
  style.id = 'gtai-visual-refresh-v3';
  style.textContent = `
    :root{
      --bg:#0d0314;--panel:#1b0729;--panel2:#260a38;--line:#56078a;
      --lime:#8B5CF6;--text:#faf2ff;--muted:#c8a8dd;--danger:#ff8d82;
    }
    body{background:radial-gradient(ellipse at 50% -12%,#3e105d 0,transparent 45%),#0d0314;color:var(--text)}
    .top{max-width:1120px;padding-top:24px}
    main{max-width:1120px}
    .brand span,.gt-metric strong{color:#b24ef4}
    .card,.hero{border:1px solid #56078a!important;border-radius:22px!important;
      background:linear-gradient(145deg,rgba(33,8,49,.97),rgba(18,4,27,.98))!important;
      box-shadow:0 12px 36px rgba(0,0,0,.18)}
    .hero{position:relative;overflow:hidden;padding:28px!important;isolation:isolate}
    .hero:before{content:"";position:absolute;inset:0;z-index:-2;opacity:.8;
      background:linear-gradient(90deg,rgba(14,2,22,.98) 0%,rgba(14,2,22,.88) 44%,rgba(14,2,22,.15) 100%),
      url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=85') center/cover}
    .hero:after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;
      background:linear-gradient(135deg,rgba(186,82,255,.08),transparent 55%)}
    .hero h1{font-size:clamp(28px,4vw,42px);letter-spacing:-1px;line-height:1.08;margin:10px 0 12px}
    .hero p{max-width:570px;color:#ddc6ed;line-height:1.6}
    .eyebrow{color:#b24ef4!important;font-weight:900;letter-spacing:1.5px}
    .btn{background:linear-gradient(135deg,#aa4be9,#a348e0)!important;border:1px solid #b24ef5!important;
      border-radius:13px!important;color:white!important;font-weight:850}
    .btn.secondary,.lang,select,input,textarea{background:#1d072b!important;color:var(--text)!important;border-color:#4b176d!important}
    .pill,.tag{border:1px solid #6308a0!important;background:rgba(178,78,245,.1)!important;color:#bb55ff!important;border-radius:999px!important}
    .gt-metrics{grid-template-columns:repeat(auto-fit,minmax(125px,1fr))}
    .gt-metric{border:1px solid #501378!important;background:linear-gradient(145deg,#220b32,#160621)!important;border-radius:17px!important}
    .gt-progress{background:#321049!important;height:10px}
    .gt-progress span{background:linear-gradient(90deg,#ba52ff,#b24ef4)!important}
    #recommend .section-head h2{font-size:clamp(26px,3vw,36px);letter-spacing:-.7px}
    #recommend #planStats{gap:12px}
    #recommend #planStats>*{border:1px solid #52157a!important;border-radius:18px!important;background:linear-gradient(145deg,#2b0b40,#1a0726)!important;padding:16px}
    #recommend #planDays{display:grid;gap:12px;margin-top:18px}
    #recommend #planDays .card{border-radius:20px!important;transition:transform .18s,border-color .18s}
    #recommend #planDays .card:hover{border-color:#b24ef4!important;transform:translateY(-2px)}
    #recommend .exercise,#recommend .session,.exercise-card{border-color:#4a156d!important;border-radius:15px!important}
    #nutrition .hero:before{background:linear-gradient(90deg,rgba(14,2,22,.98) 0%,rgba(14,2,22,.84) 43%,rgba(14,2,22,.08) 100%),
      url('https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1600&q=85') center/cover}
    #gtMacroCard .gt-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}
    #gtMacroCard .gt-metric strong{font-size:clamp(21px,3vw,30px)}
    .gt-refresh-hero{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 18px}
    .gt-refresh-tile{position:relative;min-height:180px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;
      padding:22px;border:1px solid #6708a7;border-radius:22px;text-decoration:none;color:white;
      background:linear-gradient(0deg,rgba(13,2,20,.97),rgba(13,2,20,.18)),
      url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1000&q=80') center/cover}
    .gt-refresh-tile.food{background-image:linear-gradient(0deg,rgba(13,2,20,.97),rgba(13,2,20,.15)),
      url('https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80')}
    .gt-refresh-tile .gt-tile-icon{font-size:26px;color:#b24ef4;margin-bottom:10px}
    .gt-refresh-tile strong{font-size:24px;line-height:1.15;margin-bottom:6px}
    .gt-refresh-tile span{color:#dbc2eb;line-height:1.45;font-size:14px}
    .gt-refresh-tile em{font-style:normal;color:#b24ef5;font-weight:850;margin-top:12px}
    .gt-training-programs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0 18px}
    .gt-program-chip{cursor:pointer;text-align:left;min-height:95px;padding:17px;border:1px solid #4e1772;border-radius:18px;
      background:linear-gradient(145deg,#2c0c41,#1a0726);color:#f8eeff;transition:.18s}
    .gt-program-chip strong{display:block;font-size:16px;margin-bottom:8px}
    .gt-program-chip small{color:#c8a8dd}
    .gt-program-chip.active,.gt-program-chip:hover{border-color:#b14ef3;box-shadow:0 0 0 1px rgba(177,78,243,.18),0 8px 25px #13001f}
    .gt-program-chip.active small{color:#b24ef5}
    .gt-training-intro{padding:24px;border-radius:22px!important;border:1px solid #5d178c!important;
      background:radial-gradient(circle at 90% 0%,rgba(186,82,255,.17),transparent 45%),linear-gradient(135deg,#2c0a42,#170622)!important}
    .gt-training-intro .pill{display:inline-block;margin-bottom:12px}
    .gt-training-intro h3{font-size:clamp(24px,3vw,32px);margin:4px 0 10px}
    .gt-training-intro p{color:#dac3e9;line-height:1.55}
    @media(max-width:650px){
      .gt-refresh-hero{grid-template-columns:1fr}
      .gt-refresh-tile{min-height:155px}
      .gt-training-programs{grid-template-columns:1fr}
      .gt-program-chip{min-height:74px}
      .hero{padding:22px!important}
      #gtMacroCard .gt-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}
    }
  `;
  document.head.appendChild(style);

  function addHomeTiles(){
    const home=$('home'); if(!home||$('gtRefreshTiles')) return;
    const wrap=document.createElement('div');wrap.id='gtRefreshTiles';wrap.className='gt-refresh-hero';
    wrap.innerHTML=`<a class="gt-refresh-tile" href="#" data-go="recommend"><div class="gt-tile-icon">▥</div><strong>Тренування</strong><span>Персональні плани, бібліотека вправ і відстеження прогресу.</span><em>Перейти →</em></a>
      <a class="gt-refresh-tile food" href="#" data-go="nutrition"><div class="gt-tile-icon"><svg class="gc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1"/></svg></div><strong>Харчування / БЖВ</strong><span>Щоденник їжі, автоматичний підрахунок калорій і макронутрієнтів.</span><em>Перейти →</em></a>`;
    const first=home.querySelector('.section-head'); if(first)first.insertAdjacentElement('beforebegin',wrap);else home.prepend(wrap);
    wrap.querySelectorAll('[data-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();window.showPage?.(a.dataset.go)}));
  }

  function addTrainingShowcase(){
    const section=$('recommend');if(!section||$('gtTrainingShowcase'))return;
    const head=section.querySelector('.section-head');
    const showcase=document.createElement('div');showcase.id='gtTrainingShowcase';
    showcase.innerHTML=`<div class="hero"><div class="eyebrow">YOUR TRAINING SPACE</div><h1>Тренування</h1><p>Обирай програму, відстежуй виконання та поступово покращуй свою техніку. Усі наявні плани й вправи залишаються доступними нижче.</p></div>
      <div class="gt-training-programs">
       <button type="button" class="gt-program-chip active" data-plan="full"><strong>Все тіло</strong><small>3× · рекомендовано</small></button>
       <button type="button" class="gt-program-chip" data-plan="upper"><strong>Верх / Низ</strong><small>3–4× · збалансовано</small></button>
       <button type="button" class="gt-program-chip" data-plan="ppl"><strong>Жим / Тяга / Ноги</strong><small>3× · силовий спліт</small></button>
      </div>
      <div class="card gt-training-intro"><span class="pill">Твій план</span><h3 id="gtTrainingTitle">Персональна програма</h3><p id="gtTrainingDesc">План підлаштовується під твій досвід, доступне обладнання та кількість днів тренувань.</p></div>`;
    if(head)head.insertAdjacentElement('afterend',showcase);else section.prepend(showcase);
    const titles={full:['Все тіло','Тренування основних груп м’язів у межах одного заняття. Підходить для простого та збалансованого розкладу.'],upper:['Верх / Низ','Чергуй дні верхньої та нижньої частини тіла, залишаючи час на відновлення.'],ppl:['Жим / Тяга / Ноги','Окремі тренування для жимових рухів, тяг і ніг. Обирай навантаження відповідно до досвіду.']};
    showcase.querySelectorAll('[data-plan]').forEach(btn=>btn.addEventListener('click',()=>{
      showcase.querySelectorAll('[data-plan]').forEach(b=>b.classList.toggle('active',b===btn));
      const pair=titles[btn.dataset.plan];$('gtTrainingTitle').textContent=pair[0];$('gtTrainingDesc').textContent=pair[1];
      // This is a visual preview only; the original saved training plan is not overwritten.
    }));
  }

  function updateMacroCards(){
    const p=(()=>{try{return JSON.parse(localStorage.getItem('gtai_profile')||'null')||{}}catch(_){return {}}})();
    const card=$('gtMacroCard');
    if(!card)return;
    const age=Number(p.age||0),advice=$('gtMacroAdvice');
    const set=(id,val)=>{const el=$(id);if(el)el.textContent=val};
    // For under-18 users, don't display adult formula targets as if they were personal requirements.
    // Show actual logged intake instead, which is calculated from foods added to the diary.
    if(age>0&&age<18){
      const actualP=$('gtProtein')?.textContent||'0 г';
      const actualF=$('gtFat')?.textContent||'0 г';
      const actualC=$('gtCarbs')?.textContent||'0 г';
      set('gtMacroP',actualP);set('gtMacroF',actualF);set('gtMacroC',actualC);
      const labels=card.querySelectorAll('.gt-metric small');
      if(labels.length>=3){labels[0].textContent='Білки з їжі сьогодні';labels[1].textContent='Жири з їжі сьогодні';labels[2].textContent='Вуглеводи з їжі сьогодні'}
      if(advice)advice.textContent='Показано фактичні БЖВ з доданих продуктів, а не персональну норму. У підлітковому віці потреби залежать від росту й активності; точні цілі краще узгодити з фахівцем.';
      return;
    }
    // Adult display: use the existing, already-defined calculation when all required profile data are available.
    if(typeof window.gtEstimateNutrition==='function') {
      const oldP=$('gtMacroP')?.textContent||'—';
      if(!p.age||!p.weight||!p.height||!p.sex||p.sex==='unspecified'){
        set('gtMacroP','—');set('gtMacroF','—');set('gtMacroC','—');
        if(advice)advice.textContent='Заповни вік, зріст, вагу, стать і рівень активності в профілі для орієнтовного розрахунку.';
      } else {
        const kcalText=$('gtTargetKcal')?.textContent||'';
        const kcal=Number(kcalText.replace(/[^\d]/g,''))||0,kg=Number(p.weight),age=Number(p.age);
        if(age>=18&&kcal>0){
          const rate=({muscle:1.8,lose:1.6,strength:1.7,endurance:1.5,sport:1.6,maintain:1.4,general:1.4})[p.goal]||1.4;
          const protein=Math.round(kg*rate),fat=Math.round(Math.max(kg,kcal*.25/9)),carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));
          set('gtMacroP',protein+' г');set('gtMacroF',fat+' г');set('gtMacroC',carbs+' г');
          const labels=card.querySelectorAll('.gt-metric small');
          if(labels.length>=3){labels[0].textContent='Білки · орієнтир';labels[1].textContent='Жири · орієнтир';labels[2].textContent='Вуглеводи · орієнтир'}
          if(advice)advice.textContent='Орієнтовний розрахунок за профілем. Фактичні потреби можуть відрізнятися; це не медична рекомендація.';
        } else if(advice) advice.textContent='Заповни профіль, щоб побачити орієнтир. Фактичні БЖВ продуктів автоматично рахуються у щоденнику.';
      }
    }
  }
  function refresh(){
    addHomeTiles();addTrainingShowcase();updateMacroCards();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{refresh();setTimeout(refresh,300)});
  else {refresh();setTimeout(refresh,300)}
  const oldShow=window.showPage;
  if(typeof oldShow==='function'&&!oldShow.__gtVisualRefresh){
    const wrapped=function(id,...args){const r=oldShow.call(this,id,...args);setTimeout(refresh,60);return r};
    wrapped.__gtVisualRefresh=true;window.showPage=wrapped;
  }
  const obs=new MutationObserver(()=>{if(!$('gtTrainingShowcase')||!$('gtRefreshTiles'))refresh()});
  if(document.body)obs.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('focus',()=>setTimeout(updateMacroCards,80));
})();
