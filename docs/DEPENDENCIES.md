# Dependencies — Все зависимости проекта

> Версии из `Directory.Packages.props` (Central Package Management)

## .NET / NuGet

### Core Framework

| Пакет | Версия | Модуль | Назначение |
|-------|--------|--------|------------|
| Microsoft.AspNetCore.App.Ref | 8.0.16 | Api | ASP.NET Core framework |
| ElectronNET.API | 23.6.2 | Api | Desktop shell (Chromium + .NET) |

### CQRS / Mapping / Validation

| Пакет | Версия | Модуль | Назначение |
|-------|--------|--------|------------|
| MediatR | 12.4.1 | Application, Api | CQRS dispatcher |
| Mapster | 7.4.0 | Application | Object mapping (DTO ↔ Entity) |
| Mapster.DependencyInjection | 1.0.1 | Application | DI интеграция Mapster |
| FluentValidation | 11.11.0 | Application | Request validation |
| FluentValidation.DependencyInjectionExtensions | 11.11.0 | Application | DI интеграция |

### Database

| Пакет | Версия | Модуль | Назначение |
|-------|--------|--------|------------|
| LiteDB | 5.0.21 | Infrastructure | Embedded NoSQL (BSON, single file) |

### PDF / OCR / Image Processing

| Пакет | Версия | Модуль | Назначение |
|-------|--------|--------|------------|
| Tesseract | 5.2.0 | Infrastructure | OCR (русский + английский) |
| Docnet.Core | 2.6.0 | Infrastructure | Извлечение страниц из PDF |
| OpenCvSharp4 | 4.9.0.20240103 | Infrastructure | Предобработка изображений (CLAHE, бинаризация) |
| OpenCvSharp4.runtime.win | 4.9.0.20240103 | Infrastructure | Native runtime (Windows) |
| OpenCvSharp4.runtime.linux-x64 | 4.9.0.20240103 | Infrastructure | Native runtime (Linux/Docker) |

### Logging

| Пакет | Версия | Модуль | Назначение |
|-------|--------|--------|------------|
| Serilog | 4.1.0 | Api | Structured logging core |
| Serilog.AspNetCore | 8.0.3 | Api | ASP.NET Core интеграция |
| Serilog.Sinks.Console | 6.0.0 | Api | Вывод в консоль |
| Serilog.Sinks.File | 6.0.0 | Api | Файловые логи с ротацией |

### Auth / Email

| Пакет | Версия | Модуль | Назначение |
|-------|--------|--------|------------|
| Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.12 | Api, Infrastructure | JWT auth |
| Google.Apis.Auth | 1.68.0 | Infrastructure | Google OAuth verification |
| MailKit | 4.9.0 | Infrastructure | SMTP / Gmail API отправка |

### API Documentation

| Пакет | Версия | Модуль | Назначение |
|-------|--------|--------|------------|
| Swashbuckle.AspNetCore | 6.9.0 | Api | Swagger/OpenAPI |

### Microsoft Extensions

| Пакет | Версия | Модуль | Назначение |
|-------|--------|--------|------------|
| Microsoft.Extensions.Http | 8.0.0 | Infrastructure | HttpClient factory |
| Microsoft.Extensions.Configuration.Abstractions | 8.0.0 | Infrastructure | IConfiguration |
| Microsoft.Extensions.Logging.Abstractions | 8.0.0 | Application, Infrastructure | ILogger |
| Microsoft.Extensions.Options | 8.0.0 | Infrastructure | IOptions pattern |
| Microsoft.Extensions.Options.ConfigurationExtensions | 8.0.0 | Infrastructure | Bind config sections |

---

## JavaScript (frontend — без npm, vanilla)

| Библиотека | Способ подключения | Назначение |
|------------|-------------------|------------|
| ApexCharts | CDN/bundled | Графики трендов (trendChart.js) |

Frontend написан на **vanilla JS (ES6 modules)** без фреймворков и npm.

---

## Electron (Node.js — генерируется при сборке)

| Пакет | Версия | Назначение |
|-------|--------|------------|
| dasherize | ^2.0.0 | String utils |
| electron-updater | ^6.6.2 | Auto-updates |
| image-size | ^1.2.1 | Image dimension detection |
| portscanner | ^2.2.0 | Find free port |
| socket.io | ^4.8.1 | IPC between .NET and Electron |
| electron-builder | 26.0 (dev) | Package builder |

---

## Внешние API

| API | URL | Назначение | Обязательный? |
|-----|-----|-----------|---------------|
| Google Gemini 2.5 Flash | `generativelanguage.googleapis.com` | AI парсинг PDF анализов | Нет (fallback на OCR) |
| ExerciseDB (RapidAPI) | `exercisedb.p.rapidapi.com` | Каталог упражнений | Нет (кэш 24ч) |
| Google OAuth | `accounts.google.com` | Аутентификация | Да (для multi-user) |
| Gmail API | `gmail.googleapis.com` | Отправка auth codes | Да (для email auth) |

---

## Docker Runtime

| Зависимость | Назначение |
|-------------|------------|
| `mcr.microsoft.com/dotnet/sdk:8.0` | Build stage |
| `mcr.microsoft.com/dotnet/aspnet:8.0` | Runtime stage |
| `tesseract-ocr`, `tesseract-ocr-rus/eng` | OCR в контейнере |
| `libgdiplus`, `libgomp1` | Native deps для OpenCV |
| `caddy:2` | Reverse proxy + auto HTTPS |
