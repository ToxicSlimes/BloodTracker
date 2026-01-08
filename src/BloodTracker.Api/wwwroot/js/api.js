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