/* =============================================================================
   TORCH PICKER — 5 themed torches on back wall for color selection
   Replaces the standard color-picker when dungeon mode is active
   ============================================================================= */

interface TorchTheme {
    id: string
    label: string
    color: string
    flameChars: string
}

const TORCH_THEMES: TorchTheme[] = [
    { id: 'phosphor', label: 'ФОСФОР', color: '#4AF626', flameChars: '░▒▓█' },
    { id: 'fire',     label: 'ОГОНЬ',  color: '#FF6600', flameChars: '░▒▓█' },
    { id: 'ice',      label: 'ЛЁД',    color: '#00DDFF', flameChars: '░▒▓█' },
    { id: 'blood',    label: 'КРОВЬ',  color: '#FF2244', flameChars: '░▒▓█' },
    { id: 'arcane',   label: 'АРКАН',  color: '#AA44FF', flameChars: '░▒▓█' },
]

const TORCH_FLAME_ART = `\
  (
 (()
((())
 (()
  (`

const TORCH_BASE = `\
 ╔═╗
 ║▓║
═╩═╩═`

/**
 * Creates 5 color-theme torches on the back wall.
 * Each torch has a flame with the theme's color, a label, and click handler.
 */
export function createTorchPicker(wallBackEl: HTMLElement): void {
    const container = document.createElement('div')
    container.className = 'torch-picker'

    // Determine currently active theme
    const savedColor = localStorage.getItem('bloodtracker-color') || '#4AF626'

    for (const theme of TORCH_THEMES) {
        const torch = document.createElement('div')
        torch.className = 'torch-pick'
        torch.dataset.theme = theme.id

        if (theme.color.toLowerCase() === savedColor.toLowerCase()) {
            torch.classList.add('torch-active')
        }

        // Flame
        const flame = document.createElement('pre')
        flame.className = 'torch-pick-flame dungeon-ascii'
        flame.textContent = TORCH_FLAME_ART
        flame.style.color = theme.color
        flame.style.textShadow = `0 0 8px ${theme.color}, 0 0 16px ${theme.color}, 0 -4px 12px ${theme.color}`

        // Base
        const base = document.createElement('pre')
        base.className = 'torch-pick-base dungeon-ascii'
        base.textContent = TORCH_BASE

        // Label
        const label = document.createElement('div')
        label.className = 'torch-pick-label'
        label.textContent = theme.label
        label.style.color = theme.color
        label.style.textShadow = `0 0 6px ${theme.color}`

        torch.appendChild(flame)
        torch.appendChild(base)
        torch.appendChild(label)

        // Click handler
        torch.addEventListener('click', () => {
            applyTheme(theme, container)
        })

        container.appendChild(torch)
    }

    wallBackEl.appendChild(container)
}

function applyTheme(theme: TorchTheme, container: HTMLElement): void {
    // Use existing setColor from color-picker
    const setColor = (window as any).setColor
    if (setColor) {
        setColor(theme.color)
    }

    // Update active torch
    container.querySelectorAll('.torch-pick').forEach(t => t.classList.remove('torch-active'))
    const active = container.querySelector(`[data-theme="${theme.id}"]`)
    if (active) active.classList.add('torch-active')
}
