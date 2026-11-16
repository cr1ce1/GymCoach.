(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const nav=$('nav'),header=document.querySelector('header.top'),home=$('home');
  if(!nav||!header||!home||$('strenova-design-system-shell-ready'))return;
  const marker=document.createElement('span');marker.id='strenova-design-system-shell-ready';marker.hidden=true;document.body.appendChild(marker);

  const LANGS={
    en:{home:'Home',training:'Training',calendar:'Calendar',progress:'Progress',nutrition:'Nutrition',history:'History',library:'Exercise library',coach:'Coach',plus:'STRENOVA Plus',profile:'Profile',settings:'Profile & settings',install:'Install app',more:'More',greetingMorning:'Good morning 👋',greetingAfternoon:'Good afternoon 👋',greetingEvening:'Good evening 👋',welcome:'Your training space',messages:'Messages',reminders:'Reminders',attention:'Needs your attention',firstWorkout:'No completed workouts have been saved yet. Start with your current training plan.',progressNote:'Your workout history is saved. Review your progress and plan the next session.',openTraining:'Open training plan',recent:'Recent activity',emptyRecent:'Completed workouts will appear here.',account:'ACCOUNT',workspace:'WORKSPACE',close:'Close',installHelp:'Add STRENOVA to your home screen'},
    uk:{home:'Головна',training:'Тренування',calendar:'Календар',progress:'Прогрес',nutrition:'Харчування',history:'Історія',library:'Бібліотека вправ',coach:'Тренер',plus:'STRENOVA Plus',profile:'Профіль',settings:'Профіль і налаштування',install:'Встановити застосунок',more:'Ще',greetingMorning:'Доброго ранку 👋',greetingAfternoon:'Доброго дня 👋',greetingEvening:'Доброго вечора 👋',welcome:'Твій простір тренувань',messages:'Повідомлення',reminders:'Нагадування',attention:'Потребує уваги',firstWorkout:'Ще немає збережених тренувань. Почни з плану, який уже створено для тебе.',progressNote:'Історію тренувань збережено. Переглянь прогрес і заплануй наступне заняття.',openTraining:'Відкрити план',recent:'Остання активність',emptyRecent:'Завершені тренування з’являтимуться тут.',account:'АКАУНТ',workspace:'РОБОЧИЙ ПРОСТІР',close:'Закрити',installHelp:'Додай STRENOVA на головний екран'},
    pl:{home:'Start',training:'Trening',calendar:'Kalendarz',progress:'Postępy',nutrition:'Odżywianie',history:'Historia',library:'Biblioteka ćwiczeń',coach:'Trener',plus:'STRENOVA Plus',profile:'Profil',settings:'Profil i ustawienia',install:'Zainstaluj aplikację',more:'Więcej',greetingMorning:'Dzień dobry 👋',greetingAfternoon:'Dzień dobry 👋',greetingEvening:'Dobry wieczór 👋',welcome:'Twoja przestrzeń treningowa',messages:'Wiadomości',reminders:'Przypomnienia',attention:'Wymaga uwagi',firstWorkout:'Nie zapisano jeszcze ukończonych treningów. Zacznij od swojego planu.',progressNote:'Historia treningów jest zapisana. Sprawdź postępy i zaplanuj kolejną sesję.',openTraining:'Otwórz plan treningowy',recent:'Ostatnia aktywność',emptyRecent:'Ukończone treningi pojawią się tutaj.',account:'KONTO',workspace:'PRZESTRZEŃ ROBOCZA',close:'Zamknij',installHelp:'Dodaj STRENOVA do ekranu głównego'},
    de:{home:'Startseite',training:'Training',calendar:'Kalender',progress:'Fortschritt',nutrition:'Ernährung',history:'Verlauf',library:'Übungsbibliothek',coach:'Coach',plus:'STRENOVA Plus',profile:'Profil',settings:'Profil & Einstellungen',install:'App installieren',more:'Mehr',greetingMorning:'Guten Morgen 👋',greetingAfternoon:'Guten Tag 👋',greetingEvening:'Guten Abend 👋',welcome:'Dein Trainingsbereich',messages:'Nachrichten',reminders:'Erinnerungen',attention:'Benötigt deine Aufmerksamkeit',firstWorkout:'Noch keine abgeschlossenen Workouts gespeichert. Starte mit deinem Trainingsplan.',progressNote:'Dein Trainingsverlauf ist gespeichert. Prüfe deinen Fortschritt und plane die nächste Einheit.',openTraining:'Trainingsplan öffnen',recent:'Letzte Aktivität',emptyRecent:'Abgeschlossene Workouts erscheinen hier.',account:'KONTO',workspace:'ARBEITSBEREICH',close:'Schließen',installHelp:'STRENOVA zum Startbildschirm hinzufügen'},
    fr:{home:'Accueil',training:'Entraînement',calendar:'Calendrier',progress:'Progrès',nutrition:'Nutrition',history:'Historique',library:'Bibliothèque',coach:'Coach',plus:'STRENOVA Plus',profile:'Profil',settings:'Profil et paramètres',install:'Installer l’application',more:'Plus',greetingMorning:'Bonjour 👋',greetingAfternoon:'Bon après-midi 👋',greetingEvening:'Bonsoir 👋',welcome:'Votre espace d’entraînement',messages:'Messages',reminders:'Rappels',attention:'À surveiller',firstWorkout:'Aucune séance terminée enregistrée. Commencez avec votre programme actuel.',progressNote:'Votre historique est enregistré. Consultez vos progrès et planifiez la prochaine séance.',openTraining:'Ouvrir le programme',recent:'Activité récente',emptyRecent:'Les séances terminées apparaîtront ici.',account:'COMPTE',workspace:'ESPACE DE TRAVAIL',close:'Fermer',installHelp:'Ajouter STRENOVA à l’écran d’accueil'},
    es:{home:'Inicio',training:'Entrenamiento',calendar:'Calendario',progress:'Progreso',nutrition:'Nutrición',history:'Historial',library:'Biblioteca de ejercicios',coach:'Entrenador',plus:'STRENOVA Plus',profile:'Perfil',settings:'Perfil y ajustes',install:'Instalar aplicación',more:'Más',greetingMorning:'Buenos días 👋',greetingAfternoon:'Buenas tardes 👋',greetingEvening:'Buenas noches 👋',welcome:'Tu espacio de entrenamiento',messages:'Mensajes',reminders:'Recordatorios',attention:'Requiere tu atención',firstWorkout:'Todavía no hay entrenamientos completados guardados. Empieza con tu plan actual.',progressNote:'Tu historial está guardado. Revisa tu progreso y planifica la siguiente sesión.',openTraining:'Abrir plan',recent:'Actividad reciente',emptyRecent:'Los entrenamientos completados aparecerán aquí.',account:'CUENTA',workspace:'ESPACIO DE TRABAJO',close:'Cerrar',installHelp:'Añadir STRENOVA a la pantalla de inicio'},
    it:{home:'Home',training:'Allenamento',calendar:'Calendario',progress:'Progressi',nutrition:'Nutrizione',history:'Cronologia',library:'Libreria esercizi',coach:'Coach',plus:'STRENOVA Plus',profile:'Profilo',settings:'Profilo e impostazioni',install:'Installa app',more:'Altro',greetingMorning:'Buongiorno 👋',greetingAfternoon:'Buon pomeriggio 👋',greetingEvening:'Buonasera 👋',welcome:'Il tuo spazio di allenamento',messages:'Messaggi',reminders:'Promemoria',attention:'Richiede attenzione',firstWorkout:'Non ci sono ancora allenamenti completati salvati. Inizia dal tuo piano.',progressNote:'La cronologia è salvata. Controlla i progressi e pianifica la prossima sessione.',openTraining:'Apri il piano',recent:'Attività recente',emptyRecent:'Gli allenamenti completati appariranno qui.',account:'ACCOUNT',workspace:'AREA DI LAVORO',close:'Chiudi',installHelp:'Aggiungi STRENOVA alla schermata Home'},
    pt:{home:'Início',training:'Treino',calendar:'Calendário',progress:'Progresso',nutrition:'Nutrição',history:'Histórico',library:'Biblioteca de exercícios',coach:'Treinador',plus:'STRENOVA Plus',profile:'Perfil',settings:'Perfil e definições',install:'Instalar aplicação',more:'Mais',greetingMorning:'Bom dia 👋',greetingAfternoon:'Boa tarde 👋',greetingEvening:'Boa noite 👋',welcome:'O teu espaço de treino',messages:'Mensagens',reminders:'Lembretes',attention:'Precisa da tua atenção',firstWorkout:'Ainda não há treinos concluídos guardados. Começa pelo teu plano atual.',progressNote:'O histórico está guardado. Consulta o progresso e planeia a próxima sessão.',openTraining:'Abrir plano',recent:'Atividade recente',emptyRecent:'Os treinos concluídos aparecerão aqui.',account:'CONTA',workspace:'ESPAÇO DE TRABALHO',close:'Fechar',installHelp:'Adicionar STRENOVA ao ecrã principal'},
    nl:{home:'Start',training:'Training',calendar:'Kalender',progress:'Voortgang',nutrition:'Voeding',history:'Geschiedenis',library:'Oefeningenbibliotheek',coach:'Coach',plus:'STRENOVA Plus',profile:'Profiel',settings:'Profiel en instellingen',install:'App installeren',more:'Meer',greetingMorning:'Goedemorgen 👋',greetingAfternoon:'Goedemiddag 👋',greetingEvening:'Goedenavond 👋',welcome:'Jouw trainingsruimte',messages:'Berichten',reminders:'Herinneringen',attention:'Vraagt je aandacht',firstWorkout:'Er zijn nog geen voltooide trainingen opgeslagen. Begin met je huidige schema.',progressNote:'Je trainingsgeschiedenis is opgeslagen. Bekijk je voortgang en plan de volgende sessie.',openTraining:'Trainingsschema openen',recent:'Recente activiteit',emptyRecent:'Voltooide trainingen verschijnen hier.',account:'ACCOUNT',workspace:'WERKRUIMTE',close:'Sluiten',installHelp:'STRENOVA toevoegen aan je startscherm'},
    tr:{home:'Ana Sayfa',training:'Antrenman',calendar:'Takvim',progress:'İlerleme',nutrition:'Beslenme',history:'Geçmiş',library:'Egzersiz kütüphanesi',coach:'Koç',plus:'STRENOVA Plus',profile:'Profil',settings:'Profil ve ayarlar',install:'Uygulamayı yükle',more:'Daha fazla',greetingMorning:'Günaydın 👋',greetingAfternoon:'İyi günler 👋',greetingEvening:'İyi akşamlar 👋',welcome:'Antrenman alanın',messages:'Mesajlar',reminders:'Hatırlatmalar',attention:'İlgilenmen gerekiyor',firstWorkout:'Henüz tamamlanan antrenman kaydedilmedi. Mevcut planınla başla.',progressNote:'Antrenman geçmişin kaydedildi. İlerlemeni incele ve sonraki antrenmanı planla.',openTraining:'Antrenman planını aç',recent:'Son etkinlik',emptyRecent:'Tamamlanan antrenmanlar burada görünecek.',account:'HESAP',workspace:'ÇALIŞMA ALANI',close:'Kapat',installHelp:'STRENOVA’yı ana ekrana ekle'},
    cs:{home:'Domů',training:'Trénink',calendar:'Kalendář',progress:'Pokrok',nutrition:'Výživa',history:'Historie',library:'Knihovna cviků',coach:'Trenér',plus:'STRENOVA Plus',profile:'Profil',settings:'Profil a nastavení',install:'Nainstalovat aplikaci',more:'Více',greetingMorning:'Dobré ráno 👋',greetingAfternoon:'Dobré odpoledne 👋',greetingEvening:'Dobrý večer 👋',welcome:'Tvůj tréninkový prostor',messages:'Zprávy',reminders:'Připomenutí',attention:'Vyžaduje pozornost',firstWorkout:'Zatím nejsou uloženy žádné dokončené tréninky. Začni podle svého plánu.',progressNote:'Historie tréninků je uložena. Zkontroluj pokrok a naplánuj další trénink.',openTraining:'Otevřít plán',recent:'Nedávná aktivita',emptyRecent:'Dokončené tréninky se zobrazí zde.',account:'ÚČET',workspace:'PRACOVNÍ PROSTOR',close:'Zavřít',installHelp:'Přidat STRENOVA na plochu'},
    sk:{home:'Domov',training:'Tréning',calendar:'Kalendár',progress:'Pokrok',nutrition:'Výživa',history:'História',library:'Knižnica cvikov',coach:'Tréner',plus:'STRENOVA Plus',profile:'Profil',settings:'Profil a nastavenia',install:'Inštalovať aplikáciu',more:'Viac',greetingMorning:'Dobré ráno 👋',greetingAfternoon:'Dobré popoludnie 👋',greetingEvening:'Dobrý večer 👋',welcome:'Tvoj tréningový priestor',messages:'Správy',reminders:'Pripomienky',attention:'Vyžaduje pozornosť',firstWorkout:'Zatiaľ nie sú uložené žiadne dokončené tréningy. Začni podľa svojho plánu.',progressNote:'História tréningov je uložená. Skontroluj pokrok a naplánuj ďalší tréning.',openTraining:'Otvoriť plán',recent:'Nedávna aktivita',emptyRecent:'Dokončené tréningy sa zobrazia tu.',account:'ÚČET',workspace:'PRACOVNÝ PRIESTOR',close:'Zavrieť',installHelp:'Pridať STRENOVA na domovskú obrazovku'},
    ro:{home:'Acasă',training:'Antrenament',calendar:'Calendar',progress:'Progres',nutrition:'Nutriție',history:'Istoric',library:'Bibliotecă de exerciții',coach:'Antrenor',plus:'STRENOVA Plus',profile:'Profil',settings:'Profil și setări',install:'Instalează aplicația',more:'Mai multe',greetingMorning:'Bună dimineața 👋',greetingAfternoon:'Bună ziua 👋',greetingEvening:'Bună seara 👋',welcome:'Spațiul tău de antrenament',messages:'Mesaje',reminders:'Mementouri',attention:'Necesită atenția ta',firstWorkout:'Nu există încă antrenamente finalizate salvate. Începe cu planul actual.',progressNote:'Istoricul este salvat. Verifică progresul și planifică următoarea sesiune.',openTraining:'Deschide planul',recent:'Activitate recentă',emptyRecent:'Antrenamentele finalizate vor apărea aici.',account:'CONT',workspace:'SPAȚIU DE LUCRU',close:'Închide',installHelp:'Adaugă STRENOVA pe ecranul principal'},
    hu:{home:'Kezdőlap',training:'Edzés',calendar:'Naptár',progress:'Fejlődés',nutrition:'Táplálkozás',history:'Előzmények',library:'Gyakorlatkönyvtár',coach:'Edző',plus:'STRENOVA Plus',profile:'Profil',settings:'Profil és beállítások',install:'Alkalmazás telepítése',more:'Tovább',greetingMorning:'Jó reggelt 👋',greetingAfternoon:'Jó napot 👋',greetingEvening:'Jó estét 👋',welcome:'Edzéstered',messages:'Üzenetek',reminders:'Emlékeztetők',attention:'Figyelmet igényel',firstWorkout:'Még nincs mentett befejezett edzés. Kezdd a jelenlegi edzéstervvel.',progressNote:'Az edzéselőzmények mentve vannak. Nézd át a fejlődésed, és tervezd meg a következő edzést.',openTraining:'Edzésterv megnyitása',recent:'Legutóbbi aktivitás',emptyRecent:'A befejezett edzések itt jelennek meg.',account:'FIÓK',workspace:'MUNKATERÜLET',close:'Bezárás',installHelp:'STRENOVA hozzáadása a kezdőképernyőhöz'},
    bg:{home:'Начало',training:'Тренировка',calendar:'Календар',progress:'Прогрес',nutrition:'Хранене',history:'История',library:'Библиотека с упражнения',coach:'Треньор',plus:'STRENOVA Plus',profile:'Профил',settings:'Профил и настройки',install:'Инсталирай приложението',more:'Още',greetingMorning:'Добро утро 👋',greetingAfternoon:'Добър ден 👋',greetingEvening:'Добър вечер 👋',welcome:'Твоето тренировъчно пространство',messages:'Съобщения',reminders:'Напомняния',attention:'Изисква внимание',firstWorkout:'Все още няма запазени завършени тренировки. Започни с текущия си план.',progressNote:'Историята на тренировките е запазена. Прегледай напредъка и планирай следващата сесия.',openTraining:'Отвори плана',recent:'Последна активност',emptyRecent:'Завършените тренировки ще се показват тук.',account:'АКАУНТ',workspace:'РАБОТНО ПРОСТРАНСТВО',close:'Затвори',installHelp:'Добави STRENOVA към началния екран'},
    ru:{home:'Главная',training:'Тренировки',calendar:'Календарь',progress:'Прогресс',nutrition:'Питание',history:'История',library:'Библиотека упражнений',coach:'Тренер',plus:'STRENOVA Plus',profile:'Профиль',settings:'Профиль и настройки',install:'Установить приложение',more:'Ещё',greetingMorning:'Доброе утро 👋',greetingAfternoon:'Добрый день 👋',greetingEvening:'Добрый вечер 👋',welcome:'Твоё пространство тренировок',messages:'Сообщения',reminders:'Напоминания',attention:'Требует внимания',firstWorkout:'Пока нет сохранённых завершённых тренировок. Начни с текущего плана.',progressNote:'История тренировок сохранена. Посмотри прогресс и запланируй следующую тренировку.',openTraining:'Открыть план',recent:'Недавняя активность',emptyRecent:'Завершённые тренировки появятся здесь.',account:'АККАУНТ',workspace:'РАБОЧЕЕ ПРОСТРАНСТВО',close:'Закрыть',installHelp:'Добавить STRENOVA на главный экран'}
  };
  const code=()=>{try{return localStorage.getItem('gtai_lang')||localStorage.getItem('str_lang')||document.documentElement.lang||'en'}catch(e){return document.documentElement.lang||'en'}};
  const t=k=>(LANGS[code()]||LANGS.en)[k]||LANGS.en[k]||k;
  const svg={home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',training:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9v6m12-6v6M3 10v4m18-4v4M6 12h12M8 7l2-2m4 14 2-2"/></svg>',calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',progress:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 14h17M8 15l4-4 3 2 5-7"/></svg>',nutrition:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-5 0-8-4-8-9 0-3 2-5 4-5 2 0 3 1 4 1s2-1 4-1 4 2 4 5c0 5-3 9-8 9zM12 7c0-3 2-5 5-5"/></svg>',history:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/></svg>',library:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 4h4v16h-4z"/></svg>',coach:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.8-4.8a8.5 8.5 0 1 1 16.2-4.7z"/></svg>',plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.3 5.7L20 11l-5.7 2.3L12 19l-2.3-5.7L4 11l5.7-2.3zM19 16v5m-2.5-2.5h5"/></svg>',profile:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',install:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/></svg>',bell:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',message:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.8-4.8A8.5 8.5 0 1 1 21 11.5z"/></svg>',menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'};
  function makeButton(route,key,ico,cls){const b=document.createElement('button');b.type='button';b.dataset.page=route;b.className=cls||'st-nav-secondary';b.innerHTML=`<span>${svg[ico]||'•'}</span><i data-st-ui="${key}">${t(key)}</i>`;b.addEventListener('click',()=>window.showPage?.(route));return b}
  const clientsCoachLabels={en:'Clients / Coach',uk:'Клієнти / Тренер',pl:'Klienci / Trener',de:'Kunden / Coach',fr:'Clients / Coach',es:'Clientes / Entrenador',it:'Clienti / Coach',pt:'Clientes / Treinador',nl:'Klanten / Coach',tr:'Danışanlar / Antrenör',cs:'Klienti / Trenér',sk:'Klienti / Tréner',ro:'Clienți / Antrenor',hu:'Ügyfelek / Edző',bg:'Клиенти / Треньор',ru:'Клиенты / Тренер'};
  Object.keys(LANGS).forEach(code=>{LANGS[code].clientsCoach=clientsCoachLabels[code]||clientsCoachLabels.en});
  function replaceButton(btn,route,key,ico){btn.dataset.page=route;btn.classList.add('st-nav-primary');btn.setAttribute('aria-label',t(key));btn.innerHTML=`<span>${svg[ico]}</span><i data-st-ui="${key}">${t(key)}</i>`;btn.onclick=()=>window.showPage?.(route);}

  // Keep the original nav element and its live coach items; only repurpose the old Profile slot.
  let direct=[...nav.querySelectorAll(':scope > button')];
  const find=(key)=>direct.find(b=>b.dataset.page===key);
  const homeBtn=find('home'),trainingBtn=find('training'),nutritionBtn=find('nutrition'),profileBtn=find('profile');
  function setPrimary(button,route,key,ico,handler){
    if(!button)return null;
    button.type='button';button.dataset.page=route;button.classList.add('st-nav-primary');
    button.innerHTML=`<span>${svg[ico]}</span><i data-st-ui="${key}">${t(key)}</i>`;
    button.setAttribute('aria-label',t(key));button.onclick=handler;
    return button;
  }
  setPrimary(homeBtn,'home','home','home',()=>window.showPage?.('home'));
  setPrimary(trainingBtn,'training','training','training',()=>window.showPage?.('recommend'));
  setPrimary(nutritionBtn,'nutrition','nutrition','nutrition',()=>window.showPage?.('nutrition'));
  setPrimary(profileBtn,'profile','profile','profile',()=>window.showPage?.('profile'));
  // One role-aware Clients / Coach destination; the real existing page is selected at click time.
  let coachBtn=nav.querySelector(':scope > button[data-page="coach-primary"]')||nav.querySelector(':scope > button[data-page="coach"]');
  if(!coachBtn)coachBtn=makeButton('coach','clientsCoach','coach','st-nav-primary');
  coachBtn.dataset.page='coach';coachBtn.dataset.stPrimary='coach';coachBtn.type='button';coachBtn.classList.add('st-nav-primary');
  coachBtn.innerHTML=`<span>${svg.coach}</span><i data-st-ui="clientsCoach">${t('clientsCoach')}</i>`;
  coachBtn.setAttribute('aria-label',t('clientsCoach'));
  coachBtn.onclick=()=>openCoachTab();
  function openCoachTab(){
    const hasInbox=!!nav.querySelector('button[data-page="coach-inbox"]');
    const hasLive=!!nav.querySelector('button[data-page="coach-live"]');
    const route=hasInbox?'coach-inbox':hasLive?'coach-live':'coach';
    window.showPage?.(route);
  }
  window.__stOpenCoachTab=openCoachTab;
  // Normalize the five primary buttons into a stable order. All other existing routes stay available below.
  [homeBtn,trainingBtn,nutritionBtn,profileBtn,coachBtn].filter(Boolean).forEach(button=>nav.appendChild(button));
  const extra=document.createElement('div');extra.className='st-sidebar-extra';extra.setAttribute('aria-label','Additional navigation');
  extra.append(makeButton('calendar','calendar','calendar'),makeButton('stats','progress','progress'),makeButton('history','history','history'),makeButton('library','library','library'),makeButton('subscription','plus','plus'));
  const existingExtra=[...nav.querySelectorAll(':scope > button')].filter(b=>!b.classList.contains('st-nav-primary'));
  const bottom=document.createElement('div');bottom.className='st-sidebar-bottom';
  bottom.innerHTML=`<div class="st-sidebar-divider"></div><button type="button" class="st-nav-secondary st-nav-install"><span>${svg.install}</span><i data-st-ui="install">${t('install')}</i></button><div class="st-sidebar-user"><span class="st-sidebar-avatar" id="stSidebarAvatar">S</span><span class="st-sidebar-user-copy"><strong id="stSidebarName">STRENOVA</strong><small id="stSidebarEmail"></small></span></div>`;
  bottom.querySelector('.st-nav-install').addEventListener('click',()=>window.stShowInstallGuide?.());
  nav.append(extra,bottom);
  existingExtra.forEach(b=>{if(b.parentElement===nav)extra.appendChild(b);b.classList.add('st-nav-secondary')});
  nav.querySelectorAll(':scope > button:not(.st-nav-primary)').forEach(b=>extra.appendChild(b));
  // Role-specific coach actions are created asynchronously after Supabase resolves the account.
  // Keep them in the existing secondary group instead of letting them appear as extra primary tabs.
  if(window.MutationObserver){
    const moveLateNavItems=()=>nav.querySelectorAll(':scope > button:not(.st-nav-primary)').forEach(b=>{if(b.parentElement===nav)extra.appendChild(b)});
    const observer=new MutationObserver(moveLateNavItems);observer.observe(nav,{childList:true});window.__stShellNavObserver=observer;
  }
  const brand=document.createElement('div');brand.className='st-sidebar-brand';brand.innerHTML='<span class="st-sidebar-mark">S</span><span class="st-sidebar-wordmark">STRENOVA</span>';
  nav.insertBefore(brand,nav.firstChild);
  const separator=document.createElement('div');separator.className='st-sidebar-divider';extra.prepend(separator);

  // Header actions: reminder and message shortcuts point to existing screens.
  const greeting=document.createElement('div');greeting.className='st-dashboard-greeting';greeting.innerHTML=`<small id="stGreetingLine"></small><strong id="stHeaderName">${t('welcome')}</strong>`;
  const actions=document.createElement('div');actions.className='st-top-actions';
  const bell=document.createElement('button');bell.type='button';bell.className='st-icon-button';bell.setAttribute('aria-label',t('reminders'));bell.title=t('reminders');bell.innerHTML=svg.bell;bell.addEventListener('click',()=>{window.showPage?.('home');setTimeout(()=>{const target=$('gtReminderTime')||$('gtReminderStatus');target?.scrollIntoView({behavior:'smooth',block:'center'})},180)});
  const msg=document.createElement('button');msg.type='button';msg.className='st-icon-button';msg.setAttribute('aria-label',t('messages'));msg.title=t('messages');msg.innerHTML=svg.message;msg.addEventListener('click',()=>window.showPage?.('coach'));
  const more=document.createElement('button');more.type='button';more.className='st-more-toggle';more.innerHTML=svg.menu+`<span data-st-ui="more">${t('more')}</span>`;
  actions.append(bell,msg,more);
  const langBtn=$('langBtn');header.append(greeting,actions);if(langBtn)actions.appendChild(langBtn);
  const drawer=document.createElement('div');drawer.id='stMoreDrawer';drawer.className='st-more-backdrop';drawer.hidden=true;drawer.innerHTML=`<div class="st-more-panel" role="dialog" aria-modal="true" aria-labelledby="stMoreTitle"><div class="st-more-head"><h2 id="stMoreTitle" data-st-ui="more">${t('more')}</h2><button type="button" class="st-more-close" aria-label="${t('close')}">×</button></div><div class="st-more-items"><button data-route="calendar"><span>${svg.calendar}</span><i data-st-ui="calendar">${t('calendar')}</i></button><button data-route="stats"><span>${svg.progress}</span><i data-st-ui="progress">${t('progress')}</i></button><button data-route="history"><span>${svg.history}</span><i data-st-ui="history">${t('history')}</i></button><button data-route="library"><span>${svg.library}</span><i data-st-ui="library">${t('library')}</i></button><button data-route="subscription"><span>${svg.plus}</span><i data-st-ui="plus">${t('plus')}</i></button><button data-route="install"><span>${svg.install}</span><i data-st-ui="install">${t('install')}</i></button></div></div>`;
  document.body.appendChild(drawer);
  // Re-apply PWA install visibility after the shell and its More drawer are mounted.
  window.stRefreshInstallTriggerVisibility?.();
  const closeDrawer=()=>{drawer.hidden=true;document.body.style.overflow=''};
  more.addEventListener('click',()=>{drawer.hidden=false;});drawer.querySelector('.st-more-close').addEventListener('click',closeDrawer);
  drawer.addEventListener('click',e=>{if(e.target===drawer)closeDrawer();const b=e.target.closest('[data-route]');if(!b)return;closeDrawer();const route=b.dataset.route;if(route==='install')window.stShowInstallGuide?.();else if(route==='coach')window.__stOpenCoachTab?.();else window.showPage?.(route)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});

  // Home dashboard uses the existing stats and activity area, not fabricated values.
  const heads=home.querySelectorAll(':scope > .section-head');
  const quickHead=heads[0],progressHead=heads[1],stats=home.querySelector(':scope > .stats'),quick=home.querySelector(':scope > .grid');
  if(quickHead)quickHead.classList.add('st-home-quick-head');
  if(progressHead){progressHead.classList.add('st-home-progress-head');const h=progressHead.querySelector('h2');if(h)h.dataset.stUi='progress'}
  if(stats){stats.classList.add('st-home-stats');if(quickHead)home.insertBefore(stats,quickHead)}
  if(!home.querySelector('#stAttentionCard')){
    const card=document.createElement('aside');card.id='stAttentionCard';card.className='card';card.innerHTML=`<div class="st-attention-head"><span class="st-attention-icon">✦</span><span><small data-st-ui="workspace">${t('workspace')}</small><b data-st-ui="attention">${t('attention')}</b></span></div><p class="st-attention-copy" id="stAttentionCopy"></p><button class="st-attention-action" type="button" id="stAttentionAction" data-st-ui="openTraining">${t('openTraining')}</button>`;
    if(quick&&quick.parentNode===home)quick.after(card);else home.appendChild(card);
    card.querySelector('#stAttentionAction').addEventListener('click',()=>window.showPage?.('recommend'));
  }
  const recent=$('recent');if(recent){recent.dataset.stUi='emptyRecent'}

  function updateIdentity(){
    const nameInput=$('editName')?.value?.trim();
    const homeName=$('helloName')?.textContent?.trim();
    const name=nameInput||homeName||t('welcome');
    const email=$('editEmail')?.value?.trim()||'';
    const first=(name.trim().split(/\s+/)[0]||'S').charAt(0).toUpperCase();
    const headerName=$('stHeaderName'),sideName=$('stSidebarName'),sideEmail=$('stSidebarEmail'),avatar=$('stSidebarAvatar');
    if(headerName)headerName.textContent=name;
    if(sideName)sideName.textContent=name;
    if(sideEmail)sideEmail.textContent=email;
    if(avatar)avatar.textContent=first;
  }
  function updateAttention(){
    const total=Number(($('totalStat')?.textContent||'0').replace(/[^\d.-]/g,''))||0;
    const copy=$('stAttentionCopy');if(copy)copy.textContent=total>0?t('progressNote'):t('firstWorkout');
    const action=$('stAttentionAction');if(action)action.textContent=t('openTraining');
  }
  function applyTranslations(){
    const pack=LANGS[code()]||LANGS.en;
    document.querySelectorAll('[data-st-ui]').forEach(el=>{const key=el.dataset.stUi;if(pack[key])el.textContent=pack[key]});
    const line=$('stGreetingLine');if(line){const h=new Date().getHours();line.textContent=t(h<12?'greetingMorning':h<18?'greetingAfternoon':'greetingEvening')}
    const close=drawer.querySelector('.st-more-close');if(close)close.setAttribute('aria-label',t('close'));
    bell.setAttribute('aria-label',t('reminders'));bell.title=t('reminders');msg.setAttribute('aria-label',t('messages'));msg.title=t('messages');
    updateIdentity();updateAttention();
  }
  window.__stApplyDashboardLocale=applyTranslations;
  const oldApply=window.applyLang;
  if(typeof oldApply==='function')window.applyLang=function(){const out=oldApply.apply(this,arguments);applyTranslations();return out};
  const oldSet=window.stSetLanguage;
  if(typeof oldSet==='function')window.stSetLanguage=function(){const out=oldSet.apply(this,arguments);applyTranslations();return out};
  // Correct active state after the legacy navigation mapper has run.
  const oldShow=window.showPage;
  if(typeof oldShow==='function')window.showPage=function(){const out=oldShow.apply(this,arguments);const active=document.querySelector('.page.active')?.id||arguments[0];const map={home:'home',recommend:'training',session:'training',nutrition:'nutrition',profile:'profile',coach:'coach','coach-live':'coach','coach-inbox':'coach',calendar:'calendar',stats:'stats'};nav.querySelectorAll('button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===(map[active]||active)));syncShell();updateIdentity();return out};
  const primary=new Set(['home','training','nutrition','profile','coach']);
  const moveLateNavItems=()=>{const group=nav.querySelector('.st-sidebar-extra');if(!group)return;nav.querySelectorAll(':scope > button').forEach(b=>{if(!primary.has(b.dataset.page)&&!b.classList.contains('st-nav-profile')&&!b.classList.contains('st-nav-install')){group.appendChild(b);b.classList.add('st-nav-secondary')}})};
  if(window.MutationObserver){new MutationObserver(()=>moveLateNavItems()).observe(nav,{childList:true,subtree:false})}
  moveLateNavItems();
  function syncShell(){
    const gate=$('authGate'),landing=$('stLanding'),active=document.querySelector('.page.active');
    const visible=!!(gate&&gate.hidden&&landing&&landing.hidden&&active&&active.id!=='setup');
    document.body.classList.toggle('st-app-shell',visible);
    if(visible){applyTranslations();}
  }
  const observer=new MutationObserver(()=>syncShell());
  ['authGate','stLanding'].forEach(id=>{const el=$(id);if(el)observer.observe(el,{attributes:true,attributeFilter:['hidden']})});
  const main=document.querySelector('main');if(main)observer.observe(main,{subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('input',e=>{if(e.target?.id==='editName'||e.target?.id==='editEmail')updateIdentity()});
  window.addEventListener('storage',e=>{if(e.key==='gtai_lang'||e.key==='str_lang')applyTranslations()});
  applyTranslations();syncShell();
})();
