// ── CSS bundle (Vite extracts these into a single dist/css/style.css) ────────
import '../css/variables.css'
import '../css/base.css'
import '../css/animations.css'
import '../css/layout.css'
import '../css/ascii-art.css'
import '../css/effects.css'
import '../css/components.css'
import '../css/tables.css'
import '../css/modals.css'
import '../css/toast.css'
import '../css/skeleton.css'
import '../css/ascii-engine.css'
import '../css/asciify.css'
import '../css/auth.css'
import '../css/admin.css'
import '../css/catalog.css'
import '../css/mobile.css'
import '../css/offline.css'
import '../css/workout-diary.css'

// ── ASCII engines (init before React mount, operate on <canvas> directly) ────
import './components/asciiEngine.js'
import './components/asciifyEngine.js'

// ── Framework-agnostic utilities still needed by vanilla modals ──────────────
import { loadSavedColor } from './components/color-picker.js'
import { auth } from './auth.js'
import { state } from './state.js'
import { subscribe, computed } from './reactive.js'
import { toast } from './react/components/Toast.js'
import './components/trendChart.js'
import './components/skeleton.js'
import './components/wakeLock.js'
import type { DrugDto } from './types/index.js'

// ── Vanilla modals (still needed — React pages call window.openXxxModal) ────
// These will be removed in Phase 3 when React modals replace them
import './components/modals.js'
import './components/workoutModals.js'
import './components/purchaseModals.js'

// Vanilla modals need drugsMap + drug select updates
import { updateLogDrugSelect } from './pages/course.js'
subscribe('drugs', () => { updateLogDrugSelect() })

export const drugsMap = computed<Map<string, DrugDto>>(['drugs'], () => {
    const map = new Map<string, DrugDto>()
    for (const d of state.drugs) map.set(d.id, d)
    return map
})

export const drugOptionsHtml = computed<string>(['drugs'], () => {
    return state.drugs.map((d: DrugDto) =>
        `<option value="${d.id}">${d.name}</option>`
    ).join('')
})

// ── Expose auth on window (for inline onclick handlers in color-picker) ──────
window.auth = auth

declare global {
    interface Window {
        skeleton: { drugCards: (n: number) => string; card: () => string }
        asciify?: { init: () => void; enabled: boolean }
        auth: typeof auth
    }
}

// ── Pre-load theme color before React renders (prevents flash) ───────────────
loadSavedColor()

// ── Mount React app ──────────────────────────────────────────────────────────
import { createRoot } from 'react-dom/client'
import App from './react/App.js'

const container = document.getElementById('app')
if (container) {
    const root = createRoot(container)
    root.render(<App />)
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE WORKER + OFFLINE SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

function registerServiceWorker(): void {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js')
        .then(reg => {
            console.log('[SW] Registered, scope:', reg.scope)

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing
                if (!newWorker) return

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        toast.info('Доступно обновление!', 30000, {
                            label: '[ ОБНОВИТЬ ]',
                            onClick: () => {
                                reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
                                window.location.reload()
                            }
                        })
                    }
                })
            })
        })
        .catch(err => console.error('[SW] Registration failed:', err))

    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
            toast.success(`Синхронизировано: ${event.data.processed} действий`)
        }
    })
}

// ── Online/Offline indicators ────────────────────────────────────────────────

window.addEventListener('online', () => {
    document.body.classList.remove('offline')
    toast.success('Подключение восстановлено')
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
            (reg as any).sync?.register('sync-mutations').catch(() => {})
        })
    }
})

window.addEventListener('offline', () => {
    document.body.classList.add('offline')
    toast.warning('Вы офлайн. Данные могут быть устаревшими.')
})

if (!navigator.onLine) {
    document.body.classList.add('offline')
}

// ── Offline mutation queue (client-side) ─────────────────────────────────────

export async function queueOfflineMutation(
    method: string, url: string, body?: string, headers?: Record<string, string>
): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('bt-offline', 1)
        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains('queue')) {
                db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
            }
        }
        request.onsuccess = () => {
            const db = request.result
            const tx = db.transaction('queue', 'readwrite')
            const store = tx.objectStore('queue')
            store.add({
                method, url, body,
                headers: headers || { 'Content-Type': 'application/json' },
                timestamp: Date.now()
            })
            tx.oncomplete = () => {
                resolve()
                toast.info('Действие сохранено. Отправится при восстановлении сети.')
            }
            tx.onerror = () => reject(tx.error)
        }
        request.onerror = () => reject(request.error)
    })
}

;(window as any).queueOfflineMutation = queueOfflineMutation

registerServiceWorker()
