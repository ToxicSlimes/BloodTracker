# CONTRIBUTING — BloodTracker.Infrastructure

## Структура модуля

```
Infrastructure/
├── DependencyInjection.cs              # Вся DI регистрация
├── Persistence/
│   ├── AuthDbContext.cs                # auth.db (AppUser, AuthCode)
│   ├── BloodTrackerDbContext.cs        # user_{id}.db (per-user данные)
│   ├── CatalogDbContext.cs             # catalog.db (справочники)
│   └── Repositories.cs                # Все репозитории
└── Services/
    ├── AuthService.cs                  # JWT, Google Auth, Email
    ├── DataMigrationService.cs         # Миграция single→per-user DB
    ├── DrugCatalogSeedService.cs       # Сид каталога препаратов
    ├── DrugCatalogService.cs           # CRUD каталога
    ├── ExerciseCatalogService.cs       # Кэш внешнего API упражнений
    ├── GeminiVisionService.cs          # Gemini Vision API для PDF
    ├── PdfParserService.cs             # OCR + Gemini парсинг PDF
    └── ReferenceRangeService.cs        # Референсные значения анализов
```

## Как добавить новый репозиторий

### 1. Определи интерфейс в `Application/Common/Interfaces.cs`

```csharp
public interface IMyEntityRepository
{
    Task<List<MyEntity>> GetAllAsync(CancellationToken ct = default);
    Task<MyEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<MyEntity> CreateAsync(MyEntity entity, CancellationToken ct = default);
    Task<MyEntity> UpdateAsync(MyEntity entity, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
```

### 2. Добавь коллекцию в `BloodTrackerDbContext`

```csharp
public ILiteCollection<MyEntity> MyEntities => _database.GetCollection<MyEntity>("my_entities");
```

Не забудь добавить индексы в `EnsureIndexes()`:
```csharp
MyEntities.EnsureIndex(x => x.SomeField);
```

### 3. Реализуй репозиторий в `Persistence/Repositories.cs`

```csharp
public sealed class MyEntityRepository(BloodTrackerDbContext context) : IMyEntityRepository
{
    public Task<List<MyEntity>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(context.MyEntities.FindAll().ToList());

    public Task<MyEntity?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<MyEntity?>(context.MyEntities.FindById(id));

    public Task<MyEntity> CreateAsync(MyEntity entity, CancellationToken ct = default)
    {
        context.MyEntities.Insert(entity);
        return Task.FromResult(entity);
    }

    public Task<MyEntity> UpdateAsync(MyEntity entity, CancellationToken ct = default)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        context.MyEntities.Update(entity);
        return Task.FromResult(entity);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.MyEntities.Delete(id));
}
```

### 4. Зарегистрируй в `DependencyInjection.cs`

```csharp
services.AddScoped<IMyEntityRepository, MyEntityRepository>();
```

## Как добавить новый сервис

### 1. Определи интерфейс в `Application/Common/Interfaces.cs`
### 2. Реализуй в `Services/`
### 3. Зарегистрируй в `DependencyInjection.cs`

Выбор lifetime:
- `Scoped` — зависит от per-user контекста (репозитории, `IAuthService`, `IUserContext`)
- `Singleton` — shared данные (`IReferenceRangeService`, `IDrugCatalogService`, DbContext'ы auth/catalog)

## Конвенции

- Все репозитории в **одном файле** `Repositories.cs`
- Primary constructor для DI: `public sealed class Repo(DbContext ctx)`
- LiteDB операции **синхронные** → оборачиваются в `Task.FromResult()`
- `UpdatedAt = DateTime.UtcNow` проставляется в `UpdateAsync` репозитория
- Ordering по умолчанию: `OrderByDescending(x => x.Date)` для temporal данных

## Чеклист

- [ ] Интерфейс в `Application/Common/Interfaces.cs`
- [ ] Коллекция в `BloodTrackerDbContext` с индексами
- [ ] Репозиторий в `Persistence/Repositories.cs`
- [ ] DI регистрация в `DependencyInjection.cs`
- [ ] `sealed class` + primary constructor
- [ ] `UpdatedAt` проставляется в UpdateAsync
