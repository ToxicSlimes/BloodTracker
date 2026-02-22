// ═══════════════════════════════════════════════════════════════════════════════
// SPARK EFFECTS — Canvas-based rendering (no DOM span churn)
// ═══════════════════════════════════════════════════════════════════════════════

interface SparkData {
    x: number
    y: number
    vx: number
    vy: number
    life: number
    char: string
    bounceCount: number
    maxBounces: number
    lastCollisionCheck: number
}

interface FlickerData {
    x: number
    y: number
    char: string
    life: number
}

const sparks: SparkData[] = []
const flickers: FlickerData[] = []
const sparkChars: string[] = ['*', '·', '•', '▪', '▫', '▸', '▹']
const flickerChars: string[] = ['.', ':', '*', '+']
const MAX_SPARKS: number = 25
let collisionRects: DOMRect[] | null = null
let collisionCacheTime: number = 0
const CACHE_DURATION: number = 2000
let animationRunning: boolean = false
let sparkCanvas: HTMLCanvasElement | null = null
let sparkCtx: CanvasRenderingContext2D | null = null
let sparkIntervalId: ReturnType<typeof setInterval> | null = null

/**
 * Инициализирует canvas для отрисовки искр (вместо DOM-спанов).
 */
function initSparkCanvas(): void {
    if (sparkCanvas) return

    sparkCanvas = document.createElement('canvas')
    sparkCanvas.id = 'spark-canvas'
    sparkCanvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;'
    document.body.appendChild(sparkCanvas)

    sparkCtx = sparkCanvas.getContext('2d', { alpha: true })
    resizeSparkCanvas()
}

function resizeSparkCanvas(): void {
    if (!sparkCanvas) return
    const dpr = window.devicePixelRatio || 1
    sparkCanvas.width = window.innerWidth * dpr
    sparkCanvas.height = window.innerHeight * dpr
    if (sparkCtx) sparkCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

/**
 * Возвращает кешированные DOMRect для коллизий (без getBoundingClientRect на каждый кадр).
 */
function getCollisionRects(): DOMRect[] {
    const now = Date.now()
    if (!collisionRects || now - collisionCacheTime > CACHE_DURATION) {
        const els = document.querySelectorAll('header, nav, .container, .modal, table, button, .card')
        collisionRects = []
        for (let i = 0; i < els.length; i++) {
            collisionRects.push(els[i].getBoundingClientRect())
        }
        collisionCacheTime = now
    }
    return collisionRects
}

/**
 * Добавляет вспышку (canvas-рендеринг вместо DOM-спанов).
 */
function createPixelFlicker(x: number, y: number, radius: number = 5): void {
    const pixelSize = 8
    const density = 0.3

    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            if (i * i + j * j <= radius * radius && Math.random() < density) {
                flickers.push({
                    x: x + i * pixelSize,
                    y: y + j * pixelSize,
                    char: flickerChars[Math.floor(Math.random() * flickerChars.length)],
                    life: 0.35 + Math.random() * 0.25,
                })
            }
        }
    }
}

/**
 * Создаёт взрыв искр конусом из точки.
 */
function createSparkBurst(x: number, y: number, count: number = 10, coneAngle: number = 70): void {
    const baseAngle = Math.PI / 2
    const angleSpread = (coneAngle * Math.PI) / 180

    for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * angleSpread
        const speed = 1.5 + Math.random() * 2
        createSpark(x, y, Math.sin(angle) * speed, Math.cos(angle) * speed)
    }
}

/**
 * Создаёт одну искру с физикой.
 */
function createSpark(x: number, y: number, vx: number = 0, vy: number = 0): void {
    if (sparks.length >= MAX_SPARKS) {
        sparks.shift()
    }

    sparks.push({
        x,
        y,
        vx: vx || (Math.random() - 0.5) * 2,
        vy: vy || Math.random() * 2 + 1,
        life: 1.0,
        char: sparkChars[Math.floor(Math.random() * sparkChars.length)],
        bounceCount: 0,
        maxBounces: 3,
        lastCollisionCheck: 0,
    })

    if (!animationRunning) {
        animationRunning = true
        animateSparks()
    }
}

/**
 * Проверяет столкновение искры с кешированными DOMRect.
 */
function checkCollision(spark: SparkData): DOMRect | null {
    const rects = getCollisionRects()
    const sx = spark.x, sy = spark.y

    for (const rect of rects) {
        if (sx < rect.right && sx + 10 > rect.left &&
            sy < rect.bottom && sy + 10 > rect.top) {
            return rect
        }
    }
    return null
}

/**
 * Цикл анимации: физика + canvas-рендеринг (без DOM-манипуляций).
 */
function animateSparks(): void {
    if (!animationRunning || !sparkCtx || !sparkCanvas) return

    // Page Visibility API — skip when hidden
    if (document.hidden) {
        requestAnimationFrame(animateSparks)
        return
    }

    const now = Date.now()
    const w = window.innerWidth
    const h = window.innerHeight

    // Update sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i]

        spark.vy += 0.15
        spark.x += spark.vx
        spark.y += spark.vy
        spark.life -= 0.008

        // Collision check (throttled)
        if (now - spark.lastCollisionCheck > 100 && spark.bounceCount < spark.maxBounces) {
            spark.lastCollisionCheck = now
            const rect = checkCollision(spark)
            if (rect) {
                const cx = rect.left + rect.width / 2
                const cy = rect.top + rect.height / 2
                const scx = spark.x + 5
                const scy = spark.y + 5

                createPixelFlicker(spark.x, spark.y, 2)

                if (spark.bounceCount === 0 && sparks.length < MAX_SPARKS - 5) {
                    createSparkBurst(spark.x, spark.y, 3, 60)
                }

                if (scx < rect.left || scx > rect.right) {
                    spark.vx *= -0.6
                    spark.x = scx < cx ? rect.left - 10 : rect.right + 10
                }
                if (scy < rect.top || scy > rect.bottom) {
                    spark.vy *= -0.6
                    spark.y = scy < cy ? rect.top - 10 : rect.bottom + 10
                }

                spark.bounceCount++
                spark.vx += (Math.random() - 0.5) * 2
                spark.vy += (Math.random() - 0.5) * 2
            }
        }

        if (spark.y > h + 50 || spark.life <= 0 || spark.bounceCount >= spark.maxBounces) {
            sparks.splice(i, 1)
        }
    }

    // Update flickers
    const dt = 1 / 60
    for (let i = flickers.length - 1; i >= 0; i--) {
        flickers[i].life -= dt
        if (flickers[i].life <= 0) flickers.splice(i, 1)
    }

    // Canvas draw — single pass, no DOM
    sparkCtx.clearRect(0, 0, w, h)

    // Draw flickers
    sparkCtx.font = '10px monospace'
    sparkCtx.textAlign = 'center'
    for (const f of flickers) {
        sparkCtx.globalAlpha = f.life * 2
        sparkCtx.fillStyle = '#FBB954'
        sparkCtx.fillText(f.char, f.x, f.y)
    }

    // Draw sparks
    sparkCtx.font = '14px monospace'
    for (const spark of sparks) {
        sparkCtx.globalAlpha = spark.life
        sparkCtx.fillStyle = '#FBB954'
        sparkCtx.fillText(spark.char, spark.x, spark.y)
    }

    sparkCtx.globalAlpha = 1

    if (sparks.length > 0 || flickers.length > 0) {
        requestAnimationFrame(animateSparks)
    } else {
        animationRunning = false
    }
}

/**
 * Создаёт вспышку + взрыв искр из случайной точки внутри элемента.
 */
function createSparksFromElement(element: Element): void {
    if (!element || sparks.length >= MAX_SPARKS - 10) return

    const rect = element.getBoundingClientRect()
    const x = rect.left + Math.random() * rect.width
    const y = rect.top + Math.random() * rect.height

    createPixelFlicker(x, y, 5)

    setTimeout(() => {
        createSparkBurst(x, y, 10, 70)
    }, 250)
}

/**
 * Запускает периодическую генерацию искр. Пауза при скрытой вкладке.
 */
export function startSparkAnimation(): void {
    initSparkCanvas()

    const createSparks = (): void => {
        // Page Visibility API — skip spawn when tab hidden
        if (document.hidden) return
        if (sparks.length >= MAX_SPARKS) return

        const toxicMachineElement = document.querySelector('.colorful-ascii')
        const skeletonElement = document.querySelector('.ascii-skull-container')

        if (toxicMachineElement) {
            createSparksFromElement(toxicMachineElement)
        }
        if (skeletonElement) {
            setTimeout(() => {
                createSparksFromElement(skeletonElement)
            }, 500)
        }
    }

    createSparks()
    sparkIntervalId = setInterval(createSparks, 4000)

    window.addEventListener('resize', resizeSparkCanvas)
}
