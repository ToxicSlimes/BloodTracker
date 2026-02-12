# CONTRIBUTING — BloodTracker.Domain

## Как добавить новую сущность

### 1. Определи тип сущности

| Тип | Наследование | Id | Пример |
|-----|-------------|-----|--------|
| Пользовательские данные | `Entity` | `Guid` (auto) | `Analysis`, `Course`, `Drug` |
| Каталожные данные | Без наследования | `string` (manual) | `DrugCatalogItem`, `Manufacturer` |
| Value Object | `record` | Нет | `ReferenceRange` |

### 2. Создай сущность в `Models/Entities.cs`

Все сущности живут в **одном файле** — `Models/Entities.cs`. Это осознанное решение для простоты навигации.

```csharp
/// <summary>
/// Описание сущности
/// </summary>
public sealed class MyEntity : Entity
{
    public required string Name { get; set; }
    public string? OptionalField { get; set; }
    public Guid? ParentId { get; set; }  // FK — просто Guid, без навигации
}
```

### 3. Правила именования

- Класс: `PascalCase`, единственное число (`Drug`, не `Drugs`)
- Свойства: `PascalCase`
- FK: `{RelatedEntity}Id` (`CourseId`, `DrugId`)
- Enum: `PascalCase`, без префикса (`DrugType`, не `EDrugType`)

### 4. Связи между сущностями

Связи — через `Guid? ParentId`. **Никаких навигационных свойств**.

```csharp
// ✅ Правильно
public Guid? CourseId { get; set; }

// ❌ Неправильно
public Course? Course { get; set; }
public List<Drug> Drugs { get; set; }
```

## Как добавить Enum

```csharp
public enum MyCategory
{
    TypeA,
    TypeB,
    Other
}
```

Добавляй в `Models/Entities.cs` рядом с сущностью, которая его использует.

**Важно:** если enum используется в API (приходит от клиента), добавь валидацию `Enum.IsDefined()` в хэндлере Application слоя.

## Чеклист перед коммитом

- [ ] Сущность в `Models/Entities.cs`
- [ ] XML-комментарий `/// <summary>`
- [ ] `sealed class` для конкретных сущностей
- [ ] `required` для обязательных полей
- [ ] FK через `Guid?`, без навигации
- [ ] Нет бизнес-логики в модели
- [ ] Нет атрибутов ORM
- [ ] Enum рядом с использующей сущностью
