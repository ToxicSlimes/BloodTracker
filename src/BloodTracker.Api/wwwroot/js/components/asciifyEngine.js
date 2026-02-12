/**
 * ASCIIfy Engine v4 — Hand-crafted pixel font renderer
 *
 * Instead of Canvas sampling (which produces unreadable mush),
 * uses a manually designed 5-line bitmap font where every letter
 * is crafted for maximum readability at small sizes.
 * Like arcade game pixel fonts — guaranteed readable.
 */

// ═══ 5-LINE PIXEL FONT ═══
// Each character: array of 5 strings using █ and space
// Designed like classic 5×4 LCD/arcade pixel fonts

const F = {
// ─── Cyrillic Uppercase ───
'А': ['·██·','█··█','████','█··█','█··█'],
'Б': ['████','█···','███·','█··█','███·'],
'В': ['███·','█··█','███·','█··█','███·'],
'Г': ['████','█···','█···','█···','█···'],
'Д': ['·███','█··█','█··█','████','█··█'],
'Е': ['████','█···','███·','█···','████'],
'Ё': ['█··█','████','███·','█···','████'],
'Ж': ['█·█·█','█·█·█','·███·','█·█·█','█·█·█'],
'З': ['████','···█','·███','···█','████'],
'И': ['█··█','█·██','██·█','██·█','█··█'],
'Й': ['·██·','█··█','█·██','██·█','█··█'],
'К': ['█··█','█·█·','██··','█·█·','█··█'],
'Л': ['·███','█··█','█··█','█··█','█··█'],
'М': ['█···█','██·██','█·█·█','█···█','█···█'],
'Н': ['█··█','█··█','████','█··█','█··█'],
'О': ['·██·','█··█','█··█','█··█','·██·'],
'П': ['████','█··█','█··█','█··█','█··█'],
'Р': ['███·','█··█','███·','█···','█···'],
'С': ['·███','█···','█···','█···','·███'],
'Т': ['████','·█··','·█··','·█··','·█··'],
'У': ['█··█','█··█','·███','···█','███·'],
'Ф': ['·███·','█·█·█','█·█·█','·███·','··█··'],
'Х': ['█···█','·█·█·','··█··','·█·█·','█···█'],
'Ц': ['█··█·','█··█·','█··█·','█████','····█'],
'Ч': ['█··█','█··█','·███','···█','···█'],
'Ш': ['█·█·█','█·█·█','█·█·█','█·█·█','█████'],
'Щ': ['█·█·█·','█·█·█·','█·█·█·','██████','·····█'],
'Ъ': ['██··','·█··','·██·','·█·█','·██·'],
'Ы': ['█···█','█···█','██··█','█·█·█','██··█'],
'Ь': ['█···','█···','██··','█·█·','██··'],
'Э': ['███·','···█','·███','···█','███·'],
'Ю': ['█·██·','██··█','██··█','██··█','█·██·'],
'Я': ['·███','█··█','·███','·█·█','█··█'],

// ─── Latin Uppercase ───
'A': ['·██·','█··█','████','█··█','█··█'],
'B': ['███·','█··█','███·','█··█','███·'],
'C': ['·███','█···','█···','█···','·███'],
'D': ['███·','█··█','█··█','█··█','███·'],
'E': ['████','█···','███·','█···','████'],
'F': ['████','█···','███·','█···','█···'],
'G': ['·███','█···','█·██','█··█','·██·'],
'H': ['█··█','█··█','████','█··█','█··█'],
'I': ['███','·█·','·█·','·█·','███'],
'J': ['··██','···█','···█','█··█','·██·'],
'K': ['█··█','█·█·','██··','█·█·','█··█'],
'L': ['█···','█···','█···','█···','████'],
'M': ['█···█','██·██','█·█·█','█···█','█···█'],
'N': ['█··█','██·█','█·██','█··█','█··█'],
'O': ['·██·','█··█','█··█','█··█','·██·'],
'P': ['███·','█··█','███·','█···','█···'],
'Q': ['·██·','█··█','█··█','█·█·','·█·█'],
'R': ['███·','█··█','███·','█·█·','█··█'],
'S': ['·███','█···','·██·','···█','███·'],
'T': ['████','·█··','·█··','·█··','·█··'],
'U': ['█··█','█··█','█··█','█··█','·██·'],
'V': ['█··█','█··█','█··█','·██·','··█·'],
'W': ['█···█','█···█','█·█·█','██·██','█···█'],
'X': ['█···█','·█·█·','··█··','·█·█·','█···█'],
'Y': ['█··█','█··█','·██·','·█··','·█··'],
'Z': ['████','···█','·██·','█···','████'],

// ─── Digits ───
'0': ['·██·','█··█','█··█','█··█','·██·'],
'1': ['·█·','██·','·█·','·█·','███'],
'2': ['·██·','█··█','··█·','·█··','████'],
'3': ['████','···█','·██·','···█','████'],
'4': ['█··█','█··█','████','···█','···█'],
'5': ['████','█···','███·','···█','███·'],
'6': ['·██·','█···','███·','█··█','·██·'],
'7': ['████','···█','··█·','·█··','█···'],
'8': ['·██·','█··█','·██·','█··█','·██·'],
'9': ['·██·','█··█','·███','···█','·██·'],

// ─── Punctuation ───
'[': ['██','█·','█·','█·','██'],
']': ['██','·█','·█','·█','██'],
'(': ['·█','█·','█·','█·','·█'],
')': ['█·','·█','·█','·█','█·'],
'+': ['····','·█·','███','·█·','····'],
'-': ['···','···','███','···','···'],
'—': ['····','····','████','····','····'],
'.': ['··','··','··','··','█·'],
',': ['··','··','··','·█','█·'],
':': ['·','·','█','·','█'],
'!': ['█','█','█','·','█'],
'?': ['·██·','█··█','··█·','····','··█·'],
'/': ['···█','··█·','·█··','█···','····'],
'_': ['····','····','····','····','████'],
'=': ['····','████','····','████','····'],
'₽': ['███·','█··█','███·','██··','█···'],
'№': ['█··█·█','██·█·█','█·██·█','█··███','█··█·█'],
' ': ['···','···','···','···','···'],
'«': ['·█·█','█·█·','····','····','····'],
'»': ['····','····','····','·█·█','█·█·'],
'"': ['█·█','█·█','···','···','···'],
"'": ['█','█','·','·','·'],
'*': ['·····','·█·█·','··█··','·█·█·','·····'],
'%': ['█··█','···█','·██·','█···','█··█'],
};

/** Высота пиксельного шрифта в строках */
const FONT_HEIGHT = 5;

// Replace · with space for rendering (· is used in source for visual clarity)
const FONT = {};
for (const [ch, lines] of Object.entries(F)) {
    FONT[ch] = lines.map(l => l.replace(/·/g, ' '));
}

// ═══ Render text → ASCII art string ═══

/**
 * Рендерит текст в ASCII-арт строку используя пиксельный шрифт.
 * Каждый символ — 5 строк высотой, символы разделяются пробелами.
 * @param {string} text — текст для рендеринга
 * @param {number} [charGap=1] — количество пробелов между символами
 * @returns {string} многострочная ASCII-арт строка
 */
function renderText(text, charGap = 1) {
    const lines = Array.from({ length: FONT_HEIGHT }, () => '');
    const gap = ' '.repeat(charGap);

    for (const ch of text) {
        const glyph = FONT[ch] || FONT[ch.toUpperCase()] || FONT['?'] || FONT[' '];
        for (let i = 0; i < FONT_HEIGHT; i++) {
            lines[i] += (glyph[i] || '') + gap;
        }
    }

    return lines.map(l => l.replace(/\s+$/, '')).join('\n');
}

// ═══ Main API: text → HTML ═══

/** Кеш отрендеренных ASCII-строк (text|size → HTML) */
const cache = new Map();
/** Максимальный размер кеша */
const MAX_CACHE = 200;

/**
 * Конвертирует текст в ASCII-арт и оборачивает в HTML pre элемент.
 * Результат кешируется. Поддерживает размеры: sm, md, lg.
 * @param {string} text — текст для конвертации
 * @param {Object} [options={}] — опции
 * @param {'sm'|'md'|'lg'} [options.size='md'] — размер отображения
 * @returns {string} HTML строка с pre.asciified или пустая строка
 */
function textToAscii(text, options = {}) {
    if (!text || !text.trim()) return '';

    const size = options.size || 'md';
    const key = `${text}|${size}`;
    if (cache.has(key)) return cache.get(key);

    // For sm size, use tighter spacing
    const gap = size === 'sm' ? 1 : 1;
    const ascii = renderText(text, gap);
    if (!ascii.trim()) return '';

    const sizeClass = size !== 'md' ? ` asciified--${size}` : '';
    const html = `<pre class="asciified${sizeClass}">${escapeHtml(ascii)}</pre>`;

    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(key, html);
    return html;
}

/**
 * Конвертирует число в ASCII-арт с размером lg по умолчанию.
 * @param {number} num — число для конвертации
 * @param {Object} [options={}] — опции (передаются в textToAscii)
 * @returns {string} HTML строка с ASCII-артом числа
 */
function numberToAscii(num, options = {}) {
    return textToAscii(String(num), { size: 'lg', ...options });
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ═══════════════════════════════════════════════
//  DOM Integration
// ═══════════════════════════════════════════════

let enabled = true;
let observer = null;
let observerPaused = false;

/**
 * Инициализирует ASCIIfy: загружает настройку из localStorage,
 * обрабатывает все [data-asciify] элементы, запускает MutationObserver.
 */
function init() {
    const saved = localStorage.getItem('bloodtracker-asciify');
    if (saved !== null) enabled = saved !== 'false';
    if (enabled) processAll();
    setupObserver();
}

/** Обрабатывает все DOM-элементы с атрибутом [data-asciify]. */
function processAll() {
    document.querySelectorAll('[data-asciify]').forEach(el => processElement(el));
}

/**
 * Конвертирует текст одного DOM-элемента в ASCII-арт.
 * Сохраняет оригинальный текст в data-asciify-original.
 * @param {HTMLElement} el — элемент с [data-asciify]
 */
function processElement(el) {
    if (!enabled) return;
    let originalText = el.getAttribute('data-asciify-original');
    if (!originalText) {
        originalText = el.textContent.trim();
        if (!originalText) return;
    }
    const size = el.getAttribute('data-asciify') || 'md';
    const html = textToAscii(originalText, { size });
    if (!html) return;

    el.setAttribute('data-asciify-original', originalText);
    observerPaused = true;
    el.innerHTML = html;
    el.setAttribute('data-asciify-active', 'true');
    observerPaused = false;
}

/**
 * Обновляет ASCII-арт для элемента или всех [data-asciify] элементов.
 * @param {HTMLElement|null} [el] — конкретный элемент или null для всех
 */
function refresh(el) {
    if (!enabled) return;
    if (el) {
        el.removeAttribute('data-asciify-original');
        el.removeAttribute('data-asciify-active');
        processElement(el);
    } else {
        document.querySelectorAll('[data-asciify]').forEach(t => processElement(t));
    }
}

/**
 * Переключает режим ASCIIfy on/off. Сохраняет в localStorage.
 * При выключении восстанавливает оригинальный текст.
 * @param {boolean} [forceState] — принудительное состояние
 */
function toggle(forceState) {
    enabled = forceState !== undefined ? !!forceState : !enabled;
    localStorage.setItem('bloodtracker-asciify', String(enabled));
    if (enabled) {
        processAll();
    } else {
        observerPaused = true;
        document.querySelectorAll('[data-asciify-active="true"]').forEach(el => {
            const original = el.getAttribute('data-asciify-original');
            if (original) el.textContent = original;
            el.removeAttribute('data-asciify-active');
        });
        observerPaused = false;
    }
    const btn = document.getElementById('asciify-toggle-btn');
    if (btn) {
        btn.textContent = enabled ? '[ ASCII: ON ]' : '[ ASCII: OFF ]';
        btn.classList.toggle('active', enabled);
    }
}

function clearCache() { cache.clear(); }

/**
 * Настраивает MutationObserver для автоматической обработки новых [data-asciify] элементов.
 * Игнорирует мутации вызванные самим asciify (через observerPaused флаг).
 */
function setupObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(mutations => {
        if (!enabled || observerPaused) return;
        const toRefresh = new Set();
        for (const m of mutations) {
            if (m.type !== 'childList') continue;
            const t = m.target;
            if (!t?.closest) continue;
            const el = t.closest('[data-asciify]');
            if (!el) continue;
            const isOurs = Array.from(m.addedNodes).some(n =>
                n.nodeType === 1 && (n.classList?.contains('asciified') || n.querySelector?.('.asciified'))
            );
            if (!isOurs) toRefresh.add(el);
        }
        toRefresh.forEach(el => {
            clearTimeout(el._at);
            el._at = setTimeout(() => {
                el.removeAttribute('data-asciify-original');
                el.removeAttribute('data-asciify-active');
                processElement(el);
            }, 50);
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// ═══ Global API ═══

window.asciify = {
    text: textToAscii,
    number: numberToAscii,
    init, refresh, toggle, clearCache,
    get enabled() { return enabled; },
    FONT
};
