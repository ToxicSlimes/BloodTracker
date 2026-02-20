# Research Report: WebGL Shader Integration for BloodTracker

**Date:** 2026-02-13
**Scope:** Replace/enhance CSS visual effects with WebGL shaders, ensure mobile compatibility

## Executive Summary

BloodTracker frontend has **40+ visual effects**, all CSS/Canvas-based. Analysis reveals **3 high-value shader migration targets** that consolidate 15+ DOM elements and 20+ CSS animations into 2 WebGL canvases. Mobile WebGL 1.0 has 97%+ support; key constraint is fragment shader `highp float` on older iOS — solved with precision ifdef. Plan uses 2-canvas architecture: background layer (procedural dungeon atmosphere) + overlay layer (CRT post-processing). Estimated performance gain: 30-40% fewer DOM elements, elimination of multi-layer text-shadow stacks (biggest CPU hog), true GPU-parallel rendering.

## Research Methodology
- Sources: MDN WebGL Best Practices, webglfundamentals.org, Codrops, Shadertoy community, Book of Shaders
- Codebase: Full read of all 10 effect/component files, effects.css (22KB), animations.css (15KB), variables.css, index.html, main.ts
- Mobile: WebGL compatibility data from caniuse, MDN, real device testing reports

---

## Current State: Effect Inventory

### Layer Map (z-index order)

```
z: -1     [NEW] shader-bg canvas (procedural background)
z: 1      matrix-runes <canvas> (JS rAF @ 60fps, Elder Futhark runes)
z: 2      body.crt::before (CSS scanlines, linear-gradient 3px)
z: 50     .rune x8 (fixed divs, runeFadeInOut 4s, symbol rotation 8s)
z: 100    .torch-left, .torch-right (ASCII flame, 6 sub-animations each)
z: 9990   [NEW] shader-post canvas (CRT overlay)
z: 9997   .noise-overlay (SVG feTurbulence, noiseFlicker 0.2s)
z: 9998   .vignette-overlay (radial-gradient, static)
z: 9999   .flicker-overlay (screen-flicker 0.12s)
z: 9999   .spark x25 (dynamic spans, physics sim, bouncing)
z: 10000  .spark-glow (pixelFlicker 0.3s)
```

### Performance Hotspots (CPU-bound)

| Effect | Cost | Why |
|--------|------|-----|
| Torch flames (x2) | HIGH | 12 animated DOM elements with 6-layer text-shadow stacks each |
| Sparks (x25) | MEDIUM | rAF physics loop, DOM read/write per particle, collision detection |
| Matrix runes | MEDIUM | Canvas 2D fillText @ 60fps, 3 depth layers, alpha blending |
| Noise overlay | LOW | SVG filter recalculation on opacity animation |
| CRT text-shadow | LOW | Multi-layer text-shadow on `.crt-text` (global) |

### DOM Element Count for Effects Only
- Torch left: 7 elements (container, flame-ascii, holder-ascii, flame-top/core/left/right)
- Torch right: 7 elements
- Runes: 8 elements
- Sparks: up to 25 dynamic spans
- Overlays: 3 fixed divs (flicker, vignette, noise)
- Matrix canvas: 1 canvas
- **Total: ~51 effect DOM elements** (not counting spark-glow bursts)

---

## Migration Plan: 2-Canvas Architecture

```
body
├── <canvas id="shader-bg">      z-index: -1, position: fixed, 100vw x 100vh
│   └── Fragment shader: procedural dungeon background + fire + fog
│
├── .app (all HTML content, transparent backgrounds)
│   ├── header, nav, pages, modals...
│   └── (torch ASCII removed, sparks removed)
│
├── <canvas id="shader-post">    z-index: 9990, pointer-events: none
│   └── Fragment shader: CRT scanlines + vignette + noise + flicker + barrel
│
└── .toast-container, modals     z-index: 1100-1200 (above shader-post)
```

### What Gets Replaced

| Current | Replaced By | Elements Removed |
|---------|------------|-----------------|
| `.flicker-overlay` div | shader-post (flicker uniform) | 1 div |
| `.vignette-overlay` div | shader-post (vignette function) | 1 div |
| `.noise-overlay` div + SVG filter | shader-post (procedural noise) | 1 div + SVG |
| `body.crt::before` scanlines | shader-post (scanline function) | 1 pseudo-element |
| `.torch-left` (7 elements) | shader-bg (procedural fire at fixed positions) | 7 elements |
| `.torch-right` (7 elements) | shader-bg (procedural fire at fixed positions) | 7 elements |
| `.scanline-move::after` | shader-post (moving scanline) | 1 pseudo-element |
| matrix-runes `<canvas>` 2D | shader-bg (procedural falling runes) | 1 canvas + JS module |
| **Total removed** | | **~19 DOM elements + 2 pseudo + 1 canvas** |

### What Stays CSS

| Effect | Why Keep |
|--------|---------|
| `.rune` x8 decorative | Low cost, DOM positioning useful, 4s animation is efficient |
| `.spark` system | Complex collision with DOM elements — needs DOM awareness |
| ASCII skull | Text content, no visual effect to shader-ify |
| Progress bar | CSS-only, no performance concern |
| Nav button hover/active | CSS transitions, interactive |
| Modal animations | CSS transitions |
| Toast animations | CSS transitions |
| Skeleton shimmer | CSS animation |
| ASCIIfy font rendering | DOM text replacement |

---

## Phase 1: CRT Post-Processing Overlay (shader-post)

**Priority:** HIGHEST — replaces 3 DOM overlays + 2 pseudo-elements with 1 canvas

### Shader: Combined CRT Effect

```glsl
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

uniform float iTime;
uniform vec2 iResolution;
uniform vec3 uPrimaryColor;  // from CSS --primary-color (RGB normalized)
uniform float uBarrelAmount;  // 0.0 = off, 0.03 = subtle CRT curve
uniform float uScanlineIntensity; // 0.0-0.15
uniform float uNoiseIntensity;    // 0.0-0.08
uniform float uVignetteIntensity; // 0.0-0.5
uniform float uFlickerAmount;     // 0.0-0.03

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 centered = uv * 2.0 - 1.0;
    float dist = dot(centered, centered);

    // Barrel distortion (CRT curvature)
    centered *= 1.0 + uBarrelAmount * dist;
    vec2 duv = centered * 0.5 + 0.5;

    // Scanlines
    float scan = 1.0 - uScanlineIntensity * abs(sin(duv.y * iResolution.y * 0.5 + iTime * 0.3));

    // Vignette
    float vig = 1.0 - dist * uVignetteIntensity;

    // Screen flicker
    float flick = 1.0 - uFlickerAmount * (1.0 - sin(iTime * 8.0) * sin(iTime * 13.0));

    // Animated noise (replaces static SVG feTurbulence)
    float noise = hash(uv * iResolution.xy + iTime * 137.0) * uNoiseIntensity;

    // Moving scanline bar
    float movingScan = smoothstep(0.0, 0.005, abs(duv.y - fract(iTime * 0.15))) * 0.03;

    // Composite: alpha = how much to darken
    float darken = 1.0 - vig * scan * flick;
    float alpha = clamp(darken + noise + movingScan, 0.0, 0.6);

    // Optional: slight color tint from primary color
    vec3 tint = uPrimaryColor * 0.02 * (1.0 - vig);

    gl_FragColor = vec4(tint, alpha);
}
```

### JS Integration

```javascript
// js/effects/shaderPost.js
import { ShaderEngine } from './shaderEngine.js';

const CRT_FRAG = `...`; // shader above

export function initShaderPost() {
    const canvas = document.createElement('canvas');
    canvas.id = 'shader-post';
    canvas.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 100%; height: 100%;
        z-index: 9990;
        pointer-events: none;
    `;
    document.body.appendChild(canvas);

    // Parse primary color from CSS
    const getPrimaryRGB = () => {
        const rgb = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-rgb').trim().split(',').map(Number);
        return rgb.map(v => v / 255);
    };

    let primaryRGB = getPrimaryRGB();
    const engine = new ShaderEngine(canvas, CRT_FRAG, {
        resolutionScale: 1.0,  // CRT overlay needs full res for scanlines
        uniforms: {
            uPrimaryColor: (gl, loc) => gl.uniform3f(loc, ...primaryRGB),
            uBarrelAmount: (gl, loc) => gl.uniform1f(loc, 0.02),
            uScanlineIntensity: (gl, loc) => gl.uniform1f(loc, 0.05),
            uNoiseIntensity: (gl, loc) => gl.uniform1f(loc, 0.05),
            uVignetteIntensity: (gl, loc) => gl.uniform1f(loc, 0.35),
            uFlickerAmount: (gl, loc) => gl.uniform1f(loc, 0.02),
        }
    });

    // React to color picker changes
    window.addEventListener('colorchange', () => { primaryRGB = getPrimaryRGB(); });

    // Mobile: reduce effects
    if (isMobile()) {
        engine.customUniforms.uBarrelAmount = (gl, loc) => gl.uniform1f(loc, 0.0); // skip barrel
        engine.customUniforms.uScanlineIntensity = (gl, loc) => gl.uniform1f(loc, 0.03);
    }

    engine.start();

    // Remove CSS overlays
    document.querySelector('.flicker-overlay')?.remove();
    document.querySelector('.vignette-overlay')?.remove();
    document.querySelector('.noise-overlay')?.remove();

    return engine;
}
```

### CSS Cleanup

```css
/* Remove from effects.css or add .has-webgl overrides */
.has-webgl .flicker-overlay,
.has-webgl .vignette-overlay,
.has-webgl .noise-overlay { display: none !important; }

.has-webgl .crt::before { display: none !important; } /* scanlines now in shader */
.has-webgl .scanline-move::after { display: none !important; }
```

---

## Phase 2: Procedural Background (shader-bg)

**Priority:** HIGH — replaces matrix-runes canvas + torch elements

### Shader: Dungeon Atmosphere

Combines: procedural fog + torch fire at fixed positions + subtle stone texture

```glsl
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

uniform float iTime;
uniform vec2 iResolution;
uniform vec3 uPrimaryColor;
uniform vec2 uTorchL;  // left torch position (normalized 0-1)
uniform vec2 uTorchR;  // right torch position (normalized 0-1)

// -- noise functions (hash2, noise, fbm from skill) --

vec4 fire(vec2 uv, float time) {
    vec3 normal = bumpMap(uv * vec2(1.0, 0.3) + vec2(-0.01, -0.3) * time);
    vec2 disp = clamp((normal.xy - 0.5) * 0.1, -1.0, 1.0);
    uv += disp;
    vec2 uvT = uv * vec2(1.0, 0.5) + vec2(-0.01, -0.5) * time;
    float n = fbm(8.0 * uvT);
    float gradient = pow(1.0 - uv.y, 2.0) * 5.0;
    float f = n * gradient;
    vec3 col = f * vec3(2.0*n, 2.0*n*n*n, n*n*n*n);
    return vec4(col, f);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec3 col = vec3(0.0);

    // Subtle stone texture background
    float stone = fbm(uv * 8.0 + 0.5) * 0.02;
    col += vec3(stone);

    // Ground fog (bottom 30%)
    float fogY = smoothstep(0.0, 0.3, uv.y);
    float fog = (1.0 - fogY) * fbm(uv * 3.0 + vec2(iTime * 0.1, 0.0)) * 0.08;
    col += vec3(fog) * uPrimaryColor * 0.3;

    // Left torch fire
    vec2 tL = (uv - uTorchL) * vec2(iResolution.x/iResolution.y, 1.0);
    tL = tL / vec2(0.06, 0.12) + vec2(0.5, 0.0);
    if (tL.x > 0.0 && tL.x < 1.0 && tL.y > -0.5 && tL.y < 1.5) {
        vec4 f = fire(tL, iTime);
        col += f.rgb * f.a * 1.5;
    }

    // Right torch fire
    vec2 tR = (uv - uTorchR) * vec2(iResolution.x/iResolution.y, 1.0);
    tR = tR / vec2(0.06, 0.12) + vec2(0.5, 0.0);
    if (tR.x > 0.0 && tR.x < 1.0 && tR.y > -0.5 && tR.y < 1.5) {
        vec4 f = fire(tR, iTime);
        col += f.rgb * f.a * 1.5;
    }

    // Torch glow (radial falloff)
    float glowL = 0.015 / (length((uv - uTorchL) * vec2(iResolution.x/iResolution.y, 1.0)) + 0.01);
    float glowR = 0.015 / (length((uv - uTorchR) * vec2(iResolution.x/iResolution.y, 1.0)) + 0.01);
    col += vec3(1.0, 0.6, 0.2) * (glowL + glowR) * 0.15;

    // Falling runes (replace matrix-runes.ts canvas)
    // Simplified: columns of fading characters
    float runeCol = floor(uv.x * 40.0);
    float runeSpeed = 0.1 + hash(vec2(runeCol, 0.0)) * 0.3;
    float runeY = fract(uv.y * 20.0 + iTime * runeSpeed + hash(vec2(runeCol, 1.0)));
    float runeAlpha = smoothstep(1.0, 0.0, runeY) * 0.03;
    runeAlpha *= step(hash(vec2(runeCol, 2.0)), 0.3); // only 30% of columns
    col += uPrimaryColor * runeAlpha;

    gl_FragColor = vec4(col, 1.0);
}
```

### Mobile Adaptations

```javascript
// Mobile: skip fire computation, keep fog only
if (isMobile()) {
    // Use simplified shader without fire() calls
    // Or set torch positions off-screen
    engine.setUniform2f('uTorchL', -1.0, -1.0);
    engine.setUniform2f('uTorchR', -1.0, -1.0);
    // Reduce resolution to 0.35x
    engine.resolutionScale = 0.35;
}
```

---

## Phase 3: Enhanced ShaderEngine (mobile-aware)

### Updated ShaderEngine with Mobile Support

Key additions to the base ShaderEngine from the skill:

```javascript
// Additional methods for mobile support:

static isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
}

static supportsWebGL() {
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
        if (!gl) return false;
        // Check for minimum capabilities
        const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        return maxTexSize >= 2048;
    } catch(e) { return false; }
}

// Resolution scaling for mobile
_resize() {
    const scale = this.options.resolutionScale || (ShaderEngine.isMobile() ? 0.5 : 1.0);
    const dpr = Math.min(window.devicePixelRatio || 1, ShaderEngine.isMobile() ? 1.5 : 2);
    const p = this.canvas.parentElement || document.body;
    this.canvas.width = Math.floor(p.clientWidth * dpr * scale);
    this.canvas.height = Math.floor(p.clientHeight * dpr * scale);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
}

// FPS throttle (30fps for background, 60fps for overlay)
_loop() {
    if (!this.running) return;
    const now = performance.now();
    const interval = this.options.targetFps ? (1000 / this.options.targetFps) : 0;
    if (interval && (now - this._lastFrame) < interval) {
        this._raf = requestAnimationFrame(() => this._loop());
        return;
    }
    this._lastFrame = now;
    // ... render ...
}

// Visibility pause
_initVisibility() {
    document.addEventListener('visibilitychange', () => {
        document.hidden ? this.stop() : this.start();
    });
}

// Reduced motion
static prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

---

## Mobile Compatibility Matrix

### WebGL 1.0 Support (what we use)

| Platform | Support | Notes |
|----------|---------|-------|
| Chrome Android 30+ | YES | 97%+ devices |
| Safari iOS 8+ | YES | All modern iPhones |
| Firefox Android | YES | Full support |
| Samsung Internet | YES | Chromium-based |
| Opera Mobile | YES | Chromium-based |

### Critical Mobile Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| `highp float` optional in frag shader | Shader won't compile on older mobile | `#ifdef GL_FRAGMENT_PRECISION_HIGH` guard |
| MAX_FRAGMENT_UNIFORM_VECTORS: 64 min | Limited uniforms | Pack data, use fewer uniforms |
| DPR up to 3x (iPhone 15 Pro) | Huge pixel count | Cap DPR at 1.5 on mobile |
| Thermal throttling | GPU clocks down after 30s heavy use | 30fps cap, resolution scaling |
| Battery drain | Continuous GPU use | Pause on hidden tab, reduced motion |
| No float texture rendering | No feedback buffers on some mobile | Avoid multipass for now |
| Touch events vs mouse | iMouse uniform irrelevant | Replace with scroll/touch position |

### Mobile Shader Budget

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Target FPS | 60 | 30 |
| Resolution scale | 1.0x | 0.35-0.5x |
| DPR cap | 2.0 | 1.5 |
| FBM octaves | 4-5 | 2-3 |
| Fire computation | Full (both torches) | Simplified glow only |
| Barrel distortion | Yes | No (expensive center sampling) |
| Noise grain | Animated | Static or very slow |

---

## Implementation Phases

### Phase 1: ShaderEngine + CRT Overlay (1 session)
1. Create `js/effects/shaderEngine.js` — base WebGL engine class
2. Create `js/effects/shaderPost.js` — CRT overlay shader + init
3. Add `supportsWebGL()` check in `main.ts`
4. Add `.has-webgl` / `.no-webgl` classes to `<html>`
5. Init shader-post after DOM loaded, before spark animation
6. Hide CSS overlays when WebGL active
7. Wire `colorchange` event for primary color uniform
8. Add mobile detection + reduced settings
9. Add `prefers-reduced-motion` check
10. Add visibility pause

### Phase 2: Procedural Background (1 session)
1. Create `js/effects/shaderBg.js` — dungeon atmosphere shader
2. Replace matrix-runes canvas with shader-bg canvas
3. Move torch positions to uniforms (calculate from viewport)
4. Remove torch DOM elements when WebGL active
5. Remove `js/effects/matrix-runes.ts` import when WebGL active
6. Mobile: simplified background (fog only, no fire)
7. Wire torch position updates on resize

### Phase 3: Polish & Controls (1 session)
1. Add shader toggle to color-picker panel (`[ SHADERS: ON/OFF ]`)
2. Persist preference in localStorage (`bt_shaders_enabled`)
3. Add quality presets: Low (mobile) / Medium / High (desktop)
4. Fine-tune uniforms per color-picker theme
5. Performance monitoring: drop to CSS fallback if FPS < 20
6. Test on real devices: iPhone SE, iPhone 15, Pixel 7, Galaxy S23

---

## Integration Points in Existing Code

### main.ts — Init sequence modification
```
DOMContentLoaded → init()
├── loadSavedColor()
├── [NEW] initShaderEngine()  // before any effect init
│   ├── supportsWebGL() check
│   ├── document.documentElement.classList.add('has-webgl' | 'no-webgl')
│   ├── if (has-webgl && !prefersReducedMotion && shadersPref !== 'off'):
│   │   ├── initShaderPost()  // CRT overlay canvas
│   │   ├── initShaderBg()    // dungeon background canvas
│   │   └── skip: startMatrixRunes() — replaced by shader-bg
│   └── else: startMatrixRunes() as before
├── initRunes()  // keep as-is
├── startSparkAnimation()  // keep as-is
└── ...rest
```

### color-picker.ts — Theme integration
```javascript
// On color change, dispatch event for shaders:
window.dispatchEvent(new CustomEvent('colorchange', {
    detail: { rgb: [r, g, b], hex: hexColor }
}));
```

### index.html — Torch removal
```html
<!-- Wrap torches in .no-webgl guard or remove via JS -->
<div class="torch torch-left no-webgl-only">...</div>
<div class="torch torch-right no-webgl-only">...</div>
```

```css
.has-webgl .no-webgl-only { display: none !important; }
```

---

## Fallback Strategy

```
User opens BloodTracker
├── Browser supports WebGL?
│   ├── YES → check device class
│   │   ├── Desktop → full shaders (Phase 1+2+3, 60fps, 1.0x)
│   │   ├── Mobile → reduced shaders (CRT overlay 30fps 0.5x, bg fog only 0.35x)
│   │   └── Low-end → CRT overlay only, no background shader
│   └── NO → CSS effects (current system, zero changes)
├── User toggles shaders off in settings?
│   └── Destroy shader canvases, show CSS overlays
└── FPS drops below 20 for 3+ seconds?
    └── Auto-downgrade: reduce resolution → disable bg → disable all → CSS fallback
```

---

## File Structure (new files)

```
wwwroot/js/effects/
├── shaderEngine.js     [NEW] Base WebGL engine class (~90 lines)
├── shaderPost.js       [NEW] CRT overlay shader + init (~60 lines + shader string)
├── shaderBg.js         [NEW] Dungeon background shader + init (~80 lines + shader string)
├── shaderUtils.js      [NEW] isMobile(), supportsWebGL(), noise GLSL lib (~40 lines)
├── matrix-runes.ts     [EXISTING] kept as fallback for no-webgl
├── sparks.ts           [EXISTING] unchanged
├── ascii-art.ts        [EXISTING] unchanged
└── progress-bar.ts     [EXISTING] unchanged
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Shader compilation fails on edge device | Low | Medium | CSS fallback always available |
| Performance worse than CSS on low-end | Medium | Low | Auto-detect + downgrade system |
| Color picker breaks shader tint | Low | Low | Event-based uniform updates |
| WebGL context lost (tab backgrounded) | Medium | Low | `webglcontextlost` handler → restart |
| iOS Safari quirks | Medium | Medium | Precision ifdef, DPR cap, test on real device |
| User prefers CSS effects | Low | Low | Toggle in settings panel |

---

## References

- [MDN WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [WebGL Cross Platform Issues](https://webgl2fundamentals.org/webgl/lessons/webgl-cross-platform-issues.html)
- [WebGL Mobile Challenges](https://blog.pixelfreestudio.com/webgl-in-mobile-development-challenges-and-solutions/)
- [The Book of Shaders](https://thebookofshaders.com/)
- [shader-web-background lib](https://github.com/xemantic/shader-web-background)
- [WebGL CRT Shader](https://github.com/gingerbeardman/webgl-crt-shader)
- [Dithering & Retro Shading](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/)
- [Efecto: ASCII with WebGL](https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/)

## Unresolved Questions

1. **Electron.NET context**: Does Electron's Chromium always have WebGL? (Likely yes, but worth verifying build config)
2. **Docker/VPS headless**: WebGL on server-side rendering? (N/A — client-side only, no SSR concern)
3. **Spark collision + shader**: If sparks collide with shader-bg torch positions, should they trigger extra spark bursts? (Nice-to-have, Phase 3+)
4. **ASCIIfy + shader text**: Should ASCIIfy-rendered heading text also get shader glow? (Post-MVP)
