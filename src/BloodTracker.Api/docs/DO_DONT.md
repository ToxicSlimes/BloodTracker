# DO / DON'T — BloodTracker.Api

## ✅ DO

- **Используй MediatR** для всей бизнес-логики (Commands/Queries в Application слое)
- **Все protected эндпоинты** помечай `[Authorize]` на уровне контроллера
- **Возвращай правильные HTTP-коды:** `CreatedAtAction` для POST, `NoContent` для DELETE, `NotFound` если не нашёл
- **Проверяй `CancellationToken`** — передавай его в MediatR и сервисы
- **Валидируй входные данные** в контроллере (enum, обязательные поля, бизнес-правила типа `Quantity > 0`)
- **Primary constructors** для DI (как в текущем коде)
- **Один файл** для всех контроллеров (`ApiControllers.cs`) — проект небольшой, это удобно
- **Логируй** через `ILogger<T>`, не через `Console.WriteLine`

## ❌ DON'T

- **НЕ клади бизнес-логику в контроллеры** — только маршрутизация, валидация, HTTP-коды
- **НЕ используй `[AllowAnonymous]` без причины** — только AuthController имеет публичные эндпоинты
- **НЕ отключай JWT валидацию в production** — dev-mode без секрета только для разработки
- **НЕ возвращай исключения клиенту напрямую** — ловлю исключения (как в `DrugStatisticsController.GetDrugStatistics`)
- **НЕ обращайся к `BloodTrackerDbContext` напрямую из контроллеров** — только через MediatR/репозитории (исключение: `AuthController` и `AdminController` для auth DB)
- **НЕ храни секреты в коде** — всё через конфигурацию/env variables
- **НЕ меняй CORS policy** `AllowAll` на более строгую без проверки Electron — десктоп клиент использует localhost
- **НЕ добавляй middleware после `MapControllers()`** — порядок важен
