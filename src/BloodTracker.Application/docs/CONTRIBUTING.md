# CONTRIBUTING — BloodTracker.Application

## Структура модуля

```
Application/
├── Common/
│   └── Interfaces.cs          # Все интерфейсы (репозитории, сервисы)
├── DependencyInjection.cs     # MediatR + FluentValidation + Mapster
├── Analyses/
│   ├── Commands/AnalysisCommands.cs
│   ├── Queries/AnalysisQueries.cs
│   ├── Dto/AnalysisDtos.cs
│   └── Handlers/AnalysisHandlers.cs
├── Courses/
│   ├── Commands/CourseCommands.cs
│   ├── Queries/CourseQueries.cs
│   ├── Dto/CourseDtos.cs, PurchaseDtos.cs
│   └── Handlers/CourseHandlers.cs
└── Workouts/
    ├── Commands/WorkoutCommands.cs
    ├── Queries/WorkoutQueries.cs
    ├── Dto/WorkoutDtos.cs
    └── Handlers/WorkoutHandlers.cs
```

## Как добавить новую фичу (CQRS)

### 1. Определи DTO в `{Feature}/Dto/`

```csharp
public sealed record MyEntityDto
{
    public Guid Id { get; init; }
    public required string Name { get; init; }
}

public sealed record CreateMyEntityDto
{
    public required string Name { get; init; }
}
```

### 2. Создай Command/Query в соответствующей папке

```csharp
// Commands
public sealed record CreateMyEntityCommand(CreateMyEntityDto Data) : IRequest<MyEntityDto>;
public sealed record DeleteMyEntityCommand(Guid Id) : IRequest<bool>;

// Queries
public sealed record GetAllMyEntitiesQuery : IRequest<List<MyEntityDto>>;
public sealed record GetMyEntityByIdQuery(Guid Id) : IRequest<MyEntityDto?>;
```

### 3. Создай Handler

```csharp
public sealed class CreateMyEntityHandler(IMyEntityRepository repository, IMapper mapper)
    : IRequestHandler<CreateMyEntityCommand, MyEntityDto>
{
    public async Task<MyEntityDto> Handle(CreateMyEntityCommand request, CancellationToken ct)
    {
        var entity = new MyEntity { Name = request.Data.Name };
        var created = await repository.CreateAsync(entity, ct);
        return mapper.Map<MyEntityDto>(created);
    }
}
```

### 4. Добавь интерфейс репозитория в `Common/Interfaces.cs`

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

### 5. Реализуй репозиторий в Infrastructure

(см. Infrastructure/docs/CONTRIBUTING.md)

## Конвенции проекта

| Аспект | Конвенция |
|--------|-----------|
| Command | `{Action}{Entity}Command` — `CreateAnalysisCommand` |
| Query | `Get{What}Query` — `GetAllAnalysesQuery`, `GetAnalysisByIdQuery` |
| Handler | `{Action}{Entity}Handler` — `CreateAnalysisHandler` |
| DTO | `{Entity}Dto`, `Create{Entity}Dto`, `Update{Entity}Dto` |
| Маппинг | Mapster `IMapper` или ручной (для вычисляемых полей) |
| DI | Автоматическая регистрация через `Assembly.GetExecutingAssembly()` |
| Логирование | Primary constructor injection: `ILogger<HandlerName>` |

## Важные особенности

- **Один файл — все команды/запросы домена** (не один файл на команду)
- **Один файл — все хэндлеры домена** (все хэндлеры анализов в `AnalysisHandlers.cs`)
- **Вычисляемые поля** маппятся вручную (например, `Course.CurrentDay`, `Course.TotalDays`)
- **Каскадное удаление** реализуется в хэндлере, не в репозитории (см. `DeleteDrugHandler`)
- **Helper классы** — `internal static` (см. `IntakeLogHelper`)

## Чеклист

- [ ] DTO в `{Feature}/Dto/`
- [ ] Command/Query implements `IRequest<T>`
- [ ] Handler implements `IRequestHandler<TRequest, TResponse>`
- [ ] Интерфейс репозитория в `Common/Interfaces.cs`
- [ ] Primary constructor для DI
- [ ] `CancellationToken` прокидывается
- [ ] Логирование для Create/Update/Delete операций
