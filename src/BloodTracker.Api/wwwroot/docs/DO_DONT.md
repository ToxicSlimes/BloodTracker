# DO / DON'T — Правила кода BloodTracker Frontend

## ✅ DO

### ES6 Modules
```js
// Каждый файл — ES6 module с import/export
import { state } from '../state.js'
import { api } from '../api.js'
import { toast } from '../components/toast.js'

export function myFunction() { ... }
```

### window.* для onclick в HTML
```js
// Функции, вызываемые из onclick="" в HTML, ОБЯЗАТЕЛЬНО экспортируй в window
window.saveDrug = saveDrug
window.editDrug = (id) => openDrugModal(id)
window.deleteLog = deleteLog

// Объекты-неймспейсы для групп функций:
window.purchaseModals = { openPurchaseModal, closePurchaseModal, savePurchase, ... }
window.adminPage = { initAdminPage, viewUser, toggleAdmin, deleteUser }
```

### CSS Custom Properties для стилей
```css
/* Используй переменные из variables.css */
color: var(--primary-color);
background: var(--bg-secondary);
border: 1px solid var(--border);
font-family: var(--ascii-font-family);

/* Цвета через RGB-переменные для opacity */
background: rgba(var(--primary-rgb), 0.1);
text-shadow: 0 0 10px rgba(var(--primary-rgb), 0.5);
```

### Toast вместо alert
```js
// ДА:
toast.success('Анализ сохранён')
toast.error('Ошибка: ' + e.message)
toast.warning('Заполните дату и метку')
toast.info('Код отправлен')

// Через window тоже работает:
window.toast?.success('Image loaded')
```

### escapeHtml для пользовательских данных
```js
import { escapeHtml } from '../utils.js'

// Любой пользовательский текст в innerHTML:
container.innerHTML = `<h4>${escapeHtml(drug.name)}</h4>`

// НЕ делай:
// container.innerHTML = `<h4>${drug.name}</h4>`  // XSS!
```

### Модальное окно — active class + modal-open на body
```js
document.getElementById('my-modal').classList.add('active')
document.body.classList.add('modal-open')

// Закрытие:
document.getElementById('my-modal').classList.remove('active')
document.body.classList.remove('modal-open')
```

### Защита от двойного submit
```js
let _saving = false
async function save() {
    if (_saving) return
    _saving = true
    try {
        await api(...)
    } finally {
        _saving = false
    }
}
```

### Навигация — data-page на кнопке, id на .page
```html
<button class="nav-btn" data-page="analyses">Анализы</button>
<div id="analyses" class="page">...</div>
```

### ASCII-стиль в UI-текстах
```js
// Квадратные скобки для кнопок/заголовков:
'[ ДОБАВИТЬ АНАЛИЗ ]'
'[ УДАЛИТЬ ПРЕПАРАТ? ]'
'[ ОШИБКА ИМПОРТА ]'
```

### data-asciify для ASCIIfy-рендеринга
```html
<!-- Автоматически рендерится пиксельным шрифтом -->
<div class="card-title" data-asciify="md">[ ПОЛЬЗОВАТЕЛИ ]</div>
<div class="stat-value" data-asciify="lg">42</div>
<!-- Размеры: sm, md, lg -->
```

---

## ❌ DON'T

### НЕ используй alert/confirm для уведомлений
```js
// НЕТ:
alert('Сохранено!')

// ДА:
toast.success('Сохранено!')

// confirm() допустим ТОЛЬКО для деструктивных действий (удаление):
if (!confirm('Удалить пользователя?')) return
```

### НЕ перезагружай страницу при 401
```js
// НЕТ:
window.location.reload()  // бесконечный цикл!

// ДА:
window.dispatchEvent(new Event('bt:unauthorized'))
```

### НЕ создавай новый CSS файл без добавления в index.html
```html
<!-- Все CSS подключены в index.html в определённом порядке -->
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/base.css">
<!-- ... -->
```

### НЕ используй инлайн-стили для тем
```html
<!-- НЕТ: -->
<div style="color: #00ff00;">

<!-- ДА: -->
<div style="color: var(--primary-color);">
```

### НЕ добавляй fetch() напрямую — используй api()
```js
// НЕТ:
const res = await fetch('/api/drugs')

// ДА:
const drugs = await api('/drugs')  // автоматически добавит token, обработает 401
```

### НЕ мутируй state напрямую из HTML
```js
// НЕТ (в onclick):
onclick="state.drugs.push({...})"

// ДА:
onclick="window.saveDrug()"  // функция делает API call и обновляет state
```

### НЕ используй фреймворки/библиотеки (кроме ApexCharts и GSI)
Проект сознательно на чистом JS. Не добавляй React, Vue, jQuery и т.д.

### НЕ забывай про ASCII-тему
Все UI-элементы должны соответствовать dungeon/terminal/retro-эстетике:
- Рамки из box-drawing символов (╔═╗║╚╝)
- Моноширинный шрифт
- Glow-эффекты через text-shadow
- Квадратные скобки `[ ]` для кнопок
