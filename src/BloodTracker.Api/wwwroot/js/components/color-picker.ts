import { hexToRgb, rgbToRgba } from '../utils.js'

/**
 * Устанавливает основной цвет темы приложения.
 * Обновляет CSS custom properties, glow-эффекты, сохраняет в localStorage.
 * @param {string} color — HEX-цвет (например '#4AF626')
 */
export function setColor(color) {
    const rgb = hexToRgb(color)
    if (!rgb) return
    
    const root = document.documentElement
    root.style.setProperty('--primary-color', color)
    root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
    root.style.setProperty('--border', color)
    root.style.setProperty('--text-primary', color)
    root.style.setProperty('--accent', color)
    root.style.setProperty('--green', color)
    
    const glowColor = rgbToRgba(rgb, 0.5)
    const glowColor2 = rgbToRgba(rgb, 0.3)
    root.style.setProperty('--glow', `0 0 10px ${glowColor}, 0 0 20px ${glowColor2}`)
    
    const textSecondary = rgbToRgba(rgb, 0.6)
    root.style.setProperty('--text-secondary', textSecondary)
    
    const customColorEl = document.getElementById('custom-color')
    const customColorTextEl = document.getElementById('custom-color-text')
    if (customColorEl) customColorEl.value = color
    if (customColorTextEl) customColorTextEl.value = color
    
    localStorage.setItem('bloodtracker-color', color)
}

/**
 * Переключает видимость панели выбора цвета.
 */
export function toggleColorPicker() {
    const panel = document.getElementById('color-picker-panel')
    if (panel) panel.classList.toggle('active')
}

/**
 * Загружает сохранённый цвет из localStorage и применяет его.
 */
export function loadSavedColor() {
    const savedColor = localStorage.getItem('bloodtracker-color')
    if (savedColor) {
        setColor(savedColor)
    }
}

/**
 * Устанавливает ASCII-шрифт приложения.
 * Обновляет CSS custom property --ascii-font-family, сохраняет в localStorage.
 * @param {string} fontName — имя шрифта ('rotasuningr' | 'ibm')
 */
export function setFont(fontName) {
    const root = document.documentElement
    let fontFamily
    
    switch(fontName) {
        case 'rotasuningr':
            fontFamily = "'ASCII Font', 'WebPlus IBM MDA', 'VT323', monospace"
            break
        case 'ibm':
            fontFamily = "'ASCII Font Alt', 'WebPlus IBM MDA', 'VT323', monospace"
            break
        default:
            fontFamily = "'ASCII Font', 'WebPlus IBM MDA', 'VT323', monospace"
    }
    
    root.style.setProperty('--ascii-font-family', fontFamily)
    localStorage.setItem('bloodtracker-font', fontName)
    
    const fontPresets = document.querySelectorAll('.font-preset')
    if (fontPresets.length > 0) {
        fontPresets.forEach(btn => {
            btn.classList.remove('active')
        })
        
        const activeBtn = Array.from(fontPresets).find(btn => {
            const onclick = btn.getAttribute('onclick')
            return onclick && onclick.includes(fontName)
        })
        if (activeBtn) {
            activeBtn.classList.add('active')
        }
    }
}

/**
 * Загружает сохранённый шрифт из localStorage и применяет его.
 * По умолчанию использует 'rotasuningr'.
 */
export function loadSavedFont() {
    const savedFont = localStorage.getItem('bloodtracker-font')
    const fontName = savedFont || 'ibm'
    setFont(fontName)
}

// Экспортируем функции в window для использования в HTML
window.setColor = setColor
window.toggleColorPicker = toggleColorPicker
window.setFont = setFont
