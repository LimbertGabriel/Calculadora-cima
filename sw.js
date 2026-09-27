// Service worker: permite usar la app sin internet.
// Sirve desde caché al instante y actualiza en segundo plano (la versión nueva se ve en la siguiente visita).
const CACHE = 'cima-v2';
const ARCHIVOS = [
  './',
  'index.html',
  'css/styles.css',
  'js/calc.js',
  'js/config.js',
  'js/app.js',
  'js/juego.js',
  'js/juego-ui.js',
  'manifest.webmanifest',
  'icons/icono.svg',
  'icons/marca-cima.svg',
  'icons/logo-cima.svg',
  'icons/icono-192.png',
  'icons/icono-512.png',
  'fonts/baloo-2-latin-600-normal.woff2',
  'fonts/baloo-2-latin-800-normal.woff2',
  'fonts/figtree-latin-400-normal.woff2',
  'fonts/figtree-latin-600-normal.woff2',
  'fonts/figtree-latin-700-normal.woff2',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET' || new URL(ev.request.url).origin !== location.origin) return;
  ev.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const enCache = await cache.match(ev.request, { ignoreSearch: true });
      const deRed = fetch(ev.request)
        .then((resp) => {
          if (resp.ok) cache.put(ev.request, resp.clone());
          return resp;
        })
        .catch(() => enCache);
      return enCache || deRed;
    }),
  );
});
