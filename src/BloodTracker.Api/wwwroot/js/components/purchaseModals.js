import { purchaseApi } from '../api.js';
import { state } from '../state.js';
import { formatDateForInput } from '../utils.js';
import { toast } from './toast.js';

// Open purchase modal (create)
export function openPurchaseModal() {
    state.editingPurchaseId = null;
    document.getElementById('purchase-modal-title').textContent = '[ ДОБАВИТЬ ПОКУПКУ ]';

    // Populate drugs select
    const drugSelect = document.getElementById('purchase-drug');
    drugSelect.innerHTML = state.drugs.map(d =>
        `<option value="${d.id}">${d.name}</option>`
    ).join('');

    // Reset form
    document.getElementById('purchase-date').value = formatDateForInput(new Date());
    document.getElementById('purchase-quantity').value = '';
    document.getElementById('purchase-price').value = '';
    document.getElementById('purchase-vendor').value = '';
    document.getElementById('purchase-notes').value = '';

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

    // Populate drugs select
    const drugSelect = document.getElementById('purchase-drug');
    drugSelect.innerHTML = state.drugs.map(d =>
        `<option value="${d.id}" ${d.id === purchase.drugId ? 'selected' : ''}>${d.name}</option>`
    ).join('');

    // Fill form
    document.getElementById('purchase-date').value = formatDateForInput(new Date(purchase.purchaseDate));
    document.getElementById('purchase-quantity').value = purchase.quantity;
    document.getElementById('purchase-price').value = purchase.price;
    document.getElementById('purchase-vendor').value = purchase.vendor || '';
    document.getElementById('purchase-notes').value = purchase.notes || '';

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
export async function savePurchase() {
    try {
        const drugId = document.getElementById('purchase-drug').value;
        const purchaseDate = document.getElementById('purchase-date').value;
        const quantity = parseInt(document.getElementById('purchase-quantity').value);
        const price = parseFloat(document.getElementById('purchase-price').value) || 0;
        const vendor = document.getElementById('purchase-vendor').value.trim();
        const notes = document.getElementById('purchase-notes').value.trim();

        if (!drugId || !purchaseDate || !quantity) {
            toast.warning('Заполните обязательные поля: препарат, дата, количество');
            return;
        }

        const data = {
            drugId,
            purchaseDate: new Date(purchaseDate).toISOString(),
            quantity,
            price,
            vendor: vendor || null,
            notes: notes || null
        };

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
