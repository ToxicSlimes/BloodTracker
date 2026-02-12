# DO / DON'T — BloodTracker.Infrastructure

## ✅ DO

- **Используй `Connection=shared`** в LiteDB connection strings — без этого concurrent access падает
- **Singleton для AuthDbContext и CatalogDbContext** — это общие БД, не per-user
- **Scoped для BloodTrackerDbContext** — он привязан к текущему пользователю через `IUserContext`
- **Всегда проверяй `IUserContext.IsAuthenticated`** перед доступом к per-user данным
- **Версионируй seed данные** — `DrugCatalogSeedService` использует `CurrentVersion` в metadata
- **Graceful degradation** для внешних API — ExerciseCatalogService возвращает кеш если API недоступен
- **Логируй ошибки внешних API** с контекстом (status code, response body)
- **Валидируй extracted values** — `PdfParserService` проверяет значения по `ExpectedRanges`

## ❌ DON'T

- **НЕ используй `IOptions<T>` напрямую** в singleton сервисах если значения могут меняться — используй `IOptionsMonitor<T>`
- **НЕ создавай BloodTrackerDbContext вручную** вне DI (исключение: `AdminController` для чтения чужих данных)
- **НЕ забывай `EnsureIndex`** при добавлении новых коллекций — индексы создаются в конструкторе DbContext
- **НЕ блокируй async** — репозитории используют `Task.FromResult` обёртки, но сервисы должны быть по-настоящему async
- **НЕ хардкодь API ключи** — всё через `IConfiguration` с fallback на env variables
- **НЕ кидай исключения для ожидаемых ситуаций** — `GetById` возвращает `null`, а не throws
- **НЕ меняй порядок фаз миграции** в `DataMigrationService` — Phase 1 → 2 → 3 последовательно
- **НЕ удаляй `Dispose()`** из DbContext — LiteDB держит файловые дескрипторы
