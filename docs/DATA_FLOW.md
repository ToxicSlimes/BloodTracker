# Data Flow — Полный поток данных

## Общая схема

```
Browser (JS)
    │
    ▼ HTTP (fetch)
┌──────────────────────────┐
│  ASP.NET Core Pipeline   │
│  ├─ Swagger middleware   │
│  ├─ Static files         │
│  ├─ CORS (AllowAll)      │
│  ├─ Authentication (JWT) │
│  ├─ Authorization        │
│  └─ Routing              │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  Controller (Api)        │  ← ApiControllers.cs
│  Принимает HTTP request  │
│  Создаёт Command/Query   │
│  Отправляет в MediatR    │
└──────────┬───────────────┘
           ▼ IMediator.Send()
┌──────────────────────────┐
│  Handler (Application)   │  ← *Handlers.cs
│  Бизнес-логика           │
│  Вызывает Repository     │
│  Маппит Entity → DTO     │
└──────────┬───────────────┘
           ▼ IRepository.*Async()
┌──────────────────────────┐
│  Repository (Infra)      │  ← Repositories.cs
│  Работает с LiteDB       │
│  CRUD операции            │
└──────────┬───────────────┘
           ▼ ILiteCollection<T>
┌──────────────────────────┐
│  LiteDB                  │  ← bloodtracker.db
│  BSON документы           │
│  Файловое хранилище      │
└──────────────────────────┘
```

---

## Пример: Создание анализа

### 1. Frontend → API

```javascript
// js/api.js
const response = await fetch('/api/analyses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ date: '2025-01-15', label: 'Кровь общий', values: { hemoglobin: 155 } })
});
```

### 2. Controller → MediatR

```csharp
// ApiControllers.cs — AnalysesController
[HttpPost]
public async Task<ActionResult<AnalysisDto>> Create(CreateAnalysisCommand command, CancellationToken ct)
    => Ok(await _mediator.Send(command, ct));
```

### 3. Handler — бизнес-логика

```csharp
// AnalysisHandlers.cs
public async Task<AnalysisDto> Handle(CreateAnalysisCommand request, CancellationToken ct)
{
    var analysis = request.Adapt<Analysis>();      // Mapster: Command → Entity
    analysis.Id = Guid.NewGuid();
    analysis.CreatedAt = DateTime.UtcNow;
    
    var created = await _repository.CreateAsync(analysis, ct);
    return created.Adapt<AnalysisDto>();           // Mapster: Entity → DTO
}
```

### 4. Repository → LiteDB

```csharp
// Repositories.cs
public Task<Analysis> CreateAsync(Analysis analysis, CancellationToken ct)
{
    _collection.Insert(analysis);                  // LiteDB Insert (BSON)
    return Task.FromResult(analysis);
}
```

### 5. Ответ клиенту

```
HTTP 200 OK
{ "id": "...", "date": "2025-01-15", "label": "Кровь общий", "values": { "hemoglobin": 155 } }
```

---

## Пример: Импорт PDF

```
POST /api/analyses/import-pdf (multipart/form-data)
    │
    ▼ Controller
ImportPdfCommand(file)
    │
    ▼ Handler
IPdfParserService.ParseAnalysisPdfAsync(stream)
    │
    ├─► Docnet.Core: PDF → страницы (изображения, масштаб 3x)
    ├─► OpenCV: grayscale → CLAHE → адаптивная бинаризация
    ├─► Tesseract OCR: изображение → текст (ru+eng)
    ├─► Парсинг: группировка слов в строки → поиск NameMappings → извлечение чисел
    ├─► Валидация: проверка по ExpectedRanges
    │
    ├─► (опционально) Gemini Vision API: все страницы → JSON → маппинг
    │
    ▼ PdfAnalysisResult { Date, Laboratory, Values, UnrecognizedItems }
    │
    ▼ Handler создаёт Analysis entity
    │
    ▼ Repository.CreateAsync() → LiteDB
    │
    ▼ AnalysisDto → HTTP 200
```

---

## Пример: Сравнение анализов

```
GET /api/analyses/compare?beforeId=X&afterId=Y
    │
    ▼ CompareAnalysesQuery
    │
    ▼ Handler
    ├─ repository.GetByIdAsync(beforeId)
    ├─ repository.GetByIdAsync(afterId)
    ├─ Для каждого общего показателя:
    │   ├─ percentChange = (after - before) / before * 100
    │   ├─ beforeStatus = referenceRangeService.GetStatus(key, before)
    │   └─ afterStatus = referenceRangeService.GetStatus(key, after)
    │
    ▼ ComparisonDto → HTTP 200
```

---

## Per-User Data Isolation

```
JWT Token → IUserContext.UserId
    │
    ▼ BloodTrackerDbContext
    Filename = data/{userId}.db      ← каждый пользователь = свой файл LiteDB
    │
    ▼ Все репозитории работают с user-specific DB
```

`DataMigrationService.MigrateIfNeeded()` при старте мигрирует legacy single-user `bloodtracker.db` → per-user файлы.

---

## Потоки данных по модулям

| Поток | Компоненты |
|-------|-----------|
| CRUD анализов | JS → AnalysesController → MediatR → AnalysisHandlers → AnalysisRepository → LiteDB |
| Курсы + препараты | JS → CoursesController/DrugsController → MediatR → CourseHandlers → CourseRepository/DrugRepository → LiteDB |
| Тренировки | JS → WorkoutControllers → MediatR → WorkoutHandlers → WorkoutRepositories → LiteDB |
| PDF импорт | JS (upload) → AnalysesController → PdfParserService (Docnet+OpenCV+Tesseract/Gemini) → AnalysisRepository → LiteDB |
| Auth | JS → AuthController → AuthService (Google OAuth + JWT) → AuthDbContext (LiteDB) |
| Каталог упражнений | JS → ExerciseCatalogController → ExerciseCatalogService → RapidAPI (+ LiteDB кэш 24ч) |
| Алерты | JS → AnalysesController → ReferenceRangeService.GetStatus() → in-memory ranges |
