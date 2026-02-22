import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { api } from '../../api.js'
import { ENDPOINTS } from '../../endpoints.js'
import { escapeHtml } from '../../utils.js'
import { Tooltip } from '../components/Tooltip.js'
import type {
  ExerciseProgressDto,
  MuscleGroupProgressDto,
  AllMuscleGroupsStatsDto,
  PersonalRecordLogDto,
  UserExercisePRDto,
  WorkoutStatsDto,
  PagedResult,
} from '../../types/workouts.js'

declare const ApexCharts: any

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  FullBody: 'Все тело', Chest: 'Грудь', Back: 'Спина', Shoulders: 'Плечи',
  Biceps: 'Бицепс', Triceps: 'Трицепс', Forearms: 'Предплечья', Abs: 'Пресс',
  Glutes: 'Ягодицы', Quadriceps: 'Квадрицепс', Hamstrings: 'Бицепс бедра', Calves: 'Икры',
  '0': 'Все тело', '1': 'Грудь', '2': 'Спина', '3': 'Плечи',
  '4': 'Бицепс', '5': 'Трицепс', '6': 'Предплечья', '7': 'Пресс',
  '8': 'Ягодицы', '9': 'Квадрицепс', '10': 'Бицепс бедра', '11': 'Икры',
}

const MUSCLE_GROUPS_LIST = [
  { value: 'FullBody', label: 'Все тело' },
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
  MaxWeight: 'Макс. вес', MaxEstimated1RM: 'Расч. 1RM',
  MaxRepAtWeight: 'Макс. повторений', MaxVolumeSingleSession: 'Макс. объём',
  MaxReps: 'Макс. повторений', MaxTonnage: 'Макс. тоннаж', MaxVolume: 'Макс. объём',
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

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

function baseChartOptions(overrides: any = {}): any {
  return {
    chart: {
      height: 280, background: 'transparent', foreColor: '#B0A987',
      fontFamily: 'var(--ascii-font-family)',
      toolbar: {
        show: true,
        tools: { download: false, selection: false, zoom: true, zoomin: true, zoomout: true, pan: false, reset: true },
      },
      animations: { enabled: true, easing: 'easeinout', speed: 600 },
      ...overrides.chart,
    },
    theme: { mode: 'dark' as const },
    grid: { borderColor: 'rgba(74, 246, 38, 0.1)', strokeDashArray: 4, ...overrides.grid },
    xaxis: {
      labels: { style: { colors: '#B0A987', fontSize: '11px', fontFamily: 'var(--ascii-font-family)' }, rotate: -45 },
      axisBorder: { color: 'rgba(74, 246, 38, 0.3)' },
      axisTicks: { color: 'rgba(74, 246, 38, 0.3)' },
      ...overrides.xaxis,
    },
    yaxis: {
      labels: { style: { colors: '#B0A987', fontSize: '11px', fontFamily: 'var(--ascii-font-family)' } },
      ...overrides.yaxis,
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'var(--ascii-font-family)' },
      ...overrides.tooltip,
    },
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function DateRangeSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (range: string) => void
}) {
  return (
    <div className="analytics-range-selector">
      {['30d', '90d', 'all'].map(r => (
        <button
          key={r}
          className={`analytics-range-btn${r === value ? ' active' : ''}`}
          onClick={() => onChange(r)}
        >
          {r === '30d' ? '30 дней' : r === '90d' ? '90 дней' : 'Все время'}
        </button>
      ))}
    </div>
  )
}

function ApexChart({ options }: { options: any }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = new ApexCharts(ref.current, options)
    chart.render()
    return () => { try { chart.destroy() } catch (_) {} }
  }, [options])

  return <div ref={ref} />
}

function SvgSparkline({ data, width = 120, height = 30 }: { data: number[]; width?: number; height?: number }) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="sparkline-svg">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--phosphor-green)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--phosphor-green)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkFill)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--phosphor-green)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AsciiBar({ value, max, width = 20 }: { value: number; max: number; width?: number }) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0
  const empty = width - filled
  return (
    <span className="ascii-bar">
      <span className="ascii-bar-filled">{'█'.repeat(filled)}</span>
      <span className="ascii-bar-empty">{'░'.repeat(empty)}</span>
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ExercisesTab() {
  const [exerciseNames, setExerciseNames] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [selectedRange, setSelectedRange] = useState('90d')
  const [data, setData] = useState<ExerciseProgressDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<UserExercisePRDto[]>(ENDPOINTS.analytics.exercisePRs)
      .then(prs => {
        const names = prs.map(p => p.exerciseName)
        setExerciseNames(names)
        if (names.length > 0) setSelectedExercise(names[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedExercise) return
    setLoading(true)
    const { from, to } = getDateRange(selectedRange)
    api<ExerciseProgressDto>(ENDPOINTS.analytics.exerciseProgress(selectedExercise, from, to))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selectedExercise, selectedRange])

  if (loading && exerciseNames.length === 0) {
    return <div className="loading">Загрузка...</div>
  }
  if (exerciseNames.length === 0) {
    return <div className="analytics-empty">Нет данных об упражнениях. Завершите хотя бы одну тренировку.</div>
  }

  const pts = data?.dataPoints || []
  const last = pts.length > 0 ? pts[pts.length - 1] : null
  const prev = pts.length > 1 ? pts[pts.length - 2] : null

  function delta(cur: number | undefined, prv: number | undefined) {
    if (cur == null || prv == null || prv === 0) return null
    const pct = Math.round(((cur - prv) / prv) * 100)
    if (pct === 0) return null
    return pct
  }

  function DeltaBadge({ d }: { d: number | null }) {
    if (d == null) return null
    const cls = d > 0 ? 'delta-up' : 'delta-down'
    return <span className={`metric-delta ${cls}`}>{d > 0 ? `▲+${d}%` : `▼${d}%`}</span>
  }

  function MetricCard({ title, value, unit, d, maxVal, avgVal, sparkData, tooltip }: {
    title: string; value: string; unit: string; d: number | null
    maxVal: string; avgVal: string; sparkData: number[]; tooltip?: string
  }) {
    return (
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-card-title">{tooltip ? <Tooltip label={title} text={tooltip} /> : title}</span>
          <DeltaBadge d={d} />
        </div>
        <div className="metric-card-value">{value} <span className="metric-card-unit">{unit}</span></div>
        <div className="metric-card-stats">max: {maxVal}  avg: {avgVal}</div>
        <SvgSparkline data={sparkData} width={100} height={24} />
      </div>
    )
  }

  const weights = pts.map(p => p.maxWeight)
  const e1rms = pts.map(p => p.bestEstimated1RM)
  const repsList = pts.map(p => p.totalReps)
  const tonnages = pts.map(p => p.totalTonnage)

  const maxOf = (arr: number[]) => arr.length ? Math.max(...arr) : 0
  const avgOf = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0

  return (
    <>
      <div className="analytics-controls">
        <select className="analytics-select" value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
          {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <DateRangeSelector value={selectedRange} onChange={setSelectedRange} />
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : !pts.length ? (
        <div className="analytics-empty">Нет данных за выбранный период.</div>
      ) : (
        <>
          <div className="metric-cards-grid">
            <MetricCard title="МАКС. ВЕС" value={last ? String(last.maxWeight) : '—'}
              unit="кг" d={delta(last?.maxWeight, prev?.maxWeight)}
              maxVal={String(maxOf(weights))} avgVal={String(avgOf(weights))} sparkData={weights} />
            <MetricCard title="РАСЧ. 1RM" value={last ? last.bestEstimated1RM.toFixed(1) : '—'}
              unit="кг" d={delta(last?.bestEstimated1RM, prev?.bestEstimated1RM)}
              maxVal={maxOf(e1rms).toFixed(1)} avgVal={avgOf(e1rms).toFixed(1)} sparkData={e1rms}
              tooltip="Расчётный 1RM — оценка максимума по формуле Epley: вес × (1 + повт/30). Не нужно реально жать на максимум." />
            <MetricCard title="ОБЪЁМ" value={last ? String(last.totalReps) : '—'}
              unit="повт" d={delta(last?.totalReps, prev?.totalReps)}
              maxVal={String(maxOf(repsList))} avgVal={String(avgOf(repsList))} sparkData={repsList}
              tooltip="Общее количество повторений за тренировку (все подходы всех упражнений)." />
            <MetricCard title="ТОННАЖ" value={last ? formatNumber(Math.round(last.totalTonnage)) : '—'}
              unit="кг" d={delta(last?.totalTonnage, prev?.totalTonnage)}
              maxVal={formatNumber(maxOf(tonnages))} avgVal={formatNumber(avgOf(tonnages))} sparkData={tonnages}
              tooltip="Общий вес за тренировку = сумма (вес × повторения) по всем подходам." />
          </div>

          {pts.length > 0 && (
            <div className="ascii-table-wrap">
              <table className="ascii-table">
                <thead>
                  <tr>
                    <th>Дата</th><th>Вес</th><th><Tooltip label="1RM" /></th><th>Повт</th><th><Tooltip label="Тоннаж" /></th>
                    {pts[0].averageRPE != null && <th><Tooltip label="RPE" /></th>}
                  </tr>
                </thead>
                <tbody>
                  {pts.map((p, i) => {
                    const pr = i > 0 && p.maxWeight > pts[i - 1].maxWeight
                    return (
                      <tr key={p.date} className={pr ? 'ascii-table-pr' : ''}>
                        <td>{formatShortDate(p.date)}</td>
                        <td>{p.maxWeight}{pr ? ' ▲' : ''}</td>
                        <td>{p.bestEstimated1RM.toFixed(1)}</td>
                        <td>{p.totalReps}</td>
                        <td>{formatNumber(Math.round(p.totalTonnage))}</td>
                        {p.averageRPE != null && <td>{p.averageRPE.toFixed(1)}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data?.currentPR != null && (() => {
            const pr = data.currentPR
            const weight = typeof pr === 'object' && pr !== null ? (pr as any).bestWeight : pr
            if (weight == null || typeof weight === 'object') return null
            return (
              <div className="analytics-pr-card">
                <span className="analytics-pr-icon">{'\uD83C\uDFC6'}</span>
                <span className="analytics-pr-text">Текущий PR: <strong>{String(weight)} кг</strong></span>
              </div>
            )
          })()}
        </>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECORDS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function RecordsTab() {
  const [prs, setPrs] = useState<UserExercisePRDto[]>([])
  const [prLog, setPrLog] = useState<PersonalRecordLogDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api<UserExercisePRDto[]>(ENDPOINTS.analytics.exercisePRs),
      api<PagedResult<PersonalRecordLogDto>>(ENDPOINTS.analytics.personalRecords(undefined, 1, 50)),
    ])
      .then(([prsData, logData]) => {
        setPrs(prsData)
        setPrLog(logData.items || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Загрузка...</div>

  if (prs.length === 0) {
    return <div className="analytics-empty">Пока нет персональных рекордов. Тренируйтесь!</div>
  }

  return (
    <>
      <div className="analytics-pr-cards">
        {prs.map(pr => {
          const rows: React.ReactNode[] = []
          if (pr.bestWeight != null) {
            rows.push(
              <div className="analytics-pr-row" key="weight">
                <span className="analytics-pr-row-icon">{'\uD83C\uDFC6'}</span>
                <span className="analytics-pr-row-label">Макс. вес:</span>
                <span className="analytics-pr-row-value">{pr.bestWeight} кг</span>
                <span className="analytics-pr-row-date">{pr.bestWeightDate ? formatShortDate(pr.bestWeightDate) : ''}</span>
              </div>
            )
          }
          if (pr.bestE1RM != null) {
            rows.push(
              <div className="analytics-pr-row" key="e1rm">
                <span className="analytics-pr-row-icon">{'\uD83C\uDFC6'}</span>
                <span className="analytics-pr-row-label">Расч. 1RM:</span>
                <span className="analytics-pr-row-value">{pr.bestE1RM.toFixed(1)} кг</span>
                <span className="analytics-pr-row-date">{pr.bestE1RMDate ? formatShortDate(pr.bestE1RMDate) : ''}</span>
              </div>
            )
          }
          if (pr.bestVolumeSingleSession != null) {
            rows.push(
              <div className="analytics-pr-row" key="volume">
                <span className="analytics-pr-row-icon">{'\uD83C\uDFC6'}</span>
                <span className="analytics-pr-row-label">Макс. объём:</span>
                <span className="analytics-pr-row-value">{pr.bestVolumeSingleSession} повт.</span>
                <span className="analytics-pr-row-date">{pr.bestVolumeDate ? formatShortDate(pr.bestVolumeDate) : ''}</span>
              </div>
            )
          }
          if (rows.length === 0) return null
          return (
            <div className="analytics-pr-card-group" key={pr.exerciseName}>
              <div className="analytics-pr-card-group-title">{pr.exerciseName}</div>
              {rows}
            </div>
          )
        })}
      </div>

      {prLog.length > 0 && (
        <>
          <div className="analytics-section-title">Хронология рекордов</div>
          <div className="analytics-timeline">
            {prLog.map(item => {
              const typeLabel = RECORD_TYPE_LABELS[item.recordType] || item.recordType
              let prev = ''
              if (item.previousValue != null) {
                prev = ` (было ${item.previousValue}`
                if (item.improvementPercent) prev += `, +${item.improvementPercent.toFixed(1)}%`
                prev += ')'
              }
              return (
                <div className="analytics-timeline-entry" key={item.id}>
                  <span className="analytics-timeline-date">{formatShortDate(item.achievedAt)}</span>
                  <span className="analytics-timeline-icon">{'\uD83C\uDFC6'}</span>
                  <span className="analytics-timeline-text">
                    <strong>{String(item.exerciseName)}</strong>: {typeLabel} {typeof item.value === 'object' ? JSON.stringify(item.value) : item.value}{prev}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR HEATMAP
// ═══════════════════════════════════════════════════════════════════════════════

function CalendarHeatmap({
  workoutDates,
  fromStr,
  toStr,
}: {
  workoutDates: string[]
  fromStr: string
  toStr: string
}) {
  const workoutSet = useMemo(() => new Set(workoutDates.map(d => d.split('T')[0])), [workoutDates])
  const from = new Date(fromStr)
  const to = new Date(toStr)

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

  const { weeks, monthLabels } = useMemo(() => {
    const startDay = new Date(from)
    const dayOfWeek = startDay.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startDay.setDate(startDay.getDate() + mondayOffset)

    const weeksArr: (string | null)[][] = []
    const current = new Date(startDay)

    while (current <= to || weeksArr.length === 0) {
      const week: (string | null)[] = []
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().split('T')[0]
        week.push(current >= from && current <= to ? dateStr : null)
        current.setDate(current.getDate() + 1)
      }
      weeksArr.push(week)
      if (current > to) break
    }

    const labels: { col: number; label: string }[] = []
    let lastMonth = -1
    weeksArr.forEach((week, idx) => {
      const firstDate = week.find(d => d != null)
      if (firstDate) {
        const m = new Date(firstDate).getMonth()
        if (m !== lastMonth) {
          labels.push({ col: idx, label: months[m] })
          lastMonth = m
        }
      }
    })

    return { weeks: weeksArr, monthLabels: labels }
  }, [fromStr, toStr])

  return (
    <>
      <div className="analytics-section-title">Календарь тренировок</div>
      <div className="analytics-heatmap">
        <div className="heatmap-month-row" style={{ gridTemplateColumns: `30px repeat(${weeks.length}, 1fr)` }}>
          <div />
          {weeks.map((_, idx) => {
            const ml = monthLabels.find(m => m.col === idx)
            return <div className="heatmap-month-label" key={idx}>{ml ? ml.label : ''}</div>
          })}
        </div>
        {dayNames.map((name, dayIdx) => (
          <div
            className="heatmap-row"
            key={dayIdx}
            style={{ gridTemplateColumns: `30px repeat(${weeks.length}, 1fr)` }}
          >
            <div className="heatmap-day-label">{name}</div>
            {weeks.map((week, wIdx) => {
              const dateStr = week[dayIdx]
              if (!dateStr) return <div className="heatmap-cell heatmap-empty" key={wIdx} />
              const intensity = workoutSet.has(dateStr) ? 1 : 0
              return (
                <div
                  className={`heatmap-cell heatmap-level-${intensity}`}
                  title={dateStr}
                  key={wIdx}
                />
              )
            })}
          </div>
        ))}
        <div className="heatmap-legend">
          <span className="heatmap-cell heatmap-level-1" style={{ display: 'inline-block' }} /> тренировка
          <span className="heatmap-cell heatmap-level-0" style={{ display: 'inline-block', marginLeft: 12 }} /> отдых
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function StatsTab() {
  const [selectedRange, setSelectedRange] = useState('90d')
  const [stats, setStats] = useState<WorkoutStatsDto | null>(null)
  const [calendar, setCalendar] = useState<string[]>([])
  const [calRange, setCalRange] = useState({ from: '', to: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const { from, to } = getDateRange(selectedRange)
    const calFrom = from || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
    const calTo = to || new Date().toISOString().split('T')[0]

    Promise.all([
      api<WorkoutStatsDto>(ENDPOINTS.analytics.stats(from, to)),
      api<string[]>(ENDPOINTS.analytics.calendar(calFrom, calTo)),
    ])
      .then(([s, c]) => {
        setStats(s)
        setCalendar(c || [])
        setCalRange({ from: calFrom, to: calTo })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedRange])

  const weeklyTrendOpts = useMemo(() => {
    if (!stats?.weeklyTrend || stats.weeklyTrend.length <= 1) return null
    const labels = stats.weeklyTrend.map(w => `H${w.week}`)
    return baseChartOptions({
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
    })
  }, [stats])

  const radarChartOpts = useMemo(() => {
    const mf = stats?.muscleGroupFrequency
    if (!mf) return null
    const radarData = Object.entries(mf).map(([mg, count]) => ({
      group: MUSCLE_GROUP_LABELS[mg] || mg,
      value: count,
    }))
    if (radarData.length === 0) return null

    const maxVal = Math.max(...radarData.map(d => d.value))
    const normalized = radarData.map(d => ({
      ...d,
      pct: maxVal > 0 ? Math.round((d.value / maxVal) * 100) : 0,
    }))

    return baseChartOptions({
      chart: { type: 'radar', height: 350 },
      series: [{ name: 'Подходы', data: normalized.map(d => d.pct) }],
      xaxis: { categories: normalized.map(d => d.group) },
      yaxis: { show: false },
      fill: { opacity: 0.25, colors: ['#4AF626'] },
      stroke: { colors: ['#4AF626'], width: 2 },
      markers: { size: 3, colors: ['#4AF626'] },
      plotOptions: {
        radar: {
          polygons: {
            strokeColors: 'rgba(74, 246, 38, 0.15)',
            connectorColors: 'rgba(74, 246, 38, 0.15)',
          },
        },
      },
    })
  }, [stats])

  const muscleTonnageOpts = useMemo(() => {
    const weeklyTrend = stats?.weeklyTrend
    if (!weeklyTrend || weeklyTrend.length === 0) return null
    const mf = stats?.muscleGroupFrequency
    if (!mf) return null

    const muscleKeys = [...new Set(Object.keys(mf))]
    if (muscleKeys.length === 0) return null

    const series = muscleKeys
      .map(mg => ({
        name: MUSCLE_GROUP_LABELS[mg] || `Группа ${mg}`,
        data: weeklyTrend.map((w: any) => {
          const mv = w.muscleVolumes?.find((v: any) => v.muscleGroup === mg)
          return mv?.totalTonnage ?? 0
        }),
      }))
      .filter(s => s.data.some((v: number) => v > 0))

    if (series.length === 0) return null

    const categories = weeklyTrend.map(w => `Нед ${w.week}`)

    return baseChartOptions({
      chart: { type: 'area', height: 300, stacked: true },
      series,
      xaxis: { categories },
      yaxis: { title: { text: 'кг' } },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
      dataLabels: { enabled: false },
      legend: { position: 'top', fontSize: '10px' },
    })
  }, [stats])

  if (loading) return <div className="loading">Загрузка...</div>
  if (!stats) return <div className="analytics-empty">Ошибка загрузки статистики.</div>

  const muscleFreq = stats.muscleGroupFrequency || {}
  const freqEntries = Object.entries(muscleFreq).sort((a, b) => b[1] - a[1])
  const maxFreq = freqEntries.length > 0 ? Math.max(...freqEntries.map(([, v]) => v), 1) : 1

  return (
    <>
      <div className="analytics-controls">
        <DateRangeSelector value={selectedRange} onChange={setSelectedRange} />
      </div>

      <div className="analytics-stats-grid">
        <div className="analytics-stat-card">
          <div className="analytics-stat-label">Тренировки</div>
          <div className="analytics-stat-value">{stats.totalWorkouts}</div>
          <div className="analytics-stat-sub">{stats.workoutsPerWeek.toFixed(1)}/нед</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-label"><Tooltip label="Тоннаж" /></div>
          <div className="analytics-stat-value">{formatNumber(Math.round(stats.totalTonnage))} кг</div>
          <div className="analytics-stat-sub">{formatNumber(Math.round(stats.avgTonnagePerWorkout))}/тр</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-label"><Tooltip label="Объём" /></div>
          <div className="analytics-stat-value">{formatNumber(stats.totalVolume)} повт</div>
          <div className="analytics-stat-sub">{Math.round(stats.avgVolumePerWorkout)}/тр</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-label">Время</div>
          <div className="analytics-stat-value">{formatDuration(stats.totalDurationSeconds)}</div>
          <div className="analytics-stat-sub">{formatDuration(stats.avgDurationSecondsPerWorkout)}/тр</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-label">Отдых</div>
          <div className="analytics-stat-value">{Math.round(stats.avgRestSeconds)}с</div>
          <div className="analytics-stat-sub">среднее</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-label"><Tooltip label="Рекорды" /></div>
          <div className="analytics-stat-value">{stats.totalPersonalRecords}</div>
          <div className="analytics-stat-sub">всего</div>
        </div>
      </div>

      {freqEntries.length > 0 && (
        <>
          <div className="analytics-section-title">Частота по группам мышц</div>
          <div className="analytics-freq-list">
            {freqEntries.map(([group, freq]) => {
              const pct = Math.round((freq / maxFreq) * 100)
              const label = MUSCLE_GROUP_LABELS[group] || group
              return (
                <div className="analytics-freq-row" key={group}>
                  <span className="analytics-freq-label">{label}</span>
                  <div className="analytics-freq-bar-bg">
                    <div className="analytics-freq-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="analytics-freq-value">{freq.toFixed(1)}/нед</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {radarChartOpts && (
        <div className="analytics-section">
          <h4 className="analytics-section-title">{'\u2694'} Мышечный баланс</h4>
          <div className="analytics-chart-block">
            <ApexChart options={radarChartOpts} />
          </div>
        </div>
      )}

      {muscleTonnageOpts && (
        <div className="analytics-section">
          <h4 className="analytics-section-title">{'\u2694'} Тоннаж по группам мышц</h4>
          <div className="analytics-chart-block">
            <ApexChart options={muscleTonnageOpts} />
          </div>
        </div>
      )}

      {calRange.from && calRange.to && (
        <CalendarHeatmap workoutDates={calendar} fromStr={calRange.from} toStr={calRange.to} />
      )}

      {weeklyTrendOpts && (
        <>
          <div className="analytics-section-title">Недельный тренд</div>
          <div className="analytics-chart-block">
            <ApexChart options={weeklyTrendOpts} />
          </div>
        </>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUSCLES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function MusclesTab() {
  const [selectedRange, setSelectedRange] = useState('90d')
  const [data, setData] = useState<AllMuscleGroupsStatsDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const { from, to } = getDateRange(selectedRange)
    api<AllMuscleGroupsStatsDto>(ENDPOINTS.analytics.allMuscleGroups(from, to))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selectedRange])

  if (loading) return <div className="loading">Загрузка...</div>
  if (!data || data.groups.length === 0) {
    return (
      <>
        <div className="analytics-controls">
          <DateRangeSelector value={selectedRange} onChange={setSelectedRange} />
        </div>
        <div className="analytics-empty">Нет данных по мышечным группам.</div>
      </>
    )
  }

  const maxTonnage = Math.max(...data.groups.map(g => g.totalTonnage), 1)

  return (
    <>
      <div className="analytics-controls">
        <DateRangeSelector value={selectedRange} onChange={setSelectedRange} />
      </div>

      <div className="ascii-section-title">{'\u2694'} МЫШЕЧНЫЙ БАЛАНС</div>

      <div className="ascii-table-wrap">
        <table className="ascii-table">
          <thead>
            <tr>
              <th>Мышца</th><th>Тоннаж</th><th>Avg/тр</th><th>Подх</th><th style={{minWidth: '140px'}}></th>
            </tr>
          </thead>
          <tbody>
            {data.groups.map(g => (
              <tr key={g.muscleGroup}>
                <td>{MUSCLE_GROUP_LABELS[g.muscleGroup] || g.muscleGroup}</td>
                <td>{formatNumber(Math.round(g.totalTonnage))} кг</td>
                <td>{formatNumber(Math.round(g.avgTonnagePerWorkout))}</td>
                <td>{g.totalSets}</td>
                <td><AsciiBar value={g.totalTonnage} max={maxTonnage} width={18} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="ascii-table-total">
              <td>ИТОГО</td>
              <td>{formatNumber(Math.round(data.totalTonnage))} кг</td>
              <td></td>
              <td>{data.totalSets}</td>
              <td>{data.totalReps} повт</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════════

class AnalyticsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Analytics crash]', error.message, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="analytics-empty" style={{ color: '#FF6B6B' }}>
          Ошибка рендеринга аналитики: {this.state.error.message}
          <br />
          <button
            className="btn-secondary"
            style={{ marginTop: 8 }}
            onClick={() => this.setState({ error: null })}
          >
            Повторить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ANALYTICS_TABS = [
  { id: 'exercises', label: 'УПРАЖНЕНИЯ' },
  { id: 'records', label: 'РЕКОРДЫ' },
  { id: 'stats', label: 'СТАТИСТИКА' },
  { id: 'muscles', label: 'МЫШЦЫ' },
]

export default function WorkoutAnalyticsTab() {
  const [activeTab, setActiveTab] = useState('exercises')

  return (
    <>
      <div className="analytics-tabs">
        {ANALYTICS_TABS.map(t => (
          <button
            key={t.id}
            className={`analytics-tab${t.id === activeTab ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="analytics-tab-content">
        <AnalyticsErrorBoundary key={activeTab}>
          {activeTab === 'exercises' ? <ExercisesTab />
           : activeTab === 'records' ? <RecordsTab />
           : activeTab === 'stats' ? <StatsTab />
           : activeTab === 'muscles' ? <MusclesTab />
           : null}
        </AnalyticsErrorBoundary>
      </div>
    </>
  )
}
