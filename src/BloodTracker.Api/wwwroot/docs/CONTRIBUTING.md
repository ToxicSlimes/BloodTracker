# Contributing — Гайд по внесению изменений

## Быстрый старт

1. Бэкенд запущен (ASP.NET Core) — он раздаёт `wwwroot/` как static files
2. Редактируй файлы в `wwwroot/` — F5 в браузере для обновления
3. Нет build step — ES6 modules работают напрямую через `<script type="module">`

---

## Структура и конвенции

### Именование файлов
- `js/pages/` — kebab-case или camelCase (`courseTabs.js`, `dashboard.js`)
- `js/components/` — camelCase (`asciiDonut.js`, `workoutModals.js`)
- `js/effects/` — kebab-case (`matrix-runes.js`, `ascii-art.js`)
- `css/` — kebab-case (`ascii-engine.css`, `color-picker` → в `modals.css`)

### Структура JS-модуля

```js
// 1. Импорты
import { state } from '../state.js'
import { api } from '../api.js'
import { escapeHtml } from '../utils.js'
import { toast } from '../components/toast.js'

// 2. Приватные функции и состояние
let localVar = null

function privateHelper() { ... }

// 3. Экспортируемые функции
export function publicFunction() { ... }

// 4. Window exports (для onclick в HTML)
window.publicFunction = publicFunction
```

### CSS-конвенции

```css
/* Используй переменные из variables.css */
color: var(--primary-color);
background: var(--bg-secondary);
font-family: var(--ascii-font-family);

/* Для прозрачности — RGB переменные */
background: rgba(var(--primary-rgb), 0.1);

/* BEM-подобные классы (не строго) */
.inventory-card { }
.inventory-card-header { }
.inventory-card-body { }
.inventory-stat-value { }

/* ASCII-декорации через ::before/::after */
.card::before {
    content: '╔══════════╗';
    /* ... */
}
```

---

## Чеклист перед коммитом

- [ ] `escapeHtml()` для любого пользовательского текста в `innerHTML`
- [ ] `window.*` экспорт для функций, вызываемых из HTML onclick
- [ ] Toast для ошибок (не alert)
- [ ] Защита от двойного submit (флаг `_saving`)
- [ ] CSS variables вместо hardcoded цветов
- [ ] Тестирование с разными цветами (через color picker)
- [ ] Проверка на мобильном (если затронут layout)
- [ ] Модалки закрываются по Escape и клику на backdrop

---

## Порядок подключения CSS

В `index.html` CSS подключаются в определённом порядке (каскад!):

```
1. variables.css     — переменные
2. base.css          — reset, body, fonts
3. layout.css        — header, nav, pages
4. components.css    — кнопки, карточки, badges
5. modals.css        — модалки, color picker
6. tables.css        — таблицы
7. effects.css       — glitch, sparks
8. animations.css    — @keyframes
9. toast.css         — уведомления
10. skeleton.css     — loading
11. ascii-art.css    — ASCII header
12. ascii-engine.css — ASCII Art Studio
13. asciify.css      — ASCIIfy шрифт
14. auth.css         — login
15. admin.css        — админка
16. catalog.css      — каталог, encyclopedia
```

Новый CSS файл добавляй **после** `variables.css` и `base.css`, но **до** специфичных стилей, если твой файл содержит базовые стили.

---

## Работа с API

### Добавление нового API-вызова

1. Используй `api()` из `api.js` — он добавляет Bearer token и обрабатывает 401
2. Для типизированных endpoint'ов — создай объект в `api.js`:
   ```js
   export const myApi = {
       list: () => api('/myresource'),
       create: (data) => api('/myresource', { method: 'POST', body: JSON.stringify(data) })
   }
   ```
3. Для file upload — используй `apiUpload()` (без Content-Type header)

### Обработка ошибок

```js
try {
    const data = await api('/endpoint')
    // success
} catch (e) {
    toast.error('Ошибка: ' + e.message)
    // или console.error для фоновых операций
}
```

---

## ASCII-тема — принципы дизайна

1. **Моноширинный шрифт** — `var(--ascii-font-family)` везде
2. **Box-drawing рамки** — `╔═╗║╚╝╬╣╠╩╦` для заголовков и таблиц
3. **Квадратные скобки** — `[ ДЕЙСТВИЕ ]` для кнопок
4. **Glow-эффекты** — `text-shadow: 0 0 Npx var(--primary-color)` 
5. **Тёмный фон** — bg-primary (#2E222F), bg-secondary (#1A1A1A)
6. **ASCII-арт** — для пустых состояний, заголовков, индикаторов
7. **Руны и символы** — ᚠᚢᚦᚨᚱ для декора (matrix runes background)
8. **data-asciify** — автоматический рендер текста пиксельным шрифтом

---

## Полезные window.* для отладки

```js
// В консоли браузера:
window.auth                    // объект авторизации
window.toast.info('test')      // тест уведомления
window.asciify.toggle()        // вкл/выкл ASCII шрифт
window.asciify.FONT            // посмотреть доступные символы
window.asciiEngine.RAMPS       // character ramps
window.skeleton.card()         // получить HTML скелетона
```
