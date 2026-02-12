// ═══════════════════════════════════════════════════════════════════════════════
// TREND CHART - Blood Parameter History (ApexCharts)
// ═══════════════════════════════════════════════════════════════════════════════

import { state } from '../state.js'
import { formatDate } from '../utils.js'

/**
 * Получает историю значений параметра по всем анализам пользователя.
 * Сортирует по дате, фильтрует только записи с данным параметром.
 * @param {string} paramKey — ключ параметра (например 'hemoglobin', 'testosterone')
 * @returns {Array<{date: string, value: number, label: string}>} массив значений с датами
 */
export function getParameterHistory(paramKey) {
    if (!state.analyses || state.analyses.length === 0) return []

    return state.analyses
        .filter(a => a.values && a.values[paramKey] != null)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(a => ({
            date: a.date,
            value: a.values[paramKey],
            label: a.label || formatDate(a.date)
        }))
}

/**
 * Рендерит ApexCharts линейный график тренда параметра анализов.
 * Показывает зону нормы, цветные маркеры, кастомный tooltip со статусом.
 * Требует минимум 2 анализа. Уничтожает предыдущий график если есть.
 * @param {string} containerId — ID DOM-контейнера для графика
 * @param {string} paramKey — ключ параметра для отображения
 */
export function renderTrendChart(containerId, paramKey) {
    const container = document.getElementById(containerId)
    if (!container) return

    const history = getParameterHistory(paramKey)
    const ref = state.referenceRanges[paramKey]

    if (history.length < 2) {
        container.innerHTML = `<div class="empty-state" style="padding: 30px;">
            <p>Нужно минимум 2 анализа с этим параметром для отображения тренда</p>
        </div>`
        return
    }

    const dates = history.map(h => formatDate(h.date))
    const values = history.map(h => h.value)

    // Reference range annotation
    const annotations = {}
    if (ref && ref.min != null && ref.max != null && ref.max !== 999) {
        annotations.yaxis = [{
            y: ref.min,
            y2: ref.max,
            borderColor: 'transparent',
            fillColor: 'rgba(0, 255, 102, 0.08)',
            label: {
                text: `Норма: ${ref.min}–${ref.max}`,
                style: {
                    color: '#B0A987',
                    background: 'transparent',
                    fontSize: '11px',
                    fontFamily: 'var(--ascii-font-family)'
                },
                position: 'front'
            }
        }]
    }

    const chartOptions = {
        chart: {
            type: 'line',
            height: 300,
            background: 'transparent',
            foreColor: '#B0A987',
            fontFamily: 'var(--ascii-font-family)',
            toolbar: {
                show: true,
                tools: {
                    download: false,
                    selection: false,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: false,
                    reset: true
                }
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 600
            }
        },
        series: [{
            name: ref ? ref.name : paramKey,
            data: values
        }],
        xaxis: {
            categories: dates,
            labels: {
                style: {
                    colors: '#B0A987',
                    fontSize: '11px',
                    fontFamily: 'var(--ascii-font-family)'
                },
                rotate: -45,
                rotateAlways: history.length > 5
            },
            axisBorder: { color: 'rgba(74, 246, 38, 0.3)' },
            axisTicks: { color: 'rgba(74, 246, 38, 0.3)' }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#B0A987',
                    fontSize: '11px',
                    fontFamily: 'var(--ascii-font-family)'
                },
                formatter: (val) => val != null ? val.toFixed(2) : ''
            },
            title: {
                text: ref ? ref.unit : '',
                style: { color: '#B0A987', fontSize: '11px' }
            }
        },
        stroke: {
            curve: 'smooth',
            width: 3,
            colors: ['#4AF626']
        },
        markers: {
            size: 6,
            colors: ['#FFD700'],
            strokeColors: '#4AF626',
            strokeWidth: 2,
            hover: { size: 9 }
        },
        grid: {
            borderColor: 'rgba(74, 246, 38, 0.1)',
            strokeDashArray: 4
        },
        tooltip: {
            theme: 'dark',
            style: {
                fontSize: '12px',
                fontFamily: 'var(--ascii-font-family)'
            },
            custom: ({ series, seriesIndex, dataPointIndex }) => {
                const val = series[seriesIndex][dataPointIndex]
                const label = history[dataPointIndex]?.label || ''
                const unit = ref ? ref.unit : ''
                let statusText = ''
                if (ref) {
                    if (val >= ref.min && val <= ref.max) statusText = '<span style="color:#00FF66">В норме</span>'
                    else if (val < ref.min) statusText = '<span style="color:#4A90D9">Снижен</span>'
                    else statusText = '<span style="color:#FF4444">Повышен</span>'
                }
                return `<div style="background:var(--bg-secondary,#1A1A1A);border:1px solid var(--primary-color,#4AF626);padding:10px;font-family:var(--ascii-font-family);">
                    <div style="color:var(--primary-color,#4AF626);margin-bottom:4px;">${label}</div>
                    <div><strong>${val}</strong> ${unit}</div>
                    ${statusText ? `<div style="margin-top:4px;">${statusText}</div>` : ''}
                </div>`
            }
        },
        annotations
    }

    // Destroy existing chart if any
    container.innerHTML = ''
    const chart = new ApexCharts(container, chartOptions)
    chart.render()

    // Store reference for cleanup
    container._chart = chart
}

/**
 * Уничтожает экземпляр ApexCharts в контейнере и освобождает ресурсы.
 * @param {string} containerId — ID DOM-контейнера с графиком
 */
export function destroyTrendChart(containerId) {
    const container = document.getElementById(containerId)
    if (container && container._chart) {
        container._chart.destroy()
        container._chart = null
    }
}

// Window exports
window.renderTrendChart = renderTrendChart
window.destroyTrendChart = destroyTrendChart
window.getParameterHistory = getParameterHistory
