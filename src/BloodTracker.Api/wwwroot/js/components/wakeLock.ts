let wakeLock: WakeLockSentinel | null = null

export async function acquireWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) {
        console.warn('[wakeLock] Wake Lock API not supported')
        return
    }

    try {
        wakeLock = await navigator.wakeLock.request('screen')
        wakeLock.addEventListener('release', () => {
            console.log('[wakeLock] Released')
        })
        console.log('[wakeLock] Acquired')
    } catch (err) {
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

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeLock?.released) {
        await acquireWakeLock()
    }
})
