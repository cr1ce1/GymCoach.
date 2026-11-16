(()=>{
 const $=id=>document.getElementById(id);
 const tr=(uk,en)=>document.documentElement.lang?.toLowerCase().startsWith('en')?en:uk;
 const owner=()=>{try{return window.gtUser?.id||window.GT_USER?.id||localStorage.getItem('gtai_user_id')||'local'}catch(_){return'local'}};
 const noteKey=()=>`gtai_workout_day_note_v1:${owner()}:${String(window.currentWorkout||'Workout').trim().toLowerCase()}`;
 let noteTimer=null;
 function addDayNote(){
   const session=$('session'),list=$('exerciseList');if(!session||!list||!session.classList.contains('active'))return;
   let card=$('gtWorkoutDayNote');if(!card){card=document.createElement('section');card.id='gtWorkoutDayNote';card.innerHTML=`<div class="gt-note-head"><span class="gt-note-icon">✎</span><div><strong>${tr('Нотатка до тренування','Workout note')}</strong><p>${tr('Занотуй самопочуття, ціль або підказку на сьогодні. Збережеться автоматично.','Record how you feel, today’s goal, or a technique cue. Saves automatically.')}</p></div></div><textarea id="gtWorkoutDayNoteInput" maxlength="3000" placeholder="${tr('Наприклад: тримати техніку, не поспішати, плече без дискомфорту…','E.g. focus on form, keep a steady pace, shoulder feels comfortable…')}"></textarea><small class="gt-note-status" id="gtWorkoutDayNoteStatus" role="status"></small>`;
     list.insertAdjacentElement('beforebegin',card);
     const input=$('gtWorkoutDayNoteInput');input.addEventListener('input',()=>{if(noteTimer)clearTimeout(noteTimer);$('gtWorkoutDayNoteStatus').textContent=tr('Збереження…','Saving…');noteTimer=setTimeout(()=>{try{localStorage.setItem(noteKey(),input.value);$('gtWorkoutDayNoteStatus').textContent=tr('Збережено на цьому пристрої','Saved on this device')}catch(_){$('gtWorkoutDayNoteStatus').textContent=tr('Не вдалося зберегти нотатку','Could not save note')}},250)});
   }
   const input=$('gtWorkoutDayNoteInput');if(input&&document.activeElement!==input){try{input.value=localStorage.getItem(noteKey())||''}catch(_){}}
 }
 function enhanceLibrary(){
   const page=$('library'),editor=$('gtCustomExerciseEditor');if(!page||!editor)return;
   if(!$('gtLibraryAddExerciseJump')){const jump=document.createElement('div');jump.id='gtLibraryAddExerciseJump';jump.innerHTML=`<span><b>${tr('Не знайшов потрібну вправу?','Can’t find the exercise you need?')}</b><br>${tr('Створи власну та додай її до своєї бібліотеки.','Create your own and add it to your library.')}</span><button type="button">＋ ${tr('Додати вправу','Add exercise')}</button>`;editor.insertAdjacentElement('beforebegin',jump);jump.querySelector('button').addEventListener('click',()=>{editor.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('gtCustomExerciseName')?.focus({preventScroll:true}),250)})}
 }
 function init(){
   const session=$('session');if(session){const mo=new MutationObserver(()=>{if(session.classList.contains('active'))addDayNote()});mo.observe(session,{attributes:true,attributeFilter:['class']});const list=$('exerciseList');if(list)new MutationObserver(()=>{if(session.classList.contains('active'))addDayNote()}).observe(list,{childList:true,subtree:false});if(session.classList.contains('active'))addDayNote()}
   const lib=$('library');if(lib){new MutationObserver(()=>enhanceLibrary()).observe(lib,{childList:true,subtree:true});enhanceLibrary()}
   const original=window.showPage;if(typeof original==='function'&&!original.__gtModernNoteHook){const wrapped=function(id,...args){const result=original.apply(this,[id,...args]);setTimeout(()=>{if(id==='session')addDayNote();if(id==='library')enhanceLibrary()},100);return result};wrapped.__gtModernNoteHook=true;window.showPage=wrapped;try{showPage=wrapped}catch(_){}}
   document.addEventListener('visibilitychange',()=>{if(!document.hidden){addDayNote();enhanceLibrary()}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
