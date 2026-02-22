import { useState, useCallback } from 'react'
import { api } from '../../api.js'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Thin wrapper around api.ts for React components.
 * Returns [state, execute] — call execute(path, options?) to fire a request.
 */
export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (path: string, options?: RequestInit): Promise<T | null> => {
    setState({ data: null, loading: true, error: null })
    try {
      const data = await api<T>(path, options)
      setState({ data, loading: false, error: null })
      return data
    } catch (e: any) {
      setState({ data: null, loading: false, error: e.message })
      return null
    }
  }, [])

  return [state, execute] as const
}
