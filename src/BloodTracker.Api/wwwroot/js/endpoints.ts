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
        update: (id: string) => `/courses/${id}`,
        delete: (id: string) => `/courses/${id}`
    },

    // ─── Drugs ─────────────────────────────────────────────────────────────────
    drugs: {
        list: '/drugs',
        get: (id: string) => `/drugs/${id}`,
        create: '/drugs',
        update: (id: string) => `/drugs/${id}`,
        delete: (id: string) => `/drugs/${id}`
    },

    // ─── Intake Logs ───────────────────────────────────────────────────────────
    intakeLogs: {
        list: '/intakelogs',
        get: (id: string) => `/intakelogs/${id}`,
        create: '/intakelogs',
        update: (id: string) => `/intakelogs/${id}`,
        delete: (id: string) => `/intakelogs/${id}`,
        // Query variations
        recent: (count: number) => `/intakelogs?count=${count}`,
        byDrug: (drugId: string) => `/intakelogs?drugId=${drugId}`
    },

    // ─── Analyses ──────────────────────────────────────────────────────────────
    analyses: {
        list: '/analyses',
        get: (id: string) => `/analyses/${id}`,
        create: '/analyses',
        update: (id: string) => `/analyses/${id}`,
        delete: (id: string) => `/analyses/${id}`,
        alerts: (id: string) => `/analyses/${id}/alerts`,
        compare: (beforeId: string, afterId: string) => `/analyses/compare?beforeId=${beforeId}&afterId=${afterId}`,
        importPdf: '/analyses/import-pdf'
    },

    // ─── Purchases ─────────────────────────────────────────────────────────────
    purchases: {
        list: '/purchases',
        get: (id: string) => `/purchases/${id}`,
        create: '/purchases',
        update: (id: string) => `/purchases/${id}`,
        delete: (id: string) => `/purchases/${id}`,
        byDrug: (drugId: string) => `/purchases/by-drug/${drugId}`,
        options: (drugId: string) => `/purchases/options/${drugId}`
    },

    // ─── Drug Statistics ───────────────────────────────────────────────────────
    drugStatistics: {
        get: (drugId: string) => `/drugstatistics/${drugId}`,
        inventory: '/drugstatistics/inventory',
        timeline: (drugId: string) => `/drugstatistics/${drugId}/timeline`,
        purchaseVsConsumption: (drugId: string) => `/drugstatistics/${drugId}/purchase-vs-consumption`
    },

    // ─── Drug Catalog ──────────────────────────────────────────────────────────
    drugCatalog: {
        substances: {
            list: '/drugcatalog/substances',
            popular: '/drugcatalog/substances/popular',
            get: (id: string) => `/drugcatalog/substances/${id}`
        },
        manufacturers: {
            list: '/drugcatalog/manufacturers',
            get: (id: string) => `/drugcatalog/manufacturers/${id}`
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
        get: (id: string) => `/workoutprograms/${id}`,
        create: '/workoutprograms',
        update: (id: string) => `/workoutprograms/${id}`,
        delete: (id: string) => `/workoutprograms/${id}`
    },

    // ─── Workout Days ──────────────────────────────────────────────────────────
    workoutDays: {
        list: '/workoutdays',
        get: (id: string) => `/workoutdays/${id}`,
        create: '/workoutdays',
        update: (id: string) => `/workoutdays/${id}`,
        delete: (id: string) => `/workoutdays/${id}`,
        byProgram: (programId: string) => `/workoutdays?programId=${programId}`
    },

    // ─── Workout Exercises ─────────────────────────────────────────────────────
    workoutExercises: {
        list: '/workoutexercises',
        get: (id: string) => `/workoutexercises/${id}`,
        create: '/workoutexercises',
        update: (id: string) => `/workoutexercises/${id}`,
        delete: (id: string) => `/workoutexercises/${id}`,
        byProgram: (programId: string) => `/workoutexercises?programId=${programId}`,
        byDay: (dayId: string) => `/workoutexercises?dayId=${dayId}`
    },

    // ─── Workout Sets ──────────────────────────────────────────────────────────
    workoutSets: {
        list: '/workoutsets',
        get: (id: string) => `/workoutsets/${id}`,
        create: '/workoutsets',
        update: (id: string) => `/workoutsets/${id}`,
        delete: (id: string) => `/workoutsets/${id}`,
        byExercise: (exerciseId: string) => `/workoutsets?exerciseId=${exerciseId}`
    },

    // ─── Workout Sessions ──────────────────────────────────────────────────────
    workoutSessions: {
        weekStatus: '/workout-sessions/week-status',
        start: '/workout-sessions/start',
        active: '/workout-sessions/active',
        complete: (id: string) => `/workout-sessions/${id}/complete`,
        abandon: (id: string) => `/workout-sessions/${id}/abandon`,
        history: '/workout-sessions',
        get: (id: string) => `/workout-sessions/${id}`,
        completeSet: (sessionId: string, setId: string) => `/workout-sessions/${sessionId}/sets/${setId}/complete`,
        undoSet: (sessionId: string) => `/workout-sessions/${sessionId}/sets/undo`,
        addExercise: (sessionId: string) => `/workout-sessions/${sessionId}/exercises`,
        addSet: (sessionId: string, exerciseId: string) => `/workout-sessions/${sessionId}/exercises/${exerciseId}/sets`,
        previousExercise: (exerciseName: string) => `/workout-sessions/previous/${encodeURIComponent(exerciseName)}`,
        estimate: (sourceDayId: string) => `/workout-sessions/estimate?sourceDayId=${sourceDayId}`,
        restTimerSettings: '/workout-sessions/settings/rest-timer'
    },

    // ─── Admin ─────────────────────────────────────────────────────────────────
    admin: {
        users: {
            list: '/admin/users',
            get: (id: string) => `/admin/users/${id}`,
            delete: (id: string) => `/admin/users/${id}`,
            updateRole: (id: string) => `/admin/users/${id}/role`
        },
        impersonate: (userId: string) => `/admin/impersonate/${userId}`,
        stats: '/admin/stats'
    },

    // ─── Analytics ─────────────────────────────────────────────────────────────
    analytics: {
        exerciseProgress: (name: string, from?: string, to?: string) => {
            let url = `/analytics/exercise-progress?exerciseName=${encodeURIComponent(name)}`
            if (from) url += `&from=${from}`
            if (to) url += `&to=${to}`
            return url
        },
        personalRecords: (exercise?: string, page?: number, pageSize?: number) => {
            let url = `/analytics/personal-records?page=${page || 1}&pageSize=${pageSize || 20}`
            if (exercise) url += `&exerciseName=${encodeURIComponent(exercise)}`
            return url
        },
        stats: (from?: string, to?: string) => {
            let url = '/analytics/stats'
            const params: string[] = []
            if (from) params.push(`from=${from}`)
            if (to) params.push(`to=${to}`)
            return params.length ? `${url}?${params.join('&')}` : url
        },
        exercisePRs: '/analytics/exercise-prs',
        calendar: (from: string, to: string) => `/analytics/calendar?from=${from}&to=${to}`,
        muscleGroupProgress: (muscleGroup: string, from?: string, to?: string) => {
            let url = `/analytics/muscle-group-progress?muscleGroup=${encodeURIComponent(muscleGroup)}`
            if (from) url += `&from=${from}`
            if (to) url += `&to=${to}`
            return url
        },
        strengthLevel: (exerciseId: string, bodyweight: number, gender: string) =>
            `/analytics/strength-level?exerciseId=${encodeURIComponent(exerciseId)}&bodyweight=${bodyweight}&gender=${gender}`
    }
};
