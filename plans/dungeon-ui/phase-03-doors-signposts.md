# Phase 3: Doors & Signposts

## Priority: HIGH
## Status: Pending
## Depends On: Phase 2

---

## Overview

Place interactive door elements on dungeon walls. Each door has a wooden frame (ASCII art), a signpost label above it, and hover/click states. Doors are positioned on the back and side walls based on room config from Phase 1.

## Key Insights

- TZ section 3.3: 3 doors on back wall, 1-2 per side wall
- TZ section 8.1: door states — default (dim), hover (glow + torch flare), active (press), disabled
- Design Decision 6: admin door = hidden stone, not a visible door
- Doors are DOM elements positioned over the wall `<pre>` using `position: absolute`

## Architecture

```
doorInteraction.ts
├── createDoor(config: RoomConfig, wallEl: HTMLElement): HTMLElement
├── createSignpost(label: string): HTMLElement
├── attachHoverEffects(doorEl: HTMLElement): void
├── attachClickHandler(doorEl: HTMLElement, roomId: string): void
└── updateDoorState(doorEl: HTMLElement, state: 'closed' | 'opening' | 'open'): void
```

## Related Code Files

### Create
- `wwwroot/js/dungeon/doorInteraction.ts` — door creation, hover/click, signposts
- `wwwroot/css/dungeon/doors.css` — door frame, signpost, hover glow, animations

### Modify
- `wwwroot/js/dungeon/dungeonEngine.ts` — create doors in init()

## Implementation Steps

### Step 1: Door ASCII art template

```typescript
const DOOR_FRAME = `
┏━━━━━━━━━┓
┃╔═══════╗┃
┃║       ║┃
┃║       ║┃
┃║       ║┃
┃║  ┌─┐  ║┃
┃║  │○│  ║┃
┃║  └─┘  ║┃
┃║       ║┃
┃╚═══════╝┃
┗━━━━━━━━━┛`.trim()

const SIGNPOST = (label: string) => `
╔${'═'.repeat(label.length + 2)}╗
║ ${label} ║
╚${'═'.repeat(label.length + 2)}╝`.trim()
```

### Step 2: Door element creation

```typescript
export function createDoor(config: RoomConfig, wallEl: HTMLElement): HTMLElement {
    const door = document.createElement('div')
    door.className = 'dungeon-door'
    door.dataset.room = config.id
    door.setAttribute('role', 'button')
    door.setAttribute('aria-label', `Дверь: ${config.label}`)
    door.tabIndex = 0

    // Signpost above door
    const sign = document.createElement('pre')
    sign.className = 'door-signpost dungeon-ascii'
    sign.textContent = SIGNPOST(config.label)

    // Door frame
    const frame = document.createElement('pre')
    frame.className = 'door-frame dungeon-ascii'
    frame.textContent = DOOR_FRAME

    door.appendChild(sign)
    door.appendChild(frame)

    // Position on wall
    positionDoorOnWall(door, config, wallEl)

    wallEl.appendChild(door)
    return door
}

function positionDoorOnWall(
    door: HTMLElement,
    config: RoomConfig,
    wallEl: HTMLElement
): void {
    const wallWidth = wallEl.offsetWidth
    const doorCount = /* count doors on this wall */ 3
    const spacing = wallWidth / (doorCount + 1)
    const left = spacing * (config.position + 1) - door.offsetWidth / 2

    door.style.position = 'absolute'
    door.style.bottom = '10%'
    door.style.left = `${left}px`
}
```

### Step 3: Hover effects

```typescript
export function attachHoverEffects(doorEl: HTMLElement): void {
    doorEl.addEventListener('mouseenter', () => {
        doorEl.classList.add('door-hover')
        // Brighten nearby torches
        const torches = doorEl.closest('.dungeon-wall')
            ?.querySelectorAll('.wall-torch-near')
        torches?.forEach(t => t.classList.add('torch-flare'))
    })

    doorEl.addEventListener('mouseleave', () => {
        doorEl.classList.remove('door-hover')
        const torches = doorEl.closest('.dungeon-wall')
            ?.querySelectorAll('.wall-torch-near')
        torches?.forEach(t => t.classList.remove('torch-flare'))
    })
}
```

### Step 4: Click handler

```typescript
export function attachClickHandler(doorEl: HTMLElement, engine: DungeonEngine): void {
    const handler = () => {
        const roomId = doorEl.dataset.room
        if (!roomId) return
        doorEl.classList.add('door-active')
        setTimeout(() => doorEl.classList.remove('door-active'), 200)
        engine.navigateTo(roomId)
    }
    doorEl.addEventListener('click', handler)
    doorEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handler()
        }
    })
}
```

### Step 5: Door CSS

**File: `wwwroot/css/dungeon/doors.css`**

```css
.dungeon-door {
    position: absolute;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.2s ease;
    z-index: 15;
}

.door-frame {
    color: var(--door-wood);
    text-shadow: 0 0 3px rgba(61, 43, 26, 0.5);
}

.door-signpost {
    color: var(--sign-border);
    text-shadow: 0 0 3px var(--primary-color);
    margin-bottom: 4px;
    transition: text-shadow 0.3s ease, color 0.3s ease;
}

/* Hover: signpost glows, door brightens */
.dungeon-door.door-hover .door-signpost {
    color: var(--primary-color);
    text-shadow:
        0 0 8px var(--primary-color),
        0 0 16px var(--primary-color),
        0 0 24px var(--primary-color);
}

.dungeon-door.door-hover .door-frame {
    color: #5a3f28;
    text-shadow: 0 0 6px rgba(255, 165, 0, 0.3);
}

/* Active (click): press effect */
.dungeon-door.door-active {
    transform: scale(0.97);
}

/* Torch flare when hovering nearby door */
.torch-flare .torch-flame-ascii {
    text-shadow:
        0 0 15px #ff6600,
        0 0 30px #ff3300,
        0 0 45px #ff0000,
        0 0 60px #ffff00 !important;
    animation-duration: 0.4s !important;
}

/* Mobile: doors as vertical list */
@media (max-width: 768px) {
    .dungeon-door {
        position: static;
        width: 100%;
        border: 1px solid var(--border);
        padding: 12px;
        margin-bottom: 8px;
    }
    .door-frame { display: none; }
    .door-signpost { font-size: 14px; }
}
```

## Todo List

- [ ] Write `doorInteraction.ts` — door/signpost creation, positioning, hover, click
- [ ] Write `doors.css` — door frame, signpost, hover glow, active press, mobile
- [ ] Integrate door creation into `DungeonEngine.init()`
- [ ] Test door positioning on back wall (3 doors evenly spaced)
- [ ] Test door positioning on side walls (1-2 doors, perspective-adjusted)
- [ ] Verify hover: signpost glows, nearby torches flare
- [ ] Verify click: press animation, navigateTo() called
- [ ] Test keyboard navigation (Tab to focus, Enter/Space to activate)
- [ ] Test mobile: doors render as vertical list without ASCII frames

## Success Criteria

- 7 doors visible (3 back, 2 left, 2 right)
- Signposts show room names in box-drawing frames
- Hover: signpost glows with theme color, nearby torches brighten
- Click: scale-down press effect, then transition starts
- Keyboard accessible (tab-focusable, Enter activates)
- Admin door NOT shown (handled separately in Phase 7)
- Mobile: simplified vertical door list, no ASCII frames
