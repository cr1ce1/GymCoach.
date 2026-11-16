(function(){
  'use strict';
  const nav=document.getElementById('nav');
  if(!nav||window.__stNavigationFinalFixV2)return;
  window.__stNavigationFinalFixV2=true;
  const routes=new Set(['home','training','nutrition','profile','calendar','coach','coach-live','coach-inbox','stats','history','library','subscription']);
  nav.addEventListener('click',function(event){
    const button=event.target.closest('button[data-page]');
    if(!button||!nav.contains(button))return;
    const key=button.dataset.page;
    if(!routes.has(key))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(key==='coach'&&typeof window.__stOpenCoachTab==='function'){
      window.__stOpenCoachTab();
      return;
    }
    const route=key==='training'?'recommend':key;
    if(typeof window.showPage==='function')window.showPage(route);
  },true);
  nav.querySelectorAll('button[data-page]').forEach(button=>{
    button.type='button';
    if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label',button.innerText.trim());
  });
})();
