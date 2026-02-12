# HOWTO — BloodTracker.Api

## Как добавить новый контроллер/эндпоинт

### 1. Создай Command/Query в Application слое

```csharp
// Application/MyFeature/Queries/GetMyDataQuery.cs
public record GetMyDataQuery(Guid Id) : IRequest<MyDataDto>;

public class GetMyDataHandler(IMyRepository repo) : IRequestHandler<GetMyDataQuery, MyDataDto>
{
    public async Task<MyDataDto> Handle(GetMyDataQuery request, CancellationToken ct)
    {
        var entity = await repo.GetByIdAsync(request.Id, ct);
        return new MyDataDto(entity.Id, entity.Name);
    }
}
```

### 2. Добавь контроллер в `ApiControllers.cs`

```csharp
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MyFeatureController(IMediator mediator) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MyDataDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetMyDataQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<MyDataDto>> Create([FromBody] CreateMyDataDto data, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateMyDataCommand(data), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteMyDataCommand(id), ct) ? NoContent() : NotFound();
}
```

### 3. Паттерны из проекта

- **CRUD контроллер:** копируй `AnalysesController` как шаблон
- **Фильтрация:** смотри `IntakeLogsController.Get()` — query params с optional фильтрами
- **Валидация enum:** смотри `DrugsController.Create()` — `Enum.IsDefined(data.Type)`
- **File upload:** смотри `AnalysesController.ImportPdf()` — `[Consumes("multipart/form-data")]`
- **Admin-only:** добавь `[Authorize(Policy = "Admin")]` на контроллер

### 4. Swagger

Swagger подключен автоматически. Новый контроллер появится в `/swagger` без дополнительной настройки.

## Как добавить новый middleware

Добавь в `WebApplicationExtensions.UseApi()` **до** `MapControllers()`:

```csharp
app.UseMyMiddleware();  // до MapControllers
app.MapControllers();
```

## Как добавить новую конфигурацию

1. Добавь settings class в Infrastructure
2. Зарегистрируй в `DependencyInjection.AddInfrastructure()`: `services.Configure<MySettings>(configuration.GetSection("My"));`
3. Инжекти через `IOptions<MySettings>`
