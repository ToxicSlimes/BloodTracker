# Ошибки и Troubleshooting — BloodTracker.Infrastructure

## ExerciseCatalogService: Cannot consume scoped service from singleton

**Проблема:** `ExerciseCatalogService` был зарегистрирован как singleton, но зависел от scoped `BloodTrackerDbContext`.

**Фикс (коммит `cca6ef8`):** Изменена регистрация на scoped:
```csharp
services.AddScoped<IExerciseCatalogService, ExerciseCatalogService>();
```

**Правило:** Если сервис использует `BloodTrackerDbContext` → он должен быть scoped.

---

## Gmail API: Token refresh failed

**Проблема:** Email-коды не отправляются, в логах `Gmail token refresh failed`.

**Причины:**
- `Google:ClientSecret` не задан
- `Google:RefreshToken` истёк или отозван
- Неправильный `Google:ClientId`

**Решение:**
1. Проверь все 3 настройки в конфигурации
2. Пересоздай refresh token через OAuth playground
3. Fallback: в dev-mode код возвращается в response (`devCode`)

---

## SMTP порты заблокированы на хостинге

**Проблема (коммиты `dede7de`, `b92aef8`):** Облачные провайдеры блокируют порты 25/587/465.

**Текущее решение:** Gmail API (HTTPS, порт 443) как primary, SMTP как fallback. AuthService автоматически пробует порт 465 если 587 заблокирован.

---

## LiteDB: database is locked / Process cannot access the file

**Причина:** Несколько процессов или потоков пытаются открыть БД без `Connection=shared`.

**Фикс:** Всегда используй `Connection=shared` в connection string:
```csharp
new BloodTrackerDbContext($"Filename={path};Connection=shared");
```

---

## DataMigrationService: Orphaned databases

**Проблема (коммит `64cdc05`):** После удаления/пересоздания пользователя в auth.db, его `user_*.db` оставался orphaned.

**Решение:** Phase 3 в `DataMigrationService.AdoptOrphanedDatabases()` находит сироты и присваивает их админу, если его БД меньше.

---

## PdfParserService: Gemini returned no values

**Причины:**
- `Gemini:ApiKey` не задан → fallback на Tesseract OCR
- PDF не содержит таблиц с результатами
- Gemini вернул невалидный JSON

**Диагностика:** Смотри логи — сервис логирует preview ответа Gemini (500 chars).

---

## PdfParserService: Tesseract data not found

**Проблема:** Отсутствуют `tessdata/rus.traineddata` и `eng.traineddata`.

**Решение:** Файлы скачиваются автоматически при первом использовании OCR из `github.com/tesseract-ocr/tessdata`. Нужен интернет.

---

## /data ownership в Docker

**Проблема (коммит `441b111`):** Контейнер работает от `appuser`, но volume с БД создаётся от root.

**Фикс:** Entrypoint делает `chown appuser /data` перед запуском приложения.

---

## JWT claims: sub claim не найден

**Проблема:** `UserContext.UserId` возвращает `Guid.Empty`.

**Причина:** `MapInboundClaims = true` (по умолчанию) ремаппит `sub` → `http://schemas.xmlsoap.org/...`. UserContext ищет оба варианта:
```csharp
var sub = FindFirstValue(JwtRegisteredClaimNames.Sub)
       ?? FindFirstValue(ClaimTypes.NameIdentifier);
```

**Фикс:** `MapInboundClaims = false` в JWT настройках.
