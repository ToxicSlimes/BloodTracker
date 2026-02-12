# 03 — Миграция callers на endpoints.js

**Приоритет:** 3
**Оценка:** 4 часа
**Сложность:** Лёгкая

## Цель
Заменить все hardcoded API пути (`api('/analyses')`) на импорты из `endpoints.js`.
Один source of truth, легко менять при API versioning.

## Phase 1: Аудит [30мин]

### Шаги:
1. Собрать все hardcoded пути:
   ```bash
   grep -rn "api('/" src/BloodTracker.Api/wwwroot/js/ | grep -v endpoints.js
   grep -rn 'api(`/' src/BloodTracker.Api/wwwroot/js/ | grep -v endpoints.js
   ```
2. Сверить с `endpoints.js` — добавить недостающие
3. Составить маппинг: какой файл → какие endpoints использует

## Phase 2: Миграция по модулям [3ч]

Порядок — от core к pages:

### 2.1 `main.js` [30мин]
- Все `api('/analyses')`, `api('/drugs')`, `api('/courses/...')`, etc.
- Импорт: `import { ENDPOINTS } from './endpoints.js'`

### 2.2 `pages/course.js` + `courseTabs.js` [30мин]
- Courses CRUD, drugs CRUD, intake logs, purchases
- Статистика: `/drug-statistics/...`

### 2.3 `pages/workouts.js` [20мин]
- Programs, days, exercises, sets CRUD

### 2.4 `pages/dashboard.js` [15мин]
- Dashboard endpoint, alerts

### 2.5 `pages/analyses.js` + `compare.js` [20мин]
- Analyses CRUD, compare, import PDF

### 2.6 `pages/encyclopedia.js` [15мин]
- Drug catalog, manufacturers

### 2.7 `pages/admin.js` [15мин]
- Admin endpoints (users, stats, impersonate)

### 2.8 `components/modals.js` + `workoutModals.js` + `purchaseModals.js` [20мин]
- CRUD вызовы из модалок

### 2.9 `pages/login.js` [10мин]
- Auth endpoints (send-code, verify-code, google)

## Phase 3: Валидация [30мин]

### Шаги:
1. Grep должен вернуть 0:
   ```bash
   grep -rn "api('/" src/BloodTracker.Api/wwwroot/js/ | grep -v endpoints.js
   ```
2. Smoke test каждой страницы в браузере
3. Удалить TODO из `api.js`
4. Коммит

## Критерий готовности
- `grep -rn "api('/" wwwroot/js/ | grep -v endpoints` = 0 matches
- Все страницы работают (ручной smoke test)
