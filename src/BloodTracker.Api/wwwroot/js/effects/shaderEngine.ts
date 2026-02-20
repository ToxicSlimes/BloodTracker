/**
 * ShaderEngine — lightweight WebGL 1.0 fullscreen quad renderer.
 * No dependencies. Renders a fragment shader on a 2-triangle fullscreen quad.
 * Provides: iTime, iResolution, iMouse, uColor (primary theme color) uniforms.
 * Mobile-aware: DPR cap, resolution scaling, FPS throttle, visibility pause, reduced-motion.
 */

export interface ShaderEngineOptions {
    /** Resolution multiplier (0.0–1.0). Lower = cheaper. Default 1.0 desktop, 0.5 mobile */
    scale?: number
    /** Target FPS cap. 0 = uncapped (rAF native). Default 0 */
    targetFPS?: number
    /** Extra uniform names to register */
    uniforms?: string[]
    /** Canvas z-index */
    zIndex?: number
    /** Enable pointer-events on canvas. Default false */
    pointerEvents?: boolean
    /** Auto-start on creation. Default false */
    autoStart?: boolean
}

type UniformSetter = (gl: WebGLRenderingContext, loc: WebGLUniformLocation, time: number) => void

export class ShaderEngine {
    canvas: HTMLCanvasElement
    gl: WebGLRenderingContext | null = null
    program: WebGLProgram | null = null
    running = false

    private u: Record<string, WebGLUniformLocation | null> = {}
    private t0 = 0
    private mouse = { x: 0, y: 0 }
    private raf = 0
    private lastFrame = 0
    private frameInterval: number
    private scale: number
    private ro: ResizeObserver | null = null
    private customUniforms: string[]
    private uniformSetters: Record<string, UniformSetter> = {}
    private fpsHistory: number[] = []
    private fpsCheckInterval = 0
    private destroyed = false

    // Fullscreen quad vertex shader (2 triangles covering clip space)
    static VS = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`

    constructor(canvas: HTMLCanvasElement, fragSrc: string, opts: ShaderEngineOptions = {}) {
        this.canvas = canvas
        this.scale = opts.scale ?? (ShaderEngine.isMobile() ? 0.5 : 1.0)
        this.frameInterval = opts.targetFPS ? 1000 / opts.targetFPS : 0
        this.customUniforms = opts.uniforms || []

        // Style
        canvas.style.position = 'fixed'
        canvas.style.top = '0'
        canvas.style.left = '0'
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        if (opts.zIndex !== undefined) canvas.style.zIndex = String(opts.zIndex)
        if (!opts.pointerEvents) canvas.style.pointerEvents = 'none'

        // WebGL context
        const glOpts = { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false }
        this.gl = canvas.getContext('webgl', glOpts) as WebGLRenderingContext
            || canvas.getContext('experimental-webgl', glOpts) as WebGLRenderingContext
        if (!this.gl) {
            console.warn('[ShaderEngine] WebGL not supported')
            return
        }

        this._initProgram(fragSrc)
        this._initGeometry()
        this._initUniforms()
        this._bindEvents()
        this._resize()

        if (opts.autoStart) this.start()
    }

    /** Detect mobile / low-power device */
    static isMobile(): boolean {
        return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
    }

    /** Check WebGL support without creating a persistent context */
    static isSupported(): boolean {
        try {
            const c = document.createElement('canvas')
            return !!(c.getContext('webgl') || c.getContext('experimental-webgl'))
        } catch { return false }
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    start(): void {
        if (!this.gl || this.running || this.destroyed) return
        this.running = true
        this.t0 = performance.now()
        this.lastFrame = this.t0
        this._loop()
    }

    stop(): void {
        this.running = false
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0 }
    }

    destroy(): void {
        this.destroyed = true
        this.stop()
        this.ro?.disconnect()
        this.canvas.removeEventListener('mousemove', this._onMouse)
        document.removeEventListener('visibilitychange', this._onVisibility)
        clearInterval(this.fpsCheckInterval)
        if (this.gl && this.program) {
            this.gl.deleteProgram(this.program)
        }
        this.canvas.remove()
    }

    // ── Uniform Setters ────────────────────────────────────────────────────────

    /** Register a callback to set a custom uniform each frame */
    setUniformSetter(name: string, fn: UniformSetter): void {
        this.uniformSetters[name] = fn
    }

    /** Set a float uniform directly */
    setFloat(name: string, value: number): void {
        if (!this.gl || !this.u[name]) return
        this.gl.uniform1f(this.u[name]!, value)
    }

    /** Set a vec3 uniform directly */
    setVec3(name: string, x: number, y: number, z: number): void {
        if (!this.gl || !this.u[name]) return
        this.gl.uniform3f(this.u[name]!, x, y, z)
    }

    // ── Init Helpers ───────────────────────────────────────────────────────────

    private _compile(src: string, type: number): WebGLShader | null {
        const gl = this.gl!
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('[ShaderEngine] Compile error:', gl.getShaderInfoLog(s))
            gl.deleteShader(s)
            return null
        }
        return s
    }

    private _initProgram(fs: string): void {
        const gl = this.gl!
        const vs = this._compile(ShaderEngine.VS, gl.VERTEX_SHADER)
        const fsShader = this._compile(fs, gl.FRAGMENT_SHADER)
        if (!vs || !fsShader) return

        const prog = gl.createProgram()!
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fsShader)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('[ShaderEngine] Link error:', gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)
        this.program = prog

        // Clean up shader objects (now linked to program)
        gl.deleteShader(vs)
        gl.deleteShader(fsShader)
    }

    private _initGeometry(): void {
        const gl = this.gl!
        const buf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        // Two triangles covering [-1,1] clip space
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW)
        const pos = gl.getAttribLocation(this.program!, 'a_pos')
        gl.enableVertexAttribArray(pos)
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
    }

    private _initUniforms(): void {
        const gl = this.gl!
        const prog = this.program!
        // Standard uniforms
        this.u.iTime = gl.getUniformLocation(prog, 'iTime')
        this.u.iResolution = gl.getUniformLocation(prog, 'iResolution')
        this.u.iMouse = gl.getUniformLocation(prog, 'iMouse')
        this.u.uColor = gl.getUniformLocation(prog, 'uColor')
        // Custom uniforms
        for (const name of this.customUniforms) {
            this.u[name] = gl.getUniformLocation(prog, name)
        }
    }

    private _bindEvents(): void {
        // Mouse tracking
        this.canvas.addEventListener('mousemove', this._onMouse)

        // Resize
        this.ro = new ResizeObserver(() => this._resize())
        this.ro.observe(document.body)

        // Visibility pause
        document.addEventListener('visibilitychange', this._onVisibility)
    }

    private _onMouse = (e: MouseEvent): void => {
        const r = this.canvas.getBoundingClientRect()
        this.mouse.x = e.clientX - r.left
        this.mouse.y = r.height - (e.clientY - r.top)
    }

    private _onVisibility = (): void => {
        if (document.hidden) {
            this.stop()
        } else if (!this.destroyed) {
            this.start()
        }
    }

    private _resize(): void {
        const dpr = Math.min(window.devicePixelRatio || 1, ShaderEngine.isMobile() ? 1.5 : 2)
        const w = window.innerWidth
        const h = window.innerHeight
        this.canvas.width = Math.floor(w * dpr * this.scale)
        this.canvas.height = Math.floor(h * dpr * this.scale)
        this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height)
    }

    // ── Render Loop ────────────────────────────────────────────────────────────

    private _loop = (): void => {
        if (!this.running || !this.gl) return

        const now = performance.now()

        // FPS throttle
        if (this.frameInterval > 0 && now - this.lastFrame < this.frameInterval) {
            this.raf = requestAnimationFrame(this._loop)
            return
        }
        this.lastFrame = now

        const gl = this.gl
        const t = (now - this.t0) / 1000

        // Set standard uniforms
        if (this.u.iTime) gl.uniform1f(this.u.iTime, t)
        if (this.u.iResolution) gl.uniform2f(this.u.iResolution, this.canvas.width, this.canvas.height)
        if (this.u.iMouse) gl.uniform2f(this.u.iMouse, this.mouse.x * this.scale, this.mouse.y * this.scale)

        // Set primary color from CSS variable
        if (this.u.uColor) {
            const color = this._getPrimaryColorRGB()
            gl.uniform3f(this.u.uColor, color[0], color[1], color[2])
        }

        // Custom uniform setters
        for (const [name, fn] of Object.entries(this.uniformSetters)) {
            if (this.u[name]) fn(gl, this.u[name]!, t)
        }

        // Draw fullscreen quad
        gl.drawArrays(gl.TRIANGLES, 0, 6)

        this.raf = requestAnimationFrame(this._loop)
    }

    // ── Color Helpers ──────────────────────────────────────────────────────────

    private _cachedColorHex = ''
    private _cachedColorRGB: [number, number, number] = [0, 1, 0]

    private _getPrimaryColorRGB(): [number, number, number] {
        const hex = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()
        if (hex && hex !== this._cachedColorHex) {
            this._cachedColorHex = hex
            this._cachedColorRGB = this._hexToGL(hex)
        }
        return this._cachedColorRGB
    }

    private _hexToGL(hex: string): [number, number, number] {
        const h = hex.replace('#', '')
        const r = parseInt(h.substring(0, 2), 16) / 255
        const g = parseInt(h.substring(2, 4), 16) / 255
        const b = parseInt(h.substring(4, 6), 16) / 255
        return [r, g, b]
    }
}
