/* =============================================================================
   WALL RELIEF — ASCII skull carved as stone bas-relief on back wall
   ============================================================================= */

const SKULL_RELIEF = `\
        _______________
       /               \\
      /                 \\
     |   ___       ___   |
     |  / o \\     / o \\  |
     |  \\___/     \\___/  |
     |                   |
     |    ___     ___    |
     |   /   \\___/   \\   |
     |   \\           /   |
      \\   \\_________/   /
       \\               /
        \\_____________/
            |     |
            |     |
        ____| === |____
       /    |     |    \\
      /     |_____|     \\
     /___________________\\`

/**
 * Creates a carved stone bas-relief of a skull on the back wall.
 * Positioned at top center, styled as engraved stone.
 */
export function createRelief(wallBackEl: HTMLElement): void {
    const relief = document.createElement('div')
    relief.className = 'wall-relief'

    const pre = document.createElement('pre')
    pre.className = 'wall-relief-art dungeon-ascii'
    pre.textContent = SKULL_RELIEF

    const subtitle = document.createElement('div')
    subtitle.className = 'wall-relief-subtitle'
    subtitle.textContent = '☠ BLOOD TRACKER ☠'

    relief.appendChild(pre)
    relief.appendChild(subtitle)
    wallBackEl.appendChild(relief)
}
