// Pokey Fire service worker: makes the app open offline and keeps card images handy.
//  - Page loads: network first, falling back to the cached app shell when offline.
//  - /_expo/static/* and /icons/*: cache first (bundle file names change on every build).
//  - Card images from TCGdex: cache first, capped, so your collection still shows offline.
//  - /api/*: always network. Prices and scans need to be live.
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const STATIC = `static-${VERSION}`;
const IMAGES = `card-images-${VERSION}`;
const KEEP = [SHELL, STATIC, IMAGES];

// Precache the page plus the bundle files it references, so the app opens offline
// right after the first visit (those requests happened before this worker was in control).
async function precache() {
  const shell = await caches.open(SHELL);
  await shell.addAll(['/manifest.json', '/icons/icon-192.png']);
  const page = await fetch('/', { cache: 'no-cache' });
  if (!page.ok) return;
  await shell.put('/', page.clone());
  const html = await page.text();
  const files = [...html.matchAll(/(?:src|href)="(\/_expo\/[^"]+)"/g)].map((m) => m[1]);
  if (files.length) await (await caches.open(STATIC)).addAll(files);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

async function cacheFirst(request, cacheName, max) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Opaque (no-cors) image responses report status 0 but are still usable.
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (max) trim(cacheName, max);
  }
  return response;
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(SHELL)).put('/', response.clone());
    return response;
  } catch {
    return (await caches.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;
    if (request.mode === 'navigate') return event.respondWith(networkFirstPage(request));
    if (url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
      return event.respondWith(cacheFirst(request, STATIC, 80));
    }
    return;
  }

  if (url.hostname === 'assets.tcgdex.net') {
    event.respondWith(cacheFirst(request, IMAGES, 400));
  }
});
