export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

export function rgbToRgba(rgb, alpha) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

export function formatDate(date) {
    if (typeof date === 'string') date = new Date(date)
    const d = new Date(date)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateForInput(date) {
    if (typeof date === 'string') date = new Date(date)
    const d = new Date(date)
    return d.toISOString().split('T')[0]
}

export function getStatus(value, ref) {
    const margin = (ref.max - ref.min) * 0.1
    if (value < ref.min) return 1
    if (value > ref.max + margin) return 3
    if (value > ref.max) return 2
    return 0
}

export function getStatusClass(status) {
    if (typeof status === 'number') {
        return ['normal', 'low', 'slightly-high', 'high', 'pending'][status] || 'pending'
    }
    if (status === 'Normal') return 'normal'
    if (status === 'Low') return 'low'
    if (status === 'SlightlyHigh') return 'slightly-high'
    if (status === 'High') return 'high'
    return 'pending'
}

export function getStatusText(status) {
    if (typeof status === 'number') {
        return ['✓ Норма', '↓ Снижен', '↑ Чуть выше', '↑↑ Повышен', '—'][status] || '—'
    }
    return '—'
}
