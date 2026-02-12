# BloodTracker.Application

Слой бизнес-логики. Реализует паттерн **CQRS** через **MediatR**. Маппинг — **Mapster**. Валидация — **FluentValidation** (зарегистрирована, но валидаторы в текущем коде отсутствуют).

## Регистрация

```csharp
// DependencyInjection.cs
services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(...));
services.AddValidatorsFromAssembly(...);
// Mapster
var config = TypeAdapterConfig.GlobalSettings;
config.Scan(Assembly.GetExecutingAssembly());
services.AddSingleton(config);
services.AddScoped<IMapper, ServiceMapper>();
```

## Структура

```
BloodTracker.Application/
├── DependencyInjection.cs
├── Common/
│   └── Interfaces.cs          — Все репозитории + сервисные интерфейсы
├── Analyses/
│   ├── Commands/AnalysisCommands.cs
│   ├── Queries/AnalysisQueries.cs
│   ├── Handlers/AnalysisHandlers.cs
│   └── Dto/AnalysisDtos.cs
├── Courses/
│   ├── Commands/CourseCommands.cs
│   ├── Queries/CourseQueries.cs
│   ├── Handlers/CourseHandlers.cs
│   └── Dto/
│       ├── CourseDtos.cs
│       └── PurchaseDtos.cs
└── Workouts/
    ├── Commands/WorkoutCommands.cs
    ├── Queries/WorkoutQueries.cs
    ├── Handlers/WorkoutHandlers.cs
    └── Dto/WorkoutDtos.cs
```

## CQRS Flow

```
Controller → MediatR.Send(Command/Query)
  → Handler (инжектит Repository + Services)
    → Repository (CRUD)
    → Mapper (Entity → DTO)
  → DTO ← Controller
```

**Commands** — создание, обновление, удаление. Возвращают DTO или `bool`.
**Queries** — чтение. Возвращают DTO, `List<DTO>` или `null`.

## Поддомены

### Analyses
Управление результатами анализов крови.

| Тип | Имя | Описание |
|-----|-----|----------|
| Command | `CreateAnalysisCommand` | Создание анализа |
| Command | `UpdateAnalysisCommand` | Обновление анализа |
| Command | `DeleteAnalysisCommand` | Удаление анализа |
| Command | `ImportPdfAnalysisCommand` | Импорт анализа из PDF (через `IPdfParserService`) |
| Query | `GetAllAnalysesQuery` | Все анализы |
| Query | `GetAnalysisByIdQuery` | Анализ по ID |
| Query | `CompareAnalysesQuery` | Сравнение двух анализов (delta%, статусы) |
| Query | `GetAnalysisAlertsQuery` | Показатели вне нормы для анализа |

### Courses
Управление курсами, препаратами, приёмами и покупками. Самый большой поддомен.

| Тип | Имя | Описание |
|-----|-----|----------|
| Command | `Create/Update/DeleteCourseCommand` | CRUD курсов |
| Command | `Create/Update/DeleteDrugCommand` | CRUD препаратов |
| Command | `Create/Update/DeleteIntakeLogCommand` | CRUD записей о приёме |
| Command | `Create/Update/DeletePurchaseCommand` | CRUD покупок |
| Query | `GetActiveCourseQuery` | Активный курс |
| Query | `GetAllCoursesQuery` | Все курсы |
| Query | `GetAllDrugsQuery` / `GetDrugsByCourseQuery` | Препараты |
| Query | `GetAllIntakeLogsQuery` / `GetRecentIntakeLogsQuery` / `GetIntakeLogsByDrugQuery` | Записи приёмов (с фильтрами) |
| Query | `GetDashboardQuery` | Дашборд: активный курс, препараты, недавние приёмы, кол-во анализов |
| Query | `GetAllPurchasesQuery` / `GetPurchasesByDrugQuery` | Покупки |
| Query | `GetDrugStatisticsQuery` | Статистика препарата (куплено/потреблено/остаток/потрачено) |
| Query | `GetInventoryQuery` | Инвентарь по всем препаратам с breakdown по покупкам |
| Query | `GetConsumptionTimelineQuery` | Таймлайн потребления по дням |
| Query | `GetPurchaseVsConsumptionQuery` | Покупки vs потребление с running stock |
| Query | `GetPurchaseOptionsQuery` | Доступные покупки для привязки приёма (с остатком) |

### Workouts
Управление тренировочными программами. Четырёхуровневая иерархия: Program → Day → Exercise → Set.

| Тип | Имя | Описание |
|-----|-----|----------|
| Command | `Create/Update/DeleteWorkoutProgramCommand` | CRUD программ |
| Command | `Create/Update/DeleteWorkoutDayCommand` | CRUD дней |
| Command | `Create/Update/DeleteWorkoutExerciseCommand` | CRUD упражнений |
| Command | `Create/Update/DeleteWorkoutSetCommand` | CRUD подходов |
| Query | `GetAll/ByIdWorkoutProgramsQuery` | Программы |
| Query | `GetWorkoutDaysByProgram/ByIdQuery` | Дни программы |
| Query | `GetWorkoutExercisesByProgram/ByDay/ByIdQuery` | Упражнения |
| Query | `GetWorkoutSetsByExercise/ByIdQuery` | Подходы |

## Common/Interfaces.cs

Определяет все контракты слоя Application:

**Репозитории:** `IAnalysisRepository`, `ICourseRepository`, `IDrugRepository`, `IIntakeLogRepository`, `IPurchaseRepository`, `IWorkoutProgramRepository`, `IWorkoutDayRepository`, `IWorkoutExerciseRepository`, `IWorkoutSetRepository`

**Сервисы:**
- `IUserContext` — текущий пользователь (UserId, Email, IsAdmin)
- `IAuthService` — JWT, Google OAuth, email auth codes
- `IReferenceRangeService` — референсные диапазоны показателей крови
- `IDrugCatalogService` — каталог препаратов и производителей
- `IExerciseCatalogService` — каталог упражнений
- `IPdfParserService` — парсинг PDF анализов

**Records:**
- `PdfAnalysisResult` — результат парсинга PDF
