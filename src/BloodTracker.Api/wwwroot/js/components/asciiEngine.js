// ═══════════════════════════════════════════════════════════════════════════════
// ASCII Art Engine - Image/Text to ASCII Converter
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Character ramps for different styles
 */
const RAMPS = {
    standard: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
    detailed: '@#S%?*+;:,. ',
    simple: '@%#*+=-:. ',
    blocks: '█▓▒░ ',
    dots: '●◉◎◯○. ',
    binary: '█ ',
    tech: '╬╦╣╠╩═║╔╗╚╝┼├┤┬┴─│┌┐└┘',
    custom: '' // User-defined
};

/**
 * Grayscale conversion constants (BT.601)
 */
const GRAYSCALE_WEIGHTS = {
    r: 0.299,
    g: 0.587,
    b: 0.114
};

/**
 * Aspect ratio correction for monospace fonts
 */
const ASPECT_RATIO = 0.5;

/**
 * Braille Unicode offset and patterns
 */
const BRAILLE_OFFSET = 0x2800;
const BRAILLE_MAP = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80]
];

/**
 * Edge detection Sobel kernels
 */
const SOBEL_X = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
];

const SOBEL_Y = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
];

/**
 * Directional characters for edge detection
 */
const EDGE_CHARS = {
    horizontal: '─',
    vertical: '│',
    diagonal_right: '/',
    diagonal_left: '\\',
    cross: '┼',
    empty: ' '
};

/**
 * Convert RGB to grayscale using BT.601 formula
 */
function rgbToGrayscale(r, g, b) {
    return GRAYSCALE_WEIGHTS.r * r + GRAYSCALE_WEIGHTS.g * g + GRAYSCALE_WEIGHTS.b * b;
}

/**
 * Map grayscale value to character
 */
function grayscaleToChar(gray, ramp, invert = false) {
    const chars = ramp || RAMPS.standard;
    const index = Math.floor((gray / 255) * (chars.length - 1));
    return invert ? chars[chars.length - 1 - index] : chars[index];
}

/**
 * Load image from file or URL
 * @param {File|string} source - File object or URL string
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(source) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => resolve(img);
        img.onerror = reject;

        if (source instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.onerror = reject;
            reader.readAsDataURL(source);
        } else {
            img.src = source;
        }
    });
}

/**
 * Extract image data from canvas
 */
function getImageData(img, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    return ctx.getImageData(0, 0, width, height);
}

/**
 * Convert image to ASCII art (grayscale)
 * @param {HTMLImageElement} img - Source image
 * @param {object} options - Conversion options
 * @returns {string} ASCII art string
 */
export function imageToAscii(img, options = {}) {
    const {
        width = 100,
        ramp = RAMPS.standard,
        invert = false,
        aspectRatio = ASPECT_RATIO
    } = options;

    const height = Math.floor((img.height / img.width) * width * aspectRatio);
    const imageData = getImageData(img, width, height);
    const pixels = imageData.data;

    let ascii = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const gray = rgbToGrayscale(pixels[i], pixels[i + 1], pixels[i + 2]);
            ascii += grayscaleToChar(gray, ramp, invert);
        }
        ascii += '\n';
    }

    return ascii;
}

/**
 * Convert image to colored ASCII art (HTML)
 * @param {HTMLImageElement} img - Source image
 * @param {object} options - Conversion options
 * @returns {string} HTML string with colored spans
 */
export function imageToColorAscii(img, options = {}) {
    const {
        width = 100,
        ramp = RAMPS.standard,
        aspectRatio = ASPECT_RATIO
    } = options;

    const height = Math.floor((img.height / img.width) * width * aspectRatio);
    const imageData = getImageData(img, width, height);
    const pixels = imageData.data;

    let html = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const gray = rgbToGrayscale(r, g, b);
            const char = grayscaleToChar(gray, ramp);

            html += `<span style="color:rgb(${r},${g},${b})">${char}</span>`;
        }
        html += '\n';
    }

    return html;
}

/**
 * Convert image to braille art (high resolution)
 * @param {HTMLImageElement} img - Source image
 * @param {object} options - Conversion options
 * @returns {string} Braille art string
 */
export function imageToBraille(img, options = {}) {
    const {
        width = 100,
        threshold = 128,
        invert = false
    } = options;

    // Braille gives us 4x resolution (2x2 dots per character)
    const pixelWidth = width * 2;
    const pixelHeight = Math.floor((img.height / img.width) * pixelWidth);
    const imageData = getImageData(img, pixelWidth, pixelHeight);
    const pixels = imageData.data;

    let braille = '';

    // Process in 2x4 blocks
    for (let y = 0; y < pixelHeight; y += 4) {
        for (let x = 0; x < pixelWidth; x += 2) {
            let charCode = BRAILLE_OFFSET;

            // Map 8 dots (2x4 grid)
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    const px = x + dx;
                    const py = y + dy;

                    if (px < pixelWidth && py < pixelHeight) {
                        const i = (py * pixelWidth + px) * 4;
                        const gray = rgbToGrayscale(pixels[i], pixels[i + 1], pixels[i + 2]);
                        const isDot = invert ? gray < threshold : gray > threshold;

                        if (isDot) {
                            charCode |= BRAILLE_MAP[dy][dx];
                        }
                    }
                }
            }

            braille += String.fromCharCode(charCode);
        }
        braille += '\n';
    }

    return braille;
}

/**
 * Apply Sobel edge detection
 * @param {HTMLImageElement} img - Source image
 * @param {object} options - Conversion options
 * @returns {string} Edge-detected ASCII art
 */
export function imageToEdges(img, options = {}) {
    const {
        width = 100,
        threshold = 50,
        aspectRatio = ASPECT_RATIO
    } = options;

    const height = Math.floor((img.height / img.width) * width * aspectRatio);
    const imageData = getImageData(img, width, height);
    const pixels = imageData.data;

    // Convert to grayscale array
    const gray = new Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        gray[i] = rgbToGrayscale(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
    }

    let ascii = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let gx = 0;
            let gy = 0;

            // Apply Sobel kernels
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = Math.min(Math.max(x + kx, 0), width - 1);
                    const py = Math.min(Math.max(y + ky, 0), height - 1);
                    const val = gray[py * width + px];

                    gx += val * SOBEL_X[ky + 1][kx + 1];
                    gy += val * SOBEL_Y[ky + 1][kx + 1];
                }
            }

            const magnitude = Math.sqrt(gx * gx + gy * gy);

            if (magnitude < threshold) {
                ascii += EDGE_CHARS.empty;
            } else {
                const angle = Math.atan2(gy, gx);
                const deg = (angle * 180 / Math.PI + 180) % 180;

                if (deg < 22.5 || deg >= 157.5) {
                    ascii += EDGE_CHARS.horizontal;
                } else if (deg >= 22.5 && deg < 67.5) {
                    ascii += EDGE_CHARS.diagonal_right;
                } else if (deg >= 67.5 && deg < 112.5) {
                    ascii += EDGE_CHARS.vertical;
                } else {
                    ascii += EDGE_CHARS.diagonal_left;
                }
            }
        }
        ascii += '\n';
    }

    return ascii;
}

/**
 * Apply Floyd-Steinberg dithering
 * @param {HTMLImageElement} img - Source image
 * @param {object} options - Conversion options
 * @returns {string} Dithered ASCII art
 */
export function imageToFloydDither(img, options = {}) {
    const {
        width = 100,
        ramp = RAMPS.blocks,
        aspectRatio = ASPECT_RATIO
    } = options;

    const height = Math.floor((img.height / img.width) * width * aspectRatio);
    const imageData = getImageData(img, width, height);
    const pixels = imageData.data;

    // Create grayscale buffer
    const buffer = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        buffer[i] = rgbToGrayscale(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
    }

    let ascii = '';
    const levels = ramp.length;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const oldPixel = buffer[i];
            const newPixel = Math.round(oldPixel / 255 * (levels - 1)) * (255 / (levels - 1));
            buffer[i] = newPixel;

            const error = oldPixel - newPixel;

            // Distribute error to neighbors
            if (x + 1 < width) buffer[i + 1] += error * 7 / 16;
            if (y + 1 < height) {
                if (x > 0) buffer[i + width - 1] += error * 3 / 16;
                buffer[i + width] += error * 5 / 16;
                if (x + 1 < width) buffer[i + width + 1] += error * 1 / 16;
            }

            const charIndex = Math.floor(buffer[i] / 255 * (levels - 1));
            ascii += ramp[charIndex];
        }
        ascii += '\n';
    }

    return ascii;
}

/**
 * Apply Bayer ordered dithering
 * @param {HTMLImageElement} img - Source image
 * @param {object} options - Conversion options
 * @returns {string} Dithered ASCII art
 */
export function imageToBayerDither(img, options = {}) {
    const {
        width = 100,
        ramp = RAMPS.blocks,
        aspectRatio = ASPECT_RATIO
    } = options;

    const height = Math.floor((img.height / img.width) * width * aspectRatio);
    const imageData = getImageData(img, width, height);
    const pixels = imageData.data;

    // 4x4 Bayer matrix
    const bayerMatrix = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];

    let ascii = '';
    const levels = ramp.length;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const gray = rgbToGrayscale(pixels[i], pixels[i + 1], pixels[i + 2]);

            const threshold = (bayerMatrix[y % 4][x % 4] / 16) * 255;
            const adjusted = gray + (threshold - 128);
            const clamped = Math.max(0, Math.min(255, adjusted));

            const charIndex = Math.floor(clamped / 255 * (levels - 1));
            ascii += ramp[charIndex];
        }
        ascii += '\n';
    }

    return ascii;
}

/**
 * Apply Atkinson dithering (used in early Mac computers)
 * @param {HTMLImageElement} img - Source image
 * @param {object} options - Conversion options
 * @returns {string} Dithered ASCII art
 */
export function imageToAtkinsonDither(img, options = {}) {
    const {
        width = 100,
        ramp = RAMPS.blocks,
        aspectRatio = ASPECT_RATIO
    } = options;

    const height = Math.floor((img.height / img.width) * width * aspectRatio);
    const imageData = getImageData(img, width, height);
    const pixels = imageData.data;

    // Create grayscale buffer
    const buffer = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        buffer[i] = rgbToGrayscale(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
    }

    let ascii = '';
    const levels = ramp.length;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const oldPixel = buffer[i];
            const newPixel = oldPixel > 128 ? 255 : 0;
            buffer[i] = newPixel;

            const error = (oldPixel - newPixel) / 8;

            // Atkinson dithering pattern
            if (x + 1 < width) buffer[i + 1] += error;
            if (x + 2 < width) buffer[i + 2] += error;
            if (y + 1 < height) {
                if (x > 0) buffer[i + width - 1] += error;
                buffer[i + width] += error;
                if (x + 1 < width) buffer[i + width + 1] += error;
            }
            if (y + 2 < height) {
                buffer[i + width * 2] += error;
            }

            const charIndex = Math.floor(buffer[i] / 255 * (levels - 1));
            ascii += ramp[charIndex];
        }
        ascii += '\n';
    }

    return ascii;
}

/**
 * Export ASCII art as downloadable file
 * @param {string} ascii - ASCII art content
 * @param {string} filename - Output filename
 */
export function exportAscii(ascii, filename = 'ascii-art.txt') {
    const blob = new Blob([ascii], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Export colored ASCII as HTML file
 * @param {string} html - HTML content with colored ASCII
 * @param {string} filename - Output filename
 */
export function exportColorAscii(html, filename = 'ascii-art.html') {
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            background: #000;
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1;
            white-space: pre;
            padding: 20px;
        }
    </style>
</head>
<body>${html}</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Copy ASCII to clipboard
 * @param {string} ascii - ASCII art content
 */
export async function copyToClipboard(ascii) {
    try {
        await navigator.clipboard.writeText(ascii);
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
    }
}

// Export ramps for external use
export { RAMPS };

// Global exposure for backward compatibility
window.asciiEngine = {
    loadImage,
    imageToAscii,
    imageToColorAscii,
    imageToBraille,
    imageToEdges,
    imageToFloydDither,
    imageToBayerDither,
    imageToAtkinsonDither,
    exportAscii,
    exportColorAscii,
    copyToClipboard,
    RAMPS
};
