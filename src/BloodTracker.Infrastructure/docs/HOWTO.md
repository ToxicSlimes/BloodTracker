# HOWTO — BloodTracker.Infrastructure

## Как добавить новый репозиторий

### 1. Определи интерфейс в Application

```csharp
// Application/Common/IMyRepository.cs
public interface IMyRepository
{
    Task<List<MyEntity>> GetAllAsync(CancellationToken ct = default);
    Task<MyEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<MyEntity> CreateAsync(MyEntity entity, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
```

### 2. Добавь коллекцию в BloodTrackerDbContext

```csharp
// В BloodTrackerDbContext.cs
public ILiteCollection<MyEntity> MyEntities => _database.GetCollection<MyEntity>("my_entities");

// В EnsureIndexes():
MyEntities.EnsureIndex(x => x.SomeField);
```

### 3. Реализуй репозиторий в Repositories.cs

```csharp
public sealed class MyRepository(BloodTrackerDbContext context) : IMyRepository
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

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(context.MyEntities.Delete(id));
}
```

### 4. Зарегистрируй в DependencyInjection.cs

```csharp
services.AddScoped<IMyRepository, MyRepository>();
```

## Как добавить новый сервис

### 1. Определи интерфейс в Application (если нужен)

### 2. Реализуй сервис

```csharp
public sealed class MyService : IMyService
{
    private readonly ILogger<MyService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;

    public MyService(ILogger<MyService> logger, IConfiguration config, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;
        _apiKey = config["MyService:ApiKey"] ?? Environment.GetEnvironmentVariable("MY_API_KEY");
    }
}
```

### 3. Зарегистрируй в DependencyInjection.cs

```csharp
// Для сервисов с HttpClient:
services.AddHttpClient<MyService>();
services.AddScoped<IMyService, MyService>();

// Для singleton без HTTP:
services.AddSingleton<IMyService, MyService>();
```

### 4. Добавь конфигурацию (если нужна)

```csharp
services.Configure<MySettings>(configuration.GetSection("MyService"));
```

## Как добавить новый показатель в парсинг PDF

### 1. Добавь маппинг имени в PdfParserService.NameMappings

```csharp
["my-marker"] = ["Мой маркер", "My Marker", "альтернативное название"],
```

### 2. Добавь expected range в PdfParserService.ExpectedRanges

```csharp
["my-marker"] = (0.5, 100),  // min, max для валидации
```

### 3. Добавь референсный диапазон в ReferenceRangeService.Ranges

```csharp
["my-marker"] = new() { Key = "my-marker", Name = "Мой маркер", Min = 1.0, Max = 50.0, Unit = "нг/мл", Category = "Гормоны", Description = "Описание..." },
```

## Как обновить каталог препаратов

1. Добавь новые субстанции в `DrugCatalogSeedService.GetSubstances()`
2. Инкрементируй `CurrentVersion` (текущий: 3)
3. При запуске приложения каталог пересидится автоматически
