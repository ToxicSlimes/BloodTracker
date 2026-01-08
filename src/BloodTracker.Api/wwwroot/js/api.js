// ═══════════════════════════════════════════════════════════════════════════════
// API - Fetch wrapper
// ═══════════════════════════════════════════════════════════════════════════════

import { API_URL } from './config.js'

// Re-export for modules that need direct access
export { API_URL }

export async function api(path, options = {}) {
    const response = await fetch(`${API_URL}/api${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    })
    if (!response.ok) throw new Error(`API error: ${response.status}`)
    return response.status === 204 ? null : response.json()
}

export const workoutsApi = {
    programs: {
        list: () => api('/workoutprograms'),
        get: (id) => api(`/workoutprograms/${id}`),
        create: (data) => api('/workoutprograms', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(`/workoutprograms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => api(`/workoutprograms/${id}`, { method: 'DELETE' })
    },
    days: {
        listByProgram: (programId) => api(`/workoutdays?programId=${programId}`),
        get: (id) => api(`/workoutdays/${id}`),
        create: (data) => api('/workoutdays', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(`/workoutdays/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => api(`/workoutdays/${id}`, { method: 'DELETE' })
    },
    exercises: {
        listByProgram: (programId) => api(`/workoutexercises?programId=${programId}`),
        listByDay: (dayId) => api(`/workoutexercises?dayId=${dayId}`),
        get: (id) => api(`/workoutexercises/${id}`),
        create: (data) => api('/workoutexercises', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(`/workoutexercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => api(`/workoutexercises/${id}`, { method: 'DELETE' })
    },
    sets: {
        listByExercise: (exerciseId) => api(`/workoutsets?exerciseId=${exerciseId}`),
        get: (id) => api(`/workoutsets/${id}`),
        create: (data) => api('/workoutsets', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api(`/workoutsets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => api(`/workoutsets/${id}`, { method: 'DELETE' })
    }
}
