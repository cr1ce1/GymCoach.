(function(){
  const $ = id => document.getElementById(id);
  const language = () => (document.documentElement.lang || 'uk').startsWith('en') ? 'en' : 'uk';
  const words = {
    uk:{profileBasics:'Особисті дані',profileTraining:'Мета та умови тренувань',profileSchedule:'Твій розклад',targetWeightLabel:'Бажана вага, кг',targetWeightHint:'Використовуй це як орієнтир, а не як причину різко обмежувати їжу чи навантаження. До 18 років узгодь вагову ціль із медичним фахівцем.',gMass:'Набрати вагу / м’язову масу',gLose:'Схуднути / покращити фізичну форму',goalMissing:'Вкажи бажану вагу для обраної мети.',saved:'Програму збережено.'},
    en:{profileBasics:'Personal details',profileTraining:'Goal and training setup',profileSchedule:'Your schedule',targetWeightLabel:'Target weight, kg',targetWeightHint:'Use this as a reference, not a reason to sharply restrict food or training. If you are under 18, discuss weight goals with a health professional.',gMass:'Gain weight / build muscle',gLose:'Lose weight / improve fitness',goalMissing:'Enter a target weight for the selected goal.',saved:'Program saved.'}
  };
  try{Object.assign(translations.uk,{profileBasics:words.uk.profileBasics,profileTraining:words.uk.profileTraining,profileSchedule:words.uk.profileSchedule,targetWeightLabel:words.uk.targetWeightLabel,targetWeightHint:words.uk.targetWeightHint,gMass:words.uk.gMass,gLose:words.uk.gLose});Object.assign(translations.en,{profileBasics:words.en.profileBasics,profileTraining:words.en.profileTraining,profileSchedule:words.en.profileSchedule,targetWeightLabel:words.en.targetWeightLabel,targetWeightHint:words.en.targetWeightHint,gMass:words.en.gMass,gLose:words.en.gLose});}catch(e){}
  window.gtToggleTargetWeightFields=function(){
    const pGoal=$('pGoal'),editGoal=$('editGoal');
    [['p',pGoal],['edit',editGoal]].forEach(([prefix,select])=>{
      const wrapper=$(prefix==='p'?'pTargetWeightWrap':'editTargetWeightWrap');
      const input=$(prefix==='p'?'pTargetWeight':'editTargetWeight');if(!wrapper||!select)return;
      const visible=['lose','muscle'].includes(select.value);wrapper.hidden=!visible;
      if(input){input.required=visible;if(!visible)input.value='';}
    });
  };
  const style=document.createElement('style');style.textContent=`
    .profile-group-title{grid-column:1/-1;margin:10px 0 1px;padding:12px 14px;border:1px solid var(--line);border-radius:13px;background:var(--panel2);color:var(--lime);font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
    .conditional-target-weight[hidden]{display:none!important}.conditional-target-weight{padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(181,79,248,.06)}
    .th-custom-builder{display:grid;grid-template-columns:minmax(0,2fr) minmax(130px,1fr);gap:10px;align-items:end;margin-top:12px}
    .th-custom-builder label,.th-secondary-panel>label{display:block;margin-bottom:10px;color:var(--text);font-size:13px;font-weight:750}
    .th-custom-builder .th-btn{grid-column:1/-1;justify-self:start}
    .th-custom-builder .th-field,.th-secondary-panel>label .th-field{width:100%;display:block;margin-top:6px}
    .th-custom-draft-list{margin-top:12px}.th-custom-draft-list .th-custom-row{margin-top:8px}.th-custom-manual{margin-top:14px;color:var(--muted);font-size:13px}.th-custom-manual textarea{width:100%;display:block;margin-top:8px}
    #pTargetWeight,#editTargetWeight{width:100%}
    @media(max-width:520px){.th-custom-builder{grid-template-columns:1fr}.th-custom-builder .th-btn{grid-column:auto;justify-self:stretch}.profile-group-title{font-size:11px}}
  `;document.head.append(style);
  document.addEventListener('change',e=>{if(e.target?.id==='pGoal'||e.target?.id==='editGoal')window.gtToggleTargetWeightFields();});
  document.addEventListener('DOMContentLoaded',()=>{
    window.gtToggleTargetWeightFields();
    // Keep the target field visible when opening an existing profile and after switching language.
    const originalFill=window.fillEditProfile;
    if(typeof originalFill==='function'&&!originalFill.__targetWeightWrapped){const wrapped=function(){originalFill();window.gtToggleTargetWeightFields()};wrapped.__targetWeightWrapped=true;window.fillEditProfile=wrapped;}
    const originalToggle=window.applyLang;
    if(typeof originalToggle==='function'&&!originalToggle.__targetWeightWrapped){const wrapped=function(){originalToggle();window.gtToggleTargetWeightFields()};wrapped.__targetWeightWrapped=true;window.applyLang=wrapped;}
    document.querySelectorAll('#pGoal,#editGoal').forEach(el=>el.addEventListener('change',window.gtToggleTargetWeightFields));
    if(typeof window.applyLang==='function')window.applyLang();
  });
  window.addEventListener('load',()=>{window.gtToggleTargetWeightFields();});
})();
