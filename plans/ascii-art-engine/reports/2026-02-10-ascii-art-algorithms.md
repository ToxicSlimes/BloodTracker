# Research Report: ASCII Art Conversion Algorithms for Browser

**Date:** 2026-02-10
**Scope:** Image-to-ASCII, Text-to-ASCII, Braille/Block art, Dithering, Real-time performance
**Target:** Vanilla JS for BloodTracker retro terminal theme

---

## Executive Summary

ASCII art conversion is a well-understood domain with multiple algorithm tiers from simple brightness mapping to GPU-accelerated WebGL shaders. For BloodTracker's retro terminal aesthetic, a **multi-mode engine** is feasible: image→ASCII (Canvas pixel reading + density ramp), text→ASCII (FIGlet font rendering), and advanced modes (braille patterns, edge detection, dithering). All can run client-side in vanilla JS with Canvas API. Performance is trivial for static images (<1ms for 120x60); real-time video needs Web Workers + OffscreenCanvas.

The existing codebase already has ASCII art infrastructure (asciiDonut.js, muscleAscii.js, ascii-art.js) with `<pre>` rendering, CRT glow effects, and 963 lines of ASCII CSS — a solid foundation to build on.

---

## Key Findings

### 1. Image to ASCII — Core Algorithm

**Pipeline:** Load Image → Canvas downscale → getImageData → Grayscale → Character map → Render

#### Step 1: Load & Downscale
```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = targetCols;  // e.g., 120
canvas.height = targetRows; // adjusted for aspect ratio
ctx.drawImage(img, 0, 0, targetCols, targetRows);
// Canvas handles interpolation/antialiasing internally
```

#### Step 2: Grayscale Conversion (ITU-R BT.601)
```javascript
const toGray = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
```
Alternative BT.709 (HDTV): `0.2126*R + 0.7152*G + 0.0722*B`

#### Step 3: Character Density Ramp
Characters sorted by visual density (% of filled pixels in monospace cell):

**Full 70-char ramp (Bourke, dark→light):**
```
$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,"^`'.
```

**Short 10-char:**
```
@%#*+=-:.
```

**Extended with Unicode blocks:**
```
█▓▒░@#W$9876543210?!abc;:+=-,._
```

**For dark backgrounds (reversed, light→dark):**
```
 .'`^",:;Il!i><~+_-?][}{1)(|\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$
```

#### Step 4: Mapping
```javascript
const charIndex = Math.floor((gray / 255) * (ramp.length - 1));
const char = invertForDarkBg ? ramp[ramp.length - 1 - charIndex] : ramp[charIndex];
```

#### Step 5: Aspect Ratio Correction
Monospace chars ~2:1 height:width. Sample fewer rows:
```javascript
const correctedHeight = Math.floor(height * 0.5); // or charWidth/charHeight
```

### 2. Edge Detection (Sobel) for Detail

Sobel kernels detect edges and map angles to directional characters:

```
Gx = [[-1,0,+1],[-2,0,+2],[-1,0,+1]]
Gy = [[-1,-2,-1],[0,0,0],[+1,+2,+1]]
```

- magnitude = sqrt(Gx²+Gy²) → edge strength
- angle = atan2(Gy,Gx) → character selection:
  - 0°/180° → `-` (horizontal)
  - 90°/270° → `|` (vertical)
  - 45° → `/` or `\` (diagonal)

### 3. Color ASCII Art

Each character gets original RGB color via `<span>`:
```html
<span style="color:rgb(255,120,50)">@</span>
```
Build entire frame as single HTML string, set via `innerHTML` once.

### 4. Text to ASCII (FIGlet)

**figlet.js** runs in browser. Font files (.flf) define multi-line character templates. Smushing/kerning brings characters together.

Key: Can bundle Standard, Banner, Doom, Slant fonts for the dungeon theme.

Browser usage:
```javascript
import figlet from 'figlet';
figlet.text('BLOOD', { font: 'Doom' }, (err, data) => console.log(data));
```

### 5. Braille Patterns (U+2800-U+28FF) — High Resolution

Each braille char = 2×4 pixel grid = 8 bits = 256 patterns.

**Bit mapping (NOT simple row order due to historical numbering):**
```
[bit0] [bit3]    row 0
[bit1] [bit4]    row 1
[bit2] [bit5]    row 2
[bit6] [bit7]    row 3
```

```javascript
let code = 0x2800;
if (px[0][0]) code |= 0x01; // dot 1
if (px[1][0]) code |= 0x02; // dot 2
if (px[2][0]) code |= 0x04; // dot 3
if (px[0][1]) code |= 0x08; // dot 4
if (px[1][1]) code |= 0x10; // dot 5
if (px[2][1]) code |= 0x20; // dot 6
if (px[3][0]) code |= 0x40; // dot 7
if (px[3][1]) code |= 0x80; // dot 8
const brailleChar = String.fromCharCode(code);
```

Resolution: 4× standard ASCII. An 80×24 terminal → 160×96 effective pixels.

### 6. Dithering Algorithms

**Floyd-Steinberg** (error diffusion, sequential):
```
         *    7/16
  3/16  5/16  1/16
```
Best quality, but sequential — can't parallelize.

**Ordered/Bayer** (threshold matrix, parallelizable):
```
4×4 matrix:
 0  8  2 10
12  4 14  6
 3 11  1  9
15  7 13  5
```
Each pixel independent → GPU-friendly. Produces characteristic cross-hatch pattern.

**Atkinson** (high contrast, 75% diffusion):
Great for the retro Mac aesthetic. Only diffuses 6/8 of error.

### 7. Block Characters

| Char | Code | Fill |
|------|------|------|
| `░` | U+2591 | ~25% |
| `▒` | U+2592 | ~50% |
| `▓` | U+2593 | ~75% |
| `█` | U+2588 | 100% |
| `▀` | U+2580 | Top half |
| `▄` | U+2584 | Bottom half |

Half-block technique: 2 vertical pixels per char cell with fg+bg colors → doubles resolution.

### 8. Performance & Web Workers

Static image (120×60): <1ms — trivial, main thread fine.
Real-time video (160×90 @ 30fps): Use OffscreenCanvas + Web Worker:

```javascript
// Main thread
const worker = new Worker('ascii-worker.js');
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

// Worker: full getImageData + conversion off main thread
```

WebGL shader approach: GPU-native ASCII rendering at 60fps (Three.js AsciiEffect pattern).

---

## Existing BloodTracker ASCII Infrastructure

| Component | File | Lines | Technique |
|-----------|------|-------|-----------|
| Donut Progress | asciiDonut.js | 152 | Unicode blocks `█░`, box drawing `╔═╗` |
| Muscle Groups | muscleAscii.js | 702 | Hardcoded multi-line ASCII art, 16+ groups |
| Skull Effect | ascii-art.js | 200 | Hardcoded skull, responsive scaling |
| CSS Framework | ascii-art.css | 963 | 50+ animation/decoration classes, CRT glow |
| Design Tokens | variables.css | - | `--ascii-font-family`, color system |

All render to `<pre>` or `<span>` with `text-shadow` glow. **This is the exact rendering approach we need.**

---

## Implementation Recommendations

### Architecture: `js/components/asciiEngine.js`

```
AsciiEngine
├── imageToAscii(img, options)     — Canvas → grayscale → char mapping
├── imageToColor(img, options)     — Canvas → RGB → colored <span>s
├── imageToBraille(img, options)   — Canvas → threshold/dither → braille
├── imageToBlocks(img, options)    — Canvas → block characters
├── textToAscii(text, font)       — FIGlet font rendering
├── edgeDetect(img, options)       — Sobel → directional chars
├── applyDithering(data, algo)     — Floyd-Steinberg / Bayer / Atkinson
└── webcamToAscii(videoEl, opts)   — Real-time video stream
```

### Rendering Modes
1. **Classic** — Standard brightness→character mapping
2. **Color** — RGB-preserved characters in colored spans
3. **Braille** — High-res Unicode braille patterns
4. **Blocks** — Unicode block elements (░▒▓█)
5. **Edge** — Sobel edge detection with directional chars
6. **Mixed** — Edge detection + brightness fill

### Options
```javascript
{
  width: 120,           // output columns
  mode: 'classic',      // classic|color|braille|blocks|edge|mixed
  ramp: 'standard',     // standard|short|blocks|custom
  invert: true,         // for dark backgrounds
  dithering: 'none',    // none|floyd-steinberg|bayer|atkinson
  aspectRatio: 0.5,     // char height/width correction
  colorMode: 'none',    // none|fg|bg|both
  animate: false,       // CRT/glitch effects
}
```

### Quick Start
1. Create `asciiEngine.js` with Canvas-based core algorithm
2. Add FIGlet text rendering (bundle 4-5 thematic fonts)
3. Wire into existing CSS framework (ascii-art.css already has animations)
4. Add UI: file upload → preview → ASCII output with mode toggles
5. Optional: webcam mode with Web Worker

### Common Pitfalls
- **Forgetting aspect ratio correction** — output looks vertically stretched
- **Wrong ramp direction** — dark bg needs inverted ramp
- **DOM thrashing** — build full HTML string first, set innerHTML once
- **Cross-origin images** — Canvas getImageData fails on CORS images; need crossorigin attribute
- **Braille bit ordering** — NOT sequential; historical dot numbering
- **Font rendering differences** — character densities vary across fonts; test with target monospace font

---

## References

- [Jonathan Petitcolas — Image to ASCII Art](https://www.jonathan-petitcolas.com/2017/12/28/converting-image-to-ascii-art.html)
- [Marmelab — ASCII Art with Pure JavaScript](https://marmelab.com/blog/2018/02/20/convert-image-to-ascii-art-masterpiece.html)
- [Paul Bourke — ASCII Art Algorithms](http://www.jave.de/image2ascii/algorithms.html)
- [figlet.js — Browser FIGlet](https://www.npmjs.com/package/figlet)
- [Braille ASCII Art Generator](https://lachlanarthur.github.io/Braille-ASCII-Art/)
- [Dernocua — Unicode Graphics](https://dernocua.github.io/notes/unicode-graphics.html)
- [web.dev — OffscreenCanvas](https://web.dev/articles/offscreen-canvas)
- [Asciimatic — Edge Detection ASCII](https://github.com/dijkstracula/Asciimatic)
- [aalib.js — ASCII Art Library](http://mir3z.github.io/aalib.js/)
- [idevelop/ascii-camera — Webcam ASCII](https://github.com/idevelop/ascii-camera)
- [Wikipedia — Floyd-Steinberg Dithering](https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering)
- [Wikipedia — Braille Patterns](https://en.wikipedia.org/wiki/Braille_Patterns)

---

## Unresolved Questions

1. Should we bundle FIGlet fonts as .flf files or pre-convert to JSON for faster loading?
2. Should the webcam mode use Web Worker or is requestAnimationFrame sufficient for the target resolution?
3. Should we add a custom density ramp builder (render each char to canvas, measure pixel fill)?
4. Do we want WebGL shader mode for maximum performance, or is Canvas 2D sufficient?
