// ═══════════════════════════════════════════════════════════════════════════════
// BloodTracker Service Worker — Offline-first PWA
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_STATIC = 'bt-static-v18'
const CACHE_API = 'bt-api-v2'
const SYNC_QUEUE_TAG = 'sync-mutations'

// Static assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon.svg',
  '/dist/css/style.css',
  '/dist/js/main.js',
  '/dist/js/react-vendor.js',
]

// ─── Install: precache static assets ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(async (cache) => {
      // Add precache URLs (non-blocking failures for optional assets)
      const results = await Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(e => console.warn('[SW] precache skip:', url, e.message)))
      )
      // Also cache the Vite bundle (dist/js/main.js with hash)
      try {
        const response = await fetch('/')
        const html = await response.text()
        const match = html.match(/src="(\/dist\/js\/[^"]+)"/)
        if (match) {
          await cache.add(match[1])
        }
      } catch (e) {
        console.warn('[SW] bundle precache failed:', e.message)
      }
      return self.skipWaiting()
    })
  )
})

// ─── Activate: cleanup old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_STATIC, CACHE_API]
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !currentCaches.includes(k))
          .map(k => { console.log('[SW] deleting old cache:', k); return caches.delete(k) })
      ))
      .then(() => self.clients.claim())
  )
})

// ─── Fetch strategies ───────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    // Offline and not cached — return fallback
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
      statusText: 'Service Unavailable'
    })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_API)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then(response => {
      // Only cache JSON API responses — never cache HTML fallbacks
      const ct = response.headers.get('content-type') || ''
      if (response.ok && ct.includes('application/json')) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null) // Swallow network errors — cached version is fine

  // Return cached immediately if available, otherwise wait for network
  if (cached) {
    // Fire-and-forget revalidation
    fetchPromise.catch(() => {})
    return cached
  }

  const networkResponse = await fetchPromise
  if (networkResponse) return networkResponse

  return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  })
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests (mutations) — let them fail naturally if offline
  if (event.request.method !== 'GET') return

  // Skip cross-origin requests — don't intercept external CDNs, Google Auth, extensions
  if (url.origin !== self.location.origin) return

  // Skip auth endpoints (tokens should never be cached)
  if (url.pathname.includes('/auth')) return

  // Dist bundle: network-first (ensures fresh code after deployments)
  // MUST come before static asset check — .js/.css extension match would catch these first
  if (url.pathname.startsWith('/dist/')) {
    event.respondWith(networkFirst(event.request))
    return
  }

  // Static assets: cache-first (fonts, images, icons — NOT dist bundles)
  if (url.pathname.match(/\.(png|svg|jpg|jpeg|gif|webp|woff2?|ttf|eot|ico)$/)) {
    event.respondWith(cacheFirst(event.request))
    return
  }

  // HTML pages: network-first (always try fresh)
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(event.request))
    return
  }

  // API GET requests: pass through to network (no SW caching)
  // Localhost API is always available — SW caching only adds latency and doubles requests
  if (url.pathname.startsWith('/api/v1/')) {
    return
  }

  // Everything else: network with cache fallback
  event.respondWith(networkFirst(event.request))
})

// ─── Background Sync for offline mutations ──────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_QUEUE_TAG) {
    event.waitUntil(processMutationQueue())
  }
})

async function processMutationQueue() {
  const db = await openSyncDb()
  const tx = db.transaction('queue', 'readonly')
  const store = tx.objectStore('queue')

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = async () => {
      const items = request.result || []
      let processed = 0

      for (const item of items) {
        // TTL: skip items older than 24h
        if (Date.now() - item.timestamp > 24 * 60 * 60 * 1000) {
          await deleteFromQueue(db, item.id)
          continue
        }

        try {
          await fetch(item.url, {
            method: item.method,
            headers: item.headers || { 'Content-Type': 'application/json' },
            body: item.body
          })
          await deleteFromQueue(db, item.id)
          processed++
        } catch (e) {
          // Still offline — stop processing
          console.warn('[SW] sync failed, will retry:', e.message)
          break
        }
      }

      // Notify all clients about sync completion
      if (processed > 0) {
        const clients = await self.clients.matchAll()
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_COMPLETE', processed })
        })
      }

      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

function openSyncDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bt-offline', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function deleteFromQueue(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite')
    const store = tx.objectStore('queue')
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ─── SW update notification ─────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
