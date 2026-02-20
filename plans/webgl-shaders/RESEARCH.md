# WebGL Shaders для BloodTracker — Полный Research

## Содержание
1. [Зачем шейдеры?](#1-зачем-шейдеры)
2. [Архитектура: как это работает в вебе](#2-архитектура)
3. [GLSL — основы языка шейдеров](#3-glsl-основы)
4. [Boilerplate: vanilla WebGL без фреймворков](#4-boilerplate)
5. [Библиотека shader-web-background](#5-shader-web-background)
6. [Каталог шейдерных техник](#6-каталог-техник)
7. [Что перевести с CSS на шейдеры](#7-миграция-css-на-шейдеры)
8. [Новые шейдерные эффекты для BloodTracker](#8-новые-эффекты)
9. [Производительность и оптимизация](#9-производительность)
10. [Инструменты разработки](#10-инструменты)
11. [Источники](#11-источники)

---

## 1. Зачем шейдеры?

### Текущая ситуация BloodTracker
Все визуальные эффекты — **100% CSS-based**:
- Scanlines — `linear-gradient` с 3px шагом, анимация `scanlineMove` (8s)
- Flicker — `screen-flicker` (0.12s, 7 шагов opacity 94-98%)
- Vignette — `radial-gradient` (ellipse) с `mix-blend-mode: multiply`
- Noise — SVG `feTurbulence` (статичный, opacity 15%)
- Glitch — `clip-path polygon` + `::before/::after` псевдо-элементы
- Chromatic Aberration — CSS `filter: blur() contrast()` с анимацией
- Torch flames — 6+ анимированных ASCII-элементов с `text-shadow` stack
- Glow — многослойный `text-shadow` (0 0 10px → 0 0 45px)

### Что дают шейдеры
| CSS-эффект | Shader-эквивалент |
|---|---|
| Статичный SVG noise | Анимированный procedural Perlin/Simplex noise |
| linear-gradient scanlines | Субпиксельные scanlines с phosphor glow decay |
| blur() chromatic aberration | Настоящее RGB channel separation |
| clip-path glitch | Texture-based distortion с noise displacement |
| Фиксированный vignette | Динамический vignette с barrel distortion |
| text-shadow glow | Bloom post-processing с threshold + gaussian blur |
| ASCII-символы пламени | Procedural fluid fire simulation |
| — | CRT phosphor grid (RGB subcells) |
| — | Ray-marched 3D dungeon scenes |
| — | Heat distortion / haze |
| — | Blood/liquid simulation |

**Ключевой бонус**: всё рендерится на GPU параллельно для каждого пикселя. Один shader может заменить 5-6 CSS-анимаций с лучшей производительностью и визуальным качеством.

---

## 2. Архитектура

### Как шейдеры работают в браузере

```
HTML <canvas> → WebGL Context → GPU Pipeline
                                    ├── Vertex Shader (позиционирование геометрии)
                                    └── Fragment Shader (цвет каждого пикселя)
```

**Для fullscreen-эффектов** нужен только fragment shader на полноэкранном квадрате (2 треугольника):

```
┌──────────────────────┐
│ Vertex (-1,-1)       │ Vertex (1,1)
│                      │
│   Каждый пиксель     │
│   обрабатывается     │
│   fragment shader'ом │
│                      │
│ Vertex (-1,1)        │ Vertex (1,-1)
└──────────────────────┘
```

### Два подхода интеграции для BloodTracker

**Подход A: Shader как фон (background layer)**
```
body
├── <canvas id="shader-bg"> (z-index: -1, position: fixed, fullscreen)
│   └── WebGL renders procedural background (noise, fire, particles)
├── .app (existing HTML content — transparent background)
├── <canvas id="shader-post"> (z-index: 9990, pointer-events: none)
│   └── WebGL reads screen → applies CRT/bloom/distortion post-processing
└── overlays (toast, modal — above shader layer)
```

**Подход B: Post-processing overlay (рендерим HTML → текстура → шейдер)**
- Более сложный: нужно копировать DOM в текстуру (canvas2d → WebGL)
- Или использовать `html2canvas` → texture → shader post-processing
- Производительность хуже из-за копирования

**Рекомендация**: Подход A — два отдельных canvas, один для фона, один для overlay-эффектов.

---

## 3. GLSL — основы языка шейдеров

### Типы данных
```glsl
float x = 1.0;           // скаляр (ОБЯЗАТЕЛЬНО с точкой!)
vec2  uv = vec2(0.5, 0.5);  // 2D вектор (UV-координаты, позиция)
vec3  color = vec3(1.0, 0.0, 0.0);  // RGB цвет или 3D позиция
vec4  rgba = vec4(1.0, 0.0, 0.0, 1.0);  // RGBA или позиция+w
mat2  m = mat2(1.0, 0.0, 0.0, 1.0);  // 2x2 матрица
mat3  m3 = mat3(...);     // 3x3
mat4  m4 = mat4(...);     // 4x4
bool  flag = true;
int   i = 0;
sampler2D tex;            // текстура
```

### Swizzling (доступ к компонентам)
```glsl
vec4 c = vec4(1.0, 0.5, 0.3, 1.0);
c.rgb   // vec3(1.0, 0.5, 0.3)
c.rg    // vec2(1.0, 0.5)
c.r     // float 1.0
c.xy    // то же, что c.rg (x,y,z,w = r,g,b,a = s,t,p,q)
c.yx    // vec2(0.5, 1.0) — перевернуть!
c.xxx   // vec3(1.0, 1.0, 1.0)
```

### Uniforms (данные из JavaScript → shader)
```glsl
uniform float iTime;        // время в секундах
uniform vec2  iResolution;  // размер canvas в пикселях
uniform vec2  iMouse;       // позиция мыши в пикселях
uniform sampler2D iChannel0; // текстура
```

### Встроенные переменные
```glsl
gl_FragCoord.xy  // координата текущего пикселя (в пикселях, от левого нижнего угла)
gl_FragColor     // выходной цвет (WebGL 1)
```

### Ключевые встроенные функции
```glsl
// Математика
mix(a, b, t)           // линейная интерполяция: a*(1-t) + b*t
smoothstep(edge0, edge1, x)  // плавный 0→1 переход
step(edge, x)          // x < edge ? 0.0 : 1.0
clamp(x, min, max)     // ограничить диапазон
fract(x)               // дробная часть (x - floor(x))
mod(x, y)              // остаток от деления
abs(x), sign(x)        // модуль, знак
pow(x, y)              // возведение в степень
sqrt(x), inversesqrt(x)
exp(x), log(x)
min(a, b), max(a, b)

// Тригонометрия
sin(x), cos(x), tan(x)
asin(x), acos(x), atan(y, x)

// Векторы
length(v)              // длина вектора
distance(a, b)         // расстояние между точками
normalize(v)           // единичный вектор
dot(a, b)              // скалярное произведение
cross(a, b)            // векторное произведение (vec3)
reflect(I, N)          // отражение
refract(I, N, eta)     // преломление

// Текстуры
texture2D(sampler, uv) // чтение текстуры по UV-координатам
```

### Паттерн нормализации координат
```glsl
void main() {
    // Нормализуем координаты в [0, 1]
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    // Или в [-1, 1] с учётом aspect ratio
    vec2 p = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;

    gl_FragColor = vec4(uv.x, uv.y, 0.0, 1.0);  // gradient test
}
```

---

## 4. Boilerplate: Vanilla WebGL (без Three.js)

### Минимальный WebGL Shader Engine для BloodTracker

```javascript
// js/effects/shaderEngine.js — Vanilla WebGL shader engine

export class ShaderEngine {
    constructor(canvas, fragmentShaderSource, options = {}) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!this.gl) {
            console.warn('WebGL not supported');
            return;
        }

        this.uniforms = {};
        this.customUniforms = options.uniforms || {};
        this.mouse = { x: 0, y: 0 };
        this.running = false;
        this.startTime = performance.now();

        this._initShaders(fragmentShaderSource);
        this._initGeometry();
        this._initUniforms();
        this._bindEvents();
    }

    // === Vertex Shader (всегда один и тот же для fullscreen) ===
    static VERTEX_SHADER = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    // === Компиляция шейдеров ===
    _compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    _initShaders(fragmentSource) {
        const gl = this.gl;
        const vs = this._compileShader(ShaderEngine.VERTEX_SHADER, gl.VERTEX_SHADER);
        const fs = this._compileShader(fragmentSource, gl.FRAGMENT_SHADER);
        if (!vs || !fs) return;

        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
            return;
        }
        gl.useProgram(this.program);
    }

    // === Fullscreen quad (2 треугольника покрывают весь экран) ===
    _initGeometry() {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1,  -1, 1,   // треугольник 1
            -1,  1,  1, -1,   1, 1    // треугольник 2
        ]), gl.STATIC_DRAW);

        const pos = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    }

    // === Стандартные uniforms ===
    _initUniforms() {
        const gl = this.gl;
        this.uniforms = {
            iTime: gl.getUniformLocation(this.program, 'iTime'),
            iResolution: gl.getUniformLocation(this.program, 'iResolution'),
            iMouse: gl.getUniformLocation(this.program, 'iMouse'),
        };
        // Кастомные uniforms
        for (const [name] of Object.entries(this.customUniforms)) {
            this.uniforms[name] = gl.getUniformLocation(this.program, name);
        }
    }

    _bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = rect.height - (e.clientY - rect.top) - 1;
        });

        // Resize observer
        this._resizeObserver = new ResizeObserver(() => this._resize());
        this._resizeObserver.observe(this.canvas.parentElement || document.body);
        this._resize();
    }

    _resize() {
        const dpr = window.devicePixelRatio || 1;
        const parent = this.canvas.parentElement || document.body;
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    // === Render loop ===
    start() {
        if (this.running) return;
        this.running = true;
        this._render();
    }

    stop() {
        this.running = false;
        if (this._raf) cancelAnimationFrame(this._raf);
    }

    _render() {
        if (!this.running) return;
        const gl = this.gl;
        const time = (performance.now() - this.startTime) / 1000;

        gl.uniform1f(this.uniforms.iTime, time);
        gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.uniforms.iMouse, this.mouse.x, this.mouse.y);

        // Обновить кастомные uniforms
        for (const [name, updater] of Object.entries(this.customUniforms)) {
            if (typeof updater === 'function') {
                updater(gl, this.uniforms[name], time);
            }
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this._raf = requestAnimationFrame(() => this._render());
    }

    // === Cleanup ===
    destroy() {
        this.stop();
        this._resizeObserver?.disconnect();
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
    }

    // === Утилита: обновить uniform извне ===
    setUniform1f(name, value) {
        this.gl.uniform1f(this.uniforms[name], value);
    }

    setUniform2f(name, x, y) {
        this.gl.uniform2f(this.uniforms[name], x, y);
    }

    setUniform3f(name, x, y, z) {
        this.gl.uniform3f(this.uniforms[name], x, y, z);
    }
}
```

### Использование в BloodTracker

```javascript
import { ShaderEngine } from './effects/shaderEngine.js';

// Создать canvas
const canvas = document.createElement('canvas');
canvas.id = 'shader-bg';
canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
document.body.prepend(canvas);

// Fragment shader
const fireShader = `
    precision highp float;
    uniform float iTime;
    uniform vec2 iResolution;

    void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        // ... shader code ...
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Запустить
const engine = new ShaderEngine(canvas, fireShader);
engine.start();
```

---

## 5. Библиотека shader-web-background

### Альтернативный подход: готовое решение

[shader-web-background](https://github.com/xemantic/shader-web-background) — минимальная библиотека (~5KB) для шейдерных фонов сайтов. Совместима с Shadertoy.

**Возможности:**
- Multipass rendering (BufferA → BufferB → Image)
- Floating-point текстуры 16-bit
- Feedback loops (шейдер читает свой предыдущий кадр)
- Автоматический WebGL 1/2 selection
- Shadertoy-compatible uniforms (iTime, iResolution, iMouse)
- Fallback на CSS для старых браузеров

```html
<!-- В <head> -->
<script src="shader-web-background.min.js"></script>

<!-- Fragment shader -->
<script type="x-shader/x-fragment" id="Image">
    precision highp float;
    uniform float iTime;
    uniform vec2 iResolution;

    void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
        gl_FragColor = vec4(col, 1.0);
    }
</script>

<script>
    shaderWebBackground.shade({
        shaders: {
            Image: {
                uniforms: {
                    iTime: (gl, loc) => gl.uniform1f(loc, performance.now() / 1000),
                    iResolution: (gl, loc, ctx) => gl.uniform2f(loc, ctx.width, ctx.height)
                }
            }
        }
    });
</script>
```

### Multipass пример (feedback loop для fluid simulation):
```javascript
shaderWebBackground.shade({
    shaders: {
        BufferA: {  // Симуляция (читает сам себя)
            uniforms: {
                iTime: (gl, loc) => gl.uniform1f(loc, performance.now() / 1000),
                iChannel0: (gl, loc, ctx) => ctx.texture(loc, ctx.buffers.BufferA)
            }
        },
        Image: {  // Финальный рендер (читает результат BufferA)
            uniforms: {
                iChannel0: (gl, loc, ctx) => ctx.texture(loc, ctx.buffers.BufferA)
            }
        }
    }
});
```

---

## 6. Каталог шейдерных техник

### 6.1. Procedural Noise (Процедурный шум)

#### Hash (псевдо-случайные числа)
```glsl
// Простой hash для 2D → скаляр
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Hash для 2D → vec2
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
```

#### Value Noise
```glsl
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);  // smoothstep

    return mix(
        mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
        u.y
    );
}
```

#### Simplex Noise (лучшее качество, меньше артефактов)
```glsl
float noise(in vec2 p) {
    const float K1 = 0.366025404;  // (sqrt(3)-1)/2
    const float K2 = 0.211324865;  // (3-sqrt(3))/6

    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    vec2 o = step(a.yx, a.xy);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;

    vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
    vec3 n = h*h*h*h * vec3(dot(a, hash2(i)), dot(b, hash2(i+o)), dot(c, hash2(i+1.0)));
    return dot(n, vec3(70.0));
}
```

#### Fractal Brownian Motion (FBM) — многослойный шум
```glsl
float fbm(vec2 p) {
    float f = 0.0;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);  // rotation matrix
    f  = 0.5000 * noise(p); p = m * p;
    f += 0.2500 * noise(p); p = m * p;
    f += 0.1250 * noise(p); p = m * p;
    f += 0.0625 * noise(p);
    return 0.5 + 0.5 * f;
}
```

### 6.2. CRT Effects

#### Scanlines
```glsl
// Простые scanlines
float scanline(vec2 uv, float time) {
    return sin(uv.y * iResolution.y * 0.7 + time * 2.0) * 0.04;
}

// Phosphor-row scanlines с decay
float phosphorScanline(vec2 uv) {
    float scan = sin(uv.y * iResolution.y * 3.14159) * 0.5 + 0.5;
    return pow(scan, 1.5) * 0.15 + 0.85;  // 85-100% brightness
}
```

#### Barrel Distortion (CRT выпуклость)
```glsl
vec2 barrelDistortion(vec2 uv, float distortion) {
    vec2 centered = uv * 2.0 - 1.0;
    float dist = dot(centered, centered);
    centered *= 1.0 + distortion * dist;
    return centered * 0.5 + 0.5;
}
```

#### Chromatic Aberration (разделение RGB каналов)
```glsl
vec3 chromaticAberration(sampler2D tex, vec2 uv, float amount) {
    float r = texture2D(tex, uv + vec2(amount, 0.0)).r;
    float g = texture2D(tex, uv).g;
    float b = texture2D(tex, uv - vec2(amount, 0.0)).b;
    return vec3(r, g, b);
}

// Без текстуры (применить к цвету через UV-shift):
vec3 chromaticAberrationColor(vec2 uv, float amount) {
    vec2 uvR = uv + vec2(amount, 0.0);
    vec2 uvB = uv - vec2(amount, 0.0);
    // Пересчитать цвет для смещённых UV...
    return vec3(colorAt(uvR).r, colorAt(uv).g, colorAt(uvB).b);
}
```

#### CRT Phosphor Grid (RGB субпиксели)
```glsl
vec3 crtPhosphorMask(vec2 fragCoord, float pixelSize) {
    vec2 coord = fragCoord / pixelSize;
    vec2 subcoord = coord * vec2(3.0, 1.0);
    vec2 cellOffset = vec2(0.0, mod(floor(coord.x), 3.0) * 0.5);

    float ind = mod(floor(subcoord.x), 3.0);
    vec3 mask = vec3(ind == 0.0, ind == 1.0, ind == 2.0) * 2.0;

    vec2 cellUv = fract(subcoord + cellOffset) * 2.0 - 1.0;
    float border = 0.8;
    vec2 edge = 1.0 - cellUv * cellUv * border;
    mask *= edge.x * edge.y;

    return mask;
}

// Применение:
// color.rgb *= crtPhosphorMask(gl_FragCoord.xy, 3.0);
```

#### Vignette
```glsl
float vignette(vec2 uv, float intensity) {
    uv = uv * 2.0 - 1.0;
    return 1.0 - dot(uv, uv) * intensity;
}
```

### 6.3. Procedural Fire / Flame

#### Полный fire shader
```glsl
#define timeScale       iTime * 1.0
#define fireMovement    vec2(-0.01, -0.5)
#define distMovement    vec2(-0.01, -0.3)
#define normalStrength  40.0
#define distStrength    0.1

vec3 bumpMap(vec2 uv) {
    vec2 s = 1.0 / iResolution.xy;
    float p =  fbm(uv);
    float h1 = fbm(uv + s * vec2(1.0, 0.0));
    float v1 = fbm(uv + s * vec2(0.0, 1.0));
    vec2 xy = (p - vec2(h1, v1)) * normalStrength;
    return vec3(xy + 0.5, 1.0);
}

vec4 fire(vec2 uv) {
    // Distortion displacement
    vec3 normal = bumpMap(uv * vec2(1.0, 0.3) + distMovement * timeScale);
    vec2 displacement = clamp((normal.xy - 0.5) * distStrength, -1.0, 1.0);
    uv += displacement;

    // Fire texture from noise
    vec2 uvT = (uv * vec2(1.0, 0.5)) + fireMovement * timeScale;
    float n = pow(fbm(8.0 * uvT), 1.0);

    // Gradient falloff (яркий внизу, затухает вверх)
    float gradient = pow(1.0 - uv.y, 2.0) * 5.0;
    float finalNoise = n * gradient;

    // Color mapping: красный яркий, зелёный меньше, синий минимум
    vec3 color = finalNoise * vec3(2.0*n, 2.0*n*n*n, n*n*n*n);
    return vec4(color, finalNoise);  // alpha = intensity
}
```

### 6.4. Dithering (ретро-пиксельный эффект)

#### Ordered Dithering (Bayer Matrix 4x4)
```glsl
float bayer4x4(vec2 uv) {
    // Bayer 4x4 threshold matrix
    int x = int(mod(uv.x, 4.0));
    int y = int(mod(uv.y, 4.0));

    // Матрица 4x4 упакована в массив
    float m[16];
    m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
    m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
    m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
    m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;

    return m[y * 4 + x] / 16.0;
}

vec3 orderedDither(vec2 fragCoord, vec3 color, float colorLevels) {
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    float threshold = bayer4x4(fragCoord);

    color.rgb += (threshold - 0.5) * (1.0 / colorLevels);
    color.r = floor(color.r * colorLevels + 0.5) / colorLevels;
    color.g = floor(color.g * colorLevels + 0.5) / colorLevels;
    color.b = floor(color.b * colorLevels + 0.5) / colorLevels;

    return color;
}
```

#### Color Palette Quantization (GameBoy style)
```glsl
vec3 quantizeToPalette(vec3 color, float numColors) {
    return floor(color * (numColors - 1.0) + 0.5) / (numColors - 1.0);
}

// Кастомная палитра (dungeon theme)
vec3 dungeonPalette(float lum) {
    vec3 colors[4];
    colors[0] = vec3(0.05, 0.05, 0.05);   // void black
    colors[1] = vec3(0.10, 0.06, 0.12);   // crypt purple
    colors[2] = vec3(0.29, 0.22, 0.07);   // torch gold dim
    colors[3] = vec3(0.29, 0.95, 0.15);   // phosphor green

    float idx = lum * 3.0;
    int i = int(floor(idx));
    float f = fract(idx);

    // Интерполяция между соседними цветами палитры
    if (i >= 3) return colors[3];
    return mix(colors[i], colors[i+1], f);
}
```

### 6.5. Bloom / Glow Post-Processing

#### Простой bloom (single-pass approximation)
```glsl
vec3 bloom(sampler2D tex, vec2 uv, float threshold, float intensity) {
    vec3 color = texture2D(tex, uv).rgb;
    float lum = dot(color, vec3(0.299, 0.587, 0.114));

    // Extract bright parts
    vec3 bright = max(color - threshold, 0.0);

    // Fake gaussian blur (9 samples)
    vec2 texel = 1.0 / iResolution.xy;
    vec3 blur = vec3(0.0);
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) * texel * 4.0;
            vec3 s = texture2D(tex, uv + offset).rgb;
            blur += max(s - threshold, 0.0);
        }
    }
    blur /= 9.0;

    return color + blur * intensity;
}
```

### 6.6. Ray Marching (3D сцены чистой математикой)

#### SDF (Signed Distance Functions) — строительные блоки
```glsl
// Сфера
float sdSphere(vec3 p, float r) { return length(p) - r; }

// Куб
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Плоскость
float sdPlane(vec3 p, float h) { return p.y - h; }

// Цилиндр
float sdCylinder(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// Операции комбинирования
float opUnion(float d1, float d2)     { return min(d1, d2); }
float opSubtract(float d1, float d2)  { return max(-d1, d2); }
float opIntersect(float d1, float d2) { return max(d1, d2); }

// Smooth union (плавное слияние)
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}
```

#### Ray March Loop
```glsl
float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);
        if (d < 0.001) break;
        if (t > 100.0) break;
        t += d;
    }
    return t;
}
```

#### Normal calculation
```glsl
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}
```

---

## 7. Что перевести с CSS на шейдеры

### Приоритет 1: CRT Post-Processing (максимальный visual upgrade)

**Текущее состояние:** 4 отдельных CSS overlay (.flicker-overlay, .vignette-overlay, .noise-overlay, .scanline-move)

**Shader-замена:** Один fullscreen fragment shader:
```glsl
precision highp float;
uniform float iTime;
uniform vec2 iResolution;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 centered = uv * 2.0 - 1.0;

    // 1. Barrel distortion (CRT curvature)
    float dist = dot(centered, centered);
    centered *= 1.0 + 0.03 * dist;
    vec2 distUv = centered * 0.5 + 0.5;

    // 2. Vignette (dynamic)
    float vig = 1.0 - dist * 0.4;

    // 3. Scanlines (subpixel precision, animated)
    float scan = 0.95 + 0.05 * sin(distUv.y * iResolution.y * 1.0 + iTime * 0.5);

    // 4. Animated noise (replaces static SVG feTurbulence)
    float noise = hash(uv * iResolution.xy + iTime * 100.0) * 0.08;

    // 5. Flicker
    float flicker = 0.97 + 0.03 * sin(iTime * 8.0) * sin(iTime * 13.0);

    // 6. Chromatic aberration (RGB channel offset)
    float aberration = 0.001 * (1.0 + dist * 2.0);

    // Composite: darken pixels (overlay mode)
    float alpha = (1.0 - vig * scan * flicker) + noise;
    alpha = clamp(alpha, 0.0, 0.5);

    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}
```

**Результат:** Убираем 4 CSS overlay элемента → 1 canvas с одним шейдером.
Визуальный выигрыш: barrel distortion, настоящее RGB separation, анимированный шум.

### Приоритет 2: Noise Overlay

**Текущее:** SVG `feTurbulence` — статичный, только opacity мигает (0.1-0.2)

**Shader:** Animated Perlin/Simplex noise с параметрами:
- Скорость анимации
- Масштаб зерна
- Интенсивность
- Опционально: цветной noise (зеленоватый, в тон phosphor green)

### Приоритет 3: Torch Flames

**Текущее:** 6+ DOM-элементов (.torch-flame-top, .torch-flame-core, .torch-flame-left, .torch-flame-right, .torch-flame-spark-1, .torch-flame-spark-2) + ASCII-символы + text-shadow stacks + 6 CSS animations

**Shader:** Один <canvas> на каждый факел (или один canvas с двумя viewport regions):
- Procedural fire (FBM noise + gradient falloff)
- Встроенные sparks (particle-like UV points)
- Реалистичное свечение (glow falloff)
- Реагирует на iTime (органичная анимация)

---

## 8. Новые шейдерные эффекты для BloodTracker

### 8.1. Procedural Dungeon Background (фоновая анимация)
**Что:** Анимированная текстура камня/кирпича с проступающими рунами
- Voronoi noise → каменная кладка
- FBM → трещины и текстура камня
- Sin wave runes → проступают и исчезают
- Torch light falloff → подсветка от факелов

### 8.2. Blood Drip Fluid Simulation
**Что:** Заменить CSS `.drip` элементы на shader-based стекающую кровь
- Feedback buffer: кровь "стекает" по gravity
- Вязкость жидкости через noise distortion
- Капли оставляют следы (persistence через feedback loop)

### 8.3. Portal / Rift Effect (для модальных окон)
**Что:** При открытии модала — анимация "разрыва пространства"
- Ray-marched portal hole
- Swirling noise внутри портала
- Glow edges с chromatic aberration

### 8.4. Matrix/Rune Rain (фоновый эффект)
**Что:** Shader-based "дождь из рун" (как Matrix, но с руническими символами)
- Процедурная генерация символов через grid math (как в Efecto)
- Falling columns с разной скоростью
- Phosphor glow trail (затухание символов)

### 8.5. Heat Distortion / Haze
**Что:** Эффект жара от факелов — искажение пространства над пламенем
- UV displacement через sin wave + noise
- Локализованный вокруг точек факелов
- Subtle но atmospheric

### 8.6. Parchment/Scroll Background для карточек
**Что:** Процедурная текстура пергамента для карточек
- FBM для текстуры бумаги
- Тёмные edges (burn marks)
- Subtle animation (breathing, age spots appearing/disappearing)

### 8.7. Blood Pulse Visualization (dashboard stats)
**Что:** Визуализация пульса/кровотока для dashboard
- Metaball-like SDF shapes
- Flow animation (шарики крови текут по "сосудам")
- Цвет зависит от статуса показателя (зелёный/жёлтый/красный)

### 8.8. Dungeon Fog / Mist
**Что:** Анимированный туман в нижней части экрана
- Layered FBM с разными скоростями
- Parallax (два слоя тумана двигаются по-разному)
- Реагирует на scroll (рассеивается при скролле вниз)

### 8.9. Lightning / Electric Arc Effect
**Что:** Молния между элементами UI или при hover
- Procedural lightning через random walk
- Branch splitting
- Glow + afterimage

### 8.10. Animated Dungeon Map Background
**Что:** Процедурно генерируемый "вид сверху" dungeon map
- Cellular automata → cave generation
- Ray-marched rooms and corridors
- Torch lights at intersections
- Постоянно "исследуется" (fog of war receding)

---

## 9. Производительность и оптимизация

### Рекомендации
1. **Снижать разрешение shader canvas** — рендерить в 0.5x или даже 0.25x от viewport, CSS scale up. Для noise/fog/fire это незаметно.
2. **Limit iterations** — ray marching 32-64 steps max, FBM 4-5 octaves max.
3. **Убирать шейдеры на слабых устройствах** — проверять `gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)`, fps counter.
4. **requestAnimationFrame** с throttle — для background-эффектов можно рендерить на 30fps вместо 60.
5. **Убирать шейдеры при неактивном табе** — `document.visibilityState`.
6. **Один canvas vs. много** — один canvas с viewport regions лучше, чем несколько canvas.
7. **Избегать texture reads в overlay** — pure math shaders быстрее чем html2canvas → texture pipeline.

### Fallback Strategy
```javascript
// Проверка поддержки WebGL
function supportsWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
        return false;
    }
}

// Если нет WebGL — оставляем текущие CSS эффекты
if (!supportsWebGL()) {
    document.documentElement.classList.add('no-webgl');
    // CSS effects остаются активными
} else {
    document.documentElement.classList.add('has-webgl');
    // Скрываем CSS overlays, запускаем шейдеры
}
```

```css
/* CSS fallback */
.has-webgl .flicker-overlay,
.has-webgl .vignette-overlay,
.has-webgl .noise-overlay { display: none; }
```

### Performance Budget
| Эффект | GPU Cost | Рекомендация |
|---|---|---|
| CRT post-processing | Low | Всегда включён |
| Animated noise | Very Low | Всегда включён |
| Procedural fire (torches) | Medium | Desktop only, 0.5x resolution |
| Dungeon fog | Low-Medium | Desktop only |
| Blood drip (feedback) | Medium | Optional, toggle в настройках |
| Ray marching 3D | High | Только по запросу (отдельная страница) |
| Dithering post-process | Low | Optional toggle |

---

## 10. Инструменты разработки

### Прототипирование шейдеров
- **[Shadertoy](https://shadertoy.com)** — крупнейшее сообщество, тысячи примеров. Uniforms: iTime, iResolution, iMouse, iChannel0-3, iFrame. Адаптация: добавить `void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }`
- **[GLSL Sandbox / glsl.app](https://glsl.app/)** — минимальный online editor для GLSL
- **[The Book of Shaders Editor](https://thebookofshaders.com/edit.php)** — интерактивные примеры из книги
- **[Shader Toy VS Code Extension](https://github.com/stevensona/shader-toy)** — live preview в VS Code

### Адаптация Shadertoy → Web
```glsl
// Shadertoy код (mainImage):
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}

// → Standalone WebGL:
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

// Вставить все функции из Shadertoy...

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

### Полезные Shadertoy примеры для BloodTracker
- **CRT Shader**: `shadertoy.com/view/XtlSD7` — полный CRT с phosphor grid
- **Fire**: `shadertoy.com/view/XsXSWS` — процедурное пламя
- **Dungeon**: `shadertoy.com/view/ll2GD3` — ray-marched dungeon corridors
- **Blood**: `shadertoy.com/view/Xd3fRN` — fluid simulation
- **Fog**: `shadertoy.com/view/lsySzd` — volumetric fog
- **Lightning**: `shadertoy.com/view/XtBXDw` — electric arcs
- **Rune Matrix**: `shadertoy.com/view/3l23Rh` — falling characters

---

## 11. Источники

### Статьи и туториалы
- [Shaders for Web Design](https://medium.com/@vzzz/shaders-for-web-design-13476873dac2) — Medium (вдохновение)
- [The Book of Shaders](https://thebookofshaders.com/) — полный курс GLSL от основ до 3D
- [Ray Marching blog](https://michaelwalczyk.com/blog-ray-marching.html) — SDF, sphere tracing, lighting
- [WebGL Shadertoy tutorial](https://webglfundamentals.org/webgl/lessons/webgl-shadertoy.html) — boilerplate для адаптации
- [Retro Shaders WebGL](https://clemz.io/article-retro-shaders-webgl.html) — pixelation, barrel distortion, CRT, dithering
- [Dithering and Retro Shading for Web](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/) — Bayer matrix, blue noise, CRT phosphor mask
- [Efecto: ASCII + Dithering with WebGL](https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/) — procedural ASCII chars в GLSL
- [Fire Shader in GLSL](https://clockworkchilli.com/blog/8_a_fire_shader_in_glsl_for_your_webgl_games) — texture-based fire
- [Shadertoy Fire](https://greentec.github.io/shadertoy-fire-shader-en/) — procedural fire с FBM

### Инструменты
- [Shadertoy](https://www.shadertoy.com/) — community + прототипирование
- [GLSL App](https://glsl.app/) — online editor
- [shader-web-background](https://github.com/xemantic/shader-web-background) — библиотека для shader backgrounds
- [WebGL CRT Shader](https://github.com/gingerbeardman/webgl-crt-shader) — tweakable CRT shader
- [CRT Three.js Demo](https://daenavan.github.io/crt-threejs/) — interactive CRT with Three.js
- [CRTFilter.js](https://github.com/Ichiaka/CRTFilter) — JS library для CRT на canvas

### Noise / Math References
- [GLSL Noise Algorithms (Gist)](https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83) — коллекция noise functions
- [Procedural Tileable Shaders](https://github.com/tuxalin/procedural-tileable-shaders) — tileable noise для seamless patterns
- [Book of Shaders: Noise chapter](https://thebookofshaders.com/11/) — value/gradient/simplex noise + FBM