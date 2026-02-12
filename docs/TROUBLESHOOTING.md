# Troubleshooting — Кросс-модульные проблемы

> Собрано из git log и модульных docs/ERRORS_TROUBLESHOOTING.md

## 🔴 Критичные (были в проде)

### 1. Admin 403 — JWT claim mapping

**Симптом:** Админ-пользователь получает 403 на защищённые эндпоинты.

**Причина:** ASP.NET Core по умолчанию маппит JWT claim `role` → длинный URI `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. Policy `RequireClaim("role", "admin")` не находит claim.

**Фикс:** `options.MapInboundClaims = false` + явно указать `RoleClaimType = "role"` в `TokenValidationParameters`.

**Коммиты:** `37df72e`, `95cdcec`, `ba3af6d`

**Модули:** Api (ServiceCollectionExtensions) ↔ Infrastructure (AuthService)

---

### 2. Infinite reload loop при отсутствии auth

**Симптом:** Страница бесконечно перезагружается.

**Причина:** `workouts.js` вызывал API до проверки auth → 401 → handler делал `location.reload()` → снова 401 → loop.

**Фикс:** Inline auth guard, no-cache headers, убрать auto-reload на 401. Скрыть app по умолчанию до прохождения auth check.

**Коммиты:** `05a9497`, `f59aa57`, `f875da0`

**Модули:** Api (wwwroot/js) ↔ Api (auth middleware)

---

### 3. DI scope mismatch — ExerciseCatalogService

**Симптом:** `Cannot resolve scoped service from root provider`.

**Причина:** `ExerciseCatalogService` зарегистрирован как Singleton, но зависит от scoped `IUserContext` (HttpContext).

**Фикс:** Сменить на Scoped registration.

**Коммит:** `cca6ed8`

**Модули:** Infrastructure (Services) ↔ Api (DI registration)

---

### 4. Docker /data ownership

**Симптом:** Приложение не может писать в `/data` (LiteDB) при запуске под `appuser`.

**Причина:** Volume монтируется от root, а процесс запускается от непривилегированного пользователя.

**Фикс:** Entrypoint делает `chown` перед drop to appuser.

**Коммит:** `441b111`

**Модули:** Api (Dockerfile/entrypoint) ↔ Infrastructure (Persistence)

---

## 🟡 Средние

### 5. Login ASCII art alignment

**Симптом:** ASCII-арт на странице логина не центрируется.

**Фикс:** Сужение box до 48 символов.

**Коммит:** `216b9eb`

### 6. Mobile layout — перекрытие карточек

**Симптом:** На мобильных — overlapping cards, broken color picker, некорректный layout форм.

**Фикс:** Media queries, скрытие декоративных элементов (torches/skull), stack buttons.

**Коммиты:** `3547321`, `af75642`

---

## 🟢 Паттерны проблем

| Паттерн | Где искать | Пример |
|---------|-----------|--------|
| JWT claims не совпадают | `ServiceCollectionExtensions.cs` | MapInboundClaims |
| Scoped в Singleton | DI registration | ExerciseCatalogService |
| Frontend вызывает API до auth | `js/pages/*.js` | workouts.js |
| Docker permissions | `Dockerfile`, `entrypoint.sh` | chown /data |
| Secrets в git | `appsettings.json` | Переехали в env vars |

---

## См. также

- [Api/ERRORS_TROUBLESHOOTING](../src/BloodTracker.Api/docs/ERRORS_TROUBLESHOOTING.md)
- [Infrastructure/ERRORS_TROUBLESHOOTING](../src/BloodTracker.Infrastructure/docs/ERRORS_TROUBLESHOOTING.md)
