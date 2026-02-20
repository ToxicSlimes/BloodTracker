# Phase 2: Viewport & Procedural Walls

## Priority: HIGH
## Status: Pending
## Depends On: Phase 1

---

## Overview

Generate the visible dungeon hall — procedural brick walls from Unicode block characters, stone floor, dark ceiling. The hall is a CSS 3D box with five visible faces (back, left, right, floor, ceiling). Walls are rendered as `<pre>` elements containing colored ASCII characters.

## Key Insights

- TZ section 6: walls from `repeating-linear-gradient` + procedural defects
- Design decisions: Asciipocalypse-level density — every surface rendered in ASCII chars
- From TZ 6A: shade chars `░▒▓█` for depth, `▀▄` half-blocks for double vertical resolution
- From TZ 6B: AnsiCell buffer pattern — `{glyph, fg, bg, dirty}` per cell
- Perf budget: static hall = 0 DOM updates, pure CSS animations for torches

## Architecture

```
wallGenerator.ts
├── generateWall(width, height, seed, defects): string[][]
│   ├── baseBrickPattern(w, h)     — alternating offset rows
│   ├── addCracks(wall, density)    — SVG-like crack paths from /, \, ─
│   ├── addMoss(wall, density)      — green-tinted cells
│   ├── addDamp(wall, density)      — darker shimmer cells
│   └── addHoles(wall, density)     — transparent gaps
├── generateFloor(width, height): string[][]
│   └── stoneSlabs with mortar lines
├── generateCeiling(width, height): string[][]
│   └── dark stone with cobwebs
└── renderToHTML(cells: AnsiCell[][]): string
    └── group contiguous same-color cells into <span> runs
```

## Related Code Files

### Create
- `wwwroot/js/dungeon/wallGenerator.ts` — procedural wall/floor/ceiling generation
- `wwwroot/css/dungeon/walls.css` — wall container styles, defect animations

### Modify
- `wwwroot/js/dungeon/dungeonEngine.ts` — call wallGenerator in init()

## Implementation Steps

### Step 1: Define AnsiCell type

```typescript
// In wallGenerator.ts
interface AnsiCell {
    glyph: string    // Unicode character
    fg: string       // foreground hex color
    bg: string       // background hex color
}
```

### Step 2: Brick wall generation algorithm

```typescript
function generateBrickWall(cols: number, rows: number, seed: number): AnsiCell[][] {
    const wall: AnsiCell[][] = []
    const brickW = 6  // chars per brick width
    const brickH = 2  // chars per brick height

    for (let y = 0; y < rows; y++) {
        const row: AnsiCell[] = []
        const rowIndex = Math.floor(y / brickH)
        const offset = (rowIndex % 2 === 1) ? Math.floor(brickW / 2) : 0
        const isMortarRow = (y % brickH === 0)

        for (let x = 0; x < cols; x++) {
            if (isMortarRow) {
                // Horizontal mortar line
                row.push({ glyph: '─', fg: '#1a1815', bg: '#0d0b08' })
            } else {
                const xShifted = (x + offset) % cols
                const isMortarCol = (xShifted % brickW === 0)
                if (isMortarCol) {
                    // Vertical mortar
                    row.push({ glyph: '│', fg: '#1a1815', bg: '#0d0b08' })
                } else {
                    // Brick face — varied shade chars
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
```

### Step 3: Defect overlay functions

```typescript
// Cracks: replace cells along a random path with crack chars
function addCracks(wall: AnsiCell[][], density: number, seed: number): void {
    const numCracks = Math.floor(wall.length * wall[0].length * density / 100)
    for (let i = 0; i < numCracks; i++) {
        let x = hashInt(seed + i * 7, 0, wall[0].length)
        let y = hashInt(seed + i * 13, 0, wall.length)
        const length = hashInt(seed + i * 17, 3, 8)
        for (let j = 0; j < length; j++) {
            if (x >= 0 && x < wall[0].length && y >= 0 && y < wall.length) {
                const dir = hashInt(seed + i * 31 + j, 0, 4)
                wall[y][x] = {
                    glyph: ['╱', '╲', '─', '│'][dir],
                    fg: '#0a0805',
                    bg: wall[y][x].bg
                }
                x += [-1, 1, 0, 0][dir]
                y += [0, 0, -1, 1][dir]
            }
        }
    }
}

// Moss: green-tint some cells (bottom-heavy distribution)
function addMoss(wall: AnsiCell[][], density: number, seed: number): void {
    for (let y = Math.floor(wall.length * 0.6); y < wall.length; y++) {
        for (let x = 0; x < wall[0].length; x++) {
            if (hash2d(x, y, seed + 999) < density / 100) {
                wall[y][x].fg = '#1a3a1a'
                wall[y][x].glyph = '░'
            }
        }
    }
}
```

### Step 4: Render AnsiCell[][] to HTML

```typescript
function renderToHTML(cells: AnsiCell[][]): string {
    const lines: string[] = []
    for (const row of cells) {
        let line = ''
        let i = 0
        while (i < row.length) {
            // Group contiguous cells with same fg+bg into one <span>
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
```

### Step 5: Floor and ceiling generation

```typescript
function generateFloor(cols: number, rows: number, seed: number): AnsiCell[][] {
    // Stone slab pattern — larger blocks than walls
    // Use ▒░ shade chars in brown/grey tones
    // Add occasional mortar lines with ─ │
}

function generateCeiling(cols: number, rows: number, seed: number): AnsiCell[][] {
    // Very dark — nearly black with subtle stone texture
    // Use ░ and · chars in #0a0a0a - #151515 range
    // Occasional cobweb from /\|
}
```

### Step 6: Wall CSS styles

**File: `wwwroot/css/dungeon/walls.css`**

```css
.dungeon-wall {
    position: absolute;
    overflow: hidden;
}

.dungeon-wall pre {
    margin: 0;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: 1;
    letter-spacing: 0;
    white-space: pre;
}

/* Torch glow effect on nearby wall sections */
.wall-torch-glow {
    text-shadow: 0 0 8px #f80, 0 0 16px #f60;
    animation: torch-flicker 0.8s ease-in-out infinite;
}

/* Window with bars (1-2 per wall, TZ 6.3) */
.wall-window {
    display: inline-grid;
    grid-template-columns: repeat(4, 1fr);
    background: radial-gradient(ellipse, #1a2a3a, #000);
}

.wall-window .bar {
    width: 2px;
    background: #4a4a50;
    height: 100%;
}
```

### Step 7: Integrate into DungeonEngine

In `dungeonEngine.ts init()`:
1. Calculate wall dimensions from viewport size (cols = floor(vpWidth / charWidth))
2. Generate walls with `generateBrickWall(cols, rows, Date.now())`
3. Apply defects (cracks 15%, moss 10%, damp 20%)
4. Render to HTML and inject into `.wall-back`, `.wall-left`, `.wall-right`, `.wall-floor`, `.wall-ceiling`
5. Cache generated HTML — regenerate only on window resize

## Todo List

- [ ] Write `wallGenerator.ts` — AnsiCell type, hash functions, brick generation
- [ ] Implement crack, moss, damp, hole defect overlays
- [ ] Implement `renderToHTML()` with span-grouping optimization
- [ ] Write floor/ceiling generators
- [ ] Write `walls.css` — wall containers, torch glow, window bars
- [ ] Integrate wall generation into `DungeonEngine.init()`
- [ ] Test wall rendering at different viewport sizes
- [ ] Verify no horizontal/vertical gaps between ASCII chars

## Success Criteria

- Back wall displays procedural brick pattern with visible mortar lines
- Cracks, moss, damp spots visible on walls
- Side walls render in perspective (CSS rotateY)
- Floor renders in perspective (CSS rotateX)
- No visible gaps between characters (line-height:1, letter-spacing:0)
- Wall regenerates correctly on window resize
- Performance: initial render < 50ms for 80×50 grid

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Character gaps in certain fonts | Medium | High | Test with JetBrains Mono, Fira Code; add fallback |
| Wall generation slow for large viewports | Low | Medium | Cap at 120×60 grid, use Web Worker if needed |
| CSS perspective distorts wall text | Medium | Medium | Adjust perspective value (600-1000px range) |
