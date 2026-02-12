# SERVICES & CONTRACTS — BloodTracker.Infrastructure

## Обзор сервисов

| Сервис | Интерфейс | Lifetime | Зависимости |
|--------|-----------|----------|-------------|
| `AuthService` | `IAuthService` | Scoped | `JwtSettings`, `EmailSettings`, `GoogleAuthSettings`, `HttpClient` |
| `UserContext` | `IUserContext` | Scoped | `IHttpContextAccessor` |
| `ReferenceRangeService` | `IReferenceRangeService` | Singleton | — (in-memory dictionary) |
| `DrugCatalogService` | `IDrugCatalogService` | Singleton | `CatalogDbContext` |
| `DrugCatalogSeedService` | — (concrete) | Singleton | `CatalogDbContext` |
| `ExerciseCatalogService` | `IExerciseCatalogService` | Scoped | `HttpClient`, `BloodTrackerDbContext`, `IConfiguration` |
| `GeminiVisionService` | — (concrete) | Singleton | `HttpClient`, `IConfiguration` |
| `PdfParserService` | `IPdfParserService` | Singleton | `GeminiVisionService?` |
| `DataMigrationService` | — (concrete) | Singleton | `DatabaseSettings`, `AuthDbContext` |

---

## AuthService

**Интерфейс:** `IAuthService`

```csharp
public interface IAuthService
{
    string GenerateJwtToken(AppUser user);
    string GenerateImpersonationToken(AppUser targetUser);
    Task<(string Email, string GoogleId, string? Name)?> VerifyGoogleTokenAsync(string idToken, CancellationToken ct);
    string GenerateAuthCode();
    Task SendAuthCodeEmailAsync(string email, string code, CancellationToken ct);
}
```

### Контракты

**`GenerateJwtToken`** — JWT с claims: `sub` (userId), `email`, `name`, `jti`, опционально `role: admin`. Expiry: `JwtSettings.ExpiresInDays` (default 30).

**`GenerateImpersonationToken`** — Короткоживущий JWT (1 час) с claim `impersonated: true`. Не включает `role: admin`.

**`VerifyGoogleTokenAsync`** — Верификация Google ID Token через `GoogleJsonWebSignature`. Возвращает `null` при ошибке.

**`GenerateAuthCode`** — 6-значный случайный код (`RandomNumberGenerator.GetInt32(100000, 999999)`).

**`SendAuthCodeEmailAsync`** — Отправка email. Два транспорта:
1. **Gmail API** (если `Google:RefreshToken` + `Google:ClientSecret` настроены) — через HTTPS, обходит блокировку SMTP портов
2. **SMTP** (fallback) — через MailKit, с автоматическим переключением порта 587→465

### Зависимости

```
AuthService
├── JwtSettings (Jwt:Secret, Jwt:Issuer, Jwt:ExpiresInDays)
├── EmailSettings (SmtpHost, SmtpPort, SmtpUser, SmtpPass, FromEmail, FromName)
├── GoogleAuthSettings (ClientId, ClientSecret, RefreshToken)
└── HttpClient (для Gmail API token refresh и отправки)
```

---

## UserContext

**Интерфейс:** `IUserContext`

```csharp
public interface IUserContext
{
    Guid UserId { get; }
    string Email { get; }
    bool IsAuthenticated { get; }
    bool IsAdmin { get; }
}
```

Извлекает данные из `HttpContext.User` (JWT claims). Используется для per-user DB routing.

**Claims mapping:**
- `UserId` ← `sub` или `ClaimTypes.NameIdentifier`
- `Email` ← `email` или `ClaimTypes.Email`
- `IsAdmin` ← `role == "admin"`

---

## ReferenceRangeService

**Интерфейс:** `IReferenceRangeService`

```csharp
public interface IReferenceRangeService
{
    ReferenceRange? GetRange(string key);
    IReadOnlyList<ReferenceRange> GetAllRanges();
    ValueStatus GetStatus(string key, double value);
}
```

**Данные:** ~40 показателей в in-memory `Dictionary<string, ReferenceRange>`. Категории: Гормоны, Липиды, Печень, Общие, Коагуляция, Белковые фракции, Онкомаркеры.

**`GetStatus` логика:**
- `value < Min` → `ValueStatus.Low`
- `value > Max + 10%` → `ValueStatus.High`
- `value > Max` → `ValueStatus.SlightlyHigh`
- Иначе → `ValueStatus.Normal`

---

## DrugCatalogService

**Интерфейс:** `IDrugCatalogService`

```csharp
public interface IDrugCatalogService
{
    List<DrugCatalogItem> GetAll();
    List<DrugCatalogItem> Search(string? query, DrugCategory? category, DrugSubcategory? subcategory, DrugType? drugType);
    DrugCatalogItem? GetById(string id);
    List<DrugCatalogItem> GetPopular();
    List<Manufacturer> GetAllManufacturers();
    List<Manufacturer> SearchManufacturers(string? query, ManufacturerType? type);
    Manufacturer? GetManufacturerById(string id);
}
```

**Фильтрация Search:** category → subcategory → drugType → text query (по Name, NameEn, ActiveSubstance). `HasBothForms` = true обходит фильтр drugType.

---

## ExerciseCatalogService

**Интерфейс:** `IExerciseCatalogService`

```csharp
public interface IExerciseCatalogService
{
    Task<IReadOnlyList<ExerciseCatalogEntry>> GetCatalogAsync(CancellationToken ct);
}
```

**Стратегия кэширования:**
1. Читает кэш из `BloodTrackerDbContext.ExerciseCatalog`
2. Если кэш свежий (< 24 часа) → возвращает
3. Иначе → запрос к ExerciseDB API (RapidAPI)
4. Маппинг bodyPart/target → `MuscleGroup` enum
5. Сохранение в LiteDB

**Конфигурация:** `ExerciseCatalog:ApiKey`, `ExerciseCatalog:ApiUrl`.

---

## PdfParserService

**Интерфейс:** `IPdfParserService`

```csharp
public interface IPdfParserService
{
    Task<PdfAnalysisResult> ParseAnalysisPdfAsync(Stream pdfStream, CancellationToken ct);
}
```

**Два режима:**
1. **Gemini Vision API** (приоритет) — отправляет все страницы PDF как изображения, получает JSON с данными
2. **OCR fallback** (Tesseract + OpenCV) — растеризация PDF → бинаризация → OCR → парсинг строк

**Маппинг показателей:** `NameMappings` dictionary (~30 показателей) маппит русские названия на ключи (`"Тестостерон общий"` → `"testosterone"`).

**Валидация:** `ExpectedRanges` проверяет, что извлечённое значение в допустимом диапазоне.

**Зависимости:** Docnet.Core (PDF→image), Tesseract (OCR), OpenCvSharp (image preprocessing), GeminiVisionService.

---

## GeminiVisionService

**Concrete class** (без интерфейса).

```csharp
public bool IsAvailable { get; }
public Task<string> ExtractTableDataFromImagesAsync(List<byte[]> images, CancellationToken ct);
```

Отправляет batch изображений в Gemini 2.5 Flash API. Промпт на английском, результат — JSON с `rows[{name, result, unit, reference}]`.

**API:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

---

## DataMigrationService

**Concrete class**, запускается один раз при старте.

```csharp
public void MigrateIfNeeded();
```

Три фазы: initial migration → reassignment → orphan adoption. См. PERSISTENCE_GUIDE.md.

---

## Граф зависимостей

```
AuthController
├── AuthDbContext (singleton)
├── IAuthService → AuthService (scoped)
│   ├── JwtSettings
│   ├── EmailSettings
│   ├── GoogleAuthSettings
│   └── HttpClient
└── IUserContext → UserContext (scoped)
    └── IHttpContextAccessor

AnalysesController
└── IMediator → Handlers
    ├── IAnalysisRepository → AnalysisRepository (scoped)
    │   └── BloodTrackerDbContext (scoped, per-user)
    ├── IReferenceRangeService → ReferenceRangeService (singleton)
    ├── IPdfParserService → PdfParserService (singleton)
    │   └── GeminiVisionService (singleton)
    └── IMapper (scoped)

AdminController
├── AuthDbContext (singleton)
├── IAuthService
├── DatabaseSettings
└── BloodTrackerDbContext (creates ad-hoc per user)
```
