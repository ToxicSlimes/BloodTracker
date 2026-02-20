/* ═══════════════════════════════════════════════════════════════════════════
   DUNGEON ENGINE — Core engine: state, DOM structure, navigation orchestrator
   ═══════════════════════════════════════════════════════════════════════════ */

import { generateWalls } from './wallGenerator.js'
import { createDoors } from './doorInteraction.js'
import { CameraController } from './cameraController.js'
import { RoomManager } from './roomManager.js'
import { createRelief } from './wallRelief.js'
import { createTorchPicker } from './torchPicker.js'
import { createFloorRunes } from './floorRunes.js'
import { createSecretStone } from './secretStone.js'
import { DungeonMap } from './dungeonMap.js'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DungeonState {
    currentView: 'hall' | 'room' | 'transitioning'
    currentRoom: string | null
    previousRoom: string | null
    visitedRooms: Set<string>
}

export interface RoomConfig {
    id: string
    label: string
    wall: 'back' | 'left' | 'right'
    position: number
    icon: string
}

// ── Room registry — maps room IDs to their config ──────────────────────────

export const ROOMS: RoomConfig[] = [
    { id: 'dashboard',    label: 'ДАШБОРД',      wall: 'back',  position: 0, icon: '♛' },
    { id: 'analyses',     label: 'АНАЛИЗЫ',      wall: 'back',  position: 1, icon: '⚗' },
    { id: 'course',       label: 'КУРС',         wall: 'back',  position: 2, icon: '📋' },
    { id: 'compare',      label: 'СРАВНЕНИЕ',    wall: 'right', position: 0, icon: '⚖' },
    { id: 'workouts',     label: 'ТРЕНИРОВКИ',   wall: 'left',  position: 0, icon: '⚔' },
    { id: 'encyclopedia', label: 'ЭНЦИКЛОПЕДИЯ', wall: 'left',  position: 1, icon: '📖' },
    { id: 'ascii-studio', label: 'ASCII СТУДИЯ', wall: 'right', position: 1, icon: '✎' },
    // admin room added dynamically by addAdminRoom() if user is admin
]

// Room → theme class mapping
const ROOM_THEMES: Record<string, string> = {
    'dashboard': 'room-throne',
    'analyses': 'room-lab',
    'course': 'room-alch',
    'workouts': 'room-forge',
    'compare': 'room-mirror',
    'encyclopedia': 'room-lib',
    'ascii-studio': 'room-studio',
    'admin': 'room-secret',
}

/** Dynamically add admin room to ROOMS registry */
export function addAdminRoom(): void {
    if (!ROOMS.find(r => r.id === 'admin')) {
        ROOMS.push({ id: 'admin', label: 'АДМИН', wall: 'right', position: 2, icon: '⚙' })
    }
}

// ── DungeonEngine class ────────────────────────────────────────────────────

export class DungeonEngine {
    state: DungeonState
    private viewport: HTMLElement
    hall: HTMLElement
    private camera: CameraController
    private roomManager: RoomManager
    private appEl: HTMLElement
    private keyHandler: (e: KeyboardEvent) => void
    private dungeonMap: DungeonMap | null = null

    constructor(appEl: HTMLElement) {
        this.appEl = appEl
        this.state = {
            currentView: 'hall',
            currentRoom: null,
            previousRoom: null,
            visitedRooms: this.loadVisitedRooms(),
        }

        // Build DOM
        this.viewport = this.createViewport()
        this.hall = this.createHall()
        this.viewport.appendChild(this.hall)

        // Insert viewport into app (before the pages, after header)
        const header = appEl.querySelector('header')
        if (header) {
            header.style.display = 'none'
            header.insertAdjacentElement('afterend', this.viewport)
        } else {
            appEl.prepend(this.viewport)
        }

        // Hide old elements in dungeon mode
        const colorPicker = appEl.querySelector('.color-picker-container') as HTMLElement
        if (colorPicker) colorPicker.style.display = 'none'
        const userInfo = appEl.querySelector('.user-info') as HTMLElement
        if (userInfo) userInfo.style.display = 'none'
        const quickActions = appEl.querySelector('.quick-actions') as HTMLElement
        if (quickActions) quickActions.style.display = 'none'

        // Deactivate all pages (hall is the default view)
        appEl.querySelectorAll('.page').forEach(p => p.classList.remove('active'))

        // Generate procedural walls
        generateWalls(this.hall)

        // Create doors on walls
        createDoors(this.hall, ROOMS, (roomId) => this.navigateTo(roomId))

        // Init subsystems
        this.camera = new CameraController(this.hall)
        this.roomManager = new RoomManager(this.appEl)

        // Decorations
        this.initDecorations()

        // Dungeon map
        this.dungeonMap = new DungeonMap(this.state, (roomId) => this.navigateTo(roomId))
        this.viewport.appendChild(this.dungeonMap.getMinimap())

        // Keyboard
        this.keyHandler = (e: KeyboardEvent) => this.handleKeyboard(e)
        document.addEventListener('keydown', this.keyHandler)
    }

    private initDecorations(): void {
        const wallBack = this.hall.querySelector('.wall-back') as HTMLElement
        const wallRight = this.hall.querySelector('.wall-right') as HTMLElement

        // A. Wall relief (skull on back wall)
        if (wallBack) createRelief(wallBack)

        // B. Torch color picker (on back wall floor)
        if (wallBack) createTorchPicker(wallBack)

        // C. Floor runes (quick actions on dungeon floor)
        createFloorRunes(this.hall)

        // D. Secret admin stone
        try {
            const auth = (window as any).auth
            if (auth?.isAdmin() && !auth?.isImpersonating() && wallRight) {
                createSecretStone(wallRight, () => this.navigateTo('admin'))
            }
        } catch {}
    }

    private createViewport(): HTMLElement {
        const vp = document.createElement('div')
        vp.className = 'dungeon-viewport'
        vp.id = 'dungeon-viewport'
        return vp
    }

    private createHall(): HTMLElement {
        const hall = document.createElement('div')
        hall.className = 'dungeon-hall'
        hall.innerHTML = `
            <div class="dungeon-wall wall-back"></div>
            <div class="dungeon-wall wall-left"></div>
            <div class="dungeon-wall wall-right"></div>
            <div class="dungeon-wall wall-floor"></div>
            <div class="dungeon-wall wall-ceiling"></div>
        `
        return hall
    }

    async navigateTo(roomId: string): Promise<void> {
        if (this.state.currentView === 'transitioning') return
        this.state.currentView = 'transitioning'

        const doorEl = this.hall.querySelector(`[data-room="${roomId}"]`) as HTMLElement
        if (!doorEl) {
            this.state.currentView = 'hall'
            return
        }

        // Camera approach + door swing
        await this.camera.enterRoom(doorEl)

        // Show room content with theme class
        const themeClass = ROOM_THEMES[roomId] || ''
        this.roomManager.showRoom(roomId, () => this.returnToHall(), themeClass)

        // Update state
        this.state.previousRoom = this.state.currentRoom
        this.state.currentRoom = roomId
        this.state.visitedRooms.add(roomId)
        this.saveVisitedRooms()
        this.state.currentView = 'room'

        // Update map
        this.dungeonMap?.update()

        // Hide hall
        this.hall.style.display = 'none'
        this.viewport.style.height = 'auto'
        this.viewport.style.overflow = 'visible'
        this.viewport.style.perspective = 'none'
    }

    async returnToHall(): Promise<void> {
        if (this.state.currentView === 'transitioning') return
        this.state.currentView = 'transitioning'

        // Fade out room content
        await this.roomManager.hideRoom()

        // Restore hall
        this.viewport.style.height = '100vh'
        this.viewport.style.overflow = 'hidden'
        this.viewport.style.perspective = '800px'
        this.hall.style.display = ''

        // Camera retreat
        await this.camera.exitRoom()

        // Update state
        this.state.previousRoom = this.state.currentRoom
        this.state.currentRoom = null
        this.state.currentView = 'hall'

        // Update map
        this.dungeonMap?.update()
    }

    private handleKeyboard(e: KeyboardEvent): void {
        // ESC: close fullmap first, then return to hall from room
        if (e.key === 'Escape') {
            if (this.dungeonMap?.isFullmapOpen()) {
                e.preventDefault()
                this.dungeonMap.closeFullmap()
                return
            }
            if (this.state.currentView === 'room') {
                const activeModal = document.querySelector('.modal-overlay.active')
                if (!activeModal) {
                    e.preventDefault()
                    this.returnToHall()
                }
            }
        }

        // M key (including Russian ь/Ь) toggles dungeon map
        if ((e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') && this.state.currentView === 'hall') {
            const activeModal = document.querySelector('.modal-overlay.active')
            if (!activeModal) {
                e.preventDefault()
                this.dungeonMap?.toggleFullmap()
            }
        }
    }

    private loadVisitedRooms(): Set<string> {
        try {
            const raw = localStorage.getItem('dungeon-visited')
            return raw ? new Set(JSON.parse(raw)) : new Set(['dashboard'])
        } catch {
            return new Set(['dashboard'])
        }
    }

    private saveVisitedRooms(): void {
        localStorage.setItem('dungeon-visited', JSON.stringify([...this.state.visitedRooms]))
    }

    destroy(): void {
        document.removeEventListener('keydown', this.keyHandler)
        this.dungeonMap?.destroy()
        this.viewport.remove()
    }
}

// ── Singleton & exports ────────────────────────────────────────────────────

let engine: DungeonEngine | null = null

export function initDungeon(appContainer: HTMLElement): DungeonEngine {
    if (engine) engine.destroy()
    engine = new DungeonEngine(appContainer)
    ;(window as any).dungeonEngine = engine
    return engine
}

export function getDungeon(): DungeonEngine | null {
    return engine
}
