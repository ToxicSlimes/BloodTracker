# CONTROLLERS & API MAP — BloodTracker.Api

## Обзор

Все контроллеры в одном файле: `Controllers/ApiControllers.cs`. 12 контроллеров, ~50 эндпоинтов.

---

## 🔓 Public Endpoints

### AuthController — `/api/auth`

| Method | Path | Body | Response | Описание |
|--------|------|------|----------|----------|
| `POST` | `/api/auth/google` | `{ idToken: string }` | `AuthResponse { token, user }` | Вход через Google OAuth |
| `POST` | `/api/auth/send-code` | `{ email: string }` | `{ message, devCode? }` | Отправка кода на email |
| `POST` | `/api/auth/verify-code` | `{ email, code: string }` | `AuthResponse { token, user }` | Проверка кода |
| `GET` | `/api/auth/config` | — | `{ googleClientId }` | Google Client ID для фронта |
| `GET` | `/api/auth/me` | — | `UserInfo { id, email, displayName }` | 🔒 Текущий пользователь |

---

## 🔒 Protected Endpoints (JWT Required)

### AnalysesController — `/api/analyses`

| Method | Path | Params | Body | Response | Описание |
|--------|------|--------|------|----------|----------|
| `GET` | `/api/analyses` | — | — | `List<AnalysisDto>` | Все анализы |
| `GET` | `/api/analyses/{id}` | `id: Guid` | — | `AnalysisDto` | Анализ по ID |
| `GET` | `/api/analyses/{id}/alerts` | `id: Guid` | — | `List<AnalysisValueDto>` | Показатели вне нормы |
| `GET` | `/api/analyses/compare` | `?beforeId&afterId: Guid` | — | `CompareAnalysesDto` | Сравнение двух анализов |
| `POST` | `/api/analyses` | — | `CreateAnalysisDto` | `AnalysisDto` | Создать анализ |
| `PUT` | `/api/analyses/{id}` | `id: Guid` | `UpdateAnalysisDto` | `AnalysisDto` | Обновить анализ |
| `DELETE` | `/api/analyses/{id}` | `id: Guid` | — | 204/404 | Удалить анализ |
| `POST` | `/api/analyses/import-pdf` | — | `multipart/form-data: file, label?` | `ImportPdfResultDto` | Импорт из PDF |

### CoursesController — `/api/courses`

| Method | Path | Params | Body | Response |
|--------|------|--------|------|----------|
| `GET` | `/api/courses/active` | — | — | `CourseDto` / 404 |
| `POST` | `/api/courses` | — | `CreateCourseDto` | `CourseDto` |
| `PUT` | `/api/courses/{id}` | `id: Guid` | `CreateCourseDto` | `CourseDto` |
| `GET` | `/api/courses/dashboard` | — | — | `DashboardDto` |

### DrugsController — `/api/drugs`

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/drugs` | — | `List<DrugDto>` |
| `POST` | `/api/drugs` | `CreateDrugDto` | `DrugDto` |
| `PUT` | `/api/drugs/{id}` | `UpdateDrugDto` | `DrugDto` |
| `DELETE` | `/api/drugs/{id}` | — | 204/404 |

**Валидация:** `DrugType` проверяется через `Enum.IsDefined()`.

### IntakeLogsController — `/api/intakelogs`

| Method | Path | Query Params | Body | Response |
|--------|------|-------------|------|----------|
| `GET` | `/api/intakelogs` | `?drugId&startDate&endDate&limit` | — | `List<IntakeLogDto>` |
| `POST` | `/api/intakelogs` | — | `CreateIntakeLogDto` | `IntakeLogDto` |
| `PUT` | `/api/intakelogs/{id}` | — | `UpdateIntakeLogDto` | `IntakeLogDto` |
| `DELETE` | `/api/intakelogs/{id}` | — | — | 204/404 |

**Логика GET:** если есть query params → фильтрация (`GetIntakeLogsByDrugQuery`), иначе → последние N записей.

### PurchasesController — `/api/purchases`

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/purchases` | — | `List<PurchaseDto>` |
| `GET` | `/api/purchases/by-drug/{drugId}` | — | `List<PurchaseDto>` |
| `POST` | `/api/purchases` | `CreatePurchaseDto` | `PurchaseDto` |
| `PUT` | `/api/purchases/{id}` | `UpdatePurchaseDto` | `PurchaseDto` |
| `DELETE` | `/api/purchases/{id}` | — | 204/404 |
| `GET` | `/api/purchases/options/{drugId}` | — | `List<PurchaseOptionDto>` |

**Валидация:** Quantity > 0, Price >= 0.

### DrugStatisticsController — `/api/drugstatistics`

| Method | Path | Query Params | Response |
|--------|------|-------------|----------|
| `GET` | `/api/drugstatistics/{drugId}` | — | `DrugStatisticsDto` |
| `GET` | `/api/drugstatistics/inventory` | — | `InventoryDto` |
| `GET` | `/api/drugstatistics/{drugId}/timeline` | `?startDate&endDate` | `ConsumptionTimelineDto` |
| `GET` | `/api/drugstatistics/{drugId}/purchase-vs-consumption` | — | `PurchaseVsConsumptionDto` |

### ReferenceRangesController — `/api/referenceranges`

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/referenceranges` | `List<ReferenceRange>` |

### WorkoutProgramsController — `/api/workoutprograms`

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/workoutprograms` | — | `List<WorkoutProgramDto>` |
| `GET` | `/api/workoutprograms/{id}` | — | `WorkoutProgramDto` |
| `POST` | `/api/workoutprograms` | `CreateWorkoutProgramDto` | `WorkoutProgramDto` |
| `PUT` | `/api/workoutprograms/{id}` | `UpdateWorkoutProgramDto` | `WorkoutProgramDto` |
| `DELETE` | `/api/workoutprograms/{id}` | — | 204/404 |

### WorkoutDaysController — `/api/workoutdays`

| Method | Path | Query Params | Body | Response |
|--------|------|-------------|------|----------|
| `GET` | `/api/workoutdays` | `?programId: Guid` | — | `List<WorkoutDayDto>` |
| `GET` | `/api/workoutdays/{id}` | — | — | `WorkoutDayDto` |
| `POST` | `/api/workoutdays` | — | `CreateWorkoutDayDto` | `WorkoutDayDto` |
| `PUT` | `/api/workoutdays/{id}` | — | `UpdateWorkoutDayDto` | `WorkoutDayDto` |
| `DELETE` | `/api/workoutdays/{id}` | — | — | 204/404 |

### WorkoutExercisesController — `/api/workoutexercises`

| Method | Path | Query Params | Body | Response |
|--------|------|-------------|------|----------|
| `GET` | `/api/workoutexercises` | `?programId` или `?dayId` (required) | — | `List<WorkoutExerciseDto>` |
| `GET` | `/api/workoutexercises/{id}` | — | — | `WorkoutExerciseDto` |
| `POST` | `/api/workoutexercises` | — | `CreateWorkoutExerciseDto` | `WorkoutExerciseDto` |
| `PUT` | `/api/workoutexercises/{id}` | — | `UpdateWorkoutExerciseDto` | `WorkoutExerciseDto` |
| `DELETE` | `/api/workoutexercises/{id}` | — | — | 204/404 |

### WorkoutSetsController — `/api/workoutsets`

| Method | Path | Query Params | Body | Response |
|--------|------|-------------|------|----------|
| `GET` | `/api/workoutsets` | `?exerciseId: Guid` | — | `List<WorkoutSetDto>` |
| `GET` | `/api/workoutsets/{id}` | — | — | `WorkoutSetDto` |
| `POST` | `/api/workoutsets` | — | `CreateWorkoutSetDto` | `WorkoutSetDto` |
| `PUT` | `/api/workoutsets/{id}` | — | `UpdateWorkoutSetDto` | `WorkoutSetDto` |
| `DELETE` | `/api/workoutsets/{id}` | — | — | 204/404 |

### ExerciseCatalogController — `/api/exercisecatalog`

| Method | Path | Query Params | Response |
|--------|------|-------------|----------|
| `GET` | `/api/exercisecatalog` | `?muscleGroup: MuscleGroup&search: string` | `List<ExerciseCatalogEntry>` |

### DrugCatalogController — `/api/drugcatalog`

| Method | Path | Query Params | Response |
|--------|------|-------------|----------|
| `GET` | `/api/drugcatalog/substances` | `?category&subcategory&drugType&search` | `List<DrugCatalogItem>` |
| `GET` | `/api/drugcatalog/substances/popular` | — | `List<DrugCatalogItem>` |
| `GET` | `/api/drugcatalog/substances/{id}` | — | `DrugCatalogItem` |
| `GET` | `/api/drugcatalog/manufacturers` | `?type&search` | `List<Manufacturer>` |
| `GET` | `/api/drugcatalog/manufacturers/{id}` | — | `Manufacturer` |
| `GET` | `/api/drugcatalog/categories` | — | `List<{ value, name }>` |

---

## 🔴 Admin Endpoints

### AdminController — `/api/admin`

Требуется `[Authorize(Policy = "Admin")]`.

| Method | Path | Body | Response | Описание |
|--------|------|------|----------|----------|
| `GET` | `/api/admin/users` | — | `List<AdminUserDto>` | Все пользователи с stats |
| `GET` | `/api/admin/users/{id}/summary` | — | `AdminUserSummaryDto` | Детали пользователя |
| `GET` | `/api/admin/stats` | — | `AdminStatsDto` | Глобальная статистика |
| `PUT` | `/api/admin/users/{id}/role` | `{ isAdmin: bool }` | `{ email, isAdmin }` | Изменить роль |
| `DELETE` | `/api/admin/users/{id}` | — | 204/404 | Удалить пользователя + DB |
| `GET` | `/api/admin/impersonate/{id}` | — | `ImpersonateResponse` | Имперсонация |

**Особенности AdminController:**
- Напрямую использует `AuthDbContext` и `BloodTrackerDbContext` (без MediatR)
- Читает per-user DB файлы для сбора статистики
- Удаление пользователя удаляет `user_{id}.db` файл

---

## System Endpoints

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/healthz` | `{ status: "healthy", timestamp }` |
| `GET` | `/swagger` | Swagger UI |
