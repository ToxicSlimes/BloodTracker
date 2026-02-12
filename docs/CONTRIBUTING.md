# Contributing — Гайд для контрибьюторов

## Архитектура

Clean Architecture (Onion) с CQRS. Четыре проекта:

```
Domain → Application → Infrastructure
                    ↘ Api
```

Зависимости идут внутрь: Api и Infrastructure зависят от Application, Application — от Domain. Domain ни от чего не зависит.

---

## Code Style

### C#

- **Nullable reference types** включены (`<Nullable>enable</Nullable>`)
- **Latest C#** version (`<LangVersion>latest</LangVersion>`)
- `sealed` классы для entities
- `init`-only properties для immutable данных
- `async/await` + `CancellationToken` везде
- Interface-first: все сервисы имеют интерфейс в `Interfaces.cs`

### Consolidated File Pattern

**Важно!** Проект использует паттерн «один файл на concern»:

| Файл | Содержимое |
|------|-----------|
| `Entities.cs` | Все доменные сущности |
| `Interfaces.cs` | Все интерфейсы репозиториев/сервисов |
| `ApiControllers.cs` | Все REST контроллеры |
| `Repositories.cs` | Все реализации репозиториев |

**НЕ** создавай отдельные файлы для каждого класса.

### JavaScript (frontend)

- Vanilla JS, ES6 modules
- Глобальный экспорт через `window.*`
- API calls через `js/api.js` (fetch wrapper)
- CSS custom properties из `variables.css` — **никогда** хардкодить цвета
- Toast вместо `alert()`: `window.toast.success/error/warning/info()`
- Модалки: toggle `body.modal-open` для scroll lock

---

## Как добавить фичу

### Новая сущность (полный путь)

1. Entity → `Domain/Models/Entities.cs`
2. LiteDB collection + indexes → `Infrastructure/Persistence/BloodTrackerDbContext.cs`
3. Repository interface → `Application/Common/Interfaces.cs`
4. Repository implementation → `Infrastructure/Persistence/Repositories.cs`
5. DI registration → `Infrastructure/DependencyInjection.cs`
6. Commands/Queries/Handlers/DTOs → `Application/{Feature}/`
7. Controller → `Api/Controllers/ApiControllers.cs`

### Новый показатель крови

1. Name mappings → `PdfParserService.cs` → `NameMappings`
2. Expected ranges → `PdfParserService.cs` → `ExpectedRanges`
3. Reference range → `ReferenceRangeService.cs`

### Новая JS-страница

1. Создай `js/pages/mypage.js`
2. Добавь загрузку в `js/main.js`
3. Используй `api.js` для запросов
4. Стили — в отдельный CSS файл или существующий

---

## Conventions

- **Commits:** Descriptive, один fix/feature на коммит
- **Тесты:** Отсутствуют (пока). Тестирование через Swagger + manual
- **Линтинг:** Не настроен
- **Ветки:** Работа в main (solo project)

---

## Запуск для разработки

```bash
cd src/BloodTracker.Api
dotnet run
# → http://localhost:5000
# → Swagger: http://localhost:5000/swagger
```

---

## Документация

При изменении кода — обнови соответствующий doc:
- Модульные docs в `src/*/docs/`
- Глобальные docs в `docs/`
- Индекс: `docs/DocsIndex.md`
