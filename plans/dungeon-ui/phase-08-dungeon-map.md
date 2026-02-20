# Phase 8: Dungeon Map

## Priority: LOW
## Status: Pending
## Depends On: Phase 5

---

## Overview

A navigation aid showing the dungeon layout as a top-down ASCII map. Two views: a compact minimap always visible in the corner, and a fullscreen overlay map toggled by pressing **M**. Fog of war: rooms appear dim until first visited, then stay revealed.

## Design Decision 7 Covered

- Minimap: 8×6 char grid in bottom-right corner, current room highlighted
- Fullmap: centered overlay with room labels, connections, fog of war
- Fog: `visitedRooms` Set in DungeonState tracks discovered rooms
- Keyboard: **M** toggles fullmap, **ESC** closes it
- Click room on fullmap → navigate there directly

---

## Architecture

```
dungeonMap.ts
├── DungeonMap class
│   ├── constructor(state: DungeonState)
│   ├── createMinimap(): HTMLElement
│   ├── createFullmap(): HTMLElement
│   ├── updateMinimap(): void
│   ├── updateFullmap(): void
│   ├── toggleFullmap(): void
│   ├── revealRoom(roomId: string): void
│   └── handleKeyboard(e: KeyboardEvent): void
│
├── MAP_LAYOUT constant — room positions on grid
└── renderMapCell(roomId, visited, current): string
```

## Map Layout

The dungeon is conceptually a cross/corridor shape:

```
         ┌─────────┐
         │ЭНЦИКЛОП.│
    ┌────┼─────────┼────┐
    │КУРС│  ЗАЛ    │АНАЛ│
    ├────┼─────────┼────┤
    │ТРЕН│         │СРАВН│
    └────┼─────────┼────┘
         │ДАШБОРД  │
         ├─────────┤
         │ASCII ART│
         └─────────┘
```

### Grid Coordinate System

```typescript
interface MapRoom {
    id: string
    label: string
    x: number      // grid column (0-2)
    y: number      // grid row (0-4)
    icon: string   // single char icon
}

const MAP_ROOMS: MapRoom[] = [
    { id: 'encyclopedia', label: 'БИБЛ',  x: 1, y: 0, icon: '📚' },
    { id: 'course',       label: 'КУРС',  x: 0, y: 1, icon: '⚗' },
    { id: 'dashboard',    label: 'ЗАЛ',   x: 1, y: 1, icon: '♛' },  // hall = center
    { id: 'analyses',     label: 'АНАЛ',   x: 2, y: 1, icon: '🔬' },
    { id: 'workouts',     label: 'ТРЕН',   x: 0, y: 2, icon: '⚔' },
    { id: 'compare',      label: 'СРАВН',  x: 2, y: 2, icon: '⚖' },
    { id: 'ascii-studio', label: 'ASCII',  x: 1, y: 3, icon: '✎' },
]
```

---

## Minimap Implementation

### What

A tiny 3×4 grid of room indicators in the bottom-right corner of the hall. Each room is a colored block character. Current room blinks. Unvisited rooms are dark/invisible.

```typescript
export function createMinimap(state: DungeonState): HTMLElement {
    const mini = document.createElement('div')
    mini.id = 'dungeon-minimap'
    mini.className = 'dungeon-minimap'

    const pre = document.createElement('pre')
    pre.className = 'minimap-grid dungeon-ascii'
    mini.appendChild(pre)

    updateMinimap(pre, state)
    return mini
}

function updateMinimap(pre: HTMLElement, state: DungeonState): void {
    // 3 cols × 4 rows grid
    const grid: string[][] = Array.from({ length: 4 }, () => Array(3).fill(' '))

    for (const room of MAP_ROOMS) {
        const visited = state.visitedRooms.has(room.id)
        const current = state.currentRoom === room.id
        const inHall = state.currentView === 'hall' && room.id === 'dashboard'

        if (!visited && !current && !inHall) {
            grid[room.y][room.x] = '░'  // fog
        } else if (current || inHall) {
            grid[room.y][room.x] = '█'  // current (will get glow class)
        } else {
            grid[room.y][room.x] = '▓'  // visited
        }
    }

    // Render with connections
    const lines = grid.map(row => row.join(' '))
    pre.textContent = lines.join('\n')
}
```

### Minimap CSS

```css
.dungeon-minimap {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 25;
    pointer-events: none;
    opacity: 0.6;
    transition: opacity 0.3s ease;
}

.dungeon-minimap:hover {
    opacity: 1;
    pointer-events: auto;
}

.minimap-grid {
    font-size: 10px;
    line-height: 1.2;
    color: var(--primary-color);
    text-shadow: 0 0 3px var(--primary-color);
    background: rgba(0, 0, 0, 0.5);
    padding: 6px 8px;
    border: 1px solid rgba(var(--primary-rgb), 0.2);
}
```

---

## Fullmap Implementation

### What

Pressing **M** shows a large overlay map centered on screen. Each room is drawn as a labeled ASCII box. Connections shown with line-drawing characters. Fog of war dims unvisited rooms. Clicking a room navigates there.

### Fullmap ASCII Art

```typescript
function renderFullmap(state: DungeonState): string {
    // Build the map as a string grid
    const visited = state.visitedRooms
    const current = state.currentRoom

    // Each room: 11 chars wide × 3 lines tall
    const roomBox = (room: MapRoom): string[] => {
        const isVisited = visited.has(room.id)
        const isCurrent = current === room.id
        const isHall = state.currentView === 'hall' && room.id === 'dashboard'

        if (!isVisited && !isCurrent && !isHall) {
            // Fog of war — show dim outline only
            return [
                '┌─────────┐',
                '│ ░░░░░░░ │',
                '└─────────┘'
            ]
        }

        const label = room.label.padStart(4).padEnd(9)
        const marker = isCurrent || isHall ? '►' : ' '
        return [
            '┌─────────┐',
            `│${marker}${label}│`,
            '└─────────┘'
        ]
    }

    // Compose grid rows with connections
    // Row 0: encyclopedia (center)
    // Row 1: course (left) — hall (center) — analyses (right)
    // Row 2: workouts (left) — (empty) — compare (right)
    // Row 3: ascii-studio (center)

    const rows: string[] = []

    // Each row assembled by joining room boxes horizontally
    // Vertical connectors between rows
    const enc = roomBox(MAP_ROOMS[0])
    const crs = roomBox(MAP_ROOMS[1])
    const hal = roomBox(MAP_ROOMS[2])
    const anl = roomBox(MAP_ROOMS[3])
    const wrk = roomBox(MAP_ROOMS[4])
    const cmp = roomBox(MAP_ROOMS[5])
    const asc = roomBox(MAP_ROOMS[6])

    const blank = ['           ', '           ', '           ']

    // Row 0
    for (let i = 0; i < 3; i++) rows.push(blank[i] + enc[i] + blank[i])
    rows.push('           ' + '     │     ' + '           ')

    // Row 1
    for (let i = 0; i < 3; i++) rows.push(crs[i] + '─' + hal[i] + '─' + anl[i])
    rows.push('     │     ' + '           ' + '     │     ')

    // Row 2
    for (let i = 0; i < 3; i++) rows.push(wrk[i] + ' ' + blank[i] + ' ' + cmp[i])
    rows.push('           ' + '     │     ' + '           ')

    // Row 3
    for (let i = 0; i < 3; i++) rows.push(blank[i] + asc[i] + blank[i])

    return rows.join('\n')
}
```

### Fullmap Overlay

```typescript
export function createFullmap(state: DungeonState, onNavigate: (roomId: string) => void): HTMLElement {
    const overlay = document.createElement('div')
    overlay.id = 'dungeon-fullmap'
    overlay.className = 'dungeon-fullmap'

    const title = document.createElement('pre')
    title.className = 'fullmap-title dungeon-ascii'
    title.textContent = '╔══════════════════════╗\n║    КАРТА ПОДЗЕМЕЛЬЯ   ║\n╚══════════════════════╝'

    const mapPre = document.createElement('pre')
    mapPre.className = 'fullmap-grid dungeon-ascii'
    mapPre.innerHTML = renderFullmap(state)

    const hint = document.createElement('div')
    hint.className = 'fullmap-hint'
    hint.textContent = '[ M — закрыть ] [ клик — перейти ]'

    // Click handling — detect which room was clicked
    mapPre.addEventListener('click', (e: MouseEvent) => {
        const rect = mapPre.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        // Calculate grid position from click coordinates
        const charW = rect.width / 35   // approximate chars per line
        const charH = rect.height / 16  // approximate lines
        const col = Math.floor(x / charW / 12)  // 12 chars per room column
        const row = Math.floor(y / charH / 4)   // 4 lines per room row

        const room = MAP_ROOMS.find(r => r.x === col && r.y === row)
        if (room && state.visitedRooms.has(room.id)) {
            onNavigate(room.id)
        }
    })

    overlay.appendChild(title)
    overlay.appendChild(mapPre)
    overlay.appendChild(hint)

    return overlay
}
```

### Toggle Logic

```typescript
export function toggleFullmap(): void {
    const map = document.getElementById('dungeon-fullmap')
    if (!map) return

    if (map.classList.contains('fullmap-visible')) {
        map.classList.remove('fullmap-visible')
    } else {
        // Update map state before showing
        const pre = map.querySelector('.fullmap-grid')
        if (pre) pre.innerHTML = renderFullmap(currentState)
        map.classList.add('fullmap-visible')
    }
}

// Keyboard handler (registered in DungeonEngine)
function handleMapKey(e: KeyboardEvent): void {
    if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
        // ь/Ь = M key on Russian layout
        e.preventDefault()
        toggleFullmap()
    }
}
```

### Fullmap CSS

```css
.dungeon-fullmap {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

.dungeon-fullmap.fullmap-visible {
    opacity: 1;
    pointer-events: auto;
}

.fullmap-title {
    color: var(--primary-color);
    text-shadow: 0 0 8px var(--primary-color);
    margin-bottom: 24px;
    text-align: center;
}

.fullmap-grid {
    color: var(--primary-color);
    text-shadow: 0 0 3px var(--primary-color);
    font-size: 14px;
    line-height: 1.2;
    cursor: pointer;
}

/* Fog of war rooms — dim */
.fullmap-grid .fog {
    color: #333;
    text-shadow: none;
}

/* Current room — bright pulse */
.fullmap-grid .current {
    color: var(--primary-color);
    text-shadow:
        0 0 8px var(--primary-color),
        0 0 16px var(--primary-color);
    animation: rune-pulse 2s ease-in-out infinite;
}

/* Visited rooms — clickable, subtle glow */
.fullmap-grid .visited {
    color: var(--primary-color);
    opacity: 0.7;
}

.fullmap-grid .visited:hover {
    opacity: 1;
    text-shadow: 0 0 10px var(--primary-color);
}

.fullmap-hint {
    font-family: var(--ascii-font-family);
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 20px;
    opacity: 0.5;
}

/* Mobile: larger touch targets, simplified layout */
@media (max-width: 768px) {
    .fullmap-grid {
        font-size: 11px;
    }
    .dungeon-minimap {
        bottom: 8px;
        right: 8px;
    }
    .minimap-grid {
        font-size: 8px;
    }
}
```

---

## Fog of War System

### How It Works

1. `DungeonState.visitedRooms: Set<string>` tracks which rooms the user has entered
2. On first visit to a room → `visitedRooms.add(roomId)` → save to localStorage
3. Minimap and fullmap read `visitedRooms` to decide rendering:
   - **Not visited:** dim/fog character (`░` on minimap, `░░░░░░░` label on fullmap)
   - **Visited:** normal display with room name
   - **Current:** bright highlight with pulse animation
4. The hall (dashboard) is always considered "visited" — it's where the user starts

### Persistence

```typescript
// In DungeonEngine
function saveVisitedRooms(): void {
    const rooms = Array.from(this.state.visitedRooms)
    localStorage.setItem('dungeon-visited', JSON.stringify(rooms))
}

function loadVisitedRooms(): Set<string> {
    try {
        const saved = localStorage.getItem('dungeon-visited')
        return saved ? new Set(JSON.parse(saved)) : new Set(['dashboard'])
    } catch {
        return new Set(['dashboard'])
    }
}
```

---

## Integration with DungeonEngine

```typescript
// In dungeonEngine.ts init()
this.map = new DungeonMap(this.state)
document.body.appendChild(this.map.createMinimap())
document.body.appendChild(this.map.createFullmap((roomId) => {
    this.map.toggleFullmap() // close map
    this.navigateTo(roomId)  // go to room
}))

// Register M key
document.addEventListener('keydown', (e) => this.map.handleKeyboard(e))

// In navigateTo():
this.state.visitedRooms.add(roomId)
this.saveVisitedRooms()
this.map.updateMinimap()

// In returnToHall():
this.map.updateMinimap()
```

---

## Todo List

- [ ] Write `dungeonMap.ts` — DungeonMap class, minimap, fullmap, fog of war
- [ ] Write `map.css` — minimap corner, fullmap overlay, fog dimming, pulse animation
- [ ] Define map grid layout (room positions, connections)
- [ ] Implement fullmap ASCII rendering with room boxes and connectors
- [ ] Implement fog of war (Set-based tracking + localStorage persistence)
- [ ] Wire M key toggle (including Russian keyboard layout ь/Ь)
- [ ] Wire minimap updates on navigateTo/returnToHall
- [ ] Implement click-to-navigate on fullmap
- [ ] Test: fresh user sees only hall revealed, rooms dim
- [ ] Test: visiting rooms progressively reveals the map
- [ ] Test: map state persists across page reload
- [ ] Test: M key works with both English and Russian layouts
- [ ] Test: mobile minimap smaller, fullmap readable

## Success Criteria

- Minimap visible in bottom-right corner during hall view
- Current room highlighted with pulse, visited rooms visible, unvisited rooms fogged
- Press M → fullmap overlay appears with room layout and connections
- Click visited room on fullmap → navigate there directly
- Fog of war: rooms revealed as user visits them
- Map state persists in localStorage across sessions
- Press ESC or M again → fullmap closes
- Mobile: minimap and fullmap scale appropriately
- No interference with existing ESC handling (modals take priority)
