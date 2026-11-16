(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const tr=(uk,en)=>((document.documentElement.lang||'uk').startsWith('en')?en:uk);
 const state={plus:false,coach:false,subscription:null,role:null,currentThread:null,channel:null,accessMessage:'',calendarMonth:new Date(new Date().getFullYear(),new Date().getMonth(),1),calendarSelected:dateKey(new Date()),messages:[],busy:false};
 function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
 function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function client(){try{return typeof gtSupabase!=='undefined'?gtSupabase:null}catch(e){return null}}
 function currentUser(){try{return typeof gtUser!=='undefined'?gtUser:null}catch(e){return null}}
 function schedule(){try{return typeof gtSchedule!=='undefined'&&Array.isArray(gtSchedule)?gtSchedule:[]}catch(e){return []}}
 function msgStatus(id,text){const n=$(id);if(n)n.textContent=text}
 function addNavButton(id,label,icon,action){let b=document.querySelector(`#nav [data-page="${id}"]`);if(b)return b;b=document.createElement('button');b.dataset.page=id;b.type='button';b.innerHTML=`<span>${icon}</span><i>${label}</i>`;b.addEventListener('click',action);$('nav')?.appendChild(b);return b}
 function renderAccessNav(){
  const nav=$('nav');if(!nav)return;
  let live=document.querySelector('#nav [data-page="coach-live"]'),inbox=document.querySelector('#nav [data-page="coach-inbox"]');
  if(state.plus&&!state.coach){if(!live)live=addNavButton('coach-live',tr('Тренер','Coach'),gcIcon('message-square'),()=>window.showPage('coach-live'));live.querySelector('i').textContent=tr('Тренер','Coach');}
  else if(live)live.remove();
  if(state.coach){if(!inbox)inbox=addNavButton('coach-inbox',tr('Клієнти','Clients'),gcIcon('users'),()=>window.showPage('coach-inbox'));inbox.querySelector('i').textContent=tr('Клієнти','Clients');}
  else if(inbox)inbox.remove();
  document.querySelectorAll('#nav [data-page]').forEach(b=>{b.style.minWidth='0';b.style.flex='1 1 0'});
 }
 function activeNav(id){
  const map={recommend:'training',library:'training',coach:'training',session:'training',calendar:'calendar','coach-live':'coach-live','coach-inbox':'coach-inbox',subscription:'subscription'};
  const target=map[id]||id;
  document.querySelectorAll('#nav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===target));
 }
 function mountChatPages(){
  const main=document.querySelector('main');if(!main)return;
  if(!$('coach-live')){const sec=document.createElement('section');sec.id='coach-live';sec.className='page';sec.innerHTML=`<div class="gt-chat-hero"><span class="eyebrow">STRENOVA PLUS · LIVE COACHING</span><h1>${tr('Чат із живим тренером','Live coach chat')}</h1><p>${tr('Пиши мені щодо техніки вправ, розкладу та змін у плані. Я відповідаю особисто, коли переглядаю повідомлення.','Message me about exercise technique, schedule and plan adjustments. I reply personally when I review messages.')}</p></div><div class="gt-chat-layout"><aside class="gt-chat-side"><h3>${tr('Твій тренер','Your coach')}</h3><div class="gt-chat-status" id="gtLiveCoachStatus">${tr('Перевіряємо доступ…','Checking access…')}</div><p class="hint">${tr('Не надсилай паролі чи приватні дані. Відповідь може надійти не миттєво.','Do not send passwords or private data. Replies may not be immediate.')}</p></aside><div class="gt-chat-panel"><div class="gt-chat-messages" id="gtLiveCoachMessages"><div class="gt-chat-empty">${tr('Повідомлення з’являться тут.','Messages will appear here.')}</div></div><form id="gtLiveCoachForm" class="gt-chat-compose"><textarea id="gtLiveCoachInput" maxlength="2000" placeholder="${tr('Напиши тренеру…','Message your coach…')}" aria-label="${tr('Повідомлення тренеру','Message your coach')}"></textarea><button class="btn" id="gtLiveCoachSend" type="submit">${tr('Надіслати','Send')} ➤</button></form></div></div>`;main.insertBefore(sec,main.querySelector('.footer'));}
  if(!$('coach-inbox')){const sec=document.createElement('section');sec.id='coach-inbox';sec.className='page';sec.innerHTML=`<div class="gt-chat-hero"><span class="eyebrow">STRENOVA PLUS · COACH DESK</span><h1>${tr('Клієнти та повідомлення','Clients & messages')}</h1><p>${tr('Відкривай діалоги активних Plus-клієнтів і персонально коригуй їхні плани.','Open conversations from active Plus members and guide their plans personally.')}</p></div><div class="gt-chat-layout"><aside class="gt-chat-side"><h3>${tr('Діалоги','Conversations')}</h3><div class="gt-chat-status" id="gtCoachInboxStatus">${tr('Завантажуємо діалоги…','Loading conversations…')}</div><div class="gt-chat-thread-list" id="gtCoachThreads"></div></aside><div class="gt-chat-panel"><div id="gtCoachThreadTitle"><h3>${tr('Обери клієнта','Choose a client')}</h3></div><div class="gt-chat-messages" id="gtCoachMessages"><div class="gt-chat-empty">${tr('Тут буде листування з клієнтом.','Client messages will appear here.')}</div></div><form id="gtCoachReplyForm" class="gt-chat-compose"><textarea id="gtCoachReplyInput" maxlength="2000" placeholder="${tr('Відповідь клієнту…','Reply to client…')}" aria-label="${tr('Відповідь клієнту','Reply to client')}"></textarea><button class="btn" id="gtCoachReplySend" type="submit">${tr('Відповісти','Reply')} ➤</button></form></div></div>`;main.insertBefore(sec,main.querySelector('.footer'));}
  $('gtLiveCoachForm')?.addEventListener('submit',e=>{e.preventDefault();sendLiveMessage()});
  $('gtCoachReplyForm')?.addEventListener('submit',e=>{e.preventDefault();sendCoachReply()});
 }
 async function refreshAccess(){
  const sb=client(),u=currentUser();
  state.plus=false;state.coach=false;state.subscription=null;state.role=null;
  if(!sb||!u){state.accessMessage=tr('Увійди в акаунт, щоб перевірити доступ до Plus.','Sign in to check Plus access.');renderAccessNav();renderCoachAccess();renderSubscriptionState();return;}
  try{
   const [subRes,roleRes]=await Promise.all([
    sb.from('gt_subscriptions').select('user_id,status,plan,expires_at,starts_at').eq('user_id',u.id).maybeSingle(),
    sb.from('gt_user_roles').select('user_id,role').eq('user_id',u.id).maybeSingle()
   ]);
   if(subRes.error)throw subRes.error;if(roleRes.error)throw roleRes.error;
   state.subscription=subRes.data||null;state.role=roleRes.data||null;state.coach=state.role?.role==='coach';
   const end=state.subscription?.expires_at?new Date(state.subscription.expires_at).getTime():Infinity;
   const start=state.subscription?.starts_at?new Date(state.subscription.starts_at).getTime():0;
   state.plus=(state.subscription?.status==='active'&&end>Date.now()&&start<=Date.now())||state.coach;
   state.accessMessage=state.plus?tr('Доступ активний. Тут ти можеш напряму спілкуватися з тренером.','Access active. You can message your coach here.'):tr('Чат відкривається для активної підписки Strenova Plus.','Live coach chat is available to active Strenova Plus members.');
  }catch(err){
   state.accessMessage=tr('Не вдалося перевірити підписку. Переконайся, що застосовано файл SQL налаштування чату й підписок.','Could not check membership. Apply the chat/subscription SQL setup first.');
   console.warn('Strenova Plus access check:',err?.message||err);
  }
  renderAccessNav();renderCoachAccess();renderSubscriptionState();
  connectRealtime();
  if(state.coach)await renderInbox();else await loadLiveThread();
 }
 function renderCoachAccess(){
  msgStatus('gtLiveCoachStatus',state.accessMessage||'');
  const form=$('gtLiveCoachForm');if(form)form.style.display=state.plus&&!state.coach?'flex':'none';
  const live=$('coach-live');if(live){let lock=$('gtCoachLock');if(!state.plus&&!lock){lock=document.createElement('div');lock.id='gtCoachLock';lock.className='gt-chat-lock';live.appendChild(lock)}if(lock){lock.style.display=state.plus?'none':'block';lock.innerHTML=tr('Потрібна активна підписка Strenova Plus. Після підтвердження підписки тут з’явиться особистий чат із живим тренером.','An active Strenova Plus membership is required. Once your subscription is confirmed, your personal live coach chat appears here.')}}
  const compose=$('gtCoachReplyForm');if(compose)compose.style.display=state.coach?'flex':'none';
  if($('gtCoachInboxStatus'))$('gtCoachInboxStatus').textContent=state.coach?tr('Показано діалоги активних Plus-клієнтів.','Showing conversations for active Plus members.'):tr('Цей розділ доступний тренеру.','This area is available to the coach account.');
  window.gtUpdatePremiumSurfaces?.(state.plus);
 }
 function renderSubscriptionState(){
  const page=$('subscription');if(!page||!page.innerHTML)return;
  const pill=page.querySelector('.gt-sub-hero .pill');if(pill)pill.textContent=state.plus?tr('Поточний план: Strenova Plus','Current plan: Strenova Plus'):tr('Поточний план: Безкоштовний','Current plan: Free');
  const premium=page.querySelector('.gt-sub-plan.featured .gt-sub-price');if(premium&&state.plus)premium.textContent=tr('АКТИВНА','ACTIVE');
  const action=page.querySelector('.gt-sub-plan.featured button');if(action&&state.plus){action.textContent=tr('Відкрити чат із тренером →','Open live coach chat →');action.onclick=()=>window.showPage(state.coach?'coach-inbox':'coach-live')}
  const note=page.querySelector('.gt-sub-note');if(note&&state.plus)note.textContent=tr('Підписка підтверджена в базі даних. Доступ до живого тренера відкритий.','Subscription confirmed in the database. Live coach access is enabled.');
  page.querySelectorAll('.gt-sub-details').forEach(x=>x.remove());
  const plusPlan=page.querySelector('.gt-sub-plan.featured ul');if(plusPlan&&!plusPlan.dataset.coachAdded){const li=document.createElement('li');li.textContent=tr('Особистий чат із живим тренером — прямі відповіді та коригування плану','Personal live coach chat — direct replies and plan adjustments');plusPlan.appendChild(li);plusPlan.dataset.coachAdded='1';}
 }
 async function loadLiveThread(){
  const sb=client(),u=currentUser();const root=$('gtLiveCoachMessages');if(!root)return;
  if(!state.plus||state.coach){root.innerHTML=`<div class="gt-chat-empty">${esc(tr('Особистий чат доступний користувачам Plus.','Personal chat is available to Plus members.'))}</div>`;return}
  if(!sb||!u){root.innerHTML=`<div class="gt-chat-empty">${esc(tr('Увійди в акаунт, щоб написати тренеру.','Sign in to message your coach.'))}</div>`;return}
  root.innerHTML=`<div class="gt-chat-empty">${esc(tr('Завантажуємо листування…','Loading conversation…'))}</div>`;
  const {data,error}=await sb.from('gt_coach_messages').select('id,user_id,sender_id,sender_name,sender_email,body,created_at').eq('user_id',u.id).order('created_at',{ascending:true}).limit(300);
  if(error){root.innerHTML=`<div class="gt-chat-empty">${esc(tr('Чат поки не підключено. Застосуй SQL-файл і перевір політики Supabase.','Chat is not connected yet. Apply the SQL file and check Supabase policies.'))}<br><small>${esc(error.message)}</small></div>`;return}
  state.messages=data||[];renderMessages('gtLiveCoachMessages',state.messages,u.id);
 }
 function renderMessages(rootId,messages,customerId){
  const root=$(rootId);if(!root)return;
  const me=currentUser();
  if(!messages?.length){root.innerHTML=`<div class="gt-chat-empty">${esc(tr('Поки немає повідомлень. Напиши, над чим хочеш попрацювати, або постав запитання про свій план.','No messages yet. Tell your coach what you want to work on or ask about your plan.'))}</div>`;return;}
  root.innerHTML=messages.map(m=>{const mine=String(m.sender_id)===String(me?.id);const date=m.created_at?new Date(m.created_at):new Date();const sender=(m.sender_name|| (mine?tr('Ти','You'):tr('Тренер','Coach')));return `<div class="gt-live-message ${mine?'mine':''}">${esc(m.body)}<small>${esc(sender)} · ${esc(date.toLocaleString((document.documentElement.lang||'uk').startsWith('en')?'en-US':'uk-UA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}))}</small></div>`}).join('');
  root.scrollTop=root.scrollHeight;
 }
 async function sendLiveMessage(){
  const sb=client(),u=currentUser(),input=$('gtLiveCoachInput'),btn=$('gtLiveCoachSend'),body=String(input?.value||'').trim();
  if(!state.plus||state.coach||!sb||!u||!body||state.busy)return;
  state.busy=true;if(btn)btn.disabled=true;
  const row={user_id:u.id,sender_id:u.id,sender_name:profile?.name||u.email?.split('@')[0]||tr('Клієнт','Member'),sender_email:u.email||'',body:body.slice(0,2000)};
  const {error}=await sb.from('gt_coach_messages').insert(row);
  if(error){msgStatus('gtLiveCoachStatus',tr('Не вдалося надіслати. Перевір підписку й політики бази: ','Could not send. Check membership and database policies: ')+error.message)}else{input.value='';await loadLiveThread()}
  state.busy=false;if(btn)btn.disabled=false;
 }
 async function renderInbox(){
  const sb=client(),u=currentUser(),list=$('gtCoachThreads');if(!list)return;
  if(!state.coach||!sb||!u){list.innerHTML='';return}
  const {data,error}=await sb.from('gt_coach_messages').select('id,user_id,sender_id,sender_name,sender_email,body,created_at').order('created_at',{ascending:false}).limit(1000);
  if(error){list.innerHTML=`<p class="hint">${esc(tr('Не вдалося завантажити діалоги: ','Could not load conversations: ')+error.message)}</p>`;return}
  const groups=new Map();(data||[]).forEach(m=>{if(!groups.has(m.user_id))groups.set(m.user_id,{user_id:m.user_id,name:m.sender_name||m.sender_email||tr('Клієнт','Member'),email:m.sender_email||'',last:m,items:[]});const g=groups.get(m.user_id);g.items.push(m);if(m.sender_id===m.user_id){g.name=m.sender_name||g.name;g.email=m.sender_email||g.email;}});
  state.inboxData=[...groups.values()].sort((a,b)=>String(b.last.created_at).localeCompare(String(a.last.created_at)));
  list.innerHTML=state.inboxData.length?state.inboxData.map(g=>`<button class="gt-chat-thread-button ${String(state.currentThread)===String(g.user_id)?'active':''}" onclick="gtOpenCoachThread('${esc(g.user_id)}')"><strong>${esc(g.name)}</strong><small>${esc(g.email)}<br>${esc(String(g.last.body||'').slice(0,58))}</small></button>`).join(''):`<div class="gt-chat-empty">${esc(tr('Ще немає повідомлень від Plus-клієнтів.','No messages from Plus members yet.'))}</div>`;
  if(state.currentThread)await loadCoachThread(state.currentThread);
 }
 window.gtOpenCoachThread=async function(id){state.currentThread=String(id);await renderInbox();};
 async function loadCoachThread(id){
  const sb=client(),root=$('gtCoachMessages'),u=currentUser();if(!sb||!state.coach||!root)return;
  const info=(state.inboxData||[]).find(g=>String(g.user_id)===String(id));if($('gtCoachThreadTitle'))$('gtCoachThreadTitle').innerHTML=`<h3>${esc(info?.name||tr('Клієнт','Member'))}</h3><p class="hint">${esc(info?.email||'')}</p>`;
  const {data,error}=await sb.from('gt_coach_messages').select('id,user_id,sender_id,sender_name,sender_email,body,created_at').eq('user_id',id).order('created_at',{ascending:true}).limit(300);
  if(error){root.innerHTML=`<div class="gt-chat-empty">${esc(error.message)}</div>`;return}
  state.messages=data||[];renderMessages('gtCoachMessages',state.messages,id);
 }
 async function sendCoachReply(){
  const sb=client(),u=currentUser(),input=$('gtCoachReplyInput'),btn=$('gtCoachReplySend'),body=String(input?.value||'').trim();
  if(!state.coach||!state.currentThread||!sb||!u||!body||state.busy)return;
  state.busy=true;if(btn)btn.disabled=true;
  const row={user_id:state.currentThread,sender_id:u.id,sender_name:tr('Живий тренер Strenova','Strenova live coach'),sender_email:u.email||'',body:body.slice(0,2000)};
  const {error}=await sb.from('gt_coach_messages').insert(row);
  if(error)msgStatus('gtCoachInboxStatus',tr('Не вдалося відповісти: ','Could not reply: ')+error.message);else{input.value='';await renderInbox()}
  state.busy=false;if(btn)btn.disabled=false;
 }
 function connectRealtime(){
  const sb=client(),u=currentUser();if(!sb||!u||!sb.channel)return;
  disconnectRealtime();
  let channel=sb.channel('gt-user-'+u.id+'-'+Date.now());
  if(state.coach||state.plus){
   const filter=state.coach?undefined:{filter:`user_id=eq.${u.id}`};
   channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'gt_coach_messages',...(filter||{})},async()=>{if(state.coach)await renderInbox();else await loadLiveThread()});
  }
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'gt_subscriptions',filter:`user_id=eq.${u.id}`},async()=>{await refreshAccess()});
  state.channel=channel.subscribe();
 }
 function disconnectRealtime(){const sb=client();if(sb&&state.channel){try{sb.removeChannel(state.channel)}catch(e){}state.channel=null}}
 function mountModernCalendar(){
  const sec=$('calendar');if(!sec||$('gtModernCalendar'))return;
  const box=document.createElement('div');box.id='gtModernCalendar';box.className='gt-calendar-shell';
  const titleCard=sec.querySelector('.section-head');if(titleCard)titleCard.insertAdjacentElement('afterend',box);else sec.prepend(box);
  renderModernCalendar();
 }
 function renderModernCalendar(){
  const root=$('gtModernCalendar');if(!root)return;
  const en=(document.documentElement.lang||'uk').startsWith('en'),fmt=new Intl.DateTimeFormat(en?'en-US':'uk-UA',{month:'long',year:'numeric'});
  const y=state.calendarMonth.getFullYear(),m=state.calendarMonth.getMonth();
  const first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=new Date(y,m,1-offset);
  const tasks=schedule();const byDate=new Map();tasks.forEach(x=>{const k=String(x.date||'').slice(0,10);if(!byDate.has(k))byDate.set(k,[]);byDate.get(k).push(x)});
  const selected=new Date(state.calendarSelected+'T12:00:00');const sessions=byDate.get(state.calendarSelected)||[];
  const weekdays=en?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
  let days='';for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=dateKey(d),other=d.getMonth()!==m;days+=`<button type="button" class="gt-calendar-day ${other?'outside':''} ${k===dateKey(new Date())?'today':''} ${k===state.calendarSelected?'selected':''} ${byDate.has(k)?'has-workout':''}" data-cal-date="${k}" aria-label="${esc(d.toLocaleDateString(en?'en-US':'uk-UA',{weekday:'long',day:'numeric',month:'long'}))}"><span>${d.getDate()}</span>${byDate.has(k)?'<i class="gt-cal-dot"></i>':''}</button>`}
  const selectedLabel=selected.toLocaleDateString(en?'en-US':'uk-UA',{weekday:'long',day:'numeric',month:'long'});
  const sessionLabel=sessions.length?`${sessions.length} ${en?'scheduled session(s)':'запланованих занять'}`:(en?'No workout scheduled for this day':'На цей день тренувань поки немає');
  const agendaHtml=sessions.length?sessions.map(x=>`<div class="gt-agenda-item"><span class="gt-agenda-marker"></span><div class="gt-agenda-copy"><strong>${esc(x.title|| (en?'Workout':'Тренування'))}</strong><small>${esc(x.details?.source==='plan'?(en?'From your plan':'Із твого плану'):(en?'Custom workout':'Власне тренування'))}</small></div></div>`).join(''):`<div class="hint" style="padding:8px 2px">${en?'Select another date or plan a workout for this day.':'Обери іншу дату або заплануй заняття на цей день.'}</div>`;
  root.innerHTML=`<div class="gt-calendar-top"><div><div class="eyebrow">${en?'YOUR SCHEDULE':'ТВІЙ РОЗКЛАД'}</div><div class="gt-calendar-month">${esc(fmt.format(first))}</div></div><div class="gt-calendar-arrows"><button type="button" id="gtCalPrev" aria-label="Previous month">‹</button><button type="button" id="gtCalToday" aria-label="Today">•</button><button type="button" id="gtCalNext" aria-label="Next month">›</button></div></div><div class="gt-calendar-weekdays">${weekdays.map(d=>`<span>${d}</span>`).join('')}</div><div class="gt-calendar-grid">${days}</div><div class="gt-calendar-selected"><div><strong>${esc(selectedLabel)}</strong><small>${esc(sessionLabel)}</small></div><button type="button" class="btn" id="gtCalAdd">＋ ${en?'Plan a workout':'Запланувати тренування'}</button></div><div class="gt-day-agenda">${agendaHtml}</div>`;
  $('gtCalPrev').onclick=()=>{state.calendarMonth=new Date(y,m-1,1);renderModernCalendar()};$('gtCalNext').onclick=()=>{state.calendarMonth=new Date(y,m+1,1);renderModernCalendar()};$('gtCalToday').onclick=()=>{const now=new Date();state.calendarMonth=new Date(now.getFullYear(),now.getMonth(),1);state.calendarSelected=dateKey(now);renderModernCalendar()};
  root.querySelectorAll('[data-cal-date]').forEach(b=>b.addEventListener('click',()=>{state.calendarSelected=b.dataset.calDate;const d=new Date(state.calendarSelected+'T12:00:00');state.calendarMonth=new Date(d.getFullYear(),d.getMonth(),1);renderModernCalendar()}));
  $('gtCalAdd').onclick=()=>{const date=$('gtScheduleDate');if(date)date.value=state.calendarSelected;const title=$('gtScheduleTitle');title?.focus();title?.scrollIntoView({behavior:'smooth',block:'center'})};
 }
 function improveProfile(){
  const sec=$('profile'),card=sec?.querySelector('.card');if(!card||card.dataset.gtProfileStyled)return;
  card.dataset.gtProfileStyled='1';
  const overview=document.createElement('div');overview.className='gt-profile-overview';overview.innerHTML=`<div class="gt-profile-avatar"><svg class="gc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div><strong id="gtProfileOverviewName">${esc(profile?.name||tr('Твій профіль','Your profile'))}</strong><small id="gtProfileOverviewMeta">${esc(profile?[`${profile.goal||''}`,`${profile.days||3} ${tr('днів/тиждень','days/week')}`,`${profile.duration||30} ${tr('хв','min')}`].filter(Boolean).join(' · '):tr('Персональні дані та умови тренувань','Personal details and training setup'))}</small></div>`;card.prepend(overview);
  let current=null;const children=[...card.children];
  children.forEach(node=>{
   if(node===overview)return;
   if(node.classList?.contains('profile-group-title')){current=document.createElement('section');current.className='gt-profile-section';card.insertBefore(current,node);current.appendChild(node);return;}
   if(current&&node.tagName!=='BUTTON'&&node.classList?.contains('field')===true||current&&node.classList?.contains('grid')){current.appendChild(node);}
  });
  const sessionCard=sec.querySelectorAll(':scope > .card')[1];
  if(sessionCard){const p=sessionCard.querySelector('p');if(p)p.textContent=tr('Керуй своїм входом до Strenova. Дані синхронізуються з акаунтом, якщо хмарне сховище підключене.','Manage your Strenova sign-in. Data syncs with your account when cloud storage is connected.');const h=sessionCard.querySelector('h3');if(h)h.textContent=tr('Акаунт','Account')}
  const dataCard=sec.querySelectorAll(':scope > .card')[2];if(dataCard){const note=dataCard.querySelector('[data-i="dataNote"]');if(note)note.textContent=tr('Можеш експортувати копію своїх даних або скинути профіль і локальні дані цього браузера.','Export a copy of your data or reset the profile and local data in this browser.')}
 }
 function updateProfileOverview(){const n=$('gtProfileOverviewName'),m=$('gtProfileOverviewMeta');if(n)n.textContent=profile?.name||tr('Твій профіль','Your profile');if(m)m.textContent=profile?[profile.goal||'',`${profile.days||3} ${tr('днів/тиждень','days/week')}`,`${profile.duration||30} ${tr('хв','min')}`,profile.place||''].filter(Boolean).join(' · '):tr('Персональні дані та умови тренувань','Personal details and training setup')}
 const oldFill=window.fillEditProfile;if(typeof oldFill==='function'&&!oldFill.__gtProfileOverview){const wrapped=function(){oldFill();updateProfileOverview()};wrapped.__gtProfileOverview=true;window.fillEditProfile=wrapped}
 const oldGenerate=window.gtGenerateSchedule;if(typeof oldGenerate==='function'&&!oldGenerate.__gtOptimizedSchedule){const wrapped=async function(){if(!profile){window.showPage('setup');return}const plan=window.gtGetOptimizedPlan?.()||buildPlan();const start=new Date();start.setHours(12,0,0,0);const days=plan.days||[];if(!days.length){await oldGenerate();return}const made=[];let offset=1;for(let i=0;i<days.length;i++){const d=new Date(start);d.setDate(d.getDate()+offset);while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()+1);const date=gtTodayFrom(d);const item={title:String(days[i].title||`Workout ${i+1}`).replace(/^\d+\.\s*/,''),date,details:{source:'plan',dayIndex:i,exercises:(days[i].items||[]).map(x=>Array.isArray(x)?[String(x[0]),String(x[1]||'3 × 8–12')]:[String(x.name||x),String(x.prescription||'3 × 8–12')])}};if(gtSupabase&&gtUser){const {data,error}=await gtSupabase.from('workout_schedule').insert({user_id:gtUser.id,title:item.title,scheduled_for:date,details:item.details}).select().single();if(error){alert('Не вдалося зберегти розклад: '+error.message);return}item.id=data.id}else item.id='local-'+Date.now()+'-'+i;made.push(item);offset+=Math.max(1,Math.floor(7/days.length))}gtSchedule=[...gtSchedule,...made];gtSaveLocalSchedule();gtRenderSchedule()};wrapped.__gtOptimizedSchedule=true;window.gtGenerateSchedule=wrapped}
 const oldSchedule=window.gtRenderSchedule;if(typeof oldSchedule==='function'&&!oldSchedule.__gtModernCalendar){const wrapped=function(){oldSchedule();renderModernCalendar()};wrapped.__gtModernCalendar=true;window.gtRenderSchedule=wrapped}
 const oldShow=window.showPage;if(typeof oldShow==='function'&&!oldShow.__gtCoachRoutes){const wrapped=function(id){if(id==='coach-inbox'&&!state.coach){id='subscription'}oldShow(id);activeNav(id);if(id==='calendar'){mountModernCalendar();renderModernCalendar()}if(id==='subscription')refreshAccess();if(id==='coach-live'){renderCoachAccess();loadLiveThread()}if(id==='coach-inbox'){renderCoachAccess();renderInbox()}if(id==='profile'){improveProfile();updateProfileOverview()}};wrapped.__gtCoachRoutes=true;window.showPage=wrapped}
 const oldSubscription=window.gtRenderSubscription;if(typeof oldSubscription==='function'&&!oldSubscription.__gtAccessWrapped){const wrapped=function(){oldSubscription();renderSubscriptionState()};wrapped.__gtAccessWrapped=true;window.gtRenderSubscription=wrapped}
 function boot(){mountChatPages();mountModernCalendar();improveProfile();renderAccessNav();renderCoachAccess();
  const sb=client();if(sb?.auth){sb.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(refreshAccess,0);else{disconnectRealtime();state.plus=false;state.coach=false;renderAccessNav();renderCoachAccess()}})}
  else {state.accessMessage=tr('Система акаунтів не налаштована.','Account service is not configured.');renderCoachAccess()}
  if($('subscription')?.classList.contains('active'))renderSubscriptionState();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.addEventListener('focus',()=>{if(currentUser())refreshAccess()});
 window.gtRefreshPlusAccess=refreshAccess;
})();
