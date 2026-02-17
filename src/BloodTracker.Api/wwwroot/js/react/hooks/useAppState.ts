import { useRef, useCallback, useSyncExternalStore } from 'react'
import { subscribe } from '../../reactive.js'
import { state, type AppState } from '../../state.js'

/**
 * Bridges reactive.ts → React via useSyncExternalStore.
 * Version counter ensures in-place array mutations trigger re-renders.
 */
export function useAppState<K extends keyof AppState>(key: K): AppState[K] {
  const versionRef = useRef(0)

  const subscribeToKey = useCallback(
    (onStoreChange: () => void) =>
      subscribe(key as string, () => {
        versionRef.current++
        onStoreChange()
      }),
    [key],
  )

  const getSnapshot = useCallback(() => versionRef.current, [])

  useSyncExternalStore(subscribeToKey, getSnapshot)
  return state[key]
}
