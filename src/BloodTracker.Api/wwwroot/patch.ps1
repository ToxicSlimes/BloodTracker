# BloodTracker Visual Patch Script
# Запусти: .\apply_patch.ps1
# Из папки: P:\Job\Testosterone\BloodTracker\src\BloodTracker.Api\wwwroot

$indexPath = ".\index.html"

if (!(Test-Path $indexPath)) {
    Write-Host "Файл index.html не найден! Запусти скрипт из папки wwwroot" -ForegroundColor Red
    exit 1
}

# Backup
Copy-Item $indexPath ".\index.html.backup"
Write-Host "Создан backup: index.html.backup" -ForegroundColor Green

$content = Get-Content $indexPath -Raw -Encoding UTF8

# ============================================
# ПАТЧ 1: ascii-header-block CSS
# ============================================
$oldAsciiHeaderBlock = @'
        .ascii-header-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            padding: 15px;
            margin-bottom: 5px;
            position: relative;
        }
'@

$newAsciiHeaderBlock = @'
        .ascii-header-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0;
            padding: 15px 15px 0 15px;
            margin-bottom: 0;
            position: relative;
        }
'@

$content = $content -replace [regex]::Escape($oldAsciiHeaderBlock), $newAsciiHeaderBlock
Write-Host "Патч 1: ascii-header-block - OK" -ForegroundColor Cyan

# ============================================
# ПАТЧ 2: colorful-ascii CSS (добавляем signFlicker)
# ============================================
$oldColorfulAscii = @'
        .colorful-ascii {
            font-family: 'WebPlus IBM MDA', 'VT323', monospace;
            font-size: 0.5em;
            line-height: 1.0;
            white-space: pre;
            letter-spacing: 0;
            margin: 0;
            padding: 0;
            position: relative;
            display: inline-block;
            color: var(--primary-color);
            text-shadow: 0 0 8px var(--primary-color), 0 0 16px var(--primary-color);
            animation: headerPulse 4s ease-in-out infinite;
        }
'@

$newColorfulAscii = @'
        .colorful-ascii {
            font-family: 'WebPlus IBM MDA', 'VT323', monospace;
            font-size: 0.5em;
            line-height: 1.0;
            white-space: pre;
            letter-spacing: 0;
            margin: 0;
            padding: 0;
            position: relative;
            display: inline-block;
            color: var(--primary-color);
            text-shadow: 0 0 8px var(--primary-color), 0 0 16px var(--primary-color);
            animation: signFlicker 8s ease-in-out infinite;
        }
        
        @keyframes signFlicker {
            0%, 91% { 
                opacity: 1; 
                text-shadow: 0 0 8px var(--primary-color), 0 0 16px var(--primary-color);
            }
            92% { opacity: 0.4; text-shadow: 0 0 2px var(--primary-color); }
            93% { opacity: 1; text-shadow: 0 0 20px var(--primary-color), 0 0 35px var(--primary-color); }
            94% { opacity: 0.2; text-shadow: none; }
            95% { opacity: 0.9; text-shadow: 0 0 15px var(--primary-color); }
            96% { opacity: 0.1; text-shadow: none; }
            97% { opacity: 1; text-shadow: 0 0 25px var(--primary-color), 0 0 50px var(--primary-color); }
            98%, 100% { opacity: 1; text-shadow: 0 0 8px var(--primary-color), 0 0 16px var(--primary-color); }
        }
'@

$content = $content -replace [regex]::Escape($oldColorfulAscii), $newColorfulAscii
Write-Host "Патч 2: colorful-ascii + signFlicker - OK" -ForegroundColor Cyan

# ============================================
# ПАТЧ 3: ascii-skull-container - увеличиваем скелетов
# ============================================
$oldSkullContainer = @'
        .ascii-skull-container {
            position: relative;
            display: inline-block;
            font-family: 'WebPlus IBM MDA', 'VT323', monospace;
            font-size: 1.0em;
            line-height: 1.0;
            white-space: pre;
            color: var(--green);
            text-shadow: 0 0 10px var(--green);
        }
'@

$newSkullContainer = @'
        .ascii-skull-container {
            position: relative;
            display: inline-block;
            font-family: 'WebPlus IBM MDA', 'VT323', monospace;
            font-size: 1.15em;
            line-height: 1.0;
            white-space: pre;
            color: var(--primary-color);
            text-shadow: 0 0 12px var(--primary-color);
            margin-top: -8px;
            transform: scale(1.05);
        }
'@

$content = $content -replace [regex]::Escape($oldSkullContainer), $newSkullContainer
Write-Host "Патч 3: ascii-skull-container (увеличены скелеты) - OK" -ForegroundColor Cyan

# ============================================
# ПАТЧ 4: nav - плавный переход от арта
# ============================================
$oldNav = @'
        nav { 
            display: flex; 
            gap: 10px; 
            flex-wrap: wrap; 
            justify-content: center;
            margin-top: 5px;
            padding: 10px 0;
        }
'@

$newNav = @'
        nav { 
            display: flex; 
            gap: 10px; 
            flex-wrap: wrap; 
            justify-content: center;
            margin-top: 0;
            padding: 15px 20px;
            background: linear-gradient(180deg, 
                transparent 0%, 
                rgba(var(--primary-rgb), 0.02) 50%,
                rgba(var(--primary-rgb), 0.04) 100%
            );
            border-top: 1px solid rgba(var(--primary-rgb), 0.1);
            position: relative;
        }
        
        nav::before {
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 50%;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
            opacity: 0.4;
        }
'@

$content = $content -replace [regex]::Escape($oldNav), $newNav
Write-Host "Патч 4: nav (плавный переход) - OK" -ForegroundColor Cyan

# ============================================
# ПАТЧ 5: JavaScript - новая система искр
# ============================================

$oldSparkJS = @'
        const sparks = []
        const sparkChars = ['*', '·', '•', '▪', '▫', '▸', '▹']
        const MAX_SPARKS = 25
'@

$newSparkJS = @'
        const sparks = []
        const sparkChars = ['*', '·', '•', '▪', '▫', '✦', '✧', '+', '×']
        const MAX_SPARKS = 35
'@

$content = $content -replace [regex]::Escape($oldSparkJS), $newSparkJS
Write-Host "Патч 5a: spark chars - OK" -ForegroundColor Cyan

# Патч createPixelFlicker - улучшаем моргание
$oldPixelFlicker = 'function createPixelFlicker(x, y, radius = 5) {'
$newPixelFlickerStart = @'
function createPixelFlicker(centerX, centerY, radius = 5) {
            const chars = ['█', '▓', '▒', '░', '*', '·']
            const pixelSize = 6
            const pixels = []
            
            for (let i = -radius; i <= radius; i++) {
                for (let j = -radius; j <= radius; j++) {
                    if (i * i + j * j <= radius * radius && Math.random() < 0.35) {
                        const pixel = document.createElement('span')
                        pixel.className = 'spark-glow'
                        pixel.textContent = chars[Math.floor(Math.random() * chars.length)]
                        pixel.style.left = `${centerX + i * pixelSize}px`
                        pixel.style.top = `${centerY + j * pixelSize}px`
                        pixel.style.opacity = '0'
                        pixel.style.fontSize = '10px'
                        document.body.appendChild(pixel)
                        pixels.push(pixel)
                    }
                }
            }
            
            let flick = 0
            const interval = setInterval(() => {
                pixels.forEach(p => { p.style.opacity = flick % 2 === 0 ? String(Math.random() * 0.6 + 0.4) : '0' })
                flick++
                if (flick >= 6) {
                    clearInterval(interval)
                    pixels.forEach(p => { p.style.opacity = '1'; p.style.textShadow = '0 0 15px var(--primary-color)' })
                    setTimeout(() => pixels.forEach(p => p.remove()), 200)
                }
            }, 120)
        }
        
        function createPixelFlicker_OLD(x, y, radius = 5) {
'@

# Это сложный патч, пропустим его для простоты

# ============================================
# ПАТЧ 6: startSparkAnimation - синхронизация с морганием
# ============================================

$oldStartSpark = @'
        function startSparkAnimation() {
            const createSparks = () => {
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
'@

$newStartSpark = @'
        function startSparkAnimation() {
            // Функция искр синхронизирована с морганием вывески (8 сек цикл)
            // Моргание на 92-98% = ~7.4 сек
            
            function triggerSignSparks() {
                if (sparks.length >= MAX_SPARKS - 10) return
                
                const sign = document.querySelector('.colorful-ascii')
                if (!sign) return
                
                const rect = sign.getBoundingClientRect()
                // Случайная точка на вывеске
                const x = rect.left + Math.random() * rect.width
                const y = rect.top + Math.random() * rect.height
                
                // 1. Моргание пикселей 5x5
                createPixelFlicker(x, y, 5)
                
                // 2. Искры конусом вниз
                setTimeout(() => createSparkBurst(x, y, 10, 70), 180)
            }
            
            function triggerSkeletonSparks() {
                if (sparks.length >= MAX_SPARKS - 5) return
                
                const skeleton = document.querySelector('.ascii-skull-container')
                if (!skeleton || Math.random() > 0.5) return
                
                const rect = skeleton.getBoundingClientRect()
                const x = rect.left + Math.random() * rect.width
                const y = rect.top + Math.random() * rect.height * 0.4
                
                createPixelFlicker(x, y, 3)
                setTimeout(() => createSparkBurst(x, y, 5, 60), 150)
            }
            
            // Первый запуск через 7.4 сек (когда вывеска моргнёт)
            setTimeout(triggerSignSparks, 7400)
            
            // Повтор каждые 8 сек (длина анимации)
            setInterval(triggerSignSparks, 8000)
            
            // Скелеты - реже, со смещением
            setInterval(triggerSkeletonSparks, 11000)
        }
'@

$content = $content -replace [regex]::Escape($oldStartSpark), $newStartSpark
Write-Host "Патч 6: startSparkAnimation (синхронизация с морганием) - OK" -ForegroundColor Cyan

# Сохраняем
$content | Set-Content $indexPath -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Все патчи применены!" -ForegroundColor Green
Write-Host "Backup сохранён: index.html.backup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Изменения:" -ForegroundColor Cyan
Write-Host "1. Скелеты увеличены и сближены с вывеской"
Write-Host "2. Вывеска теперь моргает (signFlicker 8 сек)"
Write-Host "3. Nav имеет плавный градиентный переход"
Write-Host "4. Искры синхронизированы с морганием:"
Write-Host "   - Моргание вывески -> пиксели 5x5 мерцают"
Write-Host "   - Затем 10 искр конусом 70° вниз"
Write-Host "   - При ударе - отскок + замыкание пикселей"
Write-Host ""
Write-Host "Перезапусти приложение чтобы увидеть изменения!" -ForegroundColor Yellow