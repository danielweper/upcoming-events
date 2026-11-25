// Service worker: keeps the page and events.json in Cache Storage and serves them without touching
// the network for MAX_AGE_MS. Kiosks that reload the page every few seconds (and don't cache) would
// otherwise hit GitHub Pages every time and get rate limited. If the network fails or is limited,
// the last saved copy is served.
const CACHE = 'events-v1';
const MAX_AGE_MS = 5 * 60 * 1000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(handle(e.request, url));
});

async function handle(request, url) {
  const cache = await caches.open(CACHE);
  const key = url.origin + url.pathname; // ignore ?query
  const hit = await cache.match(key);
  if (hit && Date.now() - Number(hit.headers.get('x-cached-at') || 0) < MAX_AGE_MS) return hit;
  try {
    const res = await fetch(request);
    if (res.ok && res.status === 200) {
      const headers = new Headers(res.headers);
      headers.set('x-cached-at', String(Date.now()));
      await cache.put(key, new Response(await res.clone().blob(), { status: 200, headers }));
    } else if (hit) {
      return hit; // e.g. HTTP 429: keep serving the saved copy
    }
    return res;
  } catch (err) {
    if (hit) return hit;
    throw err;
  }
}
