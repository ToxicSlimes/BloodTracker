# Безопасность — BloodTracker.Infrastructure

## API ключи и секреты

| Секрет | Конфигурация | Env Variable | Где используется |
|--------|-------------|--------------|-----------------|
| JWT Secret | `Jwt:Secret` | — | `AuthService` — подпись токенов |
| Google Client ID | `Google:ClientId` | — | `AuthService` — верификация Google OAuth |
| Google Client Secret | `Google:ClientSecret` | — | `AuthService` — Gmail API refresh token |
| Google Refresh Token | `Google:RefreshToken` | — | `AuthService` — отправка email через Gmail API |
| SMTP пароль | `Email:SmtpPass` | — | `AuthService` — SMTP fallback |
| Gemini API Key | `Gemini:ApiKey` | `GEMINI_API_KEY` | `GeminiVisionService` — OCR PDF |
| ExerciseDB API Key | `ExerciseCatalog:ApiKey` | `EXERCISE_CATALOG_API_KEY` | `ExerciseCatalogService` — каталог упражнений |
| ExerciseDB API URL | `ExerciseCatalog:ApiUrl` | `EXERCISE_CATALOG_API_URL` | `ExerciseCatalogService` |

## Аутентификация

### JWT
- **Алгоритм:** HS256 (симметричный)
- **Expiry:** 30 дней (настраивается через `Jwt:ExpiresInDays`)
- **Claims:** `sub` (userId), `email`, `name`, `role` (optional: "admin"), `jti`
- **Impersonation токен:** 1 час, дополнительный claim `impersonated=true`
- **⚠️ Dev mode:** если `Jwt:Secret` пуст — токены НЕ валидируются (подпись отключена)

### Email-коды
- 6-значный случайный код (`RandomNumberGenerator`)
- TTL: 10 минут
- Одноразовые (поле `Used`)
- **⚠️ Dev/SMTP failure:** код возвращается в HTTP response (`devCode`)

### Admin определение
- Список email-адресов в `Admin:Emails`
- Проверяется при каждом входе (Google или email-код)
- Claim `role=admin` добавляется в JWT при генерации

## Данные пользователей

### Per-user изоляция
- Каждый пользователь хранит данные в отдельном файле `user_{guid}.db`
- Путь вычисляется из JWT claim `sub` через `IUserContext`
- **⚠️ AdminController** может читать чужие БД напрямую (для admin panel)

### Что хранится
- Анализы крови (персональные медицинские данные)
- Курсы препаратов и записи приёма
- Покупки (цены, количества)
- Тренировочные программы

## Внешние API

### Google OAuth
- Верификация ID токена через `GoogleJsonWebSignature`
- Используется `Audience` = `ClientId` для защиты от подмены

### Gmail API
- OAuth2 refresh token для отправки email
- Access token кешируется в памяти (per-request, не persistent)
- Используется HTTPS (порт 443), работает даже при блокировке SMTP

### Gemini API
- API Key передаётся как query parameter (`?key=...`)
- Отправляются изображения страниц PDF (потенциально содержат персональные мед. данные)

## ⚠️ Известные риски

1. **JWT без подписи в dev mode** — если `Jwt:Secret` пуст, любой может создать валидный токен
2. **Email-код в response** — при сбое SMTP код возвращается клиенту (удобно для dev, опасно в production)
3. **LiteDB файлы не шифрованы** — данные хранятся в plain text на диске
4. **Gemini получает медицинские данные** — PDF с анализами отправляются в Google API
5. **CORS AllowAll** — любой origin может обращаться к API
6. **Нет rate limiting** на auth эндпоинтах — возможен брутфорс кодов
7. **Admin impersonation** — без аудит-лога кто кого impersonate
