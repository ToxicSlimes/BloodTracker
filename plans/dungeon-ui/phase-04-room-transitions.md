# Phase 4: Room Transitions & Camera

## Priority: HIGH
## Status: Pending
## Depends On: Phase 3

---

## Overview

Animate camera movement toward a door, door opening animation, content fade-in. Reverse animation for returning to hall. This is the core UX that makes the dungeon feel alive.

## Key Insights

- TZ section 4: 3-phase timeline — camera approach (0-300ms), door opens (300-600ms), content appears (600-900ms)
- TZ section 4.2: door swings open via `rotateY(-90deg)` with `transform-origin: left`
- TZ section 4.3: reverse on ESC/BACK button
- CSS transforms are GPU-compositor-thread, 60 FPS independent of DOM
- Key constraint: during transition, block all input (prevent double-click)

## Architecture

```
cameraController.ts
├── enterRoom(doorEl, roomId, callback)   — 3-phase enter animation
├── exitRoom(callback)                     — reverse animation
└── private animatePhase(el, keyframes, duration): Promise<void>

roomManager.ts
├── showRoom(roomId: string)    — find .page#id, wrap in .room-content, show
├── hideRoom()                  — hide .room-content, restore .page visibility
└── createBackButton(): HTMLElement
```

## Related Code Files

### Create
- `wwwroot/js/dungeon/cameraController.ts` — enter/exit animations
- `wwwroot/js/dungeon/roomManager.ts` — room content show/hide
- `wwwroot/css/dungeon/transitions.css` — keyframes for enter/exit, door swing

### Modify
- `wwwroot/js/dungeon/dungeonEngine.ts` — wire camera + room manager into navigateTo/returnToHall

## Implementation Steps

### Step 1: Transition keyframes CSS

**File: `wwwroot/css/dungeon/transitions.css`**

```css
/* Phase 1: Camera approaches door */
@keyframes camera-approach {
    0%   { transform: translateZ(0); filter: none; }
    40%  { transform: translateZ(-200px); filter: blur(1px); }
    70%  { transform: translateZ(-350px); filter: blur(2px); opacity: 0.5; }
    100% { transform: translateZ(-400px); filter: blur(3px); opacity: 0; }
}

/* Phase 2: Door swings open */
@keyframes door-swing-open {
    0%   { transform: rotateY(0deg); }
    100% { transform: rotateY(-90deg); }
}

@keyframes door-swing-close {
    0%   { transform: rotateY(-90deg); }
    100% { transform: rotateY(0deg); }
}

/* Phase 3: Room content fades in */
@keyframes room-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
}

@keyframes room-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
}

/* Camera retreat (exit room) */
@keyframes camera-retreat {
    0%   { transform: translateZ(-400px); filter: blur(3px); opacity: 0; }
    30%  { transform: translateZ(-350px); filter: blur(2px); opacity: 0.5; }
    60%  { transform: translateZ(-200px); filter: blur(1px); }
    100% { transform: translateZ(0); filter: none; opacity: 1; }
}

/* Utility: block interaction during transition */
.dungeon-transitioning {
    pointer-events: none !important;
}

/* Door swing styles */
.door-frame.swinging {
    transform-origin: left center;
    animation: door-swing-open var(--transition-door, 400ms) ease-in-out forwards;
}

.door-frame.closing {
    transform-origin: left center;
    animation: door-swing-close var(--transition-door, 400ms) ease-in-out forwards;
}

/* Room content animation */
.room-content.entering {
    animation: room-fade-in var(--transition-fade, 300ms) ease-out forwards;
}

.room-content.exiting {
    animation: room-fade-out var(--transition-fade, 300ms) ease-in forwards;
}

/* Back button style */
.room-back-btn {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    font-family: var(--ascii-font-family);
    font-size: 14px;
    color: var(--primary-color);
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid var(--primary-color);
    padding: 8px 24px;
    cursor: pointer;
    text-shadow: 0 0 5px var(--primary-color);
    transition: all 0.2s ease;
    opacity: 0;
    animation: room-fade-in 0.3s ease-out 0.6s forwards;
}

.room-back-btn:hover {
    background: rgba(var(--primary-rgb), 0.15);
    text-shadow: 0 0 10px var(--primary-color), 0 0 20px var(--primary-color);
}
```

### Step 2: Camera controller

```typescript
// cameraController.ts

export class CameraController {
    private hallEl: HTMLElement

    constructor(hallEl: HTMLElement) {
        this.hallEl = hallEl
    }

    async enterRoom(doorEl: HTMLElement): Promise<void> {
        // Phase 1: Camera approaches (300ms)
        this.hallEl.classList.add('dungeon-transitioning')
        this.hallEl.style.animation = 'camera-approach 300ms ease-in forwards'
        await this.waitForAnimation(this.hallEl)

        // Phase 2: Door swings open (400ms)
        const frame = doorEl.querySelector('.door-frame') as HTMLElement
        if (frame) {
            frame.classList.add('swinging')
            await this.waitForAnimation(frame)
        }
    }

    async exitRoom(): Promise<void> {
        // Reverse: camera retreats, door closes
        this.hallEl.style.animation = 'camera-retreat 300ms ease-out forwards'
        await this.waitForAnimation(this.hallEl)
        this.hallEl.classList.remove('dungeon-transitioning')
        this.hallEl.style.animation = ''

        // Close all doors
        this.hallEl.querySelectorAll('.door-frame.swinging').forEach(f => {
            f.classList.remove('swinging')
            f.classList.add('closing')
            f.addEventListener('animationend', () => f.classList.remove('closing'), { once: true })
        })
    }

    private waitForAnimation(el: HTMLElement): Promise<void> {
        return new Promise(resolve => {
            el.addEventListener('animationend', () => resolve(), { once: true })
        })
    }
}
```

### Step 3: Room manager

```typescript
// roomManager.ts

export class RoomManager {
    private currentRoomEl: HTMLElement | null = null
    private backBtn: HTMLElement | null = null
    private appEl: HTMLElement

    constructor(appEl: HTMLElement) {
        this.appEl = appEl
    }

    showRoom(roomId: string, onBack: () => void): void {
        // Find existing .page element
        const pageEl = document.getElementById(roomId)
        if (!pageEl) return

        // Show the page content
        pageEl.classList.add('active')
        this.currentRoomEl = pageEl

        // Wrap in room-content styling
        pageEl.classList.add('room-content', 'entering')
        pageEl.addEventListener('animationend', () => {
            pageEl.classList.remove('entering')
        }, { once: true })

        // Create back button
        this.backBtn = document.createElement('button')
        this.backBtn.className = 'room-back-btn'
        this.backBtn.textContent = '[ ← НАЗАД В ЗАЛ ]'
        this.backBtn.addEventListener('click', onBack)
        document.body.appendChild(this.backBtn)

        // Hide dungeon hall
        const hall = this.appEl.querySelector('.dungeon-hall') as HTMLElement
        if (hall) hall.style.display = 'none'
    }

    async hideRoom(): Promise<void> {
        if (!this.currentRoomEl) return

        // Fade out room content
        this.currentRoomEl.classList.add('exiting')
        await new Promise<void>(r => {
            this.currentRoomEl!.addEventListener('animationend', () => r(), { once: true })
        })

        this.currentRoomEl.classList.remove('active', 'room-content', 'exiting')
        this.currentRoomEl = null

        // Remove back button
        this.backBtn?.remove()
        this.backBtn = null

        // Show dungeon hall
        const hall = this.appEl.querySelector('.dungeon-hall') as HTMLElement
        if (hall) hall.style.display = ''
    }
}
```

### Step 4: Wire into DungeonEngine

```typescript
// In dungeonEngine.ts

async navigateTo(roomId: string): Promise<void> {
    if (this.state.currentView === 'transitioning') return
    this.state.currentView = 'transitioning'

    const doorEl = this.hall.querySelector(`[data-room="${roomId}"]`) as HTMLElement
    if (!doorEl) return

    // Camera approach + door swing
    await this.camera.enterRoom(doorEl)

    // Show room content
    this.roomManager.showRoom(roomId, () => this.returnToHall())

    this.state.currentRoom = roomId
    this.state.visitedRooms.add(roomId)
    this.saveVisitedRooms()
    this.state.currentView = 'room'
}

async returnToHall(): Promise<void> {
    if (this.state.currentView === 'transitioning') return
    this.state.currentView = 'transitioning'

    // Fade out room content
    await this.roomManager.hideRoom()

    // Camera retreat
    await this.camera.exitRoom()

    this.state.previousRoom = this.state.currentRoom
    this.state.currentRoom = null
    this.state.currentView = 'hall'
}
```

## Todo List

- [ ] Write `transitions.css` — all keyframes (approach, retreat, swing, fade)
- [ ] Write `cameraController.ts` — enterRoom, exitRoom with animation chaining
- [ ] Write `roomManager.ts` — showRoom, hideRoom, back button
- [ ] Wire camera + room manager into `DungeonEngine.navigateTo()` and `returnToHall()`
- [ ] Test full flow: click door → camera moves → door opens → content appears → back
- [ ] Test ESC key triggers returnToHall()
- [ ] Test double-click protection during transition
- [ ] Test mobile: simplified fade transition (no camera animation)
- [ ] Verify modals still work correctly when inside a room

## Success Criteria

- Click door → 3-phase animation plays sequentially (~900ms total)
- Room content visible and interactive after animation completes
- Back button appears with delayed fade-in
- ESC key returns to hall with reverse animation
- No double-click during transition (pointer-events blocked)
- All existing page functionality works inside rooms (forms, selects, charts)
- Modals open correctly over room content
- Mobile: simple fade in/out, no camera animation
