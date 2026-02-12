# Техдолг и улучшения — BloodTracker.Api

## Высокий приоритет

### Все контроллеры в одном файле
`ApiControllers.cs` содержит ~500 строк и 14 контроллеров. При росте проекта стоит разбить на отдельные файлы по контроллеру.

### Отсутствует глобальный exception handler
Исключения обрабатываются вручную в каждом контроллере (try/catch в `DrugStatisticsController`). Нужен `IExceptionHandler` или middleware для единообразных ответов на ошибки.

### Нет валидации через FluentValidation
Валидация вручную в контроллерах (`Enum.IsDefined`, `Quantity > 0`). Стоит вынести в FluentValidation + MediatR pipeline behavior.

### CORS "AllowAll"
Для production нужна более строгая CORS policy с конкретными origins.

## Средний приоритет

### AdminController напрямую работает с DbContext
`AdminController` создаёт `BloodTrackerDbContext` вручную для чтения данных других пользователей. Стоит вынести в Application слой через admin-specific queries.

### Swagger без авторизации
Swagger UI не настроен для передачи JWT токена. Для тестирования protected эндпоинтов нужно добавить `SecurityDefinition` и `SecurityRequirement`.

### Нет rate limiting
Публичные эндпоинты (`/api/auth/send-code`) не защищены от брутфорса. Нужен rate limiting middleware.

### Нет API versioning
Все эндпоинты на `/api/` без версии. При изменении контрактов будут breaking changes.

## Низкий приоритет

### Healthcheck минимальный
`/healthz` возвращает только `{ status: "healthy" }`. Стоит добавить проверку БД и внешних сервисов.

### Нет OpenAPI описаний
Эндпоинты не имеют `[ProducesResponseType]`, `/// <summary>` XML-комментариев. Swagger документация минимальна.

### Dev-mode JWT без подписи
В dev-mode JWT токен не валидируется (`RequireSignedTokens = false`). Это удобно для разработки, но опасно если случайно попадёт в production.
