/**
 * CRT Post-Processing Overlay Shader.
 * Replaces: .flicker-overlay, .vignette-overlay, .noise-overlay, body.crt::before scanlines,
 *           .scanline-move::after moving scanline, chromatic aberration text-shadow.
 * Canvas sits at z-index: 9990 with pointer-events: none.
 */

import { ShaderEngine } from './shaderEngine.js'

// ── Fragment Shader (GLSL ES 1.0) ─────────────────────────────────────────────

const CRT_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

uniform float iTime;
uniform vec2  iResolution;
uniform vec3  uColor;

// ── Noise ──────────────────────────────────────────────────────────────────────

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// ── Barrel Distortion ──────────────────────────────────────────────────────────

vec2 barrelDistort(vec2 uv, float amt) {
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc);
    return uv + cc * dist * amt;
}

// ── Scanlines ──────────────────────────────────────────────────────────────────

float scanlines(vec2 uv, float count, float intensity) {
    float sl = sin(uv.y * count * 3.14159) * 0.5 + 0.5;
    return mix(1.0, sl, intensity);
}

// ── Moving Scanline (sweeps top→bottom) ────────────────────────────────────────

float movingScanline(vec2 uv, float time) {
    float pos = fract(time * 0.125); // 8s full cycle
    float dist = abs(uv.y - (1.0 - pos));
    float line = smoothstep(0.01, 0.0, dist);
    return line * 0.4;
}

// ── Vignette ───────────────────────────────────────────────────────────────────

float vignette(vec2 uv, float radius, float softness) {
    vec2 d = uv - 0.5;
    float dist = length(d);
    return smoothstep(radius, radius - softness, dist);
}

// ── Chromatic Aberration ───────────────────────────────────────────────────────

vec3 chromatic(vec2 uv, float amount) {
    // Since this is a post-processing overlay (no scene texture),
    // we simulate chromatic aberration on the scanline/noise pattern
    float r = hash(uv + amount);
    float g = hash(uv);
    float b = hash(uv - amount);
    return vec3(r, g, b);
}

// ── Phosphor Grid ──────────────────────────────────────────────────────────────

float phosphorGrid(vec2 fragCoord) {
    vec2 p = mod(fragCoord, 3.0);
    float mask = 1.0;
    if (p.x < 1.0) mask = 0.85;
    else if (p.x < 2.0) mask = 1.0;
    else mask = 0.85;
    return mask;
}

// ── Main ───────────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    // Barrel distortion
    vec2 duv = barrelDistort(uv, 0.02);

    // Accumulate overlay effects
    float overlay = 0.0;
    vec3 tint = vec3(0.0);

    // 1. Scanlines (horizontal, ~scanline per 3px)
    float scanCount = iResolution.y / 3.0;
    float sl = scanlines(duv, scanCount, 0.12);

    // 2. Moving scanline beam
    float beam = movingScanline(duv, iTime);

    // 3. Noise (animated)
    float n = hash(duv * iResolution.xy * 0.01 + fract(iTime * 7.0)) * 0.06;

    // 4. Flicker (subtle brightness oscillation)
    float flicker = 1.0 + 0.015 * sin(iTime * 60.0) * sin(iTime * 13.7);

    // 5. Vignette
    float vig = vignette(duv, 0.75, 0.45);

    // 6. Phosphor grid pattern
    float phosphor = phosphorGrid(gl_FragCoord.xy);

    // Compose: darken via multiplicative overlay
    float darkness = sl * vig * phosphor * flicker;
    darkness = darkness - n; // noise slightly eats into brightness

    // Moving beam adds colored tint using primary color
    tint += uColor * beam * 0.5;

    // Final output: mostly transparent dark overlay
    // alpha = how much to darken the scene underneath
    float alpha = 1.0 - darkness;
    alpha = clamp(alpha, 0.0, 0.6);

    gl_FragColor = vec4(tint, alpha);
}
`;

// ── Initialization ─────────────────────────────────────────────────────────────

let engine: ShaderEngine | null = null

export function startShaderPost(): ShaderEngine | null {
    if (engine) return engine

    // Respect reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        console.log('[ShaderPost] Reduced motion — skipping CRT overlay')
        return null
    }

    if (!ShaderEngine.isSupported()) {
        console.log('[ShaderPost] WebGL not supported — keeping CSS fallbacks')
        return null
    }

    const canvas = document.createElement('canvas')
    canvas.id = 'shader-post'

    engine = new ShaderEngine(canvas, CRT_FRAG, {
        zIndex: 9990,
        pointerEvents: false,
        scale: ShaderEngine.isMobile() ? 0.35 : 0.5, // CRT overlay can be low-res
        targetFPS: 30, // 30fps is plenty for CRT overlay
    })

    if (!engine.gl) {
        engine = null
        return null
    }

    // Enable blending so the overlay composites with the page
    const gl = engine.gl
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    document.body.appendChild(canvas)
    engine.start()

    console.log('[ShaderPost] CRT overlay active')
    return engine
}

export function stopShaderPost(): void {
    if (engine) {
        engine.destroy()
        engine = null
    }
}

export function isShaderPostActive(): boolean {
    return engine !== null && engine.running
}
