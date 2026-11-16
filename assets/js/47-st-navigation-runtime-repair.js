(function(){
  'use strict';
  if(window.__stNavigationRuntimeRepairV2)return;
  window.__stNavigationRuntimeRepairV2=true;
  const nav=document.getElementById('nav');
  const previousShowPage=window.showPage;
  function mountCalendarInProfile(){
    const profile=document.getElementById('profile');
    const calendar=document.getElementById('calendar');
    if(!profile||!calendar)return null;
    calendar.classList.remove('page','active');
    calendar.classList.add('gt-profile-calendar');
    const firstCard=profile.querySelector(':scope > .card');
    if(calendar.parentElement!==profile){
      if(firstCard)firstCard.insertAdjacentElement('afterend',calendar);
      else profile.appendChild(calendar);
    }else if(firstCard&&calendar.previousElementSibling!==firstCard){
      firstCard.insertAdjacentElement('afterend',calendar);
    }
    return calendar;
  }
  function markNavigation(id){
    if(!nav)return;
    let key=id;
    if(id==='calendar'||id==='profile')key='profile';
    if(['recommend','session','library','stats','history'].includes(id))key='training';
    if(['coach-live','coach-inbox'].includes(id))key='coach';
    nav.querySelectorAll('button[data-page]').forEach(button=>{
      const active=button.dataset.page===key;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
  }
  function activatePage(id){
    const target=document.getElementById(id);
    if(!target)return false;
    const page=target.classList.contains('page')?target:target.closest('.page');
    document.querySelectorAll('.page.active').forEach(item=>item.classList.remove('active'));
    if(page)page.classList.add('active');
    if(nav)nav.style.display=id==='setup'?'none':'flex';
    markNavigation(id);
    return true;
  }
  function openProfileCalendar(args,context){
    let result;
    try{
      if(typeof previousShowPage==='function')result=previousShowPage.apply(context,['profile'].concat(args||[]));
    }catch(error){console.error('Strenova calendar navigation failed:',error)}
    activatePage('profile');
    const reveal=function(){
      const calendar=mountCalendarInProfile();
      if(calendar){
        markNavigation('profile');
        calendar.scrollIntoView({behavior:'smooth',block:'start'});
      }else console.warn('Strenova calendar section was not found inside the profile.');
    };
    requestAnimationFrame(()=>requestAnimationFrame(reveal));
    setTimeout(reveal,160);
    return result;
  }
  window.showPage=function(id){
    const args=Array.prototype.slice.call(arguments,1);
    if(id==='calendar')return openProfileCalendar(args,this);
    const route=id==='training'?'recommend':id;
    let result;
    try{if(typeof previousShowPage==='function')result=previousShowPage.apply(this,[route].concat(args))}
    catch(error){console.error('Strenova navigation failed:',route,error)}
    if(route==='profile'){
      mountCalendarInProfile();
      requestAnimationFrame(mountCalendarInProfile);
    }
    if(!activatePage(route)){
      console.warn('Strenova navigation target does not exist:',route);
      return result;
    }
    try{window.scrollTo({top:0,behavior:'smooth'})}catch(_){}
    return result;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountCalendarInProfile(),{once:true});
  else mountCalendarInProfile();
})();
