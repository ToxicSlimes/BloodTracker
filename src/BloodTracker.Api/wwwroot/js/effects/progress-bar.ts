/** Ширина ASCII прогресс-бара в символах */
const PROGRESS_BAR_WIDTH: number = 20;

let progress: number = 0;

/**
 * Рендерит ASCII прогресс-бар [█░] с процентами и подсветкой при 100%.
 */
function renderProgressBar(): void {
    const fillElement = document.getElementById('progress-bar-fill') as HTMLElement | null;
    const textElement = document.getElementById('progress-bar-text') as HTMLElement | null;
    
    if (!fillElement || !textElement) return;
    
    const filled = Math.floor((progress / 100) * PROGRESS_BAR_WIDTH);
    const empty = PROGRESS_BAR_WIDTH - filled;
    
    const fillChars = '█'.repeat(filled);
    const emptyChars = '░'.repeat(empty);
    
    fillElement.textContent = `[${fillChars}${emptyChars}]`;
    textElement.textContent = `${progress}%`;
    
    if (progress >= 100) {
        fillElement.style.color = 'var(--green)';
        fillElement.style.textShadow = '0 0 10px var(--green), 0 0 20px var(--green)';
    } else {
        fillElement.style.color = 'var(--primary-color)';
        fillElement.style.textShadow = '0 0 5px var(--primary-color)';
    }
}

/**
 * Увеличивает прогресс на 5%, сбрасывает на 0 при достижении 100%.
 */
function incrementProgress(): void {
    progress += 5;
    
    if (progress >= 100) {
        progress = 0;
        const fillElement = document.getElementById('progress-bar-fill') as HTMLElement | null;
        if (fillElement) {
            fillElement.style.animation = 'progressReset 0.5s ease-out';
            setTimeout(() => {
                fillElement.style.animation = '';
            }, 500);
        }
    }
    
    renderProgressBar();
}

/**
 * Инициализирует ASCII прогресс-бар: привязывает клик для инкремента, рендерит начальное состояние.
 */
export function initProgressBar(): void {
    const progressBar = document.getElementById('ascii-progress-bar');
    if (!progressBar) return;
    
    progressBar.addEventListener('click', incrementProgress);
    renderProgressBar();
}
