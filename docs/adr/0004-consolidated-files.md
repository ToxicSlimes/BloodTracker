# ADR-0004: Consolidated File Pattern

**Статус:** Принято  
**Дата:** 2025

## Контекст

Clean Architecture + CQRS генерируют много мелких файлов. В solo-проекте навигация по десяткам файлов замедляет работу.

## Решение

Один файл на concern вместо одного файла на класс.

## Маппинг

| Файл | Что содержит |
|------|-------------|
| `Entities.cs` | Все domain entities + enums (Analysis, Course, Drug, WorkoutProgram...) |
| `Interfaces.cs` | Все repository/service интерфейсы |
| `ApiControllers.cs` | Все REST контроллеры (9 штук) |
| `Repositories.cs` | Все реализации репозиториев (8 штук) |
| `AnalysisCommands.cs` | Все commands одного домена |
| `AnalysisHandlers.cs` | Все handlers одного домена |

## Почему

- **Быстрая навигация** — Ctrl+F в одном файле вместо поиска по дереву
- **AI-friendly** — Claude/Copilot видит весь контекст за один read
- **Меньше файлов** — ~15 .cs файлов вместо ~60
- **Cohesion** — связанные классы рядом, видны зависимости

## Когда НЕ применять

- Файл > 1000 строк — разбить по поддоменам
- Сложная логика в одном классе — отдельный файл

## Последствия

- Непривычно для разработчиков, ожидающих one-class-per-file
- Git diff может быть менее гранулярным
- Merge conflicts чаще в consolidated файлах
