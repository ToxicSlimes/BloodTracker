# 07 — Offline Mode / PWA

**Приоритет:** 7 (последний)
**Оценка:** 13-15 часов
**Сложность:** Высокая

## Цель
PWA с Service Worker: кэш статики, offline доступ к данным, installable app.

## Зависимости
- TypeScript (#05 — опционально, можно на JS)
- Vite bundling (для hashed assets — уже готов)

---

## Phase 1: PWA Manifest + SW регистрация [2ч]

### 1.1 `manifest.json`
```json
{
  "name": "BloodTracker",
  "short_name": "BT",
  "description": "Трекер анализов крови и курсов препаратов",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#00ff00",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 1.2 Иконки
- Создать SVG иконку (ASCII skull в зелёном терминальном стиле)
- Экспорт в PNG: 192x192, 512x512, maskable вариант
- Положить в `wwwroot/icons/`

### 1.3 `index.html` — добавить:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#00ff00">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

### 1.4 SW регистрация
```javascript
// В main.js или отдельный sw-register.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('[SW] Registered:', reg.scope))
    .catch(err => console.error('[SW] Registration failed:', err))
}
```

---

## Phase 2: Cache-first для статики [2ч]

### 2.1 `sw.js` — Install event
```javascript
const CACHE_VERSION = 'bt-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/mobile.css',
  // ... все CSS и JS файлы
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})
```

### 2.2 Activate — cleanup старых кэшей
```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})
```

### 2.3 Fetch — cache-first для статики
```javascript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Static assets: cache-first
  if (url.pathname.match(/\.(css|js|png|svg|woff2?)$/)) {
    event.respondWith(cacheFirst(event.request))
    return
  }

  // HTML: network-first (always fresh)
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(event.request))
    return
  }

  // API: stale-while-revalidate (Phase 3)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(event.request))
    return
  }
})
```

---

## Phase 3: API кэширование [4ч]

### 3.1 Stale-while-revalidate для GET
```javascript
async function staleWhileRevalidate(request) {
  const cache = await caches.open('bt-api-v1')
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => cached) // Fallback to cache if offline

  return cached || fetchPromise
}
```

### 3.2 Network-only для mutations
- POST, PUT, DELETE → always network
- При offline → сохранить в IndexedDB queue

### 3.3 IndexedDB для offline queue
```javascript
// Очередь мутаций для отложенной отправки
const DB_NAME = 'bt-offline'
const STORE_NAME = 'sync-queue'

async function queueMutation(method, url, body) {
  const db = await openDB(DB_NAME)
  await db.add(STORE_NAME, { method, url, body, timestamp: Date.now() })
}
```

### 3.4 Background Sync
```javascript
// В SW:
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(processMutationQueue())
  }
})

async function processMutationQueue() {
  const db = await openDB(DB_NAME)
  const items = await db.getAll(STORE_NAME)
  for (const item of items) {
    try {
      await fetch(item.url, { method: item.method, body: item.body })
      await db.delete(STORE_NAME, item.id)
    } catch { break } // Still offline, stop processing
  }
}
```

---

## Phase 4: Offline UI [3ч]

### 4.1 Online/Offline индикатор
```javascript
// В navigation.js или main.js
window.addEventListener('online', () => {
  document.body.classList.remove('offline')
  toast.success('Подключение восстановлено')
  // Trigger sync
  navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-mutations'))
})

window.addEventListener('offline', () => {
  document.body.classList.add('offline')
  toast.warning('Вы офлайн. Данные могут быть устаревшими.')
})
```

### 4.2 CSS для offline
```css
.offline .btn-primary:not([data-offline-ok]) {
  opacity: 0.5;
  pointer-events: none;
}
.offline .nav-indicator::after {
  content: ' [OFFLINE]';
  color: var(--warning-color);
}
```

### 4.3 Disable mutations при offline
- Кнопки создания/удаления — disabled с tooltip "Недоступно офлайн"
- Или: показать queue count "2 действия в очереди"

### 4.4 Stale data indicator
- Если данные из кэша: маленький badge "cached" рядом с timestamp

---

## Phase 5: Testing [2ч]

### 5.1 Manual testing
1. Загрузить приложение online
2. DevTools → Application → Service Workers → Offline
3. Перезагрузить — приложение должно загрузиться
4. Проверить данные — анализы, курсы видны из кэша
5. Включить сеть → проверить sync

### 5.2 Lighthouse
```bash
# В Chrome DevTools → Lighthouse → PWA
# Target: 100 PWA score
```

### 5.3 Чеклист:
- [ ] Installable (Add to Home Screen работает)
- [ ] Offline-capable (статика + данные)
- [ ] Background sync (мутации из очереди)
- [ ] Theme color + splash screen
- [ ] Lighthouse PWA = 100

---

## Риски
- IndexedDB quota на мобильных (обычно 50MB+ — достаточно)
- Конфликты при sync: мутация offline может конфликтовать с чужими изменениями
  → Решение: last-write-wins (достаточно для single-user)
- SW update: при новой версии — показать toast "Обновление доступно"
- Мутации в очереди могут устареть → TTL на элементы очереди (24ч)

## Критерий готовности
- Lighthouse PWA = 100
- Приложение загружается offline
- Данные видны из кэша
- Мутации в queue отправляются при восстановлении сети
- Install prompt работает на Android/iOS
