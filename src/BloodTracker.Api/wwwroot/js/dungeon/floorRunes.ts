/* =============================================================================
   FLOOR RUNES — 3 glowing runes on dungeon floor for quick actions
   Click opens corresponding modal (not room navigation)
   ============================================================================= */

interface FloorRune {
    symbol: string
    label: string
    action: string // onclick handler name on window
}

const RUNES: FloorRune[] = [
    { symbol: '⊕', label: 'АНАЛИЗ',      action: 'openAnalysisModal' },
    { symbol: '⊗', label: 'КУРС',        action: 'openLogModal' },
    { symbol: '⊘', label: 'ТРЕНИРОВКА',  action: 'openWorkoutProgramModal' },
]

/**
 * Creates 3 rune circles on the dungeon floor.
 * Each rune pulses with idle glow and opens a modal on click.
 */
export function createFloorRunes(hallEl: HTMLElement): void {
    const container = document.createElement('div')
    container.className = 'floor-runes'

    for (const rune of RUNES) {
        const el = document.createElement('div')
        el.className = 'floor-rune'
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', rune.label)
        el.tabIndex = 0

        // Rune circle with symbol
        const circle = document.createElement('div')
        circle.className = 'floor-rune-circle'

        const sym = document.createElement('span')
        sym.className = 'floor-rune-symbol'
        sym.textContent = rune.symbol

        circle.appendChild(sym)

        // Label (appears on hover)
        const label = document.createElement('div')
        label.className = 'floor-rune-label'
        label.textContent = rune.label

        el.appendChild(circle)
        el.appendChild(label)

        // Click handler — calls the modal function
        const handleClick = () => {
            const fn = (window as any)[rune.action]
            if (typeof fn === 'function') {
                fn()
            }
        }

        el.addEventListener('click', handleClick)
        el.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick()
            }
        })

        container.appendChild(el)
    }

    hallEl.appendChild(container)
}
