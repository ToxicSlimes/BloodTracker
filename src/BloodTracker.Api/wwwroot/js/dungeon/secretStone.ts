/* =============================================================================
   SECRET STONE — Hidden cracked stone on right wall for admin access
   Only visible to admin users, no cursor:pointer to keep it secret
   ============================================================================= */

const CRACKED_STONE = `\
▓▓▓▓▒░░▒▓▓▓▓
▓▓▒╱   ╲▒▓▓▓
▓▒╱  ╱╲  ╲▒▓
▓╱  ╱  ╲  ╲▓
▒  ╱ ◊◊ ╲  ▒
▓╲  ╲  ╱  ╱▓
▓▒╲  ╲╱  ╱▒▓
▓▓▒╲   ╱▒▓▓▓
▓▓▓▓▒░░▒▓▓▓▓`

/**
 * Creates a hidden cracked stone on the right wall.
 * Subtle crack animation, hover glow, click slides stone and navigates to admin.
 * No cursor:pointer — the secret stays hidden.
 */
export function createSecretStone(wallEl: HTMLElement, onActivate: () => void): void {
    const stone = document.createElement('div')
    stone.className = 'secret-stone'
    stone.setAttribute('aria-hidden', 'true')

    const art = document.createElement('pre')
    art.className = 'secret-stone-art dungeon-ascii'
    art.textContent = CRACKED_STONE

    stone.appendChild(art)

    // Click: slide stone right, then navigate
    stone.addEventListener('click', () => {
        if (stone.classList.contains('stone-activated')) return
        stone.classList.add('stone-activated')

        setTimeout(() => {
            onActivate()
        }, 600) // wait for slide animation
    })

    wallEl.appendChild(stone)
}
