# ADR-0003: Electron.NET

**Статус:** Принято  
**Дата:** 2025

## Контекст

Нужен десктопный shell для ASP.NET Core приложения.

## Решение

**ElectronNET.API 23.6.2** — .NET + Chromium в одном процессе.

## Почему

- **Единый стек** — весь код на C# + vanilla JS, без Node.js разработки
- **Гибридный режим** — одно приложение работает и как десктоп (Electron), и как веб-сервер (`dotnet run`)
- **Один .exe** — сборка через `electronize build` даёт standalone приложение
- **Полный доступ к .NET** — PDF парсинг, LiteDB, OCR — всё в том же процессе

## Альтернативы

| Вариант | Почему нет |
|---------|-----------|
| MAUI | Нет Chromium, сложнее web UI |
| Tauri | Нужен Rust, отдельный бэкенд |
| CEFSharp | Только Windows, нет простого packaging |

## Детали

- Окно: 1400×900, минимум 1000×700
- `AutoHideMenuBar`, `ContextIsolation=true`, `NodeIntegration=false`
- IPC через socket.io (внутренний механизм ElectronNET)

## Последствия

- Тяжёлый бинарник (~150MB+)
- Зависимость от Chromium (RAM)
- Версия 23.6.2 — переписанная, не backward-compatible со старым ElectronNET
