# BloodTracker.Domain

Доменный слой приложения. Содержит все сущности, enum-ы и value objects. Не зависит ни от каких других проектов.

## Структура

```
BloodTracker.Domain/
└── Models/
    └── Entities.cs    — все доменные сущности и перечисления
```

## Базовый класс

```csharp
public abstract class Entity
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
```

Все основные сущности наследуются от `Entity` (автогенерация `Id` и `CreatedAt`).

## Сущности

| Класс | Наследует Entity | Описание |
|-------|:---:|----------|
| `Analysis` | ✅ | Результаты анализа крови. Хранит показатели в `Dictionary<string, double> Values` |
| `Course` | ✅ | Курс препаратов с датами начала/окончания и флагом `IsActive` |
| `Drug` | ✅ | Препарат курса. Связан с `Course` через `CourseId`, с каталогом через `CatalogItemId` и `ManufacturerId` |
| `IntakeLog` | ✅ | Запись о приёме препарата. Ссылается на `Drug` и опционально на `Purchase` |
| `Purchase` | ✅ | Покупка препарата (количество, цена, vendor, производитель) |
| `WorkoutProgram` | ✅ | Тренировочная программа |
| `WorkoutDay` | ✅ | День тренировочной программы (привязан к `DayOfWeek`) |
| `WorkoutExercise` | ✅ | Упражнение дня (с `MuscleGroup`) |
| `WorkoutSet` | ✅ | Подход упражнения (повторения, вес, длительность) |

### Каталожные сущности (без наследования от Entity)

| Класс | Описание |
|-------|----------|
| `DrugCatalogItem` | Элемент каталога препаратов (catalog.db). Содержит рейтинги, период полувыведения, дозировки и т.д. |
| `Manufacturer` | Производитель препаратов (Pharmaceutical / UGL) |
| `ExerciseCatalogEntry` | Элемент каталога упражнений (bodypart, target, equipment) |
| `ReferenceRange` | Референсные значения для показателя анализа крови (record) |
| `AppUser` | Пользователь системы (auth.db). Google OAuth + email auth |
| `AuthCode` | Код авторизации по email (auth.db) |

## Перечисления (Enums)

| Enum | Значения |
|------|----------|
| `DrugType` | `Oral`, `Injectable`, `Subcutaneous`, `Transdermal`, `Nasal` |
| `DrugCategory` | `AAS`, `Peptide`, `SARM`, `PCT`, `FatBurner`, `GrowthHormone`, `AntiEstrogen`, `Insulin`, `Prohormone`, `DopamineAgonist`, `Other` |
| `DrugSubcategory` | `None`, `Testosterone`, `Nandrolone`, `Trenbolone`, `Boldenone`, ... `General` |
| `ManufacturerType` | `Pharmaceutical`, `UGL` |
| `ValueStatus` | `Normal`, `Low`, `SlightlyHigh`, `High`, `Pending` |
| `MuscleGroup` | `FullBody`, `Chest`, `Back`, `Shoulders`, `Biceps`, `Triceps`, `Forearms`, `Abs`, `Glutes`, `Quadriceps`, `Hamstrings`, `Calves` |

## Связи между сущностями

```
Course 1──N Drug
Drug 1──N IntakeLog
Drug 1──N Purchase
Purchase 1──N IntakeLog (опционально)
WorkoutProgram 1──N WorkoutDay
WorkoutDay 1──N WorkoutExercise
WorkoutExercise 1──N WorkoutSet
DrugCatalogItem ──> Drug (через CatalogItemId)
Manufacturer ──> Drug (через ManufacturerId)
```

> **Примечание:** Связи реализованы через Guid FK-поля, не через navigation properties. ORM-навигация отсутствует.
