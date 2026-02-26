# MEMORY.md — BloodTracker Project Memory

## Project Overview
- **Name:** BloodTracker
- **Type:** Health tracking app (blood analyses, drug courses, workout diary)
- **Stack:** .NET 8, ASP.NET Core, LiteDB, MediatR (CQRS), Vanilla JS, Vitest, Playwright
- **Deploy:** blood.txcslm.net, Docker (Caddy + .NET 8)
- **Theme:** Dark dungeon / retro terminal ASCII с CRT effects

## Architecture
- **Domain** — sealed entities, zero dependencies
- **Application** — CQRS (Commands/Queries/Handlers/DTOs), FluentValidation
- **Infrastructure** — LiteDB repositories, services
- **Api** — Controllers, Middleware, wwwroot (frontend)

## Key Features
- Blood analysis tracking with reference ranges (132 substances, 49 ranges)
- Drug courses & intake logging
- Workout Diary (Phase 2B done): Exercise carousel, PR detection, analytics
- AI PDF parsing (Gemini Vision) for lab results
- PWA with offline support (Service Worker)
- 202 exercises in embedded JSON catalog

## Testing — 527+ tests
- Backend: 351 .NET xUnit
- Frontend: 156 Vitest + happy-dom
- E2E: 15 Playwright + 5 screenshot

## Key Decisions
- LiteDB (NOT EF Core / SQL) — embedded, per-user isolation
- Vanilla JS (NOT React/Vue) — simplicity, no build step for logic
- Consolidated file pattern — Entities.cs, Interfaces.cs, Repositories.cs
- Vitest + happy-dom for frontend (fast, no browser needed)

## Conventions
- Sealed entity classes, init-only properties
- Interface-first (all services through interfaces)
- async/await + CancellationToken everywhere
- CSS custom properties from variables.css — NO hardcoded colors
- ES6 modules, globally exposed via window.*
- Toast system (window.toast.*) — NEVER alert()

## Current Branch
- `feature/workout-diary` — Phase 2B Analytics done
