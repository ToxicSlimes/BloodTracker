# Phase 7: Decorations & Interactions

## Priority: MEDIUM
## Status: Pending
## Depends On: Phase 5

---

## Overview

Add decorative and interactive elements to the dungeon hall: ASCII header as wall relief, torch-based color picker, glowing floor runes for quick actions, and hidden admin stone. These elements polish the hall and integrate existing UI features into the dungeon metaphor.

## Design Decisions Covered

- **Decision 1:** ASCII header + skeleton strip → wall relief/barrelievo on back wall
- **Decision 2:** Color picker → torch color theme switcher (5 fire themes)
- **Decision 4:** Quick actions → glowing floor runes with animated symbols
- **Decision 6:** Admin door → cracked secret stone in side wall

---

## Part A: Wall Relief (Design Decision 1)

### What

The existing ASCII skull header and skeleton strip get repositioned as a carved stone relief on the back wall — a barrelievo (raised sculpture) above the doors. In hall view it's purely decorative. The `scaleAsciiSkull()` function continues working — it just renders into the wall face instead of the `<header>`.

### Architecture

```
wallRelief.ts
├── createRelief(wallEl: HTMLElement): HTMLElement
├── injectSkullArt(reliefEl: HTMLElement): void
└── animateReveal(): void   — subtle fade-in when hall loads
```

### Implementation

```typescript
// wallRelief.ts
export function createRelief(wallBackEl: HTMLElement): HTMLElement {
    const relief = document.createElement('div')
    relief.className = 'wall-relief'

    // Reuse existing skull ASCII art from header
    const skull = document.createElement('pre')
    skull.className = 'wall-relief-art dungeon-ascii'
    skull.id = 'wall-skull'

    // The scaleAsciiSkull() function targets this by ID
    // It will render the skull here instead of the header
    relief.appendChild(skull)

    // Subtitle carved into stone
    const subtitle = document.createElement('pre')
    subtitle.className = 'wall-relief-subtitle dungeon-ascii'
    subtitle.textContent = '╌╌╌ B L O O D T R A C K E R ╌╌╌'
    relief.appendChild(subtitle)

    wallBackEl.appendChild(relief)
    return relief
}
```

### CSS

```css
/* In runes.css or a dedicated relief section */
.wall-relief {
    position: absolute;
    top: 5%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 12;
    text-align: center;
    pointer-events: none;
}

.wall-relief-art {
    color: var(--stone-relief, #3a3530);
    text-shadow:
        1px 1px 0 rgba(0,0,0,0.8),
        -1px -1px 0 rgba(80,70,60,0.3);
    opacity: 0.7;
    font-size: 10px;
}

.wall-relief-subtitle {
    color: var(--primary-color);
    text-shadow: 0 0 8px var(--primary-color);
    opacity: 0.5;
    font-size: 12px;
    margin-top: 4px;
    letter-spacing: 2px;
}
```

---

## Part B: Torch Color Picker (Design Decision 2)

### What

Replace the floating color picker with interactive torches on dungeon walls. Each torch represents a color theme. Clicking a torch changes `--primary-color` and applies a fire palette. 5 themes: green (phosphor), amber (classic fire), blue (ice), red (blood), purple (arcane).

### Architecture

```
torchPicker.ts
├── createTorchPicker(wallEl: HTMLElement): HTMLElement[]
├── applyTheme(themeId: string): void
├── getThemes(): TorchTheme[]
└── persistTheme(themeId: string): void
```

### Theme Definitions

```typescript
interface TorchTheme {
    id: string
    label: string
    primary: string       // --primary-color
    primaryRgb: string    // --primary-rgb
    flame: string[]       // 3-4 flame gradient colors
    glow: string          // torch glow color
}

const THEMES: TorchTheme[] = [
    {
        id: 'green',
        label: 'ФОСФОР',
        primary: '#4AF626',
        primaryRgb: '74, 246, 38',
        flame: ['#4AF626', '#2ECC40', '#1A9928'],
        glow: 'rgba(74, 246, 38, 0.3)'
    },
    {
        id: 'amber',
        label: 'ОГОНЬ',
        primary: '#FF8C00',
        primaryRgb: '255, 140, 0',
        flame: ['#FFD700', '#FF8C00', '#FF4500'],
        glow: 'rgba(255, 140, 0, 0.3)'
    },
    {
        id: 'blue',
        label: 'ЛЁД',
        primary: '#00BFFF',
        primaryRgb: '0, 191, 255',
        flame: ['#E0FFFF', '#00BFFF', '#0077BE'],
        glow: 'rgba(0, 191, 255, 0.3)'
    },
    {
        id: 'red',
        label: 'КРОВЬ',
        primary: '#DC143C',
        primaryRgb: '220, 20, 60',
        flame: ['#FF6B6B', '#DC143C', '#8B0000'],
        glow: 'rgba(220, 20, 60, 0.3)'
    },
    {
        id: 'purple',
        label: 'АРКАН',
        primary: '#9B59B6',
        primaryRgb: '155, 89, 182',
        flame: ['#D8BFD8', '#9B59B6', '#6C3483'],
        glow: 'rgba(155, 89, 182, 0.3)'
    }
]
```

### Torch Placement

```typescript
export function createTorchPicker(hallEl: HTMLElement): HTMLElement[] {
    const torchRow = document.createElement('div')
    torchRow.className = 'torch-picker-row'

    return THEMES.map((theme, i) => {
        const torch = document.createElement('div')
        torch.className = 'torch-picker-item'
        torch.dataset.theme = theme.id
        torch.setAttribute('role', 'radio')
        torch.setAttribute('aria-label', theme.label)
        torch.tabIndex = 0

        torch.innerHTML = `
            <pre class="torch-flame dungeon-ascii" style="color:${theme.flame[1]};text-shadow:0 0 8px ${theme.glow}">
  ╱╲
 ╱  ╲
 ╲▓▓╱
  ││</pre>
            <span class="torch-label">${theme.label}</span>
        `

        torch.addEventListener('click', () => applyTheme(theme))
        torch.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                applyTheme(theme)
            }
        })

        torchRow.appendChild(torch)
        return torch
    })
}

function applyTheme(theme: TorchTheme): void {
    const root = document.documentElement
    root.style.setProperty('--primary-color', theme.primary)
    root.style.setProperty('--primary-rgb', theme.primaryRgb)

    // Update active state
    document.querySelectorAll('.torch-picker-item').forEach(t => {
        t.classList.toggle('torch-active', t.dataset.theme === theme.id)
        t.setAttribute('aria-checked', String(t.dataset.theme === theme.id))
    })

    // Persist
    localStorage.setItem('bloodtracker-color-theme', theme.id)
}
```

### CSS

```css
.torch-picker-row {
    position: absolute;
    bottom: 8%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 24px;
    z-index: 16;
}

.torch-picker-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.3s ease, transform 0.2s ease;
}

.torch-picker-item:hover,
.torch-picker-item.torch-active {
    opacity: 1;
    transform: scale(1.1);
}

.torch-picker-item.torch-active .torch-flame {
    animation: flameSway 1.5s ease-in-out infinite alternate;
}

.torch-label {
    font-family: var(--ascii-font-family);
    font-size: 9px;
    color: var(--text-secondary);
    margin-top: 4px;
    letter-spacing: 1px;
}
```

### Integration with Existing Color Picker

The existing color picker (`js/components/color-picker.js`) uses a different approach — it stores raw hex in localStorage. The torch picker replaces it when dungeon mode is on. In `main.ts`:

```typescript
if (useDungeon) {
    // Use torch-based theme picker
    createTorchPicker(hallEl)
    const savedTheme = localStorage.getItem('bloodtracker-color-theme') || 'green'
    const theme = THEMES.find(t => t.id === savedTheme)
    if (theme) applyTheme(theme)
} else {
    // Original color picker
    loadSavedColor()
}
```

---

## Part C: Floor Runes (Design Decision 4)

### What

Replace the quick actions bar with glowing floor runes — circular symbols on the dungeon floor that trigger common actions. Each rune is an ASCII circle with a symbol inside, positioned on the stone floor between doors. Hovering highlights the rune and shows a tooltip.

### Quick Actions → Runes Mapping

| Current Quick Action | Rune Symbol | Action |
|---------------------|-------------|--------|
| + Анализ | ⊕ | Open add-analysis modal |
| + Курс | ⊗ | Open add-course modal |
| + Тренировка | ⊘ | Open add-workout modal |

### Architecture

```
floorRunes.ts
├── createFloorRunes(floorEl: HTMLElement): HTMLElement[]
├── createRune(config: RuneConfig): HTMLElement
├── attachRuneEffects(runeEl: HTMLElement): void
└── pulseRune(runeEl: HTMLElement): void  — draw-attention pulse
```

### Implementation

```typescript
interface RuneConfig {
    id: string
    symbol: string       // ASCII rune art
    label: string
    action: () => void
}

const RUNE_ART = {
    analysis: `
 ╭───╮
│ ⊕ │
 ╰───╯`.trim(),
    course: `
 ╭───╮
│ ⊗ │
 ╰───╯`.trim(),
    workout: `
 ╭───╮
│ ⊘ │
 ╰───╯`.trim()
}

export function createFloorRunes(floorEl: HTMLElement, actions: RuneConfig[]): HTMLElement[] {
    const runeRow = document.createElement('div')
    runeRow.className = 'floor-runes'

    return actions.map(config => {
        const rune = document.createElement('div')
        rune.className = 'floor-rune'
        rune.dataset.rune = config.id
        rune.setAttribute('role', 'button')
        rune.setAttribute('aria-label', config.label)
        rune.tabIndex = 0

        const art = document.createElement('pre')
        art.className = 'rune-art dungeon-ascii'
        art.textContent = config.symbol

        const label = document.createElement('span')
        label.className = 'rune-label'
        label.textContent = config.label

        rune.appendChild(art)
        rune.appendChild(label)

        rune.addEventListener('click', config.action)
        rune.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                config.action()
            }
        })

        runeRow.appendChild(rune)
        return rune
    })
}
```

### CSS

```css
.floor-runes {
    position: absolute;
    bottom: 20%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 40px;
    z-index: 14;
}

.floor-rune {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.rune-art {
    color: var(--primary-color);
    opacity: 0.3;
    text-shadow: 0 0 5px var(--primary-color);
    transition: opacity 0.3s ease, text-shadow 0.3s ease;
    font-size: 14px;
}

.floor-rune:hover .rune-art,
.floor-rune:focus .rune-art {
    opacity: 1;
    text-shadow:
        0 0 10px var(--primary-color),
        0 0 20px var(--primary-color),
        0 0 30px var(--primary-color);
}

/* Subtle idle pulse animation */
@keyframes rune-pulse {
    0%, 100% { opacity: 0.3; }
    50%      { opacity: 0.5; }
}

.floor-rune .rune-art {
    animation: rune-pulse 4s ease-in-out infinite;
}

.floor-rune:hover .rune-art {
    animation: none;
}

.rune-label {
    font-family: var(--ascii-font-family);
    font-size: 9px;
    color: var(--text-secondary);
    opacity: 0;
    transition: opacity 0.3s ease;
    margin-top: 4px;
}

.floor-rune:hover .rune-label {
    opacity: 1;
}
```

---

## Part D: Admin Secret Stone (Design Decision 6)

### What

Admin panel access hidden as a cracked stone in the side wall. Only visible to admin users. On hover, cracks glow. On click, stone slides away revealing the admin room. Uses `auth.isAdmin()` to gate visibility.

### Architecture

```
secretStone.ts
├── createSecretStone(wallEl: HTMLElement): HTMLElement | null
├── revealStone(): void          — crack glow animation
├── openSecretPassage(): void    — stone slides, navigate to admin
└── isAdminUser(): boolean       — check auth.isAdmin()
```

### Implementation

```typescript
const SECRET_STONE_ART = `
▓▓▓▓▓▓▓▓▓▓▓
▓▓▒░▓▓▓░▒▓▓
▓▓▓╱──╲▓▓▓▓
▓▓╱    ╲▓▓▓
▓▓╲    ╱▓▓▓
▓▓▓╲──╱▓▓▓▓
▓▓▒░▓▓▓░▒▓▓
▓▓▓▓▓▓▓▓▓▓▓`.trim()

export function createSecretStone(wallEl: HTMLElement): HTMLElement | null {
    // Only create for admin users
    if (!window.auth?.isAdmin()) return null

    const stone = document.createElement('div')
    stone.className = 'secret-stone'
    stone.dataset.room = 'admin'
    stone.setAttribute('role', 'button')
    stone.setAttribute('aria-label', 'Потайной проход')
    stone.tabIndex = 0

    const art = document.createElement('pre')
    art.className = 'secret-stone-art dungeon-ascii'
    art.textContent = SECRET_STONE_ART

    stone.appendChild(art)
    wallEl.appendChild(stone)

    // Interactions
    stone.addEventListener('mouseenter', () => stone.classList.add('stone-hover'))
    stone.addEventListener('mouseleave', () => stone.classList.remove('stone-hover'))
    stone.addEventListener('click', () => {
        stone.classList.add('stone-opening')
        // Navigate to admin room after animation
        setTimeout(() => {
            const engine = window.dungeonEngine
            engine?.navigateTo('admin')
        }, 600)
    })

    return stone
}
```

### CSS

```css
.secret-stone {
    position: absolute;
    right: 5%;
    bottom: 30%;
    z-index: 15;
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.5s ease;
}

.secret-stone-art {
    color: #2a2520;
    text-shadow: 1px 1px 0 rgba(0,0,0,0.8);
    font-size: 10px;
    transition: color 0.3s ease, text-shadow 0.3s ease;
}

/* Hover: cracks glow faintly */
.secret-stone.stone-hover {
    opacity: 0.8;
}

.secret-stone.stone-hover .secret-stone-art {
    color: #3a3530;
    text-shadow:
        0 0 3px rgba(255, 100, 0, 0.2),
        1px 1px 0 rgba(0,0,0,0.8);
}

/* Opening: stone slides right and fades */
@keyframes stone-slide {
    0%   { transform: translateX(0); opacity: 0.8; }
    100% { transform: translateX(50px); opacity: 0; }
}

.secret-stone.stone-opening {
    animation: stone-slide 0.6s ease-in forwards;
    pointer-events: none;
}

/* Mobile: simple text link, no ASCII art */
@media (max-width: 768px) {
    .secret-stone-art { display: none; }
    .secret-stone::after {
        content: '[ АДМИН ]';
        font-family: var(--ascii-font-family);
        color: var(--primary-color);
        font-size: 12px;
    }
}
```

---

## Todo List

- [ ] Write `wallRelief.ts` — skull art in back wall, subtitle
- [ ] Write `torchPicker.ts` — 5 fire themes, click to apply, persist
- [ ] Write `floorRunes.ts` — 3 quick-action runes, hover glow, click handler
- [ ] Write `secretStone.ts` — admin-only cracked stone, hover reveal, slide open
- [ ] Write `runes.css` — relief, torch picker, floor runes styles
- [ ] Write `secrets.css` — secret stone, crack glow, slide animation
- [ ] Integrate all decorations into `DungeonEngine.init()` (after Phase 5 content adaptation)
- [ ] Bridge torch picker with existing color system (replace color-picker when dungeon=on)
- [ ] Test torch theme persistence (localStorage)
- [ ] Test floor rune actions open correct modals
- [ ] Test admin stone visibility (admin=yes → visible, admin=no → absent)
- [ ] Test mobile: runes as text links, stone as text link, no torch ASCII

## Success Criteria

- ASCII skull visible as carved relief on back wall (decorative only)
- 5 torches in hall — clicking changes entire app color theme
- 3 floor runes glow on hover — clicking opens corresponding modal
- Admin stone only appears for admin users
- Admin stone cracks glow on hover, slides away on click → admin room
- All interactions keyboard-accessible (Tab, Enter)
- Mobile: simplified text-based alternatives for all elements
- Existing color-picker disabled when dungeon mode is on (no conflict)
