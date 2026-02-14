import { api } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { escapeHtml } from '../utils.js'
import type {
    ExerciseProgressDto,
    MuscleGroupProgressDto,
    PersonalRecordLogDto,
    UserExercisePRDto,
    WorkoutStatsDto,
    PagedResult,
} from '../types/workouts.js'

declare const ApexCharts: any

const MUSCLE_GROUP_LABELS: Record<string, string> = {
    'FullBody': 'Всё тело',
    'Chest': 'Грудь',
    'Back': 'Спина',
    'Shoulders': 'Плечи',
    'Biceps': 'Бицепс',
    'Triceps': 'Трицепс',
    'Forearms': 'Предплечья',
    'Abs': 'Пресс',
    'Glutes': 'Ягодицы',
    'Quadriceps': 'Квадрицепс',
    'Hamstrings': 'Бицепс бедра',
    'Calves': 'Икры',
    '0': 'Всё тело',
    '1': 'Грудь',
    '2': 'Спина',
    '3': 'Плечи',
    '4': 'Бицепс',
    '5': 'Трицепс',
    '6': 'Предплечья',
    '7': 'Пресс',
    '8': 'Ягодицы',
    '9': 'Квадрицепс',
    '10': 'Бицепс бедра',
    '11': 'Икры',
}

const MUSCLE_GROUPS_LIST = [
    { value: 'FullBody', label: 'Всё тело' },
    { value: 'Chest', label: 'Грудь' },
    { value: 'Back', label: 'Спина' },
    { value: 'Shoulders', label: 'Плечи' },
    { value: 'Biceps', label: 'Бицепс' },
    { value: 'Triceps', label: 'Трицепс' },
    { value: 'Forearms', label: 'Предплечья' },
    { value: 'Abs', label: 'Пресс' },
    { value: 'Glutes', label: 'Ягодицы' },
    { value: 'Quadriceps', label: 'Квадрицепс' },
    { value: 'Hamstrings', label: 'Бицепс бедра' },
    { value: 'Calves', label: 'Икры' },
]

const RECORD_TYPE_LABELS: Record<string, string> = {
    'MaxWeight': 'Макс. вес',
    'MaxEstimated1RM': 'Расч. 1RM',
    'MaxRepAtWeight': 'Макс. повторений',
    'MaxVolumeSingleSession': 'Макс. объём',
    'MaxReps': 'Макс. повторений',
    'MaxTonnage': 'Макс. тоннаж',
    'MaxVolume': 'Макс. объём',
}

let activeCharts: any[] = []
let currentTab = 'exercises'

function destroyAllCharts(): void {
    activeCharts.forEach(c => {
        try { c.destroy() } catch (_) {}
    })
    activeCharts = []
}

function createChart(container: HTMLElement, options: any): any {
    const chart = new ApexCharts(container, options)
    chart.render()
    activeCharts.push(chart)
    return chart
}

function baseChartOptions(overrides: any = {}): any {
    return {
        chart: {
            height: 280,
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
            },
            ...overrides.chart,
        },
        theme: { mode: 'dark' as const },
        grid: {
            borderColor: 'rgba(74, 246, 38, 0.1)',
            strokeDashArray: 4,
            ...overrides.grid,
        },
        xaxis: {
            labels: {
                style: {
                    colors: '#B0A987',
                    fontSize: '11px',
                    fontFamily: 'var(--ascii-font-family)'
                },
                rotate: -45,
            },
            axisBorder: { color: 'rgba(74, 246, 38, 0.3)' },
            axisTicks: { color: 'rgba(74, 246, 38, 0.3)' },
            ...overrides.xaxis,
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#B0A987',
                    fontSize: '11px',
                    fontFamily: 'var(--ascii-font-family)'
                },
            },
            ...overrides.yaxis,
        },
        tooltip: {
            theme: 'dark',
            style: {
                fontSize: '12px',
                fontFamily: 'var(--ascii-font-family)'
            },
            ...overrides.tooltip,
        },
        ...overrides,
    }
}

function formatShortDate(dateStr: string): string {
    const d = new Date(dateStr)
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    return `${d.getDate()} ${months[d.getMonth()]}`
}

function getDateRange(range: string): { from?: string; to?: string } {
    if (range === 'all') return {}
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    const from = new Date(now)
    if (range === '30d') from.setDate(from.getDate() - 30)
    else if (range === '90d') from.setDate(from.getDate() - 90)
    return { from: from.toISOString().split('T')[0], to }
}

function formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    if (hours > 0) return `${hours}ч ${minutes}м`
    return `${minutes}м`
}

function formatNumber(n: number): string {
    return n.toLocaleString('ru-RU')
}

function renderDateRangeSelector(selectedRange: string, onChange: (range: string) => void): string {
    const id = 'dr-' + Math.random().toString(36).slice(2, 8)
    setTimeout(() => {
        const el = document.getElementById(id)
        if (!el) return
        el.querySelectorAll('.analytics-range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                el.querySelectorAll('.analytics-range-btn').forEach(b => b.classList.remove('active'))
                btn.classList.add('active')
                onChange((btn as HTMLElement).dataset.range!)
            })
        })
    }, 0)
    return `<div class="analytics-range-selector" id="${id}">
        <button class="analytics-range-btn${selectedRange === '30d' ? ' active' : ''}" data-range="30d">30 дней</button>
        <button class="analytics-range-btn${selectedRange === '90d' ? ' active' : ''}" data-range="90d">90 дней</button>
        <button class="analytics-range-btn${selectedRange === 'all' ? ' active' : ''}" data-range="all">Всё время</button>
    </div>`
}

async function renderExercisesTab(container: HTMLElement): Promise<void> {
    container.innerHTML = '<div class="loading">Загрузка...</div>'

    let exerciseNames: string[] = []
    try {
        const prs = await api<UserExercisePRDto[]>(ENDPOINTS.analytics.exercisePRs)
        exerciseNames = prs.map(p => p.exerciseName)
    } catch (_) {}

    if (exerciseNames.length === 0) {
        container.innerHTML = '<div class="analytics-empty">Нет данных об упражнениях. Завершите хотя бы одну тренировку.</div>'
        return
    }

    let selectedExercise = exerciseNames[0]
    let selectedRange = '90d'

    function renderControls(): string {
        const options = exerciseNames.map(n =>
            `<option value="${escapeHtml(n)}"${n === selectedExercise ? ' selected' : ''}>${escapeHtml(n)}</option>`
        ).join('')
        return `<div class="analytics-controls">
            <select class="analytics-select" id="analytics-exercise-select">${options}</select>
            ${renderDateRangeSelector(selectedRange, async (r) => { selectedRange = r; await loadExerciseData() })}
        </div>`
    }

    async function loadExerciseData(): Promise<void> {
        destroyAllCharts()
        const chartsArea = document.getElementById('analytics-exercise-charts')
        if (!chartsArea) return
        chartsArea.innerHTML = '<div class="loading">Загрузка...</div>'

        try {
            const { from, to } = getDateRange(selectedRange)
            const data = await api<ExerciseProgressDto>(ENDPOINTS.analytics.exerciseProgress(selectedExercise, from, to))

            if (!data.dataPoints || data.dataPoints.length === 0) {
                chartsArea.innerHTML = '<div class="analytics-empty">Нет данных за выбранный период.</div>'
                return
            }

            const dates = data.dataPoints.map(p => formatShortDate(p.date))
            const weights = data.dataPoints.map(p => p.maxWeight)
            const e1rms = data.dataPoints.map(p => p.bestEstimated1RM)
            const volumes = data.dataPoints.map(p => p.totalReps)

            let prHtml = ''
            if (data.currentPR != null) {
                prHtml = `<div class="analytics-pr-card">
                    <span class="analytics-pr-icon">🏆</span>
                    <span class="analytics-pr-text">Текущий PR: <strong>${escapeHtml(String(data.currentPR))} кг</strong></span>
                </div>`
            }

            chartsArea.innerHTML = `
                <div class="analytics-chart-block">
                    <div class="analytics-chart-title">Макс. вес (кг)</div>
                    <div id="chart-weight"></div>
                </div>
                <div class="analytics-chart-block">
                    <div class="analytics-chart-title">Расчётный 1RM (кг)</div>
                    <div id="chart-e1rm"></div>
                </div>
                <div class="analytics-chart-block">
                    <div class="analytics-chart-title">Объём (повторения)</div>
                    <div id="chart-volume"></div>
                </div>
                ${prHtml}`

            const weightEl = document.getElementById('chart-weight')
            const e1rmEl = document.getElementById('chart-e1rm')
            const volumeEl = document.getElementById('chart-volume')

            if (weightEl) {
                createChart(weightEl, baseChartOptions({
                    chart: { type: 'line', height: 280 },
                    series: [{ name: 'Макс. вес', data: weights }],
                    xaxis: { categories: dates },
                    stroke: { curve: 'smooth', width: 3, colors: ['#4AF626'] },
                    markers: { size: 5, colors: ['#FFD700'], strokeColors: '#4AF626', strokeWidth: 2 },
                    yaxis: { labels: { style: { colors: '#B0A987', fontSize: '11px', fontFamily: 'var(--ascii-font-family)' }, formatter: (v: number) => v != null ? v.toFixed(1) : '' } },
                }))
            }

            if (e1rmEl) {
                createChart(e1rmEl, baseChartOptions({
                    chart: { type: 'line', height: 280 },
                    series: [{ name: 'Расч. 1RM', data: e1rms }],
                    xaxis: { categories: dates },
                    stroke: { curve: 'smooth', width: 3, colors: ['#FBB954'] },
                    markers: { size: 5, colors: ['#FFD700'], strokeColors: '#FBB954', strokeWidth: 2 },
                    yaxis: { labels: { style: { colors: '#B0A987', fontSize: '11px', fontFamily: 'var(--ascii-font-family)' }, formatter: (v: number) => v != null ? v.toFixed(1) : '' } },
                }))
            }

            if (volumeEl) {
                createChart(volumeEl, baseChartOptions({
                    chart: { type: 'bar', height: 280 },
                    series: [{ name: 'Повторения', data: volumes }],
                    xaxis: { categories: dates },
                    plotOptions: { bar: { borderRadius: 2, columnWidth: '60%' } },
                    fill: { colors: ['#4A90D9'] },
                    yaxis: { labels: { style: { colors: '#B0A987', fontSize: '11px', fontFamily: 'var(--ascii-font-family)' } } },
                }))
            }
        } catch (err) {
            chartsArea.innerHTML = '<div class="analytics-empty">Ошибка загрузки данных.</div>'
        }
    }

    container.innerHTML = `${renderControls()}<div id="analytics-exercise-charts"></div>`

    const select = document.getElementById('analytics-exercise-select') as HTMLSelectElement
    if (select) {
        select.addEventListener('change', async () => {
            selectedExercise = select.value
            await loadExerciseData()
        })
    }

    await loadExerciseData()
}

async function renderRecordsTab(container: HTMLElement): Promise<void> {
    container.innerHTML = '<div class="loading">Загрузка...</div>'

    try {
        const [prs, prLog] = await Promise.all([
            api<UserExercisePRDto[]>(ENDPOINTS.analytics.exercisePRs),
            api<PagedResult<PersonalRecordLogDto>>(ENDPOINTS.analytics.personalRecords(undefined, 1, 50)),
        ])

        if (prs.length === 0) {
            container.innerHTML = '<div class="analytics-empty">Пока нет персональных рекордов. Тренируйтесь!</div>'
            return
        }

        const prCards = prs.map(pr => {
            const rows: string[] = []
            if (pr.bestWeight != null) {
                rows.push(`<div class="analytics-pr-row">
                    <span class="analytics-pr-row-icon">🏆</span>
                    <span class="analytics-pr-row-label">Макс. вес:</span>
                    <span class="analytics-pr-row-value">${escapeHtml(String(pr.bestWeight))} кг</span>
                    <span class="analytics-pr-row-date">${pr.bestWeightDate ? formatShortDate(pr.bestWeightDate) : ''}</span>
                </div>`)
            }
            if (pr.bestE1RM != null) {
                rows.push(`<div class="analytics-pr-row">
                    <span class="analytics-pr-row-icon">🏆</span>
                    <span class="analytics-pr-row-label">Расч. 1RM:</span>
                    <span class="analytics-pr-row-value">${escapeHtml(String(pr.bestE1RM.toFixed(1)))} кг</span>
                    <span class="analytics-pr-row-date">${pr.bestE1RMDate ? formatShortDate(pr.bestE1RMDate) : ''}</span>
                </div>`)
            }
            if (pr.bestVolumeSingleSession != null) {
                rows.push(`<div class="analytics-pr-row">
                    <span class="analytics-pr-row-icon">🏆</span>
                    <span class="analytics-pr-row-label">Макс. объём:</span>
                    <span class="analytics-pr-row-value">${escapeHtml(String(pr.bestVolumeSingleSession))} повт.</span>
                    <span class="analytics-pr-row-date">${pr.bestVolumeDate ? formatShortDate(pr.bestVolumeDate) : ''}</span>
                </div>`)
            }
            if (rows.length === 0) return ''
            return `<div class="analytics-pr-card-group">
                <div class="analytics-pr-card-group-title">${escapeHtml(pr.exerciseName)}</div>
                ${rows.join('')}
            </div>`
        }).filter(Boolean).join('')

        let timelineHtml = ''
        if (prLog.items && prLog.items.length > 0) {
            const entries = prLog.items.map(item => {
                const typeLabel = RECORD_TYPE_LABELS[item.recordType] || escapeHtml(item.recordType)
                const prev = item.previousValue != null ? ` (было ${escapeHtml(String(item.previousValue))}` +
                    (item.improvementPercent ? `, +${escapeHtml(String(item.improvementPercent.toFixed(1)))}%` : '') + ')' : ''
                return `<div class="analytics-timeline-entry">
                    <span class="analytics-timeline-date">${formatShortDate(item.achievedAt)}</span>
                    <span class="analytics-timeline-icon">🏆</span>
                    <span class="analytics-timeline-text">
                        <strong>${escapeHtml(item.exerciseName)}</strong>: ${escapeHtml(typeLabel)} ${escapeHtml(String(item.value))}${prev}
                    </span>
                </div>`
            }).join('')

            timelineHtml = `<div class="analytics-section-title">Хронология рекордов</div>
                <div class="analytics-timeline">${entries}</div>`
        }

        container.innerHTML = `<div class="analytics-pr-cards">${prCards}</div>${timelineHtml}`
    } catch (_) {
        container.innerHTML = '<div class="analytics-empty">Ошибка загрузки рекордов.</div>'
    }
}

async function renderStatsTab(container: HTMLElement): Promise<void> {
    container.innerHTML = '<div class="loading">Загрузка...</div>'

    let selectedRange = '90d'

    async function loadStats(): Promise<void> {
        destroyAllCharts()
        container.innerHTML = '<div class="loading">Загрузка...</div>'

        try {
            const { from, to } = getDateRange(selectedRange)
            const calFrom = from || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
            const calTo = to || new Date().toISOString().split('T')[0]

            const [stats, calendar] = await Promise.all([
                api<WorkoutStatsDto>(ENDPOINTS.analytics.stats(from, to)),
                api<string[]>(ENDPOINTS.analytics.calendar(calFrom, calTo)),
            ])

            const totalDur = formatDuration(stats.totalDurationSeconds)
            const avgDur = formatDuration(stats.avgDurationSecondsPerWorkout)

            const statsCardsHtml = `<div class="analytics-stats-grid">
                <div class="analytics-stat-card">
                    <div class="analytics-stat-label">Тренировки</div>
                    <div class="analytics-stat-value">${escapeHtml(String(stats.totalWorkouts))}</div>
                    <div class="analytics-stat-sub">${escapeHtml(String(stats.workoutsPerWeek.toFixed(1)))}/нед</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-stat-label">Тоннаж</div>
                    <div class="analytics-stat-value">${escapeHtml(formatNumber(Math.round(stats.totalTonnage)))} кг</div>
                    <div class="analytics-stat-sub">${escapeHtml(formatNumber(Math.round(stats.avgTonnagePerWorkout)))}/тр</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-stat-label">Объём</div>
                    <div class="analytics-stat-value">${escapeHtml(formatNumber(stats.totalVolume))} повт</div>
                    <div class="analytics-stat-sub">${escapeHtml(String(Math.round(stats.avgVolumePerWorkout)))}/тр</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-stat-label">Время</div>
                    <div class="analytics-stat-value">${escapeHtml(totalDur)}</div>
                    <div class="analytics-stat-sub">${escapeHtml(avgDur)}/тр</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-stat-label">Отдых</div>
                    <div class="analytics-stat-value">${escapeHtml(String(Math.round(stats.avgRestSeconds)))}с</div>
                    <div class="analytics-stat-sub">среднее</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-stat-label">Рекорды</div>
                    <div class="analytics-stat-value">${escapeHtml(String(stats.totalPersonalRecords))}</div>
                    <div class="analytics-stat-sub">всего</div>
                </div>
            </div>`

            let muscleFreqHtml = ''
            const freqEntries = Object.entries(stats.muscleGroupFrequency || {})
            if (freqEntries.length > 0) {
                const maxFreq = Math.max(...freqEntries.map(([, v]) => v), 1)
                const bars = freqEntries.sort((a, b) => b[1] - a[1]).map(([group, freq]) => {
                    const pct = Math.round((freq / maxFreq) * 100)
                    const label = MUSCLE_GROUP_LABELS[group] || escapeHtml(group)
                    return `<div class="analytics-freq-row">
                        <span class="analytics-freq-label">${escapeHtml(label)}</span>
                        <div class="analytics-freq-bar-bg">
                            <div class="analytics-freq-bar-fill" style="width: ${pct}%"></div>
                        </div>
                        <span class="analytics-freq-value">${escapeHtml(String(freq.toFixed(1)))}/нед</span>
                    </div>`
                }).join('')
                muscleFreqHtml = `<div class="analytics-section-title">Частота по группам мышц</div>
                    <div class="analytics-freq-list">${bars}</div>`
            }

            const calendarHtml = renderCalendarHeatmap(calendar || [], calFrom, calTo)

            let weeklyTrendHtml = ''
            if (stats.weeklyTrend && stats.weeklyTrend.length > 1) {
                weeklyTrendHtml = `<div class="analytics-section-title">Недельный тренд</div>
                    <div class="analytics-chart-block"><div id="chart-weekly-trend"></div></div>`
            }

            const rangeHtml = renderDateRangeSelector(selectedRange, async (r) => {
                selectedRange = r
                await loadStats()
            })

            container.innerHTML = `<div class="analytics-controls">${rangeHtml}</div>
                ${statsCardsHtml}
                ${muscleFreqHtml}
                ${calendarHtml}
                ${weeklyTrendHtml}`

            if (stats.weeklyTrend && stats.weeklyTrend.length > 1) {
                const trendEl = document.getElementById('chart-weekly-trend')
                if (trendEl) {
                    const labels = stats.weeklyTrend.map(w => `Н${w.week}`)
                    createChart(trendEl, baseChartOptions({
                        chart: { type: 'line', height: 300 },
                        series: [
                            { name: 'Тоннаж (кг)', type: 'column', data: stats.weeklyTrend.map(w => Math.round(w.tonnage)) },
                            { name: 'Тренировки', type: 'line', data: stats.weeklyTrend.map(w => w.sessions) },
                        ],
                        xaxis: { categories: labels },
                        stroke: { width: [0, 3], curve: 'smooth' },
                        plotOptions: { bar: { borderRadius: 2, columnWidth: '50%' } },
                        fill: { opacity: [0.85, 1] },
                        colors: ['#4A90D9', '#4AF626'],
                        yaxis: [
                            { title: { text: 'Тоннаж (кг)', style: { color: '#B0A987', fontSize: '11px' } }, labels: { style: { colors: '#B0A987', fontSize: '11px', fontFamily: 'var(--ascii-font-family)' } } },
                            { opposite: true, title: { text: 'Тренировки', style: { color: '#B0A987', fontSize: '11px' } }, labels: { style: { colors: '#B0A987', fontSize: '11px', fontFamily: 'var(--ascii-font-family)' } } },
                        ],
                    }))
                }
            }
        } catch (_) {
            container.innerHTML = '<div class="analytics-empty">Ошибка загрузки статистики.</div>'
        }
    }

    await loadStats()
}

function renderCalendarHeatmap(workoutDates: string[], fromStr: string, toStr: string): string {
    const workoutSet = new Set(workoutDates.map(d => d.split('T')[0]))
    const from = new Date(fromStr)
    const to = new Date(toStr)

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

    const startDay = new Date(from)
    const dayOfWeek = startDay.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startDay.setDate(startDay.getDate() + mondayOffset)

    const weeks: { dates: (string | null)[] }[] = []
    const current = new Date(startDay)

    while (current <= to || weeks.length === 0) {
        const week: (string | null)[] = []
        for (let d = 0; d < 7; d++) {
            const dateStr = current.toISOString().split('T')[0]
            if (current >= from && current <= to) {
                week.push(dateStr)
            } else {
                week.push(null)
            }
            current.setDate(current.getDate() + 1)
        }
        weeks.push({ dates: week })
        if (current > to) break
    }

    const monthLabels: { col: number; label: string }[] = []
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    let lastMonth = -1
    weeks.forEach((week, idx) => {
        const firstDate = week.dates.find(d => d != null)
        if (firstDate) {
            const m = new Date(firstDate).getMonth()
            if (m !== lastMonth) {
                monthLabels.push({ col: idx, label: months[m] })
                lastMonth = m
            }
        }
    })

    const monthRow = `<div class="heatmap-month-row" style="grid-template-columns: 30px repeat(${weeks.length}, 1fr);">
        <div></div>
        ${weeks.map((_, idx) => {
            const ml = monthLabels.find(m => m.col === idx)
            return `<div class="heatmap-month-label">${ml ? escapeHtml(ml.label) : ''}</div>`
        }).join('')}
    </div>`

    const rows = dayNames.map((name, dayIdx) => {
        const cells = weeks.map(week => {
            const dateStr = week.dates[dayIdx]
            if (!dateStr) return '<div class="heatmap-cell heatmap-empty"></div>'
            const isWorkout = workoutSet.has(dateStr)
            return `<div class="heatmap-cell ${isWorkout ? 'heatmap-active' : 'heatmap-rest'}" title="${escapeHtml(dateStr)}"></div>`
        }).join('')
        return `<div class="heatmap-row" style="grid-template-columns: 30px repeat(${weeks.length}, 1fr);">
            <div class="heatmap-day-label">${escapeHtml(name)}</div>
            ${cells}
        </div>`
    }).join('')

    return `<div class="analytics-section-title">Календарь тренировок</div>
        <div class="analytics-heatmap">
            ${monthRow}
            ${rows}
            <div class="heatmap-legend">
                <span class="heatmap-cell heatmap-active" style="display:inline-block;"></span> тренировка
                <span class="heatmap-cell heatmap-rest" style="display:inline-block; margin-left: 12px;"></span> отдых
            </div>
        </div>`
}

async function renderMusclesTab(container: HTMLElement): Promise<void> {
    container.innerHTML = '<div class="loading">Загрузка...</div>'

    let selectedGroup = 'Chest'
    let selectedRange = '90d'

    function renderControls(): string {
        const options = MUSCLE_GROUPS_LIST.map(mg =>
            `<option value="${escapeHtml(mg.value)}"${mg.value === selectedGroup ? ' selected' : ''}>${escapeHtml(mg.label)}</option>`
        ).join('')
        return `<div class="analytics-controls">
            <select class="analytics-select" id="analytics-muscle-select">${options}</select>
            ${renderDateRangeSelector(selectedRange, async (r) => { selectedRange = r; await loadMuscleData() })}
        </div>`
    }

    async function loadMuscleData(): Promise<void> {
        destroyAllCharts()
        const chartsArea = document.getElementById('analytics-muscle-charts')
        if (!chartsArea) return
        chartsArea.innerHTML = '<div class="loading">Загрузка...</div>'

        try {
            const { from, to } = getDateRange(selectedRange)
            const data = await api<MuscleGroupProgressDto>(ENDPOINTS.analytics.muscleGroupProgress(selectedGroup, from, to))

            if (!data.weekly || data.weekly.length === 0) {
                chartsArea.innerHTML = '<div class="analytics-empty">Нет данных за выбранный период.</div>'
                return
            }

            const labels = data.weekly.map(w => `Н${w.week}`)
            const tonnageData = data.weekly.map(w => Math.round(w.totalTonnage))
            const totalTonnage = data.weekly.reduce((s, w) => s + w.totalTonnage, 0)
            const totalSets = data.weekly.reduce((s, w) => s + w.totalSets, 0)
            const totalReps = data.weekly.reduce((s, w) => s + w.totalReps, 0)

            chartsArea.innerHTML = `
                <div class="analytics-chart-block">
                    <div class="analytics-chart-title">Недельный тоннаж (кг)</div>
                    <div id="chart-muscle-tonnage"></div>
                </div>
                <div class="analytics-stats-grid analytics-stats-grid-3">
                    <div class="analytics-stat-card">
                        <div class="analytics-stat-label">Тоннаж</div>
                        <div class="analytics-stat-value">${escapeHtml(formatNumber(Math.round(totalTonnage)))} кг</div>
                    </div>
                    <div class="analytics-stat-card">
                        <div class="analytics-stat-label">Подходы</div>
                        <div class="analytics-stat-value">${escapeHtml(String(totalSets))}</div>
                    </div>
                    <div class="analytics-stat-card">
                        <div class="analytics-stat-label">Повторения</div>
                        <div class="analytics-stat-value">${escapeHtml(formatNumber(totalReps))}</div>
                    </div>
                </div>`

            const chartEl = document.getElementById('chart-muscle-tonnage')
            if (chartEl) {
                createChart(chartEl, baseChartOptions({
                    chart: { type: 'area', height: 300 },
                    series: [{ name: 'Тоннаж', data: tonnageData }],
                    xaxis: { categories: labels },
                    stroke: { curve: 'smooth', width: 3 },
                    fill: {
                        type: 'gradient',
                        gradient: {
                            shadeIntensity: 1,
                            opacityFrom: 0.45,
                            opacityTo: 0.05,
                            stops: [0, 100]
                        }
                    },
                    colors: ['#00FF66'],
                    yaxis: { labels: { style: { colors: '#B0A987', fontSize: '11px', fontFamily: 'var(--ascii-font-family)' } } },
                }))
            }
        } catch (_) {
            chartsArea.innerHTML = '<div class="analytics-empty">Ошибка загрузки данных.</div>'
        }
    }

    container.innerHTML = `${renderControls()}<div id="analytics-muscle-charts"></div>`

    const select = document.getElementById('analytics-muscle-select') as HTMLSelectElement
    if (select) {
        select.addEventListener('change', async () => {
            selectedGroup = select.value
            await loadMuscleData()
        })
    }

    await loadMuscleData()
}

function renderTabButtons(activeTab: string): string {
    const tabs = [
        { id: 'exercises', label: 'УПРАЖНЕНИЯ' },
        { id: 'records', label: 'РЕКОРДЫ' },
        { id: 'stats', label: 'СТАТИСТИКА' },
        { id: 'muscles', label: 'МЫШЦЫ' },
    ]
    return `<div class="analytics-tabs">
        ${tabs.map(t => `<button class="analytics-tab${t.id === activeTab ? ' active' : ''}" data-analytics-tab="${t.id}">${t.label}</button>`).join('')}
    </div>`
}

async function switchAnalyticsTab(tabId: string): Promise<void> {
    currentTab = tabId
    destroyAllCharts()

    document.querySelectorAll('.analytics-tab').forEach(btn => btn.classList.remove('active'))
    const activeBtn = document.querySelector(`[data-analytics-tab="${tabId}"]`)
    if (activeBtn) activeBtn.classList.add('active')

    const tabContent = document.getElementById('analytics-tab-content')
    if (!tabContent) return

    tabContent.innerHTML = '<div class="loading">Загрузка...</div>'

    switch (tabId) {
        case 'exercises':
            await renderExercisesTab(tabContent)
            break
        case 'records':
            await renderRecordsTab(tabContent)
            break
        case 'stats':
            await renderStatsTab(tabContent)
            break
        case 'muscles':
            await renderMusclesTab(tabContent)
            break
    }
}

export async function initAnalytics(): Promise<void> {
    const root = document.getElementById('analytics-content')
    if (!root) return

    destroyAllCharts()

    root.innerHTML = `
        ${renderTabButtons(currentTab)}
        <div id="analytics-tab-content"></div>
    `

    root.querySelectorAll('.analytics-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = (btn as HTMLElement).dataset.analyticsTab!
            switchAnalyticsTab(tabId)
        })
    })

    await switchAnalyticsTab(currentTab)
}
