# Техдолг и улучшения — BloodTracker.Infrastructure

## Высокий приоритет

### Репозитории — sync обёртки над LiteDB
Все репозитории возвращают `Task.FromResult()` — это не настоящий async. LiteDB не поддерживает async, но обёртки создают ложное впечатление асинхронности. При миграции на другую БД нужно будет сделать по-настоящему async.

### PdfParserService — монструозный файл
`PdfParserService.cs` ~600 строк с OCR-логикой, маппингом, предобработкой изображений, Gemini интеграцией. Стоит разбить на:
- `GeminiPdfParser` (primary)
- `OcrPdfParser` (fallback)
- `BloodTestNameMapper`
- `ImagePreprocessor`

### Все репозитории в одном файле
`Repositories.cs` содержит 10 репозиториев. Код дублируется (CRUD бойлерплейт). Стоит сделать generic base repository.

### Gmail access token кешируется в instance-переменной
`AuthService._gmailAccessToken` хранится в поле scoped-сервиса. При каждом запросе создаётся новый экземпляр → токен не кешируется между запросами. Нужен singleton cache или `IMemoryCache`.

## Средний приоритет

### DrugCatalogSeedService — hardcoded данные
130+ субстанций захардкожены в C# коде. Стоит вынести в JSON/YAML файл для удобства редактирования.

### ReferenceRangeService — hardcoded диапазоны
40+ референсных диапазонов в Dictionary. Нет возможности кастомизации пользователем. Стоит хранить в БД с возможностью переопределения.

### DataMigrationService — сложная логика
3 фазы миграции с множеством edge cases. Нет unit-тестов. Миграция запускается при каждом старте — стоит добавить флаг "migration completed".

### ExerciseCatalogService кеширует в per-user БД
Каталог упражнений одинаковый для всех пользователей, но кешируется в `BloodTrackerDbContext` (per-user). Стоит вынести в `CatalogDbContext`.

## Низкий приоритет

### Tesseract OCR данные скачиваются при первом запуске
Если нет интернета — OCR fallback не работает. Стоит включить tessdata в образ Docker.

### Нет retry policy для внешних API
`GeminiVisionService` и `ExerciseCatalogService` не используют Polly для retry/circuit breaker.

### Нет метрик
Отсутствуют счётчики запросов к внешним API, время парсинга PDF, размеры БД.
