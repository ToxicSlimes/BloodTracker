# BloodTracker.Api

ASP.NET Core Web API + Electron.NET десктопное приложение для трекинга анализов крови, курсов препаратов и тренировок.

## Архитектура

- **Фреймворк:** ASP.NET Core + Electron.NET (гибридное desktop/web приложение)
- **Аутентификация:** JWT (Google OAuth + Email-код)
- **CQRS:** MediatR для commands/queries
- **БД:** LiteDB (per-user файлы)
- **Логирование:** Serilog (консоль + файлы `logs/app-.log`)

## Startup Pipeline

```
Program.cs
├── Serilog конфигурация (Console + File)
├── Electron.NET интеграция (UseElectron)
├── AddApiServices() — DI, JWT, CORS, Swagger, MediatR, Infrastructure
├── Build()
├── DataMigrationService.MigrateIfNeeded() — миграция старых БД
├── DrugCatalogSeedService.SeedIfNeeded() — сид каталога препаратов
├── UseApi() — middleware pipeline
│   ├── Swagger UI
│   ├── Static Files (wwwroot) + EmbeddedFileProvider для single-file
│   ├── CORS ("AllowAll")
│   ├── Authentication + Authorization
│   ├── MapControllers
│   └── /healthz endpoint
├── StartAsync()
└── Electron Window (если HybridSupport.IsElectronActive)
```

## Контроллеры и эндпоинты

Все контроллеры в одном файле: `Controllers/ApiControllers.cs`

### AuthController (`/api/auth`) — публичный
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/google` | Вход через Google OAuth (IdToken) |
| POST | `/api/auth/send-code` | Отправка email-кода (6 цифр, 10 мин) |
| POST | `/api/auth/verify-code` | Проверка email-кода |
| GET | `/api/auth/config` | Google ClientId для фронта |
| GET | `/api/auth/me` | 🔒 Текущий пользователь |

### AnalysesController (`/api/analyses`) — 🔒 JWT
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/analyses` | Все анализы пользователя |
| GET | `/api/analyses/{id}` | Анализ по ID |
| GET | `/api/analyses/{id}/alerts` | Значения вне нормы |
| GET | `/api/analyses/compare?beforeId&afterId` | Сравнение двух анализов |
| POST | `/api/analyses` | Создать анализ |
| PUT | `/api/analyses/{id}` | Обновить анализ |
| DELETE | `/api/analyses/{id}` | Удалить анализ |
| POST | `/api/analyses/import-pdf` | Импорт из PDF (multipart/form-data) |

### CoursesController (`/api/courses`) — 🔒 JWT
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/courses/active` | Активный курс |
| POST | `/api/courses` | Создать курс |
| PUT | `/api/courses/{id}` | Обновить курс |
| GET | `/api/courses/dashboard` | Дашборд |

### DrugsController (`/api/drugs`) — 🔒 JWT
CRUD для препаратов пользователя с валидацией `DrugType`.

### IntakeLogsController (`/api/intakelogs`) — 🔒 JWT
CRUD для записей приёма. GET поддерживает фильтрацию по `drugId`, `startDate`, `endDate`, `limit`.

### PurchasesController (`/api/purchases`) — 🔒 JWT
CRUD для покупок. GET `/by-drug/{drugId}`, GET `/options/{drugId}`. Валидация: `Quantity > 0`, `Price >= 0`.

### DrugStatisticsController (`/api/drugstatistics`) — 🔒 JWT
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/{drugId}` | Статистика по препарату |
| GET | `/inventory` | Инвентарь |
| GET | `/{drugId}/timeline` | Таймлайн потребления |
| GET | `/{drugId}/purchase-vs-consumption` | Покупки vs потребление |

### ReferenceRangesController (`/api/referenceranges`) — 🔒 JWT
GET `/` — все референсные диапазоны.

### Workout контроллеры — 🔒 JWT
- `WorkoutProgramsController` (`/api/workoutprograms`) — CRUD программ
- `WorkoutDaysController` (`/api/workoutdays`) — CRUD дней (по `programId`)
- `WorkoutExercisesController` (`/api/workoutexercises`) — CRUD упражнений (по `programId`/`dayId`)
- `WorkoutSetsController` (`/api/workoutsets`) — CRUD подходов (по `exerciseId`)

### ExerciseCatalogController (`/api/exercisecatalog`) — 🔒 JWT
GET `/` — каталог упражнений с фильтрацией по `muscleGroup` и `search`.

### DrugCatalogController (`/api/drugcatalog`) — 🔒 JWT
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/substances` | Поиск субстанций (category, subcategory, drugType, search) |
| GET | `/substances/popular` | Популярные субстанции |
| GET | `/substances/{id}` | Субстанция по ID |
| GET | `/manufacturers` | Поиск производителей |
| GET | `/manufacturers/{id}` | Производитель по ID |
| GET | `/categories` | Список категорий |

### AdminController (`/api/admin`) — 🔒 Admin policy
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/users` | Все пользователи + статистика |
| GET | `/users/{id}/summary` | Детальная сводка пользователя |
| GET | `/stats` | Общая статистика платформы |
| PUT | `/users/{id}/role` | Изменить роль (IsAdmin) |
| DELETE | `/users/{id}` | Удалить пользователя + его БД |
| GET | `/impersonate/{id}` | Impersonation токен (1 час) |

## Авторизация

- JWT Bearer с `Jwt:Secret` из конфигурации
- **Dev mode:** если `Jwt:Secret` пустой — валидация отключена (без подписи)
- **Admin policy:** требует claim `role=admin`
- Админы определяются через `Admin:Emails` в конфигурации

## Фронтенд (wwwroot/)

В `wwwroot/` находится SPA-фронтенд на vanilla JS/CSS. Раздаётся как статика с `MapFallbackToFile("index.html")`. Для single-file publish используется `EmbeddedFileProvider`. JS/CSS файлы отдаются с `Cache-Control: no-cache`.

## Конфигурация

```json
{
  "Jwt": { "Secret": "...", "Issuer": "BloodTracker", "ExpiresInDays": 30 },
  "Database": { "ConnectionString": "Filename=bloodtracker.db;Connection=shared" },
  "Google": { "ClientId": "...", "ClientSecret": "...", "RefreshToken": "..." },
  "Email": { "SmtpHost": "...", "SmtpPort": 587, "SmtpUser": "...", "SmtpPass": "...", "FromEmail": "..." },
  "Admin": { "Emails": ["admin@example.com"] }
}
```
