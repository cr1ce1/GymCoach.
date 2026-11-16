(function(){
  const el=id=>document.getElementById(id);
  const en=()=>String(document.documentElement.lang||'uk').toLowerCase().startsWith('en');
  const tr=(uk,english)=>en()?english:uk;
  window.gtRenderSubscription=function(){
    const page=el('subscription');if(!page)return;
    const active=window.GT_PLUS_ACCESS===true;
    page.innerHTML=`<div class="gt-sub-wrap">
      <div class="gt-sub-hero"><span class="eyebrow">STRENOVA PLUS</span><h1>${tr('Більше можливостей для тренувань','Extra tools for your training')}</h1><p>${tr('Доступ Plus власник Strenova надає вручну вибраним акаунтам. Приймання платежів на сайті поки вимкнене.','The Strenova owner manually grants Plus to selected accounts. Online payments are currently disabled.')}</p><span class="pill">${active?tr('Поточний план: Strenova Plus','Current plan: Strenova Plus'):tr('Поточний план: Безкоштовний','Current plan: Free')}</span></div>
      <div class="gt-sub-plans">
       <article class="gt-sub-plan"><span class="gt-sub-status">${tr('ПОТОЧНИЙ ПЛАН','CURRENT PLAN')}</span><h2>${tr('Безкоштовний','Free')}</h2><div class="gt-sub-price">${tr('Безкоштовно','Free')}</div><ul><li>${tr('Профіль і персональний план','Profile and tailored workout plan')}</li><li>${tr('Бібліотека вправ','Exercise library')}</li><li>${tr('Базова історія тренувань','Basic workout history')}</li></ul></article>
       <article class="gt-sub-plan featured"><span class="gt-sub-status">${active?tr('ДОСТУП АКТИВНИЙ','ACCESS ACTIVE'):tr('ДОСТУП ЗА ЗАПРОШЕННЯМ','MANUAL ACCESS')}</span><h2>Strenova Plus</h2><div class="gt-sub-price">${active?tr('АКТИВНО','ACTIVE'):tr('150 грн / 30 днів','₴150 / 30 days')}</div><ul><li>${tr('Особистий чат із тренером','Private live coach chat')}</li><li>${tr('Календар, пов’язаний із планом','Workout calendar connected to your plan')}</li><li>${tr('Запис повторень і ваги для кожного підходу','Per-set reps and weight logging')}</li><li>${tr('Графік прогресу на основі збереженої історії','Progress chart from saved workout history')}</li><li>${tr('Особисті рекорди й розширена статистика','Personal records and extended stats')}</li></ul><p id="gtSubscriptionMessage" class="gt-sub-message" role="status">${active?tr('Твій доступ Plus перевірено через Supabase.','Your Plus access was verified through Supabase.'):tr('Оплата зараз вимкнена. Попроси власника Strenova вручну додати Plus до твого акаунта.','Payments are off. Ask the Strenova owner to grant Plus to your account manually.')}</p></article>
      </div>
      <div class="gt-sub-manual-note">${tr('Захист доступу: Plus перевіряється за записом у Supabase. На сайті немає перемикача для самостійного розблокування функцій.','Access security: Plus is verified against Supabase. The page has no local switch for self-unlocking premium features.')}</div>
    </div>`;
  };
  window.gtStartSubscription=function(){const msg=el('gtSubscriptionMessage');if(msg)msg.textContent=tr('Оплата вимкнена. Plus надається власником вручну через Supabase.','Payments are disabled. Plus is granted manually by the owner through Supabase.');};
  const oldToggle=window.toggleLang;
  if(typeof oldToggle==='function'&&!oldToggle.__gtSubWrappedManual){const wrapped=function(){oldToggle();if(el('subscription')?.classList.contains('active'))window.gtRenderSubscription()};wrapped.__gtSubWrappedManual=true;window.toggleLang=wrapped;}
})();
