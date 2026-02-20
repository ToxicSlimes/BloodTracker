/* ═══════════════════════════════════════════════════════════════════════════
   DOOR INTERACTION — Door/signpost creation, hover/click, wall positioning
   ═══════════════════════════════════════════════════════════════════════════ */

import type { RoomConfig } from './dungeonEngine.js'

// ── Door ASCII art ────────────────────────────────────────────────────────

const DOOR_FRAME = `\
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
┗━━━━━━━━━┛`

function makeSignpost(label: string): string {
    const pad = label.length + 2
    return `╔${'═'.repeat(pad)}╗\n║ ${label} ║\n╚${'═'.repeat(pad)}╝`
}

// ── Create all doors on a hall ────────────────────────────────────────────

export function createDoors(
    hallEl: HTMLElement,
    rooms: RoomConfig[],
    onNavigate: (roomId: string) => void
): void {
    const backWall = hallEl.querySelector('.wall-back') as HTMLElement
    const leftWall = hallEl.querySelector('.wall-left') as HTMLElement
    const rightWall = hallEl.querySelector('.wall-right') as HTMLElement

    // Group rooms by wall
    const backRooms = rooms.filter(r => r.wall === 'back')
    const leftRooms = rooms.filter(r => r.wall === 'left')
    const rightRooms = rooms.filter(r => r.wall === 'right')

    // Create a door container on back wall
    if (backWall) {
        const container = createDoorContainer(backRooms.length)
        backRooms.forEach(room => {
            const door = createDoor(room, onNavigate)
            container.appendChild(door)
        })
        backWall.appendChild(container)
    }

    // Side wall doors
    if (leftWall) {
        const container = createDoorContainer(leftRooms.length)
        container.classList.add('door-container-side')
        leftRooms.forEach(room => {
            const door = createDoor(room, onNavigate)
            container.appendChild(door)
        })
        leftWall.appendChild(container)
    }

    if (rightWall) {
        const container = createDoorContainer(rightRooms.length)
        container.classList.add('door-container-side')
        rightRooms.forEach(room => {
            const door = createDoor(room, onNavigate)
            container.appendChild(door)
        })
        rightWall.appendChild(container)
    }
}

function createDoorContainer(count: number): HTMLElement {
    const c = document.createElement('div')
    c.className = 'door-container'
    return c
}

function createDoor(config: RoomConfig, onNavigate: (roomId: string) => void): HTMLElement {
    const door = document.createElement('div')
    door.className = 'dungeon-door'
    door.dataset.room = config.id
    door.setAttribute('role', 'button')
    door.setAttribute('aria-label', `Дверь: ${config.label}`)
    door.tabIndex = 0

    // Signpost
    const sign = document.createElement('pre')
    sign.className = 'door-signpost dungeon-ascii'
    sign.textContent = makeSignpost(config.label)

    // Door frame
    const frame = document.createElement('pre')
    frame.className = 'door-frame dungeon-ascii'
    frame.textContent = DOOR_FRAME

    // Icon on door
    const icon = document.createElement('span')
    icon.className = 'door-icon'
    icon.textContent = config.icon

    door.appendChild(sign)
    door.appendChild(frame)
    door.appendChild(icon)

    // ── Hover effects ──
    door.addEventListener('mouseenter', () => door.classList.add('door-hover'))
    door.addEventListener('mouseleave', () => door.classList.remove('door-hover'))

    // ── Click handler ──
    const activate = () => {
        door.classList.add('door-active')
        setTimeout(() => door.classList.remove('door-active'), 200)
        onNavigate(config.id)
    }

    door.addEventListener('click', activate)
    door.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            activate()
        }
    })

    return door
}
