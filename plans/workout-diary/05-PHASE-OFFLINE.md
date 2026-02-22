# Phase 5: Offline & Polish
> BloodTracker — Workout Diary
> Estimated effort: 1-2 дня
> Dependencies: Phase 1-2 (Phases 3-4 optional)
> Status: 📋 Planning

---

## Что входит в Phase 5

| # | Задача | Effort | Приоритет |
|---|--------|--------|-----------|
| 1 | IndexedDB local storage | 0.5 дня | P0 |
| 2 | Offline mutation queue | 0.5 дня | P0 |
| 3 | Service Worker workout routes | 0.25 дня | P0 |
| 4 | Optimistic UI updates | 0.25 дня | P0 |
| 5 | Conflict resolution (LWW) | 0.25 дня | P1 |
| 6 | Background sync | 0.25 дня | P2 |
| 7 | Offline indicator UI | 0.25 дня | P0 |

---

## 1. IndexedDB Local Storage

### Зачем
Тренировка в зале = нестабильный интернет (подвал, металлические конструкции). Все данные текущей сессии хранятся локально в IndexedDB и синхронизируются при восстановлении сети.

### Schema

```typescript
const DB_NAME = 'BloodTrackerWorkoutDB';
const DB_VERSION = 1;

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Active workout session (max 1)
      if (!db.objectStoreNames.contains('activeSession')) {
        const store = db.createObjectStore('activeSession', { keyPath: 'id' });
        store.createIndex('userId', 'userId');
      }
      
      // Offline mutation queue
      if (!db.objectStoreNames.contains('offlineQueue')) {
        const store = db.createObjectStore('offlineQueue', { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('timestamp', 'timestamp');
      }
      
      // Cached exercise history (for "What to beat")
      if (!db.objectStoreNames.contains('exerciseHistory')) {
        const store = db.createObjectStore('exerciseHistory', { keyPath: 'id' });
        store.createIndex('exerciseName', 'exerciseName');
      }
      
      // Rest timer settings (cached)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

### Active Session Storage

```typescript
async function saveSessionLocally(session: WorkoutSession): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('activeSession', 'readwrite');
  tx.objectStore('activeSession').put(session);
}

async function getLocalSession(): Promise<WorkoutSession | null> {
  const db = await initDB();
  const tx = db.transaction('activeSession', 'readonly');
  const store = tx.objectStore('activeSession');
  const all = await promisifyRequest(store.getAll());
  return all.length > 0 ? all[0] : null;
}

async function clearLocalSession(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('activeSession', 'readwrite');
  tx.objectStore('activeSession').clear();
}
```

### Когда сохраняем локально

```typescript
// После КАЖДОГО действия с сессией:
async function completeSet(setId: string, data: CompleteSetData) {
  // 1. Обновляем локальный state
  const session = updateLocalSessionState(setId, data);
  
  // 2. Сохраняем в IndexedDB
  await saveSessionLocally(session);
  
  // 3. Пытаемся отправить на сервер (или в offline queue)
  await sendOrQueue('POST', `/api/workout/set/${setId}/complete`, data);
  
  // 4. Обновляем UI
  renderActiveWorkout(session);
}
```

---

## 2. Offline Mutation Queue

### Структура

```typescript
interface OfflineMutation {
  id: string;           // UUID
  method: 'POST' | 'PUT' | 'DELETE';
  url: string;
  body: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

class OfflineQueue {
  private db: IDBDatabase;
  
  async init() {
    this.db = await initDB();
  }
  
  async add(method: string, url: string, body: any): Promise<void> {
    const mutation: OfflineMutation = {
      id: crypto.randomUUID(),
      method: method as any,
      url,
      body,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 5,
      status: 'pending'
    };
    
    const tx = this.db.transaction('offlineQueue', 'readwrite');
    tx.objectStore('offlineQueue').add(mutation);
    
    // Try to sync immediately
    this.processQueue();
  }
  
  async processQueue(): Promise<void> {
    if (!navigator.onLine) return;
    
    const pending = await this.getPending();
    
    for (const mutation of pending) {
      try {
        mutation.status = 'syncing';
        await this.updateMutation(mutation);
        
        const response = await fetch(mutation.url, {
          method: mutation.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mutation.body)
        });
        
        if (response.ok) {
          await this.removeMutation(mutation.id);
        } else if (response.status >= 500) {
          // Server error — retry later
          mutation.status = 'pending';
          mutation.retryCount++;
          await this.updateMutation(mutation);
        } else {
          // Client error (4xx) — don't retry, mark failed
          mutation.status = 'failed';
          await this.updateMutation(mutation);
        }
      } catch (error) {
        // Network error — keep pending
        mutation.status = 'pending';
        mutation.retryCount++;
        
        if (mutation.retryCount >= mutation.maxRetries) {
          mutation.status = 'failed';
        }
        
        await this.updateMutation(mutation);
      }
    }
  }
  
  private async getPending(): Promise<OfflineMutation[]> {
    const tx = this.db.transaction('offlineQueue', 'readonly');
    const index = tx.objectStore('offlineQueue').index('status');
    return promisifyRequest(index.getAll('pending'));
  }
  
  async getPendingCount(): Promise<number> {
    return (await this.getPending()).length;
  }
}

export const offlineQueue = new OfflineQueue();
```

---

## 3. Service Worker Routes

### Добавить workout routes в existing SW

```typescript
// In existing service-worker.ts

// Workout API — offline queue для mutations
const WORKOUT_MUTATION_ROUTES = [
  '/api/workout/session/start',
  '/api/workout/set/',          // covers /set/{id}/complete
  '/api/workout/session/',      // covers /session/{id}/complete, /abandon
  '/api/workout/exercise/',     // covers /exercise/{id}/set
];

// Workout API — cache-first для reads
const WORKOUT_CACHE_ROUTES = [
  '/api/workout/session/active',
  '/api/workout/session/history',
  '/api/workout/settings/',
  '/api/workout/analytics/',
];

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  
  // Mutations (POST/PUT/DELETE) → network-first with offline queue
  if (['POST', 'PUT', 'DELETE'].includes(event.request.method) &&
      WORKOUT_MUTATION_ROUTES.some(r => url.pathname.includes(r))) {
    event.respondWith(handleMutation(event.request));
    return;
  }
  
  // Reads (GET) → stale-while-revalidate
  if (event.request.method === 'GET' &&
      WORKOUT_CACHE_ROUTES.some(r => url.pathname.includes(r))) {
    event.respondWith(staleWhileRevalidate(event.request, 'workout-api-v1'));
    return;
  }
});

async function handleMutation(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Network failed — queue it
    const body = await request.clone().json();
    const mutation = {
      method: request.method,
      url: new URL(request.url).pathname,
      body,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB via BroadcastChannel
    const channel = new BroadcastChannel('offline-queue');
    channel.postMessage({ type: 'ADD_MUTATION', mutation });
    
    return new Response(
      JSON.stringify({ queued: true, offline: true }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Background Sync
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'workout-sync') {
    event.waitUntil(syncWorkoutQueue());
  }
});
```

---

## 4. Optimistic UI

### Принцип

UI обновляется СРАЗУ, не дожидаясь ответа сервера. Если сервер вернул ошибку — откат.

```typescript
async function completeSet(setId: string, data: CompleteSetData) {
  // 1. Snapshot current state (for rollback)
  const snapshot = cloneDeep(currentSession);
  
  // 2. Optimistic update
  const set = findSet(currentSession, setId);
  set.actualWeight = data.weight;
  set.actualRepetitions = data.repetitions;
  set.rpe = data.rpe;
  set.completedAt = new Date().toISOString();
  
  // Update counters
  recalculateProgress(currentSession);
  
  // 3. Render immediately
  renderActiveWorkout(currentSession);
  
  // 4. Save to IndexedDB
  await saveSessionLocally(currentSession);
  
  // 5. Start rest timer
  startRestTimer(getRestSeconds(findExercise(setId)));
  
  // 6. Send to server (async, don't block UI)
  try {
    const response = await sendOrQueue('POST', `/api/workout/set/${setId}/complete`, data);
    
    if (response?.isNewPR) {
      showPRCelebration(response.prDetails);
    }
  } catch (error) {
    // Network error → already queued, UI already updated
    console.log('Saved to offline queue');
  }
}
```

### Rollback (if server rejects)

```typescript
function handleServerRejection(setId: string, error: ApiError, snapshot: WorkoutSession) {
  // Show error toast
  showToast(`Failed to save set: ${error.message}`, 'error');
  
  // Rollback to snapshot
  currentSession = snapshot;
  renderActiveWorkout(currentSession);
  await saveSessionLocally(currentSession);
}
```

---

## 5. Conflict Resolution

### Strategy: Last-Write-Wins (LWW)

Самый простой подход для 1-user per-device scenario.

```typescript
async function syncSession(localSession: WorkoutSession): Promise<void> {
  const serverSession = await api.get(`/api/workout/session/${localSession.id}`);
  
  if (!serverSession) {
    // Server doesn't have it — upload
    await api.post('/api/workout/session', localSession);
    return;
  }
  
  // Compare each set by CompletedAt timestamp
  for (const localEx of localSession.exercises) {
    const serverEx = serverSession.exercises.find(e => e.id === localEx.id);
    if (!serverEx) continue;
    
    for (const localSet of localEx.sets) {
      const serverSet = serverEx.sets.find(s => s.id === localSet.id);
      
      if (!serverSet && localSet.completedAt) {
        // Local has completed set, server doesn't → send to server
        await api.post(`/api/workout/set/${localSet.id}/complete`, localSet);
      } else if (serverSet?.completedAt && localSet.completedAt) {
        // Both have data → LWW
        if (new Date(localSet.completedAt) > new Date(serverSet.completedAt)) {
          await api.put(`/api/workout/set/${localSet.id}`, localSet);
        }
        // else: server is newer, update local (already happens on next GET)
      }
    }
  }
}
```

### When to sync

```typescript
// 1. On app load (visibility change)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    offlineQueue.processQueue();
  }
});

// 2. On network restore
window.addEventListener('online', () => {
  offlineQueue.processQueue();
  showToast('Back online — syncing...');
});

// 3. Periodic (every 30 sec while online)
setInterval(() => {
  if (navigator.onLine) {
    offlineQueue.processQueue();
  }
}, 30000);
```

---

## 6. Background Sync

### Registration

```typescript
async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await registration.sync.register('workout-sync');
    } catch (err) {
      console.log('Background sync not available');
    }
  }
}

// Call after adding to offline queue
offlineQueue.add = async function(method, url, body) {
  // ... existing logic ...
  await registerBackgroundSync();
};
```

### Periodic Sync (if available)

```typescript
async function registerPeriodicSync() {
  if ('periodicSync' in (await navigator.serviceWorker.ready)) {
    try {
      await (await navigator.serviceWorker.ready).periodicSync.register('workout-periodic-sync', {
        minInterval: 30 * 60 * 1000 // 30 minutes
      });
    } catch (err) {
      // Not granted or not available
    }
  }
}
```

---

## 7. Offline Indicator UI

### Persistent Banner

```
┌──────────────────────────────────────────────────────────┐
│  ⚡ OFFLINE — data saved locally (3 pending syncs)       │
└──────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
class OfflineIndicator {
  private el: HTMLElement;
  
  constructor() {
    this.el = document.getElementById('offline-indicator')!;
    
    window.addEventListener('online', () => this.update());
    window.addEventListener('offline', () => this.update());
    
    // Check pending count periodically
    setInterval(() => this.update(), 5000);
  }
  
  async update() {
    if (navigator.onLine) {
      const pending = await offlineQueue.getPendingCount();
      if (pending > 0) {
        this.show(`Syncing... (${pending} pending)`, 'syncing');
      } else {
        this.hide();
      }
    } else {
      const pending = await offlineQueue.getPendingCount();
      this.show(
        `⚡ OFFLINE — data saved locally${pending > 0 ? ` (${pending} pending)` : ''}`,
        'offline'
      );
    }
  }
  
  show(message: string, type: 'offline' | 'syncing') {
    this.el.textContent = message;
    this.el.className = `offline-indicator ${type}`;
    this.el.hidden = false;
  }
  
  hide() {
    this.el.hidden = true;
  }
}
```

### CSS

```css
.offline-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 4px 16px;
  text-align: center;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  z-index: 300;
}

.offline-indicator.offline {
  background: #ff3333;
  color: #fff;
}

.offline-indicator.syncing {
  background: #ff6b35;
  color: #fff;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  50% { opacity: 0.7; }
}
```

---

## Data Flow Summary

```
                ┌─────────────┐
                │   User UI   │
                └──────┬──────┘
                       │
              ┌────────▼────────┐
              │  Optimistic UI  │ ← immediate render
              │  + localStorage │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   IndexedDB     │ ← persistent local store
              │   (IDB)         │
              └────────┬────────┘
                       │
           ┌───────────▼───────────┐
           │  Online?              │
           │  ├── Yes → API call   │──→ Server (LiteDB)
           │  └── No  → Queue     │
           └───────────┬───────────┘
                       │ (offline)
              ┌────────▼────────┐
              │  Offline Queue  │ (IndexedDB 'offlineQueue')
              │  (pending)      │
              └────────┬────────┘
                       │ (online restored)
              ┌────────▼────────┐
              │  Background     │
              │  Sync / Retry   │──→ Server (LiteDB)
              └─────────────────┘
```

---

## Checklist для Phase 5

```
IndexedDB:
  □ initDB() with all stores
  □ saveSessionLocally / getLocalSession / clearLocalSession
  □ Exercise history cache
  □ Settings cache

Offline Queue:
  □ OfflineQueue class (add, processQueue, getPendingCount)
  □ Retry logic (max 5 retries, exponential backoff)
  □ Failed queue (dead letter)

Service Worker:
  □ Workout mutation routes (POST/PUT/DELETE → offline queue)
  □ Workout read routes (GET → stale-while-revalidate)
  □ Background Sync registration
  □ BroadcastChannel for SW ↔ main thread

Optimistic UI:
  □ Snapshot/rollback pattern for completeSet
  □ Immediate render before server response
  □ Error toast on server rejection

Conflict Resolution:
  □ LWW sync on session data
  □ Set-level CompletedAt comparison

UI:
  □ Offline indicator banner (fixed top)
  □ Pending sync count
  □ "Syncing..." animation
  □ "Back online" toast

Testing:
  □ Complete set while offline → saved to IDB + queue
  □ Come online → queue processes, server updated
  □ Start workout offline → works, syncs later
  □ Close/reopen browser → session restored from IDB
  □ Two tabs → no conflicts (single active session guard)
```

---

*See also: [06-UX-DESIGN-GUIDE.md](./06-UX-DESIGN-GUIDE.md) — Design system, components, accessibility*
