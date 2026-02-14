import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { toast } from '../../components/toast'

describe('toast', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('создаёт контейнер с aria-live="polite"', () => {
    toast.info('test')
    const container = document.querySelector('.toast-container')
    expect(container).toBeTruthy()
    expect(container?.getAttribute('aria-live')).toBe('polite')
  })

  it('создаёт toast element в DOM', () => {
    toast.success('success message')
    const toastEl = document.querySelector('.toast')
    expect(toastEl).toBeTruthy()
  })

  it('toast.success создаёт toast--success класс', () => {
    toast.success('test')
    const toastEl = document.querySelector('.toast')
    expect(toastEl?.classList.contains('toast--success')).toBe(true)
  })

  it('toast.error создаёт toast--error класс', () => {
    toast.error('test')
    const toastEl = document.querySelector('.toast')
    expect(toastEl?.classList.contains('toast--error')).toBe(true)
  })

  it('toast.warning создаёт toast--warning класс', () => {
    toast.warning('test')
    const toastEl = document.querySelector('.toast')
    expect(toastEl?.classList.contains('toast--warning')).toBe(true)
  })

  it('toast.info создаёт toast--info класс', () => {
    toast.info('test')
    const toastEl = document.querySelector('.toast')
    expect(toastEl?.classList.contains('toast--info')).toBe(true)
  })

  it('toast.success показывает иконку [ ✓ ]', () => {
    toast.success('test')
    const icon = document.querySelector('.toast-icon')
    expect(icon?.textContent).toBe('[ ✓ ]')
  })

  it('toast.error показывает иконку [ ☠ ]', () => {
    toast.error('test')
    const icon = document.querySelector('.toast-icon')
    expect(icon?.textContent).toBe('[ ☠ ]')
  })

  it('toast.warning показывает иконку [ ! ]', () => {
    toast.warning('test')
    const icon = document.querySelector('.toast-icon')
    expect(icon?.textContent).toBe('[ ! ]')
  })

  it('toast.info показывает иконку [ ? ]', () => {
    toast.info('test')
    const icon = document.querySelector('.toast-icon')
    expect(icon?.textContent).toBe('[ ? ]')
  })

  it('создаёт toast с role="status"', () => {
    toast.info('test')
    const toastEl = document.querySelector('.toast')
    expect(toastEl?.getAttribute('role')).toBe('status')
  })

  it('отображает текст сообщения', () => {
    toast.info('Hello World')
    const message = document.querySelector('.toast-message')
    expect(message?.textContent).toBe('Hello World')
  })

  it('создаёт кнопку закрытия ×', () => {
    toast.info('test')
    const closeBtn = document.querySelector('.toast-close')
    expect(closeBtn).toBeTruthy()
    expect(closeBtn?.textContent).toBe('×')
  })

  it('кнопка закрытия работает', () => {
    toast.info('test')
    const closeBtn = document.querySelector('.toast-close') as HTMLButtonElement
    closeBtn.click()
    
    vi.runAllTimers()
    
    const toastEl = document.querySelector('.toast')
    expect(toastEl?.classList.contains('toast-removing')).toBe(true)
  })

  it('progress bar начинается на 100%', () => {
    toast.info('test')
    const progress = document.querySelector('.toast-progress') as HTMLElement
    expect(progress.style.width).toBe('100%')
  })

  it('множественные toasts в одном контейнере', () => {
    toast.success('first')
    toast.error('second')
    toast.info('third')
    
    const toasts = document.querySelectorAll('.toast')
    expect(toasts.length).toBe(3)
    
    const containers = document.querySelectorAll('.toast-container')
    expect(containers.length).toBe(1)
  })

  it('auto-dismiss после таймаута', () => {
    toast.info('test', 1000)
    
    vi.advanceTimersByTime(1000)
    
    const toastEl = document.querySelector('.toast')
    expect(toastEl?.classList.contains('toast-removing')).toBe(true)
  })

  it('анимация удаления добавляет класс toast-removing', () => {
    toast.info('test')
    const closeBtn = document.querySelector('.toast-close') as HTMLButtonElement
    closeBtn.click()
    
    const toastEl = document.querySelector('.toast')
    expect(toastEl?.classList.contains('toast-removing')).toBe(true)
  })

  it('повторное использование контейнера', () => {
    toast.info('first')
    const container1 = document.querySelector('.toast-container')
    
    toast.info('second')
    const container2 = document.querySelector('.toast-container')
    
    expect(container1).toBe(container2)
  })
})
