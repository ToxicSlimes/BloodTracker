// ═══════════════════════════════════════════════════════════════════════════════
// Reactive State Core (Proxy-based)
// ═══════════════════════════════════════════════════════════════════════════════

/** Subscription callback invoked when a state key changes. */
export type SubscriptionCallback = () => void

/** Key of state slice, e.g. "analyses", "drugs", "currentCourse". */
export type SubscriptionKey = string

const subscriptions = new Map<SubscriptionKey, Set<SubscriptionCallback>>()
let pendingKeys = new Set<SubscriptionKey>()
let batchScheduled = false
let flushCount = 0
let flushResetTimer: ReturnType<typeof setTimeout> | null = null
const MAX_FLUSH_PER_TICK = 50

const proxyCache = new WeakMap<object, any>()

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function flush(): void {
  // Guard against infinite microtask loops: if flush runs too many times
  // in a single JS turn, stop scheduling and reset on the next macrotask.
  flushCount++
  if (flushCount > MAX_FLUSH_PER_TICK) {
    if (!flushResetTimer) {
      console.warn('[reactive] flush loop detected, deferring to next tick')
      flushResetTimer = setTimeout(() => {
        flushResetTimer = null
        flushCount = 0
        // Drain any remaining pending keys
        if (pendingKeys.size > 0) {
          batchScheduled = false
          schedule([...pendingKeys][0])
        }
      }, 0)
    }
    batchScheduled = false
    return
  }

  const keys = Array.from(pendingKeys)
  pendingKeys.clear()
  batchScheduled = false

  for (const key of keys) {
    const subs = subscriptions.get(key)
    if (!subs) continue
    for (const cb of subs) {
      try {
        cb()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[reactive] subscription error for key', key, err)
      }
    }
  }
}

function schedule(key: SubscriptionKey): void {
  pendingKeys.add(key)
  if (!batchScheduled) {
    batchScheduled = true
    queueMicrotask(flush)
  }

  // Reset flush counter on next macrotask (new JS turn)
  if (!flushResetTimer) {
    flushResetTimer = setTimeout(() => {
      flushResetTimer = null
      flushCount = 0
    }, 0)
  }
}

function wrap<T>(value: T, rootKey: SubscriptionKey): T {
  if (!isObject(value)) return value

  const cached = proxyCache.get(value)
  if (cached) return cached

  const proxy = createProxy(value, rootKey)
  proxyCache.set(value, proxy)
  proxyCache.set(proxy, proxy)
  return proxy
}

function createProxy(target: object, rootKey: SubscriptionKey): any {
  if (Array.isArray(target)) {
    const arrayTarget = target as unknown as any[]
    const handler: ProxyHandler<any[]> = {
      get(t, prop, receiver) {
        const value = Reflect.get(t, prop, receiver)

        if (typeof prop === 'string') {
          // Intercept mutating array methods to schedule a single batched update
          if (['push', 'pop', 'splice', 'shift', 'unshift', 'sort', 'reverse'].includes(prop)) {
            return (...args: any[]) => {
              const fn = value as (...args: any[]) => unknown
              const result = fn.apply(t, args)
              schedule(rootKey)
              return result
            }
          }
        }

        return wrap(value, rootKey)
      },
      set(t, prop, value, receiver) {
        const wrapped = wrap(value, rootKey)
        const result = Reflect.set(t, prop, wrapped, receiver)
        schedule(rootKey)
        return result
      },
      deleteProperty(t, prop) {
        const result = Reflect.deleteProperty(t, prop)
        schedule(rootKey)
        return result
      },
    }

    return new Proxy(arrayTarget, handler)
  }

  const handler: ProxyHandler<Record<string | symbol, unknown>> = {
    get(t, prop, receiver) {
      const value = Reflect.get(t, prop, receiver)
      return wrap(value, rootKey)
    },
    set(t, prop, value, receiver) {
      const wrapped = wrap(value, rootKey)
      const result = Reflect.set(t, prop, wrapped, receiver)
      schedule(rootKey)
      return result
    },
    deleteProperty(t, prop) {
      const result = Reflect.deleteProperty(t, prop)
      schedule(rootKey)
      return result
    },
  }

  return new Proxy(target, handler)
}

/**
 * Creates a reactive store backed by Proxy.
 * Top-level keys (e.g. `drugs`, `analyses`) are used as subscription keys.
 */
export function reactive<T extends Record<string, any>>(initial: T): T {
  const target: Record<string, unknown> = {}

  for (const key of Object.keys(initial)) {
    const value = (initial as Record<string, unknown>)[key]
    target[key] = wrap(value, key)
  }

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(t, prop, receiver) {
      const value = Reflect.get(t, prop, receiver)
      if (typeof prop === 'string') {
        return wrap(value, prop)
      }

      return value
    },
    set(t, prop, value, receiver) {
      if (typeof prop === 'symbol') {
        return Reflect.set(t, prop, value, receiver)
      }

      const key = String(prop)
      const wrapped = wrap(value, key)
      const result = Reflect.set(t, prop, wrapped, receiver)
      schedule(key)
      return result
    },
    deleteProperty(t, prop) {
      if (typeof prop === 'symbol') {
        return Reflect.deleteProperty(t, prop)
      }

      const key = String(prop)
      const result = Reflect.deleteProperty(t, prop)
      schedule(key)
      return result
    },
  }

  return new Proxy(target, handler) as T
}

/**
 * Creates a computed value that recalculates when any of its dependencies change.
 * Returns an object with a `.value` getter.
 *
 * @example
 * const totalAnalyses = computed(['analyses'], () => state.analyses.length)
 * // totalAnalyses.value updates automatically when state.analyses changes
 */
export function computed<T>(deps: SubscriptionKey[], fn: () => T): { readonly value: T } {
  let cached: T = fn()

  const recalc = () => { cached = fn() }
  for (const dep of deps) {
    subscribe(dep, recalc)
  }

  return {
    get value(): T {
      return cached
    },
  }
}

/**
 * Subscribes to changes of a specific state key (e.g. "drugs", "analyses").
 * Returns an unsubscribe function.
 */
export function subscribe(key: SubscriptionKey, callback: SubscriptionCallback): () => void {
  let set = subscriptions.get(key)
  if (!set) {
    set = new Set<SubscriptionCallback>()
    subscriptions.set(key, set)
  }

  set.add(callback)

  return () => {
    const current = subscriptions.get(key)
    if (!current) return
    current.delete(callback)
    if (current.size === 0) {
      subscriptions.delete(key)
    }
  }
}
