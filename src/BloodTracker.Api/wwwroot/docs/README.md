# BloodTracker Frontend — Обзор

## Что это

SPA на **Vanilla JS (ES6 modules)** с визуальной темой **dark dungeon / retro terminal / CRT**.
Нет фреймворков — чистый DOM, модульный CSS, кастомные ASCII-эффекты.

Бэкенд — ASP.NET Core API, фронт подключается через `<script type="module" src="js/main.js">`.

---

## Архитектура

```
wwwroot/
├── index.html              — единственная HTML-страница (SPA shell)
├── js/
│   ├── main.js             — entry point, init(), навигация между страницами
│   ├── api.js              — fetch wrapper + типизированные API-клиенты
│   ├── auth.js             — JWT-авторизация, impersonation, localStorage
│   ├── state.js            — глобальный объект state (analyses, drugs, etc.)
│   ├── config.js           — export const API_URL = ''
│   ├── utils.js            — escapeHtml, formatDate, getStatus, hexToRgb
│   ├── pages/              — страницы (каждая = модуль, экспортирует в window.*)
│   │   ├── dashboard.js    — главная: алерты, препараты, ASCII donut
│   │   ├── analyses.js     — CRUD анализов, PDF-импорт, мини-графики, тренды
│   │   ├── compare.js      — сравнение двух анализов
│   │   ├── course.js       — курс ПКТ: CRUD препаратов и записей приёма
│   │   ├── courseTabs.js   — вкладки курса: логи, инвентарь, статистика (ApexCharts)
│   │   ├── workouts.js     — программы тренировок (programs → days → exercises → sets)
│   │   ├── admin.js        — админка: пользователи, статистика, impersonation
│   │   ├── encyclopedia.js — каталог препаратов с фильтрами, PubMed-ссылками
│   │   └── login.js        — Google OAuth + Email magic code
│   ├── components/         — переиспользуемые UI-компоненты
│   │   ├── navigation.js   — навигация между .page, Escape закрытие модалок
│   │   ├── modals.js       — модалки CRUD препаратов/записей + каталог-автокомплит
│   │   ├── purchaseModals.js — модалки покупок (с автозаполнением производителя)
│   │   ├── workoutModals.js  — модалки тренировок (программа/день/упражнение/подход)
│   │   ├── toast.js        — toast-нотификации (success/error/warning/info)
│   │   ├── skeleton.js     — skeleton loading генераторы
│   │   ├── trendChart.js   — график тренда параметра (ApexCharts)
│   │   ├── color-picker.js — смена primary color + шрифта через CSS variables
│   │   ├── asciiDonut.js   — ASCII progress bar (small/medium/large)
│   │   ├── muscleAscii.js  — ASCII-арт мышечных групп (грудь, спина, ноги, etc.)
│   │   ├── asciiEngine.js  — конвертер изображений → ASCII (7 режимов)
│   │   ├── asciiArtUI.js   — UI для ASCII Engine (upload, preview, export)
│   │   └── asciifyEngine.js — пиксельный шрифт: текст → ASCII art (data-asciify)
│   └── effects/            — визуальные эффекты
│       ├── ascii-art.js    — рендер ASCII-черепа (skeleton strip)
│       ├── matrix-runes.js — фоновый canvas с падающими рунами (Matrix-стиль)
│       ├── progress-bar.js — кликабельный ASCII progress bar
│       └── sparks.js       — искры при взаимодействии с элементами
├── css/                    — модульный CSS
│   ├── variables.css       — CSS custom properties (цвета, шрифты, отступы)
│   ├── base.css            — @font-face, body, CRT overlay
│   ├── layout.css          — header, nav, pages
│   ├── components.css      — nav-btn, cards, badges, buttons
│   ├── modals.css          — модалки + color picker
│   ├── tables.css          — таблицы с ASCII-рамками
│   ├── effects.css         — glitch, spark, glow анимации
│   ├── animations.css      — @keyframes (blink, pulse, shimmer, scanline)
│   ├── toast.css           — toast-уведомления
│   ├── skeleton.css        — skeleton loading shimmer
│   ├── ascii-art.css       — ASCII header, skull container
│   ├── ascii-engine.css    — ASCII Art Studio layout
│   ├── asciify.css         — ASCIIfy pixel font стили
│   ├── auth.css            — login overlay
│   ├── admin.css           — admin panel
│   └── catalog.css         — autocomplete, encyclopedia cards, badges
└── docs/                   — эта документация
```

---

## Потоки данных

### Инициализация (main.js → init())

```
DOMContentLoaded
  → auth.isLoggedIn()?
    → НЕТ: showLoginPage()
    → ДА:
      → loadSavedColor()
      → updateUserDisplay()
      → loadReferenceRanges()  // GET /api/referenceranges
      → loadAnalyses()         // GET /api/analyses
      → loadDrugs()            // GET /api/drugs
      → loadIntakeLogs()       // GET /api/intakelogs?count=20
      → loadDashboard()        // GET /api/courses/dashboard
      → initWorkouts()
      → initNavigation()
      → initCourseTabs()
      → initEncyclopedia()
      → startMatrixRunes(), startSparkAnimation(), initProgressBar()
```

### Обработка 401

```
api() → response.status === 401
  → localStorage remove token/user
  → window.dispatchEvent('bt:unauthorized')
  → main.js listener → showLoginPage() (без перезагрузки)
```

---

## API Surface (window.*)

Модули экспортируют функции в `window.*` для вызова из `onclick` в HTML.

### Глобальные объекты

| window.*               | Модуль               | Описание                                      |
|------------------------|----------------------|-----------------------------------------------|
| `window.auth`          | auth.js              | `getToken, getUser, setSession, logout, isAdmin, isLoggedIn, startImpersonation, stopImpersonation` |
| `window.toast`         | toast.js             | `success(msg), error(msg), warning(msg), info(msg)` |
| `window.skeleton`      | skeleton.js          | `text(), title(), card(), stat(), stats(), tableRows(), drugCards()` |
| `window.asciify`       | asciifyEngine.js     | `text(), number(), init(), refresh(), toggle(), FONT` |
| `window.asciiEngine`   | asciiEngine.js       | `loadImage(), imageToAscii(), imageToColorAscii(), ...` |
| `window.asciiArtUI`    | asciiArtUI.js        | `init(), state` |
| `window.adminPage`     | admin.js             | `initAdminPage(), viewUser(), toggleAdmin(), deleteUser()` |
| `window.loginPage`     | login.js             | `sendCode(), verifyCode(), backToEmail(), showLoginPage()` |
| `window.purchaseModals`| purchaseModals.js    | `openPurchaseModal(), openEditPurchaseModal(), closePurchaseModal(), savePurchase(), deletePurchase()` |
| `window.courseTabs`    | courseTabs.js        | `resetFilters(), loadFilteredLogs(), loadInventory(), loadPurchases()` |

### Глобальные функции

| window.*                    | Модуль          |
|-----------------------------|-----------------|
| `loadDashboard()`           | main.js         |
| `loadDrugs()`               | main.js         |
| `loadIntakeLogs()`          | main.js         |
| `loadAnalyses()`            | main.js         |
| `openDrugModal(id?)`        | modals.js       |
| `closeDrugModal()`          | modals.js       |
| `saveDrug()`                | modals.js       |
| `deleteDrug(id)`            | modals.js       |
| `editDrug(id)`              | modals.js       |
| `openLogModal(id?)`         | modals.js       |
| `closeLogModal()`           | modals.js       |
| `saveLog()`                 | modals.js       |
| `deleteLog(id)`             | modals.js       |
| `editLog(id)`               | modals.js       |
| `displayAnalysis()`         | analyses.js     |
| `openAnalysisModal(id?)`    | analyses.js     |
| `closeAnalysisModal()`      | analyses.js     |
| `saveAnalysis()`            | analyses.js     |
| `deleteCurrentAnalysis()`   | analyses.js     |
| `editCurrentAnalysis()`     | analyses.js     |
| `openPdfImportModal()`      | analyses.js     |
| `importPdf()`               | analyses.js     |
| `copyAnalysisAsMarkdown()`  | analyses.js     |
| `compareAnalyses()`         | compare.js      |
| `saveCourse()`              | course.js       |
| `editCourse()`              | course.js       |
| `renderTrendChart()`        | trendChart.js   |
| `populateTrendSelect()`     | analyses.js     |
| `setColor(hex)`             | color-picker.js |
| `toggleColorPicker()`       | color-picker.js |
| `setFont(name)`             | color-picker.js |
| Все `openWorkout*Modal`, `closeWorkout*Modal`, `saveWorkout*`, `deleteWorkout*`, `duplicateWorkout*` | workoutModals.js, workouts.js |

---

## API-клиенты (api.js)

```js
api(path, options)              // Основной — добавляет Bearer token, обрабатывает 401
apiUpload(path, formData)       // Для multipart (PDF upload) — без Content-Type

// Типизированные:
intakeLogsApi.list(filters)
purchaseApi.list() / .create() / .update() / .remove() / .getByDrug() / .options()
statsApi.getDrugStatistics() / .getInventory() / .getConsumptionTimeline() / .getPurchaseVsConsumption()
catalogApi.substances() / .popular() / .substance() / .manufacturers() / .manufacturer() / .categories()
workoutsApi.programs.* / .days.* / .exercises.* / .sets.*
```

---

## Визуальные эффекты

| Эффект                  | Файл               | Описание                                           |
|-------------------------|---------------------|----------------------------------------------------|
| Matrix Runes            | matrix-runes.js     | Canvas фон — падающие руны с 3 слоями (back/mid/front), адаптивные скорости |
| ASCII Skull             | ascii-art.js        | Огромный ASCII-череп в header, авто-масштабирование |
| Sparks                  | sparks.js           | Физические искры от ASCII-элементов, коллизии с DOM |
| Progress Bar            | progress-bar.js     | Кликабельный ASCII `[████░░░░] 40%`                |
| CRT Overlay             | base.css            | `body::before` — scanline overlay                  |
| Glitch Text             | effects.css         | CSS анимация с `clip-path` + цветовым смещением    |
| ASCIIfy                 | asciifyEngine.js    | Рендер текста пиксельным шрифтом (атрибут `data-asciify`) |
| ASCII Donut             | asciiDonut.js       | ASCII progress bar `[████░░░░]` с рамками          |

---

## Авторизация

- **JWT** в `localStorage` (`bt_token`, `bt_user`)
- **Google OAuth**: GSI library → `POST /api/auth/google`
- **Email Magic Code**: `POST /api/auth/send-code` → `POST /api/auth/verify-code`
- **Impersonation** (admin): admin-токен сохраняется в `sessionStorage`, юзерский в `localStorage`
- **401 handling**: event `bt:unauthorized` → показать login overlay без reload

---

## Внешние зависимости

- **ApexCharts** — графики (trend chart, consumption timeline, purchase vs consumption, admin registrations)
- **Google Identity Services** (GSI) — Google Sign-In
- Кастомные шрифты: `Rotasuningr-Regular.ttf`, `web_ibm_mda.ttf`
