import { purchaseApi } from '../api.js';
import { state } from '../state.js';
import { formatDateForInput, escapeHtml } from '../utils.js';
import { toast } from './toast.js';
import { ensureCatalogLoaded } from './modals.js';

// ─── Manufacturer dropdown for purchase modal ───

function renderPurchaseMfrDropdown(query) {
    const dropdown = document.getElementById('purchase-mfr-dropdown')
    if (!dropdown) return

    const q = (query || '').toLowerCase()
    let mfrs = state.manufacturers || []

    if (q.length > 0) {
        mfrs = mfrs.filter(m =>
            m.name.toLowerCase().includes(q) ||
            (m.country && m.country.toLowerCase().includes(q))
        )
    }

    let html = mfrs.map(m => {
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

    dropdown.querySelectorAll('.mfr-dropdown-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.id
            if (id) {
                const mfr = (state.manufacturers || []).find(m => m.id === id)
                document.getElementById('purchase-mfr-id').value = id
                document.getElementById('purchase-mfr-search').value = mfr?.name || ''
            } else {
                document.getElementById('purchase-mfr-id').value = ''
                document.getElementById('purchase-mfr-search').value = ''
            }
            dropdown.classList.remove('active')
        })
    })
}

function initPurchaseMfrAutocomplete() {
    const mfrEl = document.getElementById('purchase-mfr-search')
    const mfrDropdown = document.getElementById('purchase-mfr-dropdown')
    if (!mfrEl || !mfrDropdown) return

    mfrEl.addEventListener('input', () => renderPurchaseMfrDropdown(mfrEl.value))
    mfrEl.addEventListener('focus', async () => {
        await ensureCatalogLoaded()
        renderPurchaseMfrDropdown(mfrEl.value)
    })
    mfrEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') mfrDropdown.classList.remove('active')
    })

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#purchase-modal .mfr-dropdown')) {
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

// Auto-fill manufacturer from selected drug
function autoFillManufacturerFromDrug(drugId) {
    const drug = state.drugs.find(d => d.id === drugId)
    if (drug && drug.manufacturerId) {
        const mfr = (state.manufacturers || []).find(m => m.id === drug.manufacturerId)
        if (mfr) {
            document.getElementById('purchase-mfr-id').value = mfr.id
            document.getElementById('purchase-mfr-search').value = mfr.name
            return
        }
    }
    // Clear if drug has no manufacturer
    document.getElementById('purchase-mfr-id').value = ''
    document.getElementById('purchase-mfr-search').value = ''
}

// Open purchase modal (create)
export function openPurchaseModal() {
    state.editingPurchaseId = null;
    document.getElementById('purchase-modal-title').textContent = '[ ДОБАВИТЬ ПОКУПКУ ]';

    ensureCatalogLoaded()

    // Populate drugs select
    const drugSelect = document.getElementById('purchase-drug');
    drugSelect.innerHTML = state.drugs.map(d =>
        `<option value="${d.id}">${escapeHtml(d.name)}</option>`
    ).join('');

    // Wire up drug change → auto-fill manufacturer
    drugSelect.onchange = () => autoFillManufacturerFromDrug(drugSelect.value)

    // Reset form
    document.getElementById('purchase-date').value = formatDateForInput(new Date());
    document.getElementById('purchase-quantity').value = '';
    document.getElementById('purchase-price').value = '';
    document.getElementById('purchase-vendor').value = '';
    document.getElementById('purchase-notes').value = '';
    document.getElementById('purchase-mfr-id').value = '';
    document.getElementById('purchase-mfr-search').value = '';

    // Auto-fill from first drug
    if (drugSelect.value) autoFillManufacturerFromDrug(drugSelect.value)

    // Show modal
    document.getElementById('purchase-modal').classList.add('active');
    document.body.classList.add('modal-open');
}

// Open purchase modal (edit)
export function openEditPurchaseModal(purchaseId) {
    const purchase = state.purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    state.editingPurchaseId = purchaseId;
    document.getElementById('purchase-modal-title').textContent = '[ РЕДАКТИРОВАТЬ ПОКУПКУ ]';

    ensureCatalogLoaded()

    // Populate drugs select
    const drugSelect = document.getElementById('purchase-drug');
    drugSelect.innerHTML = state.drugs.map(d =>
        `<option value="${d.id}" ${d.id === purchase.drugId ? 'selected' : ''}>${escapeHtml(d.name)}</option>`
    ).join('');

    // Wire up drug change → auto-fill manufacturer
    drugSelect.onchange = () => autoFillManufacturerFromDrug(drugSelect.value)

    // Fill form
    document.getElementById('purchase-date').value = formatDateForInput(new Date(purchase.purchaseDate));
    document.getElementById('purchase-quantity').value = purchase.quantity;
    document.getElementById('purchase-price').value = purchase.price;
    document.getElementById('purchase-vendor').value = purchase.vendor || '';
    document.getElementById('purchase-notes').value = purchase.notes || '';

    // Restore manufacturer
    if (purchase.manufacturerId) {
        document.getElementById('purchase-mfr-id').value = purchase.manufacturerId;
        const mfr = (state.manufacturers || []).find(m => m.id === purchase.manufacturerId);
        document.getElementById('purchase-mfr-search').value = mfr?.name || purchase.manufacturerName || '';
    } else {
        document.getElementById('purchase-mfr-id').value = '';
        document.getElementById('purchase-mfr-search').value = '';
    }

    // Show modal
    document.getElementById('purchase-modal').classList.add('active');
    document.body.classList.add('modal-open');
}

// Close purchase modal
export function closePurchaseModal() {
    document.getElementById('purchase-modal').classList.remove('active');
    document.body.classList.remove('modal-open');
    state.editingPurchaseId = null;
}

// Save purchase (create or update)
let _savingPurchase = false;
export async function savePurchase() {
    if (_savingPurchase) return;
    try {
        const drugId = document.getElementById('purchase-drug').value;
        const purchaseDate = document.getElementById('purchase-date').value;
        const quantity = parseInt(document.getElementById('purchase-quantity').value);
        const price = parseFloat(document.getElementById('purchase-price').value) || 0;
        const vendor = document.getElementById('purchase-vendor').value.trim();
        const notes = document.getElementById('purchase-notes').value.trim();
        const manufacturerId = document.getElementById('purchase-mfr-id').value || null;

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
            await purchaseApi.update(state.editingPurchaseId, data);
        } else {
            await purchaseApi.create(data);
        }

        closePurchaseModal();

        // Reload purchases
        if (window.courseTabs) {
            window.courseTabs.loadPurchases();
            window.courseTabs.loadInventory();
        }
    } catch (error) {
        console.error('Failed to save purchase:', error);
        toast.error('Ошибка сохранения покупки');
    } finally {
        _savingPurchase = false;
    }
}

// Delete purchase
export async function deletePurchase(purchaseId) {
    if (!confirm('Удалить эту покупку?')) return;

    try {
        await purchaseApi.remove(purchaseId);

        // Reload purchases
        if (window.courseTabs) {
            window.courseTabs.loadPurchases();
            window.courseTabs.loadInventory();
        }
    } catch (error) {
        console.error('Failed to delete purchase:', error);
        toast.error('Ошибка удаления покупки');
    }
}

// Export for global access
window.purchaseModals = {
    openPurchaseModal,
    openEditPurchaseModal,
    closePurchaseModal,
    savePurchase,
    deletePurchase
};
