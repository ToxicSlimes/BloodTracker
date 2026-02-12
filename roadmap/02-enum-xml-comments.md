# 02 — XML-комментарии для enum-ов

**Приоритет:** 2
**Оценка:** 1 час
**Сложность:** Лёгкая

## Цель
Добавить `/// <summary>` к каждому значению в 6 Domain enum-ах.
IntelliSense + Swagger schema отображают описания.

## Файлы

### `src/BloodTracker.Domain/Models/Enums/DrugType.cs`
```csharp
public enum DrugType
{
    /// <summary>Инъекционный препарат (внутримышечно/подкожно)</summary>
    Injectable = 0,
    /// <summary>Таблетированная форма (пероральный приём)</summary>
    Oral = 1,
    // ...
}
```

### `src/BloodTracker.Domain/Models/Enums/DrugCategory.cs`
- AAS — Анаболические андрогенные стероиды
- Antiestrogen — Антиэстрогены (AI, SERM)
- PeptideGH — Пептиды и гормон роста
- FatBurner — Жиросжигатели
- DopamineAgonist — Агонисты дофамина (каберголин, прамипексол)
- LiverSupport — Гепатопротекторы
- VitaminMineral — Витамины и минералы
- Other — Прочее

### `src/BloodTracker.Domain/Models/Enums/DrugSubcategory.cs`
- Все подкатегории (Testosterone, Nandrolone, Trenbolone, DHT, SERM, AI, etc.)

### `src/BloodTracker.Domain/Models/Enums/ManufacturerType.cs`
- Pharmaceutical — Лицензированная фармкомпания
- Underground — Подпольная лаборатория

### `src/BloodTracker.Domain/Models/Enums/ValueStatus.cs`
- Normal — В пределах нормы
- Low — Ниже референса
- High — Значительно выше референса
- SlightlyHigh — Незначительно выше (в пределах 10% margin)
- Pending — Нет референсного диапазона

### `src/BloodTracker.Domain/Models/Enums/MuscleGroup.cs`
- Все группы мышц с русскими описаниями

## Критерий готовности
- Каждое значение каждого enum имеет `/// <summary>`
- `dotnet build` — 0 ошибок
- Swagger schema показывает описания (проверить на dev)
