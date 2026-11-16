(function(){
  'use strict';
  const LANGS=[
    {code:'en',name:'English',flag:'🇬🇧'},{code:'uk',name:'Українська',flag:'🇺🇦'},
    {code:'pl',name:'Polski',flag:'🇵🇱'},{code:'de',name:'Deutsch',flag:'🇩🇪'},
    {code:'fr',name:'Français',flag:'🇫🇷'},{code:'es',name:'Español',flag:'🇪🇸'},
    {code:'it',name:'Italiano',flag:'🇮🇹'},{code:'pt',name:'Português',flag:'🇵🇹'},
    {code:'nl',name:'Nederlands',flag:'🇳🇱'},{code:'tr',name:'Türkçe',flag:'🇹🇷'},
    {code:'cs',name:'Čeština',flag:'🇨🇿'},{code:'sk',name:'Slovenčina',flag:'🇸🇰'},
    {code:'ro',name:'Română',flag:'🇷🇴'},{code:'hu',name:'Magyar',flag:'🇭🇺'},
    {code:'bg',name:'Български',flag:'🇧🇬'},{code:'ru',name:'Русский',flag:'🇷🇺'}
  ];
  const MAPS={
    pl:{'Home':'Strona główna','Training':'Trening','Workouts':'Treningi','Nutrition':'Odżywianie','Profile':'Profil','Plan':'Plan','History':'Historia','Features':'Funkcje','For athletes':'Dla sportowców','For coaches':'Dla trenerów','Pricing':'Cennik','FAQ':'FAQ','Log in':'Zaloguj się','Get started':'Rozpocznij','Start training':'Rozpocznij trening','Explore features':'Poznaj funkcje','Training programs':'Programy treningowe','Workout tracking':'Śledzenie treningów','Progress analytics':'Analiza postępów','Exercise library':'Biblioteka ćwiczeń','Training calendar':'Kalendarz treningów','Personal records':'Rekordy osobiste','Protein':'Białko','Fat':'Tłuszcze','Carbs':'Węglowodany','Save':'Zapisz','Delete':'Usuń','Search':'Szukaj','Add':'Dodaj','Edit':'Edytuj','Rest':'Odpoczynek','Day':'Dzień','Sets':'Serie','Reps':'Powtórzenia','Start workout':'Rozpocznij trening','Finish and save':'Zakończ i zapisz'},
    de:{'Home':'Startseite','Training':'Training','Workouts':'Workouts','Nutrition':'Ernährung','Profile':'Profil','Plan':'Plan','History':'Verlauf','Features':'Funktionen','For athletes':'Für Sportler','For coaches':'Für Trainer','Pricing':'Preise','FAQ':'FAQ','Log in':'Anmelden','Get started':'Loslegen','Start training':'Training starten','Explore features':'Funktionen ansehen','Training programs':'Trainingsprogramme','Workout tracking':'Training erfassen','Progress analytics':'Fortschrittsanalyse','Exercise library':'Übungsbibliothek','Training calendar':'Trainingskalender','Personal records':'Persönliche Bestleistungen','Protein':'Eiweiß','Fat':'Fett','Carbs':'Kohlenhydrate','Save':'Speichern','Delete':'Löschen','Search':'Suchen','Add':'Hinzufügen','Edit':'Bearbeiten','Rest':'Pause','Day':'Tag','Sets':'Sätze','Reps':'Wiederholungen','Start workout':'Training starten','Finish and save':'Beenden und speichern'},
    fr:{'Home':'Accueil','Training':'Entraînement','Workouts':'Séances','Nutrition':'Nutrition','Profile':'Profil','Plan':'Programme','History':'Historique','Features':'Fonctionnalités','For athletes':'Pour les sportifs','For coaches':'Pour les coachs','Pricing':'Tarifs','FAQ':'FAQ','Log in':'Connexion','Get started':'Commencer','Start training':'Commencer à s’entraîner','Explore features':'Découvrir les fonctions','Training programs':'Programmes d’entraînement','Workout tracking':'Suivi des séances','Progress analytics':'Analyse des progrès','Exercise library':'Bibliothèque d’exercices','Training calendar':'Calendrier d’entraînement','Personal records':'Records personnels','Protein':'Protéines','Fat':'Lipides','Carbs':'Glucides','Save':'Enregistrer','Delete':'Supprimer','Search':'Rechercher','Add':'Ajouter','Edit':'Modifier','Rest':'Repos','Day':'Jour','Sets':'Séries','Reps':'Répétitions','Start workout':'Commencer la séance','Finish and save':'Terminer et enregistrer'},
    es:{'Home':'Inicio','Training':'Entrenamiento','Workouts':'Sesiones','Nutrition':'Nutrición','Profile':'Perfil','Plan':'Plan','History':'Historial','Features':'Funciones','For athletes':'Para deportistas','For coaches':'Para entrenadores','Pricing':'Precios','FAQ':'FAQ','Log in':'Iniciar sesión','Get started':'Empezar','Start training':'Empezar a entrenar','Explore features':'Ver funciones','Training programs':'Programas de entrenamiento','Workout tracking':'Seguimiento del entrenamiento','Progress analytics':'Análisis del progreso','Exercise library':'Biblioteca de ejercicios','Training calendar':'Calendario de entrenamiento','Personal records':'Récords personales','Protein':'Proteínas','Fat':'Grasas','Carbs':'Carbohidratos','Save':'Guardar','Delete':'Eliminar','Search':'Buscar','Add':'Añadir','Edit':'Editar','Rest':'Descanso','Day':'Día','Sets':'Series','Reps':'Repeticiones','Start workout':'Iniciar sesión de entrenamiento','Finish and save':'Finalizar y guardar'},
    it:{'Home':'Home','Training':'Allenamento','Workouts':'Sessioni','Nutrition':'Nutrizione','Profile':'Profilo','Plan':'Piano','History':'Cronologia','Features':'Funzionalità','For athletes':'Per atleti','For coaches':'Per coach','Pricing':'Prezzi','FAQ':'FAQ','Log in':'Accedi','Get started':'Inizia','Start training':'Inizia ad allenarti','Explore features':'Scopri le funzionalità','Training programs':'Programmi di allenamento','Workout tracking':'Monitoraggio allenamenti','Progress analytics':'Analisi dei progressi','Exercise library':'Libreria esercizi','Training calendar':'Calendario allenamenti','Personal records':'Record personali','Protein':'Proteine','Fat':'Grassi','Carbs':'Carboidrati','Save':'Salva','Delete':'Elimina','Search':'Cerca','Add':'Aggiungi','Edit':'Modifica','Rest':'Recupero','Day':'Giorno','Sets':'Serie','Reps':'Ripetizioni','Start workout':'Inizia allenamento','Finish and save':'Termina e salva'},
    pt:{'Home':'Início','Training':'Treino','Workouts':'Treinos','Nutrition':'Nutrição','Profile':'Perfil','Plan':'Plano','History':'Histórico','Features':'Funcionalidades','For athletes':'Para atletas','For coaches':'Para treinadores','Pricing':'Preços','FAQ':'FAQ','Log in':'Entrar','Get started':'Começar','Start training':'Começar a treinar','Explore features':'Explorar funcionalidades','Training programs':'Planos de treino','Workout tracking':'Registo de treinos','Progress analytics':'Análise do progresso','Exercise library':'Biblioteca de exercícios','Training calendar':'Calendário de treinos','Personal records':'Recordes pessoais','Protein':'Proteínas','Fat':'Gorduras','Carbs':'Hidratos de carbono','Save':'Guardar','Delete':'Eliminar','Search':'Pesquisar','Add':'Adicionar','Edit':'Editar','Rest':'Descanso','Day':'Dia','Sets':'Séries','Reps':'Repetições','Start workout':'Iniciar treino','Finish and save':'Terminar e guardar'},
    nl:{'Home':'Home','Training':'Training','Workouts':'Workouts','Nutrition':'Voeding','Profile':'Profiel','Plan':'Schema','History':'Geschiedenis','Features':'Functies','For athletes':'Voor sporters','For coaches':'Voor coaches','Pricing':'Prijzen','FAQ':'FAQ','Log in':'Inloggen','Get started':'Aan de slag','Start training':'Training starten','Explore features':'Bekijk functies','Training programs':'Trainingsprogramma’s','Workout tracking':'Trainingen bijhouden','Progress analytics':'Voortgangsanalyse','Exercise library':'Oefeningenbibliotheek','Training calendar':'Trainingskalender','Personal records':'Persoonlijke records','Protein':'Eiwitten','Fat':'Vetten','Carbs':'Koolhydraten','Save':'Opslaan','Delete':'Verwijderen','Search':'Zoeken','Add':'Toevoegen','Edit':'Bewerken','Rest':'Rust','Day':'Dag','Sets':'Sets','Reps':'Herhalingen','Start workout':'Training starten','Finish and save':'Afronden en opslaan'},
    tr:{'Home':'Ana Sayfa','Training':'Antrenman','Workouts':'Antrenmanlar','Nutrition':'Beslenme','Profile':'Profil','Plan':'Plan','History':'Geçmiş','Features':'Özellikler','For athletes':'Sporcular için','For coaches':'Antrenörler için','Pricing':'Fiyatlandırma','FAQ':'SSS','Log in':'Giriş yap','Get started':'Başla','Start training':'Antrenmana başla','Explore features':'Özellikleri keşfet','Training programs':'Antrenman programları','Workout tracking':'Antrenman takibi','Progress analytics':'İlerleme analizi','Exercise library':'Egzersiz kütüphanesi','Training calendar':'Antrenman takvimi','Personal records':'Kişisel rekorlar','Protein':'Protein','Fat':'Yağ','Carbs':'Karbonhidrat','Save':'Kaydet','Delete':'Sil','Search':'Ara','Add':'Ekle','Edit':'Düzenle','Rest':'Dinlenme','Day':'Gün','Sets':'Set','Reps':'Tekrar','Start workout':'Antrenmanı başlat','Finish and save':'Bitir ve kaydet'},
    cs:{'Home':'Domů','Training':'Trénink','Workouts':'Tréninky','Nutrition':'Výživa','Profile':'Profil','Plan':'Plán','History':'Historie','Features':'Funkce','For athletes':'Pro sportovce','For coaches':'Pro trenéry','Pricing':'Ceník','FAQ':'FAQ','Log in':'Přihlásit se','Get started':'Začít','Start training':'Začít trénovat','Explore features':'Prozkoumat funkce','Training programs':'Tréninkové programy','Workout tracking':'Sledování tréninku','Progress analytics':'Analýza pokroku','Exercise library':'Knihovna cviků','Training calendar':'Tréninkový kalendář','Personal records':'Osobní rekordy','Protein':'Bílkoviny','Fat':'Tuky','Carbs':'Sacharidy','Save':'Uložit','Delete':'Smazat','Search':'Hledat','Add':'Přidat','Edit':'Upravit','Rest':'Odpočinek','Day':'Den','Sets':'Série','Reps':'Opakování','Start workout':'Zahájit trénink','Finish and save':'Dokončit a uložit'},
    sk:{'Home':'Domov','Training':'Tréning','Workouts':'Tréningy','Nutrition':'Výživa','Profile':'Profil','Plan':'Plán','History':'História','Features':'Funkcie','For athletes':'Pre športovcov','For coaches':'Pre trénerov','Pricing':'Cenník','FAQ':'FAQ','Log in':'Prihlásiť sa','Get started':'Začať','Start training':'Začať trénovať','Explore features':'Preskúmať funkcie','Training programs':'Tréningové programy','Workout tracking':'Sledovanie tréningu','Progress analytics':'Analýza pokroku','Exercise library':'Knižnica cvikov','Training calendar':'Tréningový kalendár','Personal records':'Osobné rekordy','Protein':'Bielkoviny','Fat':'Tuky','Carbs':'Sacharidy','Save':'Uložiť','Delete':'Odstrániť','Search':'Hľadať','Add':'Pridať','Edit':'Upraviť','Rest':'Oddych','Day':'Deň','Sets':'Série','Reps':'Opakovania','Start workout':'Začať tréning','Finish and save':'Dokončiť a uložiť'},
    ro:{'Home':'Acasă','Training':'Antrenament','Workouts':'Antrenamente','Nutrition':'Nutriție','Profile':'Profil','Plan':'Plan','History':'Istoric','Features':'Funcții','For athletes':'Pentru sportivi','For coaches':'Pentru antrenori','Pricing':'Prețuri','FAQ':'Întrebări frecvente','Log in':'Autentificare','Get started':'Începe','Start training':'Începe antrenamentul','Explore features':'Explorează funcțiile','Training programs':'Programe de antrenament','Workout tracking':'Urmărirea antrenamentelor','Progress analytics':'Analiza progresului','Exercise library':'Biblioteca de exerciții','Training calendar':'Calendar de antrenament','Personal records':'Recorduri personale','Protein':'Proteine','Fat':'Grăsimi','Carbs':'Carbohidrați','Save':'Salvează','Delete':'Șterge','Search':'Caută','Add':'Adaugă','Edit':'Editează','Rest':'Pauză','Day':'Zi','Sets':'Serii','Reps':'Repetări','Start workout':'Începe antrenamentul','Finish and save':'Finalizează și salvează'},
    hu:{'Home':'Kezdőlap','Training':'Edzés','Workouts':'Edzések','Nutrition':'Táplálkozás','Profile':'Profil','Plan':'Terv','History':'Előzmények','Features':'Funkciók','For athletes':'Sportolóknak','For coaches':'Edzőknek','Pricing':'Árak','FAQ':'GYIK','Log in':'Bejelentkezés','Get started':'Kezdés','Start training':'Edzés indítása','Explore features':'Funkciók felfedezése','Training programs':'Edzésprogramok','Workout tracking':'Edzések követése','Progress analytics':'Fejlődés elemzése','Exercise library':'Gyakorlatkönyvtár','Training calendar':'Edzésnaptár','Personal records':'Személyes rekordok','Protein':'Fehérje','Fat':'Zsír','Carbs':'Szénhidrát','Save':'Mentés','Delete':'Törlés','Search':'Keresés','Add':'Hozzáadás','Edit':'Szerkesztés','Rest':'Pihenő','Day':'Nap','Sets':'Sorozat','Reps':'Ismétlés','Start workout':'Edzés indítása','Finish and save':'Befejezés és mentés'},
    bg:{'Home':'Начало','Training':'Тренировка','Workouts':'Тренировки','Nutrition':'Хранене','Profile':'Профил','Plan':'План','History':'История','Features':'Функции','For athletes':'За спортисти','For coaches':'За треньори','Pricing':'Цени','FAQ':'ЧЗВ','Log in':'Вход','Get started':'Започни','Start training':'Започни тренировка','Explore features':'Разгледай функциите','Training programs':'Тренировъчни програми','Workout tracking':'Проследяване на тренировки','Progress analytics':'Анализ на напредъка','Exercise library':'Библиотека с упражнения','Training calendar':'Тренировъчен календар','Personal records':'Лични рекорди','Protein':'Протеини','Fat':'Мазнини','Carbs':'Въглехидрати','Save':'Запази','Delete':'Изтрий','Search':'Търси','Add':'Добави','Edit':'Редактирай','Rest':'Почивка','Day':'Ден','Sets':'Серии','Reps':'Повторения','Start workout':'Започни тренировка','Finish and save':'Завърши и запази'},
    ru:{'Home':'Главная','Training':'Тренировки','Workouts':'Занятия','Nutrition':'Питание','Profile':'Профиль','Plan':'План','History':'История','Features':'Возможности','For athletes':'Для спортсменов','For coaches':'Для тренеров','Pricing':'Тарифы','FAQ':'Вопросы','Log in':'Войти','Get started':'Начать','Start training':'Начать тренировку','Explore features':'Посмотреть возможности','Training programs':'Программы тренировок','Workout tracking':'Учёт тренировок','Progress analytics':'Аналитика прогресса','Exercise library':'Библиотека упражнений','Training calendar':'Календарь тренировок','Personal records':'Личные рекорды','Protein':'Белки','Fat':'Жиры','Carbs':'Углеводы','Save':'Сохранить','Delete':'Удалить','Search':'Поиск','Add':'Добавить','Edit':'Изменить','Rest':'Отдых','Day':'День','Sets':'Подходы','Reps':'Повторения','Start workout':'Начать тренировку','Finish and save':'Завершить и сохранить'}
  };
  window.__STR_LOCALE_MAPS=MAPS;
  // Each additional locale has a complete key set; phrase-level translations are applied
  // by the shared DOM translation layer. Untranslated long-form legacy copy safely falls back to English.
  try{
    const base=translations.en||translations.uk;
    LANGS.forEach(x=>{if(x.code!=='en'&&x.code!=='uk')translations[x.code]=Object.assign({},base)});
    if(!LANGS.some(x=>x.code===lang))lang='en';
  }catch(e){console.warn('STRENOVA locale setup:',e)}

  const menu=document.createElement('div');menu.id='stLanguageMenu';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Choose language');
  menu.innerHTML='<div class="st-lang-menu-head"><span>LANGUAGE</span><span>16 OPTIONS</span></div><div class="st-lang-grid">'+LANGS.map(x=>`<button class="st-lang-option" type="button" data-st-lang="${x.code}" aria-pressed="${x.code===lang?'true':'false'}"><span>${x.flag}</span><span>${x.name}</span><small>${x.code.toUpperCase()}</small></button>`).join('')+'</div>';
  document.body.appendChild(menu);
  const codeName=()=>LANGS.find(x=>x.code===lang)?.code.toUpperCase()||'EN';
  function updateLangButtons(){
    const b=document.getElementById('langBtn');if(b){b.innerHTML=`<span>${codeName()}</span><span aria-hidden="true">⌄</span>`;b.setAttribute('aria-label','Choose language');}
    const l=document.getElementById('stLangButton');if(l)l.innerHTML=`${codeName()} <span>⌄</span>`;
    menu.querySelectorAll('[data-st-lang]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.stLang===lang?'true':'false'));
  }
  window.stToggleLanguageMenu=function(){menu.hidden=!menu.hidden;updateLangButtons();};
  window.toggleLang=window.stToggleLanguageMenu;
  window.stSetLanguage=function(code){
    if(!LANGS.some(x=>x.code===code))return;
    lang=code;try{localStorage.setItem('gtai_lang',code)}catch(e){}
    menu.hidden=true;
    if(typeof window.applyLang==='function')window.applyLang();
    updateLangButtons();applyLandingLocale();
  };
  menu.addEventListener('click',e=>{const b=e.target.closest('[data-st-lang]');if(b)window.stSetLanguage(b.dataset.stLang)});
  document.addEventListener('click',e=>{if(menu.hidden)return;if(e.target.closest('#stLanguageMenu,#langBtn,#stLangButton'))return;menu.hidden=true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;window.stHideInstallGuide?.()}});

  const landingUk={features:'Можливості',athletes:'Для спортсменів',coaches:'Для тренерів',pricing:'Тарифи',faq:'Питання',login:'Увійти',getStarted:'Почати',startTraining:'Почати тренування',exploreFeatures:'Переглянути можливості',installStrenova:'Встановити STRENOVA'};
  const landingTexts={
    en:{},uk:landingUk,
    pl:{features:'Funkcje',athletes:'Dla sportowców',coaches:'Dla trenerów',pricing:'Cennik',faq:'FAQ',login:'Zaloguj się',getStarted:'Rozpocznij',startTraining:'Rozpocznij trening',exploreFeatures:'Poznaj funkcje',installStrenova:'Zainstaluj STRENOVA'},
    de:{features:'Funktionen',athletes:'Für Sportler',coaches:'Für Trainer',pricing:'Preise',faq:'FAQ',login:'Anmelden',getStarted:'Loslegen',startTraining:'Training starten',exploreFeatures:'Funktionen ansehen',installStrenova:'STRENOVA installieren'},
    fr:{features:'Fonctionnalités',athletes:'Pour les sportifs',coaches:'Pour les coachs',pricing:'Tarifs',faq:'FAQ',login:'Connexion',getStarted:'Commencer',startTraining:'Commencer à s’entraîner',exploreFeatures:'Découvrir les fonctions',installStrenova:'Installer STRENOVA'},
    es:{features:'Funciones',athletes:'Para deportistas',coaches:'Para entrenadores',pricing:'Precios',faq:'FAQ',login:'Iniciar sesión',getStarted:'Empezar',startTraining:'Empezar a entrenar',exploreFeatures:'Ver funciones',installStrenova:'Instalar STRENOVA'},
    it:{features:'Funzionalità',athletes:'Per atleti',coaches:'Per coach',pricing:'Prezzi',faq:'FAQ',login:'Accedi',getStarted:'Inizia',startTraining:'Inizia ad allenarti',exploreFeatures:'Scopri le funzionalità',installStrenova:'Installa STRENOVA'},
    pt:{features:'Funcionalidades',athletes:'Para atletas',coaches:'Para treinadores',pricing:'Preços',faq:'FAQ',login:'Entrar',getStarted:'Começar',startTraining:'Começar a treinar',exploreFeatures:'Explorar funcionalidades',installStrenova:'Instalar STRENOVA'},
    nl:{features:'Functies',athletes:'Voor sporters',coaches:'Voor coaches',pricing:'Prijzen',faq:'FAQ',login:'Inloggen',getStarted:'Aan de slag',startTraining:'Training starten',exploreFeatures:'Bekijk functies',installStrenova:'STRENOVA installeren'},
    tr:{features:'Özellikler',athletes:'Sporcular için',coaches:'Antrenörler için',pricing:'Fiyatlandırma',faq:'SSS',login:'Giriş yap',getStarted:'Başla',startTraining:'Antrenmana başla',exploreFeatures:'Özellikleri keşfet',installStrenova:'STRENOVA’yı yükle'},
    cs:{features:'Funkce',athletes:'Pro sportovce',coaches:'Pro trenéry',pricing:'Ceník',faq:'FAQ',login:'Přihlásit se',getStarted:'Začít',startTraining:'Začít trénovat',exploreFeatures:'Prozkoumat funkce',installStrenova:'Nainstalovat STRENOVA'},
    sk:{features:'Funkcie',athletes:'Pre športovcov',coaches:'Pre trénerov',pricing:'Cenník',faq:'FAQ',login:'Prihlásiť sa',getStarted:'Začať',startTraining:'Začať trénovať',exploreFeatures:'Preskúmať funkcie',installStrenova:'Nainštalovať STRENOVA'},
    ro:{features:'Funcții',athletes:'Pentru sportivi',coaches:'Pentru antrenori',pricing:'Prețuri',faq:'Întrebări',login:'Autentificare',getStarted:'Începe',startTraining:'Începe antrenamentul',exploreFeatures:'Explorează funcțiile',installStrenova:'Instalează STRENOVA'},
    hu:{features:'Funkciók',athletes:'Sportolóknak',coaches:'Edzőknek',pricing:'Árak',faq:'GYIK',login:'Bejelentkezés',getStarted:'Kezdés',startTraining:'Edzés indítása',exploreFeatures:'Funkciók felfedezése',installStrenova:'STRENOVA telepítése'},
    bg:{features:'Функции',athletes:'За спортисти',coaches:'За треньори',pricing:'Цени',faq:'Въпроси',login:'Вход',getStarted:'Започни',startTraining:'Започни тренировка',exploreFeatures:'Разгледай функциите',installStrenova:'Инсталирай STRENOVA'},
    ru:{features:'Возможности',athletes:'Для спортсменов',coaches:'Для тренеров',pricing:'Тарифы',faq:'Вопросы',login:'Войти',getStarted:'Начать',startTraining:'Начать тренировку',exploreFeatures:'Посмотреть возможности',installStrenova:'Установить STRENOVA'}
  };
  function applyLandingLocale(){
    const pack=landingTexts[lang]||{};
    document.querySelectorAll('#stLanding [data-st-t]').forEach(el=>{const key=el.dataset.stT;if(pack[key])el.textContent=pack[key]});
    const y=document.getElementById('stYear');if(y)y.textContent=String(new Date().getFullYear());
  }
  window.__stApplyLandingLocale=applyLandingLocale;

  const baseApply=window.applyLang;
  window.applyLang=function(){
    if(typeof baseApply==='function')baseApply();
    updateLangButtons();applyLandingLocale();
  };
  window.stSetLanguage(lang);
  applyLandingLocale();

  // PWA prompt support where the browser exposes it; otherwise show precise manual steps.
  window.__stInstallPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.__stInstallPrompt=e;const b=document.getElementById('stInstallNow');if(b)b.hidden=false});
  window.addEventListener('appinstalled',()=>{window.__stInstallPrompt=null;const b=document.getElementById('stInstallNow');if(b)b.hidden=true;window.stHideInstallGuide?.()});
  const installModal=document.getElementById('stInstallGuide');
  // The modal must live outside #stLanding: that parent is hidden after sign-in.
  if(installModal&&installModal.parentElement!==document.body)document.body.appendChild(installModal);
  const installChoice=document.getElementById('stInstallChoice');
  const installFlow=document.getElementById('stInstallFlow');
  const installWarning=document.getElementById('stInstallWarning');
  const installVisual=document.getElementById('stInstallVisual');
  const installBack=document.getElementById('stInstallBack');
  const installNext=document.getElementById('stInstallNext');
  const installFinish=document.getElementById('stInstallFinish');
  const installCopy={
    uk:{eyebrow:'ВСТАНОВЛЕННЯ ЗАСТОСУНКУ',title:'Додай STRENOVA на головний екран',choose:'Обери свій пристрій, щоб побачити правильну інструкцію.',ios:'iPhone',iosSub:'iOS · Safari',android:'Android',androidSub:'Браузер Chrome',back:'Назад',next:'Далі',finish:'Завершити',install:'Встановити зараз',step:'Крок',of:'із',warningSafari:'Щоб встановити STRENOVA на iPhone, відкрий цю сторінку саме у Safari. Скопіюй адресу сайту та встав її в Safari.',warningChrome:'Для встановлення на Android рекомендуємо відкрити STRENOVA у Google Chrome. Скопіюй адресу сайту та відкрий її в Chrome.',warningUnsupported:'Цей браузер може не підтримувати встановлення. Відкрий сайт у Safari на iPhone або Google Chrome на Android.',copy:'Скопіювати адресу',copied:'Адресу скопійовано',foot:'Ілюстрації показують типовий вигляд браузера. Назви пунктів меню можуть трохи відрізнятися залежно від версії пристрою та браузера.',iosSteps:[['Відкрий STRENOVA у Safari','Запусти Safari та введи адресу STRENOVA. Встановлення на iPhone виконується саме через Safari.'],['Натисни «Поділитися»','У нижній панелі Safari натисни кнопку з квадратом і стрілкою вгору.'],['Обери «На початковий екран»','У меню дій прокрути список і натисни «На початковий екран» (Add to Home Screen).'],['Підтверди додавання','Перевір назву STRENOVA у вікні та натисни «Додати» у верхньому куті.'],['Відкривай STRENOVA з іконки','Іконка STRENOVA з’явиться на головному екрані iPhone. Натискай її, щоб запускати застосунок.']],androidSteps:[['Відкрий STRENOVA у Google Chrome','Запусти Chrome на Android і відкрий адресу STRENOVA.'],['Натисни меню з трьома крапками','У правому верхньому куті Chrome натисни ⋮, щоб відкрити меню браузера.'],['Обери «Встановити застосунок»','Знайди «Встановити застосунок» або «Додати на головний екран». Назва залежить від версії Chrome.'],['Підтверди встановлення','У вікні встановлення натисни «Встановити» та дочекайся завершення.'],['Відкривай STRENOVA з іконки','Іконка з’явиться серед застосунків або на головному екрані Android.'] ]},
    en:{eyebrow:'APP INSTALLATION',title:'Add STRENOVA to your home screen',choose:'Choose your device to see the right instructions.',ios:'iPhone',iosSub:'iOS · Safari',android:'Android',androidSub:'Chrome browser',back:'Back',next:'Next',finish:'Finish',install:'Install now',step:'Step',of:'of',warningSafari:'To install STRENOVA on iPhone, open this page in Safari. Copy the website address and paste it into Safari.',warningChrome:'For Android installation, open STRENOVA in Google Chrome. Copy the website address and open it in Chrome.',warningUnsupported:'This browser may not support installation. Open the site in Safari on iPhone or Google Chrome on Android.',copy:'Copy website address',copied:'Address copied',foot:'Illustrations show a typical browser interface. Menu labels may vary slightly by device or browser version.',iosSteps:[['Open STRENOVA in Safari','Launch Safari and enter the STRENOVA website address. iPhone installation is done through Safari.'],['Tap Share','In the Safari toolbar at the bottom, tap the square-and-arrow Share button.'],['Choose “Add to Home Screen”','In the actions menu, scroll the list and tap “Add to Home Screen”.'],['Confirm the addition','Check the STRENOVA name in the preview, then tap “Add” in the top corner.'],['Open STRENOVA from its icon','The STRENOVA icon will appear on your iPhone home screen. Tap it to launch the app.']],androidSteps:[['Open STRENOVA in Google Chrome','Launch Chrome on Android and open the STRENOVA website address.'],['Open the three-dot menu','Tap ⋮ in the top-right corner of Chrome to open the browser menu.'],['Choose “Install app”','Find “Install app” or “Add to Home screen”. The label depends on your Chrome version.'],['Confirm installation','Tap “Install” in the confirmation prompt and wait for it to finish.'],['Open STRENOVA from its icon','The icon will appear in your Android apps or on your home screen.']]}
  };
  let installDevice=null,installStep=0,installPack=installCopy.uk;
  function isStandalone(){
    try{return window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: minimal-ui)').matches||window.navigator.standalone===true||window.__stAppInstalled===true}catch(_){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true||window.__stAppInstalled===true}
  }
  function installBrowser(){
    const ua=navigator.userAgent||'';
    const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const android=/Android/i.test(ua);
    const safari=ios&&/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    const chrome=android&&/Chrome\//i.test(ua)&&!/EdgA|OPR|SamsungBrowser/i.test(ua);
    return {ios,android,safari,chrome};
  }
  function installText(node,text){if(node)node.textContent=text}
  function setInstallTriggerVisibility(){
    const installed=isStandalone();
    document.querySelectorAll('[onclick*="stShowInstallGuide"],.st-nav-install,[data-route="install"]').forEach(button=>{if(installed)button.style.setProperty('display','none','important');else button.style.removeProperty('display');button.setAttribute('aria-hidden',installed?'true':'false')});
    if(installed){const banner=document.getElementById('gtInstallBanner');if(banner)banner.style.display='none'}
  }
  function escSvg(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
  function phoneIllustration(platform,step){
    const uk=installPack===installCopy.uk;
    const isIOS=platform==='ios';
    const title=escSvg('STRENOVA');
    const url=escSvg('cr1ce1.github.io/GymCoach./');
    const browser=isIOS?'Safari':'Chrome';
    const homeLabel=escSvg(isIOS?(uk?'На початковий екран':'Add to Home Screen'):(uk?'Встановити застосунок':'Install app'));
    const shareLabel=escSvg(uk?'Поділитися':'Share');
    const addLabel=escSvg(uk?'Додати':'Add');
    const menuLabel=escSvg(uk?'Меню':'Menu');
    const web=`<rect x="92" y="98" width="176" height="212" rx="15" fill="#171226" stroke="#392854"/><rect x="107" y="115" width="48" height="7" rx="3.5" fill="#8B5CF6"/><text x="107" y="147" fill="#fff" font-size="19" font-weight="800">STRENOVA</text><text x="107" y="166" fill="#B7ADC9" font-size="9">${uk?'Тренування. Харчування. Прогрес.':'Training. Nutrition. Progress.'}</text><rect x="107" y="184" width="146" height="68" rx="10" fill="#251b37"/><rect x="119" y="197" width="78" height="6" rx="3" fill="#A855F7"/><rect x="119" y="211" width="116" height="5" rx="2.5" fill="#59466f"/><rect x="119" y="224" width="96" height="5" rx="2.5" fill="#59466f"/><rect x="107" y="266" width="70" height="25" rx="8" fill="#8B5CF6"/><rect x="185" y="266" width="68" height="25" rx="8" fill="#302342"/>`;
    const topIOS=`<rect x="98" y="35" width="164" height="21" rx="10" fill="#0d0a15"/><text x="108" y="50" fill="#fff" font-size="9" font-weight="700">9:41</text><text x="244" y="50" fill="#fff" font-size="9" text-anchor="end">▮ ▮ ◉</text>`;
    const topAndroid=`<rect x="98" y="35" width="164" height="21" rx="7" fill="#0d0a15"/><text x="108" y="50" fill="#fff" font-size="9" font-weight="700">9:41</text><text x="246" y="50" fill="#fff" font-size="9" text-anchor="end">▮ ▣ ▰</text>`;
    let screen='';
    if(step===0){
      screen=`<rect x="99" y="63" width="162" height="29" rx="14" fill="#f0edf5"/><text x="180" y="81" font-size="9" fill="#332942" text-anchor="middle">${url}</text>${web}<rect x="105" y="326" width="150" height="27" rx="13" fill="#211a2e"/><text x="180" y="343" font-size="10" fill="#d9cdec" text-anchor="middle">${browser}</text>`;
    }else if(isIOS&&step===1){
      screen=`${web}<rect x="92" y="308" width="176" height="130" rx="17" fill="#f6f3f9"/><text x="108" y="329" fill="#392b49" font-size="9" font-weight="700">${shareLabel}</text><rect x="105" y="341" width="150" height="63" rx="10" fill="#e8e2ed"/><circle cx="180" cy="372" r="16" fill="#fff"/><path d="M180 382V361m-8 8 8-8 8 8M169 386h22" fill="none" stroke="#5b3a85" stroke-width="2.5" stroke-linecap="round"/><rect x="148" y="351" width="64" height="43" rx="9" fill="none" stroke="#8B5CF6" stroke-width="3"/><text x="180" y="421" fill="#5b4b68" font-size="8" text-anchor="middle">${shareLabel}</text>`;
    }else if(isIOS&&step===2){
      screen=`<rect x="91" y="110" width="178" height="330" rx="19" fill="#f6f3f9"/><text x="108" y="137" fill="#342442" font-size="10" font-weight="700">${shareLabel}</text><g fill="#493a58" font-size="9"><text x="112" y="174">Copy</text><text x="112" y="214">Print</text><text x="112" y="254">Save to Files</text></g><rect x="102" y="270" width="156" height="42" rx="10" fill="#eadfff" stroke="#8B5CF6" stroke-width="2.5"/><rect x="113" y="280" width="22" height="22" rx="5" fill="#6D28D9"/><path d="M124 285v11m-5-5 5 5 5-5" stroke="#fff" stroke-width="1.5" fill="none"/><text x="143" y="286" fill="#2e2140" font-size="8.5" font-weight="700">${homeLabel}</text><text x="143" y="299" fill="#6b5a78" font-size="7">STRENOVA</text><rect x="101" y="265" width="158" height="52" rx="12" fill="none" stroke="#D946EF" stroke-width="2.5"/>`;
    }else if(isIOS&&step===3){
      screen=`<rect x="91" y="100" width="178" height="340" rx="19" fill="#f6f3f9"/><text x="108" y="126" fill="#59466c" font-size="9">Cancel</text><text x="180" y="126" fill="#342442" font-size="10" font-weight="800" text-anchor="middle">${homeLabel}</text><rect x="151" y="148" width="58" height="58" rx="15" fill="#100b1b"/><path d="M194 161h-17a8 8 0 0 0 0 16h12a5 5 0 0 1 0 10h-17" fill="none" stroke="#A855F7" stroke-width="5" stroke-linecap="round"/><text x="180" y="222" fill="#342442" font-size="11" font-weight="800" text-anchor="middle">STRENOVA</text><rect x="108" y="244" width="144" height="32" rx="8" fill="#e9e3ee"/><text x="118" y="264" fill="#4c3d5b" font-size="9">STRENOVA</text><rect x="101" y="380" width="158" height="40" rx="11" fill="#6D28D9"/><text x="180" y="405" fill="#fff" font-size="12" font-weight="800" text-anchor="middle">${addLabel}</text><rect x="96" y="374" width="168" height="52" rx="14" fill="none" stroke="#D946EF" stroke-width="3"/>`;
    }else if(isIOS&&step===4){
      screen=`<rect x="92" y="88" width="176" height="350" rx="18" fill="#22133b"/><circle cx="180" cy="152" r="31" fill="#39205e"/><text x="180" y="157" fill="#fff" font-size="10" text-anchor="middle">9:41</text><g fill="#e8def5"><rect x="111" y="218" width="32" height="32" rx="9"/><rect x="164" y="218" width="32" height="32" rx="9"/><rect x="217" y="218" width="32" height="32" rx="9"/></g><rect x="164" y="278" width="36" height="36" rx="10" fill="#090711" stroke="#D946EF" stroke-width="2.5"/><path d="M190 286h-12a6 6 0 0 0 0 12h7a4 4 0 0 1 0 8h-13" fill="none" stroke="#A855F7" stroke-width="3.2" stroke-linecap="round"/><text x="182" y="327" fill="#fff" font-size="8.5" text-anchor="middle" font-weight="700">STRENOVA</text><rect x="155" y="270" width="54" height="67" rx="13" fill="none" stroke="#D946EF" stroke-width="2.5"/>`;
    }else if(step===1){
      screen=`${web}<rect x="235" y="35" width="26" height="29" rx="8" fill="#342347"/><circle cx="243" cy="49" r="1.8" fill="#fff"/><circle cx="249" cy="49" r="1.8" fill="#fff"/><circle cx="255" cy="49" r="1.8" fill="#fff"/><rect x="229" y="29" width="39" height="41" rx="10" fill="none" stroke="#D946EF" stroke-width="3"/>`;
    }else if(step===2){
      screen=`<rect x="92" y="90" width="176" height="350" rx="16" fill="#f8f6fa"/><text x="108" y="117" fill="#332540" font-size="10" font-weight="700">${menuLabel}</text><g fill="#493b57" font-size="9"><text x="112" y="155">New tab</text><text x="112" y="190">History</text><text x="112" y="225">Downloads</text></g><rect x="103" y="243" width="154" height="44" rx="10" fill="#e9dfff" stroke="#8B5CF6" stroke-width="2.5"/><rect x="114" y="254" width="22" height="22" rx="5" fill="#6D28D9"/><text x="145" y="260" fill="#2c203c" font-size="8.5" font-weight="700">${homeLabel}</text><text x="145" y="274" fill="#6b5a78" font-size="7">STRENOVA</text><rect x="103" y="243" width="154" height="44" rx="10" fill="none" stroke="#D946EF" stroke-width="2.5"/>`;
    }else if(step===3){
      screen=`${web}<rect x="92" y="250" width="176" height="190" rx="20" fill="#f8f6fa"/><text x="180" y="278" fill="#38294a" font-size="11" font-weight="800" text-anchor="middle">${uk?'Встановити застосунок?':'Install app?'}</text><rect x="150" y="292" width="60" height="54" rx="14" fill="#090711"/><path d="M194 302h-15a7 7 0 0 0 0 14h10a4 4 0 0 1 0 8h-14" stroke="#A855F7" stroke-width="4" stroke-linecap="round" fill="none"/><text x="180" y="360" fill="#38294a" font-size="9" text-anchor="middle">STRENOVA</text><rect x="104" y="380" width="152" height="42" rx="11" fill="#6D28D9"/><text x="180" y="405" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">${uk?'Встановити':'Install'}</text><rect x="100" y="375" width="160" height="52" rx="14" fill="none" stroke="#D946EF" stroke-width="3"/>`;
    }else{
      screen=`<rect x="92" y="88" width="176" height="350" rx="18" fill="#21143b"/><text x="180" y="143" fill="#fff" font-size="11" text-anchor="middle">9:41</text><g fill="#38205a"><rect x="112" y="191" width="34" height="34" rx="10"/><rect x="164" y="191" width="34" height="34" rx="10"/><rect x="216" y="191" width="34" height="34" rx="10"/></g><rect x="164" y="256" width="38" height="38" rx="11" fill="#090711" stroke="#D946EF" stroke-width="2.5"/><path d="M194 265h-15a7 7 0 0 0 0 14h10a4 4 0 0 1 0 8h-14" stroke="#A855F7" stroke-width="4" stroke-linecap="round" fill="none"/><text x="183" y="309" fill="#fff" font-size="8.5" text-anchor="middle" font-weight="700">STRENOVA</text><rect x="155" y="247" width="56" height="69" rx="13" fill="none" stroke="#D946EF" stroke-width="2.5"/>`;
    }
    const chromeBar=isIOS?`<rect x="100" y="448" width="160" height="23" rx="11" fill="#eeebf2"/><circle cx="125" cy="459" r="5" fill="#665477"/><circle cx="180" cy="459" r="5" fill="#665477"/><circle cx="235" cy="459" r="5" fill="#665477"/>`:`<rect x="99" y="448" width="162" height="23" rx="11" fill="#171226"/><rect x="157" y="455" width="46" height="3" rx="1.5" fill="#5e4a78"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 500" role="img" aria-label="${escSvg((isIOS?'iPhone Safari':'Android Chrome')+' installation step '+(step+1))}" class="st-install-phone-svg"><defs><linearGradient id="glow" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#8B5CF6"/><stop offset="1" stop-color="#D946EF"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".45"/></filter></defs><circle cx="180" cy="250" r="165" fill="#8B5CF6" opacity=".08"/><rect x="82" y="20" width="196" height="460" rx="37" fill="#080611" stroke="#67517d" stroke-width="2" filter="url(#shadow)"/><rect x="89" y="27" width="182" height="446" rx="31" fill="#100b1b"/>${isIOS?topIOS:topAndroid}${screen}${chromeBar}<rect x="78" y="16" width="204" height="468" rx="40" fill="none" stroke="url(#glow)" stroke-width="1.3" opacity=".65"/></svg>`;
  }
  function browserWarning(device){
    const b=installBrowser();
    if(device==='ios'&&!b.safari)return installPack.warningSafari;
    if(device==='android'&&!b.chrome)return installPack.warningChrome;
    if(!b.ios&&!b.android)return installPack.warningUnsupported;
    return '';
  }
  function renderInstallStep(){
    if(!installDevice)return;
    const steps=installDevice==='ios'?installPack.iosSteps:installPack.androidSteps;
    const item=steps[installStep];
    installChoice.hidden=true;installFlow.hidden=false;
    installText(document.getElementById('stInstallEyebrow'),installPack.eyebrow);
    installText(document.getElementById('stInstallTitle'),installDevice==='ios'?installPack.ios:installPack.android);
    installText(document.getElementById('stInstallProgressText'),`${installPack.step} ${installStep+1} ${installPack.of} 5`);
    installText(document.getElementById('stInstallPercent'),`${Math.round((installStep+1)/5*100)}%`);
    const bar=document.getElementById('stInstallProgressBar');if(bar)bar.style.width=`${(installStep+1)*20}%`;
    installText(document.getElementById('stInstallStepNumber'),`${installPack.step.toUpperCase()} 0${installStep+1}`);
    installText(document.getElementById('stInstallStepTitle'),item[0]);
    installText(document.getElementById('stInstallStepText'),item[1]);
    if(installVisual){installVisual.innerHTML=phoneIllustration(installDevice,installStep);installVisual.setAttribute('aria-label',item[0])}
    if(installWarning){const warning=browserWarning(installDevice);installWarning.hidden=!warning;installWarning.innerHTML=warning?`<span>${escSvg(warning)}</span><button type="button" id="stInstallCopyUrl">${escSvg(installPack.copy)}</button>`:'';}
    const copyBtn=document.getElementById('stInstallCopyUrl');copyBtn?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);copyBtn.textContent=installPack.copied}catch(_){window.prompt(installPack.copy,location.href)}});
    installBack.textContent=installStep===0?installPack.back:installPack.back;
    installBack.disabled=false;
    installNext.textContent=installPack.next;installNext.hidden=installStep===4;
    installFinish.textContent=installPack.finish;installFinish.hidden=installStep!==4;
    const canPrompt=!!window.__stInstallPrompt&&!isStandalone()&&installDevice==='android';
    const now=document.getElementById('stInstallNow');if(now){now.hidden=!canPrompt;now.textContent=installPack.install}
  }
  function openInstallDevice(device){installDevice=device;installStep=0;renderInstallStep()}
  installChoice?.querySelectorAll('[data-install-device]').forEach(button=>button.addEventListener('click',()=>openInstallDevice(button.dataset.installDevice)));
  installBack?.addEventListener('click',()=>{if(!installDevice)return;if(installStep===0){installFlow.hidden=true;installChoice.hidden=false;installDevice=null;installWarning.hidden=true}else{installStep=Math.max(0,installStep-1);renderInstallStep()}});
  installNext?.addEventListener('click',()=>{installStep=Math.min(4,installStep+1);renderInstallStep()});
  installFinish?.addEventListener('click',()=>window.stHideInstallGuide());
  installModal?.addEventListener('click',event=>{if(event.target===installModal)window.stHideInstallGuide()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&installModal&&!installModal.hidden)window.stHideInstallGuide()});
  window.stShowInstallGuide=function(){
    if(!installModal||isStandalone())return;
    installPack=String(document.documentElement.lang||'uk').toLowerCase().startsWith('uk')?installCopy.uk:installCopy.en;
    installDevice=null;installStep=0;installChoice.hidden=false;installFlow.hidden=true;
    installText(document.getElementById('stInstallEyebrow'),installPack.eyebrow);
    installText(document.getElementById('stInstallTitle'),installPack.title);
    installText(document.getElementById('stInstallIntro'),installPack.choose);
    installText(document.getElementById('stInstallFootnote'),installPack.foot);
    installModal.hidden=false;document.body.style.overflow='hidden';
    installModal.querySelector('.st-install-x')?.focus();
  };
  window.stHideInstallGuide=function(){if(installModal){installModal.hidden=true;document.body.style.overflow=''}};
  window.stTryInstall=async function(){
    const prompt=window.__stInstallPrompt;if(!prompt)return;
    try{await prompt.prompt();const choice=await prompt.userChoice;if(choice?.outcome==='accepted')window.__stAppInstalled=true;}
    catch(e){console.warn('Install prompt was not completed:',e)}
    window.__stInstallPrompt=null;const b=document.getElementById('stInstallNow');if(b)b.hidden=true;
    if(isStandalone())window.stHideInstallGuide();
  };
  window.addEventListener('appinstalled',()=>{window.__stAppInstalled=true;window.__stInstallPrompt=null;window.stHideInstallGuide?.();setInstallTriggerVisibility()});
  window.addEventListener('beforeinstallprompt',()=>{const b=document.getElementById('stInstallNow');if(b&&installDevice==='android'&&!isStandalone())b.hidden=false});
  window.stRefreshInstallTriggerVisibility=setInstallTriggerVisibility;
  window.addEventListener('pageshow',setInstallTriggerVisibility);
  setInstallTriggerVisibility();
  if(isStandalone()){const b=document.getElementById('gtInstallBanner');if(b)b.style.display='none'}
})();
