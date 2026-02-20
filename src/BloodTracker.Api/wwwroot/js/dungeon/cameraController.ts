/* ═══════════════════════════════════════════════════════════════════════════
   CAMERA CONTROLLER — Enter/exit room animations
   3-phase enter: camera approach → door swing → content ready
   Reverse exit: camera retreat
   ═══════════════════════════════════════════════════════════════════════════ */

export class CameraController {
    private hallEl: HTMLElement

    constructor(hallEl: HTMLElement) {
        this.hallEl = hallEl
    }

    async enterRoom(doorEl: HTMLElement): Promise<void> {
        this.hallEl.classList.add('dungeon-transitioning')

        // Phase 1: Camera approaches door (300ms)
        this.hallEl.style.animation = 'camera-approach 300ms ease-in forwards'
        await this.waitForAnimation(this.hallEl)
    }

    async exitRoom(): Promise<void> {
        // Camera retreats (300ms)
        this.hallEl.style.animation = 'camera-retreat 300ms ease-out forwards'
        await this.waitForAnimation(this.hallEl)
        this.hallEl.classList.remove('dungeon-transitioning')
        this.hallEl.style.animation = ''
    }

    private waitForAnimation(el: HTMLElement): Promise<void> {
        return new Promise(resolve => {
            const handler = () => {
                el.removeEventListener('animationend', handler)
                resolve()
            }
            el.addEventListener('animationend', handler)

            // Fallback timeout in case animationend doesn't fire
            setTimeout(resolve, 500)
        })
    }
}
