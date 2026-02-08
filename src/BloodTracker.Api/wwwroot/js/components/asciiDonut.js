// ═══════════════════════════════════════════════════════════════════════════════
// ASCII Progress Chart - 3D style progress bar visualization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate ASCII progress chart
 * @param {number} consumed - consumed amount (red)
 * @param {number} remaining - remaining amount (green)
 * @param {object} options - { size: 'small'|'medium'|'large', showLegend: boolean }
 */
export function generateAsciiDonut(consumed, remaining, options = {}) {
    const { size = 'medium', showLegend = true } = options;
    const total = consumed + remaining;

    if (total === 0) {
        return generateEmptyBar(size);
    }

    const percent = Math.round((consumed / total) * 100);

    if (size === 'small') {
        return generateSmallBar(percent, consumed, remaining, showLegend);
    } else if (size === 'large') {
        return generateLargeBar(percent, consumed, remaining, showLegend);
    }
    return generateMediumBar(percent, consumed, remaining, showLegend);
}

function generateEmptyBar(size) {
    const width = size === 'small' ? 10 : size === 'large' ? 24 : 16;
    const emptyBar = '░'.repeat(width);

    return `<pre class="ascii-donut ascii-donut-${size}">
╔${'═'.repeat(width + 2)}╗
║ ${emptyBar} ║
╚${'═'.repeat(width + 2)}╝
<span class="donut-empty">НЕТ ДАННЫХ</span>
</pre>`;
}

function generateSmallBar(percent, consumed, remaining, showLegend) {
    const width = 10;
    const filled = Math.round((percent / 100) * width);

    let bar = '';
    for (let i = 0; i < width; i++) {
        if (i < filled) {
            bar += `<span class="donut-consumed">█</span>`;
        } else {
            bar += `<span class="donut-remaining">░</span>`;
        }
    }

    const percentStr = `${percent}%`.padStart(4);

    let html = `<pre class="ascii-donut ascii-donut-small">
<span class="donut-percent">${percentStr}</span> [${bar}]`;

    if (showLegend) {
        html += `
<span class="donut-consumed">█</span>${consumed} <span class="donut-remaining">░</span>${remaining}`;
    }

    html += `</pre>`;
    return html;
}

function generateMediumBar(percent, consumed, remaining, showLegend) {
    const width = 20;
    const filled = Math.round((percent / 100) * width);

    let bar = '';
    for (let i = 0; i < width; i++) {
        if (i < filled) {
            bar += `<span class="donut-consumed">█</span>`;
        } else {
            bar += `<span class="donut-remaining">░</span>`;
        }
    }

    const percentStr = `${percent}%`.padStart(4);

    let html = `<pre class="ascii-donut">
╔══════════════════════════╗
║      PROGRESS: <span class="donut-percent">${percentStr}</span>      ║
║ [${bar}] ║
╚══════════════════════════╝`;

    if (showLegend) {
        html += `
<span class="donut-consumed">██</span> ПРИНЯТО:  ${String(consumed).padStart(4)} доз
<span class="donut-remaining">░░</span> ОСТАЛОСЬ: ${String(remaining).padStart(4)} доз`;
    }

    html += `</pre>`;
    return html;
}

function generateLargeBar(percent, consumed, remaining, showLegend) {
    const width = 24;
    const filled = Math.round((percent / 100) * width);

    let bar = '';
    for (let i = 0; i < width; i++) {
        if (i < filled) {
            bar += `<span class="donut-consumed">█</span>`;
        } else {
            bar += `<span class="donut-remaining">░</span>`;
        }
    }

    const percentStr = `${percent}%`.padStart(4);

    let html = `<pre class="ascii-donut ascii-donut-large">
╔══════════════════════════════╗
║         ПРОГРЕСС КУРСА       ║
╠══════════════════════════════╣
║                              ║
║   <span class="donut-percent">${percentStr}</span>                      ║
║   [${bar}]   ║
║                              ║
╚══════════════════════════════╝
<span class="donut-shadow">▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀</span>`;

    if (showLegend) {
        html += `
┌──────────────────────────────┐
│ <span class="donut-consumed">███</span> ПРИНЯТО:  ${String(consumed).padStart(6)} доз   │
│ <span class="donut-remaining">░░░</span> ОСТАЛОСЬ: ${String(remaining).padStart(6)} доз   │
└──────────────────────────────┘`;
    }

    html += `</pre>`;
    return html;
}

/**
 * Render ASCII donut into a container element
 */
export function renderAsciiDonut(containerId, consumed, remaining, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = generateAsciiDonut(consumed, remaining, options);
}

// Export to window for global access
window.generateAsciiDonut = generateAsciiDonut;
window.renderAsciiDonut = renderAsciiDonut;
