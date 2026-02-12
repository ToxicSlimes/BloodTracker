# BloodTracker — План улучшений

> Собрано из 5 файлов IMPROVEMENTS.md по всем слоям проекта.
> Приоритеты: P0 (security) → P1 (architecture) → P2 (logic/data) → P3 (quality of life)
> Сложность: S (час), M (2-4ч), L (день+)

---

## P0 — Security (ASAP, production дыры)

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 0.1 | XSS через onclick в admin | `wwwroot/js/admin.js` | S | `deleteUser('${u.id}', '${escHtml(u.email)}')` — если email содержит `'`, onclick ломается. Перейти на `addEventListener` |
| 0.2 | CORS "AllowAll" | `Program.cs` | S | На production нужна строгая policy с конкретным origin `blood.txcslm.net` |
| 0.3 | Rate limiting на auth | `Api` | M | `/api/auth/send-code` не защищён от брутфорса. Добавить `Microsoft.AspNetCore.RateLimiting` |
| 0.4 | CSP headers | `Caddy / Program.cs` | S | Нет Content Security Policy. innerHTML повсюду — нужна хотя бы базовая CSP |
| 0.5 | Dev JWT без подписи | `Program.cs` | S | `RequireSignedTokens = false` — убедиться что в prod это OFF |

**Оценка:** ~4-6 часов

---

## P1 — Architecture (god files, дублирование)

### P1-A. Backend — разбиение god files

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 1.1 | Разбить ApiControllers.cs | `Api/` | M | 500 строк, 14 контроллеров → по файлу на контроллер |
| 1.2 | Разбить CourseHandlers.cs | `Application/` | M | 400 строк, 4 сущности → CourseHandlers, DrugHandlers, IntakeLogHandlers, PurchaseHandlers |
| 1.3 | Разбить PdfParserService.cs | `Infrastructure/` | M | 600 строк → GeminiPdfParser, OcrPdfParser, BloodTestNameMapper, ImagePreprocessor |
| 1.4 | Разбить Repositories.cs | `Infrastructure/` | M | 10 репозиториев с дублированным CRUD → generic BaseRepository<T> |
| 1.5 | Разбить Entities.cs | `Domain/` | S | 230 строк, все модели в одном файле → по файлу на сущность |
| 1.6 | Глобальный exception handler | `Api/` | M | Вместо try/catch в каждом контроллере → `IExceptionHandler` middleware |

### P1-B. Frontend — дублирование и унификация

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 1.7 | Вынести общие хелперы | `wwwroot/js/` | M | `drugTypeBadge()`, `CATEGORY_NAMES`, `formatDate()`, `escHtml()` дублируются в 2-4 модулях → shared модуль |
| 1.8 | Унифицировать модалки | `wwwroot/js/` | S | workoutModals использует `style.display`, остальные — `classList`. Привести к одному подходу |
| 1.9 | Error boundary для init() | `wwwroot/js/main.js` | S | Если один модуль падает — всё приложение не грузится. Обернуть каждый init в try/catch |

**Оценка:** ~2-3 дня

---

## P2 — Logic & Data (фильтрация, валидация, missing handlers)

### P2-A. Валидация

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 2.1 | FluentValidation валидаторы | `Application/` | M | Ни одного валидатора нет, хотя DI зарегистрирован. Создать валидаторы для всех команд |
| 2.2 | MediatR ValidationBehavior | `Application/` | S | Pipeline behavior для автоматической валидации перед handler-ом |
| 2.3 | Доменная валидация | `Domain/` | M | Quantity > 0, EndDate > StartDate, Label not empty — в конструкторах/сеттерах |

### P2-B. Репозитории и запросы

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 2.4 | Фильтрация в репозиториях | `Infrastructure/` | M | 6 handlers грузят ВСЕ записи + фильтруют в памяти. Добавить `GetByDrugIdAsync`, `GetByCourseIdAsync` и т.д. |
| 2.5 | Bulk delete для Drug | `Infrastructure/` | S | `DeleteDrugHandler` удаляет логи по одному. Добавить `DeleteByDrugIdAsync` |
| 2.6 | Пагинация | `Application/` | M | GetAll* возвращают все записи. Добавить `skip`/`take` параметры |

### P2-C. Missing handlers

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 2.7 | GetDrugsByCourseHandler | `Application/` | S | Query объявлен, handler не реализован → MediatR exception при вызове |
| 2.8 | GetAllCoursesHandler | `Application/` | S | Аналогично |
| 2.9 | GetAllIntakeLogsHandler | `Application/` | S | Аналогично |

### P2-D. Маппинг

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 2.10 | Унифицировать маппинг | `Application/` | M | Analyses/Workouts → Mapster, Courses → ручной. Дублирование Course→CourseDto в 3 handlers |
| 2.11 | Вынести MapDrugDto | `Application/` | S | Статический метод из CreateDrugHandler используется в 4 handlers → отдельный helper |

### P2-E. Infrastructure

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 2.12 | Gmail token cache | `Infrastructure/` | S | Scoped сервис теряет token между запросами → IMemoryCache или singleton |
| 2.13 | AdminController → Application слой | `Api/` | M | Напрямую работает с DbContext, обходя Application layer |
| 2.14 | ExerciseCatalog из per-user БД | `Infrastructure/` | S | Общий каталог кешируется в user-specific контексте → вынести в CatalogDbContext |

### P2-F. Frontend logic

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 2.15 | Toast для фоновых ошибок | `wwwroot/js/` | S | Многие catch только console.error(). Юзер не видит ошибки |
| 2.16 | Skeleton loading | `wwwroot/js/` | M | skeleton.js создан, но нигде не вызывается |
| 2.17 | Magic strings → API registry | `wwwroot/js/` | S | Пути `/analyses`, `/drugs` и т.д. разбросаны. Нужен `api.js` с endpoints |

**Оценка:** ~3-5 дней

---

## P3 — Quality of Life (когда всё выше готово)

| # | Что | Где | Сложность | Описание |
|---|-----|-----|-----------|----------|
| 3.1 | Value objects в Domain | `Domain/` | M | Dosage, Money, DateRange — вместо примитивов |
| 3.2 | Unit тесты Application | `Tests/` | L | Handlers с моками репозиториев |
| 3.3 | Unit тесты Frontend | `Tests/` | L | escapeHtml, formatDate, getStatus, бизнес-логика |
| 3.4 | Retry policy (Polly) | `Infrastructure/` | M | Для GeminiVisionService, ExerciseCatalogService |
| 3.5 | Кэширование каталогов | `Application/` | S | DrugCatalog, ReferenceRanges — read-only, можно кешить |
| 3.6 | DrugCatalog → JSON | `Infrastructure/` | M | 130+ субстанций захардкожены в C#. Вынести в JSON |
| 3.7 | ReferenceRanges → БД | `Infrastructure/` | M | 40+ диапазонов в Dictionary. Дать юзеру кастомизацию |
| 3.8 | Migration completed flag | `Infrastructure/` | S | DataMigrationService запускается при каждом старте |
| 3.9 | Swagger с JWT auth | `Api/` | S | SecurityDefinition + SecurityRequirement |
| 3.10 | API versioning | `Api/` | M | `/api/v1/` для будущей совместимости |
| 3.11 | Healthcheck с DB check | `Api/` | S | Проверка LiteDB и внешних сервисов |
| 3.12 | Tessdata в Docker | `Dockerfile` | S | OCR fallback не работает без интернета |
| 3.13 | Reactive state (Proxy) | `wwwroot/js/` | L | Pub/sub вместо ручных render-вызовов |
| 3.14 | Offline mode / SW | `wwwroot/` | L | Service Worker + localStorage cache |
| 3.15 | Bundling / minification | `wwwroot/` | M | Десятки HTTP запросов на load. Нужен Vite/esbuild |
| 3.16 | Mobile-first стили | `wwwroot/css/` | M | ASCII навигация не адаптивна |
| 3.17 | Доменные события | `Domain/` | M | Для реактивности при создании/удалении сущностей |
| 3.18 | OpenAPI описания | `Api/` | M | ProducesResponseType, XML comments для Swagger |
| 3.19 | JSDoc/TypeScript | `wwwroot/js/` | L | Типизация API ответов и функций |

**Оценка:** ~2-3 недели (по мере надобности)

---

## Порядок работы

```
Phase 1: P0 Security          [~1 день]   → деплой на prod
Phase 2: P1 Architecture      [~2-3 дня]  → рефакторинг god files
Phase 3: P2-C Missing handlers [~2 часа]  → MediatR не падает
Phase 4: P2-A Валидация       [~1 день]   → FluentValidation pipeline
Phase 5: P2-B Репозитории     [~1 день]   → нормальные запросы
Phase 6: P2-D,E,F Остальное   [~2 дня]    → маппинг, фронт, инфра
Phase 7: P3 По желанию        [ongoing]   → тесты, кэш, DX
```

**Итого активной работы: ~8-12 дней**

---

*Сгенерировано: 2026-02-12*
*Источник: 5 IMPROVEMENTS.md файлов по всем слоям BloodTracker*
