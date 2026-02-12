// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADING GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Генерирует HTML skeleton-заглушку для текстовых строк.
 * Последняя строка короче (60%) для реалистичности.
 * @param {number} [lines=3] — количество строк
 * @returns {string} HTML строка с skeleton-элементами
 */
export function skeletonText(lines = 3) {
    return Array.from({ length: lines }, (_, i) =>
        `<div class="skeleton skeleton-text" style="width:${i === lines - 1 ? 60 : 80 + Math.random() * 20}%"></div>`
    ).join('')
}

/**
 * Генерирует HTML skeleton-заглушку для заголовка.
 * @returns {string} HTML строка с skeleton-title
 */
export function skeletonTitle() {
    return '<div class="skeleton skeleton-title"></div>'
}

/**
 * Генерирует HTML skeleton-заглушку для карточки (заголовок + 2 строки текста).
 * @returns {string} HTML строка с skeleton-card
 */
export function skeletonCard() {
    return `<div class="skeleton skeleton-card">
        ${skeletonTitle()}
        ${skeletonText(2)}
    </div>`
}

/**
 * Генерирует HTML skeleton-заглушку для одного stat-блока.
 * @returns {string} HTML строка с skeleton-stat
 */
export function skeletonStat() {
    return '<div class="skeleton skeleton-stat"></div>'
}

/**
 * Генерирует HTML skeleton-заглушку для группы stat-блоков.
 * @param {number} [count=3] — количество stat-блоков
 * @returns {string} HTML строка с skeleton-stats контейнером
 */
export function skeletonStats(count = 3) {
    return `<div class="skeleton-stats">${
        Array.from({ length: count }, () => skeletonStat()).join('')
    }</div>`
}

/**
 * Генерирует HTML skeleton-заглушку для строк таблицы.
 * @param {number} [count=5] — количество строк
 * @returns {string} HTML строка с skeleton-table-row элементами
 */
export function skeletonTableRows(count = 5) {
    return Array.from({ length: count }, () =>
        '<div class="skeleton skeleton-table-row"></div>'
    ).join('')
}

/**
 * Генерирует HTML skeleton-заглушку для карточек препаратов.
 * @param {number} [count=3] — количество карточек
 * @returns {string} HTML строка с skeleton-drug-card элементами
 */
export function skeletonDrugCards(count = 3) {
    return Array.from({ length: count }, () =>
        '<div class="skeleton skeleton-drug-card"></div>'
    ).join('')
}

/**
 * Глобальный объект skeleton-генераторов.
 * Доступен через window.skeleton для использования в HTML.
 */
window.skeleton = {
    text: skeletonText,
    title: skeletonTitle,
    card: skeletonCard,
    stat: skeletonStat,
    stats: skeletonStats,
    tableRows: skeletonTableRows,
    drugCards: skeletonDrugCards
}
