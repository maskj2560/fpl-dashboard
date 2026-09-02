// Service worker (v1.12.0). Kilden serveres av routes/pwa.js på /sw.js, som
// bytter plassholderen under mot den ekte asset-hashen: nytt cache-navn per
// deploy → ny SW → gamle fpl-*-cacher ryddes ved activate. Strategi:
//   - navigasjon: nett først, /offline som fallback uten nett
//   - ?v=-assets (css/js/font/bilder/manifest): cache først, put ved ok
//   - alt annet: rett til nett, aldri cachet
// /api, /kalender.ics, /health og sw.js selv går alltid utenom SW-en.
// Ingen HTML utenom /offline caches — HTML-en bærer CSP-nonce per forespørsel.
// (self/caches er worker-globals — eslint.config.js gir dem for src/pwa/.)

const CACHE = 'fpl-__ASSET_VERSION__';
const NEVER_CACHE = [/^\/api\//, /^\/kalender\.ics$/, /^\/health$/, /^\/sw\.js$/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(new Request('/offline', { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('fpl-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((re) => re.test(url.pathname))) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline').then((hit) => hit || Response.error())),
    );
    return;
  }

  if (url.searchParams.has('v')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
  // Alt annet (uversjonerte GET-er): nettleseren henter selv, SW-en rører det ikke.
});
