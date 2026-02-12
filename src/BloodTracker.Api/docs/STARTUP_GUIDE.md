# STARTUP GUIDE — BloodTracker.Api

## Pipeline запуска (Program.cs)

```
1. WebApplication.CreateBuilder(args)
2. builder.WebHost.UseElectron(args)          ← Electron.NET интеграция
3. Serilog configuration                      ← Console + File логирование
4. builder.Services.AddApiServices()          ← Вся DI регистрация
5. app.Build()
6. DataMigrationService.MigrateIfNeeded()     ← Миграция single→per-user DB
7. DrugCatalogSeedService.SeedIfNeeded()      ← Сид каталога препаратов
8. app.UseApi()                               ← Middleware pipeline
9. app.StartAsync()
10. Electron window (если Electron active)     ← Десктоп окно
11. app.WaitForShutdown()
```

## DI регистрация (ServiceCollectionExtensions.cs)

### Порядок регистрации

```csharp
services.AddControllers();
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();
services.AddCors("AllowAll");
services.AddElectron();                    // Electron.NET DI

// JWT Authentication
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => { ... });

// Authorization policies
services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => policy.RequireClaim("role", "admin"));
});

services.AddHttpContextAccessor();
services.AddApplication();                 // MediatR, FluentValidation, Mapster
services.AddInfrastructure(configuration); // Repositories, Services, DbContexts
```

### JWT конфигурация

**Production** (Jwt:Secret задан):
- Полная валидация: Issuer, Audience, Lifetime, SigningKey
- ClockSkew: 1 минута
- Claims: `sub` (userId), `email`, `name`, `role` (admin)

**Development** (Jwt:Secret пустой):
- Без валидации подписи (`RequireSignedTokens = false`)
- Принимает любой JWT токен

### Ключевые настройки

```json
{
  "Jwt": { "Secret": "...", "Issuer": "BloodTracker", "ExpiresInDays": 30 },
  "Database": { "ConnectionString": "Filename=data/bloodtracker.db;Connection=shared" },
  "Google": { "ClientId": "...", "ClientSecret": "...", "RefreshToken": "..." },
  "Email": { "SmtpHost": "...", "SmtpPort": 587, "SmtpUser": "...", "SmtpPass": "..." },
  "Admin": { "Emails": ["admin@example.com"] },
  "Gemini": { "ApiKey": "..." }
}
```

## Middleware Pipeline (WebApplicationExtensions.cs)

```
app.UseSwagger()
app.UseSwaggerUI()

// Static files (SPA)
app.UseDefaultFiles()          ← index.html как default
app.UseStaticFiles()           ← JS/CSS с no-cache headers
app.MapFallbackToFile()        ← SPA routing fallback

app.UseCors("AllowAll")
app.UseAuthentication()
app.UseAuthorization()
app.MapControllers()

app.MapGet("/healthz")         ← Health check endpoint
```

### SPA hosting

- **Обычный режим:** файлы из `wwwroot/`
- **Single-file publish:** файлы из embedded resources (`EmbeddedFileProvider`)
- **Cache:** JS/CSS отдаются с `Cache-Control: no-cache` (предотвращает stale modules)

### Electron.NET

```csharp
if (HybridSupport.IsElectronActive)
{
    var window = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions
    {
        Title = "🩸 BloodTracker",
        Width = 1400, Height = 900,
        MinWidth = 1000, MinHeight = 700,
        Show = false,                    // Показать после OnReadyToShow
        AutoHideMenuBar = true,
        WebPreferences = new WebPreferences
        {
            NodeIntegration = false,     // Безопасность
            ContextIsolation = true
        }
    });
}
```

Закрытие окна → `Electron.App.Quit()` → завершение приложения.

## Startup-сервисы

### DataMigrationService

Запускается **один раз** при старте. Три фазы:
1. **Миграция старой DB:** если `bloodtracker.db` существует и нет пользователей → создаёт placeholder user, копирует DB в `user_{id}.db`
2. **Переназначение:** когда реальный пользователь логинится → данные placeholder передаются ему
3. **Усыновление orphan DB:** если есть `user_*.db` без соответствующего пользователя → присоединяет к первому админу

### DrugCatalogSeedService

Сидит каталог препаратов при запуске. Версионирован (`CurrentVersion = 3`):
- Проверяет `_metadata.seed_version` в catalog.db
- Если версия устарела → полная пересидка (DeleteAll + InsertBulk)
- ~80 субстанций + ~70 производителей

## Порты и режимы

| Режим | URL | Команда |
|-------|-----|---------|
| Browser | http://localhost:5000 | `dotnet run` |
| Electron | Electron window | `electronize start` |
| Swagger | http://localhost:5000/swagger | Автоматически |
| Health | http://localhost:5000/healthz | Автоматически |
