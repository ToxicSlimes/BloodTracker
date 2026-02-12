# 06 — Reactive State (Proxy-based)

**Приоритет:** 6
**Оценка:** 11-13 часов
**Сложность:** Средняя

## Цель
Заменить ручные `renderXxx()` вызовы на автоматические подписки.
`state.drugs.push(drug)` → UI обновляется сам.

## Зависимости
- TypeScript (#05 — желательно, но не обязательно)

---

## Phase 1: Reactive Core [3ч]

### 1.1 Создать `reactive.ts` (или `.js`)

Ядро — Proxy с подписками:

```typescript
interface Subscription {
  key: string
  callback: () => void
}

/**
 * Создаёт реактивный store на базе Proxy.
 * При мутации свойства — вызывает все подписки на это свойство.
 * Batching: собирает мутации за microtask, рендерит один раз.
 */
export function reactive<T extends object>(initial: T): T {
  const subscriptions = new Map<string, Set<() => void>>()
  let pendingKeys = new Set<string>()
  let batchScheduled = false

  function flush() {
    const keys = [...pendingKeys]
    pendingKeys.clear()
    batchScheduled = false
    for (const key of keys) {
      subscriptions.get(key)?.forEach(cb => cb())
    }
  }

  function schedule(key: string) {
    pendingKeys.add(key)
    if (!batchScheduled) {
      batchScheduled = true
      queueMicrotask(flush)
    }
  }

  // Proxy handler for arrays (push, splice, etc.)
  // Proxy handler for nested objects
  // ...
}

export function subscribe(key: string, callback: () => void): () => void {
  // Returns unsubscribe function
}
```

### 1.2 Deep Proxy
- Вложенные объекты и массивы тоже проксируются
- `state.workoutDays[programId]` — при мутации триггерит `workoutDays`
- Массивы: `push`, `splice`, `pop`, `shift` — все триггерят подписку

### 1.3 Batching
- Несколько мутаций за один tick → один render
- `state.drugs.push(a); state.drugs.push(b);` → один вызов подписки

### 1.4 Unit тесты
- Subscribe/unsubscribe
- Batching (2 мутации = 1 callback)
- Deep proxy (nested object mutation triggers parent)
- Array methods (push, splice)

---

## Phase 2: Миграция state.js [2ч]

### 2.1 Заменить state
```typescript
// Было:
export const state = { analyses: [], drugs: [], ... }

// Стало:
export const state = reactive({ analyses: [], drugs: [], ... })
```

### 2.2 Зарегистрировать подписки
```typescript
// В main.ts при инициализации:
subscribe('analyses', () => renderAnalysesTable())
subscribe('drugs', () => renderDrugCards())
subscribe('currentCourse', () => renderCourseInfo())
subscribe('intakeLogs', () => renderIntakeLogs())
// ...
```

### 2.3 Инвентаризация render-функций
Найти все `renderXxx` и `updateXxx` в коде:
```bash
grep -rn "function render\|function update" wwwroot/js/
```
Каждый — потенциальная подписка.

---

## Phase 3: Миграция страниц [4ч]

### 3.1 `dashboard.js` [1ч]
- Подписки: `analyses`, `drugs`, `intakeLogs`, `currentCourse`
- Убрать: ручные вызовы `renderDashboard()` после fetch

### 3.2 `course.js` + `courseTabs.js` [1ч]
- Подписки: `currentCourse`, `drugs`, `intakeLogs`, `purchases`
- Самый сложный — много CRUD с последующим render

### 3.3 `workouts.js` [1ч]
- Подписки: `workoutPrograms`, `workoutDays`, `workoutExercises`, `workoutSets`
- Вложенные маппы (`workoutDays[programId]`)

### 3.4 Остальные [1ч]
- `analyses.js` — подписка на `analyses`
- `encyclopedia.js` — подписка на `drugCatalog`
- `admin.js` — скорее всего не нужно (своё состояние)

---

## Phase 4: Computed Values [2ч]

### 4.1 Создать `computed()`
```typescript
/**
 * Вычисляемое значение, пересчитывается при изменении зависимостей.
 */
export function computed<T>(deps: string[], fn: () => T): { value: T }
```

### 4.2 Dashboard computed
- `totalAnalyses` = computed от `analyses.length`
- `activeDrugsCount` = computed от `drugs.filter(active)`
- `todayIntakes` = computed от `intakeLogs.filter(today)`

### 4.3 Statistics computed
- Drug statistics (inventory, consumption timeline)

---

## Риски
- Deep proxy может быть медленным на больших массивах → benchmark
- LiteDB данные мутабельны — proxy должен ловить прямые мутации
- Circular dependency: render → fetch → state mutation → render → ...
  → Решение: `batch()` + guard `isRendering`

## Критерий готовности
- `grep -rn "renderXxx()" wwwroot/js/` = 0 ручных вызовов после мутаций
- UI обновляется автоматически при `state.xxx = ...`
- Batching работает (проверить в DevTools Performance)
- Все страницы работают корректно
