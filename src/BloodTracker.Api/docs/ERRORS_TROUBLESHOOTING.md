# Ошибки и Troubleshooting — BloodTracker.Api

## Admin 403 Forbidden

**Проблема:** Админ-эндпоинты возвращали 403 даже с правильным JWT токеном с `role: admin`.

**Причина:** ASP.NET Core JWT middleware по умолчанию ремаппит inbound claims. Claim `role` из JWT ремаппился в длинный URI `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`, а policy `Admin` искала `role`.

**Фикс (коммиты `37df72e`, `95cdcec`):**
```csharp
options.MapInboundClaims = false;  // Отключить ремаппинг
options.TokenValidationParameters = new TokenValidationParameters
{
    RoleClaimType = "role",   // Явно указать имя claim
    NameClaimType = "name"
};
```

**Урок:** Всегда выставляй `MapInboundClaims = false` и явно указывай `RoleClaimType`/`NameClaimType`.

---

## Infinite reload loop (auth)

**Проблема:** Страница бесконечно перезагружалась при 401 ошибке.

**Причина (коммиты `05a9497`, `f59aa57`):** 
1. `workouts.js` вызывал API до проверки auth
2. Обработчик 401 вызывал reload без проверки наличия токена
3. JS/CSS кешировались браузером со старыми версиями

**Фикс:**
- Inline auth guard до вызовов API
- `Cache-Control: no-cache` для JS/CSS (в `WebApplicationExtensions`)
- Убран auto-reload на 401

---

## ExerciseCatalogService scope mismatch

**Проблема:** Singleton `ExerciseCatalogService` пытался использовать scoped `BloodTrackerDbContext`.

**Фикс (коммит `cca6ef8`):** Сервис изменён на scoped регистрацию.

---

## SMTP порты заблокированы

**Проблема:** Email-коды не отправлялись на хостинге — SMTP порты (587, 465) блокируются облачными провайдерами.

**Фикс (коммиты `dede7de`, `b92aef8`):**
1. Сначала добавлен Brevo HTTP API
2. Затем заменён на Gmail API (OAuth2, HTTPS порт 443)
3. Fallback: если SMTP не работает, код возвращается в response (dev mode)

---

## /data ownership в Docker

**Проблема:** Контейнер не мог писать в volume с БД.

**Фикс (коммит `441b111`):** Entrypoint делает `chown` перед переключением на `appuser`.

---

## Auth page flash

**Проблема:** При загрузке мелькала основная страница до проверки auth.

**Фикс (коммит `f875da0`):** Приложение скрыто по умолчанию (`display: none`) до завершения auth check.

---

## Общие советы

- **Swagger не показывает эндпоинты?** Проверь что контроллер имеет `[ApiController]` и `[Route]`
- **401 на всех запросах?** Проверь `Jwt:Secret` в конфигурации, в dev-mode он может быть пустым
- **LiteDB locked?** Убедись что используется `Connection=shared` в connection string
- **Electron не открывает окно?** Проверь `HybridSupport.IsElectronActive` — в browser mode окно не создаётся
