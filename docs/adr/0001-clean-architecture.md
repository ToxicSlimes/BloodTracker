# ADR-0001: Clean Architecture

**Статус:** Принято  
**Дата:** 2025

## Контекст

Нужна архитектура для десктопного health-tracking приложения с CRUD, PDF-парсингом и внешними API.

## Решение

Clean Architecture (Onion) с 4 проектами: Domain → Application → Infrastructure, Api.

## Почему

- **Изоляция домена** — Entity классы не зависят от LiteDB, Electron, ASP.NET
- **Тестируемость** — Handler-ы можно тестировать с mock-репозиториями (тесты пока не написаны, но архитектура готова)
- **Замена инфраструктуры** — можно сменить LiteDB на SQLite/PostgreSQL без изменения Application/Domain
- **CQRS через MediatR** — чёткое разделение read/write, каждый handler — одна ответственность

## Последствия

- Больше boilerplate (Command → Handler → Repository для каждой операции)
- Для solo-проекта может быть overengineering, но структура масштабируема
- Consolidated file pattern (ADR-0004) компенсирует boilerplate
