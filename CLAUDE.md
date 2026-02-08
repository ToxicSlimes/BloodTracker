# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BloodTracker is a desktop health monitoring application built with **.NET 8** and **Electron.NET**. It tracks blood analyses, medication courses, and workout programs with AI-powered PDF analysis from medical laboratories.

**Tech Stack:** .NET 8 / ASP.NET Core, Electron.NET 23.6.2, Vanilla JavaScript, LiteDB (embedded NoSQL)

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

## Architecture

Clean Architecture with CQRS pattern (MediatR):

```
src/
├── BloodTracker.Api/           # Controllers, Electron entry, wwwroot (frontend)
├── BloodTracker.Application/   # Commands, Queries, Handlers, DTOs
├── BloodTracker.Domain/        # Entities (no dependencies)
└── BloodTracker.Infrastructure/ # Repositories, external services, LiteDB
```

### Key Files

- `src/BloodTracker.Api/Controllers/ApiControllers.cs` - All REST controllers in single file
- `src/BloodTracker.Api/Startup/Program.cs` - Electron.NET + Serilog configuration
- `src/BloodTracker.Application/Common/Interfaces.cs` - All repository/service interfaces
- `src/BloodTracker.Domain/Models/Entities.cs` - All domain entities
- `src/BloodTracker.Infrastructure/Persistence/Repositories.cs` - All repository implementations

### Frontend Structure (wwwroot/)

- `js/api.js` - Fetch wrapper for all API calls
- `js/state.js` - Global application state
- `js/pages/*.js` - Feature modules (Dashboard, Analyses, Courses, Workouts)
- `js/components/*.js` - Reusable UI components
- `css/` - Modular CSS with variables for theming

### Backend Services

- **PdfParserService** - PDF image extraction + OCR (Tesseract) + optional Gemini Vision AI
- **GeminiVisionService** - Google Gemini 2.5 Flash Vision for intelligent data extraction
- **ReferenceRangeService** - Blood test reference values (50+ parameters)
- **ExerciseCatalogService** - ExerciseDB API integration with caching

## CQRS Pattern

Commands/Queries in Application layer, handlers use MediatR:

```csharp
// Example flow
CreateAnalysisCommand -> CreateAnalysisHandler -> IAnalysisRepository
GetAnalysisQuery -> GetAnalysisHandler -> returns AnalysisDto
```

## Database

LiteDB embedded database (`bloodtracker.db`). Collections: analyses, courses, drugs, intake_logs, workout_programs, workout_days, workout_exercises, workout_sets, exercise_catalog.

## API Endpoints

REST at `/api/[controller]`. Swagger at `/swagger`. Health check at `/healthz`.

## Configuration

`appsettings.json` contains database connection, Gemini API key, and ExerciseDB API credentials.

## Conventions

- Nullable reference types enabled, latest C# version
- Interface-first design (all services have interfaces)
- Sealed entity classes with init-only properties
- ES6 modules for frontend JavaScript
- Async/await with CancellationToken support throughout