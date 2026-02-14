import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  hexToRgb,
  rgbToRgba,
  formatDate,
  formatDateForInput,
  getStatus,
  getStatusClass,
  getStatusText,
  formatDateTime,
  drugTypeBadge
} from '../utils'

describe('escapeHtml', () => {
  it('возвращает пустую строку для null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('возвращает пустую строку для undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('экранирует &', () => {
    expect(escapeHtml('A&B')).toBe('A&amp;B')
  })

  it('экранирует <', () => {
    expect(escapeHtml('A<B')).toBe('A&lt;B')
  })

  it('экранирует >', () => {
    expect(escapeHtml('A>B')).toBe('A&gt;B')
  })

  it('экранирует "', () => {
    expect(escapeHtml('A"B')).toBe('A&quot;B')
  })

  it('экранирует \'', () => {
    expect(escapeHtml("A'B")).toBe('A&#039;B')
  })

  it('экранирует комбинацию спецсимволов', () => {
    expect(escapeHtml('<script>"alert"</script>')).toBe('&lt;script&gt;&quot;alert&quot;&lt;/script&gt;')
  })

  it('возвращает обычную строку как есть', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })
})

describe('hexToRgb', () => {
  it('парсит hex с #', () => {
    const rgb = hexToRgb('#ff0000')
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('парсит hex без #', () => {
    const rgb = hexToRgb('00ff00')
    expect(rgb).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('парсит hex в нижнем регистре', () => {
    const rgb = hexToRgb('#0000ff')
    expect(rgb).toEqual({ r: 0, g: 0, b: 255 })
  })

  it('парсит hex в верхнем регистре', () => {
    const rgb = hexToRgb('#AABBCC')
    expect(rgb).toEqual({ r: 170, g: 187, b: 204 })
  })

  it('возвращает null для невалидного формата', () => {
    expect(hexToRgb('zzz')).toBeNull()
  })

  it('возвращает null для короткой строки', () => {
    expect(hexToRgb('#fff')).toBeNull()
  })
})

describe('rgbToRgba', () => {
  it('формирует rgba строку', () => {
    const rgba = rgbToRgba({ r: 255, g: 128, b: 64 }, 0.5)
    expect(rgba).toBe('rgba(255, 128, 64, 0.5)')
  })

  it('формирует rgba с alpha=1', () => {
    const rgba = rgbToRgba({ r: 0, g: 0, b: 0 }, 1)
    expect(rgba).toBe('rgba(0, 0, 0, 1)')
  })

  it('формирует rgba с alpha=0', () => {
    const rgba = rgbToRgba({ r: 100, g: 200, b: 50 }, 0)
    expect(rgba).toBe('rgba(100, 200, 50, 0)')
  })
})

describe('formatDate', () => {
  it('форматирует Date объект', () => {
    const date = new Date('2024-12-25T10:30:00')
    const formatted = formatDate(date)
    expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/)
  })

  it('форматирует ISO строку', () => {
    const formatted = formatDate('2024-12-25')
    expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/)
  })

  it('использует локаль ru-RU', () => {
    const date = new Date('2024-01-15')
    const formatted = formatDate(date)
    expect(formatted).toBe('15.01.2024')
  })
})

describe('formatDateForInput', () => {
  it('форматирует в yyyy-mm-dd', () => {
    const date = new Date('2024-12-25T10:30:00')
    const formatted = formatDateForInput(date)
    expect(formatted).toBe('2024-12-25')
  })

  it('форматирует ISO строку в yyyy-mm-dd', () => {
    const formatted = formatDateForInput('2024-06-15T12:00:00Z')
    expect(formatted).toMatch(/2024-06-\d{2}/)
  })
})

describe('getStatus', () => {
  const ref = { min: 10, max: 20 }

  it('возвращает 0 для нормы', () => {
    expect(getStatus(15, ref)).toBe(0)
  })

  it('возвращает 1 для сниженного', () => {
    expect(getStatus(5, ref)).toBe(1)
  })

  it('возвращает 2 для чуть выше нормы', () => {
    expect(getStatus(20.5, ref)).toBe(2)
  })

  it('возвращает 3 для высокого', () => {
    expect(getStatus(25, ref)).toBe(3)
  })

  it('граница min даёт норму', () => {
    expect(getStatus(10, ref)).toBe(0)
  })

  it('граница max даёт норму', () => {
    expect(getStatus(20, ref)).toBe(0)
  })

  it('граница max + margin даёт чуть выше', () => {
    const margin = (ref.max - ref.min) * 0.1
    expect(getStatus(ref.max + margin, ref)).toBe(2)
  })

  it('граница max + margin + 0.1 даёт высокий', () => {
    const margin = (ref.max - ref.min) * 0.1
    expect(getStatus(ref.max + margin + 0.1, ref)).toBe(3)
  })
})

describe('getStatusClass', () => {
  it('возвращает normal для 0', () => {
    expect(getStatusClass(0)).toBe('normal')
  })

  it('возвращает low для 1', () => {
    expect(getStatusClass(1)).toBe('low')
  })

  it('возвращает slightly-high для 2', () => {
    expect(getStatusClass(2)).toBe('slightly-high')
  })

  it('возвращает high для 3', () => {
    expect(getStatusClass(3)).toBe('high')
  })

  it('возвращает pending для 4', () => {
    expect(getStatusClass(4)).toBe('pending')
  })

  it('возвращает pending для невалидного числа', () => {
    expect(getStatusClass(99)).toBe('pending')
  })

  it('возвращает normal для строки Normal', () => {
    expect(getStatusClass('Normal')).toBe('normal')
  })

  it('возвращает low для строки Low', () => {
    expect(getStatusClass('Low')).toBe('low')
  })

  it('возвращает slightly-high для строки SlightlyHigh', () => {
    expect(getStatusClass('SlightlyHigh')).toBe('slightly-high')
  })

  it('возвращает high для строки High', () => {
    expect(getStatusClass('High')).toBe('high')
  })

  it('возвращает pending для неизвестной строки', () => {
    expect(getStatusClass('Unknown')).toBe('pending')
  })
})

describe('getStatusText', () => {
  it('возвращает ✓ Норма для 0', () => {
    expect(getStatusText(0)).toBe('✓ Норма')
  })

  it('возвращает ↓ Снижен для 1', () => {
    expect(getStatusText(1)).toBe('↓ Снижен')
  })

  it('возвращает ↑ Чуть выше для 2', () => {
    expect(getStatusText(2)).toBe('↑ Чуть выше')
  })

  it('возвращает ↑↑ Повышен для 3', () => {
    expect(getStatusText(3)).toBe('↑↑ Повышен')
  })

  it('возвращает — для 4', () => {
    expect(getStatusText(4)).toBe('—')
  })

  it('возвращает — для невалидного числа', () => {
    expect(getStatusText(99)).toBe('—')
  })

  it('возвращает — для строки', () => {
    expect(getStatusText('Normal')).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('возвращает — для null', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('возвращает — для undefined', () => {
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('форматирует валидную дату', () => {
    const formatted = formatDateTime('2024-12-25T15:30:00')
    expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/)
  })
})

describe('drugTypeBadge', () => {
  it('возвращает badge для Инъекция (0)', () => {
    const badge = drugTypeBadge(0)
    expect(badge).toContain('Инъекция')
    expect(badge).toContain('badge-injection')
  })

  it('возвращает badge для Таблетки (1)', () => {
    const badge = drugTypeBadge(1)
    expect(badge).toContain('Таблетки')
    expect(badge).toContain('badge-oral')
  })

  it('возвращает badge для Капсулы (2)', () => {
    const badge = drugTypeBadge(2)
    expect(badge).toContain('Капсулы')
    expect(badge).toContain('badge-capsule')
  })

  it('возвращает badge для Крем (3)', () => {
    const badge = drugTypeBadge(3)
    expect(badge).toContain('Крем')
    expect(badge).toContain('badge-cream')
  })

  it('возвращает badge для Пластырь (4)', () => {
    const badge = drugTypeBadge(4)
    expect(badge).toContain('Пластырь')
    expect(badge).toContain('badge-patch')
  })

  it('возвращает badge для Другое (5)', () => {
    const badge = drugTypeBadge(5)
    expect(badge).toContain('Другое')
    expect(badge).toContain('badge-other')
  })

  it('возвращает badge для невалидного типа', () => {
    const badge = drugTypeBadge(99)
    expect(badge).toContain('Другое')
    expect(badge).toContain('badge-other')
  })
})
