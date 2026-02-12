import { state } from '../state.js'
import { api, statsApi } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { formatDate, getStatusClass, escapeHtml } from '../utils.js'
import { generateAsciiDonut } from '../components/asciiDonut.js'
import { toast } from '../components/toast.js'
import type { AlertDto, ReferenceRange } from '../types/index.js'
import type { InventoryDto, InventoryItemDto } from '../types/index.js'

/**
 * Загружает алерты по последнему анализу и рендерит карточки отклонений на дашборде.
 * Если анализов нет — показывает empty-state. Если все в норме — сообщение об этом.
 * @returns {Promise<void>}
 */
export async function loadAlerts(): Promise<void> {
    const container = document.getElementById('dashboard-alerts') as HTMLElement | null
    if (!container) return
    
    if (state.analyses.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Добавьте анализы</p></div>'
        return
    }
    
    try {
        const alerts = await api(ENDPOINTS.analyses.alerts(state.analyses[0].id)) as AlertDto[]
        if (alerts.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>[ ВСЕ ПОКАЗАТЕЛИ В НОРМЕ ]</p></div>'
        } else {
            // ── Карточка алерта ──────────────────────────
            // [Статус-индикатор] [Название показателя]
            // [Значение + единица] (норма: min-max)
            container.innerHTML = alerts.map((a: AlertDto) => `
                <div class="drug-card">
                    <div class="drug-info">
                        <h4><span class="indicator ind-${getStatusClass(a.status)}"></span>${a.name}</h4>
                        <p>${a.value} ${a.unit} (норма: ${a.refMin}-${a.refMax})</p>
                    </div>
                </div>
            `).join('')
        }
    } catch (e) {
        console.error('Failed to load alerts:', e)
        toast.error('Ошибка загрузки уведомлений')
    }
}

/**
 * Возвращает HTML-badge типа препарата для дашборда (оральный, инъекция и т.д.).
 * @param {number} type — числовой тип препарата (0-4)
 * @returns {string} HTML-строка с badge
 */
function dashboardTypeBadge(type: number): string {
    const map: Record<number, { cls: string; label: string }> = {
        0: { cls: 'badge-oral', label: '[ ОРАЛЬНЫЙ ]' },
        1: { cls: 'badge-inject', label: '[ ИНЪЕКЦИЯ ]' },
        2: { cls: 'badge-subcutaneous', label: '[ ПОДКОЖНЫЙ ]' },
        3: { cls: 'badge-transdermal', label: '[ ТРАНСДЕРМ ]' },
        4: { cls: 'badge-nasal', label: '[ НАЗАЛЬНЫЙ ]' }
    }
    const info = map[type] || map[0]
    return `<span class="drug-badge ${info.cls}">${info.label}</span>`
}

/**
 * Рендерит список препаратов текущего курса на дашборде.
 * Показывает название, дозировку, расписание, тип и производителя.
 */
export function renderDashboardDrugs(): void {
    const container = document.getElementById('dashboard-drugs') as HTMLElement | null
    if (!container) return

    if (state.drugs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Нет препаратов</p></div>'
        return
    }
    // ── Карточка препарата на дашборде ──────────────────────────
    // [Название]
    // [Дозировка] • [Расписание]
    // Badges: [Тип] [Производитель]
    container.innerHTML = state.drugs.map((d: any) => {
        const mfrBadge = d.manufacturerName ? `<span class="badge-manufacturer">[ ${escapeHtml(d.manufacturerName)} ]</span>` : ''
        return `
        <div class="drug-card">
            <div class="drug-info">
                <h4>${escapeHtml(d.name)}</h4>
                <p>${escapeHtml(d.dosage)} • ${escapeHtml(d.schedule)}</p>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                ${dashboardTypeBadge(d.type)}
                ${mfrBadge}
            </div>
        </div>`
    }).join('')
}

/**
 * Загружает данные инвентаря и рендерит ASCII donut-чарт на дашборде.
 * Суммирует потреблённые и оставшиеся дозы по всем препаратам.
 * @returns {Promise<void>}
 */
export async function loadDashboardDonut(): Promise<void> {
    const chartEl = document.getElementById('dashboard-donut-chart') as HTMLElement | null;
    if (!chartEl) return;

    // Show skeleton while loading
    chartEl.innerHTML = '<div class="skeleton skeleton-card" style="height: 200px;"></div>';

    try {
        const inventory = await statsApi.getInventory() as InventoryDto;

        if (!inventory || inventory.items.length === 0) {
            chartEl.innerHTML = `<div class="ascii-donut-container">
                <pre class="ascii-donut">
      ╭─────────────╮
     ╱ ░░░░░░░░░░░░░ ╲
    │ ░░░       ░░░ │
   │ ░░    <span class="donut-percent">--</span>    ░░ │
    │ ░░░       ░░░ │
     ╲ ░░░░░░░░░░░░░ ╱
      ╰─────────────╯
   <span class="donut-empty">НЕТ ДАННЫХ</span>
                </pre>
            </div>`;
            return;
        }

        // Sum up all drugs
        let totalConsumed = 0;
        let totalRemaining = 0;

        inventory.items.forEach((item: InventoryItemDto) => {
            totalConsumed += item.totalConsumed;
            totalRemaining += item.currentStock > 0 ? item.currentStock : 0;
        });

        renderDashboardDonut(totalConsumed, totalRemaining);
    } catch (error) {
        console.error('Failed to load dashboard donut:', error);
        toast.error('Ошибка загрузки данных инвентаря');
        chartEl.innerHTML = '<div class="empty-state"><p>Ошибка загрузки</p></div>';
    }
}

/**
 * Рендерит ASCII donut-чарт потребления/остатка на дашборде.
 * @param {number} consumed — общее количество принятых доз
 * @param {number} remaining — общее количество оставшихся доз
 */
function renderDashboardDonut(consumed: number, remaining: number): void {
    const chartEl = document.getElementById('dashboard-donut-chart') as HTMLElement | null;
    if (!chartEl) return;

    // Use large ASCII donut for dashboard
    const donutHtml = generateAsciiDonut(consumed, remaining, { size: 'large', showLegend: true });

    chartEl.innerHTML = `<div class="dashboard-ascii-donut ascii-donut-container-large">${donutHtml}</div>`;
}

// Экспортируем в window для использования в HTML
(window as any).loadAlerts = loadAlerts;
(window as any).renderDashboardDrugs = renderDashboardDrugs;
(window as any).loadDashboardDonut = loadDashboardDonut;
