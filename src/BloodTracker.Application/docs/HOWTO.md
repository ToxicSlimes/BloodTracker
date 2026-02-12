# HOWTO — Добавление нового Command / Query / Handler

## Пример: добавить новый Query в поддомен Analyses

### Шаг 1: DTO (если нужен новый)

`Analyses/Dto/AnalysisDtos.cs`:
```csharp
public sealed record MyNewDto
{
    public required string SomeField { get; init; }
}
```

### Шаг 2: Query

`Analyses/Queries/AnalysisQueries.cs`:
```csharp
public sealed record GetMyNewDataQuery(Guid AnalysisId) : IRequest<MyNewDto?>;
```

### Шаг 3: Handler

`Analyses/Handlers/AnalysisHandlers.cs`:
```csharp
public sealed class GetMyNewDataHandler(IAnalysisRepository repository)
    : IRequestHandler<GetMyNewDataQuery, MyNewDto?>
{
    public async Task<MyNewDto?> Handle(GetMyNewDataQuery request, CancellationToken ct)
    {
        var analysis = await repository.GetByIdAsync(request.AnalysisId, ct);
        if (analysis is null) return null;

        return new MyNewDto { SomeField = analysis.Label };
    }
}
```

**Готово.** MediatR подхватит handler автоматически (регистрация через `RegisterServicesFromAssembly`).

---

## Пример: добавить новый Command

### Шаг 1: Create/Input DTO

```csharp
public sealed record DoSomethingDto
{
    public required Guid TargetId { get; init; }
    public required string Value { get; init; }
}
```

### Шаг 2: Command

```csharp
public sealed record DoSomethingCommand(DoSomethingDto Data) : IRequest<ResultDto>;
```

### Шаг 3: Handler

```csharp
public sealed class DoSomethingHandler(
    IMyRepository repository,
    IMapper mapper,
    ILogger<DoSomethingHandler> logger)
    : IRequestHandler<DoSomethingCommand, ResultDto>
{
    public async Task<ResultDto> Handle(DoSomethingCommand request, CancellationToken ct)
    {
        logger.LogInformation("Doing something for {Id}", request.Data.TargetId);

        // 1. Проверить существование
        var entity = await repository.GetByIdAsync(request.Data.TargetId, ct)
            ?? throw new KeyNotFoundException($"Entity {request.Data.TargetId} not found");

        // 2. Мутировать
        entity.SomeField = request.Data.Value;
        entity.UpdatedAt = DateTime.UtcNow;

        // 3. Сохранить
        var updated = await repository.UpdateAsync(entity, ct);

        // 4. Маппить и вернуть
        return mapper.Map<ResultDto>(updated);
    }
}
```

---

## Добавление нового поддомена

1. Создай папку `BloodTracker.Application/{НовыйДомен}/`
2. Внутри — стандартная структура:
   ```
   {НовыйДомен}/
   ├── Commands/{НовыйДомен}Commands.cs
   ├── Queries/{НовыйДомен}Queries.cs
   ├── Handlers/{НовыйДомен}Handlers.cs
   └── Dto/{НовыйДомен}Dtos.cs
   ```
3. Добавь интерфейс репозитория в `Common/Interfaces.cs`
4. Реализуй репозиторий в Infrastructure-слое

---

## Чеклист

- [ ] Command/Query — `sealed record` с `IRequest<T>`
- [ ] Handler — `sealed class` с primary constructor
- [ ] DTO — `sealed record`, отдельные Create/Update/Response
- [ ] CancellationToken прокинут во все async-вызовы
- [ ] Не найдено → `throw new KeyNotFoundException(...)`
- [ ] Мутация → `logger.LogInformation(...)` + `UpdatedAt = DateTime.UtcNow`
- [ ] Возвращаем DTO, не Entity
