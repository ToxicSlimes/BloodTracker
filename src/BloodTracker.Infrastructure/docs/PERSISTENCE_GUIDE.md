# PERSISTENCE GUIDE — BloodTracker.Infrastructure

## Архитектура хранения данных

Проект использует **LiteDB** — embedded NoSQL базу данных (single-file, serverless). Три отдельные базы:

```
data/
├── auth.db              ← AuthDbContext (singleton)
├── catalog.db           ← CatalogDbContext (singleton)
├── user_{userId1}.db    ← BloodTrackerDbContext (scoped, per-user)
├── user_{userId2}.db
└── ...
```

## Три DbContext'а

### 1. AuthDbContext (Singleton)

**Файл:** `auth.db`
**Lifetime:** Singleton (один на приложение)
**Коллекции:**

| Коллекция | Модель | Индексы |
|-----------|--------|---------|
| `users` | `AppUser` | `Email` (unique), `GoogleId` |
| `auth_codes` | `AuthCode` | `Email` |

```csharp
public sealed class AuthDbContext : IDisposable
{
    public AuthDbContext(IOptions<DatabaseSettings> settings)
    {
        var dir = Path.GetDirectoryName(...);
        _database = new LiteDatabase($"Filename={Path.Combine(dir, "auth.db")};Connection=shared");
    }
}
```

**Зачем отдельная БД:** данные авторизации shared между всеми пользователями, нужен доступ ДО аутентификации.

### 2. CatalogDbContext (Singleton)

**Файл:** `catalog.db`
**Lifetime:** Singleton
**Коллекции:**

| Коллекция | Модель | Индексы |
|-----------|--------|---------|
| `drug_catalog` | `DrugCatalogItem` | `Id` (unique), `Category`, `Name`, `IsPopular` |
| `manufacturers` | `Manufacturer` | `Id` (unique), `Name`, `Type` |
| `_metadata` | `BsonDocument` | — |

**Зачем отдельная БД:** справочные данные shared, сидируются один раз при запуске, read-only в runtime.

### 3. BloodTrackerDbContext (Scoped, Per-User)

**Файл:** `user_{userId}.db`
**Lifetime:** Scoped (создаётся на каждый HTTP-запрос)
**Коллекции:**

| Коллекция | Модель | Индексы |
|-----------|--------|---------|
| `analyses` | `Analysis` | `Date` |
| `courses` | `Course` | `IsActive` |
| `drugs` | `Drug` | — |
| `intake_logs` | `IntakeLog` | `Date`, `DrugId` |
| `purchases` | `Purchase` | `DrugId`, `PurchaseDate` |
| `workout_programs` | `WorkoutProgram` | — |
| `workout_days` | `WorkoutDay` | `ProgramId`, `DayOfWeek` |
| `workout_exercises` | `WorkoutExercise` | `ProgramId`, `DayId` |
| `workout_sets` | `WorkoutSet` | `ExerciseId` |
| `exercise_catalog` | `ExerciseCatalogEntry` | `Id` (unique), `MuscleGroup` |

## Per-User Isolation

Ключевой архитектурный паттерн — **изоляция данных на уровне файловой системы**:

```csharp
services.AddScoped<BloodTrackerDbContext>(sp =>
{
    var userContext = sp.GetRequiredService<IUserContext>();
    
    string userDbPath;
    if (userContext.IsAuthenticated && userContext.UserId != Guid.Empty)
    {
        userDbPath = Path.Combine(dir, $"user_{userContext.UserId}.db");
    }
    else
    {
        userDbPath = filename;  // fallback
    }
    
    return new BloodTrackerDbContext($"Filename={userDbPath};Connection=shared");
});
```

**Как это работает:**
1. JWT токен содержит `sub` claim с `userId`
2. `UserContext` извлекает userId из `HttpContext.User`
3. DI создаёт `BloodTrackerDbContext` с путём `user_{userId}.db`
4. Все репозитории получают scoped DbContext → работают с данными конкретного пользователя

**Преимущества:**
- Полная изоляция данных между пользователями
- Простое удаление пользователя (удалить файл)
- Нет шардирования, нет row-level security
- Каждый файл — независимый LiteDB

**Ограничения:**
- Нет cross-user запросов (кроме AdminController, который открывает DB напрямую)
- Файл создаётся при первом обращении (LiteDB auto-create)

## LiteDB особенности

### Connection string
```
Filename=data/user_{id}.db;Connection=shared
```

`Connection=shared` — разрешает одновременный доступ из нескольких потоков (shared mode вместо exclusive).

### CRUD операции

LiteDB операции **синхронные**. Обёртка в `Task.FromResult()`:

```csharp
public Task<Analysis?> GetByIdAsync(Guid id, CancellationToken ct = default)
    => Task.FromResult<Analysis?>(context.Analyses.FindById(id));

public Task<Analysis> CreateAsync(Analysis analysis, CancellationToken ct = default)
{
    context.Analyses.Insert(analysis);
    return Task.FromResult(analysis);
}
```

### Индексы

Индексы создаются в конструкторе DbContext через `EnsureIndex()`:

```csharp
private void EnsureIndexes()
{
    Analyses.EnsureIndex(x => x.Date);
    Courses.EnsureIndex(x => x.IsActive);
    IntakeLogs.EnsureIndex(x => x.Date);
    IntakeLogs.EnsureIndex(x => x.DrugId);
    // ...
}
```

`EnsureIndex` — идемпотентный, безопасно вызывать при каждом создании контекста.

### Guid как Id

LiteDB нативно поддерживает `Guid` как `_id`. Конвенция: свойство `Id` автоматически маппится на `_id`.

### Dictionary<string, double>

`Analysis.Values` — `Dictionary<string, double>` — сериализуется LiteDB нативно как embedded document.

## Миграция данных (DataMigrationService)

Три фазы при запуске:

### Фаза 1: Initial migration
Если есть старая `bloodtracker.db` и нет пользователей → создать placeholder `admin@bloodtracker.local`, скопировать DB.

### Фаза 2: Reassignment
Когда реальный пользователь логинится → данные placeholder'а переназначаются ему (перемещение файла).

### Фаза 3: Orphan adoption
Если есть `user_*.db` файлы без соответствующего пользователя в `auth.db` → крупнейший orphan присоединяется к первому админу.

## Seed данных (DrugCatalogSeedService)

Версионированный seed каталога:

```csharp
private const int CurrentVersion = 3;

public void SeedIfNeeded()
{
    var meta = db.Metadata.FindById("seed_version");
    var existingVersion = meta?["version"].AsInt32 ?? 0;
    
    if (existingVersion >= CurrentVersion) return;
    
    db.DrugCatalog.DeleteAll();
    db.Manufacturers.DeleteAll();
    db.DrugCatalog.InsertBulk(GetSubstances());   // ~80 items
    db.Manufacturers.InsertBulk(GetManufacturers()); // ~70 items
    
    db.Metadata.Upsert("seed_version", ...);
}
```
