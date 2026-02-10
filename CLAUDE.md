# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BloodTracker is a desktop health monitoring application built with **.NET 8** and **Electron.NET**. It tracks blood analyses, medication courses, and workout programs with AI-powered PDF analysis from medical laboratories. The UI uses a **dark dungeon/retro terminal ASCII theme** with CRT effects.

**Tech Stack:** .NET 8 / ASP.NET Core, Electron.NET 23.6.2, Vanilla JavaScript (ES6 modules), LiteDB (embedded NoSQL)

## Build & Run Commands

```powershell
# Development (browser mode at http://localhost:5000)
cd src/BloodTracker.Api
dotnet run

# Build packaged Electron app
./build.ps1
./build.ps1 -Configuration Release
./build.ps1 -Clean

# Restore dependencies
dotnet restore
```

**Build output:** `src/BloodTracker.Api/bin/Desktop/`

There are **no tests** and **no linting/formatting configuration** in this project.

## Architecture

Clean Architecture with CQRS pattern (MediatR). Four projects in the solution:

```
src/
├── BloodTracker.Api/           # Controllers, Electron entry, wwwroot (frontend)
├── BloodTracker.Application/   # Commands, Queries, Handlers, DTOs
├── BloodTracker.Domain/        # Entities (no dependencies)
└── BloodTracker.Infrastructure/ # Repositories, external services, LiteDB
```

### Consolidated File Pattern

This project uses a **single-file-per-concern** pattern — all related items are grouped into one file rather than one-class-per-file:

- `src/BloodTracker.Api/Controllers/ApiControllers.cs` — All REST controllers (Analyses, Courses, Drugs, IntakeLogs, Workouts, etc.)
- `src/BloodTracker.Application/Common/Interfaces.cs` — All repository/service interfaces
- `src/BloodTracker.Domain/Models/Entities.cs` — All domain entities and enums
- `src/BloodTracker.Infrastructure/Persistence/Repositories.cs` — All repository implementations

### Key Files

- `src/BloodTracker.Api/Startup/Program.cs` — Electron.NET + Serilog + DI configuration
- `src/BloodTracker.Infrastructure/Persistence/BloodTrackerDbContext.cs` — LiteDB context with collection indexes
- `src/BloodTracker.Infrastructure/Services/PdfParserService.cs` — PDF OCR + Gemini Vision, name mappings for 50+ blood parameters
- `src/BloodTracker.Infrastructure/Services/ReferenceRangeService.cs` — Blood test reference ranges

### CQRS Flow

Commands/Queries in Application layer, handlers use MediatR:

```csharp
// Controller → MediatR → Handler → Repository
CreateAnalysisCommand → CreateAnalysisHandler → IAnalysisRepository
GetAnalysisQuery → GetAnalysisHandler → returns AnalysisDto
```

Each domain area (Analyses, Courses, Workouts) has its own Commands/, Queries/, Handlers/, and Dto/ folders under `src/BloodTracker.Application/`.

### Frontend Structure (wwwroot/)

- `js/main.js` — Entry point, app initialization, page loading
- `js/api.js` — Fetch wrapper for all API calls (base URL auto-detection)
- `js/state.js` — Global application state object
- `js/pages/*.js` — Feature pages: dashboard, analyses, compare, course, workouts
- `js/components/*.js` — Reusable UI: navigation, modals, purchaseModals, workoutModals, color-picker, toast, skeleton, trendChart, muscleAscii
- `js/effects/*.js` — Visual effects: ascii-art, sparks, matrix-runes, progress-bar
- `css/variables.css` — Design tokens (colors, spacing, typography, shadows, z-index, responsive breakpoints)
- `css/` — Modular CSS: base, layout, components, modals, tables, effects, animations, toast, skeleton

### UI Component Systems

- **Toast notifications** (`js/components/toast.js` + `css/toast.css`) — `window.toast.success/error/warning/info()`. All user feedback uses toast instead of `alert()`.
- **Skeleton loading** (`js/components/skeleton.js` + `css/skeleton.css`) — `window.skeleton.stats()`, `.tableRows()`, `.drugCards()`, etc.
- **Trend charts** (`js/components/trendChart.js`) — ApexCharts integration with reference range annotations. `window.renderTrendChart()`, `window.destroyTrendChart()`.
- **Modals** use `body.modal-open` class for scroll lock. All modal open/close functions must toggle this.

## Database

LiteDB embedded database (`bloodtracker.db`). Collections: analyses, courses, drugs, intake_logs, workout_programs, workout_days, workout_exercises, workout_sets, exercise_catalog. No migrations needed — schema is defined by domain entity classes.

## API Endpoints

REST at `/api/[controller]`. Swagger at `/swagger`. Health check at `/healthz`.

## Configuration

`appsettings.json` contains database connection (`Database:ConnectionString`), Gemini API key (`Gemini:ApiKey`), and ExerciseDB API credentials (`ExerciseCatalog:ApiKey`, `ExerciseCatalog:ApiUrl`).

## Conventions

- Nullable reference types enabled, latest C# version
- Interface-first design (all services have interfaces in `Interfaces.cs`)
- Sealed entity classes with init-only properties
- ES6 modules for frontend JavaScript, globally exposed via `window.*`
- Async/await with CancellationToken support throughout
- Mapster for DTO mapping, FluentValidation for request validation
- CSS uses design tokens from `variables.css` — always use CSS custom properties (e.g., `var(--color-primary)`) rather than hardcoded values

## Adding a New Blood Parameter

1. Add name mappings in `PdfParserService.cs` → `NameMappings` dictionary
2. Add expected value range in `PdfParserService.cs` → `ExpectedRanges` dictionary
3. Add reference range in `ReferenceRangeService.cs` with Key, Name, Min, Max, Unit, Category, Description

## Adding a New Entity

1. Add entity class to `BloodTracker.Domain/Models/Entities.cs`
2. Add LiteDB collection + indexes to `BloodTrackerDbContext.cs`
3. Add repository interface to `BloodTracker.Application/Common/Interfaces.cs`
4. Implement repository in `BloodTracker.Infrastructure/Persistence/Repositories.cs`
5. Register in DI (`ServiceCollectionExtensions.cs`)
6. Create Commands/Queries/Handlers/DTOs in Application layer
7. Add controller to `ApiControllers.cs`
