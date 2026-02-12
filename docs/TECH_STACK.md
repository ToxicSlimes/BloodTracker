# Tech Stack

## Core

| Технология | Версия | Назначение |
|-----------|--------|-----------|
| .NET | 8.0 | Runtime |
| ASP.NET Core | 8.0 | Web framework |
| Electron.NET | 23.6.2 | Desktop shell |
| C# | Latest | Backend язык |
| JavaScript | ES6 Modules | Frontend |

## Backend Packages

| Пакет | Назначение |
|-------|-----------|
| MediatR | CQRS — Commands/Queries/Handlers |
| LiteDB | Embedded NoSQL база данных |
| Serilog | Структурированное логирование (Console + File) |
| Swashbuckle | Swagger/OpenAPI документация |
| Microsoft.AspNetCore.Authentication.JwtBearer | JWT авторизация |
| Mapster | DTO маппинг |
| FluentValidation | Валидация запросов |

## Frontend

| Технология | Назначение |
|-----------|-----------|
| Vanilla JS (ES6 modules) | UI логика, SPA routing |
| ApexCharts | Графики трендов с reference ranges |
| CSS Custom Properties | Design tokens (`variables.css`) |

## Внешние API

| Сервис | Назначение |
|--------|-----------|
| Gemini Vision API | AI-распознавание PDF анализов |
| ExerciseDB API | Каталог упражнений |

## Архитектурные паттерны

- **Clean Architecture** — Domain → Application → Infrastructure → Api
- **CQRS** (MediatR) — разделение Commands и Queries
- **Repository Pattern** — абстракция над LiteDB
- **Consolidated File Pattern** — один файл на concern (все контроллеры в одном файле, все сущности в одном)
- **Interface-first** — все сервисы через интерфейсы в `Interfaces.cs`

## Инструменты

| Инструмент | Назначение |
|-----------|-----------|
| dotnet CLI | Сборка, запуск |
| electron-builder | Сборка desktop приложения |
| build.ps1 | PowerShell скрипт сборки |
