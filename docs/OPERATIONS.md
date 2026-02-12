# Operations — Сборка, запуск, деплой, логирование

## Сборка

### Локальная разработка (браузер)

```bash
cd src/BloodTracker.Api
dotnet run
# → http://localhost:5000
# → Swagger: http://localhost:5000/swagger
```

### Electron (десктоп)

```bash
cd src/BloodTracker.Api
electronize start /watch    # dev с hot reload
```

### Сборка Electron пакета

```powershell
./build.ps1                          # Release по умолчанию
./build.ps1 -Configuration Debug     # Debug
./build.ps1 -Clean                   # Очистка + сборка
```

**Что делает `build.ps1`:**
1. `dotnet clean` (если `-Clean`)
2. `dotnet restore`
3. Проверяет `electron.manifest.json` и `build/beforePack.js`
4. `electronize build /target win /dotnet-configuration Release /electron-arch x64`

**Выход:** `src/BloodTracker.Api/bin/Desktop/`

### Restore зависимостей

```bash
dotnet restore
```

---

## Деплой (Docker + Caddy)

### Архитектура деплоя

```
Internet → Caddy (HTTPS, порты 80/443) → App (порт 5000)
```

### Docker

```bash
# Сборка образа
docker build -t bloodtracker .

# Запуск
docker-compose up -d
```

**docker-compose.yml** поднимает 2 сервиса:
- `caddy` — reverse proxy с автоматическим HTTPS (Let's Encrypt)
- `app` — .NET 8 приложение на порту 5000

### Переменные окружения (production)

```env
GEMINI_API_KEY=...
EXERCISE_CATALOG_API_KEY=...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
EMAIL_SMTP_HOST=...
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=...
EMAIL_SMTP_PASS=...
EMAIL_FROM=noreply@bloodtracker.app
ADMIN_EMAIL=admin@example.com
```

### CI/CD

GitHub Actions: `.github/workflows/docker-publish.yml` — автоматическая сборка и публикация Docker-образа в `ghcr.io/toxicslimes/bloodtracker:latest`.

### Health Check

```
GET /healthz → { "status": "healthy", "timestamp": "..." }
```

---

## Логирование

### Конфигурация (Serilog)

Настроено в `Program.cs`:

| Sink | Путь/формат | Ротация |
|------|------------|---------|
| Console | `[HH:mm:ss LVL] Message` | — |
| File | `logs/app-YYYYMMDD.log` | Daily, 7 файлов |

### Уровни

| Источник | Уровень |
|----------|---------|
| Default | Information |
| Microsoft.AspNetCore | Warning |

### Полезные логи

- `"Electron is active, creating window..."` — запуск в Electron режиме
- `"Running in browser mode at http://localhost:5000"` — браузерный режим
- `"Window closed, shutting down..."` — закрытие приложения

---

## Конфигурация (appsettings.json)

| Секция | Ключ | Описание |
|--------|------|----------|
| Database | ConnectionString | `Filename=bloodtracker.db;Connection=shared` |
| Jwt | Secret, Issuer, ExpiresInDays | JWT auth |
| Google | ClientId, ClientSecret, RefreshToken | OAuth + Gmail API |
| Email | SmtpHost/Port/User/Pass, From* | Отправка писем |
| Gemini | ApiKey | AI парсинг PDF |
| ExerciseCatalog | ApiKey, ApiUrl | RapidAPI ExerciseDB |
| Admin | Emails[] | Список admin email |

**Env override:** двойное подчёркивание — `Gemini__ApiKey`.

---

## База данных

- **Файл:** `bloodtracker.db` (LiteDB, single-file NoSQL)
- **Бэкап:** просто скопировать файл
- **Миграция:** `DataMigrationService.MigrateIfNeeded()` — запускается при старте, мигрирует single-user → per-user DB
- **Seed:** `DrugCatalogSeedService.SeedIfNeeded()` — каталог препаратов

### Автоинициализация при первом запуске

1. Создание `bloodtracker.db`
2. Создание индексов (BloodTrackerDbContext)
3. Загрузка Tesseract данных (при первом PDF импорте)
4. Seed каталога упражнений (если есть API key)
