/* =============================================================================
   DUNGEON MAP — Minimap (corner) + Fullmap (M key overlay) with fog of war
   ============================================================================= */

import type { DungeonState } from './dungeonEngine.js'

// ── Room positions on the map grid ──────────────────────────────────────────

interface MapRoom {
    id: string
    label: string      // Short label for fullmap
    labelFull: string   // Full Russian label
    row: number         // Grid row (0-based)
    col: number         // Grid col (0-based)
}

const MAP_ROOMS: MapRoom[] = [
    { id: 'encyclopedia', label: 'ЭНЦИКЛ',   labelFull: 'ЭНЦИКЛОПЕДИЯ',  row: 0, col: 1 },
    { id: 'workouts',     label: 'ТРЕН',     labelFull: 'ТРЕНИРОВКИ',    row: 1, col: 0 },
    { id: 'hall',         label: 'ЗАЛ',      labelFull: 'ГЛАВНЫЙ ЗАЛ',  row: 1, col: 1 },
    { id: 'ascii-studio', label: 'ASCII',    labelFull: 'ASCII СТУДИЯ',  row: 1, col: 2 },
    { id: 'course',       label: 'КУРС',     labelFull: 'КУРС',          row: 2, col: 0 },
    { id: 'compare',      label: 'СРАВН',    labelFull: 'СРАВНЕНИЕ',     row: 2, col: 2 },
    { id: 'dashboard',    label: 'ДАШБД',    labelFull: 'ДАШБОРД',       row: 3, col: 1 },
    { id: 'analyses',     label: 'АНАЛ',     labelFull: 'АНАЛИЗЫ',       row: 4, col: 1 },
]

// Grid dimensions
const GRID_ROWS = 5
const GRID_COLS = 3

// ── DungeonMap class ────────────────────────────────────────────────────────

export class DungeonMap {
    private state: DungeonState
    private onNavigate: (roomId: string) => void
    private minimapEl: HTMLElement
    private fullmapEl: HTMLElement | null = null
    private fullmapOpen = false

    constructor(state: DungeonState, onNavigate: (roomId: string) => void) {
        this.state = state
        this.onNavigate = onNavigate
        this.minimapEl = this.buildMinimap()
    }

    // ── Minimap (always visible in hall corner) ──────────────────────────────

    private buildMinimap(): HTMLElement {
        const wrap = document.createElement('div')
        wrap.className = 'dungeon-minimap'
        wrap.setAttribute('aria-label', 'Карта подземелья')
        wrap.title = 'Нажмите M для полной карты'

        wrap.addEventListener('click', () => this.toggleFullmap())

        this.renderMinimap(wrap)
        return wrap
    }

    private renderMinimap(container: HTMLElement): void {
        const grid: string[][] = []
        for (let r = 0; r < GRID_ROWS; r++) {
            grid[r] = []
            for (let c = 0; c < GRID_COLS; c++) {
                grid[r][c] = ' '
            }
        }

        for (const room of MAP_ROOMS) {
            const isCurrent = (room.id === 'hall' && !this.state.currentRoom) ||
                              (room.id === this.state.currentRoom)
            const isVisited = room.id === 'hall' ||
                              this.state.visitedRooms.has(room.id)

            if (isCurrent) {
                grid[room.row][room.col] = '█'
            } else if (isVisited) {
                grid[room.row][room.col] = '▓'
            } else {
                grid[room.row][room.col] = '░'
            }
        }

        const pre = document.createElement('pre')
        pre.className = 'minimap-grid dungeon-ascii'
        pre.textContent = grid.map(row => row.join(' ')).join('\n')
        container.innerHTML = ''
        container.appendChild(pre)
    }

    getMinimap(): HTMLElement {
        return this.minimapEl
    }

    // ── Fullmap (M key overlay) ──────────────────────────────────────────────

    toggleFullmap(): void {
        if (this.fullmapOpen) {
            this.closeFullmap()
        } else {
            this.openFullmap()
        }
    }

    private openFullmap(): void {
        if (this.fullmapEl) return
        this.fullmapOpen = true

        const overlay = document.createElement('div')
        overlay.className = 'dungeon-fullmap-overlay'
        overlay.id = 'dungeon-fullmap'

        // Close on background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeFullmap()
        })

        // Title
        const title = document.createElement('div')
        title.className = 'fullmap-title'
        title.textContent = '╔═══════════════════════════╗\n║     КАРТА ПОДЗЕМЕЛЬЯ      ║\n╚═══════════════════════════╝'

        // Map content
        const mapContent = document.createElement('div')
        mapContent.className = 'fullmap-content'

        this.renderFullmap(mapContent)

        // Hint
        const hint = document.createElement('div')
        hint.className = 'fullmap-hint'
        hint.textContent = 'Клик по комнате для перехода  •  M или ESC — закрыть'

        overlay.appendChild(title)
        overlay.appendChild(mapContent)
        overlay.appendChild(hint)

        document.body.appendChild(overlay)
        this.fullmapEl = overlay

        // Animate in
        requestAnimationFrame(() => overlay.classList.add('fullmap-visible'))
    }

    closeFullmap(): void {
        if (!this.fullmapEl) return
        this.fullmapOpen = false

        this.fullmapEl.classList.remove('fullmap-visible')
        const el = this.fullmapEl
        setTimeout(() => el.remove(), 300)
        this.fullmapEl = null
    }

    isFullmapOpen(): boolean {
        return this.fullmapOpen
    }

    private renderFullmap(container: HTMLElement): void {
        // Build ASCII map with box-drawing connections

        for (const room of MAP_ROOMS) {
            if (room.id === 'hall') continue // Hall is special — center node

            const roomEl = document.createElement('div')
            roomEl.className = 'fullmap-room'
            roomEl.dataset.roomId = room.id
            roomEl.style.gridRow = String(room.row + 1)
            roomEl.style.gridColumn = String(room.col + 1)

            const isVisited = this.state.visitedRooms.has(room.id) || room.id === 'dashboard'
            const isCurrent = room.id === this.state.currentRoom

            if (isCurrent) {
                roomEl.classList.add('fullmap-room-current')
            } else if (isVisited) {
                roomEl.classList.add('fullmap-room-visited')
            } else {
                roomEl.classList.add('fullmap-room-fog')
            }

            const box = document.createElement('pre')
            box.className = 'fullmap-room-box dungeon-ascii'

            if (isVisited || isCurrent) {
                const padded = room.label.padStart(Math.floor((7 + room.label.length) / 2)).padEnd(7)
                box.textContent = `┌───────┐\n│${padded}│\n└───────┘`
            } else {
                box.textContent = '┌───────┐\n│░░░░░░░│\n└───────┘'
            }

            roomEl.appendChild(box)

            // Click to navigate (only if visited or fog is cleared)
            if (isVisited || isCurrent) {
                roomEl.style.cursor = 'pointer'
                roomEl.addEventListener('click', (e) => {
                    e.stopPropagation()
                    this.closeFullmap()
                    if (room.id !== this.state.currentRoom) {
                        this.onNavigate(room.id)
                    }
                })
            }

            container.appendChild(roomEl)
        }

        // Hall (center room)
        const hallEl = document.createElement('div')
        hallEl.className = 'fullmap-room fullmap-room-hall'
        hallEl.style.gridRow = '2'
        hallEl.style.gridColumn = '2'

        if (!this.state.currentRoom) {
            hallEl.classList.add('fullmap-room-current')
        } else {
            hallEl.classList.add('fullmap-room-visited')
        }

        const hallBox = document.createElement('pre')
        hallBox.className = 'fullmap-room-box dungeon-ascii'
        hallBox.textContent = '╔═══════╗\n║  ЗАЛ  ║\n╚═══════╝'
        hallEl.appendChild(hallBox)
        container.appendChild(hallEl)

        // Connection lines between rooms
        this.renderConnections(container)
    }

    private renderConnections(container: HTMLElement): void {
        // Connection lines rendered as small positioned elements
        const connections = [
            // Hall connections
            { fromRow: 1, fromCol: 1, toRow: 0, toCol: 1, dir: 'v' }, // hall → encyclopedia
            { fromRow: 1, fromCol: 1, toRow: 1, toCol: 0, dir: 'h' }, // hall → workouts
            { fromRow: 1, fromCol: 1, toRow: 1, toCol: 2, dir: 'h' }, // hall → ascii-studio
            { fromRow: 1, fromCol: 1, toRow: 2, toCol: 0, dir: 'dl' }, // hall → course (via corridor)
            { fromRow: 1, fromCol: 1, toRow: 2, toCol: 2, dir: 'dr' }, // hall → compare
            { fromRow: 1, fromCol: 1, toRow: 3, toCol: 1, dir: 'v2' }, // hall → dashboard
            // Dashboard → analyses
            { fromRow: 3, fromCol: 1, toRow: 4, toCol: 1, dir: 'v' },
        ]

        for (const conn of connections) {
            const line = document.createElement('div')
            line.className = `fullmap-connection fullmap-conn-${conn.dir}`

            if (conn.dir === 'h') {
                line.style.gridRow = String(conn.fromRow + 1)
                line.style.gridColumn = conn.fromCol < conn.toCol
                    ? `${conn.fromCol + 1} / ${conn.toCol + 2}`
                    : `${conn.toCol + 1} / ${conn.fromCol + 2}`
                line.textContent = '───'
            } else if (conn.dir === 'v' || conn.dir === 'v2') {
                line.style.gridRow = `${conn.fromRow + 1} / ${conn.toRow + 2}`
                line.style.gridColumn = String(conn.fromCol + 1)
                line.textContent = '│'
            } else {
                // diagonal-ish connections — place between cells
                line.style.gridRow = `${conn.fromRow + 1} / ${conn.toRow + 2}`
                line.style.gridColumn = `${Math.min(conn.fromCol, conn.toCol) + 1} / ${Math.max(conn.fromCol, conn.toCol) + 2}`
                line.textContent = conn.dir === 'dl' ? '╲' : '╱'
            }

            container.appendChild(line)
        }
    }

    // ── Update map state ─────────────────────────────────────────────────────

    update(): void {
        this.renderMinimap(this.minimapEl)
    }

    // ── Cleanup ──────────────────────────────────────────────────────────────

    destroy(): void {
        this.closeFullmap()
        this.minimapEl.remove()
    }
}
