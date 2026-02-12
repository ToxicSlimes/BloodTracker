# DO / DON'T — BloodTracker.Domain

## ✅ DO

- Все сущности наследуют от `Entity` (получают `Id`, `CreatedAt`, `UpdatedAt`)
- Используй `sealed class` для конкретных сущностей — они не предполагают наследования
- Используй `required` модификатор для обязательных свойств (`required string Name`)
- Используй `init` для свойств, которые не должны меняться после создания (`Id`, `CreatedAt`)
- Каталожные сущности (`DrugCatalogItem`, `Manufacturer`, `ExerciseCatalogEntry`) — **без наследования от Entity**, у них свой `string Id`
- Enum'ы держи в том же файле `Entities.cs` — всё в одном месте
- Добавляй XML-комментарии `/// <summary>` к каждой сущности
- `record` используй для value objects (`ReferenceRange`)

## ❌ DON'T

- **НЕ** добавляй навигационные свойства (EF-стиль) — проект использует LiteDB, связи через `Guid? CourseId`
- **НЕ** добавляй бизнес-логику в доменные модели — они чистые data-контейнеры (Anemic Domain Model)
- **НЕ** используй `abstract` для конкретных сущностей — только `Entity` абстрактный
- **НЕ** добавляй валидацию в модели — валидация живёт в Application слое (FluentValidation)
- **НЕ** используй `ICollection<T>` или `List<T>` для связей — только FK (`Guid? CourseId`)
- **НЕ** добавляй атрибуты ORM (`[Key]`, `[Table]`) — LiteDB работает по конвенциям
- **НЕ** меняй тип `Id` — везде `Guid`, кроме каталожных сущностей (там `string`)
- **НЕ** добавляй `UserId` к сущностям — изоляция через per-user базу данных (`user_{userId}.db`)
