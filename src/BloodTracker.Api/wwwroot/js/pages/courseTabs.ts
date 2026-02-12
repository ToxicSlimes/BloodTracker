import { intakeLogsApi, purchaseApi, statsApi } from '../api.js';
import { state } from '../state.js';
import { formatDate, escapeHtml } from '../utils.js';
import { generateAsciiDonut } from '../components/asciiDonut.js';
import { toast } from '../components/toast.js';
import type {
    IntakeLogDto, PurchaseDto, DrugStatisticsDto,
    InventoryDto, InventoryItemDto, PerPurchaseStockDto,
    ConsumptionTimelineDto, PurchaseVsConsumptionDto
} from '../types/index.js'

declare const ApexCharts: any;

/** Инстанс ApexCharts для графика потребления */
// Charts instances (ApexCharts for timeline charts only)
let consumptionChart: any = null;

/** Инстанс ApexCharts для графика покупки vs потребление */
let purchaseVsConsumptionChart: any = null;

/**
 * Инициализирует табы страницы курса: привязывает обработчики переключения,
 * фильтров и селекта статистики. Загружает начальные данные логов.
 */
// Initialize course tabs
export function initCourseTabs(): void {
    const tabs = document.querySelectorAll('.course-tab');
    tabs.forEach((tab: Element) => {
        tab.addEventListener('click', () => switchTab((tab as HTMLElement).dataset.tab!));
    });

    // Initialize filters
    document.getElementById('filter-drug')?.addEventListener('change', () => loadFilteredLogs());
    document.getElementById('filter-start-date')?.addEventListener('change', () => loadFilteredLogs());
    document.getElementById('filter-end-date')?.addEventListener('change', () => loadFilteredLogs());
    document.getElementById('stats-drug')?.addEventListener('change', (e: Event) => loadStatistics((e.target as HTMLSelectElement).value));

    // Load initial data
    loadFilteredLogs();
}

/**
 * Переключает активный таб курса и загружает соответствующие данные.
 * @param {string} tabName — имя таба ('logs', 'inventory', 'statistics')
 */
// Switch between tabs
function switchTab(tabName: string): void {
    // Update tab buttons
    document.querySelectorAll('.course-tab').forEach((tab: Element) => {
        tab.classList.toggle('active', (tab as HTMLElement).dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.course-tab-content').forEach((content: Element) => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });

    // Load data for the active tab
    if (tabName === 'logs') {
        loadFilteredLogs();
        populateFilterDrugs();
    } else if (tabName === 'inventory') {
        loadInventory();
        loadPurchases();
    } else if (tabName === 'statistics') {
        populateStatsDrugs();
    }
}

/**
 * Заполняет select фильтра препаратов из state.drugs.
 */
// Populate drug filters
export function populateFilterDrugs(): void {
    const select = document.getElementById('filter-drug') as HTMLSelectElement | null;
    if (!select) return;

    select.innerHTML = '<option value="">Все препараты</option>';
    state.drugs.forEach((drug: any) => {
        select.innerHTML += `<option value="${drug.id}">${escapeHtml(drug.name)}</option>`;
    });
}

/**
 * Заполняет select препаратов для вкладки статистики.
 */
// Populate stats drugs
export function populateStatsDrugs(): void {
    const select = document.getElementById('stats-drug') as HTMLSelectElement | null;
    if (!select) return;

    select.innerHTML = '<option value="">Выберите препарат...</option>';
    state.drugs.forEach((drug: any) => {
        select.innerHTML += `<option value="${drug.id}">${escapeHtml(drug.name)}</option>`;
    });
}

/**
 * Загружает логи приёмов с фильтрацией по препарату и датам.
 * @returns {Promise<void>}
 */
// Load filtered intake logs
export async function loadFilteredLogs(): Promise<void> {
    try {
        const filters = {
            drugId: (document.getElementById('filter-drug') as HTMLSelectElement | null)?.value || null,
            startDate: (document.getElementById('filter-start-date') as HTMLInputElement | null)?.value || null,
            endDate: (document.getElementById('filter-end-date') as HTMLInputElement | null)?.value || null
        };

        const logs = await intakeLogsApi.list(filters) as IntakeLogDto[];
        renderFilteredLogs(logs);
    } catch (error) {
        console.error('Failed to load filtered logs:', error);
        toast.error('Ошибка загрузки логов');
        (document.getElementById('filtered-intake-log') as HTMLElement).innerHTML = '<div class="error">Ошибка загрузки логов</div>';
    }
}

/**
 * Рендерит отфильтрованные записи логов приёмов.
 * @param {Array<Object>} logs — массив записей лога
 */
// Render filtered logs
function renderFilteredLogs(logs: IntakeLogDto[]): void {
    const container = document.getElementById('filtered-intake-log') as HTMLElement | null;
    if (!container) return;

    if (logs.length === 0) {
        container.innerHTML = '<div class="empty">Нет записей</div>';
        return;
    }

    // ── Запись лога приёма (фильтрованный) ──────────────────────────
    // [Название препарата] [Партия badge]
    // [Дата] • [Доза] • [Заметка]
    // Кнопки: [Редактировать] [Удалить]
    container.innerHTML = logs.map((log: IntakeLogDto) => {
        const purchaseBadge = log.purchaseLabel
            ? ` <span class="badge-purchase">[${escapeHtml(log.purchaseLabel)}]</span>`
            : '';
        return `
        <div class="log-entry">
            <div class="log-info">
                <div class="log-drug">${escapeHtml(log.drugName)}${purchaseBadge}</div>
                <div class="log-details">${formatDate(log.date)} • ${escapeHtml(log.dose || '') || 'Без дозы'} ${log.note ? '• ' + escapeHtml(log.note) : ''}</div>
            </div>
            <div class="log-actions">
                <button class="btn btn-secondary btn-small" onclick="editLog('${log.id}')">✎</button>
                <button class="btn btn-secondary btn-small" onclick="deleteLog('${log.id}')">✕</button>
            </div>
        </div>`;
    }).join('');
}

/**
 * Сбрасывает все фильтры логов (препарат, даты) и перезагружает список.
 */
// Reset filters
export function resetFilters(): void {
    (document.getElementById('filter-drug') as HTMLSelectElement).value = '';
    (document.getElementById('filter-start-date') as HTMLInputElement).value = '';
    (document.getElementById('filter-end-date') as HTMLInputElement).value = '';
    loadFilteredLogs();
}

/**
 * Загружает данные инвентаря с сервера и рендерит карточки.
 * @returns {Promise<void>}
 */
// Load inventory
async function loadInventory(): Promise<void> {
    try {
        const inventory = await statsApi.getInventory() as InventoryDto;
        renderInventory(inventory);
    } catch (error) {
        console.error('Failed to load inventory:', error);
        toast.error('Ошибка загрузки инвентаря');
        (document.getElementById('inventory-table') as HTMLElement).innerHTML = '<div class="error">Ошибка загрузки инвентаря</div>';
    }
}

/**
 * Рендерит карточки инвентаря с ASCII donut-чартами и разбивкой по покупкам.
 * @param {Object} inventory — объект инвентаря с массивом items и totalSpent
 */
// Render inventory with ASCII donuts
function renderInventory(inventory: InventoryDto): void {
    const container = document.getElementById('inventory-table') as HTMLElement | null;
    if (!container) return;

    if (inventory.items.length === 0) {
        container.innerHTML = '<div class="empty">Нет данных</div>';
        return;
    }

    // ── Карточка инвентаря ──────────────────────────
    // Header: [Название препарата] [Остаток +/- badge]
    // Body: [ASCII donut] | [Куплено] [Принято] [Потрачено ₽]
    // Breakdown: [Партия 1: X доз] [Партия 2: Y доз] [Нераспределённые]
    // Footer: [Дата последней покупки] [Дата последнего приёма]
    // Итого: [TOTAL SPENT ₽]
    container.innerHTML = `
        <div class="inventory-grid">
            ${inventory.items.map((item: InventoryItemDto) => {
                const remaining = item.currentStock > 0 ? item.currentStock : 0;
                const asciiDonut = generateAsciiDonut(item.totalConsumed, remaining, { size: 'small', showLegend: false });

                // Per-purchase breakdown
                let breakdownHtml = '';
                if (item.purchaseBreakdown && item.purchaseBreakdown.length > 0) {
                    const lines = item.purchaseBreakdown.map((pb: PerPurchaseStockDto, i: number, arr: PerPurchaseStockDto[]) => {
                        const prefix = i === arr.length - 1 && item.unallocatedConsumed === 0 ? '└' : '├';
                        return `<div class="purchase-breakdown-line">${prefix}── ${escapeHtml(pb.label)}: <span class="${getStockClass(pb.remaining)}">${pb.remaining} доз</span></div>`;
                    });
                    if (item.unallocatedConsumed > 0) {
                        lines.push(`<div class="purchase-breakdown-line">└── <span style="color:var(--text-secondary)">Нераспределённые: ${item.unallocatedConsumed} приёмов</span></div>`);
                    }
                    breakdownHtml = `<div class="purchase-breakdown">${lines.join('')}</div>`;
                }

                return `
                <div class="inventory-card">
                    <div class="inventory-card-header">
                        <h3 class="inventory-drug-name">${escapeHtml(item.drugName)}</h3>
                        <div class="inventory-stock ${getStockClass(item.currentStock)}">
                            ${item.currentStock > 0 ? '+' : ''}${item.currentStock}
                        </div>
                    </div>
                    <div class="inventory-card-with-chart">
                        <div class="inventory-ascii-donut">${asciiDonut}</div>
                        <div class="inventory-card-body">
                            <div class="inventory-stat">
                                <div class="inventory-stat-label">Куплено</div>
                                <div class="inventory-stat-value">${item.totalPurchased}</div>
                            </div>
                            <div class="inventory-stat">
                                <div class="inventory-stat-label">Принято</div>
                                <div class="inventory-stat-value consumed-value">${item.totalConsumed}</div>
                            </div>
                            <div class="inventory-stat">
                                <div class="inventory-stat-label">Потрачено</div>
                                <div class="inventory-stat-value">${item.totalSpent.toFixed(0)}₽</div>
                            </div>
                        </div>
                    </div>
                    ${breakdownHtml}
                    <div class="inventory-card-footer">
                        <div class="inventory-date">
                            <span class="inventory-date-label">🛒</span>
                            ${item.lastPurchaseDate ? formatDate(item.lastPurchaseDate) : '—'}
                        </div>
                        <div class="inventory-date">
                            <span class="inventory-date-label">💊</span>
                            ${item.lastIntakeDate ? formatDate(item.lastIntakeDate) : '—'}
                        </div>
                    </div>
                </div>
            `}).join('')}
        </div>
        <div class="inventory-total">
            <span class="inventory-total-label">ИТОГО ПОТРАЧЕНО:</span>
            <span class="inventory-total-value">${inventory.totalSpent.toFixed(2)}₽</span>
        </div>
    `;
}

/**
 * Возвращает CSS-класс для отображения остатка (negative/low/positive).
 * @param {number} stock — количество оставшихся доз
 * @returns {string} CSS-класс
 */
// Get stock CSS class
function getStockClass(stock: number): string {
    if (stock < 0) return 'stock-negative';
    if (stock <= 5) return 'stock-low';
    return 'stock-positive';
}

/**
 * Загружает список покупок с сервера и рендерит их.
 * @returns {Promise<void>}
 */
// Load purchases
async function loadPurchases(): Promise<void> {
    try {
        state.purchases = await purchaseApi.list() as PurchaseDto[];
        // renderPurchases() вызывается реактивно через subscribe('purchases', ...)
    } catch (error) {
        console.error('Failed to load purchases:', error);
        toast.error('Ошибка загрузки покупок');
        (document.getElementById('purchases-list') as HTMLElement).innerHTML = '<div class="error">Ошибка загрузки покупок</div>';
    }
}

/**
 * Рендерит список покупок с кнопками редактирования и удаления.
 * @param {Array<Object>} purchases — массив покупок
 */
// Render purchases — reads from state.purchases
export function renderPurchases(): void {
    const container = document.getElementById('purchases-list') as HTMLElement | null;
    if (!container) return;

    const purchases = state.purchases as PurchaseDto[];
    if (purchases.length === 0) {
        container.innerHTML = '<div class="empty">Нет покупок</div>';
        return;
    }

    // ── Запись покупки ──────────────────────────
    // [Название препарата]
    // [Дата] • [Количество доз] • [Цена ₽] • [Продавец] • [Заметки]
    // Кнопки: [Редактировать] [Удалить]
    container.innerHTML = purchases.map((purchase: PurchaseDto) => `
        <div class="purchase-entry">
            <div class="purchase-info">
                <div class="purchase-drug">${escapeHtml(purchase.drugName)}</div>
                <div class="purchase-details">
                    ${formatDate(purchase.purchaseDate)} •
                    ${purchase.quantity} доз •
                    ${purchase.price.toFixed(2)}₽
                    ${purchase.vendor ? ' • ' + escapeHtml(purchase.vendor) : ''}
                    ${purchase.notes ? ' • ' + escapeHtml(purchase.notes) : ''}
                </div>
            </div>
            <div class="purchase-actions">
                <button class="btn btn-secondary btn-small" onclick="window.purchaseModals.openEditPurchaseModal('${purchase.id}')">✎</button>
                <button class="btn btn-secondary btn-small" onclick="window.purchaseModals.deletePurchase('${purchase.id}')">✕</button>
            </div>
        </div>
    `).join('');
}

/**
 * Загружает статистику по конкретному препарату: карточки, timeline, purchase vs consumption.
 * @param {string} drugId — ID выбранного препарата (пустая строка = скрыть)
 * @returns {Promise<void>}
 */
// Load statistics
async function loadStatistics(drugId: string): Promise<void> {
    if (!drugId) {
        (document.getElementById('stats-cards-container') as HTMLElement).style.display = 'none';
        return;
    }

    try {
        const stats = await statsApi.getDrugStatistics(drugId) as DrugStatisticsDto;
        const timeline = await statsApi.getConsumptionTimeline(drugId) as ConsumptionTimelineDto;
        const purchaseVsConsumption = await statsApi.getPurchaseVsConsumption(drugId) as PurchaseVsConsumptionDto;

        renderStatCards(stats);
        renderConsumptionChart(timeline);
        renderPurchaseVsConsumptionChart(purchaseVsConsumption);

        (document.getElementById('stats-cards-container') as HTMLElement).style.display = 'block';
    } catch (error) {
        console.error('Failed to load statistics:', error);
        toast.error('Ошибка загрузки статистики');
    }
}

/**
 * Рендерит карточки статистики препарата (принято, куплено, остаток, потрачено) и ASCII donut.
 * @param {Object} stats — объект статистики с полями totalConsumed, totalPurchased, currentStock, totalSpent
 */
// Render stat cards
function renderStatCards(stats: DrugStatisticsDto): void {
    (document.getElementById('stat-consumed') as HTMLElement).textContent = String(stats.totalConsumed);
    (document.getElementById('stat-purchased') as HTMLElement).textContent = String(stats.totalPurchased);
    (document.getElementById('stat-stock') as HTMLElement).textContent = String(stats.currentStock);
    (document.getElementById('stat-spent') as HTMLElement).textContent = `${stats.totalSpent.toFixed(2)}₽`;

    const stockSub = document.getElementById('stat-stock-sub') as HTMLElement;
    stockSub.textContent = stats.currentStock < 0 ? 'нужно купить' : 'доз';
    stockSub.className = 'stat-sub';
    if (stats.currentStock < 0) {
        (document.getElementById('stat-stock') as HTMLElement).style.color = 'var(--error)';
    } else if (stats.currentStock <= 5) {
        (document.getElementById('stat-stock') as HTMLElement).style.color = 'var(--warning)';
    } else {
        (document.getElementById('stat-stock') as HTMLElement).style.color = 'var(--success)';
    }

    // Render the big ASCII donut chart
    renderStatsDonut(stats.totalConsumed, stats.currentStock);
}

/**
 * Рендерит большой ASCII donut-чарт для вкладки статистики.
 * @param {number} consumed — количество принятых доз
 * @param {number} remaining — количество оставшихся доз
 */
// Render big ASCII donut chart for statistics
function renderStatsDonut(consumed: number, remaining: number): void {
    const chartEl = document.getElementById('stats-donut-chart') as HTMLElement | null;
    if (!chartEl) return;

    const displayRemaining = remaining < 0 ? 0 : remaining;

    // Use large ASCII donut for statistics
    const donutHtml = generateAsciiDonut(consumed, displayRemaining, { size: 'large', showLegend: true });

    chartEl.innerHTML = `<div class="stats-ascii-donut ascii-donut-container-large">${donutHtml}</div>`;
}

/**
 * Рендерит bar-chart потребления по дням (ApexCharts).
 * Уничтожает предыдущий инстанс перед созданием нового.
 * @param {Object} timeline — объект с массивом dataPoints [{date, count}]
 */
// Render consumption chart
function renderConsumptionChart(timeline: ConsumptionTimelineDto): void {
    if (consumptionChart) {
        consumptionChart.destroy();
    }

    const options = {
        series: [{
            name: 'Приемов',
            data: timeline.dataPoints.map(d => ({ x: new Date(d.date).getTime(), y: d.count }))
        }],
        chart: {
            type: 'bar',
            height: 350,
            background: 'transparent',
            foreColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    zoom: true,
                    pan: true,
                    reset: true
                }
            }
        },
        theme: {
            mode: 'dark'
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '60%'
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            type: 'datetime',
            labels: {
                format: 'dd MMM'
            }
        },
        yaxis: {
            title: {
                text: 'Количество приемов'
            }
        },
        colors: [getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()],
        grid: {
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border').trim(),
            opacity: 0.3
        }
    };

    consumptionChart = new ApexCharts(document.querySelector('#consumption-chart'), options);
    consumptionChart.render();
}

/**
 * Рендерит комбинированный chart покупки vs потребление с линией остатка (ApexCharts).
 * Серии: columns покупок и потребления + line running stock.
 * @param {Object} data — объект с массивом timeline [{date, purchases, consumption, runningStock}]
 */
// Render purchase vs consumption chart
function renderPurchaseVsConsumptionChart(data: PurchaseVsConsumptionDto): void {
    if (purchaseVsConsumptionChart) {
        purchaseVsConsumptionChart.destroy();
    }

    const options = {
        series: [
            {
                name: 'Покупки',
                type: 'column',
                data: data.timeline.map(d => ({ x: new Date(d.date).getTime(), y: d.purchases }))
            },
            {
                name: 'Прием',
                type: 'column',
                data: data.timeline.map(d => ({ x: new Date(d.date).getTime(), y: d.consumption }))
            },
            {
                name: 'Остаток',
                type: 'line',
                data: data.timeline.map(d => ({ x: new Date(d.date).getTime(), y: d.runningStock }))
            }
        ],
        chart: {
            height: 350,
            type: 'line',
            background: 'transparent',
            foreColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
            toolbar: {
                show: true
            }
        },
        theme: {
            mode: 'dark'
        },
        stroke: {
            width: [0, 0, 3],
            curve: 'smooth'
        },
        plotOptions: {
            bar: {
                columnWidth: '50%'
            }
        },
        dataLabels: {
            enabled: false
        },
        labels: data.timeline.map(d => new Date(d.date).getTime()),
        xaxis: {
            type: 'datetime',
            labels: {
                format: 'dd MMM'
            }
        },
        yaxis: {
            title: {
                text: 'Количество доз'
            }
        },
        colors: [
            getComputedStyle(document.documentElement).getPropertyValue('--success').trim(),
            getComputedStyle(document.documentElement).getPropertyValue('--error').trim(),
            getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()
        ],
        grid: {
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border').trim(),
            opacity: 0.3
        },
        legend: {
            position: 'top'
        }
    };

    purchaseVsConsumptionChart = new ApexCharts(document.querySelector('#purchase-vs-consumption-chart'), options);
    purchaseVsConsumptionChart.render();
}

// Export for global access
(window as any).courseTabs = {
    resetFilters,
    loadFilteredLogs,
    loadInventory,
    loadPurchases
};
