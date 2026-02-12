# Architecture

## Общая схема

```
┌─────────────────────────────────────────────────┐
│                  Electron.NET                    │
│  ┌─────────────────────────────────────────────┐ │
│  │              BloodTracker.Api               │ │
│  │  Controllers ← MediatR ← Swagger           │ │
│  │  wwwroot/ (JS SPA + CSS + ApexCharts)       │ │
│  └──────────────────┬──────────────────────────┘ │
│                     │                            │
│  ┌──────────────────▼──────────────────────────┐ │
│  │          BloodTracker.Application           │ │
│  │  Commands / Queries / Handlers / DTOs       │ │
│  │  ┌──────────┬──────────┬──────────┐         │ │
│  │  │ Analyses │ Courses  │ Workouts │         │ │
│  │  └──────────┴──────────┴──────────┘         │ │
│  │  Common/Interfaces.cs (все контракты)       │ │
│  └──────────────────┬──────────────────────────┘ │
│                     │                            │
│  ┌──────────────────▼──────────────────────────┐ │
│  │            BloodTracker.Domain              │ │
│  │  Entities.cs (все сущности + enums)         │ │
│  └─────────────────────────────────────────────┘ │
│                     │                            │
│  ┌──────────────────▼──────────────────────────┐ │
│  │         BloodTracker.Infrastructure         │ │
│  │  Persistence/                               │ │
│  │    BloodTrackerDbContext (LiteDB)            │ │
│  │    AuthDbContext, CatalogDbContext            │ │
│  │    Repositories.cs                          │ │
│  │  Services/                                  │ │
│  │    AuthService, PdfParserService             │ │
│  │    GeminiVisionService, DrugCatalogService   │ │
│  │    DataMigrationService, ReferenceRangeService│ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Поток данных (CQRS)

```
HTTP Request
  → Controller (Api)
    → MediatR.Send(Command/Query)
      → Handler (Application)
        → Repository/Service (Infrastructure)
          → LiteDB / External API
        ← DTO
      ← Response
    ← JSON
  ← HTTP Response
```

## Ключевые решения

### Consolidated File Pattern
Вместо one-class-per-file — все связанные классы в одном файле:
- `Entities.cs` — все доменные сущности
- `ApiControllers.cs` — все контроллеры
- `Repositories.cs` — все репозитории
- `Interfaces.cs` — все интерфейсы

### Per-user изоляция
Каждый пользователь получает собственную LiteDB базу (`/data/{userId}/bloodtracker.db`). AuthDbContext и CatalogDbContext — общие.

### AI Pipeline
PDF анализ крови → PdfParserService (OCR) → GeminiVisionService (Gemini API) → нормализация параметров → сохранение в БД.

## Зависимости между слоями

```
Api → Application → Domain
Api → Infrastructure
Infrastructure → Application (interfaces)
Infrastructure → Domain (entities)
```

Domain не зависит ни от чего — чистый слой.
