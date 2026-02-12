# Application — DO / DON'T

Правила, извлечённые из реального кода проекта.

## ✅ DO

### Commands и Queries — sealed record с IRequest<T>
```csharp
// ✅ Так делают в проекте
public sealed record CreateAnalysisCommand(CreateAnalysisDto Data) : IRequest<AnalysisDto>;
public sealed record DeleteAnalysisCommand(Guid Id) : IRequest<bool>;
```

### Handlers — sealed class с primary constructor
```csharp
// ✅ Primary constructor для DI
public sealed class CreateAnalysisHandler(IAnalysisRepository repository, IMapper mapper, ILogger<CreateAnalysisHandler> logger)
    : IRequestHandler<CreateAnalysisCommand, AnalysisDto>
```

### DTOs — sealed record, отдельные для Create/Update/Response
```csharp
// ✅ Три отдельных DTO на операцию
public sealed record AnalysisDto { ... }          // Response
public sealed record CreateAnalysisDto { ... }    // Create input
public sealed record UpdateAnalysisDto { ... }    // Update input
```

### Логирование в мутирующих handlers
```csharp
// ✅ LogInformation при create/update/delete
logger.LogInformation("Creating analysis: {Label} on {Date}", request.Data.Label, request.Data.Date);
```

### KeyNotFoundException для не найденных сущностей
```csharp
// ✅ Единый паттерн
var existing = await repository.GetByIdAsync(request.Data.Id, ct)
    ?? throw new KeyNotFoundException($"Analysis {request.Data.Id} not found");
```

### Каскадное удаление в handler (не в БД)
```csharp
// ✅ DeleteDrugHandler удаляет связанные IntakeLog и Purchase
var logs = await logRepo.GetAllAsync(ct);
foreach (var log in logs.Where(l => l.DrugId == request.Id))
    await logRepo.DeleteAsync(log.Id, ct);
```

### CancellationToken во всех async-методах
```csharp
// ✅ Всегда прокидывают ct
public async Task<AnalysisDto> Handle(CreateAnalysisCommand request, CancellationToken ct)
```

### Валидация бизнес-правил в handler
```csharp
// ✅ Проверка в CreateIntakeLogHandler
if (consumed >= purchase.Quantity)
    throw new InvalidOperationException($"Purchase has no remaining stock ({consumed}/{purchase.Quantity} consumed)");
```

### Маппинг — Mapster IMapper или ручной
- Workouts и Analyses используют `mapper.Map<T>()`
- Courses используют ручной маппинг (статические методы `MapToDto`, `MapDrugDto`)

---

## ❌ DON'T

### Не создавай navigation properties в доменных сущностях
Связи — только через Guid FK. Подгрузка связанных данных — в handler.

### Не клади бизнес-логику в репозиторий
Репозитории — чистый CRUD. Вся логика (фильтрация, каскадное удаление, подсчёт stock) — в handler.

### Не возвращай доменные сущности из handler
Всегда маппи в DTO перед возвратом.

### Не забывай UpdatedAt
```csharp
// ✅ При обновлении ставь вручную
existing.UpdatedAt = DateTime.UtcNow;
```

### Не используй FluentValidation validators (пока)
Они зарегистрированы через DI (`AddValidatorsFromAssembly`), но ни одного валидатора в проекте нет. Валидация — в handlers через `throw`.

### Не смешивай поддомены в одном handler-файле
Каждый поддомен (Analyses, Courses, Workouts) — своя папка. Courses уже перегружен (Course + Drug + IntakeLog + Purchase handlers в одном файле), но поддомены не смешиваются.
