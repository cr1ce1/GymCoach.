/* =====================================================================
   STRENOVA ROUTER (2026-11-17)
   Replaces three overlapping navigation patches (43-st-navigation-final-fix,
   44-st-navigation-active-state-fix, 47-st-navigation-runtime-repair):
   - one capture handler for the navigation buttons;
   - route aliases (training -> recommend, calendar -> profile section);
   - exactly one active page and one active nav button;
   - routes behind switched-off features fall back to home.
   Page-specific renders stay with their own modules (they listen to
   showPage or the sx:page event).
   ===================================================================== */
(function () {
  'use strict';
  if (window.__strenovaRouter) return;
  window.__strenovaRouter = true;

  const nav = document.getElementById('nav');
  const inner = window.showPage;
  const ROUTES = new Set(['home', 'training', 'nutrition', 'profile', 'calendar', 'coach', 'coach-live', 'coach-inbox', 'stats', 'history', 'library', 'subscription']);
  // Which primary tab owns a page when the page has no visible nav button of its own.
  const PARENT = { recommend: 'training', session: 'training', library: 'training', stats: 'training', history: 'training', calendar: 'profile', 'coach-live': 'coach', 'coach-inbox': 'coach', 'coach-connect': 'coach', 'coach-dashboard': 'coach', 'admin-dashboard': 'coach' };
  const featureOff = (name) => typeof window.strenovaFeature === 'function' && !window.strenovaFeature(name);

  function resolve(id) {
    if (id === 'training') return 'recommend';
    if (id === 'subscription' && featureOff('subscription')) return 'home';
    return id;
  }

  /* ---------- calendar lives inside the profile page ---------- */
  function mountCalendarInProfile() {
    const profile = document.getElementById('profile');
    const calendar = document.getElementById('calendar');
    if (!profile || !calendar) return null;
    calendar.classList.remove('page', 'active');
    calendar.classList.add('gt-profile-calendar');
    const firstCard = profile.querySelector(':scope > .card');
    if (calendar.parentElement !== profile || (firstCard && calendar.previousElementSibling !== firstCard)) {
      if (firstCard) firstCard.insertAdjacentElement('afterend', calendar); else profile.appendChild(calendar);
    }
    return calendar;
  }

  /* ---------- active state ---------- */
  function markNavigation(requested) {
    if (!nav) return;
    const activeId = document.querySelector('.page.active')?.id || requested;
    const id = requested === 'calendar' ? 'calendar' : activeId;
    const visible = (b) => b && !b.hidden && b.offsetParent !== null;
    const exact = nav.querySelector(`button[data-page="${id}"]`);
    const key = visible(exact) || !PARENT[id] ? id : PARENT[id];
    nav.querySelectorAll('button[data-page]').forEach((button) => {
      const on = button.dataset.page === key;
      button.classList.toggle('active', on);
      if (on) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
  }

  function activatePage(id) {
    const target = document.getElementById(id);
    if (!target) return false;
    const page = target.classList.contains('page') ? target : target.closest('.page');
    document.querySelectorAll('.page.active').forEach((p) => { if (p !== page) p.classList.remove('active'); });
    if (page) page.classList.add('active');
    if (nav) nav.style.display = id === 'setup' ? 'none' : 'flex';
    return true;
  }

  function showPage(id, ...args) {
    const requested = id;
    const route = resolve(id === 'calendar' ? 'profile' : id);
    let result;
    try { if (typeof inner === 'function') result = inner.apply(this, [route, ...args]); }
    catch (error) { console.error('Strenova navigation failed:', route, error); }
    if (!activatePage(route)) { console.warn('Strenova navigation target does not exist:', route); return result; }
    if (route === 'profile') {
      mountCalendarInProfile();
      if (requested === 'calendar') {
        const reveal = () => { const c = mountCalendarInProfile(); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
        requestAnimationFrame(() => requestAnimationFrame(reveal));
      }
    }
    if (requested !== 'calendar') { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {} }
    markNavigation(requested);
    // Later modules can swap the active page in their own hooks; settle the highlight after them.
    requestAnimationFrame(() => markNavigation(requested));
    setTimeout(() => markNavigation(requested), 150);
    return result;
  }
  showPage.__strenovaRouter = true;
  window.showPage = showPage;

  /* ---------- navigation buttons ---------- */
  if (nav) {
    nav.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-page]');
      if (!button || !nav.contains(button) || !ROUTES.has(button.dataset.page)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const key = button.dataset.page;
      if (key === 'coach' && typeof window.__stOpenCoachTab === 'function') { window.__stOpenCoachTab(); return; }
      window.showPage(key);
    }, true);
    nav.querySelectorAll('button[data-page]').forEach((button) => {
      button.type = 'button';
      if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', button.innerText.trim());
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountCalendarInProfile, { once: true });
  else mountCalendarInProfile();
  markNavigation(document.querySelector('.page.active')?.id || 'home');
  window.StrenovaRouter = { mark: markNavigation, resolve };
})();
