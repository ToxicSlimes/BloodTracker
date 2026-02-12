# BloodTracker.Infrastructure

Слой инфраструктуры: базы данных (LiteDB), аутентификация, внешние API, парсинг PDF.

## Архитектура

```
Infrastructure/
├── DependencyInjection.cs          — регистрация всех сервисов
├── Persistence/
│   ├── AuthDbContext.cs             — БД аутентификации (singleton)
│   ├── BloodTrackerDbContext.cs     — Per-user БД данных (scoped)
│   ├── CatalogDbContext.cs          — БД каталога препаратов (singleton)
│   └── Repositories.cs             — все репозитории в одном файле
└── Services/
    ├── AuthService.cs               — JWT, Google OAuth, Email-коды
    ├── DataMigrationService.cs      — Миграция single-user → multi-user БД
    ├── DrugCatalogSeedService.cs    — Сид каталога препаратов (130+ субстанций)
    ├── DrugCatalogService.cs        — Поиск по каталогу препаратов
    ├── ExerciseCatalogService.cs    — Каталог упражнений (ExerciseDB API + кеш)
    ├── GeminiVisionService.cs       — Gemini 2.5 Flash для OCR из PDF
    ├── PdfParserService.cs          — Парсинг PDF анализов (Gemini + Tesseract OCR fallback)
    └── ReferenceRangeService.cs     — Референсные диапазоны анализов крови
```

## Persistence

### 3 базы данных (LiteDB)

| БД | Файл | Lifetime | Содержимое |
|----|-------|----------|------------|
| `AuthDbContext` | `auth.db` | Singleton | Users, AuthCodes |
| `BloodTrackerDbContext` | `user_{userId}.db` | Scoped (per-request) | Analyses, Courses, Drugs, IntakeLogs, Purchases, Workouts, ExerciseCatalog |
| `CatalogDbContext` | `catalog.db` | Singleton | DrugCatalog, Manufacturers, Metadata |

**Per-user изоляция:** Каждый пользователь имеет свой файл БД. Путь вычисляется из `IUserContext.UserId` в scoped фабрике `BloodTrackerDbContext`.

### Репозитории

Все в `Repositories.cs`. Каждый — scoped, оборачивает `BloodTrackerDbContext`:

- `AnalysisRepository` — анализы крови
- `CourseRepository` — курсы препаратов (автоматическая деактивация старых при создании нового)
- `DrugRepository` — препараты пользователя
- `IntakeLogRepository` — записи приёма
- `PurchaseRepository` — покупки
- `WorkoutProgramRepository`, `WorkoutDayRepository`, `WorkoutExerciseRepository`, `WorkoutSetRepository` — тренировки

Все репозитории возвращают `Task<T>` (sync обёртки над LiteDB для совместимости с async интерфейсами).

## Сервисы

### AuthService
- **JWT генерация:** HS256, настраиваемый expiry (default 30 дней)
- **Impersonation:** отдельный токен на 1 час с claim `impersonated=true`
- **Google OAuth:** верификация через `GoogleJsonWebSignature`
- **Email-коды:** 6-значный код, 10 мин TTL
- **Отправка email:** Gmail API (OAuth2 refresh token) → SMTP fallback (с auto-retry на порт 465)
- **UserContext:** извлекает UserId/Email/IsAdmin из JWT claims в HttpContext

### DataMigrationService
Трёхфазная миграция при запуске:
1. **Phase 1:** Если есть старый `bloodtracker.db` и нет пользователей → создаёт placeholder-пользователя, копирует БД
2. **Phase 2:** Если появился реальный пользователь → переназначает данные от placeholder
3. **Phase 3:** Ищет orphaned `user_*.db` файлы и присваивает их админу/первому пользователю

### DrugCatalogSeedService + DrugCatalogService
- Каталог 130+ субстанций (AAS, пептиды, SARMs, ГР, антиэстрогены, ПКТ, поддержка)
- Каталог производителей
- Версионирование сида (`CurrentVersion = 3`, хранится в metadata)
- Поиск по category/subcategory/drugType/text

### ExerciseCatalogService
- Внешний API: ExerciseDB (RapidAPI)
- Кеширование в LiteDB на 24 часа
- Маппинг body parts → `MuscleGroup` enum
- Graceful degradation: если API недоступен — возвращает кеш

### GeminiVisionService
- Модель: `gemini-2.5-flash` (бесплатный tier)
- Отправляет ВСЕ страницы PDF одним запросом (мультимодальный)
- Prompt на извлечение таблиц анализов в JSON

### PdfParserService
Двухуровневый парсинг PDF анализов крови:
1. **Gemini Vision** (primary) — рендерит страницы → отправляет изображения в Gemini
2. **Tesseract OCR** (fallback) — рендерит через Docnet → предобработка OpenCV → OCR → маппинг
- Маппинг 30+ показателей (гормоны, липиды, печень, общие, коагуляция)
- Валидация значений по expected ranges
- Предобработка изображений: CLAHE → адаптивный threshold

### ReferenceRangeService
- 40+ референсных диапазонов для анализов крови
- Категории: Гормоны, Липиды, Печень, Общие, Коагуляция, Белковые фракции, Онкомаркеры
- `GetStatus()`: Normal / SlightlyHigh / High / Low / Pending

## DI регистрация

```csharp
services.AddInfrastructure(configuration);
```

Конфигурации: `DatabaseSettings`, `JwtSettings`, `EmailSettings`, `GoogleAuthSettings`, `AdminSettings`
