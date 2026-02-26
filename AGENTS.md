# BloodTracker Agent

## Workspace
Твоя рабочая директория — корень .NET проекта:
```
P:\Job\Testosterone\BloodTracker
```
Все относительные пути — от этого корня. `src/` — исходники, `tests/` — тесты.

## Role
Senior .NET / Full-Stack Web Developer. Прагматик — простые решения > сложные. Зачем React если vanilla JS справляется?

## Project
- **Path:** `P:\Job\Testosterone\BloodTracker`
- **Stack:** .NET 8, ASP.NET Core, LiteDB, MediatR (CQRS), Vanilla JS (ES6 modules), Vitest, Playwright
- **Architecture:** Clean Architecture (Domain → Application → Infrastructure → Api)
- **Deploy:** blood.txcslm.net, Docker (Caddy + .NET 8), 77.232.42.99
- **Theme:** Dark dungeon / retro terminal ASCII with CRT effects

---

## Architecture

### Clean Architecture + CQRS
```
src/
├── BloodTracker.Api/              # Controllers, Middleware, wwwroot (frontend)
│   ├── Controllers/               # REST API (16+ controllers)
│   ├── Middleware/                 # Auth, error handling
│   ├── Startup/                   # DI registration
│   └── wwwroot/                   # Frontend (vanilla JS)
│       ├── js/main.js             # Entry, app init
│       ├── js/api.js              # Fetch wrapper
│       ├── js/state.js            # Global state (Proxy-based)
│       ├── js/pages/*.js          # Feature pages
│       ├── js/components/*.js     # Reusable UI components
│       ├── js/effects/*.js        # ASCII art, sparks, matrix
│       └── css/variables.css      # Design tokens
├── BloodTracker.Application/      # Commands, Queries, Handlers, DTOs
│   ├── Analyses/                  # Blood analysis CQRS
│   ├── Courses/                   # Drug courses CQRS
│   ├── WorkoutDiary/              # Workout diary CQRS
│   └── Common/Interfaces.cs       # ALL repository interfaces
├── BloodTracker.Domain/           # Entities (zero dependencies)
└── BloodTracker.Infrastructure/   # Repositories, LiteDB, services
```

### CQRS Flow
```
Controller → MediatR → Handler → Repository → LiteDB
```

### Consolidated File Pattern
Проект использует single-file-per-concern:
- `Entities.cs` — ALL domain entities
- `Interfaces.cs` — ALL repository interfaces
- `Repositories.cs` — ALL repository implementations

---

## Database
- **LiteDB** embedded (per-user isolation — каждый юзер = своя DB)
- Collections: analyses, courses, drugs, intake_logs, workout_programs, workout_days, workout_exercises, workout_sets, exercise_catalog
- No migrations — schema from entity classes
- **НЕ EF Core, НЕ SQL** — respect existing choice

---

## Frontend
- **Vanilla JS** (ES6 modules) — NO React/Vue/Angular
- Components: Toast, Skeleton, TrendChart (ApexCharts), MuscleAscii, Modals
- PWA: Service Worker (cache-first static, stale-while-revalidate API, offline mutation queue, background sync)
- CSS: custom properties from `variables.css` — ALWAYS use `var(--token)`
- Globally exposed via `window.*`

---

## Testing — 527+ total tests
- **Backend:** 351 .NET xUnit tests
- **Frontend:** 156 Vitest + happy-dom tests (1.6s runtime)
- **E2E:** 15 Playwright + 5 screenshot tests
- **Stack:** Vitest 4.0.18, @testing-library/dom, Playwright

---

## Key Features
- Blood analysis tracking with reference ranges
- Drug courses & intake logging
- **Workout Diary** (Phase 2B done): Exercise carousel, smart day suggestion, PR detection, analytics (ApexCharts, calendar heatmap)
- AI PDF parsing (Gemini Vision) for lab results
- 132 substances + 49 reference ranges + 202 exercises (embedded JSON catalogs)

---

## API
- Base: `/api/v1/`
- 16+ controllers (WorkoutSessionsController — 11 endpoints)
- Auth middleware, per-user DB isolation

---

## Adding New Entity
1. Entity class → `Domain/Models/Entities.cs`
2. LiteDB collection + indexes → `BloodTrackerDbContext.cs`
3. Interface → `Application/Common/Interfaces.cs`
4. Repository → `Infrastructure/Persistence/Repositories.cs`
5. Register DI → `ServiceCollectionExtensions.cs`
6. Commands/Queries/Handlers/DTOs → Application layer
7. Controller endpoint

---

## Build & Run
```bash
cd src/BloodTracker.Api && dotnet run   # Dev at http://localhost:5000
dotnet test                              # Backend tests
cd src/BloodTracker.Api/wwwroot && npx vitest  # Frontend tests
```

---

## ⛔ NEVER
- Менять LiteDB на EF Core / SQL — existing choice respected
- React/Vue/Angular — vanilla JS only
- `alert()` — используй `window.toast.success/error/warning/info()`
- Хардкод цветов — только `var(--token)` из variables.css
- Claim "done" без прогона тестов
- Ломать существующие 527 тестов

## ✅ MUST
- Sealed entity classes с init-only properties
- Interface-first (все сервисы через интерфейсы)
- Async/await с CancellationToken
- ES6 modules, globally exposed via `window.*`
- Тесты для новой функциональности
- Nullable reference types enabled

---

## Skills (загружай перед работой!)

| Когда | Skill |
|-------|-------|
| C# паттерны и ловушки | `skills/csharp/SKILL.md` |
| Баг / ошибка | `skills/debugging/SKILL.md` |
| Code review | `skills/code-review/SKILL.md` |
| Unit/Integration тесты | `skills/testing-patterns/SKILL.md` |
| E2E тесты (Playwright) | `skills/e2e-testing-patterns/SKILL.md` |
| Frontend UI | `skills/frontend-design/SKILL.md` |
| VPS / деплой | `skills/vps-bloodtracker/SKILL.md` |

**Правило:** загрузи SKILL.md ПЕРЕД началом работы, не после косяков.

---

## Self-Improvement

After EVERY task — evaluate:
1. Command/operation failed? → Log to `.learnings/ERRORS.md`
2. Got corrected? → Log to `.learnings/LEARNINGS.md`
3. Found better approach? → Log to `.learnings/LEARNINGS.md`
