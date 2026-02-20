/* ═══════════════════════════════════════════════════════════════════════════
   ROOM MANAGER — Show/hide room content, back button, chart resize
   ═══════════════════════════════════════════════════════════════════════════ */

export class RoomManager {
    private currentRoomEl: HTMLElement | null = null
    private backBtn: HTMLElement | null = null
    private appEl: HTMLElement

    constructor(appEl: HTMLElement) {
        this.appEl = appEl
    }

    showRoom(roomId: string, onBack: () => void, themeClass?: string): void {
        // Find existing .page element
        const pageEl = document.getElementById(roomId)
        if (!pageEl) return

        // Show the page with optional theme
        pageEl.classList.add('active')
        if (themeClass) pageEl.classList.add(themeClass)
        this.currentRoomEl = pageEl

        // Add room-content animation class
        pageEl.classList.add('room-entering')
        pageEl.addEventListener('animationend', () => {
            pageEl.classList.remove('room-entering')
        }, { once: true })

        // Create back button
        this.backBtn = document.createElement('button')
        this.backBtn.className = 'room-back-btn'
        this.backBtn.textContent = '[ ← НАЗАД В ЗАЛ ]'
        this.backBtn.addEventListener('click', onBack)
        document.body.appendChild(this.backBtn)

        // Trigger chart resize after room content is visible
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'))
        })
    }

    async hideRoom(): Promise<void> {
        if (!this.currentRoomEl) return

        // Fade out
        this.currentRoomEl.classList.add('room-exiting')
        await new Promise<void>(resolve => {
            this.currentRoomEl!.addEventListener('animationend', () => resolve(), { once: true })
            setTimeout(resolve, 400) // fallback
        })

        this.currentRoomEl.classList.remove('active', 'room-entering', 'room-exiting',
            'room-throne', 'room-lab', 'room-alch', 'room-forge',
            'room-mirror', 'room-lib', 'room-studio', 'room-secret')
        this.currentRoomEl = null

        // Remove back button
        this.backBtn?.remove()
        this.backBtn = null
    }
}
