import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { Toast, toast } from '../../react/components/Toast.js'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows toast via toast.success()', () => {
    render(<Toast />)

    act(() => {
      toast.success('Operation complete')
    })

    expect(screen.getByText('Operation complete')).toBeTruthy()
    expect(screen.getByText('[ \u2713 ]')).toBeTruthy()
  })

  it('shows multiple toasts simultaneously', () => {
    render(<Toast />)

    act(() => {
      toast.success('First')
      toast.error('Second')
      toast.warning('Third')
    })

    expect(screen.getByText('First')).toBeTruthy()
    expect(screen.getByText('Second')).toBeTruthy()
    expect(screen.getByText('Third')).toBeTruthy()
  })

  it('removes toast on close click', async () => {
    render(<Toast />)

    act(() => {
      toast.info('Dismissable')
    })

    expect(screen.getByText('Dismissable')).toBeTruthy()

    const closeBtn = screen.getByLabelText('Close')
    act(() => {
      fireEvent.click(closeBtn)
    })

    // toast-removing class applied immediately
    const toastEl = screen.getByText('Dismissable').closest('.toast')
    expect(toastEl?.classList.contains('toast-removing')).toBe(true)

    // After 300ms animation, toast is removed from DOM
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText('Dismissable')).toBeNull()
  })

  it('shows correct icon per type', () => {
    render(<Toast />)

    act(() => {
      toast.success('s')
      toast.error('e')
      toast.warning('w')
      toast.info('i')
    })

    const icons = document.querySelectorAll('.toast-icon')
    const iconTexts = Array.from(icons).map((el) => el.textContent)

    expect(iconTexts).toContain('[ \u2713 ]')
    expect(iconTexts).toContain('[ \u2620 ]')
    expect(iconTexts).toContain('[ ! ]')
    expect(iconTexts).toContain('[ ? ]')
  })

  it('applies correct CSS class per type', () => {
    render(<Toast />)

    act(() => {
      toast.success('s')
      toast.error('e')
      toast.warning('w')
      toast.info('i')
    })

    expect(document.querySelector('.toast--success')).toBeTruthy()
    expect(document.querySelector('.toast--error')).toBeTruthy()
    expect(document.querySelector('.toast--warning')).toBeTruthy()
    expect(document.querySelector('.toast--info')).toBeTruthy()
  })

  it('auto-dismisses after duration', () => {
    render(<Toast />)

    act(() => {
      toast.info('Auto-dismiss', 2000)
    })

    expect(screen.getByText('Auto-dismiss')).toBeTruthy()

    // Advance to trigger dismiss
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Now advance past the 300ms removal animation
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText('Auto-dismiss')).toBeNull()
  })

  it('renders action button when action is provided', () => {
    const onClick = vi.fn()
    render(<Toast />)

    act(() => {
      toast.success('With action', undefined, { label: 'Undo', onClick })
    })

    const actionBtn = screen.getByText('Undo')
    expect(actionBtn).toBeTruthy()
    expect(actionBtn.classList.contains('toast-action')).toBe(true)

    act(() => {
      fireEvent.click(actionBtn)
    })

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders container with correct aria attributes', () => {
    render(<Toast />)

    const container = document.querySelector('.toast-container')
    expect(container).toBeTruthy()
    expect(container?.getAttribute('aria-live')).toBe('polite')
    expect(container?.getAttribute('aria-atomic')).toBe('false')
  })

  it('has progress bar starting at 100%', () => {
    render(<Toast />)

    act(() => {
      toast.info('Progress test')
    })

    const progressBar = document.querySelector('.toast-progress') as HTMLElement
    expect(progressBar).toBeTruthy()
    expect(progressBar.style.width).toBe('100%')
  })

  it('sets window.toast for backward compatibility', () => {
    expect(window.toast).toBe(toast)
    expect(typeof window.toast.success).toBe('function')
    expect(typeof window.toast.error).toBe('function')
    expect(typeof window.toast.warning).toBe('function')
    expect(typeof window.toast.info).toBe('function')
  })
})
