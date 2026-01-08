const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];
const altRunes = ['◊', '◆', '◇', '▲', '△', '●', '○', '■', '□', '★', '☆', '※', '§', '¶', '†', '‡', '•', '◦', '▪', '▫', '▸', '▹', '▾', '▿'];

const symbols = runes.length > 0 ? runes : altRunes;
const symbolsLength = symbols.length;

let canvas = null;
let ctx = null;
let animationFrameId = null;
let columns = [];
let primaryColor = '#00ff00';
let cachedColor = null;

class RuneColumn {
    constructor(x, width, height, layer) {
        this.x = x;
        this.width = width;
        this.height = height;
        this.layer = layer;
        this.runes = [];
        this.xOffset = (Math.random() - 0.5) * (width * 0.8);
        this.verticalOffset = Math.random() * 200 - 100;
        
        let baseSpeed;
        let avgSpacing;
        if (layer === 'back') {
            baseSpeed = (0.05 + Math.random() * 0.3) * 1.1;
            avgSpacing = 20;
            this.fontSize = 13 + Math.random() * 2;
        } else if (layer === 'mid') {
            baseSpeed = (0.1 + Math.random() * 0.5) * 1.1;
            avgSpacing = 18;
            this.fontSize = 16 + Math.random() * 2;
        } else {
            baseSpeed = (0.15 + Math.random() * 0.7) * 1.1;
            avgSpacing = 16;
            this.fontSize = 17 + Math.random() * 3;
        }
        
        this.baseSpeed = baseSpeed;
        
        const runeCount = Math.floor(height / avgSpacing) + 10;
        
        let currentY = -200 + this.verticalOffset;
        for (let i = 0; i < runeCount; i++) {
            const spacing = avgSpacing + (Math.random() * 12 - 6);
            currentY += spacing;
            
            const speedMultiplier = Math.random();
            let runeSpeed;
            
            if (speedMultiplier < 0.15) {
                runeSpeed = baseSpeed * 0.3 + Math.random() * 0.05;
            } else if (speedMultiplier < 0.35) {
                runeSpeed = baseSpeed * 0.5 + Math.random() * 0.1;
            } else if (speedMultiplier < 0.65) {
                runeSpeed = baseSpeed * 0.8 + Math.random() * 0.2;
            } else if (speedMultiplier < 0.85) {
                runeSpeed = baseSpeed * 1.3 + Math.random() * 0.3;
            } else {
                runeSpeed = baseSpeed * 1.8 + Math.random() * 0.4;
            }
            
            this.runes.push({
                y: currentY + (Math.random() * 60 - 30),
                symbol: symbols[Math.floor(Math.random() * symbolsLength)],
                opacity: layer === 'back' ? 0.2 + Math.random() * 0.2 : layer === 'mid' ? 0.3 + Math.random() * 0.3 : 0.35 + Math.random() * 0.35,
                speed: runeSpeed,
                baseSpeed: runeSpeed,
                xOffset: (Math.random() - 0.5) * (width * 0.7),
                speedChangeTimer: Math.random() * 200
            });
        }
    }
    
    update() {
        for (let rune of this.runes) {
            rune.speedChangeTimer--;
            
            if (rune.speedChangeTimer <= 0) {
                const speedVariation = 0.7 + Math.random() * 0.6;
                rune.speed = rune.baseSpeed * speedVariation;
                rune.speedChangeTimer = 50 + Math.random() * 150;
            }
            
            rune.y += rune.speed;
            
            if (rune.y > this.height + 50) {
                const topRune = Math.min(...this.runes.map(r => r.y));
                rune.y = topRune - 30 - Math.random() * 50;
                rune.symbol = symbols[Math.floor(Math.random() * symbolsLength)];
                if (this.layer === 'back') {
                    rune.opacity = 0.2 + Math.random() * 0.2;
                } else if (this.layer === 'mid') {
                    rune.opacity = 0.3 + Math.random() * 0.3;
                } else {
                    rune.opacity = 0.35 + Math.random() * 0.35;
                }
                rune.xOffset = (Math.random() - 0.5) * (this.width * 0.7);
                rune.baseSpeed = this.baseSpeed * (0.4 + Math.random() * 1.6);
                rune.speed = rune.baseSpeed;
                rune.speedChangeTimer = Math.random() * 200;
            }
        }
    }
    
    draw(ctx, color) {
        ctx.font = `${this.fontSize}px 'WebPlus IBM MDA', 'VT323', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        for (let rune of this.runes) {
            const distanceFromBottom = this.height - rune.y;
            let opacity = rune.opacity;
            
            if (distanceFromBottom < 100 && distanceFromBottom > 0) {
                opacity = (distanceFromBottom / 100) * rune.opacity;
            }
            
            if (opacity > 0.05 && rune.y > -50) {
                ctx.globalAlpha = opacity;
                ctx.fillStyle = color;
                const drawX = this.x + this.width / 2 + this.xOffset + rune.xOffset;
                ctx.fillText(rune.symbol, drawX, rune.y);
            }
        }
    }
}

function initMatrixRunes() {
    if (canvas) return;
    
    updatePrimaryColor();
    
    canvas = document.createElement('canvas');
    canvas.className = 'matrix-runes-canvas';
    canvas.id = 'matrix-runes-canvas';
    canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;';
    document.body.appendChild(canvas);
    
    ctx = canvas.getContext('2d', { alpha: true });
    ctx.imageSmoothingEnabled = false;
    resizeCanvas();
    
    console.log(`Matrix runes initialized: ${columns.length} columns (Canvas with layers)`);
}

function updatePrimaryColor() {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    if (color && color !== cachedColor) {
        primaryColor = color || '#00ff00';
        cachedColor = color;
    }
}

function resizeCanvas() {
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    
    columns = [];
    
    const allWidths = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85];
    const layers = ['back', 'front', 'back', 'front', 'back', 'front', 'mid'];
    
    let x = -100;
    
    while (x < window.innerWidth + 150) {
        const width = allWidths[Math.floor(Math.random() * allWidths.length)];
        const layer = layers[Math.floor(Math.random() * layers.length)];
        
        const minSpacing = 0;
        const maxSpacing = 25;
        const spacingVariation = Math.random();
        let spacing;
        
        if (spacingVariation < 0.6) {
            spacing = minSpacing + Math.random() * 4;
        } else if (spacingVariation < 0.85) {
            spacing = 5 + Math.random() * 8;
        } else {
            spacing = 12 + Math.random() * (maxSpacing - 12);
        }
        
        const randomXShift = (Math.random() - 0.5) * 25;
        const columnX = x + randomXShift;
        
        // Добавляем колонку, если она хотя бы частично видна на экране
        if (columnX < window.innerWidth + 50 && columnX + width > -50) {
            columns.push(new RuneColumn(columnX, width, window.innerHeight, layer));
        }
        
        x += width + spacing;
    }
    
    // Сортируем колонки по X для правильной обработки перекрытий
    columns.sort((a, b) => a.x - b.x);
    
    // Проверка и смещение перекрывающихся колонок
    const minColumnGap = 0;
    for (let i = 1; i < columns.length; i++) {
        const prevCol = columns[i - 1];
        const currCol = columns[i];
        const prevRight = prevCol.x + prevCol.width;
        const currLeft = currCol.x;
        const gap = currLeft - prevRight;
        
        if (gap < minColumnGap) {
            // Смещаем текущую колонку вправо
            const shift = minColumnGap - gap + Math.random() * 5;
            currCol.x += shift;
            
            // Также немного смещаем вертикальный оффсет для визуального разделения
            currCol.verticalOffset += (Math.random() - 0.5) * 50;
        }
    }
    
    // Заполняем большие пробелы дополнительными колонками (несколько проходов)
    for (let pass = 0; pass < 5; pass++) {
        columns.sort((a, b) => a.x - b.x);
        const newColumns = [];
        
        for (let i = 1; i < columns.length; i++) {
            const prevCol = columns[i - 1];
            const currCol = columns[i];
            const prevRight = prevCol.x + prevCol.width;
            const currLeft = currCol.x;
            const gap = currLeft - prevRight;
            
            // Пороги: 25px, 18px, 12px, 8px, 5px
            const threshold = 25 - pass * 4;
            if (gap > threshold) {
                const newX = prevRight + gap / 2;
                const newWidth = allWidths[Math.floor(Math.random() * allWidths.length)];
                const newLayer = layers[Math.floor(Math.random() * layers.length)];
                
                // Проверяем, что новая колонка не выходит за границы экрана
                if (newX + newWidth / 2 < window.innerWidth + 50 && newX - newWidth / 2 > -50) {
                    const newColumn = new RuneColumn(newX - newWidth / 2, newWidth, window.innerHeight, newLayer);
                    newColumns.push(newColumn);
                }
            }
        }
        
        // Также проверяем пробелы в начале и конце экрана
        if (columns.length > 0) {
            columns.sort((a, b) => a.x - b.x);
            
            // Пробел слева
            const firstCol = columns[0];
            if (firstCol.x > 0) {
                const gap = firstCol.x;
                if (gap > threshold) {
                    const newX = gap / 2;
                    const newWidth = allWidths[Math.floor(Math.random() * allWidths.length)];
                    const newLayer = layers[Math.floor(Math.random() * layers.length)];
                    if (newX - newWidth / 2 > -50) {
                        const newColumn = new RuneColumn(newX - newWidth / 2, newWidth, window.innerHeight, newLayer);
                        newColumns.push(newColumn);
                    }
                }
            }
            
            // Пробел справа
            const lastCol = columns[columns.length - 1];
            const lastRight = lastCol.x + lastCol.width;
            if (lastRight < window.innerWidth) {
                const gap = window.innerWidth - lastRight;
                if (gap > threshold) {
                    const newX = lastRight + gap / 2;
                    const newWidth = allWidths[Math.floor(Math.random() * allWidths.length)];
                    const newLayer = layers[Math.floor(Math.random() * layers.length)];
                    if (newX + newWidth / 2 < window.innerWidth + 50) {
                        const newColumn = new RuneColumn(newX - newWidth / 2, newWidth, window.innerHeight, newLayer);
                        newColumns.push(newColumn);
                    }
                }
            }
        }
        
        columns.push(...newColumns);
    }
    
    // Финальная сортировка
    columns.sort((a, b) => a.x - b.x);
}

let lastFrameTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;

function animate(currentTime) {
    if (!canvas || !ctx) return;
    
    const deltaTime = currentTime - lastFrameTime;
    if (deltaTime < frameInterval) {
        animationFrameId = requestAnimationFrame(animate);
        return;
    }
    lastFrameTime = currentTime;
    
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
    
    updatePrimaryColor();
    
    ctx.save();
    
    for (let column of columns) {
        column.update();
    }
    
    const backColumns = columns.filter(c => c.layer === 'back');
    const midColumns = columns.filter(c => c.layer === 'mid');
    const frontColumns = columns.filter(c => c.layer === 'front');
    
    for (let column of backColumns) {
        column.draw(ctx, primaryColor);
    }
    
    for (let column of midColumns) {
        column.draw(ctx, primaryColor);
    }
    
    for (let column of frontColumns) {
        column.draw(ctx, primaryColor);
    }
    
    ctx.restore();
    
    animationFrameId = requestAnimationFrame(animate);
}

function startMatrixRunes() {
    initMatrixRunes();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(animate);
}

function stopMatrixRunes() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (canvas) {
        canvas.remove();
        canvas = null;
        ctx = null;
        columns = [];
    }
}

function resizeMatrixRunes() {
    if (!canvas) return;
    resizeCanvas();
}

window.addEventListener('resize', resizeMatrixRunes);

export { startMatrixRunes, stopMatrixRunes };
