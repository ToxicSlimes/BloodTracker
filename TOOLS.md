# TOOLS.md — BT Agent Tools

## Built-in Tools
Тебе доступны стандартные инструменты OpenClaw: `read`, `write`, `edit`, `exec`, `web_fetch`.

## Project Commands
```powershell
# Build
cd src/BloodTracker.Api; dotnet build

# Run dev server
cd src/BloodTracker.Api; dotnet run   # http://localhost:5000

# Backend tests (351 tests)
dotnet test

# Frontend tests (156 tests)
cd src/BloodTracker.Api/wwwroot; npx vitest run

# E2E tests (20 tests)
cd src/BloodTracker.Api/wwwroot; npx playwright test
```

## Project Search
```powershell
# Поиск по C# файлам
Get-ChildItem -Path "src" -Filter "*.cs" -Recurse | Select-String "pattern"

# Поиск по JS файлам
Get-ChildItem -Path "src/BloodTracker.Api/wwwroot/js" -Filter "*.js" -Recurse | Select-String "pattern"

# Поиск по CSS
Get-ChildItem -Path "src/BloodTracker.Api/wwwroot/css" -Filter "*.css" -Recurse | Select-String "pattern"

# Контроллеры
Get-Content "src/BloodTracker.Api/Controllers/ApiControllers.cs"

# Entities
Get-Content "src/BloodTracker.Domain/Models/Entities.cs"

# Interfaces
Get-Content "src/BloodTracker.Application/Common/Interfaces.cs"

# TODO/FIXME
Get-ChildItem -Path "src" -Filter "*.cs" -Recurse | Select-String "TODO|FIXME|HACK"
```

## Git
```powershell
git status
git log --oneline -20
git diff --stat
```

## Deploy
- **Production:** blood.txcslm.net (Docker, Caddy + .NET 8, 77.232.42.99)
- Деплой через Docker — не деплой из этого окружения без подтверждения

## web_fetch
Используй для поиска документации по .NET, LiteDB, Vitest, Playwright.
