/* ═══════════════════════════════════════════════════════════════════════════
   WALL GENERATOR — Procedural brick walls from Unicode block characters
   AnsiCell buffer → span-grouped HTML for crisp ASCII rendering
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Types ──────────────────────────────────────────────────────────────────

interface AnsiCell {
    glyph: string
    fg: string
    bg: string
}

// ── Hash functions (deterministic pseudo-random) ──────────────────────────

function hash2d(x: number, y: number, seed: number): number {
    let h = seed + x * 374761393 + y * 668265263
    h = (h ^ (h >>> 13)) * 1274126177
    h = h ^ (h >>> 16)
    return (h & 0x7fffffff) / 0x7fffffff
}

function hashInt(seed: number, min: number, max: number): number {
    let h = seed
    h = (h ^ (h >>> 13)) * 1274126177
    h = h ^ (h >>> 16)
    return min + ((h & 0x7fffffff) % (max - min))
}

function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
    return '#' + [clamp(r), clamp(g), clamp(b)]
        .map(c => c.toString(16).padStart(2, '0')).join('')
}

// ── Brick wall generation ─────────────────────────────────────────────────

function generateBrickWall(cols: number, rows: number, seed: number): AnsiCell[][] {
    const wall: AnsiCell[][] = []
    const brickW = 6
    const brickH = 2

    for (let y = 0; y < rows; y++) {
        const row: AnsiCell[] = []
        const rowIndex = Math.floor(y / brickH)
        const offset = (rowIndex % 2 === 1) ? Math.floor(brickW / 2) : 0
        const isMortarRow = (y % brickH === 0)

        for (let x = 0; x < cols; x++) {
            if (isMortarRow) {
                row.push({ glyph: '─', fg: '#1a1815', bg: '#0d0b08' })
            } else {
                const xShifted = (x + offset) % cols
                const isMortarCol = (xShifted % brickW === 0)
                if (isMortarCol) {
                    row.push({ glyph: '│', fg: '#1a1815', bg: '#0d0b08' })
                } else {
                    const noise = hash2d(x, y, seed)
                    const shade = noise > 0.7 ? '█' : noise > 0.4 ? '▓' : noise > 0.15 ? '▒' : '░'
                    const brightness = 0.6 + noise * 0.4
                    const r = Math.floor(0x2a * brightness)
                    const g = Math.floor(0x20 * brightness)
                    const b = Math.floor(0x18 * brightness)
                    row.push({
                        glyph: shade,
                        fg: rgbToHex(r + 20, g + 15, b + 10),
                        bg: rgbToHex(r, g, b)
                    })
                }
            }
        }
        wall.push(row)
    }
    return wall
}

// ── Defect overlays ───────────────────────────────────────────────────────

function addCracks(wall: AnsiCell[][], density: number, seed: number): void {
    const cols = wall[0]?.length ?? 0
    const rows = wall.length
    const numCracks = Math.floor(rows * cols * density / 1000)
    const crackChars = ['╱', '╲', '─', '│']
    const dx = [-1, 1, 0, 0]
    const dy = [0, 0, -1, 1]

    for (let i = 0; i < numCracks; i++) {
        let x = hashInt(seed + i * 7, 0, cols)
        let y = hashInt(seed + i * 13, 0, rows)
        const length = hashInt(seed + i * 17, 3, 8)

        for (let j = 0; j < length; j++) {
            if (x >= 0 && x < cols && y >= 0 && y < rows) {
                const dir = hashInt(seed + i * 31 + j, 0, 4)
                wall[y][x] = {
                    glyph: crackChars[dir],
                    fg: '#0a0805',
                    bg: wall[y][x].bg
                }
                x += dx[dir]
                y += dy[dir]
            }
        }
    }
}

function addMoss(wall: AnsiCell[][], density: number, seed: number): void {
    const rows = wall.length
    const cols = wall[0]?.length ?? 0
    const startRow = Math.floor(rows * 0.6)

    for (let y = startRow; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (hash2d(x, y, seed + 999) < density / 100) {
                wall[y][x].fg = '#1a3a1a'
                wall[y][x].glyph = '░'
            }
        }
    }
}

function addDamp(wall: AnsiCell[][], density: number, seed: number): void {
    const rows = wall.length
    const cols = wall[0]?.length ?? 0

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (hash2d(x, y, seed + 777) < density / 100) {
                // Darken the cell slightly
                wall[y][x].fg = '#15120f'
            }
        }
    }
}

// ── Floor generation ──────────────────────────────────────────────────────

function generateFloor(cols: number, rows: number, seed: number): AnsiCell[][] {
    const floor: AnsiCell[][] = []
    const slabW = 8
    const slabH = 3

    for (let y = 0; y < rows; y++) {
        const row: AnsiCell[] = []
        const isMortarRow = (y % slabH === 0)

        for (let x = 0; x < cols; x++) {
            if (isMortarRow) {
                row.push({ glyph: '─', fg: '#12100d', bg: '#0a0908' })
            } else {
                const isMortarCol = (x % slabW === 0)
                if (isMortarCol) {
                    row.push({ glyph: '│', fg: '#12100d', bg: '#0a0908' })
                } else {
                    const noise = hash2d(x, y, seed + 500)
                    const shade = noise > 0.6 ? '▒' : '░'
                    const brightness = 0.3 + noise * 0.3
                    const r = Math.floor(0x20 * brightness)
                    const g = Math.floor(0x1c * brightness)
                    const b = Math.floor(0x18 * brightness)
                    row.push({
                        glyph: shade,
                        fg: rgbToHex(r + 10, g + 8, b + 6),
                        bg: rgbToHex(r, g, b)
                    })
                }
            }
        }
        floor.push(row)
    }
    return floor
}

// ── Ceiling generation ────────────────────────────────────────────────────

function generateCeiling(cols: number, rows: number, seed: number): AnsiCell[][] {
    const ceil: AnsiCell[][] = []

    for (let y = 0; y < rows; y++) {
        const row: AnsiCell[] = []
        for (let x = 0; x < cols; x++) {
            const noise = hash2d(x, y, seed + 300)
            const glyph = noise > 0.95 ? '·' : noise > 0.8 ? '░' : ' '
            const v = Math.floor(0x0a + noise * 0x0b)
            row.push({
                glyph,
                fg: rgbToHex(v, v, v),
                bg: '#050404'
            })
        }
        ceil.push(row)
    }
    return ceil
}

// ── Render AnsiCell[][] → HTML (span-grouped for perf) ────────────────────

function renderToHTML(cells: AnsiCell[][]): string {
    const lines: string[] = []
    for (const row of cells) {
        let line = ''
        let i = 0
        while (i < row.length) {
            const startFg = row[i].fg
            const startBg = row[i].bg
            let run = ''
            while (i < row.length && row[i].fg === startFg && row[i].bg === startBg) {
                run += row[i].glyph
                i++
            }
            line += `<span style="color:${startFg};background:${startBg}">${run}</span>`
        }
        lines.push(line)
    }
    return lines.join('\n')
}

// ── Calculate grid dimensions from element size ──────────────────────────

function calcGridSize(el: HTMLElement, charW: number = 8, charH: number = 14): { cols: number; rows: number } {
    const w = el.offsetWidth || 800
    const h = el.offsetHeight || 600
    return {
        cols: Math.min(120, Math.floor(w / charW)),
        rows: Math.min(60, Math.floor(h / charH))
    }
}

// ── Public: generate and inject walls into hall ──────────────────────────

export function generateWalls(hallEl: HTMLElement): void {
    const seed = 42 // Deterministic for consistent look

    const wallBack = hallEl.querySelector('.wall-back') as HTMLElement
    const wallLeft = hallEl.querySelector('.wall-left') as HTMLElement
    const wallRight = hallEl.querySelector('.wall-right') as HTMLElement
    const wallFloor = hallEl.querySelector('.wall-floor') as HTMLElement
    const wallCeiling = hallEl.querySelector('.wall-ceiling') as HTMLElement

    // Back wall — main focal point
    if (wallBack) {
        const { cols, rows } = calcGridSize(wallBack)
        const wall = generateBrickWall(cols, rows, seed)
        addCracks(wall, 15, seed + 1)
        addMoss(wall, 8, seed + 2)
        addDamp(wall, 12, seed + 3)

        const pre = document.createElement('pre')
        pre.className = 'dungeon-ascii wall-content'
        pre.innerHTML = renderToHTML(wall)
        wallBack.appendChild(pre)
    }

    // Side walls
    if (wallLeft) {
        const wall = generateBrickWall(38, 40, seed + 100)
        addCracks(wall, 10, seed + 101)
        addMoss(wall, 6, seed + 102)

        const pre = document.createElement('pre')
        pre.className = 'dungeon-ascii wall-content'
        pre.innerHTML = renderToHTML(wall)
        wallLeft.appendChild(pre)
    }

    if (wallRight) {
        const wall = generateBrickWall(38, 40, seed + 200)
        addCracks(wall, 10, seed + 201)
        addDamp(wall, 8, seed + 203)

        const pre = document.createElement('pre')
        pre.className = 'dungeon-ascii wall-content'
        pre.innerHTML = renderToHTML(wall)
        wallRight.appendChild(pre)
    }

    // Floor
    if (wallFloor) {
        const floor = generateFloor(80, 22, seed + 400)
        const pre = document.createElement('pre')
        pre.className = 'dungeon-ascii wall-content'
        pre.innerHTML = renderToHTML(floor)
        wallFloor.appendChild(pre)
    }

    // Ceiling
    if (wallCeiling) {
        const ceil = generateCeiling(80, 22, seed + 500)
        const pre = document.createElement('pre')
        pre.className = 'dungeon-ascii wall-content'
        pre.innerHTML = renderToHTML(ceil)
        wallCeiling.appendChild(pre)
    }
}
