/* Minimal service worker — makes the app installable (PWA) and gives it an
 * offline app-shell cache. There is no backend and no dynamic API traffic to
 * worry about: every bit of state lives in cookies on the device. */
const CACHE = 'kin-shell-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Always fetch the manifest fresh so icon/manifest changes apply immediately.
  if (url.pathname === '/manifest.webmanifest') return

  // Navigations: network-first, fall back to the cached app shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then(r => r || caches.match('/'))),
    )
    return
  }

  // Static assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(resp => {
      if (resp.ok && resp.type === 'basic') {
        const copy = resp.clone()
        caches.open(CACHE).then(c => c.put(request, copy))
      }
      return resp
    }).catch(() => cached)),
  )
})
