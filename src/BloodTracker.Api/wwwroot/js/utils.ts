/**
 * Converts DayOfWeek from string ("Monday") or number to numeric value.
 * Backend sends string enum (JsonStringEnumConverter), frontend uses numbers.
 */
const DAY_STRING_TO_NUM: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
}

export function parseDayOfWeek(value: number | string | undefined | null): number {
    if (value == null) return 0
    if (typeof value === 'number') return value
    return DAY_STRING_TO_NUM[value] ?? 0
}

export function escapeHtml(str: unknown): string {
    if (str == null) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

interface RGB {
    r: number
    g: number
    b: number
}

export function hexToRgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

export function rgbToRgba(rgb: RGB, alpha: number): string {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

export function formatDate(date: string | Date): string {
    if (typeof date === 'string') date = new Date(date)
    const d = new Date(date)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateForInput(date: string | Date): string {
    if (typeof date === 'string') date = new Date(date)
    const d = new Date(date)
    return d.toISOString().split('T')[0]
}

/**
 * Определяет статус значения анализа относительно референсного диапазона.
 * @param {number} value — значение анализа
 * @param {{min: number, max: number}} ref — референсный диапазон
 * @returns {number} 0=норма, 1=снижен, 2=чуть выше, 3=высокий
 */
export function getStatus(value: number, ref: { min: number; max: number }): number {
    const margin = (ref.max - ref.min) * 0.1
    if (value < ref.min) return 1
    if (value > ref.max + margin) return 3
    if (value > ref.max) return 2
    return 0
}

/**
 * Возвращает CSS-класс для статуса анализа (normal/low/high и т.д.).
 * @param {number|string} status — числовой или строковый статус
 * @returns {string} CSS-класс
 */
export function getStatusClass(status: number | string): string {
    if (typeof status === 'number') {
        return ['normal', 'low', 'slightly-high', 'high', 'pending'][status] || 'pending'
    }
    if (status === 'Normal') return 'normal'
    if (status === 'Low') return 'low'
    if (status === 'SlightlyHigh') return 'slightly-high'
    if (status === 'High') return 'high'
    return 'pending'
}

/**
 * Возвращает текстовую метку статуса анализа (✓ Норма, ↓ Снижен и т.д.).
 * @param {number} status — числовой статус
 * @returns {string} текстовая метка
 */
export function getStatusText(status: number | string): string {
    if (typeof status === 'number') {
        return ['✓ Норма', '↓ Снижен', '↑ Чуть выше', '↑↑ Повышен', '—'][status] || '—'
    }
    return '—'
}

export function formatDateTime(d: string | null | undefined): string {
    if (!d) return '—'
    return new Date(d).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

/** Маппинг числовых категорий на русские названия для UI */
export const CATEGORY_NAMES: Record<number, string> = {
    0: 'Анаболические стероиды',
    1: 'Антиэстрогены',
    2: 'Пептиды и гормон роста',
    3: 'Жиросжигатели',
    4: 'Допаминовые агонисты',
    5: 'Поддержка печени',
    6: 'Витамины и минералы',
    7: 'Другое'
}

/**
 * Генерирует HTML badge для типа препарата (инъекция, таблетки и т.д.).
 * @param {number} type — числовой тип препарата
 * @returns {string} HTML строка с badge
 */
export function drugTypeBadge(type: number): string {
    const labels: Record<number, string> = { 0: 'Инъекция', 1: 'Таблетки', 2: 'Капсулы', 3: 'Крем', 4: 'Пластырь', 5: 'Другое' }
    const classes: Record<number, string> = { 0: 'badge-injection', 1: 'badge-oral', 2: 'badge-capsule', 3: 'badge-cream', 4: 'badge-patch', 5: 'badge-other' }
    return `<span class="drug-type-badge ${classes[type] || 'badge-other'}">${labels[type] || 'Другое'}</span>`
}
