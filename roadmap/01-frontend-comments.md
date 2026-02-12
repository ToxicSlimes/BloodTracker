# 01 — JSDoc комментарии на фронтенде

**Приоритет:** 1 (первый)
**Оценка:** 4-5 часов
**Сложность:** Лёгкая

## Цель
Каждая функция, обработчик, UI-элемент в 33 JS файлах покрыт JSDoc комментариями.
Облегчает разработку, навигацию, будущую миграцию на TypeScript.

## Что комментировать

### Функции — обязательно:
```js
/**
 * Загружает список анализов с сервера и рендерит таблицу.
 * Вызывается при инициализации приложения и после создания/удаления анализа.
 * @returns {Promise<void>}
 */
async function loadAnalyses() { ... }
```

### Event handlers — обязательно:
```js
/**
 * Обработчик клика по кнопке "Удалить анализ".
 * Показывает confirm-диалог, при подтверждении — DELETE запрос + перерендер.
 * @param {string} analysisId — ID анализа для удаления
 */
function handleDeleteAnalysis(analysisId) { ... }
```

### HTML-генерация (innerHTML/template literals) — обязательно:
```js
// ── Карточка препарата ──────────────────────────
// [Название]  [Тип badge]  [Дозировка]
// [Расписание приёма]
// Кнопки: [Редактировать] [Удалить]
container.innerHTML = `<div class="drug-card">...`;
```

### Константы и конфиги:
```js
/** Маппинг числовых категорий на русские названия для UI */
export const CATEGORY_NAMES = { ... }
```

### Модальные окна:
```js
/**
 * Открывает модалку создания/редактирования препарата.
 * Если drug передан — режим редактирования, поля заполнены.
 * @param {Object|null} drug — существующий препарат или null для нового
 */
function openDrugModal(drug = null) { ... }
```

## Что НЕ комментировать
- Очевидные геттеры/сеттеры
- Однострочные утилиты (`formatDate`, `escapeHtml`)
- Код внутри функций (только JSDoc перед функцией)

## Файлы и порядок обработки

### Batch 1: Core (5 файлов, ~1ч)
- [ ] `main.js` (260 строк) — точка входа, init(), загрузка данных
- [ ] `api.js` — fetch обёртка, interceptors
- [ ] `auth.js` — JWT, login/logout, impersonation
- [ ] `state.js` — глобальное состояние
- [ ] `utils.js` — утилиты, хелперы

### Batch 2: Pages (7 файлов, ~2ч)
- [ ] `pages/dashboard.js` — главная, карточки, дашборд
- [ ] `pages/course.js` — управление курсом, препараты, приёмы
- [ ] `pages/courseTabs.js` — табы курса (препараты/приёмы/покупки/статистика)
- [ ] `pages/workouts.js` — программы тренировок, дни, упражнения, сеты
- [ ] `pages/analyses.js` — список анализов, таблица значений
- [ ] `pages/encyclopedia.js` — каталог субстанций, поиск, карточки
- [ ] `pages/admin.js` — управление пользователями, статистика
- [ ] `pages/login.js` — авторизация Google + email code
- [ ] `pages/compare.js` — сравнение двух анализов

### Batch 3: Components (7 файлов, ~1ч)
- [ ] `components/modals.js` — модалки добавления препарата/субстанции
- [ ] `components/workoutModals.js` — модалки тренировок (программа/день/упражнение/сет)
- [ ] `components/purchaseModals.js` — модалки покупок
- [ ] `components/navigation.js` — ASCII навигация, переключение страниц
- [ ] `components/skeleton.js` — skeleton loading генераторы
- [ ] `components/toast.js` — toast уведомления
- [ ] `components/trendChart.js` — графики трендов
- [ ] `components/color-picker.js` — выбор цвета темы

### Batch 4: Effects & ASCII (6 файлов, ~30мин)
- [ ] `components/asciiArtUI.js` — ASCII Art Studio (интерактивный редактор)
- [ ] `components/asciiDonut.js` — 3D ASCII donut для инвентаря
- [ ] `components/asciiEngine.js` — рендер ASCII арта
- [ ] `components/asciifyEngine.js` — замена текста на ASCII шрифты
- [ ] `components/muscleAscii.js` — ASCII карта мышц
- [ ] `effects/matrix-runes.js` — матричный дождь рун
- [ ] `effects/progress-bar.js` — ASCII прогресс-бар
- [ ] `effects/sparks.js` — декоративные искры
- [ ] `effects/ascii-art.js` — ASCII skull и декор

### Batch 5: Config & Endpoints (2 файла, ~15мин)
- [ ] `config.js` — конфигурация приложения
- [ ] `endpoints.js` — реестр API путей

## Критерий готовности
- Каждая экспортируемая функция имеет JSDoc
- Каждый innerHTML блок с UI имеет комментарий-схему
- Каждый event handler описывает что делает и когда вызывается
- `grep -c '/\*\*' файл` > 0 для каждого JS файла

## Backend — НЕ трогаем
На беке комментариев нет и не будет. Только XML docs (`/// <summary>`) для Swagger.
