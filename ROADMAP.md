# BloodTracker — Roadmap (Feature Development)

> Оставшиеся 6 пунктов из IMPROVEMENT_PLAN — это уже не техдолг, а feature development.
> Каждый пункт — самостоятельный проект с планом, этапами и критериями готовности.

---

## 1. TypeScript миграция

**Что:** Перевести 33 JS файла (~9500 строк) на TypeScript с полной типизацией API ответов.

**Зачем:**
- Автокомплит и навигация по коду
- Ловить баги на этапе компиляции
- Типизированные API ответы вместо `any`

**План:**

### Phase 1: Инфраструктура [~2ч]
- [ ] Установить TypeScript + `tsconfig.json`
- [ ] Настроить Vite для `.ts` файлов (уже есть `vite.config.js`)
- [ ] Создать `src/BloodTracker.Api/wwwroot/js/types/` с интерфейсами для всех API DTO
- [ ] Настроить strict mode (`"strict": true`)

### Phase 2: Shared модули [~3ч]
- [ ] `api.ts` — типизированный `api<T>(url, options)` с generic return type
- [ ] `state.ts` — типизированный state object
- [ ] `utils.ts` — типы для всех utility функций
- [ ] `endpoints.ts` — уже создан, добавить типы

### Phase 3: Страницы (по одной) [~1-2ч каждая]
- [ ] `pages/dashboard.ts`
- [ ] `pages/course.ts` + `pages/courseTabs.ts`
- [ ] `pages/workouts.ts`
- [ ] `pages/encyclopedia.ts`
- [ ] `pages/admin.ts`
- [ ] `pages/login.ts`

### Phase 4: Компоненты [~3ч]
- [ ] `components/modals.ts`
- [ ] `components/workoutModals.ts`
- [ ] `components/navigation.ts`
- [ ] `components/skeleton.ts`
- [ ] `effects/*.ts` (декоративные)

### Phase 5: Финализация [~2ч]
- [ ] Удалить все `.js` файлы, оставить только `.ts`
- [ ] `tsc --noEmit` — 0 ошибок
- [ ] Vite build проходит
- [ ] Ручной smoke test на dev

**Критерий готовности:** `tsc --noEmit && vite build` — 0 ошибок, все API ответы типизированы.

**Оценка:** ~15-20 часов

---

## 2. Offline Mode / Service Worker

**Что:** PWA с Service Worker для кэширования статики и API ответов, работа без интернета.

**Зачем:**
- Доступ к данным без сети (анализы, курсы — read-only)
- Мгновенная загрузка при повторных визитах
- Installable PWA на мобильных

**План:**

### Phase 1: PWA Manifest + SW регистрация [~2ч]
- [ ] Создать `manifest.json` (name, icons, theme_color, display: standalone)
- [ ] Создать `sw.js` с базовым lifecycle (install, activate, fetch)
- [ ] Регистрация SW в `index.html`
- [ ] Иконки 192x192, 512x512 (ASCII skull theme)

### Phase 2: Cache-first для статики [~2ч]
- [ ] Pre-cache: HTML, CSS, JS при install
- [ ] Runtime cache: шрифты, изображения
- [ ] Версионирование кэша (имя кэша = hash от SW версии)
- [ ] Cleanup старых кэшей при activate

### Phase 3: API кэширование (stale-while-revalidate) [~4ч]
- [ ] GET запросы: отдать из кэша + обновить в фоне
- [ ] POST/PUT/DELETE: network-only
- [ ] IndexedDB для структурированных данных (analyses, courses)
- [ ] Sync queue для offline мутаций (запомнить → отправить когда онлайн)

### Phase 4: Offline UI [~3ч]
- [ ] Индикатор offline/online в навигации
- [ ] Toast "данные могут быть устаревшими" при offline
- [ ] Disable мутационные кнопки при offline (или показать queue)
- [ ] Background sync при восстановлении сети

### Phase 5: Testing [~2ч]
- [ ] Chrome DevTools → Application → Service Workers → Offline mode
- [ ] Lighthouse PWA audit → 100
- [ ] Тест: загрузить данные → отключить сеть → перезагрузить → данные видны

**Критерий готовности:** Lighthouse PWA = 100, данные доступны при offline, мутации в queue.

**Оценка:** ~13-15 часов

---

## 3. Reactive State (Proxy-based)

**Что:** Заменить ручные `render()` вызовы после мутаций state на автоматические подписки.

**Зачем:**
- Забыл вызвать render → UI не обновился (текущая проблема)
- Код проще: `state.drugs.push(drug)` → UI обновляется сам
- Centralized state management

**План:**

### Phase 1: Reactive core [~3ч]
- [ ] Создать `reactive.js` с Proxy-based store:
  ```js
  const store = reactive(initialState, {
    drugs: () => renderDrugs(),
    analyses: () => renderAnalyses(),
    // ...
  })
  ```
- [ ] Deep proxy для вложенных объектов и массивов
- [ ] Batching: собрать мутации за microtask, рендерить один раз
- [ ] `store.subscribe('key', callback)` API

### Phase 2: Миграция state.js [~2ч]
- [ ] Заменить `export const state = {}` на `export const state = reactive({})`
- [ ] Зарегистрировать подписки для каждого ключа
- [ ] Убрать ручные `renderXxx()` вызовы после мутаций

### Phase 3: Миграция страниц [~4ч]
- [ ] dashboard.js — подписки на `analyses`, `drugs`, `intakeLogs`
- [ ] course.js — подписки на `currentCourse`, `drugs`
- [ ] workouts.js — подписки на `workoutPrograms`, `workoutDays`, etc.
- [ ] admin.js — если использует state

### Phase 4: Computed values [~2ч]
- [ ] `computed('totalDays', () => ...)` — автопересчёт при изменении зависимостей
- [ ] Dashboard stats как computed
- [ ] Drug statistics как computed

**Критерий готовности:** Нет ни одного ручного `renderXxx()` вызова, UI обновляется автоматически.

**Оценка:** ~11-13 часов

---

## 4. XML-комментарии для enum-ов

**Что:** Добавить `/// <summary>` к каждому значению в 6 enum-ах Domain слоя.

**Зачем:**
- IntelliSense показывает описания
- Swagger отображает в schema

**План:**

### Один этап [~1ч]
- [ ] `DrugType.cs` — Injectable, Oral, Capsule, Cream, Patch, Other
- [ ] `DrugCategory.cs` — AAS, Antiestrogen, PeptideGH, FatBurner, DopamineAgonist, LiverSupport, VitaminMineral, Other
- [ ] `DrugSubcategory.cs` — все подкатегории
- [ ] `ManufacturerType.cs` — Pharmaceutical, Underground
- [ ] `ValueStatus.cs` — Normal, Low, High, SlightlyHigh, Pending
- [ ] `MuscleGroup.cs` — все группы мышц

**Критерий готовности:** Swagger schema показывает описания enum-значений.

**Оценка:** ~1 час

---

## 5. DrugCatalogItem refactor

**Что:** Разбить класс с 25+ свойствами на логические группы.

**Зачем:**
- Класс перегружен: фармакология, описания, мета, рейтинги — всё в куче
- Легче расширять по группам

**План:**

### Phase 1: Выделить вложенные объекты [~2ч]
- [ ] `PharmacologyInfo` record: HalfLife, DetectionTime, AnabolicRating, AndrogenicRating, CommonDosages
- [ ] `SubstanceDescription` record: Description, Effects, SideEffects, Notes
- [ ] `CatalogMeta` record: IsPopular, SortOrder, PubMedSearchTerm, HasBothForms

### Phase 2: Обновить DrugCatalogItem [~1ч]
- [ ] Заменить 25 flat свойств на 3 вложенных объекта + core свойства (Id, Name, NameEn, Category, Subcategory, DrugType, ActiveSubstance)
- [ ] Обновить `drug-catalog.json` структуру

### Phase 3: Обновить потребителей [~2ч]
- [ ] `DrugCatalogService` — обновить поиск и фильтрацию
- [ ] `DrugCatalogController` — обновить API ответы
- [ ] Frontend `encyclopedia.js` — обновить маппинг
- [ ] Frontend `modals.js` — обновить отображение

### Phase 4: Миграция данных [~1ч]
- [ ] Bump `seed_version` в DrugCatalogSeedService
- [ ] Тест: запуск → каталог пересеедится → данные корректны

**Критерий готовности:** `DrugCatalogItem` ≤ 10 direct properties, вложенные объекты семантически сгруппированы.

**Оценка:** ~6 часов

---

## 6. Миграция callers на endpoints.js

**Что:** Заменить все hardcoded API пути (`'/analyses'`, `'/drugs'` и т.д.) на импорты из `endpoints.js`.

**Зачем:**
- Один source of truth для API путей
- Легче менять при добавлении API versioning (`/api/v1/`)
- Grep по `ENDPOINTS.` вместо магических строк

**План:**

### Phase 1: Аудит [~30мин]
- [ ] `grep -rn "api('/" wwwroot/js/` — собрать все hardcoded пути
- [ ] Проверить что `endpoints.js` покрывает все пути
- [ ] Добавить недостающие

### Phase 2: Миграция по модулям [~3ч]
- [ ] `main.js` — все `api('/...')` → `api(ENDPOINTS.xxx.yyy)`
- [ ] `pages/course.js` + `courseTabs.js`
- [ ] `pages/workouts.js`
- [ ] `pages/dashboard.js`
- [ ] `pages/encyclopedia.js`
- [ ] `pages/admin.js`
- [ ] `components/modals.js` + `workoutModals.js`

### Phase 3: Валидация [~30мин]
- [ ] `grep -rn "api('/" wwwroot/js/` — должно быть 0 результатов
- [ ] Smoke test всех страниц
- [ ] Удалить TODO из `api.js`

**Критерий готовности:** `grep -rn "api('/" wwwroot/js/` = 0 matches.

**Оценка:** ~4 часа

---

## Приоритеты и порядок

| # | Проект | Оценка | Приоритет | Зависимости |
|---|--------|--------|-----------|-------------|
| 4 | XML-комментарии enum-ов | 1ч | Лёгкий | — |
| 6 | Миграция на endpoints.js | 4ч | Лёгкий | — |
| 5 | DrugCatalogItem refactor | 6ч | Средний | — |
| 1 | TypeScript миграция | 15-20ч | Средний | Vite (готов) |
| 3 | Reactive State | 11-13ч | Средний | — |
| 2 | Offline Mode / PWA | 13-15ч | Низкий | TypeScript (опц.) |

**Рекомендация:** 4 → 6 → 5 → 1 → 3 → 2

Начинаем с мелочей (enum-комменты, endpoints), потом рефакторинг данных, потом TypeScript как фундамент, и уже поверх — reactive state и PWA.

---

*Создано: 2026-02-12*
*Общая оценка: ~50-60 часов*
