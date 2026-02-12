import { intakeLogsApi, purchaseApi, statsApi } from '../api.js';
import { state } from '../state.js';
import { formatDate, escapeHtml } from '../utils.js';
import { generateAsciiDonut } from '../components/asciiDonut.js';
import { toast } from '../components/toast.js';

// Charts instances (ApexCharts for timeline charts only)
let consumptionChart = null;
let purchaseVsConsumptionChart = null;

// Initialize course tabs
export function initCourseTabs() {
    const tabs = document.querySelectorAll('.course-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Initialize filters
    document.getElementById('filter-drug')?.addEventListener('change', () => loadFilteredLogs());
    document.getElementById('filter-start-date')?.addEventListener('change', () => loadFilteredLogs());
    document.getElementById('filter-end-date')?.addEventListener('change', () => loadFilteredLogs());
    document.getElementById('stats-drug')?.addEventListener('change', (e) => loadStatistics(e.target.value));

    // Load initial data
    loadFilteredLogs();
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.course-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.course-tab-content').forEach(content => {
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

// Populate drug filters
function populateFilterDrugs() {
    const select = document.getElementById('filter-drug');
    if (!select) return;

    select.innerHTML = '<option value="">Все препараты</option>';
    state.drugs.forEach(drug => {
        select.innerHTML += `<option value="${drug.id}">${escapeHtml(drug.name)}</option>`;
    });
}

// Populate stats drugs
function populateStatsDrugs() {
    const select = document.getElementById('stats-drug');
    if (!select) return;

    select.innerHTML = '<option value="">Выберите препарат...</option>';
    state.drugs.forEach(drug => {
        select.innerHTML += `<option value="${drug.id}">${escapeHtml(drug.name)}</option>`;
    });
}

// Load filtered intake logs
export async function loadFilteredLogs() {
    try {
        const filters = {
            drugId: document.getElementById('filter-drug')?.value || null,
            startDate: document.getElementById('filter-start-date')?.value || null,
            endDate: document.getElementById('filter-end-date')?.value || null
        };

        const logs = await intakeLogsApi.list(filters);
        renderFilteredLogs(logs);
    } catch (error) {
        console.error('Failed to load filtered logs:', error);
        toast.error('Ошибка загрузки логов');
        document.getElementById('filtered-intake-log').innerHTML = '<div class="error">Ошибка загрузки логов</div>';
    }
}

// Render filtered logs
function renderFilteredLogs(logs) {
    const container = document.getElementById('filtered-intake-log');
    if (!container) return;

    if (logs.length === 0) {
        container.innerHTML = '<div class="empty">Нет записей</div>';
        return;
    }

    container.innerHTML = logs.map(log => {
        const purchaseBadge = log.purchaseLabel
            ? ` <span class="badge-purchase">[${escapeHtml(log.purchaseLabel)}]</span>`
            : '';
        return `
        <div class="log-entry">
            <div class="log-info">
                <div class="log-drug">${escapeHtml(log.drugName)}${purchaseBadge}</div>
                <div class="log-details">${formatDate(log.date)} • ${escapeHtml(log.dose) || 'Без дозы'} ${log.note ? '• ' + escapeHtml(log.note) : ''}</div>
            </div>
            <div class="log-actions">
                <button class="btn btn-secondary btn-small" onclick="editLog('${log.id}')">✎</button>
                <button class="btn btn-secondary btn-small" onclick="deleteLog('${log.id}')">✕</button>
            </div>
        </div>`;
    }).join('');
}

// Reset filters
export function resetFilters() {
    document.getElementById('filter-drug').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    loadFilteredLogs();
}

// Load inventory
async function loadInventory() {
    try {
        const inventory = await statsApi.getInventory();
        renderInventory(inventory);
    } catch (error) {
        console.error('Failed to load inventory:', error);
        toast.error('Ошибка загрузки инвентаря');
        document.getElementById('inventory-table').innerHTML = '<div class="error">Ошибка загрузки инвентаря</div>';
    }
}

// Render inventory with ASCII donuts
function renderInventory(inventory) {
    const container = document.getElementById('inventory-table');
    if (!container) return;

    if (inventory.items.length === 0) {
        container.innerHTML = '<div class="empty">Нет данных</div>';
        return;
    }

    container.innerHTML = `
        <div class="inventory-grid">
            ${inventory.items.map((item) => {
                const remaining = item.currentStock > 0 ? item.currentStock : 0;
                const asciiDonut = generateAsciiDonut(item.totalConsumed, remaining, { size: 'small', showLegend: false });

                // Per-purchase breakdown
                let breakdownHtml = '';
                if (item.purchaseBreakdown && item.purchaseBreakdown.length > 0) {
                    const lines = item.purchaseBreakdown.map((pb, i, arr) => {
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

// Get stock CSS class
function getStockClass(stock) {
    if (stock < 0) return 'stock-negative';
    if (stock <= 5) return 'stock-low';
    return 'stock-positive';
}

// Load purchases
async function loadPurchases() {
    try {
        const purchases = await purchaseApi.list();
        state.purchases = purchases;
        renderPurchases(purchases);
    } catch (error) {
        console.error('Failed to load purchases:', error);
        toast.error('Ошибка загрузки покупок');
        document.getElementById('purchases-list').innerHTML = '<div class="error">Ошибка загрузки покупок</div>';
    }
}

// Render purchases
function renderPurchases(purchases) {
    const container = document.getElementById('purchases-list');
    if (!container) return;

    if (purchases.length === 0) {
        container.innerHTML = '<div class="empty">Нет покупок</div>';
        return;
    }

    container.innerHTML = purchases.map(purchase => `
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

// Load statistics
async function loadStatistics(drugId) {
    if (!drugId) {
        document.getElementById('stats-cards-container').style.display = 'none';
        return;
    }

    try {
        const stats = await statsApi.getDrugStatistics(drugId);
        const timeline = await statsApi.getConsumptionTimeline(drugId);
        const purchaseVsConsumption = await statsApi.getPurchaseVsConsumption(drugId);

        renderStatCards(stats);
        renderConsumptionChart(timeline);
        renderPurchaseVsConsumptionChart(purchaseVsConsumption);

        document.getElementById('stats-cards-container').style.display = 'block';
    } catch (error) {
        console.error('Failed to load statistics:', error);
        toast.error('Ошибка загрузки статистики');
    }
}

// Render stat cards
function renderStatCards(stats) {
    document.getElementById('stat-consumed').textContent = stats.totalConsumed;
    document.getElementById('stat-purchased').textContent = stats.totalPurchased;
    document.getElementById('stat-stock').textContent = stats.currentStock;
    document.getElementById('stat-spent').textContent = `${stats.totalSpent.toFixed(2)}₽`;

    const stockSub = document.getElementById('stat-stock-sub');
    stockSub.textContent = stats.currentStock < 0 ? 'нужно купить' : 'доз';
    stockSub.className = 'stat-sub';
    if (stats.currentStock < 0) {
        document.getElementById('stat-stock').style.color = 'var(--error)';
    } else if (stats.currentStock <= 5) {
        document.getElementById('stat-stock').style.color = 'var(--warning)';
    } else {
        document.getElementById('stat-stock').style.color = 'var(--success)';
    }

    // Render the big ASCII donut chart
    renderStatsDonut(stats.totalConsumed, stats.currentStock);
}

// Render big ASCII donut chart for statistics
function renderStatsDonut(consumed, remaining) {
    const chartEl = document.getElementById('stats-donut-chart');
    if (!chartEl) return;

    const displayRemaining = remaining < 0 ? 0 : remaining;

    // Use large ASCII donut for statistics
    const donutHtml = generateAsciiDonut(consumed, displayRemaining, { size: 'large', showLegend: true });

    chartEl.innerHTML = `<div class="stats-ascii-donut ascii-donut-container-large">${donutHtml}</div>`;
}

// Render consumption chart
function renderConsumptionChart(timeline) {
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

// Render purchase vs consumption chart
function renderPurchaseVsConsumptionChart(data) {
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
window.courseTabs = {
    resetFilters,
    loadFilteredLogs,
    loadInventory,
    loadPurchases
};
