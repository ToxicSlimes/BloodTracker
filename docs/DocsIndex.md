# Документация — Навигация

## Глобальные

| Документ | Описание |
|----------|----------|
| [TECH_STACK](TECH_STACK.md) | Технологии, пакеты, паттерны |
| [ARCHITECTURE](ARCHITECTURE.md) | Архитектура, поток данных, решения |
| [DATA_FLOW](DATA_FLOW.md) | Полный поток данных HTTP → Controller → MediatR → LiteDB |
| [DEPENDENCIES](DEPENDENCIES.md) | Все NuGet, JS, внешние API с версиями |
| [OPERATIONS](OPERATIONS.md) | Сборка, запуск, деплой, логирование |
| [TROUBLESHOOTING](TROUBLESHOOTING.md) | Кросс-модульные проблемы и решения |
| [CONTRIBUTING](CONTRIBUTING.md) | Code style, conventions, как добавить фичу |
| [CLAUDE.md](../CLAUDE.md) | AI-гайд для работы с проектом |
| [README.md](../README.md) | Обзор проекта |

## ADR (Architecture Decision Records)

| Документ | Описание |
|----------|----------|
| [ADR-0001: Clean Architecture](adr/0001-clean-architecture.md) | Почему Onion Architecture + CQRS |
| [ADR-0002: LiteDB Per-User](adr/0002-litedb-per-user.md) | Почему LiteDB + per-user isolation |
| [ADR-0003: Electron.NET](adr/0003-electron-net.md) | Почему Electron.NET для десктопа |
| [ADR-0004: Consolidated Files](adr/0004-consolidated-files.md) | Почему один файл на concern |

## По модулям

### BloodTracker.Domain
| Документ | Описание |
|----------|----------|
| [README](../src/BloodTracker.Domain/README.md) | Сущности, enum-ы, связи |
| [IMPROVEMENTS](../src/BloodTracker.Domain/docs/IMPROVEMENTS.md) | Техдолг |

### BloodTracker.Application
| Документ | Описание |
|----------|----------|
| [README](../src/BloodTracker.Application/README.md) | CQRS flow, поддомены |
| [DO_DONT](../src/BloodTracker.Application/docs/DO_DONT.md) | Правила |
| [HOWTO](../src/BloodTracker.Application/docs/HOWTO.md) | Рецепты |
| [IMPROVEMENTS](../src/BloodTracker.Application/docs/IMPROVEMENTS.md) | Техдолг |

### BloodTracker.Api
| Документ | Описание |
|----------|----------|
| [README](../src/BloodTracker.Api/README.md) | Эндпоинты, startup, конфигурация |
| [DO_DONT](../src/BloodTracker.Api/docs/DO_DONT.md) | Правила |
| [HOWTO](../src/BloodTracker.Api/docs/HOWTO.md) | Как добавить эндпоинт |
| [ERRORS](../src/BloodTracker.Api/docs/ERRORS_TROUBLESHOOTING.md) | Реальные баги и фиксы |
| [IMPROVEMENTS](../src/BloodTracker.Api/docs/IMPROVEMENTS.md) | Техдолг |

### BloodTracker.Infrastructure
| Документ | Описание |
|----------|----------|
| [README](../src/BloodTracker.Infrastructure/README.md) | Persistence, сервисы |
| [DO_DONT](../src/BloodTracker.Infrastructure/docs/DO_DONT.md) | Правила |
| [HOWTO](../src/BloodTracker.Infrastructure/docs/HOWTO.md) | Как добавить сервис |
| [ERRORS](../src/BloodTracker.Infrastructure/docs/ERRORS_TROUBLESHOOTING.md) | Типичные проблемы |
| [IMPROVEMENTS](../src/BloodTracker.Infrastructure/docs/IMPROVEMENTS.md) | Техдолг |
| [SECURITY](../src/BloodTracker.Infrastructure/docs/SECURITY.md) | Безопасность, API ключи |
