# ASCII Art Engine

Полноценный движок для конвертации изображений и текста в ASCII арт, встроенный в BloodTracker.

## Возможности

### 🎨 Режимы конвертации

1. **CLASSIC** - Классический ASCII с градациями серого
2. **COLOR** - Цветной ASCII с сохранением RGB
3. **BRAILLE** - Высокое разрешение через Unicode Braille (4x плотность)
4. **EDGES** - Определение границ через Sobel operator
5. **FLOYD** - Дизеринг Floyd-Steinberg
6. **BAYER** - Упорядоченный дизеринг Bayer (4x4 матрица)
7. **ATKINSON** - Дизеринг Atkinson (классический Mac)

### 📐 Характеристики

- **8 наборов символов (ramps)**:
  - Standard (70 символов) - полный набор
  - Detailed (12 символов) - детализированный
  - Simple (11 символов) - простой
  - Blocks (5 символов) - блоки █▓▒░
  - Dots (6 символов) - точки ●◉◎◯
  - Binary (2 символа) - бинарный █
  - Tech (box drawing) - технический
  - Custom - пользовательский

- **Настройки**:
  - Ширина: 20-200 символов
  - Invert mode - для тёмных фонов
  - Threshold - порог для Braille/Edges (0-255)
  - Aspect ratio correction (0.5 для моноширинных шрифтов)

- **Экспорт**:
  - .TXT - plain text
  - .HTML - colored HTML
  - Copy to clipboard

## Файловая структура

```
src/BloodTracker.Api/wwwroot/
├── js/components/
│   ├── asciiEngine.js       # Core engine (конвертация)
│   └── asciiArtUI.js         # UI component (интерфейс)
├── css/
│   └── ascii-engine.css      # Стили
└── index.html                # Интеграция
```

## Алгоритмы

### Grayscale Conversion (BT.601)
```javascript
gray = 0.299 * R + 0.587 * G + 0.114 * B
```

### Aspect Ratio Correction
```javascript
correctedHeight = height * 0.5  // chars are ~2:1 tall/wide
```

### Sobel Edge Detection
Использует X и Y kernels для определения градиента:
```
gx = Sobel_X * pixel
gy = Sobel_Y * pixel
magnitude = sqrt(gx² + gy²)
angle = atan2(gy, gx)
```

### Braille Mapping
- Unicode range: U+2800 - U+28FF
- 2x4 pixel grid → 1 braille character
- 4x разрешение по сравнению с классическим ASCII

### Floyd-Steinberg Dithering
Распределение ошибки на соседние пиксели:
```
       X   7/16
 3/16 5/16 1/16
```

### Bayer Ordered Dithering
4x4 матрица порогов:
```
 0  8  2 10
12  4 14  6
 3 11  1  9
15  7 13  5
```

### Atkinson Dithering
Распределение ошибки / 8:
```
    X  1  1
 1  1  1
    1
```

## Использование в коде

### Импорт модулей
```javascript
import * as engine from './components/asciiEngine.js';
import { initAsciiArtUI } from './components/asciiArtUI.js';
```

### Базовое использование
```javascript
// Загрузить изображение
const img = await engine.loadImage(fileOrUrl);

// Конвертировать в ASCII
const ascii = engine.imageToAscii(img, {
    width: 100,
    ramp: engine.RAMPS.standard,
    invert: false
});

// Вывести
console.log(ascii);
```

### Цветной ASCII
```javascript
const colorHtml = engine.imageToColorAscii(img, {
    width: 100,
    ramp: engine.RAMPS.standard
});
document.getElementById('output').innerHTML = colorHtml;
```

### Braille Art
```javascript
const braille = engine.imageToBraille(img, {
    width: 100,
    threshold: 128,
    invert: false
});
```

### Edge Detection
```javascript
const edges = engine.imageToEdges(img, {
    width: 100,
    threshold: 50
});
```

### Dithering
```javascript
// Floyd-Steinberg
const floyd = engine.imageToFloydDither(img, {
    width: 100,
    ramp: engine.RAMPS.blocks
});

// Bayer
const bayer = engine.imageToBayerDither(img, {
    width: 100,
    ramp: engine.RAMPS.blocks
});

// Atkinson
const atkinson = engine.imageToAtkinsonDither(img, {
    width: 100,
    ramp: engine.RAMPS.blocks
});
```

### Экспорт
```javascript
// Скачать .txt
engine.exportAscii(ascii, 'my-art.txt');

// Скачать .html (для цветного)
engine.exportColorAscii(colorHtml, 'my-art.html');

// Копировать в буфер
await engine.copyToClipboard(ascii);
```

## Интеграция UI

### Инициализация
```javascript
// В main.js уже добавлено:
const { initAsciiArtUI } = await import('./components/asciiArtUI.js');
initAsciiArtUI('ascii-art-studio');
```

### Или в HTML
```html
<div id="ascii-art-studio"></div>
<script type="module">
  import { initAsciiArtUI } from './js/components/asciiArtUI.js';
  initAsciiArtUI('ascii-art-studio');
</script>
```

## Навигация

Добавлена новая вкладка в главное меню:
```
[ ДАШБОРД ] [ КУРС ] [ АНАЛИЗЫ ] [ СРАВНЕНИЕ ] [ ТРЕНИРОВКИ ] [ ASCII ART ]
```

## Performance Notes

- **Статические изображения (100x60)**: <1ms, main thread OK
- **Большие изображения (200x100)**: ~2-5ms
- **Braille mode**: выше разрешение, но медленнее ~2x
- **Edge detection**: Sobel convolution, ~3-7ms
- **Dithering**: Floyd-Steinberg самый медленный (~10-20ms), Bayer самый быстрый (~2-3ms)

## Примеры использования

### 1. Логотип компании → ASCII
```javascript
const img = await engine.loadImage('logo.png');
const ascii = engine.imageToAscii(img, {
    width: 80,
    ramp: engine.RAMPS.standard,
    invert: true  // для тёмного фона
});
console.log(ascii);
```

### 2. Фото → Braille Art (высокое качество)
```javascript
const img = await engine.loadImage('photo.jpg');
const braille = engine.imageToBraille(img, {
    width: 150,
    threshold: 128
});
document.getElementById('output').textContent = braille;
```

### 3. Иконка → Edge Detection
```javascript
const img = await engine.loadImage('icon.png');
const edges = engine.imageToEdges(img, {
    width: 60,
    threshold: 50
});
```

### 4. Портрет → Floyd Dithering
```javascript
const img = await engine.loadImage('portrait.jpg');
const dithered = engine.imageToFloydDither(img, {
    width: 120,
    ramp: engine.RAMPS.blocks
});
```

## Технические детали

### Canvas API
Использует `canvas.getContext('2d')` для чтения пикселей:
```javascript
ctx.drawImage(img, 0, 0, width, height);  // downscale
const imageData = ctx.getImageData(0, 0, width, height);
const pixels = imageData.data;  // RGBA array
```

### Cross-Origin Images
```javascript
img.crossOrigin = 'anonymous';  // CORS support
```

### Memory Management
- ImageData автоматически освобождается
- Canvas создаётся временно и GC очистит
- Для больших изображений downscale до нужной ширины

## Референсы

- **Braille Unicode**: U+2800 - U+28FF
- **BT.601**: ITU-R Recommendation BT.601 (grayscale conversion)
- **Sobel Operator**: Edge detection convolution kernels
- **Floyd-Steinberg**: Error diffusion dithering (1976)
- **Bayer Matrix**: Ordered dithering pattern
- **Atkinson Dithering**: Original Macintosh dithering algorithm

## Браузерная поддержка

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Требования:
- Canvas API
- ES6 Modules
- Async/await
- Clipboard API (для copy)

## Стиль кода

Следует конвенциям BloodTracker:
- ES6 modules
- `window.*` для глобального доступа
- Vanilla JavaScript (no frameworks)
- Dark dungeon/retro terminal theme
- Monospace fonts (Rotasuningr / IBM MDA)

## TODO / Future Enhancements

- [ ] Text-to-ASCII с FIGlet fonts
- [ ] Real-time webcam → ASCII
- [ ] Web Worker для background processing
- [ ] Custom ramp editor
- [ ] Animation support (GIF → ASCII frames)
- [ ] SVG export
- [ ] Batch processing (multiple files)
- [ ] Instagram/Twitter share
- [ ] ASCII filters (blur, sharpen, etc.)

## Лицензия

Часть проекта BloodTracker.
