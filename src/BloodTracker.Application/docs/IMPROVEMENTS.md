# Application — Техдолг и улучшения

## 🔴 Высокий приоритет

### 1. Нет FluentValidation валидаторов
`AddValidatorsFromAssembly` зарегистрирован в DI, но **ни одного валидатора не существует**. Вся валидация — ручные `throw` в handlers:
```csharp
if (request.Data.Quantity <= 0)
    throw new ArgumentException("Quantity must be greater than 0");
```
Нужно: создать валидаторы + MediatR pipeline behavior для автоматической валидации.

### 2. CourseHandlers.cs — god file (~400 строк)
Один файл содержит handlers для четырёх сущностей: Course, Drug, IntakeLog, Purchase + helper-класс `IntakeLogHelper`. Нужно разбить:
- `CourseHandlers.cs`
- `DrugHandlers.cs`
- `IntakeLogHandlers.cs`
- `PurchaseHandlers.cs`

### 3. Inconsistent маппинг
- **Analyses & Workouts** — используют `IMapper` (Mapster)
- **Courses** — ручной маппинг через статические методы (`MapToDto`, `MapDrugDto`)
- Дублирование маппинга `Course → CourseDto` в 3 handlers (с одинаковым вычислением `CurrentDay`/`TotalDays`)

Нужно: унифицировать через Mapster TypeAdapterConfig или extension-метод.

### 4. GetAllAsync + фильтрация в памяти
Несколько handlers грузят **все** записи и фильтруют в памяти:
```csharp
// GetIntakeLogsByDrugHandler
var logs = await repository.GetAllAsync(ct);
logs = logs.Where(l => l.DrugId == request.DrugId.Value).ToList();
```
Аналогично в: `DeleteDrugHandler`, `GetDrugStatisticsHandler`, `GetInventoryHandler`, `GetConsumptionTimelineHandler`, `GetPurchaseVsConsumptionHandler`.

Нужно: добавить фильтрованные методы в репозитории или использовать `IQueryable`.

### 5. Нет обработки ошибок (кроме PDF import)
Только `ImportPdfAnalysisHandler` обёрнут в try/catch. Все остальные handlers пробрасывают исключения наверх. Нужен глобальный exception handling (MediatR pipeline behavior или middleware).

## 🟡 Средний приоритет

### 6. Нет пагинации
`GetAllAnalysesQuery`, `GetAllCoursesQuery`, `GetAllDrugsQuery`, `GetAllPurchasesQuery` — возвращают все записи без лимита. При росте данных будет проблема.

### 7. Каскадное удаление в handler — неэффективно
`DeleteDrugHandler` грузит **все** логи через `GetAllAsync()`, фильтрует по DrugId, потом удаляет по одному. Нужен bulk-метод `DeleteByDrugIdAsync`.

### 8. `GetDrugsByCourseQuery` объявлен, но handler отсутствует
Query есть в `CourseQueries.cs`, но handler для него не реализован. MediatR выбросит исключение при вызове.

### 9. `GetAllCoursesQuery` — handler отсутствует
Аналогично: query объявлен, handler не найден.

### 10. `GetAllIntakeLogsQuery` — handler отсутствует
Объявлен в queries, реализации нет.

### 11. Static-метод в другом handler
`CreateDrugHandler.MapDrugDto` используется из `GetAllDrugsHandler`, `UpdateDrugHandler`, `GetDashboardHandler`. Стоит вынести в отдельный helper или маппинг-конфигурацию.

## 🟢 Низкий приоритет

### 12. Нет unit-тестов
Application-слой идеально подходит для тестирования (чистые handlers с моками репозиториев), но тестов нет.

### 13. Нет MediatR Pipeline Behaviors
Потенциальные behaviors:
- `ValidationBehavior` — автовалидация через FluentValidation
- `LoggingBehavior` — единообразное логирование всех запросов
- `PerformanceBehavior` — замер времени выполнения

### 14. Нет кэширования
Каталожные данные (`IDrugCatalogService`, `IReferenceRangeService`) вызываются каждый раз. Стоит добавить кэширование для read-only каталогов.

### 15. `PdfAnalysisResult` в Common/Interfaces.cs
Record `PdfAnalysisResult` определён вместе с интерфейсами. Логичнее вынести в `Analyses/Dto/` или отдельный файл.
