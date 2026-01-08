# 🩸 BloodTracker

Десктопное приложение для отслеживания анализов крови и курсов препаратов с автоматическим парсингом PDF-отчётов из лабораторий.

## 📋 Описание

BloodTracker — это полнофункциональное приложение для мониторинга здоровья, которое позволяет:

- 📊 **Управление анализами крови** — хранение, просмотр и сравнение результатов анализов
- 💊 **Отслеживание курсов препаратов** — ведение журнала приёма лекарств и добавок
- 🤖 **Автоматический импорт PDF** — парсинг результатов анализов из PDF-файлов лабораторий с помощью OCR (Tesseract) и Gemini Vision API
- 📈 **Визуализация данных** — графики и сравнение анализов во времени
- ⚠️ **Алерты** — автоматическое определение отклонений от референсных значений
- 🎯 **Dashboard** — обзорная панель с ключевыми метриками

## 🚀 Основные возможности

### Анализы крови
- Добавление анализов вручную или импорт из PDF
- Автоматическое распознавание показателей из PDF (более 50 параметров)
- Сравнение анализов между собой
- Определение отклонений от нормы
- Фильтрация и поиск по датам и лабораториям

### Курсы препаратов
- Создание и управление курсами
- Отслеживание активных курсов
- Журнал приёма препаратов (Intake Log)
- Поддержка пероральных и инъекционных препаратов

### Импорт PDF
- **OCR парсинг** (Tesseract) — распознавание текста из PDF
- **Gemini Vision API** — интеллектуальное извлечение данных (опционально)
- Поддержка многостраничных документов
- Автоматическое определение даты анализа
- Валидация извлечённых значений

## 🛠 Технологический стек

### Backend
- **.NET 8** — основной фреймворк
- **ASP.NET Core** — веб-API
- **MediatR** — реализация CQRS паттерна
- **Mapster** — маппинг объектов
- **LiteDB** — встроенная NoSQL база данных (один файл `bloodtracker.db`)
- **Serilog** — структурированное логирование

### Frontend
- **Vanilla JavaScript** — без фреймворков
- **HTML5/CSS3** — современный UI
- **Fetch API** — взаимодействие с backend

### Desktop
- **ElectronNET.Core 23.6.2** — единый процесс C# + Chromium
  - Нет Node.js зависимости
  - Один .exe файл
  - Прямой доступ к .NET сервисам

### Парсинг PDF
- **Docnet.Core** — извлечение изображений из PDF
- **Tesseract 5.2.0** — OCR распознавание (русский + английский)
- **OpenCvSharp4** — предобработка изображений
- **Gemini Vision API** — AI-парсинг (опционально, требует API ключ)

### Дополнительно
- **FluentValidation** — валидация данных
- **Swashbuckle** — Swagger/OpenAPI документация

## 📁 Структура проекта

```
BloodTracker/
├── src/
│   ├── BloodTracker.Api/              # Точка входа + Electron.NET
│   │   ├── Controllers/               # REST API контроллеры
│   │   │   └── ApiControllers.cs      # Analyses, Courses, Drugs, IntakeLogs, ReferenceRanges
│   │   ├── Startup/                   # DI и конфигурация
│   │   │   ├── ServiceCollectionExtensions.cs
│   │   │   └── WebApplicationExtensions.cs
│   │   ├── wwwroot/                   # Статический контент (UI)
│   │   │   ├── index.html
│   │   │   ├── css/                   # Стили (base, components, modals, tables, etc.)
│   │   │   ├── js/                    # JavaScript модули
│   │   │   │   ├── main.js           # Точка входа
│   │   │   │   ├── api.js            # API клиент
│   │   │   │   ├── state.js          # Управление состоянием
│   │   │   │   ├── pages/            # Страницы приложения
│   │   │   │   │   ├── dashboard.js
│   │   │   │   │   ├── analyses.js
│   │   │   │   │   ├── compare.js
│   │   │   │   │   └── course.js
│   │   │   │   └── components/       # UI компоненты
│   │   │   └── assets/               # Шрифты и ресурсы
│   │   ├── Program.cs                 # Точка входа приложения
│   │   ├── electron.manifest.json     # Конфигурация Electron
│   │   └── appsettings.json           # Настройки приложения
│   │
│   ├── BloodTracker.Application/      # Слой приложения (CQRS)
│   │   ├── Analyses/                  # Доменная логика анализов
│   │   │   ├── Commands/             # Create, Update, Delete, ImportPdf
│   │   │   ├── Queries/              # GetAll, GetById, Compare, GetAlerts
│   │   │   ├── Handlers/             # Обработчики команд и запросов
│   │   │   └── Dto/                  # Data Transfer Objects
│   │   ├── Courses/                   # Доменная логика курсов
│   │   │   ├── Commands/
│   │   │   ├── Queries/
│   │   │   ├── Handlers/
│   │   │   └── Dto/
│   │   └── Common/                    # Общие интерфейсы
│   │
│   ├── BloodTracker.Domain/           # Доменный слой
│   │   └── Models/
│   │       └── Entities.cs           # Analysis, Course, Drug, IntakeLog, ReferenceRange
│   │
│   └── BloodTracker.Infrastructure/   # Инфраструктурный слой
│       ├── Persistence/
│       │   ├── BloodTrackerDbContext.cs  # LiteDB контекст
│       │   └── Repositories.cs          # Репозитории для сущностей
│       └── Services/
│           ├── PdfParserService.cs      # Парсинг PDF (OCR + Gemini)
│           ├── GeminiVisionService.cs   # Интеграция с Gemini API
│           └── ReferenceRangeService.cs # Референсные значения
│
├── Directory.Build.props              # Общие настройки проекта
├── Directory.Packages.props           # Централизованное управление версиями пакетов
├── BloodTracker.sln                   # Solution файл
├── build.ps1                          # Скрипт сборки (PowerShell)
└── build.bat                          # Скрипт сборки (CMD)
```

## 🏗 Архитектура

Проект следует принципам **Onion Architecture** (чистая архитектура):

```
┌─────────────────────────────────────┐
│         BloodTracker.Api            │  ← Presentation Layer
│  (Controllers, Electron, Static UI) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    BloodTracker.Application         │  ← Application Layer
│    (CQRS: Commands/Queries/Handlers)│
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      BloodTracker.Domain            │  ← Domain Layer
│      (Entities, Value Objects)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   BloodTracker.Infrastructure       │  ← Infrastructure Layer
│  (LiteDB, Services, External APIs) │
└─────────────────────────────────────┘
```

### Паттерны проектирования

- **CQRS** — разделение команд и запросов через MediatR
- **Repository Pattern** — абстракция доступа к данным
- **Dependency Injection** — управление зависимостями через встроенный DI контейнер
- **DTO Pattern** — передача данных между слоями

## 📦 Установка и настройка

### Требования

- **.NET 8 SDK** или выше
- **Windows** (тестировалось на Windows 10/11)
- **ElectronNET.CLI** (устанавливается автоматически или вручную)

### Установка ElectronNET.CLI

```bash
dotnet tool install ElectronNET.CLI -g
```

**Примечание:** Проект использует **ElectronNET.Core 23.6.2** (новая версия), которая полностью переписана и поддерживает .NET 8. Это не старый ElectronNET, а современная реализация с единым процессом.

### Инициализация проекта

1. Клонируйте репозиторий или откройте проект
2. Перейдите в папку API проекта:

```bash
cd src/BloodTracker.Api
```

3. Инициализируйте Electron.NET (только первый раз):

```bash
electronize init
```

4. Восстановите зависимости:

```bash
dotnet restore
```

### Настройка Gemini API (опционально)

Для использования AI-парсинга PDF через Gemini Vision API:

1. Получите API ключ на [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Добавьте в `appsettings.json`:

```json
{
  "Gemini": {
    "ApiKey": "ваш-api-ключ"
  }
}
```

Или установите переменную окружения:

```bash
set GEMINI_API_KEY=ваш-api-ключ
```

**Примечание:** Без API ключа приложение будет использовать только OCR (Tesseract) для парсинга PDF.

## 🚀 Запуск приложения

### Режим разработки (с hot reload)

```bash
cd src/BloodTracker.Api
electronize start /watch
```

Приложение откроется в Electron окне с автоматической перезагрузкой при изменении кода.

### Запуск только API (без Electron)

```bash
cd src/BloodTracker.Api
dotnet run
```

Затем откройте http://localhost:5000 в браузере.

### Запуск с Swagger

Swagger UI доступен по адресу: http://localhost:5000/swagger

## 🔨 Сборка для production

### Автоматическая сборка (рекомендуется)

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

### Результат сборки

После сборки в папке `src/BloodTracker.Api/bin/Release/net8.0/Desktop/` будет создано:

- `BloodTracker 1.0.0.exe` — исполняемый файл приложения
- `win-unpacked/` — распакованная версия для распространения

При запуске `.exe` файла окно Electron откроется автоматически!

### Ручная сборка

```bash
cd src/BloodTracker.Api
dotnet publish -c Release
electronize build /target win
```

## 📡 API Endpoints

### Analyses (Анализы)

- `GET /api/analyses` — получить все анализы
- `GET /api/analyses/{id}` — получить анализ по ID
- `GET /api/analyses/{id}/alerts` — получить отклонения от нормы
- `GET /api/analyses/compare?beforeId={id}&afterId={id}` — сравнить два анализа
- `POST /api/analyses` — создать анализ
- `PUT /api/analyses/{id}` — обновить анализ
- `DELETE /api/analyses/{id}` — удалить анализ
- `POST /api/analyses/import-pdf` — импортировать анализ из PDF

### Courses (Курсы)

- `GET /api/courses/active` — получить активный курс
- `GET /api/courses/dashboard` — получить данные для dashboard
- `POST /api/courses` — создать курс
- `PUT /api/courses/{id}` — обновить курс

### Drugs (Препараты)

- `GET /api/drugs` — получить все препараты
- `POST /api/drugs` — создать препарат
- `PUT /api/drugs/{id}` — обновить препарат
- `DELETE /api/drugs/{id}` — удалить препарат

### IntakeLogs (Журнал приёма)

- `GET /api/intakelogs?count={n}` — получить последние записи
- `POST /api/intakelogs` — создать запись о приёме
- `PUT /api/intakelogs/{id}` — обновить запись
- `DELETE /api/intakelogs/{id}` — удалить запись

### ReferenceRanges (Референсные значения)

- `GET /api/referenceranges` — получить все референсные значения

## 🗄 База данных

Приложение использует **LiteDB** — встроенную NoSQL базу данных в виде одного файла:

- **Расположение:** `src/BloodTracker.Api/bloodtracker.db`
- **Формат:** BSON документы
- **Резервное копирование:** просто скопируйте файл `.db`

### Структура данных

- **Analyses** — коллекция анализов крови
- **Courses** — коллекция курсов препаратов
- **Drugs** — коллекция препаратов
- **IntakeLogs** — коллекция записей о приёме препаратов

Все сущности наследуются от базового класса `Entity` с полями:
- `Id` (Guid) — уникальный идентификатор
- `CreatedAt` (DateTime) — дата создания
- `UpdatedAt` (DateTime?) — дата обновления

## 🔍 Парсинг PDF

Приложение поддерживает два метода парсинга PDF-отчётов лабораторий:

### 1. OCR (Tesseract) — основной метод

- Распознаёт текст из PDF с помощью Tesseract OCR
- Поддерживает русский и английский языки
- Автоматически загружает языковые данные при первом использовании
- Использует OpenCV для предобработки изображений (улучшение контраста, бинаризация)

### 2. Gemini Vision API — опциональный метод

- Использует Google Gemini 2.5 Flash для интеллектуального извлечения данных
- Более точное распознавание сложных таблиц
- Обрабатывает все страницы PDF за один запрос
- Требует API ключ (см. раздел "Настройка Gemini API")

### Поддерживаемые показатели

Приложение распознаёт более 50 показателей анализов крови:

**Гормоны:**
- Тестостерон (общий и свободный)
- ЛГ, ФСГ, Пролактин, Эстрадиол
- ГСПГ, ИФР-1, ТТГ
- Индекс свободных андрогенов (FAI)

**Липидный профиль:**
- Холестерин общий, ЛПВП, ЛПНП, ЛПОНП
- Триглицериды
- Коэффициент атерогенности

**Печёночные ферменты:**
- АЛТ, АСТ, ГГТ, ЩФ

**Биохимия:**
- Глюкоза, HbA1c
- Креатинин, Мочевина
- Общий белок
- Билирубин (общий и прямой)
- Витамин D

**Гематология:**
- Гемоглобин, Гематокрит

**Коагулология:**
- Протромбиновое время, МНО, Протромбин %

## ⚙️ Конфигурация

### appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "Gemini": {
    "ApiKey": "ваш-ключ-или-пусто"
  },
  "Serilog": {
    "WriteTo": [
      {
        "Name": "Console"
      },
      {
        "Name": "File",
        "Args": {
          "path": "logs/app-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 7
        }
      }
    ]
  }
}
```

### Логирование

Логи сохраняются в папке `src/BloodTracker.Api/logs/`:
- Формат: `app-YYYYMMDD.log`
- Хранение: 7 дней
- Уровни: Information, Warning, Error

## 🎨 Особенности UI

- **Адаптивный дизайн** — работает на разных размерах окна
- **Тёмная тема** — современный внешний вид
- **Модальные окна** — для создания и редактирования
- **Таблицы с сортировкой** — удобный просмотр данных
- **Графики** — визуализация изменений показателей
- **ASCII-арт эффекты** — декоративные элементы

## 🔧 Разработка

### Добавление нового показателя анализа

1. Добавьте маппинг в `PdfParserService.cs`:

```csharp
private static readonly Dictionary<string, string[]> NameMappings = new()
{
    // ...
    ["new-indicator"] = ["Название показателя", "Альтернативное название"],
};
```

2. Добавьте ожидаемый диапазон значений:

```csharp
private static readonly Dictionary<string, (double Min, double Max)> ExpectedRanges = new()
{
    // ...
    ["new-indicator"] = (minValue, maxValue),
};
```

3. Добавьте референсные значения в `ReferenceRangeService.cs`

### Добавление нового API endpoint

1. Создайте Query/Command в `BloodTracker.Application`
2. Создайте Handler в соответствующей папке Handlers
3. Добавьте endpoint в контроллер в `BloodTracker.Api/Controllers`

### Тестирование парсинга PDF

1. Поместите PDF файл в папку проекта
2. Используйте Swagger UI для тестирования endpoint `/api/analyses/import-pdf`
3. Проверьте логи в `logs/` для отладки

## 🐛 Известные ограничения

- Приложение работает только на Windows (из-за ElectronNET и OpenCvSharp)
- Tesseract требует загрузки языковых данных при первом использовании (~10-20 МБ)
- Gemini API имеет лимиты на количество запросов (бесплатный tier)
- LiteDB не поддерживает транзакции между коллекциями

## 📝 Лицензия

Проект для личного использования.

## 👤 Автор

TXCSLM

---

**Версия:** 1.0.0  
**Последнее обновление:** 2025
