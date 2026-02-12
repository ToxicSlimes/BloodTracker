# TESTING GUIDE — BloodTracker.Infrastructure

> Тестов пока нет. Этот документ — шаблон, опирающийся на текущий код.

## Что тестировать в Infrastructure

### 1. Репозитории (Persistence/Repositories.cs)

Цель: убедиться, что репозитории правильно работают поверх LiteDB и соблюдают бизнес-ожидания.

Для тестов рекомендуется использовать **in-memory / temp file** LiteDB:

```csharp
var db = new BloodTrackerDbContext("Filename=:memory:;"); // или tmp-файл
var repo = new AnalysisRepository(db);
```

**Что проверять:**
- Insert/Update/Delete работает и возвращает ожидаемые данные
- Индексы используются корректно (порядок, фильтрация)
- `UpdatedAt` проставляется в `UpdateAsync`
- Специфическая логика:
  - `CourseRepository.CreateAsync` — деактивирует другие курсы
  - `IntakeLogRepository.GetRecentAsync(count)` — сортировка и лимит
  - `PurchaseRepository.GetAllAsync` — сортировка по дате

### 2. DataMigrationService

Цель: миграция `bloodtracker.db` → `user_{id}.db` и усыновление orphan DB.

Подход: писать **file-based tests** в temp директории.

Сценарии:
1. **Initial migration**
   - Создать фейковый `bloodtracker.db`
   - Пустой `auth.db` (0 пользователей)
   - Вызвать `MigrateIfNeeded()`
   - Ожидания:
     - Появился placeholder user `admin@bloodtracker.local`
     - Существует `user_{placeholderId}.db` (копия старой DB)
     - `bloodtracker.db` переименован в `.bak`

2. **Reassign placeholder → real user**
   - В `auth.db` добавить placeholder + real user
   - В файловой системе создать `user_{placeholderId}.db`
   - Вызвать `MigrateIfNeeded()`
   - Ожидания:
     - Файл переименован в `user_{realUserId}.db`
     - Placeholder user удалён из `auth.db`

3. **Adopt orphans**
   - В директории создать `user_X.db` без пользователя X
   - Добавить админ-пользователя в `auth.db`
   - Вызвать `MigrateIfNeeded()`
   - Ожидания:
     - Самый большой orphan переименован в `user_{adminId}.db`

### 3. DrugCatalogSeedService

Цель: корректный сид каталога в `catalog.db`.

Сценарии:
- При пустой БД:
  - После `SeedIfNeeded()` коллекции `DrugCatalog` и `Manufacturers` заполнены
  - `_metadata.seed_version == CurrentVersion`
- При той же версии:
  - Повторный вызов `SeedIfNeeded()` не очищает и не пересоздаёт данные (idempotent)
- При уменьшенной версии:
  - Ручное понижение `_metadata.version` → повторный сид (DeleteAll + InsertBulk)

### 4. DrugCatalogService

Цель: корректная фильтрация и поиск.

Сценарии для `Search(...)`:
- Фильтр по `DrugCategory`/`DrugSubcategory`/`DrugType`
- `HasBothForms == true` — попадает при любом `DrugType`
- Поиск по `Name`, `NameEn`, `ActiveSubstance`

Сценарии для `SearchManufacturers(...)`:
- Фильтр по `ManufacturerType`
- Поиск по `Name` и `Country`

### 5. ExerciseCatalogService

Цель: кэширование каталога упражнений и маппинг в `MuscleGroup`.

Рекомендуемый подход — **mock HttpClient** (через `HttpMessageHandler`).

Сценарии:
1. **Кэш свежий** (записи с `CachedAt = DateTime.UtcNow`) → не ходим в API, возвращаем кэш
2. **Кэш старый** → выполняется HTTP запрос, кэш обновляется
3. **API возвращает пустой список** → используем старый кэш
4. **API недоступно / ошибка** → логируем ошибку, возвращаем кэш

Маппинг `MapToMuscleGroup(bodyPart, target)`:
- `target` содержит `biceps` → `MuscleGroup.Biceps`
- `bodyPart = "chest"` → `MuscleGroup.Chest`
- Неопознанные → `MuscleGroup.FullBody`

### 6. ReferenceRangeService

Цель: корректные референсы и статусы.

Сценарии:
- `GetRange("testosterone")` возвращает диапазон 8.33–30.19 и юнит `нмоль/л`
- `GetStatus(key, value)`:
  - `value < Min` → `Low`
  - `value` между `Min` и `Max` → `Normal`
  - `value` чуть выше `Max` (до +10%) → `SlightlyHigh`
  - `value` намного выше `Max + 10%` → `High`

---

## Интеграционные тесты (LiteDB + Repositories)

Можно сделать лёгкий интеграционный слой:

- Создавать `BloodTrackerDbContext` с временным файлом
- Гонять реальные репозитории (Analysis, Course, Drug, IntakeLog, Purchase, Workout*)
- Проверять end-to-end сценарии:
  - Создать Course → Drug → Purchase → IntakeLog
  - Посчитать остатки через `GetInventoryHandler` (но это уже Application слой)

**Важно:** интеграционные тесты лучше размещать в отдельном проекте (например, `BloodTracker.IntegrationTests`) и поднимать только нужные части DI.

---

## Стек для тестов

Рекомендуемый набор:
- xUnit — тестовый фреймворк
- FluentAssertions — ассерты
- NSubstitute / Moq — моки
- `System.IO.Abstractions` (опционально) — для тестирования логики с файлами (DataMigrationService)

---

## Чеклист при добавлении нового репозитория/сервиса

- [ ] Есть unit-тесты на основные сценарии
- [ ] Ошибочные сценарии (исключения, edge cases) покрыты
- [ ] Используется временная LiteDB (файл или `:memory:`)
- [ ] Для HTTP-зависимостей — замоканный `HttpClient`
- [ ] Для файловой логики — тесты в temp директории, не трогаем реальные файлы
