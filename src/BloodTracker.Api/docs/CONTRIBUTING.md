# CONTRIBUTING — BloodTracker.Api

## Структура модуля

```
Api/
├── Program.cs                              # Entry point, Electron, Serilog, миграции
├── Controllers/
│   └── ApiControllers.cs                   # ВСЕ контроллеры в одном файле
└── Startup/
    ├── ServiceCollectionExtensions.cs      # DI, Auth, CORS, Swagger
    └── WebApplicationExtensions.cs         # Middleware pipeline, SPA fallback
```

## Как добавить новый контроллер

### 1. Добавь в `Controllers/ApiControllers.cs`

Все контроллеры живут в **одном файле**, разделённые комментариями-разделителями:

```csharp
// ═══════════════════════════════════════════════════════════════════════════════
// MY NEW CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MyEntitiesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<MyEntityDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllMyEntitiesQuery(), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MyEntityDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetMyEntityByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<MyEntityDto>> Create([FromBody] CreateMyEntityDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateMyEntityCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MyEntityDto>> Update(Guid id, [FromBody] UpdateMyEntityDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateMyEntityCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteMyEntityCommand(id), ct) ? NoContent() : NotFound();
}
```

### 2. Конвенции

| Аспект | Правило |
|--------|---------|
| Авторизация | `[Authorize]` на класс, `[Authorize(Policy = "Admin")]` для админских |
| Route | `api/[controller]` (автоименование) |
| DI | Primary constructor: `(IMediator mediator)` |
| Return | `ActionResult<T>` с `Ok()`, `NotFound()`, `NoContent()`, `BadRequest()` |
| CancellationToken | Всегда последний параметр |
| Валидация | Дублируй критичные проверки (enum, диапазоны) перед отправкой в MediatR |

### 3. Уровни доступа

| Decorator | Кто имеет доступ |
|-----------|-----------------|
| Без атрибута | Все (public) — `AuthController` |
| `[Authorize]` | Аутентифицированные пользователи |
| `[Authorize(Policy = "Admin")]` | Только админы (`role: admin` в JWT) |

## Pipeline запуска

Если нужно добавить middleware или сервис, смотри:
- DI → `Startup/ServiceCollectionExtensions.cs`
- Middleware → `Startup/WebApplicationExtensions.cs`
- Startup логика → `Program.cs`

## Чеклист

- [ ] Контроллер в `Controllers/ApiControllers.cs`
- [ ] `[Authorize]` или `[Authorize(Policy = "Admin")]`
- [ ] `[ApiController]` + `[Route("api/[controller]")]`
- [ ] Primary constructor с `IMediator`
- [ ] `CancellationToken` прокидывается в `mediator.Send()`
- [ ] Swagger подхватит автоматически
