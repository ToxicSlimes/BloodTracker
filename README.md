# 🩸 BloodTracker

Десктопное приложение для комплексного мониторинга здоровья: отслеживание анализов крови, курсов препаратов и тренировочных программ с автоматическим парсингом PDF-отчётов из лабораторий.

## 📋 Описание

BloodTracker — это полнофункциональное приложение для мониторинга здоровья, которое позволяет:

- 📊 **Управление анализами крови** — хранение, просмотр и сравнение результатов анализов
- 💊 **Отслеживание курсов препаратов** — ведение журнала приёма лекарств и добавок
- 🏋️ **Тренировочные программы** — создание и управление программами тренировок с упражнениями и подходами
- 🤖 **Автоматический импорт PDF** — парсинг результатов анализов из PDF-файлов лабораторий с помощью OCR (Tesseract) и Gemini Vision API
- 📈 **Визуализация данных** — графики и сравнение анализов во времени
- ⚠️ **Алерты** — автоматическое определение отклонений от референсных значений
- 🎯 **Dashboard** — обзорная панель с ключевыми метриками
- 📚 **Каталог упражнений** — интеграция с внешним API для получения упражнений

## 🚀 Основные возможности

### Анализы крови
- Добавление анализов вручную или импорт из PDF
- Автоматическое распознавание показателей из PDF (более 50 параметров)
- Сравнение анализов между собой с расчётом процентных изменений
- Определение отклонений от нормы (Low, SlightlyHigh, High)
- Фильтрация и поиск по датам и лабораториям
- Поддержка более 50 показателей с референсными значениями

### Курсы препаратов
- Создание и управление курсами препаратов
- Отслеживание активных курсов (только один активный курс одновременно)
- Журнал приёма препаратов (Intake Log) с датами и дозировками
- Поддержка пероральных (Oral) и инъекционных (Injectable) препаратов
- Связь препаратов с курсами через `CourseId`

### Тренировочные программы
- Создание тренировочных программ с названием и описанием
- Дни тренировок по дням недели (DayOfWeek)
- Упражнения с указанием группы мышц (MuscleGroup)
- Подходы (Sets) с количеством повторений, весом и длительностью
- Каталог упражнений с интеграцией внешнего API
- ASCII-арт визуализация групп мышц

### Импорт PDF
- **OCR парсинг** (Tesseract) — распознавание текста из PDF
- **Gemini Vision API** — интеллектуальное извлечение данных (опционально)
- Поддержка многостраничных документов
- Автоматическое определение даты анализа и лаборатории
- Валидация извлечённых значений по ожидаемым диапазонам
- Обработка нераспознанных элементов

## 🛠 Технологический стек

### Backend
- **.NET 8** — основной фреймворк
- **ASP.NET Core 8.0.16** — веб-API
- **MediatR 12.4.1** — реализация CQRS паттерна
- **Mapster 7.4.0** — маппинг объектов
- **LiteDB 5.0.21** — встроенная NoSQL база данных (один файл `bloodtracker.db`)
- **Serilog 4.1.0** — структурированное логирование
- **FluentValidation 11.11.0** — валидация данных

### Frontend
- **Vanilla JavaScript** — без фреймворков
- **HTML5/CSS3** — современный UI
- **Fetch API** — взаимодействие с backend

### Desktop
- **ElectronNET.API 23.6.2** — единый процесс C# + Chromium
  - Нет Node.js зависимости
  - Один .exe файл
  - Прямой доступ к .NET сервисам
  - Автоматическое открытие окна при запуске

### Парсинг PDF
- **Docnet.Core 2.6.0** — извлечение изображений из PDF
- **Tesseract 5.2.0** — OCR распознавание (русский + английский)
- **OpenCvSharp4 4.9.0** — предобработка изображений (CLAHE, адаптивная бинаризация)
- **Gemini Vision API** — AI-парсинг через Google Gemini 2.5 Flash (опционально)

### Дополнительно
- **Swashbuckle.AspNetCore 6.9.0** — Swagger/OpenAPI документация
- **Microsoft.Extensions.Http** — HTTP клиенты для внешних API

## 📁 Структура проекта

```
BloodTracker/
├── src/
│   ├── BloodTracker.Api/                    # Точка входа + Electron.NET
│   │   ├── Controllers/
│   │   │   └── ApiControllers.cs           # Все REST API контроллеры
│   │   │       ├── AnalysesController      # CRUD + импорт PDF + сравнение + алерты
│   │   │       ├── CoursesController       # Курсы + dashboard
│   │   │       ├── DrugsController         # Препараты
│   │   │       ├── IntakeLogsController   # Журнал приёма
│   │   │       ├── ReferenceRangesController # Референсные значения
│   │   │       ├── WorkoutProgramsController # Программы тренировок
│   │   │       ├── WorkoutDaysController  # Дни тренировок
│   │   │       ├── WorkoutExercisesController # Упражнения
│   │   │       └── WorkoutSetsController  # Подходы
│   │   ├── Startup/
│   │   │   ├── ServiceCollectionExtensions.cs # Регистрация сервисов
│   │   │   └── WebApplicationExtensions.cs    # Middleware конфигурация
│   │   ├── wwwroot/                        # Статический контент (UI)
│   │   │   ├── index.html                  # Главная страница
│   │   │   ├── css/                        # Стили
│   │   │   │   ├── base.css               # Базовые стили
│   │   │   │   ├── variables.css          # CSS переменные
│   │   │   │   ├── layout.css             # Макет страницы
│   │   │   │   ├── components.css         # Компоненты UI
│   │   │   │   ├── modals.css             # Модальные окна
│   │   │   │   ├── tables.css             # Таблицы
│   │   │   │   ├── effects.css            # Эффекты
│   │   │   │   └── animations.css         # Анимации
│   │   │   ├── js/                        # JavaScript модули
│   │   │   │   ├── main.js                # Точка входа приложения
│   │   │   │   ├── api.js                 # API клиент (Fetch обёртки)
│   │   │   │   ├── state.js               # Управление состоянием
│   │   │   │   ├── config.js              # Конфигурация
│   │   │   │   ├── utils.js                # Утилиты
│   │   │   │   ├── pages/                 # Страницы приложения
│   │   │   │   │   ├── dashboard.js        # Dashboard
│   │   │   │   │   ├── analyses.js         # Список анализов
│   │   │   │   │   ├── compare.js         # Сравнение анализов
│   │   │   │   │   ├── course.js          # Курсы препаратов
│   │   │   │   │   └── workouts.js         # Тренировки
│   │   │   │   └── components/            # UI компоненты
│   │   │   │       ├── navigation.js       # Навигация
│   │   │   │       ├── muscleAscii.js     # ASCII-арт мышц
│   │   │   │       └── workoutModals.js   # Модальные окна тренировок
│   │   │   └── assets/                     # Ресурсы
│   │   │       └── fonts/                 # Шрифты
│   │   ├── Program.cs                      # Точка входа приложения
│   │   ├── electron.manifest.json         # Конфигурация Electron
│   │   └── appsettings.json               # Настройки приложения
│   │
│   ├── BloodTracker.Application/          # Слой приложения (CQRS)
│   │   ├── Analyses/                      # Доменная логика анализов
│   │   │   ├── Commands/
│   │   │   │   └── AnalysisCommands.cs    # Create, Update, Delete, ImportPdf
│   │   │   ├── Queries/
│   │   │   │   └── AnalysisQueries.cs    # GetAll, GetById, Compare, GetAlerts
│   │   │   ├── Handlers/
│   │   │   │   └── AnalysisHandlers.cs    # Обработчики команд и запросов
│   │   │   └── Dto/
│   │   │       └── AnalysisDtos.cs        # DTO для анализов
│   │   ├── Courses/                       # Доменная логика курсов
│   │   │   ├── Commands/
│   │   │   │   └── CourseCommands.cs      # Create, Update, Delete (курсы, препараты, логи)
│   │   │   ├── Queries/
│   │   │   │   └── CourseQueries.cs       # GetActive, GetDashboard, GetAll
│   │   │   ├── Handlers/
│   │   │   │   └── CourseHandlers.cs      # Обработчики
│   │   │   └── Dto/
│   │   │       └── CourseDtos.cs          # DTO для курсов
│   │   ├── Workouts/                      # Доменная логика тренировок
│   │   │   ├── Commands/
│   │   │   │   └── WorkoutCommands.cs     # CRUD для программ, дней, упражнений, подходов
│   │   │   ├── Queries/
│   │   │   │   └── WorkoutQueries.cs     # Запросы для всех сущностей тренировок
│   │   │   ├── Handlers/
│   │   │   │   └── WorkoutHandlers.cs     # Обработчики
│   │   │   └── Dto/
│   │   │       └── WorkoutDtos.cs         # DTO для тренировок
│   │   └── Common/
│   │       └── Interfaces.cs              # Интерфейсы репозиториев и сервисов
│   │
│   ├── BloodTracker.Domain/               # Доменный слой
│   │   └── Models/
│   │       └── Entities.cs                # Все доменные сущности
│   │           ├── Entity                 # Базовый класс
│   │           ├── Analysis               # Анализ крови
│   │           ├── Course                # Курс препаратов
│   │           ├── Drug                  # Препарат
│   │           ├── IntakeLog             # Запись о приёме
│   │           ├── WorkoutProgram       # Программа тренировок
│   │           ├── WorkoutDay           # День тренировки
│   │           ├── WorkoutExercise      # Упражнение
│   │           ├── WorkoutSet           # Подход
│   │           ├── ExerciseCatalogEntry # Элемент каталога
│   │           ├── ReferenceRange       # Референсное значение
│   │           ├── DrugType             # Enum: Oral, Injectable
│   │           ├── ValueStatus          # Enum: Normal, Low, SlightlyHigh, High, Pending
│   │           └── MuscleGroup         # Enum: 11 групп мышц
│   │
│   └── BloodTracker.Infrastructure/       # Инфраструктурный слой
│       ├── Persistence/
│       │   ├── BloodTrackerDbContext.cs  # LiteDB контекст с коллекциями
│       │   └── Repositories.cs            # Реализации репозиториев
│       │       ├── AnalysisRepository
│       │       ├── CourseRepository
│       │       ├── DrugRepository
│       │       ├── IntakeLogRepository
│       │       ├── WorkoutProgramRepository
│       │       ├── WorkoutDayRepository
│       │       ├── WorkoutExerciseRepository
│       │       └── WorkoutSetRepository
│       └── Services/
│           ├── PdfParserService.cs        # Парсинг PDF (OCR + Gemini)
│           ├── GeminiVisionService.cs    # Интеграция с Gemini API
│           ├── ReferenceRangeService.cs  # Референсные значения (50+ показателей)
│           └── ExerciseCatalogService.cs # Каталог упражнений (внешний API)
│
├── Directory.Build.props                  # Общие настройки проекта
├── Directory.Packages.props               # Централизованное управление версиями
├── BloodTracker.sln                       # Solution файл
├── build.ps1                              # Скрипт сборки (PowerShell)
└── build.bat                              # Скрипт сборки (CMD)
```

## 🏗 Архитектура

Проект следует принципам **Onion Architecture** (чистая архитектура) с разделением на слои:

```
┌─────────────────────────────────────────────┐
│         BloodTracker.Api                    │  ← Presentation Layer
│  (Controllers, Electron, Static UI, DI)    │
└──────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│    BloodTracker.Application                  │  ← Application Layer
│    (CQRS: Commands/Queries/Handlers/DTOs)   │
│    - MediatR для диспетчеризации             │
│    - Mapster для маппинга                    │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│      BloodTracker.Domain                     │  ← Domain Layer
│      (Entities, Enums, Value Objects)       │
│      - Чистые доменные модели                │
│      - Без зависимостей от других слоёв      │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│   BloodTracker.Infrastructure                │  ← Infrastructure Layer
│  (LiteDB, Services, External APIs, Repos)   │
│  - Реализация интерфейсов из Application    │
│  - Внешние зависимости                        │
└──────────────────────────────────────────────┘
```

### Паттерны проектирования

#### CQRS (Command Query Responsibility Segregation)
- **Commands** — операции изменения данных (Create, Update, Delete)
- **Queries** — операции чтения данных (GetAll, GetById, Compare)
- **Handlers** — обработчики команд и запросов через MediatR
- Разделение ответственности между чтением и записью

#### Repository Pattern
- Абстракция доступа к данным через интерфейсы
- Реализация в Infrastructure слое
- Упрощение тестирования и смены БД

#### Dependency Injection
- Встроенный DI контейнер .NET
- Регистрация в `ServiceCollectionExtensions`
- Constructor injection во всех классах

#### DTO Pattern
- Отдельные DTO для запросов и ответов
- Защита доменной модели от изменений
- Оптимизация передачи данных

## 📦 Доменные сущности

### Entity (базовый класс)
```csharp
public abstract class Entity
{
    public Guid Id { get; init; }           // Уникальный идентификатор
    public DateTime CreatedAt { get; init; } // Дата создания (UTC)
    public DateTime? UpdatedAt { get; set; } // Дата обновления (UTC)
}
```

### Analysis (Анализ крови)
```csharp
public sealed class Analysis : Entity
{
    public required DateTime Date { get; set; }              // Дата анализа
    public required string Label { get; set; }               // Название/метка
    public string? Laboratory { get; set; }                  // Лаборатория
    public string? Notes { get; set; }                       // Заметки
    public Dictionary<string, double> Values { get; set; }    // Показатели (ключ -> значение)
}
```

### Course (Курс препаратов)
```csharp
public sealed class Course : Entity
{
    public required string Title { get; set; }    // Название курса
    public DateTime? StartDate { get; set; }     // Дата начала
    public DateTime? EndDate { get; set; }        // Дата окончания
    public string? Notes { get; set; }           // Заметки
    public bool IsActive { get; set; }           // Активен ли курс
}
```

### Drug (Препарат)
```csharp
public sealed class Drug : Entity
{
    public required string Name { get; set; }        // Название препарата
    public required DrugType Type { get; set; }      // Тип: Oral или Injectable
    public string? Dosage { get; set; }             // Дозировка
    public string? Amount { get; set; }             // Количество
    public string? Schedule { get; set; }           // График приёма
    public string? Notes { get; set; }               // Заметки
    public Guid? CourseId { get; set; }              // Связь с курсом
}
```

### IntakeLog (Журнал приёма)
```csharp
public sealed class IntakeLog : Entity
{
    public required DateTime Date { get; set; }      // Дата приёма
    public required Guid DrugId { get; set; }       // ID препарата
    public required string DrugName { get; set; }  // Название (для истории)
    public string? Dose { get; set; }               // Принятая доза
    public string? Note { get; set; }               // Заметка
}
```

### WorkoutProgram (Программа тренировок)
```csharp
public sealed class WorkoutProgram : Entity
{
    public required string Title { get; set; }  // Название программы
    public string? Notes { get; set; }          // Описание/заметки
}
```

### WorkoutDay (День тренировки)
```csharp
public sealed class WorkoutDay : Entity
{
    public required Guid ProgramId { get; set; }        // ID программы
    public required DayOfWeek DayOfWeek { get; set; }  // День недели
    public string? Title { get; set; }                 // Название дня
    public string? Notes { get; set; }                  // Заметки
}
```

### WorkoutExercise (Упражнение)
```csharp
public sealed class WorkoutExercise : Entity
{
    public required Guid ProgramId { get; set; }    // ID программы
    public required Guid DayId { get; set; }        // ID дня
    public required string Name { get; set; }       // Название упражнения
    public MuscleGroup MuscleGroup { get; set; }    // Группа мышц
    public string? Notes { get; set; }              // Заметки
}
```

### WorkoutSet (Подход)
```csharp
public sealed class WorkoutSet : Entity
{
    public required Guid ExerciseId { get; set; }  // ID упражнения
    public int? Repetitions { get; set; }           // Количество повторений
    public double? Weight { get; set; }            // Вес (кг)
    public TimeSpan? Duration { get; set; }        // Длительность (для кардио)
    public string? Notes { get; set; }             // Заметки
}
```

### ExerciseCatalogEntry (Элемент каталога)
```csharp
public sealed class ExerciseCatalogEntry
{
    public required string Id { get; set; }         // Уникальный ID
    public required string Name { get; set; }      // Название упражнения
    public string? BodyPart { get; set; }          // Часть тела
    public string? Target { get; set; }           // Целевая мышца
    public string? Equipment { get; set; }         // Оборудование
    public MuscleGroup MuscleGroup { get; set; }   // Группа мышц (маппинг)
    public DateTime CachedAt { get; set; }         // Время кэширования
}
```

### ReferenceRange (Референсное значение)
```csharp
public sealed record ReferenceRange
{
    public required string Key { get; init; }        // Ключ показателя
    public required string Name { get; init; }        // Название
    public required double Min { get; init; }         // Минимум
    public required double Max { get; init; }         // Максимум
    public required string Unit { get; init; }       // Единица измерения
    public string? Category { get; init; }           // Категория
    public string? Description { get; init; }       // Описание
}
```

### Enums

**DrugType:**
- `Oral` — пероральный препарат
- `Injectable` — инъекционный препарат

**ValueStatus:**
- `Normal` — значение в норме
- `Low` — значение ниже нормы
- `SlightlyHigh` — значение слегка выше нормы
- `High` — значение значительно выше нормы
- `Pending` — статус не определён

**MuscleGroup:**
- `FullBody` — всё тело
- `Chest` — грудь
- `Back` — спина
- `Shoulders` — плечи
- `Biceps` — бицепсы
- `Triceps` — трицепсы
- `Forearms` — предплечья
- `Abs` — пресс
- `Glutes` — ягодицы
- `Quadriceps` — квадрицепсы
- `Hamstrings` — бицепсы бедра
- `Calves` — икры

## 🗄 База данных (LiteDB)

### Структура

Приложение использует **LiteDB 5.0.21** — встроенную NoSQL базу данных в виде одного файла:

- **Расположение:** `src/BloodTracker.Api/bloodtracker.db`
- **Формат:** BSON документы
- **Резервное копирование:** просто скопируйте файл `.db`
- **Индексы:** автоматически создаются при инициализации

### Коллекции и индексы

```csharp
// Коллекции
ILiteCollection<Analysis> Analyses
ILiteCollection<Course> Courses
ILiteCollection<Drug> Drugs
ILiteCollection<IntakeLog> IntakeLogs
ILiteCollection<WorkoutProgram> WorkoutPrograms
ILiteCollection<WorkoutDay> WorkoutDays
ILiteCollection<WorkoutExercise> WorkoutExercises
ILiteCollection<WorkoutSet> WorkoutSets
ILiteCollection<ExerciseCatalogEntry> ExerciseCatalog

// Индексы
Analyses.EnsureIndex(x => x.Date)                    // Поиск по дате
Courses.EnsureIndex(x => x.IsActive)                 // Поиск активного курса
IntakeLogs.EnsureIndex(x => x.Date)                 // Поиск по дате
WorkoutDays.EnsureIndex(x => x.ProgramId)           // Поиск дней программы
WorkoutDays.EnsureIndex(x => x.DayOfWeek)           // Поиск по дню недели
WorkoutExercises.EnsureIndex(x => x.ProgramId)      // Поиск упражнений программы
WorkoutExercises.EnsureIndex(x => x.DayId)          // Поиск упражнений дня
WorkoutSets.EnsureIndex(x => x.ExerciseId)         // Поиск подходов упражнения
ExerciseCatalog.EnsureIndex(x => x.Id, unique: true) // Уникальный ID
ExerciseCatalog.EnsureIndex(x => x.MuscleGroup)     // Поиск по группе мышц
```

### Особенности

- **Shared connection** — все репозитории используют один экземпляр БД
- **Автоматические индексы** — создаются при первом запуске
- **Транзакции** — не поддерживаются между коллекциями (ограничение LiteDB)
- **Миграции** — не требуются, схема определяется классами

## 📡 API Endpoints

### Analyses (Анализы)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/analyses` | Получить все анализы (отсортированы по дате DESC) |
| `GET` | `/api/analyses/{id}` | Получить анализ по ID |
| `GET` | `/api/analyses/{id}/alerts` | Получить отклонения от нормы для анализа |
| `GET` | `/api/analyses/compare?beforeId={id}&afterId={id}` | Сравнить два анализа (процентные изменения) |
| `POST` | `/api/analyses` | Создать новый анализ |
| `PUT` | `/api/analyses/{id}` | Обновить анализ |
| `DELETE` | `/api/analyses/{id}` | Удалить анализ |
| `POST` | `/api/analyses/import-pdf` | Импортировать анализ из PDF (multipart/form-data) |

### Courses (Курсы)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/courses/active` | Получить активный курс |
| `GET` | `/api/courses/dashboard` | Получить данные для dashboard |
| `POST` | `/api/courses` | Создать курс (автоматически деактивирует другие) |
| `PUT` | `/api/courses/{id}` | Обновить курс |

### Drugs (Препараты)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/drugs` | Получить все препараты |
| `POST` | `/api/drugs` | Создать препарат |
| `PUT` | `/api/drugs/{id}` | Обновить препарат |
| `DELETE` | `/api/drugs/{id}` | Удалить препарат |

### IntakeLogs (Журнал приёма)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/intakelogs?count={n}` | Получить последние N записей (по умолчанию 10) |
| `POST` | `/api/intakelogs` | Создать запись о приёме |
| `PUT` | `/api/intakelogs/{id}` | Обновить запись |
| `DELETE` | `/api/intakelogs/{id}` | Удалить запись |

### ReferenceRanges (Референсные значения)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/referenceranges` | Получить все референсные значения (50+ показателей) |

### WorkoutPrograms (Программы тренировок)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/workoutprograms` | Получить все программы |
| `GET` | `/api/workoutprograms/{id}` | Получить программу по ID |
| `POST` | `/api/workoutprograms` | Создать программу |
| `PUT` | `/api/workoutprograms/{id}` | Обновить программу |
| `DELETE` | `/api/workoutprograms/{id}` | Удалить программу |

### WorkoutDays (Дни тренировок)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/workoutdays?programId={id}` | Получить дни программы |
| `GET` | `/api/workoutdays/{id}` | Получить день по ID |
| `POST` | `/api/workoutdays` | Создать день |
| `PUT` | `/api/workoutdays/{id}` | Обновить день |
| `DELETE` | `/api/workoutdays/{id}` | Удалить день |

### WorkoutExercises (Упражнения)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/workoutexercises?dayId={id}` | Получить упражнения дня |
| `GET` | `/api/workoutexercises?programId={id}` | Получить упражнения программы |
| `GET` | `/api/workoutexercises/{id}` | Получить упражнение по ID |
| `POST` | `/api/workoutexercises` | Создать упражнение |
| `PUT` | `/api/workoutexercises/{id}` | Обновить упражнение |
| `DELETE` | `/api/workoutexercises/{id}` | Удалить упражнение |

### WorkoutSets (Подходы)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/workoutsets?exerciseId={id}` | Получить подходы упражнения |
| `GET` | `/api/workoutsets/{id}` | Получить подход по ID |
| `POST` | `/api/workoutsets` | Создать подход |
| `PUT` | `/api/workoutsets/{id}` | Обновить подход |
| `DELETE` | `/api/workoutsets/{id}` | Удалить подход |

### Health Check

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/healthz` | Проверка работоспособности API |

## 🔍 Референсные значения

Приложение содержит **более 50 референсных значений** для различных показателей анализов крови:

### Гормоны (10 показателей)
- **testosterone** — Тестостерон общий (8.33-30.19 нмоль/л)
- **free-testosterone** — Тестостерон свободный (0.22-0.77 нмоль/л)
- **lh** — ЛГ (0.57-12.07 мМЕ/мл)
- **fsh** — ФСГ (0.95-11.95 мМЕ/мл)
- **prolactin** — Пролактин (72.66-407.40 мМЕ/л)
- **estradiol** — Эстрадиол (40-161 пмоль/л)
- **shbg** — ГСПГ (16.2-68.5 нмоль/л)
- **tsh** — ТТГ (0.35-4.94 мкМЕ/мл)
- **igf1** — ИФР-1 (115-358 нг/мл)
- **fai** — Индекс свободных андрогенов (24.5-113.3%)

### Липиды (8 показателей)
- **cholesterol** — Холестерин общий (3.4-5.2 ммоль/л)
- **hdl** — ЛПВП (HDL) (>1.03 ммоль/л)
- **ldl** — ЛПНП (LDL) (<2.6 ммоль/л)
- **triglycerides** — Триглицериды (<1.7 ммоль/л)
- **vldl** — ЛПОНП (0.16-0.85 ммоль/л)
- **atherogenic** — Коэффициент атерогенности (1.0-2.5)
- **non-hdl-cholesterol** — Холестерин не-ЛПВП (<3.8 ммоль/л)
- **lipoprotein-a** — Липопротеин (а) (<30 мг/дл)
- **apolipoprotein-a1** — Аполипопротеин A1 (1.05-1.75 г/л)
- **apolipoprotein-b** — Аполипопротеин B (0.60-1.40 г/л)

### Печёночные ферменты (6 показателей)
- **alt** — АЛТ (<50 Ед/л)
- **ast** — АСТ (<50 Ед/л)
- **ggt** — ГГТ (<55 Ед/л)
- **alp** — Щелочная фосфатаза (30-120 Ед/л)
- **bilirubin** — Билирубин общий (5-21 мкмоль/л)
- **bilirubin-direct** — Билирубин прямой (<3.4 мкмоль/л)
- **cholinesterase** — Холинэстераза (4.62-11.50 кЕД/л)

### Общие показатели (7 показателей)
- **hemoglobin** — Гемоглобин (130-170 г/л)
- **hematocrit** — Гематокрит (39-49%)
- **glucose** — Глюкоза (3.9-6.1 ммоль/л)
- **hba1c** — HbA1c (<6.0%)
- **creatinine** — Креатинин (62-106 мкмоль/л)
- **urea** — Мочевина (2.5-8.3 ммоль/л)
- **protein** — Общий белок (66-83 г/л)
- **vitd** — Витамин D (30-100 нг/мл)

### Коагуляция (3 показателя)
- **pt** — Протромбиновое время (12-16 сек)
- **pt-percent** — Протромбин % (по Квику) (70-120%)
- **inr** — МНО (0.8-1.2)

### Белковые фракции (10 показателей)
- **albumin** — Альбумин (40.2-47.6 г/л)
- **albumin-percent** — Альбумин % (55.8-66.1%)
- **alpha1-globulin** — Альфа-1 глобулин (2.1-3.5 г/л)
- **alpha1-globulin-percent** — Альфа-1 глобулин % (2.9-4.9%)
- **alpha2-globulin** — Альфа-2 глобулин (5.1-8.5 г/л)
- **alpha2-globulin-percent** — Альфа-2 глобулин % (7.1-11.8%)
- **beta1-globulin** — Бета-1 глобулин (3.4-5.2 г/л)
- **beta1-globulin-percent** — Бета-1 глобулин % (4.7-7.2%)
- **beta2-globulin** — Бета-2 глобулин (2.3-4.7 г/л)
- **beta2-globulin-percent** — Бета-2 глобулин % (3.2-6.5%)
- **gamma-globulin** — Гамма-глобулин (8.0-13.5 г/л)
- **gamma-globulin-percent** — Гамма-глобулин % (11.1-18.8%)

### Онкомаркеры (1 показатель)
- **afp** — Альфа-фетопротеин (АФП) (<5.9 МЕ/мл)

### Определение статуса значения

Статус определяется автоматически на основе референсных значений:

```csharp
public ValueStatus GetStatus(string key, double value)
{
    var margin = (range.Max - range.Min) * 0.1; // 10% запас
    
    if (value < range.Min) return ValueStatus.Low;
    if (value > range.Max + margin) return ValueStatus.High;
    if (value > range.Max) return ValueStatus.SlightlyHigh;
    return ValueStatus.Normal;
}
```

## 🔍 Парсинг PDF

Приложение поддерживает два метода парсинга PDF-отчётов лабораторий:

### 1. OCR (Tesseract) — основной метод

**Процесс:**
1. Извлечение страниц из PDF через Docnet.Core
2. Конвертация страниц в изображения (масштаб 3x для качества)
3. Предобработка изображений через OpenCV:
   - Конвертация в grayscale
   - CLAHE (Contrast Limited Adaptive Histogram Equalization)
   - Адаптивная бинаризация
4. OCR распознавание через Tesseract (русский + английский)
5. Группировка слов в строки по Y-координатам
6. Поиск соответствий названий показателей через маппинг
7. Извлечение числовых значений из строк
8. Валидация значений по ожидаемым диапазонам

**Особенности:**
- Автоматическая загрузка языковых данных при первом использовании
- Поиск значений на той же строке, следующей или предыдущей
- Обработка многостраничных документов
- Фильтрация служебных строк (заголовки, подписи)
- Минимальная уверенность распознавания: 60%

### 2. Gemini Vision API — опциональный метод

**Процесс:**
1. Извлечение всех страниц PDF в изображения
2. Отправка всех страниц в Gemini 2.5 Flash за один запрос
3. Промпт с инструкциями по извлечению данных в JSON формате
4. Парсинг JSON ответа
5. Маппинг названий на ключи показателей
6. Валидация значений

**Преимущества:**
- Более точное распознавание сложных таблиц
- Понимание структуры документа
- Обработка всех страниц за один запрос

**Требования:**
- API ключ Gemini (см. раздел "Настройка")
- Интернет соединение

**Fallback:** Если Gemini недоступен или не вернул данные, используется OCR.

### Поддерживаемые показатели в PDF парсинге

Парсер распознаёт те же 50+ показателей, что и в референсных значениях. Маппинг названий выполняется через словарь `NameMappings` в `PdfParserService.cs`, который содержит различные варианты названий для каждого показателя.

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
    "ApiKey": "ваш-gemini-api-ключ"
  },
  "ExerciseCatalog": {
    "ApiKey": "ваш-rapidapi-ключ",
    "ApiUrl": "https://exercisedb.p.rapidapi.com/exercises"
  },
  "Serilog": {
    "WriteTo": [
      {
        "Name": "Console",
        "Args": {
          "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"
        }
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

### Переменные окружения

Можно использовать переменные окружения вместо appsettings.json:

```bash
set GEMINI_API_KEY=ваш-ключ
set EXERCISE_CATALOG_API_KEY=ваш-ключ
set EXERCISE_CATALOG_API_URL=https://exercisedb.p.rapidapi.com/exercises
```

### Логирование

Логи сохраняются в папке `src/BloodTracker.Api/logs/`:
- **Формат:** `app-YYYYMMDD.log`
- **Хранение:** 7 дней (автоматическая ротация)
- **Уровни:** Information, Warning, Error
- **Консоль:** форматированный вывод с временными метками

## 📦 Установка и настройка

### Требования

- **.NET 8 SDK** или выше
- **Windows 10/11** (тестировалось на Windows 10/11)
- **ElectronNET.CLI** (устанавливается автоматически или вручную)
- **Интернет** (для загрузки Tesseract данных и внешних API, опционально)

### Установка ElectronNET.CLI

```bash
dotnet tool install ElectronNET.CLI -g
```

**Примечание:** Проект использует **ElectronNET.API 23.6.2** (новая версия), которая полностью переписана и поддерживает .NET 8. Это не старый ElectronNET, а современная реализация с единым процессом.

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

### Настройка Exercise Catalog API (опционально)

Для использования каталога упражнений:

1. Получите API ключ на [RapidAPI](https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb)
2. Добавьте в `appsettings.json`:

```json
{
  "ExerciseCatalog": {
    "ApiKey": "ваш-rapidapi-ключ",
    "ApiUrl": "https://exercisedb.p.rapidapi.com/exercises"
  }
}
```

**Примечание:** Без API ключа каталог будет использовать только кэшированные данные (если есть).

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

## 🎨 Особенности UI

- **Адаптивный дизайн** — работает на разных размерах окна (минимум 1000x700)
- **Тёмная тема** — современный внешний вид с тёмным фоном
- **Модальные окна** — для создания и редактирования всех сущностей
- **Таблицы с сортировкой** — удобный просмотр данных
- **Графики** — визуализация изменений показателей во времени
- **ASCII-арт эффекты** — декоративные элементы для групп мышц
- **Навигация** — переключение между страницами (Dashboard, Analyses, Courses, Workouts)

## 🔧 Разработка

### Добавление нового показателя анализа

1. **Добавьте маппинг в `PdfParserService.cs`:**

```csharp
private static readonly Dictionary<string, string[]> NameMappings = new()
{
    ["new-indicator"] = ["Название показателя", "Альтернативное название", "EN название"],
};
```

2. **Добавьте ожидаемый диапазон значений:**

```csharp
private static readonly Dictionary<string, (double Min, double Max)> ExpectedRanges = new()
{
    ["new-indicator"] = (minValue, maxValue),
};
```

3. **Добавьте референсные значения в `ReferenceRangeService.cs`:**

```csharp
["new-indicator"] = new() 
{ 
    Key = "new-indicator", 
    Name = "Название показателя", 
    Min = minValue, 
    Max = maxValue, 
    Unit = "ед. изм.", 
    Category = "Категория",
    Description = "Описание показателя"
},
```

### Добавление нового API endpoint

1. Создайте Query/Command в соответствующей папке `BloodTracker.Application`
2. Создайте Handler в папке Handlers
3. Зарегистрируйте Handler через MediatR (автоматически)
4. Добавьте endpoint в контроллер в `BloodTracker.Api/Controllers/ApiControllers.cs`

### Добавление новой сущности

1. Создайте класс в `BloodTracker.Domain/Models/Entities.cs`
2. Добавьте коллекцию в `BloodTrackerDbContext.cs`
3. Создайте интерфейс репозитория в `BloodTracker.Application/Common/Interfaces.cs`
4. Реализуйте репозиторий в `BloodTracker.Infrastructure/Persistence/Repositories.cs`
5. Зарегистрируйте репозиторий в DI контейнере
6. Создайте Commands/Queries/Handlers/DTOs в Application слое
7. Добавьте контроллер в Api слой

### Тестирование парсинга PDF

1. Поместите PDF файл в папку проекта
2. Используйте Swagger UI для тестирования endpoint `/api/analyses/import-pdf`
3. Проверьте логи в `logs/` для отладки
4. Проверьте результат в базе данных или через API

## 🐛 Известные ограничения

- **Платформа:** Приложение работает только на Windows (из-за ElectronNET и OpenCvSharp)
- **Tesseract:** Требует загрузки языковых данных при первом использовании (~10-20 МБ)
- **Gemini API:** Имеет лимиты на количество запросов (бесплатный tier)
- **LiteDB:** Не поддерживает транзакции между коллекциями
- **Exercise Catalog:** Требует внешний API ключ для обновления каталога
- **PDF парсинг:** Точность зависит от качества PDF (сканированные документы могут быть менее точными)

## 📝 Лицензия

Проект для личного использования.

## 👤 Автор

TXCSLM

---

**Версия:** 1.0.0  
**Последнее обновление:** 2025
