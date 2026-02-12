interface SparkData {
    element: HTMLSpanElement
    x: number
    y: number
    vx: number
    vy: number
    life: number
    bounceCount: number
    maxBounces: number
    lastCollisionCheck: number
}

const sparks: SparkData[] = []
const sparkChars: string[] = ['*', '·', '•', '▪', '▫', '▸', '▹']
const MAX_SPARKS: number = 25
let collisionElements: Element[] | null = null
let collisionCacheTime: number = 0
const CACHE_DURATION: number = 2000
let animationRunning: boolean = false

/**
 * Возвращает кешированный список DOM-элементов для проверки столкновений искр.
 * @returns {Element[]}
 */
function getCollisionElements(): Element[] {
    const now = Date.now()
    if (!collisionElements || now - collisionCacheTime > CACHE_DURATION) {
        collisionElements = Array.from(document.querySelectorAll('header, nav, .container, .modal, table, button, .card'))
        collisionCacheTime = now
    }
    return collisionElements
}

/**
 * Создаёт пиксельную вспышку из ASCII символов вокруг точки.
 * @param {number} x — координата X центра
 * @param {number} y — координата Y центра
 * @param {number} [radius=5] — радиус вспышки в пикселях
 */
function createPixelFlicker(x: number, y: number, radius: number = 5): void {
    const chars = ['.', ':', '*', '+']
    const pixelSize = 8
    const density = 0.3
    
    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            if (i * i + j * j <= radius * radius && Math.random() < density) {
                const glow = document.createElement('span')
                glow.className = 'spark-glow'
                glow.textContent = chars[Math.floor(Math.random() * chars.length)]
                glow.style.left = `${x + i * pixelSize}px`
                glow.style.top = `${y + j * pixelSize}px`
                document.body.appendChild(glow)
                
                setTimeout(() => {
                    if (glow.parentNode) {
                        glow.remove()
                    }
                }, 350 + Math.random() * 250)
            }
        }
    }
}

/**
 * Создаёт одиночное свечение искры в указанной позиции.
 * @param {number} x — координата X
 * @param {number} y — координата Y
 */
function createSparkGlow(x: number, y: number): void {
    const chars = ['*', '+', 'x']
    const glow = document.createElement('span')
    glow.className = 'spark-glow'
    glow.textContent = chars[Math.floor(Math.random() * chars.length)]
    glow.style.left = `${x}px`
    glow.style.top = `${y}px`
    document.body.appendChild(glow)
    
    setTimeout(() => {
        if (glow.parentNode) {
            glow.remove()
        }
    }, 450)
}

/**
 * Создаёт взрыв искр конусом из точки.
 * @param {number} x — координата X
 * @param {number} y — координата Y
 * @param {number} [count=10] — количество искр
 * @param {number} [coneAngle=70] — угол конуса в градусах
 */
function createSparkBurst(x: number, y: number, count: number = 10, coneAngle: number = 70): void {
    const baseAngle = Math.PI / 2
    const angleSpread = (coneAngle * Math.PI) / 180
    const minSpeed = 1.5
    const maxSpeed = 3.5
    
    for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * angleSpread
        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed)
        const vx = Math.sin(angle) * speed
        const vy = Math.cos(angle) * speed
        
        createSpark(x, y, vx, vy)
    }
}

/**
 * Создаёт одну искру с физикой: гравитация, отскоки от UI-элементов.
 * @param {number} x — начальная координата X
 * @param {number} y — начальная координата Y
 * @param {number} [vx=0] — начальная скорость по X
 * @param {number} [vy=0] — начальная скорость по Y
 * @param {boolean} [createGlow=false] — создавать ли свечение
 * @returns {SparkData} данные искры
 */
function createSpark(x: number, y: number, vx: number = 0, vy: number = 0, createGlow: boolean = false): SparkData {
    if (sparks.length >= MAX_SPARKS) {
        const oldest = sparks.shift()
        if (oldest && oldest.element.parentNode) {
            oldest.element.remove()
        }
    }
    
    const spark = document.createElement('span')
    spark.className = 'spark'
    spark.textContent = sparkChars[Math.floor(Math.random() * sparkChars.length)]
    spark.style.left = `${x}px`
    spark.style.top = `${y}px`
    document.body.appendChild(spark)
    
    if (createGlow) {
        createSparkGlow(x, y)
    }
    
    const sparkData: SparkData = {
        element: spark,
        x: x,
        y: y,
        vx: vx || (Math.random() - 0.5) * 2,
        vy: vy || Math.random() * 2 + 1,
        life: 1.0,
        bounceCount: 0,
        maxBounces: 3,
        lastCollisionCheck: 0
    }
    
    sparks.push(sparkData)
    
    if (!animationRunning) {
        animationRunning = true
        animateSparks()
    }
    
    return sparkData
}

/**
 * Проверяет столкновение искры с UI-элементами.
 * @param {SparkData} spark — данные искры
 * @returns {{element: Element, rect: DOMRect}|null}
 */
function checkCollision(spark: SparkData): { element: Element; rect: DOMRect } | null {
    const elements = getCollisionElements()
    const sparkRect = {
        left: spark.x,
        top: spark.y,
        right: spark.x + 10,
        bottom: spark.y + 10
    }
    
    for (const el of elements) {
        const rect = el.getBoundingClientRect()
        if (sparkRect.left < rect.right && sparkRect.right > rect.left &&
            sparkRect.top < rect.bottom && sparkRect.bottom > rect.top) {
            return { element: el, rect: rect }
        }
    }
    return null
}

/**
 * Цикл анимации всех искр: физика, столкновения, затухание, удаление.
 */
function animateSparks(): void {
    if (!animationRunning) return
    
    const now = Date.now()
    const toRemove: number[] = []
    
    for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i]
        
        if (!spark.element.parentNode) {
            sparks.splice(i, 1)
            continue
        }
        
        spark.vy += 0.15
        spark.x += spark.vx
        spark.y += spark.vy
        spark.life -= 0.008
        
        if (now - spark.lastCollisionCheck > 100 && spark.bounceCount < spark.maxBounces) {
            spark.lastCollisionCheck = now
            const collision = checkCollision(spark)
            if (collision) {
                const rect = collision.rect
                const centerX = rect.left + rect.width / 2
                const centerY = rect.top + rect.height / 2
                const sparkCenterX = spark.x + 5
                const sparkCenterY = spark.y + 5
                
                const hitX = spark.x
                const hitY = spark.y
                
                createPixelFlicker(hitX, hitY, 2)
                
                if (spark.bounceCount === 0 && sparks.length < MAX_SPARKS - 5) {
                    setTimeout(() => {
                        createSparkBurst(hitX, hitY, 3, 60)
                    }, 50)
                }
                
                if (sparkCenterX < rect.left || sparkCenterX > rect.right) {
                    spark.vx *= -0.6
                    spark.x = sparkCenterX < centerX ? rect.left - 10 : rect.right + 10
                }
                if (sparkCenterY < rect.top || sparkCenterY > rect.bottom) {
                    spark.vy *= -0.6
                    spark.y = sparkCenterY < centerY ? rect.top - 10 : rect.bottom + 10
                }
                
                spark.bounceCount++
                spark.vx += (Math.random() - 0.5) * 2
                spark.vy += (Math.random() - 0.5) * 2
            }
        }
        
        if (spark.y > window.innerHeight + 50 || spark.life <= 0 || spark.bounceCount >= spark.maxBounces) {
            spark.element.classList.add('fading')
            toRemove.push(i)
        } else {
            spark.element.style.transform = `translate(${spark.x}px, ${spark.y}px)`
            spark.element.style.opacity = String(spark.life)
        }
    }
    
    for (let i = toRemove.length - 1; i >= 0; i--) {
        const idx = toRemove[i]
        const spark = sparks[idx]
        if (spark && spark.element.parentNode) {
            spark.element.remove()
        }
        sparks.splice(idx, 1)
    }
    
    if (sparks.length > 0) {
        requestAnimationFrame(animateSparks)
    } else {
        animationRunning = false
    }
}

/**
 * Создаёт вспышку + взрыв искр из случайной точки внутри элемента.
 * @param {Element} element — DOM-элемент источник искр
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
 * Запускает периодическую генерацию искр из ASCII-арт элементов каждые 4 секунды.
 */
export function startSparkAnimation(): void {
    const createSparks = (): void => {
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
    setInterval(createSparks, 4000)
}
