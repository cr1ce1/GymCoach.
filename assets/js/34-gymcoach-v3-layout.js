(()=>{
  const moveNavigation=()=>{
    const header=document.querySelector('header.top');
    const nav=document.getElementById('nav');
    if(header&&nav&&nav.previousElementSibling!==header)header.insertAdjacentElement('afterend',nav);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',moveNavigation,{once:true});
  else moveNavigation();
})();
