// ═══════════════════════════════════════════════════════════════════════════════
// API - Fetch wrapper
// ═══════════════════════════════════════════════════════════════════════════════

import { API_URL } from './config.js'
import { ENDPOINTS } from './endpoints.js'

// Re-export for modules that need direct access
export { API_URL }

/**
 * Обрабатывает 401 ответ: очищает токен и показывает страницу логина.
 * @param {boolean} hadToken — был ли токен в запросе
 */
function handle401(hadToken) {
    localStorage.removeItem('bt_token');
    localStorage.removeItem('bt_user');
    // Show login page instead of reloading (prevents infinite 401 → reload loops)
    if (!document.getElementById('login-overlay')) {
        window.dispatchEvent(new Event('bt:unauthorized'));
    }
}

/**
 * Универсальная fetch-обёртка: добавляет JWT, обрабатывает 401, парсит JSON.
 * @param {string} path — путь API (без /api префикса)
 * @param {RequestInit} [options={}] — опции fetch
 * @returns {Promise<any>} — JSON ответ или null для 204
 */
export async function api(path, options = {}) {
    const token = localStorage.getItem('bt_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api${path}`, {
        ...options,
        headers
    })

    if (response.status === 401) {
        handle401(!!token);
        throw new Error('Unauthorized');
    }

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    return response.status === 204 ? null : response.json()
}

/**
 * Загрузка файлов (multipart/form-data) — без Content-Type заголовка.
 * Используется для PDF-загрузки анализов.
 * @param {string} path — путь API
 * @param {FormData} formData — данные формы с файлом
 * @returns {Promise<any>} — JSON ответ или null для 204
 */
export async function apiUpload(path, formData) {
    const token = localStorage.getItem('bt_token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api${path}`, {
        method: 'POST',
        headers,
        body: formData
    });

    if (response.status === 401) {
        handle401(!!token);
        throw new Error('Unauthorized');
    }

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.status === 204 ? null : response.json();
}

/** API для работы с логами приёмов: фильтрация по препарату, датам, лимиту */
export const intakeLogsApi = {
    list: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.drugId) params.append('drugId', filters.drugId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.limit) params.append('limit', filters.limit);
        const query = params.toString();
        return api(`${ENDPOINTS.intakeLogs.list}${query ? '?' + query : ''}`);
    }
};

/** API для работы с закупками: CRUD + фильтрация по препарату */
export const purchaseApi = {
    list: () => api(ENDPOINTS.purchases.list),
    getByDrug: (drugId) => api(ENDPOINTS.purchases.byDrug(drugId)),
    options: (drugId) => api(ENDPOINTS.purchases.options(drugId)),
    create: (data) => api(ENDPOINTS.purchases.create, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(ENDPOINTS.purchases.update(id), { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => api(ENDPOINTS.purchases.delete(id), { method: 'DELETE' })
};

/** API для статистики препаратов: инвентарь, таймлайн потребления, закупки vs расход */
export const statsApi = {
    getDrugStatistics: (drugId) => api(ENDPOINTS.drugStatistics.get(drugId)),
    getInventory: () => api(ENDPOINTS.drugStatistics.inventory),
    getConsumptionTimeline: (drugId, startDate, endDate) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString();
        return api(`${ENDPOINTS.drugStatistics.timeline(drugId)}${query ? '?' + query : ''}`);
    },
    getPurchaseVsConsumption: (drugId) => api(ENDPOINTS.drugStatistics.purchaseVsConsumption(drugId))
};

/** API каталога препаратов: субстанции, производители, категории */
export const catalogApi = {
    substances: (params = {}) => {
        const qs = new URLSearchParams();
        if (params.category !== undefined) qs.append('category', params.category);
        if (params.subcategory !== undefined) qs.append('subcategory', params.subcategory);
        if (params.drugType !== undefined) qs.append('drugType', params.drugType);
        if (params.search) qs.append('search', params.search);
        const q = qs.toString();
        return api(`${ENDPOINTS.drugCatalog.substances.list}${q ? '?' + q : ''}`);
    },
    popular: () => api(ENDPOINTS.drugCatalog.substances.popular),
    substance: (id) => api(ENDPOINTS.drugCatalog.substances.get(id)),
    manufacturers: (params = {}) => {
        const qs = new URLSearchParams();
        if (params.type !== undefined) qs.append('type', params.type);
        if (params.search) qs.append('search', params.search);
        const q = qs.toString();
        return api(`${ENDPOINTS.drugCatalog.manufacturers.list}${q ? '?' + q : ''}`);
    },
    manufacturer: (id) => api(ENDPOINTS.drugCatalog.manufacturers.get(id)),
    categories: () => api(ENDPOINTS.drugCatalog.categories)
};

/** API тренировок: программы, дни, упражнения, подходы (вложенный CRUD) */
export const workoutsApi = {
    programs: {
        list: () => api(ENDPOINTS.workoutPrograms.list),
        get: (id) => api(ENDPOINTS.workoutPrograms.get(id)),
        create: (data) => api(ENDPOINTS.workoutPrograms.create, { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(ENDPOINTS.workoutPrograms.update(id), { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => api(ENDPOINTS.workoutPrograms.delete(id), { method: 'DELETE' })
    },
    days: {
        listByProgram: (programId) => api(ENDPOINTS.workoutDays.byProgram(programId)),
        get: (id) => api(ENDPOINTS.workoutDays.get(id)),
        create: (data) => api(ENDPOINTS.workoutDays.create, { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(ENDPOINTS.workoutDays.update(id), { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => api(ENDPOINTS.workoutDays.delete(id), { method: 'DELETE' })
    },
    exercises: {
        listByProgram: (programId) => api(ENDPOINTS.workoutExercises.byProgram(programId)),
        listByDay: (dayId) => api(ENDPOINTS.workoutExercises.byDay(dayId)),
        get: (id) => api(ENDPOINTS.workoutExercises.get(id)),
        create: (data) => api(ENDPOINTS.workoutExercises.create, { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(ENDPOINTS.workoutExercises.update(id), { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => api(ENDPOINTS.workoutExercises.delete(id), { method: 'DELETE' })
    },
    sets: {
        listByExercise: (exerciseId) => api(ENDPOINTS.workoutSets.byExercise(exerciseId)),
        get: (id) => api(ENDPOINTS.workoutSets.get(id)),
        create: (data) => api(ENDPOINTS.workoutSets.create, { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(ENDPOINTS.workoutSets.update(id), { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => api(ENDPOINTS.workoutSets.delete(id), { method: 'DELETE' })
    }
}
