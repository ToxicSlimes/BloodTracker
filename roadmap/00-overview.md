# BloodTracker Roadmap — Overview

> 7 проектов, отсортированных по приоритету.
> Каждый проект — отдельный файл с детальным планом.

## Порядок выполнения

| # | Файл | Проект | Оценка | Сложность |
|---|------|--------|--------|-----------|
| 1 | `01-frontend-comments.md` | JSDoc комментарии на фронте | 4-5ч | Лёгкая |
| 2 | `02-enum-xml-comments.md` | XML-комментарии для enum-ов | 1ч | Лёгкая |
| 3 | `03-endpoints-migration.md` | Миграция callers на endpoints.js | 4ч | Лёгкая |
| 4 | `04-drugcatalog-refactor.md` | DrugCatalogItem refactor | 6ч | Средняя |
| 5 | `05-typescript-migration.md` | TypeScript миграция | 15-20ч | Средняя |
| 6 | `06-reactive-state.md` | Reactive State (Proxy) | 11-13ч | Средняя |
| 7 | `07-offline-pwa.md` | Offline Mode / PWA | 13-15ч | Высокая |

**Общая оценка:** ~55-65 часов

## Правила

### Frontend (JS/TS):
- **Подробные JSDoc комментарии** — каждая функция, каждый обработчик, каждый UI элемент
- Формат: `/** @description Что делает */` + `@param` + `@returns`
- HTML-генерация: комменты к каждому блоку (какая секция, какие кнопки)

### Backend (C#):
- **НЕТ обычных комментариев** — код должен быть самодокументируемым
- **Только XML docs** (`/// <summary>`) — для Swagger и IntelliSense
- Исключение: TODO/FIXME/HACK — допустимы

---

*Создано: 2026-02-12*
