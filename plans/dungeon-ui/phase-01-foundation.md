# Phase 1: Foundation & Engine

## Priority: CRITICAL (all phases depend on this)
## Status: Pending

---

## Overview

Create the core `DungeonEngine` class that manages dungeon state, initializes the 3D viewport container, and replaces `initNavigation()`. Establish the CSS foundation for perspective rendering and ASCII character display.

## Key Insights

- Current navigation is trivial (59 lines, pure class toggle) — easy to replace
- No CSS 3D exists anywhere — clean slate, zero conflicts
- Existing `.page` divs stay as-is; we wrap them, not rewrite them
- Reactive state system is completely decoupled from navigation — zero impact

## Architecture

```
DungeonEngine (singleton)
├── state: DungeonState           — current view, room, transitioning flag
├── viewport: HTMLElement         — .dungeon-viewport container
├── hall: HTMLElement              — .dungeon-hall (3D scene)
├── init()                        — create DOM structure, bind events
├── navigateTo(roomId: string)    — trigger door→room transition
├── returnToHall()                — trigger room→hall transition
├── getCurrentRoom(): string|null — getter
└── destroy()                     — cleanup for HMR
```

```typescript
// DungeonState — stored in-memory, not in reactive state (navigation is UI-only)
interface DungeonState {
    currentView: 'hall' | 'room' | 'transitioning'
    currentRoom: string | null
    previousRoom: string | null
    visitedRooms: Set<string>       // for dungeon map fog-of-war
    doorStates: Map<string, 'open' | 'closed'>
}
```

## Related Code Files

### Create
- `wwwroot/js/dungeon/dungeonEngine.ts` — core engine class
- `wwwroot/css/dungeon/viewport.css` — perspective container, 3D base
- `wwwroot/css/dungeon/engine.css` — ASCII font config, dungeon base styles

### Modify (later in Phase 5, but design now)
- `wwwroot/js/main.ts` — will call `initDungeon()` instead of `initNavigation()`
- `wwwroot/index.html` — will get dungeon viewport container

## Implementation Steps

### Step 1: Create dungeon CSS foundation

**File: `wwwroot/css/dungeon/engine.css`**

```css
/* Base dungeon rendering — crisp ASCII, no gaps */
.dungeon-ascii {
    font-family: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace;
    font-size: 14px;
    line-height: 1;
    letter-spacing: 0;
    white-space: pre;
    -webkit-font-smoothing: none;
    -moz-osx-font-smoothing: unset;
    text-rendering: optimizeSpeed;
    font-variant-ligatures: none;
}

/* ANSI color palette classes (foreground) */
.f0  { color: #000000; }
.f1  { color: #aa0000; }
.f2  { color: #00aa00; }
.f3  { color: #aa5500; }
.f4  { color: #0000aa; }
.f5  { color: #aa00aa; }
.f6  { color: #00aaaa; }
.f7  { color: #aaaaaa; }
.f8  { color: #555555; }
.f9  { color: #ff5555; }
.f10 { color: #55ff55; }
.f11 { color: #ffff55; }
.f12 { color: #5555ff; }
.f13 { color: #ff55ff; }
.f14 { color: #55ffff; }
.f15 { color: #ffffff; }

/* Background palette */
.b0  { background-color: #000000; }
.b1  { background-color: #aa0000; }
.b2  { background-color: #00aa00; }
.b3  { background-color: #aa5500; }
/* ... through b15 */

/* Dynamic color via CSS custom props */
.fc { color: var(--fg); }
.bc { background-color: var(--bg); }

/* Dungeon-specific stone/brick palette */
:root {
    --stone-base: #2a2520;
    --stone-light: #3d3630;
    --stone-dark: #1a1510;
    --mortar: #1a1815;
    --brick-color: #3a2a20;
    --door-wood: #3d2b1a;
    --door-iron: #4a4a50;
    --sign-bg: #2a1f0f;
    --sign-border: #5a4a30;
}
```

### Step 2: Create viewport CSS

**File: `wwwroot/css/dungeon/viewport.css`**

```css
.dungeon-viewport {
    perspective: 800px;
    perspective-origin: 50% 50%;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    position: relative;
}

.dungeon-hall {
    transform-style: preserve-3d;
    width: 100%;
    height: 100%;
    position: relative;
    transition: transform var(--transition-enter, 800ms) ease-in-out;
}

/* Wall faces */
.wall-back {
    position: absolute;
    transform: translateZ(-400px);
    width: 100%;
    /* height set dynamically */
}

.wall-left {
    position: absolute;
    left: 0;
    transform-origin: left center;
    transform: rotateY(90deg);
}

.wall-right {
    position: absolute;
    right: 0;
    transform-origin: right center;
    transform: rotateY(-90deg);
}

.wall-floor {
    position: absolute;
    bottom: 0;
    width: 100%;
    transform-origin: bottom center;
    transform: rotateX(90deg);
}

.wall-ceiling {
    position: absolute;
    top: 0;
    width: 100%;
    transform-origin: top center;
    transform: rotateX(-90deg);
}

/* Room content container (replaces .page visibility) */
.room-content {
    display: none;
    position: absolute;
    inset: 0;
    z-index: 20;
    overflow-y: auto;
    padding: 20px;
}

.room-content.active {
    display: block;
}

/* Back button in rooms */
.room-back-btn {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    cursor: pointer;
    font-family: var(--ascii-font-family);
}

/* Mobile: no perspective, simple layout */
@media (max-width: 768px) {
    .dungeon-viewport {
        perspective: none;
        height: auto;
        overflow: visible;
    }
    .dungeon-hall {
        transform-style: flat;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
    }
}
```

### Step 3: Create DungeonEngine class

**File: `wwwroot/js/dungeon/dungeonEngine.ts`**

Key responsibilities:
1. Create viewport + hall DOM structure
2. Manage `DungeonState`
3. Expose `navigateTo(roomId)` and `returnToHall()`
4. Bind keyboard shortcut (ESC = return to hall, M = toggle map)
5. Track visited rooms in `Set<string>` for map fog-of-war
6. Persist visited rooms to `localStorage`

```typescript
// Pseudocode — actual implementation in coding phase

export interface DungeonState {
    currentView: 'hall' | 'room' | 'transitioning'
    currentRoom: string | null
    previousRoom: string | null
    visitedRooms: Set<string>
    doorStates: Map<string, 'open' | 'closed'>
}

// Room registry — maps room IDs to their config
interface RoomConfig {
    id: string              // matches existing .page id (e.g. 'dashboard')
    label: string           // door signpost text (e.g. 'ДАШБОРД')
    wall: 'back' | 'left' | 'right'  // which wall the door is on
    position: number        // door position on that wall (0-based index)
    theme: string           // room interior theme class
    icon?: string           // optional ASCII icon for door
}

const ROOMS: RoomConfig[] = [
    { id: 'dashboard',    label: 'ДАШБОРД',      wall: 'back',  position: 0, theme: 'throne' },
    { id: 'analyses',     label: 'АНАЛИЗЫ',       wall: 'back',  position: 1, theme: 'lab' },
    { id: 'course',       label: 'КУРС',          wall: 'back',  position: 2, theme: 'alchemy' },
    { id: 'compare',      label: 'СРАВНЕНИЕ',     wall: 'right', position: 0, theme: 'mirrors' },
    { id: 'workouts',     label: 'ТРЕНИРОВКИ',    wall: 'left',  position: 0, theme: 'arena' },
    { id: 'encyclopedia', label: 'ЭНЦИКЛОПЕДИЯ',  wall: 'left',  position: 1, theme: 'library' },
    { id: 'ascii-studio', label: 'ASCII СТУДИЯ',  wall: 'right', position: 1, theme: 'workshop' },
    // admin door handled separately via secretStone.ts
]

export class DungeonEngine {
    private state: DungeonState
    private viewport: HTMLElement
    private hall: HTMLElement
    private roomContainer: HTMLElement

    constructor(appContainer: HTMLElement) {
        this.state = {
            currentView: 'hall',
            currentRoom: null,
            previousRoom: null,
            visitedRooms: this.loadVisitedRooms(),
            doorStates: new Map()
        }
        // Build DOM, bind events
        this.viewport = this.createViewport(appContainer)
        this.hall = this.createHall()
        this.roomContainer = this.createRoomContainer()
        this.bindKeyboard()
    }

    navigateTo(roomId: string): void {
        if (this.state.currentView === 'transitioning') return
        this.state.currentView = 'transitioning'
        this.state.previousRoom = this.state.currentRoom
        this.state.currentRoom = roomId
        this.state.visitedRooms.add(roomId)
        this.saveVisitedRooms()
        // → Phase 4 handles actual animation
    }

    returnToHall(): void {
        if (this.state.currentView === 'transitioning') return
        this.state.currentView = 'transitioning'
        // → Phase 4 handles actual animation
    }

    private loadVisitedRooms(): Set<string> {
        try {
            const raw = localStorage.getItem('dungeon-visited')
            return raw ? new Set(JSON.parse(raw)) : new Set()
        } catch { return new Set() }
    }

    private saveVisitedRooms(): void {
        localStorage.setItem('dungeon-visited',
            JSON.stringify([...this.state.visitedRooms]))
    }
}

// Global singleton
let engine: DungeonEngine | null = null

export function initDungeon(appContainer: HTMLElement): DungeonEngine {
    engine = new DungeonEngine(appContainer)
    return engine
}

export function getDungeon(): DungeonEngine | null {
    return engine
}
```

### Step 4: Wire into Vite build

Add CSS imports to `main.ts` (prepared but commented out until Phase 5 integration):

```typescript
// import '../css/dungeon/engine.css'
// import '../css/dungeon/viewport.css'
```

## Todo List

- [ ] Create `wwwroot/css/dungeon/` directory
- [ ] Create `wwwroot/js/dungeon/` directory
- [ ] Write `engine.css` — ANSI palette, font config, stone colors
- [ ] Write `viewport.css` — perspective container, wall face transforms, mobile
- [ ] Write `dungeonEngine.ts` — DungeonEngine class, state, room registry, init/navigate/return
- [ ] Add type exports to `wwwroot/js/types/index.ts` if needed
- [ ] Verify `perspective: 800px` renders correctly in Chrome/Firefox/Safari

## Success Criteria

- `DungeonEngine` class instantiates without errors
- `.dungeon-viewport` creates correct perspective container
- `navigateTo('dashboard')` updates state correctly
- ESC key triggers `returnToHall()` when in a room
- Visited rooms persist across page reloads via localStorage
- Mobile: viewport renders flat (no perspective)
- No regressions in existing UI when CSS is imported

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CSS perspective breaks on Safari | Medium | High | Test early, add `-webkit-` prefixes |
| Z-index conflicts with overlays | Low | Medium | Dungeon z:10-30, overlays z:9997+ (huge gap) |
| DungeonEngine conflicts with navigation.ts | Low | Low | Replace in Phase 5, not before |
