# 05 — TypeScript Migration

**Приоритет:** 5
**Оценка:** 15-20 часов
**Сложность:** Средняя

## Цель
Перевести 33 JS файла (~9500 строк) на TypeScript.
Типизация API ответов, компиляционные проверки, автокомплит.

## Зависимости
- Vite конфиг (уже есть)
- JSDoc комменты (#01 — желательно сделать перед)

---

## Phase 1: Инфраструктура [2ч]

### 1.1 Установка
```bash
cd src/BloodTracker.Api/wwwroot
npm install typescript --save-dev
```

### 1.2 tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "rootDir": "./js",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["js/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.3 Vite обновление
- `vite.config.js` уже поддерживает `.ts` из коробки
- Обновить `input` на `main.ts`

### 1.4 API Types
Создать `js/types/` с интерфейсами для ВСЕХ DTO:
```typescript
// types/analyses.ts
export interface AnalysisDto {
  id: string
  date: string
  label: string
  values: AnalysisValueDto[]
}

export interface AnalysisValueDto {
  key: string
  name: string
  value: number
  unit: string
  status: ValueStatus
  referenceMin?: number
  referenceMax?: number
}
```

Файлы:
- `types/analyses.ts`
- `types/courses.ts` (CourseDto, DrugDto, IntakeLogDto, PurchaseDto, DashboardDto)
- `types/workouts.ts` (WorkoutProgramDto, WorkoutDayDto, etc.)
- `types/catalog.ts` (DrugCatalogItem, Manufacturer)
- `types/admin.ts` (AdminUserDto, AdminStatsDto)
- `types/auth.ts` (AuthResponse, UserInfo)
- `types/common.ts` (PagedResult, ApiError, ValueStatus enum)

---

## Phase 2: Shared модули [3ч]

### 2.1 `api.ts`
```typescript
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  // typed fetch wrapper
}
```

### 2.2 `state.ts`
```typescript
import type { AnalysisDto, DrugDto, ... } from './types'

export interface AppState {
  user: UserInfo | null
  analyses: AnalysisDto[]
  drugs: DrugDto[]
  // ...
}

export const state: AppState = { ... }
```

### 2.3 `utils.ts` — добавить типы к существующим функциям
### 2.4 `endpoints.ts` — уже типизирован по структуре
### 2.5 `auth.ts` — typed JWT decode, login/logout
### 2.6 `config.ts`

---

## Phase 3: Страницы [6-8ч]

По одной странице, от простых к сложным:

### 3.1 `pages/login.ts` [30мин]
- Простая, мало зависимостей

### 3.2 `pages/admin.ts` [45мин]
- Уже использует event delegation (чистый код)

### 3.3 `pages/analyses.ts` [1ч]
- Таблица значений, статусы

### 3.4 `pages/compare.ts` [30мин]
- Сравнение двух анализов

### 3.5 `pages/dashboard.ts` [1ч]
- Карточки, графики, skeleton

### 3.6 `pages/encyclopedia.ts` [1ч]
- Каталог, поиск, фильтры

### 3.7 `pages/course.ts` + `courseTabs.ts` [1.5ч]
- Самые сложные — много CRUD операций

### 3.8 `pages/workouts.ts` [1ч]
- Вложенная структура (программы → дни → упражнения → сеты)

---

## Phase 4: Компоненты [3ч]

### 4.1 `components/navigation.ts` [30мин]
### 4.2 `components/modals.ts` [45мин]
### 4.3 `components/workoutModals.ts` [45мин]
### 4.4 `components/purchaseModals.ts` [30мин]
### 4.5 `components/toast.ts` [15мин]
### 4.6 `components/skeleton.ts` [15мин]
### 4.7 `components/trendChart.ts` [15мин]
### 4.8 `components/color-picker.ts` [15мин]

---

## Phase 5: Effects & финализация [2ч]

### 5.1 Effects
- `effects/matrix-runes.ts`
- `effects/progress-bar.ts`
- `effects/sparks.ts`
- `effects/ascii-art.ts`
- ASCII компоненты (asciiArtUI, asciiDonut, asciiEngine, asciifyEngine, muscleAscii)

### 5.2 Cleanup
- [ ] Удалить все `.js` файлы
- [ ] `tsc --noEmit` — 0 ошибок
- [ ] `vite build` — успешно
- [ ] Ручной smoke test всех страниц

---

## Критерий готовности
- 0 файлов `.js` в `wwwroot/js/`
- `tsc --noEmit` = 0 errors
- `vite build` = success
- Все API ответы типизированы через interfaces из `types/`
- Smoke test пройден
