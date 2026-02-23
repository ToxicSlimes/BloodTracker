import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAppState } from '../hooks/useAppState.js'
import { useModal } from '../contexts/ModalContext.js'
import { EmptyState } from '../components/EmptyState.js'
import { api, intakeLogsApi, purchaseApi, statsApi } from '../../api.js'
import { ENDPOINTS } from '../../endpoints.js'
import { state } from '../../state.js'
import { formatDate, formatDateForInput, escapeHtml } from '../../utils.js'
import { generateAsciiDonut } from '../../components/asciiDonut.js'
import { toast } from '../components/Toast.js'
import DrugModal from '../components/modals/DrugModal.js'
import IntakeLogModal from '../components/modals/IntakeLogModal.js'
import PurchaseModal from '../components/modals/PurchaseModal.js'
import type {
  DrugDto, IntakeLogDto, PurchaseDto, CourseDto,
  DrugStatisticsDto, InventoryDto, InventoryItemDto, PerPurchaseStockDto,
  ConsumptionTimelineDto, PurchaseVsConsumptionDto,
} from '../../types/index.js'

declare const ApexCharts: any

// ─── Tab definitions ────────────────────────────────────────────────────────

const TABS = [
  { id: 'drugs', label: '[ ПРЕПАРАТЫ ]' },
  { id: 'logs', label: '[ ЛОГИ ПРИЁМА ]' },
  { id: 'inventory', label: '[ РЕЕСТР ]' },
  { id: 'statistics', label: '[ СТАТИСТИКА ]' },
] as const

type TabId = (typeof TABS)[number]['id']

// ─── Helpers ────────────────────────────────────────────────────────────────

const DRUG_TYPE_MAP: Record<number, { cls: string; label: string }> = {
  0: { cls: 'badge-oral', label: '[ ОРАЛЬНЫЙ ]' },
  1: { cls: 'badge-inject', label: '[ ИНЪЕКЦИЯ ]' },
  2: { cls: 'badge-subcutaneous', label: '[ ПОДКОЖНЫЙ ]' },
  3: { cls: 'badge-transdermal', label: '[ ТРАНСДЕРМ ]' },
  4: { cls: 'badge-nasal', label: '[ НАЗАЛЬНЫЙ ]' },
}

function getStockClass(stock: number): string {
  if (stock < 0) return 'stock-negative'
  if (stock <= 5) return 'stock-low'
  return 'stock-positive'
}

// ─── Drugs Tab ──────────────────────────────────────────────────────────────

function DrugsTab({ refresh }: { refresh: () => void }) {
  const drugs = useAppState('drugs')
  const currentCourse = useAppState('currentCourse')
  const { openModal, closeModal } = useModal()

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [editing, setEditing] = useState(false)

  // Populate form from currentCourse on mount or when course changes
  useEffect(() => {
    if (currentCourse) {
      setTitle(currentCourse.title || '')
      setStartDate(currentCourse.startDate?.split('T')[0] || '')
      setEndDate(currentCourse.endDate?.split('T')[0] || '')
      setNotes(currentCourse.notes || '')
    }
  }, [currentCourse])

  const handleSave = useCallback(async () => {
    if (!title) { toast.warning('Введите название'); return }
    const data = {
      title,
      startDate: startDate || null,
      endDate: endDate || null,
      notes,
    }
    try {
      if (editing && state.editingCourseId) {
        await api(ENDPOINTS.courses.update(state.editingCourseId), { method: 'PUT', body: JSON.stringify(data) })
        state.editingCourseId = null
        setEditing(false)
      } else {
        await api(ENDPOINTS.courses.create, { method: 'POST', body: JSON.stringify(data) })
      }
      // Reload dashboard data
      if (typeof window.loadDashboard === 'function') window.loadDashboard()
      toast.success('Курс сохранён')
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message)
    }
  }, [title, startDate, endDate, notes, editing])

  const handleEdit = useCallback(async () => {
    if (!currentCourse) {
      try {
        const course = await api<CourseDto>(ENDPOINTS.courses.active)
        if (!course) { toast.warning('Нет активного курса'); return }
        state.currentCourse = course
      } catch { return }
    }
    state.editingCourseId = state.currentCourse!.id
    setEditing(true)
    setTitle(state.currentCourse!.title || '')
    setStartDate(state.currentCourse!.startDate ? formatDateForInput(state.currentCourse!.startDate) : '')
    setEndDate(state.currentCourse!.endDate ? formatDateForInput(state.currentCourse!.endDate) : '')
    setNotes(state.currentCourse!.notes || '')
  }, [currentCourse])

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ НАСТРОЙКИ КУРСА ]</div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Название курса</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: Первый курс" />
          </div>
          <div className="form-group">
            <label>Дата начала</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Дата окончания</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Заметки</label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Цели курса, особенности..." />
        </div>
        <button className="btn" onClick={handleSave}>[ СОХРАНИТЬ КУРС ]</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ ПРЕПАРАТЫ ]</div>
          <button className="btn" onClick={() => openModal(<DrugModal onSave={refresh} closeModal={closeModal} />)}>[ + ДОБАВИТЬ ПРЕПАРАТ ]</button>
        </div>
        {drugs.length === 0 ? (
          <EmptyState message="Нет препаратов" />
        ) : (
          <div id="drugs-list">
            {drugs.map((d: DrugDto) => {
              const info = DRUG_TYPE_MAP[d.type] || DRUG_TYPE_MAP[0]
              return (
                <div className="drug-card" key={d.id}>
                  <div className="drug-info">
                    <h4>{d.name}</h4>
                    <p>{d.dosage} &bull; {d.amount} &bull; {d.schedule}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`drug-badge ${info.cls}`}>{info.label}</span>
                    {d.manufacturerName && <span className="badge-manufacturer">[ {d.manufacturerName} ]</span>}
                    {d.catalogItemId && <span className="badge-catalog">КАТАЛОГ</span>}
                    <button className="btn btn-secondary btn-small" onClick={() => openModal(<DrugModal drugId={d.id} onSave={refresh} closeModal={closeModal} />)}>[ РЕД ]</button>
                    <button className="btn btn-danger btn-small" onClick={async () => {
                      if (!confirm('[ УДАЛИТЬ ПРЕПАРАТ? ]')) return
                      try {
                        await api(ENDPOINTS.drugs.delete(d.id), { method: 'DELETE' })
                        state.drugs = await api<DrugDto[]>(ENDPOINTS.drugs.list)
                        refresh()
                      } catch (e: any) { toast.error('Ошибка: ' + e.message) }
                    }}>[ X ]</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Logs Tab ───────────────────────────────────────────────────────────────

function LogsTab({ refresh }: { refresh: () => void }) {
  const drugs = useAppState('drugs')
  const { openModal, closeModal } = useModal()
  const [filterDrug, setFilterDrug] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [logs, setLogs] = useState<IntakeLogDto[]>([])
  const [loading, setLoading] = useState(false)

  const loadLogs = useCallback(async (drugId?: string, startDate?: string, endDate?: string) => {
    setLoading(true)
    try {
      const result = await intakeLogsApi.list({
        drugId: drugId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }) as IntakeLogDto[]
      setLogs(result)
    } catch (e) {
      console.error('Failed to load filtered logs:', e)
      toast.error('Ошибка загрузки логов')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount and when filters change
  useEffect(() => {
    loadLogs(filterDrug, filterStart, filterEnd)
  }, [filterDrug, filterStart, filterEnd, loadLogs])

  // Reload when intakeLogs state changes (after modal add/edit/delete)
  const intakeLogs = useAppState('intakeLogs')
  useEffect(() => {
    loadLogs(filterDrug, filterStart, filterEnd)
  }, [intakeLogs]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetFilters = useCallback(() => {
    setFilterDrug('')
    setFilterStart('')
    setFilterEnd('')
  }, [])

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ ФИЛЬТРЫ ]</div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Препарат</label>
            <select value={filterDrug} onChange={e => setFilterDrug(e.target.value)}>
              <option value="">Все препараты</option>
              {drugs.map((d: DrugDto) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>С даты</label>
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label>По дату</label>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-secondary" onClick={resetFilters}>[ СБРОСИТЬ ]</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ ЛОГ ПРИЁМА ]</div>
          <button className="btn" onClick={() => openModal(<IntakeLogModal onSave={refresh} closeModal={closeModal} />)}>[ + ДОБАВИТЬ ЗАПИСЬ ]</button>
        </div>
        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : logs.length === 0 ? (
          <div className="empty">Нет записей</div>
        ) : (
          <div id="filtered-intake-log">
            {logs.map((log) => (
              <div className="log-entry" key={log.id}>
                <div className="log-info">
                  <div className="log-drug">
                    {log.drugName}
                    {log.purchaseLabel && <span className="badge-purchase"> [{log.purchaseLabel}]</span>}
                  </div>
                  <div className="log-details">
                    {formatDate(log.date)} &bull; {log.dose || 'Без дозы'}
                    {log.note && ` \u2022 ${log.note}`}
                  </div>
                </div>
                <div className="log-actions">
                  <button className="btn btn-secondary btn-small" onClick={() => openModal(<IntakeLogModal logId={log.id} logData={log} onSave={refresh} closeModal={closeModal} />)}>&#9998;</button>
                  <button className="btn btn-secondary btn-small" onClick={async () => {
                    try {
                      await api(ENDPOINTS.intakeLogs.delete(log.id), { method: 'DELETE' })
                      state.intakeLogs = await api<IntakeLogDto[]>(ENDPOINTS.intakeLogs.list + '?count=20')
                      refresh()
                    } catch (e: any) { toast.error('Ошибка: ' + e.message) }
                  }}>&#10005;</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Inventory Tab ──────────────────────────────────────────────────────────

function InventoryTab({ refresh }: { refresh: () => void }) {
  const purchases = useAppState('purchases') as PurchaseDto[]
  const { openModal, closeModal } = useModal()
  const [inventory, setInventory] = useState<InventoryDto | null>(null)
  const [loadingInv, setLoadingInv] = useState(false)

  useEffect(() => {
    setLoadingInv(true)
    statsApi.getInventory()
      .then(data => setInventory(data as InventoryDto))
      .catch(e => { console.error('Failed to load inventory:', e); toast.error('Ошибка загрузки инвентаря') })
      .finally(() => setLoadingInv(false))

    // Load purchases into state (reactive bridge picks up the change)
    purchaseApi.list()
      .then(data => { state.purchases = data as PurchaseDto[] })
      .catch(e => { console.error('Failed to load purchases:', e); toast.error('Ошибка загрузки покупок') })
  }, [])

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ ИНВЕНТАРИЗАЦИЯ ПРЕПАРАТОВ ]</div>
        </div>
        {loadingInv ? (
          <div className="loading">Загрузка...</div>
        ) : !inventory || inventory.items.length === 0 ? (
          <div className="empty">Нет данных</div>
        ) : (
          <>
            <div className="inventory-grid">
              {inventory.items.map((item: InventoryItemDto) => {
                const remaining = Math.max(item.currentStock, 0)
                // generateAsciiDonut returns safe internal HTML from numeric values
                const donutHtml = generateAsciiDonut(item.totalConsumed, remaining, { size: 'small', showLegend: false })
                return (
                  <div className="inventory-card" key={item.drugId}>
                    <div className="inventory-card-header">
                      <h3 className="inventory-drug-name">{item.drugName}</h3>
                      <div className={`inventory-stock ${getStockClass(item.currentStock)}`}>
                        {item.currentStock > 0 ? '+' : ''}{item.currentStock}
                      </div>
                    </div>
                    <div className="inventory-card-with-chart">
                      <div className="inventory-ascii-donut" dangerouslySetInnerHTML={{ __html: donutHtml }} />
                      <div className="inventory-card-body">
                        <div className="inventory-stat">
                          <div className="inventory-stat-label">Куплено</div>
                          <div className="inventory-stat-value">{item.totalPurchased}</div>
                        </div>
                        <div className="inventory-stat">
                          <div className="inventory-stat-label">Принято</div>
                          <div className="inventory-stat-value consumed-value">{item.totalConsumed}</div>
                        </div>
                        <div className="inventory-stat">
                          <div className="inventory-stat-label">Потрачено</div>
                          <div className="inventory-stat-value">{item.totalSpent.toFixed(0)}{'\u20BD'}</div>
                        </div>
                      </div>
                    </div>
                    {item.purchaseBreakdown && item.purchaseBreakdown.length > 0 && (
                      <div className="purchase-breakdown">
                        {item.purchaseBreakdown.map((pb: PerPurchaseStockDto, i: number) => {
                          const isLast = i === item.purchaseBreakdown.length - 1 && item.unallocatedConsumed === 0
                          return (
                            <div className="purchase-breakdown-line" key={pb.purchaseId}>
                              {isLast ? '\u2514' : '\u251C'}{'\u2500\u2500'} {pb.label}: <span className={getStockClass(pb.remaining)}>{pb.remaining} доз</span>
                            </div>
                          )
                        })}
                        {item.unallocatedConsumed > 0 && (
                          <div className="purchase-breakdown-line">
                            {'\u2514\u2500\u2500'} <span style={{ color: 'var(--text-secondary)' }}>Нераспределённые: {item.unallocatedConsumed} приёмов</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="inventory-card-footer">
                      <div className="inventory-date">
                        <span className="inventory-date-label">{'\uD83D\uDED2'}</span>
                        {item.lastPurchaseDate ? formatDate(item.lastPurchaseDate) : '\u2014'}
                      </div>
                      <div className="inventory-date">
                        <span className="inventory-date-label">{'\uD83D\uDC8A'}</span>
                        {item.lastIntakeDate ? formatDate(item.lastIntakeDate) : '\u2014'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="inventory-total">
              <span className="inventory-total-label">ИТОГО ПОТРАЧЕНО:</span>
              <span className="inventory-total-value">{inventory.totalSpent.toFixed(2)}{'\u20BD'}</span>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ ИСТОРИЯ ПОКУПОК ]</div>
          <button className="btn" onClick={() => openModal(<PurchaseModal onSave={refresh} closeModal={closeModal} />)}>[ + ДОБАВИТЬ ПОКУПКУ ]</button>
        </div>
        {purchases.length === 0 ? (
          <div className="empty">Нет покупок</div>
        ) : (
          <div id="purchases-list">
            {purchases.map((p: PurchaseDto) => (
              <div className="purchase-entry" key={p.id}>
                <div className="purchase-info">
                  <div className="purchase-drug">{p.drugName}</div>
                  <div className="purchase-details">
                    {formatDate(p.purchaseDate)} &bull; {p.quantity} доз &bull; {p.price.toFixed(2)}{'\u20BD'}
                    {p.vendor && ` \u2022 ${p.vendor}`}
                    {p.notes && ` \u2022 ${p.notes}`}
                  </div>
                </div>
                <div className="purchase-actions">
                  <button className="btn btn-secondary btn-small" onClick={() => openModal(<PurchaseModal purchaseId={p.id} onSave={refresh} closeModal={closeModal} />)}>&#9998;</button>
                  <button className="btn btn-secondary btn-small" onClick={async () => {
                    if (!confirm('Удалить эту покупку?')) return
                    try {
                      await purchaseApi.remove(p.id)
                      state.purchases = (state.purchases as PurchaseDto[]).filter(pp => pp.id !== p.id)
                      refresh()
                    } catch (e: any) { toast.error('Ошибка удаления покупки') }
                  }}>&#10005;</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Statistics Tab ─────────────────────────────────────────────────────────

function StatisticsTab() {
  const drugs = useAppState('drugs')
  const [selectedDrug, setSelectedDrug] = useState('')
  const [stats, setStats] = useState<DrugStatisticsDto | null>(null)
  const [loading, setLoading] = useState(false)

  const consumptionChartRef = useRef<any>(null)
  const purchaseChartRef = useRef<any>(null)
  const consumptionElRef = useRef<HTMLDivElement>(null)
  const purchaseElRef = useRef<HTMLDivElement>(null)

  // Destroy charts on unmount
  useEffect(() => {
    return () => {
      consumptionChartRef.current?.destroy()
      purchaseChartRef.current?.destroy()
    }
  }, [])

  function getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  }

  function renderConsumptionChart(timeline: ConsumptionTimelineDto) {
    consumptionChartRef.current?.destroy()
    if (!consumptionElRef.current) return

    const chart = new ApexCharts(consumptionElRef.current, {
      series: [{ name: 'Приемов', data: timeline.dataPoints.map(d => ({ x: new Date(d.date).getTime(), y: d.count })) }],
      chart: { type: 'bar', height: 350, background: 'transparent', foreColor: getCssVar('--text-primary'), toolbar: { show: true } },
      theme: { mode: 'dark' },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      dataLabels: { enabled: false },
      xaxis: { type: 'datetime', labels: { format: 'dd MMM' } },
      yaxis: { title: { text: 'Количество приемов' } },
      colors: [getCssVar('--primary-color')],
      grid: { borderColor: getCssVar('--border'), opacity: 0.3 },
    })
    chart.render()
    consumptionChartRef.current = chart
  }

  function renderPurchaseVsConsumptionChart(data: PurchaseVsConsumptionDto) {
    purchaseChartRef.current?.destroy()
    if (!purchaseElRef.current) return

    const chart = new ApexCharts(purchaseElRef.current, {
      series: [
        { name: 'Покупки', type: 'column', data: data.timeline.map(d => ({ x: new Date(d.date).getTime(), y: d.purchases })) },
        { name: 'Прием', type: 'column', data: data.timeline.map(d => ({ x: new Date(d.date).getTime(), y: d.consumption })) },
        { name: 'Остаток', type: 'line', data: data.timeline.map(d => ({ x: new Date(d.date).getTime(), y: d.runningStock })) },
      ],
      chart: { height: 350, type: 'line', background: 'transparent', foreColor: getCssVar('--text-primary'), toolbar: { show: true } },
      theme: { mode: 'dark' },
      stroke: { width: [0, 0, 3], curve: 'smooth' },
      plotOptions: { bar: { columnWidth: '50%' } },
      dataLabels: { enabled: false },
      xaxis: { type: 'datetime', labels: { format: 'dd MMM' } },
      yaxis: { title: { text: 'Количество доз' } },
      colors: [getCssVar('--success'), getCssVar('--error'), getCssVar('--primary-color')],
      grid: { borderColor: getCssVar('--border'), opacity: 0.3 },
      legend: { position: 'top' },
    })
    chart.render()
    purchaseChartRef.current = chart
  }

  const loadStatistics = useCallback(async (drugId: string) => {
    if (!drugId) { setStats(null); return }
    setLoading(true)
    try {
      const [drugStats, timeline, pvsc] = await Promise.all([
        statsApi.getDrugStatistics(drugId) as Promise<DrugStatisticsDto>,
        statsApi.getConsumptionTimeline(drugId) as Promise<ConsumptionTimelineDto>,
        statsApi.getPurchaseVsConsumption(drugId) as Promise<PurchaseVsConsumptionDto>,
      ])
      setStats(drugStats)

      // Render charts after React commits the DOM
      requestAnimationFrame(() => {
        renderConsumptionChart(timeline)
        renderPurchaseVsConsumptionChart(pvsc)
      })
    } catch (e) {
      console.error('Failed to load statistics:', e)
      toast.error('Ошибка загрузки статистики')
    } finally {
      setLoading(false)
    }
  }, [])

  const stockColor = stats
    ? stats.currentStock < 0 ? 'var(--error)' : stats.currentStock <= 5 ? 'var(--warning)' : 'var(--success)'
    : undefined

  // generateAsciiDonut returns safe internal HTML from numeric values only
  const donutHtml = stats
    ? generateAsciiDonut(stats.totalConsumed, Math.max(stats.currentStock, 0), { size: 'large', showLegend: true })
    : ''

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ ВЫБОР ПРЕПАРАТА ]</div>
        </div>
        <div className="form-group">
          <label>Препарат для статистики</label>
          <select value={selectedDrug} onChange={e => { setSelectedDrug(e.target.value); loadStatistics(e.target.value) }}>
            <option value="">Выберите препарат...</option>
            {drugs.map((d: DrugDto) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="loading">Загрузка статистики...</div>}

      {stats && (
        <>
          <div className="stats-overview">
            <div className="stats-donut-container">
              <div className="card">
                <div className="card-header">
                  <div className="card-title" data-asciify="md">[ ПРОГРЕСС УПОТРЕБЛЕНИЯ ]</div>
                </div>
                <div className="stats-ascii-donut ascii-donut-container-large" dangerouslySetInnerHTML={{ __html: donutHtml }} />
              </div>
            </div>
            <div className="stat-cards">
              <div className="stat-card">
                <h3>Принято</h3>
                <div className="stat-value" data-asciify="lg">{stats.totalConsumed}</div>
                <div className="stat-sub">доз</div>
              </div>
              <div className="stat-card">
                <h3>Куплено</h3>
                <div className="stat-value" data-asciify="lg">{stats.totalPurchased}</div>
                <div className="stat-sub">доз</div>
              </div>
              <div className="stat-card">
                <h3>Остаток</h3>
                <div className="stat-value" data-asciify="lg" style={{ color: stockColor }}>{stats.currentStock}</div>
                <div className="stat-sub">{stats.currentStock < 0 ? 'нужно купить' : 'доз'}</div>
              </div>
              <div className="stat-card">
                <h3>Потрачено</h3>
                <div className="stat-value" data-asciify="lg">{stats.totalSpent.toFixed(2)}{'\u20BD'}</div>
                <div className="stat-sub">рублей</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title" data-asciify="md">[ ГРАФИК ПРИЕМА ]</div>
            </div>
            <div ref={consumptionElRef} />
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title" data-asciify="md">[ ПОКУПКИ VS ПРИЕМ ]</div>
            </div>
            <div ref={purchaseElRef} />
          </div>
        </>
      )}
    </>
  )
}

// ─── Main CoursePage ────────────────────────────────────────────────────────

export default function CoursePage() {
  const [activeTab, setActiveTab] = useState<TabId>('drugs')
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  return (
    <>
      <div className="course-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`course-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'drugs' && <DrugsTab key={refreshKey} refresh={refresh} />}
      {activeTab === 'logs' && <LogsTab key={refreshKey} refresh={refresh} />}
      {activeTab === 'inventory' && <InventoryTab key={refreshKey} refresh={refresh} />}
      {activeTab === 'statistics' && <StatisticsTab />}
    </>
  )
}
