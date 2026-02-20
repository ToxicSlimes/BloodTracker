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
function handle401(hadToken: boolean): void {
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
// In-flight GET deduplication: same path → same Promise
const inflight = new Map<string, Promise<unknown>>()

// TTL response cache for GET requests — avoids re-fetching on tab switches
const responseCache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 30_000 // 30 seconds

export function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const method = options.method || 'GET'

    // Mutations invalidate the entire cache
    if (method !== 'GET') {
        responseCache.clear()
        return apiExecute<T>(path, options)
    }

    // Serve from cache if fresh
    const cached = responseCache.get(path)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return Promise.resolve(cached.data as T)
    }

    // Deduplicate concurrent GET requests to the same path
    const existing = inflight.get(path)
    if (existing) return existing as Promise<T>

    const promise = apiExecute<T>(path, options).then(data => {
        responseCache.set(path, { data, ts: Date.now() })
        return data
    })
    inflight.set(path, promise)
    promise.finally(() => inflight.delete(path))
    return promise
}

async function apiExecute<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('bt_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/v1${path}`, {
        ...options,
        headers
    })

    if (response.status === 401) {
        handle401(!!token);
        throw new Error('Unauthorized');
    }

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    return response.status === 204 ? (null as T) : await response.json()
}

/**
 * Загрузка файлов (multipart/form-data) — без Content-Type заголовка.
 * Используется для PDF-загрузки анализов.
 * @param {string} path — путь API
 * @param {FormData} formData — данные формы с файлом
 * @returns {Promise<any>} — JSON ответ или null для 204
 */
export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
    const token = localStorage.getItem('bt_token');
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/v1${path}`, {
        method: 'POST',
        headers,
        body: formData
    });

    if (response.status === 401) {
        handle401(!!token);
        throw new Error('Unauthorized');
    }

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.status === 204 ? (null as T) : response.json();
}

interface IntakeLogFilters {
    drugId?: string
    startDate?: string
    endDate?: string
    limit?: string
}

/** API для работы с логами приёмов: фильтрация по препарату, датам, лимиту */
export const intakeLogsApi = {
    list: (filters: IntakeLogFilters = {}): Promise<unknown> => {
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
    list: (): Promise<unknown> => api(ENDPOINTS.purchases.list),
    getByDrug: (drugId: string): Promise<unknown> => api(ENDPOINTS.purchases.byDrug(drugId)),
    options: (drugId: string): Promise<unknown> => api(ENDPOINTS.purchases.options(drugId)),
    create: (data: unknown): Promise<unknown> => api(ENDPOINTS.purchases.create, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown): Promise<unknown> => api(ENDPOINTS.purchases.update(id), { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string): Promise<unknown> => api(ENDPOINTS.purchases.delete(id), { method: 'DELETE' })
};

/** API для статистики препаратов: инвентарь, таймлайн потребления, закупки vs расход */
export const statsApi = {
    getDrugStatistics: (drugId: string): Promise<unknown> => api(ENDPOINTS.drugStatistics.get(drugId)),
    getInventory: (): Promise<unknown> => api(ENDPOINTS.drugStatistics.inventory),
    getConsumptionTimeline: (drugId: string, startDate?: string, endDate?: string): Promise<unknown> => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString();
        return api(`${ENDPOINTS.drugStatistics.timeline(drugId)}${query ? '?' + query : ''}`);
    },
    getPurchaseVsConsumption: (drugId: string): Promise<unknown> => api(ENDPOINTS.drugStatistics.purchaseVsConsumption(drugId))
};

interface CatalogSubstanceParams {
    category?: string
    subcategory?: string
    drugType?: string
    search?: string
}

interface CatalogManufacturerParams {
    type?: string
    search?: string
}

/** API каталога препаратов: субстанции, производители, категории */
export const catalogApi = {
    substances: (params: CatalogSubstanceParams = {}): Promise<unknown> => {
        const qs = new URLSearchParams();
        if (params.category !== undefined) qs.append('category', params.category);
        if (params.subcategory !== undefined) qs.append('subcategory', params.subcategory);
        if (params.drugType !== undefined) qs.append('drugType', params.drugType);
        if (params.search) qs.append('search', params.search);
        const q = qs.toString();
        return api(`${ENDPOINTS.drugCatalog.substances.list}${q ? '?' + q : ''}`);
    },
    popular: (): Promise<unknown> => api(ENDPOINTS.drugCatalog.substances.popular),
    substance: (id: string): Promise<unknown> => api(ENDPOINTS.drugCatalog.substances.get(id)),
    manufacturers: (params: CatalogManufacturerParams = {}): Promise<unknown> => {
        const qs = new URLSearchParams();
        if (params.type !== undefined) qs.append('type', params.type);
        if (params.search) qs.append('search', params.search);
        const q = qs.toString();
        return api(`${ENDPOINTS.drugCatalog.manufacturers.list}${q ? '?' + q : ''}`);
    },
    manufacturer: (id: string): Promise<unknown> => api(ENDPOINTS.drugCatalog.manufacturers.get(id)),
    categories: (): Promise<unknown> => api(ENDPOINTS.drugCatalog.categories)
};

/** API тренировок: программы, дни, упражнения, подходы (вложенный CRUD) */
export const workoutsApi = {
    programs: {
        list: (): Promise<unknown> => api(ENDPOINTS.workoutPrograms.list),
        get: (id: string): Promise<unknown> => api(ENDPOINTS.workoutPrograms.get(id)),
        create: (data: unknown): Promise<unknown> => api(ENDPOINTS.workoutPrograms.create, { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: unknown): Promise<unknown> => api(ENDPOINTS.workoutPrograms.update(id), { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id: string): Promise<unknown> => api(ENDPOINTS.workoutPrograms.delete(id), { method: 'DELETE' })
    },
    days: {
        listByProgram: (programId: string): Promise<unknown> => api(ENDPOINTS.workoutDays.byProgram(programId)),
        get: (id: string): Promise<unknown> => api(ENDPOINTS.workoutDays.get(id)),
        create: (data: unknown): Promise<unknown> => api(ENDPOINTS.workoutDays.create, { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: unknown): Promise<unknown> => api(ENDPOINTS.workoutDays.update(id), { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id: string): Promise<unknown> => api(ENDPOINTS.workoutDays.delete(id), { method: 'DELETE' })
    },
    exercises: {
        listByProgram: (programId: string): Promise<unknown> => api(ENDPOINTS.workoutExercises.byProgram(programId)),
        listByDay: (dayId: string): Promise<unknown> => api(ENDPOINTS.workoutExercises.byDay(dayId)),
        get: (id: string): Promise<unknown> => api(ENDPOINTS.workoutExercises.get(id)),
        create: (data: unknown): Promise<unknown> => api(ENDPOINTS.workoutExercises.create, { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: unknown): Promise<unknown> => api(ENDPOINTS.workoutExercises.update(id), { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id: string): Promise<unknown> => api(ENDPOINTS.workoutExercises.delete(id), { method: 'DELETE' })
    },
    sets: {
        listByExercise: (exerciseId: string): Promise<unknown> => api(ENDPOINTS.workoutSets.byExercise(exerciseId)),
        get: (id: string): Promise<unknown> => api(ENDPOINTS.workoutSets.get(id)),
        create: (data: unknown): Promise<unknown> => api(ENDPOINTS.workoutSets.create, { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: unknown): Promise<unknown> => api(ENDPOINTS.workoutSets.update(id), { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id: string): Promise<unknown> => api(ENDPOINTS.workoutSets.delete(id), { method: 'DELETE' })
    }
}

interface StartWorkoutRequest {
    sourceDayId?: string
    customTitle?: string
    notes?: string
    repeatLast?: boolean
}

interface CompleteSetRequest {
    weight?: number
    weightKg?: number
    repetitions?: number
    durationSeconds?: number
    rpe?: number
    type?: string
    notes?: string
}

interface AddExerciseRequest {
    name: string
    muscleGroup: string
    notes?: string
}

interface AddSetRequest {
    weight?: number
    repetitions?: number
    durationSeconds?: number
}

interface CompleteSessionRequest {
    notes?: string
}

interface HistoryFilters {
    fromDate?: string
    toDate?: string
    page?: number
    pageSize?: number
}

interface RestTimerSettingsRequest {
    defaultRestSeconds: number
    autoStartTimer: boolean
    playSound: boolean
    vibrate: boolean
    soundAlertBeforeEndSeconds: number
}

export const workoutSessionsApi = {
    getWeekStatus: (): Promise<unknown> =>
        api(ENDPOINTS.workoutSessions.weekStatus),

    start: (data: StartWorkoutRequest): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.start, { method: 'POST', body: JSON.stringify(data) }),
    
    getActive: (): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.active),
    
    complete: (sessionId: string, data?: CompleteSessionRequest): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.complete(sessionId), { method: 'POST', body: JSON.stringify(data || {}) }),
    
    abandon: (sessionId: string): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.abandon(sessionId), { method: 'POST' }),
    
    getHistory: (filters: HistoryFilters = {}): Promise<unknown> => {
        const params = new URLSearchParams()
        if (filters.fromDate) params.append('fromDate', filters.fromDate)
        if (filters.toDate) params.append('toDate', filters.toDate)
        if (filters.page) params.append('page', String(filters.page))
        if (filters.pageSize) params.append('pageSize', String(filters.pageSize))
        const query = params.toString()
        return api(`${ENDPOINTS.workoutSessions.history}${query ? '?' + query : ''}`)
    },
    
    getById: (sessionId: string): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.get(sessionId)),
    
    completeSet: (sessionId: string, setId: string, data: CompleteSetRequest): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.completeSet(sessionId, setId), { method: 'POST', body: JSON.stringify(data) }),
    
    undoSet: (sessionId: string): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.undoSet(sessionId), { method: 'POST' }),
    
    addExercise: (sessionId: string, data: AddExerciseRequest): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.addExercise(sessionId), { method: 'POST', body: JSON.stringify(data) }),
    
    addSet: (sessionId: string, exerciseId: string, data: AddSetRequest): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.addSet(sessionId, exerciseId), { method: 'POST', body: JSON.stringify(data) }),
    
    getPreviousExercise: (exerciseName: string): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.previousExercise(exerciseName)),
    
    getEstimate: (sourceDayId: string): Promise<unknown> => 
        api(ENDPOINTS.workoutSessions.estimate(sourceDayId)),

    getRestTimerSettings: (): Promise<unknown> =>
        api(ENDPOINTS.workoutSessions.restTimerSettings),

    updateRestTimerSettings: (data: RestTimerSettingsRequest): Promise<unknown> =>
        api(ENDPOINTS.workoutSessions.restTimerSettings, { method: 'PUT', body: JSON.stringify(data) })
}
