import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAppState } from '../hooks/useAppState.js'
import { api, statsApi, workoutSessionsApi, workoutsApi } from '../../api.js'
import { ENDPOINTS } from '../../endpoints.js'
import { state } from '../../state.js'
import { formatDate, getStatusClass, parseDayOfWeek } from '../../utils.js'
import { renderAsciiDonut } from '../../components/asciiDonut.js'
import { navigateToPage, switchWorkoutSubTab } from '../../components/navigation.js'
import { toast } from '../components/Toast.js'
import { useModal } from '../contexts/ModalContext.js'
import AnalysisModal from '../components/modals/AnalysisModal.js'
import IntakeLogModal from '../components/modals/IntakeLogModal.js'
import PdfImportModal from '../components/modals/PdfImportModal.js'
import type { AlertDto } from '../../types/index.js'
import type {
  InventoryDto, InventoryItemDto,
} from '../../types/index.js'
import type {
  WeekStatusDto, WorkoutDayDto, WorkoutProgramDto,
} from '../../types/workouts.js'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TYPE_BADGES: Record<number, { cls: string; label: string }> = {
  0: { cls: 'badge-oral', label: '[ ОРАЛЬНЫЙ ]' },
  1: { cls: 'badge-inject', label: '[ ИНЪЕКЦИЯ ]' },
  2: { cls: 'badge-subcutaneous', label: '[ ПОДКОЖНЫЙ ]' },
  3: { cls: 'badge-transdermal', label: '[ ТРАНСДЕРМ ]' },
  4: { cls: 'badge-nasal', label: '[ НАЗАЛЬНЫЙ ]' },
}

const DAY_LABELS: Record<number, string> = {
  0: 'ВОСКРЕСНУЮ', 1: 'ПОНЕДЕЛЬНИЧНУЮ', 2: 'ВТОРНИЧНУЮ',
  3: 'СРЕДОВУЮ', 4: 'ЧЕТВЕРГОВУЮ', 5: 'ПЯТНИЧНУЮ', 6: 'СУББОТНЮЮ',
}

const DAY_NAMES: Record<number, string> = {
  0: 'Воскресенье', 1: 'Понедельник', 2: 'Вторник',
  3: 'Среда', 4: 'Четверг', 5: 'Пятница', 6: 'Суббота',
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKOUT CTA — determines which workout button to show
// ═══════════════════════════════════════════════════════════════════════════════

type WorkoutCta =
  | { kind: 'resume'; title: string; timeStr: string }
  | { kind: 'empty' }
  | { kind: 'suggest'; dayId: string; dayLabel: string; subtitle: string }
  | null

function useWorkoutCta(): [WorkoutCta, boolean] {
  const [cta, setCta] = useState<WorkoutCta>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      try {
        const weekStatus = await workoutSessionsApi.getWeekStatus() as WeekStatusDto

        if (cancelled) return

        if (weekStatus.activeSession) {
          const start = new Date(weekStatus.activeSession.startedAt).getTime()
          const elapsed = Math.floor((Date.now() - start) / 1000)
          const mins = Math.floor(elapsed / 60)
          const secs = elapsed % 60
          setCta({
            kind: 'resume',
            title: weekStatus.activeSession.title,
            timeStr: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
          })
          setLoading(false)
          return
        }

        let programs = state.workoutPrograms as WorkoutProgramDto[]
        if (!programs || programs.length === 0) {
          try {
            const fetched = await workoutsApi.programs.list() as WorkoutProgramDto[]
            if (cancelled) return
            state.workoutPrograms = fetched
            programs = fetched
          } catch (_) { /* empty */ }
        }

        if (!programs || programs.length === 0) {
          setCta({ kind: 'empty' })
          setLoading(false)
          return
        }

        const todayDow = new Date().getDay()
        const completedDayIds = new Set(
          weekStatus.currentWeekSessions.filter(s => s.sourceDayId).map(s => s.sourceDayId!),
        )

        let allDays: WorkoutDayDto[] = []
        for (const program of programs) {
          const cached = state.workoutDays[program.id] as WorkoutDayDto[] | undefined
          if (cached) {
            allDays = allDays.concat(cached)
          } else {
            try {
              const days = await workoutsApi.days.listByProgram(program.id) as WorkoutDayDto[]
              if (cancelled) return
              state.workoutDays[program.id] = days
              allDays = allDays.concat(days)
            } catch (_) { /* empty */ }
          }
        }

        if (allDays.length === 0) {
          setCta({ kind: 'empty' })
          setLoading(false)
          return
        }

        let recommendedDay: WorkoutDayDto | null = null
        const todayDay = allDays.find(d => parseDayOfWeek(d.dayOfWeek) === todayDow && !completedDayIds.has(d.id))
        if (todayDay) {
          recommendedDay = todayDay
        } else {
          for (let i = 1; i <= 7; i++) {
            const dow = (todayDow + i) % 7
            const nextDay = allDays.find(d => parseDayOfWeek(d.dayOfWeek) === dow && !completedDayIds.has(d.id))
            if (nextDay) { recommendedDay = nextDay; break }
          }
        }

        if (!recommendedDay) {
          setCta({ kind: 'empty' })
        } else {
          const dayLabel = DAY_LABELS[parseDayOfWeek(recommendedDay.dayOfWeek)] || ''
          const dayTitle = recommendedDay.title ? ` — ${recommendedDay.title}` : ''
          setCta({
            kind: 'suggest',
            dayId: recommendedDay.id,
            dayLabel,
            subtitle: `${DAY_NAMES[parseDayOfWeek(recommendedDay.dayOfWeek)] || ''}${dayTitle}`,
          })
        }
      } catch (err) {
        console.error('Failed to resolve workout CTA:', err)
        setCta(null)
      }
      if (!cancelled) setLoading(false)
    }

    resolve()
    return () => { cancelled = true }
  }, [])

  return [cta, loading]
}

// ═══════════════════════════════════════════════════════════════════════════════
// DONUT CHART — renders via ref to avoid dangerouslySetInnerHTML
// ═══════════════════════════════════════════════════════════════════════════════

function DonutChart({ drugs }: { drugs: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    statsApi.getInventory()
      .then((inv: unknown) => {
        if (cancelled) return
        // Stop loading FIRST so React removes the skeleton before we touch the DOM
        setLoading(false)
        // Wait a tick for React to reconcile (remove skeleton), then imperatively fill the container
        requestAnimationFrame(() => {
          if (cancelled || !containerRef.current) return
          const inventory = inv as InventoryDto
          if (!inventory || inventory.items.length === 0) {
            const el = containerRef.current!
            el.textContent = ''
            const wrapper = document.createElement('div')
            wrapper.className = 'ascii-donut-container'
            const pre = document.createElement('pre')
            pre.className = 'ascii-donut'
            pre.textContent = '      ╭─────────────╮\n     ╱ ░░░░░░░░░░░░░ ╲\n    │ ░░░       ░░░ │\n   │ ░░    --    ░░ │\n    │ ░░░       ░░░ │\n     ╲ ░░░░░░░░░░░░░ ╱\n      ╰─────────────╯\n   НЕТ ДАННЫХ'
            wrapper.appendChild(pre)
            el.appendChild(wrapper)
          } else {
            let totalConsumed = 0, totalRemaining = 0
            inventory.items.forEach((item: InventoryItemDto) => {
              totalConsumed += item.totalConsumed
              totalRemaining += item.currentStock > 0 ? item.currentStock : 0
            })
            renderAsciiDonut('dashboard-donut-inner', totalConsumed, totalRemaining, { size: 'large', showLegend: true })
          }
        })
      })
      .catch((e: Error) => {
        console.error('Failed to load inventory:', e)
        setLoading(false)
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.textContent = ''
            const empty = document.createElement('div')
            empty.className = 'empty-state'
            const p = document.createElement('p')
            p.textContent = 'Ошибка загрузки'
            empty.appendChild(p)
            containerRef.current.appendChild(empty)
          }
        })
      })

    return () => { cancelled = true }
  }, [drugs])

  return (
    <div id="dashboard-donut-inner" ref={containerRef}>
      {loading && <div className="skeleton skeleton-card" style={{ height: 200 }} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const analyses = useAppState('analyses')
  const currentCourse = useAppState('currentCourse')
  const drugs = useAppState('drugs')
  const dashboardStats = useAppState('dashboardStats')

  // ─── Alerts ──────────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<AlertDto[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)

  useEffect(() => {
    if (analyses.length === 0) { setAlerts([]); setAlertsLoading(false); return }
    let cancelled = false
    setAlertsLoading(true)
    api(ENDPOINTS.analyses.alerts(analyses[0].id))
      .then((data: unknown) => { if (!cancelled) setAlerts(data as AlertDto[]) })
      .catch((e: Error) => { console.error('Failed to load alerts:', e); toast.error('Ошибка загрузки уведомлений') })
      .finally(() => { if (!cancelled) setAlertsLoading(false) })
    return () => { cancelled = true }
  }, [analyses])

  // ─── Workout CTA ─────────────────────────────────────────────────────────────
  const [workoutCta] = useWorkoutCta()

  const handleStartWorkout = useCallback(async (sourceDayId?: string) => {
    try {
      const session = await workoutSessionsApi.start(sourceDayId ? { sourceDayId } : {}) as any
      state.activeWorkoutSession = session
      toast.success('Тренировка начата!')
      navigateToPage('workouts')
      switchWorkoutSubTab('training')
    } catch (err) {
      console.error('Failed to start workout:', err)
      toast.error('Ошибка начала тренировки')
    }
  }, [])

  const handleResumeWorkout = useCallback(() => {
    navigateToPage('workouts')
    switchWorkoutSubTab('training')
  }, [])

  // ─── Quick Actions ───────────────────────────────────────────────────────────
  const { openModal, closeModal } = useModal()

  const goAnalysis = useCallback(() => {
    navigateToPage('analyses')
    openModal(<AnalysisModal onSave={() => { state.analyses = [] }} closeModal={closeModal} />)
  }, [openModal, closeModal])

  const goIntake = useCallback(() => {
    navigateToPage('course')
    openModal(<IntakeLogModal onSave={() => {}} closeModal={closeModal} />)
  }, [openModal, closeModal])

  const goPdfImport = useCallback(() => {
    navigateToPage('analyses')
    openModal(<PdfImportModal onSave={() => { state.analyses = [] }} closeModal={closeModal} />)
  }, [openModal, closeModal])

  return (
    <>
      {/* ── HERO BLOCK ──────────────────────────────────────────────────── */}
      {alerts.length > 0 && !alertsLoading && (
        <div className="dashboard-hero dashboard-hero--alert">
          <div className="dashboard-hero-icon">{'\u26A0'}</div>
          <div className="dashboard-hero-content">
            <div className="dashboard-hero-title">ПОКАЗАТЕЛИ ВНЕ НОРМЫ: {alerts.length}</div>
            <div className="dashboard-hero-sub">{alerts.slice(0, 2).map(a => a.name).join(', ')}{alerts.length > 2 ? ` и ещё ${alerts.length - 2}` : ''}</div>
          </div>
          <button className="dashboard-hero-btn" onClick={() => navigateToPage('analyses')}>[ АНАЛИЗЫ ]</button>
        </div>
      )}

      {workoutCta?.kind === 'resume' && (
        <div className="dashboard-hero dashboard-hero--workout">
          <div className="dashboard-hero-icon">{'\u25B6'}</div>
          <div className="dashboard-hero-content">
            <div className="dashboard-hero-title">ТРЕНИРОВКА В ПРОЦЕССЕ — {workoutCta.timeStr}</div>
            <div className="dashboard-hero-sub">{workoutCta.title}</div>
          </div>
          <button className="dashboard-hero-btn" onClick={handleResumeWorkout}>[ ПРОДОЛЖИТЬ ]</button>
        </div>
      )}

      {workoutCta?.kind === 'suggest' && (
        <div className="dashboard-hero dashboard-hero--suggest">
          <div className="dashboard-hero-icon">{'\u{1F3CB}'}</div>
          <div className="dashboard-hero-content">
            <div className="dashboard-hero-title">{'НАЧАТЬ ' + workoutCta.dayLabel + ' ТРЕНИРОВКУ'}</div>
            <div className="dashboard-hero-sub">{workoutCta.subtitle}</div>
          </div>
          <button className="dashboard-hero-btn" onClick={() => handleStartWorkout(workoutCta.dayId)}>[ НАЧАТЬ ]</button>
        </div>
      )}

      {workoutCta?.kind === 'empty' && (
        <div className="dashboard-hero dashboard-hero--suggest">
          <div className="dashboard-hero-icon">{'\u{1F3CB}'}</div>
          <div className="dashboard-hero-content">
            <div className="dashboard-hero-title">ПУСТАЯ ТРЕНИРОВКА</div>
          </div>
          <button className="dashboard-hero-btn" onClick={() => handleStartWorkout()}>[ НАЧАТЬ ]</button>
        </div>
      )}

      {/* ── QUICK ACTIONS ──────────────────────────────────────────────────── */}
      <details className="dashboard-actions-collapse" open>
        <summary className="dashboard-actions-summary">[ ДЕЙСТВИЯ ]</summary>
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={goAnalysis}>[ + АНАЛИЗ ]</button>
          <button className="quick-action-btn" onClick={goIntake}>[ + ПРИЁМ ]</button>
          <button className="quick-action-btn" onClick={goPdfImport}>[ ИМПОРТ PDF ]</button>
        </div>
      </details>

      {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
      <div className="dashboard-overview">
        <div className="dashboard-donut-container">
          <div className="card">
            <div className="card-header">
              <div className="card-title" data-asciify="md" aria-label="Прогресс курса">[ ПРОГРЕСС КУРСА ]</div>
            </div>
            <DonutChart drugs={drugs} />
          </div>
        </div>
        <div className="stat-cards">
          <div className="stat-card">
            <h3>Текущий курс</h3>
            <div className="stat-value" data-asciify="lg">{currentCourse?.title ?? '—'}</div>
            <div className="stat-sub">
              {currentCourse
                ? `${formatDate(currentCourse.startDate!)} — ${formatDate(currentCourse.endDate!)}`
                : 'Не настроен'}
            </div>
          </div>
          <div className="stat-card">
            <h3>День курса</h3>
            <div className="stat-value" data-asciify="lg">{String(currentCourse?.currentDay ?? '—')}</div>
            <div className="stat-sub">{currentCourse ? `из ${currentCourse.totalDays} дней` : '—'}</div>
          </div>
          <div className="stat-card">
            <h3>Анализов</h3>
            <div className="stat-value" data-asciify="lg">{String(dashboardStats?.analysesCount ?? 0)}</div>
            <div className="stat-sub">
              {dashboardStats?.lastAnalysisDate
                ? `Последний: ${formatDate(dashboardStats.lastAnalysisDate)}`
                : 'Нет данных'}
            </div>
          </div>
        </div>
      </div>

      {/* ── DRUGS ──────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md" aria-label="Препараты курса">[ ПРЕПАРАТЫ КУРСА ]</div>
        </div>
        <div id="dashboard-drugs">
          {drugs.length === 0
            ? <div className="empty-state"><p>Нет препаратов</p></div>
            : drugs.map((d: any) => {
                const badge = TYPE_BADGES[d.type] || TYPE_BADGES[0]
                return (
                  <div className="drug-card" key={d.id}>
                    <div className="drug-info">
                      <h4>{d.name}</h4>
                      <p>{d.dosage} &bull; {d.schedule}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`drug-badge ${badge.cls}`}>{badge.label}</span>
                      {d.manufacturerName && (
                        <span className="badge-manufacturer">{'[ ' + d.manufacturerName + ' ]'}</span>
                      )}
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* ── ALERTS ─────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md" aria-label="Показатели, требующие внимания">[ ПОКАЗАТЕЛИ, ТРЕБУЮЩИЕ ВНИМАНИЯ ]</div>
        </div>
        <div id="dashboard-alerts">
          {alertsLoading
            ? <div className="skeleton skeleton-card" />
            : analyses.length === 0
              ? <div className="empty-state"><p>Добавьте анализы</p></div>
              : alerts.length === 0
                ? <div className="empty-state"><p>[ ВСЕ ПОКАЗАТЕЛИ В НОРМЕ ]</p></div>
                : alerts.map((a, i) => (
                    <div className="drug-card" key={i}>
                      <div className="drug-info">
                        <h4>
                          <span className={`indicator ind-${getStatusClass(a.status)}`} />
                          {a.name}
                        </h4>
                        <p>{a.value} {a.unit} (норма: {a.refMin}-{a.refMax})</p>
                      </div>
                    </div>
                  ))
          }
        </div>
      </div>
    </>
  )
}
