# ERRORS & TROUBLESHOOTING — BloodTracker.Application

## Типичные ошибки CQRS

### 1. `KeyNotFoundException` — сущность не найдена

**Где:** Все Update/Delete хэндлеры.

```
KeyNotFoundException: Analysis {id} not found
KeyNotFoundException: Drug {id} not found
KeyNotFoundException: Course {id} not found
```

**Причина:** Попытка обновить/удалить несуществующую запись.

**Решение:** Проверяй наличие записи перед операцией. В хэндлерах уже используется паттерн:
```csharp
var existing = await repository.GetByIdAsync(id, ct)
    ?? throw new KeyNotFoundException($"Entity {id} not found");
```

**На API уровне:** Контроллер ловит это исключение и возвращает 404 (в некоторых контроллерах) или 500 (если не поймано).

---

### 2. `ArgumentException` — невалидный enum

**Где:** `CreateDrugHandler`, `UpdateDrugHandler`.

```
ArgumentException: Invalid drug type: 99
```

**Причина:** Клиент прислал числовое значение DrugType, которое не определено в enum.

**Решение:** Валидация `Enum.IsDefined()` есть в хэндлере и дублируется в контроллере.

---

### 3. `InvalidOperationException` — нарушение бизнес-правила

**Где:** `CreateIntakeLogHandler`.

```
InvalidOperationException: Purchase does not belong to this drug
InvalidOperationException: Purchase has no remaining stock (5/5 consumed)
```

**Причина:** 
- Попытка привязать IntakeLog к Purchase другого Drug
- Превышение количества в Purchase

**Решение:** Проверяй `Purchase.DrugId == Drug.Id` и остаток перед созданием IntakeLog.

---

### 4. MediatR не находит хэндлер

```
InvalidOperationException: No handler registered for CreateAnalysisCommand
```

**Причина:** Не зарегистрирован `MediatR` или хэндлер не в сканируемой сборке.

**Решение:** Убедись, что `services.AddApplication()` вызван в DI:
```csharp
services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));
```

---

### 5. Mapster — ошибка маппинга

```
InvalidOperationException: Missing map configuration for Type → Type
```

**Причина:** Mapster не может автоматически смаппить свойства.

**Решение:** Для большинства DTO маппинг автоматический (имена совпадают). Если нет — добавь конфигурацию в `TypeAdapterConfig`.

**Примечание:** Часть хэндлеров маппит вручную (курсы — `MapToDto`), часть через `IMapper` (анализы, тренировки).

---

### 6. PDF импорт — нет значений

```
ImportPdfResultDto { Success = false, ErrorMessage = "Не удалось распознать показатели" }
```

**Причина:** Gemini Vision API не извлёк данные, или OCR fallback не распознал таблицу.

**Решение:** 
- Проверь `GEMINI_API_KEY` в конфиге
- Убедись в качестве PDF (сканы vs. цифровые)
- Смотри логи `PdfParserService` для деталей

---

## Паттерны обработки ошибок в проекте

### Хэндлеры
- `KeyNotFoundException` → сущность не найдена
- `ArgumentException` → невалидные входные данные
- `InvalidOperationException` → нарушение бизнес-правила
- `try/catch` с логированием → ImportPdfAnalysisHandler

### Контроллеры
- Дублируют валидацию (DrugType, Quantity, Price)
- Возвращают `BadRequest` / `NotFound` / `NoContent`
- **НЕ** ловят исключения хэндлеров глобально (нет middleware exception handler)

### Что стоит улучшить
- Добавить global exception middleware для унификации ответов
- Использовать Result pattern вместо исключений
- Добавить FluentValidation pipeline behavior для MediatR
