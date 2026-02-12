# 04 — DrugCatalogItem Refactor

**Приоритет:** 4
**Оценка:** 6 часов
**Сложность:** Средняя

## Цель
Разбить `DrugCatalogItem` (28 flat свойств) на логические группы.
Легче расширять, читать, маппить.

## Текущая структура
```
DrugCatalogItem (28 props):
  Id, Name, NameEn, Category, Subcategory, DrugType,
  HasBothForms, ActiveSubstance, Description, Effects,
  SideEffects, HalfLife, DetectionTime, CommonDosages,
  Notes, IsPopular, SortOrder, AnabolicRating,
  AndrogenicRating, PubMedSearchTerm
```

## Целевая структура
```
DrugCatalogItem (7 core + 3 nested):
  Id, Name, NameEn, Category, Subcategory, DrugType, ActiveSubstance
  Pharmacology: { HalfLife, DetectionTime, AnabolicRating, AndrogenicRating, CommonDosages }
  Description:  { Text, Effects, SideEffects, Notes }
  Meta:         { IsPopular, SortOrder, HasBothForms, PubMedSearchTerm }
```

## Phase 1: Создать вложенные record-ы [1ч]

### Файлы:
- `src/BloodTracker.Domain/Models/Catalog/PharmacologyInfo.cs`
  ```csharp
  public sealed record PharmacologyInfo
  {
      public string? HalfLife { get; init; }
      public string? DetectionTime { get; init; }
      public int? AnabolicRating { get; init; }
      public int? AndrogenicRating { get; init; }
      public string? CommonDosages { get; init; }
  }
  ```

- `src/BloodTracker.Domain/Models/Catalog/SubstanceDescription.cs`
  ```csharp
  public sealed record SubstanceDescription
  {
      public string? Text { get; init; }
      public string? Effects { get; init; }
      public string? SideEffects { get; init; }
      public string? Notes { get; init; }
  }
  ```

- `src/BloodTracker.Domain/Models/Catalog/CatalogMeta.cs`
  ```csharp
  public sealed record CatalogMeta
  {
      public bool IsPopular { get; init; }
      public int SortOrder { get; init; }
      public bool HasBothForms { get; init; }
      public string? PubMedSearchTerm { get; init; }
  }
  ```

## Phase 2: Обновить DrugCatalogItem [1ч]

- Заменить 28 flat свойств на core + 3 nested
- Обновить LiteDB маппинг (BsonMapper) если нужен
- `dotnet build` — проверить breaking changes

## Phase 3: Обновить потребителей [2ч]

### Backend:
- `DrugCatalogService` — поиск, фильтрация, `GetById`, `GetPopular`
- `DrugCatalogController` — API ответы (может понадобиться DTO)
- `BloodTestNameMapper` — если ссылается на catalog fields
- `DrugCatalogSeedService` — загрузка из JSON

### Frontend:
- `pages/encyclopedia.js` — рендер карточек субстанций
- `components/modals.js` — модалка выбора субстанции

## Phase 4: Миграция данных [2ч]

1. Обновить `drug-catalog.json` — вложенная структура
2. Bump `seed_version` в DrugCatalogSeedService
3. Тест: запуск → каталог пересеедится
4. Проверить encyclopedia и модалки

## Риски
- LiteDB может некорректно сериализовать вложенные record-ы → проверить BsonMapper
- Frontend может сломаться если API ответ изменился → проверить DTO

## Критерий готовности
- `DrugCatalogItem` ≤ 10 direct properties
- 3 вложенных record-а семантически сгруппированы
- Encyclopedia + модалки работают
- `dotnet test` — все тесты проходят
