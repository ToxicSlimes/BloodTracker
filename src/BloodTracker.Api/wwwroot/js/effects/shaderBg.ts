/**
 * Atmospheric Dungeon Background Shader.
 * ENHANCES (not replaces) existing effects. Sits at z-index:0 behind:
 *   - matrix-runes canvas (z:1)
 *   - CRT scanlines (z:2)
 *   - torches, runes, sparks (z:50-100)
 *   - noise/vignette/flicker overlays (z:9997-9999)
 *
 * Features: animated fog wisps, subtle stone texture, warm torch glow pools,
 *           faint primary-color ambiance, film grain.
 */

import { ShaderEngine } from './shaderEngine.js'

// ── Fragment Shader (GLSL ES 1.0) ─────────────────────────────────────────────

const DUNGEON_BG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

uniform float iTime;
uniform vec2  iResolution;
uniform vec3  uColor;

// ── Hash / Noise ───────────────────────────────────────────────────────────────

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float f = 0.0;
    f += 0.5000 * noise(p); p *= 2.02;
    f += 0.2500 * noise(p); p *= 2.03;
    f += 0.1250 * noise(p); p *= 2.01;
    f += 0.0625 * noise(p);
    return f / 0.9375;
}

// ── Brick Wall ─────────────────────────────────────────────────────────────────

// Returns: x = brick mask (1 = brick surface, 0 = mortar), y = brick ID hash
vec2 brickPattern(vec2 uv, float cols, float rows) {
    vec2 brickUV = uv * vec2(cols, rows);

    // Offset every other row by half a brick
    float row = floor(brickUV.y);
    brickUV.x += step(1.0, mod(row, 2.0)) * 0.5;

    vec2 brickId = floor(brickUV);
    vec2 cell = fract(brickUV);

    // Mortar gaps — thin dark lines between bricks
    float mortarW = 0.06; // mortar width
    float mx = smoothstep(0.0, mortarW, cell.x) * smoothstep(1.0, 1.0 - mortarW, cell.x);
    float my = smoothstep(0.0, mortarW * 1.5, cell.y) * smoothstep(1.0, 1.0 - mortarW * 1.5, cell.y);
    float mortar = mx * my;

    // Per-brick random variation
    float brickHash = hash(brickId);

    return vec2(mortar, brickHash);
}

// ── Main ───────────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    // 1. Base dungeon color — matches CSS --bg (#2E222F)
    vec3 base = vec3(0.180, 0.133, 0.184);
    vec3 col = base;

    // 2. BRICK WALL — dungeon crawler style
    vec2 wallUV = uv * vec2(aspect, 1.0);
    vec2 brick = brickPattern(wallUV, 12.0, 24.0);
    float brickMask = brick.x;
    float brickId = brick.y;

    // Brick surface color — varies per brick (dark purples/browns)
    vec3 brickColor = base + vec3(0.04, 0.02, 0.04) * (brickId - 0.5);
    // Some bricks slightly lighter, some darker
    brickColor += vec3(0.02, 0.01, 0.02) * (hash(vec2(brickId * 7.3, brickId * 13.1)) - 0.5);

    // Brick surface noise — weathered texture on each brick
    float brickNoise = noise(wallUV * 30.0 + brickId * 100.0) * 0.03;
    brickColor += vec3(brickNoise);

    // Mortar color — darker than bricks
    vec3 mortarColor = base * 0.6;

    // Combine brick + mortar
    col = mix(mortarColor, brickColor, brickMask);

    // Weathering/damage — random dark spots
    float damage = fbm(wallUV * 8.0 + 10.0);
    col -= vec3(0.02) * smoothstep(0.55, 0.65, damage);

    // Moss/green tint on some bricks near bottom
    float moss = fbm(wallUV * 6.0 + 5.0) * smoothstep(0.4, 0.0, uv.y);
    col += uColor * moss * 0.04 * brickMask;

    // 3. Animated fog wisps — two layers, opposite directions
    float t = iTime * 0.05;

    vec2 fogUV1 = uv * vec2(aspect * 2.0, 1.5);
    fogUV1.x += t;
    float fog1 = fbm(fogUV1 + fbm(fogUV1 + t * 0.3));

    vec2 fogUV2 = uv * vec2(aspect * 1.5, 2.0);
    fogUV2.x -= t * 0.7;
    fogUV2.y += t * 0.3;
    float fog2 = fbm(fogUV2 + fbm(fogUV2 - t * 0.2));

    float fogVal = (fog1 + fog2) * 0.5;
    // Fog tinted with primary color — clearly visible
    col += uColor * fogVal * 0.045;
    col += vec3(0.01, 0.02, 0.015) * fogVal;

    // Ground fog — thicker at the bottom
    float groundFog = fogVal * smoothstep(0.5, 0.0, uv.y) * 0.06;
    col += uColor * groundFog;

    // 4. Torch warm glow — radial light pools at left & right edges
    vec2 tL = vec2(0.02, 0.5);
    vec2 tR = vec2(0.98, 0.5);

    vec2 dL = (uv - tL) * vec2(aspect, 1.0);
    float distL = length(dL);
    float pL = 1.0 + 0.2 * sin(iTime * 2.0) * sin(iTime * 1.3 + 0.5);
    float gL = 0.025 * pL / (distL * distL + 0.008);

    vec2 dR = (uv - tR) * vec2(aspect, 1.0);
    float distR = length(dR);
    float pR = 1.0 + 0.2 * sin(iTime * 2.0 + 1.0) * sin(iTime * 1.5);
    float gR = 0.025 * pR / (distR * distR + 0.008);

    vec3 warm = vec3(1.0, 0.5, 0.12);
    col += warm * clamp(gL, 0.0, 0.5) * 0.35;
    col += warm * clamp(gR, 0.0, 0.5) * 0.35;

    // 5. Animated film grain
    float grain = hash(uv * iResolution.xy + fract(iTime * 5.0) * 137.0);
    col += (grain - 0.5) * 0.018;

    // 6. Edge darkening — dungeon frame
    float edge = smoothstep(0.0, 0.25, uv.x) * smoothstep(0.0, 0.25, 1.0 - uv.x);
    edge *= smoothstep(0.0, 0.2, uv.y) * smoothstep(0.0, 0.2, 1.0 - uv.y);
    col *= 0.6 + edge * 0.4;

    gl_FragColor = vec4(col, 1.0);
}
`;

// ── State ─────────────────────────────────────────────────────────────────────

let engine: ShaderEngine | null = null
const LS_KEY = 'bt_shader_bg'

/** Check if user previously enabled/disabled the shader */
function getSavedPref(): boolean {
    const val = localStorage.getItem(LS_KEY)
    // Default: ON (true) if no preference saved
    return val === null ? true : val === '1'
}

function savePref(on: boolean): void {
    localStorage.setItem(LS_KEY, on ? '1' : '0')
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startShaderBg(): ShaderEngine | null {
    if (engine) return engine

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        console.log('[ShaderBg] Reduced motion — skipping')
        return null
    }

    if (!ShaderEngine.isSupported()) {
        console.log('[ShaderBg] WebGL not supported')
        return null
    }

    const canvas = document.createElement('canvas')
    canvas.id = 'shader-bg'

    engine = new ShaderEngine(canvas, DUNGEON_BG, {
        zIndex: 0,
        pointerEvents: false,
        scale: ShaderEngine.isMobile() ? 0.3 : 0.5,
        targetFPS: ShaderEngine.isMobile() ? 20 : 30,
    })

    if (!engine.gl) {
        engine = null
        return null
    }

    document.body.prepend(canvas)
    document.body.classList.add('shader-bg-active')
    engine.start()

    console.log('[ShaderBg] Dungeon atmosphere active')
    return engine
}

export function stopShaderBg(): void {
    if (engine) {
        document.body.classList.remove('shader-bg-active')
        engine.destroy()
        engine = null
    }
}

export function isShaderBgActive(): boolean {
    return engine !== null && engine.running
}

/** Toggle shader on/off + persist preference + update button text */
export function toggleShaderBg(): boolean {
    if (isShaderBgActive()) {
        stopShaderBg()
        savePref(false)
        updateToggleBtn(false)
        return false
    } else {
        startShaderBg()
        const active = isShaderBgActive()
        savePref(active)
        updateToggleBtn(active)
        return active
    }
}

/** Init: start shader if user pref allows and WebGL available */
export function initShaderBg(): void {
    if (getSavedPref()) {
        startShaderBg()
    }
    updateToggleBtn(isShaderBgActive())
}

function updateToggleBtn(active: boolean): void {
    const btn = document.getElementById('shader-toggle-btn')
    if (!btn) return
    btn.textContent = active ? '[ ШЕЙДЕР: ON ]' : '[ ШЕЙДЕР: OFF ]'
    btn.classList.toggle('active', active)
}
