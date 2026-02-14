let wakeLock: WakeLockSentinel | null = null

export async function acquireWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) return

    // Don't acquire if page is hidden (will throw NotAllowedError)
    if (document.visibilityState !== 'visible') return

    // Already holding an active lock
    if (wakeLock && !wakeLock.released) return

    try {
        wakeLock = await navigator.wakeLock.request('screen')
        wakeLock.addEventListener('release', () => {
            console.log('[wakeLock] Released')
        })
        console.log('[wakeLock] Acquired')
    } catch (err) {
        // Silently ignore NotAllowedError (page went hidden between check and request)
        if (err instanceof DOMException && err.name === 'NotAllowedError') return
        console.error('[wakeLock] Failed to acquire:', err)
    }
}

export async function releaseWakeLock(): Promise<void> {
    if (wakeLock) {
        try {
            await wakeLock.release()
            wakeLock = null
            console.log('[wakeLock] Manually released')
        } catch (err) {
            console.error('[wakeLock] Failed to release:', err)
        }
    }
}

export function isWakeLockActive(): boolean {
    return wakeLock !== null && !wakeLock.released
}

// Re-acquire when page becomes visible again (browser auto-releases on hide)
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeLock?.released) {
        await acquireWakeLock()
    }
})
