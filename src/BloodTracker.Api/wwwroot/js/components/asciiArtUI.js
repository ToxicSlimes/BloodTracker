// ═══════════════════════════════════════════════════════════════════════════════
// ASCII Art UI - Interactive converter interface
// ═══════════════════════════════════════════════════════════════════════════════

import * as engine from './asciiEngine.js';

/**
 * ASCII Art UI State
 */
const state = {
    currentImage: null,
    currentMode: 'classic',
    settings: {
        width: 80,
        ramp: 'standard',
        invert: false,
        threshold: 128,
        color: false
    }
};

/**
 * Initialize ASCII Art UI
 */
export function initAsciiArtUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container #${containerId} not found`);
        return;
    }

    container.innerHTML = generateUI();
    attachEventListeners();
}

/**
 * Generate UI HTML
 */
function generateUI() {
    return `
        <div class="ascii-art-studio">
            <!-- Control Panel -->
            <div class="ascii-controls card">
                <div class="card-header">
                    <h3 class="card-title">ASCII ENGINE</h3>
                </div>
                <div class="ascii-controls-body">
                    <!-- Image Upload -->
                    <div class="form-group">
                        <label for="ascii-image-upload">LOAD IMAGE</label>
                        <input type="file" id="ascii-image-upload" accept="image/*" />
                    </div>

                    <!-- URL Input -->
                    <div class="form-group">
                        <label for="ascii-image-url">OR PASTE URL</label>
                        <div class="input-with-button">
                            <input type="text" id="ascii-image-url" placeholder="https://..." />
                            <button class="btn btn-small" id="ascii-load-url">
                                <span>LOAD</span>
                            </button>
                        </div>
                    </div>

                    <!-- Mode Selection -->
                    <div class="form-group">
                        <label>CONVERSION MODE</label>
                        <div class="ascii-mode-tabs">
                            <button class="ascii-mode-tab active" data-mode="classic">CLASSIC</button>
                            <button class="ascii-mode-tab" data-mode="color">COLOR</button>
                            <button class="ascii-mode-tab" data-mode="braille">BRAILLE</button>
                            <button class="ascii-mode-tab" data-mode="edges">EDGES</button>
                            <button class="ascii-mode-tab" data-mode="floyd">FLOYD</button>
                            <button class="ascii-mode-tab" data-mode="bayer">BAYER</button>
                            <button class="ascii-mode-tab" data-mode="atkinson">ATKINSON</button>
                        </div>
                    </div>

                    <!-- Width Slider -->
                    <div class="form-group">
                        <label for="ascii-width">WIDTH: <span id="ascii-width-value">80</span></label>
                        <input type="range" id="ascii-width" min="20" max="200" value="80" step="10" />
                    </div>

                    <!-- Ramp Selection -->
                    <div class="form-group">
                        <label for="ascii-ramp">CHARACTER RAMP</label>
                        <select id="ascii-ramp">
                            <option value="standard">STANDARD (70 chars)</option>
                            <option value="detailed">DETAILED (12 chars)</option>
                            <option value="simple">SIMPLE (11 chars)</option>
                            <option value="blocks">BLOCKS (5 chars)</option>
                            <option value="dots">DOTS (6 chars)</option>
                            <option value="binary">BINARY (2 chars)</option>
                            <option value="tech">TECH (box drawing)</option>
                        </select>
                    </div>

                    <!-- Invert Checkbox -->
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="ascii-invert" />
                            <span>INVERT (for dark backgrounds)</span>
                        </label>
                    </div>

                    <!-- Threshold (for braille/edges) -->
                    <div class="form-group" id="ascii-threshold-group" style="display: none;">
                        <label for="ascii-threshold">THRESHOLD: <span id="ascii-threshold-value">128</span></label>
                        <input type="range" id="ascii-threshold" min="0" max="255" value="128" step="1" />
                    </div>

                    <!-- Convert Button -->
                    <div class="form-group">
                        <button class="btn btn-primary" id="ascii-convert-btn" disabled>
                            <span>⚔ CONVERT TO ASCII ⚔</span>
                        </button>
                    </div>

                    <!-- Export Actions -->
                    <div class="ascii-export-actions" id="ascii-export-actions" style="display: none;">
                        <button class="btn btn-secondary btn-small" id="ascii-copy-btn">
                            <span>📋 COPY</span>
                        </button>
                        <button class="btn btn-secondary btn-small" id="ascii-download-txt">
                            <span>💾 .TXT</span>
                        </button>
                        <button class="btn btn-secondary btn-small" id="ascii-download-html" style="display: none;">
                            <span>💾 .HTML</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Preview Area -->
            <div class="ascii-preview-area card">
                <div class="card-header">
                    <h3 class="card-title">PREVIEW</h3>
                </div>
                <div class="ascii-preview-body">
                    <!-- Image Preview -->
                    <div class="ascii-image-preview" id="ascii-image-preview">
                        <div class="empty-state">
                            <h3>⚔ UPLOAD IMAGE TO START ⚔</h3>
                            <p>Supports: JPG, PNG, GIF, WebP</p>
                        </div>
                    </div>

                    <!-- ASCII Output -->
                    <div class="ascii-output-container">
                        <pre class="ascii-output" id="ascii-output"></pre>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    // Image upload
    const uploadInput = document.getElementById('ascii-image-upload');
    uploadInput?.addEventListener('change', handleImageUpload);

    // URL load
    const urlInput = document.getElementById('ascii-image-url');
    const loadUrlBtn = document.getElementById('ascii-load-url');
    loadUrlBtn?.addEventListener('click', () => handleUrlLoad(urlInput.value));
    urlInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUrlLoad(urlInput.value);
    });

    // Mode tabs
    document.querySelectorAll('.ascii-mode-tab').forEach(tab => {
        tab.addEventListener('click', () => handleModeChange(tab.dataset.mode));
    });

    // Width slider
    const widthSlider = document.getElementById('ascii-width');
    const widthValue = document.getElementById('ascii-width-value');
    widthSlider?.addEventListener('input', (e) => {
        state.settings.width = parseInt(e.target.value);
        widthValue.textContent = e.target.value;
    });

    // Ramp selection
    const rampSelect = document.getElementById('ascii-ramp');
    rampSelect?.addEventListener('change', (e) => {
        state.settings.ramp = e.target.value;
    });

    // Invert checkbox
    const invertCheckbox = document.getElementById('ascii-invert');
    invertCheckbox?.addEventListener('change', (e) => {
        state.settings.invert = e.target.checked;
    });

    // Threshold slider
    const thresholdSlider = document.getElementById('ascii-threshold');
    const thresholdValue = document.getElementById('ascii-threshold-value');
    thresholdSlider?.addEventListener('input', (e) => {
        state.settings.threshold = parseInt(e.target.value);
        thresholdValue.textContent = e.target.value;
    });

    // Convert button
    const convertBtn = document.getElementById('ascii-convert-btn');
    convertBtn?.addEventListener('click', handleConvert);

    // Export buttons
    document.getElementById('ascii-copy-btn')?.addEventListener('click', handleCopy);
    document.getElementById('ascii-download-txt')?.addEventListener('click', handleDownloadTxt);
    document.getElementById('ascii-download-html')?.addEventListener('click', handleDownloadHtml);
}

/**
 * Handle image file upload
 */
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const img = await engine.loadImage(file);
        state.currentImage = img;
        displayImagePreview(img);
        enableConvertButton();
        window.toast?.success('Image loaded successfully');
    } catch (err) {
        console.error('Failed to load image:', err);
        window.toast?.error('Failed to load image');
    }
}

/**
 * Handle URL load
 */
async function handleUrlLoad(url) {
    if (!url || !url.trim()) {
        window.toast?.warning('Please enter a valid URL');
        return;
    }

    try {
        const img = await engine.loadImage(url);
        state.currentImage = img;
        displayImagePreview(img);
        enableConvertButton();
        window.toast?.success('Image loaded from URL');
    } catch (err) {
        console.error('Failed to load image from URL:', err);
        window.toast?.error('Failed to load image from URL');
    }
}

/**
 * Display image preview
 */
function displayImagePreview(img) {
    const preview = document.getElementById('ascii-image-preview');
    if (!preview) return;

    preview.innerHTML = `<img src="${img.src}" alt="Preview" class="ascii-preview-image" />`;
}

/**
 * Enable convert button
 */
function enableConvertButton() {
    const btn = document.getElementById('ascii-convert-btn');
    if (btn) btn.disabled = false;
}

/**
 * Handle mode change
 */
function handleModeChange(mode) {
    state.currentMode = mode;

    // Update active tab
    document.querySelectorAll('.ascii-mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // Show/hide threshold control
    const thresholdGroup = document.getElementById('ascii-threshold-group');
    if (thresholdGroup) {
        thresholdGroup.style.display = (mode === 'braille' || mode === 'edges') ? 'block' : 'none';
    }

    // Show/hide HTML download button
    const htmlBtn = document.getElementById('ascii-download-html');
    if (htmlBtn) {
        htmlBtn.style.display = (mode === 'color') ? 'inline-block' : 'none';
    }
}

/**
 * Handle conversion
 */
async function handleConvert() {
    if (!state.currentImage) {
        window.toast?.warning('Please load an image first');
        return;
    }

    const output = document.getElementById('ascii-output');
    if (!output) return;

    try {
        // Show loading skeleton
        output.innerHTML = '<span class="loading">Converting...</span>';

        // Small delay to allow UI update
        await new Promise(resolve => setTimeout(resolve, 50));

        let result = '';
        const options = {
            width: state.settings.width,
            ramp: engine.RAMPS[state.settings.ramp],
            invert: state.settings.invert,
            threshold: state.settings.threshold
        };

        switch (state.currentMode) {
            case 'classic':
                result = engine.imageToAscii(state.currentImage, options);
                output.textContent = result;
                break;

            case 'color':
                result = engine.imageToColorAscii(state.currentImage, options);
                output.innerHTML = result;
                break;

            case 'braille':
                result = engine.imageToBraille(state.currentImage, options);
                output.textContent = result;
                break;

            case 'edges':
                result = engine.imageToEdges(state.currentImage, options);
                output.textContent = result;
                break;

            case 'floyd':
                result = engine.imageToFloydDither(state.currentImage, options);
                output.textContent = result;
                break;

            case 'bayer':
                result = engine.imageToBayerDither(state.currentImage, options);
                output.textContent = result;
                break;

            case 'atkinson':
                result = engine.imageToAtkinsonDither(state.currentImage, options);
                output.textContent = result;
                break;
        }

        // Show export actions
        const exportActions = document.getElementById('ascii-export-actions');
        if (exportActions) exportActions.style.display = 'flex';

        window.toast?.success('Conversion complete!');
    } catch (err) {
        console.error('Conversion failed:', err);
        window.toast?.error('Conversion failed');
        output.innerHTML = '<span class="error">Conversion failed. Please try again.</span>';
    }
}

/**
 * Handle copy to clipboard
 */
async function handleCopy() {
    const output = document.getElementById('ascii-output');
    if (!output || !output.textContent) {
        window.toast?.warning('Nothing to copy');
        return;
    }

    const success = await engine.copyToClipboard(output.textContent);
    if (success) {
        window.toast?.success('Copied to clipboard!');
    } else {
        window.toast?.error('Failed to copy');
    }
}

/**
 * Handle download as .txt
 */
function handleDownloadTxt() {
    const output = document.getElementById('ascii-output');
    if (!output || !output.textContent) {
        window.toast?.warning('Nothing to download');
        return;
    }

    engine.exportAscii(output.textContent, `ascii-art-${Date.now()}.txt`);
    window.toast?.success('Downloaded as .txt');
}

/**
 * Handle download as .html
 */
function handleDownloadHtml() {
    const output = document.getElementById('ascii-output');
    if (!output || !output.innerHTML) {
        window.toast?.warning('Nothing to download');
        return;
    }

    engine.exportColorAscii(output.innerHTML, `ascii-art-color-${Date.now()}.html`);
    window.toast?.success('Downloaded as .html');
}

// Export to window for global access
window.asciiArtUI = {
    init: initAsciiArtUI,
    state
};

// Auto-initialize if container exists on page load
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('ascii-art-studio');
    if (container) {
        initAsciiArtUI('ascii-art-studio');
    }
});
