# HOWTO — Как добавлять функциональность

## Как добавить новую страницу

### 1. HTML (index.html)

Добавь кнопку навигации и контейнер страницы:

```html
<!-- В <nav> -->
<button class="nav-btn" data-page="mypage">МОЯ СТРАНИЦА</button>

<!-- В <main> -->
<div id="mypage" class="page">
    <div class="card">
        <div class="card-header">
            <div class="card-title" data-asciify="md">[ МОЯ СТРАНИЦА ]</div>
        </div>
        <div id="mypage-content"></div>
    </div>
</div>
```

### 2. JS (js/pages/mypage.js)

```js
import { state } from '../state.js'
import { api } from '../api.js'
import { escapeHtml } from '../utils.js'
import { toast } from '../components/toast.js'

export async function loadMyPage() {
    const container = document.getElementById('mypage-content')
    if (!container) return

    try {
        const data = await api('/myendpoint')
        container.innerHTML = `<p>${escapeHtml(data.title)}</p>`
    } catch (e) {
        toast.error('Ошибка: ' + e.message)
    }
}

// Экспорт в window для onclick в HTML
window.loadMyPage = loadMyPage
```

### 3. Подключи в main.js

```js
import './pages/mypage.js'
```

Навигация уже работает автоматически через `initNavigation()` — он ищет все `.nav-btn[data-page]`.

---

## Как добавить компонент

### Пример: счётчик

**js/components/counter.js**
```js
export function renderCounter(containerId, value) {
    const el = document.getElementById(containerId)
    if (!el) return

    el.innerHTML = `
        <div class="counter-card">
            <span class="counter-value">${value}</span>
            <button class="btn btn-secondary btn-small" onclick="window.incrementCounter('${containerId}')">
                [ +1 ]
            </button>
        </div>
    `
}

window.incrementCounter = (id) => {
    // ...логика
}
```

**Подключение в main.js:**
```js
import './components/counter.js'
```

---

## Как добавить модальное окно

### 1. HTML (index.html)

```html
<div class="modal-overlay" id="my-modal">
    <div class="modal">
        <div class="modal-header">
            <h2 id="my-modal-title">[ ЗАГОЛОВОК ]</h2>
            <button class="modal-close" onclick="closeMyModal()">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Поле</label>
                <input type="text" id="my-field">
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeMyModal()">[ ОТМЕНА ]</button>
            <button class="btn btn-primary" onclick="saveMyModal()">[ СОХРАНИТЬ ]</button>
        </div>
    </div>
</div>
```

### 2. JS

```js
import { api } from '../api.js'
import { toast } from './toast.js'

export function openMyModal() {
    document.getElementById('my-modal').classList.add('active')
    document.body.classList.add('modal-open')
}

export function closeMyModal() {
    document.getElementById('my-modal').classList.remove('active')
    document.body.classList.remove('modal-open')
}

let _saving = false
export async function saveMyModal() {
    if (_saving) return
    _saving = true
    try {
        const value = document.getElementById('my-field').value
        if (!value) { toast.warning('Заполните поле'); return }
        await api('/myendpoint', { method: 'POST', body: JSON.stringify({ value }) })
        closeMyModal()
        toast.success('Сохранено')
    } catch (e) {
        toast.error('Ошибка: ' + e.message)
    } finally {
        _saving = false
    }
}

window.openMyModal = openMyModal
window.closeMyModal = closeMyModal
window.saveMyModal = saveMyModal
```

> **Важно:** Escape и клик по backdrop уже обрабатываются глобально в `navigation.js`. Модалки с классом `.modal-overlay.active` автоматически закрываются.

---

## Как добавить визуальный эффект

### Пример: пульсирующий бордер

**js/effects/pulse-border.js**
```js
export function initPulseBorder() {
    const cards = document.querySelectorAll('.card')
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('pulse-border')
        })
        card.addEventListener('mouseleave', () => {
            card.classList.remove('pulse-border')
        })
    })
}
```

**css/effects.css** (добавь в существующий файл):
```css
.pulse-border {
    animation: borderPulse 1s ease-in-out infinite;
    border-color: var(--primary-color) !important;
    box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.5);
}

@keyframes borderPulse {
    0%, 100% { box-shadow: 0 0 5px rgba(var(--primary-rgb), 0.3); }
    50% { box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.8); }
}
```

**Подключение в main.js:**
```js
import { initPulseBorder } from './effects/pulse-border.js'
// В init():
initPulseBorder()
```

---

## Как добавить новый API endpoint

**js/api.js** — добавь типизированный клиент:
```js
export const myApi = {
    list: () => api('/myresource'),
    get: (id) => api(`/myresource/${id}`),
    create: (data) => api('/myresource', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(`/myresource/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => api(`/myresource/${id}`, { method: 'DELETE' })
}
```

---

## Как добавить новый CSS модуль

1. Создай файл `css/mymodule.css`
2. Подключи в `index.html` **после** `variables.css` и `base.css`:
   ```html
   <link rel="stylesheet" href="css/mymodule.css">
   ```
3. Используй CSS variables из `variables.css`

---

## Как добавить поле в state

**js/state.js:**
```js
export const state = {
    // ... существующие поля
    myNewData: [],
    editingMyId: null,
}
```

State — простой объект, мутируется напрямую. Нет реактивности — после изменения вызывай render-функцию вручную.
