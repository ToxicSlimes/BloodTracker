# 🩸 BloodTracker

Приложение для отслеживания анализов крови и курсов препаратов.

## Технологии

- **Backend**: ASP.NET Core 8 + MediatR + Mapster + LiteDB
- **Frontend**: HTML/CSS/JS (статический контент в wwwroot)
- **Desktop**: ElectronNET.Core (единый процесс!)

## Установка

### 1. Установи ElectronNET.CLI (один раз)

```bash
dotnet tool install ElectronNET.CLI -g
```

**Примечание:** Проект использует **ElectronNET.Core** (новая версия), которая полностью переписана и поддерживает .NET 8.

### 2. Перейди в папку API проекта

```bash
cd src/BloodTracker.Api
```

### 3. Инициализируй Electron.NET (первый раз)

```bash
electronize init
```

## Запуск

### Режим разработки (с hot reload)

```bash
cd src/BloodTracker.Api
electronize start /watch
```

### Запуск только API (без Electron)

```bash
cd src/BloodTracker.Api
dotnet run
```
Затем открой http://localhost:5000 в браузере.

## Сборка

### Electron приложение с окном (рекомендуется)

Используй скрипт сборки для создания Electron приложения с автоматическим окном:

**Windows (PowerShell):**
```powershell
.\build.ps1
```

**Windows (CMD):**
```cmd
build.bat
```

**С очисткой предыдущих сборок:**
```powershell
.\build.ps1 -Clean
```

**Результат:** `bin\Release\` - Electron приложение, которое автоматически открывает окно при запуске (как `electronize start`).

При запуске exe файла окно откроется автоматически!

## Структура проекта

```
BloodTracker/
├── src/
│   ├── BloodTracker.Api/          # Точка входа + Electron.NET
│   │   ├── Controllers/           # REST API контроллеры
│   │   ├── Startup/               # DI и конфигурация
│   │   ├── wwwroot/               # Статика (UI)
│   │   └── electron.manifest.json # Конфиг Electron
│   ├── BloodTracker.Application/  # CQRS + MediatR handlers
│   ├── BloodTracker.Domain/       # Entities
│   └── BloodTracker.Infrastructure/ # LiteDB + Services
├── Directory.Build.props          # Общие настройки
├── Directory.Packages.props       # Централизованные версии пакетов
└── BloodTracker.sln
```

## Архитектура

- **Onion Architecture** (Domain → Application → Infrastructure → Api)
- **CQRS** через MediatR (Commands/Queries/Handlers)
- **LiteDB** - встроенная NoSQL база (один файл `bloodtracker.db`)
- **ElectronNET.Core** - единый процесс C# + Chromium

## Главные преимущества ElectronNET.Core

1. ✅ **Единый процесс** - нет проблем с закрытием
2. ✅ **Нет Node.js** - только .NET
3. ✅ **Простой деплой** - один .exe файл
4. ✅ **Прямой доступ** к .NET сервисам из UI
