/* Wind Rose PWA service worker: cache app shell for offline use */
const CACHE = 'windrose-v1';
const ASSETS = [
  'index.html','embed.html','styles.css','app.js','favicon.svg',
  'data/sites.json',
  // core
  'core/units.js','core/wx-api.js','core/svg-utils.js','core/layout.js','core/config.js','core/directions.js','core/colors.js','core/state.js','core/time.js','core/catalog.js',
  // ui
  'ui/tooltips.js','ui/rose.js','ui/carousel.js','ui/model.js','ui/compass.js','ui/legend.js','ui/catalog.js','ui/map.js','ui/units.js','ui/export.js','ui/hotkeys.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // bypass cross-origin (e.g., map tiles & CDNs)
  if (url.origin !== self.location.origin) return;
  // network-first for data; cache-first for static
  if (url.pathname.endsWith('.json')) {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE); cache.put(req, net.clone());
        return net;
      } catch {
        const hit = await caches.match(req);
        return hit || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      }
    })());
  } else {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE); cache.put(req, net.clone());
        return net;
      } catch {
        return caches.match('index.html');
      }
    })());
  }
});


