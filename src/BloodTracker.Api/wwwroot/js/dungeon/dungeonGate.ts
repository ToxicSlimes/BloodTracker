/* =============================================================================
   DUNGEON GATE — Login gate scene with tunnel walls, split-open doors, torches
   Plays a cinematic opening animation after successful auth
   ============================================================================= */

// ── Simple procedural brick string for tunnel walls ──────────────────────────

function generateBrickText(cols: number, rows: number, seed: number): string {
    const brickW = 6
    const brickH = 2
    const shades = '░▒▓█'
    const lines: string[] = []

    for (let y = 0; y < rows; y++) {
        let line = ''
        const rowIndex = Math.floor(y / brickH)
        const offset = (rowIndex % 2 === 1) ? Math.floor(brickW / 2) : 0
        const isMortarRow = (y % brickH === 0)

        for (let x = 0; x < cols; x++) {
            if (isMortarRow) {
                line += '─'
            } else {
                const xShifted = (x + offset) % cols
                if (xShifted % brickW === 0) {
                    line += '│'
                } else {
                    // Deterministic pseudo-random
                    let h = seed + x * 374761393 + y * 668265263
                    h = (h ^ (h >>> 13)) * 1274126177
                    h = h ^ (h >>> 16)
                    const n = (h & 0x7fffffff) / 0x7fffffff
                    line += shades[Math.floor(n * shades.length)] || '░'
                }
            }
        }
        lines.push(line)
    }
    return lines.join('\n')
}

// ── Gate door ASCII art ──────────────────────────────────────────────────────

const GATE_DOOR_LEFT = `\
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
▓╔═══════════════════╗│
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║│
▓║▓▓▓╔════════╗▓▓▓▓▓▓║│
▓║▓▓▓║        ║▓▓▓▓▓▓║│
▓║▓▓▓║   ◆◆   ║▓▓▓▓▓▓║│
▓║▓▓▓║   ◆◆   ║▓▓▓▓▓▓║│
▓║▓▓▓╚════════╝▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓╔═╗▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓║●║▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓╚═╝▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║│
▓║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║│
▓╚═══════════════════╝│
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│`

const GATE_DOOR_RIGHT = `\
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
│╔═══════════════════╗▓
│║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓╔════════╗▓▓▓║▓
│║▓▓▓▓▓▓║        ║▓▓▓║▓
│║▓▓▓▓▓▓║   ◆◆   ║▓▓▓║▓
│║▓▓▓▓▓▓║   ◆◆   ║▓▓▓║▓
│║▓▓▓▓▓▓╚════════╝▓▓▓║▓
│║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓╔═╗▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓║●║▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓╚═╝▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓
│║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║▓
│╚═══════════════════╝▓
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓`

// ── Gate torch ASCII art ─────────────────────────────────────────────────────

const TORCH_FLAME = `\
  (
 (()
((())
 (()
  (`

const TORCH_HOLDER = `\
 ╔═╗
 ║▓║
 ║▓║
═╩═╩═`

// ── Build gate scene DOM ─────────────────────────────────────────────────────

function buildGateScene(): HTMLElement {
    const gate = document.createElement('div')
    gate.className = 'dungeon-gate'
    gate.id = 'dungeon-gate'

    // Tunnel walls background
    const tunnelWalls = document.createElement('div')
    tunnelWalls.className = 'gate-tunnel-walls'
    const wallPre = document.createElement('pre')
    wallPre.textContent = generateBrickText(80, 50, 42)
    tunnelWalls.appendChild(wallPre)
    gate.appendChild(tunnelWalls)

    // Darkening gradient overlay
    const tunnel = document.createElement('div')
    tunnel.className = 'gate-tunnel'
    gate.appendChild(tunnel)

    // Title
    const title = document.createElement('div')
    title.className = 'gate-title'
    title.textContent = 'B L O O D T R A C K E R'
    gate.appendChild(title)

    // Left torch
    const torchL = document.createElement('div')
    torchL.className = 'gate-torch gate-torch-left'
    torchL.innerHTML = `<div class="gate-torch-flame">${TORCH_FLAME}</div><div class="gate-torch-holder">${TORCH_HOLDER}</div>`
    gate.appendChild(torchL)

    // Right torch
    const torchR = document.createElement('div')
    torchR.className = 'gate-torch gate-torch-right'
    torchR.innerHTML = `<div class="gate-torch-flame">${TORCH_FLAME}</div><div class="gate-torch-holder">${TORCH_HOLDER}</div>`
    gate.appendChild(torchR)

    // Doors
    const doors = document.createElement('div')
    doors.className = 'gate-doors'

    const doorL = document.createElement('div')
    doorL.className = 'gate-door gate-door-left'
    const doorLPre = document.createElement('pre')
    doorLPre.textContent = GATE_DOOR_LEFT
    doorL.appendChild(doorLPre)
    doors.appendChild(doorL)

    const doorR = document.createElement('div')
    doorR.className = 'gate-door gate-door-right'
    const doorRPre = document.createElement('pre')
    doorRPre.textContent = GATE_DOOR_RIGHT
    doorR.appendChild(doorRPre)
    doors.appendChild(doorR)

    gate.appendChild(doors)

    // Light burst (hidden until gate opens)
    const lightBurst = document.createElement('div')
    lightBurst.className = 'gate-light-burst'
    gate.appendChild(lightBurst)

    return gate
}

// ── Show gate scene on login page ────────────────────────────────────────────

export function showGateScene(): void {
    // Only show if dungeon UI is enabled
    if (localStorage.getItem('dungeon-ui') === 'off') return
    if (document.getElementById('dungeon-gate')) return

    const gate = buildGateScene()
    document.body.appendChild(gate)
}

// ── Play gate opening animation ──────────────────────────────────────────────

export function playGateOpenAnimation(): Promise<void> {
    return new Promise((resolve) => {
        const gate = document.getElementById('dungeon-gate')
        if (!gate) {
            resolve()
            return
        }

        // Trigger door split
        gate.classList.add('gate-opening')

        // After doors open, fade out the whole scene
        setTimeout(() => {
            gate.classList.add('gate-fade-out')

            setTimeout(() => {
                gate.remove()
                resolve()
            }, 500) // fade-out duration
        }, 1500) // wait for doors to split + light burst
    })
}

// ── Remove gate scene ────────────────────────────────────────────────────────

export function removeGateScene(): void {
    document.getElementById('dungeon-gate')?.remove()
}
