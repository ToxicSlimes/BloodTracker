// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADING GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

export function skeletonText(lines = 3) {
    return Array.from({ length: lines }, (_, i) =>
        `<div class="skeleton skeleton-text" style="width:${i === lines - 1 ? 60 : 80 + Math.random() * 20}%"></div>`
    ).join('')
}

export function skeletonTitle() {
    return '<div class="skeleton skeleton-title"></div>'
}

export function skeletonCard() {
    return `<div class="skeleton skeleton-card">
        ${skeletonTitle()}
        ${skeletonText(2)}
    </div>`
}

export function skeletonStat() {
    return '<div class="skeleton skeleton-stat"></div>'
}

export function skeletonStats(count = 3) {
    return `<div class="skeleton-stats">${
        Array.from({ length: count }, () => skeletonStat()).join('')
    }</div>`
}

export function skeletonTableRows(count = 5) {
    return Array.from({ length: count }, () =>
        '<div class="skeleton skeleton-table-row"></div>'
    ).join('')
}

export function skeletonDrugCards(count = 3) {
    return Array.from({ length: count }, () =>
        '<div class="skeleton skeleton-drug-card"></div>'
    ).join('')
}

// Make generators globally accessible
window.skeleton = {
    text: skeletonText,
    title: skeletonTitle,
    card: skeletonCard,
    stat: skeletonStat,
    stats: skeletonStats,
    tableRows: skeletonTableRows,
    drugCards: skeletonDrugCards
}
