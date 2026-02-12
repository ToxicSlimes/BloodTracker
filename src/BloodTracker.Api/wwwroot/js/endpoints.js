// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS REGISTRY - Centralized list of all API paths
// ═══════════════════════════════════════════════════════════════════════════════
//
// Single source of truth for all API paths.
// Usage:
//   import { ENDPOINTS } from './endpoints.js'
//   const data = await api(ENDPOINTS.courses.dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

/** Централизованный реестр всех API эндпоинтов */
export const ENDPOINTS = {
    // ─── Auth ──────────────────────────────────────────────────────────────────
    auth: {
        config: '/auth/config',
        google: '/auth/google',
        sendCode: '/auth/send-code',
        verifyCode: '/auth/verify-code'
    },

    // ─── Reference Ranges ──────────────────────────────────────────────────────
    referenceRanges: {
        list: '/referenceranges'
    },

    // ─── Courses ───────────────────────────────────────────────────────────────
    courses: {
        dashboard: '/courses/dashboard',
        active: '/courses/active',
        list: '/courses',
        create: '/courses',
        update: (id) => `/courses/${id}`,
        delete: (id) => `/courses/${id}`
    },

    // ─── Drugs ─────────────────────────────────────────────────────────────────
    drugs: {
        list: '/drugs',
        get: (id) => `/drugs/${id}`,
        create: '/drugs',
        update: (id) => `/drugs/${id}`,
        delete: (id) => `/drugs/${id}`
    },

    // ─── Intake Logs ───────────────────────────────────────────────────────────
    intakeLogs: {
        list: '/intakelogs',
        get: (id) => `/intakelogs/${id}`,
        create: '/intakelogs',
        update: (id) => `/intakelogs/${id}`,
        delete: (id) => `/intakelogs/${id}`,
        // Query variations
        recent: (count) => `/intakelogs?count=${count}`,
        byDrug: (drugId) => `/intakelogs?drugId=${drugId}`
    },

    // ─── Analyses ──────────────────────────────────────────────────────────────
    analyses: {
        list: '/analyses',
        get: (id) => `/analyses/${id}`,
        create: '/analyses',
        update: (id) => `/analyses/${id}`,
        delete: (id) => `/analyses/${id}`,
        alerts: (id) => `/analyses/${id}/alerts`,
        compare: (beforeId, afterId) => `/analyses/compare?beforeId=${beforeId}&afterId=${afterId}`,
        importPdf: '/analyses/import-pdf'
    },

    // ─── Purchases ─────────────────────────────────────────────────────────────
    purchases: {
        list: '/purchases',
        get: (id) => `/purchases/${id}`,
        create: '/purchases',
        update: (id) => `/purchases/${id}`,
        delete: (id) => `/purchases/${id}`,
        byDrug: (drugId) => `/purchases/by-drug/${drugId}`,
        options: (drugId) => `/purchases/options/${drugId}`
    },

    // ─── Drug Statistics ───────────────────────────────────────────────────────
    drugStatistics: {
        get: (drugId) => `/drugstatistics/${drugId}`,
        inventory: '/drugstatistics/inventory',
        timeline: (drugId) => `/drugstatistics/${drugId}/timeline`,
        purchaseVsConsumption: (drugId) => `/drugstatistics/${drugId}/purchase-vs-consumption`
    },

    // ─── Drug Catalog ──────────────────────────────────────────────────────────
    drugCatalog: {
        substances: {
            list: '/drugcatalog/substances',
            popular: '/drugcatalog/substances/popular',
            get: (id) => `/drugcatalog/substances/${id}`
        },
        manufacturers: {
            list: '/drugcatalog/manufacturers',
            get: (id) => `/drugcatalog/manufacturers/${id}`
        },
        categories: '/drugcatalog/categories'
    },

    // ─── Exercise Catalog ──────────────────────────────────────────────────────
    exerciseCatalog: {
        list: '/exercisecatalog'
    },

    // ─── Workout Programs ──────────────────────────────────────────────────────
    workoutPrograms: {
        list: '/workoutprograms',
        get: (id) => `/workoutprograms/${id}`,
        create: '/workoutprograms',
        update: (id) => `/workoutprograms/${id}`,
        delete: (id) => `/workoutprograms/${id}`
    },

    // ─── Workout Days ──────────────────────────────────────────────────────────
    workoutDays: {
        list: '/workoutdays',
        get: (id) => `/workoutdays/${id}`,
        create: '/workoutdays',
        update: (id) => `/workoutdays/${id}`,
        delete: (id) => `/workoutdays/${id}`,
        byProgram: (programId) => `/workoutdays?programId=${programId}`
    },

    // ─── Workout Exercises ─────────────────────────────────────────────────────
    workoutExercises: {
        list: '/workoutexercises',
        get: (id) => `/workoutexercises/${id}`,
        create: '/workoutexercises',
        update: (id) => `/workoutexercises/${id}`,
        delete: (id) => `/workoutexercises/${id}`,
        byProgram: (programId) => `/workoutexercises?programId=${programId}`,
        byDay: (dayId) => `/workoutexercises?dayId=${dayId}`
    },

    // ─── Workout Sets ──────────────────────────────────────────────────────────
    workoutSets: {
        list: '/workoutsets',
        get: (id) => `/workoutsets/${id}`,
        create: '/workoutsets',
        update: (id) => `/workoutsets/${id}`,
        delete: (id) => `/workoutsets/${id}`,
        byExercise: (exerciseId) => `/workoutsets?exerciseId=${exerciseId}`
    },

    // ─── Admin ─────────────────────────────────────────────────────────────────
    admin: {
        users: {
            list: '/admin/users',
            get: (id) => `/admin/users/${id}`,
            delete: (id) => `/admin/users/${id}`,
            updateRole: (id) => `/admin/users/${id}/role`
        },
        impersonate: (userId) => `/admin/impersonate/${userId}`,
        stats: '/admin/stats'
    }
};
