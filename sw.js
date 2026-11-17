// Strenova service worker (launch 2026-11-16).
// - Pages: network first, cached copy when offline or the network is too slow.
// - Same-origin static files (css/js/fonts/images): stale-while-revalidate,
//   so the app opens instantly in the gym and refreshes in the background.
// - The pinned Supabase library from jsDelivr: cache first (the URL is versioned).
// - config.js (public Supabase URL + publishable key only): network first, cached copy offline.
// - The page posts the files it loaded ('sx-cache'), so the app opens offline after one visit.
// - Never cached: Supabase API calls, sw.js, any non-GET request.
const VERSION = 'strenova-2026-11-17d';
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './strenova-icon-192.png', './strenova-icon-64.png', './assets/fonts/onest-var.woff', './assets/fonts/unbounded-600.woff', './404.html'];
const SUPABASE_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') { self.skipWaiting(); return; }
  if (e.data && e.data.type === 'sx-cache' && Array.isArray(e.data.urls)) e.waitUntil(warm(e.data.urls.slice(0, 200)));
});
async function warm(urls) {
  const cache = await caches.open(STATIC);
  await Promise.all(urls.map(async (u) => {
    try {
      const url = new URL(u, self.location.href);
      const own = url.origin === self.location.origin;
      if (!own && !url.href.startsWith(SUPABASE_LIB)) return;
      if (url.pathname.endsWith('/sw.js')) return;
      if (url.pathname.endsWith('/config.js')) { const r = await fetch(url.href, { cache: 'no-store' }); if (r.ok) await (await caches.open(SHELL)).put(url.href, r); return; }
      if (await cache.match(url.href)) return;
      const r = await fetch(url.href); if (r && r.ok) await cache.put(url.href, r);
    } catch (_) {}
  }));
}

function timeout(ms) { return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)); }

async function pageResponse(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await Promise.race([fetch(req), timeout(6000)]);
    if (res && res.ok && new URL(req.url).pathname.match(/\/(index\.html)?$/)) cache.put('./index.html', res.clone());
    return res;
  } catch (_) {
    return (await cache.match(req)) || (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}
async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const network = fetch(event.request).then((res) => { if (res && res.ok) cache.put(event.request, res.clone()); return res; }).catch(() => null);
  if (cached) { event.waitUntil(network); return cached; }
  return (await network) || Response.error();
}
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await Promise.race([fetch(req, { cache: 'no-store' }), timeout(5000)]);
    if (res && res.ok) cache.put(req.url.split('?')[0], res.clone());
    return res;
  } catch (_) {
    return (await cache.match(req.url.split('?')[0])) || Response.error();
  }
}
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.href.startsWith(SUPABASE_LIB)) { event.respondWith(cacheFirst(req, STATIC)); return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;
  if (url.pathname.endsWith('/config.js')) { event.respondWith(networkFirst(req, SHELL)); return; }
  if (req.mode === 'navigate') { event.respondWith(pageResponse(req)); return; }
  if (/\.(css|js|woff2?|png|svg|webp|jpg|jpeg|ico|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, STATIC));
  }
});
