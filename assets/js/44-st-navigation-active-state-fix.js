(function(){
  const nav=document.getElementById('nav');
  const base=window.showPage;
  if(!nav||typeof base!=='function'||window.__stNavActiveStateFix)return;
  window.__stNavActiveStateFix=true;
  const sync=(requested)=>{
    const activeId=document.querySelector('.page.active')?.id||requested;
    let key=requested==='calendar'?'calendar':activeId;
    if(['recommend','session'].includes(activeId))key='training';
    if(['coach-live','coach-inbox','coach'].includes(activeId))key='coach';
    nav.querySelectorAll('button[data-page]').forEach(button=>{
      const active=button.dataset.page===key;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
  };
  window.showPage=function(id,...args){
    const result=base.apply(this,[id,...args]);
    requestAnimationFrame(()=>sync(id));
    setTimeout(()=>sync(id),140);
    return result;
  };
  sync(document.querySelector('.page.active')?.id||'home');
})();
