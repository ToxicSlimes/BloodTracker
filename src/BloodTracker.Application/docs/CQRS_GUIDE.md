# CQRS GUIDE — BloodTracker.Application

## Обзор паттерна

Проект использует **CQRS** (Command Query Responsibility Segregation) через **MediatR**. Каждая операция — отдельный request (`IRequest<T>`), обрабатываемый соответствующим хэндлером (`IRequestHandler<TRequest, TResponse>`).

```
Controller → IMediator.Send(Command/Query) → Handler → Repository → LiteDB
```

## Стек

| Компонент | Библиотека | Версия |
|-----------|-----------|--------|
| CQRS/Mediator | MediatR | auto-scan |
| Валидация | FluentValidation | auto-scan |
| Маппинг | Mapster + MapsterMapper | TypeAdapterConfig.GlobalSettings |
| DI | Microsoft.Extensions.DependencyInjection | — |

## Регистрация (DependencyInjection.cs)

```csharp
public static IServiceCollection AddApplication(this IServiceCollection services)
{
    services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));
    services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

    var config = TypeAdapterConfig.GlobalSettings;
    config.Scan(Assembly.GetExecutingAssembly());
    services.AddSingleton(config);
    services.AddScoped<IMapper, ServiceMapper>();

    return services;
}
```

Автоматический скан сборки → все `IRequestHandler<,>` и `IValidator<>` регистрируются автоматически.

## Анатомия Command/Query

### Command (изменение данных)

```csharp
// Команда — record с данными
public sealed record CreateAnalysisCommand(CreateAnalysisDto Data) : IRequest<AnalysisDto>;
public sealed record UpdateAnalysisCommand(UpdateAnalysisDto Data) : IRequest<AnalysisDto>;
public sealed record DeleteAnalysisCommand(Guid Id) : IRequest<bool>;

// Особый случай — stream в команде
public sealed record ImportPdfAnalysisCommand(Stream PdfStream, string? Label) : IRequest<ImportPdfResultDto>;
```

### Query (чтение данных)

```csharp
// Без параметров
public sealed record GetAllAnalysesQuery : IRequest<List<AnalysisDto>>;

// С параметрами
public sealed record GetAnalysisByIdQuery(Guid Id) : IRequest<AnalysisDto?>;
public sealed record CompareAnalysesQuery(Guid BeforeId, Guid AfterId) : IRequest<CompareAnalysesDto?>;

// С множественными фильтрами
public sealed record GetIntakeLogsByDrugQuery(
    Guid? DrugId, DateTime? StartDate, DateTime? EndDate, int? Limit
) : IRequest<List<IntakeLogDto>>;
```

## Анатомия Handler

### Простой CRUD

```csharp
public sealed class CreateAnalysisHandler(
    IAnalysisRepository repository, IMapper mapper, ILogger<CreateAnalysisHandler> logger)
    : IRequestHandler<CreateAnalysisCommand, AnalysisDto>
{
    public async Task<AnalysisDto> Handle(CreateAnalysisCommand request, CancellationToken ct)
    {
        logger.LogInformation("Creating analysis: {Label}", request.Data.Label);
        var analysis = new Analysis { ... };
        var created = await repository.CreateAsync(analysis, ct);
        return mapper.Map<AnalysisDto>(created);
    }
}
```

Ключевые моменты:
- **Primary constructor** для DI
- `CancellationToken` пробрасывается в репозиторий
- Логирование операций
- Mapster для DTO маппинга

### Handler с бизнес-логикой

```csharp
public sealed class CreateIntakeLogHandler(
    IIntakeLogRepository logRepo, IDrugRepository drugRepo, IPurchaseRepository purchaseRepo)
    : IRequestHandler<CreateIntakeLogCommand, IntakeLogDto>
{
    public async Task<IntakeLogDto> Handle(CreateIntakeLogCommand request, CancellationToken ct)
    {
        // 1. Валидация существования Drug
        var drug = await drugRepo.GetByIdAsync(request.Data.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Data.DrugId} not found");

        // 2. Валидация Purchase (если указан)
        if (request.Data.PurchaseId is not null)
        {
            var purchase = await purchaseRepo.GetByIdAsync(request.Data.PurchaseId.Value, ct)
                ?? throw new KeyNotFoundException(...);

            // 3. Бизнес-правило: purchase принадлежит drug
            if (purchase.DrugId != drug.Id)
                throw new InvalidOperationException("Purchase does not belong to this drug");

            // 4. Бизнес-правило: не превышать stock
            var allLogs = await logRepo.GetAllAsync(ct);
            var consumed = allLogs.Count(l => l.PurchaseId == purchase.Id);
            if (consumed >= purchase.Quantity)
                throw new InvalidOperationException($"Purchase has no remaining stock");
        }

        // 5. Создание с денормализацией
        var log = new IntakeLog { DrugName = drug.Name, ... };
        var created = await logRepo.CreateAsync(log, ct);
        return IntakeLogHelper.MapWithLabel(created, ...);
    }
}
```

### Handler с каскадным удалением

```csharp
public sealed class DeleteDrugHandler(
    IDrugRepository repository, IIntakeLogRepository logRepo, IPurchaseRepository purchaseRepo)
    : IRequestHandler<DeleteDrugCommand, bool>
{
    public async Task<bool> Handle(DeleteDrugCommand request, CancellationToken ct)
    {
        var drug = await repository.GetByIdAsync(request.Id, ct);
        if (drug is null) return false;

        // Каскад: удалить связанные intake logs
        var logs = await logRepo.GetAllAsync(ct);
        foreach (var log in logs.Where(l => l.DrugId == request.Id))
            await logRepo.DeleteAsync(log.Id, ct);

        // Каскад: удалить связанные purchases
        var purchases = await purchaseRepo.GetByDrugIdAsync(request.Id, ct);
        foreach (var p in purchases)
            await purchaseRepo.DeleteAsync(p.Id, ct);

        return await repository.DeleteAsync(request.Id, ct);
    }
}
```

## Маппинг: два подхода

### 1. Через Mapster IMapper (автоматический)
```csharp
return mapper.Map<AnalysisDto>(created);
```
Используется когда имена свойств совпадают 1:1.

### 2. Ручной маппинг (для вычисляемых полей)
```csharp
private static CourseDto MapToDto(Course c) => new()
{
    Id = c.Id,
    Title = c.Title,
    // Вычисляемые поля:
    CurrentDay = c.StartDate is null ? 0 : Math.Max(0, (DateTime.Today - c.StartDate.Value).Days + 1),
    TotalDays = c.StartDate is null || c.EndDate is null ? 0 : (c.EndDate.Value - c.StartDate.Value).Days + 1
};
```

## Паттерн агрегированных запросов

### Dashboard (композитный запрос)

```csharp
public sealed class GetDashboardHandler(
    ICourseRepository courseRepo, IDrugRepository drugRepo,
    IIntakeLogRepository logRepo, IAnalysisRepository analysisRepo,
    IPurchaseRepository purchaseRepo, IDrugCatalogService catalogService)
    : IRequestHandler<GetDashboardQuery, DashboardDto>
{
    // Собирает данные из 5+ репозиториев в один DTO
}
```

### Inventory (сложная бизнес-логика)

`GetInventoryHandler` — собирает статистику по всем препаратам: купленное, потреблённое, остаток, breakdown по покупкам.

## Flow: от HTTP до БД

```
1. POST /api/analyses
2. AnalysesController.Create(CreateAnalysisDto data)
3. mediator.Send(new CreateAnalysisCommand(data))
4. MediatR → CreateAnalysisHandler.Handle()
5. handler → repository.CreateAsync(entity)
6. LiteDB → collection.Insert(entity)
7. handler → mapper.Map<AnalysisDto>(entity)
8. controller → CreatedAtAction(result)
9. HTTP 201 + AnalysisDto JSON
```

## Что НЕ используется

- ❌ Pipeline Behaviors (валидация, логирование через MediatR pipeline)
- ❌ Notifications/Events (MediatR `INotification`)
- ❌ Specification pattern
- ❌ Result/Either pattern (используются исключения)
- ❌ Domain Events
