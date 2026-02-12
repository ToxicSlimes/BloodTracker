import { purchaseApi } from '../api.js';
import { state } from '../state.js';
import { formatDateForInput, escapeHtml } from '../utils.js';
import { toast } from './toast.js';
import { ensureCatalogLoaded } from './modals.js';
import type { PurchaseDto, Manufacturer } from '../types/index.js';

// ─── Manufacturer dropdown for purchase modal ───

/**
 * Рендерит выпадающий список производителей в модалке покупки.
 * Фильтрует по имени/стране, добавляет опцию "Без производителя".
 * @param {string} query — поисковый запрос для фильтрации
 */
function renderPurchaseMfrDropdown(query: string): void {
    const dropdown = document.getElementById('purchase-mfr-dropdown')
    if (!dropdown) return

    const q = (query || '').toLowerCase()
    let mfrs = (state.manufacturers || []) as Manufacturer[]

    if (q.length > 0) {
        mfrs = mfrs.filter((m: Manufacturer) =>
            m.name.toLowerCase().includes(q) ||
            (m.country && m.country.toLowerCase().includes(q))
        )
    }

    let html = mfrs.map((m: Manufacturer) => {
        const typeClass = m.type === 0 ? 'mfr-type-pharma' : 'mfr-type-ugl'
        const typeLabel = m.type === 0 ? 'PHARMA' : 'UGL'
        return `<div class="mfr-dropdown-item" data-id="${m.id}">
            <span><span class="mfr-name">${escapeHtml(m.name)}</span> <span class="mfr-country">${escapeHtml(m.country)}</span></span>
            <span class="mfr-type-badge ${typeClass}">${typeLabel}</span>
        </div>`
    }).join('')

    html += `<div class="mfr-dropdown-item" data-id=""><span class="mfr-name" style="color:var(--text-secondary);font-style:italic">[ Без производителя ]</span></div>`

    dropdown.innerHTML = html
    dropdown.classList.add('active')

    dropdown.querySelectorAll('.mfr-dropdown-item').forEach((el: Element) => {
        el.addEventListener('click', () => {
            const id = (el as HTMLElement).dataset.id
            if (id) {
                const mfr = ((state.manufacturers || []) as Manufacturer[]).find((m: Manufacturer) => m.id === id)
                ;(document.getElementById('purchase-mfr-id') as HTMLInputElement).value = id
                ;(document.getElementById('purchase-mfr-search') as HTMLInputElement).value = mfr?.name || ''
            } else {
                ;(document.getElementById('purchase-mfr-id') as HTMLInputElement).value = ''
                ;(document.getElementById('purchase-mfr-search') as HTMLInputElement).value = ''
            }
            dropdown.classList.remove('active')
        })
    })
}

/**
 * Инициализирует автокомплит производителя в модалке покупки.
 * Привязывает input/focus/keydown/click обработчики.
 */
function initPurchaseMfrAutocomplete(): void {
    const mfrEl = document.getElementById('purchase-mfr-search') as HTMLInputElement | null
    const mfrDropdown = document.getElementById('purchase-mfr-dropdown') as HTMLElement | null
    if (!mfrEl || !mfrDropdown) return

    mfrEl.addEventListener('input', () => renderPurchaseMfrDropdown(mfrEl.value))
    mfrEl.addEventListener('focus', async () => {
        await ensureCatalogLoaded()
        renderPurchaseMfrDropdown(mfrEl.value)
    })
    mfrEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') mfrDropdown.classList.remove('active')
    })

    document.addEventListener('click', (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest('#purchase-modal .mfr-dropdown')) {
            mfrDropdown.classList.remove('active')
        }
    })
}

// Init autocomplete once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPurchaseMfrAutocomplete)
} else {
    initPurchaseMfrAutocomplete()
}

/**
 * Автозаполняет поле производителя из данных выбранного препарата.
 * Если у препарата нет производителя — очищает поле.
 * @param {string} drugId — ID выбранного препарата
 */
function autoFillManufacturerFromDrug(drugId: string): void {
    const drug = state.drugs.find((d: any) => d.id === drugId)
    if (drug && (drug as any).manufacturerId) {
        const mfr = ((state.manufacturers || []) as Manufacturer[]).find((m: Manufacturer) => m.id === (drug as any).manufacturerId)
        if (mfr) {
            ;(document.getElementById('purchase-mfr-id') as HTMLInputElement).value = mfr.id
            ;(document.getElementById('purchase-mfr-search') as HTMLInputElement).value = mfr.name
            return
        }
    }
    ;(document.getElementById('purchase-mfr-id') as HTMLInputElement).value = ''
    ;(document.getElementById('purchase-mfr-search') as HTMLInputElement).value = ''
}

/**
 * Открывает модалку создания новой покупки.
 * Сбрасывает форму, заполняет dropdown препаратов, автозаполняет производителя.
 */
export function openPurchaseModal(): void {
    state.editingPurchaseId = null;
    (document.getElementById('purchase-modal-title') as HTMLElement).textContent = '[ ДОБАВИТЬ ПОКУПКУ ]';

    ensureCatalogLoaded()

    const drugSelect = document.getElementById('purchase-drug') as HTMLSelectElement;
    drugSelect.innerHTML = state.drugs.map((d: any) =>
        `<option value="${d.id}">${escapeHtml(d.name)}</option>`
    ).join('');

    drugSelect.onchange = () => autoFillManufacturerFromDrug(drugSelect.value)

    ;(document.getElementById('purchase-date') as HTMLInputElement).value = formatDateForInput(new Date());
    ;(document.getElementById('purchase-quantity') as HTMLInputElement).value = '';
    ;(document.getElementById('purchase-price') as HTMLInputElement).value = '';
    ;(document.getElementById('purchase-vendor') as HTMLInputElement).value = '';
    ;(document.getElementById('purchase-notes') as HTMLTextAreaElement).value = '';
    ;(document.getElementById('purchase-mfr-id') as HTMLInputElement).value = '';
    ;(document.getElementById('purchase-mfr-search') as HTMLInputElement).value = '';

    if (drugSelect.value) autoFillManufacturerFromDrug(drugSelect.value)

    document.getElementById('purchase-modal')!.classList.add('active');
    document.body.classList.add('modal-open');
}

/**
 * Открывает модалку редактирования существующей покупки.
 * Заполняет форму данными покупки, восстанавливает производителя.
 * @param {string} purchaseId — ID покупки для редактирования
 */
export function openEditPurchaseModal(purchaseId: string): void {
    const purchase = (state.purchases as PurchaseDto[]).find((p: PurchaseDto) => p.id === purchaseId);
    if (!purchase) return;

    state.editingPurchaseId = purchaseId;
    (document.getElementById('purchase-modal-title') as HTMLElement).textContent = '[ РЕДАКТИРОВАТЬ ПОКУПКУ ]';

    ensureCatalogLoaded()

    const drugSelect = document.getElementById('purchase-drug') as HTMLSelectElement;
    drugSelect.innerHTML = state.drugs.map((d: any) =>
        `<option value="${d.id}" ${d.id === purchase.drugId ? 'selected' : ''}>${escapeHtml(d.name)}</option>`
    ).join('');

    drugSelect.onchange = () => autoFillManufacturerFromDrug(drugSelect.value)

    ;(document.getElementById('purchase-date') as HTMLInputElement).value = formatDateForInput(new Date(purchase.purchaseDate));
    ;(document.getElementById('purchase-quantity') as HTMLInputElement).value = String(purchase.quantity);
    ;(document.getElementById('purchase-price') as HTMLInputElement).value = String(purchase.price);
    ;(document.getElementById('purchase-vendor') as HTMLInputElement).value = purchase.vendor || '';
    ;(document.getElementById('purchase-notes') as HTMLTextAreaElement).value = purchase.notes || '';

    if (purchase.manufacturerId) {
        ;(document.getElementById('purchase-mfr-id') as HTMLInputElement).value = purchase.manufacturerId;
        const mfr = ((state.manufacturers || []) as Manufacturer[]).find((m: Manufacturer) => m.id === purchase.manufacturerId);
        ;(document.getElementById('purchase-mfr-search') as HTMLInputElement).value = mfr?.name || purchase.manufacturerName || '';
    } else {
        ;(document.getElementById('purchase-mfr-id') as HTMLInputElement).value = '';
        ;(document.getElementById('purchase-mfr-search') as HTMLInputElement).value = '';
    }

    document.getElementById('purchase-modal')!.classList.add('active');
    document.body.classList.add('modal-open');
}

/**
 * Закрывает модалку покупки и сбрасывает editingPurchaseId.
 */
export function closePurchaseModal(): void {
    document.getElementById('purchase-modal')!.classList.remove('active');
    document.body.classList.remove('modal-open');
    state.editingPurchaseId = null;
}

let _savingPurchase = false;
/**
 * Сохраняет покупку (создание или обновление).
 * Валидирует обязательные поля, отправляет POST/PUT, обновляет state (реактивный рендер).
 * @returns {Promise<void>}
 */
export async function savePurchase(): Promise<void> {
    if (_savingPurchase) return;
    try {
        const drugId = (document.getElementById('purchase-drug') as HTMLSelectElement).value;
        const purchaseDate = (document.getElementById('purchase-date') as HTMLInputElement).value;
        const quantity = parseInt((document.getElementById('purchase-quantity') as HTMLInputElement).value);
        const price = parseFloat((document.getElementById('purchase-price') as HTMLInputElement).value) || 0;
        const vendor = (document.getElementById('purchase-vendor') as HTMLInputElement).value.trim();
        const notes = (document.getElementById('purchase-notes') as HTMLTextAreaElement).value.trim();
        const manufacturerId = (document.getElementById('purchase-mfr-id') as HTMLInputElement).value || null;

        if (!drugId || !purchaseDate || !quantity || quantity <= 0) {
            toast.warning('Заполните обязательные поля: препарат, дата, количество (> 0)');
            return;
        }

        if (price < 0) {
            toast.warning('Цена не может быть отрицательной');
            return;
        }

        const data = {
            drugId,
            purchaseDate: new Date(purchaseDate).toISOString(),
            quantity,
            price,
            vendor: vendor || null,
            notes: notes || null,
            manufacturerId
        };

        _savingPurchase = true;
        if (state.editingPurchaseId) {
            await purchaseApi.update(state.editingPurchaseId as string, data);
        } else {
            await purchaseApi.create(data);
        }

        closePurchaseModal();

        // Reload purchases into state — reactive subscription handles render
        state.purchases = await purchaseApi.list() as PurchaseDto[];
    } catch (error) {
        console.error('Failed to save purchase:', error);
        toast.error('Ошибка сохранения покупки');
    } finally {
        _savingPurchase = false;
    }
}

/**
 * Удаляет покупку после подтверждения пользователем.
 * Перезагружает списки покупок и инвентаря.
 * @param {string} purchaseId — ID покупки для удаления
 * @returns {Promise<void>}
 */
export async function deletePurchase(purchaseId: string): Promise<void> {
    if (!confirm('Удалить эту покупку?')) return;

    try {
        await purchaseApi.remove(purchaseId);

        // Remove from state — reactive subscription handles render
        state.purchases = (state.purchases as PurchaseDto[]).filter((p: PurchaseDto) => p.id !== purchaseId);
    } catch (error) {
        console.error('Failed to delete purchase:', error);
        toast.error('Ошибка удаления покупки');
    }
}

// Export for global access (used by onclick in courseTabs.ts rendered HTML)
(window as any).purchaseModals = {
    openPurchaseModal,
    openEditPurchaseModal,
    closePurchaseModal,
    savePurchase,
    deletePurchase
};
