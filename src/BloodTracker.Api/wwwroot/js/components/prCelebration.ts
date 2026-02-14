import type { PRDetailDto } from '../types/workouts.js'

const RECORD_TYPE_LABELS: Record<string, string> = {
    'MaxWeight': 'Максимальный вес',
    'MaxEstimated1RM': 'Расчётный 1RM',
    'MaxRepAtWeight': 'Максимум повторений'
}

export function initPRCelebration(): void {
    const existing = document.getElementById('pr-celebration-container')
    if (existing) return

    const container = document.createElement('div')
    container.id = 'pr-celebration-container'
    document.body.appendChild(container)
}

export function showPRCelebration(prs: PRDetailDto[], exerciseName: string): void {
    initPRCelebration()
    
    const container = document.getElementById('pr-celebration-container')
    if (!container) return

    const displayPRs = prs.slice(0, 3)
    
    const modal = document.createElement('div')
    modal.className = 'pr-celebration-modal'
    
    const prDetailsHtml = displayPRs.map(pr => {
        const label = RECORD_TYPE_LABELS[pr.recordType] || pr.recordType
        const prevValue = pr.previousValue !== null ? pr.previousValue.toFixed(1) : '—'
        const currentValue = pr.value.toFixed(1)
        const improvement = pr.improvementPercent.toFixed(1)
        
        return `
            <div class="pr-celebration-detail">
                <div class="pr-celebration-detail-label">${label}</div>
                <div class="pr-celebration-detail-change">
                    Было: ${prevValue} → Стало: ${currentValue}
                </div>
                <div class="pr-celebration-detail-improvement">
                    Улучшение: +${improvement}%
                </div>
            </div>
        `
    }).join('')

    modal.innerHTML = `
        <div class="pr-celebration-content">
            <div class="pr-celebration-title">НОВЫЙ РЕКОРД!</div>
            <div class="pr-celebration-exercise">${escapeHtml(exerciseName)}</div>
            ${prDetailsHtml}
            <button class="pr-celebration-btn" id="pr-celebration-dismiss">
                NICE!
            </button>
        </div>
    `
    
    container.innerHTML = ''
    container.appendChild(modal)
    
    if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 200])
    }
    
    const dismissBtn = document.getElementById('pr-celebration-dismiss')
    dismissBtn?.addEventListener('click', closePRCelebration)
    
    setTimeout(() => {
        modal.classList.add('active')
    }, 50)
    
    const autoDismissTimer = setTimeout(closePRCelebration, 5000)
    
    dismissBtn?.addEventListener('click', () => {
        clearTimeout(autoDismissTimer)
    })
}

function closePRCelebration(): void {
    const modal = document.querySelector('.pr-celebration-modal')
    if (!modal) return
    
    modal.classList.remove('active')
    modal.classList.add('closing')
    
    setTimeout(() => {
        const container = document.getElementById('pr-celebration-container')
        if (container) container.innerHTML = ''
    }, 300)
}

function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}
